// Sastavljanje životinje (FigureBody iz ugovora): kostur sa 18 kostiju (+ rep i uši), telo
// istog kroja kao čovek (pa sva odeća pristaje), glava sa licem, uši, šape, stopala, rep i
// posebni delovi vrste (griva, rog…), sidra za predmete i pokreti repa i ušiju.
// Svaka vrsta (animals/<vrsta>.ts, animals/extra/<vrsta>.ts) samo opisuje sebe (AnimalSpec).

import * as THREE from "three";
import type { Anchors, BodyPart, BodyShape, CompanionBuilder, CompanionKind, CompanionLook, EarKind, FigureBody, FigureContext, FootKind, HandKind, Rig, SkinData } from "../contract";
import type { AnimalKind } from "../data";
import { armPath, legPath, torsoBottom, torsoPoint, torsoSurface, torsoTop } from "../engine/body";
import { armWeights, createRig, legWeights, torsoWeights, type ExtraBone } from "../engine/rig";
import { buildSurface, clamp01, polyPath, smoothstep, sweepFn } from "../engine/surface";
import { COATS, type Coat } from "./coats";
import { buildFace, type FaceSpec } from "./face";
import { animalHead, headGeometry, type AnimalHead, type HeadSpec } from "./head";
import { FUR_TILE, furMaterial, hornyMaterial, padMaterial } from "./materials";
import { coatColor, col, paintGeometry, type PaintContext, type PaintPoint } from "./paint";
import {
    earGeometry, flipperHand, furUv, hoofFoot, hoofHand, pawFoot, pawHand, tailGeometry,
    type EarShape, type Side, type TailSpec,
} from "./parts";
import { animalShape, type ShapeParams } from "./shape";

export interface EarSpec {
    kind: EarKind;
    shape: EarShape;
    /** Koren uha na glavi (u, v površine) i koliko je utisnut (m) */
    u: number;
    v: number;
    sink?: number;
    /** Okret levog uha (desno je ogledalo): unazad (x), oko svoje ose (y), napolje (z) */
    tilt: [number, number, number];
    /** Unutrašnjost: koža (roze) ili svetlo krzno */
    inner?: "pad" | "fur";
}

export type TailMotion = "sway" | "wag" | "flick" | "none";

export interface AnimalSpec {
    kind: CompanionKind;
    skins: readonly SkinData[];
    /** Boje po id-ju izgleda (podrazumevano COATS[kind]) */
    coats?: Record<string, Coat>;
    shape: ShapeParams;
    head: HeadSpec;
    face: FaceSpec | ((coat: Coat) => FaceSpec);
    ears?: EarSpec | ((coat: Coat) => EarSpec);
    tail?: TailSpec & { motion?: TailMotion; height?: number };
    hands: HandKind;
    feet: FootKind;
    /** Poluprečnik šake (m) */
    pawR?: number;
    /** Svetao stomak (0–1) i obrazi */
    belly: number;
    cheeks: number;
    /** Perje/glatko krzno (pingvin) */
    sleek?: boolean;
    /** Spljoštene ruke (peraja) */
    flatArms?: number;
    /** Posebni delovi vrste (griva, rog, kljun…) */
    extras?: (b: AnimalBuild) => void;
    /** Uši se mrdaju (šiljate) ili njišu (klempave) */
    earMotion?: "twitch" | "swing" | "none";
}

/** Šta posebni delovi vrste dobijaju za crtanje */
export interface AnimalBuild {
    spec: AnimalSpec;
    coat: Coat;
    skin: string;
    rig: Rig;
    shape: BodyShape;
    head: AnimalHead;
    /** Grupa glave (kost glave) */
    headGroup: THREE.Group;
    paint: PaintContext;
    quality: "high" | "low";
    fur: THREE.Material;
    /** Svetski položaj kosti u mirovanju */
    boneAt: (name: string) => THREE.Vector3;
    /** Dodaj deo u spisak delova tela (motor ga sakriva kad predmet to traži) */
    part: (kind: BodyPart, object: THREE.Object3D) => void;
    /** Rog (jednorog) */
    setHorn: (horn: { base: THREE.Vector3; tip: THREE.Vector3; radius: number }) => void;
    /** Dodatni pokret svakog kadra (griva, krila…) */
    onAnimate: (fn: (time: number, dt: number, live: boolean) => void) => void;
    /** Kljun umesto usta: pomeraj donjeg kljuna za otvaranje */
    face?: { setJaw?: (open: number, smile: number) => void; mouth?: THREE.Object3D };
}

