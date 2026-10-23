// 3D crteži predmeta za mesto „back” (podaci: back.data.ts). Vlasnik: #3 (katalog).
// Ranci (kaiševi prate telo), plaštevi (padaju od ramena, rascep oko repa, blago se njišu),
// krila (blago mašu), boce za ronjenje, oklop kornjače i raketa-ranac. Sve sedi PREKO
// odeće koju lik nosi (debljina po predmetu: majica, duks, jakna, kostim).

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { registerItems, type ItemBuild, type ItemBuilder, type ItemContext } from "../contract";
import { attachAt, cloth, darker, fabric, gold, metal, plastic, plush, res, rubber, seg, TAU, type Side } from "./lib/common";
import { backPoint, backScale, cape, capeClasp, flatShape, shapeRim, shoulderStraps, wings } from "./lib/backwear";
import { blob, canvasMap, lathe, mesh, puffy, sheer, sheerMap, smoothProfile, softGlow, starShape, tube, V } from "./lib/props";

const q = (ctx: ItemContext, n: number, min = 4) => seg(n, res(ctx), min);

// ── Ranci ───────────────────────────────────────────────────────────────────

interface PackParts {
    group: THREE.Group;
    /** Središte zadnje strane ranca (prostor tela) i mere */
    center: THREE.Vector3;
    w: number;
    h: number;
    d: number;
}

/** Telo ranca (kruto na grudima): zaobljena kutija, džep, rajsferšlus, ručka; kaiševi preko ramena */
function backpack(ctx: ItemContext, color: string, options: { accent?: string; pocket?: boolean; strap?: string } = {}): PackParts {
    const s = ctx.body.shape;
    const k = backScale(ctx);
    const nylon = fabric(color, "cotton", { roughness: 0.55, sheen: 0.4, normalScale: 0.25 });
    const shade = fabric(darker(color, 0.16), "cotton", { roughness: 0.55, sheen: 0.35 });
    const w = 0.17 * k;
    const h = 0.19 * k;
    const d = 0.07 * k;
    const cy = s.chestY - 0.012 * k;
    const back = backPoint(ctx, cy, 0.006);
    const center = V(0, cy, back.z - d / 2);
    const group = new THREE.Group();
    group.add(mesh(new RoundedBoxGeometry(w, h, d, q(ctx, 4, 2), 0.03 * k), nylon));
    // Gornji poklopac (tamnija traka) i ručka
    group.add(mesh(new RoundedBoxGeometry(w * 1.01, h * 0.2, d * 1.02, q(ctx, 3, 2), 0.02 * k), shade, V(0, h * 0.4, 0)));
    group.add(mesh(tube([V(-0.025 * k, h / 2, 0), V(0, h / 2 + 0.02 * k, 0), V(0.025 * k, h / 2, 0)], 0.005 * k, 14, 6), shade));
    if (options.pocket !== false) {
        const pocket = fabric(options.accent ?? darker(color, 0.12), "cotton", { roughness: 0.5, sheen: 0.3 });
        group.add(mesh(new RoundedBoxGeometry(w * 0.72, h * 0.42, d * 0.42, q(ctx, 3, 2), 0.018 * k), pocket, V(0, -h * 0.2, -d / 2 - d * 0.1)));
        // Rajsferšlus džepa
        const zip = plastic("#2A2A30", 0.4);
        const arc: THREE.Vector3[] = [];
        for (let i = 0; i <= 12; i++) {
            const t = i / 12;
            arc.push(V((t - 0.5) * w * 0.6, -h * 0.02 - Math.sin(t * Math.PI) * 0.004, -d / 2 - d * 0.31));
        }
        group.add(mesh(tube(arc, 0.002 * k, 20, 5), zip));
        group.add(mesh(new RoundedBoxGeometry(0.008 * k, 0.018 * k, 0.004 * k, 2, 0.0015 * k), metal("#C9CCD3"), V(w * 0.22, -h * 0.05, -d / 2 - d * 0.33)));
    }
    // Rajsferšlus preko vrha
    const zipTop: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
        const ang = Math.PI * (i / 16);
        zipTop.push(V(-Math.cos(ang) * w * 0.45, h * 0.3 + Math.sin(ang) * h * 0.14, -d / 2 - 0.0008));
    }
    group.add(mesh(tube(zipTop, 0.0022 * k, 32, 5), plastic("#2A2A30", 0.4)));
    // Bočni džepovi sa mrežicom
    for (const side of [1, -1]) {
        group.add(mesh(new RoundedBoxGeometry(d * 0.35, h * 0.35, d * 0.7, 2, 0.01 * k), shade, V(side * (w / 2 + d * 0.12), -h * 0.22, 0)));
    }
    attachAt(ctx, "chest", group, center);
    const strapMat = fabric(options.strap ?? darker(color, 0.25), "cotton", { roughness: 0.6 });
    shoulderStraps(ctx, V(w * 0.28, cy + h * 0.38, back.z - 0.004), V(w * 0.42, cy - h * 0.38, back.z - 0.004), strapMat, 0.011, plastic("#FFC83D", 0.35));
    return { group, center, w, h, d };
}

