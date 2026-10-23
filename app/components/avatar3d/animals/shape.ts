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
    /** Duži vrat (m, žirafa) i poluprečnik vrata */
    neck?: number;
    neckR?: number;
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
    const leg = p.leg ?? 0.22;
    const T = p.torso ?? 0.3;
    const g = p.girth ?? 1;
    const belly = p.belly ?? 1;
    const pear = p.pear ?? 0;
    const limb = p.limb ?? 1;
    const head = p.head ?? { w: 0.44, h: 0.4, d: 0.4 };
    const foot = p.foot ?? { len: 0.15, w: 0.096, h: 0.066, back: 0.04 };
    const ankleY = 0.06;
    const thigh = leg * 0.5;
    const shin = leg - thigh;
    const hipY = ankleY + thigh + shin;
    const crotchY = hipY - 0.04;
    const y = (t: number) => crotchY + T * t;
    const waistY = y(0.36);
    const chestY = y(0.62);
    const shoulderY = y(0.82);
    const neck = p.neck ?? 0;
    const neckBaseY = y(0.93) + neck;
    const headBoneY = neckBaseY + 0.03;
    const neckR = p.neckR ?? 0.062 * Math.max(1, g * 0.92);
    // Vrat iznad ramena: od ≈ 1,25 × poluprečnika kod ramena do poluprečnika kod glave
    const neckPts = (r: number): [number, number][] => neck > 0
        ? [[y(0.97) + neck * 0.35, r * 1.18], [neckBaseY + 0.02, r], [neckBaseY + 0.25, r]]
        : [[y(1.2), r]];
    const lower = 1 + pear * 0.22;
    const upperK = 1 - pear * 0.12;
    const torsoW = profile([
        [y(-0.06), 0.08 * g * lower],
        [y(0.03), 0.125 * g * lower],
        [y(0.15), 0.143 * g * lower],
        [y(0.35), 0.147 * g * (1 + pear * 0.14)],
        [y(0.55), 0.138 * g * upperK],
        [y(0.72), 0.126 * g * upperK],
        [y(0.82), 0.116 * g * upperK],
        [y(0.88), 0.098 * Math.max(1, g * upperK * 0.96)],
        [y(0.95), neckR + 0.006],
        ...neckPts(neckR),
    ]);
    const torsoFront = profile([
        [y(-0.06), 0.056 * g],
        [y(0.05), 0.095 * g],
        [y(0.25), 0.118 * g * belly],
        [y(0.45), 0.118 * g * belly],
        [y(0.62), 0.1 * g],
        [y(0.8), 0.08 * g],
        [y(0.9), 0.066],
        [y(0.97), neckR],
        ...neckPts(neckR - 0.002),
    ]);
    const torsoBack = profile([
        [y(-0.06), 0.06 * g],
        [y(0.06), 0.1 * g * lower],
        [y(0.25), 0.094 * g],
        [y(0.5), 0.083 * g],
        [y(0.7), 0.082 * g],
        [y(0.82), 0.078 * g],
        [y(0.9), 0.066],
        [y(0.97), neckR],
        ...neckPts(neckR - 0.002),
    ]);
    const armLen = p.arm ?? 0.2;
    const upperArm = armLen * 0.52;
    const forearm = armLen - upperArm;
    const armR = profile([[0, 0.05 * limb], [0.2, 0.048 * limb], [0.5, 0.044 * limb], [0.8, 0.042 * limb], [1, 0.039 * limb]]);
    const shoulderX = torsoW(shoulderY) - armR(0) * 0.5;
    const armAngle = armAngleFor(torsoW, shoulderX, shoulderY - 0.012, upperArm, armR(0.5));
    const hipX = 0.072 * g * lower;
    const legR = profile([[0, 0.074 * limb * g], [0.3, 0.068 * limb], [0.55, 0.062 * limb], [0.8, 0.058 * limb], [1, 0.054 * limb]]);
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
