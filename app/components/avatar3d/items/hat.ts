// 3D crteži predmeta za mesto „hat” (podaci: hat.data.ts). Vlasnik: #3 (katalog).
// Kape se kroje po glavi lika (HeadFit): sede na kosi ili hidžabu, a uši životinja i rog
// prolaze kroz uredno porubljene otvore. Materijali po vrsti: pletivo i rebrasti obod za
// zimske kape, filc za cilindar i kaubojski šešir, slama za šešire, sjajna plastika za
// kacige, metal i dragulji za krune, providno staklo za astronautski šlem.

import * as THREE from "three";
import { registerItems, type ItemBuild, type ItemBuilder, type ItemContext } from "../contract";
import { patternedFabric } from "../engine/materials";
import { buildSurface, smoothstep, type SurfaceFn } from "../engine/surface";
import { fabricNormal, printTexture } from "../engine/textures";
import { cloth, darker, decal, fabric, gem, glass, lighter, metal, plastic, plush, SIDES, TAU } from "./lib/common";
import { HeadFit, flowerGeometry, mergeGeometries, orient, pompom, thetaOf, tube, uOf, type Inside } from "./lib/headwear";
import { MOTIFS, dotsTexture, motifTexture, patternTexture, type Draw } from "./lib/prints";

// ── Materijali koje nema zajednička fabrika (keširani ovde) ────────────────

const mats = new Map<string, THREE.Material>();
function cached<T extends THREE.Material>(key: string, make: () => T): T {
    let m = mats.get(key) as T | undefined;
    if (!m) {
        m = make();
        mats.set(key, m);
    }
    return m;
}

/** Metal vidljiv sa obe strane (tanka kruna, tijara) */
const metal2 = (hex: string) => cached(`metal2-${hex}`, () => new THREE.MeshPhysicalMaterial({ color: hex, metalness: 1, roughness: 0.26, clearcoat: 0.5, clearcoatRoughness: 0.2, side: THREE.DoubleSide }));

/** Svetao čelik (šlem viteza): manje metalan da ne bude taman u mekom svetlu */
const steel = (hex = "#D5DCE6") => cached(`steel-${hex}`, () => new THREE.MeshPhysicalMaterial({ color: hex, metalness: 0.72, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.18, side: THREE.DoubleSide }));

/** Pletena slama: mapa boje sa nitima i mapa izbočina */
function strawMat(hex: string): THREE.Material {
    return cached(`straw-${hex}`, () => {
        const map = printTexture(`slama-${hex}`, (ctx, w, h) => {
            ctx.fillStyle = hex;
            ctx.fillRect(0, 0, w, h);
            const rows = 16;
            for (let j = 0; j < rows; j++) {
                for (let i = 0; i < 16; i++) {
                    const x = (i / 16) * w;
                    const y = (j / rows) * h;
                    const over = (i + j) % 2 === 0;
                    ctx.fillStyle = over ? lighter(hex, 0.16) : darker(hex, 0.12);
                    ctx.beginPath();
                    ctx.ellipse(x + w / 32, y + h / 32, w / 34, h / 40, 0, 0, TAU);
                    ctx.fill();
                }
            }
            ctx.strokeStyle = darker(hex, 0.25);
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1;
            for (let j = 0; j <= rows; j++) {
                ctx.beginPath();
                ctx.moveTo(0, (j / rows) * h);
                ctx.lineTo(w, (j / rows) * h);
                ctx.stroke();
            }
        }, 128, 128);
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        return new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", map, bumpMap: map, bumpScale: 1.2, roughness: 0.78, sheen: 0.4, sheenColor: new THREE.Color(hex).lerp(new THREE.Color("#FFFFFF"), 0.4), sheenRoughness: 0.6, side: THREE.DoubleSide });
    });
}

/** Filc (cilindar, kaubojski šešir): mat, mek sheen */
const felt = (hex: string) => cloth(hex, "felt", { roughness: 0.86, sheen: 0.9, sheenLift: 0.25 });
/** Pletivo zimske kape */
const knit = (hex: string) => cloth(hex, "knit", { sheen: 0.9, normalScale: 0.7 });
const rib = (hex: string) => fabric(hex, "rib", { normalScale: 1 });

/** Sjajna plastika kacige vidljiva i iznutra */
const shell = (hex: string) => cached(`shell-${hex}`, () => new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.15, side: THREE.DoubleSide }));

/** Providna kugla (astronaut): skoro nevidljiva, sa odsjajem */
const bubbleMat = () => cached("bubble", () => new THREE.MeshPhysicalMaterial({ color: "#E8F4FF", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, specularIntensity: 1, depthWrite: false, side: THREE.DoubleSide }));

// ── Pomoćno ─────────────────────────────────────────────────────────────────

/** Ugao trake za kosu: napred od ušiju/roga (da ih ne preseca) */
function bandTilt(f: HeadFit, base = 0.22): number {
    let tilt = base;
    for (const p of f.protrusions()) {
        const d = p.base.clone().sub(f.c);
        tilt = Math.max(tilt, Math.atan2(d.z, d.y) + 0.26);
    }
    return Math.min(0.82, tilt);
}

/** Zvezda kao ravna figura (za ExtrudeGeometry) */
function starShape(r: number, inner = 0.45, points = 5): THREE.Shape {
    const s = new THREE.Shape();
    for (let i = 0; i < points * 2; i++) {
        const rr = i % 2 === 0 ? r : r * inner;
        const a = Math.PI / 2 + (i * Math.PI) / points;
        if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    s.closePath();
    return s;
}

/** Ravna figura sa debljinom i zaobljenim ivicama, lice ka +z */
function slab(shape: THREE.Shape, depth: number, bevel: number, curve = 8): THREE.BufferGeometry {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: curve });
    g.translate(0, 0, -depth / 2);
    g.deleteAttribute("uv");
    return g;
}

/** Bedž na kupoli (zvezda, krug): tačka i pravac napolje */
function surfaceFrame(fn: SurfaceFn, u: number, w: number, c: THREE.Vector3): { p: THREE.Vector3; n: THREE.Vector3 } {
    const p = fn(u, w, new THREE.Vector3());
    const a = fn(u + 0.004, w, new THREE.Vector3());
    const b = fn(u, Math.min(1, w + 0.01), new THREE.Vector3());
    const n = new THREE.Vector3().crossVectors(a.sub(p), b.sub(p)).normalize();
    if (n.dot(p.clone().sub(c)) < 0) n.negate();
    return { p, n };
}

/** Kupola obične kape: ivica napred nisko na čelu, pozadi niže na potiljku */
const capEdge = (front: number, back: number, pow = 1.2) => (th: number) => front + (back - front) * Math.pow((1 - Math.cos(th)) / 2, pow);

/** Krug sa motivom (bedž) */
const badge = (bg: string, inner: Draw): Draw => (ctx, x, y, r) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = bg;
    ctx.fill();
    inner(ctx, x, y, r * 0.72);
};

// ── Kapa sa šiltom ──────────────────────────────────────────────────────────

interface CapOptions {
    color: string;
    visor: string;
    under?: string;
    /** Ugao šilta (0 = napred, + = levo od lika) */
    visorTh?: number;
    badge?: THREE.Texture;
    /** Moderna kapa: čvrst visok prednji deo, jače savijen šilt, kaiš za podešavanje pozadi */
    modern?: boolean;
}

function baseballCap(f: HeadFit, o: CapOptions) {
    const main = cloth(o.color, "cotton", { roughness: 0.72 });
    const visorMat = cloth(o.visor, "cotton", { roughness: 0.6 });
    const lift = f.crown + 0.006;
    const plain = capEdge(0.335, 0.47);
    // Moderna: otvor (luk) pozadi iznad kaiša
    const edge = o.modern ? (th: number) => capEdge(0.33, 0.5)(th) - 0.085 * Math.exp(-(((Math.abs(th) - Math.PI) / 0.3) ** 2)) : plain;
    const front = (u: number) => Math.pow(Math.max(0, Math.cos(thetaOf(u))), 2);
    const dome = f.dome(edge, (u, w) => lift + 0.005 * (1 - w) + (o.modern ? 0.011 * f.k * front(u) * Math.sin(Math.PI * Math.min(1, w * 1.15)) : 0), main, 72, 24);
    // Šavovi panela i dugme na vrhu
    const seam = fabric(darker(o.color, 0.22), "cotton");
    const pts: THREE.Vector3[] = [];
    const nrm = new THREE.Vector3();
    for (let i = 0; i < 6; i++) {
        const u = i / 6 + 1 / 12;
        pts.length = 0;
        for (let k = 1; k <= 10; k++) {
            const p = dome(u, (k / 10) * 0.97, new THREE.Vector3());
            nrm.copy(p).sub(f.c).normalize();
            pts.push(p.addScaledVector(nrm, 0.0008));
        }
        f.mesh(tube(pts, 0.0011 * f.k, f.n(20, 8), f.n(5, 3)), seam, "sav");
    }
    const top = dome(0.5, 0, new THREE.Vector3());
    const button = f.mesh(new THREE.SphereGeometry(0.0085 * f.k, f.n(14, 6), f.n(10, 4)), main);
    button.scale.set(1, 0.55, 1);
    button.position.copy(top);
    // Traka po ivici (porub)
    f.rim((q, out) => dome(q, 1, out), 0.003 * f.k, 0.0055 * f.k, main);
    // Rupice za vazduh (vezene)
    for (const s of [-1, 1]) {
        const { p, n } = surfaceFrame(dome, 0.5 + s * 0.11, 0.45, f.c);
        const eyelet = f.mesh(new THREE.TorusGeometry(0.0032 * f.k, 0.0011 * f.k, 4, f.n(12, 6)), seam);
        eyelet.position.copy(p).addScaledVector(n, 0.0004);
        eyelet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    }
    // Šilt: zakrivljen napred i blago nadole, sa debljinom i štepom
    const th0 = o.visorTh ?? 0;
    const fwd0 = new THREE.Vector3(Math.sin(th0), 0, Math.cos(th0));
    const base = new THREE.Vector3();
    const outward = new THREE.Vector3();
    const visor = (s: number, r: number, out: THREE.Vector3) => {
        const across = s * 2 - 1;
        const th = th0 + across * 1.0;
        dome(uOf(th), 1, base);
        outward.set(base.x - f.c.x, 0, base.z - f.c.z).normalize();
        const fwd = fwd0.clone().lerp(outward, 0.45).normalize();
        const len = (o.modern ? 0.09 : 0.084) * f.k * Math.sqrt(Math.max(0, 1 - across * across * 0.82));
        const bend = o.modern ? -0.008 * r - 0.034 * across * across * r : -0.012 * r - 0.016 * across * across * r;
        return out.copy(base).addScaledVector(fwd, r * len).add(new THREE.Vector3(0, bend * f.k, 0));
    };
    const insidePt = () => f.c.clone().add(new THREE.Vector3(0, 0.1, 0));
    f.mesh(buildSurface(visor, { nu: f.n(24, 10), nv: f.n(8, 4), inside: insidePt }), visorMat, "silt");
    const under = (s: number, r: number, out: THREE.Vector3) => visor(s, r, out).add(new THREE.Vector3(0, -0.0032 * f.k, 0));
    f.mesh(buildSurface(under, { nu: f.n(24, 10), nv: f.n(8, 4), inside: insidePt }), cloth(o.under ?? darker(o.visor, 0.25), "cotton"), "silt-dole");
    const rim: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) rim.push(visor(i / 24, 1, new THREE.Vector3()).add(new THREE.Vector3(0, -0.0016 * f.k, 0)));
    f.mesh(tube(rim, 0.0021 * f.k, f.n(40, 12), f.n(6, 4)), visorMat, "silt-ivica");
    for (const r of [0.55, 0.78]) {
        const line: THREE.Vector3[] = [];
        for (let i = 1; i <= 15; i++) line.push(visor(i / 16, r, new THREE.Vector3()).add(new THREE.Vector3(0, 0.0007, 0)));
        f.mesh(tube(line, 0.0007 * f.k, f.n(24, 8), 3), seam, "step");
    }
    if (o.badge) f.domePatch(dome, 0.44, 0.56, o.modern ? 0.5 : 0.42, o.modern ? 0.82 : 0.86, 0.0009, decal(o.badge));
    if (o.modern) {
        // Kaiš za podešavanje preko luka pozadi, sa metalnom kopčom
        const strapPts: THREE.Vector3[] = [];
        for (let i = 0; i <= 10; i++) {
            const th = Math.PI - 0.42 + (i / 10) * 0.84;
            strapPts.push(f.at(uOf(th), plain(th) - 0.012, lift + 0.0015));
        }
        f.mesh(tube(strapPts, 0.0058 * f.k, f.n(20, 8), f.n(6, 4), 0.3), cloth(o.visor, "cotton"), "kais");
        const buckle = f.mesh(new THREE.BoxGeometry(0.012 * f.k, 0.009 * f.k, 0.003 * f.k), metal("#C9CED6"), "kopca");
        const bp = f.at(uOf(Math.PI + 0.16), plain(Math.PI) - 0.012, lift + 0.004);
        buckle.position.copy(bp);
        buckle.lookAt(bp.clone().add(bp.clone().sub(f.c).setY(0)));
    }
    f.openings(f.domeInside(edge, lift + 0.005), main);
}

