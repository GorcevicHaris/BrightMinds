// lib/speech.ts
// Jedno mesto za govor u aplikaciji.
//  1) ElevenLabs preko /api/tts (keširano po tekstu, da ponavljanje ne troši kvotu)
//  2) ako TTS nije podešen ili padne — govor iz pregledača (ako postoji naš glas)
// Svaka rečenica nosi emociju (navedenu ili prepoznatu iz teksta): po njoj se bira
// boja glasa, a lice učitelja (lib/voice.ts) dobija isti izraz i pomera usta.
"use client";

import { useCallback, useEffect } from "react";
import { BROWSER_PROSODY, emotionForText, type VoiceEmotion } from "./emotion";
import { masterVolume, voiceEnabled } from "./sound";
import { mimeVoice, playVoice, showEmotion, stopVoice } from "./voice";

export interface SpeakOptions {
    gender?: string;
    /** Bez ovoga emocija se prepoznaje iz teksta (pohvala, pitanje, osećanje u priči…) */
    emotion?: VoiceEmotion;
    onEnd?: () => void;
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
        window.speechSynthesis?.cancel();
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

async function requestAudio(key: string, text: string, emotion: VoiceEmotion, gender?: string): Promise<string | null> {
    try {
        const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, gender, emotion }),
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

function fetchAudio(text: string, emotion: VoiceEmotion, gender?: string): Promise<string | null> {
    if (ttsUnavailable) return Promise.resolve(null);

    const key = `${gender?.toLowerCase() ?? ""}|${emotion}|${text}`;
    const cached = audioCache.get(key);
    if (cached) return Promise.resolve(cached);

    let pending = inflight.get(key);
    if (!pending) {
        pending = requestAudio(key, text, emotion, gender);
        inflight.set(key, pending);
    }
    return pending;
}

/** Srpski glas ima prednost; bosanski i hrvatski su rezerva kad srpskog nema na uređaju */
const VOICE_LANGUAGES = ["sr", "bs", "hr"];
/** Pregledač glasove učitava sa zakašnjenjem — toliko najduže čekamo na prvi spisak */
const VOICES_WAIT_MS = 700;

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    for (const language of VOICE_LANGUAGES) {
        const pattern = new RegExp(`^${language}([-_]|$)`, "i");
        const matches = voices.filter((v) => pattern.test(v.lang));
        // Glas sa samog uređaja radi i bez interneta, pa ima prednost nad mrežnim
        const voice = matches.find((v) => v.localService) ?? matches[0];
        if (voice) return voice;
    }
    return null;
}

async function findLocalVoice(): Promise<SpeechSynthesisVoice | null> {
    const synth = window.speechSynthesis;
    if (!synth) return null;
    let voices = synth.getVoices();
    if (voices.length === 0) {
        await new Promise<void>((resolve) => {
            const finish = () => {
                synth.removeEventListener("voiceschanged", finish);
                resolve();
            };
            synth.addEventListener("voiceschanged", finish);
            setTimeout(finish, VOICES_WAIT_MS);
        });
        voices = synth.getVoices();
    }
    return pickVoice(voices);
}

async function speakWithBrowser(text: string, emotion: VoiceEmotion, mine: number, done: () => void) {
    const voice = await findLocalVoice();
    if (mine !== generation) return; // dok su se glasovi učitavali, pokrenut je drugi govor
    // Bez našeg glasa tekst bi zvučao pogrešno — tada radije ćutimo (lice ipak pokaže izraz)
    if (!voice) {
        showEmotion(emotion);
        done();
        return;
    }
    const prosody = BROWSER_PROSODY[emotion];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = prosody.rate;
    utterance.pitch = prosody.pitch;
    utterance.volume = masterVolume();
    const endMime = mimeVoice(emotion);
    const finish = () => {
        endMime();
        done();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
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

    const url = await fetchAudio(spoken, emotion, options.gender);
    if (mine !== generation) return; // u međuvremenu je pokrenut drugi govor

    if (!url) {
        await speakWithBrowser(spoken, emotion, mine, done);
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
