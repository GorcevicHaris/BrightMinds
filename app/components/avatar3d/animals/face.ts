// Lice životinje: krupne sjajne oči (ispupčena rožnjača, dva odsjaja, kapci od krzna koji
// trepću, linija trepavica), obrve od krzna (izraz), vlažan nos, usta sa „morph” oblicima
// (osmeh, tuga, otvorena, široki osmeh sa zubima i jezikom, „o”) za izraze i govor, brkovi.
// Sve je u koordinatama kosti glave.

import * as THREE from "three";
import type { FaceControl, FaceExpression } from "../contract";
import { buildSurface, clamp01, lerp, polyPath, smoothstep, taperedTube } from "../engine/surface";
import type { AnimalHead } from "./head";
import { eyeMaterial, lineMaterial, mouthMaterial, noseMaterial, shineMaterial } from "./materials";
import { col } from "./paint";

export interface FaceSpec {
    eye: {
        /** Ivica gornjeg i donjeg kapka kad je oko otvoreno (rad od središta oka) */
        upper: number;
        lower: number;
        /** Trepavice na spoljnom uglu (0 = bez) */
        lashes?: number;
        /** Veličina dužice i zenice (ugao, rad) */
        iris?: number;
        pupil?: number;
    };
    brow: { dv: number; du?: number; len: number; thick: number };
    nose: { kind: "button" | "oval" | "none" | "nostrils"; w: number; h: number; d: number; v?: number; lift?: number; tilt?: number };
    mouth: {
        /** Poluširina i najveće otvaranje (m) */
        w: number;
        h: number;
        /** „w” (mačka, zeka), „smile” (pas, meda) */
        curve: "w" | "smile";
        teeth: "none" | "buck" | "fangs" | "row";
        /** Poluprečnik zakrivljenosti njuške (m) — usta prate površinu */
        wrap: number;
        /** Linija od nosa do usta (m), 0 = bez */
        philtrum: number;
        line: number;
        v?: number;
        /** Pomeraj ispred površine (m) */
        lift?: number;
    };
    whiskers?: { count: number; len: number; v: number; u: number; color: string };
}

export interface FaceColors {
    nose: string;
    brow: string;
    iris: [string, string];
    mouth: string;
    /** Boja kapaka (krzno oko očiju) — materijal krzna sa bojama temena */
    lidMaterial: THREE.Material;
    /** Bojenje kapka (boje temena u prostoru kosti glave) */
    paintLid: (geometry: THREE.BufferGeometry, eyeCenter: THREE.Vector3) => void;
    browMaterial: THREE.Material;
    paintBrow: (geometry: THREE.BufferGeometry) => void;
}

/** Parametri izraza (svi se meko mešaju) */
interface FaceParams {
    smile: number;
    frown: number;
    open: number;
    wide: number;
    round: number;
    upper: number;
    lower: number;
    lidTilt: number;
    browRaise: number;
    browTilt: number;
    browAsym: number;
}

const ZERO_PARAMS: FaceParams = { smile: 0, frown: 0, open: 0, wide: 0, round: 0, upper: 0, lower: 0, lidTilt: 0, browRaise: 0, browTilt: 0, browAsym: 0 };

const EXPRESSIONS: Record<FaceExpression, Partial<FaceParams>> = {
    neutral: { smile: 0.4 },
    happy: { smile: 0.85, wide: 0.6, lower: 0.28, browRaise: 0.45 },
    proud: { smile: 0.75, upper: -0.12, lower: 0.12, browRaise: 0.25 },
    gentle: { smile: 0.55, upper: -0.14, lower: 0.14, browTilt: 0.3 },
    curious: { round: 0.28, browAsym: 0.9, upper: 0.06 },
    sad: { frown: 0.75, browTilt: 0.85, upper: -0.16, lidTilt: 0.3 },
    serious: { frown: 0.2, browTilt: -0.7, browRaise: -0.35, upper: -0.08 },
    worried: { frown: 0.45, open: 0.12, browTilt: 1, browRaise: 0.15, lidTilt: 0.18 },
    surprised: { round: 1, browRaise: 1, upper: 0.2, lower: -0.06 },
};

function paramsOf(e: FaceExpression): FaceParams {
    return { ...ZERO_PARAMS, ...(EXPRESSIONS[e] ?? EXPRESSIONS.neutral) };
}

