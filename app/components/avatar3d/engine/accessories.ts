// Obuća (kruto na kostima stopala, sare čizama prate list), kape i hidžab (na kosti
// glave; hidžab se spušta preko vrata i ramena i prati telo), naočare i ranac.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Item3D, Swatch } from "../catalog";
import { footFn, torsoPoint } from "./body";
import { hairCrown } from "./hair";
import { Kit, SIDES, type GarmentContext, type Side } from "./kit";
import { fabricMaterial, gemMaterial, glossyMaterial, leatherMaterial, lensMaterial, metalMaterial, skinMaterial } from "./materials";
import { torsoWeights, youthOf, type BodyShape } from "./rig";
import { buildSurface, polyPath, ringTube, smoothstep, taperedTube, type SurfaceFn } from "./surface";

const gauss = (x: number, mu: number, s: number) => Math.exp(-((x - mu) ** 2) / (2 * s * s));

export function buildAccessory(kit: Kit<GarmentContext>, item: Item3D, sw: Swatch) {
    switch (item.id) {
        case "patike":
            for (const side of SIDES) sneaker(kit, side, sw);
            break;
        case "cizme":
            for (const side of SIDES) boot(kit, side, sw);
            break;
        case "sandale":
            for (const side of SIDES) sandal(kit, side, sw);
            break;
        case "papuce":
            for (const side of SIDES) slipper(kit, side, sw);
            break;
        case "hidzab":
            hijab(kit, sw);
            break;
        case "kacket":
            cap(kit, sw);
            break;
        case "kapa":
            beanie(kit, sw);
            break;
        case "kruna":
            crown(kit, sw);
            break;
        case "okrugle-naocare":
            glasses(kit, sw, "round");
            break;
        case "suncane-naocare":
            glasses(kit, sw, "sun");
            break;
        case "ranac":
            backpack(kit, sw);
            break;
    }
}

// ── Obuća ─────────────────────────────────────────────────────────────────────

const footBone = (side: Side) => (side === 1 ? "footL" : "footR");

/** Đon: zaobljena ploča oblika stopala (superelipsoid), pod je na y = −ankleY */
function soleFn(shape: BodyShape, grow: number, height: number, toeLift = 0): SurfaceFn {
    const { len, w, back } = shape.foot;
    const floorY = -shape.ankleY;
    const zc = len / 2 - back;
    const e = 0.22;
    return (u, v, out) => {
        const th = u * Math.PI * 2;
        const ph = v * Math.PI;
        const sp = Math.sin(ph);
        const cp = Math.cos(ph);
        const hs = Math.sign(sp) * Math.pow(Math.abs(sp), e);
        const vs = Math.sign(cp) * Math.pow(Math.abs(cp), e);
        const dx = Math.sin(th);
        const dz = Math.cos(th);
        const ex = Math.sign(dx) * Math.pow(Math.abs(dx), 0.85);
        const ez = Math.sign(dz) * Math.pow(Math.abs(dz), 0.85);
        const width = (w / 2) * (0.82 + 0.2 * gauss(ez, 0.45, 0.45)) + grow;
        const lift = toeLift * smoothstep(0.55, 1, ez) * (vs > 0 ? 1 : 0.3);
        const y = floorY + height / 2 + (vs * height) / 2 + lift * Math.max(0, vs);
        return out.set(ex * width * hs, y, zc + ez * (len / 2 + grow) * hs);
    };
}

function addFoot(kit: Kit<GarmentContext>, side: Side, geometry: THREE.BufferGeometry, material: THREE.Material, mirror = true): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    if (mirror && side === -1) {
        mesh.scale.x = -1;
    }
    kit.rigid(footBone(side), mesh);
    return mesh;
}

/** Tačka na gornjištu (footFn) za ugao th (0 = napred) i polarni ugao ph od vrha */
function upperPoint(fn: SurfaceFn, th: number, ph: number, lift: number, out = new THREE.Vector3()): THREE.Vector3 {
    fn((((th / (Math.PI * 2)) % 1) + 1) % 1, ph / Math.PI, out);
    const n = new THREE.Vector3(out.x, out.y + 0.02, out.z - 0.03).normalize();
    return out.addScaledVector(n, lift);
}