// ── Opuštena rebrasta kapa (bez kićanke, pada nazad) ───────────────────────

function slouchyBeanie(f: HeadFit, color: string) {
    const lift = f.crown + 0.007;
    const edge = capEdge(0.39, 0.6, 1.1);
    const m = cloth(color, "rib", { sheen: 0.8, normalScale: 1.1 });
    // Višak pletiva pada nazad: zadebljanje pozadi pri vrhu
    const slouch = (u: number, w: number) => {
        const back = Math.pow(Math.max(0, -Math.cos(thetaOf(u))), 1.4);
        return 0.034 * f.k * back * Math.pow(Math.sin(Math.PI * Math.min(1, w * 1.25)), 1.3) + 0.01 * f.k * Math.sin(Math.PI * Math.min(1, w * 1.1)) * (1 - back);
    };
    const dome = f.dome(edge, (u, w) => lift + 0.004 * (1 - w) + slouch(u, w) + 0.0014 * Math.sin(thetaOf(u) * 26), m, 88, 28, [3, 1]);
    // Uzan podvijen obod
    const band = f.domeFn(edge, (_u, w) => lift + 0.0015 + 0.006 * Math.sin(Math.min(1, Math.max(0, (w - 0.86) / 0.15)) * Math.PI * 0.85));
    f.mesh(buildSurface((u, w, out) => band(u, 0.86 + w * 0.145, out), { nu: f.n(88, 24), nv: f.n(6, 4), closedU: true, inside: () => f.c.clone() }), rib(color), "obod");
    // Mala ušivena etiketa sa strane (bez natpisa)
    const { p, n } = surfaceFrame(dome, 0.5 - 0.16, 0.86, f.c);
    f.mesh(orient(new THREE.BoxGeometry(0.014 * f.k, 0.009 * f.k, 0.0015), p.addScaledVector(n, 0.002), n, 0, new THREE.Vector3(0, 1, 0)), fabric(darker(color, 0.3), "cotton"), "etiketa");
    f.openings(f.domeInside(edge, lift + 0.02), rib(color));
}

// ── Mekane trake za kosu ────────────────────────────────────────────────────

/** Široka platnena traka (punjena): mekana, sa naborima po dužini */
function softHeadband(f: HeadFit, color: string) {
    const tilt = bandTilt(f, 0.3);
    const lift = f.crown + 0.002;
    const mat = cloth(color, "cotton", { sheen: 0.9, sheenLift: 0.35 });
    const path = (s: number, out: THREE.Vector3) => f.bandPoint(s * 2 - 1, tilt, lift + 0.007 * f.k, out, 0.86);
    const fwd = (s: number, out: THREE.Vector3) => f.bandNormal(s * 2 - 1, tilt, out, 0.86);
    // Presek: jastučić (debljina 7 mm, širina 2 cm), blagi nabori
    const geo = buildSurface((q, s, out) => {
        path(s, out);
        const n = fwd(s, new THREE.Vector3());
        const tangent = path(Math.min(1, s + 0.01), new THREE.Vector3()).sub(path(Math.max(0, s - 0.01), new THREE.Vector3())).normalize();
        const side = new THREE.Vector3().crossVectors(tangent, n).normalize();
        const a = q * TAU;
        const taper = 0.6 + 0.4 * Math.sin(Math.PI * s);
        const pleat = 1 + 0.08 * Math.sin(s * 70);
        return out.addScaledVector(side, Math.cos(a) * 0.012 * f.k * taper * pleat).addScaledVector(n, Math.sin(a) * 0.0055 * f.k * taper);
    }, { nu: f.n(14, 8), nv: f.n(56, 20), closedU: true, inside: (_q, s, out) => path(s, out) });
    f.mesh(geo, mat, "traka");
}

/** Traka-marama: široka marama na tufne vezana u čvor gore napred */
function bandanaHeadband(f: HeadFit) {
    const k = f.k;
    const tilt = bandTilt(f, 0.34);
    const lift = f.crown + 0.002;
    const dots = dotsTexture("#E5484D", "#FFFFFF", 0.018, 0.12);
    const mat = patternedFabric(dots, "cotton", "#FFFFFF", { side: THREE.DoubleSide });
    const path = (s: number, out: THREE.Vector3) => f.bandPoint(s * 2 - 1, tilt, lift + 0.004 * k, out, 0.95);
    const fwd = (s: number, out: THREE.Vector3) => f.bandNormal(s * 2 - 1, tilt, out, 0.95);
    const geo = buildSurface((q, s, out) => {
        path(s, out);
        const n = fwd(s, new THREE.Vector3());
        const tangent = path(Math.min(1, s + 0.01), new THREE.Vector3()).sub(path(Math.max(0, s - 0.01), new THREE.Vector3())).normalize();
        const side = new THREE.Vector3().crossVectors(tangent, n).normalize();
        const a = q * TAU;
        // Šira na temenu (gde je čvor), uža iza ušiju
        const w = (0.014 + 0.012 * Math.sin(Math.PI * s)) * k;
        return out.addScaledVector(side, Math.cos(a) * w * (1 + 0.06 * Math.sin(s * 50 + a))).addScaledVector(n, Math.sin(a) * 0.0035 * k);
    }, { nu: f.n(14, 8), nv: f.n(56, 20), closedU: true, inside: (_q, s, out) => path(s, out), uv: (q, s) => [q * 0.08 * k, s * 0.4 * k] });
    f.mesh(geo, mat, "marama");
    // Čvor i dva krajeva marame (malo nakrivljeno, gledaocu desno)
    const s0 = 0.5 + 0.07;
    const at = path(s0, new THREE.Vector3());
    const n = fwd(s0 * 2 - 1, new THREE.Vector3());
    const knot = f.mesh(new THREE.SphereGeometry(0.014 * k, f.n(16, 8), f.n(12, 6)), mat, "cvor");
    knot.position.copy(at).addScaledVector(n, 0.008 * k);
    knot.scale.set(1.15, 0.85, 0.8);
    for (const sd of SIDES) {
        const dir = new THREE.Vector3(sd, 0.6, 0.2).normalize();
        const p0 = knot.position.clone();
        const pts = [p0, p0.clone().addScaledVector(dir, 0.025 * k).addScaledVector(n, 0.006 * k), p0.clone().addScaledVector(dir, 0.045 * k).add(new THREE.Vector3(0, -0.006 * k, 0))];
        f.mesh(tube(pts, (t) => (0.011 * (0.6 + 0.6 * t) * (1 - Math.pow(t, 6))) * k, f.n(14, 6), f.n(10, 6), 0.3), mat, "kraj");
    }
}

// ── Zimske kape ─────────────────────────────────────────────────────────────

function beanie(f: HeadFit, o: { color: string; cuff: string; pom?: string; pomR?: number }) {
    const lift = f.crown + 0.007;
    const edge = capEdge(0.4, 0.6, 1.1);
    const k = knit(o.color);
    // Uspravna rebra pletiva (blagi talas po obimu)
    const dome = f.dome(edge, (u, w) => lift + 0.006 * (1 - w) + 0.0016 * Math.sin(thetaOf(u) * 22) * smoothstep(0.1, 0.4, w), k, 88, 28, [2.2, 0.9]);
    // Podvijen rebrasti obod: zadebljan i zaobljen
    const band = f.domeFn(edge, (_u, w) => lift + 0.0015 + 0.0075 * Math.sin(Math.min(1, Math.max(0, (w - 0.76) / 0.25)) * Math.PI * 0.85));
    const bandFn: SurfaceFn = (u, w, out) => band(u, 0.76 + w * 0.245, out);
    f.mesh(buildSurface(bandFn, { nu: f.n(88, 24), nv: f.n(8, 4), closedU: true, inside: () => f.c.clone(), uv: (u, v) => [u * 1.4, v * 0.15] }), rib(o.cuff), "obod");
    if (o.pom !== undefined || o.pomR !== 0) {
        const pom = f.mesh(pompom(0.034 * f.k * (o.pomR ?? 1), f.r), fabric(o.pom ?? "#FFFFFF", "fleece", { sheen: 1, sheenLift: 0.6, roughness: 0.95, normalScale: 1.4 }), "kicanka");
        const top = dome(0.5, 0, new THREE.Vector3());
        pom.position.copy(top).add(new THREE.Vector3(0, 0.026 * f.k, 0));
        // Uši zeke/mačke vire baš sa temena: kićanka se malo pomera nazad
        if (f.protrusions().length) pom.position.add(new THREE.Vector3(0, -0.006, -0.03 * f.k));
    }
    f.openings(f.domeInside(edge, lift + 0.006), rib(o.cuff));
    return dome;
}

/** Plišana kapa (meda, žabica, dinosaurus): kupola od pliša i obod */
function plushHat(f: HeadFit, color: string, cuff: string) {
    const lift = f.crown + 0.008;
    const edge = capEdge(0.38, 0.58, 1.1);
    const dome = f.dome(edge, (_u, w) => lift + 0.007 * (1 - w), plush(color), 72, 22);
    const band = f.domeFn(edge, (_u, w) => lift + 0.002 + 0.007 * Math.sin(Math.min(1, Math.max(0, (w - 0.8) / 0.21)) * Math.PI * 0.9));
    f.mesh(buildSurface((u, w, out) => band(u, 0.8 + w * 0.205, out), { nu: f.n(72, 24), nv: f.n(6, 4), closedU: true, inside: () => f.c.clone() }), plush(cuff), "obod");
    f.openings(f.domeInside(edge, lift + 0.006), plush(cuff));
    return { dome, edge, lift };
}

// ── Kruti šeširi (cilindar, slama, kauboj…) ────────────────────────────────

