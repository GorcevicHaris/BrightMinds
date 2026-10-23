// Kosa: „kapa” kose prati površinu glave sa debljinom koja se meko gubi na liniji kose
// (pa nema oštre ivice preko čela), a dodaci su posebni oblici — rep, pletenice, punđa,
// kovrdže i duga kosa niz leđa. Pramenovi su u mapi normala i u anizotropnom odsjaju.
// Sve je u koordinatama kosti glave.

import * as THREE from "three";
import type { HairStyle } from "../catalog";
import type { HeadInfo } from "./head";
import { hairMaterial } from "./materials";
import type { Rig } from "./rig";
import { buildSurface, polyPath, profile, smoothstep, taperedTube, type SurfaceFn } from "./surface";

const gauss = (x: number, mu: number, s: number) => Math.exp(-((x - mu) ** 2) / (2 * s * s));

/** Ugao od napred (rad, + ka levom uhu lika) za parametar u glave */
const thetaOf = (u: number) => (u - 0.5) * Math.PI * 2;

interface CapSpec {
    /** Linija kose: v ispod kog nema kose, po |θ| (0 = čelo, π = potiljak) */
    hairline: [number, number][];
    /** Debljina kose (m) za θ i v */
    thickness: (th: number, v: number) => number;
    /** Talas na liniji kose (šiške, zalisci) */
    wave?: (th: number) => number;
    soft?: number;
    /** Pramenovi (oblikovani žlebovi od temena ka liniji kose): 0 = glatko (ošišano) */
    clumps?: number;
}

/** Mesto gde kapa kose nosi kapu/šešir: kosa je tanja na temenu */
const UNDER_HAT_TOP = 0.011;

function capSurface(head: HeadInfo, spec: CapSpec, underHat: boolean): { fn: SurfaceFn; maxV: number } {
    const line = profile(spec.hairline);
    const soft = spec.soft ?? 0.014;
    const maxV = Math.min(0.98, Math.max(...spec.hairline.map(([, v]) => v)) + soft * 2 + 0.01);
    const offset = (u: number, v: number) => {
        const th = thetaOf(u);
        const a = Math.abs(th);
        const hl = line(a) + (spec.wave ? spec.wave(th) : 0);
        const cover = 1 - smoothstep(hl - soft, hl + soft, v);
        let t = spec.thickness(th, v);
        // Oblikovani pramenovi: blagi žlebovi koji teku od temena, pa kosa nije „kaciga”
        const k = spec.clumps ?? 1;
        if (k > 0) {
            const flow = th * 11 + Math.sin(th * 3) * 0.8 + v * 2.2;
            t += k * 0.0042 * (Math.pow(Math.abs(Math.sin(flow)), 0.55) - 0.55) * smoothstep(0.06, 0.28, v);
            t += k * 0.0025 * Math.sin(th * 5 + 1.3) * smoothstep(0.1, 0.4, v);
        }
        if (underHat && v < 0.42) t = Math.min(t, UNDER_HAT_TOP + (v / 0.42) * 0.004);
        // Debljina se tanji ka liniji kose, pa se kosa „utapa” u kožu (−5 mm = ispod kože)
        const edge = smoothstep(hl + soft, hl - soft * 3, v);
        return cover * t * (0.35 + 0.65 * edge) - (1 - cover) * 0.005;
    };
    const base = head.offsetFn(offset);
    return { fn: (u, v, out) => base(u, v * maxV, out), maxV };
}

