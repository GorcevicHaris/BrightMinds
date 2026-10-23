// Usta kao prava 3D površina na licu: gornja i donja usna (mekane cevi koje prate glavu),
// tamna unutrašnjost, gornji zubi i jezik kad su usta otvorena. Oblik zadaju tri broja kao
// kod 2D lica (faceRig.mouthPath): širina, osmeh (−1…1) i otvorenost (0…1), plus „o” (okruglo).
// Geometrija ima stalan raspored temena; pri promeni se samo pomere temena (kao morf).

import * as THREE from "three";
import type { SurfaceFn } from "./surface";

export interface MouthShape {
    /** 1 = uobičajena širina */
    width: number;
    /** −1 uglovi dole … 1 širok osmeh */
    smile: number;
    /** 0 zatvorena … 1 širom otvorena */
    open: number;
    /** 0 … 1 zaobljena („o”) */
    round: number;
}

export interface MouthSurface {
    /** Tačka na glavi i normala za (u, v) */
    point: (u: number, v: number, out: THREE.Vector3) => THREE.Vector3;
    normal: (u: number, v: number, out: THREE.Vector3) => THREE.Vector3;
    /** Središte usta na glavi (u, v) */
    u0: number;
    v0: number;
    /** Polovina širine usta (u) i jedinica visine (v) — „piksel” 2D lica */
    du: number;
    dv: number;
    /** Debljina usana (m) */
    lip: number;
}

const N = 25; // tačaka po usni
const RING = 7; // tačaka oko cevi usne

/** Upitnik oblika usta: tačke krivih u „pikselima” 2D lica (y nadole) */
function curves(shape: MouthShape, x: number): { top: number; bottom: number } {
    const w = 17 * shape.width * (1 - shape.round * 0.35);
    const s = shape.smile;
    const open = shape.open;
    const corner = -s * 5;
    const topC = s * 9 - open * (3 + (1 - Math.abs(s)) * 7) - shape.round * open * 4;
    const bottomC = s * 9 + open * 30 * (1 - shape.round * 0.15);
    // Kvadratna Bezijeova kriva od (−w, corner) preko (0, C) do (w, corner): t iz x
    const t = (x / w + 1) / 2;
    const q = (c: number) => (1 - t) * (1 - t) * corner + 2 * (1 - t) * t * c + t * t * corner;
    return { top: q(topC), bottom: q(bottomC) };
}

export class Mouth {
    readonly group = new THREE.Group();
    private lips: THREE.Mesh;
    private corners: THREE.Mesh;
    private inner: THREE.Mesh;
    private teeth: THREE.Mesh;
    private tongue: THREE.Mesh;
    private key = "";
    private p = new THREE.Vector3();
    private n = new THREE.Vector3();

