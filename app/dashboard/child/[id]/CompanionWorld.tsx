"use client";

// Kupljena pozadina drugara preko cele strane deteta (igre, „Moj drugar”, napredak). Svet se ne
// crta živo, već jednom kao snimak iz deljenog skrivenog renderera, približno u odnosu strana
// ekrana, pa se ne razvlači kao u uskom baneru. Preko njega je blag svetli veo, da kartice i tekst ostanu čitljivi.
// Bez kupljene pozadine (ili bez WebGL-a) strana ostaje mirna, kakva je i bila.

import { useEffect, useState } from "react";
import { companionLook } from "@/app/components/avatar3d/looks";
import { useEngine } from "@/app/components/avatar3d/useEngine";
import { cn } from "@/lib/cn";
import { chosenSkin, useCompanion } from "./companionState";

/** Širine snimka (manje različitih snimaka, više pogodaka u kešu) */
const WIDTHS = [480, 800, 1200];

function shotSize(): { width: number; height: number } {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    // Svet je širok (duga, zamak, more): snimak je uvek položen (bar 5 : 4), a na uspravnom
    // ekranu se seče po sredini. Odnos zaokružen na desetinu: sitne promene ne prave novi snimak.
    const ratio = Math.min(Math.round((h / w) * 10) / 10, 0.8);
    // Širina dovoljna i za ekran koji se puni po visini (telefon), da slika ne bude mutna
    const needed = Math.min(Math.max(w, h / ratio), 1200);
    const width = WIDTHS.find((x) => x >= needed) ?? 1200;
    return { width, height: Math.round(width * ratio) };
}

export default function CompanionWorld() {
    const companion = useCompanion();
    const backgroundId = companion?.wear.background ?? null;
    const engineState = useEngine(Boolean(backgroundId));
    const engine = engineState.status === "ready" ? engineState.engine : null;
    const [shot, setShot] = useState<{ id: string; url: string } | null>(null);
    const [size, setSize] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
        const update = () => setSize((current) => {
            const next = shotSize();
            return current && current.width === next.width && current.height === next.height ? current : next;
        });
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    const kind = companion?.kind;
    const skin = companion ? chosenSkin(companion) : undefined;
    useEffect(() => {
        if (!engine || !backgroundId || !size || !kind || !engine.hasItem3D(backgroundId)) return;
        const shots = engine.snapshots();
        if (!shots) return;
        const spec = {
            look: companionLook(kind, skin) as never,
            wear: { background: backgroundId },
            framing: "item" as const,
            slot: "background" as const,
            background: null,
            width: size.width,
            height: size.height,
        };
        let alive = true;
        const cached = shots.peek(spec);
        if (cached) queueMicrotask(() => alive && setShot({ id: backgroundId, url: cached }));
        else shots.request(spec).then((url) => alive && url && setShot({ id: backgroundId, url }));
        return () => {
            alive = false;
        };
    }, [engine, backgroundId, size, kind, skin]);

    const visible = Boolean(backgroundId && shot && shot.id === backgroundId);
    return (
        <div aria-hidden="true" className={cn("pointer-events-none fixed inset-0 -z-10 transition-opacity duration-500", visible ? "opacity-100" : "opacity-0")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {shot && <img src={shot.url} alt="" draggable={false} className="h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-canvas/35" />
        </div>
    );
}
