// lib/speech.ts
// Jedno mesto za govor u aplikaciji.
//  1) ElevenLabs preko /api/tts (keširano po tekstu i na serveru, da ponavljanje ne troši kvotu)
//  2) ako glas nije dostupan — učitelj ćuti, a tekst ostaje na ekranu. Glas iz pregledača
//     se namerno ne koristi: drugi, mašinski glas usred igre zbunjuje dete.
// Svaka rečenica nosi emociju (navedenu ili prepoznatu iz teksta): po njoj se bira
// boja glasa, a lice učitelja (lib/voice.ts) dobija isti izraz i pomera usta.
"use client";

import { useCallback, useEffect } from "react";
import { emotionForText, type VoiceEmotion } from "./emotion";
import { voiceEnabled } from "./sound";
import { playVoice, showEmotion, stopVoice } from "./voice";

export interface SpeakOptions {
    gender?: string;
    /** Bez ovoga emocija se prepoznaje iz teksta (pohvala, pitanje, osećanje u priči…) */
    emotion?: VoiceEmotion;
    onEnd?: () => void;
    /** Tekst sa ličnim podacima (ime deteta): server ga izgovara, ali ne čuva u kešu */
    personal?: boolean;
    /** Rečenica koja je stigla sa drugog uređaja (zajednička tabla): ne javlja se dalje */
    relayed?: boolean;
}

const MAX_CACHED = 60;
const audioCache = new Map<string, string>();
let ttsUnavailable = false;
let generation = 0;
// Zahtevi u toku, po tekstu: isti tekst se ne naručuje dvaput dok prvi odgovor ne stigne
const inflight = new Map<string, Promise<string | null>>();

// Emodžiji i simboli ne treba da se čitaju naglas
const PICTOGRAPHS = new RegExp("[\\p{Extended_Pictographic}\\uFE0F\\u200D→]", "gu");

function cleanForSpeech(text: string): string {
    return text.replace(PICTOGRAPHS, " ").replace(/\s+/g, " ").trim();
}

function once(fn?: () => void): () => void {
    let called = false;
    return () => {
        if (called) return;
        called = true;
        fn?.();
    };
}

export function stopSpeaking() {
    generation += 1;
    // Zahtev koji je već otišao se NE prekida: sinteza je već plaćena, pa odgovor ide u
    // keš i sledeći put se pušta odmah. Zakasneli zvuk se ne pušta (provera `generation`).
    if (typeof window !== "undefined") {
        stopVoice();
    }
}

function rememberAudio(key: string, url: string) {
    audioCache.set(key, url);
    if (audioCache.size > MAX_CACHED) {
        const oldest = audioCache.keys().next().value;
        if (oldest !== undefined) {
            URL.revokeObjectURL(audioCache.get(oldest)!);
            audioCache.delete(oldest);
        }
    }
}

// Snimci se čuvaju i na samom uređaju (Cache Storage): ponovljena rečenica se pušta odmah,
// i posle zatvaranja pregledača, bez čekanja na mrežu. Lične rečenice (sa imenom) se ne čuvaju.
const DEVICE_CACHE = "bm-voice-v1";
/** Otisak glasa sa servera (X-Voice-Version); kad se promeni, snimci na uređaju se brišu */
const VOICE_VERSION_KEY = "bm:voice-version";

function checkVoiceVersion(version: string | null) {
    if (!version) return;
    try {
        if (window.localStorage.getItem(VOICE_VERSION_KEY) === version) return;
        window.localStorage.setItem(VOICE_VERSION_KEY, version);
        if (typeof caches !== "undefined") void caches.delete(DEVICE_CACHE).catch(() => {});
        // Snimci u memoriji ove stranice su takođe starim glasom
        audioCache.forEach((url) => URL.revokeObjectURL(url));
        audioCache.clear();
    } catch {
        // Bez skladišta: nema ni snimaka na uređaju koje bi trebalo obrisati
    }
}

function deviceCacheUrl(key: string): string {
    return `/__voice__/${encodeURIComponent(key)}`;
}

async function readDeviceCache(key: string): Promise<Blob | null> {
    try {
        if (typeof caches === "undefined") return null;
        const hit = await (await caches.open(DEVICE_CACHE)).match(deviceCacheUrl(key));
        return hit ? await hit.blob() : null;
    } catch {
        return null;
    }
}

