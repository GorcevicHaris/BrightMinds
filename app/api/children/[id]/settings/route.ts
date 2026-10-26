// app/api/children/[id]/settings/route.ts
// Podešavanja po detetu (zvuk, pismo, pomoć, dnevno ograničenje…). Model i
// provera vrednosti su u lib/childSettings.ts.
// GET — roditelj ILI dečja sesija tog deteta (igra čita svoja podešavanja).
// PUT — samo roditelj/terapeut povezan sa detetom.
import { NextResponse } from "next/server";
import { requireChildAccess, requireChildOwner } from "@/lib/auth";
import { ageInYears, bandForAge, sanitizeSettings, settingsOverrides, type ChildSettings } from "@/lib/childSettings";
import { isMissingColumnError, supabaseAdmin } from "@/lib/supabase";
import { isRecord } from "@/lib/validation";
import { CHILD_NOT_FOUND, publicSettings, storedSettings, type ChildRow } from "../../../_lib/children";
import { errorResponse, HttpError, parseIdParam, requireSession } from "../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

/** Podešavanja su desetak kratkih polja; sve preko ovoga nije ispravan zahtev. */
const MAX_BODY_BYTES = 4096;
const INVALID_REQUEST = "Neispravan zahtev";
const MIGRATION_REQUIRED =
    "Podešavanja traže novu verziju baze. Pokrenite migraciju 0002 iz fascikle supabase/migrations.";

/** `select('*')` jer kolona `settings` možda još ne postoji (migracija 0002). */
async function loadChild(childId: number): Promise<ChildRow> {
    const { data, error } = await supabaseAdmin.from("children").select("*").eq("id", childId).limit(1);
    if (error) throw error;
    const child = ((data ?? []) as ChildRow[])[0];
    if (!child) throw new HttpError(404, CHILD_NOT_FOUND);
    return child;
}

/** Telo zahteva kao tekst; baca 400 čim pređe `MAX_BODY_BYTES` (ne čita ostatak). */
async function readLimitedText(request: Request): Promise<string> {
    const declared = Number(request.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new HttpError(400, INVALID_REQUEST);
    if (!request.body) return "";

    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let received = 0;
    let text = "";
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > MAX_BODY_BYTES) {
            await reader.cancel();
            throw new HttpError(400, INVALID_REQUEST);
        }
        text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
}

/** Polje `settings` iz tela `{ settings: { … } }`; sve ostalo je 400. */
async function readSettingsBody(request: Request): Promise<Record<string, unknown>> {
    let body: unknown;
    try {
        body = JSON.parse(await readLimitedText(request));
    } catch (error) {
        if (error instanceof HttpError) throw error;
        throw new HttpError(400, INVALID_REQUEST);
    }
    if (!isRecord(body) || !isRecord(body.settings)) throw new HttpError(400, INVALID_REQUEST);
    return body.settings;
}

/** Sirova sačuvana podešavanja (ili `{}`) i datum rođenja, iz kog klijent izvodi uzrasnu grupu. */
export async function GET(_request: Request, { params }: RouteContext) {
    try {
        await requireSession();
        const childId = parseIdParam((await params).id);
        await requireChildAccess(childId);

        const child = await loadChild(childId);
        return NextResponse.json(
            { settings: publicSettings(child), date_of_birth: child.date_of_birth ?? null },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (error) {
        return errorResponse(error, "GET /api/children/[id]/settings");
    }
}

/**
 * Čuva podešavanja. U bazu ide PREČIŠĆEN objekat: nepoznata polja se odbacuju,
 * a neispravne vrednosti zamenjuju preporukom za uzrast deteta.
 */
export async function PUT(request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        await requireChildOwner(childId);
        const raw = await readSettingsBody(request);

        const child = await loadChild(childId);
        const ageBand = bandForAge(ageInYears(child.date_of_birth));
        const settings: ChildSettings = sanitizeSettings(raw, ageBand);

        // U bazu ide samo ono što odstupa od preporuke za uzrast; ostalo nastavlja da prati uzrast.
        // Pratilac deteta i kupljena odeća (ključ `companion`, lib/companion.ts) nisu podešavanja
        // roditelja — ostaju netaknuti.
        const stored = storedSettings(child);
        const next: Record<string, unknown> = { ...settingsOverrides(settings, ageBand) };
        if (stored.companion !== undefined) next.companion = stored.companion;
        // Ni poziv za igru sa drugom (`invite`, lib/invite.ts) nije podešavanje roditelja
        if (stored.invite !== undefined) next.invite = stored.invite;
        // Ni spisak drugova za igru (`playFriends`, lib/playFriends.ts) — briše se posebnim dugmetom
        if (stored.playFriends !== undefined) next.playFriends = stored.playFriends;
        const { data, error } = await supabaseAdmin
            .from("children")
            .update({ settings: next })
            .eq("id", childId)
            .select("id");
        if (error) {
            if (isMissingColumnError(error)) throw new HttpError(409, MIGRATION_REQUIRED);
            throw error;
        }
        if (!data || data.length === 0) throw new HttpError(404, CHILD_NOT_FOUND);

        return NextResponse.json({ settings });
    } catch (error) {
        return errorResponse(error, "PUT /api/children/[id]/settings");
    }
}
