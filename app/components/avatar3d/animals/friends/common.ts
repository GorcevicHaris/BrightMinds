// Zajedničko za nove drugare (animals/friends/): vrsta kroz okvir (shape.ts i paint.ts tipizuju
// vrstu kao AnimalKind), pomoćne maske, boje i delovi iz more/common (samo se uvoze), i delovi
// koji se ponavljaju među novim drugarima: pipci (antene) sa kuglicom na vrhu koji prolaze kroz
// kapu kao uspravne uši, sjajna plastika (robotić), providna krilca na leđima (pčelica,
// leptirić) i sitne okrugle šare. Sve je u prostoru tela (mirovanje), a deo koji prati kost se
// kači na nju sa pomerajem −položaj kosti (kao u extra/ i more/).

import * as THREE from "three";
import type { AnimalKind, FriendKind } from "../../data";
import type { Coat } from "../coats";
import type { AnimalBuild, EarSpec } from "../figure";
import { col } from "../paint";
import { boxUv, finGeometry, onBone, smoothstep } from "../more/common";

export {
    addHorns, bellyMask, boxUv, brimRadiusAt, cells3, clamp01, coat, col, dots, eyePatch, fbm3, fillColor, finGeometry, glossyVertexMaterial, goldCoat,
    headLocal, headMarks, isHead, leafOutline, noise3, onBone, paintPart, rainbowAt, RAINBOW, scaleOf, smoothstep, tailFrame, torsoAngle, torsoBone,
} from "../more/common";
export type { HeadMark } from "../more/common";

/** Okvir (shape.ts, paint.ts) tipizuje vrstu kao AnimalKind; novi drugari prolaze kroz ovo */
export function asFriend(kind: FriendKind): AnimalKind {
    return kind as unknown as AnimalKind;
}

// ── Pipci (antene) ────────────────────────────────────────────────────────────

export interface AntennaOptions {
    /** Dužina i debljina drške (m, za glavu širine `ref`) */
    len: number;
    thick: number;
    /** Koren na glavi (u, v) — levi; desni je ogledalo */
    u: number;
    v: number;
    /** Nagib: unazad (x), napolje (z) */
    back: number;
    out: number;
    /** Savijanje: + unazad (m na vrhu), − napred */
    bend?: number;
}

/**
 * Pipci kao uspravne uši (sidro `tall`): kapa im pravi otvor sa porubom kao zeki, a pri
 * mirnom liku blago trznu (pokret ušiju). Kuglica na vrhu je posebno (antennaTips).
 */
export function antennaEars(o: AntennaOptions): EarSpec {
    // Drška je tanka i ravnomerna, malo deblja u korenu, zaobljen vrh (pokriva ga kuglica)
    const profile = (t: number) => (0.78 + 0.22 * (1 - t)) * Math.sqrt(Math.max(0, 1 - Math.pow(t, 8)));
    return {
        kind: "tall",
        shape: { len: o.len, width: o.thick, depth: o.thick, profile, bend: o.bend ?? 0, cup: 0 },
        u: o.u,
        v: o.v,
        sink: 0.008,
        tilt: [o.back, 0, o.out],
        inner: "fur",
    };
}

/** Vrh uha/pipka (prostor tela) — isto kao figure.ts (sidro tipL/tipR) */
export function earTip(b: AnimalBuild, side: 1 | -1, along = 1): THREE.Vector3 {
    const ears = typeof b.spec.ears === "function" ? b.spec.ears(b.coat) : b.spec.ears;
    if (!ears) return b.boneAt("head");
    const k = b.k;
    const len = ears.shape.len * k;
    const bend = (ears.shape.bend ?? 0) * k;
    const [tx, ty, tz] = ears.tilt;
    const rot = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(tx, side * ty, -side * tz, "ZYX"));
    return new THREE.Vector3(0, len * along, -bend * along * along).applyMatrix4(rot).add(b.boneAt(side === 1 ? "earL" : "earR"));
}

/**
 * Kuglica na vrhu svakog pipka (svetla, sa blagim sjajem); prati kost uha i skriva se sa
 * ušima. `glow`: svetlucava (vanzemaljac).
 */
