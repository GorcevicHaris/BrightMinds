// Krojač: isti kroj kao engine/kit.ts (ljuske trupa, rukavi, nogavice, porubi), ali sa
// brojem podela koji predmet bira (budžet trouglova, sličice sa pola podela) i sa
// sitnim delovima koji PRATE telo (dugmad, štepovi, rajsferšlus — SkinnedMesh, ne kruto).

import * as THREE from "three";
import type { BodyShape, ItemContext } from "../../contract";
import { armPath, legPath, limbSurface, torsoPoint, torsoSurface, type LimbExtra, type TorsoExtra } from "../../engine/body";
import { armWeights, legWeights, torsoWeights, type Rig } from "../../engine/rig";
import { buildSurface, polyPath, ringTube, sweepFn, taperedTube, type SurfaceFn } from "../../engine/surface";
import { res, seg, weighTorso, type Side } from "./common";

export type { LimbExtra, TorsoExtra } from "../../engine/body";

/** Debljina odeće po sloju (koliko je ljuska iznad kože) */
export const LAYER = { under: 0.004, bottom: 0.0065, top: 0.0135, outer: 0.024, coat: 0.03 } as const;

export class Tailor {
    readonly s: BodyShape;
    readonly rig: Rig;
    /** Umnožak podela (1 ili 0,5) */
    readonly r: number;

    /** `budget` < 1 smanjuje gustinu (kostimi od više slojeva, da ostanu u budžetu) */
    constructor(readonly ctx: ItemContext, budget = 1) {
        this.s = ctx.body.shape;
        this.rig = ctx.body.rig;
        this.r = res(ctx) * budget;
    }

    get kit() {
        return this.ctx.kit;
    }

    private torsoW = (_u: number, _v: number, p: THREE.Vector3) => torsoWeights(this.s, p);

    /** Tačka na trupu (ugao a: 0 = napred, π/2 = levo od lika) */
    point(a: number, y: number, offset: number, extra?: TorsoExtra, out = new THREE.Vector3()): THREE.Vector3 {
        return torsoPoint(this.s, a, y, offset, out, extra);
    }

    /** Ljuska trupa od y0 do y1 (granice mogu zavisiti od ugla: izrez, porub) */
    torso(y0: number | ((a: number) => number), y1: number | ((a: number) => number), offset: number, material: THREE.Material, extra?: TorsoExtra, nv = 40, nu = 52): THREE.SkinnedMesh {
        const fn = torsoSurface(this.s, y0, y1, offset, extra);
        const geometry = buildSurface(fn, {
            nu: seg(nu, this.r, 16),
            nv: seg(nv, this.r, 6),
            closedU: true,
            inside: (u, v, out) => {
                fn(u, v, out);
                return out.set(0, out.y, 0);
            },
            weights: this.torsoW,
            uv: (u, v) => {
                const lo = typeof y0 === "number" ? y0 : y0(u * Math.PI * 2);
                const hi = typeof y1 === "number" ? y1 : y1(u * Math.PI * 2);
                return [u * 0.7, lo + (hi - lo) * v];
            },
        });
        return this.kit.skinned(geometry, material, "trup-odeca");
    }

    /** Porub/okovratnik po ivici trupa na visini y(a); r1 = debljina napolje, r2 = visina */
    ring(y: number | ((a: number) => number), offset: number, r1: number, r2: number, material: THREE.Material, extra?: TorsoExtra, segments = 56, sides = 6): THREE.SkinnedMesh {
        const p = new THREE.Vector3();
        const loop = (q: number, out: THREE.Vector3) => {
            const a = q * Math.PI * 2;
            const yy = typeof y === "number" ? y : y(a);
            return out.copy(torsoPoint(this.s, a, yy, offset + r1 * 0.4, p, extra));
        };
        return this.kit.skinned(ringTube(loop, () => [r1, r2], seg(segments, this.r, 16), seg(sides, this.r, 4), this.torsoW), material, "porub");
    }

    /** Zakrpa na trupu (džep, lajsna, nalepnica): a ∈ [a0, a1], y ∈ [y0, y1] */
    patch(a0: number, a1: number, y0: number, y1: number, offset: number, material: THREE.Material, options: { puff?: number; soft?: number; shapeA?: (v: number) => [number, number]; nu?: number; nv?: number } = {}): THREE.SkinnedMesh {
        return this.kit.torsoPatch(a0, a1, y0, y1, offset, material, { ...options, nu: seg(options.nu ?? 16, this.r, 2), nv: seg(options.nv ?? 12, this.r, 2) });
    }

    /** Rukav od t0 do t1 (0 = rame, 1 = zglob šake) */
    sleeve(side: Side, t0: number, t1: number, offset: number, material: THREE.Material, extra?: LimbExtra, nu = 24): THREE.SkinnedMesh {
        const rig = this.rig;
        const arm = armPath(rig, side, offset, extra);
        const fn = limbSurface(arm, t0, t1);
        const geometry = buildSurface(fn, {
            nu: seg(nu, this.r, 10),
            nv: seg(Math.max(8, 34 * (t1 - Math.max(0, t0) + 0.15)), this.r, 5),
            closedU: true,
            inside: (_u, v, out) => arm.spec.path(t0 <= 0 ? v * arm.sAt(t1) : arm.sAt(t0 + (t1 - t0) * v), out),
            weights: (_u, _v, p) => armWeights(rig, side, p),
            uv: (u, v) => [u * 0.2, v * 0.3],
        });
        return this.kit.skinned(geometry, material, "rukav");
    }