function starPack(ctx: ItemContext): void {
    const { group, h, d } = backpack(ctx, "#E5484D", { accent: "#C53035" });
    const k = backScale(ctx);
    const star = mesh(puffy(starShape(0.036 * k, 0.016 * k), 0.006 * k, 0.004 * k, res(ctx), 5), plastic("#FFD15C", 0.3), V(0, -h * 0.2, -d / 2 - d * 0.32 - 0.004 * k));
    star.rotation.y = Math.PI;
    group.add(star);
}

function bearPack(ctx: ItemContext): void {
    const { group, w, h, d } = backpack(ctx, "#BC8656", { accent: "#A8703F", strap: "#8A5A30" });
    const k = backScale(ctx);
    const fur = plush("#BC8656");
    const dark = plush("#A8703F");
    const light = plush("#F1CBA4");
    const eye = plastic("#2A1D18", 0.15);
    // Meda na džepu (lice gleda unazad) i glava koja viri iznad desnog ramena
    const face = new THREE.Group();
    face.add(mesh(blob(0.05 * k, 0.045 * k, 0.03 * k, q(ctx, 22, 10), q(ctx, 16, 8)), fur));
    for (const sx of [1, -1]) {
        face.add(mesh(blob(0.016 * k, 0.016 * k, 0.009 * k, 12, 8), dark, V(sx * 0.038 * k, 0.034 * k, 0)));
        face.add(mesh(blob(0.007 * k, 0.008 * k, 0.004 * k, 10, 8), eye, V(sx * 0.017 * k, 0.01 * k, 0.026 * k)));
    }
    face.add(mesh(blob(0.02 * k, 0.015 * k, 0.012 * k, 14, 10), light, V(0, -0.012 * k, 0.024 * k)));
    face.add(mesh(blob(0.007 * k, 0.005 * k, 0.004 * k, 10, 6), eye, V(0, -0.006 * k, 0.035 * k)));
    face.position.set(0, -h * 0.18, -d / 2 - 0.01 * k);
    face.rotation.y = Math.PI;
    group.add(face);
    // Mekane ušice na vrhu ranca
    for (const sx of [1, -1]) group.add(mesh(blob(0.022 * k, 0.022 * k, 0.012 * k, 14, 10), dark, V(sx * w * 0.36, h * 0.5, 0)));
}

function schoolBag(ctx: ItemContext): void {
    const { group, w, h, d } = backpack(ctx, "#8E77E6", { accent: "#7258C9", strap: "#5A44B0" });
    const k = backScale(ctx);
    // Svetleća (reflektujuća) traka i pločica sa imenom
    group.add(mesh(new RoundedBoxGeometry(w * 0.9, 0.012 * k, 0.004 * k, 2, 0.002 * k), metal("#E8ECF2"), V(0, h * 0.12, -d / 2 - 0.001)));
    group.add(mesh(new RoundedBoxGeometry(0.05 * k, 0.03 * k, 0.004 * k, 2, 0.003 * k), plastic("#FFFFFF", 0.3), V(0, -h * 0.2, -d / 2 - d * 0.32 - 0.003 * k)));
    group.add(mesh(new RoundedBoxGeometry(0.03 * k, 0.004 * k, 0.002 * k, 1, 0.001 * k), plastic("#7258C9", 0.3), V(0, -h * 0.2, -d / 2 - d * 0.32 - 0.006 * k)));
}

function bunnyPack(ctx: ItemContext): void {
    const { group, w, h, d } = backpack(ctx, "#F7A8C8", { accent: "#F48FB8", strap: "#E0709A", pocket: false });
    const k = backScale(ctx);
    const fur = plush("#FBD3E3");
    const inner = plush("#F48FB8");
    const eye = plastic("#2A1D18", 0.15);
    // Duge uši na vrhu i lice na leđnoj strani
    for (const sx of [1, -1]) {
        const ear = new THREE.Group();
        ear.add(mesh(blob(0.018 * k, 0.05 * k, 0.01 * k, 14, 10), fur, V(0, 0.05 * k, 0)));
        ear.add(mesh(blob(0.01 * k, 0.038 * k, 0.004 * k, 12, 8), inner, V(0, 0.05 * k, -0.008 * k)));
        ear.position.set(sx * w * 0.24, h / 2 - 0.005, 0);
        ear.rotation.z = -sx * 0.18;
        group.add(ear);
    }
    const face = new THREE.Group();
    for (const sx of [1, -1]) {
        face.add(mesh(blob(0.007 * k, 0.009 * k, 0.004 * k, 10, 8), eye, V(sx * 0.024 * k, 0.012 * k, 0)));
        face.add(mesh(blob(0.011 * k, 0.007 * k, 0.003 * k, 10, 6), plush("#FF9DB8"), V(sx * 0.04 * k, -0.006 * k, -0.002 * k)));
    }
    face.add(mesh(blob(0.007 * k, 0.005 * k, 0.004 * k, 10, 6), plastic("#E0457A", 0.3), V(0, -0.002 * k, 0.002 * k)));
    face.position.set(0, -h * 0.08, -d / 2 - 0.002 * k);
    face.rotation.y = Math.PI;
    group.add(face);
    group.add(mesh(blob(0.022 * k, 0.022 * k, 0.018 * k, 14, 10), fur, V(0, -h * 0.42, -d * 0.2)));
}

// ── Plaštevi ────────────────────────────────────────────────────────────────

