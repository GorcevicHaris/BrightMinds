// Alat za krojenje odeće: ljuske trupa, rukava i nogavica (iste površine kao telo, samo
// pomerene napolje), porubi i okovratnici (prstenovi duž ivice), zakrpe (džepovi, natpisi)
// i suknje. Sve što prati telo je SkinnedMesh na istom kosturu, sa istim težinama.

import * as THREE from "three";
import type { AvatarLook } from "../catalog";
import { armPath, legPath, limbSurface, torsoBottom, torsoPoint, torsoSurface, type LimbExtra, type TorsoExtra } from "./body";
import type { HeadInfo } from "./head";
import { armWeights, legWeights, torsoWeights, type BoneName, type Rig } from "./rig";
import { buildSurface, ringTube, smoothstep, sweepFn, type SurfaceFn } from "./surface";

export interface GarmentContext {
    rig: Rig;
    head: HeadInfo;
    look: AvatarLook;
    skin: string;
    /** Roditelj za SkinnedMesh (isti kao telo) */
    root: THREE.Object3D;
}

export type Side = 1 | -1;
export const SIDES: readonly Side[] = [1, -1];

export class Kit {
    readonly objects: THREE.Object3D[] = [];

    constructor(readonly ctx: GarmentContext) {}

    get shape() {
        return this.ctx.rig.shape;
    }

    skinned(geometry: THREE.BufferGeometry, material: THREE.Material, name = "odeca"): THREE.SkinnedMesh {
        const mesh = new THREE.SkinnedMesh(geometry, material);
        mesh.name = name;
        mesh.bind(this.ctx.rig.skeleton);
        mesh.frustumCulled = false;
        this.ctx.root.add(mesh);
        this.objects.push(mesh);
        return mesh;
    }

    rigid(bone: BoneName, object: THREE.Object3D): THREE.Object3D {
        this.ctx.rig.bone(bone).add(object);
        this.objects.push(object);
        return object;
    }

    /** Svetski položaj kosti u mirovanju → lokalne koordinate te kosti */
    toBone(bone: BoneName, p: THREE.Vector3): THREE.Vector3 {
        const b = this.ctx.rig.bone(bone);
        return b.worldToLocal(p.clone());
    }

    private torsoW = (_u: number, _v: number, p: THREE.Vector3) => torsoWeights(this.shape, p);

    /** Ljuska trupa od y0 do y1 (granice mogu zavisiti od ugla: izrez, porub) */
    torso(y0: number | ((a: number) => number), y1: number | ((a: number) => number), offset: number, material: THREE.Material, extra?: TorsoExtra, nv = 56): THREE.SkinnedMesh {
        const fn = torsoSurface(this.shape, y0, y1, offset, extra);
        const geometry = buildSurface(fn, {
            nu: 64,
            nv,
            closedU: true,
            inside: (u, v, out) => {
                fn(u, v, out);
                return out.set(0, out.y, 0);
            },
            weights: this.torsoW,
            uv: (u, v) => {
                const lo = typeof y0 === "number" ? y0 : y0(u * Math.PI * 2);
                const hi = typeof y1 === "number" ? y1 : y1(u * Math.PI * 2);
                return [u * 0.7, lo + (hi - lo) * v];
            },
        });
        return this.skinned(geometry, material, "trup-odeca");
    }

    /** Porub/okovratnik po ivici trupa na visini y(a); r1 = debljina napolje, r2 = visina */
    torsoRing(y: number | ((a: number) => number), offset: number, r1: number, r2: number, material: THREE.Material, extra?: TorsoExtra): THREE.SkinnedMesh {
        const shape = this.shape;
        const p = new THREE.Vector3();
        const loop = (q: number, out: THREE.Vector3) => {
            const a = q * Math.PI * 2;
            const yy = typeof y === "number" ? y : y(a);
            return out.copy(torsoPoint(shape, a, yy, offset + r1 * 0.4, p, extra));
        };
        return this.skinned(ringTube(loop, () => [r1, r2], 72, 10, this.torsoW), material, "porub");
    }

