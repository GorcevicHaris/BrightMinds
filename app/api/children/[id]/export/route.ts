// app/api/children/[id]/export/route.ts
// GET — preuzimanje SVIH zapisa o igri jednog deteta kao CSV (prenosivost podataka).
// Samo roditelj/terapeut povezan sa detetom; dečja sesija nema pristup.
//
// Fajl je UTF-8 sa BOM oznakom (da Excel ispravno prikaže š, đ, č, ć, ž), polja
// su razdvojena tačka-zarezom (tako ih Excel sa našim regionalnim podešavanjima deli
// u kolone), redovi sa CRLF. Datum i vreme su u zoni
// Europe/Belgrade. „Samostalno tačno” i „Uz pomoć” su odvojene kolone: terapeutu
// je važno šta je dete uradilo BEZ pomoći. Raspoloženje pre/posle dolazi iz posete
// (play_sessions) kojoj partija pripada; stariji zapisi ga nose sami.
import { NextResponse } from "next/server";
import { requireChildOwner } from "@/lib/auth";
import { getGameByActivityId, getMood, MAX_LEVEL, successLevelFor } from "@/lib/games";
import { supabaseAdmin } from "@/lib/supabase";
import { APP_TIME_ZONE, dateOnlyInTimeZone } from "@/lib/validation";
import {
    CHILD_NOT_FOUND,
    fetchPlaySessions,
    parseDbTimestamp,
    parseLegacyNotes,
    selectProgressLogs,
    type PlaySessionRow,
    type ProgressLogRow,
} from "../../../_lib/children";
import { errorResponse, HttpError, parseIdParam } from "../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

/** PostgREST vraća najviše 1000 redova po upitu, pa čitamo stranu po stranu. */
const PAGE_SIZE = 1000;
/** Osigurač protiv beskonačne petlje (milion zapisa); realno se nikad ne dostiže. */
const MAX_PAGES = 1000;
/** Poseta nikad nema više nego zapisa, pa važi ista gornja granica. */
const MAX_SESSIONS = PAGE_SIZE * MAX_PAGES;

const BOM = "﻿";
const HEADER = [
    "Datum",
    "Vreme",
    "Igra",
    "Nivo",
    "Zvezdice",
    "Samostalno tačno",
    "Uz pomoć",
    "Ukupno zadataka",
    "Trajanje (s)",
    "Raspoloženje pre",
    "Raspoloženje posle",
];

type Cell = string | number | null;

// ── CSV ───────────────────────────────────────────────────────────────────────

/**
 * Jedno polje CSV-a. Tekst koji počinje sa = + - @ (ili tabulatorom/CR) dobija
 * apostrof ispred, da ga Excel/Sheets ne izvrše kao formulu; polja sa navodnikom,
 * zarezom, tačka-zarezom ili novim redom idu pod navodnike. Brojevi idu kakvi jesu.
 */
