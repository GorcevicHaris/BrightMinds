// Obuća (kalup): đon iz dva sloja (gazište i međuđon), gornjište po obliku stopala tela
// (engine/body.ts footFn — isto i za šape, kopita i peraja pingvina, jer se kroji po
// shape.foot), kapica prstiju, peta, okovratnik, jezik, rupice i pertle, sare čizama koje
// prate list (Tailor.leg). Sve kruto na kostima footL/footR u njihovim koordinatama:
// pod je na y = −shape.ankleY, napred je +z, peta je na z = −foot.back.

import * as THREE from "three";
import type { BodyShape, ItemContext } from "../../contract";
import { footFn } from "../../engine/body";
import { buildSurface, polyPath, ringTube, smoothstep, taperedTube, type SurfaceFn } from "../../engine/surface";
import { footBone, gauss, res, seg, type Side } from "./common";
import { Tailor, type LimbExtra } from "./tailor";

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpD = new THREE.Vector3();

/** Ugao oko stopala (0 = prsti) i polarni ugao od vrha (0 = rist, π = taban) → (u, v) za footFn */
const uOf = (th: number) => (((th / (Math.PI * 2)) % 1) + 1) % 1;

/** Normala površine u (u, v) konačnim razlikama, okrenuta od središta stopala */
export function surfaceNormal(fn: SurfaceFn, u: number, v: number, center: THREE.Vector3, out = new THREE.Vector3()): THREE.Vector3 {
    const e = 1e-3;
    const vv = Math.min(1 - e, Math.max(e, v));
    fn(u + e, vv, tmpA).sub(fn(u - e, vv, tmpB));
    fn(u, vv + e, tmpC).sub(fn(u, vv - e, tmpD));
    out.crossVectors(tmpA, tmpC).normalize();
    const p = fn(u, vv, tmpB);
    if (out.dot(tmpC.subVectors(p, center)) < 0) out.negate();
    return out;
}

export class Shoe {
    readonly s: BodyShape;
    readonly r: number;
    readonly floor: number;
    /** Središte stopala (za smer normala) */
    readonly center: THREE.Vector3;
    /** Razmera prema dečjem stopalu (0,15 m) */
    readonly k: number;
    readonly t: Tailor;

    constructor(readonly ctx: ItemContext, readonly side: Side, readonly lift = 0) {
        this.s = ctx.body.shape;
        this.r = res(ctx);
        this.floor = -this.s.ankleY;
        this.k = this.s.foot.len / 0.15;
        this.center = new THREE.Vector3(0, this.floor + this.s.foot.h * 0.45 + lift, this.s.foot.len / 2 - this.s.foot.back);
        this.t = new Tailor(ctx);
    }

    get bone() {
        return footBone(this.side);
    }

    /** Dužina od pete do vrha prstiju i z vrha prstiju */
    get toeZ() {
        return this.s.foot.len - this.s.foot.back;
    }

    add(geometry: THREE.BufferGeometry, material: THREE.Material, name = "obuca"): THREE.Mesh {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = name;
        this.ctx.attach(this.bone, mesh);
        return mesh;
    }

    /** Površina u geometriju (normale napolje od središta stopala) */
    surface(fn: SurfaceFn, nu: number, nv: number, material: THREE.Material, closedU = true, uvScale: [number, number] = [0.3, 0.12]): THREE.Mesh {
        const c = this.center;
        return this.add(buildSurface(fn, { nu: seg(nu, this.r, 8), nv: seg(nv, this.r, 4), closedU, inside: () => c.clone(), uv: (u, v) => [u * uvScale[0], v * uvScale[1]] }), material);
    }

