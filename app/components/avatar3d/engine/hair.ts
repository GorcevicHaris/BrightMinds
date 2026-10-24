// Kosa: „kapa” kose prati površinu glave sa debljinom koja se meko gubi na liniji kose
// (pa nema oštre ivice preko čela), a dodaci su posebni oblici — rep, pletenice, punđa,
// kovrdže i duga kosa niz leđa. Pramenovi su u mapi normala i u anizotropnom odsjaju.
// Sve je u koordinatama kosti glave.

import * as THREE from "three";
import { detail } from "./detail";
import type { HairStyle } from "../catalog";
import type { HeadInfo } from "./head";
import { hairMaterial } from "./materials";
import { torsoPoint } from "./body";
import { B, type Rig } from "./rig";
import { flow, flyaways, fringe, lockGeometry, rand, type Lock } from "./locks";
import { buildSurface, merge, polyPath, profile, smoothstep, sweepFn, taperedTube, type SurfaceFn } from "./surface";

const gauss = (x: number, mu: number, s: number) => Math.exp(-((x - mu) ** 2) / (2 * s * s));

/** Ugao od napred (rad, + ka levom uhu lika) za parametar u glave */
const thetaOf = (u: number) => (u - 0.5) * Math.PI * 2;

interface CapSpec {
    /** Linija kose: v ispod kog nema kose, po |θ| (0 = čelo, π = potiljak) */
    hairline: [number, number][];
    /** Debljina kose (m) za θ i v */
    thickness: (th: number, v: number) => number;
    /** Talas na liniji kose (šiške, zalisci) */
    wave?: (th: number) => number;
    soft?: number;
    /** Pramenovi (oblikovani žlebovi od temena ka liniji kose): 0 = glatko (ošišano) */
    clumps?: number;
}

/** Mesto gde kapa kose nosi kapu/šešir: kosa je tanja na temenu */
const UNDER_HAT_TOP = 0.011;

function capSurface(head: HeadInfo, spec: CapSpec, underHat: boolean): { fn: SurfaceFn; maxV: number; offset: (u: number, v: number) => number } {
    const line = profile(spec.hairline);
    const soft = spec.soft ?? 0.016;
    const maxV = Math.min(0.98, Math.max(...spec.hairline.map(([, v]) => v)) + soft * 2 + 0.01);
    const offset = (u: number, v: number) => {
        const th = thetaOf(u);
        const a = Math.abs(th);
        // Linija kose u sitnim pramenovima (ne kao ivica kacige)
        const hl = line(a) + (spec.wave ? spec.wave(th) : 0) + (spec.clumps ?? 1) * 0.006 * Math.pow(Math.abs(Math.sin(th * 13 + 0.7)), 2) * (1 - 0.5 * Math.abs(Math.cos(th)));
        const cover = 1 - smoothstep(hl - soft, hl + soft, v);
        let t = spec.thickness(th, v);
        // Oblikovani pramenovi: blagi žlebovi koji teku od temena, pa kosa nije „kaciga”
        const k = spec.clumps ?? 1;
        if (k > 0) {
            const flow = th * 11 + Math.sin(th * 3) * 0.8 + v * 2.2;
            t += k * 0.0042 * (Math.pow(Math.abs(Math.sin(flow)), 0.55) - 0.55) * smoothstep(0.06, 0.28, v);
            t += k * 0.0025 * Math.sin(th * 5 + 1.3) * smoothstep(0.1, 0.4, v);
            // Fini žlebovi vlasi
            t += k * 0.0011 * Math.sin(th * 46 + v * 7 + Math.sin(th * 9) * 2) * smoothstep(0.08, 0.3, v);
        }
        if (underHat && v < 0.42) t = Math.min(t, UNDER_HAT_TOP + (v / 0.42) * 0.004);
        // Debljina se tanji ka liniji kose, pa se kosa „utapa” u kožu (−5 mm = ispod kože)
        const edge = smoothstep(hl + soft, hl - soft * 3, v);
        return cover * t * (0.35 + 0.65 * edge) - (1 - cover) * 0.005;
    };
    const base = head.offsetFn(offset);
    return { fn: (u, v, out) => base(u, v * maxV, out), maxV, offset: (u, v) => (v > maxV ? 0 : offset(u, v)) };
}

