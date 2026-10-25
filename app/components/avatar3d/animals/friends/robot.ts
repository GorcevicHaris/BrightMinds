// Robotić (igračka od sjajne meke plastike): zaobljena glava sa ekranom umesto lica — oči,
// obrve, usta i obrazi „svetle” na tamnom ekranu (kapci su deo ekrana, pa i treptaj izgleda
// kao na ekranu), okrugli zavrtnji sa strane glave, antena sa lampicom (kapa joj pravi otvor
// kao rogu), ploča na grudima sa tri dugmeta u boji, zglobovi u prstenovima na laktovima i
// kolenima, okrugle šake-rukavice i čizmice. Bez repa i bez ušiju.

import * as THREE from "three";
import { registerCompanion } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import { paintGeometry, type PaintContext, type PaintPoint } from "../paint";
import { pawHand } from "../parts";
import { addHorns, asFriend, boxUv, headMarks, type HeadMark, clamp01, coat, col, glowMaterial, headLocal, isHead, plasticMaterial, smoothstep } from "./common";
import { FRIEND_SKINS } from "./skins.data";

/** fur = kućište; light = ploča na grudima i okvir ekrana; marks = [ekran, svetlo ekrana]; paws = šake, stopala, zglobovi */
function robot(body: string, light: string, joints: string, extra: Partial<Coat> = {}): Coat {
    return coat(body, light, {
        muzzle: body,
        inner: light,
        nose: "#2A3448",
        brow: "#8FF3FF",
        iris: ["#C8FBFF", "#22B8D8"],
        mouth: "#8FF3FF",
        marks: ["#26324A", "#8FF3FF"],
        paws: joints,
        horn: joints,
        ...extra,
    });
}

export const ROBOT_COATS: Record<string, Coat> = {
    plavi: robot("#5B9BE8", "#E8F2FF", "#C6D0DE"),
    narandzasti: robot("#F29A44", "#FFF1E0", "#CBD2DC"),
    beli: robot("#F2F4F8", "#FFFFFF", "#9EB6D2", { iris: ["#D8F7FF", "#3A9BE0"], brow: "#7FD8FF", mouth: "#7FD8FF", marks: ["#2A3A58", "#7FD8FF"] }),
    zlatni: robot("#E8BE4E", "#FFF4CC", "#F2DDA0", { shimmer: true, iris: ["#FFF2B0", "#E8A020"], brow: "#FFE07A", mouth: "#FFE07A", marks: ["#3A2E1E", "#FFE07A"] }),
};

/** Dugmići na grudima (crveno, žuto, zeleno) */
const BUTTONS = ["#FF6B7A", "#FFD24A", "#6ED68A"];

/** Ekran na licu ispod oštre šare (kapci i prelazi su iste boje): maska 0–1, zaobljen pravougaonik spreda */
function screenMask(q: THREE.Vector3): number {
    if (q.z < 0) return 0;
    // Malo manji od ekrana-šare (addScreen), pa se meka ivica boja ne vidi oko oštre ivice
    const x = q.x / 0.68;
    const y = (q.y + 0.04) / 0.53;
    const d = Math.pow(Math.pow(Math.abs(x), 4) + Math.pow(Math.abs(y), 4), 0.25);
    const front = smoothstep(0.15, 0.35, q.z);
    return (1 - smoothstep(0.94, 1.0, d)) * front;
}

