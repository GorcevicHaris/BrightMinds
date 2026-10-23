// Odeća po mestima: gornji deo, donji deo i dugačko (haljina, kaput, abaja). Svaki
// predmet je skup ljuski koje prate telo (kit.ts) i detalja koji ga čine „pravim”:
// okovratnici, porubi, manžetne, džepovi, dugmad, štepovi, natpisi.
// Obuća, kape, hidžab, naočare i ranac su u accessories.ts.

import * as THREE from "three";
import type { Item3D, Swatch } from "../catalog";
import { buildAccessory } from "./accessories";
import { torsoPoint } from "./body";
import { Kit, SIDES, type GarmentContext, type Side } from "./kit";
import { fabricMaterial, glossyMaterial, metalMaterial, patternedFabric } from "./materials";
import { torsoWeights, type BoneName } from "./rig";
import { buildSurface, polyPath, smoothstep, taperedTube } from "./surface";
import { denimColor, plaid, printTexture, stripes } from "./textures";

export type { GarmentContext } from "./kit";

const gauss = (x: number, mu: number, s: number) => Math.exp(-((x - mu) ** 2) / (2 * s * s));

/** Debljina odeće po sloju (koliko je ljuska iznad kože) */
export const LAYER = { bottom: 0.0065, top: 0.0135, outer: 0.024 };

export function buildGarment(ctx: GarmentContext, item: Item3D, color: number): THREE.Object3D[] {
    const swatch = item.colors[color] ?? item.colors[0];
    const kit = new Kit(ctx);
    switch (item.id) {
        case "majica":
            tshirt(kit, swatch);
            break;
        case "majica-dugi-rukav":
            longSleeve(kit, swatch);
            break;
        case "duks":
            hoodie(kit, swatch);
            break;
        case "dzemper":
            sweater(kit, swatch);
            break;
        case "kosulja":
            shirt(kit, swatch);
            break;
        case "dres":
            jersey(kit, swatch);
            break;
        case "farmerke":
            jeans(kit, swatch);
            break;
        case "trenerka":
            joggers(kit, swatch);
            break;
        case "suknja":
            skirt(kit, swatch);
            break;
        case "sorc":
            shorts(kit, swatch);
            break;
        case "haljina":
            dress(kit, swatch);
            break;
        case "dugi-kaput":
            coat(kit, swatch);
            break;
        case "abaja":
            abaya(kit, swatch);
            break;
        default:
            buildAccessory(kit, item, swatch);
    }
    return kit.objects;
}

// ── Zajednički delovi ─────────────────────────────────────────────────────────

/** Okrugli izrez (napred malo niže) */
const crewNeck = (kit: Kit, drop = 0.012) => (a: number) => kit.shape.neckBaseY - 0.003 - drop * Math.pow(Math.max(0, Math.cos(a)), 2);

/** Mala dugmad (kruto na kosti trupa koja je najbliža) */
function button(kit: Kit, a: number, y: number, offset: number, material: THREE.Material, r = 0.0055) {
    const p = torsoPoint(kit.shape, a, y, offset, new THREE.Vector3());
    const q = torsoPoint(kit.shape, a, y, offset + 0.01, new THREE.Vector3());
    const geometry = new THREE.CylinderGeometry(r, r, 0.0028, 16);
    geometry.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material);
    const bone: BoneName = y > kit.shape.chestY - 0.05 ? "chest" : y > kit.shape.waistY - 0.04 ? "spine" : "hips";
    mesh.position.copy(kit.toBone(bone, p));
    // Kosti u mirovanju nemaju rotaciju, pa je smer u kosti isti kao u svetu
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), q.sub(p).normalize());
    kit.rigid(bone, mesh);
}

/** Šav ili štep: tanka cev preko površine trupa (tačke (a, y)) */
function torsoStitch(kit: Kit, points: [number, number][], offset: number, material: THREE.Material, r = 0.0011, bone: BoneName = "hips") {
    const world = points.map(([a, y]) => torsoPoint(kit.shape, a, y, offset, new THREE.Vector3()));
    const local = world.map((p) => kit.toBone(bone, p));
    kit.rigid(bone, new THREE.Mesh(taperedTube(polyPath(local), () => r, Math.max(12, points.length * 6), 5), material));
}

