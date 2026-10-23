// Glava i lice: glava je deformisana sfera (puni obrazi, uža brada, ravnije lice), oči
// su sjajne sfere sa dužicom, kapcima koji trepću i trepavicama, obrve su tanke cevi na
// površini, nos je mali „dugme”, a usta su nalepnica sa crtežom osmeha.
// Sve je u koordinatama kosti glave (0, 0, 0 = vrh vrata).

import * as THREE from "three";
import type { Expression } from "../catalog";
import { basicMaterial, skinMaterial } from "./materials";
import type { BodyShape } from "./rig";
import { buildSurface, polyPath, taperedTube, type SurfaceFn } from "./surface";
import { irisTexture, mouthTexture } from "./textures";

const gauss3 = (x: number, y: number, z: number, cx: number, cy: number, cz: number, s: number) =>
    Math.exp(-((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) / (2 * s * s));

export interface HeadInfo {
    shape: BodyShape;
    center: THREE.Vector3;
    /** Površina glave: u ∈ [0, 1] oko (0,5 = napred), v ∈ [0, 1] od temena do dna */
    fn: SurfaceFn;
    point: (u: number, v: number, out?: THREE.Vector3) => THREE.Vector3;
    normal: (u: number, v: number, out?: THREE.Vector3) => THREE.Vector3;
    /** Iznad površine za `offset` po normali */
    offsetFn: (offset: (u: number, v: number) => number) => SurfaceFn;
    eyeU: number;
    eyeV: number;
    eyeR: number;
}

/** Glava u (u, v): ugao θ = (u − 0,5)·2π od napred, φ = v·π od temena */
export function headInfo(shape: BodyShape): HeadInfo {
    const { w, h, d, up, fwd, chin, cheeks } = shape.head;
    const center = new THREE.Vector3(0, up, fwd);
    const child = shape.kind === "girl" || shape.kind === "boy";
    const fn: SurfaceFn = (u, v, out) => {
        const th = (u - 0.5) * Math.PI * 2;
        const ph = Math.min(Math.PI, Math.max(0, v * Math.PI));
        let x = Math.sin(th) * Math.sin(ph);
        let y = Math.cos(ph);
        let z = Math.cos(th) * Math.sin(ph);
        let r = 1;
        // Puni obrazi (deca više), blago udubljenje za oči
        r += 0.07 * cheeks * (gauss3(x, y, z, 0.6, -0.36, 0.68, 0.24) + gauss3(x, y, z, -0.6, -0.36, 0.68, 0.24));
        r -= 0.022 * (gauss3(x, y, z, 0.36, -0.05, 0.92, 0.14) + gauss3(x, y, z, -0.36, -0.05, 0.92, 0.14));
        // Potiljak malo izbočen, teme okruglo
        r += 0.03 * gauss3(x, y, z, 0, 0.2, -0.95, 0.4);
        x *= r;
        y *= r;
        z *= r;
        // Brada i vilica: donji deo lica se sužava
        if (y < 0) {
            const lower = Math.min(1, -y);
            const k = 1 - (1 - chin) * Math.pow(lower, 2.2);
            x *= k;
            if (z > 0) z *= 1 - (child ? 0.1 : 0.06) * lower * lower;
            // Brada malo napred i dole
            y -= 0.04 * gauss3(x, y, z, 0, -0.85, 0.5, 0.25);
        }
        // Lice je ravnije od sfere (oči leže na blažoj krivini)
        if (z > 0) z *= 1 - 0.1 * Math.pow(z, 3) * (1 - Math.abs(y) * 0.5);
        return out.set(center.x + (x * w) / 2, center.y + (y * h) / 2, center.z + (z * d) / 2);
    };
    const p0 = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();
    const normal = (u: number, v: number, out = new THREE.Vector3()) => {
        const e = 1e-3;
        const vv = Math.min(1 - e, Math.max(e, v));
        fn(u + e, vv, p0).sub(fn(u - e, vv, p1));
        fn(u, vv + e, p2).sub(fn(u, vv - e, p3));
        // Pu × Pv gleda unutra (u raste ka +x napred, v raste nadole) — okrećemo
        return out.crossVectors(p2, p0).normalize();
    };
    const point = (u: number, v: number, out = new THREE.Vector3()) => fn(u, v, out);
    const n = new THREE.Vector3();
    const offsetFn = (offset: (u: number, v: number) => number): SurfaceFn => (u, v, out) => {
        fn(u, v, out);
        normal(u, v, n);
        return out.addScaledVector(n, offset(u, v));
    };
    const eyeR = w * (child ? 0.162 : 0.135);
    return { shape, center, fn, point, normal, offsetFn, eyeU: child ? 0.075 : 0.07, eyeV: child ? 0.55 : 0.53, eyeR };
}

/** Rumenilo na obrazima i senka u uglovima (boje temena: množe boju kože) */
function headColors(geometry: THREE.BufferGeometry, info: HeadInfo) {
    const position = geometry.getAttribute("position");
    const colors = new Float32Array(position.count * 3);
    const blush = new THREE.Color("#FF8C8C");
    const c = new THREE.Color();
    const { center } = info;
    const { w, h, d } = info.shape.head;
    for (let i = 0; i < position.count; i++) {
        const x = (position.getX(i) - center.x) / (w / 2);
        const y = (position.getY(i) - center.y) / (h / 2);
        const z = (position.getZ(i) - center.z) / (d / 2);
        const cheek = Math.max(gauss3(x, y, z, 0.56, -0.3, 0.75, 0.17), gauss3(x, y, z, -0.56, -0.3, 0.75, 0.17));
        c.setRGB(1, 1, 1).lerp(blush, cheek * 0.32);
        // Blago tamnije ispod brade i na vratu (meka senka)
        const under = Math.max(0, -y - 0.75) * 1.2;
        c.multiplyScalar(1 - under * 0.25);
        colors.set([c.r, c.g, c.b], i * 3);
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

export interface FaceRig {
    group: THREE.Group;
    head: THREE.Mesh;
    /** Gornji i donji kapci po oku; ugao ivice kapka (rad, od središta oka) */
    upperLids: THREE.Object3D[];
    lowerLids: THREE.Object3D[];
    eyes: THREE.Object3D[];
    mouth: THREE.Mesh;
    brows: THREE.Object3D[];
    ears: THREE.Mesh[];
    setExpression: (expression: Expression) => void;
    /** 0 = otvoreno, 1 = zatvoreno */
    setBlink: (amount: number) => void;
    expression: Expression;
}

/** Pravi glavu sa licem; `browColor` je boja kose (tamnija) */
export function buildHead(info: HeadInfo, skinHex: string, eyeHex: string, browColor: string, expression: Expression): FaceRig {
    const group = new THREE.Group();
    group.name = "glava";
    const geometry = buildSurface(info.fn, { nu: 88, nv: 64, closedU: true, inside: () => info.center.clone() });
    headColors(geometry, info);
    const head = new THREE.Mesh(geometry, skinMaterial(skinHex, true));
    head.name = "lice";
    group.add(head);

    const child = info.shape.kind === "girl" || info.shape.kind === "boy";
    const girlish = info.shape.kind === "girl" || info.shape.kind === "woman";

    // ── Uši ──
    const ears: THREE.Mesh[] = [];
    for (const side of [1, -1]) {
        const ear = new THREE.Group();
        const outer = new THREE.SphereGeometry(1, 18, 14);
        outer.scale(0.011, 0.03, 0.022);
        const inner = new THREE.SphereGeometry(1, 14, 10);
        inner.scale(0.006, 0.019, 0.012);
        inner.translate(0.0065, -0.002, 0.002);
        const earMesh = new THREE.Mesh(outer, skinMaterial(skinHex));
        const innerMesh = new THREE.Mesh(inner, skinMaterial("#" + new THREE.Color(skinHex).multiplyScalar(0.86).getHexString()));
        ear.add(earMesh, innerMesh);
        const u = 0.5 + side * 0.25;
        const p = info.point(u, 0.55);
        ear.position.copy(p).add(new THREE.Vector3(-side * 0.004, 0, -0.006));
        ear.rotation.y = side * -0.35;
        ear.rotation.z = side * 0.12;
        if (side === -1) ear.scale.x = -1;
        group.add(ear);
        ears.push(earMesh, innerMesh);
    }

    // ── Oči ──
    const eyeMat = new THREE.MeshPhysicalMaterial({ map: irisTexture(eyeHex), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 0.6 });
    const lidMat = skinMaterial(skinHex);
    const lashMat = new THREE.MeshStandardMaterial({ color: "#140C0E", roughness: 0.75 });
    const shineMat = basicMaterial("#FFFFFF");
    const eyes: THREE.Object3D[] = [];
    const upperLids: THREE.Object3D[] = [];
    const lowerLids: THREE.Object3D[] = [];
    const re = info.eyeR;
    for (const side of [1, -1]) {
        const u = 0.5 + side * info.eyeU;
        const surface = info.point(u, info.eyeV);
        const n = info.normal(u, info.eyeV);
        const eye = new THREE.Group();
        eye.name = "oko";
        eye.position.copy(surface).addScaledVector(n, -re * 0.72);
        // Oči gledaju napred i malo jedna ka drugoj (pogled u gledaoca)
        eye.rotation.set(0, side * 0.12, side * 0.07, "YXZ");
        const ball = new THREE.Mesh(new THREE.SphereGeometry(re, 40, 24), eyeMat);
        eye.add(ball);
        // Odsjaj: mali beli oval gore-levo (gledano spreda), uvek isti — „živ” pogled
        const shine = new THREE.Mesh(new THREE.SphereGeometry(re * 0.12, 12, 8), shineMat);
        shine.scale.set(1, 1.2, 0.35);
        const dir = new THREE.Vector3(-0.2, 0.24, 0.95).normalize();
        shine.position.copy(dir).multiplyScalar(re * 1.0);
        eye.add(shine);
        const shine2 = new THREE.Mesh(new THREE.SphereGeometry(re * 0.08, 10, 6), shineMat);
        shine2.position.copy(new THREE.Vector3(0.16, -0.16, 0.97).normalize()).multiplyScalar(re * 1.0);
        eye.add(shine2);

        const lidR = re * 1.025;
        const upper = new THREE.Group();
        const upperCap = new THREE.Mesh(new THREE.SphereGeometry(lidR, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2), lidMat);
        upper.add(upperCap);
        // Linija trepavica na ivici gornjeg kapka (prednja polovina), deblja ka spoljnom uglu
        const lash = new THREE.Mesh(
            taperedTube(
                (s, out) => {
                    const t = Math.PI * (0.06 + 0.88 * s);
                    return out.set(Math.cos(t) * lidR * 1.005, 0, Math.sin(t) * lidR * 1.005);
                },
                (s) => {
                    const outer = side === 1 ? s : 1 - s;
                    return re * (0.04 + 0.05 * Math.pow(outer, 2.5));
                },
                28,
                8,
            ),
            lashMat,
        );
        upper.add(lash);
        if (girlish) {
            // Tri male trepavice na spoljnom uglu
            for (let i = 0; i < 3; i++) {
                const t = Math.PI * (side === 1 ? 0.12 + i * 0.09 : 0.88 - i * 0.09);
                const base = new THREE.Vector3(Math.cos(t) * lidR, 0, Math.sin(t) * lidR);
                const tip = base.clone().multiplyScalar(1.18).add(new THREE.Vector3(0, re * 0.22, 0));
                const flick = new THREE.Mesh(taperedTube(polyPath([base, base.clone().lerp(tip, 0.5).add(new THREE.Vector3(0, re * 0.02, 0)), tip]), (s) => re * 0.05 * (1 - s * 0.85), 8, 6), lashMat);
                upper.add(flick);
            }
        }
        eye.add(upper);
        upperLids.push(upper);

        const lower = new THREE.Group();
        const lowerCap = new THREE.Mesh(new THREE.SphereGeometry(lidR * 0.995, 36, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lidMat);
        lower.add(lowerCap);
        eye.add(lower);
        lowerLids.push(lower);

        group.add(eye);
        eyes.push(eye);
    }

    // ── Nos ──
    const noseGeo = new THREE.SphereGeometry(1, 20, 14);
    noseGeo.scale(child ? 0.0135 : 0.015, child ? 0.011 : 0.016, 0.011);
    const nose = new THREE.Mesh(noseGeo, skinMaterial(skinHex));
    const nv = child ? 0.625 : 0.615;
    nose.position.copy(info.point(0.5, nv)).addScaledVector(info.normal(0.5, nv), child ? 0.0015 : 0.004);
    group.add(nose);

    // ── Obrve ──
    const browMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(browColor).multiplyScalar(0.85), roughness: 0.85 });
    const brows: THREE.Object3D[] = [];
    for (const side of [1, -1]) {
        const brow = new THREE.Group();
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 6; i++) {
            const t = i / 6;
            const u = 0.5 + side * (info.eyeU - 0.034 + t * 0.07);
            const v = info.eyeV - 0.105 - Math.sin(t * Math.PI) * 0.018 + t * 0.008;
            pts.push(info.point(u, v).addScaledVector(info.normal(u, v), 0.0026));
        }
        const tube = new THREE.Mesh(taperedTube(polyPath(pts), (s) => {
            const thick = girlish ? 0.0048 : 0.006;
            return thick * (0.3 + 0.7 * Math.pow(Math.sin(Math.min(1, s * 1.1 + 0.04) * Math.PI), 0.6));
        }, 24, 10, new THREE.Vector3(0, 0, 1), 0.5), browMat);
        brow.add(tube);
        group.add(brow);
        brows.push(brow);
    }

    // ── Usta (nalepnica koja prati površinu) ──
    const mouthGeo = buildSurface((u, v, out) => {
        const uu = 0.5 + (u - 0.5) * 0.115;
        const vv = (child ? 0.72 : 0.71) + (v - 0.5) * 0.085;
        return info.point(uu, vv, out).addScaledVector(info.normal(uu, vv), 0.0008);
    }, { nu: 16, nv: 8, inside: () => info.center.clone(), uv: (u, v) => [u, 1 - v] });
    const lip = "#" + new THREE.Color(skinHex).lerp(new THREE.Color("#A8303E"), 0.55).getHexString();
    const mouthMat = new THREE.MeshPhysicalMaterial({ map: mouthTexture(expression, lip), transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.renderOrder = 2;
    group.add(mouth);

    const rig: FaceRig = {
        group,
        head,
        upperLids,
        lowerLids,
        eyes,
        mouth,
        brows,
        ears,
        expression,
        setExpression: (next) => {
            rig.expression = next;
            mouthMat.map = mouthTexture(next, lip);
            mouthMat.needsUpdate = true;
            const raise = next === "happy" ? 0.004 : 0;
            brows.forEach((brow) => (brow.position.y = raise));
            rig.setBlink(0);
        },
        setBlink: (amount) => {
            // Ivica gornjeg kapka: otvoreno ≈ 22° iznad središta, zatvoreno ≈ 12° ispod
            const happy = rig.expression === "happy";
            const upperEdge = THREE.MathUtils.lerp(0.64, -0.22, amount);
            const lowerEdge = THREE.MathUtils.lerp(happy ? -0.66 : -0.84, -0.22, amount);
            upperLids.forEach((lid) => (lid.rotation.x = -upperEdge));
            lowerLids.forEach((lid) => (lid.rotation.x = -lowerEdge));
        },
    };
    rig.setBlink(0);
    return rig;
}
