// 3D crteži predmeta za mesto „hand” (podaci: hand.data.ts). Vlasnik: #3 (katalog).
// Lik drži predmet u DESNOJ šaci (gledaocu levo). Svaki predmet se crta u svom okviru
// (+y = drška nagore, +z = lice ka gledaocu, +x = ka telu) u merama deteta, a `hold`
// ga postavlja u pesnicu i uveća/umanji po liku. Baloni i zmaj lebde (blago se njišu),
// vetrenjača se vrti, mehurići polako lete — sve miruje uz „Manje animacija”.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { material, registerItems, type ItemBuild, type ItemBuilder, type ItemContext } from "../contract";
import { darker, fabric, gold, metal, plastic, plush, res, rubber, TAU } from "./lib/common";
import {
    V,
    beamMaterial,
    blob,
    bubbleMaterial,
    canvasMap,
    glossyMap,
    gripPoint,
    heartShape,
    hold,
    keepUpright,
    lathe,
    mesh,
    meshMetal,
    paperMap,
    propScale,
    puffy,
    q,
    smoothProfile,
    softGlow,
    starShape,
    tube,
    type Animate,
} from "./lib/props";

const wood = (hex: string, roughness = 0.62) => material({ kind: "wood", color: hex, roughness });
const string = () => fabric("#ECEFF3", "cotton", { roughness: 0.8 });
const leafMat = () => fabric("#5DBB63", "felt", { sheen: 0.5 });
const stemMat = () => fabric("#4FAE5E", "felt", { sheen: 0.4 });

// ── Pomoćni delovi ──────────────────────────────────────────────────────────

/** Štapić (drška) duž ose y, od y0 do y1 */
function stick(ctx: ItemContext, r: number, y0: number, y1: number, mat: THREE.Material): THREE.Mesh {
    const g = new THREE.CapsuleGeometry(r, y1 - y0 - 2 * r, 3, q(ctx, 12));
    g.translate(0, (y0 + y1) / 2, 0);
    return mesh(g, mat);
}

/** List (spljoštena kap) od tačke `at` u pravcu ugla `ang` (u ravni xy) */
function leaf(ctx: ItemContext, at: THREE.Vector3, ang: number, len: number, mat: THREE.Material): THREE.Mesh {
    const g = blob(len * 0.5, len * 0.2, len * 0.06, q(ctx, 14), q(ctx, 8));
    g.translate(len * 0.5, 0, 0);
    const m = mesh(g, mat, at);
    m.rotation.set(0.25, 0.3, ang);
    return m;
}

/** Cvet u ravni lica (+z): latice oko sredine */
function bloom(ctx: ItemContext, petals: number, petal: THREE.Material, middle: THREE.Material, size: number, layers = 1, seeds?: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    for (let l = 0; l < layers; l++) {
        for (let i = 0; i < petals; i++) {
            const a = (i / petals) * TAU + l * (Math.PI / petals);
            const pg = blob(size * 0.34, size * (layers > 1 ? 0.8 : 0.55), size * 0.1, q(ctx, 12), q(ctx, 8));
            pg.translate(0, size * (layers > 1 ? 0.95 : 0.62), 0);
            const p = mesh(pg, petal);
            p.rotation.set(0.12 + l * 0.12, 0, a);
            p.position.z = -l * size * 0.06;
            g.add(p);
        }
    }
    const center = mesh(blob(size * (seeds ? 0.62 : 0.36), size * (seeds ? 0.62 : 0.36), size * 0.2, q(ctx, 20), q(ctx, 12)), seeds ?? middle);
    center.position.z = size * 0.06;
    g.add(center);
    return g;
}

/** Konac od šake do tačke (lokalno), blago povijen */
function cord(ctx: ItemContext, to: THREE.Vector3, bend = 0.04, r = 0.0016): THREE.Mesh {
    const mid = to.clone().multiplyScalar(0.5).add(V(bend, 0, bend * 0.5));
    const p1 = to.clone().multiplyScalar(0.25).add(V(bend * 0.6, 0, 0));
    return mesh(tube([V(0, -0.01, 0), p1, mid, to], r, q(ctx, 28), 5), string());
}

/** Gumeni balon (kap sa čvorićem) */
function balloon(ctx: ItemContext, hex: string, radius = 0.1): THREE.Group {
    const g = new THREE.Group();
    const latex = plastic(hex, 0.22);
    const prof = smoothProfile([[0.0, -radius * 1.18], [radius * 0.35, -radius * 1.0], [radius * 0.92, -radius * 0.35], [radius, radius * 0.15], [radius * 0.82, radius * 0.7], [radius * 0.4, radius * 1.0], [0.0, radius * 1.06]], q(ctx, 26));
    g.add(mesh(lathe(prof, q(ctx, 36, 12)), latex));
    const knot = mesh(lathe([[0, -radius * 1.3], [radius * 0.12, -radius * 1.28], [radius * 0.07, -radius * 1.2], [0.0, -radius * 1.16]], q(ctx, 12)), plastic(darker(hex, 0.12), 0.3));
    g.add(knot);
    return g;
}

/** Balon (ili više njih) na koncu: lokalno, od šake ka tački iznad ramena */
function balloonBunch(ctx: ItemContext, list: { hex: string; at: THREE.Vector3; heart?: boolean; r?: number }[]): ItemBuild {
    const k = propScale(ctx);
    const a = ctx.body.anchors;
    const grip = gripPoint(ctx);
    // Baloni lebde pored glave (u kadru celog lika), sa strane desne ruke
    const top = a.head.center.y - a.head.h * 0.05;
    const root = new THREE.Group();
    const swings: { g: THREE.Group; phase: number }[] = [];
    list.forEach((b, i) => {
        // Visina balona: iznad glave (i ušiju), malo u stranu od lika
        const local = V(b.at.x, (top - grip.y) / k + b.at.y, b.at.z);
        const swing = new THREE.Group();
        const body = b.heart ? heartBalloon(ctx, b.hex) : balloon(ctx, b.hex, b.r);
        body.scale.setScalar(1.25);
        body.position.copy(local);
        body.rotation.z = -b.at.x * 0.8;
        swing.add(body);
        const knotY = (b.heart ? 0.105 : (b.r ?? 0.1) * 1.3) * 1.25;
        swing.add(cord(ctx, local.clone().add(V(0, -knotY, 0)), 0.03 * (i % 2 ? -1 : 1)));
        root.add(swing);
        swings.push({ g: swing, phase: i * 1.7 });
    });
    const upright = keepUpright(ctx, hold(ctx, root, { upright: true, size: 1 }));
    const animate: Animate = (time, _dt, live) => {
        upright();
        for (const { g, phase } of swings) {
            if (!live) {
                g.rotation.set(0, 0, 0);
                continue;
            }
            g.rotation.z = Math.sin(time * 0.9 + phase) * 0.035;
            g.rotation.x = Math.sin(time * 0.7 + phase + 1) * 0.025;
        }
    };
    return { animate };
}

/** Balon srce: puno, sjajno srce */
function heartBalloon(ctx: ItemContext, hex: string): THREE.Group {
    const g = new THREE.Group();
    const geo = puffy(heartShape(0.085), 0.03, 0.028);
    g.add(mesh(geo, plastic(hex, 0.2)));
    const knot = mesh(lathe([[0, -0.11], [0.012, -0.105], [0.007, -0.094], [0, -0.088]], q(ctx, 12)), plastic(darker(hex, 0.12), 0.3));
    g.add(knot);
    return g;
}

// ── Predmeti ────────────────────────────────────────────────────────────────