// ── Oko ───────────────────────────────────────────────────────────────────────

interface EyeRig {
    group: THREE.Group;
    ball: THREE.Mesh;
    upperTilt: THREE.Group;
    upper: THREE.Group;
    lower: THREE.Group;
    side: 1 | -1;
}

/** Očna jabučica sa ispupčenom rožnjačom iznad dužice (odsjaj „klizi” kao na pravom oku) */
function eyeballGeometry(r: number, iris: number, quality: "high" | "low"): THREE.BufferGeometry {
    const g = new THREE.SphereGeometry(r, quality === "high" ? 48 : 28, quality === "high" ? 32 : 18);
    const p = g.getAttribute("position");
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const angle = Math.acos(Math.max(-1, Math.min(1, v.z / r)));
        const k = clamp01(1 - angle / (iris * 1.08));
        v.multiplyScalar(1 + 0.075 * k * k * (3 - 2 * k));
        p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
}

function buildEye(head: AnimalHead, spec: FaceSpec, colors: FaceColors, side: 1 | -1, quality: "high" | "low"): EyeRig {
    const e = head.spec.eye;
    const r = e.r;
    const u = 0.5 + side * e.u;
    const surface = head.point(u, e.v);
    const n = head.normal(u, e.v);
    const group = new THREE.Group();
    group.name = "oko";
    group.position.copy(surface).addScaledVector(n, -r * e.inset);
    // Oči gledaju napred, malo jedna ka drugoj (pogled u dete); blago napolje prema obliku glave
    group.rotation.set(0, side * (e.yaw ?? 0.1), side * 0.05, "YXZ");
    const iris = spec.eye.iris ?? 0.72;
    const ball = new THREE.Mesh(eyeballGeometry(r, iris, quality), eyeMaterial(colors.iris[0], colors.iris[1], iris, spec.eye.pupil ?? 0.36));
    ball.name = "zenica";
    group.add(ball);
    // Odsjaji: krupan gore (gledano spreda levo) i mali dole desno — uvek isti, „živ” pogled
    const shine = new THREE.Mesh(new THREE.SphereGeometry(r * 0.17, 14, 10), shineMaterial());
    shine.scale.set(1, 1.15, 0.3);
    shine.position.copy(new THREE.Vector3(-0.3, 0.36, 0.88).normalize()).multiplyScalar(r * 1.075);
    shine.lookAt(shine.position.clone().multiplyScalar(2));
    group.add(shine);
    const shine2 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.08, 10, 8), shineMaterial());
    shine2.scale.set(1, 1, 0.35);
    shine2.position.copy(new THREE.Vector3(0.24, -0.26, 0.93).normalize()).multiplyScalar(r * 1.07);
    shine2.lookAt(shine2.position.clone().multiplyScalar(2));
    group.add(shine2);

    // Kapci: polulopte od krzna malo veće od oka
    const lidR = r * 1.06;
    const seg = quality === "high" ? 40 : 24;
    const upperGeo = new THREE.SphereGeometry(lidR, seg, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    const lowerGeo = new THREE.SphereGeometry(lidR * 0.975, seg, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    // Zadebljanje ivice kapka (mek obod)
    for (const [g, sign] of [[upperGeo, 1], [lowerGeo, -1]] as const) {
        const p = g.getAttribute("position");
        const v = new THREE.Vector3();
        for (let i = 0; i < p.count; i++) {
            v.fromBufferAttribute(p, i);
            const edge = 1 - Math.abs(v.y) / lidR;
            v.multiplyScalar(1 + 0.05 * Math.pow(edge, 6) * (sign > 0 ? 1 : 0.6));
            p.setXYZ(i, v.x, v.y, v.z);
        }
        g.computeVertexNormals();
        colors.paintLid(g, group.position);
    }
    const upperTilt = new THREE.Group();
    const upper = new THREE.Group();
    upper.add(new THREE.Mesh(upperGeo, colors.lidMaterial));
    // Linija trepavica na ivici gornjeg kapka, deblja ka spoljnom uglu
    const lashMat = lineMaterial(colors.mouth);
    const lash = new THREE.Mesh(taperedTube((s, out) => {
        const t = Math.PI * (0.04 + 0.92 * s);
        return out.set(Math.cos(t) * lidR * 1.02, 0, Math.sin(t) * lidR * 1.02);
    }, (s) => {
        const outer = side === 1 ? s : 1 - s;
        return r * (0.032 + 0.04 * Math.pow(outer, 2));
    }, 28, 6), lashMat);
    upper.add(lash);
    const flicks = spec.eye.lashes ?? 0;
    for (let i = 0; i < flicks; i++) {
        const t = Math.PI * (side === 1 ? 0.1 + i * 0.1 : 0.9 - i * 0.1);
        const base = new THREE.Vector3(Math.cos(t) * lidR, 0, Math.sin(t) * lidR);
        const tip = base.clone().multiplyScalar(1.22).add(new THREE.Vector3(0, r * 0.24, 0));
        upper.add(new THREE.Mesh(taperedTube(polyPath([base, base.clone().lerp(tip, 0.5).add(new THREE.Vector3(0, r * 0.03, 0)), tip]), (s) => r * 0.045 * (1 - s * 0.85), 8, 6), lashMat));
    }
    upperTilt.add(upper);
    group.add(upperTilt);
    const lower = new THREE.Group();
    lower.add(new THREE.Mesh(lowerGeo, colors.lidMaterial));
    group.add(lower);
    return { group, ball, upperTilt, upper, lower, side };
}

// ── Obrva ─────────────────────────────────────────────────────────────────────

function buildBrow(head: AnimalHead, spec: FaceSpec, colors: FaceColors, side: 1 | -1): { group: THREE.Group; base: THREE.Vector3 } {
    const e = head.spec.eye;
    const b = spec.brow;
    // Meki jastučić krzna koji prati površinu glave (okvir iz normale površine — bez uvrtanja)
    const uvAt = (t: number): [number, number] => [0.5 + side * (e.u + (b.du ?? 0) + (t - 0.5) * b.len), e.v - b.dv - Math.sin(t * Math.PI) * 0.01 + (t - 0.5) * 0.008];
    const center = head.point(...uvAt(0.5));
    const c = new THREE.Vector3();
    const c2 = new THREE.Vector3();
    const n = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const perp = new THREE.Vector3();
    const geo = buildSurface((a01, t, out) => {
        const [u, v] = uvAt(t);
        head.point(u, v, c);
        head.normal(u, v, n);
        const [u2, v2] = uvAt(Math.min(1, t + 0.01));
        const [u0, v0] = uvAt(Math.max(0, t - 0.01));
        tangent.subVectors(head.point(u2, v2, c2), head.point(u0, v0, out)).normalize();
        perp.crossVectors(n, tangent).normalize();
        const inner = side === 1 ? 1 - t : t;
        const k = Math.pow(Math.sin(Math.PI * t), 0.55);
        const w = b.thick * (0.75 + 0.35 * inner) * k;
        const h = b.thick * 0.62 * k;
        const a = a01 * Math.PI * 2;
        return out.copy(c).addScaledVector(perp, Math.cos(a) * w).addScaledVector(n, Math.sin(a) * h - h * 0.15).sub(center);
    }, { nu: 14, nv: 16, closedU: true, inside: (_a, t, out) => {
        const [u, v] = uvAt(t);
        return head.point(u, v, out).addScaledVector(head.normal(u, v), -b.thick).sub(center);
    } });
    colors.paintBrow(geo);
    const group = new THREE.Group();
    group.position.copy(center);
    group.add(new THREE.Mesh(geo, colors.browMaterial));
    return { group, base: center.clone() };
}

// ── Nos ───────────────────────────────────────────────────────────────────────

function buildNose(head: AnimalHead, spec: FaceSpec, colors: FaceColors): { object: THREE.Object3D; tip: THREE.Vector3; bridge: THREE.Vector3 } | null {
    const ns = spec.nose;
    const v = ns.v ?? head.spec.noseV;
    const surface = head.point(0.5, v);
    const normal = head.normal(0.5, v);
    const bridge = head.point(0.5, (head.spec.eye.v + v) / 2 - 0.02);
    if (ns.kind === "none") return { object: new THREE.Group(), tip: surface.clone(), bridge };
    const mat = noseMaterial(colors.nose);
    if (ns.kind === "nostrils") {
        const g = new THREE.Group();
        for (const side of [1, -1]) {
            const geo = new THREE.SphereGeometry(1, 20, 14);
            geo.scale(ns.w, ns.h, ns.d);
            const m = new THREE.Mesh(geo, mat);
            const u = 0.5 + side * 0.035;
            m.position.copy(head.offsetPoint(u, v, -ns.d * 0.25));
            m.lookAt(m.position.clone().add(head.normal(u, v)));
            m.rotateZ(side * 0.5);
            g.add(m);
        }
        return { object: g, tip: surface.clone().addScaledVector(normal, ns.d), bridge };
    }
    const geo = new THREE.SphereGeometry(1, 32, 22);
    const p = geo.getAttribute("position");
    const q = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
        q.fromBufferAttribute(p, i);
        if (ns.kind === "button") {
            // Zaobljen trougao: širi gore, uži dole
            q.x *= 1 + 0.38 * q.y - 0.08 * q.y * q.y;
            q.y *= 0.95;
        } else {
            // Ovalan nos psa/mede: blago srce odozgo, dve nozdrve
            q.x *= 1 + 0.12 * q.y;
            for (const s of [1, -1]) {
                const d = Math.hypot((q.x - s * 0.42) / 0.2, (q.y + 0.18) / 0.16);
                const dent = Math.exp(-d * d) * Math.max(0, q.z);
                q.multiplyScalar(1 - 0.16 * dent);
            }
            q.y -= 0.08 * Math.max(0, q.z) * Math.exp(-((q.x / 0.12) ** 2)) * Math.max(0, -q.y);
        }
        p.setXYZ(i, q.x * ns.w, q.y * ns.h, q.z * ns.d);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = "nos";
    mesh.position.copy(surface).addScaledVector(normal, ns.d * (ns.lift ?? 0.35));
    mesh.lookAt(mesh.position.clone().add(normal));
    mesh.rotateX(ns.tilt ?? 0);
    const tip = mesh.position.clone().addScaledVector(normal, ns.d);
    return { object: mesh, tip, bridge };
}

// ── Usta (morph oblici) ───────────────────────────────────────────────────────

interface MouthState {
    smile: number;
    open: number;
    wide: number;
    round: number;
}

const MORPHS: readonly (keyof MouthState | "frown")[] = ["smile", "frown", "open", "wide", "round"];

/** Okvir usta na površini: tačka, napred (normala), gore, levo */
interface MouthFrame {
    p: THREE.Vector3;
    n: THREE.Vector3;
    up: THREE.Vector3;
    left: THREE.Vector3;
    wrap: number;
}

function mouthCurves(ms: FaceSpec["mouth"], s: MouthState) {
    const W = ms.w * (1 + 0.18 * s.wide - 0.42 * s.round);
    const H = ms.h;
    const wShape = ms.curve === "w" ? 1 - clamp01(s.open + s.wide + s.round) : 0;
    const mid = (x: number) => {
        // Uglovi gore pri osmehu, dole pri tuzi; „w” oblik (mačka) — vrh u sredini
        let y = s.smile * 0.75 * ms.w * x * x;
        y += wShape * ms.w * 0.26 * Math.exp(-((x / 0.24) ** 2)) - wShape * ms.w * 0.04;
        y -= s.wide * ms.w * 0.05;
        return y;
    };
    const gap = (x: number) => {
        const ax = Math.min(1, Math.abs(x));
        const grin = s.wide * H * 1.05 * Math.pow(1 - ax * ax, 0.75);
        const jaw = s.open * H * Math.pow(1 - ax * ax, 0.85);
        const o = s.round * H * 0.8 * Math.sqrt(Math.max(0, 1 - ax * ax));
        return grin + jaw + o;
    };
    // Gornja usna se diže malo, donja se spušta (vilica)
    const upper = (x: number) => mid(x) + gap(x) * (0.22 - s.wide * 0.12);
    const lower = (x: number) => mid(x) - gap(x) * (0.78 + s.wide * 0.12);
    return { W, upper, lower, gap };
}

function placeOnFrame(f: MouthFrame, x: number, y: number, depth: number, out: THREE.Vector3): THREE.Vector3 {
    const a = x / f.wrap;
    out.copy(f.p)
        .addScaledVector(f.left, Math.sin(a) * f.wrap)
        .addScaledVector(f.up, y)
        .addScaledVector(f.n, (Math.cos(a) - 1) * f.wrap - (y * y) / (2 * f.wrap * 1.4) - depth);
    return out;
}

const NU = 26;
const NV = 9;
const RING = 64;
const SIDES = 7;

function interiorPositions(ms: FaceSpec["mouth"], f: MouthFrame, s: MouthState): Float32Array {
    const { W, upper, lower, gap } = mouthCurves(ms, s);
    const out = new Float32Array((NU + 1) * (NV + 1) * 3);
    const p = new THREE.Vector3();
    const maxGap = Math.max(1e-6, gap(0));
    for (let j = 0; j <= NV; j++) {
        const t = j / NV;
        for (let i = 0; i <= NU; i++) {
            const x = -1 + (2 * i) / NU;
            const yU = upper(x);
            const yL = lower(x);
            const y = lerp(yU, yL, t);
            const depth = 0.0015 + (gap(x) / maxGap) * Math.min(ms.h, maxGap) * 0.55 * Math.sin(Math.PI * t) * (1 - x * x * 0.6);
            placeOnFrame(f, x * W, y, depth, p);
            out.set([p.x, p.y, p.z], (j * (NU + 1) + i) * 3);
        }
    }
    return out;
}

function interiorColors(ms: FaceSpec["mouth"]): Float32Array {
    const out = new Float32Array((NU + 1) * (NV + 1) * 3);
    const dark = col("#4A1520");
    const deep = col("#2A0A10");
    const tongue = col("#E8707E");
    const tooth = col("#FFFDF8");
    const c = new THREE.Color();
    for (let j = 0; j <= NV; j++) {
        const t = j / NV;
        for (let i = 0; i <= NU; i++) {
            const x = -1 + (2 * i) / NU;
            c.copy(dark).lerp(deep, Math.sin(Math.PI * t) * 0.7);
            const tongueK = smoothstep(0.55, 0.75, t - 0.18 * (1 - x * x) + 0.12);
            c.lerp(tongue, tongueK * (1 - smoothstep(0.75, 0.95, Math.abs(x))));
            let teeth = 0;
            if (ms.teeth === "row") teeth = 1 - smoothstep(0.18, 0.26, t);
            if (ms.teeth === "fangs") teeth = (1 - smoothstep(0.16, 0.3, t + Math.abs(Math.abs(x) - 0.55) * 1.2)) * smoothstep(0.2, 0.35, Math.abs(x));
            if (ms.teeth === "buck") teeth = (1 - smoothstep(0.2, 0.3, t)) * (1 - smoothstep(0.24, 0.3, Math.abs(x)));
            c.lerp(tooth, teeth * (1 - smoothstep(0.85, 0.98, Math.abs(x))));
            out.set([c.r, c.g, c.b], (j * (NU + 1) + i) * 3);
        }
    }
    return out;
}

function gridIndex(nu: number, nv: number, closed = false): number[] {
    const idx: number[] = [];
    const cols = nu + 1;
    for (let j = 0; j < nv; j++) {
        for (let i = 0; i < nu; i++) {
            const a = j * cols + i;
            const b = closed && i === nu - 1 ? j * cols : a + 1;
            const c = a + cols;
            const d = closed && i === nu - 1 ? (j + 1) * cols : c + 1;
            idx.push(a, c, b, b, c, d);
        }
    }
    return idx;
}

/** Linija usana: cev oko otvora (gornja usna levo → desno, donja nazad) */
function linePositions(ms: FaceSpec["mouth"], f: MouthFrame, s: MouthState): Float32Array {
    const { W, upper, lower } = mouthCurves(ms, s);
    const loop: THREE.Vector3[] = [];
    for (let k = 0; k < RING; k++) {
        const q = k / RING;
        const x = q < 0.5 ? -1 + 4 * q : 1 - 4 * (q - 0.5);
        const y = q < 0.5 ? upper(x) : lower(x);
        loop.push(placeOnFrame(f, x * W, y, -0.0005, new THREE.Vector3()));
    }
    const out = new Float32Array(RING * (SIDES + 1) * 3);
    const tangent = new THREE.Vector3();
    const side = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let k = 0; k < RING; k++) {
        const prev = loop[(k + RING - 1) % RING];
        const next = loop[(k + 1) % RING];
        tangent.subVectors(next, prev);
        if (tangent.lengthSq() < 1e-12) tangent.copy(f.left);
        tangent.normalize();
        side.crossVectors(f.n, tangent).normalize();
        const q = k / RING;
        const x = q < 0.5 ? -1 + 4 * q : 1 - 4 * (q - 0.5);
        const r = ms.line * (0.75 + 0.25 * (1 - x * x)) * (1 + 0.2 * s.open);
        for (let j = 0; j <= SIDES; j++) {
            const a = (j / SIDES) * Math.PI * 2;
            p.copy(loop[k]).addScaledVector(side, Math.cos(a) * r).addScaledVector(f.n, Math.sin(a) * r * 0.6);
            out.set([p.x, p.y, p.z], (k * (SIDES + 1) + j) * 3);
        }
    }
    return out;
}

