// Donji delovi (kroj): pantalone (farmerke, trenerke, platnene, helanke, široke, sa
// džepovima), šorcevi i suknje (plisirana, teksas, tutu, duga, na volane). Pravi pojas sa
// gajkama ili lastišem, šlic i zakivke, džepovi sa štepom, bočni šav, porub/manžetna;
// teksas je izlizan (svetliji) na butinama i kolenima. Rep životinje izlazi kroz porubljen otvor.

import * as THREE from "three";
import { patternedFabric } from "../../engine/materials";
import { smoothstep } from "../../engine/surface";
import { cloth, darker, fabric, gauss, lighter, metal, plastic, SIDES, weighLeg, weighTorso, type Side } from "./common";
import { denimTexture } from "./prints";
import { LAYER, mergeSimple, Tailor, type LimbExtra, type TorsoExtra } from "./tailor";
import { clothMaterial, type Cloth } from "./tops";

// ── Teksas sa izlizanim delovima (boje temena) ──────────────────────────────

const vertexColored = new Map<string, THREE.Material>();

/** Isti materijal, ali sa bojama temena (izlizanost, senke u naborima) — keš po materijalu */
export function withVertexColors(material: THREE.Material): THREE.Material {
    let m = vertexColored.get(material.uuid);
    if (!m) {
        m = material.clone();
        (m as THREE.MeshPhysicalMaterial).vertexColors = true;
        vertexColored.set(material.uuid, m);
    }
    return m;
}

/** Teksas boje `hex` (mapa niti × boja) sa izlizanim delovima */
export function denim(hex: string): THREE.Material {
    return withVertexColors(patternedFabric(denimTexture(), "denim", lighter(hex, 0.1), { side: THREE.DoubleSide, normalScale: 0.18 }));
}

