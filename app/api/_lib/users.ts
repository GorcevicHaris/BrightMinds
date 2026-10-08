// app/api/_lib/users.ts
// Zajednički deo ruta za naloge (login, register, me).
import { supabaseAdmin } from "@/lib/supabase";
import { escapeLikePattern } from "@/lib/validation";

/** Podaci o nalogu koji smeju da stignu do pregledača. */
export interface PublicUser {
    id: number;
    full_name: string;
    email: string;
    role: string;
}

export interface UserRow extends PublicUser {
    password_hash: string | null;
}

export const PUBLIC_USER_COLUMNS = "id, full_name, email, role";

export function toPublicUser(row: PublicUser): PublicUser {
    return { id: row.id, full_name: row.full_name, email: row.email, role: row.role };
}

/**
 * Nalog po email adresi, bez obzira na velika/mala slova (stariji nalozi su
 * mogli biti sačuvani sa velikim slovima). `email` mora biti već normalizovan.
 */
export async function findUserByEmail(email: string): Promise<UserRow | null> {
    const { data, error } = await supabaseAdmin
        .from("users")
        .select(`${PUBLIC_USER_COLUMNS}, password_hash`)
        .ilike("email", escapeLikePattern(email))
        .order("id", { ascending: true })
        .limit(5);
    if (error) throw error;

    const rows = (data ?? []) as UserRow[];
    return rows.find((row) => row.email === email) ?? rows[0] ?? null;
}
