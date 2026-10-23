// Trinaest 3D okruženja (pozadina): mirna, svetla, bez gužve. Lik stoji na (0, 0, 0);
// sve je iza njega (z < −0,8) ili sa strane, ništa između kamere i lika. U širokom kadru
// (baner) rekviziti idu do x ±8, u uspravnom su bliže liku (X = x · 0,52).

import type { Environment, EnvironmentContext } from "../../contract";
import { printTexture } from "../../engine/textures";
import { animator, Batch, fogFor, bush, clouds, fence, flowerField, grassTufts, ground, hill, instanced, layout, mapped, paint, pine, put, rng, rock, roundTree, scene, solid, sun, THREE, vcMat, type Layout, type Tick } from "./env";
import {
    balloons,
    barn,
    bench,
    brainCoral,
    box,
    bunting,
    butterflies,
    cloudBank,
    coral,
    ferrisWheel,
    fish,
    hayBale,
    lamp,
    palm,
    pennant,
    rbox,
    ribbon,
    seaweed,
    shell,
    silo,
    snowman,
    starfish,
    tent,
    tower,
    umbrella,
    windmill,
} from "./envProps";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const col = (hex: string) => new THREE.Color(hex);

/** x u širokom kadru → x za uspravni (bliže liku) */
const X = (L: Layout, x: number) => (L.wide ? x : x * 0.52);

/** Dnevno svetlo (toplo sunce spreda-levo, nebo plavičasto) */
const DAY: Environment["light"] = {
    hemi: { sky: "#E4F1FF", ground: "#C9DDB0", intensity: 0.59 },
    sun: { color: "#FFF1DC", intensity: 2.29, dir: [-1.2, 2.6, 2.6] },
    exposure: 0.81,
};

/** Cveće razbacano po polju (izbegava stazu iza lika i prostor ispred) */
function meadowFlowers(L: Layout, n: number, seed: number, area: { x: number; z0: number; z1: number }, colors: string[], keepOut?: (x: number, z: number) => boolean) {
    const r = rng(seed);
    const out: { x: number; z: number; s: number; color: string; tilt: number }[] = [];
    let guard = 0;
    while (out.length < n && guard++ < n * 20) {
        const x = (r() * 2 - 1) * area.x;
        const z = area.z0 + (area.z1 - area.z0) * r();
        // Ispred lika samo sa strane i samo u širokom kadru (nikad između kamere i lika)
        if (z > -0.9 && !(L.wide && Math.abs(x) > 2.0 + z * 0.3)) continue;
        if (keepOut?.(x, z)) continue;
        const far = Math.min(1, -z / 12);
        out.push({ x: X(L, x), z, s: 0.9 + r() * 0.6 + far * 0.8, color: colors[Math.floor(r() * colors.length)], tilt: (r() - 0.5) * 0.3 });
    }
    return out;
}

function tufts(L: Layout, n: number, seed: number, area: { x: number; z0: number; z1: number }) {
    const r = rng(seed);
    return Array.from({ length: n }, () => ({ x: X(L, (r() * 2 - 1) * area.x), z: area.z0 + (area.z1 - area.z0) * r(), s: 0.8 + r() * 0.9 })).filter((t) => t.z < -0.9);
}

// ── Soba ──────────────────────────────────────────────────────────────────────

function wallpaper(): THREE.Texture {
    const tex = printTexture("bg-tapeta", (ctx, w, h) => {
        ctx.fillStyle = "#F9DCC4";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#F4CDB0";
        for (let i = 0; i < 4; i++) ctx.fillRect((i * w) / 4, 0, w / 8, h);
        ctx.fillStyle = "#FFFFFF";
        for (const [x, y] of [[0.19, 0.25], [0.69, 0.75]]) {
            ctx.save();
            ctx.translate(x * w, y * h);
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const rr = i % 2 ? 6 : 14;
                const a = -Math.PI / 2 + (i * Math.PI) / 5;
                ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
            }
            ctx.fill();
            ctx.restore();
        }
    }, 128, 128);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(18, 4.4);
    return tex;
}

function planks(): THREE.Texture {
    const tex = printTexture("bg-daske", (ctx, w, h) => {
        const tones = ["#D9A46E", "#D19A64", "#DEAD78", "#CC945E"];
        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = tones[i % 4];
            ctx.fillRect(0, (i * h) / 8, w, h / 8);
            ctx.fillStyle = "rgba(120,70,30,0.18)";
            ctx.fillRect(0, (i * h) / 8, w, 2);
            ctx.fillRect(((i * 37) % 8) * (w / 8), (i * h) / 8, 2, h / 8);
            ctx.fillStyle = "rgba(255,255,255,0.08)";
            for (let k = 0; k < 6; k++) ctx.fillRect((k * w) / 6 + i * 5, (i * h) / 8 + 6 + (k % 3) * 4, w / 9, 1);
        }
    }, 256, 256);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 12);
    return tex;
}

