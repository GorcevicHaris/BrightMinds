// Telo lika: trup sa vratom, ruke, noge (SkinnedMesh na zajedničkom kosturu), šake i
// stopala (kruto na kostima šake i stopala). Iste funkcije površina koristi i odeća —
// samo sa pomakom napolje — pa odeća uvek prati telo i pomera se sa njim.

import * as THREE from "three";
import { detail } from "./detail";
import { armWeights, legWeights, torsoWeights, type BodyShape, type Rig } from "./rig";
import { buildSurface, merge, polyPath, smoothstep, superEllipse, sweepFn, type SurfaceFn, type SweepSpec } from "./surface";

const gauss = (x: number, mu: number, sigma: number) => Math.exp(-((x - mu) * (x - mu)) / (2 * sigma * sigma));

// ── Trup ──────────────────────────────────────────────────────────────────────

export const TORSO_BOTTOM_CAP = 0.032;

export function torsoBottom(shape: BodyShape): number {
    return shape.crotchY - 0.018;
}

export function torsoTop(shape: BodyShape): number {
    return shape.headBoneY + 0.035;
}

/**
 * Ugao a (kao u torsoPoint) čija tačka na trupu leži u pravcu `phi` od ose tela (presek je
 * superelipsa, pa a i pravac nisu isti). Grudi i zaobljeno dno se zanemaruju (mala razlika).
 */
export function torsoAngle(shape: BodyShape, phi: number, y: number, offset: number): number {
    const e = 2 + 0.7 * gauss(y, shape.shoulderY - 0.02, 0.06) + 0.25 * gauss(y, shape.hipY, 0.05);
    const w = shape.torsoW(y) + offset;
    const d = (Math.cos(phi) >= 0 ? shape.torsoFront(y) : shape.torsoBack(y)) + offset;
    // tan φ = (w/d)·(|tan a|)^(2/e) → |tan a| = (|tan φ|·d/w)^(e/2)
    const s = Math.abs(Math.sin(phi));
    const c = Math.abs(Math.cos(phi));
    const a = Math.atan2(Math.pow(s * d, e / 2), Math.pow(c * w, e / 2));
    const front = Math.cos(phi) >= 0;
    const base = front ? a : Math.PI - a;
    return Math.sin(phi) >= 0 ? base : -base;
}

/** Dodatak poluprečniku trupa (odeća: širi kroj, nabori) */
export type TorsoExtra = (a: number, y: number) => number;

/**
 * Tačka na trupu za ugao a (0 = napred, π/2 = levo od lika) i visinu y, pomerena za
 * `offset` napolje. Presek je superelipsa (oblija na ramenima), napred i pozadi različite dubine.
 */
export function torsoPoint(shape: BodyShape, a: number, y: number, offset: number, out: THREE.Vector3, extra?: TorsoExtra): THREE.Vector3 {
    const y0 = torsoBottom(shape);
    let w = shape.torsoW(y);
    let front = shape.torsoFront(y);
    let back = shape.torsoBack(y);
    // Zaobljeno dno trupa (međunožje je unutar nogu)
    if (y < y0 + TORSO_BOTTOM_CAP) {
        const t = (y0 + TORSO_BOTTOM_CAP - y) / TORSO_BOTTOM_CAP;
        const k = Math.sqrt(Math.max(0, 1 - t * t));
        w *= k;
        front *= k;
        back *= k;
    }
    // Ramena su „kockastija”, struk i vrat okrugli
    const e = 2 + 0.7 * gauss(y, shape.shoulderY - 0.02, 0.06) + 0.25 * gauss(y, shape.hipY, 0.05);
    const ca = Math.cos(a);
    let d = ca >= 0 ? front : back;
    // Grudi odrasle žene: blago ispupčenje napred
    if (shape.bust > 0 && ca > 0) {
        const sa = Math.sin(a);
        d += shape.bust * 0.03 * gauss(y, shape.chestY + 0.015, 0.05) * Math.pow(ca, 1.5) * (0.55 + 0.45 * Math.cos(Math.abs(sa) * 2.2 - 1.1));
    }
    const grow = offset + (extra ? extra(a, y) : 0);
    const [x, z] = superEllipse(a, w + grow, d + grow, e);
    return out.set(x, y, z);
}

