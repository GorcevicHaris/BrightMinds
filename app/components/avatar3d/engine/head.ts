// Glava i lice: glava je deformisana sfera (puni obrazi, uža brada, ravnije lice), oči
// su sjajne sfere sa dužicom, kapcima koji trepću i trepavicama, obrve su tanke cevi na
// površini, nos je mali „dugme”, a usta su nalepnica sa crtežom osmeha.
// Sve je u koordinatama kosti glave (0, 0, 0 = vrh vrata).

import * as THREE from "three";
import { detail } from "./detail";
import type { FaceControl, FaceExpression } from "../contract";
import { FACE_POSES, mixPose, type FacePose } from "./expressions";
import { Mouth, mouthSurfaceFrom } from "./mouth";
import { basicMaterial, skinMaterial } from "./materials";
import type { BodyShape } from "./rig";
import { buildSurface, polyPath, taperedTube, type SurfaceFn } from "./surface";
import { irisTexture } from "./textures";

const smooth01 = (t: number) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
};

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
    const nose = child ? 1.25 : shape.kind === "man" ? 1.6 : 1.4;
    const fn: SurfaceFn = (u, v, out) => {
        const th = (u - 0.5) * Math.PI * 2;
        const ph = Math.min(Math.PI, Math.max(0, v * Math.PI));
        let x = Math.sin(th) * Math.sin(ph);
        let y = Math.cos(ph);
        let z = Math.cos(th) * Math.sin(ph);
        let r = 1;
        // Puni obrazi (deca više) i jagodice, blago udubljenje za oči
        r += 0.07 * cheeks * (gauss3(x, y, z, 0.6, -0.36, 0.68, 0.24) + gauss3(x, y, z, -0.6, -0.36, 0.68, 0.24));
        // Jagodice, blago udubljenje za oči, sitna brada
        r += 0.02 * (gauss3(x, y, z, 0.64, -0.22, 0.7, 0.16) + gauss3(x, y, z, -0.64, -0.22, 0.7, 0.16));
        r -= 0.024 * (gauss3(x, y, z, 0.35, -0.08, 0.93, 0.13) + gauss3(x, y, z, -0.35, -0.08, 0.93, 0.13));
        // Nos: mekani most između očiju, zaobljen vrh, krilca i nagoveštaj nozdrva
        if (z > 0.5) {
            // Prav, jasan most nosa od očiju do mekog vrha
            const ridge = Math.exp(-(x * x) / (2 * 0.042 * 0.042)) * smooth01((y + 0.4) / 0.2) * (1 - smooth01((y + 0.06) / 0.12));
            r += nose * (0.045 * ridge + 0.075 * gauss3(x, y, z, 0, -0.36, 0.94, 0.055));
            r += nose * 0.034 * (gauss3(x, y, z, 0.075, -0.39, 0.91, 0.04) + gauss3(x, y, z, -0.075, -0.39, 0.91, 0.04));
            r -= nose * 0.018 * (gauss3(x, y, z, 0.042, -0.425, 0.9, 0.022) + gauss3(x, y, z, -0.042, -0.425, 0.9, 0.022));
            // Žleb iznad usne (filtrum) i jamica ispod donje usne
            r -= 0.008 * gauss3(x, y, z, 0, -0.5, 0.88, 0.035);
            r -= 0.01 * gauss3(x, y, z, 0, -0.74, 0.7, 0.06);
        }
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
    const eyeR = w * (child ? 0.13 : 0.126);
    return { shape, center, fn, point, normal, offsetFn, eyeU: child ? 0.073 : 0.07, eyeV: child ? 0.545 : 0.53, eyeR };
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
        c.setRGB(1, 1, 1).lerp(blush, cheek * 0.42);
        // Nozdrve i ugao nosa: tamnije (senka udubljenja)
        const nostril = Math.max(gauss3(x, y, z, 0.042, -0.425, 0.9, 0.026), gauss3(x, y, z, -0.042, -0.425, 0.9, 0.026));
        c.multiplyScalar(1 - nostril * 0.5);
        // Senke u udubljenjima (kao AO): oko očiju, ispod nosa, ispod donje usne, uz vilicu
        const socket = Math.max(gauss3(x, y, z, 0.34, -0.1, 0.9, 0.12), gauss3(x, y, z, -0.34, -0.1, 0.9, 0.12));
        const underNose = gauss3(x, y, z, 0, -0.46, 0.88, 0.05);
        const underLip = gauss3(x, y, z, 0, -0.76, 0.66, 0.06);
        const jaw = Math.max(0, -y - 0.55) * (1 - Math.abs(z) * 0.6);
        c.multiplyScalar(1 - socket * 0.12 - underNose * 0.14 - underLip * 0.12 - jaw * 0.3);
        // Rumen vrh nosa i obrazi
        c.lerp(blush, gauss3(x, y, z, 0, -0.37, 0.94, 0.06) * 0.22);
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
    mouth: Mouth;
    brows: THREE.Object3D[];
    ears: THREE.Mesh[];
    /** Lice po ugovoru (izraz, treptanje, usta pri govoru) */
    control: FaceControl;
    setExpression: (expression: FaceExpression) => void;
    /** 0 = otvoreno, 1 = zatvoreno */
    setBlink: (amount: number) => void;
    expression: FaceExpression;
    dispose: () => void;
}

