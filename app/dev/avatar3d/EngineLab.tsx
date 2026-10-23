"use client";

// Probna stranica motora (samo u razvoju): jedan ili više drugara u studiju, izgled i odeća iz
// adrese (?kinds=girl,boy&looks=…&wear=hat:kruna,outfit:…&yaw=0.5&emotion=happy&pose=crossed
// &framing=full|bust|face|portrait|wide&bg=<id pozadine>|none&at=y:span).
// window.__e3d služi skriptama za snimke ekrana.

import { useEffect, useRef } from "react";
import * as THREE from "three";
import "@/app/components/avatar3d/engine/human";
import "@/app/components/avatar3d/items";
import "@/app/components/avatar3d/animals";
import { isHumanKind, type CompanionKind, type Wear } from "@/app/components/avatar3d/data";
import { Figure } from "@/app/components/avatar3d/engine/figure";
import { liveRenderer } from "@/app/components/avatar3d/engine/live";
import { StageScene, type Framing } from "@/app/components/avatar3d/engine/scene";
import { humanLook } from "@/app/components/avatar3d/looks";
import type { FaceExpression } from "@/lib/emotion";

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
        const live = liveRenderer();
        if (!host || !live) return;
        const params = new URLSearchParams(window.location.search);
        const kinds = (params.get("kinds") ?? "girl,boy,woman,man").split(",") as CompanionKind[];
        const looks = (params.get("looks") ?? "").split(",");
        const poses = (params.get("pose") ?? "").split(",");
        const wear = parseWear(params.get("wear"));
        const still = params.get("still") !== "0";
        const bg = params.get("bg");
        const scene = new StageScene({ framing: (params.get("framing") as Framing) ?? "full", background: bg === null ? null : bg, quality: "high" });
        const figures = kinds.map((kind, i) => {
            const human = isHumanKind(kind) ? humanLook(kind, looks[i] || undefined) : undefined;
            const figure = new Figure({ kind, skin: looks[i] ?? "", human }, wear);
            const emotion = params.get("emotion") as FaceExpression | null;
            if (emotion) figure.setExpressionNow(emotion);
            const pose = poses[i] || poses[0];
            if (pose) {
                figure.autoPose = false;
                figure.setPose(pose as never, true);
            }
            return figure;
        });
        const gap = Number(params.get("gap") ?? 0.62);
        scene.setFigure(figures[0]);
        figures.forEach((figure, i) => {
            if (i > 0) scene.turntable.add(figure.root);
        });
        // Svi u nizu, sredina niza u središtu scene
        figures.forEach((figure, i) => (figure.root.position.x = (i - (figures.length - 1) / 2) * gap));
        const tallest = Math.max(...figures.map((f) => f.height));
        const update = scene.update.bind(scene);
        scene.update = (time, dt, alive) => {
            let busy = update(time, dt, alive);
            for (let i = 1; i < figures.length; i++) busy = figures[i].update(time, dt, alive) || busy;
            return busy;
        };
        const yaw = Number(params.get("yaw") ?? 0.22);
        scene.yaw = scene.restYaw = yaw;
        const frame = () => {
            const width = (figures.length - 1) * gap + 0.7;
            const at = params.get("at");
            if (at) {
                const [y, span] = at.split(":").map(Number);
                const fov = THREE.MathUtils.degToRad(scene.camera.fov);
                const dist = (span * tallest) / 2 / Math.tan(fov / 2) / Math.min(1, scene.camera.aspect);
                scene.camera.position.set(0, y * tallest + dist * 0.04, dist);
                scene.camera.lookAt(0, y * tallest, 0);
            } else if (figures.length > 1) {
                const fov = THREE.MathUtils.degToRad(scene.camera.fov);
                const dist = Math.max((tallest * 1.18) / 2 / Math.tan(fov / 2), width / 2 / Math.tan(fov / 2) / scene.camera.aspect);
                scene.camera.position.set(0, tallest * 0.5 + dist * 0.07, dist);
                scene.camera.lookAt(0, tallest * 0.5, 0);
            }
            scene.dirty = true;
        };
        const resize = scene.resize.bind(scene);
        scene.resize = (w, h) => {
            resize(w, h);
            frame();
        };
        const view = { host, scene, live: () => !still, interactive: true };
        live.attach(view);
        (window as unknown as { __e3d: unknown }).__e3d = { scene, figures, THREE, renderer: live.renderer, stage: { scene: scene.scene, renderer: live.renderer } };
        return () => {
            live.detach(view);
            for (const figure of figures) figure.dispose();
            scene.dispose();
        };
    }, []);
    return <div ref={hostRef} className="h-dvh w-full bg-[#ECEDF0]" />;
}
