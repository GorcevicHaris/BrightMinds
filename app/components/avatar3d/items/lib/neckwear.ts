// Oko vrata (kalup): ogrlice koje padaju preko grudi, kragne oko vrata, mašne i kravate
// na prednjem delu okovratnika, šalovi. Sve je nacrtano u prostoru tela i prati trup
// (SkinnedMesh sa težinama trupa), a udaljenost od tela zavisi od onoga što lik nosi
// (majica, duks sa kapuljačom, jakna, hidžab) — da ništa ne utone u odeću.

import * as THREE from "three";
import type { BodyShape, ItemContext } from "../../contract";
import { torsoPoint } from "../../engine/body";
import { hijabOuter } from "../../engine/hijab";
import { ringTube, taperedTube, polyPath } from "../../engine/surface";
import { res, seg, weighTorso } from "./common";
import { mergeSimple, Tailor } from "./tailor";

/** Koliko je odeća (i hidžab) debela na vratu i ramenima: [napred/sa strane, dodatak pozadi] */
export function neckLayer(ctx: ItemContext): { off: number; back: number } {
    const id = ctx.wear.outfit ?? "";
    let off = 0.017;
    let back = 0;
    if (/jakna/.test(id)) off = 0.044;
    else if (/kabanica|astronauta|vatrogasca|pilota|ronioca|princa|viteza|superheroja|carobnjaka/.test(id)) off = 0.034;
    else if (/duks|trenerka/.test(id)) {
        off = 0.026;
        back = 0.034;
    } else if (/dzemper|kostim|odelo|pidzama|super-ogrtac/.test(id)) off = 0.022;
    // Preko hidžaba (deo preko ramena je odmaknut po odeći ispod)
    if (ctx.hijab) off = Math.max(off, hijabOuter(ctx.wear.outfit) + 0.015);
    return { off, back };
}

export class Neck {
    readonly s: BodyShape;
    readonly t: Tailor;
    readonly r: number;
    /** Razmera prema detetu (veličina perli, mašni) */
    readonly k: number;
    readonly off: number;
    readonly backBump: number;
    readonly hijab: boolean;

    constructor(readonly ctx: ItemContext) {
        this.s = ctx.body.shape;
        this.t = new Tailor(ctx);
        this.r = res(ctx);
        this.k = Math.min(1.35, Math.max(0.9, this.s.height / 1.19 * 0.55 + (this.s.neckR / 0.039) * 0.45));
        const layer = neckLayer(ctx);
        this.off = layer.off;
        this.backBump = layer.back;
        this.hijab = Boolean(ctx.hijab);
    }

    /** Odstojanje od tela za ugao a (pozadi više kod kapuljače) */
    offAt(a: number, extra = 0): number {
        return this.off + extra + this.backBump * Math.pow(Math.max(0, -Math.cos(a)), 1.5);
    }

    /** Visina gde ogrlica ide oko vrata pozadi (sa hidžabom: preko ramena) */
    get topY(): number {
        return this.hijab ? this.s.shoulderY + 0.012 : this.s.neckBaseY - 0.004;
    }

    /** Tačka na prednjem delu tela (a = 0 napred) na visini y, iznad odeće */
    point(a: number, y: number, extra = 0, out = new THREE.Vector3()): THREE.Vector3 {
        return torsoPoint(this.s, a, y, this.offAt(a, extra), out);
    }

    /** Smer napolje u tački (normala tela, okvirno) */
    normal(a: number, y: number): THREE.Vector3 {
        const p = torsoPoint(this.s, a, y, this.offAt(a), new THREE.Vector3());
        const q = torsoPoint(this.s, a, y, this.offAt(a) + 0.01, new THREE.Vector3());
        return q.sub(p).normalize();
    }

    /** Petlja ogrlice: pozadi oko vrata, napred spuštena za `drop` (m) */
    loop(drop: number, extra = 0, sharp = 2): (q: number, out: THREE.Vector3) => THREE.Vector3 {
        const top = this.topY;
        return (q, out) => {
            const a = q * Math.PI * 2;
            const f = Math.pow((1 + Math.cos(a)) / 2, sharp);
            return this.point(a, top - drop * f, extra, out);
        };
    }

    /** Vrh petlje napred (privezak, pištaljka) */
    front(drop: number, extra = 0): THREE.Vector3 {
        return this.point(0, this.topY - drop, extra);
    }

    /** Lanac ili vrpca duž petlje */
    cord(loop: (q: number, out: THREE.Vector3) => THREE.Vector3, r: number, material: THREE.Material, flatten = 1): THREE.SkinnedMesh {
        const geometry = flatten === 1
            ? ringTube(loop, r, seg(72, this.r, 24), seg(6, this.r, 4))
            : ringTube(loop, () => [r * flatten, r], seg(72, this.r, 24), seg(6, this.r, 4));
        return this.skin(geometry, material, "vrpca");
    }

    /** Geometrija u prostoru tela → prati trup */
    skin(geometry: THREE.BufferGeometry, material: THREE.Material, name = "oko-vrata"): THREE.SkinnedMesh {
        return this.ctx.kit.skinned(weighTorso(this.ctx.body.rig, geometry), material, name);
    }

    /** Spaja više geometrija (iste boje) i dodaje kao jedan deo */
    skinMany(geometries: THREE.BufferGeometry[], material: THREE.Material, name = "oko-vrata"): THREE.SkinnedMesh | null {
        if (!geometries.length) return null;
        return this.skin(mergeSimple(geometries), material, name);
    }

