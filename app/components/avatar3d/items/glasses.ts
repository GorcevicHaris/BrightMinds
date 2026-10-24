// 3D crteži predmeta za mesto „glasses” (podaci: glasses.data.ts). Vlasnik: #3 (katalog).
// Okviri su oble cevi po obrisu stakla (sjajna plastika ili metal), stakla su providna
// (sunčana tamna), drške idu preko uha ili hidžaba. Maske su prave pločice sa otvorima
// za oči (oči i treptanje se uvek vide). Sve mere su iz veličine i razmaka očiju lika.

import * as THREE from "three";
import { registerItems, type ItemBuilder } from "../contract";
import { glass, leather, metal, plastic, fabric, darker, SIDES, TAU } from "./lib/common";
import { EyeFit, ellipse, heartOutline, pathOf, shapeOf, squircle, starOutline } from "./lib/eyewear";
import { HeadFit, tube } from "./lib/headwear";

type Build = (e: EyeFit) => void;

const item = (id: string, build: Build, extra: Partial<ItemBuilder> = {}): ItemBuilder => ({
    id,
    build: (ctx) => {
        const f = new HeadFit(ctx);
        build(new EyeFit(f));
    },
    dependsOn: ["hijab"],
    withHijab: "over",
    thumb: { focus: "face" },
    ...extra,
});

/** Obične naočare: dva stakla istog obrisa, mostić i drške */
function spectacles(e: EyeFit, outline: THREE.Vector2[], frameHex: string, lensMat: THREE.Material, options: { w?: number; d?: number; dy?: number; frameMat?: THREE.Material } = {}) {
    const er = e.er;
    const frameMat = options.frameMat ?? plastic(frameHex, 0.28);
    const w = (options.w ?? 0.075) * er;
    const d = (options.d ?? 0.1) * er;
    const dy = options.dy ?? 0;
    const maxX = Math.max(...outline.map((p) => p.x));
    const minX = Math.min(...outline.map((p) => p.x));
    e.sides((side, dx) => {
        e.frame(outline, dx, w, d, frameMat, dy);
        e.lens(outline, dx, lensMat, dy);
        e.temple(side, e.ex + (side === 1 ? maxX : -minX) + w * 0.5, dy + er * 0.25, frameMat, er * 0.055);
    });
    e.bridge(e.ex + minX + w * 0.2, dy + er * 0.3, frameMat, er * 0.055);
}

const clearLens = () => glass("#E8F2FF", 0.14);

/** Okrugle naočare */
const round = (hex: string) => (e: EyeFit) => spectacles(e, ellipse(e.er * 1.12, e.er * 1.08), hex, clearLens());

/** Naočare za čitanje (nana, dedo): uske „polumesec” sočiva, malo niže na nosu, tanak zlatni okvir */
function readingGlasses(e: EyeFit) {
    spectacles(e, squircle(e.er * 1.18, e.er * 0.72, 3.4, 48, 0.18), "#B08A4A", clearLens(), { w: 0.06, d: 0.08, dy: -e.er * 0.32, frameMat: metal("#C9A55A") });
}

function squareGlasses(e: EyeFit) {
    spectacles(e, squircle(e.er * 1.22, e.er * 0.95, 4.2), "#2FA36B", glass("#DCF5E7", 0.18));
}

function sunglasses(frame: string, tint: string) {
    return (e: EyeFit) => spectacles(e, squircle(e.er * 1.3, e.er * 1.02, 3.4, 48, 0.28), frame, glass(tint, 0.84), { w: 0.1, d: 0.12, dy: -e.er * 0.08 });
}

/** Moderne četvrtaste crne sunčane naočare (široke, ravne gore) */
function blackSquareShades(e: EyeFit) {
    const er = e.er;
    const outline = squircle(er * 1.38, er * 0.92, 5.2, 56, 0.12);
    spectacles(e, outline, "#1C1B20", glass("#1E2228", 0.88), { w: 0.11, d: 0.14, dy: -er * 0.06, frameMat: plastic("#1C1B20", 0.22) });
    // Gornja ravna ivica okvira (deblja) — „vejfarer” utisak
    e.sides((_side, dx) => {
        const top: THREE.Vector2[] = [];
        for (let i = 0; i <= 10; i++) top.push(new THREE.Vector2(-er * 1.32 + (i / 10) * er * 2.64, er * 0.86));
        const pts = top.map((p) => e.map(p.x + dx, p.y - er * 0.06, 0.0012));
        e.f.mesh(tube(pts, er * 0.07, e.f.n(16, 6), e.f.n(6, 4), 0.6), plastic("#1C1B20", 0.22), "okvir-gore");
    });
}