const SHAPES = new Map<string, BodyShape>();

function shapeFor(spec: AnimalSpec): BodyShape {
    let s = SHAPES.get(spec.kind);
    if (!s) {
        s = animalShape(spec.shape);
        SHAPES.set(spec.kind, s);
    }
    return s;
}

const gauss = (d: number, s: number) => Math.exp(-(d * d) / (2 * s * s));

/** Senka u naborima trupa: ispod brade, pazuh, prepone */
function torsoAo(shape: BodyShape, rig: Rig, p: THREE.Vector3): number {
    const chin = gauss(Math.hypot(p.x * 0.7, p.y - (shape.neckBaseY + 0.005), Math.max(0, p.z) - shape.torsoFront(shape.neckBaseY) * 0.6), 0.04) * (p.z > -0.02 ? 1 : 0.4);
    let pit = 0;
    let groin = 0;
    for (const j of [rig.left, rig.right]) {
        pit = Math.max(pit, gauss(Math.hypot(p.x - j.shoulder.x * 0.82, (p.y - (j.shoulder.y - 0.05)) * 0.8, p.z * 0.7), 0.028));
        groin = Math.max(groin, gauss(Math.hypot((p.x - j.hip.x) * 0.6, p.y - shape.crotchY - 0.005, p.z * 0.5), 0.03));
    }
    return clamp01(chin * 0.75 + pit * 0.55 + groin * 0.35);
}

function along(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
    const ab = new THREE.Vector3().subVectors(b, a);
    return clamp01(new THREE.Vector3().subVectors(p, a).dot(ab) / ab.lengthSq());
}

function along2(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): number {
    const l1 = a.distanceTo(b);
    const l2 = b.distanceTo(c);
    const t1 = along(p, a, b);
    if (t1 < 1) return (t1 * l1) / (l1 + l2);
    return (l1 + along(p, b, c) * l2) / (l1 + l2);
}

