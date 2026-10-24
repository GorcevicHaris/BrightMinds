// lib/auth.ts
// Sesije i provera pristupa (samo server).
//
// Postoje dve vrste sesije u istom httpOnly kolačiću:
//  • roditelj/učitelj — pun pristup svojoj deci
//  • dete (prijava vizuelnim PIN-om) — sme samo da igra i čuva rezultate ZA SEBE;
//    nema pristup roditeljskom panelu niti podacima druge dece.
//
// Dečja sesija nosi i otisak tajnog koda (`pinTag`). Pri svakom pristupu detetu server
// proverava da je dete i dalje povezano sa roditeljem i da je kod isti: kad roditelj
// promeni ili ukloni sličice (npr. jer je drugo dete saznalo kod), sve ranije dečje
// sesije odmah prestaju da važe.
import { createHmac, timingSafeEqual } from "node:crypto";
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
    /** Dečja sesija: otisak tajnog koda kojim se dete prijavilo (videti `pinFingerprint`) */
    pinTag?: string;
}

interface TokenPayload {
    id: number;
    email: string;
    role: string;
    childId?: number;
    /** Otisak tajnog koda (samo dečja sesija) */
    pv?: string;
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

/**
 * Otisak tajnog koda deteta: HMAC (serverska tajna) od ID-ja deteta i koda. Iz otiska se
 * kod ne može izračunati bez tajne, a menja se čim roditelj izabere nove sličice.
 */
export function pinFingerprint(childId: number, pinCode: string): string {
    return createHmac("sha256", getSecret()).update(`child-pin:${childId}:${pinCode}`).digest("base64url").slice(0, 22);
}

function sameTag(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
}

export function signSession(session: Session): string {
    const payload: TokenPayload = {
        id: session.userId,
        email: session.email,
        role: session.role,
        ...(session.childId ? { childId: session.childId } : {}),
        ...(session.childId && session.pinTag ? { pv: session.pinTag } : {}),
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
            ...(typeof payload.pv === "string" ? { pinTag: payload.pv } : {}),
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

/** Trenutni tajni kod deteta (null: dete ne postoji ili nema kod). */
async function currentPin(childId: number): Promise<string | null> {
    const { data, error } = await supabaseAdmin.from("children").select("pin_code").eq("id", childId).limit(1);
    if (error) throw error;
    const pin = ((data ?? []) as { pin_code: string | null }[])[0]?.pin_code;
    return typeof pin === "string" && pin !== "" ? pin : null;
}

export const SESSION_EXPIRED = "Prijava je istekla. Prijavi se ponovo svojim sličicama.";

/**
 * Da li dečja sesija i dalje važi: dete je povezano sa nalogom iz sesije i tajni kod je
 * isti kao pri prijavi. Sesija bez otiska (izdata pre ove provere) ne važi.
 */
async function childSessionStillValid(session: Session & { childId: number }): Promise<boolean> {
    if (!session.pinTag) return false;
    const [linked, pin] = await Promise.all([userOwnsChild(session.userId, session.childId), currentPin(session.childId)]);
    return linked && pin !== null && sameTag(pinFingerprint(session.childId, pin), session.pinTag);
}

/**
 * Zahteva pristup konkretnom detetu:
 *  • roditelj/učitelj povezan sa detetom, ili
 *  • dečja sesija baš tog deteta (koja i dalje važi — videti `childSessionStillValid`).
 */
export async function requireChildAccess(childId: number): Promise<Session> {
    if (!Number.isInteger(childId) || childId <= 0) throw new AuthError(403, "Nemate pristup ovom detetu");
    const session = await getSession();
    if (!session) throw new AuthError(401, "Niste prijavljeni");

    if (session.childId) {
        if (session.childId !== childId) throw new AuthError(403, "Nemate pristup ovom detetu");
        if (!(await childSessionStillValid({ ...session, childId: session.childId }))) throw new AuthError(401, SESSION_EXPIRED);
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
