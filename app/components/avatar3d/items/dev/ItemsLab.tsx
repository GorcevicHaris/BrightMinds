"use client";

// Provera kataloga (samo u razvoju): svaki predmet na devojčici, dečaku, mački i još jednoj
// životinji; sve pozadine (široko i uspravno); svi kompleti na ljudima i životinjama.
// Parametri u adresi:
//   ?view=slot&slot=hat[&kinds=girl,boy,cat][&ids=a,b][&from=0&count=40][&hijab=%23F2B8C6]
//   ?view=sets[&kinds=…]   ?view=bg[&mode=wide|portrait]   ?view=one&id=…&kind=…[&yaw=…]
//   ?view=look&wear=hat:kapa,outfit:plavi-duks[&kinds=…]
// window.__lab = { done, cells, over, missing, errors } — za skriptu koja pravi snimke.

import { useEffect, useState } from "react";
import type { CompanionKind, Slot, ThumbHint, Wear } from "../../contract";
import { ANIMAL_KINDS, HUMAN_KINDS, SLOT_LABELS, itemBuilder } from "../../contract";
import { SETS, itemsOf } from "../../manifest";
import type { CellRequest } from "./lab";

interface Cell {
    key: string;
    title: string;
    sub: string;
    req: CellRequest;
    url?: string;
    note?: string;
    bad?: boolean;
}

const SLOT_FOCUS: Record<Slot, ThumbHint["focus"]> = {
    hat: "head",
    glasses: "face",
    neck: "upper",
    outfit: "full",
    bottom: "full",
    feet: "feet",
    hand: "full",
    back: "back",
    pet: "full",
    background: "scene",
};

/** Osnovna odeća za probu ostalih mesta (da lik ne bude „go”) */
const BASE: Partial<Record<Slot, Wear>> = {
    hat: { outfit: "majica-pruge" },
    glasses: { outfit: "majica-zvezda" },
    neck: { outfit: "majica-srce" },
    feet: { outfit: "majica-sunce" },
    hand: { outfit: "majica-tufne" },
    back: { outfit: "plavi-duks" },
};

const OTHERS = ANIMAL_KINDS.filter((k) => k !== "cat");

function params(): URLSearchParams {
    return new URLSearchParams(window.location.search);
}

function buildCells(): Cell[] {
    const q = params();
    const view = q.get("view") ?? "slot";
    const hijab = q.get("hijab");
    const kinds = (q.get("kinds")?.split(",") as CompanionKind[] | undefined) ?? null;
    const cells: Cell[] = [];
    if (view === "slot") {
        const slot = (q.get("slot") ?? "hat") as Slot;
        let items = itemsOf(slot);
        const ids = q.get("ids")?.split(",");
        if (ids) items = items.filter((i) => ids.includes(i.id));
        const from = Number(q.get("from") ?? 0);
        items = items.slice(from, from + Number(q.get("count") ?? 999));
        const base = q.get("bare") ? {} : (BASE[slot] ?? {});
        items.forEach((item, i) => {
            const thumb = itemBuilder(item.id)?.builder.thumb;
            const focus = (q.get("focus") as ThumbHint["focus"]) ?? (slot === "back" ? "back" : SLOT_FOCUS[slot]);
            const list = kinds ?? (["girl", "boy", "cat", OTHERS[(i + from) % OTHERS.length]] as CompanionKind[]);
            for (const kind of list) {
                cells.push({
                    key: `${item.id}-${kind}`,
                    title: item.label,
                    sub: `${item.id} · ${kind}`,
                    req: { kind, wear: { ...base, [slot]: item.id }, focus, yaw: Number(q.get("yaw") ?? (focus === "back" ? 0.5 : -0.42)), zoom: thumb?.zoom, hijab, width: 240, height: focus === "full" ? 340 : 240 },
                });
            }
        });
    } else if (view === "sets") {
        const list = kinds ?? ([...HUMAN_KINDS, ...ANIMAL_KINDS] as CompanionKind[]);
        const only = q.get("ids")?.split(",");
        for (const set of SETS) {
            if (only && !only.includes(set.id)) continue;
            // Pozadina i ljubimac se ne crtaju na liku (ljubimac stoji pored, pozadina je scena)
            const wear = { ...set.items };
            delete wear.background;
            delete wear.pet;
            for (const kind of list) {
                cells.push({ key: `${set.id}-${kind}`, title: set.label, sub: `${set.id} · ${kind}`, req: { kind, wear, focus: "full", yaw: -0.42, hijab, width: 220, height: 320 } });
            }
        }
    } else if (view === "bg") {
        const mode = q.get("mode") ?? "wide";
        const wide = mode === "wide";
        const only = q.get("ids")?.split(",");
        for (const bg of itemsOf("background")) {
            if (only && !only.includes(bg.id)) continue;
            const kind = (q.get("kind") ?? "girl") as CompanionKind;
            cells.push({
                key: `${bg.id}-${mode}`,
                title: bg.label,
                sub: `${bg.id} · ${mode}`,
                req: { kind, wear: { outfit: "majica-zvezda" }, focus: "scene", yaw: 0, background: bg.id, wide, width: wide ? 640 : 300, height: wide ? 300 : 520, time: Number(q.get("t") ?? 3) },
            });
        }
    } else if (view === "one") {
        const id = q.get("id") ?? "kapa";
        const kind = (q.get("kind") ?? "girl") as CompanionKind;
        const slot = (itemBuilder(id)?.slot ?? "hat") as Slot;
        const extra = Object.fromEntries((q.get("wear") ?? "").split(",").filter(Boolean).map((p) => p.split(":"))) as Wear;
        cells.push({
            key: id,
            title: id,
            sub: kind,
            req: { kind, wear: { ...extra, [slot]: id }, focus: (q.get("focus") as ThumbHint["focus"]) ?? SLOT_FOCUS[slot], yaw: Number(q.get("yaw") ?? -0.42), zoom: Number(q.get("zoom") ?? 1), hijab, width: Number(q.get("w") ?? 600), height: Number(q.get("h") ?? 800) },
        });
    } else if (view === "look") {
        const wear = Object.fromEntries((q.get("wear") ?? "").split(",").filter(Boolean).map((p) => p.split(":"))) as Wear;
        const list = kinds ?? (["girl", "boy", "cat", "bunny"] as CompanionKind[]);
        for (const kind of list) {
            cells.push({ key: kind, title: kind, sub: "", req: { kind, wear, focus: (q.get("focus") as ThumbHint["focus"]) ?? "full", yaw: Number(q.get("yaw") ?? -0.42), zoom: Number(q.get("zoom") ?? 1), hijab, width: Number(q.get("w") ?? 300), height: Number(q.get("h") ?? 420) } });
        }
    }
    return cells;
}