function sneaker(kit: Kit<GarmentContext>, side: Side, sw: Swatch) {
    const shape = kit.shape;
    const accent = sw.accent ?? "#4C8DDB";
    const rubber = glossyMaterial("#F7F7F5", 0.55, 0.2);
    const upperMat = fabricMaterial(sw.hex, "cotton", { roughness: 0.6, sheen: 0.4, normalScale: 0.3 });
    const accentMat = fabricMaterial(accent, "cotton", { roughness: 0.5, sheen: 0.3 });
    const sole = soleFn(shape, 0.012, 0.026, 0.012);
    addFoot(kit, side, buildSurface(sole, { nu: 48, nv: 16, closedU: true }), rubber, false);
    // Traka u boji oko đona
    const stripe = ringTube((q, out) => sole(q, 0.5, out), () => [0.0018, 0.0035], 64, 6);
    addFoot(kit, side, stripe, accentMat, false);
    const upper = footFn(shape, 0.0105, 0.016);
    addFoot(kit, side, buildSurface(upper, { nu: 48, nv: 28, closedU: true, uv: (u, v) => [u * 2, v] }), upperMat, false);
    // Okovratnik oko članka
    const collar = new THREE.Mesh(new THREE.TorusGeometry(shape.legR(1) + 0.008, 0.0065, 10, 32), accentMat);
    collar.rotation.x = Math.PI / 2 + 0.18;
    collar.scale.set(1, 1.12, 1);
    collar.position.set(0, 0.004, -0.004);
    kit.rigid(footBone(side), collar);
    // Jezik
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), upperMat);
    tongue.scale.set(0.017, 0.022, 0.005);
    tongue.position.set(0, 0.008, shape.legR(1) + 0.008);
    tongue.rotation.x = -0.35;
    kit.rigid(footBone(side), tongue);
    // Pertle preko risa
    const lace = glossyMaterial("#FFFFFF", 0.7, 0);
    for (let i = 0; i < 4; i++) {
        const ph = 0.42 + i * 0.19;
        const pts: THREE.Vector3[] = [];
        for (let k = 0; k <= 4; k++) pts.push(upperPoint(upper, -0.62 + (k / 4) * 1.24, ph, 0.002));
        addFoot(kit, side, taperedTube(polyPath(pts), () => 0.0019, 16, 6), lace, false);
    }
    // Bočna talasasta traka (bez ičijeg znaka)
    for (const outer of [1, -1]) {
        const pts: THREE.Vector3[] = [];
        for (let k = 0; k <= 8; k++) {
            const t = k / 8;
            const th = outer * (Math.PI * (0.3 + 0.55 * t));
            pts.push(upperPoint(upper, th, 1.22 - 0.22 * Math.sin(t * Math.PI), 0.0008));
        }
        addFoot(kit, side, taperedTube(polyPath(pts), (s) => 0.0032 * (0.6 + 0.4 * Math.sin(s * Math.PI)), 32, 6, undefined, 0.35), accentMat, false);
    }
    // Jezičak na peti
    const tab = new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.02, 0.006, 2, 0.003), accentMat);
    tab.position.set(0, 0.006, -shape.foot.back - 0.004);
    tab.rotation.x = 0.25;
    kit.rigid(footBone(side), tab);
}

function boot(kit: Kit<GarmentContext>, side: Side, sw: Swatch) {
    const shape = kit.shape;
    const rubberBoot = sw.id === "zute";
    const main = rubberBoot ? glossyMaterial(sw.hex, 0.3, 0.7) : leatherMaterial(sw.hex);
    const soleMat = glossyMaterial(sw.accent ?? "#2A2020", 0.7, 0.1);
    const sole = soleFn(shape, 0.01, 0.024, 0.006);
    addFoot(kit, side, buildSurface(sole, { nu: 48, nv: 16, closedU: true }), soleMat, false);
    const upper = footFn(shape, 0.01, 0.016);
    addFoot(kit, side, buildSurface(upper, { nu: 48, nv: 28, closedU: true }), main, false);
    // Sara do pola lista; prati nogu (SkinnedMesh)
    const shaft = (t: number) => 0.016 + 0.004 * smoothstep(0.9, 0.7, t);
    kit.leg(side, 0.68, 1, 0.0, main, shaft);
    kit.legRing(side, 0.68, 0.019, 0.005, 0.012, rubberBoot ? main : leatherMaterial(new THREE.Color(sw.hex).multiplyScalar(0.75).getStyle()));
    if (!rubberBoot) {
        // Kaiš sa kopčom na sari
        kit.legRing(side, 0.86, 0.017, 0.003, 0.008, leatherMaterial(new THREE.Color(sw.hex).multiplyScalar(0.7).getStyle()));
    }
}