function lineIndex(): number[] {
    const idx: number[] = [];
    const cols = SIDES + 1;
    for (let k = 0; k < RING; k++) {
        const k2 = (k + 1) % RING;
        for (let j = 0; j < SIDES; j++) {
            const a = k * cols + j;
            const b = k * cols + j + 1;
            const c = k2 * cols + j;
            const d = k2 * cols + j + 1;
            idx.push(a, b, c, b, d, c);
        }
    }
    return idx;
}

/** Normale za skup položaja (ista topologija) */
function normalsFor(positions: Float32Array, index: number[]): Float32Array {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    return g.getAttribute("normal").array as Float32Array;
}

function morphGeometry(base: Float32Array, targets: Float32Array[], index: number[]): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(base, 3));
    g.setIndex(index);
    g.setAttribute("normal", new THREE.BufferAttribute(normalsFor(base, index), 3));
    const baseN = g.getAttribute("normal").array as Float32Array;
    g.morphAttributes.position = targets.map((t) => {
        const d = new Float32Array(t.length);
        for (let i = 0; i < t.length; i++) d[i] = t[i] - base[i];
        return new THREE.BufferAttribute(d, 3);
    });
    g.morphAttributes.normal = targets.map((t) => {
        const n = normalsFor(t, index);
        const d = new Float32Array(n.length);
        for (let i = 0; i < n.length; i++) d[i] = n[i] - baseN[i];
        return new THREE.BufferAttribute(d, 3);
    });
    g.morphTargetsRelative = true;
    g.computeBoundingSphere();
    return g;
}

