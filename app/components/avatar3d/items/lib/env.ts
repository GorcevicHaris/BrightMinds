// Pomoćni alat za 3D pozadine (okruženja): keširani materijali (glina-mat, mek odsjaj),
// spajanje mirnih delova u jednu geometriju po materijalu (boje su u temenima — malo
// poziva za crtanje), umnožavanje (InstancedMesh) i osnovni rekviziti: tlo sa prelazom,
// brda, oblaci, drveće, jelke, žbunje, cveće, trava, kamenje, ograda, sunce.
// Lik stoji na (0, 0, 0) i gleda ka +z; sve se stavlja iza (z < −0,8) i sa strane.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { EnvironmentContext } from "../../contract";
import { printTexture } from "../../engine/textures";

export { THREE };

// ── Materijali ────────────────────────────────────────────────────────────────

export interface EnvMat {
    rough?: number;
    /** Sopstveni sjaj (oblaci, svetiljke, zvezde): 0–1 */
    glow?: number;
    opacity?: number;
    side?: THREE.Side;
    /** Bez svetla (daleko nebo, zraci) */
    basic?: boolean;
    metal?: number;
    /** Aditivno stapanje (svetlosni zraci) */
    additive?: boolean;
}

const materials = new Map<string, THREE.Material>();

/** Materijal za temena u boji (boja dolazi iz atributa `color`), keširan po opcijama */
export function vcMat(o: EnvMat = {}): THREE.Material {
    const key = `vc-${o.rough ?? ""}-${o.glow ?? ""}-${o.opacity ?? ""}-${o.side ?? ""}-${o.basic ?? ""}-${o.metal ?? ""}-${o.additive ?? ""}`;
    let m = materials.get(key);
    if (!m) {
        const transparent = (o.opacity ?? 1) < 1 || Boolean(o.additive);
        if (o.basic) {
            m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide, depthWrite: !transparent, fog: true, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending });
        } else {
            m = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: o.rough ?? 0.88,
                metalness: o.metal ?? 0,
                transparent,
                opacity: o.opacity ?? 1,
                depthWrite: !transparent,
                side: o.side ?? THREE.FrontSide,
                emissive: new THREE.Color("#FFFFFF"),
                emissiveIntensity: o.glow ?? 0,
            });
            // Sjaj u boji temena: emissive × boja (oblaci svetli belo, lampioni u svojoj boji)
            if (o.glow) {
                (m as THREE.MeshStandardMaterial).onBeforeCompile = (shader) => {
                    shader.fragmentShader = shader.fragmentShader.replace("vec3 totalEmissiveRadiance = emissive;", "vec3 totalEmissiveRadiance = emissive * vColor.rgb;");
                };
                (m as THREE.MeshStandardMaterial).customProgramCacheKey = () => "vc-glow";
            }
        }
        materials.set(key, m);
    }
    return m;
}

/** Jednobojni materijal (za pokretne delove koji nisu spojeni), keširan */
export function solid(color: string, o: EnvMat = {}): THREE.Material {
    const key = `solid-${color}-${o.rough ?? ""}-${o.glow ?? ""}-${o.opacity ?? ""}-${o.side ?? ""}-${o.basic ?? ""}-${o.metal ?? ""}-${o.additive ?? ""}`;
    let m = materials.get(key);
    if (!m) {
        const transparent = (o.opacity ?? 1) < 1 || Boolean(o.additive);
        m = o.basic
            ? new THREE.MeshBasicMaterial({ color, transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide, depthWrite: !transparent, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending })
            : new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, transparent, opacity: o.opacity ?? 1, depthWrite: !transparent, side: o.side ?? THREE.FrontSide, emissive: new THREE.Color(color), emissiveIntensity: o.glow ?? 0 });
        materials.set(key, m);
    }
    return m;
}

