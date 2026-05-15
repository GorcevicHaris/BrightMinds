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

    // Dispatch event for the avatar if it exists
    window.dispatchEvent(new CustomEvent('avatar:speak', {
      detail: { url: audioUrl, text }
    }));

    const audio = new Audio(audioUrl);
    await audio.play();

    return audio;
  } catch (error) {
    console.error('Speak Error:', error);
    return null;
  }
}