    /**
     * Đon: zaobljena ploča oblika stopala (superelipsoid). `base` = visina dna iznad poda,
     * `toeLift` = prsti malo podignuti (đon se „uvija” napred), `heel` = deblje pozadi.
     */
    soleFn(grow: number, height: number, toeLift = 0, base = 0, heel = 0, narrowToe = 0): SurfaceFn {
        const { len, w, back } = this.s.foot;
        const floorY = this.floor + this.lift;
        const zc = len / 2 - back;
        const e = 0.22;
        return (u, v, out) => {
            const th = u * Math.PI * 2;
            const ph = v * Math.PI;
            const sp = Math.sin(ph);
            const cp = Math.cos(ph);
            const hs = Math.sign(sp) * Math.pow(Math.abs(sp), e);
            const vs = Math.sign(cp) * Math.pow(Math.abs(cp), e);
            const dx = Math.sin(th);
            const dz = Math.cos(th);
            const ex = Math.sign(dx) * Math.pow(Math.abs(dx), 0.85);
            const ez = Math.sign(dz) * Math.pow(Math.abs(dz), 0.85);
            const width = ((w / 2) * (0.82 + 0.2 * gauss(ez, 0.45, 0.45)) + grow) * (1 - narrowToe * smoothstep(0.4, 1, ez));
            const toe = toeLift * smoothstep(0.55, 1, ez);
            const hh = height + heel * smoothstep(0.1, -0.6, ez);
            const top = floorY + base + hh;
            const bottom = floorY + base + toe;
            const y = bottom + (top - bottom) * (0.5 + vs / 2);
            return out.set(ex * width * hs, y, zc + ez * (len / 2 + grow) * hs);
        };
    }

    sole(grow: number, height: number, material: THREE.Material, options: { toeLift?: number; base?: number; heel?: number; narrowToe?: number } = {}): SurfaceFn {
        const fn = this.soleFn(grow, height, options.toeLift ?? 0, options.base ?? 0, options.heel ?? 0, options.narrowToe ?? 0);
        this.surface(fn, 32, 6, material);
        return fn;
    }

    /** Traka po boku đona na visini v ∈ (0, 1) (0 = gore) */
    soleStripe(fn: SurfaceFn, v: number, r1: number, r2: number, material: THREE.Material): void {
        this.add(ringTube((q, out) => fn(q, v, out), () => [r1, r2], seg(40, this.r, 16), 3), material, "traka-djona");
    }

    /** Gornjište: stopalo tela pomereno napolje (offset) i malo više na ristu (lift) */
    upperFn(offset: number, lift: number, options: { narrowToe?: number; toeLen?: number } = {}): SurfaceFn {
        const base = footFn(this.s, offset, lift);
        const zToe = this.toeZ;
        const L = this.lift;
        return (u, v, out) => {
            base(u, v, out);
            out.y += L;
            if (options.narrowToe) {
                const k = smoothstep(zToe * 0.3, zToe, out.z);
                out.x *= 1 - options.narrowToe * k;
            }
            if (options.toeLen) {
                const k = smoothstep(zToe * 0.2, zToe, out.z);
                out.z += options.toeLen * k;
            }
            return out;
        };
    }

    upper(fn: SurfaceFn, material: THREE.Material, nu = 32, nv = 14): THREE.Mesh {
        return this.surface(fn, nu, nv, material, true, [0.4, 0.15]);
    }

    /** Tačka na površini za ugao th (0 = prsti) i ph (0 = vrh ... π = taban), podignuta po normali */
    at(fn: SurfaceFn, th: number, ph: number, lift = 0, out = new THREE.Vector3()): THREE.Vector3 {
        const u = uOf(th);
        const v = ph / Math.PI;
        fn(u, v, out);
        if (lift) out.addScaledVector(surfaceNormal(fn, u, v, this.center, tmpD.clone()), lift);
        return out;
    }

    /**
     * Deo površine (kapica, peta, panel): th ∈ [th0, th1], ph od ph0(th) do ph1(th),
     * podignut za `lift` po normali (debljina dela).
     */
    region(fn: SurfaceFn, th0: number, th1: number, ph0: (th: number) => number, ph1: (th: number) => number, lift: number): SurfaceFn {
        const n = new THREE.Vector3();
        return (u, v, out) => {
            const th = th0 + (th1 - th0) * u;
            const ph = ph0(th) + (ph1(th) - ph0(th)) * v;
            const uu = uOf(th);
            const vv = ph / Math.PI;
            fn(uu, vv, out);
            return out.addScaledVector(surfaceNormal(fn, uu, vv, this.center, n), lift);
        };
    }

    patch(fn: SurfaceFn, th0: number, th1: number, ph0: (th: number) => number, ph1: (th: number) => number, lift: number, material: THREE.Material, nu = 16, nv = 5): SurfaceFn {
        const g = this.region(fn, th0, th1, ph0, ph1, lift);
        this.surface(g, nu, nv, material, false);
        return g;
    }