function capMesh(head: HeadInfo, spec: CapSpec, material: THREE.Material, underHat: boolean, density = 1): THREE.Mesh {
    const { fn, maxV } = capSurface(head, spec, underHat);
    const geometry = buildSurface(fn, {
        nu: detail(128 * density),
        nv: detail(96 * maxV * density),
        closedU: true,
        inside: () => head.center.clone(),
        uv: (u, v) => [u * 6, v * maxV * 1.5],
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "kosa";
    return mesh;
}

/** Standardna linija kose deteta (čelo, slepoočnice, iznad uha, potiljak) */
const LINE_SHORT: [number, number][] = [[0, 0.3], [0.55, 0.32], [0.95, 0.4], [1.3, 0.47], [1.5, 0.43], [1.75, 0.5], [2.2, 0.66], [Math.PI, 0.75]];
const LINE_LONG: [number, number][] = [[0, 0.345], [0.4, 0.36], [0.8, 0.41], [1.1, 0.47], [1.3, 0.56], [1.6, 0.74], [2.2, 0.8], [Math.PI, 0.82]];
const LINE_BACK: [number, number][] = [[0, 0.29], [0.55, 0.31], [0.95, 0.39], [1.3, 0.47], [1.5, 0.44], [1.75, 0.52], [2.2, 0.68], [Math.PI, 0.76]];

// ── Dodaci ────────────────────────────────────────────────────────────────────

/** Duga kosa niz leđa: zatvoren „list” sa zaobljenim ivicama, ivica dole talasasta */
function longBack(head: HeadInfo, rig: Rig, material: THREE.Material): THREE.Mesh {
    const shape = rig.shape;
    const { w, d } = shape.head;
    const c = head.center;
    const yTop = c.y + 0.01;
    // Dno je na lopaticama (u koordinatama glave)
    const yBot = shape.chestY - shape.headBoneY - 0.02;
    const shoulderLocal = shape.shoulderY - shape.headBoneY;
    const backAt = (y: number) => shape.torsoBack(y + shape.headBoneY);
    const fn: SurfaceFn = (q, t, out) => {
        const ang = q * Math.PI * 2;
        const a = Math.cos(ang); // −1 … 1 preko leđa
        const side = Math.sin(ang); // spolja / iznutra
        // Krajevi se razdvajaju u pramenove (različite dužine), ne završavaju se ravnom pločom
        const lock = Math.abs(Math.sin(a * 5.5 + 0.4));
        const y = yTop + (yBot - yTop) * t - (0.012 + 0.05 * Math.pow(1 - lock, 1.5)) * smoothstep(0.62, 1, t);
        // Luk se sužava: gore obuhvata glavu, niže je iza ramena
        const k = smoothstep(yTop, shoulderLocal + 0.02, y);
        const alpha = 1.45 - 0.5 * k;
        const half = ((w / 2 + 0.014) * (1 - k) + (shape.torsoW(shape.shoulderY) * 0.95) * k) * (1 - 0.12 * smoothstep(0.6, 1, t));
        // Malo odmaknuto od leđa (kosa pada slobodno)
        const back = (d / 2 + 0.016) * (1 - k) + (backAt(Math.max(y, shoulderLocal - 0.08)) + 0.04 + c.z) * k;
        const zc = c.z;
        const x = (half * Math.sin(a * alpha)) / Math.sin(alpha);
        const z = zc - back * Math.cos(a * alpha) * (1 + 0.15 * k);
        // Debljina: deblje u sredini, tanko na krajevima i na dnu
        // Debljina: pramenovi se pri dnu tanje (šiljato), među njima žleb
        const th = (0.012 + 0.01 * (1 - Math.abs(a))) * (1 - smoothstep(0.55, 1, t) * (0.55 + 0.35 * (1 - lock))) * (0.5 + 0.5 * Math.sqrt(Math.max(0, 1 - a * a)));
        const nx = Math.sin(a * alpha);
        const nz = -Math.cos(a * alpha);
        const groove = 0.0016 * Math.sin(a * 28) + 0.004 * (lock - 0.6) * smoothstep(0.25, 0.9, t);
        return out.set(x + nx * (side * th + groove), y, z + nz * (side * th + groove));
    };
    const geometry = buildSurface(fn, {
        nu: detail(132),
        nv: detail(56),
        closedU: true,
        inside: (_q, t, out) => out.set(0, yTop + (yBot - yTop) * t, c.z - 0.02),
        uv: (q, t) => [q * 6, t * 3],
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "duga-kosa";
    return mesh;
}

/**
 * Prednji pramenovi duge kose (Bitmoji): od slepoočnica pored lica, preko ramena, niz grudi.
 * Prate i glavu (gore) i grudi (dole) — SkinnedMesh na kosturu, u korenu lika.
 */
function frontLocks(head: HeadInfo, rig: Rig, material: THREE.Material, toY: number): THREE.SkinnedMesh[] {
    const shape = rig.shape;
    const headAt = new THREE.Vector3(0, shape.headBoneY, 0);
    const locks: THREE.SkinnedMesh[] = [];
    const n = new THREE.Vector3();
    for (const side of [1, -1] as const) {
        // Tri pramena po strani: spolja duži, bliže licu kraći
        for (let i = 0; i < 4; i++) {
            const u = 0.5 + side * (0.2 + i * 0.03);
            const start = head.point(u, 0.5).addScaledVector(head.normal(u, 0.5, n), 0.012).add(headAt);
            const jaw = head.point(0.5 + side * (0.21 + i * 0.03), 0.8).addScaledVector(head.normal(0.5 + side * (0.21 + i * 0.03), 0.8, n), 0.016).add(headAt);
            const a = side * (0.62 + i * 0.22);
            const shoulder = torsoPoint(shape, a, shape.shoulderY + 0.012, 0.03, new THREE.Vector3());
            const end = torsoPoint(shape, a * 0.92, toY - i * 0.012, 0.028, new THREE.Vector3());
            const mid = torsoPoint(shape, a, (shape.shoulderY + toY) / 2, 0.032, new THREE.Vector3());
            const path = polyPath([start, jaw, shoulder, mid, end]);
            const width = 0.036 - i * 0.004;
            const spec = {
                path,
                section: (t: number, ang: number): [number, number] => {
                    // Pljosnat pramen: širok bočno, tanak napred; šiljat pri dnu
                    const taper = (0.55 + 0.45 * Math.sin(Math.min(1, 0.15 + t) * Math.PI * 0.95)) * (1 - 0.75 * smoothstep(0.7, 1, t));
                    return [Math.sin(ang) * width * taper, Math.cos(ang) * 0.009 * taper];
                },
                forwardAt: (t: number, out: THREE.Vector3) => {
                    const p = path(t, new THREE.Vector3());
                    return out.set(p.x, 0, p.z).normalize();
                },
            };
            const geometry = buildSurface(sweepFn(spec), {
                nu: 14,
                nv: 48,
                closedU: true,
                inside: (_u, t, out) => path(t, out),
                weights: (_u, t) => {
                    const k = smoothstep(0.3, 0.55, t);
                    return [[B.head, 1 - k], [B.chest, k]];
                },
                uv: (u, t) => [u * 0.5, t * 4],
            });
            const mesh = new THREE.SkinnedMesh(geometry, material);
            mesh.name = "pramen";
            mesh.bind(rig.skeleton, new THREE.Matrix4());
            mesh.frustumCulled = false;
            locks.push(mesh);
        }
    }
    return locks;
}

/** Rep: gumica na potiljku i pramen koji pada niz leđa (njiše se) */
function ponytail(head: HeadInfo, rig: Rig, material: THREE.Material, high: boolean): THREE.Object3D {
    const group = new THREE.Group();
    group.name = "rep";
    const v = high ? 0.28 : 0.42;
    const base = head.point(0, v);
    const n = head.normal(0, v);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.007, 10, 24), new THREE.MeshPhysicalMaterial({ color: "#E8556B", roughness: 0.45, clearcoat: 0.3 }));
    tie.position.copy(base).addScaledVector(n, 0.012);
    tie.lookAt(tie.position.clone().add(n));
    group.add(tie);
    const yBot = rig.shape.chestY - rig.shape.headBoneY + 0.02;
    const p0 = base.clone().addScaledVector(n, 0.004);
    const p1 = base.clone().addScaledVector(n, 0.05).add(new THREE.Vector3(0, high ? 0.02 : -0.005, 0));
    const p2 = new THREE.Vector3(0, (p1.y + yBot) / 2, p1.z - 0.025);
    const p3 = new THREE.Vector3(0, yBot, p1.z - 0.012);
    const r = profile([[0, 0.02], [0.12, 0.03], [0.35, 0.034], [0.75, 0.024], [1, 0.004]]);
    const tail = new THREE.Mesh(taperedTube(polyPath([p0, p1, p2, p3]), r, 40, 18, new THREE.Vector3(0, 0, -1), 0.85), material);
    group.add(tail);
    group.userData.swing = { pivot: p0.clone(), amount: 0.06 };
    return group;
}

/** Pletenica: niz preklopljenih „zrna” koja se smenjuju levo-desno, sa gumicom i čupavim krajem */
function braid(head: HeadInfo, rig: Rig, material: THREE.Material, side: 1 | -1): THREE.Object3D {
    const group = new THREE.Group();
    group.name = "pletenica";
    const shape = rig.shape;
    const hb = shape.headBoneY;
    const frontAt = (y: number) => shape.torsoFront(y + hb);
    const start = head.point(0.5 + side * 0.31, 0.62).add(new THREE.Vector3(side * 0.006, 0, 0));
    const shoulder = new THREE.Vector3(side * 0.11, shape.shoulderY - hb + 0.01, frontAt(shape.shoulderY - 0.03) + 0.045);
    const end = new THREE.Vector3(side * 0.1, shape.chestY - hb - 0.06, frontAt(shape.chestY - 0.06) + 0.04);
    const mid = start.clone().lerp(shoulder, 0.5).add(new THREE.Vector3(side * 0.025, 0, 0.0));
    const path = polyPath([start, mid, shoulder, end]);
    const lobes = 10;
    const p = new THREE.Vector3();
    const q = new THREE.Vector3();
    for (let i = 0; i < lobes; i++) {
        const s = (i + 0.5) / lobes;
        path(s, p);
        path(Math.min(1, s + 0.01), q);
        const tangent = q.sub(p).normalize();
        const r = 0.02 * (1 - s * 0.3);
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), material);
        lobe.scale.set(r * 1.05, r * 1.55, r * 0.85);
        lobe.position.copy(p);
        lobe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        lobe.rotateY(0);
        lobe.rotateZ(i % 2 === 0 ? 0.42 : -0.42);
        group.add(lobe);
    }
    // Gumica i kraj
    path(1, p);
    path(0.97, q);
    const dir = p.clone().sub(q).normalize();
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0045, 8, 18), new THREE.MeshPhysicalMaterial({ color: "#F2C230", roughness: 0.4, clearcoat: 0.4 }));
    tie.position.copy(p).addScaledVector(dir, 0.004);
    tie.lookAt(tie.position.clone().add(dir));
    group.add(tie);
    const tuftEnd = p.clone().addScaledVector(dir, 0.04);
    const tuft = new THREE.Mesh(taperedTube(polyPath([p.clone().addScaledVector(dir, 0.002), p.clone().addScaledVector(dir, 0.02), tuftEnd]), (s) => 0.012 * Math.sin(Math.min(1, 0.25 + s) * Math.PI * 0.9) + 0.002, 12, 12), material);
    group.add(tuft);
    return group;
}

