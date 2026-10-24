// app/api/_lib/pinLimits.ts
// Ograničenja pokušaja za prijavu deteta tajnim kodom (POST /api/children/verify-pin).
// U posebnom modulu jer ruta sme da izvozi samo GET/POST/… (Next.js proverava izvoze rute).
import type { RateLimitRule } from "@/lib/rateLimit";

// Tajni kod su četiri sličice od po deset (10.000 kombinacija) i nema korisničkog imena,
// pa se neuspešni pokušaji ograničavaju na tri nivoa (broje se samo pogrešni kodovi):
/** Kratko: posle 8 pogrešnih kodova sa iste adrese čeka se do 5 minuta. */
export const PIN_RULE: RateLimitRule = { limit: 8, windowMs: 5 * 60 * 1000 };
/** Zaključavanje: 20 pogrešnih kodova sa iste adrese za sat vremena zaključava je do sat vremena. */
export const PIN_LOCKOUT_RULE: RateLimitRule = { limit: 20, windowMs: 60 * 60 * 1000 };
/**
 * Osigurač za sve adrese zajedno: pogađanje sa mnogo adresa se zaustavlja posle 60 pogrešnih
 * kodova za 10 minuta. Tada se dete privremeno ne može prijaviti kodom, ali roditelj i dalje
 * otvara igru iz svog panela — to je manja šteta od tuđeg ulaska u profil deteta.
 */
export const PIN_GLOBAL_RULE: RateLimitRule = { limit: 60, windowMs: 10 * 60 * 1000 };
