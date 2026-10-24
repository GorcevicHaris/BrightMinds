// lib/realtimeTopic.ts — samo server.
// Naziv Realtime kanala za praćenje jednog deteta. Supabase Broadcast kanal može da sluša
// svako ko zna naziv, zato naziv sadrži deo izveden iz serverske tajne i dobija ga samo
// stranica kojoj je pristup detetu već proveren (roditelj tog deteta ili samo dete).
// Ovo je zaštita tajnošću naziva; potpuna zaštita su privatni kanali sa Realtime
// autorizacijom, što traži Supabase JWT tajnu (videti docs/istrazivanje.md).
import { createHmac } from "node:crypto";

function secret(): string {
    const value = process.env.JWT_SECRET;
    if (!value) throw new Error("JWT_SECRET nije podešen. Dodajte ga u .env.local");
    return value;
}

export function realtimeTopicFor(childId: number): string {
    const tag = createHmac("sha256", secret()).update(`realtime-topic:${childId}`).digest("hex").slice(0, 32);
    return `bm-${childId}-${tag}`;
}

/**
 * Kanal igre sa drugom na drugom uređaju: HMAC (serverska tajna) od deteta domaćina i
 * nasumičnog ključa poziva. Ne izvodi se iz koda od sličica (kod ima samo 10.000 mogućnosti)
 * i ne sadrži ID deteta — ko zna samo kod, ne zna kanal; kanal dobijaju samo domaćin i drug
 * koji je kod uneo na serveru.
 */
export function inviteChannelFor(hostChildId: number, channelKey: string): string {
    const tag = createHmac("sha256", secret()).update(`invite:${hostChildId}:${channelKey}`).digest("hex").slice(0, 40);
    return `bm-inv-${tag}`;
}
