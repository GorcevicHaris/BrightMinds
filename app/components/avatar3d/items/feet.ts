// 3D crteži predmeta za mesto „feet” (podaci: feet.data.ts). Vlasnik: #3 (katalog).
// Patike, čizme, cipele, sandale i papuče; kroje se po stopalu tela (i šapi, kopitu,
// peraji pingvina — sve preko shape.foot), kruto na kostima stopala, a sare čizama prate list.

import * as THREE from "three";
import { isHumanKind, material as engineMaterial, registerItems, type BoneName, type ItemBuilder, type ItemContext } from "../contract";
import { furMaterial, skinMaterial } from "../engine/materials";
import { buildSurface, smoothstep } from "../engine/surface";
import { attachAt, darker, fabric, gem, gold, lacquer, leather, lighter, metal, plastic, plush, rubber, seg, silver } from "./lib/common";
import { pair, type Shoe } from "./lib/shoes";
import type { LimbExtra } from "./lib/tailor";

type Build = (shoe: Shoe, ctx: ItemContext) => void;

const shoe = (id: string, build: Build, extra: Partial<ItemBuilder> & { lift?: number } = {}): ItemBuilder => {
    const { lift, ...rest } = extra;
    return {
        id,
        build: (ctx) => pair(ctx, (s) => build(s, ctx), (lift ?? 0) * (ctx.body.shape.foot.len / 0.15)),
        covers: ["feet"],
        thumb: { focus: "feet" },
        ...rest,
    };
};

const shinBone = (s: Shoe): BoneName => (s.side === 1 ? "shinL" : "shinR");

/** Koža ili krzno tela (bosa stopala u sandalama, rist u baletankama) */
function bodySurface(ctx: ItemContext): THREE.Material {
    return isHumanKind(ctx.body.kind) ? skinMaterial(ctx.body.tone) : furMaterial(ctx.body.tone);
}

// Sjajni materijali sa šarom (keš u modulu — isti za sve)
const local = new Map<string, THREE.Material>();
function cached<T extends THREE.Material>(key: string, make: () => T): T {
    let m = local.get(key) as T | undefined;
    if (!m) {
        m = make();
        local.set(key, m);
    }
    return m;
}

/** Svetlucava (sedefasta) tkanina za sjajne patike */
const shimmer = (hex: string) =>
    cached(`shimmer-${hex}`, () => new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.32, metalness: 0.55, iridescence: 1, iridescenceIOR: 1.5, iridescenceThicknessRange: [180, 520], clearcoat: 0.6, clearcoatRoughness: 0.2 }));

/** Svetao čelik (sečivo klizaljki): mekši odsjaj da se vidi i u mirnom studiju */
const steel = () => cached("steel", () => new THREE.MeshPhysicalMaterial({ color: "#E6EBF1", metalness: 0.55, roughness: 0.22, clearcoat: 0.6 }));

/** Reflektujuća traka (vatrogasne čizme): srebrnasta, blago svetli */
const reflective = () =>
    cached("reflective", () => new THREE.MeshPhysicalMaterial({ color: "#E8EDF2", roughness: 0.25, metalness: 0.7, emissive: new THREE.Color("#5A6068"), clearcoat: 0.8 }));

// ── Patike ──────────────────────────────────────────────────────────────────

interface SneakerOptions {
    color: string;
    accent: string;
    sole?: string;
    outsole?: string;
    lace?: string;
    toe?: string;
    upper?: THREE.Material;
    /** Svetleće tačke po đonu */
    lights?: readonly string[];
    /** Kramponi (kopačke) */
    studs?: boolean;
    /** Zvezdice od dragog kamena (sjajne patike) */
    gems?: string;
    /** Mrežasta tkanina (sportska) umesto platna */
    mesh?: boolean;
    /** Čarape iznad patike: boja i visina (udeo potkolenice; 0 = bez čarapa) */
    sock?: string | null;
    sockTop?: number;
    /** Bočni panel u drugoj boji (crno-bele patike) */
    panel?: string;
}