interface MouthRig {
    group: THREE.Group;
    meshes: THREE.Mesh[];
    center: THREE.Vector3;
    /** Pomeraj sredine gornje usne po morph obliku (za zube zeke) */
    upperShift: number[];
    teeth?: THREE.Object3D;
    frame: MouthFrame;
}

function buildMouth(head: AnimalHead, spec: FaceSpec, colors: FaceColors): MouthRig {
    const ms = spec.mouth;
    const v = ms.v ?? head.spec.mouthV;
    const n = head.normal(0.5, v);
    const p = head.offsetPoint(0.5, v, ms.lift ?? 0.0012);
    const up = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
    const left = new THREE.Vector3().crossVectors(up, n).normalize();
    const frame: MouthFrame = { p, n, up, left, wrap: ms.wrap };
    const neutral: MouthState = { smile: 0, open: 0, wide: 0, round: 0 };
    const states: MouthState[] = [
        { ...neutral, smile: 1 },
        { ...neutral, smile: -1 },
        { ...neutral, open: 1 },
        { ...neutral, wide: 1 },
        { ...neutral, round: 1 },
    ];
    const iIndex = gridIndex(NU, NV);
    const interior = morphGeometry(interiorPositions(ms, frame, neutral), states.map((s) => interiorPositions(ms, frame, s)), iIndex);
    interior.setAttribute("color", new THREE.BufferAttribute(interiorColors(ms), 3));
    const lIndex = lineIndex();
    const line = morphGeometry(linePositions(ms, frame, neutral), states.map((s) => linePositions(ms, frame, s)), lIndex);
    const inner = new THREE.Mesh(interior, mouthMaterial());
    inner.name = "usta";
    const lips = new THREE.Mesh(line, lineMaterial(colors.mouth));
    lips.name = "usne";
    const group = new THREE.Group();
    group.add(inner, lips);
    const upperShift = states.map((s) => mouthCurves(ms, s).upper(0) - mouthCurves(ms, neutral).upper(0));
    const rig: MouthRig = { group, meshes: [inner, lips], center: p.clone(), upperShift, frame };

    // Linija od nosa do usta
    if (ms.philtrum > 0) {
        const top = mouthCurves(ms, neutral).upper(0);
        const a = placeOnFrame(frame, 0, top + ms.philtrum, -0.0004, new THREE.Vector3());
        const b = placeOnFrame(frame, 0, top + ms.line * 0.4, -0.0004, new THREE.Vector3());
        const mid = placeOnFrame(frame, 0, top + ms.philtrum * 0.5, -0.0008, new THREE.Vector3());
        group.add(new THREE.Mesh(taperedTube(polyPath([a, mid, b]), () => ms.line * 0.75, 10, 6), lineMaterial(colors.mouth)));
    }
    if (ms.teeth === "buck") {
        const teeth = new THREE.Group();
        const tw = ms.w * 0.2;
        for (const s of [1, -1]) {
            const g = new THREE.BoxGeometry(tw, ms.w * 0.34, ms.w * 0.08, 2, 3, 1);
            // Zaobljeni uglovi zuba
            const pos = g.getAttribute("position");
            const q = new THREE.Vector3();
            for (let i = 0; i < pos.count; i++) {
                q.fromBufferAttribute(pos, i);
                const k = q.y < 0 ? 1 - 0.35 * Math.pow(Math.abs(q.x) / (tw / 2), 4) : 1;
                pos.setXYZ(i, q.x * k, q.y, q.z);
            }
            g.computeVertexNormals();
            g.translate(s * tw * 0.52, -ms.w * 0.17, 0);
            const m = new THREE.Mesh(g, noseMaterial("#FFFDF6"));
            teeth.add(m);
        }
        const top = mouthCurves(ms, neutral).upper(0);
        teeth.position.copy(placeOnFrame(frame, 0, top - ms.line * 0.6, -ms.line * 0.6, new THREE.Vector3()));
        teeth.lookAt(teeth.position.clone().add(n));
        group.add(teeth);
        rig.teeth = teeth;
    }
    return rig;
}