    /** Prsten oko ruke na udelu t (rub rukava, manžetna) */
    armRing(side: Side, t: number, offset: number, r1: number, r2: number, material: THREE.Material, extra?: LimbExtra): THREE.SkinnedMesh {
        const rig = this.rig;
        const arm = armPath(rig, side, offset + r1 * 0.4, extra);
        const fn = sweepFn(arm.spec);
        const s = arm.sAt(t);
        return this.kit.skinned(ringTube((q, out) => fn(q, s, out), () => [r1, r2], seg(32, this.r, 12), seg(7, this.r, 4), (_u, _v, p) => armWeights(rig, side, p)), material, "manzetna");
    }

    /** Nogavica od t0 do t1 (0 = kuk, 1 = članak); `uRange` = samo traka (šav, lampas) */
    leg(side: Side, t0: number, t1: number, offset: number, material: THREE.Material, extra?: LimbExtra, uRange?: [number, number], nu = 26): THREE.SkinnedMesh {
        const rig = this.rig;
        const leg = legPath(rig, side, offset, extra);
        const base = limbSurface(leg, t0, t1);
        const fn: SurfaceFn = uRange ? (u, v, out) => base(uRange[0] + (uRange[1] - uRange[0]) * u, v, out) : base;
        const geometry = buildSurface(fn, {
            nu: uRange ? 3 : seg(nu, this.r, 10),
            nv: seg(Math.max(8, 36 * (t1 - Math.max(0, t0) + 0.1)), this.r, 5),
            closedU: !uRange,
            inside: (_u, v, out) => leg.spec.path(t0 <= 0 ? v * leg.sAt(t1) : leg.sAt(t0 + (t1 - t0) * v), out),
            weights: (_u, _v, p) => legWeights(rig, side, p),
            uv: (u, v) => [u * 0.25, v * 0.5],
        });
        return this.kit.skinned(geometry, material, "nogavica");
    }

    legRing(side: Side, t: number, offset: number, r1: number, r2: number, material: THREE.Material, extra?: LimbExtra): THREE.SkinnedMesh {
        const rig = this.rig;
        const leg = legPath(rig, side, offset + r1 * 0.4, extra);
        const fn = sweepFn(leg.spec);
        const s = leg.sAt(t);
        return this.kit.skinned(ringTube((q, out) => fn(q, s, out), () => [r1, r2], seg(36, this.r, 12), seg(7, this.r, 4), (_u, _v, p) => legWeights(rig, side, p)), material, "porub-nogavice");
    }

    /** Tačka na nogavici (t duž noge, a oko: 0 = napred) */
    legPoint(side: Side, t: number, a: number, offset: number, extra?: LimbExtra, out = new THREE.Vector3()): THREE.Vector3 {
        const leg = legPath(this.rig, side, offset, extra);
        return sweepFn(leg.spec)(a / (Math.PI * 2), leg.sAt(t), out);
    }

    armPoint(side: Side, t: number, a: number, offset: number, extra?: LimbExtra, out = new THREE.Vector3()): THREE.Vector3 {
        const arm = armPath(this.rig, side, offset, extra);
        return sweepFn(arm.spec)(a / (Math.PI * 2), arm.sAt(t), out);
    }

    /** Karlica pantalona (od međunožja do pojasa) */
    pelvis(top: number, offset: number, material: THREE.Material, extra?: TorsoExtra): THREE.SkinnedMesh {
        return this.torso(this.s.crotchY - 0.018, top, offset, material, extra, 14);
    }

    /** Suknja/zvono (kit.skirt) sa podelama po budžetu */
    skirt(yTop: number, yBot: number | ((a: number) => number), offset: number, hem: { rx: number; rz: number }, material: THREE.Material, folds?: (a: number, v: number) => number, nv = 30, flare = 1.6) {
        return this.kit.skirt(yTop, yBot, offset, hem, material, folds, Math.max(8, nv), flare, Math.max(0.35, this.r));
    }

    /** Porub po zatvorenoj ivici (suknja, kaput) — gustina po budžetu */
    edgeRing(edge: (q: number, out: THREE.Vector3) => THREE.Vector3, r1: number, r2: number, material: THREE.Material): THREE.SkinnedMesh {
        return this.kit.skinned(ringTube(edge, () => [r1, r2], seg(80, this.r, 24), seg(6, this.r, 4), this.torsoW), material, "porub-suknje");
    }

