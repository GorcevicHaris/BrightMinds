// Probni lik za proveru predmeta (stranica /dev/avatar3d-items i testovi kataloga): ljudi iz
// motora (buildHuman — prave mere, kosa ispod kape, hidžab), životinje iz animals/ (#2), a
// predmet se oblači kroz makeItemContext kao u motoru (Figure), samo bez osnovne odeće.

import * as THREE from "three";
import type { CompanionKind, FigureBody, ItemBuild, Wear } from "../../contract";
import { companionBuilder, isHumanKind, itemBuilder } from "../../contract";
import { makeItemContext } from "../../engine/figure";
import { buildHuman } from "../../engine/human";
import { HIJAB_COLORS, HUMAN_DEFAULT, NO_HIJAB } from "../../looks";
import "../../animals";

// ── Probni lik ────────────────────────────────────────────────────────────────

export interface TestFigure {
    body: FigureBody;
    hijab: string | null;
    hairCrown: number;
    extra: THREE.Object3D[];
}

export interface TestFigureOptions {
    /** Lik nosi kapu (kosa se spušta) */
    hat: boolean;
    hijab?: string | null;
}

/** Probni lik: čovek iz motora (sa kosom ispod kape ili hidžabom) ili životinja iz animals/ */
export function buildTestFigure(kind: CompanionKind, options: TestFigureOptions): TestFigure {
    if (isHumanKind(kind)) {
        const hijabId = options.hijab ? (HIJAB_COLORS.find((c) => c.hex.toLowerCase() === options.hijab!.toLowerCase())?.id ?? "roze") : NO_HIJAB;
        const look = { ...HUMAN_DEFAULT[kind], hijab: kind === "girl" || kind === "woman" ? hijabId : NO_HIJAB };
        const body = buildHuman(kind, look, { quality: "high" });
        const crown = body.setHeadwear(options.hat);
        return { body, hijab: body.hijab, hairCrown: crown, extra: [] };
    }
    const real = companionBuilder(kind);
    if (!real) throw new Error(`Nema 3D drugara: ${kind}`);
    const body = real.build({ kind, skin: "" }, { quality: "high" });
    // Kao motor: griva na temenu (lav) se ne crta ispod kape, kapa sedi na glavi
    if (options.hat) for (const o of body.parts.hair ?? []) o.visible = false;
    return { body, hijab: null, hairCrown: 0, extra: [] };
}

// ── Oblačenje predmeta ────────────────────────────────────────────────────────

export interface Worn {
    objects: THREE.Object3D[];
    hidden: THREE.Object3D[];
    animate?: (time: number, dt: number, live: boolean) => void;
}

/** Oblači jedan predmet (kao motor): kroj, kruti delovi, sakrivanje delova tela */
export function wearItem(figure: TestFigure, id: string, wear: Wear, quality: "high" | "low" = "high"): Worn | null {
    const entry = itemBuilder(id);
    if (!entry) return null;
    const { builder } = entry;
    const { body } = figure;
    if (figure.hijab && builder.withHijab === "hide") return { objects: [], hidden: [] };
    const { ctx, objects: made } = makeItemContext(body, wear, { hairCrown: figure.hairCrown, quality, hijab: figure.hijab });
    body.root.updateMatrixWorld(true);
    const result: ItemBuild = builder.build(ctx);
    const objects = [...made];
    let animate: Worn["animate"];
    if (result) {
        if (result instanceof THREE.Object3D) {
            body.root.add(result);
            objects.push(result);
        } else {
            if (result.object) {
                body.root.add(result.object);
                objects.push(result.object);
            }
            animate = result.animate;
        }
    }
    const hidden: THREE.Object3D[] = [];
    for (const part of builder.covers ?? []) {
        for (const o of body.parts[part] ?? []) {
            if (o.visible) {
                o.visible = false;
                hidden.push(o);
            }
        }
    }
    return { objects, hidden, animate };
}

export function takeOff(worn: Worn) {
    for (const o of worn.objects) {
        o.removeFromParent();
        o.traverse((x) => {
            const m = x as THREE.Mesh;
            if (m.isMesh) m.geometry.dispose();
        });
    }
    for (const o of worn.hidden) o.visible = true;
}

/** Broj trouglova u objektima (budžet) */
export function triangles(objects: THREE.Object3D[]): number {
    let n = 0;
    for (const o of objects) {
        o.traverse((x) => {
            const m = x as THREE.Mesh;
            if (!m.isMesh) return;
            const g = m.geometry;
            const inst = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1;
            n += ((g.index ? g.index.count : g.getAttribute("position").count) / 3) * inst;
        });
    }
    return Math.round(n);
}
