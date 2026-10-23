"use client";

// Proba 3D životinja (samo u razvoju): svaka vrsta × izgled, izrazi, govor, probna odeća
// (ili prava, kad je #3 registruje) i ljubimci. `window.__animals` služi za snimke ekrana.

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "@/app/components/avatar3d/animals";
import "@/app/components/avatar3d/items";
import { companionBuilder, itemBuilder, registeredIds, type FaceExpression, type FigureBody, type ItemContext, type Wear } from "@/app/components/avatar3d/contract";
import { ANIMAL_KINDS, COMPANION_LABELS, type AnimalKind } from "@/app/components/avatar3d/data";
import { ANIMAL_SKINS } from "@/app/components/avatar3d/animals/skins.data";
import { FigurePreview } from "@/app/components/avatar3d/animals/preview";
import { Kit } from "@/app/components/avatar3d/engine/kit";
import { Stage } from "@/app/components/avatar3d/engine/stage";
import { ITEMS as PETS } from "@/app/components/avatar3d/items/pet.data";
import { dressProbe, type Probe } from "./probes";

const EXPRESSIONS: FaceExpression[] = ["neutral", "happy", "proud", "gentle", "curious", "sad", "serious", "worried", "surprised"];
const PROBES: Probe[] = ["beanie", "hoodie", "pants", "sneakers"];

interface LabState {
    kind: AnimalKind;
    skin: string;
    expression: FaceExpression;
    probes: Probe[];
    /** Pravi predmeti iz kataloga (#3), po mestu */
    wear: Wear;
    talk: number;
    quality: "high" | "low";
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

function dressItems(body: FigureBody, wear: Wear, preview: FigurePreview): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    for (const [slot, id] of Object.entries(wear)) {
        if (!id) continue;
        const entry = itemBuilder(id);
        if (!entry) continue;
        const kit = new Kit({ rig: body.rig, root: body.root });
        const ctx: ItemContext = {
            body,
            wear,
            hijab: null,
            hairCrown: 0,
            kit,
            attach: (bone, object) => {
                body.rig.bone(bone).add(object);
                objects.push(object);
                return object;
            },
            toBone: (bone, p) => body.rig.bone(bone).worldToLocal(p.clone()),
        };
        const built = entry.builder.build(ctx);
        let object: THREE.Object3D | undefined;
        if (built instanceof THREE.Object3D) object = built;
        else if (built && "object" in built) {
            object = built.object;
            if (built.animate) preview.extra.push(built.animate);
        } else if (built && "animate" in built && built.animate) preview.extra.push(built.animate);
        if (object) {
            body.root.add(object);
            objects.push(object);
        }
        objects.push(...kit.objects);
        for (const part of entry.builder.covers ?? []) for (const o of body.parts[part] ?? []) o.visible = false;
        void slot;
    }
    return objects;
}

export default function AnimalsLab() {
    const hostRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Stage | null>(null);
    const bodyRef = useRef<FigureBody | null>(null);
    const previewRef = useRef<FigurePreview | null>(null);
    const [state, setState] = useState<LabState>({ kind: "cat", skin: "narandzasta", expression: "neutral", probes: [], wear: {}, talk: 0, quality: "high" });
    const stateRef = useRef(state);
    const [info, setInfo] = useState("");

    useEffect(() => {
        stateRef.current = state;
    });

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        const stage = new Stage(host, { still: false, framing: "full" });
        stage.disableAdaptiveQuality();
        stageRef.current = stage;
        const api = {
            set: (next: Partial<LabState>) => new Promise<void>((resolve) => {
                setState((s) => ({ ...s, ...next, skin: next.skin ?? (next.kind && next.kind !== s.kind ? ANIMAL_SKINS[next.kind][0].id : s.skin) }));
                setTimeout(resolve, 60);
            }),
            yaw: (y: number) => stage.setYaw(y),
            frame: (y: number, span: number) => stage.frameAt(y, span),
            still: (v: boolean) => stage.setStill(v),
            reframe: () => stage.setFraming("full"),
            snapshot: () => stage.snapshot(),
            stats: () => ({ tris: bodyRef.current ? triangles(bodyRef.current.root) : 0 }),
            ids: () => registeredIds(),
            anchors: () => bodyRef.current?.anchors,
        };
        (window as unknown as { __animals: typeof api }).__animals = api;
        return () => {
            bodyRef.current?.dispose();
            stage.dispose();
            stageRef.current = null;
        };
    }, []);

    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const builder = companionBuilder(state.kind);
        if (!builder) {
            setInfo(`${state.kind}: nije registrovan`);
            stage.setFigure(null);
            return;
        }
        const t0 = performance.now();
        const body = builder.build({ kind: state.kind, skin: state.skin }, { quality: state.quality });
        const ms = Math.round(performance.now() - t0);
        const preview = new FigurePreview(body);
        for (const probe of state.probes) dressProbe(body, probe);
        dressItems(body, state.wear, preview);
        preview.setExpression(state.expression);
        preview.talk = state.talk;
        bodyRef.current?.dispose();
        bodyRef.current = body;
        previewRef.current = preview;
        stage.setFigure(preview);
        setInfo(`${COMPANION_LABELS[state.kind]} · ${state.skin} · ${triangles(body.root).toLocaleString("sr")} trouglova · ${ms} ms`);
    }, [state]);

    const skins = ANIMAL_SKINS[state.kind];
    return (
        <main className="min-h-screen bg-[#F4F1EC] p-4 text-[#2A2230]">
            <h1 className="mb-2 text-xl font-bold">3D životinje (proba)</h1>
            <div className="flex flex-wrap gap-4">
                <div ref={hostRef} data-stage className="h-[640px] w-[520px] rounded-2xl bg-gradient-to-b from-[#E9EEF6] to-[#F7F2EA]" />
                <div className="flex max-w-[420px] flex-col gap-3 text-sm">
                    <p data-info>{info}</p>
                    <div className="flex flex-wrap gap-1">
                        {ANIMAL_KINDS.map((kind) => (
                            <button key={kind} type="button" onClick={() => setState((s) => ({ ...s, kind, skin: ANIMAL_SKINS[kind][0].id }))} className={`rounded-full px-3 py-1 ${state.kind === kind ? "bg-[#5B4BDB] text-white" : "bg-white"}`}>
                                {COMPANION_LABELS[kind]}
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
                        <button type="button" onClick={() => setState((s) => ({ ...s, talk: s.talk ? 0 : 1 }))} className="rounded-full bg-white px-3 py-1">
                            {state.talk ? "ćuti" : "govori"}
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {PROBES.map((p) => (
                            <button key={p} type="button" onClick={() => setState((s) => ({ ...s, probes: s.probes.includes(p) ? s.probes.filter((x) => x !== p) : [...s.probes, p] }))} className={`rounded-full px-3 py-1 ${state.probes.includes(p) ? "bg-[#264653] text-white" : "bg-white"}`}>
                                {p}
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
