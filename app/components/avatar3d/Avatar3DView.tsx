"use client";

// 3D prikaz lika u studiju. Uvozi three.js, pa se sam učitava samo lenjo (Avatar3D.tsx).
// Ako WebGL ne radi, prikazuje se dosadašnji 2D drugar.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import Companion from "@/app/components/avatar/Companion";
import type { AvatarLook } from "./catalog";
import { Avatar } from "./engine/avatar";
import { Cat } from "./engine/cat";
import { Stage } from "./engine/stage";

export interface Avatar3DViewProps {
    look: AvatarLook;
    /** `bust` = glava i ramena (manji prostor) */
    framing?: "full" | "bust";
    /** Bez ikakvog pokreta (i bez okretanja) */
    still?: boolean;
    className?: string;
    /** Za probnu stranicu: pristup sceni (snimci, merenje) */
    onStage?: (stage: Stage | null) => void;
}

function webglAvailable(): boolean {
    try {
        const canvas = document.createElement("canvas");
        return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
        return false;
    }
}

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
    const query = window.matchMedia(REDUCED);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
    return useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
}

export default function Avatar3DView({ look, framing = "full", still = false, className, onStage }: Avatar3DViewProps) {
    const hostRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Stage | null>(null);
    const figureRef = useRef<Avatar | Cat | null>(null);
    // Komponenta se crta samo u pregledaču (lenjo, bez SSR-a), pa se WebGL proverava odmah
    const [failed, setFailed] = useState(() => !webglAvailable());
    const settings = useChildSettings();
    const systemReduced = usePrefersReducedMotion();
    const calm = still || settings.reduceMotion || systemReduced;
    const calmRef = useRef(calm);
    const onStageRef = useRef(onStage);
    useEffect(() => {
        calmRef.current = calm;
        onStageRef.current = onStage;
    });

    useEffect(() => {
        const host = hostRef.current;
        if (!host || failed) return;
        let stage: Stage;
        try {
            stage = new Stage(host, { still: calmRef.current, framing });
        } catch {
            queueMicrotask(() => setFailed(true));
            return;
        }
        stageRef.current = stage;
        onStageRef.current?.(stage);
        const canvas = stage.renderer.domElement;
        const lost = (e: Event) => {
            e.preventDefault();
            setFailed(true);
        };
        canvas.addEventListener("webglcontextlost", lost);
        return () => {
            canvas.removeEventListener("webglcontextlost", lost);
            onStageRef.current?.(null);
            figureRef.current?.dispose();
            figureRef.current = null;
            stage.dispose();
            stageRef.current = null;
        };
    }, [framing, failed]);

    // Promena izgleda: isti lik se samo preoblači; mačka i čovek se menjaju celi
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const current = figureRef.current;
        const wantCat = look.figure === "cat";
        if (current && (current instanceof Cat) === wantCat) {
            current.setLook(look);
            stage.setFigure(current);
            return;
        }
        current?.dispose();
        const next = wantCat ? new Cat(look) : new Avatar(look);
        figureRef.current = next;
        stage.setFigure(next);
    }, [look, failed]);

    useEffect(() => {
        stageRef.current?.setStill(calm);
    }, [calm]);

    if (failed) {
        const kind = look.figure === "cat" ? "cat" : look.figure === "man" || look.figure === "boy" ? "man" : "woman";
        return (
            <div className={className}>
                <Companion kind={kind} variant="full" still={calm} className="h-full w-full" />
            </div>
        );
    }
    return <div ref={hostRef} className={className} />;
}
