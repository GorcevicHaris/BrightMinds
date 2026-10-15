// app/api/tts/route.ts
// Pretvara tekst u govor preko ElevenLabs-a. Troši plaćenu kvotu, pa zahteva
// sesiju (roditeljsku ili dečju) i ograničava dužinu teksta i učestalost.
import { ElevenLabsClient, ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import { getSession } from "@/lib/auth";
import { isVoiceEmotion, TTS_DELIVERY, type VoiceEmotion } from "@/lib/emotion";
import { takeAttempt, type RateLimitRule } from "@/lib/rateLimit";
import { readCachedAudio, storeCachedAudio, ttsCacheKey } from "@/lib/ttsCache";
import { asTrimmedString } from "@/lib/validation";
import { enforceRateLimit, errorResponse, HttpError, readJsonObject } from "../_lib/http";

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const DEFAULT_FEMALE_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const MAX_TEXT_LENGTH = 400;
/**
 * Izbor modela je izmeren, ne pretpostavljen: 53 rečenice iz aplikacije izgovorene su svakim modelom
 * i vraćene u tekst prepoznavanjem govora. `eleven_flash_v2_5` sa hrvatskim (isti glasovi kao srpski:
 * č, ć, dž, đ, j, lj, nj) izgovorio je tačno 50/53; `eleven_v3` sa srpskim 45/53, uz greške poput
 * „Obođi” umesto „Oboji” i „kriven” umesto „crven”. Tekst ostaje ekavski — model samo izgovara slova.
 * `ELEVENLABS_MODEL` / `ELEVENLABS_LANGUAGE` mogu da ga zamene.
 */
const DEFAULT_MODEL = "eleven_flash_v2_5";
const FALLBACK_MODEL = "eleven_multilingual_v2";
const LANGUAGE = process.env.ELEVENLABS_LANGUAGE?.trim() || "hr";

/** Šta je ElevenLabs odbio u ovom procesu — ne pokušavamo isto pri svakoj rečenici */
const rejected = { language: false, model: false };

/**
 * Kada ElevenLabs odbije ključ (najčešće: potrošena mesečna kvota), toliko dugo se ne
 * pokušava nova sinteza — snimci iz keša se i dalje puštaju.
 */
const KEY_REJECTED_PAUSE_MS = 10 * 60 * 1000;
let keyRejectedAt = 0;

/** Glas privremeno nije dostupan (kvota); klijent nastavlja da pita za druge rečenice, jer one mogu biti u kešu. */
const UNAVAILABLE = "Glas trenutno nije dostupan";

function isRequestProblem(error: unknown): boolean {
    return error instanceof ElevenLabsError && [400, 404, 422].includes(error.statusCode ?? 0);
}

/** Po sesiji; igra izgovara kratke rečenice, pa je ovo daleko iznad normalne upotrebe. */
const TTS_RULE: RateLimitRule = { limit: 120, windowMs: 60 * 1000 };

/** Klijent prestaje da pokušava kada dobije 503. */
const NOT_CONFIGURED = "Glas nije podešen";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) throw new HttpError(401, "Niste prijavljeni");

        const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
        if (!apiKey) throw new HttpError(503, NOT_CONFIGURED);

        const body = await readJsonObject(request);
        const text = asTrimmedString(body.text, { min: 1, max: MAX_TEXT_LENGTH });
        if (!text) throw new HttpError(400, `Tekst je obavezan (najviše ${MAX_TEXT_LENGTH} karaktera)`);

        const sessionKey = session.childId ? `child:${session.childId}` : `user:${session.userId}`;
        enforceRateLimit(takeAttempt(`tts:${sessionKey}`, TTS_RULE), "Previše zahteva. Sačekaj malo.");

        const isFemale = typeof body.gender === "string" && body.gender.toLowerCase() === "female";
        const voiceId = isFemale
            ? process.env.ELEVENLABS_FEMALE_VOICE_ID || DEFAULT_FEMALE_VOICE_ID
            : process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

        // Ton rečenice: emocija menja živost, naglašenost i brzinu glasa — nikad jačinu
        const emotion: VoiceEmotion = isVoiceEmotion(body.emotion) ? body.emotion : "neutral";
        const delivery = TTS_DELIVERY[emotion];
        const preferredModel = process.env.ELEVENLABS_MODEL?.trim() || DEFAULT_MODEL;

        // Ista rečenica se plaća samo jednom. Lični tekst (pozdrav sa imenom deteta) se ne čuva.
        const personal = body.personal === true;
        const cacheKey = ttsCacheKey([preferredModel, LANGUAGE, voiceId, emotion, text]);
        const cached = personal ? null : await readCachedAudio(cacheKey);
        if (cached) return audioResponse(cached);
        if (Date.now() - keyRejectedAt < KEY_REJECTED_PAUSE_MS) throw new HttpError(502, UNAVAILABLE);

        const elevenlabs = new ElevenLabsClient({ apiKey });

        const synthesize = async (modelId: string, withLanguage: boolean) => {
            const tagged = modelId.startsWith("eleven_v3");
            // Jezik se može zadati samo novijim modelima; ostali ga prepoznaju iz teksta
            const languageCode = withLanguage && (tagged || modelId.includes("v2_5")) ? LANGUAGE : undefined;
            const stream = await elevenlabs.textToSpeech.convert(
                voiceId,
                tagged
                    ? {
                          // v3 čita oznaku u uglastim zagradama kao uputstvo za ton, ne kao tekst
                          text: delivery.tag ? `${delivery.tag} ${text}` : text,
                          modelId,
                          languageCode,
                          outputFormat: "mp3_44100_128",
                          voiceSettings: { stability: 0.5, similarityBoost: 0.8, useSpeakerBoost: true },
                      }
                    : {
                          text,
                          modelId,
                          languageCode,
                          outputFormat: "mp3_44100_128",
                          // Nastavak koji se ne izgovara („…, rekla je veselo.”) modelu kaže kojim tonom da čita
                          nextText: delivery.hint ? delivery.hint[isFemale ? "female" : "male"] : undefined,
                          voiceSettings: {
                              stability: delivery.stability,
                              similarityBoost: 0.8,
                              style: delivery.style,
                              speed: delivery.speed,
                              useSpeakerBoost: true,
                          },
                      }
            );
            return new Response(stream).arrayBuffer();
        };

        // Redom: željeni model sa zadatim srpskim → isti model bez zadatog jezika → rezervni model.
        // Ono što servis jednom odbije pamti se, da se ne plaća i ne čeka pri svakoj rečenici.
        let audio: ArrayBuffer | null = null;
        if (!rejected.model) {
            if (!rejected.language) {
                try {
                    audio = await synthesize(preferredModel, true);
                } catch (error) {
                    if (!isRequestProblem(error)) throw error;
                    rejected.language = true;
                    console.warn("[api] POST /api/tts: model ne prihvata zadat jezik, nastavljam bez njega");
                }
            }
            if (!audio) {
                try {
                    audio = await synthesize(preferredModel, false);
                } catch (error) {
                    if (!isRequestProblem(error) || preferredModel === FALLBACK_MODEL) throw error;
                    rejected.model = true;
                    console.warn(`[api] POST /api/tts: model ${preferredModel} nije dostupan, koristim ${FALLBACK_MODEL}`);
                }
            }
        }
        if (!audio) audio = await synthesize(FALLBACK_MODEL, false);

        if (audio.byteLength === 0) throw new Error("ElevenLabs je vratio prazan audio");

        if (!personal) await storeCachedAudio(cacheKey, audio);
        return audioResponse(audio);
    } catch (error) {
        // Neispravan ključ ili potrošena kvota: nova sinteza se neko vreme ne pokušava,
        // a rečenice iz keša i dalje rade.
        if (error instanceof ElevenLabsError && (error.statusCode === 401 || error.statusCode === 403)) {
            keyRejectedAt = Date.now();
            console.error("[api] POST /api/tts: ElevenLabs je odbio zahtev (ključ ili kvota), status", error.statusCode);
            return errorResponse(new HttpError(502, UNAVAILABLE), "POST /api/tts");
        }
        return errorResponse(error, "POST /api/tts");
    }
}

function audioResponse(audio: ArrayBuffer): Response {
    return new Response(audio, {
        headers: {
            "Content-Type": "audio/mpeg",
            "Content-Length": String(audio.byteLength),
            "Cache-Control": "private, max-age=86400",
        },
    });
}
