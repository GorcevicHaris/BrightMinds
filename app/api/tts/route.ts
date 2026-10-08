// app/api/tts/route.ts
// Pretvara tekst u govor preko ElevenLabs-a. Troši plaćenu kvotu, pa zahteva
// sesiju (roditeljsku ili dečju) i ograničava dužinu teksta i učestalost.
import { ElevenLabsClient, ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import { getSession } from "@/lib/auth";
import { takeAttempt, type RateLimitRule } from "@/lib/rateLimit";
import { asTrimmedString } from "@/lib/validation";
import { enforceRateLimit, errorResponse, HttpError, readJsonObject } from "../_lib/http";

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const DEFAULT_FEMALE_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const MAX_TEXT_LENGTH = 400;

/** Po sesiji; igra izgovara kratke rečenice, pa je ovo daleko iznad normalne upotrebe. */
const TTS_RULE: RateLimitRule = { limit: 120, windowMs: 60 * 1000 };

/** Klijent prestaje da pokušava kada dobije 503. */
const NOT_CONFIGURED = "Glas nije podešen";

export async function POST(request: Request) {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
        if (!apiKey) throw new HttpError(503, NOT_CONFIGURED);

        const session = await getSession();
        if (!session) throw new HttpError(401, "Niste prijavljeni");

        const body = await readJsonObject(request);
        const text = asTrimmedString(body.text, { min: 1, max: MAX_TEXT_LENGTH });
        if (!text) throw new HttpError(400, `Tekst je obavezan (najviše ${MAX_TEXT_LENGTH} karaktera)`);

        const sessionKey = session.childId ? `child:${session.childId}` : `user:${session.userId}`;
        enforceRateLimit(takeAttempt(`tts:${sessionKey}`, TTS_RULE), "Previše zahteva. Sačekaj malo.");

        const isFemale = typeof body.gender === "string" && body.gender.toLowerCase() === "female";
        const voiceId = isFemale
            ? process.env.ELEVENLABS_FEMALE_VOICE_ID || DEFAULT_FEMALE_VOICE_ID
            : process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

        // Ženski glas: pauze samo IZMEĐU rečenica (gde postoji razmak), da ne bi
        // nastali artefakti na samom kraju snimka.
        const spokenText = isFemale ? text.replace(/([.?!,])\s+/g, "$1... ") : text;

        const elevenlabs = new ElevenLabsClient({ apiKey });
        const stream = await elevenlabs.textToSpeech.convert(voiceId, {
            text: spokenText,
            modelId: "eleven_multilingual_v2",
            outputFormat: "mp3_44100_128",
            voiceSettings: {
                stability: isFemale ? 1.0 : 0.5,
                similarityBoost: isFemale ? 0.5 : 0.8,
                style: 0.0,
                useSpeakerBoost: true,
            },
        });

        const audio = await new Response(stream).arrayBuffer();
        if (audio.byteLength === 0) throw new Error("ElevenLabs je vratio prazan audio");

        return new Response(audio, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": String(audio.byteLength),
                "Cache-Control": "private, max-age=86400",
            },
        });
    } catch (error) {
        // Neispravan ključ ili potrošena kvota: ponovni pokušaji nemaju smisla,
        // pa klijent dobija isti 503 kao kada glas nije podešen.
        if (error instanceof ElevenLabsError && (error.statusCode === 401 || error.statusCode === 403)) {
            console.error("[api] POST /api/tts: ElevenLabs je odbio zahtev, status", error.statusCode);
            return errorResponse(new HttpError(503, NOT_CONFIGURED), "POST /api/tts");
        }
        return errorResponse(error, "POST /api/tts");
    }
}
