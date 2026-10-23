// 3D crteži predmeta za mesto „neck” (podaci: neck.data.ts). Vlasnik: #3 (katalog).
// Mašne, kravate, marame, šalovi i ogrlice. Sve prati trup i sedi PREKO odeće koju lik
// nosi (debljina se čita iz ctx.wear.outfit), a uz hidžab ide preko njega ili se ne crta.

import * as THREE from "three";
import { registerItems, type ItemBuilder, type ItemContext } from "../contract";
import { printTexture } from "../engine/textures";
import { fabric, gem, gold, leather, metal, plastic, plush, res, seg } from "./lib/common";
import { Neck, bowWing, heartShape, scallop, starShape } from "./lib/neckwear";
import { dotsTexture } from "./lib/prints";
import { mergeSimple } from "./lib/tailor";

type Build = (n: Neck, ctx: ItemContext) => void;

const neck = (id: string, build: Build, extra: Partial<ItemBuilder> = {}): ItemBuilder => ({
    id,
    build: (ctx) => build(new Neck(ctx), ctx),
    dependsOn: ["outfit", "hijab"],
    thumb: { focus: "upper" },
    ...extra,
});

const local = new Map<string, THREE.Material>();
function cached<T extends THREE.Material>(key: string, make: () => T): T {
    let m = local.get(key) as T | undefined;
    if (!m) {
        m = make();
        local.set(key, m);
    }
    return m;
}

/** Tkanina sa šarom (tufne, pruge) kao materijal sa mapom */
function patterned(key: string, map: THREE.Texture, kind: "satin" | "cotton" | "knit" = "cotton"): THREE.Material {
    return cached(`neck-${key}`, () => {
        const base = fabric("#FFFFFF", kind);
        const m = base.clone();
        m.map = map;
        m.side = THREE.DoubleSide;
        return m;
    });
}

// ── Mašne i kravate ─────────────────────────────────────────────────────────

/** Leptir-mašna na prednjem delu okovratnika */
function bowTie(n: Neck, wing: THREE.Material, knot: THREE.Material) {
    const s = n.s;
    const k = n.k;
    const y = s.neckBaseY - 0.01;
    const at = n.point(0, y, 0.007);
    const nn = n.normal(0, y);
    const wings: THREE.BufferGeometry[] = [];
    for (const side of [1, -1] as const) {
        const g = bowWing(0.044 * k, 0.006 * k, 0.018 * k, side, n.r);
        g.rotateZ(side * 0.06);
        wings.push(n.orient(g, at.clone(), nn));
    }
    n.skin(mergeSimple(wings), wing, "masna");
    const kg = new THREE.SphereGeometry(1, seg(14, n.r, 8), seg(10, n.r, 6));
    kg.scale(0.011 * k, 0.012 * k, 0.008 * k);
    n.skin(n.orient(kg, at.clone().addScaledVector(nn, 0.0025), nn), knot, "cvor");
    // Tanka traka oko vrata (tik uz vrat, ispod okovratnika)
    n.collar(s.neckBaseY + 0.004, 0.0016, 0.004, knot, 0.0012);
}

function tie(n: Neck, blade: THREE.Material, knotMat: THREE.Material) {
    const s = n.s;
    const k = n.k;
    const yKnot = s.neckBaseY - 0.008;
    const yEnd = s.waistY + 0.01;
    // List kravate: širi se nadole, vrh je šiljat; blago ispupčen (debljina)
    const w = Math.min(0.24, 0.022 * k / Math.max(0.05, s.torsoW(s.chestY)) * 1.15);
    n.t.patch(-w, w, yEnd, yKnot - 0.01, n.off + 0.003, blade, {
        puff: 0.0025,
        soft: 0.06,
        nu: 8,
        nv: 20,
        shapeA: (v) => {
            const half = v < 0.1 ? w * (0.2 + 0.8 * (v / 0.1)) : w * (1 - 0.45 * ((v - 0.1) / 0.9));
            return [-half, half];
        },
    });
    const at = n.point(0, yKnot, 0.006);
    const nn = n.normal(0, yKnot);
    const knot = new THREE.CylinderGeometry(0.0085 * k, 0.0055 * k, 0.016 * k, seg(12, n.r, 8));
    knot.scale(1, 1, 0.6);
    n.skin(n.orient(knot, at, nn), knotMat, "cvor");
    n.collar(s.neckBaseY + 0.004, 0.0016, 0.004, knotMat, 0.0012);
}