/** Telo šešira + vrh + traka; vraća zapreminu za otvore */
function hatBody(f: HeadFit, loop: (q: number, out: THREE.Vector3) => THREE.Vector3, baseProfile: (t: number) => [number, number], mat: THREE.Material, options: { band?: [THREE.Material, number, number]; dome?: number; axis?: THREE.Vector3; topMat?: THREE.Material; crease?: number } = {}) {
    // Telo mora da pokrije teme (sa kosom/hidžabom): ako je profil niži, izdužuje se
    const axis0 = (options.axis ?? new THREE.Vector3(0, 1, 0)).clone().normalize();
    const center0 = f.ringCenter(loop);
    let need = 0;
    const p = new THREE.Vector3();
    for (let i = 0; i < 12; i++) {
        for (const v of [0, 0.08, 0.16]) {
            f.at(i / 12, v, f.crown + 0.006, p);
            need = Math.max(need, p.sub(center0).dot(axis0));
        }
    }
    const H0 = baseProfile(1)[1] + (options.dome ?? 0.004) * 0.6 + (options.crease ?? 0) * 0.5;
    const grow = Math.max(1, need / Math.max(1e-4, H0));
    const profile = (t: number): [number, number] => {
        const [s, h] = baseProfile(t);
        return [s, h * grow];
    };
    const body = f.crownBody(loop, profile, { axis: options.axis });
    const crease = options.crease ?? 0;
    const fn: SurfaceFn = crease ? (q, t, out) => {
        body.fn(q, t, out);
        // Ulegnuće po sredini temena (kaubojski šešir)
        const th = thetaOf(q);
        const across = Math.abs(Math.sin(th));
        return out.addScaledVector(body.axis, -crease * smoothstep(0.65, 1, t) * Math.pow(1 - across, 3) * 0.5);
    } : body.fn;
    f.mesh(buildSurface(fn, { nu: f.n(52, 16), nv: f.n(12, 5), closedU: true, inside: (_q, t, out) => out.copy(body.center).addScaledVector(body.axis, profile(t)[1] * 0.5), uv: (u, v) => [u * 2, v * 0.5] }), mat, "telo");
    const capGeo = buildSurface((q, r, out) => {
        fn(q, 1, out);
        const k = 1 - r;
        out.lerp(body.top, r);
        const th = thetaOf(q);
        const dent = crease ? -crease * Math.pow(1 - Math.abs(Math.sin(th)), 3) * r * 0.9 : 0;
        return out.addScaledVector(body.axis, (options.dome ?? 0.004) * (1 - k * k) + dent);
    }, { nu: f.n(52, 16), nv: f.n(5, 3), closedU: true, inside: () => body.top.clone().addScaledVector(body.axis, -0.05) });
    f.mesh(capGeo, options.topMat ?? mat, "vrh");
    if (options.band) {
        const [bm, t0, t1] = options.band;
        const push = 0.0018;
        const center = body.center;
        const bandFn: SurfaceFn = (q, t, out) => {
            fn(q, t0 + (t1 - t0) * t, out);
            const radial = out.clone().sub(center);
            radial.addScaledVector(body.axis, -radial.dot(body.axis)).normalize();
            return out.addScaledVector(radial, push);
        };
        f.mesh(buildSurface(bandFn, { nu: f.n(52, 16), nv: 3, closedU: true, inside: () => center.clone().addScaledVector(body.axis, 0.03) }), bm, "traka");
        for (const t of [0, 1]) f.rim((q, out) => bandFn(q, t, out), 0.0012, 0.0014, bm, 52);
    }
    return { ...body, fn };
}

// ── Kapica (takija): mala okrugla kapa na temenu, heklana ili vezena ───────

/** Šara heklane/vezene kapice: redovi sitnih rombova i tačkica (konac u boji `thread`) */
function kufiTexture(base: string, thread: string, embroidered: boolean): THREE.Texture {
    const map = printTexture(`takija-${base}-${thread}-${embroidered ? "vez" : "hekl"}`, (ctx, w, h) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);
        // Heklani redovi (blage vodoravne linije) i rupice
        ctx.strokeStyle = darker(base, 0.1);
        ctx.lineWidth = 1;
        for (let j = 0; j < 16; j++) {
            ctx.beginPath();
            ctx.moveTo(0, (j + 0.5) * (h / 16));
            ctx.lineTo(w, (j + 0.5) * (h / 16));
            ctx.stroke();
        }
        ctx.fillStyle = darker(base, 0.14);
        for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
            ctx.beginPath();
            ctx.arc((i + (j % 2 ? 0.5 : 0)) * (w / 16), j * (h / 16), w / 120, 0, TAU);
            ctx.fill();
        }
        if (embroidered) {
            // Vez: dva reda rombova pri dnu i zvezdice gore
            ctx.fillStyle = thread;
            for (const row of [0.62, 0.8]) {
                for (let i = 0; i < 8; i++) {
                    const x = (i + 0.5) * (w / 8);
                    const y = row * h;
                    const r = w / 28;
                    ctx.beginPath();
                    ctx.moveTo(x, y - r);
                    ctx.lineTo(x + r, y);
                    ctx.lineTo(x, y + r);
                    ctx.lineTo(x - r, y);
                    ctx.closePath();
                    ctx.fill();
                }
            }
            for (let i = 0; i < 8; i++) {
                ctx.beginPath();
                ctx.arc((i + 0.5) * (w / 8) + w / 16, h * 0.38, w / 70, 0, TAU);
                ctx.fill();
            }
        }
    }, 256, 256);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    return map;
}

function kufi(f: HeadFit, base: string, thread: string, embroidered = false) {
    const lift = f.crown + 0.004;
    const edge = capEdge(0.27, 0.34, 1.1);
    const m = patternedFabric(kufiTexture(base, thread, embroidered), "cotton", "#FFFFFF", { side: THREE.DoubleSide });
    const dome = f.dome(edge, (_u, w) => lift + 0.004 * (1 - w * w), m, 72, 20, [4, 1]);
    // Uzak zadebljan obod (rub kapice)
    f.rim((q, out) => dome(q, 1, out), 0.0024 * f.k, 0.0034 * f.k, embroidered ? fabric(thread, "satin", { roughness: 0.4 }) : rib(darker(base, 0.06)), 72);
    f.openings(f.domeInside(edge, lift + 0.006), rib(base));
}

// ── Kape po id-ju ───────────────────────────────────────────────────────────
// ── Kape po id-ju ───────────────────────────────────────────────────────────

type HatBuild = (f: HeadFit, ctx: ItemContext) => ItemBuild;

const hat = (id: string, build: HatBuild, extra: Partial<ItemBuilder> = {}): ItemBuilder => ({
    id,
    build: (ctx) => {
        const f = new HeadFit(ctx);
        return build(f, ctx);
    },
    dependsOn: ["hair", "hijab"],
    withHijab: "over",
    thumb: { focus: "head" },
    ...extra,
});

function capStar(color: string, starColor: string): THREE.Texture {
    return motifTexture(`kapa-bedz-${color}-${starColor}`, badge("#FFFFFF", MOTIFS.star(starColor)));
}

function sunHat(f: HeadFit) {
    const s = strawMat("#F8DC98");
    const seat = f.rigidSeat(0.3, 0.4, 0.46, f.crown + 0.006);
    const loop = seat.loop;
    const k = f.k * seat.s;
    const body = hatBody(f, loop, (t) => [1 - 0.12 * t * t, 0.03 * k + t * 0.05 * k], s, { band: [fabric("#F07C9A", "satin"), 0.12, 0.48], dome: 0.018 * k, axis: seat.axis });
    const brim = f.brim(loop, () => 0.072 * k, (q, r) => -0.016 * k * r * r * (0.7 + 0.3 * Math.cos(thetaOf(q) * 2)) + 0.004 * k * Math.sin(thetaOf(q) * 6) * r * r, 0.0035 * k, s, s, s, 64, 7, seat.axis);
    // Beli cvet na traci
    const { petals, middle } = flowerGeometry(0.022 * k, 5, f.r);
    const at = body.fn(uOf(0.75), 0.3, new THREE.Vector3());
    const out = at.clone().sub(body.center).addScaledVector(body.axis, -at.clone().sub(body.center).dot(body.axis)).normalize();
    f.mesh(orient(petals, at.clone().addScaledVector(out, 0.006), out), fabric("#FFFFFF", "satin"));
    f.mesh(orient(middle, at.clone().addScaledVector(out, 0.006), out), plastic("#FFD15C"));
    f.openings([body.inside, brim.inside], fabric("#F07C9A", "satin"));
}

function strawHat(f: HeadFit) {
    const s = strawMat("#EFCB74");
    const seat = f.rigidSeat(0.28, 0.38, 0.44, f.crown + 0.006);
    const loop = seat.loop;
    const k = f.k * seat.s;
    const body = hatBody(f, loop, (t) => [1 - 0.06 * t, 0.035 * k + t * 0.045 * k], s, { band: [fabric("#E5484D", "cotton"), 0.06, 0.4], dome: 0.012 * k, crease: 0.008 * k, axis: seat.axis });
    const brim = f.brim(loop, () => 0.085 * k, (_q, r) => -0.004 * k * r + 0.006 * k * r * r, 0.004 * k, s, s, strawMat("#D9B25C"), 64, 7, seat.axis);
    f.openings([body.inside, brim.inside], fabric("#E5484D", "cotton"));
}

function topHat(f: HeadFit) {
    const main = felt("#3A3546");
    const seat = f.rigidSeat(0.24, 0.33, 0.38, f.crown + 0.006);
    const loop = seat.loop;
    const k = f.k * seat.s;
    const body = hatBody(f, loop, (t) => [0.9 + 0.08 * t, 0.012 * k + t * 0.15 * k], main, { band: [fabric("#E5484D", "satin"), 0.03, 0.22], dome: 0.003, topMat: felt("#514A60"), axis: seat.axis });
    const brim = f.brim(loop, () => 0.042 * k, (q, r) => 0.016 * k * r * r * Math.pow(Math.sin(thetaOf(q)), 2) - 0.004 * k * r, 0.004 * k, felt("#2A2733"), felt("#2A2733"), felt("#2A2733"), 64, 6, seat.axis);
    f.openings([body.inside, brim.inside], felt("#2A2733"));
}

function cowboyHat(f: HeadFit) {
    const main = felt("#B8783F");
    const seat = f.rigidSeat(0.27, 0.37, 0.43, f.crown + 0.006);
    const loop = seat.loop;
    const k = f.k * seat.s;
    const body = hatBody(f, loop, (t) => [1 - 0.1 * t * t, 0.03 * k + t * 0.075 * k], main, { band: [fabric("#E5484D", "cotton"), 0.06, 0.26], dome: 0.012 * k, crease: 0.018 * k, axis: seat.axis });
    const brim = f.brim(loop, () => 0.07 * k, (q, r) => {
        const th = thetaOf(q);
        return 0.032 * k * r * r * Math.pow(Math.sin(th), 2) - 0.01 * k * r * Math.pow(Math.cos(th), 2);
    }, 0.0045 * k, felt("#9A6236"), felt("#8A5530"), felt("#8A5530"), 64, 7, seat.axis);
    // Zlatna zvezda na traci
    const at = body.fn(uOf(0.55), 0.16, new THREE.Vector3());
    const n = at.clone().sub(body.center).addScaledVector(body.axis, -at.clone().sub(body.center).dot(body.axis)).normalize();
    f.mesh(orient(slab(starShape(0.011 * k), 0.002, 0.001), at.addScaledVector(n, 0.003), n, 0, body.axis), metal("#FFC83D"), "zvezda");
    f.openings([body.inside, brim.inside], felt("#9A6236"));
}

