// Kroj za glavu (kape, šeširi, krune, trake, šlemovi): sve se gradi po površini glave
// lika (HeadSurface, koordinate kosti glave) i sedi na kosi (hairCrown) ili na hidžabu
// (glava je tada već uvećana). Uši životinja i rog jednoroga prolaze kroz kapu: na
// mestu gde izlaze dodaje se uredan porub (manžetna), pa izgleda kao prošiven otvor.

import * as THREE from "three";
import type { Anchors, HeadSurface, ItemContext } from "../../contract";
import { buildSurface, polyPath, ringTube, smoothstep, taperedTube, type SurfaceFn } from "../../engine/surface";
import { res, seg, TAU } from "./common";

/** Ugao oko glave: 0 = napred, + = levo od lika (+x) */
export const thetaOf = (u: number) => (u - 0.5) * TAU;
export const uOf = (th: number) => ((((th / TAU + 0.5) % 1) + 1) % 1);

/** Nešto što viri iz glave (uho, rog) — kapa pravi otvor na mestu izlaza */
export interface Protrusion {
    base: THREE.Vector3;
    tip: THREE.Vector3;
    radius: number;
    kind: "ear" | "horn";
}

/** Zapremina dela kape (za otvore): da li je tačka (koordinate kosti glave) unutra */
export type Inside = (p: THREE.Vector3) => boolean;

export class HeadFit {
    readonly head: HeadSurface;
    readonly a: Anchors;
    /** Središte glave u koordinatama kosti glave */
    readonly c: THREE.Vector3;
    /** Koliko kosa/hidžab diže kapu na temenu */
    readonly crown: number;
    /** Razmera glave prema dečjoj (širina ≈ 0,27 m) */
    readonly k: number;
    readonly r: number;
    readonly objects: THREE.Object3D[] = [];

    constructor(readonly ctx: ItemContext) {
        this.head = ctx.body.head;
        this.a = ctx.body.anchors;
        this.c = this.head.center.clone();
        this.crown = ctx.hairCrown;
        this.k = Math.max(0.8, Math.min(1.4, this.a.head.w / 0.268));
        this.r = res(ctx);
    }

    /** Broj podela po kvalitetu */
    n(count: number, min = 4): number {
        return seg(count, this.r, min);
    }

    /** Tačka iz prostora tela u koordinate kosti glave */
    local(p: THREE.Vector3): THREE.Vector3 {
        return this.ctx.toBone("head", p);
    }

    /** (u, v) površine u pravcu `d` od središta glave */
    uvOf(d: THREE.Vector3): [number, number] {
        const len = d.length() || 1;
        const th = Math.atan2(d.x, d.z);
        const ph = Math.acos(Math.max(-1, Math.min(1, d.y / len)));
        return [uOf(th), ph / Math.PI];
    }

    /** Tačka površine glave (u, v) podignuta za `lift` po normali */
    at(u: number, v: number, lift: number, out = new THREE.Vector3()): THREE.Vector3 {
        this.head.point(u, v, out);
        const n = this.head.normal(u, v, tmpN);
        return out.addScaledVector(n, lift);
    }

    /** Poluprečnik glave (od središta) u pravcu `d` */
    radiusAlong(d: THREE.Vector3): number {
        const [u, v] = this.uvOf(d);
        return this.head.point(u, v, tmpP).sub(this.c).length();
    }

    /** Dodaje deo na kost glave */
    add<T extends THREE.Object3D>(object: T): T {
        this.ctx.attach("head", object);
        this.objects.push(object);
        return object;
    }

    mesh(geometry: THREE.BufferGeometry, material: THREE.Material, name = "kapa"): THREE.Mesh {
        const m = new THREE.Mesh(geometry, material);
        m.name = name;
        return this.add(m);
    }

    /**
     * Kupola po glavi: v ide od temena (w = 0) do ivice edge(θ) (w = 1), podignuta za
     * lift(u, w) iznad površine (kosa + debljina tkanine).
     */
    domeFn(edge: (th: number) => number, lift: (u: number, w: number) => number): SurfaceFn {
        return (u, w, out) => {
            const v = w * edge(thetaOf(u));
            return this.at(u, v, lift(u, w), out);
        };
    }