function windowView(): THREE.Texture {
    return printTexture("bg-prozor", (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#9FD6FF");
        g.addColorStop(1, "#E3F4FF");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#FFFFFF";
        for (const [x, y, r] of [[0.3, 0.3, 0.09], [0.4, 0.26, 0.11], [0.5, 0.31, 0.08], [0.72, 0.5, 0.06], [0.8, 0.47, 0.08]]) {
            ctx.beginPath();
            ctx.arc(x * w, y * h, r * w, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = "#A9DD8F";
        ctx.beginPath();
        ctx.ellipse(w * 0.25, h * 1.02, w * 0.6, h * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#8ED07A";
        ctx.beginPath();
        ctx.ellipse(w * 0.85, h * 1.05, w * 0.5, h * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
    }, 128, 160);
}

function soba(ctx: EnvironmentContext): Environment {
    const L = layout(ctx);
    const { root, ticks } = scene();
    const b = new Batch();
    const wallZ = -2.6;
    // Pod (daske), tepih ispod lika, zid sa tapetom, lamperija i lajsna
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 14).rotateX(-Math.PI / 2).translate(0, 0, wallZ + 7), mapped(planks(), { rough: 0.6 }));
    root.add(floor);
    const rug = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
    b.add(put(rug, 0, 0.004, -0.3, { s: [1.9, 1, 1.3] }), (p) => {
        const d = Math.hypot(p.x / 1.9, (p.z + 0.3) / 1.3);
        return col(d > 0.9 ? "#FFFFFF" : d > 0.82 ? "#9C86E6" : d > 0.62 ? "#B7A5F2" : d > 0.56 ? "#FFFFFF" : "#C9BAF6");
    }, { rough: 1 });
    // Mekani taburei i korpa sa igračkama sa strane (široki kadar)
    if (L.wide) {
        b.add(put(new THREE.SphereGeometry(0.32, 24, 16), 3.7, 0.2, -0.7, { s: [1, 0.62, 1] }), "#FFB3C9", { rough: 1 });
        b.add(put(new THREE.TorusGeometry(0.27, 0.06, 8, 24), 3.7, 0.36, -0.7, { rx: Math.PI / 2 }), "#F78FB3", { rough: 1 });
        b.add(put(new THREE.CylinderGeometry(0.3, 0.26, 0.36, 20), -3.9, 0.18, -0.9), (p) => col(Math.floor(p.y * 18) % 2 ? "#E8C996" : "#D9B57E"));
        b.add(put(new THREE.SphereGeometry(0.12, 16, 12), -3.95, 0.42, -0.95), "#3D86E0");
        b.add(put(new THREE.SphereGeometry(0.1, 16, 12), -3.75, 0.43, -0.85), "#FFD15C");
        b.add(put(new THREE.ConeGeometry(0.08, 0.25, 12), -4.05, 0.48, -0.8, { rz: 0.4 }), "#E5484D");
    }
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(22, 4.6).translate(0, 2.3, wallZ), mapped(wallpaper(), { rough: 0.95 }));
    root.add(wall);
    b.add(rbox(22, 0.9, 0.04, 0.01).translate(0, 0.45, wallZ + 0.02), "#CDBDF0");
    b.add(rbox(22, 0.06, 0.07, 0.02).translate(0, 0.92, wallZ + 0.04), "#FFFFFF");
    b.add(rbox(22, 0.12, 0.05, 0.02).translate(0, 0.06, wallZ + 0.04), "#FFFFFF");
    // Prozor sa zavesama
    const wx = X(L, 2.1);
    const winW = 1.1;
    const winH = 1.25;
    const winY = 1.95;
    root.add(new THREE.Mesh(new THREE.PlaneGeometry(winW, winH).translate(wx, winY, wallZ + 0.03), mapped(windowView(), { glow: 0.75 })));
    for (const [w, h, dx, dy] of [[winW + 0.12, 0.08, 0, winH / 2], [winW + 0.12, 0.1, 0, -winH / 2], [0.08, winH, winW / 2, 0], [0.08, winH, -winW / 2, 0], [0.05, winH, 0, 0], [winW, 0.05, 0, 0.1]] as const) {
        b.add(rbox(w, h, 0.07, 0.015).translate(wx + dx, winY + dy, wallZ + 0.06), "#FFFFFF");
    }
    b.add(rbox(winW + 0.3, 0.06, 0.18, 0.02).translate(wx, winY - winH / 2 - 0.06, wallZ + 0.1), "#FFFFFF");
    b.add(put(new THREE.CylinderGeometry(0.018, 0.018, winW + 0.9, 8).rotateZ(Math.PI / 2), wx, winY + winH / 2 + 0.16, wallZ + 0.12), "#C9A661", { metal: 0.5, rough: 0.35 });
    const curtains: THREE.Mesh[] = [];
    for (const sx of [-1, 1]) {
        const g = new THREE.PlaneGeometry(0.42, winH + 0.45, 12, 6);
        const pos = g.getAttribute("position");
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            pos.setZ(i, Math.sin(x * 40) * 0.025 + 0.02);
            pos.setX(i, x * (0.75 + 0.25 * ((y + 0.9) / 1.8)));
        }
        g.computeVertexNormals();
        g.translate(0, -(winH + 0.45) / 2, 0);
        const m = new THREE.Mesh(paint(g, (p) => col("#F7A8C8").offsetHSL(0, 0, Math.sin(p.x * 40) * 0.04)), vcMat({ side: THREE.DoubleSide, rough: 0.8 }));
        m.position.set(wx + sx * (winW / 2 + 0.12), winY + winH / 2 + 0.15, wallZ + 0.14);
        root.add(m);
        curtains.push(m);
    }
    ticks.push((t) => curtains.forEach((c, i) => (c.rotation.x = Math.sin(t * 0.6 + i) * 0.02)));
    // Slika sa srcem
    const px = X(L, -1.5);
    b.add(rbox(0.62, 0.52, 0.04, 0.02).translate(px, 2.05, wallZ + 0.03), "#E8C56A");
    b.add(rbox(0.5, 0.4, 0.02, 0.01).translate(px, 2.05, wallZ + 0.05), "#FFFFFF");
    const heart = new THREE.Shape();
    heart.moveTo(0, -0.1);
    heart.bezierCurveTo(-0.16, 0.0, -0.1, 0.13, 0, 0.05);
    heart.bezierCurveTo(0.1, 0.13, 0.16, 0.0, 0, -0.1);
    b.add(new THREE.ExtrudeGeometry(heart, { depth: 0.01, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 }).translate(px, 2.05, wallZ + 0.06), "#F78FB3");
    // Polica sa knjigama i igračkama
    const sx0 = X(L, -3.4);
    b.add(rbox(1.3, 1.4, 0.34, 0.03).translate(sx0, 0.7, wallZ + 0.18), "#8FCFEA");
    for (const yy of [0.08, 0.52, 0.96]) b.add(rbox(1.2, 0.04, 0.3, 0.01).translate(sx0, yy, wallZ + 0.2), "#FFFFFF");
    b.add(rbox(1.2, 1.3, 0.02, 0.01).translate(sx0, 0.7, wallZ + 0.03), "#6FBFE0");
    const bookColors = ["#3D86E0", "#F45B8D", "#FFD15C", "#3BB273", "#8E77E6", "#FF8A3D"];
    const r = rng(7);
    let bx = sx0 - 0.52;
    while (bx < sx0 + 0.2) {
        const w = 0.06 + r() * 0.05;
        const h = 0.28 + r() * 0.1;
        b.add(rbox(w, h, 0.22, 0.012).translate(bx + w / 2, 0.54 + h / 2, wallZ + 0.22).rotateZ(0), bookColors[Math.floor(r() * 6)]);
        bx += w + 0.01;
    }
    b.add(put(new THREE.SphereGeometry(0.13, 18, 14), sx0 + 0.38, 0.68, wallZ + 0.22), "#E5484D");
    b.add(put(new THREE.SphereGeometry(0.13, 18, 14, 0, Math.PI), sx0 + 0.38, 0.68, wallZ + 0.22, { ry: Math.PI / 2 }), "#FFFFFF");
    for (let i = 0; i < 3; i++) b.add(rbox(0.16, 0.16, 0.16, 0.03).translate(sx0 - 0.35 + i * 0.2, 1.06, wallZ + 0.22).rotateY(0), ["#FFD15C", "#3D86E0", "#3BB273"][i]);
    b.add(put(new THREE.CylinderGeometry(0.1, 0.12, 0.28, 16), sx0 + 0.35, 1.12, wallZ + 0.22), "#7ED6F2");
    // Kocke na podu i biljka u saksiji
    const kx = X(L, 2.9);
    for (const [dx, dy, dz, c, ry] of [[0, 0.1, 0, "#E5484D", 0.2], [0.24, 0.1, 0.06, "#3D86E0", -0.3], [0.1, 0.3, 0.02, "#FFD15C", 0.5]] as const) {
        b.add(rbox(0.2, 0.2, 0.2, 0.03).rotateY(ry).translate(kx + dx, dy, -1.5 + dz), c);
    }
    const plx = X(L, -2.3);
    b.add(put(new THREE.CylinderGeometry(0.2, 0.15, 0.38, 20), plx, 0.19, wallZ + 0.45), "#F2F5FA");
    b.add(put(new THREE.TorusGeometry(0.2, 0.02, 6, 20), plx, 0.38, wallZ + 0.45, { rx: Math.PI / 2 }), "#F2F5FA");
    const plant = new THREE.Group();
    plant.position.set(plx, 0.36, wallZ + 0.45);
    root.add(plant);
    const leafMat = vcMat({ rough: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const leaf = new THREE.SphereGeometry(0.16, 12, 8).scale(0.45, 1, 0.12).translate(0, 0.16, 0);
        const m = new THREE.Mesh(paint(leaf, i % 2 ? "#4FAE5E" : "#6CC46F"), leafMat);
        m.rotation.set(0.55 + (i % 3) * 0.15, a, 0, "YXZ");
        plant.add(m);
    }
    ticks.push((t) => (plant.rotation.z = Math.sin(t * 0.5) * 0.03));
    // Svetleća girlanda sa zvezdicama iznad police (meki sjaj, bez treptanja)
    const garland: { p: THREE.Vector3; color: string }[] = [];
    for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        garland.push({ p: V(X(L, -4.6) + t * (X(L, -0.4) - X(L, -4.6)), 3.0 - Math.sin(t * Math.PI) * 0.25, wallZ + 0.06), color: ["#FFE48A", "#FFC9D9", "#CDEBFF"][i % 3] });
    }
    const bulbs = instanced(paint(new THREE.SphereGeometry(0.035, 10, 8), "#FFFFFF"), vcMat({ glow: 0.85 }), garland);
    root.add(bulbs);
    b.into(root);
    return {
        root,
        sky: ["#FBE9DA", "#F6DCC6"],
        floor: "own",
        light: { hemi: { sky: "#FFF2E4", ground: "#E7C49A", intensity: 0.66 }, sun: { color: "#FFE9CF", intensity: 2.12, dir: [1.4, 2.6, 2.6] }, exposure: 0.83 },
        animate: animator(ticks),
    };
}

// ── Park ──────────────────────────────────────────────────────────────────────

function park(ctx: EnvironmentContext): Environment {
    const L = layout(ctx);
    const { root, ticks } = scene();
    const b = new Batch();
    ground(b, "#8FD27A", "#6DBA66", { spot: "#9ED98A", noise: 0.09, seed: 3 });
    b.add(ribbon([[0.1, -0.9], [-0.3, -2.5], [0.4, -5], [1.6, -8], [3.5, -13], [6, -19]], 1.15), (p) => col("#F2E3B6").offsetHSL(0, 0, Math.sin(p.x * 7) * Math.sin(p.z * 5) * 0.02), { rough: 1 });
    // Brda u daljini (svetlija ka nebu — vazdušna perspektiva)
    hill(b, -12, -24, 14, 4.2, 7, "#86C978", "#A6DA96", L.seg(28));
    hill(b, 8, -27, 16, 5, 8, "#7FC373", "#A2D693", L.seg(28));
    hill(b, -2, -32, 20, 6.5, 9, "#9BCF92", "#BCE2B2", L.seg(28));
    const trees: [number, number, number, string][] = [[-2.4, -2.8, 1.05, "#6CC46F"], [2.9, -3.4, 1.2, "#5DB96A"], [-4.8, -5, 1.3, "#62BE6C"], [5.4, -6, 1.4, "#6CC46F"], [-1.6, -8.5, 1.2, "#58B46A"], [-7.2, -8.5, 1.5, "#5DB96A"], [7.6, -10, 1.6, "#62BE6C"], [3.0, -11.5, 1.3, "#6CC46F"], [-4.2, -13, 1.6, "#64B870"]];
    for (const [x, z, s, c] of trees) roundTree(b, X(L, x), z, s, c, "#9A6236", L.seg(18));
    for (const [x, z, s] of [[-1.3, -2.2, 0.8], [1.6, -2.4, 0.7], [-3.4, -3.6, 0.9], [4.2, -4.2, 0.9], [6.6, -3.6, 1.0], [-6.2, -3.5, 1.0]] as const) bush(b, X(L, x), z, s, "#5DB96A", L.seg(14));
    bench(b, X(L, 1.75), -2.0, -0.15);
    lamp(b, X(L, -1.4), -1.7, 2.1);
    ticks.push(flowerField(root, meadowFlowers(L, L.low ? 50 : 90, 11, { x: 8, z0: -1.2, z1: -9 }, ["#F78FB3", "#FFD15C", "#FFFFFF", "#B9A2F2", "#FF8A3D"], (x, z) => Math.abs(x - (0.2 + (-z - 1) * 0.25)) < 0.8)));
    grassTufts(root, tufts(L, L.low ? 60 : 120, 5, { x: 9, z0: -1, z1: -10 }), "#6CC46F");
    sun(root, X(L, -6.5), 5.6, -24, 1.1);
    ticks.push(clouds(root, [{ x: -5, y: 4.4, z: -16, s: 1.6 }, { x: 2.5, y: 5.2, z: -19, s: 2.0 }, { x: 8, y: 4.0, z: -15, s: 1.3 }, { x: -11, y: 5.5, z: -20, s: 1.8 }], { seg: L.seg(16) }));
    ticks.push(butterflies(root, [{ x: X(L, -2.2), y: 0.9, z: -1.6, color: "#FFB3C9" }, { x: X(L, 2.6), y: 1.1, z: -2.6, color: "#FFE48A" }]));
    b.into(root);
    return { root, sky: ["#8FD0F5", "#E2F4FF"], fog: fogFor(L, "#DCEFFA", 30), floor: "own", light: DAY, animate: animator(ticks) };
}

