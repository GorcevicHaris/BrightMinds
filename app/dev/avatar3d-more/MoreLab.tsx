"use client";

// Proba „još 3D životinja” (animals/more, samo u razvoju). Gore: jedna vrsta u studiju (izgled, izraz,
// odeća, okretanje). Dole: galerija — svaka vrsta × izgled spreda i iz 3/4, pa svaka vrsta
// obučena (kapa, duks, pantalone, patike: pravi predmeti iz kataloga kad postoje, inače probni
// kroj istim alatom). `window.__more` služi skriptama za snimke ekrana.

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "@/app/components/avatar3d/animals";
import "@/app/components/avatar3d/items";
import { companionBuilder, itemBuilder, type FaceExpression, type Wear } from "@/app/components/avatar3d/contract";
import { COMPANION_LABELS, MORE_ANIMAL_KINDS, type MoreAnimalKind } from "@/app/components/avatar3d/data";
import { MORE_SKINS } from "@/app/components/avatar3d/animals/more/skins.data";
import { Figure } from "@/app/components/avatar3d/engine/figure";
import { Stage } from "@/app/components/avatar3d/engine/stage";
import { itemsOf } from "@/app/components/avatar3d/manifest";
import { getItem3D, type AvatarLook } from "@/app/components/avatar3d/catalog";
import { buildGarment } from "@/app/components/avatar3d/engine/garments";
import { headInfo } from "@/app/components/avatar3d/engine/head";

/** Probni kroj iz prototipa motora (dok katalog nema 3D crtež za to mesto): [id, boja] */
type Probe = [string, number];

/** Probna odeća iz prototipa (isti alat Kit kao prava odeća) — pokazuje da telo i sidra pristaju */
function dressProbe(figure: Figure, [id, color]: Probe) {
    const body = figure.body;
    const item = getItem3D(id);
    if (!item) return;
    const look: AvatarLook = { figure: "girl", skin: "", eyes: "", hair: "short", hairColor: "", expression: "neutral", wear: {} };
    buildGarment({ rig: body.rig, root: body.root, head: headInfo(body.shape), look, skin: body.tone }, item, color);
    if (item.slot === "shoes") for (const f of body.parts.feet ?? []) f.visible = false;
    if (item.slot === "head") for (const f of body.parts.hair ?? []) f.visible = false;
}

const EXPRESSIONS: FaceExpression[] = ["neutral", "happy", "proud", "gentle", "curious", "sad", "serious", "worried", "surprised"];

