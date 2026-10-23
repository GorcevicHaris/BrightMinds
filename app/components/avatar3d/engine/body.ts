// Telo lika: trup sa vratom, ruke, noge (SkinnedMesh na zajedničkom kosturu), šake i
// stopala (kruto na kostima šake i stopala). Iste funkcije površina koristi i odeća —
// samo sa pomakom napolje — pa odeća uvek prati telo i pomera se sa njim.

import * as THREE from "three";
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
    // Dlan: mekan, malo spljošten (dečja šaka)
    const palm = new THREE.SphereGeometry(1, 22, 16);
    palm.scale(0.0118 * k, 0.0255 * k, 0.0205 * k);
    palm.translate(-0.001 * side * k, -0.023 * k, 0.001 * k);
    parts.push(palm);
    // Prsti: kratki, punački, jedan uz drugi, blago savijeni ka dlanu
    const fingers: [number, number, number][] = [
        [0.0118, 0.016, 0.0058], [0.004, 0.0185, 0.006], [-0.004, 0.018, 0.0059], [-0.0115, 0.0145, 0.0054],
    ];
    for (const [z, len, r] of fingers) {
        const finger = new THREE.CapsuleGeometry(r * k, len * k, 4, 10);
        finger.translate(0, -len * k * 0.5, 0);
        finger.rotateZ(0.22 * side);
        finger.translate(-0.0015 * side * k, -0.04 * k, z * k);
        parts.push(finger);
    }
    const thumb = new THREE.CapsuleGeometry(0.0064 * k, 0.014 * k, 4, 10);
    thumb.translate(0, -0.007 * k, 0);
    thumb.rotateX(-0.6);
    thumb.rotateZ(0.42 * side);
    thumb.translate(-0.005 * side * k, -0.016 * k, 0.0155 * k);
    parts.push(thumb);
    // Zglob: kratak valjak koji ulazi u podlakticu
    const wrist = new THREE.CylinderGeometry(0.0145 * k, 0.0135 * k, 0.026 * k, 14);
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
export function buildBody(rig: Rig, skin: THREE.Material, options: { feet: boolean }): BodyMeshes {
    const shape = rig.shape;
    const skinned: THREE.SkinnedMesh[] = [];
    const rigid: THREE.Mesh[] = [];
    const add = (geometry: THREE.BufferGeometry, name: string) => {
        const mesh = new THREE.SkinnedMesh(geometry, skin);
        mesh.name = name;
        skinned.push(mesh);
    };

    add(buildSurface(torsoSurface(shape, torsoBottom(shape), torsoTop(shape), 0), {
        nu: 56,
        nv: 72,
        closedU: true,
        inside: (_u, v, out) => out.set(0, torsoBottom(shape) + (torsoTop(shape) - torsoBottom(shape)) * v, 0),
        weights: (_u, _v, p) => torsoWeights(shape, p),
    }), "trup");

    for (const side of [1, -1] as const) {
        const arm = armPath(rig, side, 0);
        add(buildSurface(sweepFn(arm.spec), {
            nu: 28,
            nv: 44,
            closedU: true,
            inside: (_u, v, out) => arm.spec.path(v, out),
            weights: (_u, _v, p) => armWeights(rig, side, p),
        }), side === 1 ? "leva-ruka" : "desna-ruka");
        const leg = legPath(rig, side, 0);
        add(buildSurface(sweepFn(leg.spec), {
            nu: 32,
            nv: 48,
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
