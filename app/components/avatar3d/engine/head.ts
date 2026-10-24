// Glava i lice (Bitmoji 3D): glava je deformisana sfera — veliko okruglo teme, vitko ovalno
// lice sa jagodicama, blagom vilicom i mekom šiljatom bradom. Oči su srednje, bademaste, sa
// jasnom dužicom, jednim odsjajem i opuštenim kapcima (gornji pokriva vrh dužice), debelom
// tamnom linijom gornjeg kapka i naborom iznad nje. Obrve su pune, sa tankim krajem; nos je
// mali sa krilcima i senkom ispod; usta su prave usne sa blagim zatvorenim osmehom.
// Sve je u koordinatama kosti glave (0, 0, 0 = vrh vrata).

import * as THREE from "three";
import { detail } from "./detail";
import type { FaceControl, FaceExpression } from "../contract";
import { FACE_POSES, mixPose, type FacePose } from "./expressions";
import { Mouth, mouthSurfaceFrom } from "./mouth";
import { basicMaterial, createSkinMaterial, skinMaterial } from "./materials";
import { isFemaleKind, isSeniorKind, youthOf, type BodyShape } from "./rig";
import { buildSurface, polyPath, taperedTube, type SurfaceFn } from "./surface";
import { faceTexture, irisTexture } from "./textures";

const smooth01 = (t: number) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
};
const smoothstep = (a: number, b: number, x: number) => smooth01((x - a) / (b - a));

const gauss3 = (x: number, y: number, z: number, cx: number, cy: number, cz: number, s: number) =>
    Math.exp(-((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) / (2 * s * s));

/** Mesto uha na glavi (u od sredine lica, v): u visini od očiju do vrha nosa */
export const EAR_U = 0.24;
export const EAR_V = 0.575;

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
    /** Središte usta (v) */
    mouthV: number;
}

