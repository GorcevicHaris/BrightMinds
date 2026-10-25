// Ljudski drugari (devojčica, dečak, učiteljica, učitelj, tinejdžeri, nana, dedo i likovi sa
// hidžabom: devojčica, tinejdžerka, mama) po ugovoru: telo, glava sa licem,
// kosa i hidžab iz izgleda (looks.ts, uvek besplatno), sidra za predmete. Odeću (i osnovnu
// odeću kad mesto ostane prazno) dodaje Figure (figure.ts).

import * as THREE from "three";
import type { HairStyle } from "../catalog";
import { registerCompanion, type Anchors, type CompanionBuilder, type FigureBody, type FigureContext, type HeadSurface } from "../contract";
import { HUMAN_KINDS, type HumanKind } from "../data";
import { EYE_COLORS, HAIR_COLORS, HIJAB_COLORS, HUMAN_DEFAULT, NO_BEARD, SKIN_TONES, alwaysHijab, hairShape, hasBeardOption, hijabParts, humanLook, partHex, type HumanLook } from "../looks";
import { buildBody } from "./body";
import { buildBeard, buildHair, hairCrown, type BeardStyle } from "./hair";
import { buildHead, EAR_U, EAR_V, headInfo, type HeadInfo } from "./head";
import { buildHijab, hijabOuter, hijabThickness, HIJAB_THICKNESS } from "./hijab";
import { Kit } from "./kit";
import { withDetail } from "./detail";
import { disposeObject, skinMaterial } from "./materials";
import { bodyShape, createRig, type Rig } from "./rig";

/** Ljudsko telo ima i ono što životinje nemaju: kosu koja se prilagođava kapi */
export interface HumanBody extends FigureBody {
    look: HumanLook;
    /** Površina glave (koža) — za osnovnu odeću i hidžab */
    headInfo: HeadInfo;
    /** Kosa ispod kape je niža (ili je nema ispod hidžaba); vraća visinu kose iznad temena */
    setHeadwear: (underHat: boolean) => number;
    /** Hidžab je deo izgleda: boja (hex) ili null */
    hijab: string | null;
    /** Deo hidžaba preko ramena se ponovo kroji po odeći ispod (majica, duks, jakna) */
    fitHijab: (outfit: string | undefined) => void;
}

const HAIR_STYLE: Record<string, HairStyle | null> = {
    short: "short",
    curly: "curly",
    long: "long",
    shoulder: "long",
    ponytail: "ponytail",
    braids: "braids",
    buzz: "buzz",
    bun: "bun",
    messy: "messy",
    swept: "swept",
    wavy: "wavy",
    straight: "straight",
    puffs: "puffs",
    cornrows: "cornrows",
    bob: "bob",
    pixie: "pixie",
    highbun: "highbun",
    curlylong: "curlylong",
    sidepart: "sidepart",
    spiky: "spiky",
    fade: "fade",
    pigtails: "pigtails",
    receding: "receding",
    afro: "afro",
    none: null,
};

/** Površina glave za predmete (u koordinatama kosti glave); uz hidžab je uvećana tačno za tkaninu */
function headSurface(info: HeadInfo, hijab: boolean): HeadSurface {
    if (!hijab) return { center: info.center.clone(), point: info.point, normal: info.normal };
    const n = new THREE.Vector3();
    return {
        center: info.center.clone(),
        // + 1,5 mm da kapa ne dodiruje tkaninu
        point: (u, v, out = new THREE.Vector3()) => info.point(u, v, out).addScaledVector(info.normal(u, v, n), hijabThickness(info.shape, u, v) + 0.0015),
        normal: info.normal,
    };
}