// ── Livada sa cvećem ──────────────────────────────────────────────────────────

function livada(ctx: EnvironmentContext): Environment {
    const L = layout(ctx);
    const { root, ticks } = scene();
    const b = new Batch();
    ground(b, "#97D67E", "#78C46C", { spot: "#A4DC8C", noise: 0.09, seed: 9 });
    hill(b, -7, -10, 7, 1.3, 4, "#8DD178", "#A5DC90", L.seg(28));
    hill(b, 6, -12, 8, 1.6, 4, "#86CC74", "#A0D98C", L.seg(28));
    hill(b, -1, -22, 18, 4.5, 8, "#94CF88", "#B4E0A8", L.seg(28));
    hill(b, 14, -26, 12, 5, 7, "#8CC981", "#AEDCA2", L.seg(28));
    for (const [x, z, s] of [[-9, -12, 1.4], [10.5, -14, 1.6], [-4.5, -20, 1.6], [6, -21, 1.5]] as const) roundTree(b, X(L, x), z, s, "#6CC46F", "#9A6236", L.seg(16));
    const colors = ["#F78FB3", "#FFD15C", "#FFFFFF", "#B9A2F2", "#FF8A3D", "#F45B8D", "#7ED6F2"];
    ticks.push(flowerField(root, meadowFlowers(L, L.low ? 120 : 230, 21, { x: 9, z0: 3.0, z1: -12 }, colors)));
    grassTufts(root, tufts(L, L.low ? 80 : 160, 6, { x: 9, z0: -1, z1: -11 }), "#6FC062");
    sun(root, X(L, 6.5), 5.4, -24, 1.0);
    ticks.push(clouds(root, [{ x: -6, y: 4.8, z: -18, s: 1.7 }, { x: 3, y: 5.6, z: -21, s: 2.1 }, { x: 10, y: 4.3, z: -17, s: 1.4 }], { seg: L.seg(16) }));
    ticks.push(butterflies(root, [
        { x: X(L, -1.8), y: 0.8, z: -1.5, color: "#FFB3C9" },
        { x: X(L, 2.0), y: 1.0, z: -2.2, color: "#B9A2F2" },
        { x: X(L, -3.6), y: 1.2, z: -3.5, color: "#FFE48A" },
        { x: X(L, 4.2), y: 0.9, z: -3.0, color: "#7ED6F2" },
    ]));
    b.into(root);
    return { root, sky: ["#9AD6F7", "#F0FAFF"], fog: fogFor(L, "#E6F5FB", 28), floor: "own", light: { ...DAY, hemi: { sky: "#EAF6FF", ground: "#CBE6B3", intensity: 0.63 } }, animate: animator(ticks) };
}

// ── Grad ──────────────────────────────────────────────────────────────────────

function paving(): THREE.Texture {
    const tex = printTexture("bg-plocnik", (ctx, w, h) => {
        ctx.fillStyle = "#ECE6DC";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(150,140,130,0.35)";
        ctx.lineWidth = 2;
        for (let i = 0; i <= 4; i++) {
            ctx.beginPath();
            ctx.moveTo(0, (i * h) / 4);
            ctx.lineTo(w, (i * h) / 4);
            ctx.stroke();
            for (let k = 0; k < 2; k++) {
                const x = ((k + (i % 2) * 0.5) * w) / 2;
                ctx.beginPath();
                ctx.moveTo(x, (i * h) / 4);
                ctx.lineTo(x, ((i + 1) * h) / 4);
                ctx.stroke();
            }
        }
    }, 128, 128);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(20, 5);
    return tex;
}

function building(b: Batch, x: number, z: number, w: number, h: number, color: string, r: () => number, roof: "flat" | "gable") {
    const d = 1.6;
    b.add(rbox(w, h, d, 0.05).translate(x, h / 2, z), (p) => col(color).offsetHSL(0, 0, (p.y / h) * 0.04));
    if (roof === "flat") {
        b.add(rbox(w + 0.14, 0.14, d + 0.14, 0.03).translate(x, h + 0.07, z), "#FFFFFF");
    } else {
        const shape = new THREE.Shape();
        shape.moveTo(-w / 2 - 0.1, 0);
        shape.lineTo(0, w * 0.42);
        shape.lineTo(w / 2 + 0.1, 0);
        const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: d + 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
        b.add(roofGeo.translate(x, h, z - d / 2 - 0.05), "#D9675A");
    }
    // Prozori u redovima, vrata i tenda
    const cols = Math.max(1, Math.floor(w / 0.62));
    const rows = Math.max(1, Math.floor((h - 1.0) / 0.75));
    for (let row = 0; row < rows; row++) {
        for (let c = 0; c < cols; c++) {
            const wx = x - w / 2 + (w / cols) * (c + 0.5);
            const wy = 1.25 + row * 0.75;
            b.add(box(0.34, 0.44, 0.04).translate(wx, wy, z + d / 2 + 0.01), "#FFFFFF");
            b.add(box(0.26, 0.36, 0.04).translate(wx, wy, z + d / 2 + 0.025), r() > 0.8 ? "#FFF0C2" : "#BFE3FA", { rough: 0.25 });
            b.add(box(0.4, 0.05, 0.1).translate(wx, wy - 0.25, z + d / 2 + 0.05), "#FFFFFF");
        }
    }
    b.add(rbox(0.42, 0.72, 0.05, 0.04).translate(x + (r() - 0.5) * (w - 0.6), 0.36, z + d / 2 + 0.02), "#8A5A30");
    if (w > 1.3) {
        const awning = new THREE.CylinderGeometry(0.16, 0.16, w * 0.8, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(0);
        awning.rotateX(-Math.PI / 2);
        const ax = x;
        b.add(awning.translate(ax, 0.95, z + d / 2 + 0.12), (p) => col(Math.floor((p.x - ax + 5) / 0.16) % 2 ? "#FFFFFF" : color === "#F7A8C8" ? "#E5484D" : "#F45B8D"), { side: THREE.DoubleSide });
    }
}

function grad(ctx: EnvironmentContext): Environment {
    const L = layout(ctx);
    const { root, ticks } = scene();
    const b = new Batch();
    root.add(new THREE.Mesh(new THREE.PlaneGeometry(60, 9).rotateX(-Math.PI / 2).translate(0, 0, 2.3), mapped(paving(), { rough: 0.9 })));
    b.add(rbox(60, 0.1, 0.18, 0.03).translate(0, 0.02, -2.25), "#D5D0C8");
    b.add(new THREE.PlaneGeometry(60, 2.2).rotateX(-Math.PI / 2).translate(0, 0.0, -3.4), "#B7C1CE", { rough: 0.9 });
    for (let i = -14; i <= 14; i++) b.add(box(0.9, 0.006, 0.1).translate(i * 2, 0.006, -3.4), "#FFFFFF");
    b.add(rbox(60, 0.1, 0.18, 0.03).translate(0, 0.02, -4.55), "#D5D0C8");
    b.add(new THREE.PlaneGeometry(60, 3).rotateX(-Math.PI / 2).translate(0, 0.002, -6.1), "#E6E0D6");
    b.add(new THREE.PlaneGeometry(80, 40).rotateX(-Math.PI / 2).translate(0, -0.01, -26), "#CFE3C6");
    const palette = ["#F7A8C8", "#FFD15C", "#7ED6F2", "#B9A2F2", "#9BD88F", "#FFB866", "#F2F5FA"];
    const r = rng(4);
    let x = -11;
    let i = 0;
    while (x < 11) {
        const w = 1.3 + r() * 1.1;
        const h = 2.4 + r() * 1.8;
        building(b, X(L, x + w / 2) , -6.6 - r() * 0.3, L.wide ? w : w * 0.75, h, palette[i % palette.length], r, r() > 0.55 ? "gable" : "flat");
        x += w + 0.12;
        i++;
    }
    // Drugi red (dalje, viši, bleđi kroz izmaglicu)
    x = -14;
    while (x < 14) {
        const w = 1.6 + r() * 1.4;
        const h = 4.5 + r() * 2.5;
        b.add(rbox(w, h, 1.4, 0.06).translate(X(L, x + w / 2), h / 2, -11 - r()), palette[Math.floor(r() * palette.length)]);
        x += w + 0.25;
    }
    for (const tx of [-3.8, -1.5, 1.6, 4.2, 6.8, -6.5]) {
        roundTree(b, X(L, tx), -5.2, 0.85, "#6CC46F", "#9A6236", L.seg(14));
        b.add(put(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16), X(L, tx), 0.04, -5.2), "#B7A898");
    }
    for (const lx of [-2.2, 2.4, 6.5, -6.4]) lamp(b, X(L, lx), -1.85, 2.4);
    for (const [fx, c] of [[-1.3, "#F78FB3"], [1.35, "#FFD15C"]] as const) {
        b.add(put(new THREE.CylinderGeometry(0.2, 0.16, 0.35, 16), X(L, fx), 0.17, -1.4), "#E9E2D8");
        bush(b, X(L, fx), -1.4, 0.45, "#5DB96A", L.seg(12));
        b.add(put(new THREE.SphereGeometry(0.06, 8, 6), X(L, fx) + 0.08, 0.42, -1.28), c);
        b.add(put(new THREE.SphereGeometry(0.06, 8, 6), X(L, fx) - 0.1, 0.46, -1.32), c);
    }
    ticks.push(clouds(root, [{ x: -6, y: 6.4, z: -20, s: 1.8 }, { x: 4, y: 7.2, z: -23, s: 2.2 }, { x: 11, y: 6.0, z: -19, s: 1.4 }], { seg: L.seg(16) }));
    // Ptice-baloni? Ne — samo zastavica na jednoj zgradi koja se vijori
    ticks.push(pennant(root, X(L, 0.3), 4.6, -7.2, "#3D9BE9", 1.4));
    b.into(root);
    return { root, sky: ["#8ECDF4", "#E6F5FF"], fog: fogFor(L, "#E2F1FB", 31), floor: "own", light: DAY, animate: animator(ticks) };
}

