// lib/azureTts.ts
// Izvorni srpski glasovi (Microsoft Azure Speech): „Sophie” i „Nicholas” za srpski latinicom.
// Za razliku od višejezičnih ElevenLabs glasova, ovi glasovi su učeni na srpskom, pa ne greše
// u izgovoru reči kao „oboji”, „crven” ili „đ”. Tempo i visinu glasa zadajemo kroz SSML,
// po emociji rečenice — sporije i mirnije nego u običnom govoru, jer slušaju deca.
// Samo za server (ključ se nikad ne šalje pregledaču).
import type { VoiceEmotion } from "./emotion";

export const AZURE_LOCALE = "sr-Latn-RS";

export const AZURE_DEFAULT_VOICES = {
    female: "sr-Latn-RS-SophieNeural",
    male: "sr-Latn-RS-NicholasNeural",
} as const;

export interface AzureProsody {
    /** Promena brzine u odnosu na običan govor, npr. "-12%" */
    rate: string;
    /** Promena visine glasa, npr. "+6%" */
    pitch: string;
}

/** Svi tempi su sporiji od običnog govora: deca od 3 do 10 godina bolje razumeju polagan govor. */
export const AZURE_PROSODY: Record<VoiceEmotion, AzureProsody> = {
    neutral: { rate: "-12%", pitch: "+0%" },
    hello: { rate: "-8%", pitch: "+6%" },
    happy: { rate: "-6%", pitch: "+8%" },
    proud: { rate: "-6%", pitch: "+10%" },
    gentle: { rate: "-16%", pitch: "-2%" },
    curious: { rate: "-10%", pitch: "+6%" },
    sad: { rate: "-18%", pitch: "-8%" },
    angry: { rate: "-10%", pitch: "-6%" },
    scared: { rate: "-8%", pitch: "+4%" },
    surprised: { rate: "-6%", pitch: "+12%" },
};

function escapeXml(text: string): string {
    return text.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);
}

/** SSML za jednu rečenicu: izabrani glas, srpski latinicom, tempo i visina prema emociji. */
export function buildSsml(text: string, voice: string, emotion: VoiceEmotion): string {
    const { rate, pitch } = AZURE_PROSODY[emotion];
    return (
        `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${AZURE_LOCALE}">` +
        `<voice name="${escapeXml(voice)}"><prosody rate="${rate}" pitch="${pitch}">${escapeXml(text)}</prosody></voice>` +
        `</speak>`
    );
}

export class AzureTtsError extends Error {
    constructor(readonly status: number) {
        super(`Azure TTS je odbio zahtev, status ${status}`);
        this.name = "AzureTtsError";
    }
}

/** Pretvara SSML u mp3. Baca `AzureTtsError` sa statusom servisa (401/403 = ključ, 429 = zagušenje). */
export async function synthesizeAzure(ssml: string, { key, region }: { key: string; region: string }): Promise<ArrayBuffer> {
    const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: "POST",
        headers: {
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
            "User-Agent": "bright-minds",
        },
        body: ssml,
    });
    if (!response.ok) throw new AzureTtsError(response.status);
    return response.arrayBuffer();
}
