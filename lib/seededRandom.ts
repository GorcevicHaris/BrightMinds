// lib/seededRandom.ts
// Nasumični brojevi iz zajedničkog „semena” — za dvoboj „ko je brži” (lib/versusFormat.ts).
//
// U dvoboju na dva uređaja svako dete igra svoju kopiju igre. Da bi trka bila poštena, oba
// deteta moraju dobiti ISTE zadatke istim redom: server pri prihvatanju poziva napravi seme
// (app/api/_lib/invites.ts), a igre umesto Math.random koriste generator iz tog semena
// (useGameRandom u app/components/games/kit/random.ts). Van dvoboja generator je Math.random,
// kao i do sada. Slučajnost koja je samo ukras (konfete, pohvala, pokreti drugara) ostaje
// nevezana za seme — ne utiče na zadatke.
//
// Čist modul (bez zavisnosti): isti rezultat u pregledaču, na serveru i u testovima.

/** 32-bitni heš teksta (FNV-1a sa „solju”), da isto seme daje četiri različita početna broja. */
function hash32(text: string, salt: number): number {
    let h = (0x811c9dc5 ^ Math.imul(salt, 0x9e3779b1)) >>> 0;
    for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    // Završno mešanje bitova (murmur3 fmix), da slična semena ne daju slične nizove
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}

/**
 * Generator brojeva u [0, 1) iz semena (sfc32). Isto seme uvek daje isti niz — na svakom
 * uređaju i u svakom pregledaču (samo celobrojna 32-bitna aritmetika).
 */
export function seededRandom(seed: string): () => number {
    let a = hash32(seed, 1);
    let b = hash32(seed, 2);
    let c = hash32(seed, 3);
    let d = hash32(seed, 4);
    const next = () => {
        const t = (((a + b) | 0) + d) | 0;
        d = (d + 1) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        c = (c + t) | 0;
        return (t >>> 0) / 4294967296;
    };
    // Prvih nekoliko brojeva se preskače (početno stanje je još „blizu” semena)
    for (let i = 0; i < 12; i += 1) next();
    return next;
}

/** Seme jedne partije dvoboja: isto za oba deteta (zajedničko seme sesije, igra, nivo i redni broj partije). */
export function duelSeed(sessionSeed: string, game: string, level: number, index: number): string {
    return `${sessionSeed}:${game}:${level}:${index}`;
}

const SEED_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/** Seme sesije iz servera ili skladišta; sve neispravno → null (igra bez semena, Math.random). */
export function cleanSeed(raw: unknown): string | null {
    return typeof raw === "string" && SEED_PATTERN.test(raw) ? raw : null;
}

/** Novo seme u pregledaču (dvoboj na istom uređaju sa drugom bez naloga). */
export function localSeed(): string {
    const bytes = new Uint8Array(12);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