/** Kosa pruga na kravati (crta se na listu u UV 0–1) */
function tieStripes(base: string, stripe: string): THREE.Texture {
    const tex = printTexture(`tie-${base}-${stripe}`, (ctx, w, h) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = stripe;
        ctx.lineWidth = w * 0.12;
        for (let i = -4; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(-w * 0.2, i * h * 0.25);
            ctx.lineTo(w * 1.2, i * h * 0.25 + h * 0.35);
            ctx.stroke();
        }
    }, 64, 128);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// ── Marame i šalovi ─────────────────────────────────────────────────────────

/** Marama vezana oko vrata: trougao napred, čvor pozadi */
function bandana(n: Neck, mat: THREE.Material, knot: THREE.Material) {
    const s = n.s;
    const k = n.k;
    const top = n.topY + 0.002;
    const tip = Math.max(s.chestY - 0.01, top - 0.11 * k);
    n.t.patch(-1.35, 1.35, tip, top, n.off + 0.002, mat, {
        puff: 0.003,
        soft: 0.05,
        nu: 24,
        nv: 14,
        shapeA: (v) => {
            const half = 0.04 + 1.3 * Math.pow(v, 0.9);
            return [-half, half];
        },
    });
    // Smotani deo oko vrata
    n.thick(n.loop(0.008, 0.004, 4), () => [0.006 * k, 0.008 * k], knot, 56, 10);
    // Čvor i krajevi pozadi
    const back = n.point(Math.PI, top - 0.004, 0.01);
    const nn = n.normal(Math.PI, top);
    const g = new THREE.SphereGeometry(0.009 * k, 12, 8);
    n.skin(n.orient(g, back, nn), knot, "cvor");
    for (const sx of [1, -1]) {
        const end = [back.clone(), back.clone().add(new THREE.Vector3(sx * 0.012 * k, -0.02 * k, -0.004)), back.clone().add(new THREE.Vector3(sx * 0.02 * k, -0.034 * k, -0.002))];
        n.tube(end, (q) => 0.0075 * k * (1 - q * 0.6), knot, 10, 8, 0.35);
    }
}

/** Šal: dva debela pletena kruga oko vrata i dva kraja koja vise napred, sa resama */
function scarf(n: Neck, mat: THREE.Material, endMat: THREE.Material, fringe: THREE.Material) {
    const s = n.s;
    const k = n.k;
    const r = 0.012 * k;
    const wrap = (lift: number, drop: number) => n.loop(drop, r * 0.8 + lift, 3);
    n.thick(wrap(0, 0.012 * k), (q) => [r, r * (1.05 + 0.08 * Math.sin(q * 40))], mat, 64, 14);
    n.thick((q, out) => wrap(r * 0.7, 0.022 * k)(q, out).add(new THREE.Vector3(0, -r * 0.8, 0)), (q) => [r * 0.95, r * (0.95 + 0.08 * Math.sin(q * 33))], mat, 64, 12);
    // Krajevi: niz grudi, malo ukoso, levo od sredine
    const side = 0.32;
    for (const [da, len, lean] of [[side, 0.19, 0.03], [side + 0.22, 0.15, -0.02]] as const) {
        const a0 = da;
        const top = n.point(a0, n.topY - 0.03 * k, r * 1.4);
        const bottomY = Math.max(s.waistY - 0.02, top.y - len * k);
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 6; i++) {
            const t = i / 6;
            const y = top.y + (bottomY - top.y) * t;
            pts.push(n.point(a0 + lean * t, y, r * (1.6 - 0.3 * t) + 0.002 * i));
        }
        n.tube(pts, () => 0.016 * k, endMat, 18, 10, 0.3);
        const end = pts[pts.length - 1];
        const nn = n.normal(a0, end.y);
        const fringes: THREE.BufferGeometry[] = [];
        for (let i = 0; i < 5; i++) {
            const g = new THREE.CylinderGeometry(0.0016 * k, 0.0012 * k, 0.012 * k, 5);
            g.translate((i - 2) * 0.0058 * k, -0.007 * k, 0);
            fringes.push(n.orient(g, end.clone().add(new THREE.Vector3(0, -0.002, 0)), nn));
        }
        n.skinMany(fringes, fringe, "rese");
    }
}

