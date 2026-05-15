// app/api/tts/route.ts
import { NextRequest } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId, gender } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: 'Tekst je obavezan' }), { status: 400 });
    }

    // Odabir glasa na osnovu pola ili direktnog ID-a
    let selectedVoiceId = voiceId;
    
    if (!selectedVoiceId) {
        if (gender?.toLowerCase() === 'female') {
            selectedVoiceId = process.env.ELEVENLABS_FEMALE_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
        } else {
            selectedVoiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
        }
    }

    console.log(`ElevenLabs Request: voice=${selectedVoiceId}, text=${text.substring(0, 30)}...`);

    // Proveravamo da li API ključ postoji
    if (!process.env.ELEVENLABS_API_KEY) {
        throw new Error("Nedostaje ELEVENLABS_API_KEY u .env datoteci");
    }

    const audioStream = await elevenlabs.textToSpeech.convert(
      selectedVoiceId,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        output_format: 'mp3_44100_128',
      }
    );

    // Konverzija u ArrayBuffer je najpouzdanija u Next.js 15+
    let audioBuffer: Buffer;

    if (audioStream instanceof Buffer) {
        audioBuffer = audioStream;
    } else if (typeof (audioStream as any).arrayBuffer === 'function') {
        const arrayBuffer = await (audioStream as any).arrayBuffer();
        audioBuffer = Buffer.from(arrayBuffer);
    } else {
        // Fallback na stream potrošnju
        const chunks: any[] = [];
        for await (const chunk of (audioStream as any)) {
            chunks.push(chunk);
        }
        audioBuffer = Buffer.concat(chunks.map(c => Buffer.isBuffer(c) ? c : Buffer.from(c)));
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error("ElevenLabs je vratio prazan audio fajl");
    }

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("DETALJNA GREŠKA TTS API:", error);
    
    let errorMessage = error.message || 'Nepoznata greška na serveru';
    
    // Ako ElevenLabs vrati grešku u body-ju (npr. kvota)
    if (error.response?.data) {
        try {
            const remoteError = JSON.parse(error.response.data.toString());
            errorMessage = remoteError.detail?.message || errorMessage;
        } catch (e) {}
    }

    return new Response(JSON.stringify({ error: errorMessage }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}