function sneaker(s: Shoe, o: SneakerOptions) {
    const k = s.k;
    const soleHex = o.sole ?? "#F7F7F5";
    const midsole = rubber(soleHex, 0.55);
    const outsole = rubber(o.outsole ?? darker(soleHex, 0.28), 0.75);
    const upperMat = o.upper ?? fabric(o.color, o.mesh ? "mesh" : "cotton", { roughness: 0.62, sheen: 0.45, normalScale: 0.35 });
    const accentMat = fabric(o.accent, "cotton", { roughness: 0.55, sheen: 0.35 });
    // Gazište (tamnije, sa urezom) i međuđon sa trakom u boji
    // Debeo („čupav”) đon u dva sloja, kao moderne patike
    const out = s.sole(0.0132, 0.009 * k, outsole, { toeLift: 0.012 * k });
    s.soleStripe(out, 0.7, 0.0011, 0.0012, outsole);
    const mid = s.sole(0.0124, 0.03 * k, midsole, { toeLift: 0.012 * k, base: 0.005 * k });
    if (o.lights) {
        // Svetleće tačke (mirno svetle, bez treptanja)
        const n = 10;
        for (let i = 0; i < n; i++) {
            const q = (i + 0.5) / n;
            const p = mid(q, 0.52, new THREE.Vector3());
            const g = new THREE.SphereGeometry(0.0034 * k, 6, 4);
            g.scale(1, 1, 0.6);
            const dir = new THREE.Vector3(p.x, 0, p.z - s.center.z).normalize();
            g.lookAt(dir);
            g.translate(p.x + dir.x * 0.001, p.y, p.z + dir.z * 0.001);
            s.add(g, engineMaterial({ kind: "glow", color: o.lights[i % o.lights.length] }), "svetlo");
        }
    } else {
        s.soleStripe(mid, 0.5, 0.0017, 0.0034, accentMat);
    }
    // Gornjište
    const up = s.upperFn(0.0105, 0.02);
    s.upper(up, upperMat);
    // Kapica prstiju (guma) i peta (druga boja)
    const toeMat = rubber(o.toe ?? soleHex, 0.5);
    s.patch(up, -1.3, 1.3, (th) => Math.PI * (0.3 + 0.16 * (th / 1.3) ** 2), () => Math.PI * 0.6, 0.0011, toeMat, 18, 6);
    s.patch(up, Math.PI - 1.05, Math.PI + 1.05, (th) => Math.PI * (0.3 + 0.12 * ((th - Math.PI) / 1.05) ** 2), () => Math.PI * 0.62, 0.0012, accentMat);
    // Talasasta bočna traka (originalan oblik, bez ičijeg znaka)
    for (const outer of [1, -1]) {
        const pts = [];
        for (let i = 0; i <= 8; i++) {
            const t = i / 8;
            const th = outer * Math.PI * (0.28 + 0.52 * t);
            pts.push(s.at(up, th, Math.PI * (0.44 - 0.1 * Math.sin(t * Math.PI)), 0.0013));
        }
        s.tube(pts, (q) => 0.0032 * k * (0.55 + 0.45 * Math.sin(q * Math.PI)), accentMat, 14, 5, 0.4);
    }
    if (o.panel) {
        // Bočni panel (preko sredine stopala, do pete)
        const panelMat = fabric(o.panel, "cotton", { roughness: 0.5, sheen: 0.4 });
        for (const outer of [1, -1]) s.patch(up, outer * Math.PI * 0.32, outer * Math.PI * 0.78, (th) => Math.PI * (0.36 + 0.04 * Math.sin(Math.abs(th) * 3)), () => Math.PI * 0.6, 0.0009, panelMat, 10, 4);
    }
    if (o.sock !== null) {
        // Čarapa iznad patike (rebrasta, sa zadebljanim rubom)
        const sockHex = o.sock ?? "#FAFAF7";
        const rib = fabric(sockHex, "rib", { normalScale: 0.7 });
        const top = o.sockTop ?? 0.78;
        // Rub čarape je zadebljanje u samoj nogavici (jeftinije od posebnog prstena)
        s.t.leg(s.side, top, 1, 0.0028, rib, (tt) => 0.0024 * Math.exp(-(((tt - top - 0.012) / 0.012) ** 2)), undefined, top < 0.6 ? 14 : 18);
    }
    s.ankleCuff(0.955, 0.0075, upperMat, null);
    s.tongue(up, upperMat, 0.026);
    s.laces(up, o.studs || o.panel ? 3 : 4, plastic(o.lace ?? "#FFFFFF", 0.7), metal("#D5D8DE"), { z0: s.s.legR(1) * 1.15, z1: s.toeZ * 0.66 });
    s.heelTab(accentMat);
    if (o.studs) {
        // Kramponi ispod đona (cipela je malo podignuta, pa stoje na podu)
        const stud = rubber(darker(o.outsole ?? "#2A2733", 0.1), 0.6);
        const floor = s.floor;
        for (const [x, z] of [[0.3, 0.75], [-0.3, 0.75], [0.32, 0.4], [-0.32, 0.4], [0.28, -0.6], [-0.28, -0.6]] as const) {
            const g = new THREE.CylinderGeometry(0.0042 * k, 0.0032 * k, s.lift + 0.002, 6, 1, true);
            g.translate(x * s.s.foot.w * 0.9, floor + (s.lift + 0.002) / 2, s.center.z + z * (s.s.foot.len / 2) * 0.85);
            s.add(g, stud, "krampon");
        }
    }
    if (o.gems) {
        const g = gem(o.gems);
        for (const outer of [1, -1]) {
            for (const [th, ph] of [[0.55, 0.36], [0.95, 0.4], [1.4, 0.37]] as const) {
                const p = s.at(up, outer * th * Math.PI * 0.5, Math.PI * ph, 0.0015);
                const star = new THREE.OctahedronGeometry(0.0038 * k, 0);
                star.scale(1, 1, 0.5);
                star.translate(p.x, p.y, p.z);
                s.add(star, g, "kamencic");
            }
        }
    }
}

const sneakers = (id: string, color: string, accent: string, extra: Partial<SneakerOptions> = {}, lift = 0) =>
    shoe(id, (s) => sneaker(s, { color, accent, ...extra }), { lift });

// ── Čizme sa krznom (meke, krem/bež/roze) ───────────────────────────────────

function shearlingBoot(s: Shoe, hex: string) {
    const k = s.k;
    const suede = fabric(hex, "felt", { roughness: 0.92, sheen: 0.75, sheenLift: 0.25 });
    s.sole(0.015, 0.012 * k, rubber(darker(hex, 0.35), 0.75), { toeLift: 0.006 * k });
    s.sole(0.0145, 0.006 * k, rubber("#F3E9DA", 0.7), { base: 0.011 * k });
    const up = s.upperFn(0.0145, 0.034);
    s.upper(up, suede);
    const extra = s.shaft(0.7, 0.012, suede, 0.007);
    // Preklopljen krzneni rub i šavovi
    const fleece = plush(lighter(hex, 0.75));
    s.t.legRing(s.side, 0.72, extra(0.72, 0) + 0.003, 0.009 * k, 0.016 * k, fleece, () => 0);
    const seam = fabric(darker(hex, 0.18), "felt");
    for (const a of [0, Math.PI]) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 8; i++) pts.push(s.t.legPoint(s.side, 0.76 + (i / 8) * 0.24, a, 0, (tt, aa) => extra(tt, aa) + 0.0008));
        attachAt(s.ctx, shinBone(s), new THREE.Mesh(tubeGeo(pts, 0.0013 * k, s.r), seam), new THREE.Vector3());
    }
    const toeSeam: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) toeSeam.push(s.at(up, -1.2 + (i / 12) * 2.4, Math.PI * (0.38 + 0.06 * (1 - ((i - 6) / 6) ** 2)), 0.0012));
    s.tube(toeSeam, 0.0013 * k, seam, 24, 4);
}

// ── Niske cipele (baletanke, mašna, lakovane, mokasine) ─────────────────────

interface LowShoeOptions {
    material: THREE.Material;
    rim: THREE.Material;
    sole: THREE.Material;
    /** Ono što se vidi u otvoru: čarapa (boja) ili bosa noga (null) */
    sock: string | null;
    /** Visina ruba: veće = otvor manji */
    cut?: number;
    pointed?: boolean;
}

