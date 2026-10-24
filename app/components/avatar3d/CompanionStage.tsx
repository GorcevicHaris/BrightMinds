"use client";

// Živi 3D drugar (prodavnica, baner na početnoj, kraj nivoa): diše, trepće, menja mirne poze,
// lice prati glas (izraz, usta), maše na pozdrav, skače i navija (action + actionKey, kao 2D).
// Svi živi prikazi na stranici dele jedan WebGL renderer; prikaz koji trenutno nema platno
// pokazuje snimak. Bez WebGL-a, ili dok vrsta nema 3D telo — 2D drugar.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Companion from "@/app/components/avatar/Companion";
import { useCalmMotion, type CompanionAction } from "@/app/components/avatar/motion";
import type { VoiceEmotion } from "@/lib/emotion";
import { getVoiceState, mouthLevel, subscribeVoice } from "@/lib/voice";
import { cn } from "@/lib/cn";
import type { Wear } from "./data";
import { companionLook } from "./looks";
import { useEngine } from "./useEngine";

const IDLE_VOICE = { speaking: false, emotion: "neutral" as VoiceEmotion };

export interface CompanionStageProps {
    kind: string;
    skin?: string;
    wear?: Wear;
    /** `full` ceo lik, `wide` široko (baner: lik sa strane), `portrait` do pojasa, `bust` poprsje */
    framing?: "full" | "wide" | "portrait" | "bust";
    /** Pozadina: svet iz kupljene pozadine (ili mirni svetlosivi svet); false = providno */
    background?: boolean;
    /** Široki kadar: gde je lik (−1 levo … 1 desno) */
    align?: number;
    /** Stalna emocija umesto one iz glasa */
    emotion?: VoiceEmotion;
    /** Jednokratni pokret; „wave” (mahanje na pozdrav) postoji samo u 3D */
    action?: CompanionAction | "wave";
    actionKey?: number | string;
    /** Okretanje prevlačenjem (prodavnica) */
    interactive?: boolean;
    still?: boolean;
    className?: string;
    /** Opis za čitač ekrana (kad lik nosi značenje) */
    label?: string;
}

export default function CompanionStage({ kind, skin, wear = {}, framing = "full", background = true, align = 0, emotion, action, actionKey, interactive = false, still = false, className, label }: CompanionStageProps) {
    const engineState = useEngine();
    const hostRef = useRef<HTMLDivElement>(null);
    const calm = useCalmMotion() || still;
    const voice = useSyncExternalStore(subscribeVoice, getVoiceState, () => IDLE_VOICE);
    const [owner, setOwner] = useState(true);
    const [failed, setFailed] = useState(false);
    const [snapshot, setSnapshot] = useState<string | null>(null);
    const engine = engineState.status === "ready" ? engineState.engine : null;
    const supported = Boolean(engine?.supports3D(kind));

    // Stalni objekti scene (prave se jednom po prikazu)
    const live = useRef<{ scene: InstanceType<NonNullable<typeof engine>["StageScene"]>; figure: InstanceType<NonNullable<typeof engine>["Figure"]> | null; figureKind: string } | null>(null);
    const calmRef = useRef(calm);
    useEffect(() => {
        calmRef.current = calm;
    });

    const bgId = background ? (wear.background ?? null) : "none";

    useEffect(() => {
        const host = hostRef.current;
        if (!engine || !supported || !host) return;
        const renderer = engine.liveRenderer();
        if (!renderer) {
            queueMicrotask(() => setFailed(true));
            return;
        }
        const scene = new engine.StageScene({ framing, background: bgId, quality: "high", align });
        live.current = { scene, figure: null, figureKind: "" };
        const view = {
            host,
            scene,
            live: () => !calmRef.current,
            interactive,
            onOwner: (own: boolean) => setOwner(own),
            onFail: () => setFailed(true),
        };
        renderer.attach(view);
        return () => {
            renderer.detach(view);
            live.current?.figure?.dispose();
            scene.dispose();
            live.current = null;
        };
        // Scena se pravi jednom po motoru i prikazu; ostalo se menja bez ponovnog pravljenja
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [engine, supported, interactive]);

    // Izgled i odeća: isti drugar se samo preoblači; druga vrsta pravi novo telo
    const wearKey = JSON.stringify(wear);
    useEffect(() => {
        const state = live.current;
        if (!engine || !state) return;
        const look = companionLook(kind, skin);
        if (!state.figure || state.figureKind !== kind) {
            state.figure?.dispose();
            state.figure = new engine.Figure(look as never, wear, { quality: "high" });
            state.figureKind = kind;
            state.figure.mouthLevel = mouthLevel;
            state.scene.setFigure(state.figure);
        } else {
            state.figure.setLook(look as never);
            state.figure.setWear(wear);
            state.scene.setFigure(state.figure);
        }
        state.scene.dirty = true;
        engine.liveRenderer()?.invalidate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [engine, kind, skin, wearKey, supported]);

    useEffect(() => {
        const state = live.current;
        if (!state) return;
        state.scene.setBackground(bgId);
        state.scene.setFraming(framing, align);
        engine?.liveRenderer()?.invalidate();
    }, [engine, bgId, framing, align]);

    // Glas: izraz i usta; stalna emocija ima prednost
    useEffect(() => {
        const figure = live.current?.figure;
        if (!figure) return;
        figure.setEmotion(emotion ?? voice.emotion);
        figure.setSpeaking(emotion ? false : voice.speaking);
        engine?.liveRenderer()?.invalidate();
    }, [engine, emotion, voice.emotion, voice.speaking, wearKey, kind]);

    // Jednokratni pokret (kao 2D): pri pojavi i pri svakoj promeni ključa
    useEffect(() => {
        const figure = live.current?.figure;
        if (!figure || !action) return;
        figure.play(action);
        engine?.liveRenderer()?.invalidate();
    }, [engine, action, actionKey]);

    // Dok drugi prikaz ima platno, ovde stoji snimak istog lika
    useEffect(() => {
        if (owner || !engine) return;
        const host = hostRef.current;
        const shots = engine.snapshots();
        if (!host || !shots) return;
        let alive = true;
        shots
            .request({
                look: companionLook(kind, skin) as never,
                wear,
                framing,
                background: bgId,
                width: host.clientWidth || 300,
                height: host.clientHeight || 400,
            })
            .then((url) => alive && setSnapshot(url));
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [owner, engine, kind, skin, wearKey, framing, bgId]);

    if (engineState.status === "none" || failed || (engine && !supported)) {
        return (
            <div className={className} role={label ? "img" : undefined} aria-label={label}>
                <Companion kind={kind} wear={wear} skin={skin} variant="full" action={action === "wave" ? undefined : action} actionKey={actionKey} still={still} className="h-full w-full" />
            </div>
        );
    }
    // Platno je u unutrašnjem sloju preko celog prikaza (spoljni sloj nosi raspored stranice)
    const positioned = /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className ?? "");
    return (
        <div className={cn(!positioned && "relative", "overflow-hidden", className)} role={label ? "img" : undefined} aria-label={label}>
            <div ref={hostRef} className="absolute inset-0" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {!owner && snapshot && <img src={snapshot} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />}
        </div>
    );
}