/** Sidra ljudskog tela (prostor tela, mirovanje); uz hidžab je glava veća za njegovu debljinu */
function humanAnchors(rig: Rig, info: HeadInfo, hijab: boolean): Anchors {
    const shape = rig.shape;
    const headAt = new THREE.Vector3(0, shape.headBoneY, 0);
    const body = (p: THREE.Vector3) => p.clone().add(headAt);
    const T = hijab ? HIJAB_THICKNESS : 0;
    const { w, h, d } = shape.head;
    const center = body(info.center);
    const at = (u: number, v: number) => body(info.point(u, v));
    const ear = (side: 1 | -1) => at(0.5 + side * EAR_U, EAR_V);
    const eye = (side: 1 | -1) => at(0.5 + side * info.eyeU, info.eyeV);
    const tipOf = (p: THREE.Vector3) => p.clone().add(new THREE.Vector3(0, 0.03, 0));
    const earL = ear(1);
    const earR = ear(-1);
    const dims = (y: number) => ({ w: shape.torsoW(y), front: shape.torsoFront(y), back: shape.torsoBack(y) });
    const backY = (shape.shoulderY + shape.chestY) / 2;
    const handScale = 0.95 * shape.hand;
    const toe = (side: 1 | -1) => {
        const ankle = side === 1 ? rig.left.ankle : rig.right.ankle;
        return new THREE.Vector3(ankle.x, 0.012, ankle.z + shape.foot.len - shape.foot.back);
    };
    return {
        ground: new THREE.Vector3(0, 0, 0),
        height: shape.height,
        head: {
            center,
            top: center.clone().add(new THREE.Vector3(0, h / 2 + T, 0)),
            radius: Math.max(w, h, d) / 2 + T,
            w: w + 2 * T,
            h: h + T,
            d: d + 2 * T,
            front: center.z + d / 2,
            brimY: center.y + h * 0.17,
            brimR: (Math.max(w, d) / 2) * 1.02 + T,
        },
        ears: { kind: hijab ? "none" : "human", left: earL, right: earR, tipL: tipOf(earL), tipR: tipOf(earR), radius: 0.02 },
        eyes: { left: eye(1), right: eye(-1), radius: info.eyeR, front: eye(1).z + info.eyeR * 0.3 },
        nose: { bridge: at(0.5, info.eyeV + 0.015), tip: at(0.5, 0.63), snout: 0 },
        mouth: at(0.5, info.mouthV + 0.01),
        neck: {
            center: new THREE.Vector3(0, (shape.neckBaseY + shape.headBoneY) / 2, 0),
            radius: shape.neckR + (hijab ? 0.028 : 0),
            y0: shape.neckBaseY - 0.012,
            y1: shape.headBoneY + 0.012,
        },
        torso: {
            shoulderY: shape.shoulderY,
            chestY: shape.chestY,
            waistY: shape.waistY,
            hipY: shape.hipY,
            crotchY: shape.crotchY,
            chest: dims(shape.chestY),
            waist: dims(shape.waistY),
        },
        shoulders: { left: rig.left.shoulder.clone(), right: rig.right.shoulder.clone() },
        arms: { upper: shape.upperArm, fore: shape.forearm, radius: shape.armR(0), wristRadius: shape.armR(1) },
        hips: { left: rig.left.hip.clone(), right: rig.right.hip.clone() },
        legs: { thigh: shape.thigh, shin: shape.shin, radius: shape.legR(0), ankleRadius: shape.legR(1) },
        hands: { kind: "hand", left: rig.left.wrist.clone(), right: rig.right.wrist.clone(), radius: 0.02 * handScale, grip: new THREE.Vector3(0, -0.028 * handScale, 0.012 * handScale) },
        feet: { kind: "foot", left: rig.left.ankle.clone(), right: rig.right.ankle.clone(), toeL: toe(1), toeR: toe(-1), len: shape.foot.len, w: shape.foot.w, h: shape.foot.h },
        back: {
            center: new THREE.Vector3(0, backY, -shape.torsoBack(backY)),
            normal: new THREE.Vector3(0, 0, -1),
            width: 2 * shape.torsoW(shape.chestY),
            height: shape.shoulderY - shape.waistY,
            capeTop: new THREE.Vector3(0, shape.shoulderY, -shape.torsoBack(shape.shoulderY)),
        },
        // Ljubimac stoji gledaocu desno (+x), predmet u ruci je gledaocu levo (desna šaka lika)
        petSpot: new THREE.Vector3(shape.shoulderX + 0.32 * (shape.height / 1.2), 0, 0.12),
        petScale: shape.height / 1.2,
    };
}

export function buildHuman(kind: HumanKind, look: HumanLook, ctx: FigureContext): HumanBody {
    // Sličice: ista figura sa ~60 % podela (manje trouglova); živi prikaz: puna gustina
    return withDetail(ctx.quality === "low" ? 0.6 : 1, () => buildHumanAt(kind, look, ctx));
}

