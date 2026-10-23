// Mere tela dodatne životinje (BodyShape iz ugovora): crtani lik koji stoji uspravno —
// krupna glava (≈ 40 % visine), punački trup sa stomačićem, kratke ruke i noge. Odeća se
// kroji po ovim profilima (engine/kit.ts), pa su isti za telo i za odeću. Žirafa ima dug vrat
// (`neck`), slon širok trup, sova kratke noge — sve se zadaje brojevima ispod.

import type { BodyShape, CompanionKind } from "../../../contract";
import { profile } from "../../../engine/surface";

export interface ShapeParams {
    kind: CompanionKind;
    /** Dužina noge od kuka do članka (m) */
    leg?: number;
    /** Trup od međunožja do vrata (m) */
    torso?: number;
    /** Širina i dubina trupa (umnožak) */
    girth?: number;
    /** Stomačić napred (umnožak) */
    belly?: number;
    /** Kruška: širi kukovi i stomak, uža ramena (0–1) */
    pear?: number;
    /** Glava: širina, visina, dubina (m) — približno, za kadar i kapu */
    head?: { w: number; h: number; d: number };
    /** Vrat iznad ramena (m) — dug kod žirafe */
    neck?: number;
    /** Poluprečnik vrata (m) */
    neckR?: number;
    /** Ruka (nadlaktica + podlaktica, m) i debljina udova (umnožak) */
    arm?: number;
    limb?: number;
    /** Stopalo (dužina, širina, visina, peta iza članka) */
    foot?: { len: number; w: number; h: number; back: number };
    /** Šaka (umnožak poluprečnika zgloba) */
    hand?: number;
}

/** Ugao ruke od tela tako da lakat ne ulazi u stomak */
function armAngleFor(torsoW: (y: number) => number, shoulderX: number, shoulderY: number, upper: number, r: number): number {
    for (let a = 0.1; a < 0.9; a += 0.01) {
        const elbowX = shoulderX + Math.sin(a) * upper;
        const elbowY = shoulderY - Math.cos(a) * upper;
        const midX = shoulderX + Math.sin(a) * upper * 0.5;
        const midY = shoulderY - Math.cos(a) * upper * 0.5;
        if (elbowX - r > torsoW(elbowY) + 0.006 && midX - r > torsoW(midY) - 0.012) return a;
    }
    return 0.9;
}

export function extraShape(p: ShapeParams): BodyShape {
    const leg = p.leg ?? 0.27;
    const T = p.torso ?? 0.31;
    const g = p.girth ?? 1;
    const belly = p.belly ?? 1;
    const pear = p.pear ?? 0;
    const limb = p.limb ?? 1;
    const head = p.head ?? { w: 0.42, h: 0.38, d: 0.38 };
    const foot = p.foot ?? { len: 0.14, w: 0.085, h: 0.064, back: 0.038 };
    const neck = p.neck ?? 0;
    const ankleY = 0.058;
    const thigh = leg * 0.5;
    const shin = leg - thigh;
    const hipY = ankleY + leg;
    const crotchY = hipY - 0.04;
    const y = (t: number) => crotchY + T * t;
    const waistY = y(0.36);
    const chestY = y(0.62);
    const shoulderY = y(0.82);
    const neckBaseY = y(0.93) + neck;
    const headBoneY = neckBaseY + 0.03;
    const neckR = p.neckR ?? 0.058 * Math.max(1, g * 0.92);
    const lower = 1 + pear * 0.22;
    const upperK = 1 - pear * 0.12;
    // Vrat (dug kod žirafe): od ramena do glave, blago se sužava
    const neckPts: [number, number][] = neck > 0
        ? [[y(0.93), neckR * 1.25], [y(0.93) + neck * 0.5, neckR * 1.06], [neckBaseY, neckR], [neckBaseY + 0.25, neckR * 0.98]]
        : [[y(0.95), neckR + 0.006], [y(1.2), neckR]];
    const torsoW = profile([
        [y(-0.06), 0.072 * g * lower],
        [y(0.03), 0.114 * g * lower],
        [y(0.15), 0.13 * g * lower],
        [y(0.35), 0.134 * g * (1 + pear * 0.14)],
        [y(0.55), 0.126 * g * upperK],
        [y(0.72), 0.117 * g * upperK],
        [y(0.82), 0.109 * g * upperK],
        [y(0.88), Math.max(neckR + 0.02, 0.092 * Math.max(1, g * upperK * 0.96))],
        ...neckPts,
    ]);
    const neckF: [number, number][] = neck > 0
        ? [[y(0.97), neckR * 1.2], [y(0.93) + neck * 0.5, neckR * 1.04], [neckBaseY, neckR * 0.98], [neckBaseY + 0.25, neckR * 0.95]]
        : [[y(0.97), neckR], [y(1.2), neckR - 0.002]];
    const torsoFront = profile([
        [y(-0.06), 0.052 * g],
        [y(0.05), 0.088 * g],
        [y(0.25), 0.108 * g * belly],
        [y(0.45), 0.106 * g * belly],
        [y(0.62), 0.092 * g],
        [y(0.8), 0.074 * g],
        [y(0.9), Math.max(neckR + 0.004, 0.062)],
        ...neckF,
    ]);
    const torsoBack = profile([
        [y(-0.06), 0.057 * g],
        [y(0.06), 0.094 * g * lower],
        [y(0.25), 0.086 * g],
        [y(0.5), 0.076 * g],
        [y(0.7), 0.076 * g],
        [y(0.82), 0.072 * g],
        [y(0.9), Math.max(neckR + 0.002, 0.062)],
        ...neckF,
    ]);
    const armLen = p.arm ?? 0.23;
    const upperArm = armLen * 0.52;
    const forearm = armLen - upperArm;
    const armR = profile([[0, 0.044 * limb], [0.2, 0.042 * limb], [0.5, 0.038 * limb], [0.8, 0.036 * limb], [1, 0.033 * limb]]);
    const shoulderX = torsoW(shoulderY) * 0.98 + 0.004;
    const armAngle = armAngleFor(torsoW, shoulderX, shoulderY - 0.012, upperArm, armR(0.5));
    const hipX = 0.068 * g * lower;
    const legR = profile([[0, 0.066 * limb * Math.max(1, g * 0.95)], [0.3, 0.058 * limb], [0.55, 0.051 * limb], [0.8, 0.047 * limb], [1, 0.043 * limb]]);
    const up = head.h / 2 - 0.03;
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
        hand: p.hand ?? 1.6,
        hipX,
        thigh,
        shin,
        legR,
        ankleY,
        foot,
        height: headBoneY + up + head.h / 2,
    };
}