/** Punđa na temenu */
function bun(head: HeadInfo, material: THREE.Material): THREE.Object3D {
    const group = new THREE.Group();
    const v = 0.17;
    const base = head.point(0, v);
    const n = head.normal(0, v);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.046, 32, 24), material);
    ball.scale.set(1, 0.85, 1);
    ball.position.copy(base).addScaledVector(n, 0.04);
    group.add(ball);
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 10, 28), material);
    wrap.position.copy(base).addScaledVector(n, 0.012);
    wrap.lookAt(wrap.position.clone().add(n));
    group.add(wrap);
    return group;
}

/** Kovrdže: gusti mali uvojci po kapi kose (jedan InstancedMesh) */
function curls(head: HeadInfo, spec: CapSpec, material: THREE.Material, underHat: boolean): THREE.Object3D {
    const line = profile(spec.hairline);
    const positions: THREE.Matrix4[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    const count = 900;
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
        // Ravnomerno po sferi (Fibonačijeva spirala)
        const y = 1 - (i / (count - 1)) * 2;
        const theta = golden * i;
        const v = Math.acos(Math.max(-1, Math.min(1, y))) / Math.PI;
        const u = ((theta / (Math.PI * 2)) % 1 + 1) % 1;
        const th = thetaOf(u);
        const hl = line(Math.abs(th)) - 0.03;
        if (v > hl) continue;
        if (underHat && v < 0.4) continue;
        head.point(u, v, p);
        head.normal(u, v, n);
        const t = spec.thickness(th, v);
        p.addScaledVector(n, t * 0.85);
        const r = 0.017 + ((i * 7919) % 100) / 100 * 0.008;
        q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        s.set(r, r * 0.8, r);
        positions.push(new THREE.Matrix4().compose(p.clone(), q.clone(), s.clone()));
    }
    const geometry = new THREE.SphereGeometry(1, 12, 8);
    const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
    positions.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.name = "kovrdze";
    return mesh;
}

// ── Kratke frizure sa pramenovima ───────────────────────────────────────────────

/** Kapa kose i njena visina iznad kože (na njoj leže pramenovi) */
function capWithLocks(head: HeadInfo, spec: CapSpec, material: THREE.MeshPhysicalMaterial, underHat: boolean): { mesh: THREE.Mesh; offset: (u: number, v: number) => number } {
    const { offset } = capSurface(head, spec, underHat);
    // Kapa je samo podloga ispod pramenova — ređa mreža, a malo tamnija (dubina među pramenovima)
    const under = hairMaterial("#" + material.color.clone().multiplyScalar(0.82).getHexString());
    return { mesh: capMesh(head, spec, under, underHat, 0.8), offset };
}

function locksMesh(head: HeadInfo, base: (u: number, v: number) => number, locks: Lock[], material: THREE.MeshPhysicalMaterial): THREE.Mesh | null {
    const geometry = lockGeometry(head, base, locks, detail(100) / 100);
    if (!geometry) return null;
    // Isti ton kao kosa, sa senkom među pramenovima (boje temena)
    const mesh = new THREE.Mesh(geometry, hairMaterial("#" + material.color.getHexString(), true));
    mesh.name = "pramenovi";
    // Pramenovi ne bacaju senku na kapu (inače tamne pruge između njih)
    mesh.userData.noShadow = true;
    return mesh;
}

/** Kapa kratke kose: kratko i tanko sa strane i pozadi (uho se vidi), volumen na temenu */
function shortSpec(style: HairStyle): CapSpec {
    if (style === "fade") {
        // Podšišana sa strane: strane i potiljak skoro ošišani, gore volumen
        return {
            hairline: LINE_SHORT,
            wave: (th) => 0.006 * Math.abs(Math.sin(th * 7)) * gauss(th, 0, 0.6),
            clumps: 0.6,
            thickness: (th, v) => {
                const top = (1 - smoothstep(0.2, 0.34, v)) * (1 - 0.35 * smoothstep(0.9, 1.6, Math.abs(th)));
                return 0.0032 + 0.022 * top + 0.002 * gauss(Math.abs(th), Math.PI, 0.6) * (1 - smoothstep(0.3, 0.5, v));
            },
        };
    }
    if (style === "sidepart") {
        // Razdeljak levo (gledaocu desno): žleb od čela ka temenu, uredno začešljano
        const base = shortSpec("short");
        return { ...base, thickness: (th, v) => base.thickness(th, v) + 0.002 * (1 - smoothstep(0.1, 0.4, v)) - 0.006 * gauss(th, 0.62, 0.05) * smoothstep(0.06, 0.12, v) * (1 - smoothstep(0.26, 0.34, v)) };
    }
    if (style === "pixie") {
        // Pixi: kratko i tanko sa strane, puniji vrh, mali zulufi ispred uha
        return {
            hairline: [[0, 0.3], [0.55, 0.32], [0.95, 0.42], [1.25, 0.52], [1.5, 0.44], [1.75, 0.52], [2.2, 0.68], [Math.PI, 0.76]],
            wave: (th) => 0.006 * Math.abs(Math.sin(th * 9)) * gauss(th, 0, 0.8),
            thickness: (th, v) => 0.006 + 0.02 * (1 - smoothstep(0.1, 0.5, v)) * (1 - 0.4 * smoothstep(0.9, 1.4, Math.abs(th))) + 0.003 * gauss(Math.abs(th), Math.PI, 0.6) * gauss(v, 0.45, 0.12),
        };
    }
    const top = style === "wavy" ? 0.026 : style === "messy" ? 0.026 : style === "swept" ? 0.023 : 0.021;
    return {
        hairline: style === "wavy" ? [[0, 0.29], [0.55, 0.31], [0.95, 0.39], [1.3, 0.46], [1.5, 0.43], [1.75, 0.5], [2.2, 0.66], [Math.PI, 0.74]] : LINE_SHORT,
        wave: (th) => 0.008 * Math.abs(Math.sin(th * 7)) * gauss(th, 0, 0.7),
        thickness: (th, v) => {
            // Strane tanje (podšišano), teme puno; pozadi blago izbočeno
            const sides = smoothstep(0.75, 1.35, Math.abs(th)) * smoothstep(0.3, 0.5, v);
            return 0.007 + top * (1 - smoothstep(0.12, 0.5, v)) * (1 - 0.5 * sides) + 0.003 * gauss(Math.abs(th), Math.PI, 0.6) * gauss(v, 0.45, 0.12) - 0.002 * sides;
        },
    };
}