/** Pravi glavu sa licem; `browColor` je boja kose (tamnija) */
export function buildHead(info: HeadInfo, skinHex: string, eyeHex: string, browColor: string, expression: FaceExpression = "neutral"): FaceRig {
    const group = new THREE.Group();
    group.name = "glava";
    // Gušća mreža na licu (oko u = 0,5 i sredine visine), da nos i usne budu glatki
    const geometry = buildSurface(info.fn, {
        nu: detail(150),
        nv: detail(110),
        closedU: true,
        inside: () => info.center.clone(),
        uMap: (t) => t + (0.62 * Math.sin(2 * Math.PI * t)) / (2 * Math.PI),
        vMap: (t) => t + (0.45 * Math.sin(2 * Math.PI * t)) / (2 * Math.PI),
    });
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
    const eyeMat = new THREE.MeshPhysicalMaterial({ map: irisTexture(eyeHex), roughness: 0.32, clearcoat: 0.75, clearcoatRoughness: 0.06, specularIntensity: 0.45 });
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
        eye.rotation.set(0, side * 0.12, side * 0.09, "YXZ");
        // Bademast oblik (Bitmoji): oko šire nego više, spoljni ugao blago podignut
        eye.scale.set(1.22, 0.9, 1);
        // Rožnjača blago ispupčena iznad dužice (odsjaj „klizi” preko oka kao kod pravog oka)
        const ballGeo = new THREE.SphereGeometry(re, 48, 32);
        {
            const p = ballGeo.getAttribute("position");
            const v = new THREE.Vector3();
            for (let i = 0; i < p.count; i++) {
                v.fromBufferAttribute(p, i);
                const angle = Math.acos(Math.max(-1, Math.min(1, v.z / re)));
                const k = Math.min(1, Math.max(0, 1 - angle / (0.66 * 1.08)));
                v.multiplyScalar(1 + 0.07 * k * k * (3 - 2 * k));
                p.setXYZ(i, v.x, v.y, v.z);
            }
            ballGeo.computeVertexNormals();
        }
        const ball = new THREE.Mesh(ballGeo, eyeMat);
        eye.add(ball);
        // Odsjaj: mali beli oval gore-levo (gledano spreda), uvek isti — „živ” pogled
        const shine = new THREE.Mesh(new THREE.SphereGeometry(re * 0.15, 14, 10), shineMat);
        shine.scale.set(1, 1.15, 0.3);
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
                    // Jasna linija gornjeg kapka (Bitmoji), deblja ka spoljnom uglu
                    return re * (0.075 + 0.07 * Math.pow(outer, 2));
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
                const tip = base.clone().multiplyScalar(1.2).add(new THREE.Vector3(0, re * 0.24, 0));
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

    // Nos je deo površine glave (headInfo); ovde samo visina vrha za nozdrve
    const nv = child ? 0.625 : 0.615;

    // ── Obrve (svaka u svojoj grupi sa središtem u sredini obrve, da se diže i naginje) ──
    const browMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(browColor).multiplyScalar(0.62), roughness: 0.85 });
    const brows: THREE.Object3D[] = [];
    for (const side of [1, -1]) {
        const brow = new THREE.Group();
        // Obrva je mekani „jastučić” na koži: ivice tonu u kožu, sredina je malo ispupčena
        const n0 = new THREE.Vector3();
        const browU = (t: number) => 0.5 + side * (info.eyeU - 0.036 + t * 0.074);
        // Jasan luk obrve: najviša tačka na dve trećine, spoljni kraj spušten
        const browV = (t: number) => info.eyeV - 0.1 - Math.sin(Math.pow(t, 0.8) * Math.PI) * 0.026 + t * 0.012;
        const thick = (t: number) => (girlish ? 0.0165 : 0.019) * (0.35 + 0.65 * Math.pow(Math.sin(Math.min(1, t * 1.05 + 0.06) * Math.PI), 0.7));
        const fn: SurfaceFn = (t, q, out) => {
            const u = browU(t);
            const v = browV(t) + (q - 0.5) * thick(t);
            info.point(u, v, out);
            info.normal(u, v, n0);
            return out.addScaledVector(n0, 0.0006 + 0.0019 * Math.sin(q * Math.PI));
        };
        const pivot = fn(0.5, 0.5, new THREE.Vector3());
        const tube = new THREE.Mesh(buildSurface(fn, { nu: 28, nv: 8, inside: () => info.center.clone() }), browMat);
        tube.geometry.translate(-pivot.x, -pivot.y, -pivot.z);
        brow.add(tube);
        brow.position.copy(pivot);
        brow.userData.rest = pivot.clone();
        group.add(brow);
        brows.push(brow);
    }

    // ── Usta (prava 3D površina: usne, unutrašnjost, zubi, jezik) ──
    const lip = "#" + new THREE.Color(skinHex).lerp(new THREE.Color(girlish ? "#B65562" : "#9E5A58"), girlish ? 0.58 : 0.42).getHexString();
    const mouth = new Mouth(mouthSurfaceFrom(info.fn, info.normal, 0.5, child ? 0.712 : 0.705, 0.0022, 0.0032, child ? 0.0058 : 0.0064), lip);
    group.add(mouth.group);

    // ── Izraz: brojevi iz FACE_POSES, meko mešanje; usta dodatno otvara glas ──
    let from: FacePose = FACE_POSES[expression];
    let target: FacePose = FACE_POSES[expression];
    let shown: FacePose = target;
    let blink = 0;
    let speech = 0;
    let round = 0;
    const apply = () => {
        const pose = shown;
        brows.forEach((brow, i) => {
            const side = i === 0 ? 1 : -1;
            const rest = brow.userData.rest as THREE.Vector3;
            brow.position.set(rest.x, rest.y + pose.browY + (side === 1 ? pose.browLeft : 0), rest.z);
            brow.rotation.z = side * pose.browTilt;
        });
        // Ivica gornjeg kapka: otvoreno ≈ 37° iznad središta, zatvoreno ≈ 12° ispod
        const openEdge = 0.7 * pose.eye + (pose.eye - 1) * 0.3;
        const upperEdge = THREE.MathUtils.lerp(openEdge, -0.22, blink);
        const lowerRest = THREE.MathUtils.lerp(-0.66, -0.4, pose.lid);
        const lowerEdge = THREE.MathUtils.lerp(lowerRest, -0.22, blink);
        upperLids.forEach((lid) => (lid.rotation.x = -upperEdge));
        lowerLids.forEach((lid) => (lid.rotation.x = -lowerEdge));
        const open = Math.min(1, pose.open + speech * 0.85);
        mouth.setShape({ width: pose.width * (1 - speech * 0.12), smile: pose.smile * (1 - speech * 0.35), open, round: round * speech });
    };

    const control: FaceControl = {
        setExpression: (next, weight = 1) => {
            const goal = FACE_POSES[next];
            if (goal !== target) {
                from = shown;
                target = goal;
                rig.expression = next;
            }
            shown = mixPose(from, target, Math.min(1, Math.max(0, weight)));
            apply();
        },
        setBlink: (amount) => {
            blink = amount;
            apply();
        },
        setMouth: (open, r = 0) => {
            speech = open;
            round = r;
            apply();
        },
    };

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
        control,
        setExpression: (next) => control.setExpression(next, 1),
        setBlink: control.setBlink,
        dispose: () => mouth.dispose(),
    };
    apply();
    return rig;
}
