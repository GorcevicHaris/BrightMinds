// PRIVREMENI probni lik za proveru predmeta (samo stranica /dev/avatar3d-items).
// Dok motor (#1) ne izveze buildHuman/Figure/makeItemContext, ovde se ljudi sastavljaju od
// delova prototipa (kostur, telo, glava, kosa), a životinje su zamene istih mera kao prave
// (uši po vrsti, rog, rep, šape/peraja/kopita) — da se proveri da svaki predmet staje svakome.
// Kad motor stigne: zameniti buildHuman + Figure i obrisati ovaj fajl.

import * as THREE from "three";
import type { Anchors, BodyPart, BodyShape, BoneName, CompanionKind, EarKind, FigureBody, FootKind, HandKind, HeadSurface, ItemBuild, ItemContext, Wear } from "../../contract";
import { companionBuilder, isHumanKind, itemBuilder, shade } from "../../contract";
import { makeItemContext } from "../../engine/figure";
import { buildHuman } from "../../engine/human";
import { HIJAB_COLORS, HUMAN_DEFAULT, NO_HIJAB } from "../../looks";
import { buildBody, torsoPoint } from "../../engine/body";
import { buildHair, hairCrown } from "../../engine/hair";
import { buildHead, headInfo, type HeadInfo } from "../../engine/head";
import { buildHijab, HIJAB_THICKNESS } from "../../engine/hijab";
import { Kit } from "../../engine/kit";
import { fabricMaterial, furMaterial, glossyMaterial, skinMaterial } from "../../engine/materials";
import { bodyShape, createRig, type Rig } from "../../engine/rig";
import { buildSurface, profile, taperedTube, polyPath, smoothstep } from "../../engine/surface";
import type { HairStyle } from "../../catalog";

// ── Zamene životinja (iste kosti i iste vrste sidara kao prave) ───────────────

interface AnimalSpec {
    fur: string;
    belly: string;
    ears: EarKind;
    hands: HandKind;
    feet: FootKind;
    tail: boolean;
    horn?: boolean;
    snout: number;
    /** Krupnoća trupa */
    chub: number;
}

const ANIMALS: Record<string, AnimalSpec> = {
    cat: { fur: "#EE9A4E", belly: "#FFF1DD", ears: "pointy", hands: "paw", feet: "paw", tail: true, snout: 0.02, chub: 1 },
    dog: { fur: "#C88A52", belly: "#F6E6D0", ears: "floppy", hands: "paw", feet: "paw", tail: true, snout: 0.045, chub: 1.05 },
    bunny: { fur: "#F2EEF0", belly: "#FFFFFF", ears: "tall", hands: "paw", feet: "paw", tail: true, snout: 0.015, chub: 1 },
    bear: { fur: "#A8764A", belly: "#E8C9A2", ears: "round", hands: "paw", feet: "paw", tail: false, snout: 0.035, chub: 1.2 },
    fox: { fur: "#F07A32", belly: "#FFF4E8", ears: "pointy", hands: "paw", feet: "paw", tail: true, snout: 0.05, chub: 0.95 },
    lion: { fur: "#E8B04E", belly: "#FFF0CC", ears: "round", hands: "paw", feet: "paw", tail: true, snout: 0.035, chub: 1.1 },
    penguin: { fur: "#2E3442", belly: "#FFFFFF", ears: "none", hands: "flipper", feet: "webbed", tail: false, snout: 0.02, chub: 1.3 },
    unicorn: { fur: "#FFFFFF", belly: "#FFF4FA", ears: "pointy", hands: "hoof", feet: "hoof", tail: true, horn: true, snout: 0.05, chub: 1 },
};

