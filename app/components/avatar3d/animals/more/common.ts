// Zajedničko za „još životinja” (animals/more/): vrsta kroz okvir (shape.ts i paint.ts tipizuju
// vrstu kao AnimalKind), pomoćne maske i boje iz extra/common (samo se uvoze), i delovi koji se
// ponavljaju među novim vrstama: kljun koji se otvara, rogovi, šiljci duž leđa, peraja i krila
// na kostima, šare (pege, rozete, pruge, krljušt). Sve je u prostoru tela (mirovanje), a deo
// koji prati kost se kači na nju sa pomerajem −položaj kosti (kao u extra/).

import * as THREE from "three";
import { shade } from "../../contract";
import type { AnimalKind, MoreAnimalKind } from "../../data";
import { merge, polyPath } from "../../engine/surface";
import type { Coat } from "../coats";
import type { AnimalBuild } from "../figure";
import { col, paintGeometry, type PaintPoint } from "../paint";
import { weightedTube } from "../parts";
import { scaleOf, smoothstep } from "../extra/common";
import { cells3 } from "../extra/kit/util";

export {
    bellyMask, brimRadiusAt, clamp01, col, eyePatch, goldCoat, headLocal, isHead, markColor, muzzleOf, PASTEL,
    rainbowAt, rainbowCoat, scaleOf, smoothstep, torsoAngle,
} from "../extra/common";
export { cells3, fbm3, noise3, rand } from "../extra/kit/util";

/** Okvir (shape.ts, paint.ts) tipizuje vrstu kao AnimalKind; nove vrste prolaze kroz ovo */
export function asMore(kind: MoreAnimalKind): AnimalKind {
    return kind as unknown as AnimalKind;
}

/** Dugine boje (pastel, malo jače) za dugina krzna */
export const RAINBOW = ["#FF9DB8", "#FFC08A", "#FFE68A", "#A8E6B0", "#9CCCFF", "#C7AEFF"];

/** Krzno iz osnovne i svetle boje (ostalo izvedeno), uz izmene */
export function coat(fur: string, light: string, extra: Partial<Coat> = {}): Coat {
    return {
        fur,
        light,
        muzzle: light,
        inner: "#F4B9C2",
        nose: shade(fur, -0.55),
        brow: shade(fur, -0.3),
        iris: ["#9A6A3A", "#3A200C"],
        // Dugino krzno (marks = RAINBOW): ugrađena duga po visini preko celog lika
        pattern: extra.marks === RAINBOW ? "rainbow" : "none",
        ...extra,
    };
}

/** Dugino krzno sa sopstvenom osnovom (šara se crta bojama `marks`) */
export function rainbowOf(fur = "#FFF6FA", extra: Partial<Coat> = {}): Coat {
    return coat(fur, "#FFFFFF", { nose: "#E58AA8", brow: "#B59AD0", iris: ["#C9A6F2", "#6A3FB0"], marks: RAINBOW, mane: RAINBOW, ...extra });
}

/** Mesh u prostoru tela koji prati kost (kost u mirovanju nema rotaciju) */
export function onBone(b: AnimalBuild, bone: string, object: THREE.Object3D): THREE.Object3D {
    const target = b.bone(bone);
    if (!target) return object;
    object.position.sub(b.boneAt(bone));
    target.add(object);
    return object;
}