function writeDeviceCache(key: string, blob: Blob) {
    try {
        if (typeof caches === "undefined") return;
        void caches
            .open(DEVICE_CACHE)
            .then((cache) => cache.put(deviceCacheUrl(key), new Response(blob, { headers: { "Content-Type": "audio/mpeg" } })))
            .catch(() => {});
    } catch {
        // Bez skladišta na uređaju (privatni režim): rečenica se samo ponovo traži od servera
    }
}

async function requestAudio(key: string, text: string, emotion: VoiceEmotion, gender?: string, personal?: boolean): Promise<string | null> {
    try {
        const stored = personal ? null : await readDeviceCache(key);
        if (stored) {
            const url = URL.createObjectURL(stored);
            rememberAudio(key, url);
            return url;
        }
        const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, gender, emotion, personal }),
        });
        if (!res.ok) {
            // 503 = ključ nije podešen; ne pokušavamo ponovo u ovoj sesiji
            if (res.status === 503) ttsUnavailable = true;
            return null;
        }
        checkVoiceVersion(res.headers.get("X-Voice-Version"));
        const blob = await res.blob();
        if (!personal) writeDeviceCache(key, blob);
        const url = URL.createObjectURL(blob);
        rememberAudio(key, url);
        return url;
    } catch {
        return null;
    } finally {
        inflight.delete(key);
    }
}

function fetchAudio(text: string, emotion: VoiceEmotion, gender?: string, personal?: boolean): Promise<string | null> {
    if (ttsUnavailable) return Promise.resolve(null);

    const key = `${gender?.toLowerCase() ?? ""}|${emotion}|${text}`;
    const cached = audioCache.get(key);
    if (cached) return Promise.resolve(cached);

    let pending = inflight.get(key);
    if (!pending) {
        pending = requestAudio(key, text, emotion, gender, personal);
        inflight.set(key, pending);
    }
    return pending;
}

/**
 * Slušalac izgovorenih rečenica (zajednička tabla, playShared.tsx: drug na drugom uređaju čuje
 * isto uputstvo). Rečenice sa ličnim podacima (`personal`) se ne javljaju.
 */
type SpokenListener = (text: string, emotion: VoiceEmotion) => void;
const spokenListeners = new Set<SpokenListener>();

export function onSpoken(listener: SpokenListener): () => void {
    spokenListeners.add(listener);
    return () => {
        spokenListeners.delete(listener);
    };
}

/** Izgovara tekst. Prekida prethodni govor. `onEnd` se zove tačno jednom (i kad govor nije moguć). */
export async function speak(text: string, options: SpeakOptions = {}): Promise<void> {
    if (typeof window === "undefined") return;
    const done = once(options.onEnd);
    const spoken = cleanForSpeech(text);
    if (!spoken) {
        done();
        return;
    }

    const emotion = options.emotion ?? emotionForText(spoken);
    if (!options.personal && !options.relayed) spokenListeners.forEach((fn) => fn(spoken, emotion));

    stopSpeaking();
    // Zvuk je isključen: ništa ne puštamo (i ne trošimo TTS), ali tok igre ide dalje,
    // a lice učitelja i bez glasa pokaže kako je rečenica mišljena
    if (!voiceEnabled()) {
        showEmotion(emotion);
        done();
        return;
    }
    const mine = generation;

    const url = await fetchAudio(spoken, emotion, options.gender, options.personal);
    if (mine !== generation) return; // u međuvremenu je pokrenut drugi govor

    if (!url) {
        // Bez našeg glasa radije ćutimo; lice ipak pokaže kako je rečenica mišljena
        showEmotion(emotion);
        done();
        return;
    }
    await playVoice(url, emotion, done);
}

/** Hook: `say(text)` sa polom deteta, govor se prekida kad komponenta nestane. */
export function useSpeech(gender?: string) {
    useEffect(() => stopSpeaking, []);

    const say = useCallback(
        (text: string, onEnd?: () => void, emotion?: VoiceEmotion) => speak(text, { gender, onEnd, emotion }),
        [gender]
    );

    return { say, stop: stopSpeaking };
}
