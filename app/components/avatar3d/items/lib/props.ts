// Predmeti u ruci (rekviziti): okvir hvata u DESNOJ šaci lika, razmera po visini lika,
// sitni geometrijski pomoćnici (strug, cev, izvučen oblik sa zaobljenom ivicom) i
// posebni materijali (sapunski mehur, svetlo lampe, papir) — svi keširani.

import * as THREE from "three";
import type { ItemContext } from "../../contract";
import { fabricNormal } from "../../engine/textures";
import { polyPath, taperedTube } from "../../engine/surface";
import { printTexture } from "../../engine/textures";
import { attachAt, res, seg } from "./common";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ── Razmera i hvat ──────────────────────────────────────────────────────────

/** Razmera rekvizita: dete = 1, odrasli najviše 1,25, životinja ≈ 0,85 */
export function propScale(ctx: ItemContext): number {
    return Math.min(1.25, Math.max(0.78, ctx.body.anchors.height / 1.19));
}

/** Tačka hvata u prostoru tela (desna šaka) */
export function gripPoint(ctx: ItemContext): THREE.Vector3 {
    const a = ctx.body.anchors;
    const p = a.hands.right.clone().add(a.hands.grip);
    // Peraje i kopita: predmet se naslanja malo ispred (nema prstiju da ga obuhvate)
    if (a.hands.kind === "flipper" || a.hands.kind === "hoof") p.z += 0.012;
    return p;
}

export interface HoldOptions {
    /** Nagib ose predmeta napred (rad, od uspravnog) */
    lean?: number;
    /** Nagib ka spolja (rad; desna ruka je gledaocu levo) */
    out?: number;
    /** Bez nagiba (visi ili stoji uspravno kao u svetu) */
    upright?: boolean;
    /** Crtana krupnoća (predmet je malo veći od stvarnog da se lepo vidi); 1 = stvarna */
    size?: number;
}

/** Rekviziti su kao u crtanom filmu malo krupniji od stvarnih (čitljivi u sličici) */
export const PROP_SIZE = 1.35;

/**
 * Kači predmet u desnu šaku. Predmet se crta u svom okviru: +y = osa drške (gore),
 * +z = lice predmeta (ka gledaocu), +x = ka telu. Ishodište = sredina pesnice.
 */
export function hold(ctx: ItemContext, object: THREE.Object3D, options: HoldOptions = {}): THREE.Object3D {
    const k = propScale(ctx);
    const pivot = new THREE.Group();
    pivot.name = "u-ruci";
    object.scale.multiplyScalar(k * (options.size ?? PROP_SIZE));
    pivot.add(object);
    if (!options.upright) {
        const lean = options.lean ?? 0.42;
        const out = options.out ?? 0.12;
        // Okret: prvo nagib napred (oko x), pa ka spolja (oko z; desna ruka je na −x)
        pivot.quaternion.setFromEuler(new THREE.Euler(lean, 0, out, "ZXY"));
    }
    return attachAt(ctx, "handR", pivot, gripPoint(ctx));
}

/**
 * Predmet koji uvek stoji uspravno u odnosu na lik (balon, zmaj, kišobran), čak i kad lik
 * pomeri ruku (ruke na kukovima, mahanje): poništava okret šake. Zove se svaki kadar.
 */
export function keepUpright(ctx: ItemContext, pivot: THREE.Object3D): () => void {
    const qa = new THREE.Quaternion();
    const qb = new THREE.Quaternion();
    return () => {
        const parent = pivot.parent;
        if (!parent) return;
        parent.updateWorldMatrix(true, false);
        parent.getWorldQuaternion(qa);
        ctx.body.root.getWorldQuaternion(qb);
        pivot.quaternion.copy(qa.invert().multiply(qb));
    };
}

/** Objekat sa animacijom (motor je zove; `live` = false → miruje) */
export type Animate = (time: number, dt: number, live: boolean) => void;

// ── Geometrija ──────────────────────────────────────────────────────────────

/** Strug: profil [poluprečnik, visina] oko ose y */
export function lathe(points: [number, number][], segments: number): THREE.LatheGeometry {
    return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), segments);
}