/** Niska cipela: gornjište odsečeno oko risa, rub otvora, unutra čarapa ili bosa noga */
function lowShoe(s: Shoe, ctx: ItemContext, o: LowShoeOptions) {
    const k = s.k;
    s.sole(0.009, 0.011 * k, o.sole, { toeLift: 0.006 * k, heel: 0.004 * k });
    const cut = o.cut ?? 0;
    const phCut = (th: number) => {
        const c = Math.cos(th);
        // Napred (prsti) niže, sa strane niže, pozadi (peta) više
        return Math.PI * (0.27 + cut + 0.1 * (1 - Math.abs(c)) + (c < 0 ? -0.06 * -c : 0.03 * c));
    };
    const up = s.upperFn(0.007, 0.004, o.pointed ? { narrowToe: 0.18, toeLen: 0.006 } : {});
    const cutFn = (u: number, v: number, out: THREE.Vector3) => {
        const th = u * Math.PI * 2;
        const ph0 = phCut(th);
        return up(u, (ph0 + (Math.PI - ph0) * v) / Math.PI, out);
    };
    s.surface(cutFn, 32, 12, o.material, true, [0.4, 0.12]);
    // Rub otvora (zaobljena ivica daje debljinu)
    const rim = (q: number, out: THREE.Vector3) => up(q, phCut(q * Math.PI * 2) / Math.PI, out);
    s.tube(Array.from({ length: 33 }, (_, i) => rim((i / 32) % 1, new THREE.Vector3())), 0.0022 * k, o.rim, 40, 5);
    // Unutra: čarapa (sa rebrastim rubom) ili bosa noga
    const inside = s.upperFn(0.0035, 0.0);
    const sockMat = o.sock ? fabric(o.sock, "rib", { normalScale: 0.6 }) : bodySurface(ctx);
    s.surface((u, v, out) => inside(u, v * 0.62, out), 28, 8, sockMat);
    if (o.sock) s.ankleCuff(0.93, 0.004, fabric(o.sock, "rib", { normalScale: 0.6 }), fabric(o.sock, "rib"), 0.0035);
    return { up, phCut, rim };
}

function balletFlat(s: Shoe, ctx: ItemContext) {
    const satin = fabric("#FFB8CB", "satin", { roughness: 0.38, sheen: 0.7 });
    const { up, phCut } = lowShoe(s, ctx, { material: satin, rim: fabric("#F78FB3", "satin"), sole: rubber("#F2A0BC", 0.6), sock: null, cut: 0.03 });
    bow(s, s.at(up, 0, phCut(0) + 0.06, 0.003), "#F45B8D", 0.75);
}

/** Mašnica na vrhu cipele (dve petlje i čvor) */
function bow(s: Shoe, at: THREE.Vector3, hex: string, size = 1) {
    const k = s.k * size;
    const mat = fabric(hex, "satin", { roughness: 0.4 });
    for (const sx of [1, -1]) {
        const g = new THREE.SphereGeometry(1, 12, 8);
        g.scale(0.011 * k, 0.0065 * k, 0.004 * k);
        g.rotateZ(sx * 0.25);
        g.rotateX(-0.5);
        g.translate(at.x + sx * 0.009 * k, at.y + 0.002, at.z);
        s.add(g, mat, "masna");
    }
    const knot = new THREE.SphereGeometry(0.0042 * k, 10, 8);
    knot.translate(at.x, at.y + 0.002, at.z + 0.001);
    s.add(knot, mat, "cvor");
}

function maryJane(s: Shoe, ctx: ItemContext) {
    const patent = lacquer("#E5484D");
    const { up } = lowShoe(s, ctx, { material: patent, rim: lacquer("#B8323A"), sole: rubber("#8A2328", 0.5), sock: "#FFFFFF" });
    // Kaišić preko risa sa kopčom
    const pts = [];
    for (let i = 0; i <= 8; i++) {
        const th = -1.55 + (i / 8) * 3.1;
        pts.push(s.at(up, th + Math.PI * 0.0, Math.PI * (0.16 + 0.1 * Math.abs(th / 1.55)), 0.003));
    }
    // Kaišić ide preko čarape (malo iznad gornjišta), ne seče nogu
    s.tube(pts.map((p) => p.clone().add(new THREE.Vector3(0, 0.002, -0.012 * s.k))), 0.0028 * s.k, patent, 24, 6, 0.45);
    const buckle = new THREE.TorusGeometry(0.0042 * s.k, 0.0012 * s.k, 4, 4);
    buckle.rotateY(Math.PI / 2);
    const bp = pts[8].clone().add(new THREE.Vector3(0, 0.002, -0.012 * s.k));
    buckle.translate(bp.x, bp.y, bp.z);
    s.add(buckle, gold(), "kopca");
    bow(s, s.at(up, 0, Math.PI * 0.36, 0.003), "#FFD15C");
}

function patent(s: Shoe, ctx: ItemContext) {
    const black = lacquer("#2A2733");
    const { up } = lowShoe(s, ctx, { material: black, rim: lacquer("#14121A"), sole: rubber("#14121A", 0.5), sock: "#2E3A66", cut: -0.02, pointed: true });
    s.laces(up, 3, plastic("#14121A", 0.5), null, { z0: s.toeZ * 0.12, z1: s.toeZ * 0.38, spread: 0.18, bow: true, lift: 0.0015 });
}

/** Mokasine (podrazumevano smeđe; nove boje: crne, bordo) */
function loafer(s: Shoe, ctx: ItemContext, hex = "#9A6236", sock = "#E8DCC6") {
    const brown = leather(hex);
    const rimHex = hex === "#9A6236" ? "#7A4A28" : darker(hex, 0.22);
    const { up } = lowShoe(s, ctx, { material: brown, rim: leather(rimHex), sole: rubber(hex === "#9A6236" ? "#5C3A25" : darker(hex, 0.4), 0.6), sock, cut: 0.01 });
    // Mokasinski šav u obliku slova U preko prstiju i kaišić preko risa
    const stitch = fabric("#E9C58A", "cotton");
    const u: THREE.Vector3[] = [];
    for (let i = 0; i <= 14; i++) {
        const q = -1 + (i / 14) * 2;
        u.push(s.at(up, q * 0.95, Math.PI * (0.34 + 0.08 * (1 - q * q)), 0.0014));
    }
    s.tube(u, 0.001 * s.k, stitch, 30, 4);
    const strap = [];
    for (let i = 0; i <= 8; i++) {
        const q = -1 + (i / 8) * 2;
        strap.push(s.at(up, q * 0.9, Math.PI * 0.3, 0.0022));
    }
    s.tube(strap, 0.003 * s.k, leather(rimHex), 16, 5, 0.4);
    const coin = new THREE.CylinderGeometry(0.0035 * s.k, 0.0035 * s.k, 0.0012, 12);
    const c = s.at(up, 0, Math.PI * 0.3, 0.0045);
    coin.rotateX(Math.PI / 2 - 0.5);
    coin.translate(c.x, c.y, c.z);
    s.add(coin, gold(), "novcic");
}