function capeItem(ctx: ItemContext, kind: "stars" | "royal"): ItemBuild {
    const royal = kind === "royal";
    const outer = royal
        ? fabric("#C53035", "fleece", { roughness: 0.75, sheen: 1, sheenLift: 0.25, normalScale: 0.4 })
        : fabric("#5E47BF", "cotton", { roughness: 0.55, sheen: 0.6, sheenLift: 0.25, normalScale: 0.25 });
    const lining = royal ? fabric("#FFD15C", "satin", { side: THREE.BackSide, roughness: 0.4 }) : fabric("#FFD15C", "satin", { side: THREE.BackSide, roughness: 0.4 });
    const ermine = royal ? fabric("#FFFFFF", "fleece", { sheen: 1, sheenLift: 0.6, roughness: 0.95, normalScale: 1.2 }) : gold();
    const pivot = cape(ctx, {
        outer,
        lining,
        length: royal ? 0.95 : 0.7,
        trim: royal ? { material: ermine, width: 0.016, thick: 0.012 } : { material: gold(), width: 0.0035, thick: 0.0035 },
        collar: royal ? ermine : undefined,
        spots: royal ? plush("#2A2733") : undefined,
        appliques: royal
            ? undefined
            : { geometry: new THREE.ExtrudeGeometry(starShape(0.018, 0.008), { depth: 0.0012, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0008, bevelSegments: 1, curveSegments: 2 }), material: plastic("#FFD15C", 0.3), at: [[0.2, 0.25], [0.65, 0.18], [0.45, 0.48], [0.85, 0.42], [0.15, 0.62], [0.6, 0.72], [0.32, 0.88], [0.82, 0.86]] },
    });
    capeClasp(ctx, royal ? metal("#FFC83D") : gold());
    return {
        animate: (time, _dt, live) => {
            if (!live) {
                pivot.rotation.set(0.02, 0, 0);
                return;
            }
            pivot.rotation.x = 0.025 + 0.018 * Math.sin(time * 1.1) + 0.008 * Math.sin(time * 2.3);
            pivot.rotation.z = 0.012 * Math.sin(time * 0.8);
        },
    };
}

// ── Krila ───────────────────────────────────────────────────────────────────

/** Elipsa kao oblik (krila pčele, vile) */
function ellipseShape(rx: number, ry: number, rot: number, cx: number, cy: number): THREE.Shape {
    const shape = new THREE.Shape();
    const n = 32;
    for (let i = 0; i <= n; i++) {
        const t = (i / n) * TAU;
        const x = Math.cos(t) * rx;
        const y = Math.sin(t) * ry;
        const px = cx + x * Math.cos(rot) - y * Math.sin(rot);
        const py = cy + x * Math.sin(rot) + y * Math.cos(rot);
        if (i === 0) shape.moveTo(px, py);
        else shape.lineTo(px, py);
    }
    return shape;
}

function veinsTexture(key: string, tint: string, line: string): THREE.Texture {
    return canvasMap(`zile-${key}`, 128, 128, (c, w, h) => {
        const g = c.createRadialGradient(w * 0.2, h * 0.5, 0, w * 0.3, h * 0.5, w * 0.9);
        g.addColorStop(0, "#FFFFFF");
        g.addColorStop(1, tint);
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        c.strokeStyle = line;
        c.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            c.beginPath();
            c.moveTo(0, h * 0.5);
            c.quadraticCurveTo(w * 0.5, h * (0.1 + i * 0.16), w, h * (0.05 + i * 0.18));
            c.stroke();
        }
    });
}

function membraneWing(ctx: ItemContext, shapes: { shape: THREE.Shape; material: THREE.Material }[], rim: THREE.Material, rimR: number): THREE.Group {
    const g = new THREE.Group();
    for (const { shape, material } of shapes) {
        g.add(mesh(flatShape(shape, q(ctx, 24, 8)), material));
        g.add(mesh(shapeRim(shape, rimR, q(ctx, 64, 24), 5), rim));
    }
    return g;
}

function beeWings(ctx: ItemContext): ItemBuild {
    const mat = sheerMap(veinsTexture("pcela", "#D8EEFF", "rgba(150,170,200,0.7)"), 0.78, true);
    const rim = plastic("#AEB9C9", 0.3);
    const set = wings(ctx, () => membraneWing(ctx, [
        { shape: ellipseShape(0.085, 0.045, 0.55, 0.075, 0.05), material: mat },
        { shape: ellipseShape(0.06, 0.032, -0.45, 0.055, -0.045), material: mat },
    ], rim, 0.0018), { spread: 0.5, flap: 0.18, speed: 3.2, size: 1.6 });
    return { animate: set.animate };
}

