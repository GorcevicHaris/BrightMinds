import { useRef, useCallback } from "react";

/**
 * Hook za ElevenLabs Text-to-Speech.
 * Poziva /api/tts rutu na serveru koja komunicira sa ElevenLabs API-jem.
 * Fallback na browser speechSynthesis ako API nije dostupan.
 */
export function useSpeech() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const stopSpeech = useCallback(() => {
        // Zaustavi trenutni audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
            audioRef.current = null;
        }
        // Otkaži aktivni fetch
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        // Zaustavi browser TTS fallback
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
    }, []);

    const speak = useCallback(
        async (text: string, onEnd?: () => void, onError?: () => void) => {
            // Zaustavi sve što se trenutno reprodukuje
            stopSpeech();

            try {
                const controller = new AbortController();
                abortControllerRef.current = controller;

                const response = await fetch("/api/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text }),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`TTS API returned ${response.status}`);
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
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
                    useFallback(text, onEnd, onError);
                };

                await audio.play();
            } catch (err: any) {
                if (err?.name === "AbortError") return;
                console.warn("ElevenLabs TTS failed, falling back to browser TTS:", err);
                useFallback(text, onEnd, onError);
            }
        },
        [stopSpeech]
    );

    return { speak, stopSpeech };
}

function useFallback(text: string, onEnd?: () => void, onError?: () => void) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        onError?.();
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "sr-RS";
    utterance.rate = 0.85;
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onError?.();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}
