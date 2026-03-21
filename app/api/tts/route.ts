import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY!,
});

// Glasovi dostupni na ElevenLabs koji dobro rade sa srpskim/slavenskim jezicima
// "Rachel" je neutralni ženski glas koji dobro izgovara slavenski tekst
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel - default ElevenLabs glas

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text || typeof text !== "string") {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const audioStream = await client.textToSpeech.convert(VOICE_ID, {
            text,
            modelId: "eleven_multilingual_v2", // Podržava srpski jezik
            outputFormat: "mp3_44100_128",
            voiceSettings: {
                stability: 0.5,
                similarityBoost: 0.8,
                style: 0.2,
                useSpeakerBoost: true,
            },
        });

        // Pretvori ReadableStream u buffer
        const reader = (audioStream as ReadableStream<Uint8Array>).getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
        }

        const buffer = Buffer.concat(chunks);

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "no-cache",
            },
        });
    } catch (error: any) {
        console.error("ElevenLabs TTS error:", error);
        return NextResponse.json(
            { error: "TTS generation failed", details: error?.message },
            { status: 500 }
        );
    }
}
