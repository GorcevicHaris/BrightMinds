"use client";

// Probna stranica motora (samo u razvoju): jedan ili više drugara u studiju, izgled i odeća iz
// adrese (?kinds=girl,boy&look=…&wear=hat:kruna,outfit:…&yaw=0.5&emotion=happy&framing=bust).
// window.__e3d služi skriptama za snimke ekrana.

import { useEffect, useRef } from "react";
import * as THREE from "three";
import "@/app/components/avatar3d/engine/human";
import "@/app/components/avatar3d/items";
import "@/app/components/avatar3d/animals";
import { isHumanKind, type CompanionKind, type Wear } from "@/app/components/avatar3d/data";
import { Figure } from "@/app/components/avatar3d/engine/figure";
import { Stage, type Animated } from "@/app/components/avatar3d/engine/stage";
import { humanLook } from "@/app/components/avatar3d/looks";
import type { VoiceEmotion } from "@/lib/emotion";

class Lineup implements Animated {
    readonly root = new THREE.Group();
    height = 1.2;
    constructor(readonly figures: Figure[], gap: number) {
        figures.forEach((figure, i) => {
            figure.root.position.x = (i - (figures.length - 1) / 2) * gap;
            this.root.add(figure.root);
            this.height = Math.max(this.height, figure.height);
        });
    }
    update(time: number, dt: number, live: boolean) {
        let busy = false;
        for (const figure of this.figures) busy = figure.update(time, dt, live) || busy;
        return busy;
    }
}

function parseWear(text: string | null): Wear {
    const wear: Wear = {};
    for (const pair of (text ?? "").split(",").filter(Boolean)) {
        const [slot, id] = pair.split(":");
        (wear as Record<string, string>)[slot] = id;
    }
    return wear;
}

export default function EngineLab() {
    const hostRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        const params = new URLSearchParams(window.location.search);
        const kinds = (params.get("kinds") ?? "girl,boy,woman,man").split(",") as CompanionKind[];
        const looks = (params.get("looks") ?? "").split(",");
        const wear = parseWear(params.get("wear"));
        const still = params.get("still") !== "0";
        const stage = new Stage(host, { still, framing: params.get("framing") === "bust" ? "bust" : "full" });
        stage.disableAdaptiveQuality();
        const figures = kinds.map((kind, i) => {
            const human = isHumanKind(kind) ? humanLook(kind, looks[i] || undefined) : undefined;
            const figure = new Figure({ kind, skin: looks[i] ?? "", human }, wear);
            const emotion = params.get("emotion") as VoiceEmotion | null;
            if (emotion) figure.setExpressionNow(emotion === "hello" ? "happy" : (emotion as never));
            const pose = params.get("pose")?.split(",")[i] ?? params.get("pose");
            if (pose) {
                figure.autoPose = false;
                figure.setPose(pose as never, true);
            }
            return figure;
        });
        const lineup = new Lineup(figures, Number(params.get("gap") ?? 0.62));
        stage.setFigure(lineup);
        stage.setYaw(Number(params.get("yaw") ?? 0));
        // Krupni plan: posle prvog merenja veličine (ResizeObserver bi ga inače pregazio)
        if (params.get("at")) {
            const [y, span] = params.get("at")!.split(":").map(Number);
            setTimeout(() => stage.frameAt(y, span), 400);
        }
        (window as unknown as { __e3d: unknown }).__e3d = { stage, figures, THREE };
        return () => {
            for (const figure of figures) figure.dispose();
            stage.dispose();
        };
    }, []);
    return <div ref={hostRef} className="h-dvh w-full bg-[#ECEDF0]" />;
}
