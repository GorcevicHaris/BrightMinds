"use client";

import TeacherAvatar from "@/app/components/avatar/TeacherAvatar";
import { EmotionFace } from "@/app/components/games/EmotionFace";
import { MoodFace } from "@/app/components/games/MoodFace";
import { OwlPicture, WindPicture } from "@/app/components/games/SoundPictures";
import { VOICE_EMOTIONS, type VoiceEmotion } from "@/lib/emotion";
import { speak } from "@/lib/speech";
import { mimeVoice, playVoice } from "@/lib/voice";

/** Bilo koji snimak iz aplikacije: proverava puštanje kroz analizator i pomeranje usta */
const SAMPLE_SOUND = "/sounds/ptica.mp3";

const SAMPLES: Record<VoiceEmotion, string> = {
    neutral: "Dodirni isti oblik.",
    hello: "Zdravo. Dobro došla.",
    happy: "Bravo. To je tačno.",
    proud: "Nivo je završen.",
    gentle: "Probaj ponovo. Polako.",
    curious: "Šta misliš, kako se oseća?",
    sad: "Lejla je tužna jer je izgubila loptu.",
    angry: "Amar je ljut jer mu je kula pala.",
    scared: "Amina se uplašila grmljavine.",
    surprised: "Haris je iznenađen poklonom.",
};

const NAMES: Record<VoiceEmotion, string> = {
    neutral: "mirno",
    hello: "pozdrav",
    happy: "veselo",
    proud: "ponosno",
    gentle: "nežno",
    curious: "radoznalo",
    sad: "tužno",
    angry: "ljutnja u priči",
    scared: "strah u priči",
    surprised: "iznenađeno",
};

export default function AvatarPreview() {
    return (
        <main className="min-h-screen bg-canvas p-6">
            {/* Lica za pitanje „Kako si?” i za igru emocija */}
            <section className="mb-8 flex flex-wrap items-end gap-4 rounded-card border border-line bg-surface p-4">
                {(["upset", "neutral", "happy"] as const).map((mood) => (
                    <MoodFace key={mood} mood={mood} className="h-24 w-24" />
                ))}
                <span className="mx-2 h-16 w-px bg-line" />
                {(["happy", "sad", "angry", "scared", "surprised", "proud"] as const).map((emotion) => (
                    <EmotionFace key={emotion} emotion={emotion} className="h-20 w-20" />
                ))}
                <span className="mx-2 h-16 w-px bg-line" />
                {/* Crtane slike zvukova pored jedne 3D slike, radi poređenja stila */}
                <OwlPicture className="h-28 w-28 rounded-xl" />
                <WindPicture className="h-28 w-28 rounded-xl" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/soundImage/bird.webp" alt="" className="h-28 w-28 rounded-xl object-cover" />
            </section>
            {(["male", "female"] as const).map((gender) => (
                <section key={gender} className="mb-8">
                    <div className="mb-3 flex items-center gap-4 rounded-card bg-brand-600 p-4">
                        <TeacherAvatar gender={gender} className="h-40 w-36" />
                        <TeacherAvatar gender={gender} variant="face" className="h-16 w-16 rounded-full bg-brand-50" />
                        <div className="flex flex-wrap gap-2">
                            {VOICE_EMOTIONS.map((emotion) => (
                                <button
                                    key={emotion}
                                    type="button"
                                    data-say={`${gender}-${emotion}`}
                                    onClick={() => void speak(SAMPLES[emotion], { gender, emotion })}
                                    className="rounded-xl bg-white px-3 py-2 text-sm font-extrabold text-ink"
                                >
                                    {NAMES[emotion]}
                                </button>
                            ))}
                            <button
                                type="button"
                                data-mime={gender}
                                onClick={() => {
                                    const end = mimeVoice("happy");
                                    setTimeout(end, 4000);
                                }}
                                className="rounded-xl bg-sun-300 px-3 py-2 text-sm font-extrabold text-ink"
                            >
                                usta (4 s)
                            </button>
                            <button
                                type="button"
                                data-play={gender}
                                onClick={() => void playVoice(SAMPLE_SOUND, "proud", () => document.body.setAttribute("data-voice-ended", "1"))}
                                className="rounded-xl bg-sun-300 px-3 py-2 text-sm font-extrabold text-ink"
                            >
                                snimak
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                        {VOICE_EMOTIONS.map((emotion) => (
                            <figure key={emotion} className="rounded-card border border-line bg-surface p-2 text-center">
                                <TeacherAvatar gender={gender} emotion={emotion} className="mx-auto h-36 w-32" />
                                <figcaption className="text-sm font-extrabold text-ink-soft">{NAMES[emotion]}</figcaption>
                            </figure>
                        ))}
                    </div>
                </section>
            ))}
        </main>
    );
}