    dome(edge: (th: number) => number, lift: (u: number, w: number) => number, material: THREE.Material, nu = 72, nv = 24, uvScale: [number, number] = [3, 1]): SurfaceFn {
        const fn = this.domeFn(edge, lift);
        this.mesh(buildSurface(fn, { nu: this.n(nu, 16), nv: this.n(nv, 6), closedU: true, inside: () => this.c.clone(), uv: (u, v) => [u * uvScale[0], v * uvScale[1]] }), material);
        return fn;
    }

    /** Zapremina kupole (za otvore za uši) */
    domeInside(edge: (th: number) => number, lift: number): Inside {
        return (p) => {
            const d = tmpD.subVectors(p, this.c);
            const [u, v] = this.uvOf(d);
            if (v > edge(thetaOf(u)) + 0.01) return false;
            return d.length() < this.radiusAlong(d) + lift;
        };
    }

    /** Zakrpa na kupoli (nalepnica, šara): u ∈ [u0, u1], w ∈ [w0, w1] */
    domePatch(fn: SurfaceFn, u0: number, u1: number, w0: number, w1: number, lift: number, material: THREE.Material): THREE.Mesh {
        const n = new THREE.Vector3();
        const geo = buildSurface((s, t, out) => {
            const u = u0 + (u1 - u0) * s;
            const w = w0 + (w1 - w0) * t;
            fn(u, w, out);
            n.copy(out).sub(this.c).normalize();
            return out.addScaledVector(n, lift);
        }, { nu: this.n(12, 4), nv: this.n(12, 4), inside: () => this.c.clone(), uv: (s, t) => [s, 1 - t] });
        return this.mesh(geo, material, "zakrpa");
    }

    /** Prsten po ivici kupole (obod, traka) */
    rim(loop: (q: number, out: THREE.Vector3) => THREE.Vector3, r1: number, r2: number, material: THREE.Material, segments = 72): THREE.Mesh {
        return this.mesh(ringTube(loop, () => [r1, r2], this.n(segments, 16), this.n(8, 4)), material, "obod");
    }

    /**
     * Prsten na kome kruti šešir sedi: visina v napred/sa strane/pozadi (čelo niže od
     * potiljka), podignut za `lift`. q ∈ [0, 1] kao u (0,5 = napred).
     */
    seat(vFront: number, vSide: number, vBack: number, lift: number): (q: number, out: THREE.Vector3) => THREE.Vector3 {
        return (q, out) => {
            const th = thetaOf(q);
            const c = Math.cos(th);
            const v = c >= 0 ? vSide + (vFront - vSide) * c * c : vSide + (vBack - vSide) * c * c;
            return this.at(q, v, lift, out);
        };
    }

    /**
     * Prsten oko pravca `axis` (od središta glave) ugaonog poluprečnika `alpha`: krug na
     * glavi na kome sedi šešir nagnut napred/nazad. q = 0,5 je napred.
     */
    seatAround(axis: THREE.Vector3, alpha: number, lift: number): (q: number, out: THREE.Vector3) => THREE.Vector3 {
        const z = axis.clone().normalize();
        const e1 = new THREE.Vector3(1, 0, 0).addScaledVector(z, -z.x).normalize();
        const e2 = new THREE.Vector3().crossVectors(z, e1).normalize();
        // e2 gleda napred (+z) za uspravnu osu
        if (e2.z < 0) e2.negate();
        const d = new THREE.Vector3();
        return (q, out) => {
            const phi = thetaOf(q);
            d.copy(z).multiplyScalar(Math.cos(alpha)).addScaledVector(e1, Math.sin(alpha) * Math.sin(phi)).addScaledVector(e2, Math.sin(alpha) * Math.cos(phi));
            const [u, v] = this.uvOf(d);
            return this.at(u, v, lift, out);
        };
    }