function capMesh(head: HeadInfo, spec: CapSpec, material: THREE.Material, underHat: boolean): THREE.Mesh {
    const { fn, maxV } = capSurface(head, spec, underHat);
    const geometry = buildSurface(fn, {
        nu: 128,
        nv: Math.round(96 * maxV),
        closedU: true,
        inside: () => head.center.clone(),
        uv: (u, v) => [u * 6, v * maxV * 1.5],
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "kosa";
    return mesh;
}

/** Standardna linija kose deteta (čelo, slepoočnice, iznad uha, potiljak) */
const LINE_SHORT: [number, number][] = [[0, 0.3], [0.55, 0.32], [0.95, 0.4], [1.3, 0.47], [1.5, 0.43], [1.75, 0.5], [2.2, 0.66], [Math.PI, 0.75]];
const LINE_LONG: [number, number][] = [[0, 0.345], [0.4, 0.36], [0.8, 0.41], [1.1, 0.47], [1.3, 0.56], [1.6, 0.74], [2.2, 0.8], [Math.PI, 0.82]];
const LINE_BACK: [number, number][] = [[0, 0.29], [0.55, 0.31], [0.95, 0.39], [1.3, 0.47], [1.5, 0.44], [1.75, 0.52], [2.2, 0.68], [Math.PI, 0.76]];

// ── Dodaci ────────────────────────────────────────────────────────────────────

/** Duga kosa niz leđa: zatvoren „list” sa zaobljenim ivicama, ivica dole talasasta */
function longBack(head: HeadInfo, rig: Rig, material: THREE.Material): THREE.Mesh {
    const shape = rig.shape;
    const { w, d } = shape.head;
    const c = head.center;
    const yTop = c.y + 0.01;
    // Dno je na lopaticama (u koordinatama glave)
    const yBot = shape.chestY - shape.headBoneY - 0.02;
    const shoulderLocal = shape.shoulderY - shape.headBoneY;
    const backAt = (y: number) => shape.torsoBack(y + shape.headBoneY);
    const fn: SurfaceFn = (q, t, out) => {
        const ang = q * Math.PI * 2;
        const a = Math.cos(ang); // −1 … 1 preko leđa
        const side = Math.sin(ang); // spolja / iznutra
        // Krajevi se razdvajaju u pramenove (različite dužine), ne završavaju se ravnom pločom
        const lock = Math.abs(Math.sin(a * 5.5 + 0.4));
        const y = yTop + (yBot - yTop) * t - (0.012 + 0.05 * Math.pow(1 - lock, 1.5)) * smoothstep(0.62, 1, t);
        // Luk se sužava: gore obuhvata glavu, niže je iza ramena
        const k = smoothstep(yTop, shoulderLocal + 0.02, y);
        const alpha = 1.45 - 0.5 * k;
        const half = ((w / 2 + 0.014) * (1 - k) + (shape.torsoW(shape.shoulderY) * 0.95) * k) * (1 - 0.12 * smoothstep(0.6, 1, t));
        // Malo odmaknuto od leđa (kosa pada slobodno)
        const back = (d / 2 + 0.016) * (1 - k) + (backAt(Math.max(y, shoulderLocal - 0.08)) + 0.04 + c.z) * k;
        const zc = c.z;
        const x = (half * Math.sin(a * alpha)) / Math.sin(alpha);
        const z = zc - back * Math.cos(a * alpha) * (1 + 0.15 * k);
        // Debljina: deblje u sredini, tanko na krajevima i na dnu
        // Debljina: pramenovi se pri dnu tanje (šiljato), među njima žleb
        const th = (0.012 + 0.01 * (1 - Math.abs(a))) * (1 - smoothstep(0.55, 1, t) * (0.55 + 0.35 * (1 - lock))) * (0.5 + 0.5 * Math.sqrt(Math.max(0, 1 - a * a)));
        const nx = Math.sin(a * alpha);
        const nz = -Math.cos(a * alpha);
        const groove = 0.0016 * Math.sin(a * 28) + 0.004 * (lock - 0.6) * smoothstep(0.25, 0.9, t);
        return out.set(x + nx * (side * th + groove), y, z + nz * (side * th + groove));
    };
    const geometry = buildSurface(fn, {
        nu: 132,
        nv: 56,
        closedU: true,
        inside: (_q, t, out) => out.set(0, yTop + (yBot - yTop) * t, c.z - 0.02),
        uv: (q, t) => [q * 6, t * 3],
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "duga-kosa";
    return mesh;
}

/** Rep: gumica na potiljku i pramen koji pada niz leđa (njiše se) */
function ponytail(head: HeadInfo, rig: Rig, material: THREE.Material, high: boolean): THREE.Object3D {
    const group = new THREE.Group();
    group.name = "rep";
    const v = high ? 0.28 : 0.42;
    const base = head.point(0, v);
    const n = head.normal(0, v);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.007, 10, 24), new THREE.MeshPhysicalMaterial({ color: "#E8556B", roughness: 0.45, clearcoat: 0.3 }));
    tie.position.copy(base).addScaledVector(n, 0.012);
    tie.lookAt(tie.position.clone().add(n));
    group.add(tie);
    const yBot = rig.shape.chestY - rig.shape.headBoneY + 0.02;
    const p0 = base.clone().addScaledVector(n, 0.004);
    const p1 = base.clone().addScaledVector(n, 0.05).add(new THREE.Vector3(0, high ? 0.02 : -0.005, 0));
    const p2 = new THREE.Vector3(0, (p1.y + yBot) / 2, p1.z - 0.025);
    const p3 = new THREE.Vector3(0, yBot, p1.z - 0.012);
    const r = profile([[0, 0.02], [0.12, 0.03], [0.35, 0.034], [0.75, 0.024], [1, 0.004]]);
    const tail = new THREE.Mesh(taperedTube(polyPath([p0, p1, p2, p3]), r, 40, 18, new THREE.Vector3(0, 0, -1), 0.85), material);
    group.add(tail);
    group.userData.swing = { pivot: p0.clone(), amount: 0.06 };
    return group;
}

/** Pletenica: niz preklopljenih „zrna” koja se smenjuju levo-desno, sa gumicom i čupavim krajem */
function braid(head: HeadInfo, rig: Rig, material: THREE.Material, side: 1 | -1): THREE.Object3D {
    const group = new THREE.Group();
    group.name = "pletenica";
    const shape = rig.shape;
    const hb = shape.headBoneY;
    const frontAt = (y: number) => shape.torsoFront(y + hb);
    const start = head.point(0.5 + side * 0.31, 0.62).add(new THREE.Vector3(side * 0.006, 0, 0));
    const shoulder = new THREE.Vector3(side * 0.11, shape.shoulderY - hb + 0.01, frontAt(shape.shoulderY - 0.03) + 0.045);
    const end = new THREE.Vector3(side * 0.1, shape.chestY - hb - 0.06, frontAt(shape.chestY - 0.06) + 0.04);
    const mid = start.clone().lerp(shoulder, 0.5).add(new THREE.Vector3(side * 0.025, 0, 0.0));
    const path = polyPath([start, mid, shoulder, end]);
    const lobes = 10;
    const p = new THREE.Vector3();
    const q = new THREE.Vector3();
    for (let i = 0; i < lobes; i++) {
        const s = (i + 0.5) / lobes;
        path(s, p);
        path(Math.min(1, s + 0.01), q);
        const tangent = q.sub(p).normalize();
        const r = 0.02 * (1 - s * 0.3);
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), material);
        lobe.scale.set(r * 1.05, r * 1.55, r * 0.85);
        lobe.position.copy(p);
        lobe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        lobe.rotateY(0);
        lobe.rotateZ(i % 2 === 0 ? 0.42 : -0.42);
        group.add(lobe);
    }
    // Gumica i kraj
    path(1, p);
    path(0.97, q);
    const dir = p.clone().sub(q).normalize();
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0045, 8, 18), new THREE.MeshPhysicalMaterial({ color: "#F2C230", roughness: 0.4, clearcoat: 0.4 }));
    tie.position.copy(p).addScaledVector(dir, 0.004);
    tie.lookAt(tie.position.clone().add(dir));
    group.add(tie);
    const tuftEnd = p.clone().addScaledVector(dir, 0.04);
    const tuft = new THREE.Mesh(taperedTube(polyPath([p.clone().addScaledVector(dir, 0.002), p.clone().addScaledVector(dir, 0.02), tuftEnd]), (s) => 0.012 * Math.sin(Math.min(1, 0.25 + s) * Math.PI * 0.9) + 0.002, 12, 12), material);
    group.add(tuft);
    return group;
}

