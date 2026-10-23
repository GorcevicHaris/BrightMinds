// Kroj za oči (naočare, maske, naočare za plivanje i skijanje): sve se crta u „ravni
// lica” — valjku oko uspravne ose glave koji prolazi malo ispred očiju — pa okvir prati
// krivinu lica i staje i na široku glavu i ispred njuške. Drške idu po glavi (preko uha
// ili hidžaba) do potiljka. Mere su iz sidara (razmak i veličina očiju), ništa napamet.

import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { polyPath, ringTube, taperedTube } from "../../engine/surface";
import { SIDES, type Side } from "./common";
import { HeadFit, uOf } from "./headwear";

export class EyeFit {
    readonly f: HeadFit;
    /** Središte glave (kost glave) */
    readonly c: THREE.Vector3;
    /** Poluprečnik „ravni lica” (od ose glave) */
    readonly R: number;
    /** Visina očiju i poluširina između očiju (luk) */
    readonly y: number;
    readonly ex: number;
    /** Veličina oka (poluprečnik) — sve mere su u odnosu na nju */
    readonly er: number;
    /** (u, v) oka na glavi */
    readonly eyeUV: [number, number];

    constructor(f: HeadFit, gap = 1) {
        this.f = f;
        this.c = f.c.clone();
        const a = f.a;
        const l = f.local(a.eyes.left);
        const r = f.local(a.eyes.right);
        const mid = l.clone().add(r).multiplyScalar(0.5);
        this.er = Math.max(0.02, a.eyes.radius);
        const dl = new THREE.Vector2(l.x - this.c.x, l.z - this.c.z);
        const R0 = dl.length() + this.er * 0.42 * gap + 0.004 + a.nose.snout * 0.22;
        this.R = R0;
        this.y = mid.y;
        this.ex = Math.atan2(dl.x, dl.y) * R0;
        this.eyeUV = f.uvOf(l.clone().sub(this.c));
    }

    /** (x po luku, y od visine očiju, z napred) → tačka u kosti glave */
    map(x: number, y: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
        const ang = x / this.R;
        const rr = this.R + z;
        return out.set(this.c.x + Math.sin(ang) * rr, this.y + y, this.c.z + Math.cos(ang) * rr);
    }

    /** Geometrija nacrtana u ravni (x, y, z) → savijena po licu */
    bend(geo: THREE.BufferGeometry, dx = 0, dy = 0, dz = 0, creased = true): THREE.BufferGeometry {
        const p = geo.getAttribute("position");
        const v = new THREE.Vector3();
        for (let i = 0; i < p.count; i++) {
            v.fromBufferAttribute(p, i);
            this.map(v.x + dx, v.y + dy, v.z + dz, v);
            p.setXYZ(i, v.x, v.y, v.z);
        }
        p.needsUpdate = true;
        if (creased) {
            geo.deleteAttribute("normal");
            const out = toCreasedNormals(geo, Math.PI / 3.2);
            geo.dispose();
            return out;
        }
        geo.computeVertexNormals();
        return geo;
    }

    /** Okvir: cev po obrisu (tačke u ravni oka), oblo-pljosnata (w = u ravni, d = dubina) */
    frame(points: THREE.Vector2[], dx: number, w: number, d: number, material: THREE.Material, dy = 0, dz = 0): THREE.Mesh {
        const pts = points.map((p) => new THREE.Vector3(p.x + dx, p.y + dy, dz));
        const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
        const loop = (t: number, out: THREE.Vector3) => {
            // Površina pita i malo van [0, 1] (normale) — zatvorena kriva se namotava
            const q = curve.getPointAt(((t % 1) + 1) % 1, out);
            return this.map(q.x, q.y, q.z, out);
        };
        return this.f.mesh(ringTube(loop, () => [w, d], this.f.n(Math.max(48, points.length), 16), this.f.n(8, 4)), material, "okvir");
    }

