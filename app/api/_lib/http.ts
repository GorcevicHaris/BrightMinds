// app/api/_lib/http.ts
// Zajednički pomoćnici za API rute: jedinstven oblik greške `{ error }`,
// čitanje JSON tela i pretvaranje izuzetaka u odgovore.
// (Fascikla počinje sa "_" pa je Next.js ne tretira kao rutu.)
import { NextResponse } from "next/server";
import { AuthError, authErrorResponse, getSession, type Session } from "@/lib/auth";
import { DbNotConfiguredError, dbUnavailableResponse } from "@/lib/supabase";
import type { Attempt } from "@/lib/rateLimit";
import { isRecord } from "@/lib/validation";

export const GENERIC_ERROR = "Došlo je do greške. Pokušajte ponovo.";

/** Greška sa porukom koja je bezbedna za prikaz korisniku. */
export class HttpError extends Error {
    status: number;
    headers?: Record<string, string>;

    constructor(status: number, message: string, headers?: Record<string, string>) {
        super(message);
        this.name = "HttpError";
        this.status = status;
        this.headers = headers;
    }
}

export function jsonError(message: string, status: number, headers?: Record<string, string>): NextResponse {
    return NextResponse.json({ error: message }, { status, headers });
}

/** JSON telo zahteva kao objekat; u suprotnom 400. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        throw new HttpError(400, "Neispravan zahtev");
    }
    if (!isRecord(body)) throw new HttpError(400, "Neispravan zahtev");
    return body;
}

/**
 * Zahteva bilo koju sesiju (roditeljsku ili dečju). Poziva se pre provere tela
 * zahteva, da neprijavljeni pozivi uvek dobiju 401, a ne 400/403.
 */
export async function requireSession(): Promise<Session> {
    const session = await getSession();
    if (!session) throw new AuthError(401, "Niste prijavljeni");
    return session;
}

/** ID iz putanje (`/api/children/[id]`); `NaN` ako nije pozitivan ceo broj. */
export function parseIdParam(raw: string): number {
    return /^[1-9]\d{0,14}$/.test(raw) ? Number(raw) : Number.NaN;
}

/** Baca 429 ako je pokušaj odbijen. */
export function enforceRateLimit(attempt: Attempt, message: string): void {
    if (!attempt.allowed) {
        throw new HttpError(429, message, { "Retry-After": String(attempt.retryAfterSec) });
    }
}

/**
 * Za `catch` blok rute: poznate greške postaju odgovarajući odgovor, a sve
 * ostalo se beleži na serveru i vraća se opšta poruka (bez internih detalja).
 */
export function errorResponse(error: unknown, context: string): NextResponse {
    if (error instanceof HttpError) return jsonError(error.message, error.status, error.headers);
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof DbNotConfiguredError) return dbUnavailableResponse();

    console.error(`[api] ${context}:`, error);
    return jsonError(GENERIC_ERROR, 500);
}
