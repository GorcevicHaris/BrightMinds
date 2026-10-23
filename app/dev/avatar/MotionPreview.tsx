"use client";

// Pregled pokreta drugara (samo u razvoju): ceo lik i portret u mirovanju, dugmad za svaki
// jednokratni pokret (skok, radost, aplauz, pojava), proba predmeta (predmet iskoči), pokreti
// uz govor (bez zvuka: usta se pomeraju kao da govori) i prekidač „Manje animacija”.

import { useMemo, useState } from "react";
import { ChildSettingsProvider } from "@/app/components/ChildSettingsProvider";
import Companion, { COMPANIONS, type CompanionAction, type CompanionKind } from "@/app/components/avatar/Companion";
import type { Wear } from "@/app/components/avatar/wearables";
import { FALLBACK_SETTINGS } from "@/lib/childSettings";
import type { VoiceEmotion } from "@/lib/emotion";
import { mimeVoice } from "@/lib/voice";

const tab = (active: boolean) => `rounded-xl px-3 py-2 text-sm font-extrabold ${active ? "bg-brand-600 text-white" : "bg-white text-ink"}`;

/** Kompleti u kojima se vidi svaki stalni pokret (balon, plašt, krila, ljubimac, pozadina) */
const LOOKS: { id: string; label: string; wear: Wear }[] = [
    { id: "nista", label: "Bez predmeta", wear: {} },
    { id: "rodjendan", label: "Baloni i vašar", wear: { hat: "rodjendanska-kapa", outfit: "haljina-zvezde", hand: "tri-balona", pet: "kuce", background: "vasar" } },
    { id: "carobnjak", label: "Plašt i svemir", wear: { hat: "sesir-carobnjaka", outfit: "kostim-carobnjaka", back: "plast", hand: "stapic-zvezda", pet: "zecic", background: "svemir" } },
    { id: "vila", label: "Krila i livada", wear: { hat: "cvetni-venac", outfit: "haljina-cvece", back: "krila-vile", hand: "balon-srce", pet: "pticica", background: "livada" } },
    { id: "ronilac", label: "Podvodni svet", wear: { glasses: "ronilacka-maska", outfit: "kostim-ronioca", feet: "peraja", back: "boca-ronioca", pet: "ribica", background: "podvodni-svet" } },
    { id: "zimski", label: "Zimski dan", wear: { hat: "zimska-kapa", neck: "prugasti-sal", outfit: "zimska-jakna", feet: "cizme-sneg", pet: "pingvin", background: "zimski-dan" } },
    { id: "princ", label: "Kraljevski plašt", wear: { hat: "kruna", outfit: "kostim-princa", back: "kraljevski-plast", pet: "poni", background: "zamak" } },
];

const ACTIONS: { action: CompanionAction; label: string }[] = [
    { action: "hop", label: "Skok (proba)" },
    { action: "joy", label: "Radost (kupovina)" },
    { action: "cheer", label: "Aplauz (kraj nivoa)" },
    { action: "appear", label: "Pojava (nov drugar)" },
];

const SAYS: { emotion: VoiceEmotion; label: string }[] = [
    { emotion: "hello", label: "Pozdrav: maše" },
    { emotion: "happy", label: "Veselo: poskoči" },
    { emotion: "proud", label: "Ponosno: ruke u stranu" },
    { emotion: "gentle", label: "Nežno: klimne" },
];

/** Kape koje se smenjuju pri probi */
const TRY_HATS = ["kruna", "sesir", "kapa", "cilindar"];