export function antennaTips(b: AnimalBuild, o: { r: number; color: string; glow?: boolean; shape?: "ball" | "heart" | "curl" }): void {
    const k = b.k;
    const hi = b.quality === "high";
    for (const side of [1, -1] as const) {
        const tip = earTip(b, side);
        let g: THREE.BufferGeometry;
        if (o.shape === "curl") {
            // Uvijen vrh (leptirić): mali spiralni uvojak napolje
            const pts: THREE.Vector3[] = [];
            for (let i = 0; i <= 24; i++) {
                const t = i / 24;
                const a = t * Math.PI * 1.6;
                const r = o.r * 1.6 * (1 - t * 0.55);
                pts.push(new THREE.Vector3(side * (r - r * Math.cos(a)), r * Math.sin(a), 0));
            }
            const curve = new THREE.CatmullRomCurve3(pts);
            g = new THREE.TubeGeometry(curve, hi ? 32 : 16, o.r * 0.42, hi ? 10 : 6, false);
            const cap = new THREE.SphereGeometry(o.r * 0.62, hi ? 14 : 8, hi ? 10 : 6);
            cap.translate(pts[pts.length - 1].x, pts[pts.length - 1].y, 0);
            const base = new THREE.SphereGeometry(o.r * 0.5, hi ? 12 : 8, hi ? 8 : 6);
            g = mergeSimple([g, cap, base]);
            g.scale(k, k, k);
        } else {
            g = new THREE.SphereGeometry(o.r * k, hi ? 24 : 12, hi ? 16 : 9);
        }
        g.deleteAttribute("uv");
        g.translate(tip.x, tip.y, tip.z);
        // Boja: odozgo svetlija, odozdo tamnija (meka lopta)
        const pos = g.getAttribute("position");
        const arr = new Float32Array(pos.count * 3);
        const c0 = col(o.color);
        const c = new THREE.Color();
        for (let i = 0; i < pos.count; i++) {
            const dy = (pos.getY(i) - tip.y) / (o.r * k * 1.6);
            c.copy(c0).multiplyScalar(0.84 + 0.22 * smoothstep(-1, 1, dy));
            arr.set([c.r, c.g, c.b], i * 3);
        }
        g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
        boxUv(g);
        const mesh = new THREE.Mesh(g, o.glow ? glowMaterial() : b.fur);
        mesh.name = "pipak-vrh";
        onBone(b, side === 1 ? "earL" : "earR", mesh);
        b.part("ears", mesh);
    }
}