/** Punđa na temenu */
function bun(head: HeadInfo, material: THREE.Material): THREE.Object3D {
    const group = new THREE.Group();
    const v = 0.17;
    const base = head.point(0, v);
    const n = head.normal(0, v);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.046, 32, 24), material);
    ball.scale.set(1, 0.85, 1);
    ball.position.copy(base).addScaledVector(n, 0.04);
    group.add(ball);
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 10, 28), material);
    wrap.position.copy(base).addScaledVector(n, 0.012);
    wrap.lookAt(wrap.position.clone().add(n));
    group.add(wrap);
    return group;
}

/** Kovrdže: gusti mali uvojci po kapi kose (jedan InstancedMesh) */
function curls(head: HeadInfo, spec: CapSpec, material: THREE.Material, underHat: boolean): THREE.Object3D {
    const line = profile(spec.hairline);
    const positions: THREE.Matrix4[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    const count = 900;
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
        // Ravnomerno po sferi (Fibonačijeva spirala)
        const y = 1 - (i / (count - 1)) * 2;
        const theta = golden * i;
        const v = Math.acos(Math.max(-1, Math.min(1, y))) / Math.PI;
        const u = ((theta / (Math.PI * 2)) % 1 + 1) % 1;
        const th = thetaOf(u);
        const hl = line(Math.abs(th)) - 0.03;
        if (v > hl) continue;
        if (underHat && v < 0.4) continue;
        head.point(u, v, p);
        head.normal(u, v, n);
        const t = spec.thickness(th, v);
        p.addScaledVector(n, t * 0.85);
        const r = 0.017 + ((i * 7919) % 100) / 100 * 0.008;
        q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        s.set(r, r * 0.8, r);
        positions.push(new THREE.Matrix4().compose(p.clone(), q.clone(), s.clone()));
    }
    const geometry = new THREE.SphereGeometry(1, 12, 8);
    const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
    positions.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.name = "kovrdze";
    return mesh;
}

// ── Frizure ───────────────────────────────────────────────────────────────────