    /**
     * Gde kruti šešir sedi: kod ljudi na prstenu (čelo–potiljak); kod životinja sa ušima
     * ili rogom bira nagib ose tako da šešir stane između/iza njih, i po potrebi ga
     * smanjuje (razmera `s`). Vraća prsten, osu i razmeru.
     */
    rigidSeat(vFront: number, vSide: number, vBack: number, lift: number, maxPitch = 0.55): { loop: (q: number, out: THREE.Vector3) => THREE.Vector3; axis: THREE.Vector3; s: number } {
        const prot = this.protrusions(true, true);
        if (!prot.length) {
            return { loop: this.seat(vFront, vSide, vBack, lift), axis: new THREE.Vector3(0, 1, 0), s: 1 };
        }
        // Puna veličina: ugao ≈ v sa strane (od temena)
        const alpha0 = vSide * Math.PI;
        let best = { axis: new THREE.Vector3(0, 1, 0), alpha: 0 };
        for (let i = 0; i <= 24; i++) {
            const pitch = -maxPitch + (i / 24) * (maxPitch + Math.min(0.35, maxPitch));
            const axis = new THREE.Vector3(0, Math.cos(pitch), Math.sin(pitch));
            let alpha = alpha0;
            for (const p of prot) {
                const d = p.base.clone().sub(this.c);
                const ang = Math.acos(Math.max(-1, Math.min(1, d.clone().normalize().dot(axis))));
                const margin = Math.asin(Math.min(0.9, (p.radius + 0.008) / Math.max(0.05, d.length()))) + 0.05;
                alpha = Math.min(alpha, ang - margin);
            }
            // Prednost: što veći šešir, pa što manji nagib
            const score = alpha - Math.abs(pitch) * 0.45;
            const bestScore = best.alpha - Math.abs(Math.atan2(best.axis.z, best.axis.y)) * 0.45;
            if (score > bestScore) best = { axis, alpha };
        }
        const alpha = Math.max(0.34, best.alpha);
        const s = Math.max(0.42, Math.min(1, Math.sin(alpha) / Math.sin(alpha0)));
        return { loop: this.seatAround(best.axis, alpha, lift), axis: best.axis, s };
    }

    /** Središte prstena (prosečna tačka) */
    ringCenter(loop: (q: number, out: THREE.Vector3) => THREE.Vector3): THREE.Vector3 {
        const c = new THREE.Vector3();
        const p = new THREE.Vector3();
        for (let i = 0; i < 32; i++) c.add(loop(i / 32, p));
        return c.divideScalar(32);
    }

    /**
     * Telo krutog šešira od prstena naviše: profile(t) → [razmera, visina] (t ∈ [0, 1]);
     * dno prati prsten (nagnut), vrh je vodoravan na visini `top` iznad središta prstena.
     * `tilt` naginje osu nazad (rad). Vraća površinu i proveru zapremine.
     */
    crownBody(loop: (q: number, out: THREE.Vector3) => THREE.Vector3, profile: (t: number) => [number, number], options: { tilt?: number; lean?: THREE.Vector3; axis?: THREE.Vector3 } = {}): { fn: SurfaceFn; inside: Inside; center: THREE.Vector3; axis: THREE.Vector3; top: THREE.Vector3 } {
        const center = this.ringCenter(loop);
        const axis = options.axis ? options.axis.clone().normalize() : new THREE.Vector3(0, Math.cos(options.tilt ?? 0), -Math.sin(options.tilt ?? 0)).normalize();
        if (options.lean) axis.add(options.lean).normalize();
        const base = new THREE.Vector3();
        const off = new THREE.Vector3();
        const [, topH] = profile(1);
        const fn: SurfaceFn = (q, t, out) => {
            loop(q, base);
            // Pomeraj od ose u visini tačke prstena
            const along = base.clone().sub(center).dot(axis);
            off.copy(base).sub(center).addScaledVector(axis, -along);
            const [s, h] = profile(t);
            // Dno prati prsten; vrh se izravnava
            const blend = smoothstep(0, 1, t);
            const height = along * (1 - blend) + h;
            return out.copy(center).addScaledVector(axis, height).addScaledVector(off, s);
        };
        const top = center.clone().addScaledVector(axis, topH);
        const inside: Inside = (p) => {
            const d = tmpD.subVectors(p, center);
            const h = d.dot(axis);
            if (h < -0.03 || h > topH) return false;
            const radial = d.clone().addScaledVector(axis, -h);
            const ang = Math.atan2(radial.x, radial.z);
            const edgeP = fn(uOf(ang), Math.max(0, Math.min(1, h / Math.max(1e-6, topH))), tmpP);
            const edgeR = edgeP.sub(center).addScaledVector(axis, -edgeP.clone().sub(center).dot(axis)).length();
            return radial.length() < edgeR;
        };
        return { fn, inside, center, axis, top };
    }

