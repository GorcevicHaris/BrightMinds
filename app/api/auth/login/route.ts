// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { setSessionCookie } from "@/lib/auth";
import { getClientIp, takeAttempt, type RateLimitRule } from "@/lib/rateLimit";
import { assertDbConfigured } from "@/lib/supabase";
import { asTrimmedString, isEmail } from "@/lib/validation";
import { enforceRateLimit, errorResponse, HttpError, readJsonObject } from "../../_lib/http";
import { findUserByEmail, toPublicUser } from "../../_lib/users";

const INVALID_CREDENTIALS = "Pogrešan email ili lozinka";
const TOO_MANY_ATTEMPTS = "Previše pokušaja prijave. Pokušajte ponovo za nekoliko minuta.";

/** Neuspešni pokušaji po paru IP + email, i ukupno po IP adresi. */
const PER_ACCOUNT_RULE: RateLimitRule = { limit: 10, windowMs: 10 * 60 * 1000 };
const PER_IP_RULE: RateLimitRule = { limit: 50, windowMs: 10 * 60 * 1000 };

const MAX_PASSWORD_LENGTH = 200;

// Heš nepostojeće lozinke: poredi se i kada nalog ne postoji, da vreme odgovora
// ne otkriva da li je email registrovan.
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
    dummyHash ??= bcrypt.hash("bright-minds-nepostojeci-nalog", 10);
    return dummyHash;
}

export async function POST(request: Request) {
    try {
        const body = await readJsonObject(request);
        const email = asTrimmedString(body.email, { min: 1, max: 254 })?.toLowerCase() ?? null;
        const password = typeof body.password === "string" ? body.password : "";
        if (!email || !password) throw new HttpError(400, "Unesite email i lozinku");

        assertDbConfigured();

        const ip = getClientIp(request);
        const ipAttempt = takeAttempt(`login:ip:${ip}`, PER_IP_RULE);
        enforceRateLimit(ipAttempt, TOO_MANY_ATTEMPTS);
        const accountAttempt = takeAttempt(`login:${ip}:${email}`, PER_ACCOUNT_RULE);
        if (!accountAttempt.allowed) ipAttempt.refund();
        enforceRateLimit(accountAttempt, TOO_MANY_ATTEMPTS);

        const lookupAllowed = isEmail(email) && password.length <= MAX_PASSWORD_LENGTH;
        const user = lookupAllowed ? await findUserByEmail(email) : null;
        const passwordHash = user?.password_hash || (await getDummyHash());
        const passwordMatches = await bcrypt.compare(password.slice(0, MAX_PASSWORD_LENGTH), passwordHash);

        if (!user || !user.password_hash || !passwordMatches) {
            throw new HttpError(401, INVALID_CREDENTIALS);
        }

        // Broje se samo neuspešni pokušaji.
        ipAttempt.refund();
        accountAttempt.refund();

        const response = NextResponse.json({ success: true, user: toPublicUser(user) });
        setSessionCookie(response, { userId: user.id, email: user.email, role: user.role });
        return response;
    } catch (error) {
        return errorResponse(error, "POST /api/auth/login");
    }
}
