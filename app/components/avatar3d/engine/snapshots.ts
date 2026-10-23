// Sličice i mali portreti drugara: jedan skriveni WebGL renderer za celu stranicu crta ih
// van ekrana, po jednu u slobodnom trenutku, i čuva ih kao slike (keš po izgledu, odeći,
// izrazu i kadru). Novije želje idu prve (pločice koje su upravo došle na ekran), a stare se
// iz keša brišu kad ih ima previše (oslobađa se i memorija slika).

import * as THREE from "three";
import type { FaceExpression } from "@/lib/emotion";
import type { CompanionLook, Slot, Wear } from "../contract";
import { Figure } from "./figure";
import type { PoseName } from "./pose";
import { REST_YAW, StageScene, type Framing } from "./scene";

export interface SnapSpec {
    look: CompanionLook;
    wear: Wear;
    /** Kadar; `item` = samo predmet sa tog mesta (bez tela) */
    framing: Framing | "item";
    slot?: Slot;
    expression?: FaceExpression;
    pose?: PoseName;
    /** id pozadine, null = podrazumevani svet, "none" = providno */
    background: string | null;
    /** Veličina u CSS pikselima */
    width: number;
    height: number;
    yaw?: number;
}

const MAX_CACHE = 360;
const MAX_FIGURES = 3;

function lookKey(look: CompanionLook): string {
    const h = look.human;
    return h ? `${look.kind}|${h.tone}.${h.eye}.${h.hair}.${h.style}.${h.hijab}` : `${look.kind}|${look.skin}`;
}

export function snapKey(spec: SnapSpec): string {
    const wear = Object.keys(spec.wear).sort().map((slot) => `${slot}:${spec.wear[slot as Slot]}`).join(",");
    return [lookKey(spec.look), wear, spec.framing, spec.slot ?? "", spec.expression ?? "", spec.pose ?? "", spec.background ?? "", spec.width, spec.height, spec.yaw ?? ""].join("~");
}

interface Job {
    key: string;
    spec: SnapSpec;
    waiters: ((url: string | null) => void)[];
}

class SnapshotRenderer {
    private renderer: THREE.WebGLRenderer;
    private scene = new StageScene({ framing: "full", background: "none", quality: "low" });
    private figures = new Map<string, Figure>();
    private cache = new Map<string, string>();
    private queue: Job[] = [];
    private pending = new Map<string, Job>();
    private busy = false;
    private dpr = Math.min(2, window.devicePixelRatio || 1);

    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        this.renderer.setPixelRatio(1);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.88;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.setClearColor(0x000000, 0);
    }

    peek(spec: SnapSpec): string | undefined {
        const key = snapKey(spec);
        const url = this.cache.get(key);
        if (url) {
            // Skoro korišćeno ide na kraj (LRU)
            this.cache.delete(key);
            this.cache.set(key, url);
        }
        return url;
    }

    request(spec: SnapSpec): Promise<string | null> {
        const cached = this.peek(spec);
        if (cached) return Promise.resolve(cached);
        const key = snapKey(spec);
        return new Promise((resolve) => {
            const job = this.pending.get(key);
            if (job) {
                job.waiters.push(resolve);
                // Ponovo tražena — ide napred
                this.queue = this.queue.filter((j) => j !== job);
                this.queue.push(job);
                return;
            }
            const next: Job = { key, spec, waiters: [resolve] };
            this.pending.set(key, next);
            this.queue.push(next);
            this.pump();
        });
    }

    /** Odustajanje (pločica je otišla sa ekrana pre nego što je nacrtana) */
    cancel(spec: SnapSpec) {
        const key = snapKey(spec);
        const job = this.pending.get(key);
        if (!job) return;
        this.queue = this.queue.filter((j) => j !== job);
        this.pending.delete(key);
        for (const resolve of job.waiters) resolve(null);
    }

    private pump() {
        if (this.busy || !this.queue.length) return;
        this.busy = true;
        const idle = (cb: () => void) =>
            "requestIdleCallback" in window ? (window as Window).requestIdleCallback(cb, { timeout: 120 }) : setTimeout(cb, 16);
        idle(() => {
            const job = this.queue.pop();
            if (!job) {
                this.busy = false;
                return;
            }
            this.pending.delete(job.key);
            this.draw(job.spec)
                .catch((error) => {
                    console.error("3D sličica:", error);
                    return null;
                })
                .then((url) => {
                    if (url) this.store(job.key, url);
                    for (const resolve of job.waiters) resolve(url);
                    this.busy = false;
                    this.pump();
                });
        });
    }

    private store(key: string, url: string) {
        this.cache.set(key, url);
        while (this.cache.size > MAX_CACHE) {
            const [oldKey, oldUrl] = this.cache.entries().next().value as [string, string];
            this.cache.delete(oldKey);
            URL.revokeObjectURL(oldUrl);
        }
    }

    private figureFor(look: CompanionLook): Figure | null {
        if (!Figure.supports(look.kind)) return null;
        const key = lookKey(look);
        let figure = this.figures.get(key);
        if (figure) {
            this.figures.delete(key);
            this.figures.set(key, figure);
            return figure;
        }
        figure = new Figure(look, {}, { quality: "low" });
        figure.autoPose = false;
        this.figures.set(key, figure);
        while (this.figures.size > MAX_FIGURES) {
            const [oldKey, old] = this.figures.entries().next().value as [string, Figure];
            this.figures.delete(oldKey);
            old.dispose();
        }
        return figure;
    }

    private async draw(spec: SnapSpec): Promise<string | null> {
        const figure = this.figureFor(spec.look);
        const scene = this.scene;
        const width = Math.max(16, Math.round(spec.width * this.dpr));
        const height = Math.max(16, Math.round(spec.height * this.dpr));
        this.renderer.setSize(width, height, false);
        scene.resize(width, height);
        const scenery = spec.framing === "item" && spec.slot === "background";
        const item = spec.framing === "item" && !scenery;
        // Sličica pozadine je sam svet (bez lika), široko kadriran
        scene.setBackground(scenery ? (spec.wear.background ?? null) : item ? "none" : spec.background);
        if (figure) {
            figure.setWear(spec.wear);
            figure.setExpressionNow(spec.expression ?? "happy");
            figure.setPose(spec.pose ?? "relaxed", true);
            figure.update(0, 0, false);
        }
        scene.setFigure(scenery ? null : figure);
        scene.setFraming(scenery ? "wide" : spec.framing === "item" ? "full" : spec.framing);
        scene.yaw = scene.restYaw = spec.yaw ?? (item ? 0.5 : REST_YAW);
        scene.update(0, 0, false);
        let box: THREE.Box3 | null = null;
        if (item && figure && spec.slot && spec.slot !== "background") {
            figure.isolate(spec.slot);
            box = scene.slotBox(spec.slot);
            scene.focus(box);
        }
        scene.render(this.renderer, true);
        if (item && figure) figure.isolate(null);
        scene.focus(null);
        const blob = await new Promise<Blob | null>((resolve) => this.renderer.domElement.toBlob(resolve, "image/png"));
        return blob ? URL.createObjectURL(blob) : null;
    }
}

let instance: SnapshotRenderer | null | undefined;

/** Deljeni renderer sličica; null kad WebGL nije dostupan */
export function snapshots(): SnapshotRenderer | null {
    if (instance === undefined) {
        try {
            instance = new SnapshotRenderer();
        } catch {
            instance = null;
        }
    }
    return instance;
}