    constructor(private surface: MouthSurface, lipColor: string) {
        this.group.name = "usta";
        const lipMat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(lipColor),
            roughness: 0.48,
            clearcoat: 0.3,
            clearcoatRoughness: 0.35,
        });
        const innerMat = new THREE.MeshStandardMaterial({ color: "#4A1820", roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
        const teethMat = new THREE.MeshPhysicalMaterial({ color: "#FBF8F2", roughness: 0.3, clearcoat: 0.5, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
        const tongueMat = new THREE.MeshStandardMaterial({ color: "#E07080", roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
        this.lips = new THREE.Mesh(this.lipGeometry(), lipMat);
        this.inner = new THREE.Mesh(this.stripGeometry(), innerMat);
        this.teeth = new THREE.Mesh(this.stripGeometry(), teethMat);
        this.tongue = new THREE.Mesh(this.stripGeometry(), tongueMat);
        this.inner.renderOrder = 1;
        this.teeth.renderOrder = 2;
        this.tongue.renderOrder = 2;
        this.lips.renderOrder = 3;
        this.corners = new THREE.Mesh(this.cornerGeometry(), innerMat);
        this.corners.renderOrder = 1;
        this.group.add(this.inner, this.teeth, this.tongue, this.lips, this.corners);
        this.setShape({ width: 1, smile: 0.5, open: 0, round: 0 });
    }

    private lipGeometry(): THREE.BufferGeometry {
        const geometry = new THREE.BufferGeometry();
        const count = 2 * N * RING;
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
        const index: number[] = [];
        for (let lip = 0; lip < 2; lip++) {
            const base = lip * N * RING;
            for (let i = 0; i < N - 1; i++) {
                for (let j = 0; j < RING; j++) {
                    const a = base + i * RING + j;
                    const b = base + i * RING + ((j + 1) % RING);
                    const c = base + (i + 1) * RING + j;
                    const d = base + (i + 1) * RING + ((j + 1) % RING);
                    index.push(a, c, b, b, c, d);
                }
            }
        }
        geometry.setIndex(index);
        return geometry;
    }

    /** Dva kratka nabora u uglovima usana (linija osmeha) */
    private cornerGeometry(): THREE.BufferGeometry {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(2 * 2 * 6 * 3), 3));
        const index: number[] = [];
        for (let side = 0; side < 2; side++) {
            const base = side * 12;
            for (let i = 0; i < 5; i++) index.push(base + i, base + 6 + i, base + i + 1, base + i + 1, base + 6 + i, base + 6 + i + 1);
        }
        geometry.setIndex(index);
        return geometry;
    }

    private updateCorners(shape: MouthShape, w: number) {
        const pos = this.corners.geometry.getAttribute("position") as THREE.BufferAttribute;
        const corner = -shape.smile * 5;
        // Nabor je izraženiji kad je osmeh širi; kod tužnih usta skoro nestaje
        const k = Math.max(0, shape.smile);
        this.corners.visible = k > 0.15;
        for (let side = 0; side < 2; side++) {
            const sign = side === 0 ? -1 : 1;
            for (let i = 0; i < 6; i++) {
                const t = i / 5;
                const x = sign * (w + 0.6 + t * 2.2 * k);
                const y = corner - 0.6 - t * 3.2 * k + t * t * 2.4 * k;
                const half = 0.45 * (1 - t * 0.7);
                this.at(x, y - half, 0.0007, this.p);
                pos.setXYZ(side * 12 + i, this.p.x, this.p.y, this.p.z);
                this.at(x, y + half, 0.0007, this.p);
                pos.setXYZ(side * 12 + 6 + i, this.p.x, this.p.y, this.p.z);
            }
        }
        pos.needsUpdate = true;
        this.corners.geometry.computeVertexNormals();
        this.corners.geometry.computeBoundingSphere();
    }

    /** Traka od dve krive (gornja i donja ivica), N tačaka po ivici */
    private stripGeometry(): THREE.BufferGeometry {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(2 * N * 3), 3));
        const index: number[] = [];
        for (let i = 0; i < N - 1; i++) {
            const a = i;
            const b = i + 1;
            const c = N + i;
            const d = N + i + 1;
            index.push(a, c, b, b, c, d);
        }
        geometry.setIndex(index);
        return geometry;
    }

    /** Tačka usta (x, y u „pikselima”, y nadole) na površini glave, podignuta za `lift` */
    private at(x: number, y: number, lift: number, out: THREE.Vector3): THREE.Vector3 {
        const s = this.surface;
        const u = s.u0 + x * s.du;
        const v = s.v0 + y * s.dv;
        s.point(u, v, out);
        s.normal(u, v, this.n);
        return out.addScaledVector(this.n, lift);
    }

    setShape(shape: MouthShape) {
        this.lastShape = shape;
        // Isti oblik (na 1/100) ne menja geometriju
        const key = [shape.width, shape.smile, shape.open, shape.round].map((x) => Math.round(x * 100)).join(",");
        if (key === this.key) return;
        this.key = key;
        const s = this.surface;
        const w = 17 * shape.width * (1 - shape.round * 0.35);
        const lipPos = this.lips.geometry.getAttribute("position") as THREE.BufferAttribute;
        const center = new THREE.Vector3();
        const tangent = new THREE.Vector3();
        const up = new THREE.Vector3();
        const prev = new THREE.Vector3();
        const next = new THREE.Vector3();
        const gap = Math.max(0, shape.open);
        for (let lip = 0; lip < 2; lip++) {
            for (let i = 0; i < N; i++) {
                const x = -w + (2 * w * i) / (N - 1);
                const c = curves(shape, x);
                // Usne su malo iznad ivice otvora (gornja iznad, donja ispod)
                // Gornja usna ima „Kupidov luk”: dva blaga vrha i udubljenje u sredini
                const ax = Math.abs(x) / w;
                const bow = lip === 0 ? Math.exp(-(((ax - 0.3) / 0.17) ** 2)) - 0.6 * Math.exp(-((ax / 0.08) ** 2)) : 0;
                const y = lip === 0 ? c.top - 1.1 - gap * 0.6 - bow * 1.1 : c.bottom + 1.6 + gap * 0.8;
                // Debljina: najdeblje u sredini, tanko u uglovima; donja usna punija
                const mid = 1 - Math.pow(ax, 2.2);
                const r = s.lip * (lip === 0 ? 0.62 + 0.12 * bow : 1.12) * (0.2 + 0.8 * mid);
                this.at(x, y, r * 0.55, center);
                this.at(Math.max(-w, x - 0.6), y, r * 0.55, prev);
                this.at(Math.min(w, x + 0.6), y, r * 0.55, next);
                tangent.subVectors(next, prev).normalize();
                up.copy(this.n).normalize();
                const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
                for (let j = 0; j < RING; j++) {
                    const a = (j / RING) * Math.PI * 2;
                    // Spljoštena cev: šira po visini lica, plića ka napred
                    const k = lip * N * RING + i * RING + j;
                    this.p.copy(center).addScaledVector(side, Math.cos(a) * r * 1.25).addScaledVector(up, Math.sin(a) * r * 0.75);
                    lipPos.setXYZ(k, this.p.x, this.p.y, this.p.z);
                }
            }
        }
        lipPos.needsUpdate = true;
        this.lips.geometry.computeVertexNormals();
        this.lips.geometry.computeBoundingSphere();

        // Unutrašnjost: između krivih, tik iznad kože (kao naslikano, bez rupe u glavi). Zatvorena
        // usta imaju tanku tamnu liniju između usana (linija osmeha)
        this.inner.visible = true;
        this.updateCorners(shape, w);
        this.teeth.visible = shape.open > 0.18;
        this.tongue.visible = shape.open > 0.28;
        this.strip(this.inner, w * 0.96, (c) => c.top - 0.5, (c) => Math.max(c.bottom, c.top + 1.1), 0.0006);
        if (this.teeth.visible) this.strip(this.teeth, w * 0.78, (c) => c.top, (c) => c.top + Math.min(5, (c.bottom - c.top) * 0.32), 0.0011);
        if (this.tongue.visible) this.strip(this.tongue, w * 0.7, (c) => c.bottom - (c.bottom - c.top) * 0.38, (c) => c.bottom - 0.3, 0.001);
    }

    private strip(mesh: THREE.Mesh, w: number, top: (c: { top: number; bottom: number }) => number, bottom: (c: { top: number; bottom: number }) => number, lift: number) {
        const pos = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
        const shape = this.lastShape;
        for (let i = 0; i < N; i++) {
            const x = -w + (2 * w * i) / (N - 1);
            const c = curves(shape, x);
            this.at(x, top(c), lift, this.p);
            pos.setXYZ(i, this.p.x, this.p.y, this.p.z);
            this.at(x, Math.max(top(c), bottom(c)), lift, this.p);
            pos.setXYZ(N + i, this.p.x, this.p.y, this.p.z);
        }
        pos.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
        mesh.geometry.computeBoundingSphere();
    }

    private lastShape: MouthShape = { width: 1, smile: 0.5, open: 0, round: 0 };

    dispose() {
        for (const mesh of [this.lips, this.inner, this.teeth, this.tongue, this.corners]) {
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
        }
    }
}

/** Površina za usta iz funkcije glave (u, v → tačka) */
export function mouthSurfaceFrom(fn: SurfaceFn, normal: (u: number, v: number, out?: THREE.Vector3) => THREE.Vector3, u0: number, v0: number, du: number, dv: number, lip: number): MouthSurface {
    return { point: (u, v, out) => fn(u, v, out), normal: (u, v, out) => normal(u, v, out), u0, v0, du, dv, lip };
}