/** Ovalne zatamnjene sunčane naočare (tanak zlatni okvir, ružičasto-smeđe staklo) */
function ovalShades(e: EyeFit) {
    const er = e.er;
    spectacles(e, ellipse(er * 1.32, er * 0.9, 56), "#C9A661", glass("#B5645E", 0.62), { w: 0.05, d: 0.06, dy: -er * 0.04, frameMat: metal("#D8B46A") });
}

function rainbowGlasses(e: EyeFit) {
    const er = e.er;
    const inner = ellipse(er * 1.1, er * 1.06);
    const outer = ellipse(er * 1.28, er * 1.24);
    const colors: Record<number, [string, string, string]> = { 1: ["#8E77E6", "#F45B8D", "#E8E1FF"], [-1]: ["#FF8A3D", "#FFD15C", "#FFE5D0"] };
    const temple = plastic("#3BB273", 0.3);
    e.sides((side, dx) => {
        const [a, b, tint] = colors[side];
        e.frame(inner, dx, er * 0.085, er * 0.1, plastic(a, 0.28));
        e.frame(outer, dx, er * 0.045, er * 0.06, plastic(b, 0.28), 0, -0.0005);
        e.lens(inner, dx, glass(tint, 0.2));
        e.temple(side, e.ex + er * 1.28, er * 0.25, temple, er * 0.055);
    });
    e.bridge(e.ex - er * 1.12, er * 0.3, temple, er * 0.055);
}

function heartGlasses(e: EyeFit) {
    spectacles(e, heartOutline(e.er * 1.32), "#E0457A", glass("#F78FB3", 0.32), { w: 0.09, d: 0.11 });
}

function starGlasses(e: EyeFit) {
    const er = e.er;
    spectacles(e, starOutline(er * 1.62, 0.6), "#F2A516", glass("#FFE08A", 0.3), { w: 0.085, d: 0.11, dy: er * 0.04 });
    // Iskrice pored stakala
    for (const [side, x, y, r] of [[1, 1.9, 1.2, 0.16], [-1, 1.95, -1.1, 0.12]] as const) {
        const p = e.map(side * (e.ex + er * x), er * y, er * 0.05);
        const g = e.f.mesh(new THREE.OctahedronGeometry(er * r, 0), plastic("#FFE08A", 0.2), "iskra");
        g.position.copy(p);
        g.scale.set(1, 1.5, 0.4);
    }
}

function flowerGlasses(e: EyeFit) {
    const er = e.er;
    const ring = ellipse(er * 0.98, er * 0.98);
    const petals: Record<number, [string, string]> = { 1: ["#FFD15C", "#F2A516"], [-1]: ["#F78FB3", "#F45B8D"] };
    const templeMat = plastic("#F45B8D", 0.3);
    e.sides((side, dx) => {
        const [petal, rim] = petals[side];
        e.frame(ring, dx, er * 0.08, er * 0.1, plastic(rim, 0.3));
        e.lens(ring, dx, glass("#FFFFFF", 0.18));
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TAU + 0.2;
            const p = e.map(dx + Math.cos(a) * er * 1.28, Math.sin(a) * er * 1.28, -0.0005);
            const g = e.f.mesh(new THREE.SphereGeometry(er * 0.36, e.f.n(14, 6), e.f.n(10, 4)), plastic(petal, 0.35), "latica");
            g.position.copy(p);
            g.scale.set(1, 1, 0.42);
            g.lookAt(p.clone().add(p.clone().sub(e.c).setY(0)));
        }
        e.temple(side, e.ex + er * 1.62, er * 0.2, templeMat, er * 0.055);
    });
    e.bridge(e.ex - er * 0.98, er * 0.3, templeMat, er * 0.055);
}