    /** Zakrpa na trupu (džep, natpis, lajsna): a ∈ [a0, a1], y ∈ [y0, y1]; ivice se meko spuštaju */
    torsoPatch(a0: number, a1: number, y0: number, y1: number, offset: number, material: THREE.Material, options: { puff?: number; soft?: number; shapeA?: (v: number) => [number, number]; nu?: number; nv?: number } = {}): THREE.SkinnedMesh {
        const shape = this.shape;
        const puff = options.puff ?? 0;
        const soft = options.soft ?? 0;
        const fn: SurfaceFn = (u, v, out) => {
            const [lo, hi] = options.shapeA ? options.shapeA(v) : [a0, a1];
            const a = lo + (hi - lo) * u;
            const y = y0 + (y1 - y0) * v;
            const edge = soft > 0 ? smoothstep(0, soft, u) * smoothstep(1, 1 - soft, u) * smoothstep(0, soft, v) * smoothstep(1, 1 - soft, v) : 1;
            return torsoPoint(shape, a, y, offset + puff * edge - (soft > 0 ? (1 - edge) * 0.002 : 0), out);
        };
        const geometry = buildSurface(fn, {
            nu: options.nu ?? 24,
            nv: options.nv ?? 16,
            inside: (u, v, out) => {
                fn(u, v, out);
                return out.set(0, out.y, 0);
            },
            weights: this.torsoW,
            uv: (u, v) => [u, v],
        });
        return this.skinned(geometry, material, "zakrpa");
    }

    /** Rukav od t0 do t1 (0 = rame, 1 = zglob šake) */
    sleeve(side: Side, t0: number, t1: number, offset: number, material: THREE.Material, extra?: LimbExtra): THREE.SkinnedMesh {
        const rig = this.ctx.rig;
        const arm = armPath(rig, side, offset, extra);
        const fn = limbSurface(arm, t0, t1);
        const geometry = buildSurface(fn, {
            nu: 32,
            nv: Math.max(8, Math.round(40 * (t1 - Math.max(0, t0) + 0.15))),
            closedU: true,
            inside: (_u, v, out) => arm.spec.path(t0 <= 0 ? v * arm.sAt(t1) : arm.sAt(t0 + (t1 - t0) * v), out),
            weights: (_u, _v, p) => armWeights(rig, side, p),
            uv: (u, v) => [u * 0.2, v * 0.3],
        });
        return this.skinned(geometry, material, "rukav");
    }

    /** Prsten oko ruke na udelu t (rub rukava, manžetna) */
    armRing(side: Side, t: number, offset: number, r1: number, r2: number, material: THREE.Material, extra?: LimbExtra): THREE.SkinnedMesh {
        const rig = this.ctx.rig;
        const arm = armPath(rig, side, offset + r1 * 0.4, extra);
        const fn = sweepFn(arm.spec);
        const s = arm.sAt(t);
        return this.skinned(ringTube((q, out) => fn(q, s, out), () => [r1, r2], 40, 8, (_u, _v, p) => armWeights(rig, side, p)), material, "manzetna");
    }

    /** Nogavica od t0 do t1 (0 = kuk, 1 = članak) */
    leg(side: Side, t0: number, t1: number, offset: number, material: THREE.Material, extra?: LimbExtra, uRange?: [number, number]): THREE.SkinnedMesh {
        const rig = this.ctx.rig;
        const leg = legPath(rig, side, offset, extra);
        const base = limbSurface(leg, t0, t1);
        const fn: SurfaceFn = uRange ? (u, v, out) => base(uRange[0] + (uRange[1] - uRange[0]) * u, v, out) : base;
        const geometry = buildSurface(fn, {
            nu: uRange ? 4 : 40,
            nv: Math.max(8, Math.round(56 * (t1 - Math.max(0, t0) + 0.1))),
            closedU: !uRange,
            inside: (_u, v, out) => leg.spec.path(t0 <= 0 ? v * leg.sAt(t1) : leg.sAt(t0 + (t1 - t0) * v), out),
            weights: (_u, _v, p) => legWeights(rig, side, p),
            uv: (u, v) => [u * 0.25, v * 0.5],
        });
        return this.skinned(geometry, material, "nogavica");
    }

