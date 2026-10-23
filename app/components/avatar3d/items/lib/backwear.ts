// Na leđima: koliko je odeća ispod debela (ranac, plašt i krila sede PREKO nje), ranac sa
// kaiševima koji prate telo, plašt koji pada od ramena (rascep oko repa) i par krila
// koja blago mašu. Sve se oslanja na sidra lika (leđa, ramena, rep), pa staje svakome.

import * as THREE from "three";
import type { ItemContext } from "../../contract";
import { torsoPoint } from "../../engine/body";
import { buildSurface, polyPath, smoothstep, taperedTube } from "../../engine/surface";
import { attachAt, res, seg, skinnedTorso, type Side } from "./common";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** Debljina odeće ispod (na trupu i oko vrata), po predmetu koji lik nosi */
export function bulk(ctx: ItemContext): { body: number; neck: number } {
    const id = ctx.wear.outfit ?? "";
    let body = 0.017;
    let neck = 0.014;
    if (!id) {
        body = 0.017;
        neck = 0.014;
    } else if (/duks/.test(id)) {
        body = 0.03;
        neck = 0.062;
    } else if (/jakna/.test(id)) {
        body = 0.043;
        neck = 0.04;
    } else if (/kabanica/.test(id)) {
        body = 0.033;
        neck = 0.04;
    } else if (/kostim-(mede|dinosaurusa)/.test(id)) {
        body = 0.04;
        neck = 0.055;
    } else if (/kostim-astronauta/.test(id)) {
        body = 0.047;
        neck = 0.045;
    } else if (/kostim|princeze|odelo|prsluk|ogrtac/.test(id)) {
        body = 0.034;
        neck = 0.032;
    } else if (/trenerka/.test(id)) {
        body = 0.026;
        neck = 0.03;
    } else if (/dzemper/.test(id)) {
        body = 0.023;
        neck = 0.022;
    } else if (/majica|dres|kosulja|haljina|pidzama|kupaci|kombinezon/.test(id)) {
        body = 0.019;
        neck = 0.017;
    } else {
        body = 0.028;
        neck = 0.03;
    }
    // Šal ili marama oko vrata
    const n = ctx.wear.neck ?? "";
    if (/sal|marama/.test(n)) neck += 0.022;
    return { body, neck };
}

/** Razmera po liku (dete = 1) */
export const backScale = (ctx: ItemContext) => Math.min(1.35, Math.max(0.8, ctx.body.anchors.height / 1.19));

/** Leđa: tačka na površini (preko odeće) na visini y, i ugao (π = sredina leđa) */
export function backPoint(ctx: ItemContext, y: number, extra = 0, a = Math.PI): THREE.Vector3 {
    return torsoPoint(ctx.body.shape, a, y, bulk(ctx).body + extra, V());
}

// ── Ranac ───────────────────────────────────────────────────────────────────

/**
 * Kaiševi ranca preko ramena (prate trup kao koža): od gornjeg ugla ranca preko ramena,
 * niz grudi, pod pazuh, do donjeg ugla. `top`/`bottom` su uglovi ranca (prostor tela, x > 0).
 */
export function shoulderStraps(ctx: ItemContext, top: THREE.Vector3, bottom: THREE.Vector3, material: THREE.Material, width = 0.011, buckle?: THREE.Material) {
    const s = ctx.body.shape;
    const k = backScale(ctx);
    const { body } = bulk(ctx);
    const off = body + 0.004;
    const shoulderTop = (() => {
        let y = s.shoulderY;
        while (y < s.neckBaseY && s.torsoW(y) > 0.075 * k) y += 0.002;
        return y;
    })();
    const r = res(ctx);
    for (const side of [1, -1] as Side[]) {
        const pts = [
            V(side * top.x, top.y, top.z + 0.004),
            torsoPoint(s, side * (Math.PI - 0.55), s.shoulderY - 0.02, off, V()),
            V(side * 0.072 * k, shoulderTop + off + 0.004, -0.004),
            torsoPoint(s, side * 0.62, s.shoulderY - 0.025, off, V()),
            torsoPoint(s, side * 0.74, s.chestY - 0.03, off, V()),
            torsoPoint(s, side * 1.3, s.waistY + 0.03, off, V()),
            V(side * bottom.x, bottom.y, bottom.z + 0.004),
        ];
        const path = polyPath(pts);
        const tmp = V();
        const normalAt = (t: number, out: THREE.Vector3) => {
            path(t, tmp);
            out.set(tmp.x, 0, tmp.z).normalize();
            const over = smoothstep(0.2, 0.33, t) * smoothstep(0.48, 0.35, t);
            return out.lerp(V(0, 1, 0), over).normalize();
        };
        skinnedTorso(ctx, taperedTube(path, () => width * k, seg(60, r, 20), seg(8, r, 4), normalAt, 0.28), material, "kais");
        if (buckle) {
            // Kopča na grudima
            const p = torsoPoint(s, side * 0.7, s.chestY - 0.005, off + 0.004, V());
            const g = new THREE.BoxGeometry(width * 2.6 * k, width * 1.6 * k, 0.004);
            g.translate(p.x, p.y, p.z);
            skinnedTorso(ctx, g, buckle, "kopca");
        }
    }
}

