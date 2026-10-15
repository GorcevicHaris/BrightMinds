// lib/ttsCache.ts
// Trajni keš izgovorenih rečenica (samo server). Igre ponavljaju iste rečenice
// („Bravo!”, uputstva, priče), a svaka sinteza troši plaćenu ElevenLabs kvotu —
// zato se svaki snimak čuva u privatnom Supabase Storage bucket-u i sledeći put
// se pušta odande, za svako dete i svaki uređaj. Keš nikad ne obara govor:
// svaka greška znači samo „nema u kešu” ili „nije sačuvano”.
import { createHash } from "node:crypto";
import { supabaseAdmin, supabaseConfigured } from "./supabase";

const BUCKET = "tts-cache";

let bucketReady: Promise<boolean> | null = null;

function ensureBucket(): Promise<boolean> {
    bucketReady ??= (async () => {
        const { error } = await supabaseAdmin.storage.createBucket(BUCKET, { public: false });
        // Bucket koji već postoji je u redu
        return !error || /exist/i.test(error.message);
    })().catch(() => false);
    return bucketReady;
}

/** Ključ snimka: isti tekst istim glasom, modelom i tonom daje isti snimak. */
export function ttsCacheKey(parts: readonly string[]): string {
    return `${createHash("sha256").update(parts.join("\u0000")).digest("hex")}.mp3`;
}

export async function readCachedAudio(key: string): Promise<ArrayBuffer | null> {
    if (!supabaseConfigured) return null;
    try {
        const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(key);
        if (error || !data) return null;
        const audio = await data.arrayBuffer();
        return audio.byteLength > 0 ? audio : null;
    } catch {
        return null;
    }
}

export async function storeCachedAudio(key: string, audio: ArrayBuffer): Promise<void> {
    if (!supabaseConfigured || !(await ensureBucket())) return;
    try {
        await supabaseAdmin.storage.from(BUCKET).upload(key, audio, { contentType: "audio/mpeg", upsert: true });
    } catch {
        // Nesačuvan snimak samo znači da će se sledeći put ponovo sintetizovati
    }
}