// ── Brkovi ────────────────────────────────────────────────────────────────────

function buildWhiskers(head: AnimalHead, spec: FaceSpec): THREE.Object3D | null {
    const w = spec.whiskers;
    if (!w) return null;
    const g = new THREE.Group();
    const mat = lineMaterial(w.color);
    for (const side of [1, -1]) {
        for (let i = 0; i < w.count; i++) {
            const u = 0.5 + side * w.u;
            const v = w.v + (i - (w.count - 1) / 2) * 0.022;
            const start = head.offsetPoint(u, v, 0.002);
            const n = head.normal(u, v);
            const dir = new THREE.Vector3(side, (1 - i) * 0.18, 0.15).normalize().addScaledVector(n, 0.25).normalize();
            const mid = start.clone().addScaledVector(dir, w.len * 0.5).add(new THREE.Vector3(0, 0.002, 0));
            const end = start.clone().addScaledVector(dir, w.len).add(new THREE.Vector3(0, -0.008 * (i + 1), -w.len * 0.15));
            g.add(new THREE.Mesh(taperedTube(polyPath([start, mid, end]), (s) => 0.0016 * (1 - s * 0.75), 12, 5), mat));
        }
    }
    return g;
}

// ── Sastavljanje lica ─────────────────────────────────────────────────────────