function lollipop(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    g.add(stick(ctx, 0.0035, -0.03, 0.13, plastic("#FFFFFF", 0.4)));
    const swirl = canvasMap("lizalica", 256, 256, (c, w, h) => {
        c.fillStyle = "#FFFFFF";
        c.fillRect(0, 0, w, h);
        c.translate(w / 2, h / 2);
        const colors = ["#F45B8D", "#FFD15C", "#7ED6F2", "#B9A2F2"];
        for (let i = 0; i < 4; i++) {
            c.beginPath();
            for (let t = 0; t <= 1; t += 0.01) {
                const ang = t * TAU * 2.2 + (i * TAU) / 4;
                const rr = t * w * 0.5;
                c.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
            }
            c.strokeStyle = colors[i];
            c.lineWidth = w * 0.09;
            c.lineCap = "round";
            c.stroke();
        }
    });
    const cap = glossyMap(swirl, 0.18, 1);
    const side = plastic("#F45B8D", 0.2);
    const disc = new THREE.CylinderGeometry(0.042, 0.042, 0.016, q(ctx, 40, 12), 1);
    disc.rotateX(Math.PI / 2);
    g.add(mesh(disc, [side, cap, cap], V(0, 0.165, 0)));
    const rim = new THREE.TorusGeometry(0.042, 0.008, q(ctx, 10), q(ctx, 40, 12));
    g.add(mesh(rim, side, V(0, 0.165, 0)));
    // Mašnica na štapiću
    const bow = new THREE.Group();
    for (const s of [1, -1]) bow.add(mesh(blob(0.014, 0.008, 0.004, 10, 8), fabric("#F45B8D", "satin"), V(s * 0.012, 0, 0), new THREE.Euler(0, 0, s * 0.3)));
    bow.add(mesh(blob(0.005, 0.005, 0.005, 8, 6), fabric("#F45B8D", "satin")));
    bow.position.set(0, 0.11, 0.004);
    g.add(bow);
    return g;
}

function flower(ctx: ItemContext, petal: string, middle: string, sun = false): THREE.Object3D {
    const g = new THREE.Group();
    const h = sun ? 0.21 : 0.19;
    g.add(mesh(tube([V(0, -0.035, 0), V(-0.006, h * 0.4, 0.004), V(0.004, h * 0.75, -0.002), V(0, h, 0)], sun ? 0.0042 : 0.0032, q(ctx, 20), 6), stemMat()));
    g.add(leaf(ctx, V(0, h * 0.35, 0), 0.5, sun ? 0.07 : 0.05, leafMat()));
    g.add(leaf(ctx, V(0, h * 0.55, 0), Math.PI - 0.45, sun ? 0.065 : 0.045, leafMat()));
    const seeds = sun
        ? material({ kind: "felt", color: "#7A4E26", map: canvasMap("seme-suncokreta", 128, 128, (c, w) => {
            c.fillStyle = "#6E4422";
            c.fillRect(0, 0, w, w);
            for (let i = 0; i < 220; i++) {
                const ang = i * 2.39996;
                const rr = Math.sqrt(i / 220) * w * 0.5;
                c.beginPath();
                c.arc(w / 2 + Math.cos(ang) * rr, w / 2 + Math.sin(ang) * rr, w * 0.018, 0, TAU);
                c.fillStyle = i % 3 ? "#4A2C14" : "#8A5A30";
                c.fill();
            }
        }) })
        : undefined;
    const head = bloom(ctx, sun ? 14 : 6, fabric(petal, "satin", { roughness: 0.6, sheen: 0.8 }), plastic(middle, 0.45), sun ? 0.04 : 0.03, sun ? 2 : 1, seeds);
    head.position.set(0, h + (sun ? 0.02 : 0.012), 0.004);
    head.rotation.x = -0.15;
    g.add(head);
    return g;
}

function apple(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    const prof = smoothProfile([[0, -0.034], [0.022, -0.036], [0.04, -0.012], [0.041, 0.016], [0.03, 0.036], [0.01, 0.034], [0, 0.026]], q(ctx, 22));
    g.add(mesh(lathe(prof, q(ctx, 36, 12)), plastic("#E5484D", 0.3), V(0, 0.035, 0.01)));
    g.add(mesh(tube([V(0, 0.058, 0.01), V(0.002, 0.07, 0.01), V(0.008, 0.08, 0.01)], 0.0022, 10, 5), wood("#7A4A28")));
    g.add(leaf(ctx, V(0.004, 0.074, 0.01), 0.35, 0.03, leafMat()));
    return g;
}

function carrot(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    const pts: [number, number][] = [];
    const n = q(ctx, 24);
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        const y = -0.09 + t * 0.15;
        const rr = (0.003 + 0.017 * Math.pow(t, 0.7)) * (1 + 0.04 * Math.sin(t * 60)) * (t > 0.96 ? Math.sqrt(Math.max(0, (1 - t) / 0.04)) * 0.6 + 0.4 : 1);
        pts.push([rr, y]);
    }
    pts.push([0, 0.062]);
    g.add(mesh(lathe(pts, q(ctx, 24, 10)), fabric("#FF8A3D", "felt", { sheen: 0.4, roughness: 0.7 })));
    for (const [ang, len] of [[-0.35, 0.07], [0.05, 0.085], [0.4, 0.065]] as const) {
        const end = V(Math.sin(ang) * len, 0.06 + Math.cos(ang) * len, 0);
        g.add(mesh(tube([V(0, 0.058, 0), V(end.x * 0.5, 0.06 + (end.y - 0.06) * 0.55, 0.004), end], (s) => 0.0035 * (1 - s * 0.6), 12, 5), stemMat()));
        g.add(leaf(ctx, end, Math.PI / 2 + ang, 0.03, leafMat()));
    }
    g.rotation.z = 0.25;
    return g;
}

function iceCream(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    const waffle = canvasMap("kornet", 128, 128, (c, w) => {
        c.fillStyle = "#E2B256";
        c.fillRect(0, 0, w, w);
        c.strokeStyle = "#B9872F";
        c.lineWidth = w * 0.05;
        for (let i = -w; i < w * 2; i += w / 4) {
            c.beginPath();
            c.moveTo(i, 0);
            c.lineTo(i + w, w);
            c.moveTo(i + w, 0);
            c.lineTo(i, w);
            c.stroke();
        }
    });
    waffle.wrapS = waffle.wrapT = THREE.RepeatWrapping;
    waffle.repeat.set(3, 2);
    const cone = new THREE.ConeGeometry(0.027, 0.085, q(ctx, 28, 10), 1, true);
    cone.rotateX(Math.PI);
    g.add(mesh(cone, material({ kind: "felt", color: "#FFFFFF", map: waffle }), V(0, 0.012, 0)));
    g.add(mesh(new THREE.TorusGeometry(0.027, 0.004, 8, q(ctx, 28, 10)).rotateX(Math.PI / 2), material({ kind: "felt", color: "#D9A548" }), V(0, 0.054, 0)));
    // Kugle sa „kapljama” i posip
    const scoops: [string, number, number][] = [["#FFB8CB", 0.07, 0.029], ["#9A6236", 0.108, 0.025]];
    for (const [hex, y, rr] of scoops) {
        const s = new THREE.SphereGeometry(rr, q(ctx, 24, 10), q(ctx, 16, 8));
        const pos = s.getAttribute("position");
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            const ang = Math.atan2(v.z, v.x);
            if (v.y < 0) v.y *= 0.75 + 0.18 * Math.sin(ang * 6);
            pos.setXYZ(i, v.x, v.y, v.z);
        }
        s.computeVertexNormals();
        g.add(mesh(s, fabric(hex, "fleece", { roughness: 0.55, sheen: 0.6, normalScale: 0.5 }), V(0, y, 0)));
    }
    g.add(mesh(new THREE.SphereGeometry(0.009, 14, 10), plastic("#E5484D", 0.15), V(0.003, 0.136, 0.002)));
    g.add(mesh(tube([V(0.003, 0.143, 0.002), V(0.006, 0.153, 0), V(0.012, 0.158, -0.002)], 0.0012, 8, 4), wood("#5E8A2E")));
    const colors = ["#FFD15C", "#7ED6F2", "#F45B8D", "#FFFFFF", "#8E77E6"];
    for (let i = 0; i < 14; i++) {
        const a = i * 2.4;
        const up = 0.35 + (i % 5) * 0.12;
        const p = V(Math.cos(a) * Math.cos(up) * 0.029, 0.07 + Math.sin(up) * 0.029, Math.sin(a) * Math.cos(up) * 0.029);
        const sp = mesh(new THREE.CapsuleGeometry(0.0013, 0.004, 2, 5), plastic(colors[i % 5], 0.4), p);
        sp.rotation.set(a, i, a * 0.5);
        g.add(sp);
    }
    return g;
}