function pirateHat(f: HeadFit) {
    const main = felt("#2E3A66");
    const seat = f.rigidSeat(0.3, 0.4, 0.46, f.crown + 0.006);
    const loop = seat.loop;
    const k = f.k * seat.s;
    const body = hatBody(f, loop, (t) => [1 - 0.15 * t * t, 0.025 * k + t * 0.04 * k], main, { dome: 0.02 * k, axis: seat.axis });
    // Obod podignut skoro uspravno (dvorogi šešir), napred i pozadi viši
    const brim = f.brim(loop, (q) => (0.05 + 0.02 * Math.pow(Math.cos(thetaOf(q)), 2)) * k, (q, r) => (0.055 + 0.02 * Math.pow(Math.cos(thetaOf(q)), 2)) * k * Math.pow(r, 1.3), 0.004 * k, felt("#3A4A80"), felt("#2E3A66"), metal("#FFC83D"), 64, 7, seat.axis);
    // Zlatni medaljon sa belom zvezdom napred (bez lobanje)
    const front = brim.fn(0.5, 0.55, 0, new THREE.Vector3());
    const dir = new THREE.Vector3(0, 0.25, 1).normalize();
    f.mesh(orient(new THREE.CylinderGeometry(0.014 * k, 0.014 * k, 0.004, f.n(24, 10)).rotateX(Math.PI / 2), front.clone().addScaledVector(dir, 0.006), dir), metal("#FFC83D"), "medaljon");
    f.mesh(orient(slab(starShape(0.009 * k), 0.0016, 0.0008), front.clone().addScaledVector(dir, 0.0095), dir), plastic("#FFFFFF", 0.4), "zvezda");
    // Roze pero sa desne strane (gledaocu levo)
    const p0 = body.fn(uOf(-1.1), 0.6, new THREE.Vector3());
    const pts = [p0, p0.clone().add(new THREE.Vector3(-0.02 * k, 0.04 * k, -0.01 * k)), p0.clone().add(new THREE.Vector3(-0.035 * k, 0.075 * k, -0.035 * k)), p0.clone().add(new THREE.Vector3(-0.03 * k, 0.09 * k, -0.065 * k))];
    f.mesh(tube(pts, (s) => (0.004 + 0.012 * Math.sin(Math.PI * Math.min(1, s * 1.1))) * k, f.n(24, 8), f.n(8, 4), 0.25), fabric("#F78FB3", "fleece", { sheen: 1, sheenLift: 0.6 }), "pero");
    f.mesh(tube(pts, 0.0012 * k, f.n(16, 6), 4), plastic("#FFFFFF", 0.5), "pero-stablo");
    f.openings([body.inside, brim.inside], metal("#FFC83D"));
}

function wizardHat(f: HeadFit) {
    const stars = patternTexture("carobnjak-zvezde", "#6C55C9", MOTIFS.star("#FFD15C"), { tile: 0.08, scale: 0.12, rotate: true });
    const main = patternedFabric(stars, "felt", "#FFFFFF", { side: THREE.DoubleSide });
    const seat = f.rigidSeat(0.27, 0.37, 0.43, f.crown + 0.006, 0.2);
    const loop = seat.loop;
    const k = f.k * seat.s;
    const axis = seat.axis;
    const center = f.ringCenter(loop);
    // „Nazad” upravno na osu (vrh se savija ka potiljku)
    const back = new THREE.Vector3(0, 0, -1).addScaledVector(axis, axis.z).normalize();
    const base = new THREE.Vector3();
    const H = 0.3 * k;
    const bendAt = (t: number) => back.clone().multiplyScalar(0.1 * k * Math.pow(Math.max(0, t), 2.6));
    // Kupa koja se pri vrhu savija unazad
    const cone: SurfaceFn = (q, t, out) => {
        loop(q, base);
        const off = base.clone().sub(center);
        const along = off.dot(axis);
        off.addScaledVector(axis, -along);
        const s = Math.pow(1 - t, 1.15) * (1 + 0.06 * Math.sin(t * Math.PI));
        const sag = -0.03 * k * Math.pow(Math.max(0, t - 0.7) / 0.3, 2);
        return out.copy(center).addScaledVector(off, s).addScaledVector(axis, along * (1 - t) + t * H + sag).add(bendAt(t));
    };
    const axisAt = (t: number, out: THREE.Vector3) => out.copy(center).addScaledVector(axis, t * H).add(bendAt(t));
    f.mesh(buildSurface(cone, { nu: f.n(48, 16), nv: f.n(24, 8), closedU: true, inside: (_q, t, out) => axisAt(t, out), uv: (u, v) => [u * 0.8 * k, v * H] }), main, "kupa");
    const brim = f.brim(loop, () => 0.068 * k, (q, r) => -0.01 * k * r * r + 0.004 * k * Math.sin(thetaOf(q) * 5) * r * r, 0.004 * k, felt("#5641A8"), felt("#4A3794"), felt("#4A3794"), 64, 7, axis);
    // Zlatna traka i zvezda na vrhu
    const bandFn: SurfaceFn = (q, t, out) => {
        cone(q, 0.03 + t * 0.07, out);
        const n = out.clone().sub(center);
        n.addScaledVector(axis, -n.dot(axis)).normalize();
        return out.addScaledVector(n, 0.0015);
    };
    f.mesh(buildSurface(bandFn, { nu: f.n(48, 16), nv: 2, closedU: true, inside: () => center.clone().addScaledVector(axis, 0.02) }), fabric("#FFD15C", "satin"), "traka");
    const tip = cone(0.5, 1, new THREE.Vector3());
    const star = f.mesh(slab(starShape(0.014 * k), 0.004, 0.0015), metal("#FFD15C"), "zvezda");
    star.position.copy(tip).addScaledVector(axis, -0.004).addScaledVector(back, 0.004);
    star.rotation.y = 0.4;
    const inside: Inside = (p) => {
        const d = p.clone().sub(center);
        const t = d.dot(axis) / H;
        if (t < -0.1 || t > 1) return false;
        const c = axisAt(Math.max(0, t), new THREE.Vector3());
        const r = Math.pow(1 - Math.max(0, t), 1.15) * (loop(0.5, base).sub(center).length());
        return p.distanceTo(c) < r;
    };
    f.openings([inside, brim.inside], fabric("#FFD15C", "satin"));
}

function partyHat(f: HeadFit) {
    const k = f.k;
    const dots = dotsTexture("#7ED6F2", "#F45B8D", 0.03, 0.16);
    const main = patternedFabric(dots, "felt", "#FFFFFF", { side: THREE.DoubleSide });
    // Mala kupa na temenu, nakrivljena u stranu; kod ušiju na temenu sedi ispred njih
    const ear = f.protrusions().length > 0;
    const tiltX = 0.2;
    const tiltZ = ear ? 0.35 : 0.12;
    const dir = new THREE.Vector3(Math.sin(tiltX), Math.cos(tiltX), Math.sin(tiltZ)).normalize();
    const [u, v] = f.uvOf(dir);
    const base = f.at(u, v, f.crown + 0.004);
    const n = f.head.normal(u, v, new THREE.Vector3());
    const R = 0.052 * k;
    const H = 0.15 * k;
    const coneGeo = new THREE.ConeGeometry(R, H, f.n(40, 14), f.n(8, 3), true);
    coneGeo.translate(0, H / 2 - 0.006, 0);
    // UV u metrima za tufne
    const uv = coneGeo.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * TAU * R, uv.getY(i) * H);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    coneGeo.applyQuaternion(q).translate(base.x, base.y, base.z);
    f.mesh(coneGeo, main, "kupa");
    const rimGeo = new THREE.TorusGeometry(R * 0.98, 0.006 * k, f.n(8, 4), f.n(40, 14)).rotateX(Math.PI / 2).translate(0, -0.004, 0);
    f.mesh(rimGeo.applyQuaternion(q).translate(base.x, base.y, base.z), fabric("#F45B8D", "fleece", { sheen: 1, sheenLift: 0.5 }), "rub");
    const pom = f.mesh(pompom(0.016 * k, f.r), fabric("#FFD15C", "fleece", { sheen: 1, sheenLift: 0.6, normalScale: 1.4 }), "kicanka");
    pom.position.copy(base).addScaledVector(n, H - 0.004);
}

function chefHat(f: HeadFit) {
    const white = cloth("#FFFFFF", "cotton", { roughness: 0.8 });
    const seat = f.rigidSeat(0.27, 0.35, 0.41, f.crown + 0.006);
    const loop = seat.loop;
    const k = f.k * seat.s;
    const bandH = 0.04 * k;
    const band = hatBody(f, loop, (t) => [1, 0.004 + t * bandH], fabric("#EEF2F7", "cotton", { roughness: 0.75 }), { dome: 0, axis: seat.axis });
    // Naduvan vrh sa naborima (kao pečurka)
    const center = band.center;
    const axis = band.axis;
    const baseP = new THREE.Vector3();
    const puff: SurfaceFn = (q, t, out) => {
        band.fn(q, 1, baseP);
        const off = baseP.clone().sub(center);
        const h0 = off.dot(axis);
        off.addScaledVector(axis, -h0);
        const th = thetaOf(q);
        const pleat = 1 + 0.045 * Math.pow(Math.abs(Math.sin(th * 4)), 0.6);
        const s = (1 + 0.3 * Math.sin(Math.min(1, t * 1.5) * Math.PI * 0.5)) * pleat * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, t - 0.6) / 0.4, 2)) * 0.85 + 0.15);
        const h = h0 + t * 0.13 * k;
        return out.copy(center).addScaledVector(axis, h).addScaledVector(off, t > 0.98 ? s * (1 - (t - 0.98) * 50) : s);
    };
    f.mesh(buildSurface(puff, { nu: f.n(72, 20), nv: f.n(22, 8), closedU: true, inside: (_q, t, out) => out.copy(center).addScaledVector(axis, 0.01 + t * 0.12 * k) }), white, "puf");
    f.rim((q, out) => band.fn(q, 1, out), 0.003 * k, 0.003 * k, white);
    f.rim((q, out) => band.fn(q, 0, out), 0.0028 * k, 0.003 * k, fabric("#EEF2F7", "cotton"));
    const inside: Inside = (p) => {
        const d = p.clone().sub(center);
        const h = d.dot(axis);
        return h > -0.02 && h < bandH + 0.13 * k && d.addScaledVector(axis, -h).length() < band.fn(0.5, 0, new THREE.Vector3()).sub(center).length() * 1.35;
    };
    f.openings(inside, fabric("#EEF2F7", "cotton"));
}

function sailorCap(f: HeadFit) {
    const white = cloth("#FFFFFF", "cotton", { roughness: 0.7 });
    const seat = f.rigidSeat(0.27, 0.35, 0.4, f.crown + 0.006);
    const loop = seat.loop;
    const k = f.k * seat.s;
    const body = hatBody(f, loop, (t) => [1 + 0.18 * Math.pow(t, 1.6), 0.004 + t * 0.042 * k], white, { band: [fabric("#2C5DB0", "satin"), 0.02, 0.45], dome: 0.012 * k, topMat: cloth("#F2F5FA", "cotton"), axis: seat.axis });
    f.rim((q, out) => body.fn(q, 1, out), 0.0035 * k, 0.004 * k, cloth("#F2F5FA", "cotton"));
    // Dve trake pozadi, zlatno dugme napred
    const back = body.fn(uOf(Math.PI - 0.5), 0.2, new THREE.Vector3());
    for (const s of [0, 1]) {
        const pts = [back.clone(), back.clone().add(new THREE.Vector3(0.006 * k + s * 0.01 * k, -0.03 * k, -0.01 * k)), back.clone().add(new THREE.Vector3(0.002 + s * 0.016 * k, -0.065 * k, -0.012 * k))];
        f.mesh(tube(pts, 0.006 * k, f.n(16, 6), f.n(6, 4), 0.25), fabric("#2C5DB0", "satin"), "vrpca");
    }
    const front = body.fn(0.5, 0.25, new THREE.Vector3());
    const n = front.clone().sub(body.center).addScaledVector(body.axis, -front.clone().sub(body.center).dot(body.axis)).normalize();
    f.mesh(orient(new THREE.CylinderGeometry(0.007 * k, 0.007 * k, 0.003, f.n(20, 8)).rotateX(Math.PI / 2), front.addScaledVector(n, 0.003), n), metal("#FFC83D"), "dugme");
    f.openings(body.inside, fabric("#2C5DB0", "satin"));
}