    /** Ravan/zaobljen poklopac na vrhu tela šešira (lepeza od ivice t = 1 ka sredini) */
    cap(fn: SurfaceFn, top: THREE.Vector3, dome: number, material: THREE.Material, axis = new THREE.Vector3(0, 1, 0)): THREE.Mesh {
        const edge = new THREE.Vector3();
        const geo = buildSurface((q, r, out) => {
            fn(q, 1, edge);
            const k = 1 - r;
            out.copy(top).lerp(edge, k);
            return out.addScaledVector(axis, dome * (1 - k * k));
        }, { nu: this.n(64, 16), nv: this.n(6, 3), closedU: true, inside: () => top.clone().addScaledVector(axis, -0.05) });
        return this.mesh(geo, material, "vrh");
    }

    /**
     * Obod (krilo) šešira oko prstena: width(q) koliko izlazi, droop(q, r) koliko pada
     * (+ gore), debljina `thick`. Gornja i donja strana + zaobljena ivica.
     */
    brim(loop: (q: number, out: THREE.Vector3) => THREE.Vector3, width: (q: number) => number, droop: (q: number, r: number) => number, thick: number, top: THREE.Material, under: THREE.Material = top, edgeMat: THREE.Material = top, nu = 72, nv = 7, up = new THREE.Vector3(0, 1, 0)): { fn: (q: number, r: number, side: number, out: THREE.Vector3) => THREE.Vector3; inside: Inside } {
        const center = this.ringCenter(loop);
        const base = new THREE.Vector3();
        const out2 = new THREE.Vector3();
        const axis = up.clone().normalize();
        const fn = (q: number, r: number, side: number, out: THREE.Vector3) => {
            loop(q, base);
            out2.copy(base).sub(center);
            out2.addScaledVector(axis, -out2.dot(axis)).normalize();
            out.copy(base).addScaledVector(out2, r * width(q));
            out.addScaledVector(axis, droop(q, r) + side * thick * 0.5 * (1 - 0.35 * r));
            return out;
        };
        const opts = (side: number) => ({ nu: this.n(nu, 24), nv: this.n(nv, 4), closedU: true, inside: (q: number, r: number, o: THREE.Vector3) => fn(q, r, 0, o).add(new THREE.Vector3(0, -side * 0.05, 0)) });
        this.mesh(buildSurface((q, r, out) => fn(q, r, 1, out), opts(1)), top, "obod-gore");
        this.mesh(buildSurface((q, r, out) => fn(q, r, -1, out), opts(-1)), under, "obod-dole");
        this.rim((q, out) => fn(q, 1, 0, out), thick * 0.55, thick * 0.6, edgeMat, nu);
        const inside: Inside = (p) => {
            const d = tmpD.copy(p).sub(center);
            const h = d.dot(axis);
            d.addScaledVector(axis, -h);
            // Ugao oko ose: najbliži q tražimo po pravcu (prsten je skoro krug)
            let best = 0;
            let bestDot = -2;
            const dn = d.clone().normalize();
            for (let i = 0; i < 48; i++) {
                const qq = i / 48;
                loop(qq, base);
                const o = base.clone().sub(center);
                o.addScaledVector(axis, -o.dot(axis)).normalize();
                const dot = o.dot(dn);
                if (dot > bestDot) {
                    bestDot = dot;
                    best = qq;
                }
            }
            loop(best, base);
            const rb = base.clone().sub(center);
            const r0 = rb.addScaledVector(axis, -rb.dot(axis)).length();
            const r = (d.length() - r0) / Math.max(1e-6, width(best));
            if (r < 0 || r > 1) return false;
            const y = fn(best, r, 0, out2).sub(center).dot(axis);
            return Math.abs(h - y) < thick * 0.6 + 0.004;
        };
        return { fn, inside };
    }

