// lib/requestOrigin.ts
// Zaštita od zahteva sa tuđih sajtova (CSRF) za API rute koje menjaju podatke.
// Kolačić sesije je već `SameSite=Lax`, pa ga pregledač ne šalje uz tuđi POST; ovo je
// druga brava: zahtev koji menja podatke mora da dolazi sa iste adrese (Origin = Host)
// i pregledač ne sme da ga označi kao „cross-site”. Prijava kodom (verify-pin) nema
// kolačić, pa je bez ove provere tuđi sajt mogao da prijavi pregledač na tuđe dete.
// Čist modul — koristi ga proxy.ts, a testovi ga pozivaju direktno.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

interface HeaderSource {
    get(name: string): string | null;
}

/** Host sa portom iz Origin zaglavlja; null ako zaglavlje nije ispravna adresa. */
function originHost(origin: string): string | null {
    try {
        return new URL(origin).host.toLowerCase();
    } catch {
        return null;
    }
}

/**
 * Da li zahtev koji menja podatke dolazi sa drugog sajta. Zahtevi bez Origin i
 * Sec-Fetch-Site zaglavlja (alati, stariji pregledači) prolaze: od njih štiti SameSite kolačić.
 */
export function isCrossSiteMutation(method: string, headers: HeaderSource): boolean {
    if (SAFE_METHODS.has(method.toUpperCase())) return false;
    if (headers.get("sec-fetch-site")?.toLowerCase() === "cross-site") return true;

    const origin = headers.get("origin");
    if (!origin) return false;
    // Zahtev iz izolovanog konteksta (npr. sandbox iframe) šalje „null”
    if (origin === "null") return true;
    const host = (headers.get("x-forwarded-host") ?? headers.get("host"))?.split(",")[0]?.trim().toLowerCase();
    const from = originHost(origin);
    return !host || from !== host;
}
