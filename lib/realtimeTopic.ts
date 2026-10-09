// lib/realtimeTopic.ts — samo server.
// Naziv Realtime kanala za praćenje jednog deteta. Supabase Broadcast kanal može da sluša
// svako ko zna naziv, zato naziv sadrži deo izveden iz serverske tajne i dobija ga samo
// stranica kojoj je pristup detetu već proveren (roditelj tog deteta ili samo dete).
// Ovo je zaštita tajnošću naziva; potpuna zaštita su privatni kanali sa Realtime
// autorizacijom, što traži Supabase JWT tajnu (videti docs/istrazivanje.md).
import { createHmac } from "node:crypto";

export function realtimeTopicFor(childId: number): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET nije podešen. Dodajte ga u .env.local");
    const tag = createHmac("sha256", secret).update(`realtime-topic:${childId}`).digest("hex").slice(0, 32);
    return `bm-${childId}-${tag}`;
}