// ── Plašt ───────────────────────────────────────────────────────────────────

export interface CapeOptions {
    outer: THREE.Material;
    lining: THREE.Material;
    /** Visina poruba: 0 = kukovi, 1 = članci */
    length: number;
    /** Ivica (porub i prednje ivice) */
    trim?: { material: THREE.Material; width: number; thick: number };
    /** Okovratnik (krzneni prsten ili kragna) */
    collar?: THREE.Material;
    /** Tačkice po porubu (hermelin) */
    spots?: THREE.Material;
    /** Našivene šare (zvezde) po plaštu: geometrija oko (0,0,0) u ravni xy, mesta (u, v) */
    appliques?: { geometry: THREE.BufferGeometry; material: THREE.Material; at: [number, number][] };
}

/**
 * Plašt: pada od vrata preko ramena (iza ruku) do poruba, sve šire nadole (ne vraća se ka
 * telu), sa podstavom druge boje. Kod lika sa repom donji deo je rascepljen oko repa.
 * Vraća pivot (kači se na grudi) za blago njihanje.
 */
export function cape(ctx: ItemContext, o: CapeOptions): THREE.Group {
    const s = ctx.body.shape;
    const a = ctx.body.anchors;
    const k = backScale(ctx);
    const r = res(ctx);
    const { body, neck } = bulk(ctx);
    const yTop = s.neckBaseY + 0.004;
    const ankle = s.ankleY + 0.05;
    const hipLow = s.hipY - 0.02;
    const yHem = hipLow + (ankle - hipLow) * o.length;
    const legsOuter = (y: number) => {
        const t = Math.min(1, Math.max(0, (s.hipY - y) / (s.thigh + s.shin)));
        return { w: s.hipX + s.legR(t) + 0.01, d: s.legR(t) + 0.012 };
    };
    // Omotač tela (najveća širina/dubina od vrha do y) — tkanina ne ulazi nazad ka telu
    const N = 64;
    const env: { y: number; w: number; d: number }[] = [];
    let w = 0;
    let d = 0;
    for (let i = 0; i <= N; i++) {
        const y = yTop + ((yHem - yTop) * i) / N;
        // Ljudi mogu imati dugu kosu niz leđa: gornji deo leđa malo dalje od tela
        const hair = ctx.body.proportion === "animal" ? 0 : 0.03 * smoothstep(s.waistY - 0.02, s.chestY, y) * smoothstep(s.neckBaseY + 0.01, s.shoulderY - 0.01, y);
        const clear = (y > s.shoulderY ? neck + (body - neck) * smoothstep(s.neckBaseY, s.shoulderY - 0.02, y) : body) + hair;
        let bw: number;
        let bd: number;
        if (y > s.crotchY + 0.01) {
            bw = s.torsoW(y) + clear;
            bd = s.torsoBack(y) + clear;
        } else {
            const l = legsOuter(y);
            bw = l.w + clear;
            bd = l.d + clear;
        }
        w = Math.max(w, bw + 0.006);
        d = Math.max(d, bd + 0.006);
        env.push({ y, w, d });
    }
    // Glatko između uzoraka (bez stepenica u senčenju)
    const envAt = (v: number) => {
        const f = Math.min(N, Math.max(0, v * N));
        const i = Math.min(N - 1, Math.floor(f));
        const t = f - i;
        const a0 = env[i];
        const a1 = env[i + 1];
        return { y: a0.y + (a1.y - a0.y) * t, w: a0.w + (a1.w - a0.w) * t, d: a0.d + (a1.d - a0.d) * t };
    };
    const tail = a.tail;
    const tailY = tail ? tail.base.y : -1;
    // Ugao koji plašt pokriva: oko vrata skoro do napred, ispod ramena iza ruku
    const span = (y: number) => 0.98 + 0.56 * smoothstep(s.shoulderY - 0.03, s.neckBaseY - 0.005, y);
    const gap = (y: number) => (tail ? 0.24 * smoothstep(tailY + 0.07, tailY - 0.01, y) : 0);
    const flare = (v: number) => (0.045 * v * v + 0.01 * v) * k;
    const pivot = new THREE.Group();
    pivot.name = "plast";
    const top = V(0, yTop, 0);
    const point = (side: Side, u: number, v: number, out: THREE.Vector3, lift = 0) => {
        const e = envAt(v);
        const A = span(e.y);
        const g = gap(e.y);
        const ang = Math.PI + side * (g + (A - g) * u);
        // Blagi nabori niz plašt (jači pri dnu)
        const fold = 0.006 * k * v * Math.sin(u * 9 + side) + 0.003 * k * v * Math.sin(u * 23);
        const rx = e.w + flare(v) * 1.3 + fold + lift;
        const rz = e.d + flare(v) + fold + lift;
        return out.set(Math.sin(ang) * rx, e.y, Math.cos(ang) * rz).sub(top);
    };
    for (const side of [1, -1] as Side[]) {
        const fn = (u: number, v: number, out: THREE.Vector3) => point(side, u, v, out);
        const opts = {
            nu: seg(18, r, 8),
            nv: seg(32, r, 12),
            inside: (_u: number, v: number, out: THREE.Vector3) => out.set(0, envAt(v).y - yTop, 0),
            uv: (u: number, v: number): [number, number] => [u * 0.5 * side, v * (yTop - yHem)],
        };
        const geo = orientOutward(buildSurface(fn, opts));
        const outer = new THREE.Mesh(geo, o.outer);
        const inner = new THREE.Mesh(geo, o.lining);
        pivot.add(outer, inner);
        for (const [u, v] of o.appliques?.at ?? []) {
            const p = point(side, u, v, V(), 0.0015);
            const pu = point(side, Math.min(1, u + 0.01), v, V(), 0.0015);
            const pv = point(side, u, Math.min(1, v + 0.01), V(), 0.0015);
            const n = V().crossVectors(pu.sub(p), pv.sub(p)).normalize();
            if (n.dot(V(p.x, 0, p.z)) < 0) n.negate();
            const m = new THREE.Mesh(o.appliques!.geometry, o.appliques!.material);
            m.position.copy(p);
            m.lookAt(p.clone().add(n));
            m.rotateZ(u * 2 + v * 3);
            m.scale.setScalar(k);
            pivot.add(m);
        }
        if (o.trim) {
            // Porub i prednja ivica: debela traka po ivici
            const hem: THREE.Vector3[] = [];
            for (let i = 0; i <= 20; i++) hem.push(point(side, i / 20, 1, V(), 0.002));
            const front: THREE.Vector3[] = [];
            for (let i = 0; i <= 20; i++) front.push(point(side, 1, i / 20, V(), 0.002));
            pivot.add(new THREE.Mesh(taperedTube(polyPath(hem), () => o.trim!.width * k, seg(32, r, 12), seg(6, r, 4), undefined, o.trim.thick / o.trim.width), o.trim.material));
            pivot.add(new THREE.Mesh(taperedTube(polyPath(front), () => o.trim!.width * 0.75 * k, seg(32, r, 12), seg(6, r, 4), undefined, o.trim.thick / o.trim.width), o.trim.material));
            if (o.spots) {
                for (let i = 1; i < 6; i++) {
                    const p = point(side, i / 6, 1, V(), o.trim.width * k * 0.9);
                    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.0045 * k, 8, 6), o.spots);
                    sp.scale.set(0.8, 1.5, 0.6);
                    sp.position.copy(p);
                    pivot.add(sp);
                }
            }
            if (tail) {
                const slit: THREE.Vector3[] = [];
                for (let i = 0; i <= 12; i++) slit.push(point(side, 0, 0.35 + (i / 12) * 0.65, V(), 0.002));
                pivot.add(new THREE.Mesh(taperedTube(polyPath(slit), () => o.trim!.width * 0.5 * k, seg(24, r, 8), seg(6, r, 4)), o.trim.material));
            }
        }
    }
    if (o.collar) {
        const ring: THREE.Vector3[] = [];
        for (let i = 0; i <= 28; i++) {
            const ang = Math.PI - 1.5 + (i / 28) * 3.0;
            ring.push(torsoPoint(s, ang, yTop - 0.004, neck + 0.006, V()).sub(top));
        }
        pivot.add(new THREE.Mesh(taperedTube(polyPath(ring), () => 0.014 * k, seg(48, r, 16), seg(10, r, 6)), o.collar));
    }
    attachAt(ctx, "chest", pivot, top);
    return pivot;
}