/** Okovratnik (košulja, kaput): preklopljen list od potiljka do vrha napred */
function collarFlap(kit: Kit, side: Side, material: THREE.Material, options: { offset: number; frontA: number; height: number; tip: number; frontDrop?: number; yNeck: (a: number) => number; lift?: number }) {
    const shape = kit.shape;
    const fn = (u: number, w: number, out: THREE.Vector3) => {
        const a = side * (Math.PI - u * (Math.PI - options.frontA));
        const drop = (options.frontDrop ?? 0) * Math.pow(u, 2.5);
        const y0 = options.yNeck(a) + 0.006 - drop;
        const h = options.height + options.tip * Math.pow(u, 4);
        // Gornji deo okovratnika stoji uz vrat, donji leži na ramenima
        const lift = (options.lift ?? 0.007) * (1 - w) * (1 - u * 0.6);
        return torsoPoint(shape, a, y0 - w * h, options.offset + 0.003 + lift + w * 0.002, out);
    };
    const geometry = buildSurface(fn, {
        nu: 28,
        nv: 6,
        inside: (u, w, out) => {
            fn(u, w, out);
            return out.set(0, out.y, 0);
        },
        weights: (_u, _v, p) => torsoWeights(shape, p),
        uv: (u, v) => [u * 0.3, v * 0.05],
    });
    kit.skinned(geometry, material, "okovratnik");
    // Ivica okovratnika (daje debljinu)
    const edge: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) edge.push(kit.toBone("chest", fn(i / 20, 1, new THREE.Vector3())));
    kit.rigid("chest", new THREE.Mesh(taperedTube(polyPath(edge), () => 0.0016, 40, 6), material));
}

function fabricSide(hex: string, kind: Parameters<typeof fabricMaterial>[1], options: Parameters<typeof fabricMaterial>[2] = {}) {
    return fabricMaterial(hex, kind, { side: THREE.DoubleSide, ...options });
}

// ── Gornji deo ────────────────────────────────────────────────────────────────

/** Majica kratkih rukava sa zvezdom na grudima */
function tshirt(kit: Kit, sw: Swatch) {
    const s = kit.shape;
    const cloth = fabricSide(sw.hex, "cotton");
    const rib = fabricMaterial(sw.hex, "rib");
    const off = LAYER.top;
    const neck = crewNeck(kit);
    const loose = (_a: number, y: number) => 0.006 * (1 - smoothstep(s.hipY, s.waistY, y));
    kit.torso(s.hipY - 0.012, neck, off, cloth, loose);
    kit.torsoRing(s.hipY - 0.012, off + 0.006, 0.0035, 0.006, cloth);
    kit.torsoRing(neck, off - 0.001, 0.0045, 0.0075, rib);
    for (const side of SIDES) {
        const flare = (t: number) => 0.007 * smoothstep(0.05, 0.3, t);
        kit.sleeve(side, 0, 0.3, off, cloth, flare);
        kit.armRing(side, 0.3, off + 0.007, 0.0032, 0.006, cloth);
    }
    const star = printTexture(`zvezda-${sw.accent}`, (ctx, w, h) => {
        ctx.translate(w / 2, h / 2);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? w * 0.42 : w * 0.19;
            const ang = -Math.PI / 2 + (i * Math.PI) / 5;
            ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
        }
        ctx.closePath();
        ctx.lineJoin = "round";
        ctx.fillStyle = sw.accent ?? "#FFFFFF";
        ctx.strokeStyle = sw.accent ?? "#FFFFFF";
        ctx.lineWidth = w * 0.06;
        ctx.stroke();
        ctx.fill();
    });
    const print = new THREE.MeshPhysicalMaterial({ map: star, transparent: true, roughness: 0.7, sheen: 0.3, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false, side: THREE.DoubleSide });
    kit.torsoPatch(-0.42, 0.42, s.chestY - 0.085, s.chestY + 0.02, off + 0.0012, print, { nu: 16, nv: 16 });
}

/** Majica dugih rukava na pruge */
function longSleeve(kit: Kit, sw: Swatch) {
    const s = kit.shape;
    const map = stripes(sw.hex, sw.accent ?? sw.hex);
    const cloth = patternedFabric(map, "cotton", "#FFFFFF", { side: THREE.DoubleSide });
    const rib = fabricMaterial(sw.accent ?? sw.hex, "rib");
    const off = LAYER.top;
    const neck = crewNeck(kit);
    const loose = (_a: number, y: number) => 0.005 * (1 - smoothstep(s.hipY, s.waistY, y));
    kit.torso(s.hipY - 0.015, neck, off, cloth, loose);
    kit.torsoRing(s.hipY - 0.015, off + 0.005, 0.0035, 0.006, cloth);
    kit.torsoRing(neck, off - 0.001, 0.0045, 0.008, rib);
    for (const side of SIDES) {
        kit.sleeve(side, 0, 0.95, off, cloth, (t) => 0.002 * Math.sin(t * Math.PI));
        kit.armRing(side, 0.95, off + 0.001, 0.004, 0.012, rib);
    }
}

