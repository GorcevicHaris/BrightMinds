// Hidžab (deo izgleda čoveka, uvek besplatan): tkanina obavija glavu, uokviruje lice mekim
// uvijenim rubom i pada preko ramena i grudi u naborima. Dva kroja:
//  • „klasičan” (omotan): duži napred, preko grudi, nabori od brade ka ramenima;
//  • „sportski” (amira, dečji iz jednog dela): kraći, okrugao do ramena, sa trakom na čelu.
// Pravi ga motor, ne katalog: kapa i ostali predmeti se nose PREKO hidžaba (sidra glave su
// uvećana za debljinu hidžaba).

import * as THREE from "three";
import { torsoPoint } from "./body";
import type { HeadInfo } from "./head";
import type { Kit } from "./kit";
import { fabricMaterial } from "./materials";
import { torsoWeights } from "./rig";
import { buildSurface, ringTube, smoothstep, type SurfaceFn } from "./surface";

const gauss = (x: number, mu: number, s: number) => Math.exp(-((x - mu) ** 2) / (2 * s * s));
const thetaOf = (u: number) => (u - 0.5) * Math.PI * 2;

/** Koliko hidžab dodaje glavi (kapa sedi iznad toga), u metrima */
export const HIJAB_THICKNESS = 0.017;

export type HijabStyle = "classic" | "sport";

