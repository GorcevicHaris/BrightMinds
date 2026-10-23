// Jedan deljeni WebGL renderer za ŽIVI prikaz drugara na stranici (prodavnica, baner, kraj
// nivoa). Platno se seli u prikaz koji je poslednji došao na ekran; prethodni za to vreme
// prikazuje sliku (snimak). Na stranici su najviše dva WebGL konteksta: ovaj i onaj za sličice
// (snapshots.ts). Crta samo kad ima pokreta: mirno disanje ≈ 30 kadrova u sekundi, pokreti i
// okretanje punom brzinom; uz „Manje animacija” — samo kad se nešto promeni.

import * as THREE from "three";
import type { StageScene } from "./scene";

export interface LiveView {
    host: HTMLElement;
    scene: StageScene;
    /** Mirni pokreti (disanje, treptanje) — false uz „Manje animacija” */
    live: () => boolean;
    /** Okretanje prevlačenjem (prodavnica) */
    interactive: boolean;
    /** Prikaz je dobio ili izgubio platno */
    onOwner?: (owner: boolean) => void;
    /** WebGL nije dostupan ili je kontekst izgubljen */
    onFail?: () => void;
}

const MAX_DPR = 1.75;

class LiveRenderer {
    readonly renderer: THREE.WebGLRenderer;
    private views: LiveView[] = [];
    private frame = 0;
    private last = 0;
    private lastRender = 0;
    private resize: ResizeObserver;
    private dpr: number;
    private slowSince = 0;
    private slowFrames = 0;
    private lowQuality = false;
    private dragX = 0;
    failed = false;

    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        this.dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
        this.renderer.setPixelRatio(this.dpr);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.86;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.setClearColor(0x000000, 0);
        const canvas = this.renderer.domElement;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        canvas.style.touchAction = "pan-y";
        canvas.setAttribute("aria-hidden", "true");
        this.loop = this.loop.bind(this);
        this.resize = new ResizeObserver(() => this.fit());
        canvas.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            this.failed = true;
            for (const view of this.views) view.onFail?.();
        });
        canvas.addEventListener("pointerdown", (e) => {
            const view = this.owner;
            if (!view?.interactive) return;
            this.dragX = e.clientX;
            view.scene.dragStart();
            canvas.setPointerCapture(e.pointerId);
            this.invalidate();
        });
        canvas.addEventListener("pointermove", (e) => {
            const view = this.owner;
            if (!view?.interactive || !view.scene.isDragging) return;
            view.scene.dragBy(e.clientX - this.dragX, canvas.clientWidth);
            this.dragX = e.clientX;
            this.invalidate();
        });
        const end = () => {
            this.owner?.scene.dragEnd();
            this.invalidate();
        };
        canvas.addEventListener("pointerup", end);
        canvas.addEventListener("pointercancel", end);
    }

    get owner(): LiveView | null {
        return this.views[this.views.length - 1] ?? null;
    }

    attach(view: LiveView) {
        const previous = this.owner;
        this.views = this.views.filter((v) => v !== view);
        this.views.push(view);
        if (previous && previous !== view) previous.onOwner?.(false);
        this.take(view);
    }

    detach(view: LiveView) {
        const wasOwner = this.owner === view;
        this.views = this.views.filter((v) => v !== view);
        if (wasOwner) {
            this.resize.disconnect();
            this.renderer.domElement.remove();
            const next = this.owner;
            if (next) this.take(next);
        }
    }

    private take(view: LiveView) {
        this.resize.disconnect();
        view.host.appendChild(this.renderer.domElement);
        this.resize.observe(view.host);
        view.onOwner?.(true);
        this.fit();
        view.scene.dirty = true;
        this.invalidate();
    }

    private fit() {
        const view = this.owner;
        if (!view) return;
        const { clientWidth: w, clientHeight: h } = view.host;
        if (!w || !h) return;
        this.renderer.setSize(w, h, false);
        view.scene.resize(w, h);
        this.invalidate();
    }

    invalidate() {
        if (!this.frame) {
            this.last = performance.now();
            this.frame = requestAnimationFrame(this.loop);
        }
    }

    private loop(now: number) {
        this.frame = 0;
        const view = this.owner;
        if (!view) return;
        const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
        this.last = now;
        const live = view.live();
        const scene = view.scene;
        const wasDirty = scene.dirty;
        const busy = scene.update(now / 1000, dt, live);
        // Samo mirno disanje: dovoljno je ≈ 30 kadrova u sekundi (štedi bateriju)
        const calmOnly = busy && !wasDirty && !scene.isDragging && scene.figure?.isCalm !== false;
        if (busy && (!calmOnly || now - this.lastRender > 31)) {
            const gap = this.lastRender ? now - this.lastRender : 0;
            this.lastRender = now;
            scene.render(this.renderer);
            this.adapt(now, gap, calmOnly);
        }
        if (busy || scene.isDragging) this.frame = requestAnimationFrame(this.loop);
    }

    /**
     * Ako uređaj ne stiže (kadrovi sporiji od ≈ 24 u sekundi dve sekunde zaredom), smanjuje
     * oštrinu na 1× i gasi senku glavnog svetla; meka senka na podu ostaje.
     */
    private adapt(now: number, gap: number, calm: boolean) {
        if (this.lowQuality || gap <= 0 || gap > 250) return;
        const limit = calm ? 60 : 42;
        if (gap > limit) {
            if (!this.slowSince) this.slowSince = now;
            this.slowFrames++;
            if (now - this.slowSince > 2000 && this.slowFrames > 24) {
                this.lowQuality = true;
                this.dpr = 1;
                this.renderer.setPixelRatio(1);
                this.renderer.shadowMap.enabled = false;
                this.fit();
            }
        } else {
            this.slowSince = 0;
            this.slowFrames = 0;
        }
    }

    get reducedQuality(): boolean {
        return this.lowQuality;
    }
}

let instance: LiveRenderer | null = null;

/** Deljeni renderer (pravi se pri prvom živom prikazu); null kad WebGL nije dostupan */
export function liveRenderer(): LiveRenderer | null {
    if (instance?.failed) return null;
    if (!instance) {
        try {
            instance = new LiveRenderer();
        } catch {
            return null;
        }
    }
    return instance;
}

export function webglAvailable(): boolean {
    try {
        const canvas = document.createElement("canvas");
        return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
        return false;
    }
}
