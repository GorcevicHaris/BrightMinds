// lib/auth.ts
// Sesije i provera pristupa (samo server).
//
// Postoje dve vrste sesije u istom httpOnly kolačiću:
//  • roditelj/učitelj — pun pristup svojoj deci
//  • dete (prijava vizuelnim PIN-om) — sme samo da igra i čuva rezultate ZA SEBE;
//    nema pristup roditeljskom panelu niti podacima druge dece.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "./supabase";

export const SESSION_COOKIE = "token";
const SESSION_DAYS = 7;

export interface Session {
    /** ID naloga roditelja/učitelja (i kod dečje sesije — vlasnik deteta) */
    userId: number;
    email: string;
    role: string;
    /** Postavljeno samo kod dečje sesije */
    childId?: number;
}

interface TokenPayload {
    id: number;
    email: string;
    role: string;
    childId?: number;
}

export class AuthError extends Error {
    status: 401 | 403;

    constructor(status: 401 | 403, message: string) {
        super(message);
        this.name = "AuthError";
        this.status = status;
    }
}

function getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET nije podešen. Dodajte ga u .env.local");
    }
    return secret;
}

export function signSession(session: Session): string {
    const payload: TokenPayload = {
        id: session.userId,
        email: session.email,
        role: session.role,
        ...(session.childId ? { childId: session.childId } : {}),
    };
    return jwt.sign(payload, getSecret(), { expiresIn: `${SESSION_DAYS}d` });
}

export function setSessionCookie(response: NextResponse, session: Session): void {
    response.cookies.set(SESSION_COOKIE, signSession(session), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * SESSION_DAYS,
        path: "/",
    });
}

export function clearSessionCookie(response: NextResponse): void {
    response.cookies.set(SESSION_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: new Date(0),
        path: "/",
    });
}

/** Trenutna sesija ili null (bez bacanja greške). */
export async function getSession(): Promise<Session | null> {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    try {
        const payload = jwt.verify(token, getSecret()) as TokenPayload;
        if (typeof payload.id !== "number") return null;
        return {
            userId: payload.id,
            email: payload.email,
            role: payload.role,
            childId: typeof payload.childId === "number" ? payload.childId : undefined,
        };
    } catch {
        return null;
    }
}

/** Zahteva prijavljenog roditelja/učitelja. Dečja sesija NIJE dovoljna. */
export async function requireUser(): Promise<Session> {
    const session = await getSession();
    if (!session) throw new AuthError(401, "Niste prijavljeni");
    if (session.childId) throw new AuthError(403, "Ova stranica je samo za roditelje");
    return session;
}

async function userOwnsChild(userId: number, childId: number): Promise<boolean> {
    const { data, error } = await supabaseAdmin
        .from("user_children")
        .select("child_id")
        .eq("user_id", userId)
        .eq("child_id", childId)
        .limit(1);
    // Greška baze nije isto što i "nema pristup" — neka je ruta prijavi kao 500
    if (error) throw error;
    return Boolean(data && data.length > 0);
}

/**
 * Zahteva pristup konkretnom detetu:
 *  • roditelj/učitelj povezan sa detetom, ili
 *  • dečja sesija baš tog deteta.
 */
export async function requireChildAccess(childId: number): Promise<Session> {
    if (!Number.isInteger(childId) || childId <= 0) throw new AuthError(403, "Nemate pristup ovom detetu");
    const session = await getSession();
    if (!session) throw new AuthError(401, "Niste prijavljeni");

    if (session.childId) {
        if (session.childId !== childId) throw new AuthError(403, "Nemate pristup ovom detetu");
        return session;
    }
    if (!(await userOwnsChild(session.userId, childId))) {
        throw new AuthError(403, "Nemate pristup ovom detetu");
    }
    return session;
}

/** Zahteva da dete pripada prijavljenom roditelju (dečja sesija nije dovoljna). */
export async function requireChildOwner(childId: number): Promise<Session> {
    const session = await requireUser();
    if (!Number.isInteger(childId) || childId <= 0 || !(await userOwnsChild(session.userId, childId))) {
        throw new AuthError(403, "Nemate pristup ovom detetu");
    }
    return session;
}

/** U `catch` bloku API rute: pretvara AuthError u JSON odgovor, ostalo vraća null. */
export function authErrorResponse(error: unknown): NextResponse | null {
    if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return null;
}
