// Šake i stopala dodatnih vrsta (kuke customHand/customFoot iz animals/figure.ts):
//  • šaka sa prstima (majmun, rakun, hrčak, veverica, žaba sa jastučićima na vrhovima),
//  • šaka sa tri debela prsta i kandžicama (dinosaurus),
//  • krilo sa perima-prstima (sova),
//  • stopalo sa prstima i kandžama (dinosaurus, sova) i plivaće stopalo (žaba).
// Šaka je u koordinatama kosti šake (−y niz šaku, dlan ka telu), stopalo u koordinatama kosti
// stopala (pod je na y = −ankleY); oblik stopala prati kalup obuće (shape.foot), pa patike
// i dalje pristaju. Boje su u temenima (isti materijal krzna kao telo).

import * as THREE from "three";
import { merge } from "../../engine/surface";
import type { AnimalBuild } from "../figure";
import { hornyMaterial } from "../materials";
import { paintGeometry } from "../paint";
import { handFrame, pawFoot, type Side } from "../parts";

interface HandOut {
    objects: THREE.Object3D[];
    grip: THREE.Vector3;
    radius: number;
}

function capsule(r: number, len: number, a: THREE.Vector3, b: THREE.Vector3, seg = 12): THREE.BufferGeometry {
    const g = new THREE.CapsuleGeometry(r, len, 5, seg);
    const dir = new THREE.Vector3().subVectors(b, a).normalize();
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    const mid = a.clone().lerp(b, 0.5);
    g.translate(mid.x, mid.y, mid.z);
    g.deleteAttribute("uv");
    return g;
}

function blob(rx: number, ry: number, rz: number, at: THREE.Vector3, seg = 20): THREE.BufferGeometry {
    const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7));
    g.scale(rx, ry, rz);
    g.translate(at.x, at.y, at.z);
    g.deleteAttribute("uv");
    return g;
}

/** Jednostavne uv koordinate (krzno u metrima) za spojene delove */
function boxUv(g: THREE.BufferGeometry): THREE.BufferGeometry {
    const pos = g.getAttribute("position");
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = (pos.getX(i) + pos.getZ(i)) / 0.05;
        uv[i * 2 + 1] = pos.getY(i) / 0.05;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g;
}

function handRadius(b: AnimalBuild): number {
    return b.spec.pawR ?? b.shape.armR(1) * 1.22;
}

export interface FingerOptions {
    fingers?: number;
    /** Dužina i debljina prstiju (udeo poluprečnika šake) */
    len?: number;
    thick?: number;
    /** Jastučići na vrhovima prstiju (žaba) */
    bulbs?: boolean;
    /** Kandžice (rakun, veverica) */
    claws?: string;
}