function buildHumanAt(kind: HumanKind, look: HumanLook, ctx: FigureContext): HumanBody {
    const shape = bodyShape(kind);
    const rig = createRig(shape);
    const root = new THREE.Group();
    root.name = `drugar-${kind}`;
    root.add(rig.root);
    const tone = partHex(SKIN_TONES, look.tone);
    const hairHex = partHex(HAIR_COLORS, look.hair);
    // Lik sa hidžabom ga nosi uvek (i kad izgled stigne bez njega)
    const hijab = hijabParts(look.hijab) ?? (alwaysHijab(kind) ? hijabParts(HUMAN_DEFAULT[kind].hijab) : null);
    const hijabHex = hijab ? partHex(HIJAB_COLORS, hijab.color) : null;

    const meshes = buildBody(rig, skinMaterial(tone), { feet: true, torsoSkin: skinMaterial(tone, true) });
    for (const mesh of meshes.skinned) root.add(mesh);
    const info = headInfo(shape);
    const freckles = look.freckles === "vise" ? 2 : look.freckles === "malo" ? 1 : 0;
    const face = buildHead(info, tone, partHex(EYE_COLORS, look.eye), hairHex, "neutral", { freckles });
    rig.bone("head").add(face.group);
    // Brada i brkovi (učitelj, dedo) su deo lica: idu uz glavu i ispod kape
    if (look.beard && look.beard !== NO_BEARD && hasBeardOption(kind)) face.group.add(buildBeard(info, hairHex, tone, look.beard as BeardStyle));

    // Hidžab: deo tela (izgled), ne predmet; uši i kosa se ispod njega ne crtaju. Deo preko
    // ramena se kroji po odeći ispod, pa se ponovo pravi kad se odeća promeni
    const hijabObjects: THREE.Object3D[] = [];
    let hijabFit = -1;
    const fitHijab = (outfit: string | undefined) => {
        const outer = hijabOuter(outfit);
        if (!hijabHex || Math.abs(outer - hijabFit) < 1e-5) return;
        for (const object of hijabObjects) {
            object.removeFromParent();
            disposeObject(object);
        }
        hijabObjects.length = 0;
        withDetail(ctx.quality === "low" ? 0.6 : 1, () => {
            const kit = new Kit({ rig, root });
            buildHijab(kit, info, hijabHex, hijab?.style === "sportski" ? "sport" : "classic", outer);
            hijabObjects.push(...kit.objects);
        });
        hijabFit = outer;
    };
    if (hijabHex) {
        fitHijab(undefined);
        face.ears.forEach((ear) => (ear.visible = false));
    }

    const style = HAIR_STYLE[hairShape(kind, look.style)];
    let hair: THREE.Object3D[] = [];
    let underHat: boolean | null = null;
    const parts: FigureBody["parts"] = {
        hair,
        ears: face.ears,
        feet: meshes.rigid.filter((mesh) => mesh.name === "stopalo"),
        hands: meshes.rigid.filter((mesh) => mesh.name === "saka"),
        head: [face.group],
    };

    const setHeadwear = (hat: boolean): number => withDetail(ctx.quality === "low" ? 0.6 : 1, () => headwear(hat));
    const headwear = (hat: boolean): number => {
        // Kapa sedi na hidžabu: površina glave za predmete je već uvećana za tkaninu
        if (hijabHex) return 0;
        if (!style) return 0;
        if (underHat !== hat) {
            for (const object of hair) {
                object.removeFromParent();
                disposeObject(object);
            }
            // Duga kosa (ne „do ramena”) ima i prednje pramenove preko ramena
            hair = buildHair(rig, info, style, hairHex, hat, root, hairShape(kind, look.style) === "long");
            parts.hair = hair;
            underHat = hat;
        }
        return hairCrown(style, hat);
    };
    setHeadwear(false);

    const body: HumanBody = {
        kind,
        proportion: shape.proportion,
        shape,
        rig,
        anchors: humanAnchors(rig, info, Boolean(hijabHex)),
        head: headSurface(info, Boolean(hijabHex)),
        root,
        tone,
        parts,
        face: face.control,
        look,
        headInfo: info,
        hijab: hijabHex,
        fitHijab,
        setHeadwear,
        dispose: () => {
            face.dispose();
            disposeObject(root);
            for (const object of [...hair, ...hijabObjects]) disposeObject(object);
        },
    };
    return body;
}

/** Ljudi su deo motora: registruju se kao i životinje, pa motor sve drugare pravi isto */
for (const kind of HUMAN_KINDS) {
    const builder: CompanionBuilder = {
        kind,
        skins: [],
        build: (look, ctx) => buildHuman(kind, look.human ?? humanLook(kind, undefined), ctx),
    };
    registerCompanion(builder);
}

export function isHumanBody(body: FigureBody): body is HumanBody {
    return "setHeadwear" in body;
}
