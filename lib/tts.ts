export async function speak(text: string, voiceId?: string, gender?: string) {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voiceId, gender }),
    });

    if (!response.ok) {
      throw new Error('TTS request failed');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Pokušaj da avatar preuzme reprodukciju (cancelable event).
    // Ako avatar postoji i pozove preventDefault(), on pušta zvuk — mi ne.
    const event = new CustomEvent('avatar:speak', {
      detail: { url: audioUrl, text },
      cancelable: true,
    });
    const wasHandled = !window.dispatchEvent(event);

    // Samo ako avatar NIJE preuzeo zvuk, puštamo ga ovde kao fallback
    if (!wasHandled) {
      const audio = new Audio(audioUrl);
      await audio.play();
      return audio;
    }

    return null;
  } catch (error) {
    console.error('Speak Error:', error);
    return null;
  }
}