    /**
     * Uši i rog koji vire (koordinate kosti glave); ljudsko uho ne viri iz kape. `upright`:
     * samo uspravne uši (šiljate, visoke) — okrugle i klempave mogu ispod šešira.
     */
    protrusions(includeHorn = true, upright = false): Protrusion[] {
        const list: Protrusion[] = [];
        const e = this.a.ears;
        const skip = e.kind === "human" || e.kind === "none" || (upright && (e.kind === "round" || e.kind === "floppy"));
        if (!skip) {
            for (const [b, t] of [[e.left, e.tipL], [e.right, e.tipR]] as const) {
                if (b.distanceTo(t) < 0.01) continue;
                list.push({ base: this.local(b), tip: this.local(t), radius: Math.max(0.012, e.radius * 0.85), kind: "ear" });
            }
        }
        if (includeHorn && this.a.horn) list.push({ base: this.local(this.a.horn.base), tip: this.local(this.a.horn.tip), radius: this.a.horn.radius, kind: "horn" });
        return list;
    }

    /**
     * Otvori: za svako uho/rog nađe gde izlazi iz zapremine kape i tu stavi porub
     * (prsten oko uha, malo spljošten). Vraća broj otvora.
     */
    openings(inside: Inside | Inside[], material: THREE.Material, options: { tube?: number; includeHorn?: boolean } = {}): number {
        const tests = Array.isArray(inside) ? inside : [inside];
        const isIn = (p: THREE.Vector3) => tests.some((f) => f(p));
        let count = 0;
        for (const pr of this.protrusions(options.includeHorn ?? true)) {
            const dir = pr.tip.clone().sub(pr.base);
            const len = dir.length();
            dir.normalize();
            const steps = 48;
            let prev = isIn(pr.base.clone().addScaledVector(dir, -0.004));
            for (let i = 1; i <= steps; i++) {
                const t = (i / steps) * len * 0.92;
                const p = pr.base.clone().addScaledVector(dir, t);
                const now = isIn(p);
                if (prev !== now) {
                    // Uho se sužava ka vrhu
                    const rr = pr.radius * (pr.kind === "horn" ? 1 - (t / len) * 0.8 : 1 - (t / len) * 0.45) + 0.004;
                    const tube = (options.tube ?? 0.0045) * this.k;
                    const ring = new THREE.TorusGeometry(rr, tube, this.n(8, 4), this.n(24, 10));
                    ring.scale(1, pr.kind === "ear" ? 0.62 : 1, 1);
                    const m = new THREE.Mesh(ring, material);
                    m.name = "otvor";
                    m.position.copy(p);
                    // Prsten je u ravni xy, osa z → pravac uha (spljošten: uho je pljosnato)
                    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
                    this.add(m);
                    count++;
                }
                prev = now;
            }
        }
        return count;
    }

    /**
     * Traka preko glave od uha do uha (tijara, traka sa ušima): ugao φ od leve strane (−1)
     * preko temena (0) do desne (1); `tilt` naginje traku napred (rad). Tačka podignuta za lift.
     */
    bandPoint(s: number, tilt: number, lift: number, out = new THREE.Vector3(), reach = 0.82): THREE.Vector3 {
        const phi = s * (Math.PI / 2) * reach;
        const d = tmpD.set(Math.sin(phi), Math.cos(phi) * Math.cos(tilt), Math.cos(phi) * Math.sin(tilt));
        const [u, v] = this.uvOf(d);
        return this.at(u, v, lift, out);
    }

    /** Normala trake (napolje od glave) */
    bandNormal(s: number, tilt: number, out = new THREE.Vector3(), reach = 0.82): THREE.Vector3 {
        const phi = s * (Math.PI / 2) * reach;
        const d = tmpD.set(Math.sin(phi), Math.cos(phi) * Math.cos(tilt), Math.cos(phi) * Math.sin(tilt));
        const [u, v] = this.uvOf(d);
        return this.head.normal(u, v, out);
    }

    /** Traka za kosu: spljoštena cev po glavi od uha do uha */
    headband(tilt: number, lift: number, width: number, thick: number, material: THREE.Material, reach = 0.82): (s: number, out: THREE.Vector3) => THREE.Vector3 {
        const path = (s: number, out: THREE.Vector3) => this.bandPoint(s * 2 - 1, tilt, lift + thick, out, reach);
        const fwd = (s: number, out: THREE.Vector3) => this.bandNormal(s * 2 - 1, tilt, out, reach);
        // Presek: tanko po normali (debljina), široko duž glave
        const geo = taperedTube(path, (s) => width * (0.75 + 0.25 * Math.sin(Math.PI * s)), this.n(48, 16), this.n(10, 6), fwd, thick / width);
        this.mesh(geo, material, "traka");
        return path;
    }
}

