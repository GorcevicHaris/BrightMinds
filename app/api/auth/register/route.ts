// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { setSessionCookie } from "@/lib/auth";
import { getClientIp, takeAttempt, type RateLimitRule } from "@/lib/rateLimit";
import { assertDbConfigured, isUniqueViolation, supabaseAdmin } from "@/lib/supabase";
import { asTrimmedString, isBlank, isPhone, normalizeEmail, oneOf } from "@/lib/validation";
import { enforceRateLimit, errorResponse, HttpError, readJsonObject } from "../../_lib/http";
import { findUserByEmail, PUBLIC_USER_COLUMNS, toPublicUser, type PublicUser } from "../../_lib/users";

/** Uloge koje korisnik sme sam da izabere. "admin" se nikada ne dodeljuje preko registracije. */
const SELF_SERVICE_ROLES = ["parent", "teacher", "therapist"] as const;
type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];

const EMAIL_TAKEN = "Nalog sa ovim emailom već postoji";
const MIN_PASSWORD_LENGTH = 8;
/** bcrypt koristi samo prva 72 bajta lozinke. */
const MAX_PASSWORD_BYTES = 72;

const REGISTER_RULE: RateLimitRule = { limit: 20, windowMs: 60 * 60 * 1000 };

interface RegisterInput {
    email: string;
    password: string;
    full_name: string;
    phone: string | null;
    role: SelfServiceRole;
}

function parseRegisterInput(body: Record<string, unknown>): RegisterInput {
    const email = normalizeEmail(body.email);
    if (!email) throw new HttpError(400, "Unesite ispravnu email adresu");

    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < MIN_PASSWORD_LENGTH) {
        throw new HttpError(400, `Lozinka mora imati najmanje ${MIN_PASSWORD_LENGTH} karaktera`);
    }
    if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
        throw new HttpError(400, "Lozinka je predugačka (najviše 72 karaktera)");
    }

    const full_name = asTrimmedString(body.full_name, { min: 2, max: 100 });
    if (!full_name) throw new HttpError(400, "Ime i prezime mora imati između 2 i 100 karaktera");

    let phone: string | null = null;
    if (!isBlank(body.phone)) {
        phone = asTrimmedString(body.phone, { max: 30 });
        if (!phone || !isPhone(phone)) throw new HttpError(400, "Unesite ispravan broj telefona");
    }

    let role: SelfServiceRole = "parent";
    if (!isBlank(body.role)) {
        const chosen = oneOf(body.role, SELF_SERVICE_ROLES);
        if (!chosen) throw new HttpError(400, "Izaberite ulogu: roditelj, učitelj ili terapeut");
        role = chosen;
    }

    return { email, password, full_name, phone, role };
}

export async function POST(request: Request) {
    try {
        const input = parseRegisterInput(await readJsonObject(request));
        assertDbConfigured();

        enforceRateLimit(
            takeAttempt(`register:${getClientIp(request)}`, REGISTER_RULE),
            "Previše pokušaja registracije. Pokušajte ponovo kasnije."
        );

        if (await findUserByEmail(input.email)) throw new HttpError(409, EMAIL_TAKEN);

        const password_hash = await bcrypt.hash(input.password, 10);
        const { data, error } = await supabaseAdmin
            .from("users")
            .insert({
                email: input.email,
                password_hash,
                full_name: input.full_name,
                phone: input.phone,
                role: input.role,
            })
            .select(PUBLIC_USER_COLUMNS)
            .single();

        if (error) {
            if (isUniqueViolation(error)) throw new HttpError(409, EMAIL_TAKEN);
            throw error;
        }

        const user = toPublicUser(data as PublicUser);
        const response = NextResponse.json({ success: true, user }, { status: 201 });
        setSessionCookie(response, { userId: user.id, email: user.email, role: user.role });
        return response;
    } catch (error) {
        return errorResponse(error, "POST /api/auth/register");
    }
}