/** Površina trupa: u = ugao oko, v = visina od y0 do y1 (granice mogu zavisiti od ugla) */
export function torsoSurface(shape: BodyShape, y0: number | ((a: number) => number), y1: number | ((a: number) => number), offset: number, extra?: TorsoExtra): SurfaceFn {
    return (u, v, out) => {
        const a = u * Math.PI * 2;
        const lo = typeof y0 === "number" ? y0 : y0(a);
        const hi = typeof y1 === "number" ? y1 : y1(a);
        return torsoPoint(shape, a, lo + (hi - lo) * v, offset, out, extra);
    };
}

// ── Ruke i noge ───────────────────────────────────────────────────────────────

export interface LimbPath {
    spec: SweepSpec;
    /** Parametar s za udeo t duž uda (0 = rame/kuk, 1 = šaka/članak) */
    sAt: (t: number) => number;
    /** Udeo t za parametar s */
    tAt: (s: number) => number;
}

export type LimbExtra = (t: number, a: number) => number;

const ARM_CAP = 0.032;
const LEG_CAP = 0.05;

/** Ruka kao presek prevučen od vrha ramena do zgloba šake */
export function armPath(rig: Rig, side: 1 | -1, offset: number, extra?: LimbExtra): LimbPath {
    const shape = rig.shape;
    const j = side === 1 ? rig.left : rig.right;
    const axis = new THREE.Vector3().subVectors(j.elbow, j.shoulder).normalize();
    const axis2 = new THREE.Vector3().subVectors(j.wrist, j.elbow).normalize();
    const top = j.shoulder.clone().addScaledVector(axis, -ARM_CAP);
    const end = j.wrist.clone().addScaledVector(axis2, 0.012);
    const mid1 = j.shoulder.clone().lerp(j.elbow, 0.5);
    const mid2 = j.elbow.clone().lerp(j.wrist, 0.5);
    const path = polyPath([top, j.shoulder, mid1, j.elbow, mid2, j.wrist, end]);
    const total = ARM_CAP + shape.upperArm + shape.forearm + 0.012;
    const sCap = ARM_CAP / total;
    const sLimb = (shape.upperArm + shape.forearm) / total;
    const tAt = (s: number) => (s - sCap) / sLimb;
    const sAt = (t: number) => sCap + t * sLimb;
    const spec: SweepSpec = {
        path,
        sideSign: side,
        section: (s, a) => {
            const t = tAt(s);
            let r = shape.armR(Math.max(0, Math.min(1, t)));
            if (s < sCap) r *= Math.sqrt(Math.max(0, 1 - Math.pow((sCap - s) / sCap, 2)));
            const grow = s < sCap ? offset * Math.sqrt(Math.max(0, 1 - Math.pow((sCap - s) / sCap, 2))) : offset;
            const rr = r + grow + (extra ? extra(t, a) : 0);
            // Podlaktica malo šira nego dublja; nadlaktica okrugla
            const flat = 1 - 0.08 * smoothstep(0.4, 0.7, t);
            return [Math.sin(a) * rr, Math.cos(a) * rr * flat];
        },
    };
    return { spec, sAt, tAt };
}

/** Noga od kuka (vrh je u karlici) do članka (kraj je u stopalu) */
export function legPath(rig: Rig, side: 1 | -1, offset: number, extra?: LimbExtra): LimbPath {
    const shape = rig.shape;
    const j = side === 1 ? rig.left : rig.right;
    const top = j.hip.clone().add(new THREE.Vector3(0, LEG_CAP, 0));
    const end = j.ankle.clone().add(new THREE.Vector3(0, -0.018, 0));
    const path = polyPath([top, j.hip, j.hip.clone().lerp(j.knee, 0.5), j.knee, j.knee.clone().lerp(j.ankle, 0.5), j.ankle, end]);
    const total = LEG_CAP + shape.thigh + (j.knee.y - j.ankle.y) + 0.018;
    const sCap = LEG_CAP / total;
    const sLimb = (shape.thigh + (j.knee.y - j.ankle.y)) / total;
    const tAt = (s: number) => (s - sCap) / sLimb;
    const sAt = (t: number) => sCap + t * sLimb;
    const spec: SweepSpec = {
        path,
        sideSign: side,
        section: (s, a) => {
            const t = tAt(s);
            let r = shape.legR(Math.max(0, Math.min(1, t)));
            const cap = s < sCap ? Math.sqrt(Math.max(0, 1 - Math.pow((sCap - s) / sCap, 2))) : 1;
            r *= cap;
            const rr = r + offset * cap + (extra ? extra(t, a) : 0);
            const ca = Math.cos(a);
            // List pozadi, koleno napred, butina blago spljoštena iznutra
            const calf = 1 + 0.14 * gauss(t, 0.66, 0.1);
            const knee = 1 + 0.05 * gauss(t, 0.5, 0.04);
            const d = ca >= 0 ? rr * knee : rr * calf;
            const inner = Math.sin(a) < 0 ? 1 - 0.1 * gauss(t, 0.15, 0.15) : 1;
            return [Math.sin(a) * rr * inner, ca * d];
        },
    };
    return { spec, sAt, tAt };
}