function cupcake(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    const wrap = new THREE.CylinderGeometry(0.032, 0.025, 0.038, q(ctx, 48, 16), 1, true);
    const pos = wrap.getAttribute("position");
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const ang = Math.atan2(v.z, v.x);
        const k = 1 + 0.06 * Math.cos(ang * 16);
        pos.setXYZ(i, v.x * k, v.y, v.z * k);
    }
    wrap.computeVertexNormals();
    g.add(mesh(wrap, fabric("#7ED6F2", "satin", { side: THREE.DoubleSide, roughness: 0.5 }), V(0, 0.02, 0)));
    g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.002, q(ctx, 24, 10)), fabric("#7ED6F2", "satin"), V(0, 0.001, 0)));
    g.add(mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.006, q(ctx, 24, 10)), fabric("#B57A44", "fleece"), V(0, 0.037, 0)));
    // Krem u kovrdžama (tri prstena sve manja) i vrh
    const cream = fabric("#FFB8CB", "fleece", { roughness: 0.45, sheen: 0.7, normalScale: 0.3 });
    [[0.026, 0.045, 0.011], [0.019, 0.061, 0.01], [0.011, 0.075, 0.008]].forEach(([rr, y, tr]) => {
        g.add(mesh(new THREE.TorusGeometry(rr, tr, q(ctx, 12), q(ctx, 32, 12)).rotateX(Math.PI / 2), cream, V(0, y, 0)));
    });
    g.add(mesh(new THREE.ConeGeometry(0.011, 0.022, q(ctx, 16)), cream, V(0, 0.088, 0)));
    g.add(mesh(new THREE.SphereGeometry(0.01, 14, 10), plastic("#E5484D", 0.15), V(0, 0.103, 0)));
    const colors = ["#FFD15C", "#7ED6F2", "#FFFFFF", "#8E77E6"];
    for (let i = 0; i < 12; i++) {
        const a = i * 2.2;
        const rr = 0.02 + (i % 3) * 0.003;
        const sp = mesh(new THREE.CapsuleGeometry(0.0012, 0.0035, 2, 5), plastic(colors[i % 4], 0.4), V(Math.cos(a) * rr, 0.052 + (i % 4) * 0.008, Math.sin(a) * rr));
        sp.rotation.set(a, i, 1);
        g.add(sp);
    }
    g.position.z = 0.02;
    return g;
}

function spoon(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    const w = wood("#C98A55");
    g.add(mesh(lathe([[0.0, -0.045], [0.0055, -0.043], [0.0062, 0.05], [0.0045, 0.14], [0, 0.145]], q(ctx, 14)), w));
    // Kutlača: spljoštena kap sa udubljenjem
    const bowl = new THREE.SphereGeometry(1, q(ctx, 24, 10), q(ctx, 16, 8));
    const pos = bowl.getAttribute("position");
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        let z = v.z * 0.32;
        if (v.z > 0) z -= 0.22 * (1 - v.x * v.x - v.y * v.y);
        pos.setXYZ(i, v.x * 0.024, v.y * 0.034, z * 0.03);
    }
    bowl.computeVertexNormals();
    g.add(mesh(bowl, wood("#B5743E", 0.55), V(0, 0.175, 0.002)));
    return g;
}

function beachBall(ctx: ItemContext): THREE.Object3D {
    const map = canvasMap("lopta", 256, 128, (c, w, h) => {
        const colors = ["#E5484D", "#FFFFFF", "#3D9BE9", "#FFFFFF", "#FFD15C", "#FFFFFF"];
        colors.forEach((col, i) => {
            c.fillStyle = col;
            c.fillRect((i * w) / 6, 0, w / 6 + 1, h);
        });
        c.fillStyle = "#FFFFFF";
        c.fillRect(0, 0, w, h * 0.07);
        c.fillRect(0, h * 0.93, w, h * 0.07);
    });
    const g = new THREE.Group();
    const ball = mesh(new THREE.SphereGeometry(0.062, q(ctx, 40, 14), q(ctx, 28, 10)), glossyMap(map, 0.2, 1));
    ball.rotation.set(0.5, 0.3, 0.25);
    g.add(ball);
    g.position.set(-0.012, 0.026, 0.064);
    return g;
}

function paintBrush(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, -0.05], [0.005, -0.048], [0.0062, 0.0], [0.0052, 0.07], [0, 0.072]], q(ctx, 14)), plastic("#E2B256", 0.3)));
    g.add(mesh(new THREE.CylinderGeometry(0.0062, 0.0058, 0.026, q(ctx, 16)), metal("#C7CDD6"), V(0, 0.083, 0)));
    g.add(mesh(lathe([[0.0058, 0.095], [0.0075, 0.108], [0.006, 0.122], [0, 0.135]], q(ctx, 14)), fabric("#8A5A30", "hair")));
    g.add(mesh(lathe([[0.0066, 0.112], [0.0063, 0.122], [0.0035, 0.132], [0, 0.137]], q(ctx, 14)), plastic("#3D9BE9", 0.15)));
    g.rotation.z = -0.25;
    return g;
}

function popcorn(): THREE.Object3D {
    const g = new THREE.Group();
    const stripes = canvasMap("kokice", 128, 32, (c, w, h) => {
        c.fillStyle = "#FFFFFF";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#E5484D";
        for (let i = 0; i < 8; i++) c.fillRect((i * w) / 8, 0, w / 16, h);
    });
    const box = new THREE.CylinderGeometry(0.04, 0.03, 0.075, 4, 1, true);
    box.rotateY(Math.PI / 4);
    g.add(mesh(box, paperMap(stripes), V(0, 0.02, 0.018)));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.002, 4).rotateY(Math.PI / 4), fabric("#FFFFFF", "felt"), V(0, -0.017, 0.018)));
    const corn = fabric("#FFF4CC", "fleece", { roughness: 0.75, sheen: 0.5, normalScale: 0.7 });
    const tip = fabric("#F4D07A", "fleece", { roughness: 0.75 });
    for (let i = 0; i < 16; i++) {
        const a = i * 2.39996;
        const rr = Math.sqrt(i / 16) * 0.03;
        const y = 0.06 + (1 - rr / 0.03) * 0.022 + (i % 3) * 0.003;
        const kernel = new THREE.IcosahedronGeometry(0.0105, 1);
        const pos = kernel.getAttribute("position");
        const v = new THREE.Vector3();
        for (let j = 0; j < pos.count; j++) {
            v.fromBufferAttribute(pos, j);
            const bump = 1 + 0.22 * Math.sin(v.x * 400 + i) * Math.sin(v.y * 380);
            pos.setXYZ(j, v.x * bump, v.y * bump, v.z * bump);
        }
        kernel.computeVertexNormals();
        const m = mesh(kernel, i % 5 === 0 ? tip : corn, V(Math.cos(a) * rr, y, 0.018 + Math.sin(a) * rr));
        m.rotation.set(i, i * 2, 0);
        g.add(m);
    }
    return g;
}

function book(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    const cover = canvasMap("knjiga", 256, 320, (c, w, h) => {
        c.fillStyle = "#3BB2A0";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#2C8F80";
        c.fillRect(0, 0, w * 0.14, h);
        c.fillStyle = "#FFFFFF";
        c.globalAlpha = 0.85;
        c.beginPath();
        c.roundRect(w * 0.3, h * 0.68, w * 0.55, h * 0.05, h * 0.025);
        c.roundRect(w * 0.38, h * 0.77, w * 0.4, h * 0.04, h * 0.02);
        c.fill();
        c.globalAlpha = 1;
    });
    const coverMat = paperMap(cover, THREE.FrontSide);
    const side = fabric("#2C8F80", "felt");
    const pages = canvasMap("stranice", 64, 64, (c, w, h) => {
        c.fillStyle = "#FAF6EC";
        c.fillRect(0, 0, w, h);
        c.strokeStyle = "#E0D8C4";
        for (let i = 0; i < h; i += 4) {
            c.beginPath();
            c.moveTo(0, i);
            c.lineTo(w, i);
            c.stroke();
        }
    });
    const pagesMat = paperMap(pages, THREE.FrontSide);
    const W = 0.11;
    const H = 0.145;
    const D = 0.024;
    const block = new RoundedBoxGeometry(W - 0.006, H - 0.008, D - 0.005, 2, 0.002);
    g.add(mesh(block, pagesMat, V(0.002, 0, 0)));
    for (const s of [1, -1]) {
        const board = new RoundedBoxGeometry(W, H, 0.004, 2, 0.0016);
        g.add(mesh(board, s === 1 ? [side, side, side, side, coverMat, side] : side, V(0, 0, (s * D) / 2)));
    }
    const spine = new THREE.CylinderGeometry(D / 2 + 0.002, D / 2 + 0.002, H, q(ctx, 14), 1, true, Math.PI, Math.PI);
    g.add(mesh(spine, fabric("#2C8F80", "felt", { side: THREE.DoubleSide }), V(-W / 2, 0, 0)));
    const star = mesh(puffy(starShape(0.024, 0.011), 0.002, 0.0018, 1, 4), plastic("#FFD15C", 0.3), V(0.01, 0.022, D / 2 + 0.003));
    g.add(star);
    g.position.set(-0.03, 0.055, 0.03);
    g.rotation.set(-0.1, -0.5, 0.08);
    const outer = new THREE.Group();
    outer.add(g);
    return outer;
}

