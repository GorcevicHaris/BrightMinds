// Kostimi (19 starih + novi): svaki je složen od pravih delova odeće (majica, jakna,
// pantalone, suknja, kaput) i detalja koji ga čine prepoznatljivim — kontrolna tabla
// astronauta, reflektujuće trake vatrogasca, plišani stomak mede, bodlje i rep dinosaurusa…
// Bez oružja i bez ičega strašnog. Sve prati telo (SkinnedMesh) ili kost grudi.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { ItemBuild } from "../../contract";
import { polyPath, smoothstep, taperedTube } from "../../engine/surface";
import { cloth, darker, decal, fabric, gauss, gem, gold, lighter, metal, plastic, plush, rubber, SIDES, silver, weighTorso } from "./common";
import { pants, skirt, tailHole } from "./bottoms";
import { blazer, cape, coat, dress, shirtFront, stripeAlongArm, tie, tracksuitTop } from "./dresses";
import { denim } from "./bottoms";
import { checkerTexture, checkTexture, dotsTexture, MOTIFS, motifTexture, patternTexture, stripeTexture } from "./prints";
import { LAYER, mergeSimple, Tailor, type LimbExtra, type TorsoExtra } from "./tailor";
import { safeHem, chestPrint, clothMaterial, collarFlap, crewNeck, seams, shirt, sleeveFolds, softFolds, tee, torsoSpan, vest, vNeck } from "./tops";

/** Geometrija postavljena na trup (a, y) okrenuta napolje; prati trup */
function onTorso(t: Tailor, geometry: THREE.BufferGeometry, a: number, y: number, offset: number, material: THREE.Material, tilt = 0, name = "detalj") {
    const p = t.point(a, y, offset);
    const q = t.point(a, y, offset + 0.01);
    const out = q.sub(p).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), out);
    if (tilt) quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt));
    geometry.applyQuaternion(quat);
    geometry.translate(p.x, p.y, p.z);
    return t.kit.skinned(weighTorso(t.rig, geometry), material, name);
}

const k = (t: Tailor) => Math.min(1.3, t.s.height / 1.19);

/** Gornji deo jednodelnog kostima (dugi rukavi, okrugao izrez, rajsferšlus po želji) */
function suitTop(t: Tailor, o: { color: string; kind?: "cotton" | "fleece" | "felt" | "satin" | "knit" | "mesh"; map?: THREE.Texture; neck?: "crew" | "high" | "v"; cuff?: string; offset?: number; hem?: number; sleeve?: number; folds?: number }) {
    const s = t.s;
    const main = clothMaterial({ color: o.color, kind: o.kind ?? "cotton", map: o.map });
    const off = o.offset ?? LAYER.top;
    // Visok okovratnik je uz hidžab običan (ispod tkanine, ne viri ispod brade)
    const neck = o.neck === "v" ? vNeck(t, 0.04) : o.neck === "high" && !t.ctx.hijab ? () => s.neckBaseY + 0.012 : crewNeck(t);
    const extra = softFolds(t, o.folds ?? 1, 0.003);
    const hem = o.hem ?? safeHem(t, s.hipY - 0.01);
    t.torso(hem, neck, off, main, extra, 40);
    const cuff = fabric(o.cuff ?? o.color, "rib");
    t.ring(neck, off - 0.001, 0.0045, 0.009, cuff);
    for (const side of SIDES) {
        const len = o.sleeve ?? 0.92;
        t.sleeve(side, 0, len, off - 0.001, main, sleeveFolds(1, 0.003));
        t.armRing(side, len, off - 0.002, 0.005, 0.014, cuff);
    }
    return { main, off, extra, neck, hem };
}

// ── Astronaut ──────────────────────────────────────────────────────────────

export function astronaut(t: Tailor) {
    const s = t.s;
    const white = "#F2F5FA";
    const panel = "#C7D0DD";
    const { off, extra } = suitTop(t, { color: white, kind: "felt", neck: "high", cuff: "#8C98AB", offset: LAYER.outer - 0.004 });
    // Kragna — prsten za šlem (uz hidžab je ispod tkanine)
    if (!t.ctx.hijab) t.ring(s.neckBaseY + 0.014, off + 0.002, 0.008, 0.012, plastic("#AEB9C9", 0.4));
    pants(t, { cloth: { color: white, kind: "felt" }, fit: "cargo", offset: LAYER.outer - 0.008, pockets: false, knee: panel, stitch: "#AEB9C9" });
    const grey = fabric(panel, "felt");
    // Panel na grudima i pojas
    t.patch(-0.55, 0.55, s.waistY - 0.03, s.waistY - 0.005, off + extra(0, s.waistY) + 0.002, grey, { puff: 0.002, nu: 14, nv: 3 });
    t.ring(s.waistY - 0.02, off + extra(0, s.waistY) + 0.002, 0.005, 0.014, fabric("#8C98AB", "felt"));
    // Kontrolna tabla sa dugmićima
    const scale = k(t);
    const box = new RoundedBoxGeometry(0.085 * scale, 0.06 * scale, 0.022 * scale, 3, 0.008 * scale);
    onTorso(t, box, 0, s.chestY - 0.01, off + 0.012 * scale, plastic("#E3E8F0", 0.4), 0.1, "tabla");
    const buttons: [number, string][] = [[-0.022, "#E5484D"], [0, "#FFD15C"], [0.022, "#3D86E0"]];
    for (const [dx, hex] of buttons) {
        const b = new THREE.CylinderGeometry(0.0065 * scale, 0.0065 * scale, 0.006, 16);
        b.rotateX(Math.PI / 2);
        b.translate(dx * scale, 0.008 * scale, 0);
        onTorso(t, b, 0, s.chestY - 0.01, off + 0.024 * scale, plastic(hex, 0.3), 0.1, "dugme");
    }
    const screen = new RoundedBoxGeometry(0.05 * scale, 0.014 * scale, 0.004, 2, 0.002);
    screen.translate(0, -0.012 * scale, 0);
    onTorso(t, screen, 0, s.chestY - 0.01, off + 0.024 * scale, plastic("#3BB2A0", 0.2), 0.1, "ekran");
    // Zastavica (zvezda) na ramenu i crvene pruge na rukavima
    for (const side of SIDES) {
        stripeAlongArm(t, side, off + 0.0015, fabric("#E5484D", "cotton"), 0.008);
        t.armRing(side, 0.5, off + 0.0005, 0.004, 0.012, grey);
    }
    t.patch(0.9, 1.25, s.chestY + 0.01, s.chestY + 0.045, off + 0.0015, decal(motifTexture("zvezda-plava", MOTIFS.star("#3D86E0"))), { nu: 6, nv: 6 });
    tailHole(t, off + 0.01, fabric(white, "felt"));
}