    /**
     * Postavlja geometriju nacrtanu oko (0, 0, 0) (lice ka +z, gore +y) na tačku `at`,
     * okrenutu po normali `n`, i vraća je (za skinMany).
     */
    orient(geometry: THREE.BufferGeometry, at: THREE.Vector3, n: THREE.Vector3, spin = 0): THREE.BufferGeometry {
        const z = n.clone().normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const x = new THREE.Vector3().crossVectors(up, z).normalize();
        const y = new THREE.Vector3().crossVectors(z, x).normalize();
        const m = new THREE.Matrix4().makeBasis(x, y, z);
        if (spin) m.multiply(new THREE.Matrix4().makeRotationZ(spin));
        m.setPosition(at);
        return geometry.applyMatrix4(m);
    }

    /** Tačke duž petlje (za perle, školjke, cvetove) sa normalom napolje */
    along(loop: (q: number, out: THREE.Vector3) => THREE.Vector3, count: number, from = 0, to = 1): { p: THREE.Vector3; n: THREE.Vector3; t: THREE.Vector3; q: number }[] {
        const out: { p: THREE.Vector3; n: THREE.Vector3; t: THREE.Vector3; q: number }[] = [];
        for (let i = 0; i < count; i++) {
            const q = (from + ((to - from) * (i + 0.5)) / count) % 1;
            const p = loop(q, new THREE.Vector3());
            const p1 = loop((q + 0.002) % 1, new THREE.Vector3());
            const t = p1.sub(p).normalize();
            const a = q * Math.PI * 2;
            const n = this.normal(a, p.y);
            out.push({ p, n, t, q });
        }
        return out;
    }

    /** Kragna/okovratnik oko vrata na visini y (traka), r1 debljina napolje, r2 visina */
    collar(y: number, r1: number, r2: number, material: THREE.Material, extra = 0): THREE.SkinnedMesh {
        const loop = (q: number, out: THREE.Vector3) => {
            const a = q * Math.PI * 2;
            return torsoPoint(this.s, a, y, extra + r1 * 0.5, out);
        };
        return this.skin(ringTube(loop, () => [r1, r2], seg(56, this.r, 20), seg(8, this.r, 4)), material, "kragna");
    }

    /** Debela meka cev duž petlje (šal, boa): poluprečnik može da se menja po petlji */
    thick(loop: (q: number, out: THREE.Vector3) => THREE.Vector3, radius: (q: number, a: number) => [number, number], material: THREE.Material, segments = 72, sides = 14): THREE.SkinnedMesh {
        return this.skin(ringTube(loop, radius, seg(segments, this.r, 24), seg(sides, this.r, 6)), material, "sal");
    }

    /** Otvorena cev kroz tačke (prostor tela) */
    tube(points: THREE.Vector3[], r: number | ((s: number) => number), material: THREE.Material, segments = 16, sides = 6, flatten = 1): THREE.SkinnedMesh {
        const radius = typeof r === "number" ? () => r : r;
        return this.skin(taperedTube(polyPath(points), radius, seg(segments, this.r, 6), seg(sides, this.r, 4), undefined, flatten), material, "traka");
    }
}

// ── Sitni oblici (oko (0, 0, 0), lice ka +z) ────────────────────────────────

/** Zvezda sa ispupčenjem */
export function starShape(r: number, inner: number, depth: number, curve = 1): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r : inner;
        const a = Math.PI / 2 + (i * Math.PI) / 5;
        if (i === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.7, bevelSize: r * 0.14, bevelSegments: 2, curveSegments: curve });
    g.translate(0, 0, -depth / 2);
    g.computeVertexNormals();
    return g;
}

export function heartShape(r: number, depth: number, curve = 8): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, -r * 0.85);
    shape.bezierCurveTo(-r * 1.25, -r * 0.05, -r * 0.85, r * 0.95, 0, r * 0.38);
    shape.bezierCurveTo(r * 0.85, r * 0.95, r * 1.25, -r * 0.05, 0, -r * 0.85);
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.8, bevelSize: r * 0.16, bevelSegments: 3, curveSegments: curve });
    g.translate(0, 0, -depth / 2);
    return g;
}

/** Školjka (lepeza sa rebrima) */
export function scallop(r: number, nu = 14, nv = 5): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    const pos: number[] = [];
    const idx: number[] = [];
    for (let j = 0; j <= nv; j++) {
        for (let i = 0; i <= nu; i++) {
            const u = i / nu;
            const v = j / nv;
            const a = -1.15 + u * 2.3;
            const rr = r * v;
            const rib = 0.12 * r * v * Math.abs(Math.sin(u * Math.PI * 7));
            pos.push(Math.sin(a) * rr, -r * 0.5 + Math.cos(a) * rr, 0.35 * r * Math.sin(v * Math.PI * 0.9) + rib);
        }
    }
    for (let j = 0; j < nv; j++) {
        for (let i = 0; i < nu; i++) {
            const a = j * (nu + 1) + i;
            idx.push(a, a + 1, a + nu + 1, a + 1, a + nu + 2, a + nu + 1);
        }
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    // Školjka je vrhom nadole (kao da visi), a lepezom nagore
    g.rotateZ(Math.PI);
    return g;
}

/** Krila mašne: spljoštena kupa koja se širi od čvora ka kraju */
export function bowWing(len: number, r0: number, r1: number, side: 1 | -1, res = 1): THREE.BufferGeometry {
    const path = polyPath([new THREE.Vector3(0, 0, 0), new THREE.Vector3(side * len * 0.55, 0, 0.001), new THREE.Vector3(side * len, 0, -0.001)]);
    return taperedTube(path, (s) => {
        const grow = r0 + (r1 - r0) * Math.pow(s, 0.7);
        return grow * (s > 0.85 ? Math.sqrt(Math.max(0.05, 1 - Math.pow((s - 0.85) / 0.15, 2))) : 1);
    }, seg(14, res, 8), seg(12, res, 8), new THREE.Vector3(0, 0, 1), 0.42);
}