/** Duks sa kapuljačom: rebrasti porub i manžetne, kengur-džep, pertle, kapuljača na leđima */
function hoodie(kit: Kit, sw: Swatch) {
    const s = kit.shape;
    const cloth = fabricSide(sw.hex, "fleece", { sheen: 1, sheenLift: 0.45 });
    const rib = fabricMaterial(sw.hex, "rib");
    const off = 0.014;
    const neck = crewNeck(kit, 0.008);
    const puff = (_a: number, y: number) => 0.003 + 0.003 * gauss(y, s.waistY, 0.06);
    const hem = s.hipY - 0.03;
    kit.torso(hem + 0.012, neck, off, cloth, puff);
    kit.torsoRing(hem + 0.012, off + 0.003, 0.0055, 0.014, rib);
    for (const side of SIDES) {
        const baggy = (t: number) => 0.004 + 0.004 * Math.sin(Math.min(1, t / 0.92) * Math.PI);
        kit.sleeve(side, 0, 0.9, off - 0.002, cloth, baggy);
        kit.armRing(side, 0.92, off - 0.004, 0.006, 0.016, rib);
    }
    // Kapuljača: debeo prsten oko vrata, najdeblji pozadi (spuštena kapuljača)
    const hoodLoop = (q: number, out: THREE.Vector3) => {
        const a = q * Math.PI * 2;
        const back = Math.max(0, -Math.cos(a));
        return torsoPoint(s, a, neck(a) - 0.004 - 0.02 * Math.pow(back, 1.5), off + 0.008 + 0.012 * Math.pow(back, 1.2), out);
    };
    const ringGeo = buildHoodRing(kit, hoodLoop);
    kit.skinned(ringGeo, cloth, "kapuljaca");
    // Kengur-džep: mekano ispupčenje sa kosim otvorima
    const pocketTop = s.waistY - 0.0;
    const pocketBot = hem + 0.03;
    kit.torsoPatch(-0.7, 0.7, pocketBot, pocketTop, off + puff(0, s.waistY) - 0.001, cloth, {
        puff: 0.005,
        soft: 0.1,
        shapeA: (v) => [-0.72 + v * 0.22, 0.72 - v * 0.22],
        nu: 28,
        nv: 14,
    });
    // Pertle: dve trake sa metalnim krajevima
    const string = glossyMaterial("#F4F4F2", 0.6, 0);
    const tip = metalMaterial("#C9CCD3");
    for (const side of SIDES) {
        const a = side * 0.22;
        const top = torsoPoint(s, a, neck(a) - 0.004, off + 0.006, new THREE.Vector3());
        const bottom = torsoPoint(s, a * 1.3, neck(a) - 0.085, off + 0.008, new THREE.Vector3());
        const mid = top.clone().lerp(bottom, 0.5).add(new THREE.Vector3(0, 0, 0.003));
        const pts = [top, mid, bottom].map((p) => kit.toBone("chest", p));
        kit.rigid("chest", new THREE.Mesh(taperedTube(polyPath(pts), () => 0.0022, 20, 6), string));
        const aglet = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.012, 10), tip);
        aglet.position.copy(kit.toBone("chest", bottom.clone().add(new THREE.Vector3(0, -0.005, 0))));
        kit.rigid("chest", aglet);
    }
}

function buildHoodRing(kit: Kit, loop: (q: number, out: THREE.Vector3) => THREE.Vector3): THREE.BufferGeometry {
    const center = new THREE.Vector3();
    const p = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const outward = new THREE.Vector3();
    const up = new THREE.Vector3();
    return buildSurface((u, v, out) => {
        const a = u * Math.PI * 2;
        const back = Math.max(0, -Math.cos(a));
        loop(u, p);
        loop((u + 0.002) % 1, p1);
        tangent.subVectors(p1, p).normalize();
        center.set(0, p.y, 0);
        outward.subVectors(p, center).setY(0).normalize();
        up.crossVectors(tangent, outward).normalize();
        if (up.y < 0) up.negate();
        const r1 = 0.007 + 0.016 * Math.pow(back, 1.3);
        const r2 = 0.01 + 0.03 * Math.pow(back, 1.1);
        const ang = v * Math.PI * 2;
        return out.copy(p).addScaledVector(outward, Math.cos(ang) * r1).addScaledVector(up, Math.sin(ang) * r2);
    }, {
        nu: 72,
        nv: 12,
        closedU: true,
        inside: (u, _v, out) => loop(u, out),
        weights: (_u, _v, q) => torsoWeights(kit.shape, q),
        uv: (u, v) => [u * 0.6, v * 0.1],
    });
}