/** Boje temena nogavice: svetlije spreda na butini i kolenu, tamnije pozadi i u preponama */
export function fadeLeg(t: Tailor, mesh: THREE.Mesh, side: Side, strength = 1) {
    const j = side === 1 ? t.rig.left : t.rig.right;
    const g = mesh.geometry;
    const pos = g.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const p = new THREE.Vector3();
    const axis = new THREE.Vector3();
    const len = j.hip.distanceTo(j.ankle);
    for (let k = 0; k < pos.count; k++) {
        p.fromBufferAttribute(pos, k);
        const along = THREE.MathUtils.clamp((j.hip.y - p.y) / len, 0, 1.1);
        axis.copy(j.hip).lerp(j.ankle, Math.min(1, along));
        const dz = p.z - axis.z;
        const dx = (p.x - axis.x) * side;
        const r = Math.max(0.01, Math.hypot(dx, dz));
        const front = Math.max(0, dz / r);
        const inner = Math.max(0, -dx / r);
        const fade = front * (0.75 * gauss(along, 0.28, 0.13) + 0.6 * gauss(along, 0.5, 0.05)) + 0.15 * front;
        const shadow = inner * gauss(along, 0.05, 0.08) * 0.5 + Math.max(0, -dz / r) * gauss(along, 0.52, 0.06) * 0.35;
        const k1 = THREE.MathUtils.clamp(0.74 + 0.34 * fade * strength - 0.14 * shadow, 0.55, 1);
        colors.set([k1, k1, k1], k * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/** Boje temena za karlicu (tamnije u preponama i ispod pojasa) */
function fadePelvis(t: Tailor, mesh: THREE.Mesh) {
    const g = mesh.geometry;
    const pos = g.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const p = new THREE.Vector3();
    for (let k = 0; k < pos.count; k++) {
        p.fromBufferAttribute(pos, k);
        const low = 1 - smoothstep(t.s.crotchY - 0.02, t.s.hipY, p.y);
        const k1 = 0.84 - 0.04 * low + 0.03 * Math.max(0, p.z) / 0.1;
        colors.set([k1, k1, k1], k * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/** Boje temena: sve 1 (za delove teksasa bez izlizanosti — porub, pojas, džepovi) */
function plainColors(mesh: THREE.Mesh, k1 = 0.85) {
    const g = mesh.geometry;
    const n = g.getAttribute("position").count;
    const colors = new Float32Array(n * 3).fill(k1);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

// ── Rep kroz odeću ─────────────────────────────────────────────────────────

/** Porubljen otvor za rep (životinja sa repom): mekani prsten gde rep izlazi iz odeće */
export function tailHole(t: Tailor, offset: number, material: THREE.Material) {
    const tail = t.ctx.body.anchors.tail;
    if (!tail) return;
    const scale = t.s.height / 1.19;
    const dir = tail.dir.clone().normalize();
    const p = tail.base.clone().addScaledVector(dir, offset + 0.004);
    const geometry = new THREE.TorusGeometry(0.024 * scale, 0.0042 * scale, Math.max(6, Math.round(10 * t.r)), Math.max(12, Math.round(28 * t.r)));
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir));
    geometry.translate(p.x, p.y, p.z);
    t.kit.skinned(weighTorso(t.rig, geometry), material, "otvor-za-rep");
}

// ── Pantalone ──────────────────────────────────────────────────────────────

export type PantsFit = "straight" | "skinny" | "wide" | "jogger" | "legging" | "cargo" | "flare" | "baggy";

export interface PantsOptions {
    cloth: Cloth;
    fit?: PantsFit;
    /** Teksas: izlizanost i bakarni štep */
    denim?: boolean;
    stitch?: string;
    /** Dužina nogavice (1 = do članka, 0,36 = šorc, 0,52 = bermude) */
    length?: number;
    /** Lampas (bočna traka) */
    stripe?: string;
    /** Podvijena nogavica (svetlija unutrašnjost) */
    cuff?: boolean;
    /** Zakrpa na kolenu (srce, krug) */
    knee?: string;
    pockets?: boolean;
    /** Nagomilan porub (široke farmerke koje padaju preko patika) */
    stacked?: boolean;
    /** Široke trenerke (više nabora, skupljene na članku) */
    baggy?: boolean;
    /** Lastiš sa vezicom umesto pojasa sa gajkama */
    elastic?: boolean;
    rib?: string;
    offset?: number;
}

export function pants(t: Tailor, o: PantsOptions) {
    const s = t.s;
    const fit = o.fit ?? "straight";
    const length = o.length ?? (o.stacked ? 1 : 0.965);
    const isDenim = o.denim ?? false;
    const main = isDenim ? denim(o.cloth.color) : clothMaterial(o.cloth);
    const baseOff = o.offset ?? (fit === "legging" ? LAYER.under : LAYER.bottom + (fit === "jogger" ? 0.002 : 0));
    const off = baseOff;
    const top = s.waistY - (fit === "legging" ? 0.025 : 0.035);
    const stitchHex = o.stitch ?? (isDenim ? "#E3A54A" : darker(o.cloth.color, 0.2));
    const stitch = fabric(stitchHex, "cotton", { roughness: 0.7 });
    const elastic = o.elastic ?? (fit === "jogger" || fit === "legging");
    const shorts = length < 0.6;
    const first = t.kit.objects.length;

    // Karlica
    const hipLoose: TorsoExtra = (a, y) => (fit === "wide" ? 0.004 : 0) + 0.0012 * gauss(y, s.crotchY + 0.02, 0.02) * Math.sin(a * 6);
    const pelvisMesh = t.pelvis(top, off, main, hipLoose);
    if (isDenim) fadePelvis(t, pelvisMesh);

    // Kroj nogavice
    const stack = o.stacked ? (tt: number, a: number) => 0.0045 * smoothstep(0.78, 0.9, tt) * (0.5 + 0.5 * Math.sin(tt * 120 + Math.sin(a * 2) * 1.5)) + 0.006 * smoothstep(0.9, 1, tt) : () => 0;
    const legExtra: LimbExtra = (tt, a) => stack(tt, a) + baseExtra(tt, a);
    const baseExtra: LimbExtra = (tt, a) => {
        const knee = 0.0014 * gauss(tt, 0.52, 0.05) * Math.sin(a * 3 + 1);
        const bunch = 0.0016 * smoothstep(0.75, 1, tt) * Math.sin(a * 4 + tt * 40);
        switch (fit) {
            case "baggy":
                return 0.003 + 0.03 * smoothstep(0.04, 0.45, tt) + 0.002 * gauss(tt, 0.5, 0.08) * Math.sin(a * 2 + 0.5) + 0.0014 * Math.sin(a * 5 + tt * 25) * smoothstep(0.1, 0.4, tt);
            case "skinny":
                return 0.001 + 0.001 * tt + knee * 0.5;
            case "legging":
                return 0.0005;
            case "wide":
                return 0.003 + 0.026 * smoothstep(0.08, 1, tt) + knee + bunch * 1.5;
            case "flare":
                return 0.002 + 0.02 * smoothstep(0.55, 1, tt) + knee;
            case "jogger":
                if (o.baggy) return 0.004 + 0.014 * smoothstep(0.03, 0.3, tt) * (1 - 0.3 * tt) + 0.0022 * Math.sin(a * 3 + tt * 34) * smoothstep(0.3, 0.8, tt) - 0.014 * smoothstep(0.84, 0.94, tt) + knee + bunch * 2;
                return 0.005 + 0.006 * (1 - tt) * smoothstep(0, 0.2, tt) - 0.008 * smoothstep(0.82, 0.93, tt) + knee + bunch;
            case "cargo":
                return 0.005 + 0.004 * tt + knee + bunch;
            default:
                return shorts ? 0.004 + 0.011 * smoothstep(0, length, tt) : 0.002 + 0.004 * tt + knee + bunch;
        }
    };
    for (const side of SIDES) {
        const legMesh = t.leg(side, 0, length, off, main, legExtra);
        if (isDenim) fadeLeg(t, legMesh, side);
        // Porub / manžetna
        if (fit === "jogger") {
            t.legRing(side, Math.min(length, 0.95), off - 0.002, 0.0056, 0.018, fabric(o.rib ?? o.cloth.color, "rib"));
        } else if (fit !== "legging") {
            const hem = t.legRing(side, length, off + 0.001, o.cuff ? 0.0038 : 0.0032, o.cuff ? 0.013 : 0.008, o.cuff ? (isDenim ? denim(lighter(o.cloth.color, 0.25)) : fabric(lighter(o.cloth.color, 0.12), o.cloth.kind ?? "cotton")) : main, legExtra);
            if (isDenim) plainColors(hem, 0.9);
            // Štep iznad poruba
            if (isDenim) t.kit.skinned(ringStitch(t, side, length - 0.025, off + 0.0009, legExtra), stitch, "step");
        }
        // Bočni šav (u = 0,25 je spolja za obe noge) i unutrašnji šav
        if (fit !== "legging") {
            t.leg(side, 0.04, length - 0.02, off + 0.0009, stitch, legExtra, [0.247, 0.253]);
            t.leg(side, 0.06, length - 0.02, off + 0.0009, stitch, legExtra, [0.747, 0.753]);
        }
        if (o.stripe) {
            const stripeMat = fabric(o.stripe, "cotton");
            t.leg(side, 0.03, length - 0.05, off + 0.0012, stripeMat, legExtra, [0.232, 0.268]);
            const accent = fabric(o.stripe, "cotton");
            t.leg(side, 0.03, length - 0.05, off + 0.0012, accent, legExtra, [0.212, 0.222]);
        }
        if (fit === "cargo") cargoPocket(t, side, off, main, stitch, legExtra);
        if (o.knee) kneePatch(t, side, off, fabric(o.knee, "felt"), legExtra);
        // Zadnji džepovi
        if (o.pockets !== false && fit !== "legging" && fit !== "jogger") {
            const pocket = t.patch(side * (Math.PI - 0.62), side * (Math.PI - 0.2), s.hipY - 0.005, s.hipY + 0.045, off + 0.0008, main, { puff: 0.0015, soft: 0.12, nu: 8, nv: 8 });
            if (isDenim) plainColors(pocket, 0.82);
            const a0 = side * (Math.PI - 0.6);
            const a1 = side * (Math.PI - 0.22);
            t.stitch([[a0, s.hipY + 0.042], [a0, s.hipY + 0.002], [(a0 + a1) / 2, s.hipY - 0.006], [a1, s.hipY + 0.002], [a1, s.hipY + 0.042]], off + 0.0026, stitch, 0.0009);
            // Otvor prednjeg džepa (kriva)
            t.stitch([[side * 0.45, top - 0.004], [side * 0.62, top - 0.03], [side * 0.95, top - 0.042]], off + 0.0009, stitch, 0.0011);
        }
    }
    tailHole(t, off + 0.004, main);

    // Pojas
    if (elastic) {
        t.ring(top, off, 0.005, 0.015, fabric(o.rib ?? o.cloth.color, "rib"));
        if (fit !== "legging") {
            // Vezica napred
            const string = plastic("#F4F4F2", 0.6);
            for (const side of SIDES) {
                const a = side * 0.12;
                t.stitch([[a, top + 0.002], [a * 1.6, top - 0.03], [a * 1.4, top - 0.06]], off + 0.009, string, 0.0021);
            }
        }
    } else {
        const band = t.ring(top, off, 0.0036, 0.011, main);
        if (isDenim) plainColors(band, 0.88);
        t.stitchRing(top - 0.009, off + 0.0026, stitch, 0.0007);
        // Gajke za kaiš
        for (const a of [-2.4, -1.2, 1.2, 2.4, Math.PI]) {
            const loop = t.patch(a - 0.05, a + 0.05, top - 0.012, top + 0.006, off + 0.0045, main, { nu: 3, nv: 3 });
            if (isDenim) plainColors(loop, 0.88);
        }
        // Šlic i dugme
        t.stitch([[0.12, top - 0.008], [0.13, s.hipY + 0.01], [0.06, s.crotchY + 0.01], [0, s.crotchY - 0.005]], off + 0.0009, stitch, 0.0011);
        t.button(0, top + 0.001, off + 0.004, isDenim ? metal("#C9A661") : plastic(darker(o.cloth.color, 0.35), 0.4), 0.0055);
        if (isDenim) for (const side of SIDES) t.button(side * 0.95, top - 0.044, off + 0.0012, metal("#C9A661"), 0.0022);
    }
    // Teksas: delovima bez boja temena (pojas, gajke, otvor za rep) daj ravnu nijansu
    if (isDenim) {
        for (const object of t.kit.objects.slice(first)) {
            const mesh = object as THREE.Mesh;
            if (mesh.isMesh && mesh.material === main && !mesh.geometry.getAttribute("color")) plainColors(mesh, 0.86);
        }
    }
}

/** Štep oko nogavice na udelu t */
function ringStitch(t: Tailor, side: Side, tt: number, offset: number, extra: LimbExtra): THREE.BufferGeometry {
    const p = new THREE.Vector3();
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 24; i++) pts.push(t.legPoint(side, tt, (i / 24) * Math.PI * 2, offset, extra, p.clone()));
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const geometry = new THREE.TubeGeometry(curve, Math.max(16, Math.round(40 * t.r)), 0.0008, 4, true);
    return weighLeg(t.rig, side, geometry);
}

/** Bočni džep sa poklopcem na butini (pantalone sa džepovima) */
function cargoPocket(t: Tailor, side: Side, off: number, main: THREE.Material, stitch: THREE.Material, extra: LimbExtra) {
    const lift = (tt: number, a: number) => extra(tt, a) + 0.0035 * Math.sin(Math.PI * THREE.MathUtils.clamp((tt - 0.3) / 0.2, 0, 1));
    t.leg(side, 0.3, 0.5, off + 0.001, main, lift, [0.17, 0.33]);
    t.leg(side, 0.28, 0.33, off + 0.0055, main, extra, [0.16, 0.34]);
    t.leg(side, 0.33, 0.335, off + 0.0058, stitch, extra, [0.16, 0.34]);
    for (const u of [0.17, 0.33]) t.leg(side, 0.33, 0.5, off + 0.004, stitch, extra, [u - 0.003, u + 0.003]);
}

/** Zakrpa na kolenu */
function kneePatch(t: Tailor, side: Side, off: number, material: THREE.Material, extra: LimbExtra) {
    t.leg(side, 0.44, 0.58, off + 0.0016, material, (tt, a) => extra(tt, a) + 0.0012 * Math.sin(Math.PI * THREE.MathUtils.clamp((tt - 0.44) / 0.14, 0, 1)), [-0.09, 0.09]);
}

// ── Suknje ─────────────────────────────────────────────────────────────────

export type SkirtStyle = "pleated" | "aline" | "tutu" | "maxi" | "tiered" | "denim" | "circle";

export interface SkirtOptions {
    cloth: Cloth;
    style: SkirtStyle;
    /** Dužina: "mini" iznad kolena, "knee", "midi" ispod kolena, "maxi" do članaka */
    length?: "mini" | "knee" | "midi" | "maxi";
    trim?: string;
    /** Mašna/kaiš na pojasu */
    bow?: string;
}

export function skirt(t: Tailor, o: SkirtOptions) {
    const s = t.s;
    const scale = s.height / 1.19;
    const knee = s.hipY - s.thigh;
    const len = o.length ?? (o.style === "maxi" || o.style === "tiered" ? "maxi" : o.style === "tutu" ? "mini" : "knee");
    const bottomY = len === "mini" ? knee + 0.09 * scale : len === "knee" ? knee + 0.03 * scale : len === "midi" ? knee - 0.09 * scale : s.ankleY + 0.035 * scale;
    const top = s.waistY - 0.025;
    const off = LAYER.bottom + 0.002;
    const kind = o.cloth.kind ?? (o.style === "denim" ? "denim" : o.style === "tutu" ? "mesh" : o.style === "pleated" ? "felt" : "cotton");
    const main = o.style === "denim" ? denim(o.cloth.color) : clothMaterial({ ...o.cloth, kind });
    const first = t.kit.objects.length;
    const legOuter = s.hipX + s.legR(0.15);
    const width = (k: number) => Math.max(legOuter + 0.04 * scale, k * scale);
    const tri = (x: number) => Math.abs((((x / (Math.PI * 2)) % 1) + 1) % 1 - 0.5) * 2;
    let edge: (q: number, out: THREE.Vector3) => THREE.Vector3;
    switch (o.style) {
        case "pleated": {
            const pleats = (a: number, v: number) => 0.0085 * Math.pow(v, 0.8) * (tri(a * 14) - 0.5) * 2;
            ({ edge } = t.skirt(top, bottomY, off, { rx: width(0.16), rz: width(0.135) * 0.85 }, main, pleats, 28, 2.6));
            break;
        }
        case "aline":
        case "denim": {
            const folds = (a: number, v: number) => 0.0025 * v * Math.sin(a * 5);
            const r = t.skirt(top, bottomY, off, { rx: width(0.15), rz: width(0.125) * 0.85 }, main, folds, 24, 2.0);
            edge = r.edge;
            if (o.style === "denim") {
                plainColors(r.mesh, 0.86);
                const stitch = fabric("#E3A54A", "cotton");
                t.kit.strip(r.fn, 0.497, 0.503, 0.0012, stitch, 0.02, 0.99);
                for (const side of SIDES) t.patch(side * (Math.PI - 0.6), side * (Math.PI - 0.22), s.hipY - 0.0, s.hipY + 0.04, off + 0.0016, main, { puff: 0.0015, soft: 0.12, nu: 8, nv: 8 });
            }
            break;
        }
        case "tutu": {
            // Tri sloja tila, svaki malo širi i kraći, talasast rub
            const tulle = cloth(o.cloth.color, "mesh", { roughness: 0.55, sheen: 1, sheenLift: 0.6 });
            const layers = 3;
            let last: (q: number, out: THREE.Vector3) => THREE.Vector3 = () => new THREE.Vector3();
            for (let i = 0; i < layers; i++) {
                const wave = (a: number, v: number) => 0.01 * v * Math.sin(a * (11 + i * 3) + i) + 0.004 * v * Math.sin(a * 29 + i * 2);
                const r = t.skirt(top - 0.004 * i, bottomY + 0.012 * (layers - 1 - i), off + 0.003 * i, { rx: width(0.2 + 0.025 * i), rz: width(0.18 + 0.022 * i) * 0.9 }, i === layers - 1 ? tulle : main, wave, 14, 0.7);
                last = r.edge;
            }
            edge = last;
            break;
        }
        case "tiered": {
            // Na volane: tri sloja, svaki se širi
            const levels = 3;
            let last: (q: number, out: THREE.Vector3) => THREE.Vector3 = () => new THREE.Vector3();
            for (let i = 0; i < levels; i++) {
                const y0 = top - ((top - bottomY) * i) / levels;
                const y1 = top - ((top - bottomY) * (i + 1)) / levels;
                const ruffle = (a: number, v: number) => 0.004 * v * Math.sin(a * (15 + i * 4));
                const r = t.skirt(i === 0 ? top : y0 + 0.012, y1, off + 0.004 * i, { rx: width(0.13 + 0.035 * (i + 1)), rz: width(0.12 + 0.032 * (i + 1)) * 0.88 }, main, ruffle, 12, 1.2);
                t.edgeRing(r.edge, 0.0025, 0.004, main);
                last = r.edge;
            }
            edge = last;
            break;
        }
        case "maxi":
        case "circle":
        default: {
            const folds = (a: number, v: number) => 0.01 * v * Math.sin(a * 7 + 0.4) + 0.004 * v * Math.sin(a * 17);
            ({ edge } = t.skirt(top, bottomY, off, { rx: width(o.style === "circle" ? 0.21 : 0.18), rz: width(o.style === "circle" ? 0.19 : 0.16) * 0.9 }, main, folds, o.style === "maxi" ? 44 : 30, 1.6));
            break;
        }
    }
    const hemMat = o.trim ? fabric(o.trim, "satin") : main;
    if (o.style !== "tutu") t.edgeRing(edge, 0.0028, 0.004, hemMat);
    const band = t.ring(top, off, 0.005, 0.013, o.trim ? fabric(o.trim, "satin") : main);
    if (o.style === "denim") plainColors(band, 0.88);
    tailHole(t, off + 0.01, main);
    if (o.bow) bowAt(t, top, off + 0.008, fabric(o.bow, "satin"), 1);
    if (o.style === "denim") {
        for (const object of t.kit.objects.slice(first)) {
            const mesh = object as THREE.Mesh;
            if (mesh.isMesh && mesh.material === main && !mesh.geometry.getAttribute("color")) plainColors(mesh, 0.86);
        }
    }
}

/** Mašna na pojasu (napred: 0, pozadi: π) */
export function bowAt(t: Tailor, y: number, offset: number, material: THREE.Material, size = 1, a = 0) {
    const c = t.point(a, y, offset);
    const k = size * Math.min(1.2, t.s.height / 1.19);
    const parts: THREE.BufferGeometry[] = [];
    for (const side of SIDES) {
        const loop = new THREE.TorusGeometry(0.014 * k, 0.0055 * k, 8, 20);
        loop.scale(1.25, 0.75, 0.6);
        loop.translate(side * 0.018 * k, 0, 0);
        parts.push(loop);
        const tail = new THREE.CapsuleGeometry(0.004 * k, 0.026 * k, 3, 8);
        tail.rotateZ(side * 0.35);
        tail.translate(side * 0.008 * k, -0.022 * k, 0);
        parts.push(tail);
    }
    parts.push(new THREE.SphereGeometry(0.0075 * k, 12, 8));
    const outward = new THREE.Vector3(c.x, 0, c.z).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward);
    for (const g of parts) {
        g.applyQuaternion(q);
        g.translate(c.x, c.y, c.z);
    }
    t.kit.skinned(weighTorso(t.rig, mergeSimple(parts)), material, "masna");
}

/** Tregeri (pantalone na tregere): dve trake preko ramena sa dugmadima */
export function suspenders(t: Tailor, offset: number, material: THREE.Material, buttonHex: string) {
    const s = t.s;
    const top = s.waistY - 0.03;
    for (const side of SIDES) {
        const scale = Math.min(1.3, s.height / 1.19);
        t.strap([[side * 0.35, top], [side * 0.42, s.chestY], [side * 0.62, s.shoulderY - 0.01], [side * 1.5, s.neckBaseY - 0.004], [side * 2.4, s.shoulderY - 0.01], [side * 2.75, s.chestY], [side * 2.82, top]], offset + 0.002, material, 0.014 * scale, 0.0028);
        t.button(side * 0.35, top + 0.004, offset + 0.003, plastic(buttonHex), 0.005);
    }
}