/** Pramenovi kratkih frizura: šiške, strane i potiljak od temena; neuredna ima i vlasi */
function shortLocks(style: HairStyle): Lock[] {
    const locks: Lock[] = [];
    const crown = { u: 0.5, v: 0.03 };
    const sides = (seed: number) => [
        ...flow({ count: 3, uFrom: 0.6, uTo: 0.68, from: 0.1, to: 0.41, width: 0.026, root: crown, seed, lift: 0.005 }),
        ...flow({ count: 3, uFrom: 0.4, uTo: 0.32, from: 0.1, to: 0.41, width: 0.026, root: crown, seed: seed + 2, lift: 0.005 }),
        ...flow({ count: 3, uFrom: 0.75, uTo: 0.86, from: 0.1, to: 0.6, width: 0.03, root: crown, seed: seed + 4, lift: 0.005 }),
        ...flow({ count: 3, uFrom: 0.25, uTo: 0.14, from: 0.1, to: 0.6, width: 0.03, root: crown, seed: seed + 6, lift: 0.005 }),
        ...flow({ count: 3, uFrom: 0.93, uTo: 1.07, from: 0.1, to: 0.68, width: 0.032, root: crown, seed: seed + 8, lift: 0.005 }),
    ];
    switch (style) {
        case "messy":
            // Razbarušene šiške: duži, neuredni pramenovi preko čela, vlasi na temenu
            locks.push(...fringe({ count: 8, span: 0.08, from: 0.08, to: 0.395, width: 0.026, lift: 0.011, messy: 1, sweep: 0.008, seed: 21 }));
            locks.push(...sides(31), ...flyaways(4, 41));
            break;
        case "swept": {
            // Začešljana u stranu: razdeljak levo (gledaocu desno), pramenovi preko čela nadesno
            const part = 0.585;
            locks.push(...fringe({ count: 7, span: 0.05, from: 0.13, to: 0.345, width: 0.029, lift: 0.012, sweep: -0.085, center: part - 0.02, seed: 51 }));
            locks.push(...flow({ count: 2, uFrom: part + 0.025, uTo: 0.68, from: 0.16, to: 0.41, width: 0.026, root: { u: part, v: 0.14 }, seed: 53 }));
            locks.push(...sides(61).slice(3), ...flyaways(2, 71, 0.45));
            break;
        }
        case "wavy": {
            // Talasasta podignuta kosa: pramenovi od čela gore i nazad (volumen napred), meki talas
            for (let i = 0; i < 7; i++) {
                const k = (i / 6) * 2 - 1;
                const r = rand(i, 81);
                locks.push({ u0: 0.5 + k * 0.08, v0: 0.3 + Math.abs(k) * 0.02, u1: 0.5 + k * 0.055 + 0.025, v1: 0.06 + r * 0.04, bend: 0.02 * Math.sin(i * 1.7), width: 0.03, lift: 0.013 * (1 - Math.abs(k) * 0.4), thick: 0.005 });
            }
            locks.push(...sides(91), ...flyaways(2, 95));
            break;
        }
        case "pixie":
            // Pixi: duže šiške začešljane u stranu preko čela, kratko sa strane
            locks.push(...fringe({ count: 8, span: 0.07, from: 0.1, to: 0.375, width: 0.028, lift: 0.01, sweep: -0.07, center: 0.55, seed: 101 }));
            locks.push(...sides(111), ...flyaways(2, 121));
            break;
        case "sidepart": {
            // Razdeljak u stranu: pramenovi od razdeljka nadesno (preko temena) i nalevo (kratko)
            const part = 0.595;
            locks.push(...fringe({ count: 6, span: 0.045, from: 0.12, to: 0.3, width: 0.03, lift: 0.014, sweep: -0.06, center: 0.565, seed: 131 }));
            locks.push(...flow({ count: 4, uFrom: 0.55, uTo: 0.36, from: 0.1, to: 0.4, width: 0.03, root: { u: part, v: 0.12 }, lift: 0.007, seed: 133 }));
            locks.push(...flow({ count: 2, uFrom: part + 0.03, uTo: 0.7, from: 0.14, to: 0.42, width: 0.026, root: { u: part, v: 0.14 }, lift: 0.003, seed: 137 }));
            locks.push(...sides(141).slice(6));
            break;
        }
        case "fade":
            // Podšišana sa strane: kratki čuperci gore (napred i nazad), malo šiški
            locks.push(...fringe({ count: 5, span: 0.05, from: 0.14, to: 0.3, width: 0.026, lift: 0.01, messy: 0.6, seed: 151 }));
            locks.push(...flow({ count: 6, uFrom: 0.42, uTo: 0.58, from: 0.04, to: 0.26, width: 0.028, root: { u: 0.5, v: 0.03 }, lift: 0.009, seed: 153 }));
            locks.push(...flow({ count: 5, uFrom: 0.86, uTo: 1.14, from: 0.04, to: 0.28, width: 0.03, root: { u: 1, v: 0.03 }, lift: 0.006, seed: 157 }));
            break;
        default:
            // Kratka: uredne kraće šiške blago u stranu (i podloga za šiljke)
            locks.push(...fringe({ count: 7, span: 0.072, from: 0.1, to: 0.34, width: 0.026, lift: 0.009, messy: 0.4, sweep: -0.012, seed: 11 }));
            locks.push(...sides(15));
    }
    return locks;
}

/** Ispod kape se vide samo šiške (leže ravno na čelu) */
function fringeUnderHat(style: HairStyle): Lock[] {
    switch (style) {
        case "messy":
            return fringe({ count: 9, span: 0.08, from: 0.3, to: 0.4, width: 0.016, messy: 1, seed: 21 });
        case "swept":
            return fringe({ count: 7, span: 0.05, from: 0.3, to: 0.35, width: 0.018, sweep: -0.07, center: 0.565, seed: 51 });
        case "short":
        case "spiky":
            return fringe({ count: 7, span: 0.07, from: 0.3, to: 0.34, width: 0.016, seed: 11 });
        case "pixie":
            return fringe({ count: 8, span: 0.06, from: 0.3, to: 0.37, width: 0.018, sweep: -0.06, center: 0.55, seed: 101 });
        case "sidepart":
            return fringe({ count: 6, span: 0.045, from: 0.3, to: 0.33, width: 0.018, sweep: -0.05, center: 0.56, seed: 131 });
        default:
            return [];
    }
}

// ── Nove frizure: pomoćni oblici ────────────────────────────────────────────────

/** Kovrdžava površina: sitne „grudvice” po normali (bez hiljada posebnih uvojaka) */
function lumpy(geometry: THREE.BufferGeometry, amount: number, freq: number) {
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    if (!normal) return;
    const f = freq;
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);
        const n = (Math.abs(Math.sin(x * f + 1.3 * Math.sin(y * f * 0.7))) + Math.abs(Math.sin(y * f * 1.13 + 1.1 * Math.sin(z * f * 0.8))) + Math.abs(Math.sin(z * f * 0.97 + 1.2 * Math.sin(x * f * 0.6)))) / 3;
        const k = amount * (n - 0.62);
        position.setXYZ(i, x + normal.getX(i) * k, y + normal.getY(i) * k, z + normal.getZ(i) * k);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
}