// ── Šuma ──────────────────────────────────────────────────────────────────────

function suma(ctx: EnvironmentContext): Environment {
    const L = layout(ctx);
    const { root, ticks } = scene();
    const b = new Batch();
    ground(b, "#9CCF86", "#6FA66E", { spot: "#A9D690", noise: 0.08, seed: 13 });
    b.add(ribbon([[0, -0.9], [0.4, -3], [-0.3, -6], [0.6, -10], [0, -16]], 0.9), "#D9C49A", { rough: 1 });
    const r = rng(31);
    for (let i = 0; i < (L.low ? 22 : 38); i++) {
        const z = -2.2 - r() * 16;
        const spread = 3 + -z * 0.6;
        let x = (r() * 2 - 1) * spread;
        if (Math.abs(x) < 1.1 + (-z < 6 ? 0.6 : 0)) x += Math.sign(x || 1) * 1.4;
        const s = 1.1 + r() * 0.7 + (-z / 16) * 0.6;
        const green = ["#4FA35E", "#5CAF66", "#3E9950", "#62B06A"][Math.floor(r() * 4)];
        if (r() > 0.45) pine(b, X(L, x), z, s * 1.25, { color: green, seg: L.seg(12) });
        else roundTree(b, X(L, x), z, s, green, "#8A5A30", L.seg(14));
    }
    // Paprat, pečurke, panj, kamenje
    const fernGeo = (() => {
        const parts: THREE.BufferGeometry[] = [];
        for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            const leaf = new THREE.SphereGeometry(0.16, 10, 6).scale(0.25, 0.08, 1).translate(0, 0.1, 0.17);
            leaf.rotateX(-0.5);
            leaf.rotateY(a);
            parts.push(paint(leaf, k % 2 ? "#4FAE5E" : "#62BE6C"));
        }
        return parts;
    })();
    const ferns = new Batch();
    const fr = rng(17);
    for (let i = 0; i < (L.low ? 10 : 18); i++) {
        const z = -1.2 - fr() * 6;
        const x = (fr() < 0.5 ? -1 : 1) * (1.0 + fr() * 6);
        for (const part of fernGeo) ferns.add(put(part.clone(), X(L, x), 0, z, { s: 1 + fr() * 0.6, ry: fr() * 6 }), (p) => col("#58B46A").offsetHSL(0, 0, p.y * 0.4));
    }
    ferns.into(root);
    for (const g of fernGeo) g.dispose();
    for (const [mx, mz, s] of [[-1.3, -1.5, 1], [-1.6, -1.8, 0.7], [1.5, -2.0, 0.9], [2.6, -3.2, 1.1], [-3.0, -2.6, 0.8]] as const) {
        const x = X(L, mx);
        b.add(put(new THREE.CylinderGeometry(0.035 * s, 0.045 * s, 0.14 * s, 10), x, 0.07 * s, mz), "#FFF6EA");
        b.add(put(new THREE.SphereGeometry(0.11 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), x, 0.13 * s, mz, { s: [1, 0.7, 1] }), "#E5484D", { rough: 0.5 });
        for (let k = 0; k < 5; k++) {
            const a = k * 1.3;
            b.add(put(new THREE.SphereGeometry(0.014 * s, 6, 5), x + Math.cos(a) * 0.06 * s, 0.13 * s + 0.055 * s, mz + Math.sin(a) * 0.06 * s), "#FFFFFF");
        }
    }
    b.add(put(new THREE.CylinderGeometry(0.3, 0.36, 0.35, 18), X(L, -2.4), 0.17, -2.4), "#9A6236");
    b.add(put(new THREE.CylinderGeometry(0.29, 0.29, 0.02, 18), X(L, -2.4), 0.355, -2.4), "#E6C79A");
    for (const [x, z, s] of [[2.0, -1.6, 0.8], [3.4, -2.4, 1.1], [-3.8, -4, 1.0]] as const) rock(b, X(L, x), z, s, "#B5BDB4");
    // Svetlosni zraci kroz krošnje (meko „disanje”, bez treptanja)
    const rays = new THREE.Group();
    root.add(rays);
    const rayMats: THREE.MeshBasicMaterial[] = [];
    for (const [x, z, w] of [[-1.8, -5, 0.9], [1.2, -7, 1.2], [3.6, -6, 0.8], [-4.5, -9, 1.3]] as const) {
        const m = new THREE.MeshBasicMaterial({ color: "#FFF6CC", transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
        rayMats.push(m);
        const ray = new THREE.Mesh(new THREE.PlaneGeometry(w, 9).translate(0, 4.5, 0), m);
        ray.position.set(X(L, x), 0, z);
        ray.rotation.z = -0.35;
        rays.add(ray);
    }
    ticks.push((t) => rayMats.forEach((m, i) => (m.opacity = 0.055 + 0.015 * Math.sin(t * 0.35 + i * 1.7))));
    // Lišće koje polako pada
    const lr = rng(77);
    const leaves = Array.from({ length: L.low ? 10 : 18 }, () => ({ x: (lr() * 2 - 1) * 6, y: lr() * 4, z: -1.5 - lr() * 6, s: lr() }));
    const leafMesh = instanced(paint(new THREE.SphereGeometry(0.05, 8, 5).scale(1, 0.15, 0.6), "#FFFFFF"), vcMat({ side: THREE.DoubleSide }), leaves.map((l) => ({ p: V(X(L, l.x), l.y, l.z), color: l.s > 0.5 ? "#F2B84B" : "#8CCB6E" })));
    root.add(leafMesh);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = V(1, 1, 1);
    ticks.push((t) => {
        leaves.forEach((l, i) => {
            const y = 4.2 - ((l.y * 1.0 + t * (0.18 + l.s * 0.1)) % 4.2);
            q.setFromEuler(new THREE.Euler(Math.sin(t + i) * 0.8, t * 0.4 + i, Math.cos(t * 0.7 + i) * 0.6));
            m4.compose(V(X(L, l.x) + Math.sin(t * 0.5 + i) * 0.3, y, l.z), q, one);
            leafMesh.setMatrixAt(i, m4);
        });
        leafMesh.instanceMatrix.needsUpdate = true;
    });
    b.into(root);
    return {
        root,
        sky: ["#BFE6CF", "#EAF6E2"],
        fog: fogFor(L, "#D8EDD5", 25),
        floor: "own",
        light: { hemi: { sky: "#F0FAE8", ground: "#9CCF86", intensity: 0.66 }, sun: { color: "#FFF0D2", intensity: 2.12, dir: [-1.4, 2.8, 2.2] }, exposure: 0.83 },
        animate: animator(ticks),
    };
}

// ── Plaža ─────────────────────────────────────────────────────────────────────

function plaza(ctx: EnvironmentContext): Environment {
    const L = layout(ctx);
    const { root, ticks } = scene();
    const b = new Batch();
    ground(b, "#F3DDA6", "#E9CC8C", { noise: 0.06, seed: 5 });
    // Mokri pesak uz vodu
    b.add(new THREE.PlaneGeometry(80, 1.4).rotateX(-Math.PI / 2).translate(0, 0.002, -3.6), "#E8CF94", { rough: 0.6 });
    // More: blagi talasi (pomeranje temena)
    const seaGeo = new THREE.PlaneGeometry(90, 44, L.low ? 50 : 90, L.low ? 18 : 30).rotateX(-Math.PI / 2).translate(0, 0.02, -26);
    const sea = new THREE.Mesh(paint(seaGeo, (p) => col("#5FCDE8").lerp(col("#2F96CE"), Math.min(1, (-p.z - 4) / 26))), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.0 }));
    root.add(sea);
    const pos = sea.geometry.getAttribute("position");
    const base = Float32Array.from(pos.array as Float32Array);
    const wave = (t: number) => {
        for (let i = 0; i < pos.count; i++) {
            const x = base[i * 3];
            const z = base[i * 3 + 2];
            const near = Math.min(1, (-z - 4) / 3);
            pos.setY(i, 0.02 + near * (0.03 * Math.sin(x * 0.8 + t * 0.9 + z * 0.4) + 0.02 * Math.sin(z * 1.3 - t * 0.7)));
        }
        pos.needsUpdate = true;
        sea.geometry.computeVertexNormals();
    };
    wave(0);
    ticks.push(wave);
    // Pena uz obalu
    const foam = new THREE.Mesh(paint(ribbon([[-40, -4.25], [-20, -4.15], [0, -4.3], [20, -4.18], [40, -4.25]], 0.28, 0.035), "#FFFFFF"), vcMat({ rough: 0.9, opacity: 0.85 }));
    root.add(foam);
    ticks.push((t) => (foam.position.z = Math.sin(t * 0.5) * 0.12));
    ticks.push(palm(root, b, X(L, -2.6), -2.4, 1.1));
    if (L.wide) ticks.push(palm(root, b, -6.2, -3.0, 1.3));
    umbrella(b, X(L, 2.3), -2.0, 1, "#F2557A", "#FFFFFF");
    for (const [x, z, c] of [[-1.2, -1.3, "#FF8A3D"], [3.8, -1.6, "#F45B8D"]] as const) starfish(b, X(L, x), z, 1, c);
    for (const [x, z, c] of [[1.2, -1.4, "#F7A8C8"], [-1.9, -1.9, "#FFFFFF"], [4.6, -2.6, "#FFD9B3"]] as const) shell(b, X(L, x), z, 1, c);
    // Kofica i kula od peska
    const cx = X(L, 1.3);
    b.add(put(new THREE.CylinderGeometry(0.22, 0.26, 0.24, 16), cx, 0.12, -2.8), "#EBCB8E");
    b.add(put(new THREE.CylinderGeometry(0.14, 0.17, 0.18, 16), cx, 0.33, -2.8), "#EBCB8E");
    b.add(put(new THREE.ConeGeometry(0.03, 0.12, 6), cx, 0.5, -2.8), "#E5484D");
    // Jedrilica u daljini (ljulja se)
    const boat = new THREE.Group();
    const bb = new Batch();
    bb.add(new THREE.CylinderGeometry(0.45, 0.32, 0.2, 16, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI).scale(1.6, 1, 0.6), "#FFFFFF");
    bb.add(put(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), 0, 0.7, 0), "#9AA0B8");
    const sail = new THREE.Shape();
    sail.moveTo(0, 0.15);
    sail.lineTo(0, 1.35);
    sail.lineTo(0.62, 0.15);
    bb.add(new THREE.ShapeGeometry(sail).translate(0.03, 0, 0), "#FFFFFF", { side: THREE.DoubleSide });
    bb.add(new THREE.ShapeGeometry(sail).scale(-0.7, 0.85, 1).translate(-0.03, 0.05, 0), "#F45B8D", { side: THREE.DoubleSide });
    bb.into(boat);
    boat.position.set(X(L, 5.5), 0.05, -18);
    boat.scale.setScalar(1.4);
    root.add(boat);
    ticks.push((t) => {
        boat.position.x = X(L, 5.5) + Math.sin(t * 0.05) * 1.2;
        boat.rotation.z = Math.sin(t * 0.8) * 0.04;
        boat.position.y = 0.05 + Math.sin(t * 0.9) * 0.03;
    });
    sun(root, X(L, -6), 5.2, -30, 1.2, "#FFE9A0");
    ticks.push(clouds(root, [{ x: -4, y: 5.0, z: -22, s: 1.7 }, { x: 5, y: 5.8, z: -25, s: 2.0 }, { x: 12, y: 4.6, z: -21, s: 1.4 }], { seg: L.seg(16) }));
    b.into(root);
    return { root, sky: ["#7FCBF3", "#E4F6FF"], fog: fogFor(L, "#DDF1FA", 38), floor: "own", light: { hemi: { sky: "#EAF6FF", ground: "#F3DDAE", intensity: 0.66 }, sun: { color: "#FFF1D8", intensity: 2.38, dir: [-1.2, 2.8, 2.4] }, exposure: 0.81 }, animate: animator(ticks) };
}