declare global {
    interface Window {
        __lab?: { done: boolean; cells: number; over: string[]; missing: string[]; errors: string[]; tris: Record<string, number> };
    }
}

export default function ItemsLab() {
    const [cells, setCells] = useState<Cell[]>([]);
    const [title, setTitle] = useState("");

    useEffect(() => {
        let alive = true;
        const status = { done: false, cells: 0, over: [] as string[], missing: [] as string[], errors: [] as string[], tris: {} as Record<string, number> };
        window.__lab = status;
        (async () => {
            const { Lab, budgetFor } = await import("./lab");
            const q = params();
            const view = q.get("view") ?? "slot";
            setTitle(view === "slot" ? `${SLOT_LABELS[(q.get("slot") ?? "hat") as Slot]}` : view);
            const list = buildCells();
            const quality = q.get("q") === "low" ? "low" : "high";
            const pose = q.get("pose") as CellRequest["pose"] | null;
            for (const cell of list) {
                cell.req.quality = quality;
                if (pose) cell.req.pose = pose;
                if (q.get("dbg")) cell.req.debug = true;
            }
            setCells(list);
            const lab = new Lab();
            for (let i = 0; i < list.length && alive; i++) {
                const cell = list[i];
                const result = lab.render(cell.req);
                const notes: string[] = [];
                let bad = false;
                for (const [id, n] of Object.entries(result.tris)) {
                    if (id.includes("/")) {
                        status.tris[id] = n;
                        continue;
                    }
                    status.tris[id] = Math.max(status.tris[id] ?? 0, n);
                    const slot = itemBuilder(id)?.slot ?? "background";
                    const budget = budgetFor(slot, id);
                    if (n > budget) {
                        bad = true;
                        if (!status.over.includes(id)) status.over.push(`${id}:${n}`);
                    }
                    notes.push(`${(n / 1000).toFixed(1)}k`);
                }
                if (result.missing.length) {
                    bad = true;
                    status.missing.push(...result.missing.filter((m) => !status.missing.includes(m)));
                    notes.push(`nema: ${result.missing.join(", ")}`);
                }
                if (result.errors.length) {
                    bad = true;
                    status.errors.push(...result.errors);
                    notes.push(result.errors.join("; "));
                }
                list[i] = { ...cell, url: result.url, note: notes.join(" · "), bad };
                status.cells = i + 1;
                if (i % 4 === 3 || i === list.length - 1) setCells([...list]);
                await new Promise((r) => setTimeout(r, 0));
            }
            status.done = true;
        })().catch((error) => {
            status.errors.push(String(error?.stack ?? error));
            status.done = true;
        });
        return () => {
            alive = false;
        };
    }, []);

    const zoomOut = cells.length > 6;
    return (
        <main className="min-h-dvh bg-[#ECEDF0] p-3 text-slate-700">
            <h1 className="mb-2 text-lg font-bold">Katalog 3D · {title} · {cells.length}</h1>
            <div className="flex flex-wrap gap-2">
                {cells.map((cell) => (
                    <figure key={cell.key} className={`overflow-hidden rounded-xl bg-white shadow-sm ${cell.bad ? "ring-2 ring-red-500" : ""}`} style={{ width: cell.req.width / (zoomOut ? 1.6 : 1) }}>
                        {cell.url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- sličica iz WebGL-a (data URL)
                            <img src={cell.url} alt={cell.title} className="block w-full" />
                        ) : (
                            <div className="w-full bg-slate-100" style={{ aspectRatio: `${cell.req.width} / ${cell.req.height}` }} />
                        )}
                        <figcaption className="px-1.5 py-1 text-[10px] leading-tight">
                            <div className="truncate font-semibold">{cell.title}</div>
                            <div className="truncate text-slate-500">{cell.sub}</div>
                            {cell.note && <div className={`truncate ${cell.bad ? "text-red-600" : "text-slate-400"}`}>{cell.note}</div>}
                        </figcaption>
                    </figure>
                ))}
            </div>
        </main>
    );
}
