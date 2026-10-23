"use client";

// Proba 3D životinja (samo u razvoju): svaka vrsta × izgled, izrazi, govor, odeća iz
// prototipa (duks, farmerke, patike, kape — isti kroj koji #3 prenosi u katalog), pravi
// predmeti kataloga kad postoje i ljubimci. Lik pokreće motor (engine/figure.ts), isto kao
// u aplikaciji. `window.__animals` služi za snimke ekrana.

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "@/app/components/avatar3d/engine/human";
import "@/app/components/avatar3d/animals";
import "@/app/components/avatar3d/items";
import { getItem3D, type AvatarLook } from "@/app/components/avatar3d/catalog";
import { companionBuilder, registeredIds, type FaceExpression, type Wear } from "@/app/components/avatar3d/contract";
import { ANIMAL_KINDS, COMPANION_LABELS, type CompanionKind } from "@/app/components/avatar3d/data";
import { ANIMAL_SKINS } from "@/app/components/avatar3d/animals/skins.data";
import { Figure, type FigureAction } from "@/app/components/avatar3d/engine/figure";
import { POSES, type PoseName } from "@/app/components/avatar3d/engine/pose";
import { buildGarment } from "@/app/components/avatar3d/engine/garments";
import { headInfo } from "@/app/components/avatar3d/engine/head";
import { Stage, type Animated } from "@/app/components/avatar3d/engine/stage";
import { humanLook } from "@/app/components/avatar3d/looks";
import { ITEMS as PETS } from "@/app/components/avatar3d/items/pet.data";

const EXPRESSIONS: FaceExpression[] = ["neutral", "happy", "proud", "gentle", "curious", "sad", "serious", "worried", "surprised"];

/** Odeća iz prototipa: [id, boja] */
const OUTFITS: Record<string, [string, number][]> = {
    nista: [],
    duks: [["duks", 1], ["farmerke", 1], ["patike", 0], ["kapa", 2]],
    ulica: [["duks", 0], ["trenerka", 1], ["patike", 3], ["kacket", 1]],
    majica: [["majica", 1], ["sorc", 0], ["patike", 1]],
    dzemper: [["dzemper", 1], ["farmerke", 2], ["cizme", 0]],
    haljina: [["haljina", 0], ["sandale", 1], ["kruna", 0]],
};

interface LabState {
    kinds: CompanionKind[];
    skin: string;
    expression: FaceExpression;
    outfit: string;
    wear: Wear;
    talk: boolean;
    quality: "high" | "low";
    pose: PoseName;
}

function triangles(object: THREE.Object3D): number {
    let tris = 0;
    object.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || !mesh.visible) return;
        const g = mesh.geometry;
        tris += (g.index ? g.index.count : g.getAttribute("position").count) / 3;
    });
    return Math.round(tris);
}

/** Više likova jedan pored drugog */
class Lineup implements Animated {
    readonly root = new THREE.Group();
    height = 1.2;
    constructor(readonly figures: Figure[], gap: number) {
        figures.forEach((figure, i) => {
            figure.root.position.x = (i - (figures.length - 1) / 2) * gap;
            this.root.add(figure.root);
            const a = figure.body.anchors;
            this.height = Math.max(this.height, figure.height, a.ears.tipL.y + 0.03, a.horn ? a.horn.tip.y + 0.03 : 0);
        });
    }
    update(time: number, dt: number, live: boolean) {
        let busy = false;
        for (const figure of this.figures) busy = figure.update(time, dt, live) || busy;
        return busy;
    }
}

function dressPrototype(figure: Figure, outfit: string) {
    const body = figure.body;
    const head = headInfo(body.shape);
    const look: AvatarLook = { figure: "girl", skin: "", eyes: "", hair: "short", hairColor: "", expression: "neutral", wear: {} };
    for (const [id, color] of OUTFITS[outfit] ?? []) {
        const item = getItem3D(id);
        if (!item) continue;
        buildGarment({ rig: body.rig, root: body.root, head, look, skin: body.tone }, item, color);
        if (item.slot === "shoes") for (const f of body.parts.feet ?? []) f.visible = false;
        if (item.slot === "head") for (const f of body.parts.hair ?? []) f.visible = false;
    }
}