function pinwheel(ctx: ItemContext): { object: THREE.Object3D; spin: THREE.Object3D } {
    const g = new THREE.Group();
    g.add(stick(ctx, 0.0042, -0.05, 0.19, wood("#E2B256")));
    const wheel = new THREE.Group();
    const colors = ["#F45B8D", "#FFD15C", "#3D9BE9", "#3BB273"];
    colors.forEach((col, i) => {
        // Krilce: savijen trougao (folija), dvostrano
        const geo = new THREE.BufferGeometry();
        const L = 0.055;
        const p = [0, 0, 0, 0, L, 0.004, L * 0.62, L * 0.62, 0.016, 0, 0, 0, L * 0.62, L * 0.62, 0.016, L * 0.25, L * 0.12, 0.006];
        geo.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
        geo.computeVertexNormals();
        const blade = mesh(geo, plastic(col, 0.35));
        (blade.material as THREE.Material).side = THREE.DoubleSide;
        blade.rotation.z = (i * Math.PI) / 2;
        wheel.add(blade);
    });
    wheel.add(mesh(new THREE.SphereGeometry(0.008, 14, 10), plastic("#FFFFFF", 0.3)));
    wheel.position.set(0, 0.195, 0.008);
    g.add(wheel);
    return { object: g, spin: wheel };
}

function bucket(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    const blue = plastic("#3D9BE9", 0.3);
    const prof: [number, number][] = [[0, -0.1], [0.036, -0.1], [0.04, -0.098], [0.047, -0.04], [0.049, -0.038], [0.0465, -0.037]];
    const shell = lathe(prof, q(ctx, 36, 12));
    const m = mesh(shell, blue);
    (m.material as THREE.Material).side = THREE.DoubleSide;
    g.add(m);
    g.add(mesh(new THREE.TorusGeometry(0.0485, 0.0035, 8, q(ctx, 36, 12)).rotateX(Math.PI / 2), plastic("#2C6BC0", 0.3), V(0, -0.038, 0)));
    g.add(mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.004, q(ctx, 28, 10)), fabric("#F2D49A", "felt", { roughness: 0.95, normalScale: 1.4 }), V(0, -0.05, 0)));
    // Ručka (luk) do šake
    const arc: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
        const a = Math.PI * (i / 12);
        arc.push(V(Math.cos(a) * 0.047, -0.04 + Math.sin(a) * 0.04, 0));
    }
    g.add(mesh(tube(arc, 0.0022, 24, 6), plastic("#2C6BC0", 0.3)));
    const star = mesh(puffy(starShape(0.017, 0.008), 0.002, 0.0015, 1, 4), plastic("#FFD15C", 0.3), V(0, -0.068, 0.0445));
    star.rotation.x = -0.08;
    g.add(star);
    // Lopatica
    const shovel = new THREE.Group();
    shovel.add(stick(ctx, 0.0035, 0, 0.1, plastic("#FFD15C", 0.3)));
    const scoop = new THREE.SphereGeometry(1, 16, 10, 0, TAU, 0, Math.PI / 2);
    scoop.scale(0.018, 0.024, 0.008);
    const sm = mesh(scoop, plastic("#FFD15C", 0.3), V(0, 0.11, 0));
    (sm.material as THREE.Material).side = THREE.DoubleSide;
    sm.rotation.x = Math.PI / 2;
    shovel.add(sm);
    shovel.position.set(0.018, -0.075, -0.012);
    shovel.rotation.set(-0.15, 0, -0.32);
    g.add(shovel);
    g.position.set(-0.01, -0.004, 0.012);
    return g;
}

function bubbleWand(ctx: ItemContext): { object: THREE.Object3D; bubbles: THREE.Object3D[] } {
    const g = new THREE.Group();
    g.add(stick(ctx, 0.004, -0.04, 0.1, plastic("#F45B8D", 0.3)));
    g.add(mesh(new THREE.TorusGeometry(0.022, 0.004, q(ctx, 10), q(ctx, 32, 12)), plastic("#F45B8D", 0.3), V(0, 0.126, 0)));
    g.add(mesh(new THREE.CircleGeometry(0.021, q(ctx, 28, 10)), bubbleMaterial(), V(0, 0.126, 0)));
    const bubbles: THREE.Object3D[] = [];
    [[0.03, 0.2, 0.05, 0.018], [-0.02, 0.26, 0.07, 0.013], [0.06, 0.3, 0.02, 0.024], [0.01, 0.36, 0.06, 0.011], [0.08, 0.23, 0.08, 0.01]].forEach(([x, y, z, rr]) => {
        const b = mesh(new THREE.SphereGeometry(rr, q(ctx, 20, 10), q(ctx, 14, 8)), bubbleMaterial(), V(x, y, z));
        b.userData.base = b.position.clone();
        bubbles.push(b);
        g.add(b);
    });
    return { object: g, bubbles };
}

function flashlight(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    const body = new THREE.Group();
    body.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.085, q(ctx, 24, 10)), plastic("#3D7BE0", 0.3), V(0, 0, 0)));
    for (let i = 0; i < 4; i++) body.add(mesh(new THREE.TorusGeometry(0.0163, 0.0018, 6, q(ctx, 24, 10)).rotateX(Math.PI / 2), rubber("#2C5DB0"), V(0, -0.025 + i * 0.012, 0)));
    body.add(mesh(lathe([[0.016, 0.042], [0.026, 0.07], [0.027, 0.078], [0.024, 0.08]], q(ctx, 24, 10)), plastic("#2C5DB0", 0.3)));
    body.add(mesh(new THREE.TorusGeometry(0.025, 0.003, 8, q(ctx, 24, 10)).rotateX(Math.PI / 2), metal("#C7CDD6"), V(0, 0.079, 0)));
    body.add(mesh(new THREE.CircleGeometry(0.023, q(ctx, 24, 10)).rotateX(-Math.PI / 2), softGlow("#FFF2B8", 1.4), V(0, 0.0795, 0)));
    // Meki snop svetla
    const beam = new THREE.ConeGeometry(0.08, 0.26, q(ctx, 24, 10), 1, true);
    beam.translate(0, -0.13, 0);
    beam.rotateX(Math.PI);
    body.add(mesh(beam, beamMaterial("#FFE48A", 0.28), V(0, 0.08, 0)));
    body.add(mesh(new THREE.BoxGeometry(0.008, 0.014, 0.006), rubber("#E5484D"), V(0, 0.0, 0.016)));
    // Lampa svetli napred i malo u stranu (snop se vidi sa strane, ne u kameru)
    body.rotation.set(Math.PI / 2 - 0.35, 0, 0.95);
    body.position.set(-0.01, 0.0, 0.02);
    g.add(body);
    return g;
}