/** Površina uda između t0 i t1 (deo rukava ili nogavice) */
export function limbSurface(limb: LimbPath, t0: number, t1: number): SurfaceFn {
    const fn = sweepFn(limb.spec);
    const s0 = t0 <= 0 ? 0 : limb.sAt(t0);
    const s1 = t1 >= 1 ? 1 : limb.sAt(t1);
    return (u, v, out) => fn(u, s0 + (s1 - s0) * v, out);
}

// ── Šaka i stopalo ────────────────────────────────────────────────────────────

/** Šaka u koordinatama kosti šake (−y niz šaku, dlan ka telu) */
export function handGeometry(rig: Rig, side: 1 | -1): THREE.BufferGeometry {
    const k = 0.95 * rig.shape.hand;
    const parts: THREE.BufferGeometry[] = [];
    // Dlan: mekan, spljošten
    const palm = new THREE.SphereGeometry(1, 22, 16);
    palm.scale(0.0115 * k, 0.025 * k, 0.021 * k);
    palm.translate(-0.001 * side * k, -0.023 * k, 0.001 * k);
    parts.push(palm);
    // Prsti: vitki, jedan uz drugi, blago razmaknuti i savijeni ka dlanu (dva članka)
    const fingers: [number, number, number, number][] = [
        // z (od palca), dužina, poluprečnik, raširenost
        [0.0112, 0.018, 0.0052, 0.1], [0.0038, 0.021, 0.0055, 0.03], [-0.0038, 0.02, 0.0054, -0.04], [-0.011, 0.016, 0.0049, -0.11],
    ];
    for (const [z, len, r, spread] of fingers) {
        // Prvi članak pravo, drugi savijen ka dlanu
        const a1 = len * 0.55;
        const a2 = len * 0.45;
        const first = new THREE.CapsuleGeometry(r * k, a1 * k, 4, 10);
        first.translate(0, -a1 * k * 0.5, 0);
        const second = new THREE.CapsuleGeometry(r * 0.92 * k, a2 * k, 4, 10);
        second.translate(0, -a2 * k * 0.5, 0);
        second.rotateZ(0.2 * side);
        second.translate(0, -a1 * k, 0);
        for (const g of [first, second]) {
            g.rotateX(spread);
            g.rotateZ(0.08 * side);
            g.translate(-0.0012 * side * k, -0.042 * k, z * k);
            parts.push(g);
        }
    }
    const thumb = new THREE.CapsuleGeometry(0.0062 * k, 0.017 * k, 4, 10);
    thumb.translate(0, -0.009 * k, 0);
    thumb.rotateX(-0.55);
    thumb.rotateZ(0.38 * side);
    thumb.translate(-0.005 * side * k, -0.017 * k, 0.0155 * k);
    parts.push(thumb);
    // Zglob: kratak valjak koji ulazi u podlakticu
    // Zglob je malo uži od podlaktice (bez vidljivog šava na spoju)
    const wristR = rig.shape.armR(1) * 0.86;
    const wrist = new THREE.CylinderGeometry(wristR, wristR * 0.95, 0.026 * k, 18);
    wrist.translate(0, 0.004, 0);
    parts.push(wrist);
    for (const g of parts) g.deleteAttribute("uv");
    const geometry = merge(parts);
    // Šaka prati smer podlaktice
    const j = side === 1 ? rig.left : rig.right;
    const dir = new THREE.Vector3().subVectors(j.wrist, j.elbow).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    // Dlan blago okrenut unazad (prirodno opuštena ruka)
    const twist = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.35 * side);
    geometry.applyQuaternion(twist.premultiply(q));
    return geometry;
}