/** Pleteni džemper sa pletenicama napred i rebrastim ivicama */
function sweater(kit: Kit, sw: Swatch) {
    const s = kit.shape;
    const cloth = fabricSide(sw.hex, "knit", { sheen: 0.9, sheenLift: 0.3, normalScale: 1 });
    const rib = fabricMaterial(sw.hex, "rib", { normalScale: 0.8 });
    const off = 0.0125;
    const neck = crewNeck(kit, 0.01);
    const cable = (a: number, y: number) => {
        if (Math.abs(a) > 1.25) return 0.001;
        const col = Math.pow(Math.max(0, Math.cos(a * 5.2)), 4);
        const twist = 0.5 + 0.5 * Math.sin(y * 150 + Math.sign(Math.sin(a * 5.2)) * 1.5);
        return 0.001 + 0.0035 * col * (0.55 + 0.45 * twist);
    };
    const hem = s.hipY - 0.02;
    kit.torso(hem + 0.012, neck, off, cloth, cable, 72);
    kit.torsoRing(hem + 0.012, off + 0.002, 0.005, 0.016, rib);
    kit.torsoRing(neck, off - 0.001, 0.006, 0.011, rib);
    for (const side of SIDES) {
        kit.sleeve(side, 0, 0.93, off - 0.002, cloth, (t) => 0.003 * Math.sin(t * Math.PI));
        kit.armRing(side, 0.94, off - 0.004, 0.005, 0.016, rib);
    }
}

/** Košulja na kocke: okovratnik, lajsna sa dugmadima, džep, manžetne */
function shirt(kit: Kit, sw: Swatch) {
    const s = kit.shape;
    const map = plaid(sw.hex, sw.accent ?? "#222222");
    const cloth = patternedFabric(map, "cotton", "#FFFFFF", { side: THREE.DoubleSide });
    const off = LAYER.top;
    const neck = (a: number) => s.neckBaseY - 0.002 - 0.016 * Math.pow(Math.max(0, Math.cos(a)), 6);
    const loose = (_a: number, y: number) => 0.004 * (1 - smoothstep(s.hipY, s.waistY, y));
    const hem = s.hipY - 0.018;
    kit.torso(hem, neck, off, cloth, loose);
    kit.torsoRing(hem, off + 0.004, 0.0025, 0.004, cloth);
    // Lajsna i dugmad
    kit.torsoPatch(-0.075, 0.075, hem + 0.002, neck(0) - 0.002, off + 0.0016, cloth, { puff: 0.0012, soft: 0.25, nu: 6, nv: 20 });
    const btn = glossyMaterial("#F6F2EA", 0.3, 0.8);
    for (let i = 0; i < 4; i++) {
        const y = neck(0) - 0.022 - i * ((neck(0) - hem - 0.05) / 3);
        button(kit, 0, y, off + 0.003, btn, 0.0048);
    }
    // Džep na grudima
    kit.torsoPatch(0.32, 0.72, s.chestY - 0.035, s.chestY + 0.02, off + 0.001, cloth, { puff: 0.002, soft: 0.12, nu: 10, nv: 10 });
    for (const side of SIDES) {
        collarFlap(kit, side, cloth, { offset: off, frontA: 0.14, height: 0.022, tip: 0.014, yNeck: neck });
        kit.sleeve(side, 0, 0.92, off, cloth, (t) => 0.002 * Math.sin(t * Math.PI));
        kit.armRing(side, 0.92, off, 0.0035, 0.016, cloth);
    }
}