function wateringCan(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    const green = plastic("#3BB273", 0.32);
    const dark = plastic("#2A8E57", 0.32);
    const can = lathe(smoothProfile([[0, -0.115], [0.04, -0.115], [0.044, -0.1], [0.042, -0.05], [0.034, -0.035], [0, -0.032]], q(ctx, 16)), q(ctx, 32, 12));
    g.add(mesh(can, green));
    // Ručka na vrhu (u šaci) i izliv napred
    const arc: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
        const a = Math.PI * (i / 12);
        arc.push(V(0, -0.035 + Math.sin(a) * 0.035, -0.03 + (i / 12) * 0.05));
    }
    g.add(mesh(tube(arc, 0.004, 24, 8), dark));
    g.add(mesh(tube([V(0, -0.095, 0.035), V(0, -0.08, 0.07), V(0, -0.055, 0.1)], (s) => 0.008 - s * 0.003, 16, 10), green));
    const rose = mesh(lathe([[0.005, 0], [0.014, 0.012], [0.015, 0.016], [0, 0.017]], q(ctx, 16)), dark, V(0, -0.055, 0.1));
    rose.rotation.x = 0.9;
    g.add(rose);
    const flowerDeco = new THREE.Group();
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        flowerDeco.add(mesh(blob(0.007, 0.007, 0.002, 10, 6), plastic("#FFD15C", 0.4), V(Math.cos(a) * 0.009, Math.sin(a) * 0.009, 0)));
    }
    flowerDeco.add(mesh(blob(0.005, 0.005, 0.0025, 10, 6), plastic("#FFFFFF", 0.4)));
    flowerDeco.position.set(0, -0.075, 0.0435);
    g.add(flowerDeco);
    g.scale.set(1.1, 1, 0.9);
    g.position.set(-0.012, 0.0, 0.005);
    // Izliv gleda u stranu i malo napred (vidi se oblik kantice)
    g.rotation.y = -1.15;
    return g;
}

function umbrella(ctx: ItemContext): THREE.Object3D {
    // Kišobran iznad glave: osa od šake do tačke iznad temena (i ušiju), malo napred i u stranu
    const k = propScale(ctx);
    const a = ctx.body.anchors;
    const grip = gripPoint(ctx);
    const top = Math.max(a.head.top.y, a.ears.tipR.y, a.ears.tipL.y, a.horn?.tip.y ?? 0) + 0.1;
    const target = V(grip.x - 0.035, top, grip.z + 0.035);
    const axisWorld = target.clone().sub(grip);
    const length = axisWorld.length() / k;
    const g = new THREE.Group();
    const shaftMat = metal("#5B6475");
    g.add(mesh(new THREE.CylinderGeometry(0.0035, 0.0035, length + 0.02, q(ctx, 10)), shaftMat, V(0, length / 2 - 0.01, 0)));
    // Drška (kuka) ispod šake
    g.add(mesh(tube([V(0, 0.01, 0), V(0, -0.025, 0), V(-0.006, -0.042, 0), V(-0.02, -0.045, 0), V(-0.028, -0.034, 0)], 0.0058, 20, 8), wood("#9A6236", 0.45)));
    // Krov: 8 kriški sa ulegnutim ivicama, naizmenično dve boje
    const R = 0.34;
    const H = 0.12;
    const panels = 8;
    const outerA = plastic("#8E77E6", 0.45);
    const outerB = plastic("#B9A2F2", 0.45);
    const inner = fabric("#D8CCF8", "satin", { side: THREE.BackSide });
    const nu = q(ctx, 10);
    const nv = q(ctx, 12);
    for (let p = 0; p < panels; p++) {
        const geo = new THREE.BufferGeometry();
        const pos: number[] = [];
        const idx: number[] = [];
        for (let j = 0; j <= nv; j++) {
            const v = j / nv;
            for (let i = 0; i <= nu; i++) {
                const u = i / nu;
                const ang = ((p + u) / panels) * TAU;
                // Između rebara tkanina je malo ulegnuta (rub talasast)
                const sag = Math.sin(u * Math.PI);
                const rr = R * v * (1 - 0.07 * sag * v);
                const y = H * (1 - v * v) - 0.025 * sag * v * v;
                pos.push(Math.cos(ang) * rr, length + y, Math.sin(ang) * rr);
            }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
            const a0 = j * (nu + 1) + i;
            idx.push(a0, a0 + 1, a0 + nu + 1, a0 + 1, a0 + nu + 2, a0 + nu + 1);
        }
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        // Normale napolje (nagore)
        const n = geo.getAttribute("normal");
        if (n.getY(Math.floor(n.count / 2)) < 0) {
            const flipped: number[] = [];
            for (let t = 0; t < idx.length; t += 3) flipped.push(idx[t], idx[t + 2], idx[t + 1]);
            geo.setIndex(flipped);
            geo.computeVertexNormals();
        }
        g.add(mesh(geo, p % 2 ? outerA : outerB));
        g.add(mesh(geo, inner));
        // Rebro
        const ribPts: THREE.Vector3[] = [];
        const ang = (p / panels) * TAU;
        for (let i = 0; i <= 6; i++) {
            const v = i / 6;
            ribPts.push(V(Math.cos(ang) * R * v * 0.98, length + H * (1 - v * v) - 0.004, Math.sin(ang) * R * v * 0.98));
        }
        g.add(mesh(tube(ribPts, 0.0018, 10, 4), shaftMat));
        const tipBall = mesh(new THREE.SphereGeometry(0.005, 8, 6), plastic("#5B6475", 0.3), V(Math.cos(ang) * R, length - 0.002, Math.sin(ang) * R));
        g.add(tipBall);
    }
    g.add(mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.03, 10), plastic("#5B6475", 0.3), V(0, length + H + 0.012, 0)));
    // Okret ose ka cilju
    const pivot = new THREE.Group();
    pivot.quaternion.setFromUnitVectors(V(0, 1, 0), axisWorld.normalize());
    pivot.add(g);
    return pivot;
}

function racket(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.085, q(ctx, 12)), rubber("#3A3546", 0.7), V(0, 0.005, 0)));
    g.add(mesh(new THREE.CylinderGeometry(0.0095, 0.009, 0.008, q(ctx, 12)), rubber("#3A3546", 0.7), V(0, -0.04, 0)));
    // Grlo (dva kraka) i okvir
    const frame = plastic("#3D7BE0", 0.25);
    g.add(mesh(tube([V(0, 0.045, 0), V(-0.018, 0.08, 0), V(-0.04, 0.105, 0)], 0.0042, 12, 6), frame));
    g.add(mesh(tube([V(0, 0.045, 0), V(0.018, 0.08, 0), V(0.04, 0.105, 0)], 0.0042, 12, 6), frame));
    const head = new THREE.TorusGeometry(1, 0.0055, q(ctx, 8), q(ctx, 48, 16));
    const pos = head.getAttribute("position");
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const len = Math.hypot(v.x, v.y);
        const nx = v.x / len;
        const ny = v.y / len;
        const ring = len - 1;
        pos.setXYZ(i, nx * (0.068 + ring) * 0.85, ny * (0.085 + ring), v.z);
    }
    head.computeVertexNormals();
    g.add(mesh(head, frame, V(0, 0.18, 0)));
    const strings = canvasMap("mreza-reketa", 128, 128, (c, w) => {
        c.clearRect(0, 0, w, w);
        c.strokeStyle = "rgba(240,244,250,0.95)";
        c.lineWidth = 2;
        for (let i = 4; i < w; i += 10) {
            c.beginPath();
            c.moveTo(i, 0);
            c.lineTo(i, w);
            c.moveTo(0, i);
            c.lineTo(w, i);
            c.stroke();
        }
    });
    const net = new THREE.CircleGeometry(1, q(ctx, 32, 12));
    net.scale(0.058, 0.083, 1);
    g.add(mesh(net, netMaterial(strings), V(0, 0.18, 0)));
    return g;
}