// ── Vatrogasac ─────────────────────────────────────────────────────────────

export function firefighter(t: Tailor) {
    const s = t.s;
    const navy = "#34407A";
    const reflect = fabric("#F2F2EA", "satin", { roughness: 0.2, sheen: 0.2 });
    const yellow = fabric("#FFC83D", "felt");
    const c = coat(t, { body: { color: navy, kind: "felt" }, length: "hip", collar: "stand", buttons: "none", pockets: true });
    void c;
    const off = LAYER.outer;
    // Reflektujuće trake (žuto-srebrne) na grudima, struku, rukavima
    for (const y of [s.chestY - 0.025, s.hipY + 0.005]) {
        t.ring(y, off + 0.004, 0.003, 0.012, yellow);
        t.ring(y, off + 0.007, 0.002, 0.005, reflect);
    }
    for (const side of SIDES) {
        for (const tt of [0.45, 0.82]) {
            t.armRing(side, tt, off + 0.0, 0.003, 0.012, yellow);
            t.armRing(side, tt, off + 0.003, 0.002, 0.005, reflect);
        }
    }
    // Kopče napred
    for (let i = 0; i < 3; i++) {
        const clasp = new RoundedBoxGeometry(0.022 * k(t), 0.008 * k(t), 0.005, 2, 0.002);
        onTorso(t, clasp, 0, s.chestY + 0.01 - i * 0.05 * k(t), off + 0.006, metal("#B9BEC6"), 0, "kopca");
    }
    pants(t, { cloth: { color: navy, kind: "felt" }, fit: "straight", pockets: false });
    for (const side of SIDES) {
        t.legRing(side, 0.72, LAYER.bottom + 0.004, 0.003, 0.012, yellow);
        t.legRing(side, 0.72, LAYER.bottom + 0.007, 0.002, 0.005, reflect);
    }
    // Tregeri ispod jakne se ne vide; crveni pojas
    t.ring(s.waistY - 0.05, LAYER.outer + 0.004, 0.004, 0.01, fabric("#E5484D", "felt"));
}

// ── Pirat ──────────────────────────────────────────────────────────────────

export function pirate(t: Tailor) {
    const s = t.s;
    tee(t, { body: { color: "#FFFFFF", map: stripeTexture("#FFFFFF", "#E5484D", 0.034, 0.42) }, sleeve: "long", neck: "v", trim: "#E5484D" });
    vest(t, { body: { color: "#3A3546" }, offset: LAYER.top + 0.008, buttons: "#FFC83D", open: 0.4, trim: "#FFC83D" });
    pants(t, { cloth: { color: "#3A4A80", kind: "cotton" }, length: 0.8, cuff: true });
    // Crveni pojas sa čvorom i krajevima
    const sash = cloth("#E5484D", "satin");
    const y = s.waistY - 0.02;
    t.ring(y, LAYER.top + 0.012, 0.007, 0.018, sash);
    const knotA = -0.6;
    const knot = new THREE.SphereGeometry(0.012 * k(t), 14, 10);
    knot.scale(1, 0.8, 0.6);
    onTorso(t, knot, knotA, y, LAYER.top + 0.022, sash, 0, "cvor");
    for (const d of [-0.05, 0.06]) {
        const p0 = t.point(knotA + d, y - 0.006, LAYER.top + 0.022);
        const p1 = t.point(knotA + d * 1.8, y - 0.05, LAYER.top + 0.03);
        const p2 = t.point(knotA + d * 2.3, y - 0.085, LAYER.top + 0.032);
        const g = taperedTube(polyPath([p0, p1, p2]), (q) => (0.01 - 0.003 * q) * k(t), 16, 8, undefined, 0.35);
        t.kit.skinned(weighTorso(t.rig, g), sash, "pojas-kraj");
    }
}

// ── Princeza i princ ───────────────────────────────────────────────────────