function paintRobot(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    const [screenHex] = c.marks ?? ["#26324A"];
    const light = col(c.light);
    const joints = col(c.paws ?? c.light);
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        const screen = screenMask(q);
        out.lerp(col(screenHex), screen);
        // Šav oko glave (dve polovine kućišta)
        if (!screen) out.multiplyScalar(1 - 0.12 * (1 - smoothstep(0.004, 0.012, Math.abs(q.y + 0.62))) * (q.z < 0.5 ? 1 : 0));
        return;
    }
    switch (pp.region) {
        case "torso": {
            // Ploča na grudima (zaobljen pravougaonik spreda) sa tri dugmeta
            const a = Math.atan2(p.x / Math.max(0.01, shape.torsoW(p.y)), p.z / Math.max(0.01, shape.torsoFront(p.y)));
            const y0 = shape.waistY - 0.01;
            const y1 = shape.shoulderY - 0.02;
            const yy = ((p.y - (y0 + y1) / 2) / ((y1 - y0) / 2));
            const d = Math.pow(Math.pow(Math.abs(a / 0.62), 4) + Math.pow(Math.abs(yy), 4), 0.25);
            const panel = (1 - smoothstep(0.92, 1, d)) * (p.z > 0 ? 1 : 0);
            out.lerp(light, panel);
            out.multiplyScalar(1 - 0.18 * smoothstep(0.9, 0.98, d) * (1 - smoothstep(1.02, 1.1, d)) * (p.z > 0 ? 1 : 0));
            const by = shape.chestY + 0.01;
            BUTTONS.forEach((hex, i) => {
                const bx = (i - 1) * 0.042;
                const r = Math.hypot(p.x - bx, p.y - by);
                const on = (1 - smoothstep(0.015, 0.019, r)) * panel;
                out.lerp(col(hex), on);
            });
            // Šav na struku i leđna ploča
            out.multiplyScalar(1 - 0.14 * (1 - smoothstep(0.003, 0.009, Math.abs(p.y - (shape.waistY - 0.03)))));
            if (p.z < 0) {
                const back = (1 - smoothstep(0.85, 0.95, Math.pow(Math.pow(Math.abs(p.x / 0.06), 4) + Math.pow(Math.abs((p.y - shape.chestY) / 0.06), 4), 0.25)));
                out.lerp(light, back * 0.6);
            }
            return;
        }
        case "arm":
        case "leg": {
            // Zglobovi: prstenovi na ramenu/kuku, laktu/kolenu i pri šaci/stopalu
            const t = pp.t ?? 0;
            const ring = (at: number, w: number) => 1 - smoothstep(w * 0.7, w, Math.abs(t - at));
            const j = Math.max(ring(0.5, 0.075), ring(0.97, 0.06), pp.region === "arm" ? ring(0.02, 0.05) : 0);
            out.lerp(joints, j);
            out.multiplyScalar(1 - 0.12 * clamp01(Math.max(ring(0.425, 0.02), ring(0.575, 0.02))));
            return;
        }
        case "hand":
        case "foot":
            out.copy(joints);
            if (pp.region === "foot") {
                // Đon čizmice (tamnija traka pri podu)
                out.multiplyScalar(1 - 0.22 * (1 - smoothstep(0.012, 0.02, p.y)));
            }
            return;
    }
}

/** Zavrtnji sa strane glave (umesto ušiju) i lampica na anteni */
function addBolts(b: AnimalBuild) {
    const head = b.head;
    const hi = b.quality === "high";
    const k = b.k;
    const c = b.coat;
    const v = head.spec.eye.v + 0.03;
    for (const side of [1, -1] as const) {
        const u = 0.5 + side * 0.25;
        const at = head.point(u, v);
        const n = head.normal(u, v);
        const parts: THREE.BufferGeometry[] = [];
        const disk = new THREE.CylinderGeometry(0.036 * k, 0.04 * k, 0.022 * k, hi ? 32 : 16, 1);
        disk.translate(0, 0.006 * k, 0);
        const knob = new THREE.CylinderGeometry(0.016 * k, 0.02 * k, 0.03 * k, hi ? 20 : 10, 1);
        knob.translate(0, 0.024 * k, 0);
        const cap = new THREE.SphereGeometry(0.016 * k, hi ? 16 : 8, hi ? 10 : 6, 0, Math.PI * 2, 0, Math.PI / 2);
        cap.translate(0, 0.039 * k, 0);
        for (const g of [disk, knob, cap]) {
            g.deleteAttribute("uv");
            parts.push(g.index ? g.toNonIndexed() : g);
        }
        let count = 0;
        for (const g of parts) count += g.getAttribute("position").count;
        const pos = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        let o = 0;
        const cc = new THREE.Color();
        parts.forEach((g, i) => {
            const pa = g.getAttribute("position").array as Float32Array;
            pos.set(pa, o * 3);
            cc.copy(col(i === 0 ? c.light : (c.paws ?? c.light))).multiplyScalar(i === 0 ? 0.96 : 1);
            for (let j = 0; j < g.getAttribute("position").count; j++) colors.set([cc.r, cc.g, cc.b], (o + j) * 3);
            o += g.getAttribute("position").count;
        });
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        g.computeVertexNormals();
        boxUv(g);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n));
        g.translate(at.x - n.x * 0.006 * k, at.y - n.y * 0.006 * k, at.z - n.z * 0.006 * k);
        const mesh = new THREE.Mesh(g, b.fur);
        mesh.name = "zavrtanj";
        b.headGroup.add(mesh);
        b.part("head", mesh);
    }
}

/**
 * Ekran kao oštra šara preko glave (headMarks: ivica ekrana je ivica geometrije, pa je oštra i
 * izbliza): svetao okvir, tamno staklo i dva roze obraza na ekranu. Boja ispod je ista (paint).
 */