// ── Zimski dan ────────────────────────────────────────────────────────────────

function zimskiDan(ctx: EnvironmentContext): Environment {
    const L = layout(ctx);
    const { root, ticks } = scene();
    const b = new Batch();
    ground(b, "#F7FAFD", "#E1ECF7", { noise: 0.025, seed: 2, rough: 0.9 });
    for (const [x, z, w, h] of [[-3, -3.5, 1.6, 0.4], [3.5, -4.2, 2.2, 0.5], [-6.5, -6, 2.8, 0.7], [7, -7, 3, 0.8], [0.5, -9, 4, 0.6]] as const) {
        b.add(put(new THREE.SphereGeometry(1, L.seg(24), 10, 0, Math.PI * 2, 0, Math.PI / 2), X(L, x), -0.02, z, { s: [w, h, w * 0.6] }), (p) => col("#FFFFFF").lerp(col("#DCE8F5"), Math.max(0, 1 - p.y / h) * 0.6));
    }
    hill(b, -10, -24, 14, 4.5, 7, "#E7F0F9", "#FFFFFF", L.seg(28));
    hill(b, 9, -27, 16, 5.5, 8, "#E2ECF7", "#FBFDFF", L.seg(28));
    const r = rng(41);
    for (let i = 0; i < (L.low ? 12 : 20); i++) {
        const z = -2.4 - r() * 13;
        let x = (r() * 2 - 1) * (3 + -z * 0.55);
        if (Math.abs(x) < 1.3) x += Math.sign(x || 1) * 1.6;
        pine(b, X(L, x), z, 1.1 + r() * 0.8, { color: "#3E9950", snow: true, seg: L.seg(12) });
    }
    snowman(b, X(L, 1.95), -2.2, 1);
    // Sneg pada polako (iza lika)
    const fr = rng(5);
    const n = L.low ? 70 : 140;
    const flakes = Array.from({ length: n }, () => ({ x: (fr() * 2 - 1) * 9, y: fr() * 6, z: -1.0 - fr() * 10, s: 0.6 + fr() * 0.8 }));
    const flakeMesh = instanced(paint(new THREE.IcosahedronGeometry(0.03, 0), "#FFFFFF"), vcMat({ glow: 0.4 }), flakes.map((f) => ({ p: V(X(L, f.x), f.y, f.z), s: f.s })));
    root.add(flakeMesh);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    ticks.push((t) => {
        flakes.forEach((f, i) => {
            const y = 6 - ((6 - f.y + t * (0.22 + f.s * 0.08)) % 6);
            sc.setScalar(f.s);
            m4.compose(V(X(L, f.x) + Math.sin(t * 0.4 + i) * 0.2, y, f.z), q, sc);
            flakeMesh.setMatrixAt(i, m4);
        });
        flakeMesh.instanceMatrix.needsUpdate = true;
    });
    ticks.push(clouds(root, [{ x: -5, y: 5.6, z: -20, s: 2.0 }, { x: 4, y: 6.2, z: -23, s: 2.4 }, { x: 11, y: 5.2, z: -19, s: 1.6 }], { seg: L.seg(16), color: "#F4F7FB", speed: 0.08 }));
    b.into(root);
    return {
        root,
        sky: ["#B9DAF4", "#F1F7FC"],
        fog: fogFor(L, "#EEF4FA", 29),
        floor: "own",
        light: { hemi: { sky: "#EAF3FF", ground: "#FFFFFF", intensity: 0.56 }, sun: { color: "#FFF4E6", intensity: 1.95, dir: [-1.2, 2.6, 2.6] }, exposure: 0.75 },
        animate: animator(ticks),
    };
}

// ── Duga ──────────────────────────────────────────────────────────────────────