/** Materijal sa mapom (tapete, daske, pruge šatora), keširan po teksturi */
export function mapped(map: THREE.Texture, o: EnvMat & { tint?: string } = {}): THREE.Material {
    const key = `map-${map.uuid}-${o.tint ?? ""}-${o.rough ?? ""}-${o.side ?? ""}-${o.glow ?? ""}`;
    let m = materials.get(key);
    if (!m) {
        m = new THREE.MeshStandardMaterial({ map, color: o.tint ?? "#FFFFFF", roughness: o.rough ?? 0.85, side: o.side ?? THREE.FrontSide, emissive: new THREE.Color(o.tint ?? "#FFFFFF"), emissiveMap: o.glow ? map : null, emissiveIntensity: o.glow ?? 0 });
        materials.set(key, m);
    }
    return m;
}

// ── Geometrija u boji i spajanje ──────────────────────────────────────────────

/** Boji sva temena (atribut `color`) i vraća geometriju bez indeksa (spaja se sa svima) */
export function paint(geometry: THREE.BufferGeometry, color: string | ((p: THREE.Vector3) => THREE.Color)): THREE.BufferGeometry {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    if (!g.getAttribute("uv")) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.getAttribute("position").count * 2), 2));
    const pos = g.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        if (typeof color === "string") c.set(color);
        else c.copy(color(p.fromBufferAttribute(pos, i)));
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
}

/** Postavlja geometriju (položaj, okret, razmera) */
export function put(geometry: THREE.BufferGeometry, x: number, y: number, z: number, opts: { s?: number | [number, number, number]; rx?: number; ry?: number; rz?: number } = {}): THREE.BufferGeometry {
    const s = opts.s ?? 1;
    const scale = typeof s === "number" ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(opts.rx ?? 0, opts.ry ?? 0, opts.rz ?? 0, "YXZ"));
    return geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, scale));
}

/**
 * Skup mirnih delova: dodaješ geometriju sa bojom, na kraju se po materijalu spoji u jedan
 * Mesh (jedan poziv crtanja po vrsti materijala).
 */
export class Batch {
    private lists = new Map<string, { o: EnvMat; geos: THREE.BufferGeometry[] }>();

    add(geometry: THREE.BufferGeometry, color: string | ((p: THREE.Vector3) => THREE.Color), o: EnvMat = {}): this {
        const key = JSON.stringify(o);
        let list = this.lists.get(key);
        if (!list) {
            list = { o, geos: [] };
            this.lists.set(key, list);
        }
        list.geos.push(paint(geometry, color));
        return this;
    }

    /** Spaja i dodaje u roditelja */
    into(parent: THREE.Object3D): THREE.Mesh[] {
        const meshes: THREE.Mesh[] = [];
        for (const { o, geos } of this.lists.values()) {
            if (!geos.length) continue;
            const merged = mergeGeometries(geos, false);
            for (const g of geos) g.dispose();
            if (!merged) continue;
            merged.computeBoundingSphere();
            const mesh = new THREE.Mesh(merged, vcMat(o));
            if ((o.opacity ?? 1) < 1 || o.additive) mesh.renderOrder = 2;
            parent.add(mesh);
            meshes.push(mesh);
        }
        this.lists.clear();
        return meshes;
    }
}