export function buildAnimal(spec: AnimalSpec, look: CompanionLook, ctx: FigureContext): FigureBody {
    const quality = ctx.quality;
    const hi = quality === "high";
    const coats = spec.coats ?? COATS[spec.kind as AnimalKind];
    const skin = coats[look.skin] ? look.skin : spec.skins[0].id;
    const coat = coats[skin];
    const shape = shapeFor(spec);
    const head = animalHead(shape, spec.head);
    const faceSpec = typeof spec.face === "function" ? spec.face(coat) : spec.face;
    const earSpec = typeof spec.ears === "function" ? spec.ears(coat) : spec.ears;
    const headBone = new THREE.Vector3(0, shape.headBoneY, 0);

    // ── Kosti repa i ušiju ──
    const extras: ExtraBone[] = [];
    const tailBase = new THREE.Vector3();
    let tailPathPts: THREE.Vector3[] = [];
    if (spec.tail) {
        const y = shape.crotchY + (spec.tail.height ?? 0.06);
        tailBase.set(0, y, -shape.torsoBack(y) + 0.014);
        tailPathPts = spec.tail.points.map(([x, yy, z]) => new THREE.Vector3(x, yy, z).add(tailBase));
        const path = polyPath(tailPathPts);
        extras.push({ name: "tail1", parent: "hips", at: tailBase.clone() });
        extras.push({ name: "tail2", parent: "tail1", at: path(0.35, new THREE.Vector3()) });
        extras.push({ name: "tail3", parent: "tail2", at: path(0.7, new THREE.Vector3()) });
    }
    const earBase: THREE.Vector3[] = [];
    if (earSpec && earSpec.kind !== "none") {
        for (const side of [1, -1] as const) {
            const p = head.offsetPoint(0.5 + side * (earSpec.u - 0.5), earSpec.v, -(earSpec.sink ?? 0.01)).add(headBone);
            earBase.push(p);
            extras.push({ name: side === 1 ? "earL" : "earR", parent: "head", at: p });
        }
    }
    const rig = createRig(shape, extras);
    const root = new THREE.Group();
    root.name = `zivotinja-${spec.kind}`;
    root.add(rig.root);
    const boneAt = (name: string) => {
        const bone = rig.bones.find((b) => b.name === name);
        return bone ? bone.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
    };

    // ── Boje ──
    const eyeCenters = ([1, -1] as const).map((side) => {
        const u = 0.5 + side * head.spec.eye.u;
        return head.point(u, head.spec.eye.v).addScaledVector(head.normal(u, head.spec.eye.v), -head.spec.eye.r * head.spec.eye.inset).add(headBone);
    }) as [THREE.Vector3, THREE.Vector3];
    const paint: PaintContext = {
        kind: spec.kind as AnimalKind,
        coat,
        shape,
        headCenter: head.center.clone().add(headBone),
        headRadii: head.radii.clone(),
        eyes: eyeCenters,
        eyeR: head.spec.eye.r,
        belly: spec.belly,
        cheeks: spec.cheeks,
    };
    const fur = furMaterial({ sheen: coat.light, shimmer: coat.shimmer, sleek: spec.sleek });
    const parts: Partial<Record<BodyPart, THREE.Object3D[]>> = {};
    const addPart = (kind: BodyPart, object: THREE.Object3D) => {
        (parts[kind] ??= []).push(object);
    };
    const skinned: THREE.SkinnedMesh[] = [];
    const addSkinned = (geometry: THREE.BufferGeometry, material: THREE.Material, name: string) => {
        const mesh = new THREE.SkinnedMesh(geometry, material);
        mesh.name = name;
        skinned.push(mesh);
        return mesh;
    };

    // ── Trup ──
    const y0 = torsoBottom(shape);
    const y1 = torsoTop(shape);
    const torsoFn = torsoSurface(shape, y0, y1, 0);
    const circ = Math.PI * 2 * shape.torsoW(shape.waistY) * 0.95;
    const torso = buildSurface(torsoFn, {
        nu: hi ? 64 : 40,
        nv: hi ? 72 : 40,
        closedU: true,
        inside: (_u, v, out) => out.set(0, y0 + (y1 - y0) * v, 0),
        weights: (_u, _v, p) => torsoWeights(shape, p),
        uv: furUv(circ, y1 - y0),
    });
    paintGeometry(torso, paint, (_i, p) => ({ p, region: "torso", ao: torsoAo(shape, rig, p) }));
    addSkinned(torso, fur, "trup");

    // ── Ruke i noge ──
    const flat = spec.flatArms ?? 0;
    for (const side of [1, -1] as const) {
        const j = side === 1 ? rig.left : rig.right;
        const arm = armPath(rig, side, 0, flat > 0 ? (t, a) => -shape.armR(t) * flat * Math.pow(Math.sin(a), 2) * smoothstep(0, 0.3, t) : undefined);
        const armGeo = buildSurface(sweepFn(arm.spec), {
            nu: hi ? 32 : 20,
            nv: hi ? 44 : 24,
            closedU: true,
            inside: (_u, v, out) => arm.spec.path(v, out),
            weights: (_u, _v, p) => armWeights(rig, side, p),
            uv: furUv(Math.PI * 2 * shape.armR(0.5), shape.upperArm + shape.forearm),
        });
        paintGeometry(armGeo, paint, (_i, p) => {
            const t = along2(p, j.shoulder, j.elbow, j.wrist);
            const inner = Math.max(0, -(p.x - j.shoulder.x) * side) / 0.04;
            return { p, region: "arm", t, side, ao: (1 - smoothstep(0.02, 0.22, t)) * clamp01(inner) * 0.5 + torsoAo(shape, rig, p) * 0.5 };
        });
        addSkinned(armGeo, fur, side === 1 ? "leva-ruka" : "desna-ruka");

        const leg = legPath(rig, side, 0);
        const legGeo = buildSurface(sweepFn(leg.spec), {
            nu: hi ? 36 : 22,
            nv: hi ? 48 : 26,
            closedU: true,
            inside: (_u, v, out) => leg.spec.path(v, out),
            weights: (_u, _v, p) => legWeights(rig, side, p),
            uv: furUv(Math.PI * 2 * shape.legR(0.4), shape.thigh + shape.shin),
        });
        paintGeometry(legGeo, paint, (_i, p) => {
            const t = along2(p, j.hip, j.knee, j.ankle);
            const inner = Math.max(0, -(p.x - j.hip.x) * side) / 0.05;
            return { p, region: "leg", t, side, ao: (1 - smoothstep(0, 0.16, t)) * clamp01(inner + 0.3) * 0.45 + (smoothstep(0.92, 1, t)) * 0.2 };
        });
        addSkinned(legGeo, fur, side === 1 ? "leva-noga" : "desna-noga");
    }

    // ── Šake ──
    const pawR = spec.pawR ?? shape.armR(1) * 1.32;
    let grip = new THREE.Vector3();
    let handRadius = pawR;
    for (const side of [1, -1] as const) {
        const boneName = side === 1 ? "handL" : "handR";
        const bone = rig.bone(boneName);
        const at = boneAt(boneName);
        const paintAt = (g: THREE.BufferGeometry, region: PaintPoint["region"]) =>
            paintGeometry(g, paint, (_i, p) => ({ p: p.clone().add(at), region, side, t: 1 }));
        let g: THREE.Vector3;
        if (spec.hands === "hoof") {
            const h = hoofHand(rig, side, pawR, quality);
            paintAt(h.fur, "arm");
            const cuff = new THREE.Mesh(h.fur, fur);
            const hoof = new THREE.Mesh(h.hoof, hornyMaterial(coat.hoof ?? "#C9A06A"));
            bone.add(cuff, hoof);
            addPart("hands", cuff);
            addPart("hands", hoof);
            g = h.grip;
            handRadius = h.radius;
        } else if (spec.hands === "flipper") {
            const h = flipperHand(rig, side, pawR, quality);
            paintAt(h.fur, "arm");
            const mesh = new THREE.Mesh(h.fur, fur);
            bone.add(mesh);
            addPart("hands", mesh);
            g = h.grip;
            handRadius = h.radius;
        } else {
            const h = pawHand(rig, side, pawR, quality);
            paintAt(h.fur, "hand");
            const mesh = new THREE.Mesh(h.fur, fur);
            mesh.name = "sapa";
            bone.add(mesh);
            addPart("hands", mesh);
            if (h.pads) {
                const pads = new THREE.Mesh(h.pads, padMaterial(coat.inner));
                bone.add(pads);
                addPart("hands", pads);
            }
            g = h.grip;
        }
        if (side === -1) grip = g;
    }

    // ── Stopala ──
    for (const side of [1, -1] as const) {
        const boneName = side === 1 ? "footL" : "footR";
        const bone = rig.bone(boneName);
        const at = boneAt(boneName);
        if (spec.feet === "hoof") {
            const f = hoofFoot(shape, quality);
            paintGeometry(f.fur, paint, (_i, p) => ({ p: p.clone().add(at), region: "leg", side, t: 1 }));
            const a = new THREE.Mesh(f.fur, fur);
            const b = new THREE.Mesh(f.hoof, hornyMaterial(coat.hoof ?? "#C9A06A"));
            bone.add(a, b);
            addPart("feet", a);
            addPart("feet", b);
        } else {
            const g = pawFoot(shape, quality, 3, spec.feet === "webbed" ? "webbed" : "paw");
            const toeZ = shape.foot.len - shape.foot.back;
            if (spec.feet === "webbed") {
                const m = new THREE.Mesh(g, hornyMaterial(coat.paws ?? "#F29A2E", 0.5));
                bone.add(m);
                addPart("feet", m);
            } else {
                paintGeometry(g, paint, (_i, p) => {
                    const local = p.clone();
                    // Senka između prstiju (prednji deo, gore)
                    const front = smoothstep(toeZ - 0.05, toeZ, local.z);
                    const valley = Math.abs(Math.sin((local.x / shape.foot.w) * Math.PI * 2.1)) < 0.25 ? 1 : 0;
                    return { p: p.clone().add(at), region: "foot", side, t: 1, ao: front * valley * 0.35 };
                });
                const m = new THREE.Mesh(g, fur);
                m.name = "stopalo";
                bone.add(m);
                addPart("feet", m);
            }
        }
    }

    // ── Glava ──
    const headGroup = new THREE.Group();
    headGroup.name = "glava";
    rig.bone("head").add(headGroup);
    const headGeo = headGeometry(head, quality);
    {
        const uv = headGeo.getAttribute("uv");
        const pos = headGeo.getAttribute("position");
        const tmp = new THREE.Vector3();
        const colors = new Float32Array(pos.count * 3);
        const c = new THREE.Color();
        const R = head.radii;
        for (let i = 0; i < pos.count; i++) {
            const u = uv.getX(i);
            const v = uv.getY(i);
            const s = head.sample(u, v);
            tmp.fromBufferAttribute(pos, i);
            const q = tmp.clone().sub(head.center).divide(R);
            // Senka: nabori, ispod brade, oko očiju, koren uha
            let ao = s.crease * 0.55;
            ao += smoothstep(-0.55, -0.95, q.y) * 0.55 * (q.z > -0.4 ? 1 : 0.6);
            const body = tmp.clone().add(headBone);
            for (const e of eyeCenters) {
                const d = body.distanceTo(e) / head.spec.eye.r;
                ao += gauss(d - 1.12, 0.14) * 0.38;
            }
            for (const e of earBase) ao += gauss(body.distanceTo(e), 0.022) * 0.45;
            coatColor(paint, { p: body, region: "head", muzzle: s.muzzle, ao, side: Math.sign(tmp.x) }, c);
            colors.set([c.r, c.g, c.b], i * 3);
        }
        headGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        // Teksture krzna u metrima (dlaka „teče” od temena naniže)
        const furUvArr = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) {
            furUvArr[i * 2] = (uv.getX(i) * Math.PI * shape.head.w) / FUR_TILE;
            furUvArr[i * 2 + 1] = (uv.getY(i) * Math.PI * shape.head.h * 0.5) / FUR_TILE;
        }
        headGeo.setAttribute("uv", new THREE.BufferAttribute(furUvArr, 2));
    }
    const headMesh = new THREE.Mesh(headGeo, fur);
    headMesh.name = "glava-krzno";
    headGroup.add(headMesh);

    let horn: Anchors["horn"];
    const animators: ((time: number, dt: number, live: boolean) => void)[] = [];
    const build: AnimalBuild = {
        spec, coat, skin, rig, shape, head, headGroup, paint, quality, fur, boneAt,
        part: addPart,
        setHorn: (h) => (horn = h),
        onAnimate: (fn) => animators.push(fn),
        face: {},
    };
    spec.extras?.(build);

    const browHex = coat.brow;
    const face = buildFace(head, faceSpec, {
        nose: coat.nose,
        brow: browHex,
        iris: coat.iris,
        mouth: coat.mouth ?? "#3A1E24",
        lidMaterial: fur,
        paintLid: (g, eyeCenter) => paintGeometry(g, paint, (_i, p) => ({ p: p.clone().add(eyeCenter).add(headBone), region: "lid", muzzle: 0 })),
        browMaterial: fur,
        paintBrow: (g) => {
            const n = g.getAttribute("position").count;
            const arr = new Float32Array(n * 3);
            const c = col(browHex);
            for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
            g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
        },
    }, quality, build.face?.mouth || build.face?.setJaw ? { mouth: build.face.mouth, jaw: build.face.setJaw } : undefined);
    headGroup.add(face.group);
    addPart("head", headGroup);

    // ── Uši ──
    const earMeshes: THREE.Object3D[] = [];
    const earTips: THREE.Vector3[] = [];
    if (earSpec && earSpec.kind !== "none") {
        for (const [i, side] of ([1, -1] as const).entries()) {
            const bone = rig.bones.find((b) => b.name === (side === 1 ? "earL" : "earR"))!;
            const g = earGeometry(earSpec.shape, quality);
            const [tx, ty, tz] = earSpec.tilt;
            const rot = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(tx, side * ty, -side * tz, "ZYX"));
            const ear = new THREE.Group();
            ear.name = "uvo";
            const len = earSpec.shape.len;
            const paintEar = (geo: THREE.BufferGeometry, inner: number) => {
                const local = geo.getAttribute("position");
                const tAt = new Float32Array(local.count);
                for (let k = 0; k < local.count; k++) tAt[k] = clamp01(local.getY(k) / len);
                geo.applyMatrix4(rot);
                paintGeometry(geo, paint, (k, p) => ({ p: p.clone().add(earBase[i]), region: "ear", t: tAt[k], side, inner, ao: (1 - smoothstep(0, 0.22, tAt[k])) * 0.4 }));
            };
            paintEar(g.shell, 0);
            ear.add(new THREE.Mesh(g.shell, fur));
            if (g.inner) {
                g.inner.applyMatrix4(rot);
                ear.add(new THREE.Mesh(g.inner, earSpec.inner === "fur" ? fur : padMaterial(coat.inner)));
                if (earSpec.inner === "fur") paintGeometry(g.inner, paint, (_k, p) => ({ p: p.clone().add(earBase[i]), region: "ear", t: 0.3, side, inner: 1 }));
            }
            if (g.tufts) {
                paintEar(g.tufts, 1);
                ear.add(new THREE.Mesh(g.tufts, fur));
            }
            bone.add(ear);
            earMeshes.push(ear);
            addPart("ears", ear);
            earTips.push(new THREE.Vector3(0, len, -(earSpec.shape.bend ?? 0)).applyMatrix4(rot).add(earBase[i]));
        }
    }

    // ── Rep ──
    if (spec.tail) {
        const t = tailGeometry(rig, tailBase, spec.tail, paint, quality, coat.mane ?? []);
        for (const g of t.fur) addPart("tail", addSkinned(g, fur, "rep"));
        for (const lock of t.locks) {
            const n = lock.geometry.getAttribute("position").count;
            if (!lock.geometry.getAttribute("color")) {
                const arr = new Float32Array(n * 3);
                const c = col(lock.color);
                const dark = c.clone().multiplyScalar(0.75);
                const uv = lock.geometry.getAttribute("uv");
                for (let k = 0; k < n; k++) {
                    const tt = clamp01(uv.getY(k) * FUR_TILE / 0.3);
                    const cc = dark.clone().lerp(c, smoothstep(0, 0.3, tt));
                    arr.set([cc.r, cc.g, cc.b], k * 3);
                }
                lock.geometry.setAttribute("color", new THREE.BufferAttribute(arr, 3));
            }
            addPart("tail", addSkinned(lock.geometry, furMaterial({ sheen: lock.color, shimmer: coat.shimmer }), "rep-pramen"));
        }
    }

    for (const mesh of skinned) {
        mesh.bind(rig.skeleton);
        mesh.frustumCulled = false;
        root.add(mesh);
    }

    // ── Sidra ──
    const anchors = computeAnchors(shape, rig, head, headBone, face, earSpec?.kind ?? "none", earBase, earTips, earSpec, horn, spec, handRadius, grip, tailBase, tailPathPts);

    // ── Pokreti repa i ušiju ──
    const tailBones = ["tail1", "tail2", "tail3"].map((n) => rig.bones.find((b) => b.name === n)).filter(Boolean) as THREE.Bone[];
    const earBones = ["earL", "earR"].map((n) => rig.bones.find((b) => b.name === n)).filter(Boolean) as THREE.Bone[];
    const motion = spec.tail?.motion ?? "sway";
    const earMotion = spec.earMotion ?? (earSpec?.kind === "floppy" ? "swing" : "twitch");
    const phase = Math.random() * 10;
    const animate = (time: number, dt: number, live: boolean) => {
        if (!live) {
            for (const b of [...tailBones, ...earBones]) b.rotation.set(0, 0, 0);
            for (const fn of animators) fn(time, dt, false);
            return;
        }
        const t = time + phase;
        if (tailBones.length && motion !== "none") {
            const [speed, amp] = motion === "wag" ? [5.2, 0.26] : motion === "flick" ? [1.4, 0.16] : [1.1, 0.2];
            // Mašenje u talasu: vrh kasni za korenom
            tailBones.forEach((b, i) => {
                b.rotation.y = Math.sin(t * speed - i * 0.7) * amp * (0.6 + i * 0.35);
                b.rotation.z = Math.sin(t * speed * 0.55 - i * 0.5) * amp * 0.25;
                if (motion === "flick" && i === 2) b.rotation.x = Math.max(0, Math.sin(t * 0.9) - 0.7) * 1.2;
            });
        }
        if (earBones.length && earMotion !== "none") {
            earBones.forEach((b, i) => {
                const side = i === 0 ? 1 : -1;
                if (earMotion === "swing") {
                    b.rotation.z = side * Math.sin(t * 1.3 + i) * 0.05;
                    b.rotation.x = Math.sin(t * 0.9 + i * 0.5) * 0.04;
                } else {
                    // Kratko trzanje jednog uha s vremena na vreme
                    const twitch = Math.max(0, Math.sin(t * 0.8 + i * 2.1) - 0.965) * 28;
                    b.rotation.x = -twitch * 0.12;
                    b.rotation.z = side * (Math.sin(t * 0.6 + i) * 0.03 - twitch * 0.06);
                }
            });
        }
        for (const fn of animators) fn(time, dt, true);
    };

    const body: FigureBody = {
        kind: spec.kind,
        proportion: "animal",
        shape,
        rig,
        anchors,
        head: { center: head.center.clone(), point: head.point, normal: head.normal },
        root,
        tone: coat.fur,
        parts,
        face: face.control,
        animate,
        dispose: () => {
            root.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (mesh.isMesh) mesh.geometry.dispose();
            });
        },
    };
    return body;
}