/** Stopalo (bosa noga ili kalup za obuću) u koordinatama kosti stopala; pod je na y = −ankleY */
export function footFn(shape: BodyShape, offset = 0, lift = 0): SurfaceFn {
    const { len, w, h, back } = shape.foot;
    const floorY = -shape.ankleY;
    const zc = len / 2 - back;
    return (u, v, out) => {
        const th = u * Math.PI * 2;
        const ph = v * Math.PI;
        const dx = Math.sin(th) * Math.sin(ph);
        const dy = Math.cos(ph);
        const dz = Math.cos(th) * Math.sin(ph);
        // Prsti su širi od pete, rist je visok kod članka
        const width = (w / 2) * (0.82 + 0.2 * gauss(dz, 0.45, 0.45)) + offset;
        const hz = (h + lift) * (1 - 0.5 * smoothstep(-0.3, 1, dz)) + offset;
        const base = 0.012;
        const y = floorY + base + (dy >= 0 ? dy * (hz - base) : dy * (base + Math.min(offset, 0.004)));
        return out.set(dx * width, y, zc + dz * (len / 2 + offset));
    };
}

// ── Sastavljanje tela ─────────────────────────────────────────────────────────

export interface BodyMeshes {
    skinned: THREE.SkinnedMesh[];
    rigid: THREE.Mesh[];
}

/** Pravi telo: trup, ruke, noge (SkinnedMesh) i šake/stopala (deca kostiju) */
/** Meka senka na vratu ispod brade (boje temena trupa, množe boju kože) */
function neckShade(geometry: THREE.BufferGeometry, shape: BodyShape) {
    const position = geometry.getAttribute("position");
    const colors = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) {
        const y = position.getY(i);
        const z = position.getZ(i);
        const r = Math.max(1e-4, Math.hypot(position.getX(i), z));
        const under = smoothstep(shape.neckBaseY - 0.02, shape.headBoneY - 0.005, y) * (0.45 + 0.55 * Math.max(0, z / r));
        const k = 1 - 0.3 * under;
        colors.set([k, k * 0.97, k * 0.96], i * 3);
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

export function buildBody(rig: Rig, skin: THREE.Material, options: { feet: boolean; torsoSkin?: THREE.Material }): BodyMeshes {
    const shape = rig.shape;
    const skinned: THREE.SkinnedMesh[] = [];
    const rigid: THREE.Mesh[] = [];
    const add = (geometry: THREE.BufferGeometry, name: string, material = skin) => {
        const mesh = new THREE.SkinnedMesh(geometry, material);
        mesh.name = name;
        skinned.push(mesh);
    };

    // Vrat čoveka se završava odmah iznad kosti glave (ne probija kroz donju stranu brade)
    const top = shape.headBoneY + 0.014;
    const torso = buildSurface(torsoSurface(shape, torsoBottom(shape), top, 0), {
        nu: detail(56),
        nv: detail(72),
        closedU: true,
        inside: (_u, v, out) => out.set(0, torsoBottom(shape) + (top - torsoBottom(shape)) * v, 0),
        weights: (_u, _v, p) => torsoWeights(shape, p),
    });
    if (options.torsoSkin) neckShade(torso, shape);
    add(torso, "trup", options.torsoSkin ?? skin);

    for (const side of [1, -1] as const) {
        const arm = armPath(rig, side, 0);
        add(buildSurface(sweepFn(arm.spec), {
            nu: detail(28),
            nv: detail(44),
            closedU: true,
            inside: (_u, v, out) => arm.spec.path(v, out),
            weights: (_u, _v, p) => armWeights(rig, side, p),
        }), side === 1 ? "leva-ruka" : "desna-ruka");
        const leg = legPath(rig, side, 0);
        add(buildSurface(sweepFn(leg.spec), {
            nu: detail(32),
            nv: detail(48),
            closedU: true,
            inside: (_u, v, out) => leg.spec.path(v, out),
            weights: (_u, _v, p) => legWeights(rig, side, p),
        }), side === 1 ? "leva-noga" : "desna-noga");

        const hand = new THREE.Mesh(handGeometry(rig, side), skin);
        hand.name = "saka";
        rig.bone(side === 1 ? "handL" : "handR").add(hand);
        rigid.push(hand);

        if (options.feet) {
            const foot = new THREE.Mesh(buildSurface(footFn(shape), { nu: 32, nv: 20, closedU: true }), skin);
            foot.name = "stopalo";
            rig.bone(side === 1 ? "footL" : "footR").add(foot);
            rigid.push(foot);
        }
    }

    for (const mesh of skinned) {
        // Jedinična matrica: bind() bez nje bi preračunao kosti iz TRENUTNE poze
        mesh.bind(rig.skeleton, new THREE.Matrix4());
        mesh.frustumCulled = false;
    }
    return { skinned, rigid };
}