    /** Staklo u obrisu (malo iza okvira) */
    lens(points: THREE.Vector2[], dx: number, material: THREE.Material, dy = 0, dz = -0.0012): THREE.Mesh {
        const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, p.y)));
        const geo = new THREE.ShapeGeometry(shape, 1);
        const m = this.f.mesh(this.bend(geo, dx, dy, dz, false), material, "staklo");
        m.renderOrder = 3;
        return m;
    }

    /** Ravna figura sa debljinom (maska, latica, krilo) savijena po licu */
    slab(shape: THREE.Shape, depth: number, bevel: number, material: THREE.Material, dx = 0, dy = 0, dz = 0, curve = 24): THREE.Mesh {
        const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: this.f.n(curve, 8) });
        g.translate(0, 0, -depth / 2);
        g.deleteAttribute("uv");
        return this.f.mesh(this.bend(g, dx, dy, dz), material, "maska");
    }

    /** Mostić između stakala: luk iznad nosa (napred preko njuške) */
    bridge(innerX: number, y: number, material: THREE.Material, r: number, arch = 0.25): THREE.Mesh {
        const pts = [this.map(-innerX, y, 0), this.map(0, y + this.er * arch, this.er * 0.08), this.map(innerX, y, 0)];
        return this.f.mesh(taperedTube(polyPath(pts), () => r, this.f.n(16, 6), this.f.n(8, 4)), material, "most");
    }

    /**
     * Drška od spoljne ivice okvira do iza uha: ide po glavi (iznad uha čoveka, preko
     * hidžaba ako ga ima) i blago se savija nadole na kraju.
     */
    temple(side: Side, fromX: number, y: number, material: THREE.Material, r: number, flat = 0.55): THREE.Mesh {
        const f = this.f;
        const [, vEye] = this.eyeUV;
        const human = f.a.ears.kind === "human";
        const start = this.map(side * fromX, y, -0.001);
        const pts = [start];
        // Od ivice okvira nazad do iza uha: iznad uha čoveka se drška podiže, na kraju spušta
        const startAng = Math.atan2(start.x - this.c.x, start.z - this.c.z) * side;
        const endAng = Math.max(startAng + 0.6, Math.PI / 2 + 0.45);
        const n = 5;
        for (let i = 1; i <= n; i++) {
            const t = i / n;
            const ang = startAng + 0.1 + (endAng - startAng - 0.1) * t;
            const overEar = Math.exp(-(((ang - Math.PI / 2) / 0.35) ** 2));
            const lift = 0.005 + (human ? 0.009 * overEar : 0);
            const dv = -0.012 * Math.sin(Math.PI * Math.min(1, t * 1.2)) + 0.03 * Math.max(0, t - 0.75) * 4;
            pts.push(f.at(uOf(side * ang), Math.min(0.95, vEye + dv), lift + r));
        }
        return f.mesh(taperedTube(polyPath(pts), (s) => r * (1 - 0.15 * s), f.n(24, 8), f.n(8, 4), undefined, flat), material, "drska");
    }

    /** Traka oko glave na visini očiju (plivanje, skijanje, pilot) — od okvira do okvira pozadi */
    strap(fromX: number, y: number, width: number, thick: number, material: THREE.Material): THREE.Mesh {
        const f = this.f;
        const [, vEye] = this.eyeUV;
        const pts: THREE.Vector3[] = [this.map(fromX, y, -0.002)];
        const startAng = Math.atan2(pts[0].x - this.c.x, pts[0].z - this.c.z);
        const n = 14;
        for (let i = 1; i < n; i++) {
            const ang = startAng + (i / n) * (Math.PI * 2 - 2 * Math.abs(startAng)) * Math.sign(startAng || 1);
            const human = f.a.ears.kind === "human";
            const nearEar = Math.exp(-((Math.abs(Math.sin(ang)) - 1) ** 2) / 0.02);
            pts.push(f.at(uOf(ang), Math.min(0.92, vEye - 0.02), thick + 0.002 + (human ? 0.01 * nearEar : 0)));
        }
        pts.push(this.map(-fromX, y, -0.002));
        const path = polyPath(pts);
        const normal = (s: number, out: THREE.Vector3) => {
            path(s, out);
            return out.sub(this.c).setY(0).normalize();
        };
        return f.mesh(taperedTube(path, () => width, f.n(48, 16), f.n(8, 4), normal, thick / width), material, "traka");
    }

    /** Obe strane: zbir za obe oči (levo = +x) */
    sides<T>(fn: (side: Side, dx: number) => T): T[] {
        return SIDES.map((side) => fn(side, side * this.ex));
    }
}

// ── Obrisi stakala (u ravni oka, mere u odnosu na veličinu oka) ─────────────

export function ellipse(rx: number, ry: number, n = 48): THREE.Vector2[] {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        pts.push(new THREE.Vector2(Math.cos(a) * rx, Math.sin(a) * ry));
    }
    return pts;
}

/** Superelipsa (zaobljen pravougaonik): e > 2 kockastije */
export function squircle(rx: number, ry: number, e = 3.2, n = 48, taper = 0): THREE.Vector2[] {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        let x = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / e) * rx;
        const y = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / e) * ry;
        // Donja ivica uža (oblik sunčanih naočara)
        if (y < 0) x *= 1 - taper * Math.pow(-y / ry, 1.5);
        pts.push(new THREE.Vector2(x, y));
    }
    return pts;
}

export function heartOutline(r: number, n = 56): THREE.Vector2[] {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        pts.push(new THREE.Vector2((x / 17) * r, (y / 17) * r + r * 0.12));
    }
    return pts;
}

export function starOutline(r: number, inner = 0.55, points = 5, n = 10): THREE.Vector2[] {
    const pts: THREE.Vector2[] = [];
    const total = points * 2;
    for (let i = 0; i < total; i++) {
        const a0 = Math.PI / 2 + (i * Math.PI) / points;
        const a1 = Math.PI / 2 + ((i + 1) * Math.PI) / points;
        const r0 = i % 2 === 0 ? r : r * inner;
        const r1 = i % 2 === 0 ? r * inner : r;
        for (let k = 0; k < n / 2; k++) {
            const t = k / (n / 2);
            const a = a0 + (a1 - a0) * t;
            const rr = r0 + (r1 - r0) * t;
            pts.push(new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr));
        }
    }
    return pts;
}

/** Oblik (Shape) od obrisa — za staklo ili otvor u masci */
export function shapeOf(points: THREE.Vector2[], dx = 0, dy = 0): THREE.Shape {
    return new THREE.Shape(points.map((p) => new THREE.Vector2(p.x + dx, p.y + dy)));
}

export function pathOf(points: THREE.Vector2[], dx = 0, dy = 0): THREE.Path {
    return new THREE.Path(points.map((p) => new THREE.Vector2(p.x + dx, p.y + dy)));
}