/** Umnoženi delovi (cveće, trava, zvezde, mehurići): jedna geometrija, mnogo položaja i boja */
export function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, items: { p: THREE.Vector3; s?: number | THREE.Vector3; r?: THREE.Euler; color?: string }[]): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geometry, material, items.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    items.forEach((it, i) => {
        q.setFromEuler(it.r ?? new THREE.Euler());
        if (it.s instanceof THREE.Vector3) sc.copy(it.s);
        else sc.setScalar(it.s ?? 1);
        m.compose(it.p, q, sc);
        mesh.setMatrixAt(i, m);
        if (it.color) mesh.setColorAt(i, new THREE.Color(it.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
}

// ── Nasumično, ali uvek isto (seme) ──────────────────────────────────────────

export function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

// ── Kontekst scene: širina rasporeda i kvalitet ──────────────────────────────

export interface Layout {
    wide: boolean;
    low: boolean;
    /** Razmera rasporeda po x: široko 1, uspravno ≈ 0,55 (rekviziti bliže liku) */
    sx: number;
    /** Broj podela (segmenti sfera) */
    seg: (n: number) => number;
}

/** Magla počinje iza lika (kamera je dalje u širokom kadru) */
export function fogFor(L: Layout, color: string, depth = 30): { color: string; near: number; far: number } {
    const near = L.wide ? 15 : 10.5;
    return { color, near, far: near + depth };
}

export function layout(ctx: EnvironmentContext): Layout {
    const low = ctx.quality === "low";
    return { wide: ctx.wide, low, sx: ctx.wide ? 1 : 0.55, seg: (n) => Math.max(5, Math.round(low ? n * 0.6 : n)) };
}

// ── Pokret ──────────────────────────────────────────────────────────────────

export type Tick = (time: number) => void;

/** Spaja više pokreta; kad `live` nije uključeno sve miruje (manje animacija) */
export function animator(ticks: Tick[]): (time: number, dt: number, live: boolean) => void {
    return (time, _dt, live) => {
        if (!live) return;
        for (const tick of ticks) tick(time);
    };
}

// ── Osnovni rekviziti ────────────────────────────────────────────────────────

const col = (hex: string) => new THREE.Color(hex);

/**
 * Tlo: veliki disk, svetliji oko lika i tamniji/zasićeniji ka daljini (prelaz u boji temena);
 * `noise` dodaje meke mrlje (trava, pesak).
 */
export function ground(batch: Batch, near: string, far: string, o: { radius?: number; noise?: number; seed?: number; spot?: string; rough?: number } = {}) {
    const radius = o.radius ?? 45;
    const geometry = new THREE.RingGeometry(0.001, radius, 96, 28).rotateX(-Math.PI / 2);
    const a = col(near);
    const b = col(far);
    const spot = o.spot ? col(o.spot) : null;
    const c = new THREE.Color();
    const noise = o.noise ?? 0.05;
    const seed = o.seed ?? 1;
    batch.add(geometry, (p) => {
        const d = Math.hypot(p.x, p.z);
        const t = Math.min(1, Math.pow(d / 16, 0.8));
        c.copy(a).lerp(b, t);
        if (spot) c.lerp(spot, Math.max(0, 1 - d / 2.2) * 0.6);
        const n = Math.sin(p.x * 1.7 + seed) * Math.sin(p.z * 1.3 - seed * 2) + Math.sin(p.x * 0.6 - p.z * 0.9 + seed);
        // Blago tamnije ka kameri i po ivicama kadra (dubina, pogled ide ka liku)
        const front = Math.min(1, Math.max(0, (p.z - 0.8) / 6)) * 0.07 + Math.min(1, Math.max(0, (Math.abs(p.x) - 3) / 6)) * 0.03;
        return c.offsetHSL(0, 0, n * noise * 0.5 - front);
    }, { rough: o.rough ?? 0.95 });
}

/** Brdo (spljoštena sfera) u daljini */
export function hill(batch: Batch, x: number, z: number, w: number, h: number, d: number, color: string, top?: string, seg = 28) {
    const g = new THREE.SphereGeometry(1, seg, Math.round(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2);
    put(g, x, -0.05, z, { s: [w, h, d] });
    const a = col(color);
    const b = top ? col(top) : a.clone().offsetHSL(0, 0, 0.06);
    const c = new THREE.Color();
    batch.add(g, (p) => c.copy(a).lerp(b, Math.min(1, Math.max(0, p.y / h))), { rough: 0.95 });
}

/** Oblak od pet mekih lopti (spljošten odozdo) */
export function cloudGeometry(seg = 16): THREE.BufferGeometry {
    const parts: THREE.BufferGeometry[] = [];
    const blobs: [number, number, number, number][] = [[-0.55, 0, 0, 0.42], [-0.15, 0.18, 0.05, 0.55], [0.35, 0.12, 0, 0.48], [0.75, -0.02, 0, 0.34], [0.1, -0.05, 0.15, 0.45]];
    for (const [x, y, z, r] of blobs) {
        const g = new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7));
        put(g, x, y, z, { s: [1, 0.82, 0.8] });
        parts.push(paint(g, "#FFFFFF"));
    }
    const merged = mergeGeometries(parts, false)!;
    // Ravno dno
    const pos = merged.getAttribute("position");
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) < -0.12) pos.setY(i, -0.12 + (pos.getY(i) + 0.12) * 0.25);
    merged.computeVertexNormals();
    for (const g of parts) g.dispose();
    return merged;
}

