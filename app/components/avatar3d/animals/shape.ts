// Mere tela životinje (BodyShape iz ugovora): crtani lik u stilu Bitmoji-ja — uspravan,
// proporcije kao kod deteta iz motora (duže noge i ruke, glava ≈ 30 % visine), malo punačkiji
// trup. Odeća se kroji po ovim profilima (engine/kit.ts), pa su isti za telo i za odeću.

import type { BodyShape } from "../contract";
import type { AnimalKind } from "../data";
import { profile } from "../engine/surface";

export interface ShapeParams {
    /** Vrsta (dodatne vrste iz extra/ daju svoj id) */
    kind: AnimalKind | string;
    /** Dužina noge (butina + potkolenica), m */
    leg?: number;
    /** Trup od međunožja do vrata, m */
    torso?: number;
    /** Širina trupa (umnožak) */
    girth?: number;
    /** Stomak napred (umnožak) */
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
    /** Srazmerna podešavanja podrazumevanih mera (1 = bez promene); apsolutne mere iznad imaju prednost */
    headK?: number;
    legK?: number;
    armK?: number;
    torsoK?: number;
}

/** Ugao ruke od tela tako da lakat i zglob ne ulaze u trup */
function armAngleFor(torsoW: (y: number) => number, shoulderX: number, shoulderY: number, upper: number, r: number): number {
    for (let a = 0.1; a < 0.9; a += 0.01) {
        const elbowX = shoulderX + Math.sin(a) * upper;
        const elbowY = shoulderY - Math.cos(a) * upper;
        if (elbowX - r > torsoW(elbowY) + 0.006) return a;
    }
    return 0.9;
}

export function animalShape(p: ShapeParams): BodyShape {
    const leg = p.leg ?? 0.39 * (p.legK ?? 1);
    const T = p.torso ?? 0.38 * (p.torsoK ?? 1);
    const g = p.girth ?? 1;
    const belly = p.belly ?? 1;
    const pear = p.pear ?? 0;
    const limb = p.limb ?? 1;
    const hk = p.headK ?? 1;
    const head = p.head ?? { w: 0.37 * hk, h: 0.34 * hk, d: 0.35 * hk };
    const foot = p.foot ?? { len: 0.16, w: 0.078, h: 0.066, back: 0.04 };
    const ankleY = 0.062;
    const thigh = leg * 0.5;
    const shin = leg - thigh;
    const hipY = ankleY + thigh + shin;
    const crotchY = hipY - 0.042;
    const y = (t: number) => crotchY + T * t;
    const waistY = y(0.36);
    const chestY = y(0.62);
    const shoulderY = y(0.84);
    const neck = p.neck ?? 0;
    // Vrat počinje na ramenima (kragne i marame ostaju tu); dug vrat podiže kost glave
    const neckBaseY = y(0.95);
    const headBoneY = neckBaseY + 0.03 + neck;
    const neckR = p.neckR ?? 0.052 * Math.max(1, g * 0.95);
    // Vrat iznad ramena: od ≈ 1,2 × poluprečnika kod ramena do poluprečnika kod glave
    const neckPts = (r: number): [number, number][] => neck > 0
        ? [[y(0.99) + neck * 0.35, r * 1.18], [neckBaseY + neck + 0.02, r], [headBoneY + 0.25, r]]
        : [[y(1.25), r]];
    const lower = 1 + pear * 0.22;
    const upperK = 1 - pear * 0.12;
    const torsoW = profile([
        [y(-0.06), 0.07 * g * lower],
        [y(0.04), 0.104 * g * lower],
        [y(0.14), 0.116 * g * lower],
        [y(0.34), 0.11 * g * (1 + pear * 0.14)],
        [y(0.55), 0.106 * g * upperK],
        [y(0.72), 0.108 * g * upperK],
        [y(0.84), 0.11 * g * upperK],
        [y(0.9), 0.086 * Math.max(1, g * upperK * 0.96)],
        [y(0.96), neckR + 0.004],
        ...neckPts(neckR),
    ]);
    const torsoFront = profile([
        [y(-0.06), 0.048 * g],
        [y(0.05), 0.074 * g],
        [y(0.26), 0.084 * g * belly],
        [y(0.45), 0.082 * g * belly],
        [y(0.62), 0.078 * g],
        [y(0.8), 0.068 * g],
        [y(0.9), 0.056],
        [y(0.98), neckR],
        ...neckPts(neckR - 0.002),
    ]);
    const torsoBack = profile([
        [y(-0.06), 0.05 * g],
        [y(0.06), 0.08 * g * lower],
        [y(0.25), 0.072 * g],
        [y(0.5), 0.064 * g],
        [y(0.7), 0.068 * g],
        [y(0.84), 0.066 * g],
        [y(0.9), 0.056],
        [y(0.98), neckR],
        ...neckPts(neckR - 0.002),
    ]);
    const armLen = p.arm ?? 0.3 * (p.armK ?? 1);
    const upperArm = armLen * 0.52;
    const forearm = armLen - upperArm;
    const armR = profile([[0, 0.044 * limb], [0.12, 0.042 * limb], [0.3, 0.038 * limb], [0.5, 0.034 * limb], [0.62, 0.036 * limb], [0.75, 0.035 * limb], [0.9, 0.031 * limb], [1, 0.028 * limb]]);
    const shoulderX = torsoW(shoulderY) - armR(0) * 0.45;
    const armAngle = armAngleFor(torsoW, shoulderX, shoulderY - 0.012, upperArm, armR(0.5));
    const hipX = 0.062 * g * lower;
    const legR = profile([[0, 0.064 * limb * g], [0.2, 0.058 * limb], [0.44, 0.047 * limb], [0.5, 0.045 * limb], [0.62, 0.047 * limb], [0.7, 0.047 * limb], [0.86, 0.038 * limb], [1, 0.033 * limb]]);
    // Glava malo iznad ramena: vidi se kratak krzneni vrat
    const up = head.h / 2 - 0.012;
    return {
        kind: p.kind as AnimalKind,
        proportion: "animal",
        crotchY,
        hipY,
        waistY,
        chestY,
        shoulderY,
        neckBaseY,
        headBoneY,
        head: { w: head.w, h: head.h, d: head.d, up, fwd: 0.01, chin: 0.9, cheeks: 1 },
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
        hand: 1.7,
        hipX,
        thigh,
        shin,
        legR,
        ankleY,
        foot,
        height: headBoneY + up + head.h / 2,
    };
}