/** Mekani šal (boa): debeo „čupav” krug i dva pompona napred */
function fluffy(n: Neck) {
    const k = n.k;
    const fur = plush("#FFFFFF");
    const r = 0.014 * k;
    n.thick(n.loop(0.016 * k, r * 0.9, 3), (q, a) => {
        const tuft = 1 + 0.16 * Math.sin(q * 70) * Math.sin(a * 3 + q * 20) + 0.08 * Math.sin(q * 130 + a * 5);
        return [r * tuft, r * tuft];
    }, fur, 96, 16);
    const pink = plush("#F78FB3");
    for (const sx of [1, -1]) {
        const at = n.point(sx * 0.22, n.topY - 0.045 * k, r * 1.7);
        const g = new THREE.IcosahedronGeometry(0.012 * k, 2);
        n.skin(g.translate(at.x, at.y, at.z), pink, "pompon");
    }
}

// ── Ogrlice ─────────────────────────────────────────────────────────────────

function beads(n: Neck) {
    const k = n.k;
    const loop = n.loop(0.05 * k, 0.004);
    n.cord(loop, 0.0009, fabric("#E9E3D6", "cotton"));
    const colors = ["#E5484D", "#FFD15C", "#3D86E0", "#3BB273", "#F45B8D", "#8E77E6"];
    const groups = colors.map(() => [] as THREE.BufferGeometry[]);
    const pts = n.along(loop, 22, 0.62, 1.38);
    pts.forEach(({ p, n: nn }, i) => {
        const g = new THREE.SphereGeometry(0.0058 * k, seg(10, n.r, 6), seg(8, n.r, 5));
        groups[i % colors.length].push(g.translate(p.x + nn.x * 0.004, p.y + nn.y * 0.004, p.z + nn.z * 0.004));
    });
    groups.forEach((g, i) => n.skinMany(g, plastic(colors[i], 0.22), "perle"));
}

function shells(n: Neck) {
    const k = n.k;
    const loop = n.loop(0.045 * k, 0.003);
    n.cord(loop, 0.001, fabric("#C98A55", "cotton"));
    const a: THREE.BufferGeometry[] = [];
    const b: THREE.BufferGeometry[] = [];
    const pts = n.along(loop, 9, 0.7, 1.3);
    pts.forEach(({ p, n: nn }, i) => {
        const g = scallop(0.011 * k, seg(14, n.r, 8), 4);
        (i % 2 ? b : a).push(n.orient(g, p.clone().addScaledVector(nn, 0.002).add(new THREE.Vector3(0, -0.006 * k, 0)), nn));
    });
    n.skinMany(a, plastic("#FFF1D6", 0.4), "skoljke");
    n.skinMany(b, plastic("#FFD3E0", 0.4), "skoljke");
}

function lei(n: Neck) {
    const k = n.k;
    const loop = n.loop(0.06 * k, 0.008, 1.6);
    const petals: THREE.BufferGeometry[] = [];
    const pinks: THREE.BufferGeometry[] = [];
    const centers: THREE.BufferGeometry[] = [];
    const pts = n.along(loop, 20);
    pts.forEach(({ p, n: nn }, i) => {
        const flower: THREE.BufferGeometry[] = [];
        for (let j = 0; j < 5; j++) {
            const ang = (j / 5) * Math.PI * 2 + i;
            const g = new THREE.SphereGeometry(0.0062 * k, seg(8, n.r, 5), seg(6, n.r, 4));
            g.scale(1, 0.75, 0.42);
            g.translate(Math.cos(ang) * 0.0062 * k, Math.sin(ang) * 0.0062 * k, 0);
            flower.push(g);
        }
        const merged = mergeSimple(flower);
        (i % 3 === 1 ? pinks : petals).push(n.orient(merged, p.clone().addScaledVector(nn, 0.004), nn, i * 0.7));
        const c = new THREE.SphereGeometry(0.0034 * k, 8, 6);
        centers.push(n.orient(c, p.clone().addScaledVector(nn, 0.0065), nn));
    });
    n.skinMany(petals, plush("#FFFFFF"), "cvetovi");
    n.skinMany(pinks, plush("#F78FB3"), "cvetovi");
    n.skinMany(centers, fabric("#FFD15C", "felt"), "sredine");
}

