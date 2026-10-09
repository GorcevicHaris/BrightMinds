// lib/emotion.ts
// Emocija izgovorene rečenice: po njoj se podešava boja glasa i izraz lica učitelja.
// Sve je blago po nameri — glas nikad ne viče, lice nikad nije strogo prema detetu.

export const VOICE_EMOTIONS = ["neutral", "hello", "happy", "proud", "gentle", "curious", "sad", "angry", "scared", "surprised"] as const;

export type VoiceEmotion = (typeof VOICE_EMOTIONS)[number];

export function isVoiceEmotion(value: unknown): value is VoiceEmotion {
    return typeof value === "string" && (VOICE_EMOTIONS as readonly string[]).includes(value);
}

// ── Prepoznavanje iz teksta ───────────────────────────────────────────────────

function simplify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[čć]/g, "c")
        .replace(/ž/g, "z")
        .replace(/š/g, "s")
        .replace(/đ/g, "dj");
}

const GREETING = /^(zdravo|cao|dobro dos|dobar dan|dobro jutro|dobro vece)/;
const PROUD = /(nivo je zavrsen|sve si (resi|zavrsi|uradi)|zavrsi(o|la) si|svaka cast)/;
const PRAISE = /^(bravo|odlicno|super|sjajno|tako je|tacno|lepo|uspe(o|la)|pogodi(o|la))/;
const GENTLE = /^(probaj|pokusaj|hajde|nije to|nije strasno|ne brini|polako|u redu je|skoro|nema veze|mozes ti)/;

const FEELINGS: { emotion: VoiceEmotion; pattern: RegExp }[] = [
    { emotion: "sad", pattern: /\b(tuzn|tuzan|place|plakal|plakao|rastuzi|usamljen|nedostaj|povredjen)/ },
    { emotion: "angry", pattern: /\b(ljut|naljuti|besn|besan|nervoz)/ },
    { emotion: "scared", pattern: /\b(uplas|plasi|strah|boji se|zabrinut)/ },
    { emotion: "surprised", pattern: /\b(iznenadj|zacudj|zacudi)/ },
    { emotion: "happy", pattern: /\b(srecn|srecan|sretn|sretan|radost|radosn|vesel|raduje|obradova|ponos|smeje se|osmeh)/ },
];

/** „Nije tužna”, „ne plaši se” — odrečna rečenica ne nosi tu emociju */
const NEGATION = /\b(ne|nije|nisu|nisam|nisi|nismo|bez)\s+(se\s+|vise\s+)?$/;

/**
 * Emocija koju rečenica nosi, kada je pozivalac nije sam naveo.
 * Namerno oprezno: sve što nije jasno ostaje mirno i neutralno.
 */
export function emotionForText(text: string): VoiceEmotion {
    const plain = simplify(text).trim();
    if (!plain) return "neutral";

    if (GREETING.test(plain)) return "hello";
    if (PROUD.test(plain)) return "proud";
    if (PRAISE.test(plain)) return "happy";
    if (GENTLE.test(plain)) return "gentle";
    // Pitanje se postavlja radoznalo, i kad pominje osećanje („Da li je Mila tužna?”)
    if (/\?\s*$/.test(plain)) return "curious";

    for (const { emotion, pattern } of FEELINGS) {
        const match = pattern.exec(plain);
        if (match && !NEGATION.test(plain.slice(0, match.index))) return emotion;
    }
    return "neutral";
}

// ── Glas iz pregledača ────────────────────────────────────────────────────────

export interface BrowserProsody {
    /** 1 = uobičajena brzina; govor za decu je uvek malo sporiji */
    rate: number;
    /** 1 = uobičajena visina glasa */
    pitch: number;
}

export const BROWSER_PROSODY: Record<VoiceEmotion, BrowserProsody> = {
    neutral: { rate: 0.9, pitch: 1 },
    hello: { rate: 0.94, pitch: 1.12 },
    happy: { rate: 0.95, pitch: 1.15 },
    proud: { rate: 0.98, pitch: 1.2 },
    gentle: { rate: 0.82, pitch: 0.96 },
    curious: { rate: 0.9, pitch: 1.1 },
    sad: { rate: 0.8, pitch: 0.86 },
    angry: { rate: 0.88, pitch: 0.82 },
    scared: { rate: 0.96, pitch: 1.08 },
    surprised: { rate: 0.98, pitch: 1.22 },
};

// ── Sintetizovani glas (ElevenLabs) ───────────────────────────────────────────

export interface TtsDelivery {
    /** Niže = življi, izražajniji glas; više = ravniji */
    stability: number;
    /** Koliko se naglašava stil govornika (0–1) */
    style: number;
    /** 0.7–1.2 */
    speed: number;
    /** Oznaka u tekstu za modele koji ih razumeju (eleven_v3) */
    tag: string;
    /** Nastavak rečenice koji se NE izgovara, ali modelu kaže kojim tonom da čita */
    hint: { male: string; female: string } | null;
}

function hint(how: string): TtsDelivery["hint"] {
    return { male: `, rekao je ${how}.`, female: `, rekla je ${how}.` };
}

export const TTS_DELIVERY: Record<VoiceEmotion, TtsDelivery> = {
    neutral: { stability: 0.6, style: 0.1, speed: 0.95, tag: "", hint: null },
    hello: { stability: 0.45, style: 0.35, speed: 0.98, tag: "[warmly]", hint: hint("toplo i veselo") },
    happy: { stability: 0.4, style: 0.45, speed: 1, tag: "[happy]", hint: hint("veselo, sa osmehom") },
    proud: { stability: 0.38, style: 0.55, speed: 1, tag: "[excited]", hint: hint("ponosno i radosno") },
    gentle: { stability: 0.7, style: 0.15, speed: 0.9, tag: "[gently]", hint: hint("nežno i ohrabrujuće") },
    curious: { stability: 0.45, style: 0.3, speed: 0.96, tag: "[curious]", hint: hint("radoznalo") },
    sad: { stability: 0.5, style: 0.35, speed: 0.88, tag: "[sad]", hint: hint("tiho i tužno") },
    angry: { stability: 0.5, style: 0.35, speed: 0.94, tag: "[annoyed]", hint: hint("ozbiljno i ljutito, ali bez vikanja") },
    scared: { stability: 0.42, style: 0.4, speed: 0.98, tag: "[nervous]", hint: hint("uplašeno i tiho") },
    surprised: { stability: 0.38, style: 0.5, speed: 1, tag: "[surprised]", hint: hint("iznenađeno") },
};

// ── Lice učitelja ─────────────────────────────────────────────────────────────

export type FaceExpression = "neutral" | "happy" | "proud" | "gentle" | "curious" | "sad" | "serious" | "worried" | "surprised";

export type FaceGesture = "none" | "wave" | "cheer";

/**
 * Učitelj pokazuje emociju iz priče blago: za ljutnju je samo ozbiljan, za strah zabrinut.
 * Lice okrenuto detetu nikad nije ljutito.
 */
export const FACE_FOR_EMOTION: Record<VoiceEmotion, { expression: FaceExpression; gesture: FaceGesture }> = {
    neutral: { expression: "neutral", gesture: "none" },
    hello: { expression: "happy", gesture: "wave" },
    happy: { expression: "happy", gesture: "none" },
    proud: { expression: "proud", gesture: "cheer" },
    gentle: { expression: "gentle", gesture: "none" },
    curious: { expression: "curious", gesture: "none" },
    sad: { expression: "sad", gesture: "none" },
    angry: { expression: "serious", gesture: "none" },
    scared: { expression: "worried", gesture: "none" },
    surprised: { expression: "surprised", gesture: "none" },
};