// ── Sandale ─────────────────────────────────────────────────────────────────

function sandal(s: Shoe, ctx: ItemContext, strapHex: string, flower?: string) {
    const k = s.k;
    const strap = leather(strapHex);
    s.sole(0.007, 0.006 * k, rubber(darker(strapHex, 0.3), 0.7));
    s.sole(0.0065, 0.008 * k, fabric("#E9DCC6", "felt", { roughness: 0.85, sheen: 0.2 }), { base: 0.005 * k });
    const foot = s.upperFn(0.0028, 0);
    // Kaiševi preko prstiju i preko risa
    for (const ph of [1.0, 0.62]) {
        const pts = [];
        for (let i = 0; i <= 6; i++) {
            const th = -1.45 + (i / 6) * 2.9;
            pts.push(s.at(foot, th, ph + 0.35 * Math.pow(Math.abs(th) / 1.45, 2), 0.0012));
        }
        s.tube(pts, 0.0042 * k, strap, 20, 6, 0.45);
    }
    // Kaiš oko članka i petni kaiš
    const legR = s.s.legR(1);
    const ankle = new THREE.TorusGeometry(legR + 0.004, 0.0034 * k, 6, seg(28, s.r, 12));
    ankle.rotateX(Math.PI / 2);
    ankle.scale(1, 1, 0.6);
    ankle.translate(0, 0.006, -0.002);
    s.add(ankle, strap, "kais");
    s.tube([new THREE.Vector3(0, s.floor + 0.014, -s.s.foot.back - 0.004), new THREE.Vector3(0, s.floor * 0.45, -s.s.foot.back - 0.006), new THREE.Vector3(0, 0.004, -legR - 0.004)], 0.004 * k, strap, 10, 6, 0.45);
    const buckle = new THREE.TorusGeometry(0.0055 * k, 0.0014 * k, 4, 4);
    buckle.rotateY(Math.PI / 2);
    buckle.translate(s.side * (legR + 0.006), 0.006, 0.002);
    s.add(buckle, metal("#D8C080"), "kopca");
    if (flower) {
        // Cvetić na kaišu preko prstiju
        const p = s.at(foot, 0, 0.62 * 1, 0.004);
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            const g = new THREE.SphereGeometry(0.0042 * k, 8, 6);
            g.scale(1, 0.45, 1);
            g.translate(p.x + Math.cos(a) * 0.0045 * k, p.y + 0.002, p.z + Math.sin(a) * 0.0045 * k);
            s.add(g, fabric(flower, "felt"), "latica");
        }
        const c = new THREE.SphereGeometry(0.003 * k, 8, 6);
        c.translate(p.x, p.y + 0.003, p.z);
        s.add(c, fabric("#FFD15C", "felt"), "cvet");
    }
    // Prsti (vide se u sandalama) — samo kod ljudi; šape i kopita ostaju svoje
    if (ctx.body.anchors.feet.kind === "foot") {
        const skin = skinMaterial(ctx.body.tone);
        const bare = s.upperFn(0, 0);
        for (let i = 0; i < 5; i++) {
            const th = s.side * (0.5 - i * 0.25);
            const p = s.at(bare, th, 1.12, -0.004);
            const toe = new THREE.SphereGeometry(i === 0 ? 0.0085 : 0.007 - i * 0.0004, 12, 8);
            toe.scale(1, 0.8, 1.1);
            toe.translate(p.x, p.y, p.z);
            s.add(toe, skin, "prst");
        }
    }
}

// ── Čizme ───────────────────────────────────────────────────────────────────

interface BootOptions {
    main: THREE.Material;
    sole: THREE.Material;
    /** Odakle počinje sara (0 = kuk, 1 = članak) */
    top: number;
    rim?: THREE.Material;
    rimR?: number;
    soleH?: number;
    heel?: number;
    pointed?: boolean;
    /** Krzneni rub (čizme za sneg) */
    fur?: string;
}

function boot(s: Shoe, o: BootOptions) {
    const k = s.k;
    const soleH = (o.soleH ?? 0.02) * k;
    const sole = s.sole(0.011, soleH, o.sole, { toeLift: 0.008 * k, heel: (o.heel ?? 0) * k, narrowToe: o.pointed ? 0.25 : 0 });
    // Rebra gazišta po boku
    s.soleStripe(sole, 0.82, 0.0012, 0.0016, o.sole);
    // Visok rist: gornjište se penje do članka i glatko prelazi u saru
    const up = s.upperFn(0.0105, 0.03, o.pointed ? { narrowToe: 0.22, toeLen: 0.008 * k } : {});
    s.upper(up, o.main);
    const extra = s.shaft(o.top, 0.0085, o.main, 0.005);
    if (o.fur) {
        // Krzneni rub: debeo mekan prsten sa „čupercima”
        s.t.legRing(s.side, o.top + 0.03, extra(o.top, 0) + 0.004, 0.011 * k, 0.017 * k, plush(o.fur), () => 0);
    } else if (o.rim) {
        s.shaftRim(o.top, extra, (o.rimR ?? 0.004) * k, (o.rimR ?? 0.004) * 1.6 * k, o.rim);
    }
    return { up, extra, sole };
}

/** Kruti ukras na sari (tufna, zvezda, srce), okrenut napolje */
function onShaft(s: Shoe, extra: LimbExtra, t: number, a: number, geometry: THREE.BufferGeometry, material: THREE.Material, lift = 0.0015) {
    const p = s.t.legPoint(s.side, t, a, 0, (tt, aa) => extra(tt, aa) + lift);
    const q = s.t.legPoint(s.side, t, a, 0, (tt, aa) => extra(tt, aa) + lift + 0.01);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), q.sub(p).normalize());
    attachAt(s.ctx, shinBone(s), mesh, p);
}

