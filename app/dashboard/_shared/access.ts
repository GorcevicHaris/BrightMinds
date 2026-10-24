// app/dashboard/_shared/access.ts
// Provera pristupa za stranice o jednom detetu — na serveru, PRE nego što se išta učita
// ili prikaže (API rute imaju istu proveru, ali stranica ne sme da se osloni samo na njih).
// Čiste funkcije bez JSX-a, da ih testovi pozivaju direktno.
//  • /dashboard/child/[id]             — roditelj povezan sa detetom ili dečja sesija baš tog deteta
//  • /dashboard/progress|monitor/[id]  — samo roditelj povezan sa detetom
import { AuthError, requireChildAccess, requireChildOwner } from "@/lib/auth";

export type PageAccess<Viewer extends string> =
    | { kind: "ok"; childId: number; viewer: Viewer }
    /** Nema (važeće) sesije → prijava */
    | { kind: "login" }
    /** Tuđe dete, dečja sesija drugog deteta, neispravan ili nepostojeći ID */
    | { kind: "denied" }
    /** Baza trenutno ne odgovara */
    | { kind: "unavailable" };

/** ID iz putanje: samo pozitivan ceo broj zapisan ciframa („1e3”, „0x5”, „ 1” nisu ID). */
export function parseChildIdParam(raw: string): number | null {
    return /^[1-9]\d{0,14}$/.test(raw) ? Number(raw) : null;
}

function refused(error: unknown): PageAccess<never> {
    if (error instanceof AuthError) return error.status === 401 ? { kind: "login" } : { kind: "denied" };
    return { kind: "unavailable" };
}

/** Dečji ekran: roditelj tog deteta ili dete prijavljeno svojim kodom. */
export async function childPageAccess(idParam: string): Promise<PageAccess<"child" | "parent">> {
    const childId = parseChildIdParam(idParam);
    if (childId === null) return { kind: "denied" };
    try {
        const session = await requireChildAccess(childId);
        return { kind: "ok", childId, viewer: session.childId ? "child" : "parent" };
    } catch (error) {
        return refused(error);
    }
}

/** Statistika i praćenje uživo: samo roditelj/terapeut povezan sa detetom (dečja sesija nikad). */
export async function ownerPageAccess(idParam: string): Promise<PageAccess<"parent">> {
    const childId = parseChildIdParam(idParam);
    if (childId === null) return { kind: "denied" };
    try {
        await requireChildOwner(childId);
        return { kind: "ok", childId, viewer: "parent" };
    } catch (error) {
        return refused(error);
    }
}