function pilotCap(f: HeadFit) {
    const seat = f.rigidSeat(0.28, 0.35, 0.4, f.crown + 0.006);
    const loop = seat.loop;
    const k = f.k * seat.s;
    const body = hatBody(f, loop, (t) => [1 + 0.26 * smoothstep(0.35, 1, t), 0.004 + t * 0.045 * k], cloth("#2E3A66", "felt"), { band: [fabric("#1F2850", "rib"), 0.02, 0.4], dome: 0.008 * k, topMat: cloth("#3A4A80", "felt"), axis: seat.axis });
    f.rim((q, out) => body.fn(q, 1, out), 0.004 * k, 0.004 * k, cloth("#3A4A80", "felt"));
    // Crni sjajni šilt
    const visorMat = plastic("#14121A", 0.2);
    const base = new THREE.Vector3();
    const visor = (s: number, r: number, out: THREE.Vector3) => {
        const across = s * 2 - 1;
        body.fn(uOf(across * 0.95), 0.02, base);
        const outward = base.clone().sub(body.center).setY(0).normalize();
        const len = 0.05 * k * Math.sqrt(Math.max(0, 1 - across * across * 0.85));
        return out.copy(base).addScaledVector(outward.lerp(new THREE.Vector3(0, 0, 1), 0.4).normalize(), r * len).add(new THREE.Vector3(0, -0.018 * k * r, 0));
    };
    f.mesh(buildSurface(visor, { nu: f.n(22, 8), nv: f.n(6, 3), inside: () => f.c.clone().add(new THREE.Vector3(0, 0.1, 0)) }), visorMat, "silt");
    f.mesh(buildSurface((s, r, out) => visor(s, r, out).add(new THREE.Vector3(0, -0.0025, 0)), { nu: f.n(22, 8), nv: f.n(6, 3), inside: () => f.c.clone().add(new THREE.Vector3(0, 0.1, 0)) }), visorMat, "silt-dole");
    // Zlatni gajtan iznad šilta i krila na čelu
    const cord: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) cord.push(body.fn(uOf((i / 16 - 0.5) * 1.8), 0.1, new THREE.Vector3()).add(body.fn(uOf((i / 16 - 0.5) * 1.8), 0.1, new THREE.Vector3()).sub(body.center).setY(0).normalize().multiplyScalar(0.004)));
    f.mesh(tube(cord, 0.0016 * k, f.n(32, 10), 5), metal("#FFC83D"), "gajtan");
    const wing = new THREE.Shape();
    wing.moveTo(0, -0.004);
    wing.bezierCurveTo(0.012, 0.0, 0.026, 0.006, 0.034, 0.008);
    wing.bezierCurveTo(0.026, 0.0, 0.016, -0.006, 0.004, -0.008);
    wing.lineTo(0, -0.006);
    const wingGeo = slab(wing, 0.0015, 0.0007, 6);
    const left = wingGeo.clone().scale(k, k, 1);
    const right = wingGeo.clone().scale(-k, k, 1);
    const front = body.fn(0.5, 0.62, new THREE.Vector3());
    const n = front.clone().sub(body.center).setY(0).normalize();
    f.mesh(orient(mergeGeometries([left, right, new THREE.CircleGeometry(0.0065 * k, 16)]), front.addScaledVector(n, 0.004), n), metal("#FFC83D"), "krila");
    f.openings(body.inside, cloth("#3A4A80", "felt"));
}

function crown(f: HeadFit) {
    const k = f.k;
    const goldM = metal2("#FFC83D");
    const lift = f.crown + 0.005;
    const vBand = 0.21;
    const band: SurfaceFn = (u, w, out) => {
        const v = vBand + (1 - w) * 0.035;
        f.at(u, v, lift, out);
        const th = thetaOf(u);
        const spikes = Math.pow(Math.max(0, Math.cos(th * 5)), 3);
        const n = out.clone().sub(f.c).setY(0).normalize();
        return out.add(new THREE.Vector3(0, w * (0.026 + 0.032 * spikes) * k, 0)).addScaledVector(n, w * 0.008 * k);
    };
    f.mesh(buildSurface(band, { nu: f.n(132, 50), nv: f.n(9, 4), closedU: true, inside: () => f.c.clone().add(new THREE.Vector3(0, 0.12, 0)) }), goldM, "kruna");
    f.rim((q, out) => band(q, 0, out), 0.0048 * k, 0.0048 * k, metal("#F2AE1C"), 120);
    f.rim((q, out) => band(q, 0.42, out).add(band(q, 0.42, new THREE.Vector3()).sub(f.c).setY(0).normalize().multiplyScalar(0.0015)), 0.0022 * k, 0.0022 * k, metal("#F2AE1C"), 120);
    const colors = ["#E5484D", "#3D9BE9", "#3BB273", "#3D9BE9", "#3BB273"];
    for (let i = 0; i < 5; i++) {
        const u = (0.5 + i / 5) % 1;
        const tip = band(u, 1, new THREE.Vector3());
        const ball = f.mesh(new THREE.SphereGeometry(0.0068 * k, f.n(14, 6), f.n(10, 4)), metal("#FFE08A"), "kugla");
        ball.position.copy(tip).add(new THREE.Vector3(0, 0.005 * k, 0));
        const p = band(u, 0.22, new THREE.Vector3());
        const outward = p.clone().sub(f.c).setY(0).normalize();
        const jewel = f.mesh(new THREE.SphereGeometry(0.0075 * k, f.n(16, 8), f.n(10, 4)), gem(colors[i]), "dragulj");
        jewel.scale.set(1, 1.15, 0.55);
        jewel.position.copy(p).addScaledVector(outward, 0.003);
        jewel.lookAt(jewel.position.clone().add(outward));
    }
    // Kruna je otvorena odozgo: uši i rog prolaze kroz sredinu, otvor samo ako seku traku
    const inside: Inside = (p) => {
        const d = p.clone().sub(f.c);
        const [u] = f.uvOf(d);
        const lo = band(u, 0, new THREE.Vector3());
        const hi = band(u, 1, new THREE.Vector3());
        const r = Math.hypot(d.x, d.z);
        const rb = Math.hypot(lo.x - f.c.x, lo.z - f.c.z);
        return p.y > lo.y - 0.004 && p.y < hi.y && Math.abs(r - rb) < 0.008;
    };
    f.openings(inside, metal("#F2AE1C"));
}

function tiara(f: HeadFit) {
    const k = f.k;
    const silverM = metal("#DDE4EE");
    const tilt = bandTilt(f, 0.42);
    const lift = f.crown + 0.004;
    const path = f.headband(tilt, lift, 0.0045 * k, 0.003 * k, silverM, 0.8);
    // Prednji ukras: lukovi i dragulji (stoji uspravno iznad čela)
    const front = path(0.5, new THREE.Vector3());
    const n = f.bandNormal(0, tilt, new THREE.Vector3(), 0.8);
    const up = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
    const side = new THREE.Vector3().crossVectors(up, n).normalize();
    const pt = (x: number, y: number) => front.clone().addScaledVector(side, x * k).addScaledVector(up, y * k).addScaledVector(n, -Math.abs(x) * 0.25 * k);
    const arcs: [number, number][][] = [
        [[-0.065, 0.0], [-0.052, 0.022], [-0.03, 0.028], [-0.016, 0.042], [0, 0.062], [0.016, 0.042], [0.03, 0.028], [0.052, 0.022], [0.065, 0]],
        [[-0.04, 0.0], [-0.03, 0.016], [-0.014, 0.02], [0, 0.036], [0.014, 0.02], [0.03, 0.016], [0.04, 0]],
    ];
    for (const arc of arcs) f.mesh(tube(arc.map(([x, y]) => pt(x, y)), 0.0028 * k, f.n(40, 14), f.n(6, 4)), silverM, "luk");
    const pink = f.mesh(new THREE.OctahedronGeometry(0.013 * k, 1), gem("#F45B8D"), "dragulj");
    pink.scale.set(0.8, 1.2, 0.5);
    pink.position.copy(pt(0, 0.047));
    pink.lookAt(pink.position.clone().add(n));
    for (const [x, y, c, r] of [[-0.04, 0.022, "#B9A2F2", 0.007], [0.04, 0.022, "#B9A2F2", 0.007], [-0.06, 0.008, "#7ED6F2", 0.005], [0.06, 0.008, "#7ED6F2", 0.005]] as const) {
        const g = f.mesh(new THREE.SphereGeometry(r * k, f.n(12, 6), f.n(8, 4)), gem(c), "dragulj");
        g.scale.set(1, 1, 0.6);
        g.position.copy(pt(x, y));
        g.lookAt(g.position.clone().add(n));
    }
    // Biseri duž trake
    for (let i = 0; i < 8; i++) {
        const s = 0.28 + (i / 7) * 0.44;
        if (Math.abs(s - 0.5) < 0.07) continue;
        const pearl = f.mesh(new THREE.SphereGeometry(0.003 * k, 8, 6), plastic("#FFFFFF", 0.15), "biser");
        pearl.position.copy(path(s, new THREE.Vector3())).addScaledVector(f.bandNormal(s * 2 - 1, tilt, new THREE.Vector3(), 0.8), 0.003 * k);
    }
}

/** Traka za kosu sa ukrasom; vraća putanju i ugao */
function bandWith(f: HeadFit, color: string, width = 0.0055) {
    const tilt = bandTilt(f, 0.26);
    const lift = f.crown + 0.002;
    const path = f.headband(tilt, lift, width * f.k, 0.0038 * f.k, plastic(color, 0.35), 0.85);
    return { tilt, lift, path };
}

function bunnyBand(f: HeadFit) {
    const k = f.k;
    const { tilt, path } = bandWith(f, "#F45B8D");
    for (const side of SIDES) {
        const s = 0.5 + side * 0.13;
        const base = path(s, new THREE.Vector3());
        const n = f.bandNormal(s * 2 - 1, tilt, new THREE.Vector3(), 0.85);
        const up = n.clone().lerp(new THREE.Vector3(side * 0.25, 1, -0.1), 0.55).normalize();
        const pts = [base.clone().addScaledVector(up, -0.004), base.clone().addScaledVector(up, 0.05 * k), base.clone().addScaledVector(up, 0.1 * k).add(new THREE.Vector3(side * 0.01 * k, 0, -0.012 * k)), base.clone().addScaledVector(up, 0.13 * k).add(new THREE.Vector3(side * 0.02 * k, -0.004 * k, -0.03 * k))];
        const shape = (t: number) => (0.022 * Math.sin(Math.PI * (0.12 + t * 0.8)) + 0.004) * k;
        f.mesh(tube(pts, shape, f.n(24, 8), f.n(12, 6), 0.35), plush("#FFFFFF"), "uvo");
        const inner = pts.map((p) => p.clone().addScaledVector(new THREE.Vector3(0, 0, 1), 0.0055 * k));
        f.mesh(tube(inner.slice(0, 4), (t) => shape(t) * 0.6, f.n(20, 8), f.n(10, 6), 0.2), fabric("#F9B9C9", "felt"), "uvo-unutra");
    }
}

function antennae(f: HeadFit) {
    const k = f.k;
    const { tilt, path } = bandWith(f, "#3A3546");
    const colors = ["#FFD15C", "#F45B8D"];
    SIDES.forEach((side, i) => {
        const s = 0.5 + side * 0.12;
        const base = path(s, new THREE.Vector3());
        const n = f.bandNormal(s * 2 - 1, tilt, new THREE.Vector3(), 0.85);
        const pts = [base.clone().addScaledVector(n, -0.002), base.clone().add(new THREE.Vector3(side * 0.012 * k, 0.04 * k, 0.004 * k)), base.clone().add(new THREE.Vector3(side * 0.035 * k, 0.075 * k, 0.012 * k)), base.clone().add(new THREE.Vector3(side * 0.055 * k, 0.09 * k, 0.018 * k))];
        f.mesh(tube(pts, 0.0024 * k, f.n(24, 8), f.n(6, 4)), plastic("#3A3546", 0.4), "antena");
        const ball = f.mesh(new THREE.SphereGeometry(0.012 * k, f.n(20, 8), f.n(14, 6)), plastic(colors[i], 0.25), "kuglica");
        ball.position.copy(pts[3]);
        const shineGeo = new THREE.SphereGeometry(0.0035 * k, 8, 6);
        const sh = f.mesh(shineGeo, plastic("#FFFFFF", 0.1), "odsjaj");
        sh.position.copy(pts[3]).add(new THREE.Vector3(-0.004 * k, 0.005 * k, 0.008 * k));
    });
}