export function princess(t: Tailor) {
    const s = t.s;
    dress(t, { body: { color: "#F7A8C8", kind: "satin" }, accent: "#FFD7E6", sleeve: "puff", length: "maxi", flare: 1.25, petticoat: "#FFE3EE", bow: true });
    // Zlatni vez na stezniku i dragulj
    const goldMat = gold();
    t.stitch([[-0.5, s.neckBaseY - 0.03], [0, s.chestY + 0.01], [0.5, s.neckBaseY - 0.03]], LAYER.top + 0.002, goldMat, 0.0018);
    const jewel = new THREE.SphereGeometry(0.009 * k(t), 16, 12);
    jewel.scale(1, 1.25, 0.6);
    onTorso(t, jewel, 0, s.chestY + 0.006, LAYER.top + 0.006, gem("#E0457A"), 0, "dragulj");
    // Gornja suknja (preklop) sa zlatnim rubom
    const knee = s.hipY - s.thigh;
    const over = t.skirt(s.waistY - 0.01, knee + 0.02, LAYER.top + 0.012, { rx: 0.24 * k(t), rz: 0.21 * k(t) }, cloth("#FBC8DC", "satin"), (a, v) => 0.016 * v * Math.max(0, Math.sin(a * 5)) - 0.004 * v, 24, 1.4);
    t.edgeRing(over.edge, 0.003, 0.004, goldMat);
}

export function prince(t: Tailor) {
    const s = t.s;
    const blue = "#3D7BE0";
    const goldMat = gold();
    const { off, extra } = suitTop(t, { color: blue, kind: "felt", neck: "high", cuff: "#E3B754", offset: LAYER.top + 0.004 });
    const hem = safeHem(t, s.hipY - 0.04);
    t.ring(hem, off + extra(0, hem) + 0.002, 0.003, 0.006, goldMat);
    // Kratka „suknja” sakoa preko kukova
    const r = t.skirt(s.hipY + 0.02, hem - 0.03, off + 0.002, { rx: s.hipX + s.legR(0.1) + 0.04, rz: 0.1 * k(t) }, cloth(blue, "felt"), (a, v) => 0.002 * v * Math.sin(a * 5), 10, 1.2);
    t.edgeRing(r.edge, 0.003, 0.004, goldMat);
    // Zlatna dugmad u dva reda i trake (gajtani)
    for (let i = 0; i < 4; i++) for (const a of [-0.25, 0.25]) t.button(a, s.chestY + 0.02 - i * 0.035 * k(t), off + extra(0, s.chestY) + 0.002, goldMat, 0.005);
    for (let i = 0; i < 3; i++) t.stitch([[-0.25, s.chestY + 0.003 - i * 0.035 * k(t)], [0, s.chestY - 0.002 - i * 0.035 * k(t)], [0.25, s.chestY + 0.003 - i * 0.035 * k(t)]], off + extra(0, s.chestY) + 0.0015, goldMat, 0.0012);
    // Lenta preko grudi (od levog ramena do desnog kuka)
    t.strap([[0.85, s.shoulderY - 0.01], [0.45, s.chestY], [-0.1, s.waistY + 0.02], [-0.7, s.hipY + 0.02]], off + extra(0, s.chestY) + 0.004, fabric("#E5484D", "satin"), 0.022 * k(t), 0.003);
    // Epolete sa resama
    for (const side of SIDES) {
        const p = t.point(side * Math.PI / 2, s.shoulderY - 0.004, off + 0.004);
        const ep = new THREE.CylinderGeometry(0.022 * k(t), 0.024 * k(t), 0.008, 20);
        ep.translate(p.x - side * 0.01, p.y + 0.002, p.z);
        t.kit.skinned(weighTorso(t.rig, ep), goldMat, "epoleta");
        const fringe = new THREE.TorusGeometry(0.022 * k(t), 0.004, 6, 20);
        fringe.rotateX(Math.PI / 2);
        fringe.translate(p.x - side * 0.01, p.y - 0.004, p.z);
        t.kit.skinned(weighTorso(t.rig, fringe), goldMat, "rese");
    }
    pants(t, { cloth: { color: "#F2F5FA", kind: "felt" }, fit: "skinny", stripe: "#E3B754" });
}

// ── Vitez (bez oružja) ─────────────────────────────────────────────────────

export function knight(t: Tailor) {
    const s = t.s;
    // Pancir (sitna „pletena” mreža sa metalnim odsjajem)
    const mail = new THREE.MeshPhysicalMaterial({ color: "#C7D0DD", metalness: 0.85, roughness: 0.42, normalMap: (cloth("#C7D0DD", "knit") as THREE.MeshPhysicalMaterial).normalMap, normalScale: new THREE.Vector2(0.9, 0.9), side: THREE.DoubleSide });
    sharedMail.set("mail", sharedMail.get("mail") ?? mail);
    const mailMat = sharedMail.get("mail")!;
    const off = LAYER.top;
    const neck = crewNeck(t, 0.01);
    t.torso(safeHem(t, s.hipY - 0.04), neck, off, mailMat, softFolds(t, 0.5, 0.003), 36);
    for (const side of SIDES) t.sleeve(side, 0, 0.9, off - 0.001, mailMat, sleeveFolds(0.6, 0.003));
    // Tunika (plava sa zlatnim lavom-zvezdom), bez rukava, do pola butina
    const tabard = cloth("#3D5AA8", "felt");
    const goldMat = gold();
    const top = s.shoulderY + 0.006;
    for (const back of [false, true]) {
        const center = back ? Math.PI : 0;
        t.patch(center - 0.75, center + 0.75, s.hipY - 0.07, top - 0.004, off + 0.006, tabard, { nu: 14, nv: 18 });
    }
    t.ring(s.waistY - 0.015, off + 0.012, 0.004, 0.012, fabric("#9A6236", "leather"));
    const buckle = new THREE.TorusGeometry(0.01 * k(t), 0.0025, 6, 4);
    buckle.rotateZ(Math.PI / 4);
    onTorso(t, buckle, 0, s.waistY - 0.015, off + 0.018, goldMat, 0, "kopca");
    chestPrint(t, { map: motifTexture("zvezda-vitez", MOTIFS.star("#FFD15C")), size: 0.75, lift: 0.0 }, off + 0.0065);
    // Rame — okrugle metalne ploče
    for (const side of SIDES) {
        const p = t.point(side * Math.PI / 2, s.shoulderY - 0.004, off + 0.006);
        const plate = new THREE.SphereGeometry(0.036 * k(t), 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.2);
        plate.scale(1, 0.7, 1.05);
        plate.translate(p.x + side * 0.004, p.y - 0.006, p.z);
        t.kit.skinned(weighTorso(t.rig, plate), silver(), "rame");
    }
    pants(t, { cloth: { color: "#7A8394", kind: "felt" }, fit: "skinny", knee: "#DDE4EE", pockets: false });
}