/** Trouglovi okrenuti napolje od ose tela (prednja strana = spolja), bez obzira na smer parametra */
function orientOutward(geo: THREE.BufferGeometry): THREE.BufferGeometry {
    const index = geo.getIndex();
    const pos = geo.getAttribute("position");
    if (!index) return geo;
    const a = V();
    const b = V();
    const c = V();
    let score = 0;
    for (let t = 0; t < index.count; t += 3 * 7) {
        a.fromBufferAttribute(pos, index.getX(t));
        b.fromBufferAttribute(pos, index.getX(t + 1));
        c.fromBufferAttribute(pos, index.getX(t + 2));
        const n = b.clone().sub(a).cross(c.clone().sub(a));
        score += Math.sign(n.x * a.x + n.z * a.z);
    }
    if (score < 0) {
        const arr = index.array as Uint16Array | Uint32Array;
        for (let t = 0; t < arr.length; t += 3) {
            const tmp = arr[t + 1];
            arr[t + 1] = arr[t + 2];
            arr[t + 2] = tmp;
        }
        index.needsUpdate = true;
        // Normale su bile okrenute isto kao trouglovi: i njih okrećemo
        const nor = geo.getAttribute("normal");
        for (let i = 0; i < nor.count; i++) nor.setXYZ(i, -nor.getX(i), -nor.getY(i), -nor.getZ(i));
        nor.needsUpdate = true;
    }
    return geo;
}