function fairyWings(ctx: ItemContext): ItemBuild {
    const pink = sheer("#FFB8CB", 0.72, true);
    const blue = sheer("#9EE0F6", 0.72, true);
    const rim = plastic("#FFFFFF", 0.2);
    const teardrop = (len: number, wd: number, rot: number) => {
        const s = new THREE.Shape();
        s.moveTo(0, 0);
        s.bezierCurveTo(len * 0.25, wd * 1.1, len * 0.85, wd * 1.0, len, 0.0);
        s.bezierCurveTo(len * 0.85, -wd * 0.7, len * 0.25, -wd * 0.6, 0, 0);
        const m = new THREE.Matrix4().makeRotationZ(rot);
        const pts = s.getPoints(24).map((p) => new THREE.Vector3(p.x, p.y, 0).applyMatrix4(m));
        return new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, p.y)));
    };
    const glow = softGlow("#FFF6D0", 0.9);
    const set = wings(ctx, () => {
        const g = membraneWing(ctx, [
            { shape: teardrop(0.21, 0.07, 0.6), material: pink },
            { shape: teardrop(0.14, 0.05, -0.55), material: blue },
        ], rim, 0.0022);
        // Iskrice na krilu
        [[0.1, 0.13], [0.05, 0.05], [0.08, -0.06]].forEach(([x, y]) => g.add(mesh(puffy(starShape(0.008, 0.003, 4), 0.001, 0.001, 0.5, 3), glow, V(x, y, 0.004))));
        return g;
    }, { spread: 0.55, flap: 0.12, speed: 1.6, size: 1.45 });
    return { animate: set.animate };
}

function butterflyWings(ctx: ItemContext): ItemBuild {
    const upperTex = canvasMap("leptir-gore", 256, 256, (c, w, h) => {
        c.fillStyle = "#FF8A3D";
        c.fillRect(0, 0, w, h);
        const g = c.createRadialGradient(0, h * 0.2, 0, 0, h * 0.2, w);
        g.addColorStop(0, "#FFB766");
        g.addColorStop(1, "#F26B21");
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#3A3546";
        c.fillRect(w * 0.86, 0, w * 0.14, h);
        c.fillRect(0, 0, w, h * 0.1);
        c.fillStyle = "#FFD15C";
        c.beginPath();
        c.arc(w * 0.62, h * 0.62, w * 0.11, 0, TAU);
        c.fill();
        c.fillStyle = "#FFFFFF";
        for (const [x, y, r] of [[0.92, 0.3, 0.035], [0.92, 0.55, 0.03], [0.92, 0.78, 0.03], [0.4, 0.75, 0.06]]) {
            c.beginPath();
            c.arc(w * x, h * y, w * r, 0, TAU);
            c.fill();
        }
    });
    const lowerTex = canvasMap("leptir-dole", 256, 256, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, "#D4C4FA");
        g.addColorStop(1, "#8E77E6");
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#FFFFFF";
        c.beginPath();
        c.arc(w * 0.55, h * 0.35, w * 0.08, 0, TAU);
        c.fill();
        c.fillStyle = "#3A3546";
        c.fillRect(0, 0, w, h * 0.08);
    });
    const upperMat = new THREE.MeshPhysicalMaterial({ map: upperTex, roughness: 0.5, sheen: 0.8, sheenColor: new THREE.Color("#FFFFFF"), side: THREE.DoubleSide });
    const lowerMat = new THREE.MeshPhysicalMaterial({ map: lowerTex, roughness: 0.5, sheen: 0.8, sheenColor: new THREE.Color("#FFFFFF"), side: THREE.DoubleSide });
    const rim = plastic("#3A3546", 0.35);
    // Gornje krilo: zaobljeno, šire napolje; donje: kraće, kapljasto
    const upper = new THREE.Shape();
    upper.moveTo(0, 0.0);
    upper.bezierCurveTo(0.02, 0.1, 0.12, 0.2, 0.2, 0.16);
    upper.bezierCurveTo(0.25, 0.13, 0.24, 0.04, 0.19, 0.01);
    upper.bezierCurveTo(0.13, -0.02, 0.05, -0.01, 0, 0.0);
    const lower = new THREE.Shape();
    lower.moveTo(0, -0.005);
    lower.bezierCurveTo(0.06, -0.01, 0.15, -0.04, 0.15, -0.11);
    lower.bezierCurveTo(0.15, -0.16, 0.08, -0.16, 0.05, -0.12);
    lower.bezierCurveTo(0.02, -0.08, 0.005, -0.04, 0, -0.005);
    const set = wings(ctx, () => membraneWing(ctx, [
        { shape: upper, material: cachedMat("leptir-gore", upperMat) },
        { shape: lower, material: cachedMat("leptir-dole", lowerMat) },
    ], rim, 0.0028), { spread: 0.5, flap: 0.2, speed: 1.4, size: 1.4 });
    return { animate: set.animate };
}

const matCache = new Map<string, THREE.Material>();
/** Materijal napravljen ovde čuva se jednom (prvi napravljen se koristi, ostali se oslobađaju) */
function cachedMat(key: string, m: THREE.Material): THREE.Material {
    const have = matCache.get(key);
    if (have) {
        m.dispose();
        return have;
    }
    matCache.set(key, m);
    return m;
}