/** Telo životinje: kraće noge, okrugliji trup, krupna glava (stojeći crtani lik) */
function animalShape(kind: CompanionKind, spec: AnimalSpec): BodyShape {
    const c = spec.chub;
    return {
        kind,
        proportion: "animal",
        crotchY: 0.34,
        hipY: 0.385,
        waistY: 0.5,
        chestY: 0.6,
        shoulderY: 0.67,
        neckBaseY: 0.7,
        headBoneY: 0.735,
        head: { w: 0.3, h: 0.28, d: 0.28, up: 0.13, fwd: 0.012, chin: 0.92, cheeks: 1.3 },
        torsoW: profile([
            [0.32, 0.07], [0.35, 0.105 * c], [0.42, 0.122 * c], [0.5, 0.124 * c], [0.58, 0.116 * c], [0.64, 0.11],
            [0.67, 0.108], [0.69, 0.09], [0.705, 0.06], [0.72, 0.046], [0.78, 0.044],
        ]),
        torsoFront: profile([
            [0.32, 0.05], [0.36, 0.078 * c], [0.45, 0.096 * c], [0.52, 0.098 * c], [0.6, 0.084], [0.66, 0.068],
            [0.69, 0.056], [0.71, 0.045], [0.78, 0.042],
        ]),
        torsoBack: profile([
            [0.32, 0.05], [0.37, 0.082 * c], [0.42, 0.084 * c], [0.5, 0.074 * c], [0.6, 0.068], [0.66, 0.064],
            [0.69, 0.056], [0.71, 0.045], [0.78, 0.042],
        ]),
        bust: 0,
        neckR: 0.044,
        shoulderX: 0.1,
        armAngle: 0.2,
        upperArm: 0.13,
        forearm: 0.115,
        armR: profile([[0, 0.04], [0.2, 0.038], [0.5, 0.035], [0.8, 0.033], [1, 0.03]]),
        hand: 1.6,
        hipX: 0.06,
        thigh: 0.17,
        shin: 0.16,
        legR: profile([[0, 0.06], [0.2, 0.057], [0.5, 0.048], [0.8, 0.042], [1, 0.038]]),
        ankleY: 0.055,
        foot: { len: 0.13, w: 0.075, h: 0.058, back: 0.032 },
        height: 0.735 + 0.13 + 0.14,
    };
}

// ── Sidra (iste definicije kao u ugovoru) ─────────────────────────────────────

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function computeAnchors(rig: Rig, head: HeadSurface, info: HeadInfo, opts: { ears: EarKind; earTips?: [THREE.Vector3, THREE.Vector3]; horn?: Anchors["horn"]; hands: HandKind; feet: FootKind; tail?: Anchors["tail"]; snout: number }): Anchors {
    const s = rig.shape;
    const hb = V(0, s.headBoneY, 0);
    const world = (p: THREE.Vector3) => p.clone().add(hb);
    const center = world(head.center);
    const top = world(head.point(0.5, 0));
    const front = world(head.point(0.5, info.eyeV)).z;
    // Obim na visini čela: v = 0,3 (napred) — poluprečnik kao srednje rastojanje od ose
    const vBrim = 0.32;
    let brimR = 0;
    let brimY = 0;
    for (let i = 0; i < 16; i++) {
        const p = head.point(i / 16, vBrim);
        brimR += Math.hypot(p.x - head.center.x, p.z - head.center.z) / 16;
        brimY += (p.y + s.headBoneY) / 16;
    }
    const earL = world(head.point(0.75, 0.55));
    const earR = world(head.point(0.25, 0.55));
    const eyeL = world(head.point(0.5 + info.eyeU, info.eyeV));
    const eyeR = world(head.point(0.5 - info.eyeU, info.eyeV));
    const bridge = world(head.point(0.5, info.eyeV + 0.01));
    const tip = world(head.point(0.5, info.eyeV + 0.08)).add(V(0, 0, opts.snout));
    const shoulderL = rig.left.shoulder.clone();
    const shoulderR = rig.right.shoulder.clone();
    const grip = rig.right.wrist.clone().sub(rig.right.elbow).normalize().multiplyScalar(0.03 * s.hand).add(V(0, 0, 0.006));
    const toe = (ankle: THREE.Vector3) => V(ankle.x, 0.004, ankle.z + s.foot.len - s.foot.back);
    const backZ = -s.torsoBack(s.chestY);
    return {
        ground: V(),
        height: s.height,
        head: { center, top, radius: Math.max(s.head.w, s.head.h, s.head.d) / 2, w: s.head.w, h: s.head.h, d: s.head.d, front, brimY, brimR },
        ears: {
            kind: opts.ears,
            left: earL,
            right: earR,
            tipL: opts.earTips ? opts.earTips[0].clone() : earL.clone(),
            tipR: opts.earTips ? opts.earTips[1].clone() : earR.clone(),
            radius: opts.ears === "human" ? 0.02 : 0.03,
        },
        horn: opts.horn,
        eyes: { left: eyeL, right: eyeR, radius: info.eyeR, front: Math.max(eyeL.z, eyeR.z) },
        nose: { bridge, tip, snout: opts.snout },
        mouth: world(head.point(0.5, info.eyeV + 0.14)).add(V(0, 0, opts.snout * 0.6)),
        neck: { center: V(0, (s.neckBaseY + s.headBoneY) / 2, 0), radius: s.neckR, y0: s.neckBaseY - 0.01, y1: s.headBoneY },
        torso: {
            shoulderY: s.shoulderY,
            chestY: s.chestY,
            waistY: s.waistY,
            hipY: s.hipY,
            crotchY: s.crotchY,
            chest: { w: s.torsoW(s.chestY), front: s.torsoFront(s.chestY), back: s.torsoBack(s.chestY) },
            waist: { w: s.torsoW(s.waistY), front: s.torsoFront(s.waistY), back: s.torsoBack(s.waistY) },
        },
        shoulders: { left: shoulderL, right: shoulderR },
        arms: { upper: s.upperArm, fore: s.forearm, radius: s.armR(0.2), wristRadius: s.armR(1) },
        hips: { left: rig.left.hip.clone(), right: rig.right.hip.clone() },
        legs: { thigh: s.thigh, shin: s.shin, radius: s.legR(0.2), ankleRadius: s.legR(1) },
        hands: { kind: opts.hands, left: rig.left.wrist.clone(), right: rig.right.wrist.clone(), radius: s.armR(1), grip },
        feet: { kind: opts.feet, left: rig.left.ankle.clone(), right: rig.right.ankle.clone(), toeL: toe(rig.left.ankle), toeR: toe(rig.right.ankle), len: s.foot.len, w: s.foot.w, h: s.foot.h },
        back: {
            center: V(0, s.chestY, backZ),
            normal: V(0, 0, -1),
            width: s.torsoW(s.chestY) * 2,
            height: s.shoulderY - s.waistY,
            capeTop: V(0, s.shoulderY + 0.012, -s.torsoBack(s.shoulderY) * 0.6),
        },
        tail: opts.tail,
        petSpot: V(-(s.shoulderX + 0.32), 0, 0.12),
        petScale: s.proportion === "adult" ? 1.2 : 1,
    };
}