/** Naočare za plivanje: male ovalne čašice, mostić i traka oko glave */
function swimGoggles(e: EyeFit) {
    const er = e.er;
    const teal = plastic("#3BB2A0", 0.3);
    const cup = ellipse(er * 1.12, er * 0.96);
    e.sides((_side, dx) => {
        // Čašica: prsten sa debljinom unazad
        const shape = shapeOf(ellipse(er * 1.22, er * 1.06));
        shape.holes.push(pathOf(ellipse(er * 0.98, er * 0.84)));
        e.slab(shape, er * 0.34, er * 0.08, teal, dx, 0, -er * 0.1);
        e.frame(cup, dx, er * 0.07, er * 0.1, teal, 0, er * 0.04);
        e.lens(cup, dx, glass("#7ED6F2", 0.42), 0, er * 0.02);
    });
    e.bridge(e.ex - er * 1.15, er * 0.05, teal, er * 0.07, 0.1);
    e.strap(e.ex + er * 1.22, 0, er * 0.2, er * 0.05, fabric("#2C8F80", "rib"));
}

/** Skijaške naočare: jedno veliko staklo, tamni okvir, široka traka */
function skiGoggles(e: EyeFit) {
    const er = e.er;
    const W = e.ex + er * 1.45;
    const H = er * 1.2;
    const outline: THREE.Vector2[] = [];
    const n = 72;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const x = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / 3.4) * W;
        let y = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / 3.4) * H;
        // Udubljenje za nos dole po sredini
        if (y < 0) y += H * 0.55 * Math.exp(-((x / (er * 0.55)) ** 2));
        outline.push(new THREE.Vector2(x, y));
    }
    const frameMat = plastic("#3A3546", 0.35);
    const shape = shapeOf(outline.map((p) => p.clone().multiplyScalar(1.08)));
    shape.holes.push(pathOf(outline.map((p) => p.clone().multiplyScalar(0.94))));
    e.slab(shape, er * 0.3, er * 0.08, frameMat, 0, 0, -er * 0.05);
    e.frame(outline.map((p) => p.clone().multiplyScalar(1.02)), 0, er * 0.07, er * 0.09, frameMat, 0, er * 0.08);
    const tint = glass("#FFB866", 0.6);
    e.lens(outline.map((p) => p.clone().multiplyScalar(0.96)), 0, tint, 0, er * 0.05);
    // Odsjaj preko stakla
    const glint = [e.map(-W * 0.7, H * 0.55, er * 0.07), e.map(-W * 0.1, H * 0.72, er * 0.09), e.map(W * 0.5, H * 0.6, er * 0.08)];
    e.f.mesh(tube(glint, er * 0.04, 16, 4, 0.3), glass("#FFFFFF", 0.5), "odsjaj");
    e.strap(W * 1.06, 0, er * 0.34, er * 0.06, fabric("#8E77E6", "rib"));
}

/** Pilotske naočare: kožne čašice, mesingani okvir, kožna traka */
function aviatorGoggles(e: EyeFit) {
    const er = e.er;
    const brown = leather("#9A6236");
    const brass = metal("#E2B256");
    const ring = ellipse(er * 1.02, er * 1.02);
    e.sides((_side, dx) => {
        const shape = shapeOf(ellipse(er * 1.32, er * 1.32));
        shape.holes.push(pathOf(ellipse(er * 1.05, er * 1.05)));
        e.slab(shape, er * 0.4, er * 0.1, brown, dx, 0, -er * 0.12);
        e.frame(ring, dx, er * 0.1, er * 0.12, brass, 0, er * 0.08);
        e.lens(ring, dx, glass("#BDEBFF", 0.38), 0, er * 0.05);
    });
    e.bridge(e.ex - er * 1.2, er * 0.05, brown, er * 0.12, 0.12);
    e.strap(e.ex + er * 1.32, 0, er * 0.3, er * 0.07, brown);
}

