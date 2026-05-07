import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function POST(req) {
  try {
    const { text, voiceId } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), { status: 400 });
    }

    const audioStream = await elevenlabs.textToSpeech.convert(
      voiceId || process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb',
      {
        text: text,
        modelId: 'eleven_multilingual_v2',
        outputFormat: 'mp3_44100_128',
      }
    );

    // Convert stream to Buffer
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('ElevenLabs TTS Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