const sharedMail = new Map<string, THREE.MeshPhysicalMaterial>();

// ── Superheroj ─────────────────────────────────────────────────────────────

export function superhero(t: Tailor) {
    const s = t.s;
    const { off, extra } = suitTop(t, { color: "#E5484D", kind: "satin", cuff: "#FFD15C", offset: LAYER.top - 0.002 });
    // Grb: zlatni krug sa zvezdom i munjom
    chestPrint(t, { map: emblemTexture(), size: 0.82, lift: 0.03 }, off);
    // Pojas sa kopčom
    t.ring(s.waistY - 0.025, off + extra(0, s.waistY) + 0.002, 0.005, 0.016, fabric("#FFD15C", "satin"));
    const buckle = new RoundedBoxGeometry(0.028 * k(t), 0.022 * k(t), 0.006, 2, 0.003);
    onTorso(t, buckle, 0, s.waistY - 0.025, off + 0.01, plastic("#F2A516", 0.3), 0, "kopca");
    pants(t, { cloth: { color: "#3D7BE0", kind: "satin" }, fit: "skinny", pockets: false, elastic: false });
}

function emblemTexture(): THREE.Texture {
    return motifTexture("grb-heroj", (ctx, x, y, r) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = "#FFD15C";
        ctx.fill();
        ctx.lineWidth = r * 0.1;
        ctx.strokeStyle = "#E9A10E";
        ctx.stroke();
        MOTIFS.bolt("#E5484D")(ctx, x, y, r * 0.7);
    });
}

// ── Doktor, naučnik ────────────────────────────────────────────────────────

export function doctor(t: Tailor, scrubs = "#5CC0B8") {
    const s = t.s;
    tee(t, { body: { color: scrubs }, neck: "v", sleeve: "short" });
    pants(t, { cloth: { color: scrubs, kind: "cotton" }, elastic: true, pockets: false });
    coat(t, { body: { color: "#F8FAFC", kind: "cotton" }, length: "knee", open: true, buttons: "single", collar: "lapel", belt: false, accent: "#DDE4EE" });
    // Slušalice (stetoskop) oko vrata
    stethoscope(t, LAYER.outer + 0.006);
    // Olovka u džepu
    const pen = new THREE.CylinderGeometry(0.003 * k(t), 0.003 * k(t), 0.04 * k(t), 8);
    pen.translate(0, 0.012, 0);
    onTorso(t, pen, 0.62, s.chestY - 0.01, LAYER.outer + 0.004, plastic("#3D86E0", 0.3), 0, "olovka");
    t.patch(0.48, 0.8, s.chestY - 0.035, s.chestY - 0.005, LAYER.outer + 0.0035, fabric("#EEF2F7", "cotton"), { puff: 0.0015, soft: 0.12, nu: 8, nv: 4 });
}

function stethoscope(t: Tailor, offset: number) {
    const s = t.s;
    const tube = rubber("#3A4A60", 0.4);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 16; i++) {
        const a = -2.4 + (i / 16) * 4.8;
        pts.push([a + Math.PI, s.neckBaseY - 0.004]);
    }
    t.stitch(pts, offset, tube, 0.0032);
    for (const side of SIDES) t.stitch([[side * 2.4 + (side === 1 ? Math.PI - 2.4 * 2 : -(Math.PI - 2.4 * 2)), s.neckBaseY - 0.004], [side * 0.5, s.chestY + 0.02], [side * 0.18, s.chestY - 0.045]], offset, tube, 0.003);
    const disk = new THREE.CylinderGeometry(0.012 * k(t), 0.012 * k(t), 0.007, 20);
    disk.rotateX(Math.PI / 2);
    disk.translate(0, -0.06, 0);
    onTorso(t, disk, 0, s.chestY + 0.01, offset + 0.004, silver(), 0, "slusalica");
}

export function scientist(t: Tailor) {
    tee(t, { body: { color: "#8E77E6" }, print: { map: motifTexture("atom", atomDraw), size: 0.7 } });
    coat(t, { body: { color: "#FFFFFF", kind: "cotton" }, length: "knee", open: true, buttons: "single", collar: "lapel", accent: "#DDE4EE" });
    const s = t.s;
    // Epruvete u džepu
    for (const [a, hex] of [[0.55, "#3BB273"], [0.66, "#F45B8D"]] as const) {
        const tube = new THREE.CapsuleGeometry(0.004 * k(t), 0.03 * k(t), 3, 8);
        tube.translate(0, 0.014, 0);
        onTorso(t, tube, a, s.chestY - 0.012, LAYER.outer + 0.005, plastic(hex, 0.15), 0, "epruveta");
    }
    t.patch(0.46, 0.8, s.chestY - 0.035, s.chestY - 0.005, LAYER.outer + 0.0035, fabric("#EEF2F7", "cotton"), { puff: 0.0015, soft: 0.12, nu: 8, nv: 4 });
}

