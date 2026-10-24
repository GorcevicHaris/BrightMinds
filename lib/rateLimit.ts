// lib/rateLimit.ts
// Jednostavan ograničavač učestalosti sa kliznim prozorom, u memoriji procesa.
//
// VAŽNO: stanje živi samo u ovoj instanci servera — ne deli se između više
// instanci/serverless funkcija i briše se pri restartu. To je "best-effort"
// zaštita od pogađanja lozinki i PIN-ova, dovoljna za ovu aplikaciju; za strogo
// ograničenje u okruženju sa više instanci potreban je deljeni store (npr. Redis).
//
// IP adresa se čita iz `x-forwarded-for` / `x-real-ip`. Ta zaglavlja su pouzdana
// samo kada ih postavlja proxy ispred aplikacije (Vercel, nginx...). Ako je
// server direktno izložen, klijent ih može lažirati.

export interface RateLimitRule {
    /** Najveći broj pokušaja u prozoru */
    limit: number;
    /** Dužina prozora u milisekundama */
    windowMs: number;
}

export interface Attempt {
    allowed: boolean;
    /** Za koliko sekundi se oslobađa sledeći pokušaj (0 kada je dozvoljeno) */
    retryAfterSec: number;
    /** Vraća utrošeni pokušaj — npr. posle uspešne prijave, da se broje samo neuspešni. */
    refund: () => void;
}

interface Bucket {
    hits: number[];
    windowMs: number;
}

const MAX_KEYS = 10_000;

// Na globalThis da stanje preživi "hot reload" i da ga dele sve rute u procesu.
const globalStore = globalThis as typeof globalThis & { __brightMindsRateLimit?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = (globalStore.__brightMindsRateLimit ??= new Map());

function sweep(now: number): void {
    for (const [key, bucket] of buckets) {
        const last = bucket.hits[bucket.hits.length - 1];
        if (last === undefined || last <= now - bucket.windowMs) buckets.delete(key);
    }
    // I dalje previše ključeva (napad sa mnogo adresa): izbaci najstarije unose.
    for (const key of buckets.keys()) {
        if (buckets.size <= MAX_KEYS) break;
        buckets.delete(key);
    }
}

/**
 * Troši jedan pokušaj za dati ključ. Pokušaj se rezerviše ODMAH (pre bilo kakvog
 * asinhronog posla), pa paralelni zahtevi ne mogu da zaobiđu ograničenje.
 */
export function takeAttempt(key: string, rule: RateLimitRule, now: number = Date.now()): Attempt {
    const cutoff = now - rule.windowMs;
    const hits = (buckets.get(key)?.hits ?? []).filter((time) => time > cutoff);

    if (hits.length >= rule.limit) {
        buckets.set(key, { hits, windowMs: rule.windowMs });
        const retryAfterSec = Math.max(1, Math.ceil((hits[0] + rule.windowMs - now) / 1000));
        return { allowed: false, retryAfterSec, refund: () => undefined };
    }

    hits.push(now);
    buckets.set(key, { hits, windowMs: rule.windowMs });
    if (buckets.size > MAX_KEYS) sweep(now);

    let refunded = false;
    return {
        allowed: true,
        retryAfterSec: 0,
        refund: () => {
            if (refunded) return;
            refunded = true;
            const bucket = buckets.get(key);
            if (!bucket) return;
            const index = bucket.hits.lastIndexOf(now);
            if (index !== -1) bucket.hits.splice(index, 1);
            if (bucket.hits.length === 0) buckets.delete(key);
        },
    };
}

/** Briše sve zabeležene pokušaje za ključ. */
export function resetRateLimit(key: string): void {
    buckets.delete(key);
}

/** IP adresa klijenta: prvi unos iz `x-forwarded-for`, zatim `x-real-ip`, inače "unknown". */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
    return ip.slice(0, 64);
}

/**
 * Troši po jedan pokušaj za svaki par (ključ, pravilo) — npr. kratak i dug prozor po IP
 * adresi i zajednički osigurač za sve adrese. Dozvoljeno je samo ako dozvoljavaju sva
 * pravila; čim jedno odbije, pokušaji potrošeni na ostala se vraćaju (odbijen zahtev se
 * ne broji dvaput). `retryAfterSec` je najduže čekanje među pravilima koja su odbila.
 */
export function takeAttempts(entries: readonly { key: string; rule: RateLimitRule }[], now: number = Date.now()): Attempt {
    const taken: Attempt[] = [];
    for (const { key, rule } of entries) {
        const attempt = takeAttempt(key, rule, now);
        if (!attempt.allowed) {
            for (const previous of taken) previous.refund();
            // Ostala pravila se ipak pitaju, da poruka kaže koliko se zaista čeka
            let retryAfterSec = attempt.retryAfterSec;
            for (const other of entries.slice(taken.length + 1)) {
                const probe = takeAttempt(other.key, other.rule, now);
                if (probe.allowed) probe.refund();
                else retryAfterSec = Math.max(retryAfterSec, probe.retryAfterSec);
            }
            return { allowed: false, retryAfterSec, refund: () => undefined };
        }
        taken.push(attempt);
    }
    return {
        allowed: true,
        retryAfterSec: 0,
        refund: () => {
            for (const attempt of taken) attempt.refund();
        },
    };
}