    legRing(side: Side, t: number, offset: number, r1: number, r2: number, material: THREE.Material, extra?: LimbExtra): THREE.SkinnedMesh {
        const rig = this.ctx.rig;
        const leg = legPath(rig, side, offset + r1 * 0.4, extra);
        const fn = sweepFn(leg.spec);
        const s = leg.sAt(t);
        return this.skinned(ringTube((q, out) => fn(q, s, out), () => [r1, r2], 44, 8, (_u, _v, p) => legWeights(rig, side, p)), material, "porub-nogavice");
    }

    /**
     * Suknja (zvono) od struka do poruba: gore prati trup, dole je elipsa (rx, rz);
     * `folds` dodaje nabore (plise, talasi). Nikad ne ulazi u kukove ni u noge.
     */
    skirt(yTop: number, yBot: number | ((a: number) => number), offset: number, hem: { rx: number; rz: number }, material: THREE.Material, folds?: (a: number, v: number) => number, nv = 40, flare = 1.6): { mesh: THREE.SkinnedMesh; edge: (q: number, out: THREE.Vector3) => THREE.Vector3; fn: SurfaceFn } {
        const shape = this.shape;
        const top = new THREE.Vector3();
        const env = new THREE.Vector3();
        const crotch = torsoBottom(shape) + 0.035;
        const legOuter = shape.hipX + shape.legR(0.15) + offset + 0.012;
        const fn: SurfaceFn = (u, v, out) => {
            const a = u * Math.PI * 2;
            const yb = typeof yBot === "number" ? yBot : yBot(a);
            const y = yTop + (yb - yTop) * v;
            torsoPoint(shape, a, yTop, offset, top);
            // Telo ispod suknje: trup do međunožja, ispod toga obe noge
            if (y > crotch) torsoPoint(shape, a, y, offset + 0.004, env);
            else env.set(Math.sin(a) * legOuter, y, Math.cos(a) * (shape.legR(0.2) + offset + 0.02));
            const k = 1 - Math.pow(1 - v, flare);
            const hx = Math.sin(a) * hem.rx;
            const hz = Math.cos(a) * hem.rz;
            let x = top.x + (hx - top.x) * k;
            let z = top.z + (hz - top.z) * k;
            const r = Math.hypot(x, z);
            const rEnv = Math.hypot(env.x, env.z);
            const fold = folds ? folds(a, v) : 0;
            const target = Math.max(r, rEnv) + fold;
            x *= target / Math.max(1e-6, r);
            z *= target / Math.max(1e-6, r);
            return out.set(x, y, z);
        };
        const geometry = buildSurface(fn, {
            nu: 96,
            nv,
            closedU: true,
            inside: (_u, v, out) => out.set(0, yTop + ((typeof yBot === "number" ? yBot : yBot(0)) - yTop) * v, 0),
            weights: this.torsoW,
            uv: (u, v) => [u * 1.4, v * 0.5],
        });
        return { mesh: this.skinned(geometry, material, "suknja"), edge: (q, out) => fn(q, 1, out), fn };
    }

    /** Traka po površini suknje (lajsna, vez): u ∈ [u0, u1] */
    strip(fn: SurfaceFn, u0: number, u1: number, lift: number, material: THREE.Material, v0 = 0, v1 = 1): THREE.SkinnedMesh {
        const p = new THREE.Vector3();
        const n = new THREE.Vector3();
        const geometry = buildSurface((u, v, out) => {
            const uu = u0 + (u1 - u0) * u;
            const vv = v0 + (v1 - v0) * v;
            fn(uu, vv, out);
            // Pomeraj napolje (vodoravno od ose tela)
            p.copy(out);
            n.set(p.x, 0, p.z).normalize();
            return out.addScaledVector(n, lift);
        }, { nu: 4, nv: 40, inside: (_u, v, out) => out.set(0, fn(0, v0 + (v1 - v0) * v, p).y, 0), weights: this.torsoW, uv: (u, v) => [u, v * 8] });
        return this.skinned(geometry, material, "traka");
    }

    /** Porub po zatvorenoj ivici (suknja, kaput) */
    edgeRing(edge: (q: number, out: THREE.Vector3) => THREE.Vector3, r1: number, r2: number, material: THREE.Material): THREE.SkinnedMesh {
        return this.skinned(ringTube(edge, () => [r1, r2], 96, 8, this.torsoW), material, "porub-suknje");
    }
}