function atomDraw(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = r * 0.08;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.9, r * 0.32, (i * Math.PI) / 3, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, r * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = "#FFD15C";
    ctx.fill();
}

// ── Kuvar ──────────────────────────────────────────────────────────────────

export function chef(t: Tailor) {
    const s = t.s;
    const white = "#FFFFFF";
    const { off, extra } = suitTop(t, { color: white, kind: "cotton", neck: "high", offset: LAYER.top + 0.002 });
    // Dvoredna dugmad (pokrivena platnom) i preklop
    t.stitch([[0.3, s.neckBaseY], [0.32, s.chestY], [0.32, s.hipY]], off + extra(0, s.chestY) + 0.001, fabric("#D5DCE6", "cotton"), 0.0012);
    for (let i = 0; i < 4; i++) for (const a of [-0.22, 0.42]) t.button(a, s.chestY + 0.025 - i * 0.04 * k(t), off + extra(0, s.chestY) + 0.002, fabric("#F2F4F8", "cotton"), 0.0055);
    t.ring(s.hipY - 0.01, off + 0.004, 0.003, 0.005, fabric(white, "cotton"));
    // Kecelja od struka
    const apron = cloth("#F2F4F8", "cotton");
    t.patch(-0.85, 0.85, s.hipY - s.thigh * 0.65, s.waistY - 0.01, off + 0.008, apron, { nu: 14, nv: 12 });
    t.ring(s.waistY - 0.012, off + 0.009, 0.0035, 0.01, apron);
    pants(t, { cloth: { color: "#FFFFFF", map: checkerTexture("#FFFFFF", "#2A2224", 0.024) }, fit: "straight", pockets: false, elastic: true });
}

// ── Bubamara, pčelica ──────────────────────────────────────────────────────

export function ladybug(t: Tailor) {
    const s = t.s;
    tee(t, { body: { color: "#3A3546" }, sleeve: "long", trim: "#3A3546", offset: LAYER.top - 0.004 });
    // Crvena tunika na tufne (zvono) preko
    const red = clothMaterial({ color: "#E5484D", kind: "felt", map: dotsTexture("#E5484D", "#2A2630", 0.07, 0.17) });
    const r = t.skirt(s.shoulderY - 0.02, s.hipY - 0.06, LAYER.top + 0.004, { rx: s.torsoW(s.waistY) + 0.06 * k(t), rz: s.torsoFront(s.waistY) + 0.06 * k(t) }, red, (a, v) => 0.004 * v * Math.sin(a * 6), 26, 1.1);
    t.edgeRing(r.edge, 0.004, 0.006, fabric("#2A2630", "felt"));
    t.ring(s.shoulderY - 0.02, LAYER.top + 0.002, 0.005, 0.012, fabric("#2A2630", "felt"));
    t.kit.strip(r.fn, 0.497, 0.503, 0.0015, fabric("#2A2630", "felt"), 0, 1);
    pants(t, { cloth: { color: "#2A2630", kind: "rib" }, fit: "legging" });
}

export function bee(t: Tailor) {
    const s = t.s;
    const stripes = clothMaterial({ color: "#FFD15C", kind: "fleece", map: stripeTexture("#FFD15C", "#2A2630", 0.075, 0.45) });
    const off = LAYER.top + 0.004;
    const neck = crewNeck(t, 0.01);
    const beeHem = safeHem(t, s.hipY - 0.04);
    const round: TorsoExtra = (a, y) => 0.016 * k(t) * Math.sin(Math.PI * THREE.MathUtils.clamp((y - beeHem + 0.01) / (s.shoulderY - beeHem + 0.01), 0, 1)) + softFolds(t, 0.6, 0)(a, y);
    t.torso(beeHem, neck, off, stripes, round, 44);
    t.ring(beeHem, off + 0.002, 0.006, 0.012, fabric("#2A2630", "rib"));
    t.ring(neck, off - 0.001, 0.005, 0.009, fabric("#2A2630", "rib"));
    for (const side of SIDES) {
        t.sleeve(side, 0, 0.9, off - 0.004, fabric("#2A2630", "rib"), sleeveFolds(1, 0.002));
        t.armRing(side, 0.9, off - 0.004, 0.005, 0.013, fabric("#FFD15C", "rib"));
    }
    pants(t, { cloth: { color: "#2A2630", kind: "rib" }, fit: "legging" });
}

// ── Meda i dinosaurus (plišani kombinezoni) ────────────────────────────────

function onesie(t: Tailor, color: string, belly: string) {
    const s = t.s;
    const fur = plush(color);
    const off = LAYER.top + 0.006;
    const neck = crewNeck(t, 0.008);
    const extra = softFolds(t, 1.2, 0.006);
    t.torso(s.crotchY - 0.018, neck, off, fur, extra, 46);
    t.ring(neck, off, 0.005, 0.01, fur);
    for (const side of SIDES) {
        t.sleeve(side, 0, 0.94, off - 0.002, fur, sleeveFolds(1.2, 0.006));
        t.armRing(side, 0.94, off - 0.002, 0.006, 0.014, plush(darker(color, 0.12)));
        t.leg(side, 0, 0.96, off - 0.004, fur, (tt) => 0.006 + 0.004 * tt);
        t.legRing(side, 0.96, off - 0.002, 0.006, 0.014, plush(darker(color, 0.12)));
    }
    // Stomak
    const bellyMat = plush(belly);
    const span = torsoSpan(t);
    t.patch(-0.62, 0.62, s.hipY - 0.01, s.chestY + span * 0.05, off + extra(0, s.waistY) + 0.0015, bellyMat, { puff: 0.004, soft: 0.2, nu: 18, nv: 14 });
    return { fur, off, extra };
}