function ladybugWings(ctx: ItemContext): void {
    const s = ctx.body.shape;
    const k = backScale(ctx);
    const dots = canvasMap("bubamara-oklop", 256, 128, (c, w, h) => {
        c.fillStyle = "#E5484D";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#2A2733";
        for (const [x, y, r] of [[0.15, 0.35, 0.07], [0.35, 0.6, 0.08], [0.6, 0.4, 0.07], [0.82, 0.62, 0.06], [0.45, 0.25, 0.05], [0.25, 0.8, 0.05], [0.7, 0.8, 0.05]]) {
            c.beginPath();
            c.ellipse(w * x, h * y, w * r * 0.5, h * r, 0, 0, TAU);
            c.fill();
        }
    });
    const shellMat = new THREE.MeshPhysicalMaterial({ map: dots, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1 });
    const shellM = cachedMat("bubamara-oklop", shellMat);
    const y = s.chestY - 0.01 * k;
    const root = backPoint(ctx, y, 0.008);
    const group = new THREE.Group();
    const wingMat = sheerMap(veinsTexture("bubamara", "#E6F2FF", "rgba(150,170,200,0.7)"), 0.5, true);
    for (const side of [1, -1] as Side[]) {
        // Pokrilje: pola spljoštene kupole, malo odškrinuto
        const geo = new THREE.SphereGeometry(1, q(ctx, 28, 12), q(ctx, 20, 8), 0, Math.PI, 0, Math.PI);
        geo.rotateY(side === 1 ? -Math.PI / 2 : Math.PI / 2);
        geo.scale(0.11 * k, 0.15 * k, 0.05 * k);
        const shell = mesh(geo, shellM);
        shell.position.set(side * 0.004 * k, 0, -0.01 * k);
        shell.rotation.set(0.12, -side * 0.18, side * 0.12);
        group.add(shell);
        // Ivica (tamna linija po sredini)
        const edge: THREE.Vector3[] = [];
        for (let i = 0; i <= 12; i++) {
            const t = (i / 12) * Math.PI;
            edge.push(V(0, Math.cos(t) * 0.15 * k, -Math.sin(t) * 0.05 * k));
        }
        const edgeMesh = mesh(tube(edge, 0.0025 * k, 24, 5), plastic("#2A2733", 0.3));
        edgeMesh.position.copy(shell.position);
        edgeMesh.rotation.copy(shell.rotation);
        group.add(edgeMesh);
        // Providna krilca ispod
        const membrane = mesh(flatShape(ellipseShape(0.1 * k, 0.045 * k, -0.5 * side, side * 0.12 * k, -0.09 * k), q(ctx, 20, 8)), wingMat);
        membrane.position.z = 0.004;
        group.add(membrane);
    }
    attachAt(ctx, "chest", group, root);
}

/** Pero: zaobljen list od korena duž +x (ravan, dvostran) */
function featherGeometry(len: number, wd: number, ctx: ItemContext): THREE.ShapeGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, -wd * 0.25);
    shape.bezierCurveTo(len * 0.35, -wd * 0.62, len * 0.85, -wd * 0.55, len, 0);
    shape.bezierCurveTo(len * 0.85, wd * 0.55, len * 0.35, wd * 0.62, 0, wd * 0.25);
    shape.lineTo(0, -wd * 0.25);
    return new THREE.ShapeGeometry(shape, q(ctx, 6, 3));
}

/**
 * Krilo od perja: prednja ivica ide od korena gore-napolje do „zgloba” pa do vrha;
 * perje visi sa nje u tri reda (pokrivno kratko, srednje, dugo na vrhu krila) — meko,
 * zaobljeno, kao krilo anđela ili ptice. `colors` = boje redova (od vrha ka dnu).
 */
function featherWing(ctx: ItemContext, colors: string[], size = 1): THREE.Group {
    const g = new THREE.Group();
    const n = q(ctx, 9, 6);
    const edge = (t: number) => V(0.02 + t * 0.19, 0.01 + Math.sin(Math.min(1, t * 1.5) * Math.PI * 0.5) * 0.15 - t * t * 0.05, 0).multiplyScalar(size);
    const rows = colors.length;
    for (let row = rows - 1; row >= 0; row--) {
        const mat = cloth(colors[row], "satin", { roughness: 0.55, sheen: 0.9, sheenLift: 0.45, normalScale: 0.15 });
        const reach = (rows === 3 ? [0.06, 0.11, 0.165] : [0.05, 0.07, 0.09, 0.11, 0.13, 0.155])[row];
        for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            const len = reach * (0.62 + 0.55 * t) * size;
            const f = mesh(featherGeometry(len, len * 0.38, ctx), mat);
            const base = edge(t * 0.95);
            // Pokrivno perje (red 0) je najbliže gledaocu iza lika (−z)
            f.position.set(base.x, base.y - row * 0.004 * size, -0.0025 * (rows - 1 - row) - 0.0003 * i);
            // Perje visi nadole kod korena i sve više napolje ka vrhu krila
            f.rotation.z = -Math.PI / 2 + 0.12 + t * 1.3;
            g.add(f);
        }
    }
    // Prednja ivica (mekani valjak) — debljina krila
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) pts.push(edge(i / 10));
    g.add(mesh(tube(pts, (s) => (0.013 - s * 0.007) * size, 20, 8), fabric(colors[0], "fleece", { sheen: 1, sheenLift: 0.5 })));
    return g;
}

function birdWings(ctx: ItemContext, angel: boolean): ItemBuild {
    const colors = angel ? ["#FFFFFF", "#F7F9FD", "#E8EEF7"] : ["#9FE0F6", "#3D9BE9", "#2C6BC0"];
    const set = wings(ctx, () => featherWing(ctx, colors, angel ? 1.15 : 1), { spread: 0.6, flap: 0.12, speed: 1.3, y: 0.05, size: 1.25 });
    return { animate: set.animate };
}