const tmpN = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpD = new THREE.Vector3();

// ── Male gotove forme ───────────────────────────────────────────────────────

/** Pompon (kićanka): sfera sa grudvicama (nije savršeno okrugla) */
export function pompom(radius: number, detail = 1): THREE.BufferGeometry {
    const geo = new THREE.SphereGeometry(radius, Math.round(28 * detail), Math.round(20 * detail));
    const p = geo.getAttribute("position");
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const n = v.clone().normalize();
        const bump = 1 + 0.06 * Math.sin(n.x * 13 + n.y * 7) * Math.sin(n.z * 11 - n.y * 5) + 0.035 * Math.sin(n.x * 29 + n.z * 31);
        v.copy(n).multiplyScalar(radius * bump);
        p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
}

/** Cvet od latica (spljoštene sfere) i sredine, okrenut ka +z; poluprečnik r */
export function flowerGeometry(r: number, petals = 5, detail = 1): { petals: THREE.BufferGeometry; middle: THREE.BufferGeometry } {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < petals; i++) {
        const a = (i / petals) * TAU;
        const g = new THREE.SphereGeometry(1, Math.round(12 * detail), Math.round(8 * detail));
        g.scale(r * 0.42, r * 0.3, r * 0.16);
        g.translate(r * 0.55, 0, 0);
        g.rotateZ(a);
        // Latice blago udubljene ka sredini (čašica)
        g.translate(0, 0, r * 0.04);
        parts.push(g);
    }
    const middle = new THREE.SphereGeometry(r * 0.3, Math.round(14 * detail), Math.round(10 * detail));
    middle.scale(1, 1, 0.7);
    middle.translate(0, 0, r * 0.12);
    return { petals: mergeGeometries(parts), middle };
}

/** Spaja geometrije sa istim atributima (position, normal, uv) */
export function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const list = geos.map((g) => (g.index ? g.toNonIndexed() : g));
    const count = list.reduce((n, g) => n + g.getAttribute("position").count, 0);
    const pos = new Float32Array(count * 3);
    const nor = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    let at = 0;
    for (const g of list) {
        const p = g.getAttribute("position");
        if (!g.getAttribute("normal")) g.computeVertexNormals();
        const n = g.getAttribute("normal");
        const t = g.getAttribute("uv");
        pos.set(p.array as ArrayLike<number>, at * 3);
        nor.set(n.array as ArrayLike<number>, at * 3);
        if (t) uv.set(t.array as ArrayLike<number>, at * 2);
        at += p.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    out.computeBoundingSphere();
    return out;
}

/** Postavlja geometriju u tačku `at` sa osom +z ka `dir` (i opcionim okretom oko nje) */
export function orient(geo: THREE.BufferGeometry, at: THREE.Vector3, dir: THREE.Vector3, spin = 0, up?: THREE.Vector3): THREE.BufferGeometry {
    const q = new THREE.Quaternion();
    if (up) {
        const z = dir.clone().normalize();
        const x = new THREE.Vector3().crossVectors(up, z).normalize();
        const y = new THREE.Vector3().crossVectors(z, x);
        q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    } else {
        q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
    }
    if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spin));
    geo.applyQuaternion(q);
    geo.translate(at.x, at.y, at.z);
    return geo;
}

/** Cev kroz tačke (stabljika, antena, vrpca) */
export function tube(points: THREE.Vector3[], radius: number | ((s: number) => number), segments = 24, sides = 8, flatten = 1): THREE.BufferGeometry {
    return taperedTube(polyPath(points), typeof radius === "number" ? () => radius : radius, segments, sides, undefined, flatten);
}

/**
 * Lathe (obrtno telo) oko ose y: profil [poluprečnik, visina] od dna ka vrhu. Za kupe,
 * pompone na štapu, dršku propelera.
 */
export function lathe(points: [number, number][], segments = 32): THREE.BufferGeometry {
    return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(1e-4, r), y)), segments);
}
