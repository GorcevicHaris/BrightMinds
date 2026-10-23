// Oštre šare na licu (mrlje pande, maska rakuna): tanka površina koja leži tik iznad glave i
// prati je, sa glatkom ivicom (ivica je sama geometrija, ne prelaz boja između temena — boje
// temena na glavi su za to previše retke). Oblik se zadaje obrisom u ravni lica oko tačke na
// glavi: poluprečnik r(θ) u metrima, θ = 0 napolje od sredine lica, π/2 gore.

import * as THREE from "three";
import type { AnimalBuild } from "../figure";
import { FUR_TILE } from "../materials";
import { col } from "../paint";

export interface DecalSpec {
    /** Središte (koordinate kosti glave) — tačka na ili blizu površine glave */
    center: THREE.Vector3;
    /** Strana lica (+1 levo od lika): θ = 0 pokazuje napolje */
    side: 1 | -1;
    /** Obris: poluprečnik (m) za ugao θ */
    radius: (theta: number) => number;
    /** Boja šare (heks ili gotova boja u linearnom prostoru) */
    color: string | THREE.Color;
    /** Koliko iznad površine (m) */
    lift?: number;
    /** Boja ka ivici (meki prelaz u boju krzna po samoj šari, opciono) */
    edgeColor?: string | THREE.Color;
}

const n = new THREE.Vector3();
const dir = new THREE.Vector3();

/** Pravi šaru kao mrežu prstenova od središta do obrisa, spuštenu na površinu glave */
export function headDecal(b: AnimalBuild, spec: DecalSpec): THREE.Mesh {
    const head = b.head;
    const hi = b.quality === "high";
    const rings = hi ? 14 : 8;
    const seg = hi ? 72 : 40;
    const lift = spec.lift ?? 0.0012;
    // Okvir u ravni lica: napolje (x po strani), gore (y), normala glave u središtu
    const [cu, cv] = head.uvOf(dir.copy(spec.center).sub(head.center));
    const normal = head.normal(cu, cv);
    const up = new THREE.Vector3(0, 1, 0).addScaledVector(normal, -normal.y).normalize();
    const out = new THREE.Vector3().crossVectors(up, normal).normalize().multiplyScalar(spec.side);
    if (out.x * spec.side < 0) out.negate();
    const positions: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const asColor = (x: string | THREE.Color) => (typeof x === "string" ? col(x) : x);
    const c = asColor(spec.color);
    const e = asColor(spec.edgeColor ?? spec.color);
    const tmp = new THREE.Vector3();
    const color = new THREE.Color();
    const push = (p: THREE.Vector3, k: number) => {
        // Spusti tačku iz ravni na glavu (pravac iz središta glave), pa malo iznad površine
        const [u, v] = head.uvOf(dir.copy(p).sub(head.center));
        head.point(u, v, tmp);
        head.normal(u, v, n);
        tmp.addScaledVector(n, lift);
        positions.push(tmp.x, tmp.y, tmp.z);
        uvs.push((u * Math.PI * b.shape.head.w) / FUR_TILE, (v * Math.PI * b.shape.head.h * 0.5) / FUR_TILE);
        color.copy(c).lerp(e, k);
        colors.push(color.r, color.g, color.b);
    };
    push(spec.center, 0);
    const p = new THREE.Vector3();
    for (let r = 1; r <= rings; r++) {
        const t = r / rings;
        for (let s = 0; s < seg; s++) {
            const th = (s / seg) * Math.PI * 2;
            const rr = spec.radius(th) * t;
            p.copy(spec.center).addScaledVector(out, Math.cos(th) * rr).addScaledVector(up, Math.sin(th) * rr);
            push(p, t * t);
        }
    }
    const index: number[] = [];
    for (let s = 0; s < seg; s++) index.push(0, 1 + s, 1 + ((s + 1) % seg));
    for (let r = 1; r < rings; r++) {
        const a0 = 1 + (r - 1) * seg;
        const a1 = 1 + r * seg;
        for (let s = 0; s < seg; s++) {
            const s1 = (s + 1) % seg;
            index.push(a0 + s, a1 + s, a1 + s1, a0 + s, a1 + s1, a0 + s1);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    // Strana trouglova: normala treba da gleda od glave
    const nrm = g.getAttribute("normal");
    const pos = g.getAttribute("position");
    tmp.set(pos.getX(0), pos.getY(0), pos.getZ(0)).sub(head.center);
    if (tmp.dot(n.set(nrm.getX(0), nrm.getY(0), nrm.getZ(0))) < 0) {
        const idx = g.getIndex()!;
        for (let i = 0; i < idx.count; i += 3) {
            const a = idx.getX(i + 1);
            idx.setX(i + 1, idx.getX(i + 2));
            idx.setX(i + 2, a);
        }
        g.computeVertexNormals();
    }
    const mesh = new THREE.Mesh(g, b.fur);
    mesh.name = "sara-lica";
    mesh.renderOrder = 1;
    return mesh;
}

/** Obris suze/ovala: poluose a (napolje) i b (gore), nagib i šiljak na jednom kraju */
export function teardrop(a: number, bb: number, tilt = 0, point = 0, pointAt = -Math.PI / 2): (theta: number) => number {
    return (theta) => {
        const t = theta - tilt;
        const r = 1 / Math.sqrt((Math.cos(t) / a) ** 2 + (Math.sin(t) / bb) ** 2);
        // Šiljak: produženje oko ugla pointAt
        const d = Math.atan2(Math.sin(theta - pointAt), Math.cos(theta - pointAt));
        return r * (1 + point * Math.exp(-(d * d) / 0.18));
    };
}