function addScreen(b: AnimalBuild) {
    const head = b.head;
    const R = head.radii;
    const c = b.coat;
    const [screenHex] = c.marks ?? ["#26324A"];
    const onFace = (x: number, y: number) => {
        const [u, v] = head.uvOf(new THREE.Vector3(x * R.x, y * R.y, R.z));
        return head.point(u, v);
    };
    const rounded = (a: number, h: number) => (theta: number) => {
        const cs = Math.abs(Math.cos(theta)) / a;
        const sn = Math.abs(Math.sin(theta)) / h;
        return 1 / Math.pow(Math.pow(cs, 4) + Math.pow(sn, 4), 0.25);
    };
    const center = onFace(0, -0.04);
    const wide = R.x * 0.74;
    const tall = R.y * 0.6;
    const rim = rounded(wide * 1.07, tall * 1.1);
    const glass = rounded(wide, tall);
    const frame = headMarks(b, [{ center, side: 1, radius: rim, color: col(c.light) }], 0.0008);
    frame.name = "okvir-ekrana";
    b.headGroup.add(frame);
    b.part("head", frame);
    const screen: HeadMark[] = [{ center, side: 1, radius: glass, color: col(screenHex) }];
    // Obrazi na ekranu (ispod očiju)
    for (const [i, side] of ([1, -1] as const).entries()) {
        const e = b.paint.eyes[i].clone().sub(b.boneAt("head"));
        const at = new THREE.Vector3(e.x * 1.3, e.y - 0.065 * b.k, e.z);
        const [u, v] = head.uvOf(at.sub(head.center));
        screen.push({ center: head.point(u, v), side, radius: (t) => 1 / Math.hypot(Math.cos(t) / (0.02 * b.k), Math.sin(t) / (0.012 * b.k)), color: col("#E56A9E") });
    }
    const mesh = headMarks(b, screen, 0.0014);
    mesh.name = "ekran";
    b.headGroup.add(mesh);
    b.part("head", mesh);
}

function addAntenna(b: AnimalBuild) {
    const k = b.k;
    const { tips } = addHorns(b, { u: 0.5, v: 0.02, single: true, points: [[0, 0, 0], [0, 0.04, -0.004], [0, 0.075, -0.012]], r0: 0.011, r1: 0.008, color: b.coat.horn ?? "#C6D0DE" });
    // Lampica: svetleća kuglica na vrhu (deo antene — kapa „rog jednoroga” je sakriva zajedno)
    const tip = tips[0];
    const g = new THREE.SphereGeometry(0.028 * k, b.quality === "high" ? 24 : 12, b.quality === "high" ? 16 : 9);
    g.deleteAttribute("uv");
    const pos = g.getAttribute("position");
    const arr = new Float32Array(pos.count * 3);
    const base = col("#FF5A6E");
    const cc = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
        cc.copy(base).lerp(col("#FFFFFF"), smoothstep(0.4, 1, pos.getY(i) / (0.028 * k)) * 0.45);
        arr.set([cc.r, cc.g, cc.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    g.translate(tip.x, tip.y + 0.016 * k, tip.z);
    const lamp = new THREE.Mesh(g, glowMaterial());
    lamp.name = "lampica";
    b.headGroup.add(lamp);
    b.part("horn", lamp);
    // Lampica blago „diše” (sporo, mirno)
    b.onAnimate((time, _dt, live) => {
        lamp.scale.setScalar(live ? 1 + 0.04 * Math.sin(time * 2.1) : 1);
    });
}

export const ROBOT: AnimalSpec = {
    kind: "robot",
    skins: FRIEND_SKINS.robot,
    coats: ROBOT_COATS,
    shape: { kind: asFriend("robot"), girth: 1.08, belly: 1.0, pear: 0.05, limb: 1.02, legK: 0.9, head: { w: 0.42, h: 0.36, d: 0.37 } },
    ref: 0.42,
    head: {
        flat: 0.34,
        flatTop: 0.3,
        chin: 0,
        blobs: [
            // Kućište glave: šire dole, ravan ekran spreda
            { c: [0, -0.02, 0.0], r: [0.215, 0.17, 0.18], k: 0.05 },
        ],
        eye: { u: 0.085, v: 0.46, r: 0.056, inset: 0.62, yaw: 0.12 },
        noseV: 0.56,
        mouthV: 0.64,
    },
    face: {
        eye: { upper: 0.9, lower: -0.9, lashes: 0, iris: 1.5, pupil: 0.44 },
        brow: { dv: 0.105, len: 0.052, thick: 0.0085 },
        nose: { kind: "none", w: 0.01, h: 0.01, d: 0.01 },
        mouth: { w: 0.058, h: 0.045, curve: "smile", teeth: "none", wrap: 0.2, philtrum: 0, line: 0.0042, lift: 0.0028 },
    },
    hands: "paw",
    feet: "paw",
    belly: 0,
    cheeks: 0,
    sleek: true,
    ruff: 0,
    material: plasticMaterial,
    // Okrugla rukavica bez jastučića (plastika nema „pasulje” na dlanu)
    customHand: (b, side) => {
        const h = pawHand(b.rig, side, b.shape.armR(1) * 1.34, b.quality, { pads: false });
        const at = b.boneAt(side === 1 ? "handL" : "handR");
        paintGeometry(h.fur, b.paint, (_i, p) => ({ p: p.clone().add(at), region: "hand", side, t: 1 }));
        return { objects: [new THREE.Mesh(h.fur, b.fur)], grip: h.grip, radius: h.radius };
    },
    extras: (b) => {
        addScreen(b);
        addBolts(b);
        addAntenna(b);
    },
    paint: paintRobot,
};

registerCompanion(companionFrom(ROBOT));