/** Privezak na lančiću (srce, zvezda) */
function pendant(n: Neck, shape: THREE.BufferGeometry, material: THREE.Material, rim?: THREE.Material) {
    const k = n.k;
    const drop = 0.055 * k;
    const loop = n.loop(drop, 0.002, 2.6);
    n.cord(loop, 0.0011, gold());
    const at = n.front(drop + 0.016 * k, 0.006);
    const nn = n.normal(0, at.y);
    n.skin(n.orient(shape, at, nn), material, "privezak");
    if (rim) {
        const ring = new THREE.TorusGeometry(0.003 * k, 0.001 * k, 5, 10);
        n.skin(n.orient(ring, at.clone().add(new THREE.Vector3(0, 0.014 * k, 0)), nn), rim, "alka");
    }
}

/** Medalja na traci u obliku slova V */
function medal(n: Neck, ribbonL: string, ribbonR: string, emblem: THREE.BufferGeometry, emblemMat: THREE.Material) {
    const s = n.s;
    const k = n.k;
    const drop = Math.min(0.09 * k, n.topY - s.chestY + 0.01);
    const bottom = n.front(drop, 0.004);
    // Dve trake od vrata (pozadi) do medalje
    for (const [side, hex] of [[1, ribbonL], [-1, ribbonR]] as const) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 14; i++) {
            const t = i / 14;
            // Pozadi oko vrata, pa od boka vrata strmo nadole do medalje (slovo V)
            const a = side * (t < 0.5 ? Math.PI * (1 - t) : (Math.PI / 2) * (1 - (t - 0.5) / 0.5) * 0.9 + 0.05);
            const y = n.topY - drop * Math.pow(Math.max(0, (t - 0.45) / 0.55), 1.3);
            pts.push(n.point(a, y, 0.002 + 0.002 * t));
        }
        pts.push(bottom.clone().add(new THREE.Vector3(side * 0.004 * k, 0.006 * k, 0.001)));
        n.tube(pts, 0.0065 * k, fabric(hex, "satin", { roughness: 0.4 }), 30, 6, 0.22);
    }
    const nn = n.normal(0, bottom.y);
    const at = bottom.clone().addScaledVector(nn, 0.007).add(new THREE.Vector3(0, -0.016 * k, 0));
    const disc = new THREE.CylinderGeometry(0.023 * k, 0.023 * k, 0.005 * k, seg(28, n.r, 14));
    disc.rotateX(Math.PI / 2);
    n.skin(n.orient(disc, at.clone(), nn), metal("#E9A10E"), "medalja");
    const inner = new THREE.TorusGeometry(0.019 * k, 0.0016 * k, 5, seg(28, n.r, 14));
    n.skin(n.orient(inner, at.clone().addScaledVector(nn, 0.0024 * k), nn), metal("#FFC83D"), "rub");
    n.skin(n.orient(emblem, at.clone().addScaledVector(nn, 0.003 * k), nn), emblemMat, "znak");
    const loopTop = new THREE.TorusGeometry(0.0035 * k, 0.0012 * k, 5, 10);
    n.skin(n.orient(loopTop, at.clone().add(new THREE.Vector3(0, 0.025 * k, 0)), nn), metal("#E9A10E"), "alka");
}

function whistle(n: Neck) {
    const k = n.k;
    const drop = 0.075 * k;
    const loop = n.loop(drop, 0.002, 2.2);
    n.cord(loop, 0.0016, fabric("#3D9BE9", "cotton"), 0.6);
    const at = n.front(drop + 0.008 * k, 0.009);
    const nn = n.normal(0, at.y);
    const body = new THREE.CapsuleGeometry(0.0085 * k, 0.012 * k, 4, seg(14, n.r, 8));
    body.rotateZ(Math.PI / 2);
    const mouth = new THREE.BoxGeometry(0.012 * k, 0.008 * k, 0.007 * k);
    mouth.translate(-0.016 * k, 0.003 * k, 0);
    const steel = metal("#C7D0DD");
    n.skin(n.orient(mergeSimple([body, mouth]), at.clone(), nn), steel, "pistaljka");
    const hole = new THREE.CylinderGeometry(0.0028 * k, 0.0028 * k, 0.002, 10);
    hole.rotateX(Math.PI / 2);
    hole.translate(0.004 * k, 0.0035 * k, 0.0085 * k);
    n.skin(n.orient(hole, at.clone(), nn), plastic("#5B6475", 0.4), "rupa");
    const ring = new THREE.TorusGeometry(0.0035 * k, 0.0012 * k, 5, 10);
    ring.translate(0.012 * k, 0.008 * k, 0);
    n.skin(n.orient(ring, at.clone(), nn), steel, "alka");
}

