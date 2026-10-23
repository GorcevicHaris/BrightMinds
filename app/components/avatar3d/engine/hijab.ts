// Hidžab (deo izgleda čoveka, uvek besplatan): tkanina uokviruje lice, pokriva kosu, uši i
// vrat i pada preko ramena (prati telo). Pravi ga motor, ne katalog: kapa i ostali predmeti
// se nose PREKO hidžaba (sidra glave su uvećana za debljinu hidžaba).

import * as THREE from "three";
import { torsoPoint } from "./body";
import type { HeadInfo } from "./head";
import type { Kit } from "./kit";
import { fabricMaterial } from "./materials";
import { torsoWeights } from "./rig";
import { buildSurface, polyPath, ringTube, smoothstep, taperedTube, type SurfaceFn } from "./surface";

const gauss = (x: number, mu: number, s: number) => Math.exp(-((x - mu) ** 2) / (2 * s * s));
const thetaOf = (u: number) => (u - 0.5) * Math.PI * 2;

/** Koliko hidžab dodaje glavi (kapa sedi iznad toga), u metrima */
export const HIJAB_THICKNESS = 0.03;

/** Hidžab: tkanina uokviruje lice (čelo, obrazi, brada), pokriva kosu, uši i vrat i pada preko ramena */
export function buildHijab(kit: Kit, head: HeadInfo, hex: string, outer = 0.03) {
    const rig = kit.ctx.rig;
    const shape = rig.shape;
    const cloth = fabricMaterial(hex, "cotton", { roughness: 0.7, sheen: 0.8, sheenLift: 0.3, normalScale: 0.3, side: THREE.DoubleSide });
    const child = shape.kind === "girl" || shape.kind === "boy";
    // Otvor za lice: elipsa u (θ, v)
    const tw = child ? 1.1 : 1.04;
    const vc = 0.6;
    const vh = child ? 0.292 : 0.3;
    const open = (u: number, v: number) => {
        const th = thetaOf(u);
        const dv = v - vc;
        // Ispod brade otvor je uži (tkanina se skuplja ispod brade)
        const k = dv > 0 ? 1 + dv * 1.2 : 1;
        return Math.pow(th / (tw / k), 2) + Math.pow(dv / vh, 2);
    };
    const thick = (u: number, v: number) => {
        const th = thetaOf(u);
        return 0.026 + 0.009 * gauss(Math.abs(th), Math.PI, 0.9) * gauss(v, 0.4, 0.16) + 0.004 * (1 - smoothstep(0.1, 0.4, v));
    };
    const offset = (u: number, v: number) => {
        const f = open(u, v);
        const k = smoothstep(1.0, 1.16, f);
        return -0.006 + (thick(u, v) + 0.006) * k;
    };
    const maxV = 0.93;
    const shell = head.offsetFn(offset);
    const shellGeo = buildSurface((u, v, out) => shell(u, v * maxV, out), { nu: 112, nv: 84, closedU: true, inside: () => head.center.clone(), uv: (u, v) => [u * 2.2, v * 1.4] });
    kit.rigid("head", new THREE.Mesh(shellGeo, cloth));
    // Rub oko lica: blago uvijena ivica tkanine
    const rim: THREE.Vector3[] = [];
    const n = new THREE.Vector3();
    for (let i = 0; i <= 80; i++) {
        const ang = (i / 80) * Math.PI * 2;
        // Kontura f = 1,08 u (θ, v)
        let th = Math.cos(ang) * tw * 1.04;
        let v = vc - Math.sin(ang) * vh * 1.04;
        const dv = v - vc;
        if (dv > 0) th /= 1 + dv * 1.2;
        v = Math.min(maxV, v);
        th = Math.max(-Math.PI, Math.min(Math.PI, th));
        const u = th / (Math.PI * 2) + 0.5;
        const p = head.point(u, v);
        head.normal(u, v, n);
        rim.push(p.addScaledVector(n, thick(u, v) * 0.55));
    }
    const rimGeo = taperedTube(polyPath(rim), () => 0.0062, 160, 10);
    kit.rigid("head", new THREE.Mesh(rimGeo, cloth));

    // Deo preko vrata i ramena (prati telo): od brade koso do ramena, napred niže
    const hb = shape.headBoneY;
    const c = head.center;
    const yTop = hb + c.y - shape.head.h * 0.47;
    const yShoulder = shape.shoulderY + 0.004;
    const frontHem = shape.chestY - 0.005;
    const backHem = shape.chestY + 0.01;
    const sideHem = shape.shoulderY - 0.012;
    const hemY = (a: number) => {
        const f = Math.pow(Math.abs(Math.cos(a)), 0.8);
        return Math.cos(a) > 0 ? sideHem + (frontHem - sideHem) * f : sideHem + (backHem - sideHem) * f;
    };
    const top = new THREE.Vector3();
    const env = new THREE.Vector3();
    const sh = new THREE.Vector3();
    // Presek ispod brade (glava + tkanina): elipsa ispred brade i iza potiljka
    const chinFront = c.z + shape.head.d * 0.19;
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
        const r = Math.max(Math.hypot(cone.x, cone.z), Math.hypot(env.x, env.z)) + 0.004 * t * Math.sin(a * 11) + 0.003 * Math.sin(a * 5) * t;
        const ang = Math.atan2(cone.x, cone.z);
        return out.set(Math.sin(ang) * r, y, Math.cos(ang) * r);
    };
    const drapeGeo = buildSurface(drape, {
        nu: 96,
        nv: 36,
        closedU: true,
        inside: (_u, t, out) => out.set(0, yTop + (shape.chestY - yTop) * t, 0),
        weights: (_u, _v, p) => torsoWeights(shape, p),
        uv: (u, v) => [u * 2.4, v * 0.6],
    });
    kit.skinned(drapeGeo, cloth, "hidzab");
    const hem = ringTube((q, out) => drape(q, 1, out), () => [0.0035, 0.004], 96, 6, (_u, _v, p) => torsoWeights(shape, p));
    kit.skinned(hem, cloth, "porub-hidzaba");
}