function rainbowWings(ctx: ItemContext): ItemBuild {
    const set = wings(ctx, () => featherWing(ctx, ["#F45B8D", "#FF8A3D", "#FFD15C", "#3BB273", "#3D9BE9", "#8E77E6"], 1.05), { spread: 0.6, flap: 0.12, speed: 1.3, y: 0.05, size: 1.25 });
    return { animate: set.animate };
}

function dragonWings(ctx: ItemContext): ItemBuild {
    const membraneTex = canvasMap("zmaj-opna", 128, 128, (c, w, h) => {
        const g = c.createLinearGradient(0, h, w, 0);
        g.addColorStop(0, "#A6E3A0");
        g.addColorStop(1, "#6CC46F");
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
    });
    const membrane = cachedMat("zmaj-opna", new THREE.MeshPhysicalMaterial({ map: membraneTex, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color("#E8FFE0"), side: THREE.DoubleSide, transparent: true, opacity: 0.94 }));
    const bone = fabric("#3E9950", "felt", { sheen: 0.6 });
    const claw = plastic("#FFD15C", 0.3);
    // Prsti krila iz zgloba (vrh) ka ivici; između njih opna sa talasastom ivicom
    const joint = new THREE.Vector2(0.06, 0.13);
    const tips = [new THREE.Vector2(0.24, 0.17), new THREE.Vector2(0.27, 0.06), new THREE.Vector2(0.22, -0.05), new THREE.Vector2(0.12, -0.1)];
    const set = wings(ctx, () => {
        const g = new THREE.Group();
        const shape = new THREE.Shape();
        shape.moveTo(0, 0.04);
        shape.lineTo(joint.x, joint.y);
        shape.lineTo(tips[0].x, tips[0].y);
        for (let i = 1; i < tips.length; i++) {
            const a = tips[i - 1];
            const b = tips[i];
            const mid = a.clone().lerp(b, 0.5).lerp(joint, 0.22);
            shape.quadraticCurveTo(mid.x, mid.y, b.x, b.y);
        }
        shape.quadraticCurveTo(0.05, -0.06, 0, -0.02);
        shape.lineTo(0, 0.04);
        g.add(mesh(flatShape(shape, q(ctx, 16, 6)), membrane));
        g.add(mesh(tube([V(0, 0.04, 0), V(joint.x * 0.5, joint.y * 0.75, 0.004), V(joint.x, joint.y, 0.004)], 0.0065, 12, 6), bone));
        for (const t of tips) g.add(mesh(tube([V(joint.x, joint.y, 0.004), V((joint.x + t.x) / 2, (joint.y + t.y) / 2 + 0.01, 0.004), V(t.x, t.y, 0.003)], (s) => 0.0045 * (1 - s * 0.5), 12, 5), bone));
        const nub = mesh(new THREE.ConeGeometry(0.008, 0.02, 10), claw, V(joint.x, joint.y + 0.012, 0.004));
        g.add(nub);
        g.add(mesh(new THREE.SphereGeometry(0.009, 12, 8), bone, V(joint.x, joint.y, 0.004)));
        return g;
    }, { spread: 0.55, flap: 0.14, speed: 1.4, y: 0.03, size: 1.45 });
    return { animate: set.animate };
}

// ── Opreme ──────────────────────────────────────────────────────────────────

function divingTanks(ctx: ItemContext): void {
    const s = ctx.body.shape;
    const k = backScale(ctx);
    const yellow = plastic("#FFD15C", 0.25);
    const cy = s.chestY - 0.03 * k;
    const back = backPoint(ctx, cy, 0.006);
    const r = 0.034 * k;
    const len = 0.21 * k;
    const group = new THREE.Group();
    for (const side of [1, -1]) {
        const tank = new THREE.Group();
        tank.add(mesh(lathe(smoothProfile([[0, -len / 2], [r * 0.7, -len / 2], [r, -len / 2 + r * 0.4], [r, len / 2 - r * 0.8], [r * 0.6, len / 2 - r * 0.1], [r * 0.25, len / 2]], q(ctx, 16)), q(ctx, 24, 10)), yellow));
        for (const y of [-len * 0.25, len * 0.2]) tank.add(mesh(new THREE.TorusGeometry(r * 1.01, 0.003 * k, 6, q(ctx, 24, 10)).rotateX(Math.PI / 2), plastic("#E9A10E", 0.35), V(0, y, 0)));
        tank.add(mesh(new THREE.CylinderGeometry(0.008 * k, 0.01 * k, 0.02 * k, 12), metal("#AEB9C9"), V(0, len / 2 + 0.008 * k, 0)));
        tank.add(mesh(new THREE.CylinderGeometry(0.006 * k, 0.006 * k, 0.03 * k, 10).rotateZ(Math.PI / 2), metal("#C9CED6"), V(0, len / 2 + 0.018 * k, 0)));
        tank.add(mesh(new THREE.CylinderGeometry(0.011 * k, 0.011 * k, 0.006 * k, 14).rotateZ(Math.PI / 2), rubber("#3A3546"), V(side * 0.016 * k, len / 2 + 0.018 * k, 0)));
        tank.position.set(side * (r + 0.004 * k), 0.02 * k, 0);
        group.add(tank);
    }
    // Crevo preko vrha (luk između ventila)
    group.add(mesh(tube([V(r + 0.004 * k, len / 2 + 0.03 * k + 0.02 * k, 0), V(0, len / 2 + 0.07 * k, 0.005), V(-(r + 0.004 * k), len / 2 + 0.05 * k, 0)], 0.005 * k, 20, 8), rubber("#3A3546")));
    // Ploča na leđima
    group.add(mesh(new RoundedBoxGeometry(r * 3.2, len * 0.9, 0.012 * k, 2, 0.005 * k), plastic("#3A3546", 0.5), V(0, 0, r - 0.002)));
    const center = V(0, cy, back.z - r - 0.008 * k);
    attachAt(ctx, "chest", group, center);
    const strap = fabric("#3A3546", "cotton", { roughness: 0.6 });
    shoulderStraps(ctx, V(r * 1.1, cy + len * 0.35, back.z - 0.004), V(r * 1.4, cy - len * 0.35, back.z - 0.004), strap, 0.012, metal("#AEB9C9"));
}