/** Ogrlica sa zvoncetom: kožna traka oko vrata i zlatno zvonce */
function bellCollar(n: Neck) {
    const s = n.s;
    const k = n.k;
    const y = Math.min(s.neckBaseY + 0.012, (s.neckBaseY + s.headBoneY) / 2);
    n.collar(y, 0.0045 * k, 0.009 * k, leather("#E5484D"), 0.002);
    // Zvonce visi napred
    const at = torsoPointFront(n, y - 0.014 * k, 0.012 * k);
    const nn = new THREE.Vector3(0, -0.2, 1).normalize();
    const pts = [new THREE.Vector2(0, -0.012), new THREE.Vector2(0.008, -0.012), new THREE.Vector2(0.0115, -0.009), new THREE.Vector2(0.01, 0.0), new THREE.Vector2(0.0065, 0.008), new THREE.Vector2(0.0, 0.0095)].map((p) => p.multiplyScalar(k));
    const bell = new THREE.LatheGeometry(pts, seg(20, n.r, 10));
    n.skin(n.orient(bell, at.clone(), nn), metal("#FFC83D"), "zvonce");
    const slit = new THREE.BoxGeometry(0.0022 * k, 0.007 * k, 0.003 * k);
    slit.translate(0, -0.008 * k, 0.0105 * k);
    n.skin(n.orient(slit, at.clone(), nn), plastic("#8A5A20", 0.5), "prorez");
    const ring = new THREE.TorusGeometry(0.003 * k, 0.0012 * k, 5, 10);
    ring.translate(0, 0.012 * k, 0);
    n.skin(n.orient(ring, at.clone(), nn), metal("#E9A10E"), "alka");
    const buckle = new THREE.BoxGeometry(0.008 * k, 0.009 * k, 0.002 * k);
    const back = torsoPointAt(n, Math.PI * 0.75, y, 0.0062 * k);
    n.skin(n.orient(buckle, back, new THREE.Vector3(back.x, 0, back.z).normalize()), metal("#D5D8DE"), "kopca");
}

function torsoPointFront(n: Neck, y: number, lift: number): THREE.Vector3 {
    return torsoPointAt(n, 0, y, lift);
}

function torsoPointAt(n: Neck, a: number, y: number, lift: number): THREE.Vector3 {
    const p = new THREE.Vector3();
    // Na vratu (bez odeće): sama površina vrata + debljina
    return n.t.point(a, y, lift, undefined, p);
}

// ── Minđuše (na kosti glave, kod ušne resice) ──────────────────────────────

function earrings(ctx: ItemContext, style: "hoop" | "heart") {
    const a = ctx.body.anchors;
    const k = Math.min(1.3, Math.max(0.85, a.head.h / 0.28));
    const human = a.ears.kind === "human" || a.ears.kind === "none";
    for (const [side, ear] of [[1, a.ears.left], [-1, a.ears.right]] as const) {
        const p = ear.clone();
        if (human) {
            // Ušna resica: ispod sredine uha, malo napolje
            p.add(new THREE.Vector3(side * 0.004 * k, -0.022 * k, 0.003 * k));
        } else {
            // Životinja: mala kopča na korenu uha, sa spoljne strane
            const out = new THREE.Vector3(ear.x - a.head.center.x, 0, ear.z - a.head.center.z).normalize();
            p.addScaledVector(out, a.ears.radius * 0.7).add(new THREE.Vector3(0, -0.004, 0));
        }
        const group = new THREE.Group();
        if (style === "hoop") {
            const r = 0.0105 * k;
            const hoop = new THREE.TorusGeometry(r, 0.00155 * k, 8, seg(28, res(ctx), 14));
            // Ravan alke: između boka i lica (vidi se i spreda)
            hoop.translate(0, -r, 0);
            const mesh = new THREE.Mesh(hoop, gold());
            mesh.rotation.y = side * 1.0;
            group.add(mesh);
        } else {
            const stud = new THREE.SphereGeometry(0.0024 * k, 10, 8);
            group.add(new THREE.Mesh(stud, gold()));
            const chain = new THREE.CylinderGeometry(0.0006 * k, 0.0006 * k, 0.006 * k, 5);
            chain.translate(0, -0.003 * k, 0);
            group.add(new THREE.Mesh(chain, gold()));
            const heart = heartShape(0.0055 * k, 0.0018 * k, 6);
            heart.translate(0, -0.0105 * k, 0);
            const hm = new THREE.Mesh(heart, fabric("#F45B8D", "satin", { roughness: 0.22 }));
            hm.rotation.y = side * 0.9;
            group.add(hm);
        }
        group.position.copy(ctx.toBone("head", p));
        ctx.attach("head", group);
    }
}