function sandal(kit: Kit<GarmentContext>, side: Side, sw: Swatch) {
    const shape = kit.shape;
    const strap = leatherMaterial(sw.hex);
    const soleMat = fabricMaterial(sw.accent ?? "#E9DCC6", "felt", { roughness: 0.85, sheen: 0.2 });
    const sole = soleFn(shape, 0.007, 0.012);
    addFoot(kit, side, buildSurface(sole, { nu: 48, nv: 14, closedU: true }), soleMat, false);
    const foot = footFn(shape, 0.0025, 0);
    // Kaiševi preko prstiju i preko risa
    for (const ph of [1.0, 0.62]) {
        const pts: THREE.Vector3[] = [];
        for (let k = 0; k <= 6; k++) {
            const th = -1.45 + (k / 6) * 2.9;
            pts.push(upperPoint(foot, th, ph + 0.35 * Math.pow(Math.abs(th) / 1.45, 2), 0.0015));
        }
        addFoot(kit, side, taperedTube(polyPath(pts), () => 0.0045, 24, 6, undefined, 0.45), strap, false);
    }
    // Kaiš oko članka i petni kaiš
    const ankle = new THREE.Mesh(new THREE.TorusGeometry(shape.legR(1) + 0.004, 0.0035, 8, 32), strap);
    ankle.rotation.x = Math.PI / 2;
    ankle.position.set(0, 0.006, -0.002);
    kit.rigid(footBone(side), ankle);
    const heel = taperedTube(polyPath([new THREE.Vector3(0, -shape.ankleY + 0.012, -shape.foot.back - 0.004), new THREE.Vector3(0, -shape.ankleY * 0.45, -shape.foot.back - 0.006), new THREE.Vector3(0, 0.004, -shape.legR(1) - 0.004)]), () => 0.004, 12, 6, undefined, 0.45);
    addFoot(kit, side, heel, strap, false);
    const buckle = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0015, 6, 4), metalMaterial("#D8C080"));
    buckle.position.set(side * (shape.legR(1) + 0.006), 0.006, 0.004);
    buckle.rotation.y = Math.PI / 2;
    kit.rigid(footBone(side), buckle);
    // Prsti (vide se u sandalama)
    const skin = skinMaterial(kit.ctx.skin);
    for (let i = 0; i < 5; i++) {
        const th = side * (-0.5 + i * 0.25);
        const p = upperPoint(footFn(shape, 0, 0), th * -1, 1.12, -0.004);
        const toe = new THREE.Mesh(new THREE.SphereGeometry(i === 0 ? 0.0085 : 0.007 - i * 0.0004, 12, 8), skin);
        toe.scale.set(1, 0.8, 1.1);
        toe.position.copy(p);
        kit.rigid(footBone(side), toe);
    }
}

function slipper(kit: Kit<GarmentContext>, side: Side, sw: Swatch) {
    const shape = kit.shape;
    const plush = fabricMaterial(sw.hex, "fleece", { sheen: 1, sheenLift: 0.55, roughness: 0.9, normalScale: 0.8 });
    const fluff = fabricMaterial(sw.accent ?? "#FFFFFF", "fleece", { sheen: 1, sheenLift: 0.6, roughness: 0.95, normalScale: 1 });
    const sole = soleFn(shape, 0.012, 0.014);
    addFoot(kit, side, buildSurface(sole, { nu: 48, nv: 14, closedU: true }), fabricMaterial("#CFCBC6", "felt"), false);
    const upper = footFn(shape, 0.014, 0.018);
    addFoot(kit, side, buildSurface(upper, { nu: 48, nv: 28, closedU: true }), plush, false);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(shape.legR(1) + 0.012, 0.009, 12, 32), fluff);
    collar.rotation.x = Math.PI / 2 + 0.12;
    collar.position.set(0, 0.006, -0.002);
    kit.rigid(footBone(side), collar);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.016, 20, 14), fluff);
    pom.position.copy(upperPoint(upper, 0, 0.8, 0.01));
    kit.rigid(footBone(side), pom);
}

// ── Na glavi ──────────────────────────────────────────────────────────────────

const thetaOf = (u: number) => (u - 0.5) * Math.PI * 2;