/** Glatki profil kroz kontrolne tačke (Catmull-Rom), n tačaka */
export function smoothProfile(points: [number, number][], n: number): [number, number][] {
    const curve = new THREE.SplineCurve(points.map(([r, y]) => new THREE.Vector2(r, y)));
    return curve.getPoints(n).map((p) => [p.x, p.y]);
}

/** Cev kroz tačke (konstantan ili promenljiv poluprečnik) */
export function tube(points: THREE.Vector3[], r: number | ((s: number) => number), segments = 24, sides = 8): THREE.BufferGeometry {
    return taperedTube(polyPath(points), typeof r === "number" ? () => r : r, segments, sides);
}

/** Izvučen 2D oblik sa zaobljenom ivicom (zvezda, srce, gitara) — centriran po debljini */
export function puffy(shape: THREE.Shape, depth: number, bevel: number, r = 1, curves = 14): THREE.ExtrudeGeometry {
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel * 0.9,
        bevelSegments: seg(5, r, 2),
        curveSegments: seg(curves, r, 2),
    });
    geometry.translate(0, 0, -depth / 2);
    geometry.computeVertexNormals();
    return geometry;
}

/** Zvezda sa zaobljenim krakovima */
export function starShape(outer: number, inner: number, points = 5): THREE.Shape {
    const shape = new THREE.Shape();
    const n = points * 2;
    const at = (i: number) => {
        const rr = i % 2 === 0 ? outer : inner;
        const a = Math.PI / 2 + (i * Math.PI) / points;
        return new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr);
    };
    // Svaki vrh se zaobljava: prava do tačke malo pre vrha, pa kriva kroz vrh do tačke posle njega
    for (let i = 0; i <= n; i++) {
        const p = at(i % n);
        const a = p.clone().lerp(at((i + n - 1) % n), 0.16);
        const b = p.clone().lerp(at((i + 1) % n), 0.16);
        if (i === 0) shape.moveTo(b.x, b.y);
        else {
            shape.lineTo(a.x, a.y);
            shape.quadraticCurveTo(p.x, p.y, b.x, b.y);
        }
    }
    return shape;
}

/** Srce (vrh dole) poluprečnika r */
export function heartShape(r: number): THREE.Shape {
    const s = new THREE.Shape();
    s.moveTo(0, -r * 0.95);
    s.bezierCurveTo(-r * 0.35, -r * 0.6, -r * 1.15, -r * 0.15, -r * 1.05, r * 0.38);
    s.bezierCurveTo(-r * 0.95, r * 0.95, -r * 0.2, r * 1.0, 0, r * 0.5);
    s.bezierCurveTo(r * 0.2, r * 1.0, r * 0.95, r * 0.95, r * 1.05, r * 0.38);
    s.bezierCurveTo(r * 1.15, -r * 0.15, r * 0.35, -r * 0.6, 0, -r * 0.95);
    return s;
}

/** Elipsoid (spljoštena sfera) */
export function blob(rx: number, ry: number, rz: number, w = 20, h = 14): THREE.SphereGeometry {
    const g = new THREE.SphereGeometry(1, w, h);
    g.scale(rx, ry, rz);
    return g;
}

export function mesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at?: THREE.Vector3, rot?: THREE.Euler): THREE.Mesh {
    const m = new THREE.Mesh(geometry, material);
    if (at) m.position.copy(at);
    if (rot) m.rotation.copy(rot);
    return m;
}

export { V };

// ── Posebni materijali (keš u modulu) ───────────────────────────────────────

const special = new Map<string, THREE.Material>();
function cached<T extends THREE.Material>(key: string, make: () => T): T {
    let m = special.get(key) as T | undefined;
    if (!m) {
        m = make();
        special.set(key, m);
    }
    return m;
}

/** Sapunski mehur: providan sa prelivom boja (iridescence) */
export function bubbleMaterial(): THREE.MeshPhysicalMaterial {
    return cached("mehur", () => new THREE.MeshPhysicalMaterial({
        color: "#FFFFFF",
        roughness: 0.05,
        metalness: 0,
        transparent: true,
        opacity: 0.34,
        iridescence: 1,
        iridescenceIOR: 1.35,
        iridescenceThicknessRange: [180, 520],
        clearcoat: 1,
        specularIntensity: 1,
        depthWrite: false,
        side: THREE.DoubleSide,
    }));
}

