// lib/speech.ts
// Jedno mesto za govor u aplikaciji.
//  1) ElevenLabs preko /api/tts (keširano po tekstu, da ponavljanje ne troši kvotu)
//  2) ako TTS nije podešen ili padne — govor iz pregledača (ako postoji naš glas)
// Kada je 3D avatar na ekranu, on preuzima reprodukciju i pomera usta.
"use client";

import { useCallback, useEffect } from "react";
import { masterVolume, voiceEnabled } from "./sound";

export interface SpeakOptions {
    gender?: string;
    onEnd?: () => void;
}

interface AvatarSpeakDetail {
    url: string | null;
    text: string;
    onEnd: () => void;
}

const MAX_CACHED = 60;
const audioCache = new Map<string, string>();
let ttsUnavailable = false;
let currentAudio: HTMLAudioElement | null = null;
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
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
        window.dispatchEvent(new Event("avatar:stop"));
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

async function requestAudio(key: string, text: string, gender?: string): Promise<string | null> {
    try {
        const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, gender }),
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

function fetchAudio(text: string, gender?: string): Promise<string | null> {
    if (ttsUnavailable) return Promise.resolve(null);

    const key = `${gender?.toLowerCase() ?? ""}|${text}`;
    const cached = audioCache.get(key);
    if (cached) return Promise.resolve(cached);

    let pending = inflight.get(key);
    if (!pending) {
        pending = requestAudio(key, text, gender);
        inflight.set(key, pending);
    }
    return pending;
}

function findLocalVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    return voices.find((v) => /^(sr|hr|bs)([-_]|$)/i.test(v.lang)) ?? null;
}

function speakWithBrowser(text: string, done: () => void) {
    const voice = findLocalVoice();
    // Bez našeg glasa tekst bi zvučao pogrešno — tada radije ćutimo
    if (!voice) {
        done();
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.9;
    utterance.volume = masterVolume();
    const finish = () => {
        window.dispatchEvent(new Event("avatar:stop"));
        done();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    window.dispatchEvent(
        new CustomEvent<AvatarSpeakDetail>("avatar:speak", { detail: { url: null, text, onEnd: () => {} }, cancelable: true })
    );
    window.speechSynthesis.speak(utterance);
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

    stopSpeaking();
    // Zvuk je isključen: ništa ne puštamo (i ne trošimo TTS), ali tok igre ide dalje
    if (!voiceEnabled()) {
        done();
        return;
    }
    const mine = generation;

    const url = await fetchAudio(spoken, options.gender);
    if (mine !== generation) return; // u međuvremenu je pokrenut drugi govor

    if (!url) {
        speakWithBrowser(spoken, done);
        return;
    }

    const event = new CustomEvent<AvatarSpeakDetail>("avatar:speak", {
        detail: { url, text, onEnd: done },
        cancelable: true,
    });
    const handledByAvatar = !window.dispatchEvent(event);
    if (handledByAvatar) return;

    const audio = new Audio(url);
    audio.volume = masterVolume();
    currentAudio = audio;
    audio.onended = done;
    audio.onerror = done;
    try {
        await audio.play();
    } catch {
        done();
    }
}

/** Hook: `say(text)` sa polom deteta, govor se prekida kad komponenta nestane. */
export function useSpeech(gender?: string) {
    useEffect(() => stopSpeaking, []);

    const say = useCallback((text: string, onEnd?: () => void) => speak(text, { gender, onEnd }), [gender]);

    return { say, stop: stopSpeaking };
}