function rainBoot(s: Shoe, hex: string, dots?: string) {
    const k = s.k;
    const main = lacquer(hex);
    const { extra } = boot(s, { main, sole: rubber(darker(hex, 0.45), 0.7), top: 0.6, rim: lacquer(darker(hex, 0.12)), rimR: 0.005 });
    // Jezičak za navlačenje pozadi
    const tab = new THREE.CapsuleGeometry(0.004 * k, 0.012 * k, 3, 8);
    tab.scale(1.6, 1, 0.5);
    onShaft(s, extra, 0.6, Math.PI, tab, lacquer(darker(hex, 0.12)), 0.003);
    if (dots) {
        const spot = new THREE.SphereGeometry(0.0065 * k, 10, 6).scale(1, 1, 0.25);
        for (const [t, a] of [[0.68, 0.3], [0.76, -0.9], [0.84, 0.95], [0.7, 2.1], [0.82, -2.3], [0.9, 0], [0.74, 3.0]] as const) {
            onShaft(s, extra, t, a, spot, plastic(dots, 0.3), 0.0005);
        }
    }
}

function snowBoot(s: Shoe) {
    const suede = fabric("#9A6236", "felt", { roughness: 0.9, sheen: 0.6 });
    const { up } = boot(s, { main: suede, sole: rubber("#5C3A25", 0.75), top: 0.74, soleH: 0.026, fur: "#FFF6EA" });
    s.patch(up, -1.3, 1.3, (th) => Math.PI * (0.3 + 0.16 * (th / 1.3) ** 2), () => Math.PI * 0.6, 0.0012, leather("#7A4A28"), 18, 6);
    s.laces(up, 3, plastic("#E5484D", 0.6), metal("#C9A661"), { z0: s.s.legR(1) * 1.1, z1: s.toeZ * 0.55, bow: true });
}

function cowboyBoot(s: Shoe) {
    const k = s.k;
    const hide = leather("#9A6236");
    const dark = leather("#5C3A25");
    const { extra } = boot(s, { main: hide, sole: dark, top: 0.56, rim: dark, rimR: 0.0035, heel: 0.016, pointed: true });
    // Ukrasni štep na sari (talas) i zvezda
    const stitch = fabric("#E9A10E", "cotton");
    for (const a of [0.0, Math.PI]) {
        const pts = [];
        for (let i = 0; i <= 10; i++) {
            const t = 0.62 + (i / 10) * 0.28;
            pts.push(s.t.legPoint(s.side, t, a + 0.35 * Math.sin(i * 1.3), 0, (tt, aa) => extra(tt, aa) + 0.0008));
        }
        // Cev je u prostoru tela: koren kosti na (0, 0, 0) tela
        attachAt(s.ctx, shinBone(s), new THREE.Mesh(tubeGeo(pts, 0.0011 * k, s.r), stitch), new THREE.Vector3());
    }
    const star = starGeometry(0.0075 * k, 0.0032 * k, 0.002 * k);
    onShaft(s, extra, 0.8, s.side * 1.2, star, gold(), 0.0015);
}

/** Cev kroz tačke (prostor tela) */
function tubeGeo(points: THREE.Vector3[], r: number, res: number): THREE.BufferGeometry {
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, seg(24, res, 8), r, 4, false);
}

/** Zvezda sa pet krakova, malo ispupčena (bevel) */
function starGeometry(r: number, inner: number, depth: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r : inner;
        const a = Math.PI / 2 + (i * Math.PI) / 5;
        if (i === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.6, bevelSize: r * 0.12, bevelSegments: 2, curveSegments: 1 });
    g.translate(0, 0, -depth / 2);
    return g;
}

/** Srce (ispupčeno) */
function heartGeometry(r: number, depth: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, -r * 0.85);
    shape.bezierCurveTo(-r * 1.25, -r * 0.05, -r * 0.85, r * 0.95, 0, r * 0.38);
    shape.bezierCurveTo(r * 0.85, r * 0.95, r * 1.25, -r * 0.05, 0, -r * 0.85);
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.6, bevelSize: r * 0.12, bevelSegments: 2, curveSegments: 6 });
    g.translate(0, 0, -depth / 2);
    return g;
}

function fireBoot(s: Shoe) {
    const k = s.k;
    const black = rubber("#2A2733", 0.45);
    const { extra } = boot(s, { main: black, sole: rubber("#14121A", 0.7), top: 0.5, rim: rubber("#14121A", 0.5), rimR: 0.005, soleH: 0.026 });
    // Žuta traka i reflektujuća srebrna u sredini
    s.t.legRing(s.side, 0.7, extra(0.7, 0) + 0.0015, 0.0022 * k, 0.012 * k, fabric("#FFD15C", "cotton"), () => 0);
    s.t.legRing(s.side, 0.7, extra(0.7, 0) + 0.0028, 0.0012 * k, 0.0045 * k, reflective(), () => 0);
    // Ušice za navlačenje sa strane
    for (const a of [Math.PI / 2, -Math.PI / 2]) {
        const loop = new THREE.TorusGeometry(0.008 * k, 0.0022 * k, 5, 10, Math.PI);
        loop.rotateY(Math.PI / 2);
        onShaft(s, extra, 0.52, a, loop, rubber("#14121A", 0.5), 0.0015);
    }
}

function heroBoot(s: Shoe) {
    const k = s.k;
    const red = lacquer("#E5484D");
    const { extra } = boot(s, { main: red, sole: rubber("#B8323A", 0.5), top: 0.52, soleH: 0.018 });
    // Zlatan izvijen obod i srce napred
    s.t.legRing(s.side, 0.53, extra(0.53, 0) + 0.003, 0.004 * k, 0.012 * k, metal("#F2B530"), (tt, a) => 0.004 * Math.cos(a) * 0 + 0.002 * (1 + Math.cos(a)) * smoothstep(0.6, 0.53, tt));
    onShaft(s, extra, 0.66, 0, heartGeometry(0.01 * k, 0.003 * k), metal("#F2B530"), 0.0015);
}

function astroBoot(s: Shoe) {
    const k = s.k;
    const white = fabric("#F2F5FA", "felt", { roughness: 0.6, sheen: 0.5 });
    const { up, extra } = boot(s, { main: white, sole: rubber("#8C98AB", 0.7), top: 0.58, soleH: 0.032, rim: fabric("#C7D0DD", "rib"), rimR: 0.006 });
    s.patch(up, -1.3, 1.3, (th) => Math.PI * (0.3 + 0.16 * (th / 1.3) ** 2), () => Math.PI * 0.6, 0.0014, rubber("#AEB9C9", 0.5), 18, 6);
    s.t.legRing(s.side, 0.72, extra(0.72, 0) + 0.0015, 0.0025 * k, 0.009 * k, fabric("#3D9BE9", "cotton"), () => 0);
    for (const t of [0.82, 0.9]) s.t.legRing(s.side, t, extra(t, 0) + 0.0008, 0.0016 * k, 0.003 * k, fabric("#DDE4EE", "rib"), () => 0);
    // Kopča sa strane
    const clip = new THREE.BoxGeometry(0.006 * k, 0.012 * k, 0.003 * k);
    onShaft(s, extra, 0.65, s.side * Math.PI / 2, clip, silver(), 0.002);
}