let net: THREE.Material | null = null;
/** Žice reketa: providna mreža (jedan materijal za sve) */
function netMaterial(map: THREE.Texture): THREE.Material {
    net ??= new THREE.MeshBasicMaterial({ map, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    return net;
}

function lasso(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    const rope = fabric("#C98A55", "rib", { roughness: 0.85, normalScale: 1.2 });
    // Namotaj (tri petlje) koji visi iz šake
    for (let i = 0; i < 3; i++) {
        const loop: THREE.Vector3[] = [];
        for (let j = 0; j <= 24; j++) {
            const a = (j / 24) * TAU;
            loop.push(V(Math.sin(a) * (0.05 + i * 0.004), -0.055 - Math.cos(a) * (0.058 + i * 0.003), i * 0.005 + Math.sin(a * 2) * 0.004));
        }
        g.add(mesh(tube(loop, 0.0042, q(ctx, 48, 16), 6), rope));
    }
    // Slobodan kraj sa petljom (omča)
    const end: THREE.Vector3[] = [V(0.0, -0.01, 0.01), V(-0.04, -0.06, 0.03), V(-0.06, -0.13, 0.04), V(-0.05, -0.17, 0.05)];
    g.add(mesh(tube(end, 0.0042, 24, 6), rope));
    const knot = mesh(new THREE.TorusGeometry(0.03, 0.0042, 6, q(ctx, 24, 10)), rope, V(-0.05, -0.2, 0.05));
    knot.rotation.set(0.3, 0.8, 0);
    g.add(knot);
    g.position.set(-0.02, 0.01, 0.01);
    return g;
}

function microphone(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    g.add(mesh(lathe([[0.0, -0.05], [0.0085, -0.049], [0.0105, 0.04], [0.013, 0.05], [0.013, 0.058], [0, 0.058]], q(ctx, 20)), plastic("#3A3546", 0.35)));
    g.add(mesh(new THREE.TorusGeometry(0.013, 0.003, 8, q(ctx, 24, 10)).rotateX(Math.PI / 2), metal("#C7CDD6"), V(0, 0.058, 0)));
    g.add(mesh(new THREE.SphereGeometry(0.024, q(ctx, 28, 12), q(ctx, 20, 10)), meshMetal("#C7CDD6"), V(0, 0.08, 0)));
    g.add(mesh(new THREE.TorusGeometry(0.0242, 0.0018, 6, q(ctx, 28, 12)).rotateX(Math.PI / 2), metal("#AEB9C9"), V(0, 0.08, 0)));
    g.add(mesh(new THREE.BoxGeometry(0.006, 0.012, 0.004), rubber("#3BB273"), V(0, 0.0, 0.0105)));
    return g;
}

function treasureMap(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    const map = canvasMap("mapa-blaga", 256, 192, (c, w, h) => {
        c.fillStyle = "#F6D58A";
        c.fillRect(0, 0, w, h);
        const grd = c.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
        grd.addColorStop(0, "rgba(0,0,0,0)");
        grd.addColorStop(1, "rgba(150,100,40,0.35)");
        c.fillStyle = grd;
        c.fillRect(0, 0, w, h);
        // Ostrvo
        c.fillStyle = "#9FD08A";
        c.beginPath();
        c.ellipse(w * 0.55, h * 0.52, w * 0.3, h * 0.3, 0.2, 0, TAU);
        c.fill();
        c.fillStyle = "#7DBE6A";
        c.beginPath();
        c.arc(w * 0.4, h * 0.45, w * 0.06, 0, TAU);
        c.arc(w * 0.5, h * 0.38, w * 0.05, 0, TAU);
        c.fill();
        c.setLineDash([8, 7]);
        c.strokeStyle = "#9A6236";
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(w * 0.15, h * 0.8);
        c.quadraticCurveTo(w * 0.35, h * 0.3, w * 0.55, h * 0.6);
        c.quadraticCurveTo(w * 0.7, h * 0.8, w * 0.72, h * 0.42);
        c.stroke();
        c.setLineDash([]);
        c.strokeStyle = "#E5484D";
        c.lineWidth = 9;
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(w * 0.69, h * 0.33);
        c.lineTo(w * 0.79, h * 0.45);
        c.moveTo(w * 0.79, h * 0.33);
        c.lineTo(w * 0.69, h * 0.45);
        c.stroke();
        // Ruža vetrova
        c.fillStyle = "#3D7BE0";
        c.beginPath();
        c.moveTo(w * 0.15, h * 0.12);
        c.lineTo(w * 0.17, h * 0.22);
        c.lineTo(w * 0.15, h * 0.3);
        c.lineTo(w * 0.13, h * 0.22);
        c.fill();
    });
    const W = 0.13;
    const H = 0.1;
    const nu = q(ctx, 16);
    const sheet = new THREE.PlaneGeometry(W, H, nu, 2);
    const pos = sheet.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setZ(i, 0.006 * Math.sin(((x + W / 2) / W) * Math.PI * 2));
    }
    sheet.computeVertexNormals();
    g.add(mesh(sheet, paperMap(map), V(-W / 2 - 0.006, 0.0, 0)));
    for (const x of [-0.006, -W - 0.006]) {
        const roll = new THREE.Group();
        roll.add(mesh(new THREE.CylinderGeometry(0.009, 0.009, H + 0.008, q(ctx, 16)), material({ kind: "felt", color: "#E2B256" })));
        for (const y of [1, -1]) roll.add(mesh(new THREE.SphereGeometry(0.0065, 10, 8), wood("#9A6236", 0.4), V(0, y * (H / 2 + 0.008), 0)));
        roll.position.x = x;
        g.add(roll);
    }
    g.position.set(0.004, 0.015, 0.018);
    g.rotation.y = 0.45;
    return g;
}

function starWand(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    g.add(stick(ctx, 0.0045, -0.045, 0.14, plastic("#B9A2F2", 0.25)));
    g.add(mesh(new THREE.TorusGeometry(0.0055, 0.0018, 6, 14).rotateX(Math.PI / 2), gold(), V(0, 0.13, 0)));
    const star = mesh(puffy(starShape(0.042, 0.019), 0.008, 0.006, 1, 5), plastic("#FFD15C", 0.18), V(0, 0.178, 0));
    g.add(star);
    // Iskrice (zvezdice koje meko sijaju)
    const spark = softGlow("#FFF0B0", 0.9);
    [[0.045, 0.22, 0.01, 0.009], [-0.04, 0.215, 0.005, 0.007], [0.03, 0.14, 0.012, 0.006]].forEach(([x, y, z, rr]) => {
        g.add(mesh(puffy(starShape(rr, rr * 0.35, 4), 0.001, 0.001, 0.5, 3), spark, V(x, y, z)));
    });
    // Traka sa štapića
    g.add(mesh(tube([V(0, 0.13, 0.004), V(0.012, 0.11, 0.01), V(0.006, 0.085, 0.012), V(0.016, 0.065, 0.008)], (s) => 0.0028 * (1 - s * 0.3), 16, 5), fabric("#F45B8D", "satin")));
    return g;
}

function binoculars(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    const body = rubber("#3A3546", 0.55);
    const trim = plastic("#5B6475", 0.3);
    for (const s of [1, -1]) {
        const barrel = new THREE.Group();
        barrel.add(mesh(lathe([[0.012, -0.03], [0.016, -0.026], [0.017, 0.02], [0.019, 0.03], [0.019, 0.034]], q(ctx, 20)), body));
        barrel.add(mesh(new THREE.TorusGeometry(0.0185, 0.0026, 6, q(ctx, 20)).rotateX(Math.PI / 2), trim, V(0, 0.034, 0)));
        barrel.add(mesh(new THREE.CircleGeometry(0.016, q(ctx, 20)).rotateX(-Math.PI / 2), material({ kind: "glass", color: "#7ED6F2", opacity: 0.75 }), V(0, 0.0345, 0)));
        barrel.add(mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.012, q(ctx, 16)), trim, V(0, -0.035, 0)));
        barrel.position.x = s * 0.021;
        g.add(barrel);
    }
    g.add(mesh(new RoundedBoxGeometry(0.02, 0.026, 0.014, 2, 0.004), trim, V(0, 0.0, 0)));
    g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.02, 10).rotateZ(Math.PI / 2), plastic("#AEB9C9", 0.3), V(0, 0.016, 0)));
    // Kaišić
    const strap: THREE.Vector3[] = [V(-0.036, -0.02, 0), V(-0.03, -0.07, 0.01), V(0, -0.09, 0.012), V(0.03, -0.07, 0.01), V(0.036, -0.02, 0)];
    g.add(mesh(tube(strap, 0.002, 24, 5), fabric("#E5484D", "cotton")));
    g.rotation.x = -Math.PI / 2 + 0.25;
    g.position.set(0, 0.02, 0.03);
    const outer = new THREE.Group();
    outer.add(g);
    return outer;
}