/** Veličina glave prema dečjoj (oblici kose u metrima se skaliraju sa glavom) */
const headK = (head: HeadInfo) => head.shape.head.w / 0.2;

/** Jedna afro punđica: kovrdžava lopta sa gumicom, na temenu levo ili desno */
function puff(head: HeadInfo, material: THREE.Material, side: 1 | -1): THREE.Object3D {
    const group = new THREE.Group();
    group.name = "afro-pundjica";
    const k = headK(head);
    const u = 0.5 + side * 0.165;
    const v = 0.15;
    const base = head.point(u, v);
    const n = head.normal(u, v);
    const r = 0.05 * k;
    const ball = new THREE.SphereGeometry(r, detail(44), detail(32));
    ball.scale(1, 0.92, 0.95);
    lumpy(ball, 0.0075 * k, 210 / k);
    const mesh = new THREE.Mesh(ball, material);
    mesh.position.copy(base).addScaledVector(n, r * 0.78).add(new THREE.Vector3(side * 0.006 * k, 0.008 * k, 0));
    group.add(mesh);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.02 * k, 0.0055 * k, 10, 26), new THREE.MeshPhysicalMaterial({ color: side === 1 ? "#F2C230" : "#E8556B", roughness: 0.45, clearcoat: 0.3 }));
    tie.position.copy(base).addScaledVector(n, 0.011 * k);
    tie.lookAt(tie.position.clone().add(n));
    group.add(tie);
    return group;
}

/** Visoka punđa na temenu: lopta sa uvijenim pramenovima i obmotajem */
function topKnot(head: HeadInfo, material: THREE.Material): THREE.Object3D {
    const group = new THREE.Group();
    group.name = "visoka-pundja";
    const k = headK(head);
    const v = 0.05;
    const base = head.point(0, v);
    const n = head.normal(0, v).add(new THREE.Vector3(0, 1.4, 0)).normalize();
    const r = 0.047 * k;
    const ball = new THREE.SphereGeometry(r, detail(40), detail(28));
    // Uvijeni pramenovi: spiralni žlebovi po lopti
    const p = ball.getAttribute("position");
    const q = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
        q.fromBufferAttribute(p, i);
        const a = Math.atan2(q.z, q.x);
        const h = q.y / r;
        q.multiplyScalar(1 + 0.05 * Math.sin(a * 5 + h * 5));
        p.setXYZ(i, q.x, q.y * 0.82, q.z);
    }
    ball.computeVertexNormals();
    const mesh = new THREE.Mesh(ball, material);
    mesh.position.copy(base).addScaledVector(n, r * 0.92);
    group.add(mesh);
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(r * 0.62, 0.009 * k, 10, 28), material);
    wrap.position.copy(base).addScaledVector(n, 0.012 * k);
    wrap.lookAt(wrap.position.clone().add(n));
    group.add(wrap);
    return group;
}

/** Šiljci: kratki zašiljeni čuperci sa temena, blago napred (jedna geometrija) */
function spikes(head: HeadInfo, base: (u: number, v: number) => number, material: THREE.Material): THREE.Mesh {
    const k = headK(head);
    const geos: THREE.BufferGeometry[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    let made = 0;
    for (let i = 0; i < 160 && made < 34; i++) {
        const y = 1 - (i / 159) * 2;
        const v = Math.acos(Math.max(-1, Math.min(1, y))) / Math.PI;
        if (v > 0.3) break;
        const u = (((golden * i) / (Math.PI * 2)) % 1 + 1) % 1;
        const th = thetaOf(u);
        // Napred niže (iznad čela) nego pozadi
        if (v > 0.2 + 0.08 * Math.cos(th)) continue;
        head.point(u, v, p);
        head.normal(u, v, n);
        const r1 = rand(i, 171);
        const root = p.clone().addScaledVector(n, Math.max(0, base(u, v)) - 0.004);
        const dir = n.clone().add(new THREE.Vector3(0, 0.45, 0.25 + 0.2 * Math.cos(th))).normalize();
        const len = (0.028 + 0.014 * r1) * k;
        const mid = root.clone().addScaledVector(dir, len * 0.55).addScaledVector(n, 0.003 * k);
        const tip = root.clone().addScaledVector(dir, len).add(new THREE.Vector3(0, 0, 0.006 * k));
        geos.push(taperedTube(polyPath([root, mid, tip]), (s) => (0.0105 * Math.pow(1 - s, 0.85) + 0.0007) * k, 8, 7));
        made++;
    }
    const geometry = merge(geos);
    for (const g of geos) g.dispose();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "siljci";
    return mesh;
}

/** Kratki krajevi pletenica uz glavu: vise sa potiljka, sa šarenim perlicama */
function braidTails(head: HeadInfo, material: THREE.Material, rows: number): THREE.Object3D {
    const group = new THREE.Group();
    group.name = "krajevi-pletenica";
    const k = headK(head);
    const vNape = 0.74;
    const sinPh = Math.sin(vNape * Math.PI);
    const beads = ["#F2C230", "#E8556B", "#3FB3D9", "#7ACB62"];
    let index = 0;
    for (let j = -rows + 1; j < rows; j += 2) {
        const x = j / (rows * 2);
        const th = Math.PI - Math.asin(Math.max(-0.95, Math.min(0.95, x / sinPh)));
        const u = th / (Math.PI * 2) + 0.5;
        const start = head.point(u, vNape - 0.03);
        const n = head.normal(u, vNape - 0.03);
        start.addScaledVector(n, 0.006 * k);
        const end = start.clone().add(new THREE.Vector3(x * 0.04 * k, -0.075 * k, -0.012 * k));
        const path = polyPath([start, start.clone().lerp(end, 0.5).addScaledVector(n, 0.006 * k), end]);
        const lobes = 6;
        const a = new THREE.Vector3();
        const b = new THREE.Vector3();
        for (let i = 0; i < lobes; i++) {
            const s = (i + 0.5) / lobes;
            path(s, a);
            path(Math.min(1, s + 0.02), b);
            const tangent = b.sub(a).normalize();
            const r = 0.0085 * k * (1 - s * 0.25);
            const lobe = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), material);
            lobe.scale.set(r * 1.05, r * 1.5, r * 0.85);
            lobe.position.copy(a);
            lobe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
            lobe.rotateZ(i % 2 === 0 ? 0.42 : -0.42);
            group.add(lobe);
        }
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0068 * k, 14, 10), new THREE.MeshPhysicalMaterial({ color: beads[index++ % beads.length], roughness: 0.3, clearcoat: 0.6 }));
        bead.position.copy(end).add(new THREE.Vector3(0, -0.004 * k, 0));
        group.add(bead);
    }
    return group;
}