/** Hidžab: tkanina uokviruje lice (čelo, obrazi, brada), pokriva kosu, uši i vrat i pada preko ramena */
function hijab(kit: Kit<GarmentContext>, sw: Swatch) {
    const { head, rig, look } = kit.ctx;
    const shape = rig.shape;
    const cloth = fabricMaterial(sw.hex, "cotton", { roughness: 0.7, sheen: 0.8, sheenLift: 0.3, normalScale: 0.3, side: THREE.DoubleSide });
    const child = youthOf(shape.kind) > 0.5;
    // Otvor za lice: elipsa u (θ, v)
    const tw = child ? 1.1 : 1.04;
    const vc = 0.6;
    const vh = child ? 0.292 : 0.3;
    const open = (u: number, v: number) => {
        const th = thetaOf(u);
        const dv = v - vc;
        // Ispod brade otvor je uži (tkanina se skuplja ispod brade)
        const k = dv > 0 ? 1 + dv * 1.2 : 1;
        return Math.pow(th / (tw / k), 2) + Math.pow(dv / vh, 2);
    };
    const thick = (u: number, v: number) => {
        const th = thetaOf(u);
        return 0.026 + 0.009 * gauss(Math.abs(th), Math.PI, 0.9) * gauss(v, 0.4, 0.16) + 0.004 * (1 - smoothstep(0.1, 0.4, v));
    };
    const offset = (u: number, v: number) => {
        const f = open(u, v);
        const k = smoothstep(1.0, 1.16, f);
        return -0.006 + (thick(u, v) + 0.006) * k;
    };
    const maxV = 0.93;
    const shell = head.offsetFn(offset);
    const shellGeo = buildSurface((u, v, out) => shell(u, v * maxV, out), { nu: 112, nv: 84, closedU: true, inside: () => head.center.clone(), uv: (u, v) => [u * 2.2, v * 1.4] });
    kit.rigid("head", new THREE.Mesh(shellGeo, cloth));
    // Rub oko lica: blago uvijena ivica tkanine
    const rim: THREE.Vector3[] = [];
    const n = new THREE.Vector3();
    for (let i = 0; i <= 80; i++) {
        const ang = (i / 80) * Math.PI * 2;
        // Kontura f = 1,08 u (θ, v)
        let th = Math.cos(ang) * tw * 1.04;
        let v = vc - Math.sin(ang) * vh * 1.04;
        const dv = v - vc;
        if (dv > 0) th /= 1 + dv * 1.2;
        v = Math.min(maxV, v);
        th = Math.max(-Math.PI, Math.min(Math.PI, th));
        const u = th / (Math.PI * 2) + 0.5;
        const p = head.point(u, v);
        head.normal(u, v, n);
        rim.push(p.addScaledVector(n, thick(u, v) * 0.55));
    }
    const rimGeo = taperedTube(polyPath(rim), () => 0.0062, 160, 10);
    kit.rigid("head", new THREE.Mesh(rimGeo, cloth));

    // Deo preko vrata i ramena (prati telo): od brade koso do ramena, napred niže
    const outer = look.wear.long?.id === "dugi-kaput" ? 0.046 : look.wear.long ? 0.03 : look.wear.top?.id === "duks" ? 0.032 : 0.024;
    const hb = shape.headBoneY;
    const c = head.center;
    const yTop = hb + c.y - shape.head.h * 0.47;
    const yShoulder = shape.shoulderY + 0.004;
    const frontHem = shape.chestY - 0.005;
    const backHem = shape.chestY + 0.01;
    const sideHem = shape.shoulderY - 0.012;
    const hemY = (a: number) => {
        const f = Math.pow(Math.abs(Math.cos(a)), 0.8);
        return Math.cos(a) > 0 ? sideHem + (frontHem - sideHem) * f : sideHem + (backHem - sideHem) * f;
    };
    const top = new THREE.Vector3();
    const env = new THREE.Vector3();
    const sh = new THREE.Vector3();
    // Presek ispod brade (glava + tkanina): elipsa ispred brade i iza potiljka
    const chinFront = c.z + shape.head.d * 0.19;
    const headBack = shape.head.d * 0.3 - c.z;
    const topHalf = shape.head.w * 0.36;
    const drape: SurfaceFn = (u, t, out) => {
        const a = u * Math.PI * 2;
        const y = yTop + (hemY(a) - yTop) * t;
        const sa = Math.sin(a);
        const ca = Math.cos(a);
        top.set(sa * topHalf, yTop, ca > 0 ? ca * chinFront : ca * headBack);
        torsoPoint(shape, a, yShoulder, outer, sh);
        const k = smoothstep(yTop, yShoulder, y);
        const cone = top.clone().lerp(sh, Math.pow(k, 0.85));
        if (y < shape.neckBaseY + 0.04) torsoPoint(shape, a, Math.min(y, shape.neckBaseY + 0.04), outer, env);
        else env.set(0, y, 0);
        const r = Math.max(Math.hypot(cone.x, cone.z), Math.hypot(env.x, env.z)) + 0.004 * t * Math.sin(a * 11) + 0.003 * Math.sin(a * 5) * t;
        const ang = Math.atan2(cone.x, cone.z);
        return out.set(Math.sin(ang) * r, y, Math.cos(ang) * r);
    };
    const drapeGeo = buildSurface(drape, {
        nu: 96,
        nv: 36,
        closedU: true,
        inside: (_u, t, out) => out.set(0, yTop + (shape.chestY - yTop) * t, 0),
        weights: (_u, _v, p) => torsoWeights(shape, p),
        uv: (u, v) => [u * 2.4, v * 0.6],
    });
    kit.skinned(drapeGeo, cloth, "hidzab");
    const hem = ringTube((q, out) => drape(q, 1, out), () => [0.0035, 0.004], 96, 6, (_u, _v, p) => torsoWeights(shape, p));
    kit.skinned(hem, cloth, "porub-hidzaba");
}