/** Maska superheroja: traka preko očiju sa otvorima, vezice pozadi */
function heroMask(e: EyeFit) {
    const er = e.er;
    const W = e.ex + er * 1.75;
    const blue = plastic("#3D7BE0", 0.45);
    const outline: THREE.Vector2[] = [];
    const n = 72;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const x = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / 2.6) * W;
        let y = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / 2.6) * er * 1.35;
        // Gore blago udubljeno u sredini, dole izrez za nos; krajevi podignuti
        if (y > 0) y -= er * 0.35 * Math.exp(-((x / (er * 0.9)) ** 2));
        else y += er * 0.75 * Math.exp(-((x / (er * 0.7)) ** 2));
        y += er * 0.25 * Math.pow(Math.abs(x) / W, 3);
        outline.push(new THREE.Vector2(x, y));
    }
    const shape = shapeOf(outline);
    for (const side of SIDES) shape.holes.push(pathOf(ellipse(er * 0.92, er * 0.82, 40), side * e.ex, er * 0.02));
    e.slab(shape, er * 0.08, er * 0.05, blue, 0, 0, -er * 0.15);
    // Vezice pozadi
    e.strap(W * 0.98, er * 0.1, er * 0.12, er * 0.04, blue);
    const back = e.f.at(0, e.eyeUV[1] - 0.02, er * 0.1);
    for (const s of SIDES) {
        const pts = [back.clone(), back.clone().add(new THREE.Vector3(s * er * 0.5, -er * 0.9, -er * 0.4)), back.clone().add(new THREE.Vector3(s * er * 0.9, -er * 1.9, -er * 0.5))];
        e.f.mesh(tube(pts, (t) => er * (0.14 - t * 0.05), e.f.n(16, 6), e.f.n(8, 4), 0.3), blue, "vezica");
    }
}

/** Maska leptira: krila oko očiju sa tačkicama, telo i antenice */
function butterflyMask(e: EyeFit) {
    const er = e.er;
    const wingMat = plastic("#B9A2F2", 0.4);
    const edgeMat = plastic("#8E77E6", 0.35);
    const outline: THREE.Vector2[] = [];
    const n = 96;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const x = Math.cos(a);
        const s = Math.sin(a);
        // Dva režnja po strani: veći gore, manji dole
        const lobe = s >= 0 ? 1.9 + 0.35 * Math.sin(Math.abs(x) * Math.PI) : 1.4;
        const pinch = 1 - 0.55 * Math.exp(-((x / 0.18) ** 2));
        const r = er * lobe * pinch;
        const X = x * (e.ex + er * 2.0);
        outline.push(new THREE.Vector2(X, s * r + er * 0.05));
    }
    const shape = shapeOf(outline);
    for (const side of SIDES) shape.holes.push(pathOf(ellipse(er * 0.9, er * 0.8, 40), side * e.ex, er * 0.02));
    e.slab(shape, er * 0.08, er * 0.05, wingMat, 0, 0, -er * 0.15);
    e.frame(outline, 0, er * 0.05, er * 0.06, edgeMat, 0, -er * 0.12);
    const body = e.f.mesh(new THREE.SphereGeometry(er * 0.22, 16, 10), edgeMat, "telo");
    body.position.copy(e.map(0, er * 0.15, er * 0.05));
    body.scale.set(1, 2.6, 0.8);
    for (const side of SIDES) {
        const base = e.map(side * er * 0.12, er * 0.65, er * 0.03);
        const tip = e.map(side * er * 0.8, er * 1.9, er * 0.08);
        e.f.mesh(tube([base, e.map(side * er * 0.35, er * 1.4, er * 0.08), tip], er * 0.045, 12, 5), edgeMat, "antena");
        const ball = e.f.mesh(new THREE.SphereGeometry(er * 0.12, 10, 8), plastic("#F78FB3", 0.3), "antena-kuglica");
        ball.position.copy(tip);
        for (const [x, y, c, r] of [[1.95, 0.95, "#F78FB3", 0.2], [1.55, 1.4, "#FFFFFF", 0.1], [2.0, -0.7, "#FFD15C", 0.16]] as const) {
            const d = e.f.mesh(new THREE.SphereGeometry(er * r, 12, 8), plastic(c, 0.3), "tackica");
            d.position.copy(e.map(side * (e.ex * 0.4 + er * x * 1.18), er * y * 1.15, er * 0.0));
            d.scale.set(1, 1, 0.35);
            d.lookAt(d.position.clone().add(d.position.clone().sub(e.c).setY(0)));
        }
    }
    e.strap(e.ex + er * 2.6, er * 0.1, er * 0.08, er * 0.03, edgeMat);
}