/** Kopča plašta napred: dva dugmeta i lanac između (prati trup) */
export function capeClasp(ctx: ItemContext, metal: THREE.Material) {
    const s = ctx.body.shape;
    const k = backScale(ctx);
    const r = res(ctx);
    const { neck } = bulk(ctx);
    const y = s.neckBaseY - 0.006;
    const pts: THREE.Vector3[] = [];
    for (const side of [1, -1] as Side[]) {
        const p = torsoPoint(s, side * 1.45, y, neck + 0.01, V());
        const g = new THREE.SphereGeometry(0.0095 * k, seg(16, r, 8), seg(12, r, 6));
        g.scale(1, 1, 0.55);
        g.translate(p.x, p.y, p.z);
        skinnedTorso(ctx, g, metal, "kopca");
    }
    for (let i = 0; i <= 10; i++) {
        const ang = -1.45 + (i / 10) * 2.9;
        pts.push(torsoPoint(s, ang, y - 0.018 * Math.sin(((i / 10)) * Math.PI), neck + 0.01, V()));
    }
    skinnedTorso(ctx, taperedTube(polyPath(pts), () => 0.0022 * k, seg(24, r, 8), 5), metal, "lanac");
}

// ── Krila ───────────────────────────────────────────────────────────────────

export interface WingSet {
    pivots: { group: THREE.Group; side: Side }[];
    animate: (time: number, dt: number, live: boolean) => void;
}

/**
 * Par krila na leđima: `make(side)` crta jedno krilo u ravni xy (x napolje, y gore), od
 * korena u (0, 0, 0). Krila su malo zabačena unazad i blago mašu (sporo, bez trzaja).
 */
export function wings(ctx: ItemContext, make: (side: Side) => THREE.Object3D, options: { spread?: number; flap?: number; speed?: number; y?: number; size?: number } = {}): WingSet {
    const s = ctx.body.shape;
    const k = backScale(ctx) * (options.size ?? 1);
    const y = s.chestY + (options.y ?? 0.015) * k;
    const root = backPoint(ctx, y, 0.004);
    const spread = options.spread ?? 0.55;
    const pivots: WingSet["pivots"] = [];
    for (const side of [1, -1] as Side[]) {
        const group = new THREE.Group();
        const wing = make(side);
        wing.scale.multiplyScalar(k);
        if (side === -1) wing.scale.x *= -1;
        group.add(wing);
        group.rotation.y = side * spread;
        attachAt(ctx, "chest", group, root.clone().add(V(side * 0.012 * k, 0, -0.004)));
        pivots.push({ group, side });
    }
    const flap = options.flap ?? 0.14;
    const speed = options.speed ?? 1.8;
    return {
        pivots,
        animate: (time, _dt, live) => {
            for (const p of pivots) p.group.rotation.y = p.side * (spread + (live ? flap * (0.5 + 0.5 * Math.sin(time * speed)) : 0));
        },
    };
}

/** Ravan oblik sa UV od 0 do 1 (za šaru krila) */
export function flatShape(shape: THREE.Shape, curveSegments: number): THREE.ShapeGeometry {
    const g = new THREE.ShapeGeometry(shape, curveSegments);
    g.computeBoundingBox();
    const box = g.boundingBox!;
    const uv = g.getAttribute("uv");
    const pos = g.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, (pos.getX(i) - box.min.x) / (box.max.x - box.min.x), (pos.getY(i) - box.min.y) / (box.max.y - box.min.y));
    }
    return g;
}

/** Ivica oblika kao cev (debljina krila, okvir) */
export function shapeRim(shape: THREE.Shape, radius: number, segments: number, sides = 6): THREE.BufferGeometry {
    const pts = shape.getSpacedPoints(segments).map((p) => V(p.x, p.y, 0));
    return taperedTube(polyPath(pts), () => radius, segments, sides);
}
