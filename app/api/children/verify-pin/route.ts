// app/api/children/verify-pin/route.ts
// Prijava deteta vizuelnim PIN-om. Izdaje DEČJU sesiju (sa childId), koja sme
// samo da igra i čuva rezultate za to dete — nikada punu roditeljsku sesiju.
import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { getClientIp, takeAttempt, type RateLimitRule } from "@/lib/rateLimit";
import { assertDbConfigured, supabaseAdmin } from "@/lib/supabase";
import { asTrimmedString, dateOnlyInTimeZone, shiftDateOnly } from "@/lib/validation";
import type { ChildRow } from "../../_lib/children";
import { enforceRateLimit, errorResponse, HttpError, readJsonObject } from "../../_lib/http";

/** Neuspešni pokušaji po IP adresi. */
const PIN_RULE: RateLimitRule = { limit: 8, windowMs: 5 * 60 * 1000 };

const DAILY_LOGIN_POINTS = 10;
const MAX_AWARD_RETRIES = 3;

interface Owner {
    id: number;
    email: string;
    role: string;
}

interface LoginAward {
    streak: number;
    experiencePoints: number;
    streakAdded: boolean;
}

/** PIN bez razmaka oko zareza: " dog, pizza ,car,pepsi" → "dog,pizza,car,pepsi". */
function readPin(value: unknown): string | null {
    const raw = asTrimmedString(value, { min: 1, max: 120 });
    if (!raw) return null;
    return raw
        .split(",")
        .map((part) => part.trim())
        .join(",");
}

/** Vreme iz baze kao Date; vrednost bez vremenske zone tumači se kao UTC. */
function parseDbTimestamp(value: string | null | undefined): Date | null {
    if (!value) return null;
    const hasZone = /(Z|[+-]\d{2}(:?\d{2})?)$/i.test(value);
    const date = new Date(hasZone ? value : `${value.replace(" ", "T")}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
}

async function findOwner(childId: number): Promise<Owner | null> {
    const { data: links, error: linkError } = await supabaseAdmin
        .from("user_children")
        .select("user_id")
        .eq("child_id", childId)
        .order("is_primary", { ascending: false })
        .order("user_id", { ascending: true })
        .limit(1);
    if (linkError) throw linkError;

    const userId = ((links ?? []) as { user_id: number }[])[0]?.user_id;
    if (userId === undefined) return null;

    const { data: users, error: userError } = await supabaseAdmin
        .from("users")
        .select("id, email, role")
        .eq("id", userId)
        .limit(1);
    if (userError) throw userError;
    return ((users ?? []) as Owner[])[0] ?? null;
}

async function loadChild(childId: number): Promise<ChildRow | null> {
    const { data, error } = await supabaseAdmin.from("children").select("*").eq("id", childId).limit(1);
    if (error) throw error;
    return ((data ?? []) as ChildRow[])[0] ?? null;
}

/**
 * Dnevna nagrada za prijavu, po kalendarskom danu u Beogradu:
 *  • prva prijava u danu → +10 poena; niz +1 ako je prethodna prijava bila juče, inače 1
 *  • sledeće prijave istog dana ne menjaju ništa.
 * Upis je uslovan (red se menja samo ako su last_login_at i poeni isti kao kad
 * smo ih pročitali), pa dva paralelna zahteva ne mogu dvaput da dodele nagradu.
 */
async function applyDailyLogin(initial: ChildRow): Promise<LoginAward> {
    let child = initial;

    for (let attempt = 0; attempt < MAX_AWARD_RETRIES; attempt++) {
        const streak = child.streak ?? 0;
        const points = child.experience_points ?? 0;
        const now = new Date();
        const today = dateOnlyInTimeZone(now);
        const lastLogin = parseDbTimestamp(child.last_login_at);
        const lastDay = lastLogin ? dateOnlyInTimeZone(lastLogin) : null;

        if (lastDay === today) return { streak, experiencePoints: points, streakAdded: false };

        const next = {
            streak: lastDay === shiftDateOnly(today, { days: -1 }) ? streak + 1 : 1,
            experience_points: points + DAILY_LOGIN_POINTS,
            last_login_at: now.toISOString(),
        };

        let update = supabaseAdmin.from("children").update(next).eq("id", child.id);
        update = child.last_login_at
            ? update.eq("last_login_at", child.last_login_at)
            : update.is("last_login_at", null);
        update =
            typeof child.experience_points === "number"
                ? update.eq("experience_points", child.experience_points)
                : update.is("experience_points", null);

        const { data, error } = await update.select("id");
        if (error) throw error;
        if (data && data.length > 0) {
            return { streak: next.streak, experiencePoints: next.experience_points, streakAdded: true };
        }

        // Neko drugi je u međuvremenu izmenio red — učitaj ponovo i probaj još jednom.
        const reloaded = await loadChild(child.id);
        if (!reloaded) break;
        child = reloaded;
    }

    return { streak: child.streak ?? 0, experiencePoints: child.experience_points ?? 0, streakAdded: false };
}

export async function POST(request: Request) {
    try {
        const body = await readJsonObject(request);
        const pinCode = readPin(body.pin_code);
        if (!pinCode) throw new HttpError(400, "Izaberi četiri sličice");

        assertDbConfigured();

        // Pokušaj se rezerviše unapred i vraća samo ako je kod tačan.
        const attempt = takeAttempt(`pin:${getClientIp(request)}`, PIN_RULE);
        enforceRateLimit(attempt, "Previše pokušaja. Sačekaj malo pa probaj ponovo.");

        const { data, error } = await supabaseAdmin
            .from("children")
            .select("*")
            .eq("pin_code", pinCode)
            .order("id", { ascending: true })
            .limit(2);
        if (error) throw error;

        const matches = (data ?? []) as ChildRow[];
        if (matches.length === 0) throw new HttpError(401, "Netačan kod");
        if (matches.length > 1) {
            // Nasleđeni duplikati (pre jedinstvenog indeksa): ne pogađamo koje je dete u pitanju.
            attempt.refund();
            throw new HttpError(409, "Ovaj kod koristi više profila. Zamoli roditelja da izabere nove sličice.");
        }
        const child = matches[0];

        const owner = await findOwner(child.id);
        if (!owner) {
            attempt.refund();
            throw new HttpError(403, "Ovaj profil nije povezan sa roditeljem");
        }

        const award = await applyDailyLogin(child);
        attempt.refund();

        const response = NextResponse.json({
            success: true,
            child: {
                id: child.id,
                first_name: child.first_name,
                last_name: child.last_name,
                gender: child.gender ?? null,
                streak: award.streak,
                experiencePoints: award.experiencePoints,
                streakAdded: award.streakAdded,
            },
        });
        setSessionCookie(response, {
            userId: owner.id,
            email: owner.email,
            role: owner.role,
            childId: child.id,
        });
        return response;
    } catch (error) {
        return errorResponse(error, "POST /api/children/verify-pin");
    }
}