/** Ronilačka maska: jedno staklo u narandžastom okviru, traka i disaljka */
function divingMask(e: EyeFit) {
    const er = e.er;
    const orange = plastic("#FF8A3D", 0.3);
    const W = e.ex + er * 1.3;
    const H = er * 1.15;
    const outline: THREE.Vector2[] = [];
    for (let i = 0; i < 72; i++) {
        const a = (i / 72) * TAU;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const x = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / 4) * W;
        let y = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / 4) * H;
        if (y < 0) y += H * 0.5 * Math.exp(-((x / (er * 0.6)) ** 2));
        outline.push(new THREE.Vector2(x, y));
    }
    const shape = shapeOf(outline.map((p) => p.clone().multiplyScalar(1.12)));
    shape.holes.push(pathOf(outline.map((p) => p.clone().multiplyScalar(0.95))));
    e.slab(shape, er * 0.45, er * 0.1, plastic("#3BB2A0", 0.4), 0, 0, -er * 0.15);
    e.frame(outline, 0, er * 0.12, er * 0.14, orange, 0, er * 0.1);
    e.lens(outline.map((p) => p.clone().multiplyScalar(0.97)), 0, glass("#BDEBFF", 0.35), 0, er * 0.06);
    e.strap(W * 1.1, 0, er * 0.3, er * 0.06, fabric("#3BB2A0", "rib"));
    // Disaljka sa leve strane lika (gledaocu desno): od usta gore uz glavu
    const f = e.f;
    const side = 1;
    const mouth = f.local(f.a.mouth);
    const p0 = mouth.clone().add(new THREE.Vector3(side * er * 0.6, 0, er * 0.3));
    const p1 = f.at(0.5 + side * 0.2, 0.68, er * 0.5);
    const p2 = f.at(0.5 + side * 0.24, 0.35, er * 0.45);
    const p3 = f.at(0.5 + side * 0.22, 0.12, er * 0.5).add(new THREE.Vector3(0, er * 0.9, 0));
    f.mesh(tube([p0, p1, p2, p3], er * 0.16, f.n(40, 12), f.n(10, 6)), orange, "disaljka");
    const top = f.mesh(new THREE.TorusGeometry(er * 0.17, er * 0.05, 6, 16), plastic("#3A3546", 0.4), "disaljka-vrh");
    top.position.copy(p3);
    top.rotation.x = Math.PI / 2;
    const bite = f.mesh(new THREE.SphereGeometry(er * 0.22, 12, 8), plastic(darker("#FF8A3D", 0.15), 0.4), "usnik");
    bite.position.copy(p0);
    bite.scale.set(1.2, 0.8, 0.7);
}

registerItems("glasses", [
    item("naocare", round("#3B4A8C")),
    item("roze-naocare", round("#E0457A")),
    item("zute-naocare", round("#F2A516")),
    item("cetvrtaste-naocare", squareGlasses),
    item("suncane-naocare", sunglasses("#E5484D", "#1F2937")),
    item("plave-suncane-naocare", sunglasses("#3D7BE0", "#2C3E6E")),
    item("sarene-naocare", rainbowGlasses),
    item("naocare-srca", heartGlasses),
    item("naocare-zvezde", starGlasses),
    item("naocare-cvetici", flowerGlasses),
    item("plivacke-naocare", swimGoggles),
    item("skijaske-naocare", skiGoggles),
    item("pilotske-naocare", aviatorGoggles),
    item("maska-superheroja", heroMask),
    item("ronilacka-maska", divingMask),
    item("maska-leptira", butterflyMask),
    item("crne-suncane-naocare", blackSquareShades),
    item("ovalne-suncane-naocare", ovalShades),
    // ── Novo ──
    item("naocare-za-citanje", readingGlasses),
    item("crvene-naocare", round("#C93A3F")),
    item("zelene-suncane-naocare", sunglasses("#2E9A50", "#1F3D2A")),
]);