function kneeBoot(s: Shoe) {
    const brown = leather("#7A4A28");
    const { extra } = boot(s, { main: brown, sole: rubber("#3A2418", 0.6), top: 0.12, rim: leather("#5C3A25"), rimR: 0.0035, heel: 0.008, soleH: 0.016 });
    // Rajsferšlus sa unutrašnje strane i kaišić sa kopčom
    const inner = -s.side * Math.PI / 2;
    const pts = [];
    for (let i = 0; i <= 10; i++) pts.push(s.t.legPoint(s.side, 0.16 + (i / 10) * 0.78, inner, 0, (tt, aa) => extra(tt, aa) + 0.0008));
    attachAt(s.ctx, shinBone(s), new THREE.Mesh(tubeGeo(pts, 0.0012 * s.k, s.r), metal("#C9A661")), new THREE.Vector3());
    s.t.legRing(s.side, 0.86, extra(0.86, 0) + 0.0012, 0.0016 * s.k, 0.005 * s.k, leather("#5C3A25"), () => 0);
    const buckle = new THREE.TorusGeometry(0.005 * s.k, 0.0013 * s.k, 4, 4);
    onShaft(s, extra, 0.86, s.side * Math.PI / 2, buckle, gold(), 0.003);
}

/** Planinarske cipele: do iznad članka, debeo nazubljen đon, kožni prednji deo i pertle */
function hikingBoot(s: Shoe) {
    const k = s.k;
    const suede = fabric("#8C6A48", "felt", { roughness: 0.9, sheen: 0.55 });
    const { up, extra } = boot(s, { main: suede, sole: rubber("#3A3A40", 0.8), top: 0.8, soleH: 0.026, rim: fabric("#C9473F", "rib"), rimR: 0.0045 });
    // Kožna kapica preko prstiju i pete
    s.patch(up, -1.3, 1.3, (th) => Math.PI * (0.3 + 0.16 * (th / 1.3) ** 2), () => Math.PI * 0.62, 0.0012, leather("#5C3A25"), 18, 6);
    s.laces(up, 4, plastic("#C9473F", 0.6), metal("#C9A661"), { z0: s.s.legR(1) * 1.1, z1: s.toeZ * 0.55, bow: true });
    // Jezičak za navlačenje pozadi
    const tab = new THREE.CapsuleGeometry(0.0035 * k, 0.01 * k, 3, 8);
    tab.scale(1.5, 1, 0.5);
    onShaft(s, extra, 0.8, Math.PI, tab, fabric("#C9473F", "rib"), 0.003);
}

// ── Klizaljke, rolšue, peraja ───────────────────────────────────────────────

function iceSkate(s: Shoe) {
    const k = s.k;
    const white = leather("#FFFFFF");
    const { up } = boot(s, { main: white, sole: rubber("#DDE4EE", 0.5), top: 0.66, soleH: 0.012, rim: plush("#FFFFFF"), rimR: 0.005 });
    s.laces(up, 4, plastic("#F78FB3", 0.6), metal("#C9CCD3"), { z0: s.s.legR(1) * 1.1, z1: s.toeZ * 0.6 });
    // Sečivo: tanko, sa zaobljenim (bezbednim) vrhom; nosači do đona
    const floor = s.floor;
    const z0 = -s.s.foot.back - 0.006;
    const z1 = s.toeZ + 0.012 * k;
    const blade = new THREE.Shape();
    const h = s.lift - 0.004;
    blade.moveTo(z0, 0);
    blade.lineTo(z1 - 0.012 * k, 0);
    blade.quadraticCurveTo(z1 + 0.008 * k, 0, z1 + 0.006 * k, h * 0.9);
    blade.lineTo(z0, h * 0.75);
    blade.closePath();
    const g = new THREE.ExtrudeGeometry(blade, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0008, bevelSegments: 1, curveSegments: 6 });
    g.rotateY(-Math.PI / 2);
    g.translate(0.0015, floor + 0.0008, 0);
    s.add(g, steel(), "secivo");
    for (const z of [-s.s.foot.back * 0.5, s.toeZ * 0.7]) {
        const post = new THREE.CylinderGeometry(0.003 * k, 0.0055 * k, s.lift * 0.7, 8);
        post.translate(0, floor + s.lift * 0.62, z);
        s.add(post, steel(), "nosac");
    }
}

function rollerSkate(s: Shoe) {
    const k = s.k;
    const pink = leather("#F45B8D");
    const { up } = boot(s, { main: pink, sole: rubber("#D93C70", 0.5), top: 0.68, soleH: 0.012, rim: fabric("#FFFFFF", "rib"), rimR: 0.005 });
    s.laces(up, 4, plastic("#FFFFFF", 0.6), metal("#C9CCD3"), { z0: s.s.legR(1) * 1.1, z1: s.toeZ * 0.6 });
    const floor = s.floor;
    const r = s.lift * 0.45;
    const wheel = plastic("#FFD15C", 0.35);
    const hub = silver();
    for (const z of [-s.s.foot.back * 0.55, s.toeZ * 0.72]) {
        const truck = new THREE.BoxGeometry(s.s.foot.w * 1.0, 0.005 * k, 0.012 * k);
        truck.translate(0, floor + r + 0.004, z);
        s.add(truck, hub, "osovina");
        for (const x of [-1, 1]) {
            const g = new THREE.CylinderGeometry(r, r, 0.012 * k, 16);
            g.rotateZ(Math.PI / 2);
            g.translate(x * s.s.foot.w * 0.5, floor + r, z);
            s.add(g, wheel, "tocak");
            const h = new THREE.CylinderGeometry(r * 0.4, r * 0.4, 0.0125 * k, 10);
            h.rotateZ(Math.PI / 2);
            h.translate(x * s.s.foot.w * 0.5, floor + r, z);
            s.add(h, hub, "glavcina");
        }
    }
    // Kočnica napred (guma)
    const stop = new THREE.CylinderGeometry(0.008 * k, 0.009 * k, 0.014 * k, 12);
    stop.rotateX(0.5);
    stop.translate(0, floor + 0.008 * k, s.toeZ + 0.006 * k);
    s.add(stop, rubber("#E9A10E", 0.7), "kocnica");
}

