// app/api/_lib/inbox.ts
// Znak „pogledaj” na sanduče deteta (lib/realtimeTopic.ts → inboxTopicFor): server ga šalje
// kad drugu stigne poziv, kad domaćinu stigne odgovor i kad domaćin odustane. Ide preko
// Supabase Realtime REST poruke (Broadcast) — stranica deteta je pretplaćena na svoje sanduče
// (lib/inviteInbox.ts) i tada sa servera uzima sam poziv, uz proveru pristupa. U poruci je
// samo razlog (bez imena, igre i ključeva), pa ni onaj ko bi pogodio naziv ne saznaje ništa.
//
// Slanje je sporedno: kad ne uspe, stranice to nadoknade proverom na serveru (domaćin dok čeka
// proverava na nekoliko sekundi, a drug pri otvaranju stranice i kad se vrati na nju).
import { inboxTopicFor } from "@/lib/realtimeTopic";

export type InboxReason = "request" | "answer" | "cancel";

export const INBOX_EVENT = "inbox:changed";
/** Kratko: zahtev deteta ne sme da čeka sporu mrežu */
const PUSH_TIMEOUT_MS = 2_500;

async function sendBroadcast(topic: string, event: string, payload: Record<string, unknown>): Promise<void> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    const response = await fetch(`${url.replace(/\/$/, "")}/realtime/v1/api/broadcast`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ topic, event, payload, private: false }] }),
        signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
        cache: "no-store",
    });
    if (response.status !== 202 && !response.ok) throw new Error(`broadcast ${response.status}`);
}

/** Zamenljivo u testovima (tests/setup/api.ts beleži poslate znakove umesto da ih šalje). */
export const inboxPush = { send: sendBroadcast };

/** Javlja detetu `childId` da pogleda poziv; greška se samo beleži. */
export async function notifyInbox(childId: number, reason: InboxReason): Promise<void> {
    try {
        await inboxPush.send(inboxTopicFor(childId), INBOX_EVENT, { r: reason });
    } catch (error) {
        console.error("[api] inbox push:", error instanceof Error ? error.message : error);
    }
}