/** Kupola kape po glavi: v od temena do ivice edge(θ), pomerena za `lift` iznad glave */
function domeFn(kit: Kit<GarmentContext>, edge: (th: number) => number, lift: (u: number, w: number) => number): SurfaceFn {
    const head = kit.ctx.head;
    const n = new THREE.Vector3();
    return (u, w, out) => {
        const v = w * edge(thetaOf(u));
        head.point(u, v, out);
        head.normal(u, v, n);
        return out.addScaledVector(n, lift(u, w));
    };
}

function cap(kit: Kit<GarmentContext>, sw: Swatch) {
    const { head, look } = kit.ctx;
    const crownT = hairCrown(look.hair, true) + 0.006;
    const main = fabricMaterial(sw.hex, "cotton", { roughness: 0.7, side: THREE.DoubleSide });
    const accent = fabricMaterial(sw.accent ?? "#FFFFFF", "cotton");
    const edge = (th: number) => 0.335 + 0.13 * Math.pow((1 - Math.cos(th)) / 2, 1.2);
    const dome = domeFn(kit, edge, (_u, w) => crownT + 0.004 * (1 - w) + 0.002);
    kit.rigid("head", new THREE.Mesh(buildSurface(dome, { nu: 72, nv: 24, closedU: true, inside: () => head.center.clone(), uv: (u, v) => [u * 3, v] }), main));
    // Šavovi panela i dugme na vrhu
    const seam = fabricMaterial(new THREE.Color(sw.hex).multiplyScalar(0.7).getStyle(), "cotton");
    for (let i = 0; i < 6; i++) {
        const u = i / 6;
        const pts: THREE.Vector3[] = [];
        for (let k = 1; k <= 10; k++) pts.push(dome(u, (k / 10) * 0.98, new THREE.Vector3()));
        kit.rigid("head", new THREE.Mesh(taperedTube(polyPath(pts), () => 0.0012, 20, 5), seam));
    }
    const top = dome(0.5, 0, new THREE.Vector3());
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.008, 14, 10), main);
    button.scale.set(1, 0.6, 1);
    button.position.copy(top);
    kit.rigid("head", button);
    // Traka po ivici
    kit.rigid("head", new THREE.Mesh(ringTube((q, out) => dome(q, 1, out), () => [0.003, 0.005], 72, 6), main));
    // Šilt: zakrivljen napred i blago nadole
    const visor: SurfaceFn = (s, r, out) => {
        const across = s * 2 - 1;
        const th = across * 1.0;
        const u = th / (Math.PI * 2) + 0.5;
        const base = dome(u, 1, new THREE.Vector3());
        const outward = new THREE.Vector3(base.x - head.center.x, 0, base.z - head.center.z).normalize();
        const fwd = new THREE.Vector3(0, 0, 1).lerp(outward, 0.45).normalize();
        const len = 0.082 * Math.sqrt(Math.max(0, 1 - across * across * 0.82));
        return out.copy(base).addScaledVector(fwd, r * len).add(new THREE.Vector3(0, -0.012 * r - 0.016 * across * across * r, 0));
    };
    kit.rigid("head", new THREE.Mesh(buildSurface(visor, { nu: 24, nv: 8, inside: () => head.center.clone().add(new THREE.Vector3(0, 0.1, 0)) }), main));
    const visorUnder = buildSurface((s, r, out) => visor(s, r, out).add(new THREE.Vector3(0, -0.003, 0)), { nu: 24, nv: 8, inside: () => head.center.clone().add(new THREE.Vector3(0, 0.1, 0)) });
    kit.rigid("head", new THREE.Mesh(visorUnder, accent));
    const rimPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) rimPts.push(visor(i / 24, 1, new THREE.Vector3()).add(new THREE.Vector3(0, -0.0015, 0)));
    kit.rigid("head", new THREE.Mesh(taperedTube(polyPath(rimPts), () => 0.0022, 48, 6), main));
}