function flipper(s: Shoe) {
    const k = s.k;
    const green = rubber("#3BB273", 0.4);
    const dark = rubber("#2A8E57", 0.5);
    s.sole(0.011, 0.012 * k, dark);
    const up = s.upperFn(0.0105, 0.012);
    s.upper(up, green);
    s.ankleCuff(0.96, 0.006, green, dark);
    // List peraja: širok, tanak, pruža se napred po podu, sa rebrima
    const floor = s.floor + 0.004;
    const z0 = s.toeZ * 0.35;
    const len = 0.13 * k;
    const w0 = s.s.foot.w * 0.55;
    const w1 = s.s.foot.w * 1.05;
    const blade = buildSurface((u, v, out) => {
        const z = z0 + len * v;
        const half = w0 + (w1 - w0) * Math.pow(v, 0.8);
        const x = (u * 2 - 1) * half;
        // Zaobljen kraj sa urezom u sredini
        const tip = v > 0.85 ? -0.03 * k * Math.pow((v - 0.85) / 0.15, 2) * (1 - Math.abs(u * 2 - 1)) : 0;
        return out.set(x, floor + 0.004 * (1 - v) + 0.002 * Math.sin(u * Math.PI) * v, z + tip);
    }, { nu: seg(16, s.r, 6), nv: seg(12, s.r, 6), inside: (_u, _v, out) => out.set(0, floor - 0.05, z0 + len / 2) });
    s.add(blade, cached("flipper-blade", () => {
        const m = (rubber("#3BB273", 0.4) as THREE.MeshPhysicalMaterial).clone();
        m.side = THREE.DoubleSide;
        return m;
    }), "peraje");
    for (const x of [-0.6, 0, 0.6]) {
        const rib = new THREE.CylinderGeometry(0.0025 * k, 0.0025 * k, len * 0.8, 6);
        rib.rotateX(Math.PI / 2);
        rib.translate(x * w0 * 1.2, floor + 0.003, z0 + len * 0.45);
        s.add(rib, dark, "rebro");
    }
}

// ── Papuče ──────────────────────────────────────────────────────────────────

function slipper(s: Shoe, kind: "bunny" | "bear" | "frog") {
    const k = s.k;
    const fur = kind === "bunny" ? "#FFFFFF" : kind === "bear" ? "#BC8656" : "#6CC46F";
    const inner = kind === "bunny" ? "#F9B9C9" : kind === "bear" ? "#F1CBA4" : "#FFFFFF";
    const body = plush(fur);
    s.sole(0.013, 0.012 * k, fabric("#CFCBC6", "felt"));
    const up = s.upperFn(0.015, 0.02);
    s.upper(up, body);
    s.t.legRing(s.side, 0.97, 0.012, 0.008 * k, 0.012 * k, plush(kind === "frog" ? "#FFFFFF" : inner), () => 0);
    const face = s.at(up, 0, Math.PI * 0.34, 0);
    const black = plastic("#2A1D18", 0.25);
    // Oči i nos
    for (const sx of [1, -1]) {
        const e = s.at(up, sx * 0.42, Math.PI * (kind === "frog" ? 0.12 : 0.3), kind === "frog" ? 0.008 * k : 0.001);
        if (kind === "frog") {
            const bulb = new THREE.SphereGeometry(0.009 * k, 14, 10);
            bulb.translate(e.x, e.y, e.z);
            s.add(bulb, body, "oko");
            const w = new THREE.SphereGeometry(0.0055 * k, 12, 8);
            w.translate(e.x, e.y + 0.002, e.z + 0.006 * k);
            s.add(w, plastic("#FFFFFF", 0.3), "belo");
            const p = new THREE.SphereGeometry(0.003 * k, 10, 6);
            p.translate(e.x, e.y + 0.003, e.z + 0.01 * k);
            s.add(p, black, "zenica");
        } else {
            const g = new THREE.SphereGeometry(0.0032 * k, 10, 8);
            g.translate(e.x, e.y + 0.001, e.z + 0.001);
            s.add(g, black, "oko");
        }
    }
    if (kind === "bear") {
        const m = new THREE.SphereGeometry(1, 14, 10);
        m.scale(0.013 * k, 0.008 * k, 0.009 * k);
        m.translate(face.x, face.y - 0.001, face.z + 0.004 * k);
        s.add(m, plush(inner), "njuska");
    }
    const nose = new THREE.SphereGeometry(0.0034 * k, 10, 8);
    nose.scale(1.2, 0.8, 0.8);
    nose.translate(face.x, face.y + 0.004 * k, face.z + (kind === "bear" ? 0.012 : 0.004) * k);
    s.add(nose, kind === "frog" ? fabric("#3E9950", "felt") : plastic(kind === "bear" ? "#2A1D18" : "#F08AA0", 0.3), "nos");
    if (kind === "frog") {
        const pts = [];
        for (let i = 0; i <= 8; i++) pts.push(s.at(up, -0.5 + i / 8, Math.PI * 0.4, 0.001));
        s.tube(pts, 0.0012 * k, fabric("#3E9950", "felt"), 12, 4);
    }
    // Uši
    for (const sx of [1, -1]) {
        if (kind === "bunny") {
            const base = s.at(up, sx * 0.55, Math.PI * 0.08, 0);
            const ear = new THREE.CapsuleGeometry(0.0075 * k, 0.03 * k, 4, 10);
            ear.scale(1, 1, 0.45);
            ear.translate(0, 0.018 * k, 0);
            ear.rotateX(-0.5);
            ear.rotateZ(-sx * 0.35);
            ear.translate(base.x, base.y, base.z);
            s.add(ear, body, "uvo");
            const pink = new THREE.CapsuleGeometry(0.0045 * k, 0.022 * k, 3, 8);
            pink.scale(1, 1, 0.3);
            pink.translate(0, 0.018 * k, 0.0028 * k);
            pink.rotateX(-0.5);
            pink.rotateZ(-sx * 0.35);
            pink.translate(base.x, base.y, base.z);
            s.add(pink, plush(inner), "uvo-unutra");
        } else if (kind === "bear") {
            const base = s.at(up, sx * 0.62, Math.PI * 0.12, 0.004 * k);
            const ear = new THREE.SphereGeometry(0.009 * k, 14, 10);
            ear.scale(1, 1, 0.55);
            ear.translate(base.x, base.y + 0.004 * k, base.z);
            s.add(ear, body, "uvo");
            const pin = new THREE.SphereGeometry(0.005 * k, 10, 8);
            pin.scale(1, 1, 0.4);
            pin.translate(base.x, base.y + 0.004 * k, base.z + 0.004 * k);
            s.add(pin, plush(inner), "uvo-unutra");
        }
    }
}