/** Meko svetlo (staklo lampe, plamen rakete): sija, bez treperenja */
export function softGlow(hex: string, intensity = 1.2): THREE.MeshStandardMaterial {
    return cached(`sjaj-${hex}-${intensity}`, () => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: intensity, roughness: 0.4 }));
}

/** Providan snop svetla: meko se gubi ka kraju (mapa providnosti duž snopa), ne zaklanja */
export function beamMaterial(hex: string, opacity: number): THREE.MeshBasicMaterial {
    return cached(`snop-${hex}-${opacity}`, () => {
        const fade = printTexture("snop-providnost", (c, w, h) => {
            const g = c.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, "rgba(255,255,255,0)");
            g.addColorStop(0.7, "rgba(255,255,255,0.55)");
            g.addColorStop(1, "rgba(255,255,255,1)");
            c.fillStyle = g;
            c.fillRect(0, 0, w, h);
        }, 8, 64);
        return new THREE.MeshBasicMaterial({ color: hex, alphaMap: fade, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    });
}

/** Sjajna plastika/lak sa slikom (lizalica, lopta, kutija kokica) */
export function glossyMap(map: THREE.Texture, roughness = 0.25, clearcoat = 0.8): THREE.MeshPhysicalMaterial {
    return cached(`sjaj-mapa-${map.uuid}-${roughness}-${clearcoat}`, () => new THREE.MeshPhysicalMaterial({ map, roughness, clearcoat, clearcoatRoughness: 0.2 }));
}

/** Papir/karton sa slikom (mapa, knjiga): mat, blago vlaknast */
export function paperMap(map: THREE.Texture, side: THREE.Side = THREE.DoubleSide): THREE.MeshPhysicalMaterial {
    return cached(`papir-${map.uuid}-${side}`, () => new THREE.MeshPhysicalMaterial({ map, roughness: 0.85, sheen: 0.3, normalMap: fabricNormal("felt"), normalScale: new THREE.Vector2(0.25, 0.25), side }));
}

/** Metalna mrežica (mikrofon) */
export function meshMetal(hex: string): THREE.MeshPhysicalMaterial {
    return cached(`mrezica-${hex}`, () => {
        const n = fabricNormal("mesh").clone();
        n.repeat.set(10, 10);
        n.needsUpdate = true;
        return new THREE.MeshPhysicalMaterial({ color: hex, metalness: 0.9, roughness: 0.35, normalMap: n, normalScale: new THREE.Vector2(1.4, 1.4) });
    });
}

/** Providna tkanina/opna (krila vile, zmaja, kišobran iznutra) */
export function sheer(hex: string, opacity: number, iridescent = false, side: THREE.Side = THREE.DoubleSide): THREE.MeshPhysicalMaterial {
    return cached(`opna-${hex}-${opacity}-${iridescent}-${side}`, () => new THREE.MeshPhysicalMaterial({
        color: hex,
        roughness: 0.25,
        transparent: true,
        opacity,
        iridescence: iridescent ? 0.9 : 0,
        iridescenceIOR: 1.3,
        sheen: 0.6,
        sheenColor: new THREE.Color("#FFFFFF"),
        clearcoat: 0.6,
        depthWrite: false,
        side,
    }));
}

/** Materijal sa slikom i prozirnošću (krila sa šarom) */
export function sheerMap(map: THREE.Texture, opacity: number, iridescent = false): THREE.MeshPhysicalMaterial {
    return cached(`opna-mapa-${map.uuid}-${opacity}-${iridescent}`, () => new THREE.MeshPhysicalMaterial({
        map,
        roughness: 0.3,
        transparent: true,
        opacity,
        alphaTest: 0.02,
        iridescence: iridescent ? 0.8 : 0,
        iridescenceIOR: 1.3,
        clearcoat: 0.5,
        depthWrite: false,
        side: THREE.DoubleSide,
    }));
}

/** Tekstura nacrtana platnom (keš po ključu) */
export function canvasMap(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void): THREE.Texture {
    return printTexture(`rekvizit-${key}`, draw, w, h);
}

/** Broj podela po kvalitetu */
export function q(ctx: ItemContext, n: number, min = 4): number {
    return seg(n, res(ctx), min);
}