/** Šaka sa prstima: dlan, prsti blago savijeni ka dlanu, palac spreda */
export function fingerHand(b: AnimalBuild, side: Side, o: FingerOptions = {}): HandOut {
    const R = handRadius(b);
    const n = o.fingers ?? 4;
    const len = (o.len ?? 0.8) * R;
    const fr = (o.thick ?? 0.22) * R;
    const hi = b.quality === "high";
    const seg = hi ? 12 : 8;
    const parts: THREE.BufferGeometry[] = [];
    // Dlan (malo spljošten po debljini šake) i zglob ka podlaktici
    parts.push(blob(R * 0.58, R * 0.82, R * 0.86, new THREE.Vector3(0, -R * 0.78, 0), hi ? 24 : 14));
    const wrist = new THREE.CylinderGeometry(R * 0.66, R * 0.74, R * 0.8, hi ? 20 : 12, 1, true);
    wrist.deleteAttribute("uv");
    parts.push(wrist);
    const claws: THREE.BufferGeometry[] = [];
    for (let k = 0; k < n; k++) {
        const z = (k - (n - 1) / 2) * R * (n > 3 ? 0.4 : 0.5);
        const l = len * (1 - Math.abs(k - (n - 1) / 2) * 0.12);
        const a = new THREE.Vector3(-side * R * 0.04, -R * 1.35, z);
        // Prsti se savijaju ka dlanu (−x za levu šaku gleda ka telu)
        const e = new THREE.Vector3(-side * l * 0.35, -R * 1.35 - l, z * 1.08);
        parts.push(capsule(fr, l * 0.8, a, e, seg));
        if (o.bulbs) parts.push(blob(fr * 1.55, fr * 1.25, fr * 1.55, e.clone().add(new THREE.Vector3(0, -fr * 0.4, 0)), 14));
        if (o.claws) {
            const tip = e.clone().add(new THREE.Vector3(-side * fr * 0.2, -fr * 0.9, 0));
            const c = new THREE.ConeGeometry(fr * 0.55, fr * 1.4, 8);
            c.rotateX(Math.PI);
            c.translate(tip.x, tip.y, tip.z);
            c.deleteAttribute("uv");
            claws.push(c);
        }
    }
    // Palac: spreda, ka dlanu
    const ta = new THREE.Vector3(-side * R * 0.25, -R * 0.75, R * 0.62);
    const te = new THREE.Vector3(-side * R * 0.55, -R * 1.25, R * 0.82);
    parts.push(capsule(fr * 1.08, len * 0.45, ta, te, seg));
    if (o.bulbs) parts.push(blob(fr * 1.5, fr * 1.2, fr * 1.5, te, 14));
    const q = handFrame(b.rig, side);
    const g = boxUv(merge(parts));
    g.applyQuaternion(q);
    const at = b.boneAt(side === 1 ? "handL" : "handR");
    paintGeometry(g, b.paint, (_i, p) => ({ p: p.clone().add(at), region: "hand", side, t: 1 }));
    const objects: THREE.Object3D[] = [new THREE.Mesh(g, b.fur)];
    if (claws.length) {
        const c = merge(claws);
        c.applyQuaternion(q);
        objects.push(new THREE.Mesh(c, hornyMaterial(o.claws!, 0.35)));
    }
    const grip = new THREE.Vector3(-side * R * 0.35, -R * 1.1, R * 0.1).applyQuaternion(q);
    return { objects, grip, radius: R };
}

/** Krilo (sova): zaobljena lopatica od perja sa tri duga pera na kraju (umesto prstiju) */
export function wingHand(b: AnimalBuild, side: Side): HandOut {
    const R = handRadius(b);
    const hi = b.quality === "high";
    const parts: THREE.BufferGeometry[] = [];
    parts.push(blob(R * 0.5, R * 1.0, R * 1.05, new THREE.Vector3(0, -R * 0.75, 0), hi ? 24 : 14));
    const wrist = new THREE.CylinderGeometry(R * 0.66, R * 0.74, R * 0.8, hi ? 20 : 12, 1, true);
    wrist.deleteAttribute("uv");
    parts.push(wrist);
    // Pera: spljošteni ovali, raspoređeni lepezasto unazad
    for (let k = 0; k < 4; k++) {
        const z = (0.45 - k * 0.38) * R;
        const l = R * (1.6 - Math.abs(k - 1.2) * 0.22);
        const f = new THREE.SphereGeometry(1, hi ? 16 : 10, hi ? 10 : 6);
        f.scale(R * 0.16, l * 0.5, R * 0.34);
        f.rotateX(-0.12 * (k - 1.5));
        f.translate(0, -R * 1.2 - l * 0.38, z);
        f.deleteAttribute("uv");
        parts.push(f);
    }
    const q = handFrame(b.rig, side);
    const g = boxUv(merge(parts));
    g.applyQuaternion(q);
    const at = b.boneAt(side === 1 ? "handL" : "handR");
    paintGeometry(g, b.paint, (_i, p) => ({ p: p.clone().add(at), region: "hand", side, t: 1 }));
    const grip = new THREE.Vector3(-side * R * 0.3, -R * 1.2, R * 0.1).applyQuaternion(q);
    return { objects: [new THREE.Mesh(g, b.fur)], grip, radius: R * 1.1 };
}