/** Bob: zavesa kose od visine očiju do brade, oko glave (otvoreno za lice), ravno podšišana */
function bobCurtain(head: HeadInfo, material: THREE.Material): THREE.Mesh {
    const { h } = head.shape.head;
    const c = head.center;
    const th0 = 0.98;
    const yBot = c.y - h * 0.44;
    const top = new THREE.Vector3();
    const n = new THREE.Vector3();
    const radial = new THREE.Vector3();
    const fn: SurfaceFn = (q, t, out) => {
        const ang = q * Math.PI * 2;
        const a = Math.cos(ang);
        const sideK = Math.sin(ang);
        const th = Math.PI + (Math.PI - th0) * a;
        const u = th / (Math.PI * 2) + 0.5;
        const vTop = 0.5;
        head.point(u, vTop, top);
        head.normal(u, vTop, n);
        // Iznad uha malo dalje od glave (uho je ispod kose)
        const ear = gauss(Math.abs(Math.sin(th)), 1, 0.25) * gauss(Math.abs(Math.cos(th)), 0, 0.5);
        top.addScaledVector(n, 0.015 + 0.01 * ear);
        radial.set(top.x - c.x, 0, top.z - c.z).normalize();
        const end = 1 - 0.3 * smoothstep(0.8, 1, Math.abs(a));
        const y = top.y + (yBot - top.y) * t + 0.008 * (1 - Math.cos(th)) * t;
        // Blago ispupčeno, kraj se uvija ka unutra; debljina se gubi na krajevima zavese
        const bulge = 0.006 * Math.sin(Math.PI * t) - 0.009 * smoothstep(0.82, 1, t);
        const thick = 0.0075 * Math.sqrt(Math.max(0, 1 - a * a)) * end * (1 - 0.45 * smoothstep(0.85, 1, t)) + 0.0012;
        const groove = 0.0012 * Math.sin(th * 34);
        return out.set(top.x, y, top.z).addScaledVector(radial, bulge + groove + sideK * thick);
    };
    const geometry = buildSurface(fn, {
        nu: detail(120),
        nv: detail(26),
        closedU: true,
        inside: (_q, t, out) => out.set(c.x, c.y + (yBot - c.y) * t, c.z),
        uv: (q, t) => [q * 6, t * 1.5],
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "bob";
    return mesh;
}

/** Kikica sa strane: gumica iznad uha, repić pada niz stranu (ne do ramena) */
function sideTail(head: HeadInfo, material: THREE.Material, side: 1 | -1): THREE.Object3D {
    const group = new THREE.Group();
    group.name = "kikica";
    const k = headK(head);
    const u = 0.5 + side * 0.285;
    const v = 0.36;
    const base = head.point(u, v);
    const n = head.normal(u, v);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.016 * k, 0.0062 * k, 10, 24), new THREE.MeshPhysicalMaterial({ color: side === 1 ? "#8E77E6" : "#3FB3D9", roughness: 0.45, clearcoat: 0.3 }));
    tie.position.copy(base).addScaledVector(n, 0.011 * k);
    tie.lookAt(tie.position.clone().add(n));
    group.add(tie);
    const p0 = base.clone().addScaledVector(n, 0.004);
    const p1 = base.clone().addScaledVector(n, 0.042 * k).add(new THREE.Vector3(0, -0.004 * k, 0));
    const p2 = new THREE.Vector3(p1.x + side * 0.016 * k, p1.y - 0.06 * k, p1.z - 0.012 * k);
    const p3 = new THREE.Vector3(p1.x + side * 0.008 * k, p1.y - 0.12 * k, p1.z - 0.004 * k);
    const r = profile([[0, 0.016], [0.12, 0.024], [0.38, 0.027], [0.75, 0.019], [1, 0.003]]);
    const tail = new THREE.Mesh(taperedTube(polyPath([p0, p1, p2, p3]), (s) => r(s) * k, 36, 16, new THREE.Vector3(0, 0, -1), 0.85), material);
    group.add(tail);
    return group;
}

// ── Brada ─────────────────────────────────────────────────────────────────────

/** Brada: „brada” = kratka uz vilicu sa brkovima, „brkovi” = samo brkovi, „puna” = gusta brada */
export type BeardStyle = "brada" | "brkovi" | "puna";

/**
 * Brada (učitelj, dedo): tanak sloj kose uz vilicu od zulufa do brade, brkovi iznad usne
 * spojeni u uglovima usana; usne i obrazi ostaju čisti. Ivice tonu u kožu (bez oštrog ruba).
 * Brkovi su deblji i blago spušteni u uglovima (dedin osmeh se i dalje vidi); puna brada je
 * gušća i zaobljena na bradi.
 */
export function buildBeard(head: HeadInfo, hex: string, skin: string, style: BeardStyle = "brada"): THREE.Mesh {
    const jaw = profile([[0, 0.775], [0.3, 0.765], [0.5, 0.75], [0.9, 0.69], [1.2, 0.62], [1.45, 0.55], [1.65, 0.52]]);
    const full = style === "puna";
    const onlyMoustache = style === "brkovi";
    const offset = (u: number, v: number) => {
        const th = thetaOf(u);
        const a = Math.abs(th);
        const line = jaw(a) + 0.006 * Math.sin(th * 23) - (full ? 0.03 : 0);
        const below = onlyMoustache ? 0 : smoothstep(line - 0.018, line + 0.014, v) * (1 - smoothstep(1.5, 1.68, a));
        // Brkovi: kod „brkova” širi i deblji, krajevi blago spušteni
        const wide = onlyMoustache || full ? 0.06 : 0;
        const must = smoothstep(0.648, 0.664, v) * (1 - smoothstep(0.684 + wide * 0.15, 0.696 + wide * 0.15, v)) * (1 - smoothstep(0.36 + wide, 0.46 + wide, a));
        const corner = smoothstep(0.29, 0.35, a) * (1 - smoothstep(0.5 + wide, 0.58 + wide, a)) * smoothstep(0.66, 0.675, v) * (onlyMoustache ? 1 - smoothstep(0.7, 0.72, v) : 1);
        const lips = (1 - smoothstep(0.29, 0.34, a)) * smoothstep(0.686 + wide * 0.12, 0.694 + wide * 0.12, v) * (1 - smoothstep(0.748, 0.762, v));
        const cover = Math.max(below, must, corner) * (1 - lips);
        // Kratke dlake: sitna neravnina, deblje na bradi
        let t = 0.0015 + 0.0008 * smoothstep(0.8, 0.92, v) * (1 - smoothstep(0.2, 0.9, a)) + 0.0003 * Math.sin(th * 41 + v * 60);
        if (onlyMoustache) t = 0.0026 + 0.0018 * (1 - smoothstep(0.1, 0.5, a)) + 0.0004 * Math.sin(th * 37);
        if (full) t = 0.0035 + 0.0075 * smoothstep(0.76, 0.96, v) * (1 - smoothstep(0.3, 1.2, a)) + 0.0012 * Math.sin(th * 31 + v * 40);
        return cover * t - (1 - cover) * 0.0025;
    };
    const fn = head.offsetFn(offset);
    const geometry = buildSurface((s, t, out) => fn(0.24 + 0.52 * s, 0.48 + 0.5 * t, out), {
        nu: detail(64),
        nv: detail(52),
        inside: () => head.center.clone(),
        uv: (s, t) => [s * 4, t * 2],
    });
    // Kratka brada je malo „providnija” od kose (koža se nazire): boja kose blago ka koži
    const material = hairMaterial("#" + new THREE.Color(hex).lerp(new THREE.Color(skin), 0.1).getHexString());
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "brada";
    return mesh;
}

// ── Frizure ───────────────────────────────────────────────────────────────────