export function bear(t: Tailor) {
    const s = t.s;
    const { off, extra } = onesie(t, "#BC8656", "#F1CBA4");
    chestPrint(t, { map: motifTexture("srce-meda", MOTIFS.heart("#F45B8D")), size: 0.35, lift: -0.06 }, off + extra(0, s.waistY) + 0.006);
    // Okrugli repić
    const tail = new THREE.SphereGeometry(0.03 * k(t), 18, 14);
    onTorso(t, tail, Math.PI, s.hipY - 0.01, off + 0.012, plush("#BC8656"), 0, "rep");
}

export function dino(t: Tailor): ItemBuild {
    const s = t.s;
    const { off } = onesie(t, "#6CC46F", "#FFE08A");
    // Bodlje niz leđa (narandžaste, meke)
    const spikes: THREE.BufferGeometry[] = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
        const y = s.neckBaseY - 0.01 - (i / (n - 1)) * (s.neckBaseY - s.hipY + 0.01);
        const size = (0.022 + 0.01 * Math.sin((i / (n - 1)) * Math.PI)) * k(t);
        const cone = new THREE.ConeGeometry(size * 0.7, size * 1.4, 4, 1);
        cone.rotateY(Math.PI / 4);
        cone.scale(0.5, 1, 1);
        cone.translate(0, size * 0.55, 0);
        cone.rotateX(-Math.PI / 2);
        const p = t.point(Math.PI, y, off + 0.002);
        cone.translate(p.x, p.y, p.z);
        spikes.push(cone);
    }
    t.kit.skinned(weighTorso(t.rig, mergeSimple(spikes)), plush("#FF8A3D"), "bodlje");
    // Rep (prati kukove)
    const base = t.point(Math.PI, s.hipY + 0.01, off - 0.004);
    const scale = k(t);
    const pts = [base, base.clone().add(new THREE.Vector3(0, -0.04 * scale, -0.1 * scale)), base.clone().add(new THREE.Vector3(0.02 * scale, -0.1 * scale, -0.2 * scale)), base.clone().add(new THREE.Vector3(0.05 * scale, -0.13 * scale, -0.28 * scale))];
    pts[3].y = Math.max(pts[3].y, 0.03);
    const tail = taperedTube(polyPath(pts), (q) => (0.05 - 0.044 * q) * scale, 24, 14);
    t.kit.skinned(weighTorso(t.rig, tail), plush("#6CC46F"), "rep");
    return undefined;
}

// ── Ronilac ────────────────────────────────────────────────────────────────

export function diver(t: Tailor) {
    const s = t.s;
    const neo = cloth("#2A3346", "satin", { roughness: 0.32, sheen: 0.3 });
    const teal = fabric("#3BB2A0", "satin", { roughness: 0.3 });
    const off = LAYER.under + 0.004;
    const neckY = s.neckBaseY + 0.01;
    t.torso(s.crotchY - 0.018, neckY, off, neo, softFolds(t, 0.4, 0), 44);
    t.ring(neckY, off, 0.004, 0.008, teal);
    for (const side of SIDES) {
        t.sleeve(side, 0, 0.95, off - 0.001, neo, () => 0.001);
        t.armRing(side, 0.95, off, 0.0035, 0.008, teal);
        t.leg(side, 0, 0.96, off - 0.002, neo, () => 0.001);
        t.legRing(side, 0.96, off, 0.0035, 0.008, teal);
        // Bočni paneli
        t.patch(side * Math.PI / 2 - 0.22, side * Math.PI / 2 + 0.22, s.hipY, s.chestY + 0.03, off + 0.0012, teal, { nu: 4, nv: 12 });
        stripeAlongArm(t, side, off + 0.0012, teal, 0.014);
        t.leg(side, 0.04, 0.92, off + 0.0012, teal, () => 0.001, [0.22, 0.28]);
    }
    t.zipper(s.waistY - 0.02, neckY - 0.002, off, fabric("#1C2333", "cotton"), metal("#C9CCD3"));
    tailHole(t, off + 0.006, teal);
}

// ── Kauboj ─────────────────────────────────────────────────────────────────

export function cowboy(t: Tailor) {
    const s = t.s;
    shirt(t, { body: { color: "#E5484D", map: checkTexture("#E5484D", "#8E2A2E", 0.05) }, pocket: false });
    vest(t, { body: { color: "#9A6236", kind: "leather" }, offset: LAYER.top + 0.008, open: 0.34, trim: "#6E4224" });
    // Šerifska zvezda
    const star = motifTexture("zvezda-kauboj", MOTIFS.star("#FFC83D"));
    t.patch(0.48, 0.82, s.chestY - 0.03, s.chestY + 0.012, LAYER.top + 0.011, decal(star, { metal: 0.6, roughness: 0.3 }), { nu: 6, nv: 6 });
    pants(t, { cloth: { color: "#4A6FB5" }, denim: true });
    // Kaiš sa velikom kopčom
    t.ring(s.waistY - 0.035, LAYER.bottom + 0.004, 0.0045, 0.012, fabric("#6E4224", "leather"));
    const buckle = new THREE.CylinderGeometry(0.016 * k(t), 0.016 * k(t), 0.005, 6);
    buckle.rotateX(Math.PI / 2);
    buckle.scale(1.3, 1, 1);
    onTorso(t, buckle, 0, s.waistY - 0.035, LAYER.bottom + 0.011, metal("#D8C080"), 0, "kopca");
}

// ── Pilot ──────────────────────────────────────────────────────────────────