    /**
     * Tačka na gornjoj strani površine iznad (x, z) — traži se (u, v) tako da se xz poklope
     * (pertle, rupice, ukrasi). Vraća tačku i normalu.
     */
    top(fn: SurfaceFn, x: number, z: number, lift = 0): { p: THREE.Vector3; n: THREE.Vector3 } {
        let best = { u: 0, v: 0.2, d: Infinity };
        const p = new THREE.Vector3();
        for (let i = 0; i < 48; i++) {
            for (let j = 0; j <= 16; j++) {
                const u = i / 48;
                const v = (j / 16) * 0.5;
                fn(u, v, p);
                const d = (p.x - x) ** 2 + (p.z - z) ** 2;
                if (d < best.d) best = { u, v, d };
            }
        }
        // Dorada (Njutn po u, v)
        let { u, v } = best;
        for (let it = 0; it < 12; it++) {
            const e = 1e-3;
            fn(u, v, p);
            const fx = p.x - x;
            const fz = p.z - z;
            fn(u + e, v, tmpA);
            fn(u, v + e, tmpB);
            const a = (tmpA.x - p.x) / e;
            const b = (tmpB.x - p.x) / e;
            const c = (tmpA.z - p.z) / e;
            const d = (tmpB.z - p.z) / e;
            const det = a * d - b * c;
            if (Math.abs(det) < 1e-9) break;
            u -= (d * fx - b * fz) / det;
            v -= (-c * fx + a * fz) / det;
            v = Math.min(0.5, Math.max(0.002, v));
        }
        fn(u, v, p);
        const n = surfaceNormal(fn, u, v, this.center);
        return { p: p.addScaledVector(n, lift), n };
    }

    tube(points: THREE.Vector3[], r: number | ((s: number) => number), material: THREE.Material, segments = 16, sides = 6, flatten = 1): THREE.Mesh {
        const radius = typeof r === "number" ? () => r : r;
        return this.add(taperedTube(polyPath(points), radius, seg(segments, this.r, 6), seg(sides, this.r, 4), undefined, flatten), material);
    }

    /** Okovratnik oko članka (mekani rub otvora) */
    collar(r: number, tube: number, material: THREE.Material, y = 0.004, z = -0.004, tilt = 0.18): THREE.Mesh {
        const g = new THREE.TorusGeometry(r, tube, seg(10, this.r, 6), seg(36, this.r, 12));
        g.rotateX(Math.PI / 2 + tilt);
        g.scale(1, 1, 1.12);
        g.translate(0, y + this.lift, z);
        return this.add(g, material, "okovratnik");
    }

    /** Rupice i pertle preko risa (ukrštene) i mašna na vrhu */
    laces(fn: SurfaceFn, count: number, lace: THREE.Material, eyelet: THREE.Material | null, options: { z0?: number; z1?: number; spread?: number; bow?: boolean; lift?: number } = {}): void {
        const { w } = this.s.foot;
        const legR = this.s.legR(1);
        const z0 = options.z0 ?? legR * 0.9;
        const z1 = options.z1 ?? this.toeZ * 0.62;
        const spread = (options.spread ?? 0.24) * w;
        const lift = options.lift ?? 0.0012;
        const rows: { l: THREE.Vector3; r: THREE.Vector3 }[] = [];
        for (let i = 0; i < count; i++) {
            const z = z0 + ((z1 - z0) * i) / Math.max(1, count - 1);
            const narrow = 1 - 0.25 * (i / Math.max(1, count - 1));
            rows.push({ l: this.top(fn, spread * narrow, z, lift).p, r: this.top(fn, -spread * narrow, z, lift).p });
        }
        const rr = 0.002 * this.k;
        for (let i = 0; i < rows.length; i++) {
            if (eyelet) {
                for (const p of [rows[i].l, rows[i].r]) {
                    const g = new THREE.TorusGeometry(0.0026 * this.k, 0.0009 * this.k, 3, seg(6, this.r, 5));
                    const n = this.top(fn, p.x, p.z).n;
                    g.lookAt(n);
                    g.translate(p.x, p.y, p.z);
                    this.add(g, eyelet, "rupica");
                }
            }
            if (i < rows.length - 1) {
                const a = rows[i];
                const b = rows[i + 1];
                const up = (p: THREE.Vector3, q: THREE.Vector3) => p.clone().lerp(q, 0.5).add(new THREE.Vector3(0, 0.0018, 0));
                this.tube([a.l, up(a.l, b.r), b.r], rr, lace, 6, 4);
                this.tube([a.r, up(a.r, b.l), b.l], rr, lace, 6, 4);
            }
        }
        // Gornji red: vodoravna pertla i mašna
        const topRow = rows[0];
        this.tube([topRow.l, topRow.l.clone().lerp(topRow.r, 0.5).add(new THREE.Vector3(0, 0.002, 0)), topRow.r], rr, lace, 8, 5);
        if (options.bow !== false) {
            const c = topRow.l.clone().lerp(topRow.r, 0.5).add(new THREE.Vector3(0, 0.002, 0));
            for (const sx of [1, -1]) {
                const loop = new THREE.TorusGeometry(0.0065 * this.k, rr, 4, seg(10, this.r, 6));
                loop.scale(1, 0.62, 1);
                loop.rotateX(-1.1);
                loop.rotateZ(sx * 0.35);
                loop.translate(c.x + sx * 0.0065 * this.k, c.y + 0.0016, c.z - 0.001);
                this.add(loop, lace, "masna");
                const end = [c.clone(), c.clone().add(new THREE.Vector3(sx * 0.004 * this.k, -0.003, 0.008 * this.k)), c.clone().add(new THREE.Vector3(sx * 0.007 * this.k, -0.009 * this.k, 0.012 * this.k))];
                this.tube(end, rr, lace, 6, 4);
            }
        }
    }