interface View {
    kind: MoreAnimalKind;
    skin: string;
    expression: FaceExpression;
    dressed: boolean;
    yaw: number;
    quality: "high" | "low";
    /** Tačno ovi predmeti (skripte za snimke); inače „obučen” bira kapu, duks, pantalone i patike */
    wear?: Wear;
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

/** Pravi predmet iz kataloga za mesto (i podvrstu), ako ima 3D crtež */
function realItem(slot: "hat" | "outfit" | "bottom" | "feet", group: string): string | undefined {
    const list = itemsOf(slot);
    return (list.find((item) => item.group === group && itemBuilder(item.id)) ?? list.find((item) => itemBuilder(item.id)))?.id;
}

/** Kapa + duks + pantalone + patike: pravi predmeti gde postoje, probni kroj za ostalo */
function outfit(): { wear: Wear; probes: Probe[] } {
    const wear: Wear = {};
    const probes: Probe[] = [];
    const pairs: ["hat" | "outfit" | "bottom" | "feet", string, Probe][] = [["hat", "kape", ["kapa", 2]], ["outfit", "duksevi", ["duks", 1]], ["bottom", "pantalone", ["farmerke", 1]], ["feet", "patike", ["patike", 0]]];
    for (const [slot, group, probe] of pairs) {
        const id = realItem(slot, group);
        if (id) wear[slot] = id;
        else probes.push(probe);
    }
    return { wear, probes };
}

export default function MoreLab() {
    const hostRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Stage | null>(null);
    const figureRef = useRef<Figure | null>(null);
    const [view, setView] = useState<View>({ kind: "wolf", skin: MORE_SKINS.wolf[0].id, expression: "happy", dressed: false, yaw: 0, quality: "high" });
    const [info, setInfo] = useState("");
    const [gallery, setGallery] = useState<{ title: string; src: string }[]>([]);
    const showRef = useRef<(v: View) => { tris: number; ms: number; registered: boolean }>(() => ({ tris: 0, ms: 0, registered: false }));

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        const stage = new Stage(host, { still: true, framing: "full" });
        stage.disableAdaptiveQuality();
        stageRef.current = stage;
        const show = (v: View) => {
            figureRef.current?.dispose();
            figureRef.current = null;
            if (!companionBuilder(v.kind)) {
                stage.setFigure(null);
                return { tris: 0, ms: 0, registered: false };
            }
            const dress = v.wear ? { wear: v.wear, probes: [] as Probe[] } : v.dressed ? outfit() : { wear: {}, probes: [] as Probe[] };
            const t0 = performance.now();
            const figure = new Figure({ kind: v.kind, skin: v.skin }, dress.wear, { quality: v.quality });
            const ms = Math.round(performance.now() - t0);
            const tris = triangles(figure.body.root);
            for (const probe of dress.probes) dressProbe(figure, probe);
            figure.setExpressionNow(v.expression);
            figureRef.current = figure;
            stage.setFigure(figure);
            stage.setYaw(v.yaw);
            return { tris, ms, registered: true };
        };
        showRef.current = show;
        const api = {
            show: (v: Partial<View>) => {
                const next: View = { kind: "wolf", skin: "", expression: "happy", dressed: false, yaw: 0, quality: "high", ...v };
                if (!next.skin) next.skin = (companionBuilder(next.kind)?.skins ?? [])[0]?.id ?? "";
                return show(next);
            },
            frame: (y: number, span: number) => stage.frameAt(y, span),
            reframe: () => stage.setFraming("full"),
            snapshot: () => stage.snapshot(),
            anchors: () => figureRef.current?.body.anchors,
            figure: () => figureRef.current,
            THREE,
            registered: () => MORE_ANIMAL_KINDS.filter((k) => companionBuilder(k)),
            skinsOf: (k: string) => companionBuilder(k)?.skins ?? [],
        };
        (window as unknown as { __more: typeof api }).__more = api;
        return () => {
            figureRef.current?.dispose();
            stage.dispose();
            stageRef.current = null;
        };
    }, []);

    useEffect(() => {
        const r = showRef.current(view);
        setInfo(r.registered ? `${COMPANION_LABELS[view.kind]} · ${view.skin} · ${r.tris.toLocaleString("sr")} trouglova (telo) · ${r.ms} ms` : `${COMPANION_LABELS[view.kind]}: još nije napravljen`);
    }, [view]);

    const makeGallery = async () => {
        const stage = stageRef.current;
        if (!stage) return;
        const out: { title: string; src: string }[] = [];
        const wait = () => new Promise((r) => setTimeout(r, 30));
        for (const kind of MORE_ANIMAL_KINDS) {
            if (!companionBuilder(kind)) continue;
            for (const skin of MORE_SKINS[kind]) {
                for (const yaw of [0, 0.7]) {
                    showRef.current({ kind, skin: skin.id, expression: "happy", dressed: false, yaw, quality: "high" });
                    await wait();
                    out.push({ title: `${COMPANION_LABELS[kind]} · ${skin.label}${yaw ? " · 3/4" : ""}`, src: stage.snapshot() });
                }
            }
            showRef.current({ kind, skin: MORE_SKINS[kind][0].id, expression: "happy", dressed: true, yaw: 0.45, quality: "high" });
            await wait();
            out.push({ title: `${COMPANION_LABELS[kind]} · obučen`, src: stage.snapshot() });
            setGallery([...out]);
        }
        showRef.current(view);
    };

    const skins = MORE_SKINS[view.kind];
    return (
        <main className="min-h-screen bg-[#F4F1EC] p-4 text-[#2A2230]">
            <h1 className="mb-2 text-xl font-bold">Još 3D životinja (proba)</h1>
            <div className="flex flex-wrap gap-4">
                <div ref={hostRef} data-stage className="h-[700px] w-[560px] rounded-2xl bg-gradient-to-b from-[#E9EEF6] to-[#F7F2EA]" />
                <div className="flex max-w-[440px] flex-col gap-3 text-sm">
                    <p data-info>{info}</p>
                    <div className="flex flex-wrap gap-1">
                        {MORE_ANIMAL_KINDS.map((kind) => (
                            <button key={kind} type="button" onClick={() => setView((v) => ({ ...v, kind, skin: MORE_SKINS[kind][0].id }))} className={`rounded-full px-3 py-1 ${view.kind === kind ? "bg-[#5B4BDB] text-white" : companionBuilder(kind) ? "bg-white" : "bg-white/50 text-slate-400"}`}>
                                {COMPANION_LABELS[kind]}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {skins.map((skin) => (
                            <button key={skin.id} type="button" onClick={() => setView((v) => ({ ...v, skin: skin.id }))} className={`rounded-full px-3 py-1 ${view.skin === skin.id ? "bg-[#2A9D8F] text-white" : "bg-white"}`}>
                                {skin.label} {skin.price ? `(${skin.price})` : ""}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {EXPRESSIONS.map((e) => (
                            <button key={e} type="button" onClick={() => setView((v) => ({ ...v, expression: e }))} className={`rounded-full px-3 py-1 ${view.expression === e ? "bg-[#E76F51] text-white" : "bg-white"}`}>
                                {e}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        <button type="button" onClick={() => setView((v) => ({ ...v, dressed: !v.dressed }))} className={`rounded-full px-3 py-1 ${view.dressed ? "bg-[#264653] text-white" : "bg-white"}`}>obučen</button>
                        <button type="button" onClick={() => setView((v) => ({ ...v, yaw: v.yaw ? 0 : 0.7 }))} className="rounded-full bg-white px-3 py-1">spreda / 3/4</button>
                        <button type="button" onClick={() => setView((v) => ({ ...v, quality: v.quality === "high" ? "low" : "high" }))} className="rounded-full bg-white px-3 py-1">kvalitet: {view.quality}</button>
                        <button type="button" onClick={makeGallery} className="rounded-full bg-[#F4A261] px-3 py-1 text-white">napravi galeriju</button>
                    </div>
                </div>
            </div>
            {gallery.length > 0 && (
                <section className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3" data-gallery>
                    {gallery.map((g) => (
                        <figure key={g.title} className="rounded-xl bg-white p-2 text-xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={g.src} alt={g.title} className="w-full" />
                            <figcaption>{g.title}</figcaption>
                        </figure>
                    ))}
                </section>
            )}
        </main>
    );
}