/** Površina glave, opciono naduvana za debljinu hidžaba */
function headSurface(info: HeadInfo, inflate: number): HeadSurface {
    const n = new THREE.Vector3();
    return {
        center: info.center.clone(),
        point: (u, v, out = new THREE.Vector3()) => {
            info.point(u, v, out);
            if (inflate) out.addScaledVector(info.normal(u, v, n), inflate);
            return out;
        },
        normal: (u, v, out) => info.normal(u, v, out),
    };
}

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
    hair?: HairStyle;
    skin?: string;
}

const HUMAN_HAIR: Record<string, { style: HairStyle; color: string }> = {
    girl: { style: "long", color: "#5A3824" },
    boy: { style: "short", color: "#2A2224" },
    woman: { style: "bun", color: "#8C4A26" },
    man: { style: "short", color: "#2A2224" },
};

/**
 * Probni lik: ljudi iz motora (buildHuman — prave mere, kosa ispod kape, hidžab), životinje iz
 * animals/ kad ih #2 registruje, a do tada zamena istih vrsta sidara.
 */
export function buildTestFigure(kind: CompanionKind, options: TestFigureOptions): TestFigure {
    if (isHumanKind(kind)) {
        const hijabId = options.hijab ? (HIJAB_COLORS.find((c) => c.hex.toLowerCase() === options.hijab!.toLowerCase())?.id ?? "roze") : NO_HIJAB;
        const look = { ...HUMAN_DEFAULT[kind], hijab: kind === "girl" || kind === "woman" ? hijabId : NO_HIJAB };
        const body = buildHuman(kind, look, { quality: "high" });
        const crown = body.setHeadwear(options.hat);
        return { body, hijab: body.hijab, hairCrown: crown, extra: [] };
    }
    const real = companionBuilder(kind);
    if (real && !(real as { standIn?: boolean }).standIn) {
        const body = real.build({ kind, skin: "" }, { quality: "high" });
        return { body, hijab: null, hairCrown: 0.004, extra: [] };
    }
    return buildStandIn(kind, options);
}