function flowerBand(f: HeadFit) {
    const k = f.k;
    const { tilt, path } = bandWith(f, "#FFB8CB");
    const s = 0.5 + 0.22;
    const at = path(s, new THREE.Vector3());
    const n = f.bandNormal(s * 2 - 1, tilt, new THREE.Vector3(), 0.85).lerp(new THREE.Vector3(0, 0, 1), 0.35).normalize();
    const { petals, middle } = flowerGeometry(0.046 * k, 6, f.r);
    f.mesh(orient(petals, at.clone().addScaledVector(n, 0.004), n, 0.3), fabric("#FFD15C", "satin", { sheen: 0.7 }), "cvet");
    f.mesh(orient(middle, at.clone().addScaledVector(n, 0.006), n), plastic("#F2A516", 0.5), "sredina");
}

function flowerCrown(f: HeadFit) {
    const k = f.k;
    const lift = f.crown + 0.004;
    const loop = f.seat(0.22, 0.33, 0.38, lift);
    f.rim(loop, 0.0028 * k, 0.0028 * k, fabric("#4FAE5E", "felt"), 64);
    const colors = ["#F78FB3", "#FFD15C", "#B9A2F2", "#F78FB3", "#B9A2F2", "#FFD15C", "#F78FB3"];
    const positions = [-1.35, -0.9, -0.45, 0, 0.45, 0.9, 1.35];
    const center = f.ringCenter(loop);
    positions.forEach((th, i) => {
        const at = loop(uOf(th), new THREE.Vector3());
        const out = at.clone().sub(center).normalize().lerp(new THREE.Vector3(0, 1, 0), 0.25).normalize();
        const size = (th === 0 ? 0.03 : 0.024) * k;
        const { petals, middle } = flowerGeometry(size, 5, f.r * 0.8);
        f.mesh(orient(petals, at.clone().addScaledVector(out, 0.003), out, i), fabric(colors[i], "satin", { sheen: 0.7 }), "cvet");
        f.mesh(orient(middle, at.clone().addScaledVector(out, 0.005), out), plastic(i % 2 ? "#FFFFFF" : "#F2A516", 0.5), "sredina");
        // Listić između cvetova
        if (i < positions.length - 1) {
            const lp = loop(uOf((th + positions[i + 1]) / 2), new THREE.Vector3());
            const leaf = new THREE.SphereGeometry(1, f.n(10, 6), f.n(6, 4)).scale(0.011 * k, 0.005 * k, 0.003 * k);
            const lo = lp.clone().sub(center).normalize();
            f.mesh(orient(leaf, lp.addScaledVector(lo, 0.002), lo, 0.6), fabric("#6CC46F", "felt"), "list");
        }
    });
}

function hairBow(f: HeadFit) {
    const k = f.k;
    const pink = fabric("#F45B8D", "satin", { sheen: 0.6 });
    const dark = fabric("#E0457A", "satin");
    const th = 0.85;
    const v = f.protrusions().length ? 0.3 : 0.22;
    const at = f.at(uOf(th), v, f.crown + 0.004);
    const n = f.head.normal(uOf(th), v, new THREE.Vector3());
    const up = new THREE.Vector3(0, 1, 0);
    const z = n.clone();
    const x = new THREE.Vector3().crossVectors(up, z).normalize();
    const y = new THREE.Vector3().crossVectors(z, x);
    const basis = new THREE.Matrix4().makeBasis(x, y, z);
    const g = new THREE.Group();
    g.position.copy(at).addScaledVector(n, 0.006 * k);
    g.quaternion.setFromRotationMatrix(basis).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.25));
    for (const s of SIDES) {
        // Petlja mašne: spljošten torus koji se širi napolje
        const loop = new THREE.Mesh(new THREE.TorusGeometry(0.019 * k, 0.0085 * k, f.n(10, 6), f.n(24, 10)), pink);
        loop.scale.set(1.25, 0.8, 0.5);
        loop.position.set(s * 0.025 * k, 0, 0);
        loop.rotation.y = s * 0.35;
        g.add(loop);
        const tail = new THREE.Mesh(tube([new THREE.Vector3(s * 0.003, -0.004, 0), new THREE.Vector3(s * 0.012 * k, -0.022 * k, -0.002), new THREE.Vector3(s * 0.02 * k, -0.038 * k, 0)], (t) => (0.0065 - t * 0.002) * k, f.n(12, 6), f.n(8, 4), 0.35), dark);
        g.add(tail);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.0095 * k, f.n(14, 8), f.n(10, 6)), dark);
    knot.scale.set(0.9, 1, 0.7);
    g.add(knot);
    f.add(g);
}

function bearHat(f: HeadFit) {
    const k = f.k;
    const { dome } = plushHat(f, "#BC8656", "#8A5A30");
    for (const side of SIDES) {
        const { p, n } = surfaceFrame(dome, 0.5 + side * 0.15, 0.42, f.c);
        const earGeo = new THREE.SphereGeometry(0.03 * k, f.n(20, 8), f.n(14, 6)).scale(1, 1, 0.5);
        const dir = n.clone().lerp(new THREE.Vector3(0, 1, 0), 0.4).normalize();
        f.mesh(orient(earGeo, p.clone().addScaledVector(dir, 0.016 * k), dir), plush("#A8703F"), "uvo");
        const inner = new THREE.SphereGeometry(0.017 * k, f.n(16, 8), f.n(10, 6)).scale(1, 1, 0.4);
        const fwd = new THREE.Vector3(0, 0, 1);
        f.mesh(orient(inner, p.clone().addScaledVector(dir, 0.018 * k).addScaledVector(fwd, 0.01 * k), fwd.clone().lerp(dir, 0.3)), plush("#F1CBA4"), "uvo-unutra");
    }
    f.domePatch(dome, 0.45, 0.55, 0.45, 0.72, 0.0012, decal(motifTexture("meda-zvezda", MOTIFS.star("#FFD15C"))));
}

function frogHat(f: HeadFit) {
    const k = f.k;
    const { dome } = plushHat(f, "#6CC46F", "#4FAE5E");
    for (const side of SIDES) {
        const { p, n } = surfaceFrame(dome, 0.5 + side * 0.075, 0.28, f.c);
        const dir = n.clone().lerp(new THREE.Vector3(0, 1, 0.3), 0.5).normalize();
        const lid = f.mesh(new THREE.SphereGeometry(0.026 * k, f.n(22, 10), f.n(16, 8)), plush("#6CC46F"), "oko-kapak");
        lid.position.copy(p).addScaledVector(dir, 0.012 * k);
        const eye = f.mesh(new THREE.SphereGeometry(0.019 * k, f.n(20, 8), f.n(14, 6)), plastic("#FFFFFF", 0.2), "oko");
        eye.position.copy(lid.position).add(new THREE.Vector3(0, 0.004 * k, 0.012 * k));
        const pupil = f.mesh(new THREE.SphereGeometry(0.0105 * k, f.n(16, 8), f.n(10, 6)), plastic("#2A1D18", 0.15), "zenica");
        pupil.position.copy(eye.position).add(new THREE.Vector3(0, 0.001, 0.012 * k));
        pupil.scale.set(1, 1, 0.6);
        const shine = f.mesh(new THREE.SphereGeometry(0.0033 * k, 8, 6), plastic("#FFFFFF", 0.05), "odsjaj");
        shine.position.copy(pupil.position).add(new THREE.Vector3(-0.004 * k, 0.004 * k, 0.005 * k));
    }
    // Osmeh i obrazi napred
    const smile: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
        const u = 0.5 + (i / 10 - 0.5) * 0.12;
        const w = 0.6 + 0.12 * Math.sin((i / 10) * Math.PI);
        const p = dome(u, w, new THREE.Vector3());
        smile.push(p.addScaledVector(p.clone().sub(f.c).normalize(), 0.0015));
    }
    f.mesh(tube(smile, 0.0022 * k, f.n(20, 8), 5), plush("#3E9950"), "osmeh");
    for (const side of SIDES) {
        const { p, n } = surfaceFrame(dome, 0.5 + side * 0.1, 0.72, f.c);
        f.mesh(orient(new THREE.SphereGeometry(0.009 * k, 12, 8).scale(1, 0.8, 0.3), p.addScaledVector(n, 0.001), n), plush("#F7A3BC"), "obraz");
    }
}

function dinoHat(f: HeadFit) {
    const k = f.k;
    const { dome } = plushHat(f, "#6CC46F", "#4FAE5E");
    // Narandžaste bodlje po sredini, od čela do potiljka
    const spikes: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) {
        const back = i >= 1;
        const u = back ? 0.0001 : 0.5;
        const ww = back ? (i - 1) * 0.17 + 0.05 : 0.35 - i * 0.1;
        const { p, n } = surfaceFrame(dome, u, Math.min(0.95, Math.max(0.05, i === 0 ? 0.32 : ww)), f.c);
        const h = (0.03 - Math.abs(i - 2) * 0.003) * k;
        const cone = new THREE.ConeGeometry(0.014 * k, h, f.n(14, 6), 1).scale(0.45, 1, 1);
        cone.translate(0, h / 2 - 0.003, 0);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        cone.applyQuaternion(q).translate(p.x, p.y, p.z);
        spikes.push(cone);
    }
    f.mesh(mergeGeometries(spikes), plush("#FF8A3D"), "bodlje");
    for (const [u, w, r] of [[0.36, 0.5, 0.011], [0.62, 0.38, 0.013], [0.5, 0.2, 0.008], [0.75, 0.6, 0.01], [0.25, 0.65, 0.01]] as const) {
        const { p, n } = surfaceFrame(dome, u, w, f.c);
        f.mesh(orient(new THREE.SphereGeometry(r * k, 14, 8).scale(1, 1, 0.25), p, n), plush("#4FAE5E"), "fleka");
    }
    // Beli zubići na obodu napred
    for (const side of SIDES) {
        for (let i = 0; i < 2; i++) {
            const u = 0.5 + side * (0.08 + i * 0.04);
            const { p } = surfaceFrame(dome, u, 1, f.c);
            const tooth = new THREE.ConeGeometry(0.0065 * k, 0.013 * k, 8).rotateX(Math.PI);
            const n = p.clone().sub(f.c).setY(0).normalize();
            const m = f.mesh(tooth, plastic("#FFFFFF", 0.3), "zub");
            m.position.copy(p).addScaledVector(n, 0.012 * k).add(new THREE.Vector3(0, -0.01 * k, 0));
        }
    }
}