export default function AnimalsLab() {
    const hostRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Stage | null>(null);
    const figuresRef = useRef<Figure[]>([]);
    const [state, setState] = useState<LabState>({ kinds: ["cat"], skin: "", expression: "neutral", outfit: "nista", wear: {}, talk: false, quality: "high", pose: "relaxed" });
    const [info, setInfo] = useState("");

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        const stage = new Stage(host, { still: false, framing: "full" });
        stage.disableAdaptiveQuality();
        stageRef.current = stage;
        const api = {
            set: (next: Partial<LabState>) => new Promise<void>((resolve) => {
                setState((s) => ({ ...s, ...next }));
                setTimeout(resolve, 80);
            }),
            yaw: (y: number) => stage.setYaw(y),
            frame: (y: number, span: number) => stage.frameAt(y, span),
            still: (v: boolean) => stage.setStill(v),
            reframe: () => stage.setFraming("full"),
            snapshot: () => stage.snapshot(),
            play: (a: FigureAction) => figuresRef.current.forEach((f) => f.play(a)),
            stats: () => figuresRef.current.map((f) => ({ kind: f.body.kind, tris: triangles(f.body.root) })),
            ids: () => registeredIds(),
            anchors: () => figuresRef.current[0]?.body.anchors,
        };
        (window as unknown as { __animals: typeof api }).__animals = api;
        return () => {
            for (const f of figuresRef.current) f.dispose();
            stage.dispose();
            stageRef.current = null;
        };
    }, []);

    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        for (const f of figuresRef.current) f.dispose();
        const figures: Figure[] = [];
        const notes: string[] = [];
        for (const kind of state.kinds) {
            if (!companionBuilder(kind)) {
                notes.push(`${kind}: nije registrovan`);
                continue;
            }
            const human = kind === "girl" || kind === "boy" || kind === "woman" || kind === "man";
            const skins = human ? [] : ANIMAL_SKINS[kind] ?? [];
            const skin = skins.some((s) => s.id === state.skin) ? state.skin : (skins[0]?.id ?? "");
            const t0 = performance.now();
            const figure = new Figure(human ? { kind, skin: "", human: humanLook(kind, undefined) } : { kind, skin }, state.wear, { quality: state.quality });
            dressPrototype(figure, state.outfit);
            figure.setExpressionNow(state.expression);
            figure.autoPose = false;
            figure.setPose(state.pose, true);
            figure.setSpeaking(state.talk);
            figure.mouthLevel = () => Math.max(0, Math.sin(performance.now() / 90) * 0.5 + Math.sin(performance.now() / 137) * 0.5);
            figures.push(figure);
            notes.push(`${COMPANION_LABELS[kind]} · ${skin || "—"} · ${triangles(figure.body.root).toLocaleString("sr")} trouglova · ${Math.round(performance.now() - t0)} ms`);
        }
        figuresRef.current = figures;
        stage.setFigure(new Lineup(figures, 0.62));
        setInfo(notes.join(" | "));
    }, [state]);

    const kind = state.kinds[0];
    const skins = ANIMAL_SKINS[kind] ?? [];
    return (
        <main className="min-h-screen bg-[#F4F1EC] p-4 text-[#2A2230]">
            <h1 className="mb-2 text-xl font-bold">3D životinje (proba)</h1>
            <div className="flex flex-wrap gap-4">
                <div ref={hostRef} data-stage style={{ width: state.kinds.length > 1 ? Math.min(1240, 240 * state.kinds.length + 80) : 520 }} className="h-[640px] rounded-2xl bg-gradient-to-b from-[#E9EEF6] to-[#F7F2EA]" />
                <div className="flex max-w-[460px] flex-col gap-3 text-sm">
                    <p data-info>{info}</p>
                    <div className="flex flex-wrap gap-1">
                        {ANIMAL_KINDS.map((k) => (
                            <button key={k} type="button" onClick={() => setState((s) => ({ ...s, kinds: [k], skin: "" }))} className={`rounded-full px-3 py-1 ${kind === k ? "bg-[#5B4BDB] text-white" : "bg-white"}`}>
                                {COMPANION_LABELS[k]}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {skins.map((skin) => (
                            <button key={skin.id} type="button" onClick={() => setState((s) => ({ ...s, skin: skin.id }))} className={`rounded-full px-3 py-1 ${state.skin === skin.id ? "bg-[#2A9D8F] text-white" : "bg-white"}`}>
                                {skin.label} {skin.price ? `(${skin.price})` : ""}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {EXPRESSIONS.map((e) => (
                            <button key={e} type="button" onClick={() => setState((s) => ({ ...s, expression: e }))} className={`rounded-full px-3 py-1 ${state.expression === e ? "bg-[#E76F51] text-white" : "bg-white"}`}>
                                {e}
                            </button>
                        ))}
                        <button type="button" onClick={() => setState((s) => ({ ...s, talk: !s.talk }))} className="rounded-full bg-white px-3 py-1">
                            {state.talk ? "ćuti" : "govori"}
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {POSES.map((p) => (
                            <button key={p} type="button" onClick={() => setState((s) => ({ ...s, pose: p }))} className={`rounded-full px-3 py-1 ${state.pose === p ? "bg-[#8338EC] text-white" : "bg-white"}`}>
                                {p}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {Object.keys(OUTFITS).map((o) => (
                            <button key={o} type="button" onClick={() => setState((s) => ({ ...s, outfit: o }))} className={`rounded-full px-3 py-1 ${state.outfit === o ? "bg-[#264653] text-white" : "bg-white"}`}>
                                {o}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {PETS.map((pet) => (
                            <button key={pet.id} type="button" onClick={() => setState((s) => ({ ...s, wear: { ...s.wear, pet: s.wear.pet === pet.id ? undefined : pet.id } }))} className={`rounded-full px-3 py-1 ${state.wear.pet === pet.id ? "bg-[#F4A261] text-white" : "bg-white"}`}>
                                {pet.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