/** Glava u (u, v): ugao θ = (u − 0,5)·2π od napred, φ = v·π od temena */
export function headInfo(shape: BodyShape): HeadInfo {
    const { w, h, d, up, fwd, chin, cheeks } = shape.head;
    const center = new THREE.Vector3(0, up, fwd);
    // Mladost (1 = dete, ≈ 0,45 tinejdžer, 0 = odrasli): oči, nos i obrazi se mešaju po njoj
    const youth = youthOf(shape.kind);
    const male = !isFemaleKind(shape.kind);
    const senior = isSeniorKind(shape.kind);
    const lerp = (adult: number, child: number) => adult + (child - adult) * youth;
    const nose = lerp(male ? 1.25 : 1.08, 0.95) * (senior ? 1.08 : 1);
    // Koliko se donji deo lica produžava (duže, vitkije lice; deca malo manje)
    const longer = lerp(0.075, 0.05);
    const fn: SurfaceFn = (u, v, out) => {
        const th = (u - 0.5) * Math.PI * 2;
        const ph = Math.min(Math.PI, Math.max(0, v * Math.PI));
        let x = Math.sin(th) * Math.sin(ph);
        let y = Math.cos(ph);
        let z = Math.cos(th) * Math.sin(ph);
        let r = 1;
        // Meki obrazi ispod jagodica (deca punija), jagodice, udubljenja za oči, blagi luk obrva
        r += 0.05 * cheeks * (gauss3(x, y, z, 0.56, -0.44, 0.7, 0.22) + gauss3(x, y, z, -0.56, -0.44, 0.7, 0.22));
        r += 0.026 * (gauss3(x, y, z, 0.66, -0.2, 0.7, 0.15) + gauss3(x, y, z, -0.66, -0.2, 0.7, 0.15));
        r -= 0.028 * (gauss3(x, y, z, 0.43, -0.08, 0.89, 0.12) + gauss3(x, y, z, -0.43, -0.08, 0.89, 0.12));
        r += 0.012 * (gauss3(x, y, z, 0.4, 0.08, 0.9, 0.12) + gauss3(x, y, z, -0.4, 0.08, 0.9, 0.12));
        // Slepoočnice blago uvučene (lice nije balon)
        r -= 0.02 * (gauss3(x, y, z, 0.82, 0.12, 0.45, 0.2) + gauss3(x, y, z, -0.82, 0.12, 0.45, 0.2));
        if (z > 0.45) {
            // Nos: uzan prav most, mali zaobljen vrh, jasna krilca i nagoveštaj nozdrva
            // Most je tih (bez svetle pruge), nos dobija oblik tek ka vrhu
            const ridge = Math.exp(-(x * x) / (2 * 0.05 * 0.05)) * smooth01((y + 0.42) / 0.24) * (1 - smooth01((y + 0.14) / 0.16));
            r += nose * (0.022 * ridge + 0.07 * gauss3(x, y, z, 0, -0.37, 0.94, 0.05));
            r += nose * 0.034 * (gauss3(x, y, z, 0.07, -0.405, 0.91, 0.038) + gauss3(x, y, z, -0.07, -0.405, 0.91, 0.038));
            r -= nose * 0.02 * (gauss3(x, y, z, 0.04, -0.44, 0.9, 0.02) + gauss3(x, y, z, -0.04, -0.44, 0.9, 0.02));
            // Žleb iznad usne (filtrum) i jamica ispod donje usne
            r -= 0.008 * gauss3(x, y, z, 0, -0.5, 0.88, 0.035);
            r -= 0.01 * gauss3(x, y, z, 0, -0.73, 0.7, 0.055);
        }
        // Blago ispupčen predeo usta i jasna mekana brada (van gornjeg uslova: bez šava)
        r += 0.008 * gauss3(x, y, z, 0, -0.6, 0.8, 0.13);
        r += 0.014 * gauss3(x, y, z, 0, -0.86, 0.5, 0.16);
        // Potiljak malo izbočen, teme okruglo
        r += 0.03 * gauss3(x, y, z, 0, 0.2, -0.95, 0.4);
        x *= r;
        y *= r;
        z *= r;
        // Ovalno lice: širina se od jagodica meko sužava ka bradi (vilica u obliku slova V,
        // zaobljena brada); pozadi se sužava samo ka vratu
        const front = smoothstep(-0.6, 0.25, z);
        const lower = smoothstep(-0.08, -1, y);
        const jaw = 1 - (1 - chin) * smoothstep(-0.05, -0.8, y);
        const back = 1 - (1 - chin) * 0.6 * Math.pow(smoothstep(-0.3, -1, y), 1.5);
        x *= back + (jaw - back) * front;
        if (y < 0 && z > 0) z *= 1 - lerp(0.05, 0.08) * lower * lower;
        // Duži donji deo lica i brada malo napred
        y -= longer * smoothstep(-0.15, -0.95, y) * smoothstep(-0.4, 0.4, z);
        z += 0.02 * gauss3(x, y, z, 0, -0.92, 0.42, 0.2);
        // Lice je ravnije od sfere (oči leže na blažoj krivini)
        if (z > 0) z *= 1 - 0.1 * Math.pow(z, 3) * (1 - Math.abs(y) * 0.5);
        // Nana i dedo: meki nabori od smeha (od krilca nosa ka uglu usana) i blago puniji obrazi
        if (senior && z > 0.3) {
            const fold = (sx: number) => {
                // Duž od (±0,13, −0,43) do (±0,25, −0,66) u (x, y) lica
                const t = Math.min(1, Math.max(0, ((x - sx * 0.13) * sx * 0.12 + (y + 0.43) * -0.23) / (0.12 * 0.12 + 0.23 * 0.23)));
                const dx = x - sx * (0.13 + 0.12 * t);
                const dy = y - (-0.43 - 0.23 * t);
                return Math.exp(-(dx * dx + dy * dy) / (2 * 0.026 * 0.026)) * Math.sin(Math.PI * Math.min(1, t * 1.15));
            };
            const k = 1 - 0.012 * (fold(1) + fold(-1));
            x *= k;
            z *= k;
        }
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
    // Srednje oči (ne ogromne), malo razmaknute
    const eyeR = w * lerp(0.126, 0.136) * (senior ? 0.95 : 1);
    return { shape, center, fn, point, normal, offsetFn, eyeU: lerp(0.077, 0.079), eyeV: lerp(0.535, 0.548), eyeR, mouthV: lerp(0.705, 0.712) };
}

/** Rumenilo, senke u udubljenjima, senka kapaka (boje temena: množe boju kože) */
function headColors(geometry: THREE.BufferGeometry, info: HeadInfo) {
    const position = geometry.getAttribute("position");
    const colors = new Float32Array(position.count * 3);
    // Rumenilo: meko breskvasto-ružičasto (ne crveno), široko i jedva primetno
    const blush = new THREE.Color("#FFA28C");
    const lid = new THREE.Color("#C99080");
    const c = new THREE.Color();
    const { center } = info;
    const { w, h, d } = info.shape.head;
    const girlish = isFemaleKind(info.shape.kind);
    const senior = isSeniorKind(info.shape.kind);
    const line = (v: number, at: number, s: number) => Math.exp(-((v - at) ** 2) / (2 * s * s));
    for (let i = 0; i < position.count; i++) {
        const x = (position.getX(i) - center.x) / (w / 2);
        const y = (position.getY(i) - center.y) / (h / 2);
        const z = (position.getZ(i) - center.z) / (d / 2);
        // Meko rumenilo na obrazima (devojčice malo više) i na vrhu nosa
        const cheek = Math.max(gauss3(x, y, z, 0.5, -0.42, 0.74, 0.21), gauss3(x, y, z, -0.5, -0.42, 0.74, 0.21));
        c.setRGB(1, 1, 1).lerp(blush, cheek * (girlish ? 0.22 : 0.15));
        // Senka kapka samo IZNAD oka (ispod oka ništa — bez „podočnjaka”)
        const lidShade = Math.max(gauss3(x, y, z, 0.42, 0.06, 0.86, 0.06), gauss3(x, y, z, -0.42, 0.06, 0.86, 0.06)) * smoothstep(-0.02, 0.04, y);
        c.lerp(lid, lidShade * (girlish ? 0.16 : 0.1));
        // Nozdrve i ugao nosa: tamnije (senka udubljenja)
        const nostril = Math.max(gauss3(x, y, z, 0.04, -0.44, 0.9, 0.024), gauss3(x, y, z, -0.04, -0.44, 0.9, 0.024));
        c.multiplyScalar(1 - nostril * 0.45);
        // Senke u udubljenjima (kao AO): uz nos, ispod nosa, ispod donje usne, uz vilicu
        const noseSide = Math.max(gauss3(x, y, z, 0.1, -0.3, 0.93, 0.05), gauss3(x, y, z, -0.1, -0.3, 0.93, 0.05));
        const underNose = gauss3(x, y, z, 0, -0.47, 0.88, 0.045);
        const underLip = gauss3(x, y, z, 0, -0.77, 0.66, 0.06);
        const jaw = Math.max(0, -y - 0.55) * (1 - Math.max(0, z) * 0.45);
        // Bočne strane lica i ispod jagodica malo tamnije (lice nije ravno)
        const side = smoothstep(0.55, 0.95, Math.abs(x)) * smoothstep(0.1, -0.5, y);
        const hollow = Math.max(gauss3(x, y, z, 0.62, -0.55, 0.6, 0.14), gauss3(x, y, z, -0.62, -0.55, 0.6, 0.14));
        c.multiplyScalar(1 - noseSide * 0.1 - underNose * 0.26 - underLip * 0.14 - - jaw * 0.4 - side * 0.08 - hollow * 0.06);
        if (senior && z > 0) {
            // Nana i dedo: blage bore (bez „strogog” izraza) — dve linije na čelu, „guščje
            // nožice” uz spoljne uglove očiju i senka nabora od smeha
            const brow = (line(y, 0.36, 0.018) + line(y, 0.45, 0.018) * 0.8) * smoothstep(0.42, 0.2, Math.abs(x)) * smoothstep(0.6, 0.85, z);
            let crow = 0;
            for (const sx of [1, -1]) {
                const ex = x * sx - 0.6;
                if (ex > -0.02 && ex < 0.14) crow += (line(y + ex * 0.7, 0.01, 0.012) + line(y, -0.02, 0.012) + line(y - ex * 0.6, -0.05, 0.012)) * smoothstep(-0.02, 0.03, ex) * (1 - smoothstep(0.08, 0.14, ex));
            }
            const fold = Math.max(gauss3(Math.abs(x), y, z, 0.2, -0.56, 0.86, 0.03), gauss3(Math.abs(x), y, z, 0.17, -0.5, 0.88, 0.03));
            c.multiplyScalar(1 - brow * 0.07 - crow * 0.09 - fold * 0.14);
        }
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
    /** Lice po ugovoru (izraz, treptanje, usta pri govoru, pogled) */
    control: FaceControl;
    setExpression: (expression: FaceExpression) => void;
    /** 0 = otvoreno, 1 = zatvoreno */
    setBlink: (amount: number) => void;
    expression: FaceExpression;
    dispose: () => void;
}

export interface FaceOptions {
    /** Pegice: 0 = bez, 1 = malo, 2 = više */
    freckles?: number;
}

/** Boja obrva: tamnija od kose; svetla kosa ipak dobija jasne (svetlosmeđe) obrve */
function browHex(hair: string, child: boolean): THREE.Color {
    const c = new THREE.Color(hair);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    // Deca: mekše (svetlije) obrve
    const out = c.clone().multiplyScalar(child ? 0.66 : 0.52);
    if (hsl.l > 0.45) out.lerp(new THREE.Color(hsl.s < 0.15 ? "#6E6A6C" : "#6B4A30"), 0.55);
    return out;
}

/** Pravi glavu sa licem; `browColor` je boja kose (obrve su tamnije) */
export function buildHead(info: HeadInfo, skinHex: string, eyeHex: string, browColor: string, expression: FaceExpression = "neutral", options: FaceOptions = {}): FaceRig {
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
    // Pegice su crtež u (u, v) glave; bez pegica — deljeni materijal kože
    const freckles = options.freckles ?? 0;
    const faceMat = freckles > 0 ? createSkinMaterial(skinHex, true, faceTexture(skinHex, freckles)) : skinMaterial(skinHex, true);
    const head = new THREE.Mesh(geometry, faceMat);
    head.name = "lice";
    group.add(head);

    const girlish = isFemaleKind(info.shape.kind);
    const youth = youthOf(info.shape.kind);
    const child = youth > 0.5;
    const senior = isSeniorKind(info.shape.kind);
    const tone = new THREE.Color(skinHex);

    // ── Uši (manje, malo niže; kod nane i dede malo veće) ──
    const ears: THREE.Mesh[] = [];
    const earK = senior ? 1.1 : 1;
    for (const side of [1, -1]) {
        const ear = new THREE.Group();
        const outer = new THREE.SphereGeometry(1, 18, 14);
        outer.scale(0.011 * earK, 0.029 * earK, 0.021 * earK);
        const inner = new THREE.SphereGeometry(1, 14, 10);
        inner.scale(0.006 * earK, 0.018 * earK, 0.0115 * earK);
        inner.translate(0.0062 * earK, -0.002, 0.002);
        const earMesh = new THREE.Mesh(outer, skinMaterial(skinHex));
        const innerMesh = new THREE.Mesh(inner, skinMaterial("#" + tone.clone().multiplyScalar(0.84).getHexString()));
        ear.add(earMesh, innerMesh);
        const u = 0.5 + side * EAR_U;
        const p = info.point(u, EAR_V);
        ear.position.copy(p).add(new THREE.Vector3(-side * 0.004, 0, -0.006));
        ear.rotation.y = side * -0.35;
        ear.rotation.z = side * 0.12;
        if (side === -1) ear.scale.x = -1;
        group.add(ear);
        ears.push(earMesh, innerMesh);
    }

    // ── Oči ──
    // Mat, skoro belo belo oka (blago „svetli”, pa nije sivo u senci kapaka), jedan jasan odsjaj
    const iris = irisTexture(eyeHex);
    const eyeMat = new THREE.MeshPhysicalMaterial({ map: iris, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.2, specularIntensity: 0.25, emissive: new THREE.Color("#FFFFFF"), emissiveMap: iris, emissiveIntensity: 0.3 });
    // Kapak je za nijansu tamniji i topliji od kože (senka kapka)
    const lidHex = "#" + tone.clone().multiplyScalar(0.97).lerp(new THREE.Color("#D09080"), 0.06).getHexString();
    const lidMat = skinMaterial(lidHex);
    const lashMat = new THREE.MeshStandardMaterial({ color: "#120B0D", roughness: 0.7 });
    const creaseMat = new THREE.MeshStandardMaterial({ color: tone.clone().multiplyScalar(0.7).lerp(new THREE.Color("#7A4038"), 0.2), roughness: 0.8, transparent: true, opacity: 0.38, depthWrite: false });
    const shineMat = basicMaterial("#FFFFFF");
    const eyes: THREE.Object3D[] = [];
    const balls: THREE.Object3D[] = [];
    const upperLids: THREE.Object3D[] = [];
    const lowerLids: THREE.Object3D[] = [];
    const re = info.eyeR;
    const noShadow = (mesh: THREE.Mesh) => {
        // Sitni delovi lica ne bacaju i ne primaju senku (bez mrlja od mape senke)
        mesh.userData.noShadow = true;
        return mesh;
    };
    for (const side of [1, -1] as const) {
        const u = 0.5 + side * info.eyeU;
        const surface = info.point(u, info.eyeV);
        const n = info.normal(u, info.eyeV);
        const eye = new THREE.Group();
        eye.name = "oko";
        // Oko je dublje u glavi (ne „ispada”): viri samo prednji deo
        eye.position.copy(surface).addScaledVector(n, -re * 0.74);
        // Oči gledaju napred i malo jedna ka drugoj; spoljni ugao blago podignut
        eye.rotation.set(0, side * 0.03, side * 0.11, "YXZ");
        // Bademast oblik: oko šire nego više
        eye.scale.set(1.24, 0.94, 1);
        // Rožnjača blago ispupčena iznad dužice
        const ballGeo = new THREE.SphereGeometry(re, 40, 28);
        {
            const p = ballGeo.getAttribute("position");
            const v = new THREE.Vector3();
            for (let i = 0; i < p.count; i++) {
                v.fromBufferAttribute(p, i);
                const angle = Math.acos(Math.max(-1, Math.min(1, v.z / re)));
                const k = Math.min(1, Math.max(0, 1 - angle / (0.62 * 1.08)));
                v.multiplyScalar(1 + 0.06 * k * k * (3 - 2 * k));
                p.setXYZ(i, v.x, v.y, v.z);
            }
            ballGeo.computeVertexNormals();
        }
        // Jabučica se okreće za pogledom (kapci i odsjaj stoje)
        const ball = noShadow(new THREE.Mesh(ballGeo, eyeMat));
        eye.add(ball);
        balls.push(ball);
        // Jedan jasan odsjaj gore-levo (sa strane glavnog svetla)
        const shine = noShadow(new THREE.Mesh(new THREE.SphereGeometry(re * 0.19, 14, 10), shineMat));
        shine.scale.set(1, 1.1, 0.3);
        shine.position.copy(new THREE.Vector3(-0.26, 0.2, 0.95).normalize()).multiplyScalar(re * 1.04);
        eye.add(shine);

        const lidR = re * 1.03;
        const upper = new THREE.Group();
        const upperCap = noShadow(new THREE.Mesh(new THREE.SphereGeometry(lidR, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2), lidMat));
        upper.add(upperCap);
        // Ugao na ivici kapka: unutrašnji i spoljni ugao vidljivog dela oka (x = side·R je spolja);
        // jabučica je duboko u glavi, pa se vidi samo prednjih ≈ ±45°
        const A = 0.8;
        const tIn = Math.PI / 2 + side * A * 0.92;
        const tOut = Math.PI / 2 - side * A;
        const rim = (t: number, lift = 0, r = lidR * 1.004) => new THREE.Vector3(Math.cos(t) * r * Math.cos(lift), r * Math.sin(lift), Math.sin(t) * r * Math.cos(lift));
        // Debela tamna linija gornjeg kapka: tanka kod nosa, deblja ka spolja, sa „krilcem”
        // koje izlazi malo van oka (kao olovka za oči)
        {
            const pts: THREE.Vector3[] = [];
            for (let i = 0; i <= 10; i++) pts.push(rim(tIn + (tOut - tIn) * (i / 10)));
            const end = pts[pts.length - 1];
            // Krilce: kod devojčica jasno, kod dečaka jedva
            const wing = girlish ? 1 : 0.45;
            pts.push(end.clone().add(new THREE.Vector3(side * re * 0.14 * wing, re * 0.03 * wing, -re * 0.02)));
            pts.push(end.clone().add(new THREE.Vector3(side * re * 0.3 * wing, re * 0.12 * wing, -re * 0.03)));
            const thick = girlish ? 0.088 : 0.072;
            const lash = noShadow(new THREE.Mesh(
                taperedTube(polyPath(pts), (s) => re * (0.03 + thick * Math.pow(Math.sin(Math.min(1, s * 1.05) * Math.PI * 0.94), 0.6) * (0.55 + 0.45 * s)), 32, 8, undefined, 0.75),
                lashMat,
            ));
            upper.add(lash);
        }
        // Mekan nabor kapka iznad linije (bez njega oko „bulji”)
        {
            const pts: THREE.Vector3[] = [];
            for (let i = 0; i <= 8; i++) {
                const s = i / 8;
                pts.push(rim(tIn + (tOut - tIn) * (0.12 + 0.8 * s), 0.3 + 0.05 * Math.sin(s * Math.PI), lidR * 1.012));
            }
            const crease = new THREE.Mesh(taperedTube(polyPath(pts), (s) => re * 0.026 * Math.sin(Math.min(1, s) * Math.PI), 20, 6), creaseMat);
            crease.renderOrder = 2;
            upper.add(noShadow(crease));
        }
        if (girlish) {
            // Trepavice na spoljnoj polovini kapka: tanke, savijene gore i napolje
            for (let i = 0; i < 5; i++) {
                const s = 0.55 + i * 0.1;
                const t = tIn + (tOut - tIn) * Math.min(0.99, s);
                const base = rim(t, 0.02);
                const outward = new THREE.Vector3(Math.cos(t), 0, Math.sin(t)).normalize();
                const len = re * (0.22 + 0.1 * (i / 4));
                const mid = base.clone().addScaledVector(outward, len * 0.35).add(new THREE.Vector3(side * len * 0.05, len * 0.4, 0));
                const tip = base.clone().addScaledVector(outward, len * 0.3).add(new THREE.Vector3(side * len * 0.28, len * 0.9, 0));
                const flick = noShadow(new THREE.Mesh(taperedTube(polyPath([base, mid, tip]), (q) => re * 0.05 * (1 - q * 0.8), 8, 5), lashMat));
                upper.add(flick);
            }
        }
        eye.add(upper);
        upperLids.push(upper);

        const lower = new THREE.Group();
        const lowerCap = noShadow(new THREE.Mesh(new THREE.SphereGeometry(lidR * 0.995, 36, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skinMaterial(skinHex)));
        lower.add(lowerCap);
        eye.add(lower);
        lowerLids.push(lower);

        group.add(eye);
        eyes.push(eye);
    }

    // ── Obrve (svaka u svojoj grupi sa središtem u sredini obrve, da se diže i naginje) ──
    const browMat = new THREE.MeshStandardMaterial({ color: browHex(browColor, child), roughness: 0.85 });
    const brows: THREE.Object3D[] = [];
    for (const side of [1, -1]) {
        const brow = new THREE.Group();
        // Obrva je mekani „jastučić” na koži: ivice tonu u kožu, sredina je malo ispupčena
        const n0 = new THREE.Vector3();
        const browU = (t: number) => 0.5 + side * (info.eyeU - 0.043 + t * 0.088);
        // Luk: unutrašnji kraj malo podignut (prijatan izraz), vrh na ≈ 60 %, rep spušten
        const browV = (t: number) => info.eyeV - 0.088 - Math.sin(Math.pow(t, 0.85) * Math.PI) * 0.02 + 0.016 * smoothstep(0.55, 1, t) - 0.004 * (1 - smoothstep(0, 0.25, t));
        const base = (girlish ? 0.021 : 0.026) * (1 - 0.12 * youth) * (senior ? 0.92 : 1);
        // Puna kod nosa, najdeblja u prvoj trećini, tanak rep
        const thick = (t: number) => base * (0.62 + 0.38 * Math.sin(Math.min(1, t * 3.2) * Math.PI / 2)) * (1 - 0.72 * smoothstep(0.3, 1, t));
        const fn: SurfaceFn = (t, q, out) => {
            const u = browU(t);
            const v = browV(t) + (q - 0.5) * thick(t);
            info.point(u, v, out);
            info.normal(u, v, n0);
            return out.addScaledVector(n0, 0.0006 + 0.0024 * Math.sin(q * Math.PI));
        };
        const pivot = fn(0.5, 0.5, new THREE.Vector3());
        const tube = noShadow(new THREE.Mesh(buildSurface(fn, { nu: 28, nv: 8, inside: () => info.center.clone() }), browMat));
        tube.geometry.translate(-pivot.x, -pivot.y, -pivot.z);
        brow.add(tube);
        brow.position.copy(pivot);
        brow.userData.rest = pivot.clone();
        group.add(brow);
        brows.push(brow);
    }

    // ── Usta (prava 3D površina: usne, unutrašnjost, zubi, jezik) ──
    const man = !girlish && youth < 0.5;
    // Zdrave ružičaste usne (ne blede ni ljubičaste); nana i dedo malo bleđe i tanje
    const lipK = (girlish ? 0.58 : man ? 0.42 : 0.5) * (senior ? 0.8 : 1);
    const lip = "#" + tone.clone().lerp(new THREE.Color(girlish ? "#E2687A" : "#D4766E"), lipK).getHexString();
    const lipH = (child ? 0.0058 : man ? 0.0052 : 0.0064) * (senior ? 0.85 : 1);
    const mouth = new Mouth(mouthSurfaceFrom(info.fn, info.normal, 0.5, info.mouthV, 0.0026, 0.0032, lipH), lip);
    group.add(mouth.group);

    // ── Izraz: brojevi iz FACE_POSES, meko mešanje; usta dodatno otvara glas ──
    let from: FacePose = FACE_POSES[expression];
    let target: FacePose = FACE_POSES[expression];
    let shown: FacePose = target;
    let blink = 0;
    let speech = 0;
    let round = 0;
    const gaze = new THREE.Vector2();
    const apply = () => {
        const pose = shown;
        brows.forEach((brow, i) => {
            const side = i === 0 ? 1 : -1;
            const rest = brow.userData.rest as THREE.Vector3;
            brow.position.set(rest.x, rest.y + pose.browY + (side === 1 ? pose.browLeft : 0), rest.z);
            brow.rotation.z = side * pose.browTilt;
        });
        // Ivica gornjeg kapka: opušteno ≈ 24° iznad središta (pokriva vrh dužice), zatvoreno ≈ 13°
        // ispod; pogled gore malo podigne kapak, dole spusti
        const openEdge = 0.61 + (pose.eye - 1) * 1.25 + gaze.y * 0.12;
        const upperEdge = THREE.MathUtils.lerp(openEdge, -0.23, blink);
        // Nana i dedo: „oči koje se smeju” (donji kapak malo viši) — topao, blag pogled
        const lowerRest = THREE.MathUtils.lerp(-0.72, -0.42, Math.min(1, pose.lid + (senior ? 0.18 : 0))) + gaze.y * 0.05;
        const lowerEdge = THREE.MathUtils.lerp(lowerRest, -0.23, blink);
        upperLids.forEach((lid) => (lid.rotation.x = -upperEdge));
        lowerLids.forEach((lid) => (lid.rotation.x = -lowerEdge));
        balls.forEach((ball) => ball.rotation.set(-gaze.y * 0.28, gaze.x * 0.34, 0));
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
        setGaze: (x, y) => {
            gaze.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
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
        // Ostale materijale lica (nisu iz keša) oslobađa disposeObject sa ostatkom tela
        dispose: () => mouth.dispose(),
    };
    apply();
    return rig;
}