/** Debljina kose na vrhu glave (kape i šeširi se prilagođavaju) */
export function hairCrown(style: HairStyle, underHat: boolean): number {
    if (underHat) return UNDER_HAT_TOP + 0.002;
    switch (style) {
        case "buzz":
            return 0.005;
        case "curly":
            return 0.05;
        case "short":
            return 0.024;
        default:
            return 0.018;
    }
}

export function buildHair(rig: Rig, head: HeadInfo, style: HairStyle, hex: string, underHat: boolean): THREE.Object3D[] {
    const material = hairMaterial(hex);
    const headBone = rig.bone("head");
    const parts: THREE.Object3D[] = [];
    const add = (object: THREE.Object3D) => {
        headBone.add(object);
        parts.push(object);
    };
    // Razdeljak po sredini: udubljenje na temenu napred
    const part = (th: number, v: number) => 0.006 * gauss(th, 0, 0.045) * (1 - smoothstep(0.18, 0.32, v));
    switch (style) {
        case "short": {
            const spec: CapSpec = {
                hairline: LINE_SHORT,
                wave: (th) => 0.012 * Math.abs(Math.sin(th * 5)) * gauss(th, 0, 0.6),
                thickness: (th, v) => 0.011 + 0.014 * (1 - smoothstep(0.1, 0.5, v)) + 0.01 * gauss(th, 0.25, 0.45) * gauss(v, 0.24, 0.1) + 0.004 * Math.sin(th * 9 + v * 20) * (1 - v),
            };
            add(capMesh(head, spec, material, underHat));
            break;
        }
        case "buzz": {
            const spec: CapSpec = { hairline: LINE_SHORT, thickness: () => 0.0035, soft: 0.01, clumps: 0 };
            const buzz = hairMaterial(hex).clone();
            buzz.anisotropy = 0;
            buzz.roughness = 0.85;
            buzz.sheen = 0.6;
            add(capMesh(head, spec, buzz, underHat));
            break;
        }
        case "curly": {
            const spec: CapSpec = {
                hairline: [[0, 0.3], [0.6, 0.32], [1.0, 0.42], [1.4, 0.5], [1.7, 0.52], [2.3, 0.68], [Math.PI, 0.76]],
                thickness: (_th, v) => 0.022 + 0.012 * (1 - smoothstep(0.2, 0.6, v)),
            };
            add(capMesh(head, spec, material, underHat));
            add(curls(head, spec, material, underHat));
            break;
        }
        case "long": {
            const spec: CapSpec = {
                hairline: LINE_LONG,
                // Šiške začešljane u stranu: razdeljak levo, pramen pada preko desne strane čela
                wave: (th) => 0.045 * gauss(th, -0.3, 0.32) - 0.025 * gauss(th, 0.32, 0.16),
                thickness: (th, v) =>
                    0.014 + 0.006 * (1 - smoothstep(0.2, 0.6, v)) + 0.008 * smoothstep(0.45, 0.75, v) * smoothstep(0.9, 1.5, Math.abs(th))
                    + 0.006 * gauss(v, 0.36, 0.06) * gauss(th, -0.2, 0.5)
                    + 0.0025 * Math.sin(th * 16) * smoothstep(0.3, 0.7, v)
                    - part(th - 0.32, v),
            };
            add(capMesh(head, spec, material, underHat));
            add(longBack(head, rig, material));
            break;
        }
        case "ponytail": {
            const spec: CapSpec = {
                hairline: LINE_BACK,
                thickness: (th, v) => 0.009 + 0.006 * (1 - smoothstep(0.1, 0.5, v)) + 0.006 * gauss(Math.abs(th), Math.PI, 0.5) * gauss(v, 0.42, 0.08),
            };
            add(capMesh(head, spec, material, underHat));
            add(ponytail(head, rig, material, false));
            break;
        }
        case "braids": {
            const spec: CapSpec = {
                hairline: [[0, 0.3], [0.5, 0.315], [0.9, 0.38], [1.25, 0.5], [1.55, 0.55], [1.9, 0.64], [2.4, 0.72], [Math.PI, 0.76]],
                thickness: (th, v) => 0.01 + 0.005 * (1 - smoothstep(0.2, 0.6, v)) - part(th, v) * 0.8,
            };
            add(capMesh(head, spec, material, underHat));
            add(braid(head, rig, material, 1));
            add(braid(head, rig, material, -1));
            break;
        }
        case "bun": {
            const spec: CapSpec = {
                hairline: LINE_BACK,
                thickness: (_th, v) => 0.009 + 0.006 * (1 - smoothstep(0.1, 0.5, v)),
            };
            add(capMesh(head, spec, material, underHat));
            if (!underHat) add(bun(head, material));
            break;
        }
    }
    return parts;
}