export function pilot(t: Tailor) {
    const s = t.s;
    shirt(t, { body: { color: "#F2F5FA" }, pocket: false });
    tie(t, "#2E3A66", LAYER.top + 0.002, (a) => s.neckBaseY - 0.002 - 0.016 * Math.pow(Math.max(0, Math.cos(a)), 6));
    const navy = "#2E3A66";
    coat(t, { body: { color: navy, kind: "felt" }, length: "hip", collar: "lapel", buttons: "double", accent: "#E3B754", pockets: true, offset: LAYER.outer });
    // Zlatna krila na grudima i trake na rukavima
    const wings = motifTexture("krila-pilot", (ctx, x, y, r) => {
        ctx.fillStyle = "#FFD15C";
        for (const sx of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + sx * r * 0.6, y - r * 0.35, x + sx * r, y - r * 0.2);
            ctx.lineTo(x + sx * r * 0.85, y);
            ctx.quadraticCurveTo(x + sx * r * 0.5, y + r * 0.05, x, y + r * 0.16);
            ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(x, y, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
    });
    t.patch(0.25, 0.85, s.chestY + 0.0, s.chestY + 0.04, LAYER.outer + 0.0045, decal(wings, { metal: 0.5, roughness: 0.35 }), { nu: 8, nv: 6 });
    for (const side of SIDES) t.armRing(side, 0.84, LAYER.outer - 0.002, 0.0025, 0.006, gold());
    pants(t, { cloth: { color: navy, kind: "felt" } });
}

// ── Čarobnjak ──────────────────────────────────────────────────────────────

export function wizard(t: Tailor) {
    const s = t.s;
    const stars = patternTexture("zvezde-carobnjak", "#6C55C9", MOTIFS.star("#FFD15C"), { tile: 0.08, scale: 0.15, rotate: true });
    const robe = clothMaterial({ color: "#6C55C9", kind: "satin", map: stars });
    const off = LAYER.top + 0.004;
    const neck = vNeck(t, 0.04, 0.35);
    t.torso(s.waistY - 0.02, neck, off, robe, softFolds(t, 0.8, 0), 34);
    t.ring(neck, off, 0.004, 0.009, gold());
    const bell: LimbExtra = (tt) => 0.004 + 0.03 * Math.pow(smoothstep(0.3, 1, tt), 1.5);
    for (const side of SIDES) {
        t.sleeve(side, 0, 0.96, off, robe, bell);
        t.armRing(side, 0.96, off + 0.002, 0.004, 0.01, gold(), bell);
    }
    const scale = s.height / 1.19;
    const r = t.skirt(s.waistY - 0.02, s.ankleY * 0.6, off, { rx: 0.2 * scale, rz: 0.18 * scale }, robe, (a, v) => 0.01 * v * Math.sin(a * 7) + 0.004 * v * Math.sin(a * 15), 46);
    t.edgeRing(r.edge, 0.004, 0.008, gold());
    // Pojas od gajtana sa resama
    t.ring(s.waistY - 0.02, off + 0.008, 0.004, 0.006, fabric("#FFD15C", "satin"));
    for (const side of SIDES) t.stitch([[side * 0.3, s.waistY - 0.024], [side * 0.34, s.waistY - 0.07], [side * 0.36, s.waistY - 0.11]], off + 0.012, fabric("#FFD15C", "satin"), 0.003);
    tailHole(t, off + 0.02, robe);
}

// ── Balerina ───────────────────────────────────────────────────────────────

export function ballerina(t: Tailor) {
    const s = t.s;
    const pink = "#FFB8CB";
    const satin = cloth(pink, "satin", { roughness: 0.4 });
    const off = LAYER.under + 0.004;
    const neck = (a: number) => s.chestY + 0.03 + 0.012 * Math.cos(a * 2);
    t.torso(s.crotchY - 0.018, neck, off, satin, () => 0.001, 30);
    t.ring(neck, off, 0.0035, 0.005, fabric("#F78FB3", "satin"));
    for (const side of SIDES) {
        t.strap([[side * 0.4, neck(side * 0.4) - 0.004], [side * 0.55, s.shoulderY + 0.004], [side * 1.0, s.neckBaseY - 0.006], [side * (Math.PI - 0.55), s.shoulderY + 0.004], [side * (Math.PI - 0.4), neck(Math.PI) - 0.004]], off + 0.001, fabric("#F78FB3", "satin"), 0.008 * k(t), 0.0025);
        t.leg(side, 0, 0.97, LAYER.under, fabric("#FFD3E0", "rib"), () => 0.0004);
    }
    // Ukras na grudima (mašnica)
    const bow = new THREE.TorusGeometry(0.008 * k(t), 0.003, 6, 14);
    bow.scale(1.6, 0.8, 0.6);
    onTorso(t, bow, 0, s.chestY + 0.016, off + 0.004, fabric("#F45B8D", "satin"), 0, "masnica");
    skirt(t, { cloth: { color: pink }, style: "tutu", trim: "#F78FB3" });
}

// ── Detektiv i baštovan (novi) ─────────────────────────────────────────────

export function detective(t: Tailor) {
    shirtFront(t, "#F2F5FA", LAYER.top);
    pants(t, { cloth: { color: "#6E5A48", kind: "felt" } });
    coat(t, { body: { color: "#C8A774", kind: "cotton" }, length: "knee", belt: true, buttons: "double", collar: "lapel", accent: "#6E5A48" });
}

export function gardener(t: Tailor) {
    const s = t.s;
    tee(t, { body: { color: "#FFD15C" }, sleeve: "short", offset: LAYER.top - 0.004, length: -0.05 });
    pants(t, { cloth: { color: "#5E9A55", kind: "cotton" }, cuff: true, offset: LAYER.top + 0.002, knee: "#9A6236" });
    const green = cloth("#5E9A55", "cotton");
    const off = LAYER.top + 0.006;
    const top = s.chestY + 0.02;
    t.patch(-0.6, 0.6, s.waistY - 0.04, top, off, green, { nu: 14, nv: 10 });
    chestPrint(t, { map: motifTexture("cvet-bastovan", MOTIFS.flower("#F45B8D", "#FFD15C")), size: 0.36, lift: 0.04 }, off + 0.002);
    for (const side of SIDES) {
        t.strap([[side * 0.5, top - 0.006], [side * 0.62, s.shoulderY - 0.005], [side * 1.2, s.neckBaseY - 0.004], [side * 2.3, s.shoulderY - 0.012], [side * (Math.PI - 0.5), s.waistY - 0.02]], off - 0.004, green, 0.016 * k(t), 0.003);
        t.button(side * 0.5, top - 0.012, off + 0.003, metal("#C9A661"), 0.0055);
    }
    seams(t, s.waistY - 0.04, off, "#5E9A55");
}

// ── Moderna garderoba (sastavljeno) ────────────────────────────────────────

/** Teksas jakna preko bele majice: kragna, lajsna sa metalnim dugmadima, džepovi sa poklopcem */
export function denimJacket(t: Tailor) {
    const s = t.s;
    // Majica ispod se vidi samo u izrezu
    t.ring((a: number) => s.neckBaseY - 0.004 - 0.012 * Math.pow(Math.max(0, Math.cos(a)), 2), LAYER.top - 0.002, 0.004, 0.008, fabric("#F6F4EF", "rib"));
    t.patch(-0.4, 0.4, s.chestY, s.neckBaseY - 0.006, LAYER.top - 0.002, fabric("#F6F4EF", "cotton"), { nu: 8, nv: 6 });
    const jean = denim("#5B7DB8");
    const off = LAYER.outer - 0.002;
    const neck = (a: number) => s.neckBaseY - 0.004 - 0.03 * Math.pow(Math.max(0, Math.cos(a)), 3);
    const hem = safeHem(t, s.hipY - 0.0);
    const first = t.kit.objects.length;
    t.torso(hem + 0.014, neck, off, jean, softFolds(t, 1, 0.003), 40);
    t.ring(hem + 0.014, off + 0.003, 0.004, 0.014, jean);
    const stitch = fabric("#E3A54A", "cotton");
    t.stitchRing(hem + 0.03, off + 0.0035, stitch, 0.0008);
    t.patch(-0.06, 0.06, hem + 0.01, neck(0) - 0.003, off + 0.0016, jean, { puff: 0.001, soft: 0.25, nu: 4, nv: 12 });
    for (let i = 0; i < 4; i++) t.button(0, neck(0) - 0.018 - i * ((neck(0) - hem - 0.04) / 3), off + 0.004, metal("#C9A661"), 0.0052);
    for (const side of SIDES) {
        collarFlap(t, side, jean, { offset: off, frontA: 0.24, height: 0.028, tip: 0.016, yNeck: neck, lift: 0.009 });
        t.sleeve(side, 0, 0.9, off - 0.004, jean, sleeveFolds(1.3, 0.004));
        t.armRing(side, 0.9, off - 0.004, 0.0045, 0.016, jean);
        // Džep sa poklopcem i dugmetom
        t.patch(side * 0.32, side * 0.72, s.chestY - 0.04, s.chestY + 0.012, off + 0.0012, jean, { puff: 0.0015, soft: 0.1, nu: 8, nv: 8 });
        t.patch(side * 0.3, side * 0.74, s.chestY + 0.002, s.chestY + 0.02, off + 0.0035, jean, { puff: 0.001, soft: 0.15, nu: 8, nv: 3 });
        t.button(side * 0.52, s.chestY + 0.006, off + 0.006, metal("#C9A661"), 0.0042);
        t.stitch([[side * 0.12, s.shoulderY - 0.01], [side * 0.5, s.chestY + 0.035], [side * 1.0, s.chestY + 0.04]], off + 0.0015, stitch, 0.0008);
    }
    for (const object of t.kit.objects.slice(first)) {
        const mesh = object as THREE.Mesh;
        if (mesh.isMesh && mesh.material === jean && !mesh.geometry.getAttribute("color")) {
            const n = mesh.geometry.getAttribute("position").count;
            mesh.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3).fill(0.9), 3));
        }
    }
}

/** Sportska jakna (samo gornji deo trenerke) preko majice */
export function trackJacket(t: Tailor, color: string, stripe: string) {
    tracksuitTop(t, { color, stripe });
}

/** Skromni kupaći: tunika dugih rukava do pola butine + helanke do članaka */
export function modestSwim(t: Tailor) {
    const lycra = "#2E8FA8";
    tee(t, { body: { color: lycra, kind: "satin" }, sleeve: "long", offset: LAYER.under + 0.006, loose: 0.006, length: 0.32, trim: "#FFD15C", print: { map: motifTexture("riba-kupaci", MOTIFS.fish("#FFD15C")), size: 0.6 } });
    pants(t, { cloth: { color: "#1F5F75", kind: "satin" }, fit: "legging", offset: LAYER.under });
    for (const side of SIDES) stripeAlongArm(t, side, LAYER.under + 0.008, fabric("#FFD15C", "satin"), 0.008);
}

/** Sako preko košulje (bez pantalona — donji deo bira dete) */
export { blazer };

export { gauss, lighter, cape };