export default function MotionPreview() {
    const [kind, setKind] = useState<CompanionKind>("cat");
    const [lookId, setLookId] = useState(LOOKS[1].id);
    const [reduce, setReduce] = useState(false);
    const [move, setMove] = useState<{ action?: CompanionAction; key: number }>({ key: 0 });
    const [tryHat, setTryHat] = useState<number | null>(null);
    const settings = useMemo(() => ({ ...FALLBACK_SETTINGS, reduceMotion: reduce }), [reduce]);

    const look = LOOKS.find((entry) => entry.id === lookId) ?? LOOKS[0];
    const wear = useMemo(() => (tryHat === null ? look.wear : { ...look.wear, hat: TRY_HATS[tryHat % TRY_HATS.length] }), [look, tryHat]);
    const play = (action: CompanionAction) => setMove((current) => ({ action, key: current.key + 1 }));
    const say = (emotion: VoiceEmotion) => {
        // Bez zvuka: lice „govori” 3 s
        const end = mimeVoice(emotion);
        setTimeout(end, 3000);
    };

    return (
        <ChildSettingsProvider settings={settings}>
            <section className="mb-8 rounded-card border border-line bg-surface p-4" data-motion-preview="">
                <h2 className="mb-3 text-lg font-extrabold text-ink">Pokreti drugara</h2>
                <div className="mb-2 flex flex-wrap gap-2">
                    {COMPANIONS.map((option) => (
                        <button
                            key={option.kind}
                            type="button"
                            data-kind={option.kind}
                            onClick={() => {
                                setKind(option.kind);
                                play("appear");
                            }}
                            className={tab(option.kind === kind)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <div className="mb-2 flex flex-wrap gap-2">
                    {LOOKS.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            data-look={entry.id}
                            onClick={() => {
                                setLookId(entry.id);
                                setTryHat(null);
                            }}
                            className={tab(entry.id === lookId)}
                        >
                            {entry.label}
                        </button>
                    ))}
                </div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    {ACTIONS.map(({ action, label }) => (
                        <button key={action} type="button" data-action={action} onClick={() => play(action)} className="rounded-xl bg-sun-300 px-3 py-2 text-sm font-extrabold text-ink">
                            {label}
                        </button>
                    ))}
                    <button
                        type="button"
                        data-try=""
                        onClick={() => {
                            setTryHat((current) => (current === null ? 0 : current + 1));
                            play("hop");
                        }}
                        className="rounded-xl bg-sun-300 px-3 py-2 text-sm font-extrabold text-ink"
                    >
                        Probaj kapu
                    </button>
                    {SAYS.map(({ emotion, label }) => (
                        <button key={emotion} type="button" data-say-test={emotion} onClick={() => say(emotion)} className="rounded-xl bg-brand-100 px-3 py-2 text-sm font-extrabold text-brand-700">
                            {label}
                        </button>
                    ))}
                    <label className="ml-2 flex items-center gap-2 text-sm font-extrabold text-ink">
                        <input type="checkbox" data-reduce="" checked={reduce} onChange={(event) => setReduce(event.target.checked)} className="h-5 w-5" />
                        Manje animacija
                    </label>
                </div>
                <div className="flex flex-wrap items-end gap-4">
                    <div data-motion-full="" className="overflow-hidden rounded-2xl bg-brand-50 ring-2 ring-brand-100">
                        <Companion kind={kind} variant="full" wear={wear} action={move.action} actionKey={move.key} className="h-96 w-80" />
                    </div>
                    <div data-motion-portrait="" className="grid h-28 w-28 place-items-end overflow-hidden rounded-2xl bg-gradient-to-b from-brand-100 to-brand-50 ring-2 ring-brand-100">
                        <Companion kind={kind} variant="portrait" wear={wear} action={move.action} actionKey={move.key} className="h-full w-full" />
                    </div>
                    {/* Svi drugari istovremeno, isti pokret */}
                    <div className="grid flex-1 grid-cols-6 gap-2">
                        {COMPANIONS.map((option) => (
                            <Companion key={option.kind} kind={option.kind} variant="full" wear={wear} action={move.action} actionKey={move.key} className="h-48 w-full rounded-xl bg-brand-50" />
                        ))}
                    </div>
                </div>
            </section>
        </ChildSettingsProvider>
    );
}