export function buildHijab(kit: Kit, head: HeadInfo, hex: string, style: HijabStyle = "classic", outer = 0.03) {
    const rig = kit.ctx.rig;
    const shape = rig.shape;
    // Meka tkanina (pamuk/žerse): mat, blag sheen na ivicama, sitna mapa normala
    const cloth = fabricMaterial(hex, "cotton", { roughness: 0.78, sheen: 0.7, sheenLift: 0.28, normalScale: 0.16, side: THREE.DoubleSide });
    const band = fabricMaterial(new THREE.Color(hex).lerp(new THREE.Color("#FFFFFF"), 0.55).getStyle(), "rib", { roughness: 0.8, sheen: 0.5, normalScale: 0.3 });
    const child = shape.kind === "girl" || shape.kind === "boy";

    // Otvor za lice: elipsa u (θ, v) — tkanina pokriva čelo do obrva, obraze do jagodica
    const tw = child ? 1.0 : 0.95;
    const vc = 0.62;
    const vh = child ? 0.27 : 0.268;
    const open = (u: number, v: number) => {
        const th = thetaOf(u);
        const dv = v - vc;
        // Ispod brade otvor je uži (tkanina se skuplja ispod brade)
        const k = dv > 0 ? 1 + dv * 1.4 : 1;
        return Math.pow(th / (tw / k), 2) + Math.pow(dv / vh, 2);
    };
    const thick = (u: number, v: number) => {
        const th = thetaOf(u);
        // Pozadi tkanina ide preko skupljene kose (blaga punđa), sa strane meki nabori
        return 0.011 + 0.02 * gauss(Math.abs(th), Math.PI, 0.75) * gauss(v, 0.38, 0.13) + 0.004 * (1 - smoothstep(0.1, 0.4, v)) + 0.006 * smoothstep(0.7, 0.92, v)
            + 0.0025 * Math.sin(th * 6 + v * 4) * smoothstep(0.45, 0.8, v) * smoothstep(0.6, 1.4, Math.abs(th));
    };
    const offset = (u: number, v: number) => {
        const f = open(u, v);
        const k = smoothstep(1.0, 1.12, f);
        // Uvijen rub oko lica: zadebljanje odmah iza ivice otvora
        const roll = 0.0055 * Math.exp(-(((f - 1.13) / 0.055) ** 2));
        return -0.006 + (thick(u, v) + 0.006) * k + roll;
    };
    const maxV = 0.93;
    const shell = head.offsetFn(offset);
    // Mreža prati otvor za lice (prstenovi oko elipse), pa je ivica glatka, bez „zubaca”
    const toHead = (q: number, r: number): [number, number] => {
        const psi = q * Math.PI * 2;
        const grow = 0.9 + r * 3.4;
        let v = vc - Math.sin(psi) * vh * grow;
        v = Math.min(maxV, Math.max(0.0005, v));
        const dv = v - vc;
        const k = dv > 0 ? 1 + dv * 1.4 : 1;
        const th = Math.max(-Math.PI + 1e-4, Math.min(Math.PI - 1e-4, (Math.cos(psi) * tw * grow) / k));
        return [th / (Math.PI * 2) + 0.5, v];
    };
    const NU = 170;
    const NV = 64;
    const shellGeo = buildSurface((q, r, out) => {
        const [u, v] = toHead(q, r);
        return shell(u, v, out);
    }, { nu: NU, nv: NV, closedU: true, vMap: (t) => t * t, inside: () => head.center.clone(), uv: (q, r) => [q * 1.6, r * 0.5] });
    // Normale iz površine glave (u, v), jer se ovde redovi mreže pozadi skupljaju
    const normals = shellGeo.getAttribute("normal");
    const pa = new THREE.Vector3();
    const pb = new THREE.Vector3();
    const pc = new THREE.Vector3();
    const pd = new THREE.Vector3();
    const nn = new THREE.Vector3();
    const e = 1.5e-3;
    let index = 0;
    for (let j = 0; j <= NV; j++) {
        const r = (j / NV) ** 2;
        for (let i = 0; i <= NU; i++, index++) {
            const [u, v] = toHead(i === NU ? 0 : i / NU, r);
            const vv = Math.min(maxV, Math.max(e, v));
            shell(u + e, vv, pa).sub(shell(u - e, vv, pb));
            shell(u, vv + e, pc).sub(shell(u, vv - e, pd));
            nn.crossVectors(pc, pa).normalize();
            normals.setXYZ(index, nn.x, nn.y, nn.z);
        }
    }
    kit.rigid("head", new THREE.Mesh(shellGeo, cloth));

    // Omotan kroj: drugi sloj marame ide koso ispod brade preko jedne strane glave ka potiljku,
    // sa jasnim naborom na gornjoj ivici — po tome se vidi da je marama omotana, a ne kapuljača
    if (style === "classic") {
        const n = new THREE.Vector3();
        const path: [number, number][] = [[0.5, 0.91], [0.6, 0.86], [0.68, 0.74], [0.73, 0.6], [0.79, 0.46], [0.87, 0.35], [0.97, 0.31]];
        const along = (s: number): [number, number] => {
            const x = Math.min(1, Math.max(0, s)) * (path.length - 1);
            const i = Math.min(path.length - 2, Math.floor(x));
            const t = x - i;
            const w = t * t * (3 - 2 * t);
            return [path[i][0] + (path[i + 1][0] - path[i][0]) * w, path[i][1] + (path[i + 1][1] - path[i][1]) * w];
        };
        const width = (s: number) => 0.15 * (0.55 + 0.45 * Math.sin(Math.min(1, s * 1.2 + 0.1) * Math.PI));
        const layer: SurfaceFn = (s, q, out) => {
            const [u0, v0] = along(s);
            // Poprečno: prema dole-napred (q = 0) do gornje ivice nabora (q = 1)
            const v = Math.min(maxV, Math.max(0.02, v0 + (0.5 - q) * width(s)));
            const u = u0 + (0.5 - q) * 0.03;
            shell(u, v, out);
            head.normal(u, v, n);
            const lift = 0.0015 + 0.009 * Math.pow(q, 2) * (1 - smoothstep(0.86, 1, q));
            const fade = smoothstep(0, 0.12, s) * smoothstep(1, 0.8, s);
            return out.addScaledVector(n, lift * fade);
        };
        const layerGeo = buildSurface(layer, { nu: 60, nv: 14, inside: () => head.center.clone(), uv: (s, q) => [s * 1.8, q * 0.4] });
        kit.rigid("head", new THREE.Mesh(layerGeo, cloth));
    }

    // Sportski kroj: svetlija rebrasta traka (kapica ispod) vidi se na čelu
    if (style === "sport") {
        const n = new THREE.Vector3();
        const bandGeo = ringTube((q, out) => {
            const psi = 0.12 + q * 0.76;
            const [u, v] = toHead(psi, 0);
            const [u2, v2] = toHead(psi, 0.004);
            head.point(u, v, out).lerp(head.point(u2, v2), 0.5);
            head.normal(u, v, n);
            return out.addScaledVector(n, 0.0035);
        }, () => [0.0035, 0.0055], 90, 8);
        kit.rigid("head", new THREE.Mesh(bandGeo, band));
    }

    // Deo preko vrata i ramena (prati telo): od brade koso do ramena; klasičan napred niže
    const hb = shape.headBoneY;
    const c = head.center;
    const yTop = hb + c.y - shape.head.h * 0.47;
    const yShoulder = shape.shoulderY + 0.004;
    const classic = style === "classic";
    const frontHem = classic ? shape.chestY - (child ? 0.03 : 0.055) : shape.shoulderY - (child ? 0.035 : 0.05);
    const backHem = classic ? shape.chestY + 0.02 : shape.shoulderY - 0.02;
    const sideHem = classic ? shape.shoulderY - 0.02 : shape.shoulderY - 0.008;
    const hemY = (a: number) => {
        const f = Math.pow(Math.abs(Math.cos(a)), classic ? 0.7 : 1.2);
        // Klasičan: blago šiljat napred (krajevi marame), sa strane kraći
        const point = classic ? -0.012 * Math.pow(Math.max(0, Math.cos(a)), 6) : 0;
        return (Math.cos(a) > 0 ? sideHem + (frontHem - sideHem) * f : sideHem + (backHem - sideHem) * f) + point;
    };
    const top = new THREE.Vector3();
    const env = new THREE.Vector3();
    const sh = new THREE.Vector3();
    // Presek ispod brade (glava + tkanina): elipsa ispred brade i iza potiljka
    const chinFront = c.z + shape.head.d * 0.2;
    const headBack = shape.head.d * 0.3 - c.z;
    const topHalf = shape.head.w * 0.36;
    const drape: SurfaceFn = (u, t, out) => {
        const a = u * Math.PI * 2;
        const y = yTop + (hemY(a) - yTop) * t;
        const sa = Math.sin(a);
        const ca = Math.cos(a);
        top.set(sa * topHalf, yTop, ca > 0 ? ca * chinFront : ca * headBack);
        torsoPoint(shape, a, yShoulder, outer, sh);
        const k = smoothstep(yTop, yShoulder, y);
        const cone = top.clone().lerp(sh, Math.pow(k, 0.85));
        if (y < shape.neckBaseY + 0.04) torsoPoint(shape, a, Math.min(y, shape.neckBaseY + 0.04), outer, env);
        else env.set(0, y, 0);
        // Nabori: od brade se šire ka ramenima (krupni), sitniji pri porubu
        const folds = 0.011 * Math.pow(t, 1.2) * Math.pow(Math.abs(Math.sin(a * 4.5 + 0.6)), 0.6) + 0.004 * t * Math.sin(a * 11 + 1.1) + 0.004 * Math.pow(t, 2) * Math.sin(a * 3);
        const r = Math.max(Math.hypot(cone.x, cone.z), Math.hypot(env.x, env.z)) + folds;
        const ang = Math.atan2(cone.x, cone.z);
        return out.set(Math.sin(ang) * r, y, Math.cos(ang) * r);
    };
    const drapeGeo = buildSurface(drape, {
        nu: 128,
        nv: 40,
        closedU: true,
        inside: (_u, t, out) => out.set(0, yTop + (shape.chestY - yTop) * t, 0),
        weights: (_u, _v, p) => torsoWeights(shape, p),
        uv: (u, v) => [u * 2.4, v * 0.6],
    });
    kit.skinned(drapeGeo, cloth, "hidzab");
    // Porub: tanak, mek (dvostruko presavijena ivica)
    const hem = ringTube((q, out) => drape(q, 1, out), () => [0.0022, 0.0034], 128, 6, (_u, _v, p) => torsoWeights(shape, p));
    kit.skinned(hem, cloth, "porub-hidzaba");
}