function mergeSimple(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const list = parts.map((p) => (p.index ? p.toNonIndexed() : p));
    for (const p of list) {
        p.deleteAttribute("uv");
        p.deleteAttribute("normal");
    }
    let count = 0;
    for (const p of list) count += p.getAttribute("position").count;
    const arr = new Float32Array(count * 3);
    let o = 0;
    for (const p of list) {
        arr.set(p.getAttribute("position").array as Float32Array, o);
        o += p.getAttribute("position").count * 3;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    g.computeVertexNormals();
    return g;
}

// ── Materijali ────────────────────────────────────────────────────────────────

const cache = new Map<string, THREE.Material>();

function cached<T extends THREE.Material>(key: string, make: () => T): T {
    let m = cache.get(key) as T | undefined;
    if (!m) {
        m = make();
        cache.set(key, m);
    }
    return m;
}

/** Sjajna meka plastika (igračka): boje iz temena, lak, bez dlake — robotić */
export function plasticMaterial(coatOf: Coat): THREE.MeshPhysicalMaterial {
    const metal = coatOf.shimmer ? 1 : 0;
    return cached(`plastic-${metal}`, () => new THREE.MeshPhysicalMaterial({
        color: "#FFFFFF",
        vertexColors: true,
        roughness: metal ? 0.3 : 0.42,
        metalness: metal ? 0.35 : 0.02,
        clearcoat: 0.8,
        clearcoatRoughness: 0.22,
        specularIntensity: 0.55,
        sheen: 0.15,
        sheenRoughness: 0.5,
        sheenColor: new THREE.Color("#FFFFFF"),
        iridescence: metal ? 0.2 : 0,
    }));
}

/** Svetleća kuglica (pipci vanzemaljca, lampica robotića): boje iz temena, blago sija sama */
export function glowMaterial(): THREE.MeshPhysicalMaterial {
    return cached("glow", () => new THREE.MeshPhysicalMaterial({
        color: "#FFFFFF",
        vertexColors: true,
        roughness: 0.25,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        emissive: new THREE.Color("#FFFFFF"),
        emissiveIntensity: 0.07,
    }));
}

/** Providno krilce (pčelica): mlečno belo-plavo staklo sa prelivanjem; boje iz temena */
export function wingMaterial(opacity = 0.62): THREE.MeshPhysicalMaterial {
    return cached(`wing-${opacity}`, () => new THREE.MeshPhysicalMaterial({
        color: "#FFFFFF",
        vertexColors: true,
        roughness: 0.25,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        clearcoat: 0.6,
        iridescence: 0.8,
        iridescenceIOR: 1.3,
        iridescenceThicknessRange: [200, 480],
    }));
}

// ── Krila na leđima ──────────────────────────────────────────────────────────

export interface WingOptions {
    /** Obris krila u ravni (x napolje, y gore), od korena; desno je ogledalo */
    outline: (t: number) => [number, number];
    /** Visina korena (udeo između struka i ramena) i nagib */
    at: number;
    /** Okret oko uspravne ose (napolje-nazad) i nagib nagore (rad) */
    yaw: number;
    roll?: number;
    thick: number;
    /** Boja temena po tački krila (x, y u ravni krila, udeo od korena 0–1) */
    color: (x: number, y: number, d: number, out: THREE.Color) => THREE.Color;
    material?: THREE.Material;
    /** Mahanje: brzina i ugao (rad) */
    flap?: [number, number];
    /** Delovi koji se zajedno mašu (više krila po strani: leptirić) */
    name?: string;
}

/**
 * Par krila na leđima (prolaze kroz odeću kao rep: deo „tail”), blago mašu dok je lik živ.
 * Krilo raste iz lopatice napolje i unazad; desno je ogledalo levog.
 */
export function backWings(b: AnimalBuild, list: readonly WingOptions[]): void {
    const { shape } = b;
    const k = b.k;
    for (const side of [1, -1] as const) {
        const pivot = new THREE.Group();
        const y = shape.waistY + (shape.shoulderY - shape.waistY) * list[0].at;
        const root = new THREE.Vector3(side * 0.02 * k, y, -shape.torsoBack(y) + 0.006);
        pivot.position.copy(root);
        for (const w of list) {
            const g = finGeometry((t) => {
                const [x, yy] = w.outline(t);
                return [x * side * k, yy * k];
            }, w.thick * k, b.quality);
            const pos = g.getAttribute("position");
            const colors = new Float32Array(pos.count * 3);
            const c = new THREE.Color();
            let span = 1e-6;
            for (let i = 0; i < pos.count; i++) span = Math.max(span, Math.hypot(pos.getX(i), pos.getY(i)));
            for (let i = 0; i < pos.count; i++) {
                const x = Math.abs(pos.getX(i)) / k;
                const yy = pos.getY(i) / k;
                w.color(x, yy, Math.hypot(pos.getX(i), pos.getY(i)) / span, c);
                colors.set([c.r, c.g, c.b], i * 3);
            }
            g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
            // Krilo: okret napolje-nazad, malo nagore
            g.rotateZ(-side * (w.roll ?? 0));
            g.rotateY(side * w.yaw);
            const mesh = new THREE.Mesh(g, w.material ?? b.fur);
            mesh.name = w.name ?? "krilo";
            if (w.material && (w.material as THREE.Material).transparent) mesh.renderOrder = 2;
            pivot.add(mesh);
        }
        onBone(b, "chest", pivot);
        b.part("tail", pivot);
        const [speed, amp] = list[0].flap ?? [2.4, 0.16];
        b.onAnimate((time, _dt, live) => {
            pivot.rotation.y = live ? side * (Math.sin(time * speed) * 0.5 + 0.5) * amp : 0;
        });
    }
}

/** Obris okrenut oko korena (rad, od +y ka +x) */
export function rotated(outline: (t: number) => [number, number], angle: number): (t: number) => [number, number] {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return (t) => {
        const [x, y] = outline(t);
        return [x * c + y * s, -x * s + y * c];
    };
}

/** Kružna mrlja (tufna) oko tačke c poluprečnika r, meka ivica: 0–1 */
export function disc(p: THREE.Vector3, c: THREE.Vector3, r: number, soft = 0.15): number {
    return 1 - smoothstep(r * (1 - soft), r * (1 + soft), p.distanceTo(c));
}