/** Oblaci koji polako plove (pokretni): vraća grupu i pokret */
export function clouds(parent: THREE.Object3D, list: { x: number; y: number; z: number; s: number }[], o: { color?: string; speed?: number; span?: number; seg?: number; opacity?: number } = {}): Tick {
    const geometry = cloudGeometry(o.seg ?? 16);
    const material = vcMatTint(o.color ?? "#FFFFFF", o.opacity ?? 1);
    const meshes = list.map((c) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(c.x, c.y, c.z);
        mesh.scale.setScalar(c.s);
        parent.add(mesh);
        return { mesh, x0: c.x };
    });
    const span = o.span ?? 14;
    const speed = o.speed ?? 0.12;
    return (time) => {
        for (const [i, c] of meshes.entries()) {
            const x = c.x0 + time * speed * (0.7 + (i % 3) * 0.15);
            c.mesh.position.x = ((((x + span) % (2 * span)) + 2 * span) % (2 * span)) - span;
            c.mesh.position.y += Math.sin(time * 0.3 + i) * 0.0004;
        }
    };
}

/** Bela tkanina oblaka: mat sa malo sopstvenog sjaja (oblak „svetli” i u senci) */
function vcMatTint(color: string, opacity: number): THREE.Material {
    const key = `cloud-${color}-${opacity}`;
    let m = materials.get(key);
    if (!m) {
        m = new THREE.MeshStandardMaterial({ color, roughness: 1, emissive: new THREE.Color(color), emissiveIntensity: 0.38, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
        materials.set(key, m);
    }
    return m;
}

/** Okruglo drvo: stablo i krošnja od tri lopte (svetlija gore) */
export function roundTree(batch: Batch, x: number, z: number, s = 1, leaf = "#6CC46F", trunk = "#9A6236", seg = 18) {
    const t = new THREE.CylinderGeometry(0.07 * s, 0.1 * s, 0.9 * s, 10);
    batch.add(put(t, x, 0.45 * s, z), trunk);
    const a = col(leaf);
    const b = col(leaf).offsetHSL(0.02, 0.05, 0.12);
    const c = new THREE.Color();
    const top = 1.55 * s;
    for (const [dx, dy, dz, r] of [[0, 0.15, 0, 0.55], [-0.32, -0.1, 0.08, 0.4], [0.33, -0.06, -0.05, 0.42], [0.05, 0.45, -0.05, 0.36]] as const) {
        const g = new THREE.SphereGeometry(r * s, seg, Math.round(seg * 0.75));
        batch.add(put(g, x + dx * s, top + dy * s, z + dz * s), (p) => c.copy(a).lerp(b, Math.min(1, Math.max(0, (p.y - top + 0.4 * s) / (1.1 * s)))));
    }
}

/** Jelka: tri kupe (opciono sa snegom na vrhovima) */
export function pine(batch: Batch, x: number, z: number, s = 1, o: { color?: string; snow?: boolean; seg?: number } = {}) {
    const seg = o.seg ?? 14;
    batch.add(put(new THREE.CylinderGeometry(0.06 * s, 0.08 * s, 0.5 * s, 8), x, 0.25 * s, z), "#8A5A30");
    const green = o.color ?? "#3E9950";
    const levels: [number, number, number][] = [[0.42, 0.7, 0.62], [0.95, 0.6, 0.5], [1.42, 0.5, 0.36]];
    for (const [y, h, r] of levels) {
        const g = new THREE.ConeGeometry(r * s, h * s, seg, 2);
        put(g, x, (y + h / 2) * s, z);
        const dark = col(green);
        const light = col(green).offsetHSL(0, 0.04, 0.1);
        const c = new THREE.Color();
        batch.add(g, (p) => {
            const k = (p.y / s - y) / h;
            c.copy(dark).lerp(light, Math.min(1, Math.max(0, k)));
            if (o.snow && k > 0.55) c.lerp(col("#FFFFFF"), 0.85);
            return c;
        });
        if (o.snow) {
            // Sneg na „suknji” svake kupe
            const sn = new THREE.TorusGeometry(r * s * 0.82, 0.045 * s, 6, seg);
            put(sn, x, y * s + 0.04 * s, z, { rx: Math.PI / 2, s: [1, 1, 0.8] });
            batch.add(sn, "#FFFFFF");
        }
    }
}

/** Žbun: tri spojene lopte */
export function bush(batch: Batch, x: number, z: number, s = 1, color = "#5DB96A", seg = 14) {
    const a = col(color);
    const b = col(color).offsetHSL(0, 0.05, 0.1);
    const c = new THREE.Color();
    for (const [dx, dy, r] of [[-0.22, 0.2, 0.28], [0.15, 0.24, 0.32], [0.0, 0.36, 0.25]] as const) {
        const g = new THREE.SphereGeometry(r * s, seg, Math.round(seg * 0.7));
        batch.add(put(g, x + dx * s, dy * s, z), (p) => c.copy(a).lerp(b, Math.min(1, p.y / (0.6 * s))));
    }
}

/** Kamen (zaobljen poliedar) */
export function rock(batch: Batch, x: number, z: number, s = 1, color = "#B8BCC6") {
    const g = new THREE.DodecahedronGeometry(0.3 * s, 1);
    batch.add(put(g, x, 0.08 * s, z, { s: [1, 0.55, 0.8], ry: x * 3 }), color);
}

/** Cvet za umnožavanje: glava (pet latica kao jedan zaobljen disk — boju daje instanca) i ostalo (sredina, stablo) */
export function flowerGeometry(): { petals: THREE.BufferGeometry; rest: THREE.BufferGeometry } {
    // Disk sa pet „latica” (poluprečnik talasa po uglu), blago ispupčen ka sredini
    const n = 30;
    const pos: number[] = [0, 0.012, 0];
    for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = 0.062 + 0.04 * Math.pow(Math.abs(Math.cos(a * 2.5)), 0.7);
        pos.push(Math.cos(a) * r, -0.006, Math.sin(a) * r);
    }
    const idx: number[] = [];
    for (let i = 1; i <= n; i++) idx.push(0, i + 1, i);
    const head = new THREE.BufferGeometry();
    head.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    head.setIndex(idx);
    head.computeVertexNormals();
    // Glava je nagnuta ka kameri (+z) da se cvet vidi spreda
    head.rotateX(0.75).translate(0, 0.19, 0);
    const petals = paint(head, "#FFFFFF");
    const rest: THREE.BufferGeometry[] = [];
    rest.push(paint(put(new THREE.SphereGeometry(0.032, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.193, 0.009, { rx: 0.75 }), "#FFD15C"));
    rest.push(paint(put(new THREE.CylinderGeometry(0.007, 0.009, 0.19, 4, 1, true), 0, 0.095, 0), "#4FAE5E"));
    rest.push(paint(put(new THREE.SphereGeometry(0.035, 5, 3), 0.03, 0.06, 0, { s: [1.3, 0.35, 0.7], rz: 0.6 }), "#5DB96A"));
    rest.push(paint(put(new THREE.SphereGeometry(0.03, 5, 3), -0.026, 0.035, 0, { s: [1.3, 0.35, 0.7], rz: -0.6 }), "#4FAE5E"));
    const out = { petals, rest: mergeGeometries(rest, false)! };
    for (const g of rest) g.dispose();
    return out;
}

/** Cveće po livadi: latice u boji instance, sredina i stablo svoje boje; blago se njiše */
export function flowerField(parent: THREE.Object3D, items: { x: number; z: number; s: number; color: string; tilt?: number }[]): Tick {
    const { petals, rest } = flowerGeometry();
    const placed = items.map((it) => ({ p: new THREE.Vector3(it.x, 0, it.z), s: it.s, r: new THREE.Euler(0, it.x * 7, it.tilt ?? 0), color: it.color }));
    const heads = instanced(petals, vcMat({ rough: 0.75, side: THREE.DoubleSide }), placed);
    const stems = instanced(rest, vcMat({ rough: 0.85 }), placed.map(({ p, s, r }) => ({ p, s, r })));
    parent.add(heads, stems);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const sc = new THREE.Vector3();
    const p = new THREE.Vector3();
    return (time) => {
        items.forEach((it, i) => {
            e.set(Math.sin(time * 0.9 + it.x * 1.3) * 0.06, it.x * 7, (it.tilt ?? 0) + Math.sin(time * 0.7 + it.z * 2.1) * 0.08);
            q.setFromEuler(e);
            sc.setScalar(it.s);
            p.set(it.x, 0, it.z);
            m.compose(p, q, sc);
            heads.setMatrixAt(i, m);
            stems.setMatrixAt(i, m);
        });
        heads.instanceMatrix.needsUpdate = true;
        stems.instanceMatrix.needsUpdate = true;
    };
}

/** Busenovi trave (male kupe), umnoženo */
export function grassTufts(parent: THREE.Object3D, items: { x: number; z: number; s: number }[], color = "#5DB96A"): THREE.InstancedMesh {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) {
        const h = 0.09 + (i % 3) * 0.03;
        const g = new THREE.ConeGeometry(0.022, h, 3);
        g.scale(1, 1, 0.35);
        put(g, (i - 2.5) * 0.018, h / 2, ((i * 7) % 3) * 0.012, { rz: (i - 2.5) * 0.22, ry: i * 0.9 });
        parts.push(paint(g, (p) => new THREE.Color(color).offsetHSL(0, 0, p.y * 1.2 - 0.04)));
    }
    const geometry = mergeGeometries(parts, false)!;
    for (const g of parts) g.dispose();
    const mesh = instanced(geometry, vcMat({ rough: 0.9 }), items.map((it) => ({ p: new THREE.Vector3(it.x, 0, it.z), s: it.s, r: new THREE.Euler(0, it.x * 5 + it.z, 0) })));
    parent.add(mesh);
    return mesh;
}

/** Meka okrugla svetlost (oreol sunca, maglina): providne ivice */
export function glowTexture(): THREE.Texture {
    return printTexture("bg-oreol", (c, w, h) => {
        const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.35, "rgba(255,255,255,0.55)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
    }, 128, 128);
}

/** Sunce: svetli disk sa mekim oreolom (bez pravog svetla — samo boja) */
export function sun(parent: THREE.Object3D, x: number, y: number, z: number, r = 0.9, color = "#FFE48A") {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 40), solid(color, { basic: true }));
    disc.position.set(x, y, z);
    parent.add(disc);
    const key = `halo-${color}`;
    let halo = materials.get(key);
    if (!halo) {
        halo = new THREE.MeshBasicMaterial({ map: glowTexture(), color: "#FFF2C2", transparent: true, opacity: 0.7, depthWrite: false, fog: false });
        materials.set(key, halo);
    }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(r * 5, r * 5), halo);
    glow.position.set(x, y, z - 0.1);
    glow.renderOrder = 1;
    parent.add(glow);
}