export interface AnimalFace {
    group: THREE.Group;
    control: FaceControl;
    eyes: THREE.Vector3[];
    eyeR: number;
    eyeFront: number;
    noseTip: THREE.Vector3;
    bridge: THREE.Vector3;
    mouth: THREE.Vector3;
    /** Pomeraj ka „živom” izrazu svakog kadra (meki prelaz) */
    update: (dt: number) => void;
}

export function buildFace(head: AnimalHead, spec: FaceSpec, colors: FaceColors, quality: "high" | "low", extra?: { mouth?: THREE.Object3D; jaw?: (open: number, smile: number) => void }): AnimalFace {
    const group = new THREE.Group();
    group.name = "lice";
    const eyes = ([1, -1] as const).map((side) => buildEye(head, spec, colors, side, quality));
    for (const eye of eyes) group.add(eye.group);
    const brows = ([1, -1] as const).map((side) => buildBrow(head, spec, colors, side));
    for (const brow of brows) group.add(brow.group);
    const nose = buildNose(head, spec, colors);
    if (nose) group.add(nose.object);
    const mouth = extra?.mouth ? null : buildMouth(head, spec, colors);
    if (mouth) group.add(mouth.group);
    if (extra?.mouth) group.add(extra.mouth);
    const whiskers = buildWhiskers(head, spec);
    if (whiskers) group.add(whiskers);

    let from = paramsOf("neutral");
    let target = paramsOf("neutral");
    let current = { ...from };
    let expression: FaceExpression = "neutral";
    let blink = 0;
    let talkOpen = 0;
    let talkRound = 0;

    const apply = () => {
        const c = current;
        const talk = talkOpen;
        // Usta: izraz + govor
        const open = Math.max(c.open, talk * (1 - talkRound));
        const round = Math.max(c.round, talk * talkRound * 0.9);
        const smile = c.smile * (1 - talk * 0.35);
        const wide = c.wide * (1 - talk * 0.5);
        const infl = [Math.max(0, smile), Math.max(0, c.frown), open, wide, round];
        if (mouth) {
            for (const m of mouth.meshes) {
                if (!m.morphTargetInfluences) m.updateMorphTargets();
                const mi = m.morphTargetInfluences;
                if (mi) for (let i = 0; i < MORPHS.length; i++) mi[i] = infl[i];
            }
            if (mouth.teeth) {
                const shift = infl.reduce((sum, k, i) => sum + k * mouth.upperShift[i], 0);
                mouth.teeth.position.copy(mouth.center).addScaledVector(mouth.frame.up, shift - spec.mouth.line * 0.6 + mouthCurves(spec.mouth, { smile: 0, open: 0, wide: 0, round: 0 }).upper(0));
            }
        }
        extra?.jaw?.(Math.max(open, wide * 0.7, round * 0.8), smile);
        // Kapci
        const upperEdge = spec.eye.upper + c.upper * 0.7;
        const lowerEdge = spec.eye.lower + c.lower * 0.9;
        const closed = -0.18;
        for (const eye of eyes) {
            eye.upper.rotation.x = -lerp(upperEdge, closed, blink);
            eye.lower.rotation.x = -lerp(lowerEdge, closed - 0.02, blink);
            eye.upperTilt.rotation.z = -eye.side * c.lidTilt * 0.5;
        }
        // Obrve: podignute, unutrašnji kraj gore (tuga) ili dole (ljutnja), jedna gore (radoznalo)
        for (const [i, brow] of brows.entries()) {
            const side = i === 0 ? 1 : -1;
            const raise = c.browRaise * 0.016 + (side === 1 ? c.browAsym * 0.014 : -c.browAsym * 0.004);
            brow.group.position.copy(brow.base).add(new THREE.Vector3(0, raise, 0));
            brow.group.rotation.z = side * c.browTilt * 0.32;
        }
    };

    const control: FaceControl = {
        setExpression: (next, weight = 1) => {
            if (next !== expression) {
                from = { ...current };
                target = paramsOf(next);
                expression = next;
            }
            const w = clamp01(weight);
            const k = w * w * (3 - 2 * w);
            const out = { ...current };
            for (const key of Object.keys(out) as (keyof FaceParams)[]) out[key] = lerp(from[key], target[key], k);
            current = out;
            apply();
        },
        setBlink: (amount) => {
            blink = clamp01(amount);
            apply();
        },
        setMouth: (open, round = 0) => {
            talkOpen = clamp01(open);
            talkRound = clamp01(round);
            apply();
        },
        setGaze: (x, y) => {
            for (const eye of eyes) eye.ball.rotation.set(-clamp01(Math.abs(y)) * Math.sign(y) * 0.22, Math.max(-1, Math.min(1, x)) * 0.32, 0);
        },
    };
    apply();

    const eyeR = head.spec.eye.r;
    return {
        group,
        control,
        eyes: eyes.map((e) => e.group.position.clone()),
        eyeR,
        eyeFront: Math.max(...eyes.map((e) => e.group.position.z)) + eyeR,
        noseTip: nose?.tip ?? head.point(0.5, head.spec.noseV),
        bridge: nose?.bridge ?? head.point(0.5, head.spec.eye.v + 0.03),
        mouth: mouth?.center ?? head.point(0.5, head.spec.mouthV),
        update: () => undefined,
    };
}