    /** Šav ili štep po trupu (tačke (a, y)) — tanka cev koja prati telo */
    stitch(points: [number, number][], offset: number, material: THREE.Material, r = 0.0011, extra?: TorsoExtra): THREE.SkinnedMesh {
        const world = points.map(([a, y]) => torsoPoint(this.s, a, y, offset, new THREE.Vector3(), extra));
        const geometry = taperedTube(polyPath(world), () => r, seg(Math.max(12, points.length * 4), this.r, 6), seg(5, this.r, 3));
        return this.kit.skinned(weighTorso(this.rig, geometry), material, "step");
    }

    /** Pljosnata traka po trupu (tregeri, kaiš preko grudi): širina `width`, debljina `thick` */
    strap(points: [number, number][], offset: number, material: THREE.Material, width = 0.012, thick = 0.003, extra?: TorsoExtra): THREE.SkinnedMesh {
        const world = points.map(([a, y]) => torsoPoint(this.s, a, y, offset, new THREE.Vector3(), extra));
        const path = polyPath(world);
        const tmp = new THREE.Vector3();
        // „Napred” preseka je napolje od ose tela, pa je traka položena po telu
        const outward = (s: number, out: THREE.Vector3) => {
            path(s, tmp);
            return out.set(tmp.x, 0, tmp.z).normalize();
        };
        const geometry = taperedTube(path, () => width / 2, seg(Math.max(16, points.length * 3), this.r, 8), seg(6, this.r, 4), outward, thick / width);
        return this.kit.skinned(weighTorso(this.rig, geometry), material, "traka");
    }

    /** Vodoravni štep po celom obimu na visini y(a) */
    stitchRing(y: number | ((a: number) => number), offset: number, material: THREE.Material, r = 0.001, extra?: TorsoExtra): THREE.SkinnedMesh {
        const p = new THREE.Vector3();
        const loop = (q: number, out: THREE.Vector3) => {
            const a = q * Math.PI * 2;
            return out.copy(torsoPoint(this.s, a, typeof y === "number" ? y : y(a), offset, p, extra));
        };
        return this.kit.skinned(ringTube(loop, r, seg(48, this.r, 16), 3, this.torsoW), material, "step");
    }

    /** Dugme na trupu: valjak sa zaobljenom ivicom i dve rupice (utisak) */
    button(a: number, y: number, offset: number, material: THREE.Material, r = 0.0055, extra?: TorsoExtra): THREE.SkinnedMesh {
        const p = torsoPoint(this.s, a, y, offset, new THREE.Vector3(), extra);
        const q = torsoPoint(this.s, a, y, offset + 0.01, new THREE.Vector3(), extra);
        const geometry = new THREE.CylinderGeometry(r, r * 0.92, r * 0.5, seg(16, this.r, 8), 1);
        geometry.rotateX(Math.PI / 2);
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), q.sub(p).normalize());
        geometry.applyQuaternion(quat);
        geometry.translate(p.x, p.y, p.z);
        return this.kit.skinned(weighTorso(this.rig, geometry), material, "dugme");
    }

    /** Rajsferšlus napred: traka sa zupcima (sitna rebra) i klizač */
    zipper(yBot: number, yTop: number, offset: number, tape: THREE.Material, metal: THREE.Material, extra?: TorsoExtra): void {
        this.patch(-0.035, 0.035, yBot, yTop, offset + 0.0006, tape, { nu: 2, nv: 10 });
        const teeth: THREE.BufferGeometry[] = [];
        const n = Math.max(6, Math.round((yTop - yBot) / 0.006));
        for (let i = 0; i <= n; i++) {
            const y = yBot + ((yTop - yBot) * i) / n;
            const p = torsoPoint(this.s, 0, y, offset + 0.0012, new THREE.Vector3(), extra);
            const tooth = new THREE.BoxGeometry(0.007, 0.0022, 0.0018);
            tooth.translate(p.x + (i % 2 ? 0.0012 : -0.0012), p.y, p.z);
            teeth.push(tooth);
        }
        const merged = mergeSimple(teeth);
        this.kit.skinned(weighTorso(this.rig, merged), metal, "rajsferslus");
        const top = torsoPoint(this.s, 0, yTop - 0.012, offset + 0.003, new THREE.Vector3(), extra);
        const pull = new THREE.BoxGeometry(0.008, 0.016, 0.003);
        pull.translate(top.x, top.y - 0.006, top.z);
        this.kit.skinned(weighTorso(this.rig, pull), metal, "klizac");
    }
}

/** Spaja jednostavne geometrije (iste atribute: position, normal, uv) */
export function mergeSimple(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const parts = geometries.map((g) => (g.index ? g.toNonIndexed() : g));
    const count = parts.reduce((n, g) => n + g.getAttribute("position").count, 0);
    const pos = new Float32Array(count * 3);
    const nor = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    let at = 0;
    for (const g of parts) {
        const p = g.getAttribute("position");
        const n = g.getAttribute("normal");
        const t = g.getAttribute("uv");
        pos.set(p.array as ArrayLike<number>, at * 3);
        if (n) nor.set(n.array as ArrayLike<number>, at * 3);
        if (t) uv.set(t.array as ArrayLike<number>, at * 2);
        at += p.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    out.computeBoundingSphere();
    for (const g of geometries) g.dispose();
    return out;
}