function computeAnchors(
    shape: BodyShape, rig: Rig, head: AnimalHead, headBone: THREE.Vector3,
    face: ReturnType<typeof buildFace>, earKind: EarKind, earBase: THREE.Vector3[], earTips: THREE.Vector3[], earSpec: EarSpec | undefined,
    horn: Anchors["horn"], spec: AnimalSpec, handRadius: number, grip: THREE.Vector3, tailBase: THREE.Vector3, tailPts: THREE.Vector3[],
): Anchors {
    const toBody = (p: THREE.Vector3) => p.clone().add(headBone);
    const center = toBody(head.center);
    const top = toBody(head.point(0.5, 0));
    const { w, h, d } = shape.head;
    // Obim glave na visini čela: tačke površine na toj visini oko glave
    const brimY = center.y + (h / 2) * 0.42;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < 32; i++) {
        const u = i / 32;
        let lo = 0;
        let hiV = 0.5;
        for (let k = 0; k < 24; k++) {
            const mid = (lo + hiV) / 2;
            if (head.point(u, mid).y + headBone.y > brimY) lo = mid;
            else hiV = mid;
        }
        const p = head.point(u, (lo + hiV) / 2);
        sum += Math.hypot(p.x - head.center.x, p.z - head.center.z);
        n++;
    }
    const brimR = sum / n;
    const eyeV = head.spec.eye.v;
    const front = head.point(0.5, eyeV).z + headBone.z;
    const leftJ = rig.left;
    const rightJ = rig.right;
    const ankleL = leftJ.ankle.clone();
    const ankleR = rightJ.ankle.clone();
    const toe = (a: THREE.Vector3) => a.clone().add(new THREE.Vector3(0, -shape.ankleY + shape.foot.h * 0.35, shape.foot.len - shape.foot.back));
    const backY = (shape.shoulderY + shape.chestY) / 2;
    const backPoint = torsoPoint(shape, Math.PI, backY, 0, new THREE.Vector3());
    const earR = earSpec ? earSpec.shape.width / 2 : 0;
    const neckY0 = shape.shoulderY - 0.005;
    const neckY1 = shape.neckBaseY + 0.018;
    const tail = tailPts.length > 1 ? { base: tailBase.clone(), dir: tailPts[1].clone().sub(tailPts[0]).normalize() } : undefined;
    const height = shape.height;
    const petScale = height / 1.19;
    return {
        ground: new THREE.Vector3(0, 0, 0),
        height,
        head: { center, top, radius: Math.max(w, h, d) / 2, w, h, d, front, brimY, brimR },
        ears: {
            kind: earKind,
            left: earBase[0]?.clone() ?? center.clone().add(new THREE.Vector3(w / 2, 0, 0)),
            right: earBase[1]?.clone() ?? center.clone().add(new THREE.Vector3(-w / 2, 0, 0)),
            tipL: earTips[0]?.clone() ?? center.clone().add(new THREE.Vector3(w / 2, 0, 0)),
            tipR: earTips[1]?.clone() ?? center.clone().add(new THREE.Vector3(-w / 2, 0, 0)),
            radius: earR,
        },
        horn,
        eyes: { left: toBody(face.eyes[0]), right: toBody(face.eyes[1]), radius: face.eyeR, front: face.eyeFront + headBone.z },
        nose: { bridge: toBody(face.bridge), tip: toBody(face.noseTip), snout: Math.max(0, face.noseTip.z - (head.point(0.5, eyeV).z)) },
        mouth: toBody(face.mouth),
        neck: { center: new THREE.Vector3(0, (neckY0 + neckY1) / 2, 0), radius: shape.neckR + 0.004, y0: neckY0, y1: neckY1 },
        torso: {
            shoulderY: shape.shoulderY,
            chestY: shape.chestY,
            waistY: shape.waistY,
            hipY: shape.hipY,
            crotchY: shape.crotchY,
            chest: { w: shape.torsoW(shape.chestY), front: shape.torsoFront(shape.chestY), back: shape.torsoBack(shape.chestY) },
            waist: { w: shape.torsoW(shape.waistY), front: shape.torsoFront(shape.waistY), back: shape.torsoBack(shape.waistY) },
        },
        shoulders: { left: leftJ.shoulder.clone(), right: rightJ.shoulder.clone() },
        arms: { upper: shape.upperArm, fore: shape.forearm, radius: shape.armR(0), wristRadius: shape.armR(1) },
        hips: { left: leftJ.hip.clone(), right: rightJ.hip.clone() },
        legs: { thigh: shape.thigh, shin: shape.shin, radius: shape.legR(0), ankleRadius: shape.legR(1) },
        hands: { kind: spec.hands, left: leftJ.wrist.clone(), right: rightJ.wrist.clone(), radius: handRadius, grip },
        feet: { kind: spec.feet, left: ankleL, right: ankleR, toeL: toe(ankleL), toeR: toe(ankleR), len: shape.foot.len, w: shape.foot.w, h: shape.foot.h },
        back: {
            center: backPoint,
            normal: new THREE.Vector3(0, 0, -1),
            width: shape.torsoW(backY) * 1.8,
            height: shape.shoulderY - shape.waistY,
            capeTop: new THREE.Vector3(0, shape.neckBaseY, -shape.torsoBack(shape.neckBaseY)),
        },
        tail,
        petSpot: new THREE.Vector3(-(shape.torsoW(shape.waistY) + 0.3), 0, 0.12),
        petScale,
    };
}

/** Registracija vrste: ugovorni CompanionBuilder iz opisa */
export function companionFrom(spec: AnimalSpec): CompanionBuilder {
    return {
        kind: spec.kind,
        skins: spec.skins,
        build: (look, ctx) => buildAnimal(spec, look, ctx),
    };
}

export type { Side };