function duga(ctx: EnvironmentContext): Environment {
    const L = layout(ctx);
    const { root, ticks } = scene();
    const b = new Batch();
    ground(b, "#BDE8B0", "#A6DCA0", { spot: "#C9EDBD", noise: 0.04, seed: 8 });
    hill(b, -9, -16, 10, 2.4, 6, "#B0E1A4", "#C9ECBF", L.seg(28));
    hill(b, 9, -17, 11, 2.8, 6, "#A9DE9E", "#C4EAB9", L.seg(28));
    // Velika duga: šest lukova (torus pola kruga)
    const R = L.wide ? 4.8 : 2.8;
    const w = L.wide ? 0.34 : 0.22;
    const colors = ["#F45B8D", "#FF8A3D", "#FFD15C", "#3BB273", "#3D9BE9", "#8E77E6"];
    colors.forEach((c, i) => {
        const g = new THREE.TorusGeometry(R - i * w, w / 2 + 0.005, L.seg(12), L.seg(96), Math.PI);
        g.scale(1, 1, 0.6);
        b.add(g.translate(0, -0.2, -9), c, { rough: 0.6, glow: 0.18 });
    });
    // Oblaci na krajevima duge i po nebu
    for (const sx of [-1, 1]) {
        cloudBank(b, sx * (R - w * 2.5), -8.7, L.wide ? 1.6 : 1.1);
        cloudBank(b, sx * (R - w * 1.2), -9.4, L.wide ? 1.3 : 0.9);
    }
    ticks.push(clouds(root, [{ x: -7, y: 5.4, z: -18, s: 1.8 }, { x: 0, y: 6.4, z: -21, s: 2.1 }, { x: 7, y: 5.2, z: -17, s: 1.6 }, { x: -12, y: 4.4, z: -16, s: 1.5 }], { seg: L.seg(16), color: "#FFF7FB" }));
    ticks.push(flowerField(root, meadowFlowers(L, L.low ? 40 : 70, 51, { x: 8, z0: -1.2, z1: -7 }, ["#F78FB3", "#B9A2F2", "#FFD15C", "#FFFFFF"])));
    // Iskrice (zvezdice) koje lebde i polako se okreću
    const sr = rng(15);
    const sparks = Array.from({ length: L.low ? 14 : 26 }, () => ({ x: (sr() * 2 - 1) * 7, y: 1.6 + sr() * 3.6, z: -3 - sr() * 6, c: ["#FFE48A", "#FFC9E0", "#D6CCFF", "#C9F0FF"][Math.floor(sr() * 4)] }));
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? 0.035 : 0.09;
        const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
        if (i === 0) starShape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else starShape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.02, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1 });
    const sparkMesh = instanced(paint(starGeo, "#FFFFFF"), vcMat({ glow: 0.6 }), sparks.map((s) => ({ p: V(X(L, s.x), s.y, s.z), color: s.c })));
    root.add(sparkMesh);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    ticks.push((t) => {
        sparks.forEach((s, i) => {
            q.setFromEuler(new THREE.Euler(0, t * 0.5 + i, Math.sin(t * 0.4 + i) * 0.3));
            sc.setScalar(0.9 + 0.12 * Math.sin(t * 0.6 + i * 1.3));
            m4.compose(V(X(L, s.x), s.y + Math.sin(t * 0.5 + i) * 0.1, s.z), q, sc);
            sparkMesh.setMatrixAt(i, m4);
        });
        sparkMesh.instanceMatrix.needsUpdate = true;
    });
    b.into(root);
    return {
        root,
        sky: ["#B8DFFF", "#FFE9F4"],
        fog: fogFor(L, "#F6EEF8", 27),
        floor: "own",
        light: { hemi: { sky: "#FFF2FA", ground: "#D2EDC6", intensity: 0.7 }, sun: { color: "#FFF4E8", intensity: 2.12, dir: [-1.0, 2.6, 2.6] }, exposure: 0.83 },
        animate: animator(ticks),
    };
}

// ── Farma ─────────────────────────────────────────────────────────────────────

function farma(ctx: EnvironmentContext): Environment {
    const L = layout(ctx);
    const { root, ticks } = scene();
    const b = new Batch();
    ground(b, "#A9DC92", "#8CCB7E", { spot: "#B6E2A0", noise: 0.06, seed: 12 });
    // Njive u redovima (desno u daljini) i livada
    for (let i = 0; i < 9; i++) {
        b.add(new THREE.PlaneGeometry(9, 0.42).rotateX(-Math.PI / 2).translate(X(L, 6.5), 0.004, -9 - i * 0.6), i % 2 ? "#C79A62" : "#9CCB6A", { rough: 1 });
    }
    hill(b, -10, -22, 13, 4, 7, "#9CD38B", "#B7E1A6", L.seg(28));
    hill(b, 8, -26, 16, 5, 8, "#A3D692", "#C0E6B2", L.seg(28));
    barn(b, X(L, -3.2), -5.2, 1.15, 0.12);
    silo(b, X(L, -4.9), -6.0, 1);
    ticks.push(windmill(root, b, X(L, 5.2), -9.5, 1.3));
    fence(b, X(L, -7.5), X(L, -0.8), -1.8, "#FFFFFF");
    fence(b, X(L, 0.8), X(L, 7.5), -1.8, "#FFFFFF");
    hayBale(b, X(L, 2.4), 0, -2.6, 1, 0.3);
    hayBale(b, X(L, 3.1), 0, -2.9, 1, -0.2);
    hayBale(b, X(L, 2.75), 0.6, -2.75, 1, 0.1);
    for (const [x, z, s] of [[-7.5, -9, 1.6], [7.8, -5.5, 1.4], [1.8, -12, 1.5], [-1.2, -14, 1.6]] as const) roundTree(b, X(L, x), z, s, "#6CC46F", "#9A6236", L.seg(16));
    ticks.push(flowerField(root, meadowFlowers(L, L.low ? 30 : 50, 61, { x: 8, z0: -2.2, z1: -7 }, ["#FFD15C", "#FFFFFF", "#F78FB3"], (x, z) => x < -1.5 && z < -3.5)));
    grassTufts(root, tufts(L, L.low ? 50 : 100, 3, { x: 9, z0: -1, z1: -9 }), "#7CCB6E");
    sun(root, X(L, 6.8), 5.6, -26, 1.1);
    ticks.push(clouds(root, [{ x: -6, y: 4.8, z: -18, s: 1.7 }, { x: 2.5, y: 5.6, z: -21, s: 2.0 }, { x: 10, y: 4.6, z: -17, s: 1.4 }], { seg: L.seg(16) }));
    b.into(root);
    return { root, sky: ["#8FD0F5", "#E8F6FF"], fog: fogFor(L, "#E0F1FA", 30), floor: "own", light: DAY, animate: animator(ticks) };
}

// ── Podvodni svet ─────────────────────────────────────────────────────────────