function elfHat(f: HeadFit) {
    const k = f.k;
    const red = plush("#E5484D");
    const lift = f.crown + 0.008;
    const edge = capEdge(0.38, 0.56, 1.1);
    const dome = f.dome(edge, (_u, w) => lift + 0.008 * (1 - w), red, 80, 24);
    // Krzneni beli obod
    f.rim((q, out) => dome(q, 0.96, out), 0.011 * k, 0.013 * k, fabric("#FFFFFF", "fleece", { sheen: 1, sheenLift: 0.6, normalScale: 1.5 }), 80);
    // Dugačak vrh koji pada u stranu
    const top = dome(0.5, 0, new THREE.Vector3());
    // Vrh pada na desnu stranu lika (gledaocu levo, vidi se u 3/4 pogledu)
    const side = -1;
    const pts = [
        top.clone().add(new THREE.Vector3(0, -0.05 * k, -0.005 * k)),
        top.clone().add(new THREE.Vector3(side * 0.015 * k, 0.025 * k, -0.02 * k)),
        top.clone().add(new THREE.Vector3(side * 0.055 * k, 0.05 * k, -0.045 * k)),
        top.clone().add(new THREE.Vector3(side * 0.1 * k, 0.03 * k, -0.06 * k)),
        top.clone().add(new THREE.Vector3(side * 0.125 * k, -0.02 * k, -0.06 * k)),
    ];
    f.mesh(tube(pts, (s) => (0.058 * Math.pow(1 - s, 1.2) + 0.008) * k, f.n(32, 10), f.n(20, 8)), red, "vrh");
    const pom = f.mesh(pompom(0.02 * k, f.r), fabric("#FFFFFF", "fleece", { sheen: 1, sheenLift: 0.6, normalScale: 1.5 }), "kicanka");
    pom.position.copy(pts[4]).add(new THREE.Vector3(0, -0.012 * k, 0));
    f.openings(f.domeInside(edge, lift + 0.006), fabric("#FFFFFF", "fleece"));
}

function bikeHelmet(f: HeadFit) {
    const k = f.k;
    const green = shell("#3BB273");
    const lift = f.crown + 0.022;
    const edge = capEdge(0.34, 0.5, 1.2);
    const dome = f.dome(edge, (u, w) => lift + 0.006 * (1 - w) + 0.006 * Math.pow(Math.max(0, -Math.cos(thetaOf(u))), 2) * w, green, 72, 22);
    // Unutrašnja penasta postava (vidi se na ivici) i žuta traka
    f.rim((q, out) => dome(q, 1, out), 0.007 * k, 0.008 * k, plastic("#FFC83D", 0.4), 72);
    // Rebra i otvori za vazduh
    for (const u of [0.42, 0.5, 0.58]) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 12; i++) {
            const uu = u === 0.5 ? 0.5 : 0.5 + (u - 0.5) * (1 - (i / 12) * 0.2);
            const p = dome(uu, 0.08 + (i / 12) * 0.82, new THREE.Vector3());
            pts.push(p.addScaledVector(p.clone().sub(f.c).normalize(), 0.003));
        }
        f.mesh(tube(pts, 0.0055 * k, f.n(24, 10), f.n(8, 4), 0.6), shell("#2A8E57"), "rebro");
    }
    for (const u of [0.46, 0.54, 0.37, 0.63]) {
        f.domePatch(dome, u - 0.022, u + 0.022, 0.25, 0.75, 0.0012, plastic("#1F6B41", 0.6));
    }
    // Kaiševi ispod brade i kopča
    const chin = f.at(0.5, 0.92, 0.012);
    for (const side of SIDES) {
        const a = dome(0.5 + side * 0.2, 1, new THREE.Vector3());
        const mid = f.at(0.5 + side * 0.17, 0.75, 0.008);
        f.mesh(tube([a, mid, chin], 0.0028 * k, f.n(20, 8), 4, 0.35), plastic("#2A2A30", 0.5), "kais");
    }
    const buckle = f.mesh(new THREE.BoxGeometry(0.016 * k, 0.008 * k, 0.005 * k), plastic("#3A3546", 0.3), "kopca");
    buckle.position.copy(chin);
    f.openings(f.domeInside(edge, lift + 0.006), shell("#2A8E57"));
}

function fireHelmet(f: HeadFit) {
    const k = f.k;
    const red = shell("#E5484D");
    const lift = f.crown + 0.014;
    const edge = capEdge(0.33, 0.44, 1.1);
    const dome = f.dome(edge, (_u, w) => lift + 0.008 * (1 - w), red, 72, 22);
    // Greben po sredini
    const comb: THREE.Vector3[] = [];
    for (let i = 0; i <= 14; i++) {
        const w = i / 14;
        const u = w < 0.5 ? 0.5 : 0.0001;
        const p = dome(u, w < 0.5 ? 0.82 * (1 - w * 2) + 0.02 : (w - 0.5) * 2 * 0.85 + 0.02, new THREE.Vector3());
        comb.push(p.addScaledVector(p.clone().sub(f.c).normalize(), 0.006 * k));
    }
    f.mesh(tube(comb, 0.007 * k, f.n(32, 10), f.n(8, 4), 1.6), shell("#C53035"), "greben");
    // Obod: uzak napred, dug pozadi (štiti vrat)
    const loop = (q: number, out: THREE.Vector3) => dome(q, 1, out);
    const brim = f.brim(loop, (q) => (0.016 + 0.05 * Math.pow(Math.max(0, -Math.cos(thetaOf(q))), 1.5)) * k, (q, r) => -0.016 * k * r * Math.pow(Math.max(0, -Math.cos(thetaOf(q))), 1.2) - 0.004 * k * r, 0.004 * k, shell("#B8323A"), shell("#9E2A31"), shell("#9E2A31"), 96, 8);
    // Zlatni štit sa crvenom zvezdom
    const { p, n } = surfaceFrame(dome, 0.5, 0.62, f.c);
    const shield = new THREE.Shape();
    shield.moveTo(-0.016, 0.014);
    shield.lineTo(0.016, 0.014);
    shield.lineTo(0.015, -0.004);
    shield.quadraticCurveTo(0.008, -0.016, 0, -0.02);
    shield.quadraticCurveTo(-0.008, -0.016, -0.015, -0.004);
    shield.closePath();
    const sg = slab(shield, 0.002, 0.0012, 8).scale(k, k, 1);
    f.mesh(orient(sg, p.clone().addScaledVector(n, 0.003), n, 0, new THREE.Vector3(0, 1, 0)), metal("#FFC83D"), "stit");
    f.mesh(orient(slab(starShape(0.008 * k), 0.0012, 0.0006), p.clone().addScaledVector(n, 0.0058).add(new THREE.Vector3(0, 0.001, 0)), n, 0, new THREE.Vector3(0, 1, 0)), plastic("#E5484D", 0.3), "zvezda");
    f.openings([f.domeInside(edge, lift + 0.008), brim.inside], shell("#C53035"));
}

function propellerCap(f: HeadFit): ItemBuild {
    const k = f.k;
    const panels = printTexture("propeler-paneli", (c, w, h) => {
        const colors = ["#FFD15C", "#3D9BE9", "#FFD15C", "#F45B8D", "#FFD15C", "#3D9BE9", "#FFD15C", "#F45B8D"];
        colors.forEach((col, i) => {
            c.fillStyle = col;
            c.fillRect((i / 8) * w, 0, w / 8 + 1, h);
        });
    }, 128, 8);
    const main = cached("propeler-kapa", () => new THREE.MeshPhysicalMaterial({ map: panels, roughness: 0.7, sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color("#FFFFFF"), normalMap: fabricNormal("cotton"), normalScale: new THREE.Vector2(0.35, 0.35), side: THREE.DoubleSide }));
    const lift = f.crown + 0.006;
    const edge = capEdge(0.36, 0.48);
    const dome = f.dome(edge, (_u, w) => lift + 0.005 * (1 - w), main, 72, 22, [1, 1]);
    f.rim((q, out) => dome(q, 1, out), 0.004 * k, 0.006 * k, fabric("#3BB273", "cotton"), 72);
    // Mali zeleni šilt napred
    const vis = (s: number, r: number, out: THREE.Vector3) => {
        const across = s * 2 - 1;
        const base = dome(uOf(across * 0.8), 1, out);
        const o = base.clone().sub(f.c).setY(0).normalize().lerp(new THREE.Vector3(0, 0, 1), 0.5).normalize();
        return out.addScaledVector(o, r * 0.045 * k * Math.sqrt(Math.max(0, 1 - across * across * 0.8))).add(new THREE.Vector3(0, -0.008 * k * r, 0));
    };
    f.mesh(buildSurface(vis, { nu: f.n(20, 8), nv: f.n(5, 3), inside: () => f.c.clone().add(new THREE.Vector3(0, 0.1, 0)) }), cloth("#3BB273", "cotton"), "silt");
    // Propeler na štapiću (vrti se)
    const top = dome(0.5, 0, new THREE.Vector3());
    const post = f.mesh(new THREE.CylinderGeometry(0.0035 * k, 0.0045 * k, 0.03 * k, f.n(12, 6)), metal("#8C98AB"), "stapic");
    const lean = f.protrusions().length ? new THREE.Vector3(0, 0, -0.03 * k) : new THREE.Vector3();
    post.position.copy(top).add(new THREE.Vector3(0, 0.013 * k, 0)).add(lean);
    const rotor = new THREE.Group();
    rotor.position.copy(top).add(new THREE.Vector3(0, 0.03 * k, 0)).add(lean);
    for (const s of SIDES) {
        const blade = new THREE.Mesh(new THREE.SphereGeometry(1, f.n(20, 8), f.n(10, 5)), plastic("#E5484D", 0.3));
        blade.scale.set(0.04 * k, 0.003 * k, 0.012 * k);
        blade.position.set(s * 0.04 * k, 0, 0);
        blade.rotation.x = s * 0.35;
        rotor.add(blade);
    }
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.0075 * k, f.n(14, 6), f.n(10, 4)), plastic("#FFD15C", 0.3));
    rotor.add(hub);
    f.add(rotor);
    f.openings(f.domeInside(edge, lift + 0.005), fabric("#3BB273", "cotton"));
    let angle = 0;
    return {
        animate: (_time, dt, live) => {
            if (!live) return;
            angle += dt * 5;
            rotor.rotation.y = angle;
        },
    };
}

function knightHelmet(f: HeadFit) {
    const k = f.k;
    const shellM = steel();
    const trimM = steel("#AEB9C9");
    const lift = f.crown + 0.01;
    // Otvoren spreda: lice slobodno, sa strane do vilice, pozadi do vrata
    const edge = (th: number) => {
        const a = Math.abs(th);
        return 0.34 + 0.5 * smoothstep(0.55, 1.25, a) + 0.08 * smoothstep(2.2, Math.PI, a);
    };
    const dome = f.dome(edge, (_u, w) => lift + 0.006 * (1 - w), shellM, 72, 26, [2, 1]);
    f.rim((q, out) => dome(q, 1, out), 0.005 * k, 0.005 * k, trimM, 80);
    // Greben po sredini i zakovice
    const ridge: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
        const w = i / 16;
        const u = w < 0.5 ? 0.5 : 0.0001;
        const p = dome(u, w < 0.5 ? 0.92 * (1 - w * 2) + 0.01 : (w - 0.5) * 2 * 0.9 + 0.01, new THREE.Vector3());
        ridge.push(p.addScaledVector(p.clone().sub(f.c).normalize(), 0.002));
    }
    f.mesh(tube(ridge, 0.0045 * k, f.n(32, 10), f.n(8, 4), 0.8), trimM, "greben");
    for (const side of SIDES) {
        for (const w of [0.55, 0.75]) {
            const { p, n } = surfaceFrame(dome, 0.5 + side * 0.2, w, f.c);
            const rivet = f.mesh(new THREE.SphereGeometry(0.0035 * k, 10, 6).scale(1, 1, 0.5), trimM, "zakovica");
            rivet.position.copy(p).addScaledVector(n, 0.001);
            rivet.lookAt(rivet.position.clone().add(n));
        }
    }
    // Crvena perjanica na temenu (meka, nije oružje)
    const top = dome(0.5, 0.05, new THREE.Vector3());
    const plume: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
        const s = (i - 2) * 0.008 * k;
        const pts = [top.clone().add(new THREE.Vector3(s, 0, 0)), top.clone().add(new THREE.Vector3(s * 1.4, 0.04 * k, -0.01 * k)), top.clone().add(new THREE.Vector3(s * 1.8, 0.06 * k, -0.05 * k)), top.clone().add(new THREE.Vector3(s * 2, 0.045 * k, -0.09 * k))];
        plume.push(tube(pts, (t) => (0.008 * Math.sin(Math.PI * (0.15 + t * 0.85)) + 0.002) * k, f.n(20, 8), f.n(8, 4), 0.6));
    }
    f.mesh(mergeGeometries(plume), fabric("#E5484D", "fleece", { sheen: 1, sheenLift: 0.5 }), "perjanica");
    f.openings(f.domeInside(edge, lift + 0.006), trimM);
}