/** Jedna boja u temenima (deo na materijalu krzna koji nema šaru) */
export function fillColor(g: THREE.BufferGeometry, hex: string | THREE.Color, shadeFn?: (p: THREE.Vector3) => number): THREE.BufferGeometry {
    const pos = g.getAttribute("position");
    const arr = new Float32Array(pos.count * 3);
    const c = typeof hex === "string" ? col(hex) : hex;
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        const k = shadeFn ? shadeFn(p.fromBufferAttribute(pos, i)) : 1;
        arr.set([c.r * k, c.g * k, c.b * k], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    return g;
}

const glossCache = new Map<string, THREE.MeshPhysicalMaterial>();

/** Sjajan materijal (kljun, rog, kandže) sa bojama iz temena — keširan, deli se među likovima */
export function glossyVertexMaterial(roughness = 0.38): THREE.MeshPhysicalMaterial {
    const key = roughness.toFixed(2);
    let m = glossCache.get(key);
    if (!m) {
        m = new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", vertexColors: true, roughness, clearcoat: 0.7, clearcoatRoughness: 0.25, specularIntensity: 0.6 });
        glossCache.set(key, m);
    }
    return m;
}

/** Jednostavne uv koordinate (krzno u metrima) za spojene delove */
export function boxUv(g: THREE.BufferGeometry): THREE.BufferGeometry {
    const pos = g.getAttribute("position");
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = (pos.getX(i) + pos.getZ(i)) / 0.05;
        uv[i * 2 + 1] = pos.getY(i) / 0.05;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g;
}

// ── Kljun ─────────────────────────────────────────────────────────────────────

export interface BeakSpec {
    /** Dužina, poluširina i visina gornjeg kljuna (m, za glavu širine `ref`) */
    len: number;
    w: number;
    h: number;
    /** Kuka: vrh se savija naniže (papagaj, sova); 0 = ravan */
    hook?: number;
    /** Pljosnat kljun (patka): zaobljen vrh, širok */
    flat?: boolean;
    /** Savijen na pola (flamingo): ugao naniže od sredine */
    bend?: number;
    color: string;
    lower?: string;
    /** Crni vrh (flamingo) */
    tip?: string;
    /** v na licu (podrazumevano noseV) */
    v?: number;
    /** Koliko se donji kljun otvara (rad) */
    open?: number;
}

/**
 * Kljun ptice: gornji deo (pljosnat, kukast ili savijen) i donji koji se otvara pri govoru i
 * osmehu. Vraća grupu (ide na mesto usta, u grupu glave preko AnimalBuild.face) i setJaw.
 */
export function buildBeak(b: AnimalBuild, s: BeakSpec): { group: THREE.Group; setJaw: (open: number, smile: number) => void; tipZ: number } {
    const head = b.head;
    const v = s.v ?? head.spec.noseV;
    const at = head.point(0.5, v);
    const n = head.normal(0.5, v);
    const k = scaleOf(b);
    const hi = b.quality === "high";
    const group = new THREE.Group();
    group.name = "kljun";
    group.scale.setScalar(k);
    group.position.copy(at).addScaledVector(n, -0.006 * k);
    // Kljun gleda napred (malo naniže prema normali lica)
    const fwd = new THREE.Vector3(0, n.y * 0.4, 1).normalize();
    group.lookAt(group.position.clone().add(fwd));
    const shapeAt = (t: number, lowerJaw: boolean) => {
        // Poprečni presek: poluširina i visina duž kljuna (t = 0 koren, 1 vrh)
        const w = s.flat ? s.w * (1 - 0.18 * t) * Math.sqrt(Math.max(0, 1 - Math.pow(t, 6))) : s.w * Math.pow(1 - t, 0.9) + 0.0012;
        const h = (lowerJaw ? 0.45 : 1) * (s.flat ? s.h * (1 - 0.55 * t) : s.h * Math.pow(1 - t, 0.85) + 0.001);
        return [w, h];
    };
    const centerAt = (t: number, out: THREE.Vector3) => {
        const z = s.len * t;
        let y = -(s.hook ?? 0) * s.len * t * t * t;
        if (s.bend) {
            const tb = Math.max(0, t - 0.45);
            y -= Math.sin(s.bend) * s.len * tb * 1.2;
            out.set(0, y, s.len * Math.min(t, 0.45) + Math.cos(s.bend) * s.len * tb);
            return out;
        }
        return out.set(0, y, z);
    };
    const tube = (lowerJaw: boolean) => {
        const nu = hi ? 22 : 12;
        const nv = hi ? 16 : 8;
        const pos: number[] = [];
        const idx: number[] = [];
        const c = new THREE.Vector3();
        for (let j = 0; j <= nv; j++) {
            const t = j / nv;
            centerAt(t, c);
            const [w, h] = shapeAt(t, lowerJaw);
            for (let i = 0; i <= nu; i++) {
                const a = (i / nu) * Math.PI * 2;
                const sx = Math.sin(a);
                const cy = Math.cos(a);
                // Gornji: luk iznad (ravnije dole); donji: luk ispod
                const y = lowerJaw ? (cy > 0 ? cy * h * 0.25 : cy * h) : (cy > 0 ? cy * h : cy * h * 0.22);
                pos.push(c.x + sx * w, c.y + y, c.z);
            }
        }
        // Zatvaranje vrha: poslednji prsten je skoro tačka (preseci idu u 0 na t = 1)
        for (let j = 0; j < nv; j++) {
            for (let i = 0; i < nu; i++) {
                const a = j * (nu + 1) + i;
                const bb = a + nu + 1;
                idx.push(a, bb, a + 1, a + 1, bb, bb + 1);
            }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        // Boje: osnovna, vrh tamniji (flamingo)
        const arr = new Float32Array(pos.length);
        const base = col(lowerJaw ? s.lower ?? shade(s.color, -0.1) : s.color);
        const tip = col(s.tip ?? (lowerJaw ? s.lower ?? s.color : s.color));
        const cc = new THREE.Color();
        for (let j = 0; j <= nv; j++) {
            const t = j / nv;
            cc.copy(base).lerp(tip, s.tip ? smoothstep(0.55, 0.7, t) : 0);
            for (let i = 0; i <= nu; i++) arr.set([cc.r, cc.g, cc.b], (j * (nu + 1) + i) * 3);
        }
        g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
        return g;
    };
    const mat = glossyVertexMaterial(s.flat ? 0.45 : 0.35);
    const upper = new THREE.Mesh(tube(false), mat);
    upper.name = "kljun-gore";
    const lowerPivot = new THREE.Group();
    lowerPivot.position.set(0, -0.0015, 0.002);
    const lower = new THREE.Mesh(tube(true), mat);
    lower.scale.set(0.94, 1, 0.9);
    lower.name = "kljun-dole";
    lowerPivot.add(lower);
    group.add(upper, lowerPivot);
    const open = s.open ?? 0.5;
    return {
        group,
        tipZ: s.len * k,
        setJaw: (o, smile) => {
            lowerPivot.rotation.x = o * open;
            // Osmeh: uglovi kljuna se malo podignu (donji kljun se blago raširi)
            lower.scale.x = 0.94 + Math.max(0, smile) * 0.06;
        },
    };
}

// ── Rogovi ────────────────────────────────────────────────────────────────────

export interface HornSpec {
    /** Mesto korena na glavi (u, v) — leva strana; desna je ogledalo */
    u: number;
    v: number;
    /** Putanja od korena (m, za glavu širine `ref`): tačke u prostoru glave, levo (+x) */
    points: [number, number, number][];
    r0: number;
    r1: number;
    color: string;
    /** Prstenovi (koza): koliko izraženi */
    rings?: number;
    /** Samo jedan rog na sredini (u = 0,5) */
    single?: boolean;
}

/**
 * Rogovi na glavi (koza, krava, zmaj, nosorog): zaobljena cev koja se sužava, sa blagim
 * prstenovima; kapa ih zaobilazi (sidro `horn` = sredina para) i sakriva ih kad to traži.
 */
export function addHorns(b: AnimalBuild, s: HornSpec, setAnchor = true): { bases: THREE.Vector3[]; tips: THREE.Vector3[] } {
    const head = b.head;
    const k = scaleOf(b);
    const hi = b.quality === "high";
    const bases: THREE.Vector3[] = [];
    const tips: THREE.Vector3[] = [];
    const sides = s.single ? [1] : [1, -1];
    const mat = glossyVertexMaterial(0.38);
    for (const side of sides) {
        const u = s.single ? 0.5 : 0.5 + side * (s.u - 0.5);
        const base = head.offsetPoint(u, s.v, -0.012 * k);
        const pts = s.points.map(([x, y, z]) => new THREE.Vector3(x * side * k, y * k, z * k).add(base));
        const path = polyPath(pts);
        const g = weightedTube(path, (t) => (s.r0 + (s.r1 - s.r0) * Math.pow(t, 0.8)) * k * (1 + (s.rings ?? 0) * 0.08 * Math.sin(t * 40) * (1 - t)), hi ? 24 : 12, hi ? 14 : 8);
        g.deleteAttribute("uv");
        // Boja: koren malo tamniji, vrh svetliji
        const c0 = col(shade(s.color, -0.12));
        const c1 = col(shade(s.color, 0.18));
        const pos = g.getAttribute("position");
        const arr = new Float32Array(pos.count * 3);
        const p = new THREE.Vector3();
        const cc = new THREE.Color();
        const len = pts[0].distanceTo(pts[pts.length - 1]);
        for (let i = 0; i < pos.count; i++) {
            p.fromBufferAttribute(pos, i);
            cc.copy(c0).lerp(c1, smoothstep(0, 1, p.distanceTo(pts[0]) / Math.max(1e-4, len)));
            arr.set([cc.r, cc.g, cc.b], i * 3);
        }
        g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
        const mesh = new THREE.Mesh(g, mat);
        mesh.name = "rog";
        b.headGroup.add(mesh);
        b.part("horn", mesh);
        bases.push(base.clone());
        tips.push(pts[pts.length - 1].clone());
    }
    if (setAnchor) {
        const hb = b.boneAt("head");
        const base = bases.reduce((a, x) => a.add(x), new THREE.Vector3()).multiplyScalar(1 / bases.length).add(hb);
        const tip = tips.reduce((a, x) => a.add(x), new THREE.Vector3()).multiplyScalar(1 / tips.length).add(hb);
        // Poluprečnik obuhvata oba roga (kapa ih zaobilazi zajedno)
        const spread = bases.length > 1 ? bases[0].distanceTo(bases[1]) / 2 + s.r0 * k : s.r0 * k;
        b.setHorn({ base, tip, radius: spread });
    }
    return { bases, tips };
}

// ── Pločice / šiljci duž leđa (zmaj, krokodil) ────────────────────────────────

/** Zaobljena trouglasta pločica: osnova na y = 0, raste po +y, duž z */
export function plateGeometry(h: number, l: number, quality: "high" | "low", sharp = 0.6): THREE.BufferGeometry {
    const g = new THREE.SphereGeometry(1, quality === "high" ? 16 : 9, quality === "high" ? 10 : 6);
    const pos = g.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const t = Math.max(0, y);
        pos.setXYZ(i, x * 0.24 * (1 - sharp * t), y, z * (1 - 0.72 * Math.pow(t, 1.3)) - t * t * 0.18);
    }
    g.scale(h * 0.55, h, l * 0.5);
    g.translate(0, h * 0.2, 0);
    g.computeVertexNormals();
    g.deleteAttribute("uv");
    return g;
}

/** Postavlja pločicu na kost: `up` napolje, `back` duž kičme unazad (naniže) */
export function placePlate(b: AnimalBuild, bone: string, at: THREE.Vector3, up: THREE.Vector3, back: THREE.Vector3, h: number, color: THREE.Color, sharp = 0.6): THREE.Mesh {
    const g = plateGeometry(h, h * 1.15, b.quality, sharp);
    const fwd = back.clone().negate();
    fwd.addScaledVector(up, -fwd.dot(up)).normalize();
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(up, fwd).normalize(), up, fwd);
    g.applyMatrix4(m);
    g.translate(at.x, at.y, at.z);
    const pos = g.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        const d = p.fromBufferAttribute(pos, i).sub(at).dot(up) / h;
        const kk = 0.8 + 0.2 * smoothstep(0, 0.9, d);
        colors.set([color.r * kk, color.g * kk, color.b * kk], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    boxUv(g);
    const mesh = new THREE.Mesh(g, b.fur);
    mesh.name = "plocica";
    onBone(b, bone, mesh);
    return mesh;
}

/** Kost trupa za visinu y */
export function torsoBone(b: AnimalBuild, y: number): string {
    const s = b.shape;
    return y > s.chestY - 0.02 ? "chest" : y > s.waistY - 0.02 ? "spine" : "hips";
}

/** Tačka putanje repa (prostor tela) i njen pravac */
export function tailFrame(b: AnimalBuild, s: number): { at: THREE.Vector3; tangent: THREE.Vector3; up: THREE.Vector3 } {
    const shape = b.shape;
    const tail = b.spec.tail!;
    const k = scaleOf(b);
    const y0 = shape.crotchY + (tail.height !== undefined ? tail.height * k : 0.06);
    const base = new THREE.Vector3(0, y0, -shape.torsoBack(y0) + 0.014);
    const path = polyPath(tail.points.map(([x, y, z]) => new THREE.Vector3(x * k, y * k, z * k).add(base)));
    const at = path(s, new THREE.Vector3());
    const tangent = path(Math.min(1, s + 0.02), new THREE.Vector3()).sub(path(Math.max(0, s - 0.02), new THREE.Vector3())).normalize();
    const up = new THREE.Vector3(0, 1, 0).addScaledVector(tangent, -tangent.y).normalize();
    return { at, tangent, up };
}

/** Kost repa za udeo s */
export function tailBone(s: number): string {
    return s < 0.35 ? "tail1" : s < 0.7 ? "tail2" : "tail3";
}

// ── Peraja / opna (delfin, zmaj, slepi miš) ───────────────────────────────────

/**
 * Ravna zaobljena ploča (peraja, krilo, perje): obris u ravni (x, y) — `outline(t)` daje tačku
 * za t ∈ [0, 1] oko ivice — debljina `thick` u sredini, tanka ka ivici. Lice gleda ka +z.
 */
export function finGeometry(outline: (t: number) => [number, number], thick: number, quality: "high" | "low"): THREE.BufferGeometry {
    const hi = quality === "high";
    const seg = hi ? 48 : 24;
    const rings = hi ? 6 : 4;
    // Središte obrisa
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < seg; i++) {
        const [x, y] = outline(i / seg);
        cx += x / seg;
        cy += y / seg;
    }
    const pos: number[] = [];
    const idx: number[] = [];
    for (const face of [1, -1]) {
        const start = pos.length / 3;
        pos.push(cx, cy, face * thick);
        for (let r = 1; r <= rings; r++) {
            const t = r / rings;
            for (let i = 0; i < seg; i++) {
                const [x, y] = outline(i / seg);
                const z = face * thick * Math.sqrt(Math.max(0, 1 - t * t)) + face * 0.0003;
                pos.push(cx + (x - cx) * t, cy + (y - cy) * t, z);
            }
        }
        for (let i = 0; i < seg; i++) {
            const a = start + 1 + i;
            const bb = start + 1 + ((i + 1) % seg);
            if (face > 0) idx.push(start, a, bb);
            else idx.push(start, bb, a);
        }
        for (let r = 1; r < rings; r++) {
            const a0 = start + 1 + (r - 1) * seg;
            const a1 = start + 1 + r * seg;
            for (let i = 0; i < seg; i++) {
                const i1 = (i + 1) % seg;
                if (face > 0) idx.push(a0 + i, a1 + i, a1 + i1, a0 + i, a1 + i1, a0 + i1);
                else idx.push(a0 + i, a1 + i1, a1 + i, a0 + i, a0 + i1, a1 + i1);
            }
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return boxUv(g);
}

/** Obris kapi/lista: dužina `len` duž +y od korena, najveća širina `w` na udelu `at` */
export function leafOutline(len: number, w: number, at = 0.4, tipCurl = 0): (t: number) => [number, number] {
    return (t) => {
        const a = t * Math.PI * 2;
        // Parametrizacija oko lista: y od 0 do len, x po obliku
        const yy = (1 - Math.cos(a)) / 2;
        const side = Math.sin(a) >= 0 ? 1 : -1;
        const prof = Math.pow(Math.sin(Math.PI * Math.pow(yy, Math.log(0.5) / Math.log(at))), 0.8);
        return [side * w * prof + tipCurl * yy * yy * len, yy * len];
    };
}

/** Boji ploču bojama krzna (region po izboru) u prostoru tela */
export function paintPart(b: AnimalBuild, g: THREE.BufferGeometry, region: PaintPoint["region"], extra: Partial<PaintPoint> = {}, offset?: THREE.Vector3): void {
    paintGeometry(g, b.paint, (_i, p) => ({ p: offset ? p.clone().add(offset) : p, region, ...extra }));
}

// ── Šare ──────────────────────────────────────────────────────────────────────

/** Rozete (leopard): prsten oko svetlijeg središta; vraća [prsten, središte] 0–1 */
export function rosettes(p: THREE.Vector3, scale: number, seed = 31): [number, number] {
    const [d1, d2, id] = cells3(p.x * scale, p.y * scale, p.z * scale, seed, 0.8);
    const r = 0.3 + 0.08 * id;
    const ring = (1 - smoothstep(r - 0.02, r + 0.05, d1)) * smoothstep(r - 0.17, r - 0.09, d1);
    // Prekinuti prsten (2–3 luka), kao prave rozete
    const gap = smoothstep(0.03, 0.1, d2 - d1);
    const center = 1 - smoothstep(r - 0.2, r - 0.12, d1);
    return [ring * (0.55 + 0.45 * gap), center];
}

/** Pune okrugle pege (gepard, dalmatinska krava): 0–1 */
export function dots(p: THREE.Vector3, scale: number, size = 0.26, seed = 17): number {
    const [d1, , id] = cells3(p.x * scale, p.y * scale, p.z * scale, seed, 0.85);
    const r = size * (0.8 + 0.4 * id);
    return 1 - smoothstep(r * 0.82, r, d1);
}

/** Krupne nepravilne mrlje (krava, koza): 0–1 */
export function patches(p: THREE.Vector3, scale: number, seed = 5, fill = 0.42): number {
    const [d1, d2, id] = cells3(p.x * scale, p.y * scale, p.z * scale, seed, 0.95);
    if (id > fill) return 0;
    return smoothstep(0.02, 0.09, d2 - d1);
}

/** Krljušt (krokodil, zmaj): [ivica pločice (tamna linija), id pločice] */
export function scales(p: THREE.Vector3, scale: number, seed = 9): [number, number] {
    const [d1, d2, id] = cells3(p.x * scale, p.y * scale, p.z * scale, seed, 0.7);
    return [1 - smoothstep(0.02, 0.09, d2 - d1), id];
}

/** Spaja delove (bez boja) */
export { merge };