/** Sportski dres: V-izrez i rubovi u drugoj boji, broj na leđima i grudima, bočne trake */
function jersey(kit: Kit, sw: Swatch) {
    const s = kit.shape;
    const accent = sw.accent ?? "#FFFFFF";
    const cloth = fabricSide(sw.hex, "mesh", { roughness: 0.62, sheen: 0.5 });
    const trim = fabricMaterial(accent, "rib");
    const off = 0.012;
    const neck = (a: number) => s.neckBaseY - 0.003 - 0.045 * Math.exp(-((a / 0.3) ** 2));
    const loose = (_a: number, y: number) => 0.004 + 0.004 * (1 - smoothstep(s.hipY, s.waistY, y));
    const hem = s.hipY - 0.03;
    kit.torso(hem, neck, off, cloth, loose);
    kit.torsoRing(hem, off + 0.006, 0.003, 0.006, cloth);
    kit.torsoRing(neck, off + 0.001, 0.004, 0.009, trim);
    for (const side of SIDES) {
        const wide = (t: number) => 0.006 + 0.008 * smoothstep(0.05, 0.32, t);
        kit.sleeve(side, 0, 0.32, off - 0.002, cloth, wide);
        kit.armRing(side, 0.32, off + 0.012, 0.0035, 0.007, trim);
        // Bočna traka
        kit.torsoPatch(side * Math.PI / 2 - 0.11, side * Math.PI / 2 + 0.11, hem + 0.004, s.chestY + 0.02, off + loose(0, s.chestY) + 0.0006, trim, { nu: 4, nv: 16 });
    }
    const number = (size: number) => printTexture(`broj-${accent}-${sw.hex}-${size}`, (ctx, w, h) => {
        ctx.font = `900 ${Math.round(h * 0.82)}px "Arial Black", Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.lineWidth = w * 0.06;
        ctx.strokeStyle = new THREE.Color(sw.hex).multiplyScalar(0.6).getStyle();
        ctx.strokeText("10", w / 2, h * 0.54);
        ctx.fillStyle = accent;
        ctx.fillText("10", w / 2, h * 0.54);
    }, 256, 256);
    const print = (size: number) => new THREE.MeshPhysicalMaterial({ map: number(size), transparent: true, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
    kit.torsoPatch(Math.PI - 0.62, Math.PI + 0.62, s.waistY - 0.06, s.chestY + 0.035, off + loose(0, s.waistY) + 0.001, print(2), { nu: 16, nv: 16 });
    kit.torsoPatch(0.12, 0.5, s.chestY - 0.035, s.chestY + 0.012, off + loose(0, s.chestY) + 0.001, print(1), { nu: 8, nv: 8 });
}

// ── Donji deo ─────────────────────────────────────────────────────────────────

/** Karlica pantalona (od međunožja do pojasa) */
function pelvis(kit: Kit, top: number, offset: number, material: THREE.Material) {
    const s = kit.shape;
    const bottom = s.crotchY - 0.018;
    kit.torso(bottom, top, offset, material, undefined, 28);
}

function jeans(kit: Kit, sw: Swatch) {
    const s = kit.shape;
    const denim = patternedFabric(denimColor(), "denim", sw.hex, { side: THREE.DoubleSide });
    const stitch = fabricMaterial(sw.accent ?? "#E3A54A", "cotton", { roughness: 0.7 });
    const off = LAYER.bottom;
    const top = s.waistY - 0.035;
    pelvis(kit, top, off, denim);
    kit.torsoRing(top, off, 0.0034, 0.011, denim);
    for (const side of SIDES) {
        const straight = (t: number) => 0.002 + 0.004 * t;
        kit.leg(side, 0, 0.965, off, denim, straight);
        kit.legRing(side, 0.965, off + 0.006, 0.0055, 0.011, denim, straight);
        // Bočni šav (štep)
        kit.leg(side, 0.06, 0.95, off + 0.0009, stitch, straight, [0.247, 0.253]);
        // Zadnji džep
        kit.torsoPatch(side * (Math.PI - 0.62), side * (Math.PI - 0.2), s.hipY - 0.005, s.hipY + 0.05, off + 0.0008, denim, { puff: 0.0015, soft: 0.12, nu: 8, nv: 8 });
        // Otvor prednjeg džepa (kriva)
        torsoStitch(kit, [[side * 0.45, top - 0.004], [side * 0.62, top - 0.03], [side * 0.95, top - 0.042]], off + 0.0008, stitch, 0.0012);
    }
    // Šlic i dugme
    torsoStitch(kit, [[0.12, top - 0.008], [0.13, s.hipY + 0.01], [0.06, s.crotchY + 0.01], [0, s.crotchY - 0.005]], off + 0.0009, stitch, 0.0011);
    button(kit, 0, top + 0.001, off + 0.004, metalMaterial("#C9A661"), 0.0055);
    // Gajke za kaiš
    for (const a of [-2.4, -1.2, 1.2, 2.4, Math.PI]) {
        kit.torsoPatch(a - 0.05, a + 0.05, top - 0.012, top + 0.006, off + 0.0045, denim, { nu: 3, nv: 3 });
    }
}

function joggers(kit: Kit, sw: Swatch) {
    const s = kit.shape;
    const cloth = fabricSide(sw.hex, "fleece", { sheen: 1, sheenLift: 0.4 });
    const rib = fabricMaterial(sw.hex, "rib");
    const stripe = fabricMaterial(sw.accent ?? "#FFFFFF", "cotton");
    const off = LAYER.bottom + 0.002;
    const top = s.waistY - 0.03;
    pelvis(kit, top, off, cloth);
    kit.torsoRing(top, off, 0.005, 0.015, rib);
    const loose = (t: number) => 0.005 + 0.006 * (1 - t) * smoothstep(0, 0.2, t) - 0.008 * smoothstep(0.82, 0.93, t);
    for (const side of SIDES) {
        kit.leg(side, 0, 0.93, off, cloth, loose);
        kit.legRing(side, 0.95, off - 0.002, 0.0055, 0.018, rib);
        kit.leg(side, 0.04, 0.9, off + 0.0009, stripe, loose, [0.235, 0.265]);
    }
    // Vezica napred
    const string = glossyMaterial("#F4F4F2", 0.6, 0);
    for (const side of SIDES) {
        const a = side * 0.12;
        const p0 = torsoPoint(s, a, top + 0.002, off + 0.009, new THREE.Vector3());
        const p1 = torsoPoint(s, a * 1.6, top - 0.03, off + 0.01, new THREE.Vector3());
        const p2 = torsoPoint(s, a * 1.4, top - 0.06, off + 0.009, new THREE.Vector3());
        kit.rigid("hips", new THREE.Mesh(taperedTube(polyPath([p0, p1, p2].map((p) => kit.toBone("hips", p))), () => 0.0022, 16, 6), string));
    }
}

/** Plisirana suknja */
function skirt(kit: Kit, sw: Swatch) {
    const s = kit.shape;
    const cloth = fabricSide(sw.hex, "felt", { sheen: 0.7 });
    const top = s.waistY - 0.025;
    const knee = s.hipY - s.thigh;
    const tri = (x: number) => Math.abs(((x / (Math.PI * 2)) % 1 + 1) % 1 - 0.5) * 2;
    const pleats = (a: number, v: number) => 0.0085 * Math.pow(v, 0.8) * (tri(a * 14) - 0.5) * 2;
    const scale = s.height / 1.19;
    const { edge } = kit.skirt(top, knee + 0.08 * scale, LAYER.bottom + 0.002, { rx: 0.16 * scale, rz: 0.135 * scale }, cloth, pleats, 30, 2.6);
    kit.torsoRing(top, LAYER.bottom + 0.002, 0.005, 0.013, cloth);
    kit.edgeRing(edge, 0.0028, 0.004, cloth);
}

function shorts(kit: Kit, sw: Swatch) {
    const s = kit.shape;
    const cloth = fabricSide(sw.hex, "cotton", { roughness: 0.78 });
    const off = LAYER.bottom + 0.001;
    const top = s.waistY - 0.035;
    pelvis(kit, top, off, cloth);
    kit.torsoRing(top, off, 0.0045, 0.012, cloth);
    const wide = (t: number) => 0.004 + 0.032 * smoothstep(0, 0.38, t);
    for (const side of SIDES) {
        kit.leg(side, 0, 0.36, off, cloth, wide);
        kit.legRing(side, 0.36, off + 0.012, 0.004, 0.012, cloth, wide);
        kit.torsoPatch(side * (Math.PI - 0.6), side * (Math.PI - 0.2), s.hipY - 0.005, s.hipY + 0.045, off + 0.0008, cloth, { puff: 0.0015, soft: 0.12, nu: 8, nv: 8 });
    }
    button(kit, 0, top + 0.001, off + 0.004, glossyMaterial("#3A3A40", 0.4, 0.5), 0.005);
}

// ── Dugačko ───────────────────────────────────────────────────────────────────

/** Haljina: steznik, puf-rukavi, zvono-suknja, pojas sa mašnom pozadi */
function dress(kit: Kit, sw: Swatch) {
    const s = kit.shape;
    const accent = sw.accent ?? "#FFFFFF";
    const cloth = fabricSide(sw.hex, "cotton", { sheen: 0.9 });
    const sash = fabricMaterial(accent, "satin");
    const off = LAYER.top - 0.002;
    const neck = (a: number) => s.neckBaseY - 0.006 - 0.028 * Math.pow(Math.max(0, Math.cos(a)), 2);
    const waist = s.waistY - 0.01;
    kit.torso(waist - 0.012, neck, off, cloth);
    kit.torsoRing(neck, off, 0.0035, 0.006, sash);
    for (const side of SIDES) {
        const puff = (t: number) => 0.017 * Math.pow(Math.max(0, Math.sin(Math.min(1, Math.max(0, t) / 0.22) * Math.PI)), 0.7) + 0.002;
        kit.sleeve(side, 0, 0.22, off, cloth, puff);
        kit.armRing(side, 0.22, off + 0.003, 0.0035, 0.006, sash);
    }
    const knee = s.hipY - s.thigh;
    const scale = s.height / 1.19;
    const folds = (a: number, v: number) => 0.009 * v * Math.sin(a * 9) + 0.003 * v * Math.sin(a * 23);
    const { edge } = kit.skirt(waist, knee - 0.04 * scale, off, { rx: 0.2 * scale, rz: 0.17 * scale }, cloth, folds, 40);
    kit.edgeRing(edge, 0.004, 0.006, sash);
    kit.torsoRing(waist, off + 0.002, 0.006, 0.014, sash);
    // Mašna pozadi
    const bow = new THREE.Group();
    const center = torsoPoint(s, Math.PI, waist, off + 0.012, new THREE.Vector3());
    for (const side of SIDES) {
        const loop = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.007, 10, 24), sash);
        loop.scale.set(1.2, 0.75, 0.6);
        loop.position.set(side * 0.022, 0, -0.004);
        loop.rotation.y = side * 0.3;
        bow.add(loop);
        const tail = new THREE.Mesh(taperedTube(polyPath([new THREE.Vector3(side * 0.004, -0.004, 0), new THREE.Vector3(side * 0.016, -0.03, -0.004), new THREE.Vector3(side * 0.024, -0.055, -0.002)]), (t) => 0.006 * (1 - t * 0.4), 12, 8, undefined, 0.35), sash);
        bow.add(tail);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.009, 14, 10), sash);
    bow.add(knot);
    bow.position.copy(kit.toBone("spine", center));
    kit.rigid("spine", bow);
}

/** Dugi kaput (mantil): revers, dvoredna dugmad, pojas, džepovi, do pola lista */
function coat(kit: Kit, sw: Swatch) {
    const s = kit.shape;
    const accent = sw.accent ?? "#5A4A3A";
    const cloth = fabricSide(sw.hex, "felt", { sheen: 0.8, sheenLift: 0.25, roughness: 0.78 });
    const off = LAYER.outer;
    const neck = (a: number) => s.neckBaseY - 0.0 - 0.07 * Math.pow(Math.max(0, Math.cos(a)), 3);
    const hip = s.hipY - 0.0;
    kit.torso(hip - 0.012, neck, off, cloth, (a, y) => 0.002 * (1 - smoothstep(s.hipY, s.waistY, y)));
    for (const side of SIDES) {
        kit.sleeve(side, 0, 0.93, off - 0.004, cloth, (t) => 0.003 + 0.002 * t);
        kit.armRing(side, 0.9, off - 0.001, 0.0045, 0.022, cloth, (t) => 0.003 + 0.002 * t);
    }
    const knee = s.hipY - s.thigh;
    const scale = s.height / 1.19;
    const legOuter = s.hipX + s.legR(0.1) + 0.03;
    const { edge, fn } = kit.skirt(hip, knee - 0.1 * scale, off + 0.002, { rx: legOuter + 0.03 * scale, rz: 0.1 * scale }, cloth, (a, v) => 0.003 * v * Math.sin(a * 6), 36);
    kit.edgeRing(edge, 0.004, 0.006, cloth);
    // Prednja ivica (preklop) niz kaput
    const edgeMat = fabricMaterial(new THREE.Color(sw.hex).multiplyScalar(0.8).getStyle(), "felt");
    kit.torsoPatch(0.14, 0.17, hip - 0.01, neck(0.15) - 0.004, off + 0.0012, edgeMat, { nu: 2, nv: 20 });
    kit.strip(fn, 0.022, 0.027, 0.0012, edgeMat, 0, 0.995);
    // Revers (okovratnik koji se spušta do grudi)
    for (const side of SIDES) {
        collarFlap(kit, side, cloth, { offset: off, frontA: 0.38, height: 0.03, tip: 0.02, frontDrop: s.neckBaseY - s.chestY - 0.01, yNeck: neck, lift: 0.009 });
    }
    // Pojas sa kopčom
    const belt = fabricMaterial(sw.hex, "felt", { sheen: 0.8 });
    kit.torsoRing(s.waistY - 0.01, off + 0.0015, 0.004, 0.016, belt);
    const buckle = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0028, 8, 4), metalMaterial("#C9A661"));
    buckle.rotation.z = Math.PI / 4;
    buckle.scale.set(1.2, 0.9, 1);
    buckle.position.copy(kit.toBone("spine", torsoPoint(s, 0, s.waistY - 0.01, off + 0.008, new THREE.Vector3())));
    kit.rigid("spine", buckle);
    // Dvoredna dugmad
    const btn = glossyMaterial(accent, 0.35, 0.7);
    for (const row of [s.chestY - 0.035, s.waistY + 0.035, s.hipY + 0.035]) {
        for (const a of [-0.32, 0.32]) button(kit, a, row, off + 0.002, btn, 0.006);
    }
    // Poklopci džepova
    for (const side of SIDES) {
        kit.torsoPatch(side * 0.75, side * 1.25, hip + 0.008, hip + 0.03, off + 0.002, cloth, { puff: 0.002, soft: 0.1, nu: 8, nv: 4 });
    }
}

/** Abaja: duga široka haljina do članaka, zvonasti rukavi, zlatni vez na rubovima i napred */
function abaya(kit: Kit, sw: Swatch) {
    const s = kit.shape;
    const accent = sw.accent ?? "#C9A55A";
    const cloth = fabricSide(sw.hex, "satin", { roughness: 0.62, sheen: 0.6, sheenLift: 0.35 });
    const trim = printTexture(`vez-${accent}-${sw.hex}`, (ctx, w, h) => {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = new THREE.Color(sw.hex).getStyle();
        ctx.lineWidth = w * 0.08;
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) {
            const y = (i / 8) * h;
            ctx.moveTo(w * 0.2, y);
            ctx.lineTo(w * 0.5, y + h / 16);
            ctx.lineTo(w * 0.8, y);
        }
        ctx.stroke();
        ctx.fillStyle = new THREE.Color(sw.hex).getStyle();
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.arc(w * 0.5, (i + 0.5) * (h / 8) + h / 32, w * 0.07, 0, Math.PI * 2);
            ctx.fill();
        }
    }, 64, 256);
    trim.wrapS = trim.wrapT = THREE.RepeatWrapping;
    const trimMat = new THREE.MeshPhysicalMaterial({ map: trim, roughness: 0.4, metalness: 0.35, clearcoat: 0.3, side: THREE.DoubleSide });
    const plainTrim = new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.38, metalness: 0.45, clearcoat: 0.3 });
    const off = LAYER.top + 0.002;
    const neck = crewNeck(kit, 0.012);
    const waist = s.waistY - 0.03;
    kit.torso(waist - 0.01, neck, off, cloth);
    kit.torsoRing(neck, off, 0.0035, 0.008, plainTrim);
    const bell = (t: number) => 0.004 + 0.026 * Math.pow(smoothstep(0.35, 1, t), 1.4);
    for (const side of SIDES) {
        kit.sleeve(side, 0, 1, off, cloth, bell);
        kit.armRing(side, 0.985, off + 0.002, 0.004, 0.012, plainTrim, bell);
    }
    const scale = s.height / 1.19;
    const folds = (a: number, v: number) => 0.01 * v * Math.sin(a * 7 + 0.4) + 0.004 * v * Math.sin(a * 17);
    const { edge, fn } = kit.skirt(waist, 0.035 * scale, off, { rx: 0.19 * scale, rz: 0.17 * scale }, cloth, folds, 56);
    kit.edgeRing(edge, 0.004, 0.009, plainTrim);
    // Vez napred: na stezniku i niz suknju
    kit.torsoPatch(-0.06, 0.06, waist - 0.01, neck(0) - 0.004, off + 0.0012, trimMat, { nu: 2, nv: 16 });
    kit.strip(fn, 0.99, 1.0, 0.0012, trimMat, 0, 0.985);
    kit.strip(fn, 0.0, 0.01, 0.0012, trimMat, 0, 0.985);
}