function beanie(kit: Kit<GarmentContext>, sw: Swatch) {
    const { head, look } = kit.ctx;
    const crownT = hairCrown(look.hair, true) + 0.007;
    const knit = fabricMaterial(sw.hex, "knit", { sheen: 0.9, normalScale: 0.6, side: THREE.DoubleSide });
    const rib = fabricMaterial(sw.hex, "rib", { normalScale: 1 });
    const edge = (th: number) => 0.4 + 0.2 * Math.pow((1 - Math.cos(th)) / 2, 1.1);
    const dome = domeFn(kit, edge, (u, w) => crownT + 0.006 * (1 - w) + 0.0015 * Math.sin(thetaOf(u) * 9) * w);
    kit.rigid("head", new THREE.Mesh(buildSurface(dome, { nu: 80, nv: 28, closedU: true, inside: () => head.center.clone(), uv: (u, v) => [u * 2.2, v * 0.9] }), knit));
    // Podvijen rebrasti obod
    // Obod je zadebljan i zaobljen (podvijena ivica), bez oštrog prelaza
    const band = domeFn(kit, edge, (_u, w) => crownT + 0.0015 + 0.0065 * Math.sin(Math.min(1, Math.max(0, (w - 0.78) / 0.24)) * Math.PI * 0.85));
    const bandFn: SurfaceFn = (u, w, out) => band(u, 0.78 + w * 0.235, out);
    kit.rigid("head", new THREE.Mesh(buildSurface(bandFn, { nu: 80, nv: 8, closedU: true, inside: () => head.center.clone(), uv: (u, v) => [u * 1.2, v * 0.15] }), rib));
    // Pompon
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.034, 28, 20), fabricMaterial(sw.accent ?? "#FFFFFF", "fleece", { sheen: 1, sheenLift: 0.6, roughness: 0.95, normalScale: 1.4 }));
    pom.position.copy(dome(0.5, 0, new THREE.Vector3())).add(new THREE.Vector3(0, 0.026, 0));
    kit.rigid("head", pom);
}

function crown(kit: Kit<GarmentContext>, sw: Swatch) {
    const { head, look } = kit.ctx;
    const gold = metalMaterial(sw.hex);
    const gem = gemMaterial(sw.accent ?? "#E0455A");
    const crownT = hairCrown(look.hair, false) + 0.004;
    const vBand = 0.2;
    const band: SurfaceFn = (u, w, out) => {
        const v = vBand + (1 - w) * 0.03;
        const p = head.point(u, v, out);
        const n = head.normal(u, v);
        p.addScaledVector(n, crownT);
        const th = thetaOf(u);
        const spikes = Math.pow(Math.max(0, Math.cos(th * 5)), 3);
        return p.add(new THREE.Vector3(0, w * (0.026 + 0.03 * spikes), 0)).add(new THREE.Vector3(Math.sin(th) * w * 0.008, 0, Math.cos(th) * w * 0.008));
    };
    kit.rigid("head", new THREE.Mesh(buildSurface(band, { nu: 120, nv: 10, closedU: true, inside: () => head.center.clone().add(new THREE.Vector3(0, 0.12, 0)) }).translate(0, 0, 0), new THREE.MeshPhysicalMaterial({ color: sw.hex, metalness: 1, roughness: 0.3, side: THREE.DoubleSide })));
    kit.rigid("head", new THREE.Mesh(ringTube((q, out) => band(q, 0, out), () => [0.004, 0.004], 120, 6), gold));
    for (let i = 0; i < 5; i++) {
        const u = 0.5 + i / 5;
        const tip = band(u % 1, 1, new THREE.Vector3());
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 14, 10), gold);
        ball.position.copy(tip).add(new THREE.Vector3(0, 0.004, 0));
        kit.rigid("head", ball);
        const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.0072, 16, 10), gem);
        jewel.scale.set(1, 1.2, 0.6);
        const p = band(u % 1, 0.35, new THREE.Vector3());
        const outward = new THREE.Vector3(p.x - head.center.x, 0, p.z - head.center.z).normalize();
        jewel.position.copy(p).addScaledVector(outward, 0.003);
        jewel.lookAt(jewel.position.clone().add(outward));
        kit.rigid("head", jewel);
    }
}