function teddy(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    const fur = plush("#BC8656");
    const darkFur = plush("#A8703F");
    const light = plush("#F1CBA4");
    const eye = plastic("#2A1D18", 0.15);
    g.add(mesh(blob(0.045, 0.052, 0.04, q(ctx, 22, 10), q(ctx, 16, 8)), fur, V(0, 0.05, 0)));
    g.add(mesh(blob(0.026, 0.03, 0.012, 14, 10), light, V(0, 0.046, 0.032)));
    g.add(mesh(blob(0.04, 0.037, 0.036, q(ctx, 24, 10), q(ctx, 16, 8)), fur, V(0, 0.125, 0.004)));
    for (const s of [1, -1]) {
        g.add(mesh(blob(0.014, 0.014, 0.008, 12, 8), darkFur, V(s * 0.03, 0.155, 0.0)));
        g.add(mesh(blob(0.008, 0.008, 0.004, 10, 6), light, V(s * 0.03, 0.155, 0.006)));
        g.add(mesh(blob(0.0055, 0.006, 0.004, 10, 8), eye, V(s * 0.014, 0.133, 0.034)));
        const arm = mesh(new THREE.CapsuleGeometry(0.012, 0.03, 4, 10), darkFur, V(s * 0.045, 0.066, 0.01));
        arm.rotation.z = s * 0.9;
        g.add(arm);
        const leg = mesh(new THREE.CapsuleGeometry(0.014, 0.022, 4, 10), darkFur, V(s * 0.025, 0.006, 0.02));
        leg.rotation.x = Math.PI / 2 - 0.2;
        g.add(leg);
        g.add(mesh(blob(0.01, 0.011, 0.004, 10, 6), light, V(s * 0.025, 0.004, 0.04)));
    }
    g.add(mesh(blob(0.017, 0.013, 0.012, 14, 10), light, V(0, 0.115, 0.034)));
    g.add(mesh(blob(0.0065, 0.005, 0.004, 10, 6), eye, V(0, 0.12, 0.046)));
    const bow = new THREE.Group();
    for (const s of [1, -1]) bow.add(mesh(blob(0.013, 0.008, 0.004, 10, 8), fabric("#E5484D", "satin"), V(s * 0.012, 0, 0), new THREE.Euler(0, 0, s * 0.25)));
    bow.add(mesh(blob(0.005, 0.005, 0.005, 8, 6), fabric("#E5484D", "satin")));
    bow.position.set(0, 0.09, 0.034);
    g.add(bow);
    g.position.set(-0.01, -0.005, 0.045);
    g.rotation.y = -0.25;
    return g;
}

function kite(ctx: ItemContext): ItemBuild {
    const k = propScale(ctx);
    const a = ctx.body.anchors;
    const grip = gripPoint(ctx);
    const root = new THREE.Group();
    const swing = new THREE.Group();
    const top = Math.max(a.head.top.y, a.ears.tipR.y);
    const center = V(-0.34, (top - grip.y) / k + 0.12, -0.3);
    const kiteG = new THREE.Group();
    const W = 0.13;
    const T = 0.16;
    const B = 0.22;
    const pts = { top: V(0, T, 0), left: V(-W, 0, -0.018), right: V(W, 0, -0.018), bottom: V(0, -B, 0), mid: V(0, 0, 0.012) };
    const tri = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, hex: string) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute([...p1.toArray(), ...p2.toArray(), ...p3.toArray()], 3));
        geo.computeVertexNormals();
        const m = mesh(geo, fabric(hex, "satin", { side: THREE.DoubleSide, roughness: 0.5 }));
        kiteG.add(m);
    };
    tri(pts.top, pts.mid, pts.right, "#E5484D");
    tri(pts.top, pts.left, pts.mid, "#FFD15C");
    tri(pts.mid, pts.left, pts.bottom, "#3D9BE9");
    tri(pts.mid, pts.bottom, pts.right, "#3BB273");
    const stickMat = wood("#E2B256");
    kiteG.add(mesh(tube([pts.top, pts.mid, pts.bottom], 0.0028, 8, 5), stickMat));
    kiteG.add(mesh(tube([pts.left, V(0, 0, 0.014), pts.right], 0.0028, 8, 5), stickMat));
    // Rep sa mašnicama
    const tail: THREE.Vector3[] = [];
    for (let i = 0; i <= 8; i++) tail.push(V(Math.sin(i * 1.1) * 0.03, -B - i * 0.045, 0.01 * Math.cos(i)));
    kiteG.add(mesh(tube(tail, 0.0016, 40, 4), string()));
    [2, 4, 6, 8].forEach((i, n) => {
        const bow = new THREE.Group();
        const col = ["#F45B8D", "#FFD15C", "#3D9BE9", "#F45B8D"][n];
        for (const s of [1, -1]) bow.add(mesh(blob(0.016, 0.008, 0.003, 10, 6), fabric(col, "satin"), V(s * 0.014, 0, 0), new THREE.Euler(0, 0, s * 0.3)));
        bow.position.copy(tail[i]);
        kiteG.add(bow);
    });
    kiteG.position.copy(center);
    kiteG.rotation.set(-0.25, 0.35, 0.3);
    swing.add(kiteG);
    // Konac do šake (blago opušten)
    const line: THREE.Vector3[] = [V(0, -0.01, 0)];
    for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        line.push(center.clone().multiplyScalar(t).add(V(0, -0.06 * Math.sin(t * Math.PI), 0)));
    }
    swing.add(mesh(tube(line, 0.0013, 40, 4), string()));
    root.add(swing);
    kiteG.scale.setScalar(1.3);
    const upright = keepUpright(ctx, hold(ctx, root, { upright: true, size: 1 }));
    return {
        animate: (time, _dt, live) => {
            upright();
            if (!live) {
                swing.rotation.set(0, 0, 0);
                kiteG.rotation.set(-0.25, 0.35, 0.3);
                return;
            }
            swing.rotation.z = Math.sin(time * 0.6) * 0.03;
            kiteG.rotation.z = 0.3 + Math.sin(time * 1.1) * 0.08;
            kiteG.rotation.x = -0.25 + Math.sin(time * 0.8 + 1) * 0.05;
        },
    };
}

function guitar(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    // Telo: dve spojene kružnice (izvučeno, zaobljena ivica)
    const shape = new THREE.Shape();
    const lower = 0.085;
    const upper = 0.066;
    const waist = 0.056;
    shape.moveTo(0, -0.2);
    shape.bezierCurveTo(lower * 1.3, -0.2, lower * 1.15, -0.06, waist, -0.07 + 0.0);
    shape.bezierCurveTo(waist * 0.95, -0.05, upper * 1.25, -0.02, upper * 0.95, 0.03);
    shape.bezierCurveTo(upper * 0.6, 0.075, -upper * 0.6, 0.075, -upper * 0.95, 0.03);
    shape.bezierCurveTo(-upper * 1.25, -0.02, -waist * 0.95, -0.05, -waist, -0.07);
    shape.bezierCurveTo(-lower * 1.15, -0.06, -lower * 1.3, -0.2, 0, -0.2);
    const body = puffy(shape, 0.035, 0.008, 1);
    const top = plastic("#FF8A3D", 0.28);
    g.add(mesh(body, top));
    g.add(mesh(new THREE.CircleGeometry(0.022, q(ctx, 24, 10)), plastic("#3A2416", 0.6), V(0, -0.045, 0.026)));
    g.add(mesh(new THREE.TorusGeometry(0.025, 0.002, 6, q(ctx, 24, 10)), plastic("#FFD15C", 0.3), V(0, -0.045, 0.0262)));
    g.add(mesh(new RoundedBoxGeometry(0.05, 0.01, 0.006, 2, 0.002), wood("#5C3A25", 0.5), V(0, -0.135, 0.028)));
    // Vrat i glava sa ključevima
    const neck = wood("#7A4A28", 0.5);
    g.add(mesh(new RoundedBoxGeometry(0.022, 0.2, 0.012, 2, 0.004), neck, V(0, 0.11, 0.016)));
    g.add(mesh(new RoundedBoxGeometry(0.032, 0.05, 0.012, 2, 0.004), wood("#5C3A25", 0.5), V(0, 0.23, 0.014)));
    for (const s of [1, -1]) for (const y of [0.215, 0.235]) g.add(mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.014, 8).rotateZ(Math.PI / 2), metal("#E3B754"), V(s * 0.022, y, 0.014)));
    for (let i = 0; i < 4; i++) {
        const x = -0.006 + i * 0.004;
        g.add(mesh(new THREE.CylinderGeometry(0.0006, 0.0006, 0.36, 4), metal("#F2F5FA"), V(x, 0.07, 0.0235 + (0.033 - 0.0235) * 0)));
    }
    // Kaiš preko tela nije potreban: gitara se drži za vrat; telo je napolju i napred
    g.position.set(-0.03, -0.12, 0.08);
    g.rotation.set(0.1, -0.35, -0.42);
    return g;
}

