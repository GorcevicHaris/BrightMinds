import { useRef, useCallback } from "react";

/**
 * Hook za ElevenLabs Text-to-Speech.
 * Koristi isključivo ElevenLabs glas definisan u .env datoteci.
 */
export function useSpeech() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const stopSpeech = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
            audioRef.current = null;
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    const speak = useCallback(
        async (text: string, onEnd?: () => void, onError?: () => void, gender?: string) => {
            stopSpeech();

            try {
                const controller = new AbortController();
                abortControllerRef.current = controller;

                // Umesto potpunog brisanja, menjamo tačke i upitnike u zareze (,), 
                // jer zarez daje kratku, prirodnu pauzu, pa avatar ne zbrza rečenicu.
                const cleanTextForSpeech = text.replace(/[.?!…]/g, ',');

                // Šaljemo očišćen tekst za govor, ali zadržavamo original za oblačić
                const response = await fetch("/api/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: cleanTextForSpeech, gender }),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (e) {
                        errorData = { error: `HTTP ${response.status}` };
                    }
                    throw new Error(`TTS API error: ${errorData.error || response.statusText}`);
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                // Obaveštavamo Professor3D komponentu da pokrene animaciju usta
                const event = new CustomEvent('avatar:speak', {
                    detail: { url, text },
                    cancelable: true
                });
                const wasHandled = !window.dispatchEvent(event);

                // Ako avatar nije preuzeo zvuk (npr. nismo u igri gde je avatar vidljiv), puštamo ga ovde
                if (!wasHandled) {
                    const audio = new Audio(url);
                    audioRef.current = audio;
                    audio.onended = () => {
                        URL.revokeObjectURL(url);
                        audioRef.current = null;
                        onEnd?.();
                    };
                    audio.onerror = () => {
                        URL.revokeObjectURL(url);
                        audioRef.current = null;
                        onError?.();
                    };
                    await audio.play();
                }
            } catch (err: any) {
                if (err?.name === "AbortError") return;
                console.error("ElevenLabs TTS Error:", err);
                onError?.();
            }
        },
        [stopSpeech]
    );

    return { speak, stopSpeech };
}