function caustics(): THREE.Texture {
    const tex = printTexture("bg-kaustika", (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 9; i++) {
            ctx.beginPath();
            for (let x = 0; x <= w; x += 8) {
                const y = ((i + 0.5) * h) / 9 + Math.sin(x * 0.05 + i * 1.7) * 10 + Math.sin(x * 0.11 + i) * 5;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        for (let i = 0; i < 9; i++) {
            ctx.beginPath();
            for (let y = 0; y <= h; y += 8) {
                const x = ((i + 0.5) * w) / 9 + Math.sin(y * 0.06 + i * 2.3) * 10;
                if (y === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }, 256, 256);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 6);
    return tex;
}

function podvodniSvet(ctx: EnvironmentContext): Environment {
    const L = layout(ctx);
    const { root, ticks } = scene();
    const b = new Batch();
    ground(b, "#E6D29C", "#9CCBC4", { noise: 0.07, seed: 21 });
    // Talasasto dno (dine) u daljini
    for (const [x, z, w, h] of [[-6, -9, 5, 0.6], [5, -11, 6, 0.8], [0, -16, 10, 1.2], [-11, -15, 6, 1]] as const) hill(b, X(L, x), z, w, h, w * 0.5, "#E9D7A4", "#F3E4B8", L.seg(24));
    // Kaustika: meke svetle mreže po dnu (polako klizi)
    const cTex = caustics();
    const cMat = new THREE.MeshBasicMaterial({ map: cTex, transparent: true, opacity: 0.045, depthWrite: false, blending: THREE.AdditiveBlending, color: "#E8FFFF" });
    const cPlane = new THREE.Mesh(new THREE.PlaneGeometry(30, 18).rotateX(-Math.PI / 2).translate(0, 0.01, -6), cMat);
    cPlane.renderOrder = 1;
    root.add(cPlane);
    ticks.push((t) => cTex.offset.set(t * 0.012, Math.sin(t * 0.1) * 0.03));
    // Korali, sunđeri, kamenje, školjke, zvezde
    const corals: [number, number, number, string][] = [[-1.6, -1.8, 1.1, "#F78FB3"], [-2.3, -2.4, 0.9, "#FF8A3D"], [1.8, -2.0, 1.2, "#B9A2F2"], [2.6, -2.8, 1.0, "#F45B8D"], [-4.2, -3.5, 1.4, "#FFB866"], [4.6, -3.6, 1.3, "#F78FB3"], [-6.5, -5, 1.6, "#B9A2F2"], [6.8, -5.5, 1.5, "#FF8A3D"]];
    corals.forEach(([x, z, s, c], i) => coral(b, X(L, x), z, s, c, i + 3));
    for (const [x, z, s, c] of [[-1.1, -2.6, 0.8, "#FFB866"], [1.2, -3.0, 1.0, "#7ED6F2"], [3.6, -4.2, 1.2, "#FFD15C"], [-3.3, -4.6, 1.1, "#F7A8C8"]] as const) brainCoral(b, X(L, x), z, s, c);
    for (const [x, z, s] of [[-2.8, -1.5, 0.9], [3.4, -1.7, 0.7], [0.4, -4.5, 1.3]] as const) rock(b, X(L, x), z, s, "#9FB4BE");
    for (const [x, z, c] of [[-0.9, -1.2, "#FF8A3D"], [2.2, -1.3, "#F45B8D"]] as const) starfish(b, X(L, x), z, 1, c);
    shell(b, X(L, 1.0), -1.5, 1, "#F7A8C8");
    // Alge koje se njišu
    const sw = rng(9);
    for (let i = 0; i < (L.low ? 8 : 14); i++) {
        const side = i % 2 ? 1 : -1;
        const x = side * (1.2 + sw() * 6);
        ticks.push(seaweed(root, X(L, x), -1.8 - sw() * 5, 0.8 + sw() * 1.1, sw() > 0.5 ? "#3BB273" : "#5CC48A"));
    }
    // Ribice plivaju polako po elipsama iza lika
    const fishes: { g: THREE.Group; r: number; z: number; y: number; sp: number; ph: number }[] = [];
    const fishColors: [string, string | undefined][] = [["#FFD15C", "#FFFFFF"], ["#FF8A3D", "#FFFFFF"], ["#F78FB3", undefined], ["#7ED6F2", undefined], ["#B9A2F2", "#FFFFFF"], ["#FFB866", undefined]];
    fishColors.forEach(([c, s], i) => {
        const g = fish(c, 1 + (i % 3) * 0.25, s);
        root.add(g);
        fishes.push({ g, r: (L.wide ? 3.5 : 1.8) + i * 0.4, z: -3.5 - i * 0.9, y: 1.2 + (i % 3) * 0.8, sp: 0.12 + (i % 2) * 0.04, ph: i * 1.3 });
    });
    const swim = (t: number) => {
        for (const f of fishes) {
            const a = t * f.sp + f.ph;
            f.g.position.set(Math.cos(a) * f.r, f.y + Math.sin(a * 2.3) * 0.12, f.z + Math.sin(a) * 0.6);
            // Riba gleda u smeru kretanja (x opada kad je sin > 0)
            f.g.scale.x = Math.sin(a) > 0 ? -1 : 1;
            f.g.rotation.z = Math.sin(t * 2 + f.ph) * 0.05;
        }
    };
    swim(2);
    ticks.push(swim);
    // Mehurići se polako dižu
    const br = rng(23);
    const bubbles = Array.from({ length: L.low ? 30 : 60 }, () => ({ x: (br() * 2 - 1) * 7, y: br() * 6, z: -1.2 - br() * 8, s: 0.5 + br() }));
    const bubMat = new THREE.MeshStandardMaterial({ color: "#E8FBFF", roughness: 0.05, transparent: true, opacity: 0.45, emissive: new THREE.Color("#BFF3FF"), emissiveIntensity: 0.25, depthWrite: false });
    const bubMesh = instanced(new THREE.SphereGeometry(0.04, 10, 8), bubMat, bubbles.map((u) => ({ p: V(X(L, u.x), u.y, u.z), s: u.s })));
    bubMesh.renderOrder = 2;
    root.add(bubMesh);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    ticks.push((t) => {
        bubbles.forEach((u, i) => {
            const y = (u.y + t * (0.25 + u.s * 0.1)) % 6;
            sc.setScalar(u.s);
            m4.compose(V(X(L, u.x) + Math.sin(t + i) * 0.08, y, u.z), q, sc);
            bubMesh.setMatrixAt(i, m4);
        });
        bubMesh.instanceMatrix.needsUpdate = true;
    });
    // Zraci svetla odozgo
    for (const [x, z, w] of [[-2.5, -6, 1.2], [1.5, -8, 1.6], [4.5, -7, 1.0], [-6, -10, 1.6]] as const) {
        const ray = new THREE.Mesh(new THREE.PlaneGeometry(w, 10).translate(0, 5, 0), solid("#E8FFFF", { basic: true, opacity: 0.07, additive: true, side: THREE.DoubleSide }));
        ray.position.set(X(L, x), 0, z);
        ray.rotation.z = 0.25;
        root.add(ray);
    }
    b.into(root);
    return {
        root,
        sky: ["#86DDF2", "#3EA6D0"],
        fog: fogFor(L, "#62C1DE", 23),
        floor: "own",
        light: { hemi: { sky: "#CFF6FF", ground: "#F2E2B0", intensity: 0.73 }, sun: { color: "#ECFCFF", intensity: 2.04, dir: [0.4, 3.0, 2.2] }, exposure: 0.85 },
        animate: animator(ticks),
    };
}

// ── Vašar ─────────────────────────────────────────────────────────────────────

function vasar(ctx: EnvironmentContext): Environment {
    const L = layout(ctx);
    const { root, ticks } = scene();
    const b = new Batch();
    ground(b, "#A6D98C", "#86C676", { spot: "#E9D2A0", noise: 0.06, seed: 19 });
    hill(b, -9, -24, 14, 4.5, 7, "#A2D692", "#BFE5B2", L.seg(28));
    hill(b, 10, -26, 15, 5, 8, "#9CD38B", "#B9E2A8", L.seg(28));
    ticks.push(ferrisWheel(root, b, X(L, -3.6), -8, L.wide ? 0.95 : 0.85));
    ticks.push(tent(root, b, X(L, 2.6), -3.6, 1.1, "#F45B8D", "#FFFFFF"));
    ticks.push(tent(root, b, X(L, 5.6), -6.0, 1.3, "#3D9BE9", "#FFFFFF"));
    if (L.wide) ticks.push(tent(root, b, -7.2, -4.4, 1.2, "#FFD15C", "#FFFFFF"));
    ticks.push(bunting(root, b, X(L, -4.2), X(L, 4.2), -2.3, 2.3, 0.4));
    ticks.push(balloons(root, X(L, -1.7), -1.7, 1));
    // Kiosk sa kokicama
    const kx = X(L, 1.4);
    b.add(rbox(0.8, 0.9, 0.55, 0.04).translate(kx, 0.45, -1.8), (p) => col(Math.floor((p.x - kx + 2) / 0.1) % 2 ? "#E5484D" : "#FFFFFF"));
    b.add(rbox(0.9, 0.06, 0.65, 0.02).translate(kx, 0.93, -1.8), "#FFD15C");
    for (const sx of [-0.4, 0.4]) b.add(put(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), kx + sx, 1.25, -1.6), "#F2F5FA");
    const roofK = new THREE.ConeGeometry(0.62, 0.32, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.7);
    b.add(roofK.translate(kx, 1.7, -1.8), (p) => col(Math.floor(((Math.atan2(p.z + 1.8, p.x - kx) + Math.PI) / (Math.PI * 2)) * 8) % 2 ? "#E5484D" : "#FFFFFF"));
    for (let i = 0; i < 9; i++) b.add(put(new THREE.SphereGeometry(0.05, 8, 6), kx - 0.2 + (i % 3) * 0.2, 1.0 + Math.floor(i / 3) * 0.05, -1.8 + (Math.floor(i / 3) - 1) * 0.12), "#FFF6DC");
    for (const [x, z, s] of [[-7.8, -9, 1.5], [7.8, -10, 1.6], [0.8, -12, 1.4]] as const) roundTree(b, X(L, x), z, s, "#6CC46F", "#9A6236", L.seg(16));
    ticks.push(clouds(root, [{ x: -6, y: 6.2, z: -20, s: 1.7 }, { x: 3, y: 6.8, z: -23, s: 2.1 }, { x: 10, y: 5.8, z: -19, s: 1.4 }], { seg: L.seg(16) }));
    b.into(root);
    return {
        root,
        sky: ["#9BD3F7", "#FFE9DA"],
        fog: fogFor(L, "#F4EDE8", 31),
        floor: "own",
        light: { hemi: { sky: "#FFF3EA", ground: "#E9D6AE", intensity: 0.66 }, sun: { color: "#FFE9D0", intensity: 2.21, dir: [-1.2, 2.5, 2.6] }, exposure: 0.83 },
        animate: animator(ticks),
    };
}

// ── Svemir ────────────────────────────────────────────────────────────────────

const nebulae = new Map<string, THREE.Material>();
/** Maglina: aditivna, bez magle scene (ostaje vidljiva u daljini) */
function nebula(color: string): THREE.Material {
    let m = nebulae.get(color);
    if (!m) {
        const soft = printTexture("bg-maglina", (c, w, h) => {
            const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
            g.addColorStop(0, "rgba(255,255,255,1)");
            g.addColorStop(0.45, "rgba(255,255,255,0.45)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            c.fillStyle = g;
            c.fillRect(0, 0, w, h);
        }, 128, 128);
        m = new THREE.MeshBasicMaterial({ color, map: soft, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
        nebulae.set(color, m);
    }
    return m;
}

function svemir(ctx: EnvironmentContext): Environment {
    const L = layout(ctx);
    const { root, ticks } = scene();
    const b = new Batch();
    ground(b, "#A9A3CF", "#837DB4", { noise: 0.08, seed: 33, spot: "#B5B0D8" });
    // Krateri (obod + udubljenje) i kamenčići
    const cr = rng(12);
    for (let i = 0; i < (L.low ? 8 : 14); i++) {
        const z = -1.3 - cr() * 12;
        const x = (cr() * 2 - 1) * (2 + -z * 0.6);
        if (Math.abs(x) < 0.9 && z > -2.5) continue;
        const r = 0.25 + cr() * 0.6;
        b.add(put(new THREE.TorusGeometry(r, r * 0.18, 8, L.seg(28)), X(L, x), 0.0, z, { rx: Math.PI / 2, s: [1, 1, 0.5] }), "#CFCBE6");
        b.add(put(new THREE.CircleGeometry(r * 0.95, L.seg(28)), X(L, x), 0.006, z, { rx: -Math.PI / 2 }), "#A39DCB");
    }
    for (const [x, z, s] of [[-1.8, -1.6, 0.6], [2.2, -2.2, 0.8], [3.8, -1.5, 0.5], [-3.6, -3.2, 0.9]] as const) rock(b, X(L, x), z, s, "#B9B4D6");
    // Nebo: zvezde na dalekoj kupoli (meko trepere — samo blago menjaju veličinu)
    const sr = rng(99);
    const stars = Array.from({ length: L.low ? 120 : 260 }, () => {
        const a = (sr() - 0.5) * Math.PI * 1.3;
        const e = 0.06 + sr() * 0.9;
        return { p: V(Math.sin(a) * 34 * Math.cos(e), 34 * Math.sin(e) - 2, -Math.cos(a) * 34 * Math.cos(e) * 0.8 - 4), s: 0.5 + sr() * 1.2, c: ["#FFFFFF", "#FFF2C8", "#DCD6FF", "#CDEFFF"][Math.floor(sr() * 4)], ph: sr() * 6 };
    });
    const starMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
    const starMesh = instanced(paint(new THREE.IcosahedronGeometry(0.07, 0), "#FFFFFF"), starMat, stars.map((s) => ({ p: s.p, s: s.s, color: s.c })));
    root.add(starMesh);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    ticks.push((t) => {
        stars.forEach((s, i) => {
            sc.setScalar(s.s * (0.85 + 0.15 * Math.sin(t * 0.5 + s.ph)));
            m4.compose(s.p, q, sc);
            starMesh.setMatrixAt(i, m4);
        });
        starMesh.instanceMatrix.needsUpdate = true;
    });
    // Maglina: meke providne mrlje u boji
    for (const [x, y, z, s, c] of [[-10, 9, -30, 9, "#F7A8C8"], [8, 12, -32, 11, "#9FC8FF"], [0, 6, -34, 12, "#C9A8FF"]] as const) {
        const blob = new THREE.Mesh(new THREE.CircleGeometry(s, 40), nebula(c));
        blob.position.set(X(L, x), y, z);
        root.add(blob);
    }
    // Planete: roze sa prstenom, plava, mali mesec — polako se okreću
    const planet = new THREE.Group();
    const pb = new Batch();
    pb.add(new THREE.SphereGeometry(1.5, L.seg(40), L.seg(28)), (p) => col("#F7A8C8").offsetHSL(0, 0, Math.sin(p.y * 4) * 0.05 + 0.02), { rough: 0.7, glow: 0.12 });
    pb.add(new THREE.RingGeometry(2.0, 2.9, L.seg(64), 1).rotateX(-Math.PI / 2 + 0.35), (p) => col(Math.hypot(p.x, p.z) > 2.45 ? "#FFE3A8" : "#FFD2E3"), { side: THREE.DoubleSide, rough: 0.7, glow: 0.15 });
    pb.into(planet);
    planet.position.set(X(L, 6.5), 5.8, -20);
    planet.rotation.z = 0.25;
    root.add(planet);
    const blue = new THREE.Mesh(paint(new THREE.SphereGeometry(0.8, L.seg(32), L.seg(24)), (p) => col("#7ED6F2").offsetHSL(0, 0, Math.sin(p.x * 5 + p.y * 3) * 0.06)), vcMat({ rough: 0.6, glow: 0.12 }));
    blue.position.set(X(L, -6.5), 6.4, -22);
    root.add(blue);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.45, L.seg(24), L.seg(16)), solid("#FFF2C8", { glow: 0.35 }));
    moon.position.set(X(L, -3.0), 4.2, -16);
    root.add(moon);
    ticks.push((t) => {
        planet.rotation.y = t * 0.05;
        blue.rotation.y = t * 0.08;
    });
    // Mala raketa u daljini (stoji na tlu) i zastavica
    const rx = X(L, -3.6);
    b.add(put(new THREE.CapsuleGeometry(0.22, 0.6, 6, 16), rx, 0.62, -5), "#F2F5FA", { rough: 0.4 });
    b.add(put(new THREE.ConeGeometry(0.22, 0.32, 16), rx, 1.25, -5), "#E5484D", { rough: 0.4 });
    b.add(put(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16).rotateX(Math.PI / 2), rx, 0.78, -4.78), "#7ED6F2", { glow: 0.4 });
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        b.add(put(rbox(0.04, 0.32, 0.18, 0.01), rx + Math.cos(a) * 0.22, 0.24, -5 + Math.sin(a) * 0.22, { ry: -a }), "#E5484D");
    }
    ticks.push(pennant(root, X(L, 3.4), 0, -3.2, "#FFD15C", 1.6));
    b.into(root);
    return {
        root,
        sky: ["#3A3A8E", "#B48AD8"],
        fog: fogFor(L, "#9A86CC", 38),
        floor: "own",
        light: { hemi: { sky: "#D9D2FF", ground: "#A9A4CC", intensity: 0.8 }, sun: { color: "#FFFFFF", intensity: 2.29, dir: [-1.0, 2.5, 3.0] }, exposure: 0.87 },
        animate: animator(ticks),
    };
}

// ── Zamak ─────────────────────────────────────────────────────────────────────

function zamak(ctx: EnvironmentContext): Environment {
    const L = layout(ctx);
    const { root, ticks } = scene();
    const b = new Batch();
    ground(b, "#B2E39A", "#93D284", { spot: "#BDE8A6", noise: 0.05, seed: 27 });
    b.add(ribbon([[0, -0.9], [0.15, -3], [-0.2, -5.5], [0, -7.6]], 1.0), "#F2E3B6", { rough: 1 });
    hill(b, -10, -14, 9, 2.2, 5, "#A2DB8E", "#B6E5A2", L.seg(28));
    hill(b, 10, -15, 10, 2.6, 5, "#9BD88B", "#B0E2A0", L.seg(28));
    hill(b, 0, -26, 22, 6, 9, "#A9DC9A", "#C3E9B8", L.seg(28));
    // Zamak: zid sa zupcima, kapija, četiri kule (dve visoke napred), zastavice
    const cz = -9;
    const W = L.wide ? 5.2 : 3.8;
    const wall = "#EBDCF7";
    b.add(rbox(W, 2.2, 1.2, 0.04).translate(0, 1.1, cz), (p) => col(wall).offsetHSL(0, 0, Math.sin(p.y * 12) * 0.01));
    const merlons = Math.round(W / 0.36);
    for (let i = 0; i < merlons; i++) b.add(box(0.22, 0.26, 1.2).translate(-W / 2 + (W / merlons) * (i + 0.5), 2.33, cz), wall);
    b.add(rbox(W * 0.42, 3.2, 1.0, 0.04).translate(0, 1.6, cz - 0.9), "#F2E6FA");
    for (let i = 0; i < 5; i++) b.add(box(0.22, 0.26, 1.0).translate(-W * 0.21 + (W * 0.42 / 5) * (i + 0.5), 3.33, cz - 0.9), "#F2E6FA");
    // Kapija (luk) i prozori
    b.add(rbox(0.9, 1.0, 0.06, 0.02).translate(0, 0.5, cz + 0.61), "#9A6236");
    b.add(put(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 24, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), 0, 1.0, cz + 0.61), "#9A6236");
    b.add(put(new THREE.TorusGeometry(0.5, 0.05, 6, 24, Math.PI), 0, 1.0, cz + 0.63), "#D6C4EC");
    for (const sx of [-1, 1]) {
        b.add(rbox(0.32, 0.5, 0.05, 0.05).translate(sx * W * 0.28, 1.5, cz + 0.62), "#7A6AB0");
        b.add(rbox(0.3, 0.45, 0.05, 0.05).translate(sx * 0.42, 2.6, cz - 0.38), "#7A6AB0");
    }
    b.add(put(new THREE.CircleGeometry(0.24, 24), 0, 2.75, cz - 0.39), "#F7A8C8", { glow: 0.2 });
    const towers: [number, number, number, number, string][] = [[-W / 2, cz + 0.2, 3.4, 0.5, "#B9A2F2"], [W / 2, cz + 0.2, 3.4, 0.5, "#B9A2F2"], [-W * 0.3, cz - 1.6, 4.4, 0.42, "#F7A8C8"], [W * 0.3, cz - 1.6, 4.4, 0.42, "#F7A8C8"]];
    for (const [x, z, h, r, roof] of towers) {
        tower(b, x, z, h, r, wall, roof);
        ticks.push(pennant(root, x, h + 0.14 + r * 2.6, z, roof === "#B9A2F2" ? "#F45B8D" : "#8E77E6", 1.3));
    }
    // Vrt: žive ograde, žbunje i cveće uz stazu
    for (const sx of [-1, 1]) {
        for (let i = 0; i < 4; i++) bush(b, sx * (0.9 + i * 0.05), -2.0 - i * 1.4, 0.55, "#5DB96A", L.seg(12));
    }
    for (const [x, z, s] of [[-3.2, -2.6, 1.1], [3.4, -3.0, 1.2], [-6.5, -5, 1.4], [6.8, -5.5, 1.5]] as const) roundTree(b, X(L, x), z, s, "#6CC46F", "#9A6236", L.seg(16));
    ticks.push(flowerField(root, meadowFlowers(L, L.low ? 40 : 80, 71, { x: 8, z0: -1.2, z1: -7 }, ["#F78FB3", "#FFD15C", "#FFFFFF", "#B9A2F2"], (x, z) => Math.abs(x) < 1.3 && z > -7.5)));
    sun(root, X(L, -6.5), 5.8, -26, 1.1);
    ticks.push(clouds(root, [{ x: -6, y: 5.2, z: -19, s: 1.8 }, { x: 4, y: 6.2, z: -22, s: 2.1 }, { x: 11, y: 4.8, z: -18, s: 1.5 }], { seg: L.seg(16), color: "#FFFFFF" }));
    b.into(root);
    return {
        root,
        sky: ["#A9D8FA", "#FCEBF6"],
        fog: fogFor(L, "#EEEFF8", 31),
        floor: "own",
        light: { ...DAY, hemi: { sky: "#F2EEFF", ground: "#CBE6B3", intensity: 0.66 } },
        animate: animator(ticks),
    };
}

/** Sve scene po id-ju pozadine */
export const SCENES: Record<string, (ctx: EnvironmentContext) => Environment> = {
    soba,
    park,
    livada,
    grad,
    suma,
    plaza,
    "zimski-dan": zimskiDan,
    duga,
    farma,
    "podvodni-svet": podvodniSvet,
    vasar,
    svemir,
    zamak,
};

export type { Tick };