/** Debljina kose na vrhu glave (kape i šeširi se prilagođavaju) */
export function hairCrown(style: HairStyle, underHat: boolean): number {
    if (underHat) return UNDER_HAT_TOP + 0.002;
    switch (style) {
        case "buzz":
            return 0.005;
        case "curly":
            return 0.05;
        case "short":
            return 0.026;
        case "messy":
            return 0.034;
        case "swept":
            return 0.03;
        case "wavy":
            return 0.04;
        case "afro":
            return 0.066;
        case "puffs":
        case "cornrows":
        case "receding":
            return 0.012;
        case "spiky":
            return 0.05;
        case "pixie":
        case "sidepart":
        case "fade":
            return 0.03;
        case "curlylong":
            return 0.034;
        case "bob":
            return 0.022;
        default:
            return 0.018;
    }
}

export function buildHair(rig: Rig, head: HeadInfo, style: HairStyle, hex: string, underHat: boolean, root?: THREE.Object3D, front = false): THREE.Object3D[] {
    const material = hairMaterial(hex);
    const headBone = rig.bone("head");
    const parts: THREE.Object3D[] = [];
    const add = (object: THREE.Object3D) => {
        headBone.add(object);
        parts.push(object);
    };
    // Razdeljak po sredini: udubljenje na temenu napred
    const part = (th: number, v: number) => 0.006 * gauss(th, 0, 0.045) * (1 - smoothstep(0.18, 0.32, v));
    switch (style) {
        case "short":
        case "messy":
        case "swept":
        case "wavy":
        case "pixie":
        case "sidepart":
        case "fade":
        case "spiky": {
            const spec = shortSpec(style === "spiky" ? "short" : style);
            const cap = capWithLocks(head, spec, material, underHat);
            add(cap.mesh);
            const locks = underHat ? fringeUnderHat(style) : shortLocks(style === "spiky" ? "short" : style);
            const mesh = locksMesh(head, cap.offset, locks, material);
            if (mesh) add(mesh);
            if (style === "spiky" && !underHat) add(spikes(head, cap.offset, material));
            break;
        }
        case "afro": {
            // Afro: velika okrugla kovrdžava kosa (ispod kape — skupljena uz glavu)
            const spec: CapSpec = {
                hairline: [[0, 0.29], [0.6, 0.31], [1.0, 0.42], [1.35, 0.5], [1.7, 0.56], [2.3, 0.7], [Math.PI, 0.78]],
                soft: underHat ? 0.016 : 0.03,
                clumps: 0,
                thickness: (th, v) => underHat
                    ? 0.012 + 0.004 * smoothstep(0.4, 0.6, v)
                    : 0.03 + 0.032 * (1 - smoothstep(0.15, 0.72, v)) + 0.008 * smoothstep(0.3, 0.6, v) * smoothstep(1.0, 2.0, Math.abs(th)),
            };
            const mesh = capMesh(head, spec, material, underHat, 1.1);
            lumpy(mesh.geometry, underHat ? 0.003 : 0.0055, 230);
            add(mesh);
            break;
        }
        case "puffs": {
            // Afro punđice: kosa skupljena u dve okrugle kovrdžave punđice na temenu
            const spec: CapSpec = {
                hairline: LINE_BACK,
                clumps: 0.4,
                thickness: (th, v) => 0.008 + 0.004 * (1 - smoothstep(0.1, 0.5, v)) - part(th, v) * 0.8,
            };
            add(capMesh(head, spec, material, underHat));
            if (!underHat) for (const side of [1, -1] as const) add(puff(head, material, side));
            break;
        }
        case "cornrows": {
            // Pletenice uz glavu: uzdužni redovi (napred–nazad) sa „zrnima” pletenja i kratki krajevi na potiljku
            const rows = 4;
            const spec: CapSpec = {
                hairline: LINE_BACK,
                clumps: 0,
                soft: 0.012,
                thickness: (th, v) => {
                    const ph = v * Math.PI;
                    const x = Math.sin(th) * Math.sin(ph);
                    const along = Math.atan2(Math.cos(ph), Math.cos(th) * Math.sin(ph));
                    const ridge = Math.pow(Math.abs(Math.cos(x * rows * Math.PI)), 0.8);
                    const weave = Math.abs(Math.sin(along * 30 + (Math.round(x * rows * 2) % 2) * 1.6));
                    return 0.0035 + 0.0055 * ridge * (0.75 + 0.25 * weave);
                },
            };
            add(capMesh(head, spec, material, underHat, 1.15));
            add(braidTails(head, material, rows));
            break;
        }
        case "bob": {
            // Bob: ravne šiške, kosa do brade sa strane i pozadi (uokviruje lice, pokriva uši)
            const spec: CapSpec = {
                hairline: [[0, 0.375], [0.45, 0.385], [0.75, 0.43], [1.0, 0.56], [1.3, 0.64], [Math.PI, 0.64]],
                wave: (th) => 0.004 * Math.sin(th * 21),
                clumps: 0.7,
                thickness: (th, v) => 0.013 + 0.006 * (1 - smoothstep(0.15, 0.55, v)) + 0.006 * smoothstep(0.42, 0.62, v) * smoothstep(0.9, 1.4, Math.abs(th)) - part(th - 0.3, v) * 0.7,
            };
            const cap = capSurface(head, spec, underHat);
            add(capMesh(head, spec, material, underHat));
            add(bobCurtain(head, material));
            if (!underHat) {
                const mesh = locksMesh(head, cap.offset, fringe({ count: 11, span: 0.085, from: 0.14, to: 0.385, width: 0.024, lift: 0.004, seed: 161 }), material);
                if (mesh) add(mesh);
            }
            break;
        }
        case "highbun": {
            // Visoka punđa: kosa začešljana gore sa svih strana, punđa na temenu
            const spec: CapSpec = {
                hairline: LINE_BACK,
                clumps: 0.5,
                thickness: (_th, v) => 0.008 + 0.004 * (1 - smoothstep(0.1, 0.5, v)),
            };
            const cap = capWithLocks(head, spec, material, underHat);
            add(cap.mesh);
            const line = profile(LINE_BACK);
            const up: Lock[] = [];
            for (let i = 0; i < 18; i++) {
                const u = i / 18 + 0.013;
                const a = Math.abs(thetaOf(u));
                up.push({ u0: u, v0: line(a) - 0.03, u1: u + 0.02 * Math.sin(i * 1.7), v1: underHat ? 0.36 : 0.09, width: 0.034, thick: 0.004, lift: 0.002 });
            }
            const mesh = locksMesh(head, cap.offset, up, material);
            if (mesh) add(mesh);
            if (!underHat) add(topKnot(head, material));
            break;
        }
        case "curlylong": {
            // Duga kovrdžava: kovrdžava kapa i kovrdže niz leđa
            const spec: CapSpec = {
                hairline: LINE_LONG,
                clumps: 0,
                soft: 0.022,
                thickness: (th, v) => 0.02 + 0.012 * (1 - smoothstep(0.2, 0.6, v)) + 0.012 * smoothstep(0.45, 0.75, v) * smoothstep(0.9, 1.5, Math.abs(th)),
            };
            const capM = capMesh(head, spec, material, underHat, 1.1);
            lumpy(capM.geometry, 0.0045, 230);
            add(capM);
            const back = longBack(head, rig, material);
            lumpy(back.geometry, 0.0065, 190);
            add(back);
            break;
        }
        case "pigtails": {
            // Dve kikice: razdeljak po sredini, repići iznad ušiju sa šarenim gumicama
            const spec: CapSpec = {
                hairline: [[0, 0.3], [0.5, 0.315], [0.9, 0.38], [1.25, 0.5], [1.55, 0.55], [1.9, 0.64], [2.4, 0.72], [Math.PI, 0.76]],
                thickness: (th, v) => 0.01 + 0.005 * (1 - smoothstep(0.2, 0.6, v)) - part(th, v) * 0.9,
            };
            add(capMesh(head, spec, material, underHat));
            for (const side of [1, -1] as const) add(sideTail(head, material, side));
            break;
        }
        case "receding": {
            // Proređena (dedo): ćelavo teme i čelo, kratka kosa sa strane i pozadi („potkovica”)
            const spec: CapSpec = {
                hairline: LINE_SHORT,
                clumps: 0.5,
                soft: 0.014,
                thickness: (th, v) => {
                    const a = Math.abs(th);
                    const top = 0.44 - 0.16 * smoothstep(1.2, 2.6, a);
                    const band = smoothstep(top - 0.05, top + 0.03, v) * smoothstep(0.75, 1.15, a);
                    return 0.0062 * band + 0.0015 * gauss(a, Math.PI, 0.5) * band - 0.004 * (1 - band);
                },
            };
            add(capMesh(head, spec, material, underHat));
            break;
        }
        case "buzz": {
            const spec: CapSpec = { hairline: LINE_SHORT, thickness: () => 0.0035, soft: 0.01, clumps: 0 };
            const buzz = hairMaterial(hex).clone();
            buzz.anisotropy = 0;
            buzz.roughness = 0.85;
            buzz.sheen = 0.6;
            add(capMesh(head, spec, buzz, underHat));
            break;
        }
        case "curly": {
            const spec: CapSpec = {
                hairline: [[0, 0.3], [0.6, 0.32], [1.0, 0.42], [1.4, 0.5], [1.7, 0.52], [2.3, 0.68], [Math.PI, 0.76]],
                thickness: (_th, v) => 0.022 + 0.012 * (1 - smoothstep(0.2, 0.6, v)),
            };
            add(capMesh(head, spec, material, underHat));
            add(curls(head, spec, material, underHat));
            break;
        }
        case "long": {
            const spec: CapSpec = {
                hairline: LINE_LONG,
                // Šiške začešljane u stranu: razdeljak levo, pramen pada preko desne strane čela
                wave: (th) => 0.045 * gauss(th, -0.3, 0.32) - 0.025 * gauss(th, 0.32, 0.16),
                thickness: (th, v) =>
                    0.014 + 0.006 * (1 - smoothstep(0.2, 0.6, v)) + 0.008 * smoothstep(0.45, 0.75, v) * smoothstep(0.9, 1.5, Math.abs(th))
                    + 0.006 * gauss(v, 0.36, 0.06) * gauss(th, -0.2, 0.5)
                    + 0.0025 * Math.sin(th * 16) * smoothstep(0.3, 0.7, v)
                    - part(th - 0.32, v),
            };
            const cap = capWithLocks(head, spec, material, underHat);
            add(cap.mesh);
            add(longBack(head, rig, material));
            // Pramenovi od razdeljka (levo) preko temena ka stranama
            if (!underHat) {
                const mesh = locksMesh(head, cap.offset, [
                    ...flow({ count: 3, uFrom: 0.68, uTo: 0.76, from: 0.12, to: 0.5, width: 0.028, root: { u: 0.45, v: 0.12 }, lift: 0.003, seed: 3 }),
                    ...flow({ count: 3, uFrom: 0.32, uTo: 0.24, from: 0.12, to: 0.5, width: 0.028, root: { u: 0.45, v: 0.12 }, lift: 0.004, seed: 5 }),
                ], material);
                if (mesh) add(mesh);
            }
            // Prednji pramenovi preko ramena (kao kod Bitmoji duge kose)
            if (root && front) {
                for (const lock of frontLocks(head, rig, material, rig.shape.chestY - 0.02)) {
                    root.add(lock);
                    parts.push(lock);
                }
            }
            break;
        }
        case "straight": {
            // Duga ravna kosa sa razdeljkom po sredini: pramenovi uokviruju lice, pa niz leđa
            const spec: CapSpec = {
                hairline: [[0, 0.33], [0.3, 0.335], [0.7, 0.39], [1.05, 0.46], [1.3, 0.56], [1.6, 0.74], [2.2, 0.8], [Math.PI, 0.82]],
                wave: (th) => -0.012 * gauss(th, 0, 0.06),
                thickness: (th, v) =>
                    0.013 + 0.005 * (1 - smoothstep(0.2, 0.6, v)) + 0.009 * smoothstep(0.42, 0.75, v) * smoothstep(0.8, 1.4, Math.abs(th))
                    + 0.002 * Math.sin(th * 18) * smoothstep(0.3, 0.7, v)
                    - part(th, v) * 1.2,
            };
            const cap = capWithLocks(head, spec, material, underHat);
            add(cap.mesh);
            add(longBack(head, rig, material));
            if (!underHat) {
                const mesh = locksMesh(head, cap.offset, [
                    ...flow({ count: 4, uFrom: 0.66, uTo: 0.76, from: 0.1, to: 0.55, width: 0.028, root: { u: 0.5, v: 0.1 }, lift: 0.003, seed: 11 }),
                    ...flow({ count: 4, uFrom: 0.34, uTo: 0.24, from: 0.1, to: 0.55, width: 0.028, root: { u: 0.5, v: 0.1 }, lift: 0.003, seed: 13 }),
                ], material);
                if (mesh) add(mesh);
            }
            if (root) {
                for (const lock of frontLocks(head, rig, material, rig.shape.chestY - 0.03)) {
                    root.add(lock);
                    parts.push(lock);
                }
            }
            break;
        }
        case "ponytail": {
            const spec: CapSpec = {
                hairline: LINE_BACK,
                thickness: (th, v) => 0.009 + 0.006 * (1 - smoothstep(0.1, 0.5, v)) + 0.006 * gauss(Math.abs(th), Math.PI, 0.5) * gauss(v, 0.42, 0.08),
            };
            add(capMesh(head, spec, material, underHat));
            add(ponytail(head, rig, material, false));
            break;
        }
        case "braids": {
            const spec: CapSpec = {
                hairline: [[0, 0.3], [0.5, 0.315], [0.9, 0.38], [1.25, 0.5], [1.55, 0.55], [1.9, 0.64], [2.4, 0.72], [Math.PI, 0.76]],
                thickness: (th, v) => 0.01 + 0.005 * (1 - smoothstep(0.2, 0.6, v)) - part(th, v) * 0.8,
            };
            add(capMesh(head, spec, material, underHat));
            add(braid(head, rig, material, 1));
            add(braid(head, rig, material, -1));
            break;
        }
        case "bun": {
            const spec: CapSpec = {
                hairline: LINE_BACK,
                thickness: (_th, v) => 0.009 + 0.006 * (1 - smoothstep(0.1, 0.5, v)),
            };
            add(capMesh(head, spec, material, underHat));
            if (!underHat) add(bun(head, material));
            break;
        }
    }
    return parts;
}
