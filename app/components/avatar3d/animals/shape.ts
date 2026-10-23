// Mere tela životinje (BodyShape iz ugovora): crtani lik koji stoji uspravno, krupna glava
// (≈ 40 % visine), punački trup sa stomačićem, kratke ruke i noge. Odeća se kroji po ovim
// profilima (engine/kit.ts), pa su isti za telo i za odeću.

import type { BodyShape } from "../contract";
import type { AnimalKind } from "../data";
import { profile } from "../engine/surface";

export interface ShapeParams {
    kind: AnimalKind;
    /** Dužina noge (butina + potkolenica) */
    leg?: number;
    /** Trup od međunožja do vrata */
    torso?: number;
    /** Širina trupa (umnožak) */
    girth?: number;
    /** Stomačić napred (umnožak) */
    belly?: number;
    /** Glava: širina, visina, dubina (m) */
    head?: { w: number; h: number; d: number };
    foot?: { len: number; w: number; h: number; back: number };
    /** Dužina ruke (nadlaktica + podlaktica) */
    arm?: number;
    /** Debljina ruku i nogu (umnožak) */
    limb?: number;
    /** Kruška: širi kukovi, uža ramena (pingvin) */
    pear?: number;
}

/** Ugao ruke od tela tako da lakat i zglob ne ulaze u stomak */
function armAngleFor(torsoW: (y: number) => number, shoulderX: number, shoulderY: number, upper: number, r: number): number {
    for (let a = 0.12; a < 0.9; a += 0.01) {
        const elbowX = shoulderX + Math.sin(a) * upper;
        const elbowY = shoulderY - Math.cos(a) * upper;
        if (elbowX - r > torsoW(elbowY) + 0.008) return a;
    }
    return 0.9;
}

export function animalShape(p: ShapeParams): BodyShape {
    const leg = p.leg ?? 0.3;
    const T = p.torso ?? 0.32;
    const g = p.girth ?? 1;
    const belly = p.belly ?? 1;
    const pear = p.pear ?? 0;
    const limb = p.limb ?? 1;
    const head = p.head ?? { w: 0.44, h: 0.4, d: 0.4 };
    const foot = p.foot ?? { len: 0.135, w: 0.082, h: 0.062, back: 0.036 };
    const ankleY = 0.06;
    const thigh = leg * 0.5;
    const shin = leg - thigh;
    const hipY = ankleY + thigh + shin;
    const crotchY = hipY - 0.04;
    const y = (t: number) => crotchY + T * t;
    const waistY = y(0.36);
    const chestY = y(0.62);
    const shoulderY = y(0.82);
    const neckBaseY = y(0.93);
    const headBoneY = neckBaseY + 0.03;
    const neckR = 0.056 * Math.max(1, g * 0.92);
    const lower = 1 + pear * 0.22;
    const upperK = 1 - pear * 0.12;
    const torsoW = profile([
        [y(-0.06), 0.07 * g * lower],
        [y(0.03), 0.112 * g * lower],
        [y(0.15), 0.128 * g * lower],
        [y(0.35), 0.132 * g * (1 + pear * 0.14)],
        [y(0.55), 0.124 * g * upperK],
        [y(0.72), 0.115 * g * upperK],
        [y(0.82), 0.108 * g * upperK],
        [y(0.88), 0.09 * Math.max(1, g * upperK * 0.96)],
        [y(0.95), neckR + 0.006],
        [y(1.2), neckR],
    ]);
    const torsoFront = profile([
        [y(-0.06), 0.05 * g],
        [y(0.05), 0.085 * g],
        [y(0.25), 0.104 * g * belly],
        [y(0.45), 0.104 * g * belly],
        [y(0.62), 0.09 * g],
        [y(0.8), 0.072 * g],
        [y(0.9), 0.06],
        [y(0.97), neckR],
        [y(1.2), neckR - 0.002],
    ]);
    const torsoBack = profile([
        [y(-0.06), 0.055 * g],
        [y(0.06), 0.092 * g * lower],
        [y(0.25), 0.084 * g],
        [y(0.5), 0.074 * g],
        [y(0.7), 0.074 * g],
        [y(0.82), 0.07 * g],
        [y(0.9), 0.06],
        [y(0.97), neckR],
        [y(1.2), neckR - 0.002],
    ]);
    const armLen = p.arm ?? 0.235;
    const upperArm = armLen * 0.52;
    const forearm = armLen - upperArm;
    const armR = profile([[0, 0.043 * limb], [0.2, 0.041 * limb], [0.5, 0.037 * limb], [0.8, 0.035 * limb], [1, 0.032 * limb]]);
    const shoulderX = torsoW(shoulderY) * 0.98 + 0.004;
    const armAngle = armAngleFor(torsoW, shoulderX, shoulderY - 0.012, upperArm, armR(0.5));
    const hipX = 0.066 * g * lower;
    const legR = profile([[0, 0.064 * limb * g], [0.3, 0.057 * limb], [0.55, 0.05 * limb], [0.8, 0.046 * limb], [1, 0.042 * limb]]);
    const up = head.h / 2 - 0.028;
    return {
        kind: p.kind,
        proportion: "animal",
        crotchY,
        hipY,
        waistY,
        chestY,
        shoulderY,
        neckBaseY,
        headBoneY,
        head: { w: head.w, h: head.h, d: head.d, up, fwd: 0.012, chin: 0.9, cheeks: 1 },
        torsoW,
        torsoFront,
        torsoBack,
        bust: 0,
        neckR,
        shoulderX,
        armAngle,
        upperArm,
        forearm,
        armR,
        hand: 1.6,
        hipX,
        thigh,
        shin,
        legR,
        ankleY,
        foot,
        height: headBoneY + up + head.h / 2,
    };
}
