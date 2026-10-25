// Hidžab (deo izgleda čoveka, uvek besplatan): jedan komad tkanine bez šavova — obavija glavu,
// uokviruje lice mekim uvijenim rubom, ide ispod brade i pada preko vrata, ramena i grudi.
// Kosa, uši i vrat su potpuno pokriveni, lice je otvoreno. Dva kroja:
//  • „omotan” (klasičan): duži napred, preko grudi; drugi sloj marame ide koso ispod brade
//    ka slepoočnici (po tome se vidi da je marama omotana, a ne kapuljača);
//  • „sportski” (amira, dečji iz jednog dela): kraći, okrugao do ramena, sa trakom na čelu.
// Pravi ga motor, ne katalog: kapa i ostali predmeti se nose PREKO hidžaba (sidra glave su
// uvećana za debljinu hidžaba). Deo preko ramena se kroji po odeći ispod (hijabOuter), da
// duks, džemper ili jakna nikad ne provire kroz tkaninu.

import * as THREE from "three";
import { torsoAngle, torsoPoint } from "./body";
import type { BodyShape } from "../contract";
import type { HeadInfo } from "./head";
import type { Kit } from "./kit";
import { fabricMaterial } from "./materials";
import { B, torsoWeights, youthOf } from "./rig";
import { detail } from "./detail";
import { buildSurface, ringTube, smoothstep, type BoneWeights, type SurfaceFn } from "./surface";

const gauss = (x: number, mu: number, s: number) => Math.exp(-((x - mu) ** 2) / (2 * s * s));
const thetaOf = (u: number) => (u - 0.5) * Math.PI * 2;
/**
 * Glatki maksimum (bez preloma i bez skoka, pa su normale glatke): tačno `a` kad je a ≥ b + w,
 * tačno `b` kad je a ≤ b − w, a između meki prelaz.
 */
const softMax = (a: number, b: number, w: number) => {
    if (a >= b + w) return a;
    if (a <= b - w) return b;
    return b + ((a - b + w) * (a - b + w)) / (4 * w);
};

/** Koliko hidžab okvirno dodaje glavi na temenu (sidra glave: kapa, naočare), u metrima */
export const HIJAB_THICKNESS = 0.012;

/** Razmera hidžaba po liku (dete ≈ 0,8, odrasli ≈ 1,1): debljine i nabori rastu sa likom */
function hijabScale(shape: BodyShape): number {
    return Math.min(1.15, Math.max(0.7, shape.height / 1.6));
}

/**
 * Debljina tkanine na glavi u tački (u, v) površine glave (bez otvora za lice): kapa i ostali
 * predmeti na glavi sede tačno na hidžabu (površina glave za predmete je uvećana za ovo).
 */
export function hijabThickness(shape: BodyShape, u: number, v: number): number {
    const scale = hijabScale(shape);
    const th = thetaOf(u);
    const side = smoothstep(0.7, 1.5, Math.abs(th));
    // Pozadi tkanina ide preko skupljene kose (blaga punđa); ka vilici sloj malo deblji;
    // sa strane meki kosi nabori (sinus — bez oštrih ivica)
    return 0.0105 * scale
        + 0.017 * scale * gauss(Math.abs(th), Math.PI, 0.8) * gauss(v, 0.4, 0.14)
        + 0.004 * scale * smoothstep(0.6, 0.88, v)
        + 0.0016 * scale * Math.sin(th * 7 + v * 6) * smoothstep(0.5, 0.82, v) * side;
}

export type HijabStyle = "classic" | "sport";

/**
 * Koliko je deo hidžaba preko ramena odmaknut od tela, po odeći ispod: majica tanko, duks i
 * džemper deblje, jakna i kaput najdeblje (da ništa ne proviri kroz tkaninu).
 */