function turtleShell(ctx: ItemContext): void {
    const s = ctx.body.shape;
    const k = backScale(ctx);
    const cy = (s.chestY + s.waistY) / 2 + 0.01 * k;
    const back = backPoint(ctx, cy, 0.006);
    const scutes = canvasMap("oklop-kornjace", 256, 256, (c, w, h) => {
        c.fillStyle = "#4FAE5E";
        c.fillRect(0, 0, w, h);
        const hex = (x: number, y: number, r: number, fill: string) => {
            c.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * TAU + Math.PI / 6;
                c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8);
            }
            c.closePath();
            c.fillStyle = fill;
            c.fill();
            c.strokeStyle = "#2E7A3E";
            c.lineWidth = w * 0.018;
            c.stroke();
        };
        // Ekvidistantna mapa sfere: pločice po kupoli (gornja polovina slike je teme)
        for (let i = 0; i < 6; i++) hex(((i + 0.5) / 6) * w, h * 0.2, w * 0.075, "#6CC46F");
        for (let i = 0; i < 8; i++) hex(((i + 0.25) / 8) * w, h * 0.38, w * 0.06, "#62BC66");
        c.fillStyle = "#3E9950";
        c.fillRect(0, h * 0.46, w, h * 0.06);
    });
    const shellMat = cachedMat("oklop-kornjace", new THREE.MeshPhysicalMaterial({ map: scutes, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.3 }));
    const rx = (s.torsoW(cy) + 0.035) * 1.0;
    const ry = (s.shoulderY - s.hipY) * 0.62;
    const rz = 0.075 * k;
    const dome = new THREE.SphereGeometry(1, q(ctx, 32, 12), q(ctx, 20, 8), 0, TAU, 0, Math.PI / 2);
    dome.rotateX(-Math.PI / 2);
    dome.scale(rx, ry, rz);
    const group = new THREE.Group();
    const shell = mesh(dome, shellMat);
    shell.rotation.y = 0;
    group.add(shell);
    const rim = new THREE.TorusGeometry(1, 0.012, q(ctx, 8), q(ctx, 40, 14));
    rim.scale(rx, ry, 1.2);
    group.add(mesh(rim, plastic("#3E9950", 0.4)));
    // Kupola već gleda unazad (−z)
    attachAt(ctx, "chest", group, V(0, cy, back.z - 0.006));
    const strap = fabric("#3E9950", "cotton", { roughness: 0.6 });
    shoulderStraps(ctx, V(rx * 0.45, cy + ry * 0.7, back.z - 0.004), V(rx * 0.6, cy - ry * 0.7, back.z - 0.004), strap, 0.01);
}