registerItems("feet", [
    shoe("sandale", (s, ctx) => sandal(s, ctx, "#9A6236"), { covers: [] }),
    shoe("roze-sandale", (s, ctx) => sandal(s, ctx, "#F45B8D", "#FFFFFF"), { covers: [] }),
    sneakers("plave-patike", "#3D86E0", "#2C6BC0"),
    sneakers("crvene-patike", "#E5484D", "#B8323A"),
    sneakers("zelene-patike", "#3BB273", "#2A8E57"),
    sneakers("roze-patike", "#F78FB3", "#E0709A"),
    sneakers("zute-patike", "#FFD15C", "#F2A516"),
    sneakers("ljubicaste-patike", "#8E77E6", "#7258C9"),
    shoe("baletanke", balletFlat),
    shoe("zute-cizme", (s) => rainBoot(s, "#FFD15C")),
    shoe("crvene-cizme", (s) => rainBoot(s, "#E5484D")),
    shoe("cizme-tufne", (s) => rainBoot(s, "#3D86E0", "#FFFFFF")),
    shoe("cipele-masna", maryJane),
    shoe("papuce-zeke", (s) => slipper(s, "bunny")),
    shoe("papuce-mede", (s) => slipper(s, "bear")),
    shoe("papuce-zabice", (s) => slipper(s, "frog")),
    shoe("lakovane-cipele", patent),
    sneakers("kopacke", "#2A2733", "#3BB273", { mesh: true, sole: "#3BB273", outsole: "#2A2733", toe: "#2A2733", studs: true, sock: "#3BB273", sockTop: 0.42 }, 0.006),
    sneakers("narandzaste-kopacke", "#FF8A3D", "#E5732A", { mesh: true, sole: "#2A2733", outsole: "#14121A", toe: "#E5732A", studs: true, sock: "#FFFFFF", sockTop: 0.42 }, 0.006),
    shoe("cizme-sneg", snowBoot),
    shoe("peraja", flipper),
    sneakers("sjajne-patike", "#C7D0DD", "#B9A2F2", { upper: shimmer("#D8D2F2"), sole: "#B9A2F2", toe: "#EDE8FF", gems: "#FFE08A" }),
    sneakers("svetlece-patike", "#F78FB3", "#FFB8CB", { sole: "#FFFFFF", lights: ["#3D9BE9", "#FFD15C", "#3BB273", "#F45B8D"] }),
    shoe("kaubojske-cizme", cowboyBoot),
    shoe("klizaljke", iceSkate, { lift: 0.04 }),
    shoe("rolsue", rollerSkate, { lift: 0.036 }),
    shoe("vatrogasne-cizme", fireBoot),
    shoe("cizme-superheroja", heroBoot),
    shoe("cizme-astronauta", astroBoot),
    // Novo
    sneakers("bele-patike", "#F7F7F5", "#DDE4EE", { sole: "#FFFFFF", toe: "#FFFFFF", lace: "#F2F2F2" }),
    sneakers("crne-patike", "#2A2733", "#3A3546", { sole: "#FFFFFF", toe: "#FFFFFF" }),
    sneakers("narandzaste-patike", "#FF9A3D", "#E5732A"),
    sneakers("teget-patike", "#2E3A66", "#E5484D", { sole: "#FFFFFF" }),
    shoe("cizme-do-kolena", kneeBoot),
    shoe("mokasine", loafer),
    sneakers("krem-patike", "#F3EAD8", "#E2D3B8", { sole: "#FFFDF7", toe: "#FFFDF7", lace: "#F6EFE2", sock: "#FFFFFF" }),
    sneakers("crno-bele-patike", "#FAFAF7", "#2A2733", { sole: "#FFFFFF", toe: "#FFFFFF", panel: "#2A2733" }),
    shoe("cizme-krzno", (s) => shearlingBoot(s, "#D2A878")),
    shoe("roze-cizme-krzno", (s) => shearlingBoot(s, "#F2B3C6")),
    // ── Novo: više boja patika, planinarske cipele, čizme, mokasine, sandale ──
    sneakers("mint-patike", "#9FE2C8", "#62C7A4", { sole: "#FFFFFF", toe: "#FFFFFF" }),
    sneakers("lila-patike", "#C7B3EC", "#9F86DB", { sole: "#FFFFFF", toe: "#FFFFFF", lace: "#FFFFFF" }),
    sneakers("sive-patike", "#A7ADB8", "#7E848F", { sole: "#FFFFFF", toe: "#F2F2F2" }),
    sneakers("crveno-bele-patike", "#FAFAF7", "#D94040", { sole: "#FFFFFF", toe: "#FFFFFF", panel: "#D94040" }),
    sneakers("zuto-plave-patike", "#F7C948", "#2F6FC4", { sole: "#FFFFFF", panel: "#2F6FC4", lace: "#FFFFFF" }),
    sneakers("plave-kopacke", "#2F6FC4", "#FFFFFF", { mesh: true, sole: "#FFFFFF", outsole: "#2A2733", toe: "#1F4A94", studs: true, sock: "#2F6FC4", sockTop: 0.42 }, 0.006),
    shoe("planinarske-cipele", hikingBoot),
    shoe("zelene-gumene-cizme", (s) => rainBoot(s, "#4FBF6A")),
    shoe("roze-cizme-tufne", (s) => rainBoot(s, "#F78FB3", "#FFFFFF")),
    shoe("sive-cizme-krzno", (s) => shearlingBoot(s, "#A7A2A0")),
    shoe("crne-mokasine", (s, ctx) => loafer(s, ctx, "#2E2A2E", "#2E3A66")),
    shoe("bordo-mokasine", (s, ctx) => loafer(s, ctx, "#7A2A34")),
    shoe("plave-sandale", (s, ctx) => sandal(s, ctx, "#3D86E0"), { covers: [] }),
    shoe("bele-sandale-cvet", (s, ctx) => sandal(s, ctx, "#F4F1EA", "#F78FB3"), { covers: [] }),
]);