registerItems("neck", [
    neck("leptir-masna", (n) => bowTie(n, fabric("#E5484D", "satin", { roughness: 0.42 }), fabric("#C53035", "satin")), { withHijab: "hide" }),
    neck("kravata", (n) => tie(n, patterned("kravata-plava", tieStripes("#3D7BE0", "#FFD15C"), "satin"), fabric("#2C5DB0", "satin"))),
    neck("crvena-kravata", (n) => tie(n, patterned("kravata-crvena", tieStripes("#E5484D", "#FFFFFF"), "satin"), fabric("#B8323A", "satin"))),
    neck("ogrlica-skoljke", shells),
    neck("pistaljka", whistle),
    neck("marama", (n) => bandana(n, patterned("marama-crvena", dotsTexture("#E5484D", "#FFFFFF", 0.022, 0.12)), fabric("#E5484D", "cotton")), { withHijab: "hide" }),
    neck("sal", (n) => scarf(n, fabric("#3BB2A0", "knit", { normalScale: 0.9 }), fabric("#35A190", "knit", { normalScale: 0.9 }), fabric("#2C8F80", "knit"))),
    neck("leptir-masna-tufne", (n) => bowTie(n, patterned("masna-tufne", dotsTexture("#FFC83D", "#E5484D", 0.012, 0.16), "satin"), fabric("#E9A10E", "satin")), { withHijab: "hide" }),
    neck("ogrlica-perle", beads),
    neck("zvonce", bellCollar, { withHijab: "hide" }),
    neck("ogrlica-zvezda", (n) => medal(n, "#3D7BE0", "#2C5DB0", starShape(0.0155 * n.k, 0.0066 * n.k, 0.0018 * n.k), metal("#FFE08A"))),
    neck("ogrlica-srce", (n) => pendant(n, heartShape(0.012 * n.k, 0.004 * n.k), fabric("#F45B8D", "satin", { roughness: 0.25 }), gold())),
    neck("prugasti-sal", (n) => {
        const rainbow = patterned("sal-duga", rainbowStripes(), "knit");
        scarf(n, rainbow, rainbow, fabric("#FF8A3D", "knit"));
    }),
    neck("ogrlica-cvece", lei),
    neck("krzneni-sal", fluffy),
    neck("medalja", (n) => medal(n, "#E5484D", "#FFFFFF", heartShape(0.011 * n.k, 0.0026 * n.k), fabric("#E5484D", "satin", { roughness: 0.3 }))),
    // Novo
    neck("plava-marama", (n) => bandana(n, patterned("marama-plava", dotsTexture("#3D86E0", "#FFFFFF", 0.022, 0.12)), fabric("#3D86E0", "cotton")), { withHijab: "hide" }),
    neck("mindjuse-alke", (_n, ctx) => earrings(ctx, "hoop"), { withHijab: "hide", thumb: { focus: "face" } }),
    neck("mindjuse-srce", (_n, ctx) => earrings(ctx, "heart"), { withHijab: "hide", thumb: { focus: "face" } }),
    neck("ogrlica-kamencici", (n) => pendant(n, new THREE.OctahedronGeometry(0.01 * n.k, 0).scale(1, 1.3, 0.6), gem("#7FD3F7"), gold())),
]);

/** Pruge duge za šal (ponavljanje po dužini) */
function rainbowStripes(): THREE.Texture {
    const tex = printTexture("sal-duga-pruge", (ctx, w, h) => {
        const colors = ["#E5484D", "#FF8A3D", "#FFD15C", "#3BB273", "#3D86E0", "#8E77E6"];
        colors.forEach((c, i) => {
            ctx.fillStyle = c;
            ctx.fillRect((i / colors.length) * w, 0, w / colors.length + 1, h);
        });
    }, 96, 8);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 1);
    return tex;
}