    /**
     * Visok okovratnik oko članka (patike, cipele do članka): kratka nogavica od t0 do
     * članka u boji gornjišta, sa mekim rubom (prati nogu).
     */
    ankleCuff(t0: number, offset: number, material: THREE.Material, rim: THREE.Material | null, rimR = 0.0045): LimbExtra {
        // Dole se širi i utapa u gornjište (bez „valjka” na stopalu)
        // Meko podstavljen rub na vrhu (zadebljanje) i proširenje dole ka gornjištu
        const extra: LimbExtra = (tt, a) => offset + (0.006 + 0.004 * Math.max(0, -Math.cos(a))) * smoothstep(t0 + 0.015, 1, tt) + (rim ? 0 : 0.0035 * Math.exp(-(((tt - t0 - 0.006) / 0.008) ** 2)));
        this.t.leg(this.side, t0, 1, 0, material, extra, undefined, 24);
        if (rim) this.t.legRing(this.side, t0, extra(t0, 0) + 0.0008, rimR * this.k, rimR * 1.2 * this.k, rim, () => 0);
        return extra;
    }

    /** Jezik obuće: mekano „pero” ispred članka */
    tongue(fn: SurfaceFn, material: THREE.Material, height = 0.022): void {
        const legR = this.s.legR(1);
        const g = new THREE.SphereGeometry(1, seg(12, this.r, 8), seg(8, this.r, 6));
        g.scale(0.016 * this.k, height * this.k, 0.0055 * this.k);
        g.rotateX(-0.42);
        const base = this.top(fn, 0, legR * 0.75, 0.002).p;
        g.translate(0, base.y + height * 0.35 * this.k, base.z + 0.002);
        this.add(g, material, "jezik");
    }

    /** Jezičak na peti */
    heelTab(material: THREE.Material, h = 0.02): void {
        const g = new THREE.CapsuleGeometry(0.0045 * this.k, h * this.k, 3, seg(8, this.r, 6));
        g.scale(1.4, 1, 0.55);
        g.rotateX(0.22);
        g.translate(0, 0.004 + this.lift, -this.s.foot.back - 0.009 * this.k);
        this.add(g, material, "jezicak");
    }

    /** Sara čizme: nogavica od t0 do članka (prati list); vraća dodatak poluprečnika */
    shaft(t0: number, offset: number, material: THREE.Material, flare = 0.004): LimbExtra {
        const extra: LimbExtra = (tt) => offset + flare * smoothstep(1, t0, tt) + 0.003 * smoothstep(t0 + 0.12, 1, tt);
        this.t.leg(this.side, t0, 1, 0, material, extra, undefined, 28);
        return extra;
    }

    /** Rub sare (zadebljanje na vrhu) */
    shaftRim(t: number, extra: LimbExtra, r1: number, r2: number, material: THREE.Material): void {
        this.t.legRing(this.side, t, extra(t, 0) + 0.001, r1, r2, material, () => 0);
    }
}

/** Oba stopala */
export function pair(ctx: ItemContext, build: (shoe: Shoe) => void, lift = 0): void {
    for (const side of [1, -1] as const) build(new Shoe(ctx, side, lift));
}
