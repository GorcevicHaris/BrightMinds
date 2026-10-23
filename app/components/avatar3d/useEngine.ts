"use client";

// Lenjo učitavanje 3D motora (three.js i svi graditelji su poseban paket): stranica bez
// drugara ga nikad ne preuzima. Ako WebGL ne radi, motor se i ne učitava — crta se 2D drugar.

import { useEffect, useState } from "react";

export type Engine = typeof import("./engine/entry");

let promise: Promise<Engine> | null = null;
let loaded: Engine | null = null;
let webgl: boolean | null = null;

export function loadEngine(): Promise<Engine> {
    promise ??= import("./engine/entry").then((engine) => {
        loaded = engine;
        return engine;
    });
    return promise;
}

/** WebGL u ovom pregledaču (proverava se jednom) */
export function hasWebGL(): boolean {
    if (webgl === null) {
        try {
            const canvas = document.createElement("canvas");
            webgl = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
        } catch {
            webgl = false;
        }
    }
    return webgl;
}

export type EngineState = { status: "loading" } | { status: "ready"; engine: Engine } | { status: "none" };

/** Motor kad se učita; „none” kad WebGL ne radi ili učitavanje ne uspe (tada 2D) */
export function useEngine(enabled = true): EngineState {
    const [state, setState] = useState<EngineState>(() => (loaded ? { status: "ready", engine: loaded } : { status: "loading" }));
    useEffect(() => {
        if (!enabled || state.status !== "loading") return;
        if (!hasWebGL()) {
            queueMicrotask(() => setState({ status: "none" }));
            return;
        }
        let alive = true;
        loadEngine()
            .then((engine) => alive && setState({ status: "ready", engine }))
            .catch(() => alive && setState({ status: "none" }));
        return () => {
            alive = false;
        };
    }, [enabled, state.status]);
    return state;
}