export interface ToeOptions {
    toes: number;
    /** Boja prstiju (null = krzno/koža iz temena) */
    color?: string;
    claws?: string;
    /** Debljina prstiju (udeo širine stopala) */
    thick?: number;
    /** Zadnji prst (ptica) */
    back?: boolean;
    /** Plivaća kožica između prstiju (žaba) */
    webbed?: boolean;
    /** Stopalo bez kalupa (ptičja noga: samo prsti) */
    bare?: boolean;
}

/** Stopalo sa prstima: kalup obuće (zaobljen) i prsti napred sa kandžicama */
export function toeFoot(b: AnimalBuild, side: Side, o: ToeOptions): THREE.Object3D[] {
    const shape = b.shape;
    const { len, w, back } = shape.foot;
    const floorY = -shape.ankleY;
    const hi = b.quality === "high";
    const at = b.boneAt(side === 1 ? "footL" : "footR");
    const objects: THREE.Object3D[] = [];
    const parts: THREE.BufferGeometry[] = [];
    const tr = w * (o.thick ?? 0.17);
    const front = len - back;
    const claws: THREE.BufferGeometry[] = [];
    for (let k = 0; k < o.toes; k++) {
        const x = (k - (o.toes - 1) / 2) * w * (o.toes > 3 ? 0.27 : 0.36);
        const spread = (k - (o.toes - 1) / 2) * 0.18;
        const a = new THREE.Vector3(x * 0.8, floorY + tr * 1.05, front - len * 0.32);
        const e = new THREE.Vector3(x + Math.sin(spread) * len * 0.12, floorY + tr * 0.95, front + len * (o.bare ? 0.12 : 0.06));
        parts.push(capsule(tr, a.distanceTo(e), a, e, hi ? 12 : 8));
        if (o.webbed) parts.push(blob(tr * 1.6, tr * 0.9, tr * 1.4, e.clone().add(new THREE.Vector3(0, -tr * 0.1, tr * 0.3)), 12));
        if (o.claws) {
            const c = new THREE.ConeGeometry(tr * 0.55, tr * 1.5, 8);
            c.rotateX(Math.PI / 2);
            c.translate(e.x, floorY + tr * 0.7, e.z + tr * 1.1);
            c.deleteAttribute("uv");
            claws.push(c);
        }
    }
    if (o.back) {
        const a = new THREE.Vector3(0, floorY + tr, -back * 0.2);
        const e = new THREE.Vector3(0, floorY + tr * 0.9, -back - len * 0.1);
        parts.push(capsule(tr * 0.9, a.distanceTo(e), a, e, hi ? 12 : 8));
    }
    if (o.webbed) {
        // Kožica: tanak spljošten oval između prstiju
        parts.push(blob(w * 0.48, tr * 0.45, len * 0.26, new THREE.Vector3(0, floorY + tr * 0.55, front - len * 0.05), 18));
    }
    const toes = boxUv(merge(parts));
    const paintFoot = (g: THREE.BufferGeometry) => paintGeometry(g, b.paint, (_i, p) => ({ p: p.clone().add(at), region: "foot", side, t: 1 }));
    if (!o.bare) {
        // Kalup stopala (krzno), da obuća i dalje pristaje
        const base = pawFoot(shape, b.quality, 0, "paw");
        paintFoot(base);
        const mesh = new THREE.Mesh(base, b.fur);
        mesh.name = "stopalo";
        objects.push(mesh);
    }
    if (o.color) objects.push(new THREE.Mesh(toes, hornyMaterial(o.color, 0.45)));
    else {
        paintFoot(toes);
        objects.push(new THREE.Mesh(toes, b.fur));
    }
    if (claws.length) objects.push(new THREE.Mesh(merge(claws), hornyMaterial(o.claws!, 0.35)));
    return objects;
}