// ── Naočare ───────────────────────────────────────────────────────────────────

function glasses(kit: Kit<GarmentContext>, sw: Swatch, kind: "round" | "sun") {
    const { head, look } = kit.ctx;
    const frame = glossyMaterial(sw.hex, 0.3, 0.8);
    const lens = kind === "sun" ? lensMaterial(sw.accent ?? "#30343C", 0.82) : lensMaterial("#E8F2FF", 0.14);
    const hijabOn = look.wear.head?.id === "hidzab";
    const re = head.eyeR;
    const n = new THREE.Vector3();
    const centers: THREE.Vector3[] = [];
    const w = kind === "sun" ? re * 1.28 : re * 1.2;
    const h = kind === "sun" ? re * 1.0 : re * 1.2;
    const e = kind === "sun" ? 3.2 : 2;
    for (const side of SIDES) {
        const u = 0.5 + side * head.eyeU * 1.02;
        const p = head.point(u, head.eyeV + 0.005);
        head.normal(u, head.eyeV, n);
        const c = p.addScaledVector(n, re * 0.62).add(new THREE.Vector3(0, 0, 0.004));
        centers.push(c);
        const loop = (q: number, out: THREE.Vector3) => {
            const a = q * Math.PI * 2;
            const ca = Math.cos(a);
            const sa = Math.sin(a);
            const x = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / e) * w;
            let y = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / e) * h;
            if (kind === "sun" && sa < 0) y *= 1 - 0.25 * Math.pow(Math.abs(ca), 2) * (Math.sign(ca) === side ? 1 : 0.4);
            return out.set(c.x + x, c.y + y, c.z - 0.006 * Math.pow(x / w, 2));
        };
        kit.rigid("head", new THREE.Mesh(ringTube(loop, () => (kind === "sun" ? [0.0042, 0.0042] : [0.0032, 0.0032]), 56, 8), frame));
        const lensGeo = buildSurface((q, r, out) => {
            loop(q, out);
            return out.lerp(c, 1 - r);
        }, { nu: 40, nv: 2, closedU: true, inside: () => c.clone().add(new THREE.Vector3(0, 0, -0.05)) });
        const lensMesh = new THREE.Mesh(lensGeo, lens);
        lensMesh.renderOrder = 3;
        kit.rigid("head", lensMesh);
        // Drška do uha (preko hidžaba ako ga ima)
        const lift = hijabOn ? 0.032 : 0.007;
        const outerEdge = loop(side === 1 ? 0 : 0.5, new THREE.Vector3());
        const temple = head.point(0.5 + side * 0.17, head.eyeV - 0.02);
        const ear = head.point(0.5 + side * 0.25, head.eyeV - 0.0);
        const behind = head.point(0.5 + side * 0.29, head.eyeV + 0.05);
        const pts = [outerEdge, temple.addScaledVector(head.normal(0.5 + side * 0.17, head.eyeV - 0.02), lift), ear.addScaledVector(head.normal(0.5 + side * 0.25, head.eyeV), lift + 0.004), behind.addScaledVector(head.normal(0.5 + side * 0.29, head.eyeV + 0.05), lift)];
        kit.rigid("head", new THREE.Mesh(taperedTube(polyPath(pts), () => 0.0026, 24, 6), frame));
    }
    // Most između stakala
    const [l, r] = centers;
    const bridge = [l.clone().add(new THREE.Vector3(-w * 0.98, h * 0.2, 0)), l.clone().lerp(r, 0.5).add(new THREE.Vector3(0, h * 0.42, 0.004)), r.clone().add(new THREE.Vector3(w * 0.98, h * 0.2, 0))];
    kit.rigid("head", new THREE.Mesh(taperedTube(polyPath(bridge), () => 0.0028, 16, 6), frame));
}