function spaceHelmet(f: HeadFit): ItemBuild {
    const k = f.k;
    const a = f.a;
    // Kugla obuhvata glavu, njušku, uši i rog
    const center = f.c.clone().add(new THREE.Vector3(0, 0.005, 0.004));
    let R = Math.max(a.head.w, a.head.d, a.head.h) * 0.66;
    let top = R;
    for (const p of [a.nose.tip, a.mouth]) R = Math.max(R, f.local(p).sub(center).setY(0).length() + 0.03);
    for (const pr of f.protrusions()) {
        const d = pr.tip.clone().sub(center);
        top = Math.max(top, d.y + 0.03);
        R = Math.max(R, Math.hypot(d.x, d.z) + 0.03);
    }
    top = Math.max(top, R);
    const bottomY = Math.max(-R * 0.82, f.local(a.neck.center).y - center.y);
    const phiMax = Math.acos(Math.max(-0.95, bottomY / R));
    const sphere = new THREE.SphereGeometry(R, f.n(48, 20), f.n(32, 12), 0, TAU, 0, phiMax);
    sphere.scale(1, top / R, 1);
    sphere.translate(center.x, center.y, center.z);
    const bubble = f.mesh(sphere, bubbleMat(), "kugla");
    bubble.renderOrder = 4;
    // Okovratnik (beli prsten) na dnu kugle sa lampicama
    const ringY = center.y + Math.cos(phiMax) * R * (top / R);
    const ringR = Math.sin(phiMax) * R;
    const collar = f.mesh(new THREE.TorusGeometry(ringR + 0.004, 0.014 * k, f.n(12, 6), f.n(48, 16)).rotateX(Math.PI / 2), plastic("#F2F5FA", 0.35), "okovratnik");
    collar.position.set(center.x, ringY, center.z);
    collar.scale.set(1, 0.8, 1);
    const collar2 = f.mesh(new THREE.TorusGeometry(ringR - 0.002, 0.006 * k, 8, f.n(48, 16)).rotateX(Math.PI / 2), plastic("#AEB9C9", 0.4), "okovratnik-ivica");
    collar2.position.set(center.x, ringY + 0.012 * k, center.z);
    for (const [ang, col] of [[0.55, "#3D9BE9"], [-0.55, "#FFC83D"], [0.0, "#F45B8D"]] as const) {
        const light = f.mesh(new THREE.SphereGeometry(0.0055 * k, 10, 8), cached(`lampica-${col}`, () => new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, roughness: 0.4 })), "lampica");
        light.position.set(center.x + Math.sin(ang) * (ringR + 0.016 * k), ringY, center.z + Math.cos(ang) * (ringR + 0.016 * k));
    }
    // Antena sa kuglicom
    const base = center.clone().add(new THREE.Vector3(Math.sin(-0.5) * R * 0.75, top * 0.66, Math.cos(-0.5) * R * 0.3));
    const tip = base.clone().add(new THREE.Vector3(-0.012 * k, 0.04 * k, -0.004));
    f.mesh(tube([base, tip], 0.0022 * k, 8, 6), metal("#AEB9C9"), "antena");
    const ball = f.mesh(new THREE.SphereGeometry(0.008 * k, 12, 8), plastic("#F45B8D", 0.25), "antena-kuglica");
    ball.position.copy(tip);
    // Odsjaj na kugli (meka bela traka, utisak stakla)
    const glint: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
        const t = -0.9 + (i / 10) * 0.7;
        glint.push(center.clone().add(new THREE.Vector3(Math.sin(t - 0.6) * R * 0.98, top * (0.2 + i * 0.045), Math.cos(t - 0.6) * R * 0.98)));
    }
    f.mesh(tube(glint, 0.004 * k, 16, 6, 0.3), glass("#FFFFFF", 0.55), "odsjaj");
}

function unicornHornBand(f: HeadFit) {
    const k = f.k;
    const a = f.a;
    const { tilt, path } = bandWith(f, "#B9A2F2", 0.006);
    // Rog: na mestu pravog roga (jednorog), inače na čelu iznad trake
    let base: THREE.Vector3;
    let dir: THREE.Vector3;
    if (a.horn) {
        base = f.local(a.horn.base);
        dir = f.local(a.horn.tip).sub(base).normalize();
    } else {
        base = path(0.5, new THREE.Vector3());
        const n = f.bandNormal(0, tilt, new THREE.Vector3(), 0.85);
        dir = n.clone().lerp(new THREE.Vector3(0, 1, 0), 0.6).normalize();
        base.addScaledVector(n, 0.004);
    }
    const H = 0.11 * k;
    const R = 0.017 * k;
    const spiral: SurfaceFn = (q, t, out) => {
        const ang = q * TAU;
        const r = R * (1 - t) * (1 + 0.14 * Math.sin(ang * 1 + t * 26)) + 0.0008;
        return out.set(Math.sin(ang) * r, t * H, Math.cos(ang) * r);
    };
    const hornGeo = buildSurface(spiral, { nu: f.n(24, 10), nv: f.n(36, 12), closedU: true, inside: (_q, t, out) => out.set(0, t * H, 0) });
    hornGeo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    hornGeo.translate(base.x, base.y, base.z);
    f.mesh(hornGeo, metal("#FFD15C"), "rog");
    const ring = f.mesh(new THREE.TorusGeometry(R * 1.05, 0.003 * k, 6, f.n(20, 10)), metal("#F2A516"), "rog-prsten");
    ring.position.copy(base);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    // Cvetići na traci
    const colors = ["#F78FB3", "#7ED6F2", "#B9A2F2", "#F78FB3"];
    [0.36, 0.64, 0.25, 0.75].forEach((s, i) => {
        const at = path(s, new THREE.Vector3());
        const n = f.bandNormal(s * 2 - 1, tilt, new THREE.Vector3(), 0.85);
        const { petals, middle } = flowerGeometry((i < 2 ? 0.02 : 0.015) * k, 5, f.r * 0.8);
        f.mesh(orient(petals, at.clone().addScaledVector(n, 0.003), n, i), fabric(colors[i], "satin", { sheen: 0.7 }), "cvet");
        f.mesh(orient(middle, at.clone().addScaledVector(n, 0.005), n), plastic("#FFD15C", 0.5), "sredina");
    });
}

registerItems("hat", [
    hat("kapa", (f) => baseballCap(f, { color: "#3D7BE0", visor: "#2C5DB0", badge: motifTexture("kapa-zvezda", MOTIFS.star("#FFD15C")) })),
    hat("sesir", (f) => sunHat(f)),
    hat("masna", (f) => hairBow(f), { dependsOn: ["hair", "hijab"] }),
    hat("cvetni-venac", (f) => flowerCrown(f)),
    hat("cilindar", (f) => topHat(f)),
    hat("kruna", (f) => crown(f)),
    hat("rodjendanska-kapa", (f) => partyHat(f)),
    hat("kapa-siltom", (f) => baseballCap(f, { color: "#E5484D", visor: "#B8323A", visorTh: 1.15, badge: capStar("#E5484D", "#3D7BE0") })),
    hat("zelena-kapa-siltom", (f) => baseballCap(f, { color: "#3BB273", visor: "#2A8E57", visorTh: 1.15, badge: capStar("#3BB273", "#F2A516") })),
    hat("traka-zeka", (f) => bunnyBand(f)),
    hat("traka-cvet", (f) => flowerBand(f)),
    hat("antene", (f) => antennae(f)),
    hat("zimska-kapa", (f) => {
        beanie(f, { color: "#4CB8C4", cuff: "#FFD15C" });
    }),
    hat("roze-zimska-kapa", (f) => {
        beanie(f, { color: "#F78FB3", cuff: "#FFFFFF" });
    }),
    hat("mornarska-kapa", (f) => sailorCap(f)),
    hat("slamnati-sesir", (f) => strawHat(f)),
    hat("kuvarska-kapa", (f) => chefHat(f)),
    hat("kapa-meda", (f) => bearHat(f)),
    hat("kapa-patuljka", (f) => elfHat(f)),
    hat("kaciga-bicikl", (f) => bikeHelmet(f)),
    hat("kapa-propeler", (f) => propellerCap(f), { motion: "spin" }),
    hat("kapa-pilota", (f) => pilotCap(f)),
    hat("kapa-dino", (f) => dinoHat(f)),
    hat("slem-viteza", (f) => knightHelmet(f), { covers: ["hair"] }),
    hat("kapa-zabica", (f) => frogHat(f)),
    hat("piratski-sesir", (f) => pirateHat(f)),
    hat("kaubojski-sesir", (f) => cowboyHat(f)),
    hat("vatrogasni-slem", (f) => fireHelmet(f)),
    hat("tijara", (f) => tiara(f)),
    hat("rog-jednoroga", (f) => unicornHornBand(f), { covers: ["horn"] }),
    hat("sesir-carobnjaka", (f) => wizardHat(f), { thumb: { focus: "head", zoom: 0.8 } }),
    hat("astronautski-slem", (f) => spaceHelmet(f), { thumb: { focus: "head", zoom: 0.85 } }),
    // Novo u 3D: moderne kape sa šiltom, opuštene kape, mekane trake za kosu
    hat("teget-kapa-siltom", (f) => baseballCap(f, { color: "#22315C", visor: "#1B2749", modern: true, badge: motifTexture("kapa-zvezdica-bela", MOTIFS.star("#FFFFFF")) })),
    hat("crna-kapa-siltom", (f) => baseballCap(f, { color: "#26262B", visor: "#1D1D21", modern: true })),
    hat("bez-kapa-siltom", (f) => baseballCap(f, { color: "#D9C6A5", visor: "#CDB894", modern: true, badge: motifTexture("kapa-srce-braon", MOTIFS.heart("#8A5A30")) })),
    hat("crna-opustena-kapa", (f) => slouchyBeanie(f, "#2C2C32")),
    hat("krem-opustena-kapa", (f) => slouchyBeanie(f, "#EDE3CF")),
    hat("zelena-opustena-kapa", (f) => slouchyBeanie(f, "#9CAF88")),
    hat("traka-za-kosu", (f) => softHeadband(f, "#F3ECE2")),
    hat("traka-marama", (f) => bandanaHeadband(f)),
    // ── Novo: kapice (takija), zimske kape, kapa sa šiltom, traka ──
    hat("bela-kapica", (f) => kufi(f, "#F7F5EF", "#DCD6C8")),
    hat("vezena-kapica", (f) => kufi(f, "#EFE3C8", "#C9A55A", true)),
    hat("teget-kapica", (f) => kufi(f, "#2E3A66", "#C9CED6", true)),
    hat("zuta-zimska-kapa", (f) => {
        beanie(f, { color: "#F7C948", cuff: "#F2A516", pom: "#FFFFFF" });
    }),
    hat("teget-zimska-kapa", (f) => {
        beanie(f, { color: "#2E3A66", cuff: "#B8323A", pomR: 0 });
    }),
    hat("zuta-kapa-siltom", (f) => baseballCap(f, { color: "#F7C948", visor: "#2E9A50", visorTh: 1.15, badge: capStar("#F7C948", "#2E9A50") })),
    hat("lila-opustena-kapa", (f) => slouchyBeanie(f, "#B9A2F2")),
    hat("roze-traka-za-kosu", (f) => softHeadband(f, "#F7B8C8")),
]);