function crayon(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    const wax = plastic("#3D86E0", 0.55);
    g.add(mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.12, q(ctx, 12, 8)), wax, V(0, 0.03, 0)));
    g.add(mesh(lathe([[0.0085, 0.09], [0.007, 0.1], [0.0025, 0.118], [0, 0.12]], q(ctx, 12, 8)), wax));
    g.add(mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.002, q(ctx, 12, 8)), wax, V(0, -0.031, 0)));
    // Papirni omot sa trakama
    const wrap = canvasMap("omot-bojice", 64, 64, (c, w, h) => {
        c.fillStyle = "#FFFFFF";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#3D86E0";
        c.fillRect(0, h * 0.12, w, h * 0.1);
        c.fillRect(0, h * 0.78, w, h * 0.1);
        c.fillStyle = "#FFD15C";
        c.beginPath();
        c.arc(w * 0.5, h * 0.5, w * 0.12, 0, TAU);
        c.fill();
    });
    g.add(mesh(new THREE.CylinderGeometry(0.0092, 0.0092, 0.07, q(ctx, 12, 8), 1, true), paperMap(wrap), V(0, 0.03, 0)));
    return g;
}

function bottle(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    const body = lathe(smoothProfile([[0, -0.06], [0.024, -0.06], [0.026, -0.05], [0.026, 0.04], [0.018, 0.058], [0.013, 0.066]], q(ctx, 16)), q(ctx, 28, 10));
    g.add(mesh(body, plastic("#7ED6F2", 0.2)));
    g.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.018, q(ctx, 20, 10)), plastic("#FFFFFF", 0.4), V(0, 0.074, 0)));
    g.add(mesh(new THREE.TorusGeometry(0.008, 0.0026, 6, 14), plastic("#FFFFFF", 0.4), V(0, 0.09, 0)));
    for (const y of [-0.035, 0.0, 0.03]) g.add(mesh(new THREE.TorusGeometry(0.0262, 0.0014, 5, q(ctx, 28, 10)).rotateX(Math.PI / 2), plastic("#5BC2E6", 0.25), V(0, y, 0)));
    g.add(mesh(puffy(starShape(0.012, 0.0055), 0.0015, 0.001, res(ctx), 3), plastic("#FFD15C", 0.3), V(0, -0.015, 0.027)));
    g.position.set(0, 0.0, 0.012);
    return g;
}

function magnifier(ctx: ItemContext): THREE.Object3D {
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, -0.045], [0.007, -0.044], [0.0085, 0.02], [0.0065, 0.04], [0.0055, 0.05]], q(ctx, 14)), wood("#5C3A25", 0.45)));
    g.add(mesh(new THREE.TorusGeometry(0.034, 0.0055, q(ctx, 10, 6), q(ctx, 36, 14)), plastic("#E5484D", 0.25), V(0, 0.088, 0)));
    g.add(mesh(new THREE.CircleGeometry(0.033, q(ctx, 32, 12)), material({ kind: "glass", color: "#DFF4FF", opacity: 0.3 }), V(0, 0.088, 0)));
    g.add(mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.012, 10), metal("#C9CED6"), V(0, 0.052, 0)));
    return g;
}

// ── Spisak ──────────────────────────────────────────────────────────────────

const HAND: ItemBuilder["thumb"] = { focus: "hand" };
const FULL: ItemBuilder["thumb"] = { focus: "full" };

const simple = (id: string, make: (ctx: ItemContext) => THREE.Object3D, options: { lean?: number; out?: number; upright?: boolean; size?: number } = {}, extra: Partial<ItemBuilder> = {}): ItemBuilder => ({
    id,
    build: (ctx) => {
        hold(ctx, make(ctx), options);
    },
    thumb: HAND,
    ...extra,
});

registerItems("hand", [
    simple("lizalica", lollipop),
    simple("cvet", (ctx) => flower(ctx, "#F78FB3", "#FFD15C")),
    simple("jabuka", apple, { lean: 0.2 }),
    simple("sargarepa", carrot, { lean: 0.35 }),
    {
        id: "balon",
        build: (ctx) => balloonBunch(ctx, [{ hex: "#E5484D", at: V(-0.2, 0.08, 0.04) }]),
        motion: "float",
        thumb: FULL,
    },
    simple("sladoled", iceCream, { lean: 0.25 }),
    simple("kolacic", cupcake, { lean: 0.15 }),
    simple("varjaca", spoon, { lean: 0.4 }),
    simple("suncokret", (ctx) => flower(ctx, "#FFD15C", "#8A5A30", true)),
    simple("lopta", beachBall, { upright: true }),
    simple("cetkica", paintBrush),
    simple("kokice", popcorn, { lean: 0.15 }),
    simple("knjiga", book, { upright: true }),
    {
        id: "vetrenjaca",
        build: (ctx) => {
            const { object, spin } = pinwheel(ctx);
            hold(ctx, object, { lean: 0.32 });
            return { animate: (time, _dt, live) => (spin.rotation.z = live ? -time * 1.6 : 0) };
        },
        motion: "spin",
        thumb: HAND,
    },
    simple("kofica", bucket, { upright: true }),
    {
        id: "mehurici",
        build: (ctx) => {
            const { object, bubbles } = bubbleWand(ctx);
            hold(ctx, object, { lean: 0.35 });
            return {
                animate: (time, _dt, live) => {
                    bubbles.forEach((b, i) => {
                        const base = b.userData.base as THREE.Vector3;
                        if (!live) {
                            b.position.copy(base);
                            b.scale.setScalar(1);
                            return;
                        }
                        // Mehur se polako diže, njiše i nestaje pa kreće ispočetka (bez treptanja)
                        const t = ((time * 0.12 + i * 0.21) % 1 + 1) % 1;
                        b.position.set(base.x + Math.sin(time * 0.8 + i) * 0.01, base.y - 0.06 + t * 0.14, base.z);
                        b.scale.setScalar(Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.9 + 0.1);
                    });
                },
            };
        },
        motion: "float",
        thumb: HAND,
    },
    simple("lampa", flashlight, { upright: true }),
    simple("kantica", wateringCan, { upright: true }),
    {
        id: "kisobran",
        build: (ctx) => {
            const upright = keepUpright(ctx, hold(ctx, umbrella(ctx), { upright: true, size: 1 }));
            return { animate: () => upright() };
        },
        dependsOn: ["hat"],
        thumb: { focus: "full", zoom: 0.82 },
    },
    simple("teniski-reket", racket, { lean: 0.3 }),
    simple("laso", lasso, { upright: true }),
    simple("mikrofon", microphone, { lean: 0.55 }),
    simple("mapa", treasureMap, { upright: true }),
    simple("stapic-zvezda", starWand),
    simple("dvogled", binoculars, { upright: true }),
    {
        id: "balon-srce",
        build: (ctx) => balloonBunch(ctx, [{ hex: "#F45B8D", at: V(-0.2, 0.08, 0.04), heart: true }]),
        motion: "float",
        thumb: FULL,
    },
    simple("medvedic", teddy, { upright: true }),
    { id: "zmaj-od-papira", build: kite, motion: "float", thumb: { focus: "full", zoom: 0.8 } },
    {
        id: "tri-balona",
        build: (ctx) => balloonBunch(ctx, [
            { hex: "#3D9BE9", at: V(-0.16, -0.02, 0.03), r: 0.085 },
            { hex: "#FFD15C", at: V(-0.36, -0.1, 0.0), r: 0.085 },
            { hex: "#F45B8D", at: V(-0.27, 0.14, -0.05), r: 0.09 },
        ]),
        motion: "float",
        thumb: FULL,
    },
    simple("gitara", guitar, { upright: true, size: 1.1 }, { thumb: { focus: "full" } }),
    simple("bojica", crayon),
    simple("flasica", bottle, { lean: 0.15 }),
    simple("lupa", magnifier, { lean: 0.5 }),
]);