/** Ograda od letvica: stubovi i dve prečke od x0 do x1 na dubini z */
export function fence(batch: Batch, x0: number, x1: number, z: number, color = "#FFFFFF", h = 0.55) {
    const n = Math.max(2, Math.round((x1 - x0) / 0.32));
    for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n;
        const post = new THREE.BoxGeometry(0.06, h, 0.04);
        batch.add(put(post, x, h / 2, z), color);
        const cap = new THREE.ConeGeometry(0.043, 0.06, 4);
        batch.add(put(cap, x, h + 0.03, z, { ry: Math.PI / 4 }), color);
    }
    for (const y of [h * 0.35, h * 0.75]) {
        const rail = new THREE.BoxGeometry(x1 - x0, 0.045, 0.025);
        batch.add(put(rail, (x0 + x1) / 2, y, z - 0.03), color);
    }
}

/** Gotova pozadina: koren + pokret */
export interface Built {
    root: THREE.Group;
    ticks: Tick[];
}

export function scene(): Built {
    const root = new THREE.Group();
    root.name = "pozadina";
    return { root, ticks: [] };
}

/** Broj trouglova (InstancedMesh se broji puta broj instanci) — za proveru budžeta */
export function countTriangles(root: THREE.Object3D): number {
    let n = 0;
    root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const g = mesh.geometry;
        const tris = (g.index ? g.index.count : g.getAttribute("position").count) / 3;
        n += tris * ((o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 1);
    });
    return Math.round(n);
}