// ── Ranac ─────────────────────────────────────────────────────────────────────

function backpack(kit: Kit<GarmentContext>, sw: Swatch) {
    const s = kit.shape;
    const look = kit.ctx.look;
    const nylon = fabricMaterial(sw.hex, "cotton", { roughness: 0.55, sheen: 0.35, normalScale: 0.25 });
    const accent = fabricMaterial(sw.accent ?? "#F2C230", "cotton", { roughness: 0.5, sheen: 0.3 });
    const scale = s.height / 1.19;
    const under = look.wear.long ? 0.024 : look.wear.top?.id === "duks" ? 0.018 : 0.013;
    const bw = 0.17 * scale;
    const bh = 0.19 * scale;
    const bd = 0.07 * scale;
    const cy = s.chestY - 0.015 * scale;
    const backZ = -(s.torsoBack(cy) + under + 0.006);
    const body = new THREE.Mesh(new RoundedBoxGeometry(bw, bh, bd, 4, 0.028 * scale), nylon);
    const center = new THREE.Vector3(0, cy, backZ - bd / 2);
    body.position.copy(kit.toBone("chest", center));
    kit.rigid("chest", body);
    const pocket = new THREE.Mesh(new RoundedBoxGeometry(bw * 0.72, bh * 0.45, bd * 0.42, 3, 0.018 * scale), accent);
    pocket.position.copy(kit.toBone("chest", center.clone().add(new THREE.Vector3(0, -bh * 0.18, -bd / 2 - bd * 0.12))));
    kit.rigid("chest", pocket);
    // Patent-zatvarač preko vrha i na džepu
    const zip = glossyMaterial("#2A2A30", 0.4, 0.4);
    const arc: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const ang = Math.PI * t;
        arc.push(kit.toBone("chest", center.clone().add(new THREE.Vector3(-Math.cos(ang) * bw * 0.45, bh * 0.36 + Math.sin(ang) * bh * 0.13, -bd / 2 - 0.0005))));
    }
    kit.rigid("chest", new THREE.Mesh(taperedTube(polyPath(arc), () => 0.0022, 32, 6), zip));
    const pull = new THREE.Mesh(new RoundedBoxGeometry(0.007, 0.018, 0.004, 2, 0.0018), metalMaterial("#C9CCD3"));
    pull.position.copy(arc[11]).add(new THREE.Vector3(0, -0.01, -0.002));
    kit.rigid("chest", pull);
    // Kaiševi preko ramena
    const strapMat = fabricMaterial(new THREE.Color(sw.hex).multiplyScalar(0.75).getStyle(), "cotton", { roughness: 0.6 });
    const off = under + 0.004;
    for (const side of SIDES) {
        const shoulderTop = (() => {
            let y = s.shoulderY;
            while (y < s.neckBaseY && s.torsoW(y) > 0.075 * scale) y += 0.002;
            return y;
        })();
        const pts = [
            center.clone().add(new THREE.Vector3(side * bw * 0.28, bh * 0.38, bd / 2 - 0.004)),
            torsoPoint(s, side * (Math.PI - 0.55), s.shoulderY - 0.02, off, new THREE.Vector3()),
            new THREE.Vector3(side * 0.072 * scale, shoulderTop + off + 0.004, -0.004),
            torsoPoint(s, side * 0.62, s.shoulderY - 0.025, off, new THREE.Vector3()),
            torsoPoint(s, side * 0.78, s.chestY - 0.03, off, new THREE.Vector3()),
            torsoPoint(s, side * 1.35, s.waistY + 0.03, off, new THREE.Vector3()),
            center.clone().add(new THREE.Vector3(side * bw * 0.42, -bh * 0.38, bd / 2 - 0.004)),
        ].map((p) => kit.toBone("chest", p));
        const path = polyPath(pts);
        const normalAt = (t: number, out: THREE.Vector3) => {
            const p = path(t, new THREE.Vector3());
            out.set(p.x, 0, p.z).normalize();
            const top = smoothstep(0.2, 0.33, t) * smoothstep(0.48, 0.35, t);
            return out.lerp(new THREE.Vector3(0, 1, 0), top).normalize();
        };
        kit.rigid("chest", new THREE.Mesh(taperedTube(path, () => 0.011 * scale, 64, 8, normalAt, 0.28), strapMat));
    }
}
