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

async function requestAudio(key: string, text: string, emotion: VoiceEmotion, gender?: string, personal?: boolean): Promise<string | null> {
    try {
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
        const url = URL.createObjectURL(await res.blob());
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