function rocketPack(ctx: ItemContext): ItemBuild {
    const s = ctx.body.shape;
    const k = backScale(ctx);
    const cy = s.chestY - 0.01 * k;
    const back = backPoint(ctx, cy, 0.006);
    const group = new THREE.Group();
    const steel = plastic("#AEB9C9", 0.3);
    const plate = new RoundedBoxGeometry(0.15 * k, 0.15 * k, 0.04 * k, 3, 0.014 * k);
    group.add(mesh(plate, steel));
    group.add(mesh(new RoundedBoxGeometry(0.06 * k, 0.03 * k, 0.012 * k, 2, 0.005 * k), plastic("#3D7BE0", 0.3), V(0, 0.03 * k, -0.025 * k)));
    group.add(mesh(new THREE.SphereGeometry(0.006 * k, 10, 8), softGlow("#7CF29A", 0.8), V(-0.015 * k, 0.03 * k, -0.032 * k)));
    group.add(mesh(new THREE.SphereGeometry(0.006 * k, 10, 8), softGlow("#FFD15C", 0.8), V(0.015 * k, 0.03 * k, -0.032 * k)));
    const flames: THREE.Object3D[] = [];
    const white = plastic("#E3E8F0", 0.3);
    const red = plastic("#E5484D", 0.3);
    const rr = 0.032 * k;
    const len = 0.2 * k;
    for (const side of [1, -1]) {
        const rocket = new THREE.Group();
        rocket.add(mesh(lathe(smoothProfile([[rr * 0.75, -len / 2], [rr, -len / 2 + 0.02 * k], [rr, len / 2 - 0.04 * k], [rr * 0.95, len / 2 - 0.035 * k]], q(ctx, 10)), q(ctx, 24, 10)), white));
        rocket.add(mesh(lathe(smoothProfile([[rr * 0.97, len / 2 - 0.04 * k], [rr * 0.8, len / 2 + 0.01 * k], [rr * 0.35, len / 2 + 0.045 * k], [0, len / 2 + 0.055 * k]], q(ctx, 12)), q(ctx, 24, 10)), red));
        for (let f = 0; f < 3; f++) {
            const fin = new THREE.Shape();
            fin.moveTo(0, 0);
            fin.lineTo(0.026 * k, -0.03 * k);
            fin.lineTo(0.026 * k, -0.05 * k);
            fin.lineTo(0, -0.035 * k);
            const fg = puffy(fin, 0.004 * k, 0.002 * k, res(ctx), 4);
            const fm = mesh(fg, red);
            const ang = (f / 3) * TAU + Math.PI / 2;
            fm.position.set(Math.cos(ang) * rr * 0.9, -len / 2 + 0.05 * k, Math.sin(ang) * rr * 0.9);
            fm.rotation.y = -ang;
            rocket.add(fm);
        }
        // Prozorčić
        const win = mesh(new THREE.CircleGeometry(0.012 * k, 18), plastic("#7ED6F2", 0.1), V(0, 0.02 * k, -rr - 0.0015));
        win.rotation.y = Math.PI;
        rocket.add(win);
        const ringW = mesh(new THREE.TorusGeometry(0.012 * k, 0.0028 * k, 8, 18), metal("#C9CED6"), V(0, 0.02 * k, -rr - 0.001));
        rocket.add(ringW);
        rocket.add(mesh(new THREE.CylinderGeometry(rr * 0.55, rr * 0.75, 0.02 * k, 18), plastic("#5B6475", 0.35), V(0, -len / 2 - 0.008 * k, 0)));
        // Meki plamen (dve kapi koje sijaju), bez treperenja — samo blago diše
        const flame = new THREE.Group();
        const outerF = mesh(lathe(smoothProfile([[0, 0], [rr * 0.5, -0.012 * k], [rr * 0.35, -0.04 * k], [0, -0.07 * k]], 10), 16), softGlow("#FF9A3D", 1.1));
        const innerF = mesh(lathe(smoothProfile([[0, 0.002], [rr * 0.3, -0.01 * k], [rr * 0.2, -0.03 * k], [0, -0.05 * k]], 10), 14), softGlow("#FFE58A", 1.4));
        flame.add(outerF, innerF);
        flame.position.y = -len / 2 - 0.018 * k;
        rocket.add(flame);
        flames.push(flame);
        rocket.position.set(side * (0.075 * k + rr), -0.01 * k, 0.005 * k);
        group.add(rocket);
    }
    attachAt(ctx, "chest", group, V(0, cy, back.z - 0.022 * k));
    const strap = fabric("#5B6475", "cotton", { roughness: 0.6 });
    shoulderStraps(ctx, V(0.05 * k, cy + 0.06 * k, back.z - 0.004), V(0.06 * k, cy - 0.07 * k, back.z - 0.004), strap, 0.011, plastic("#E5484D", 0.35));
    return {
        animate: (time, _dt, live) => {
            flames.forEach((f, i) => {
                const breathe = live ? 1 + 0.06 * Math.sin(time * 2.2 + i) : 1;
                f.scale.set(1, breathe, 1);
            });
        },
    };
}

// ── Spisak ──────────────────────────────────────────────────────────────────

const BACK_THUMB: ItemBuilder["thumb"] = { focus: "back", yaw: Math.PI * 0.82 };
const deps: ItemBuilder["dependsOn"] = ["outfit", "neck"];
const item = (id: string, build: (ctx: ItemContext) => ItemBuild, extra: Partial<ItemBuilder> = {}): ItemBuilder => ({ id, build, dependsOn: deps, thumb: BACK_THUMB, ...extra });

registerItems("back", [
    item("ranac", (ctx) => {
        backpack(ctx, "#3D86E0");
    }),
    item("crveni-ranac", (ctx) => starPack(ctx)),
    item("ranac-meda", (ctx) => bearPack(ctx)),
    item("plast", (ctx) => capeItem(ctx, "stars"), { motion: "cape" }),
    item("krila-pcelice", (ctx) => beeWings(ctx), { motion: "wings" }),
    item("krila-bubamare", (ctx) => ladybugWings(ctx), { motion: "wings" }),
    item("boca-ronioca", (ctx) => divingTanks(ctx)),
    item("oklop-kornjace", (ctx) => turtleShell(ctx)),
    item("kraljevski-plast", (ctx) => capeItem(ctx, "royal"), { motion: "cape" }),
    item("krila-leptira", (ctx) => butterflyWings(ctx), { motion: "wings" }),
    item("krila-vile", (ctx) => fairyWings(ctx), { motion: "wings" }),
    item("krila-ptice", (ctx) => birdWings(ctx, false), { motion: "wings" }),
    item("krila-andjela", (ctx) => birdWings(ctx, true), { motion: "wings" }),
    item("krila-duge", (ctx) => rainbowWings(ctx), { motion: "wings" }),
    item("krila-zmaja", (ctx) => dragonWings(ctx), { motion: "wings" }),
    item("raketa-ranac", (ctx) => rocketPack(ctx)),
    item("skolska-torba", (ctx) => schoolBag(ctx)),
    item("ranac-zeka", (ctx) => bunnyPack(ctx)),
]);