export function hijabOuter(outfit: string | undefined): number {
    const id = outfit ?? "";
    if (/pernat/.test(id)) return 0.07;
    if (/jakna|kaput|kabanica|astronaut|ronioc|pilot|vatrogas|superheroj|vitez|carobnjak|princ/.test(id)) return 0.05;
    if (/duks|dzemper|kardigan|trenerka|prsluk|pidzama|kostim|odelo|sako|kombinezon|abaja|ogrtac/.test(id)) return 0.036;
    return 0.03;
}

export function buildHijab(kit: Kit, head: HeadInfo, hex: string, style: HijabStyle = "classic", outer = 0.03) {
    const rig = kit.ctx.rig;
    const shape = rig.shape;
    // Meka tkanina (pamuk/žerse): mat, blag sheen na ivicama, sitna mapa normala
    const cloth = fabricMaterial(hex, "cotton", { roughness: 0.8, sheen: 0.65, sheenLift: 0.25, normalScale: 0.12, side: THREE.DoubleSide });
    // U mapu senke ide samo unutrašnja strana: spoljna strana ne baca senku sama na sebe
    // (bez pruga ispod brade i na vilici)
    cloth.shadowSide = THREE.BackSide;
    const band = fabricMaterial(new THREE.Color(hex).lerp(new THREE.Color("#FFFFFF"), 0.55).getStyle(), "rib", { roughness: 0.8, sheen: 0.5, normalScale: 0.3 });
    const child = youthOf(shape.kind) > 0.5;
    const classic = style === "classic";
    /** Razmera (dete ≈ 0,76 odraslog): nabori i debljine rastu sa likom */
    const scale = hijabScale(shape);
    const headAt = new THREE.Vector3(0, shape.headBoneY, 0);

    // ── Otvor za lice: elipsa u (θ, v) — čelo do linije kose, obrazi do ušiju, oblo ispod brade ──
    const tw = child ? 1.0 : 0.95;
    const vc = 0.62;
    const vh = child ? 0.27 : 0.268;
    const narrow = (dv: number) => (dv > 0 ? 1 + dv * 0.9 : 1);
    const open = (u: number, v: number) => {
        const th = thetaOf(u);
        const dv = v - vc;
        return Math.pow((th * narrow(dv)) / tw, 2) + Math.pow(dv / vh, 2);
    };
    /** Tačka na ivici otvora (psi = ugao oko lica, grow > 1 = malo van otvora) */
    const edgeAt = (q: number, grow: number): [number, number] => {
        const psi = q * Math.PI * 2;
        const v = Math.max(0.0005, vc - Math.sin(psi) * vh * grow);
        const th = Math.max(-Math.PI + 1e-4, Math.min(Math.PI - 1e-4, (Math.cos(psi) * tw * grow) / narrow(v - vc)));
        return [th / (Math.PI * 2) + 0.5, v];
    };

    // ── Deo na glavi: tkanina po površini glave (u, v), u licu potonula ispod kože ──
    const thick = (u: number, v: number) => hijabThickness(shape, u, v);
    const headOffset = (u: number, v: number) => {
        // Ivica tone pod kožu ispod uvijenog ruba (rub je posebna glatka cev, ispod)
        const f = open(u, v);
        const k = smoothstep(1.04, 1.17, f);
        // Uz rub je tkanina tanja (uvijen rub je ivica), dalje od lica puna debljina
        const near = 0.5 + 0.5 * smoothstep(1.15, 1.7, f);
        return -0.006 + (thick(u, v) * near + 0.006) * k;
    };
    const shellLocal = head.offsetFn(headOffset);
    const shell = (u: number, v: number, out: THREE.Vector3) => shellLocal(u, v, out).add(headAt);
    // Do kog v tkanina prati glavu: do ruba ispod brade (napred), ispod vilice (sa strane), na potiljku
    const vEnd = (th: number) => {
        const c = Math.cos(th);
        // Napred tkanina napušta glavu odmah ispod ruba (ispod brade ide deo preko vrata)
        return 0.8 - 0.09 * Math.max(0, -c) + 0.105 * Math.pow(Math.max(0, c), 3);
    };

    // ── Deo preko vrata i ramena: od glave meko pada do ramena, pa leži na grudima i leđima ──
    const front = classic ? shape.chestY - (child ? 0.004 : 0.022) : shape.shoulderY - (child ? 0.034 : 0.048);
    const back = classic ? shape.chestY + 0.028 : shape.shoulderY - 0.028;
    const side = classic ? shape.shoulderY - 0.03 * scale : shape.shoulderY - 0.01 * scale;
    const hemY = (a: number) => {
        const c = Math.cos(a);
        const f = Math.pow(Math.abs(c), classic ? 0.75 : 1.2);
        // Omotan: blago šiljat napred (krajevi marame)
        const point = classic ? -0.012 * scale * Math.pow(Math.max(0, c), 8) : 0;
        return (c > 0 ? side + (front - side) * f : side + (back - side) * f) + point;
    };
    // Gde tkanina legne na telo: na ramenima, a napred niže (preko udubljenja ispod vrata)
    const landAt = (a: number) => shape.shoulderY + 0.012 - 0.03 * scale * Math.pow(Math.max(0, Math.cos(a)), 2);
    // Ruke: tkanina ide preko ramena i nadlaktice, ne kroz njih (meko — glatki maksimum)
    const arms = ([1, -1] as const).map((s) => {
        const j = s === 1 ? rig.left : rig.right;
        return { a: j.shoulder.clone(), b: j.elbow.clone(), r: shape.armR(0) + outer - 0.002 };
    });
    const ab = new THREE.Vector3();
    const ap = new THREE.Vector3();
    const pushArms = (p: THREE.Vector3) => {
        for (const arm of arms) {
            ab.subVectors(arm.b, arm.a);
            const t = Math.min(1, Math.max(0, ap.subVectors(p, arm.a).dot(ab) / ab.lengthSq()));
            const c = arm.a.clone().addScaledVector(ab, t);
            const d = p.distanceTo(c);
            if (d < 1e-6) continue;
            const pushed = softMax(d, arm.r, 0.012);
            p.sub(c).multiplyScalar(pushed / d).add(c);
        }
        return p;
    };
    // Vrat: tkanina ispod brade pada preko grla, ne kroz vrat (meko — glatki maksimum)
    const neckR = shape.neckR + outer * 0.72;
    const neckTop = shape.headBoneY + 0.03;
    const neckBottom = shape.neckBaseY - 0.03;
    const pushNeck = (p: THREE.Vector3) => {
        if (p.y > neckTop + 0.02 || p.y < neckBottom - 0.02) return p;
        const k = smoothstep(neckBottom - 0.02, neckBottom, p.y) * (1 - smoothstep(neckTop, neckTop + 0.02, p.y));
        const d = Math.hypot(p.x, p.z);
        if (d < 1e-6) return p;
        const r = d + (softMax(d, neckR, 0.02) - d) * k;
        return p.set((p.x / d) * r, p.y, (p.z / d) * r);
    };
    // Ispod šiljate brade tkanina pada oblo (U), ne u šiljak: meka „školjka” ispred grla
    const chinTip = new THREE.Vector3();
    const chinR = shape.head.w * 0.55;
    const pushFront = (p: THREE.Vector3, s: number) => {
        if (p.z <= 0) return p;
        const env = chinTip.z + (chinTip.y - p.y) * 0.3 - (p.x * p.x) / (2 * chinR);
        const k = smoothstep(0, 0.25, s) * (1 - smoothstep(0.7, 1, s));
        p.z += (softMax(p.z, env, 0.008) - p.z) * k;
        return p;
    };
    // Trup (ramena, vrh leđa i grudi): tkanina nikad ne ulazi u odeću ispod (meko)
    const surf = new THREE.Vector3();
    const pushTorso = (p: THREE.Vector3) => {
        if (p.y > shape.neckBaseY + 0.03) return p;
        const d = Math.hypot(p.x, p.z);
        if (d < 1e-6) return p;
        // Ugao na preseku trupa čija tačka leži tačno u pravcu p (presek nije krug)
        const a = torsoAngle(shape, Math.atan2(p.x, p.z), p.y, outer);
        const r0 = Math.hypot(torsoPoint(shape, a, p.y, outer, surf).x, surf.z);
        // Na kosini ramena (i kragne ispod) presek malo niže je širi: tkanina ide i preko njega
        const r1 = Math.hypot(torsoPoint(shape, torsoAngle(shape, Math.atan2(p.x, p.z), p.y - 0.012, outer), p.y - 0.012, outer, surf).x, surf.z);
        const r = softMax(r0, r1, 0.004);
        const k = 1 - smoothstep(shape.neckBaseY, shape.neckBaseY + 0.03, p.y);
        const grow = (softMax(d, r, 0.008) - d) * k;
        return p.set((p.x / d) * (d + grow), p.y, (p.z / d) * (d + grow));
    };
    // Nabori: od brade se šire ka ramenima, mekši i sitniji pri porubu
    const folds = (a: number, t: number) => {
        const x = Math.abs(a);
        // Simetrično levo-desno; napred (ispod brade) glatko kao šator, nabori kreću sa strane
        return scale * Math.pow(t, 1.1) * (
            0.0032 * (0.5 + 0.5 * Math.cos(x * 5.5 - 1.4)) * smoothstep(0.3, 0.95, x)
            + 0.0012 * Math.sin(x * 11 + 0.4) * smoothstep(0.6, 1.3, x)
        );
    };
    /** Malo odvojeno od tela pri vrhu (preko ramena), priljubljeno niže */
    const liftAt = (s: number) => 0.004 * scale * (1 - s);

    const p0 = new THREE.Vector3();
    const pa = new THREE.Vector3();
    const pb = new THREE.Vector3();
    const t0 = new THREE.Vector3();
    const land = new THREE.Vector3();
    const t1 = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    shell(0.5, vEnd(0), chinTip);
    const tmp2 = new THREE.Vector3();
    /** Deo preko ramena i grudi (s ∈ [0, 1] od mesta gde tkanina legne do poruba): prati telo */
    const torsoAt = (a: number, s: number, out: THREE.Vector3) => {
        const landY = landAt(a);
        const y = landY + (hemY(a) - landY) * s;
        torsoPoint(shape, a, y, outer + liftAt(s) + folds(a, 0.5 + s * 0.5), out);
        return pushArms(pushTorso(pushNeck(out)));
    };
    /** Tačka na delu preko tela: t ∈ [0, 1] od glave do poruba (u = ugao kao na glavi) */
    const HANG = 0.5;
    const drape = (u: number, t: number, out: THREE.Vector3) => {
        const th = thetaOf(u);
        const a = th;
        const ve = vEnd(th);
        shell(u, ve, p0);
        if (t <= 0) return out.copy(p0);
        // Smer kojim tkanina napušta glavu: niz glavu, ali nikad ka vratu (zvono, ne kragna)
        shell(u, ve + 0.01, pa);
        shell(u, ve - 0.01, pb);
        t0.subVectors(pa, pb).normalize().add(tmp.set(0, -1.1, 0)).normalize();
        const radial = tmp.set(p0.x, 0, p0.z).normalize();
        const inward = t0.dot(radial);
        // Napred (ispod brade) više ka grudima: tkanina je šator preko grla, ne prati vrat
        const least = 0.15 + 0.3 * Math.pow(Math.max(0, Math.cos(a)), 0.8);
        if (inward < least) t0.addScaledVector(radial, least - inward).normalize();
        torsoAt(a, 0, land);
        if (t <= HANG) {
            // Od glave do ramena: kubna kriva (Hermit) — meko, bez preloma; na kraju ide tačno u
            // smeru dela preko tela (isti pravac, pa na grudima nema linije)
            torsoAt(a, 0.02, t1).sub(land).normalize();
            const s = t / HANG;
            const m = p0.distanceTo(land);
            const s2 = s * s;
            const s3 = s2 * s;
            out.copy(p0).multiplyScalar(2 * s3 - 3 * s2 + 1)
                .addScaledVector(t0, (s3 - 2 * s2 + s) * m)
                .addScaledVector(land, -2 * s3 + 3 * s2)
                .addScaledVector(t1, (s3 - s2) * m);
            // Meki nabori od brade ka ramenima (na krajevima nula, pa nema preloma)
            out.add(tmp.set(Math.sin(a), 0, Math.cos(a)).multiplyScalar(folds(a, 0.5) * 0.6 * Math.sin(Math.PI * s)));
            // Odmicanje nestaje ka ramenima (kraj krive je već odmaknut, kao i deo preko tela)
            const k = 1 - smoothstep(0.75, 1, s);
            const before = tmp2.copy(out);
            pushArms(pushTorso(pushNeck(pushFront(out, s))));
            return out.lerp(before, 1 - k);
        }
        return torsoAt(a, (t - HANG) / (1 - HANG), out);
    };

    // ── Ceo hidžab: jedna površina (u oko glave, s od temena do poruba) ──
    const S1 = 0.64;
    const hijab: SurfaceFn = (u, s, out) => {
        if (s <= S1) return shell(u, vEnd(thetaOf(u)) * (s / S1), out);
        return drape(u, (s - S1) / (1 - S1), out);
    };
    const headCenter = head.center.clone().add(headAt);
    /** Glava prati kost glave; niže se težina meko predaje vratu i trupu */
    const weights = (_u: number, s: number, p: THREE.Vector3): BoneWeights => {
        if (s <= S1) return [[B.head, 1]];
        const t = (s - S1) / (1 - S1);
        // Ispod brade tkanina ide sa glavom (kad lik klimne, brada ne probija tkaninu)
        const h = 1 - smoothstep(HANG * 0.25, HANG * 0.95, t);
        const rest = torsoWeights(shape, p).map(([bone, w]) => [bone, w * (1 - h)] as [number, number]);
        return [[B.head, h], ...rest];
    };
    // Redovi tačno na prelazima (glava → pad do ramena → telo): prelom je na ivici reda, ne
    // usred trougla (inače se na grudima vidi tanka linija)
    const rows = detail(170);
    const rowA = Math.round(rows * S1);
    const rowB = Math.round(rows * (S1 + (1 - S1) * HANG));
    const sB = S1 + (1 - S1) * HANG;
    const vMap = (t: number) => {
        const j = t * rows;
        if (j <= rowA) return (S1 * j) / rowA;
        if (j <= rowB) return S1 + ((sB - S1) * (j - rowA)) / (rowB - rowA);
        return sB + ((1 - sB) * (j - rowB)) / (rows - rowB);
    };
    const geometry = buildSurface(hijab, {
        nu: detail(184),
        nv: rows,
        vMap,
        closedU: true,
        inside: (u, s, out) => {
            if (s <= S1) return out.copy(headCenter);
            hijab(u, s, out);
            return out.set(0, out.y, 0.0);
        },
        weights,
        // Gušće napred (oko otvora za lice), ređe pozadi
        uMap: (t) => t + (0.55 * Math.sin(2 * Math.PI * t)) / (2 * Math.PI),
        uv: (u, s) => [u * 2.2, s * 1.8],
    });
    kit.skinned(geometry, cloth, "hidzab");

    // Uvijen rub oko lica: glatka cev tačno po obodu otvora (pokriva spoj tkanine i kože)
    {
        const n = new THREE.Vector3();
        const F = Math.sqrt(1.1);
        const rimGeo = ringTube((q, out) => {
            const [u, v] = edgeAt(q, F);
            head.point(u, v, out);
            head.normal(u, v, n);
            return out.addScaledVector(n, 0.0035);
        }, (q) => {
            // Ispod brade (oštar zavoj) rub je tanji, da se cev ne savija preko sebe
            const k = 1 - 0.4 * gauss(q, 0.75, 0.05);
            return [0.0058 * scale * k, 0.0064 * scale * k];
        }, detail(260), 10);
        kit.rigid("head", new THREE.Mesh(rimGeo, cloth));
    }

    // Omotan kroj: drugi sloj ide koso od ispod brade preko obraza ka slepoočnici (gde je marama
    // zakačena), sa mekim zaobljenim gornjim rubom
    if (classic) {
        const n = new THREE.Vector3();
        // Putanja u (u, v) na glavi: od vilice kod brade → obraz (iza ruba) → slepoočnica iznad uha
        const path: [number, number][] = [[0.59, 0.868], [0.635, 0.832], [0.68, 0.76], [0.708, 0.66], [0.72, 0.55], [0.718, 0.46]];
        const along = (s: number): [number, number] => {
            const x = Math.min(1, Math.max(0, s)) * (path.length - 1);
            const i = Math.min(path.length - 2, Math.floor(x));
            const t = x - i;
            const w = t * t * (3 - 2 * t);
            return [path[i][0] + (path[i + 1][0] - path[i][0]) * w, path[i][1] + (path[i + 1][1] - path[i][1]) * w];
        };
        // Širina sloja: pun ispod brade, sužava se ka slepoočnici
        const width = (s: number) => 0.075 * (1 - 0.55 * smoothstep(0.3, 1, s));
        const layer: SurfaceFn = (s, q, out) => {
            const [u0, v0] = along(s);
            // Poprečno: q = 0 dole-pozadi (ispod sloja), q = 1 gornja ivica sloja (ka licu)
            const u = u0 - (q - 0.5) * width(s) * 0.55;
            // Samo po delu na glavi (ispod brade dalje ide deo preko vrata)
            const v = Math.min(vEnd(thetaOf(u)) - 0.006, v0 + (0.5 - q) * width(s));
            shell(u, v, out);
            head.normal(u, v, n);
            // Uzdignut za debljinu sloja, ivica oblo pada nazad na tkaninu; krajevi utonu
            const lift = 0.0032 * scale * Math.sin(Math.min(1, q * 1.15) * Math.PI * 0.5) * (1 - smoothstep(0.85, 1, q) * 0.85);
            const fade = smoothstep(0, 0.14, s) * smoothstep(1, 0.86, s);
            return out.addScaledVector(n, lift * fade - 0.0008);
        };
        const layerGeo = buildSurface(layer, { nu: detail(60), nv: detail(12), inside: () => headCenter.clone(), uv: (s, q) => [s * 1.8, q * 0.4] });
        // Sloj je na glavi: u prostoru tela, pa na kost glave
        layerGeo.translate(-headAt.x, -headAt.y, -headAt.z);
        kit.rigid("head", new THREE.Mesh(layerGeo, cloth));
    }

    // Sportski kroj: svetlija rebrasta traka (kapica ispod hidžaba) vidi se na čelu, od
    // slepoočnice do slepoočnice, odmah ispod uvijenog ruba; krajevi se tanje pod rub
    if (!classic) {
        const n = new THREE.Vector3();
        const bandGeo = ringTube((q, out) => {
            const [u, v] = edgeAt(0.07 + q * 0.36, 0.955);
            head.point(u, v, out);
            head.normal(u, v, n);
            return out.addScaledVector(n, 0.0012);
        }, (q) => {
            const k = Math.pow(Math.sin(Math.min(1, Math.max(0, q)) * Math.PI), 0.35);
            return [0.0022 * scale * k, 0.0042 * scale * k];
        }, detail(90), 8);
        kit.rigid("head", new THREE.Mesh(bandGeo, band));
    }

    // Porub: tanak, mek (dvostruko presavijena ivica)
    const hem = ringTube((q, out) => drape(q, 1, out), () => [0.002 * scale, 0.003 * scale], detail(128), 6, (_u, _v, p) => torsoWeights(shape, p));
    kit.skinned(hem, cloth, "porub-hidzaba");
}
