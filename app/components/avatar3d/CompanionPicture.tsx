"use client";

// Mala slika 3D drugara (portret u igri, čitanje priče, izbor raspoloženja, sličice kompleta,
// predmeta i izgleda): nije živo platno, već snimak iz deljenog skrivenog renderera, keširan po
// izgledu, odeći, izrazu i kadru. Pravi se tek kad pločica dođe na ekran. Bez WebGL-a (ili za
// vrstu koja još nema 3D telo) crta se dosadašnji 2D drugar.

import { useEffect, useRef, useState } from "react";
import Companion from "@/app/components/avatar/Companion";
import { FACE_FOR_EMOTION, type VoiceEmotion } from "@/lib/emotion";
import { cn } from "@/lib/cn";
import type { Slot, Wear } from "./data";
import { companionLook } from "./looks";
import { useEngine, type Engine } from "./useEngine";

type Variant = "face" | "bust" | "portrait" | "full";

export interface CompanionPictureProps {
    kind: string;
    skin?: string;
    wear?: Wear;
    variant?: Variant;
    /** Izraz lica (iz glasa ili stalno); bez njega nasmejan */
    emotion?: VoiceEmotion;
    /** Pozadina iz odeće (wear.background) ili mirni svet; bez toga providno */
    background?: boolean;
    /** Samo predmet sa ovog mesta (sličica predmeta u prodavnici) */
    item?: { slot: Slot; id: string };
    /** Poza ruku na slici (kompleti, izgledi) */
    pose?: "relaxed" | "hips" | "crossed" | "mouth" | "behind";
    className?: string;
    /** Slika se pravi odmah, i kad nije na ekranu */
    eager?: boolean;
    alt?: string;
}

/** Veličine se zaokružuju (manje različitih snimaka, više pogodaka u kešu) */
const bucket = (px: number) => (px <= 72 ? 72 : px <= 112 ? 112 : px <= 160 ? 160 : px <= 240 ? 240 : px <= 360 ? 360 : 480);

function useVisible(ref: React.RefObject<HTMLElement | null>, eager: boolean): boolean {
    const [visible, setVisible] = useState(eager);
    useEffect(() => {
        if (visible) return;
        const el = ref.current;
        if (!el || typeof IntersectionObserver === "undefined") {
            queueMicrotask(() => setVisible(true));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                setVisible(true);
                io.disconnect();
            }
        }, { rootMargin: "120px" });
        io.observe(el);
        return () => io.disconnect();
    }, [ref, visible]);
    return visible;
}

export default function CompanionPicture({ kind, skin, wear = {}, variant = "bust", emotion, background = false, item, pose, className, eager = false, alt = "" }: CompanionPictureProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const visible = useVisible(ref, eager);
    const engineState = useEngine(visible);
    const engine: Engine | null = engineState.status === "ready" ? engineState.engine : null;
    const supported = Boolean(engine?.supports3D(kind));
    const [url, setUrl] = useState<string | null>(null);
    const expression = FACE_FOR_EMOTION[emotion ?? "happy"].expression;
    const wearKey = JSON.stringify(wear);
    const bg = item ? "none" : background ? (wear.background ?? null) : "none";

    useEffect(() => {
        const el = ref.current;
        if (!engine || !supported || !visible || !el) return;
        const shots = engine.snapshots();
        if (!shots) return;
        const rect = el.getBoundingClientRect();
        const width = bucket(rect.width || 120);
        const height = Math.round(width * ((rect.height || rect.width || 120) / (rect.width || 120)));
        const spec = {
            look: companionLook(kind, skin) as never,
            wear: item ? { [item.slot]: item.id } : wear,
            framing: item ? ("item" as const) : variant,
            slot: item?.slot,
            expression,
            pose,
            background: bg,
            width,
            height,
        };
        const cached = shots.peek(spec);
        if (cached) {
            queueMicrotask(() => setUrl(cached));
            return;
        }
        let alive = true;
        shots.request(spec).then((next) => alive && next && setUrl(next));
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [engine, supported, visible, kind, skin, wearKey, variant, expression, bg, item?.id, item?.slot, pose]);

    const fallback = engineState.status === "none" || (engine && !supported);
    return (
        <span ref={ref} className={cn("relative block overflow-hidden", className)} role={alt ? "img" : undefined} aria-label={alt || undefined}>
            {fallback ? (
                item ? null : <Companion kind={kind} wear={wear} skin={skin} variant={variant === "full" ? "full" : variant === "portrait" ? "portrait" : variant === "face" ? "face" : "bust"} emotion={emotion ?? "happy"} still className="h-full w-full" />
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                url && <img src={url} alt="" draggable={false} className="absolute inset-0 h-full w-full object-contain transition-opacity duration-200" />
            )}
        </span>
    );
}