/** Zamena životinje (dok #2 ne registruje pravu) */
function buildStandIn(kind: CompanionKind, options: TestFigureOptions): TestFigure {
    const root = new THREE.Group();
    const human = isHumanKind(kind);
    const spec = human ? null : ANIMALS[kind] ?? ANIMALS.cat;
    const shape = human ? bodyShape(kind) : animalShape(kind, spec!);
    const rig = createRig(shape);
    root.add(rig.root);
    const tone = human ? (options.skin ?? "#E0AC7E") : spec!.fur;
    const skin = human ? skinMaterial(tone) : furMaterial(tone);
    const bodyMeshes = buildBody(rig, skin, { feet: true });
    for (const m of bodyMeshes.skinned) root.add(m);
    const info = headInfo(shape);
    const hair = human ? HUMAN_HAIR[kind] : { style: "buzz" as HairStyle, color: spec!.fur };
    const face = buildHead(info, tone, "#6B4226", shade(hair.color, -0.2), "happy");
    if (!human) {
        // Krzno na licu umesto kože
        face.head.material = furMaterial(tone);
    }
    rig.bone("head").add(face.group);
    const parts: Partial<Record<BodyPart, THREE.Object3D[]>> = {
        feet: bodyMeshes.rigid.filter((m) => m.name === "stopalo"),
        hands: bodyMeshes.rigid.filter((m) => m.name === "saka"),
        ears: [...face.ears],
        head: [face.group],
    };
    const hijab = human && (kind === "girl" || kind === "woman") ? (options.hijab ?? null) : null;
    const extra: THREE.Object3D[] = [];
    if (human && !hijab) {
        const hairObjects = buildHair(rig, info, options.hair ?? hair.style, hair.color, options.hat);
        parts.hair = hairObjects;
    }
    if (hijab) {
        const hk = new Kit({ rig, root });
        buildHijab(hk, info, hijab);
        extra.push(...hk.objects);
        face.ears.forEach((e) => (e.visible = false));
    }
    const inflate = hijab ? HIJAB_THICKNESS : 0;
    const head = headSurface(info, inflate);
    let earTips: [THREE.Vector3, THREE.Vector3] | undefined;
    let earBases: [THREE.Vector3, THREE.Vector3] | undefined;
    let horn: Anchors["horn"];
    let tail: Anchors["tail"];
    const hb = new THREE.Vector3(0, shape.headBoneY, 0);
    if (spec) {
        // Uši životinje (zamenjuju ljudske), njuška, rep, rog
        face.ears.forEach((e) => (e.visible = false));
        const earMat = furMaterial(spec.fur);
        const inner = furMaterial(shade(spec.fur, 0.35));
        const earObjects: THREE.Object3D[] = [];
        const tips: THREE.Vector3[] = [];
        const bases: THREE.Vector3[] = [];
        for (const side of [1, -1]) {
            if (spec.ears === "none") break;
            const u = 0.5 + side * (spec.ears === "floppy" ? 0.24 : spec.ears === "tall" ? 0.06 : 0.12);
            const v = spec.ears === "floppy" ? 0.3 : spec.ears === "tall" ? 0.1 : 0.16;
            const base = info.point(u, v);
            const n = info.normal(u, v);
            const len = spec.ears === "tall" ? 0.17 : spec.ears === "pointy" ? 0.08 : spec.ears === "round" ? 0.045 : 0.11;
            const dir = spec.ears === "floppy" ? new THREE.Vector3(side * 0.5, -1, 0.15).normalize() : n.clone().lerp(new THREE.Vector3(0, 1, 0), 0.5).normalize();
            const tip = base.clone().addScaledVector(dir, len);
            const w = spec.ears === "round" ? 0.04 : spec.ears === "tall" ? 0.03 : 0.036;
            const geo = taperedTube(polyPath([base.clone().addScaledVector(dir, -0.01), base.clone().lerp(tip, 0.5), tip]), (t) => w * (spec.ears === "round" ? Math.sin(Math.PI * (0.25 + t * 0.6)) : 1 - t * 0.75), 16, 12, undefined, 0.45);
            const ear = new THREE.Mesh(geo, earMat);
            rig.bone("head").add(ear);
            const innerEar = new THREE.Mesh(geo.clone().scale(0.75, 0.85, 0.75).translate(base.x * 0.25, base.y * 0.15, base.z * 0.25 + 0.006), inner);
            rig.bone("head").add(innerEar);
            earObjects.push(ear, innerEar);
            tips.push(tip.clone().add(hb));
            bases.push(base.clone().add(hb));
        }
        if (tips.length === 2) {
            earTips = [tips[0], tips[1]];
            earBases = [bases[0], bases[1]];
        }
        parts.ears = earObjects;
        // Njuška
        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), furMaterial(spec.belly));
        const mp = info.point(0.5, info.eyeV + 0.12);
        muzzle.scale.set(0.05, 0.035, 0.03 + spec.snout * 0.6);
        muzzle.position.copy(mp).add(new THREE.Vector3(0, 0, spec.snout * 0.3));
        face.group.add(muzzle);
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), glossyMaterial("#3A2A2A", 0.3, 0.8));
        nose.position.copy(mp).add(new THREE.Vector3(0, 0.012, 0.028 + spec.snout * 0.8));
        face.group.add(nose);
        if (spec.horn) {
            const base = info.point(0.5, 0.12);
            const tipH = base.clone().add(new THREE.Vector3(0, 0.1, 0.035));
            const hornMesh = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.11, 16).translate(0, 0.055, 0).rotateX(0.33), glossyMaterial("#F6D27A", 0.3, 0.6));
            hornMesh.position.copy(base);
            rig.bone("head").add(hornMesh);
            parts.horn = [hornMesh];
            horn = { base: base.clone().add(hb), tip: tipH.add(hb), radius: 0.018 };
        }
        if (spec.tail) {
            const tb = new THREE.Vector3(0, shape.hipY - 0.01, -shape.torsoBack(shape.hipY) + 0.006);
            const dir = new THREE.Vector3(0, 0.45, -1).normalize();
            const tailMesh = new THREE.Mesh(taperedTube(polyPath([tb.clone(), tb.clone().addScaledVector(dir, 0.08).add(new THREE.Vector3(0, 0.03, 0)), tb.clone().addScaledVector(dir, 0.16).add(new THREE.Vector3(0, 0.1, 0))]), (t) => (kind === "bunny" ? 0.035 * Math.sin(Math.PI * (0.2 + t * 0.6)) : 0.022 * (1 - t * 0.4)), 16, 10), furMaterial(spec.fur));
            rig.bone("hips").add(tailMesh);
            tailMesh.position.sub(new THREE.Vector3(0, shape.hipY + 0.02, 0));
            parts.tail = [tailMesh];
            tail = { base: tb, dir };
        }
    }
    const anchors = computeAnchors(rig, head, info, {
        ears: human ? "human" : spec!.ears,
        earTips,
        horn,
        hands: human ? "hand" : spec!.hands,
        feet: human ? "foot" : spec!.feet,
        tail,
        snout: human ? 0 : spec!.snout,
    });
    if (earBases) {
        // Životinja: sidra uha su koren uha na glavi (kapa tu pravi otvor ili ide između)
        anchors.ears.left = earBases[0];
        anchors.ears.right = earBases[1];
    }
    if (inflate) {
        anchors.head.radius += inflate;
        anchors.head.top.y += inflate;
        anchors.head.w += inflate * 2;
        anchors.head.d += inflate * 2;
        anchors.head.h += inflate;
    }
    const body: FigureBody = {
        kind,
        proportion: shape.proportion,
        shape,
        rig,
        anchors,
        head,
        root,
        tone,
        parts,
        face: { setExpression: () => {}, setBlink: (a) => face.setBlink(a), setMouth: () => {} },
        dispose: () => {
            root.traverse((o) => {
                const m = o as THREE.Mesh;
                if (m.isMesh) m.geometry.dispose();
            });
        },
    };
    const crown = hijab ? 0.004 : human ? hairCrown(options.hair ?? hair.style, options.hat) : 0.004;
    return { body, hijab, hairCrown: crown, extra };
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
            n += (g.index ? g.index.count : g.getAttribute("position").count) / 3;
        });
    }
    return Math.round(n);
}

/** Tačka iz prostora tela u lokalne koordinate kosti (za pomoćne funkcije van predmeta) */
export function bodyPoint(body: FigureBody, a: number, y: number, offset: number): THREE.Vector3 {
    return torsoPoint(body.shape, a, y, offset, new THREE.Vector3());
}