function csvCell(value: Cell): string {
    if (value === null) return "";
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
    const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[",;\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Tačka-zarez: Excel sa srpskim/regionalnim podešavanjima tako razdvaja kolone,
// pa se fajl otvara ispravno dvoklikom (zarez bi sve stavio u jednu kolonu).
const SEPARATOR = ";";

function csvLine(cells: readonly Cell[]): string {
    return cells.map(csvCell).join(SEPARATOR);
}

// ── Vrednosti iz reda ─────────────────────────────────────────────────────────

/** Nenegativan ceo broj iz kolone; `null` ako kolone nema ili je prazna. */
function count(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

function inRange(value: number | null, min: number, max: number): number | null {
    return value !== null && value >= min && value <= max ? value : null;
}

/** Zvezdice iz uspešnosti — obrnuto od `successLevelFor`, za najstarije zapise. */
function starsFromSuccessLevel(successLevel: string | null | undefined): number | null {
    if (!successLevel) return null;
    return [0, 1, 2, 3].find((stars) => successLevelFor(stars) === successLevel) ?? null;
}

const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
});

/** HH:MM:SS u zoni aplikacije. */
function timeInAppZone(date: Date): string {
    const parts = TIME_FORMAT.formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "00";
    return `${part("hour")}:${part("minute")}:${part("second")}`;
}

/**
 * Red tabele → red CSV-a. Kolone iz migracija imaju prednost; kada ih nema ili su
 * prazne, nivo i zvezdice se čitaju iz stare beleške, a trajanje iz minuta.
 * `session` je poseta kojoj partija pripada (ako je ima): raspoloženje se čita iz
 * nje, a iz samog zapisa samo kada poseta nema taj odgovor ili je zapis stariji.
 */
function toCsvRow(row: ProgressLogRow, completedAt: Date | null, session: PlaySessionRow | undefined): Cell[] {
    const legacy = parseLegacyNotes(row.notes);
    const level = inRange(count(row.level), 1, MAX_LEVEL) ?? inRange(legacy.level, 1, MAX_LEVEL);
    const stars =
        inRange(count(row.stars), 0, 3) ?? inRange(legacy.stars, 0, 3) ?? starsFromSuccessLevel(row.success_level);
    const minutes = count(row.duration_minutes);

    return [
        completedAt ? dateOnlyInTimeZone(completedAt) : null,
        completedAt ? timeInAppZone(completedAt) : null,
        getGameByActivityId(row.activity_id)?.title ?? `Aktivnost ${row.activity_id}`,
        level,
        stars,
        count(row.correct_count),
        count(row.prompted_count),
        count(row.total_count),
        count(row.duration_seconds) ?? (minutes !== null ? minutes * 60 : null),
        getMood(session?.mood_before ?? row.mood_before)?.label ?? null,
        getMood(session?.mood_after ?? row.mood_after)?.label ?? null,
    ];
}

// ── Čitanje iz baze ───────────────────────────────────────────────────────────

/**
 * Svi zapisi deteta, samo kolone koje izvoz koristi (`*` u bazi koja ih nema sve).
 * Strane idu po ključu (id opada), a ne po pomeraju: nijedan red se ne
 * preskače niti ponavlja ako se tokom izvoza upiše nova partija, i petlja ne
 * zavisi od toga koliko redova PostgREST vraća po upitu.
 */
async function fetchAllLogs(childId: number): Promise<ProgressLogRow[]> {
    const rows: ProgressLogRow[] = [];
    let beforeId: number | null = null;

    for (let page = 0; page < MAX_PAGES; page++) {
        const cursor: number | null = beforeId;
        const batch = await selectProgressLogs((columns) => {
            let query = supabaseAdmin.from("progress_logs").select(columns).eq("child_id", childId);
            if (cursor !== null) query = query.lt("id", cursor);
            return query.order("id", { ascending: false }).limit(PAGE_SIZE);
        });
        if (batch.length === 0) break;
        rows.push(...batch);
        beforeId = batch[batch.length - 1].id;
    }
    return rows;
}

// ── Naziv fajla ───────────────────────────────────────────────────────────────

const LATIN_FOLD: Record<string, string> = { đ: "dj", Đ: "Dj", ß: "ss", ø: "o", Ø: "O", ł: "l", Ł: "L" };

/** Ime bez znakova koji nisu dozvoljeni u nazivu fajla; razmaci postaju crtice. */
function fileNamePart(name: string): string {
    const cleaned = name
        .normalize("NFC")
        .replace(/[\u0000-\u001f\u007f"\\/:*?<>|%;]+/g, " ")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/^\.+/, "")
        .slice(0, 60);
    return cleaned || "dete";
}

/** ASCII oblik imena (Đorđe → Djordje, Žika → Zika) za stare pregledače. */
function asciiFileNamePart(name: string): string {
    const ascii = name
        .replace(/[đĐßøØłŁ]/g, (char) => LATIN_FOLD[char] ?? char)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^A-Za-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return ascii || "dete";
}

/**
 * Zaglavlje sme da sadrži samo ASCII, pa ide u dva oblika (RFC 6266): `filename`
 * bez naših slova i `filename*` sa punim imenom u UTF-8, koji pregledači biraju.
 */
function contentDisposition(firstName: string, day: string): string {
    const part = fileNamePart(firstName);
    const full = `bright-minds-${part}-${day}.csv`;
    const fallback = `bright-minds-${asciiFileNamePart(part)}-${day}.csv`;
    const encoded = encodeURIComponent(full).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
    return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

// ── Ruta ──────────────────────────────────────────────────────────────────────

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        await requireChildOwner(childId);

        // Tri nezavisna čitanja idu istovremeno; od deteta treba samo ime (za naziv fajla).
        const [childResult, allLogs, sessions] = await Promise.all([
            supabaseAdmin.from("children").select("first_name").eq("id", childId).limit(1),
            fetchAllLogs(childId),
            fetchPlaySessions(childId, MAX_SESSIONS),
        ]);
        if (childResult.error) throw childResult.error;
        const child = ((childResult.data ?? []) as { first_name: string }[])[0];
        if (!child) throw new HttpError(404, CHILD_NOT_FOUND);

        const sessionsById = new Map(sessions.map((session) => [session.id, session]));
        const sessionOf = (row: ProgressLogRow) =>
            typeof row.session_id === "number" ? sessionsById.get(row.session_id) : undefined;

        // Najnovije prvo; zapisi bez upotrebljivog datuma idu na kraj.
        const logs = allLogs
            .map((row) => ({ row, completedAt: parseDbTimestamp(row.completed_at) }))
            .sort(
                (a, b) =>
                    (b.completedAt?.getTime() ?? -Infinity) - (a.completedAt?.getTime() ?? -Infinity) ||
                    b.row.id - a.row.id
            );

        const lines = [csvLine(HEADER), ...logs.map(({ row, completedAt }) => csvLine(toCsvRow(row, completedAt, sessionOf(row))))];

        return new NextResponse(`${BOM}${lines.join("\r\n")}\r\n`, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": contentDisposition(child.first_name, dateOnlyInTimeZone(new Date())),
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        return errorResponse(error, "GET /api/children/[id]/export");
    }
}
