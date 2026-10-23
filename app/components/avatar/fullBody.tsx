// Delovi celog lika (variant="full") koje dele učitelj i životinje: noge, ruke, senka na
// tlu i redosled slojeva predmeta iz prodavnice. Glava, vrat i trup ostaju u samim likovima.
//
// Slojevi od pozadi napred:
//   pozadina → senka → leđa → (kosa iza glave, rep) → noge → pantalone → trup → odeća →
//   obuća → vrat → leđa spreda (kaiševi) → oko vrata → ruke → u ruci → pesnica → glava
//   (naočare, kosa, kapa) → ljubimac

import type { ReactNode } from "react";
import type { CompanionKind } from "./companions";
import { ARM_L, ARM_R, FIST_LX, FIST_RX, FIST_Y, GROUND_Y, LEG_LX, LEG_RX, LEG_TOP, FOOT_Y } from "./geometry";
import { lowerPart } from "./wear/art";
import { renderWorn, wornItem, type Wear } from "./wearables";

/** Pozadina, senka na tlu i predmet na leđima (sve iza lika) */
export function fullBehind(wear: Wear | undefined, kind: CompanionKind): ReactNode {
    return (
        <>
            {renderWorn(wear, "background", { variant: "full", kind })}
            <ellipse cx="120" cy={GROUND_Y + 1} rx="62" ry="7" fill="#1D1030" opacity="0.13" />
            {renderWorn(wear, "back", { variant: "full", kind })}
        </>
    );
}

/** Noge (koža ili krzno) i, ako odeća nema svoj donji deo, podrazumevane pantalone */
export function fullLegs(wear: Wear | undefined, legFill: string, pants?: [string, string]): ReactNode {
    const ownLower = wornItem(wear, "outfit")?.lower;
    return (
        <>
            <rect x={LEG_LX - 13} y={LEG_TOP} width="26" height={FOOT_Y - LEG_TOP + 4} rx="12" fill={legFill} />
            <rect x={LEG_RX - 13} y={LEG_TOP} width="26" height={FOOT_Y - LEG_TOP + 4} rx="12" fill={legFill} />
            {pants && !ownLower && lowerPart("pants", pants[0], pants[1])}
        </>
    );
}

/** Obuća je malo krupnija od stvarne mere, da se na malom liku vidi šta dete nosi */
const FEET_ZOOM = `translate(120 ${GROUND_Y + 2}) scale(1.2) translate(-120 -${GROUND_Y + 2})`;

/** Obuća iz prodavnice, ili podrazumevana stopala lika */
export function fullFeet(wear: Wear | undefined, kind: CompanionKind, bare: ReactNode): ReactNode {
    return <g transform={FEET_ZOOM}>{renderWorn(wear, "feet", { variant: "full", kind }) ?? bare}</g>;
}

/** Ruke koje vise pored tela: podlaktica u boji kože, rukav do lakta, šake */
export function fullArms(sleeve: string, skin: string, fist: (x: number, y: number) => ReactNode): ReactNode {
    const elbow = (arm: { x1: number; y1: number; x2: number; y2: number }) => ({ x: arm.x1 + (arm.x2 - arm.x1) * 0.72, y: arm.y1 + (arm.y2 - arm.y1) * 0.72 });
    const l = elbow(ARM_L);
    const r = elbow(ARM_R);
    return (
        <>
            <line x1={ARM_L.x1} y1={ARM_L.y1} x2={ARM_L.x2} y2={ARM_L.y2} stroke={skin} strokeWidth="21" strokeLinecap="round" />
            <line x1={ARM_R.x1} y1={ARM_R.y1} x2={ARM_R.x2} y2={ARM_R.y2} stroke={skin} strokeWidth="21" strokeLinecap="round" />
            {/* Tanak obris rukava: i bela odeća se jasno vidi na svetloj pozadini */}
            <path d={`M${ARM_L.x1} ${ARM_L.y1}L${l.x} ${l.y}M${ARM_R.x1} ${ARM_R.y1}L${r.x} ${r.y}`} stroke="#1D1030" strokeOpacity="0.14" strokeWidth="29" strokeLinecap="round" />
            <line x1={ARM_L.x1} y1={ARM_L.y1} x2={l.x} y2={l.y} stroke={sleeve} strokeWidth="26" strokeLinecap="round" />
            <line x1={ARM_R.x1} y1={ARM_R.y1} x2={r.x} y2={r.y} stroke={sleeve} strokeWidth="26" strokeLinecap="round" />
            {fist(FIST_LX, FIST_Y)}
            {fist(FIST_RX, FIST_Y)}
        </>
    );
}

/** Predmet u desnoj šaci i pesnica preko njegove drške */
export function fullHand(wear: Wear | undefined, kind: CompanionKind, fist: (x: number, y: number) => ReactNode): ReactNode {
    const held = renderWorn(wear, "hand", { variant: "full", kind });
    if (!held) return null;
    return (
        <>
            {held}
            {fist(FIST_RX, FIST_Y)}
        </>
    );
}

/** Ljubimac pored drugara */
export function fullPet(wear: Wear | undefined, kind: CompanionKind): ReactNode {
    return renderWorn(wear, "pet", { variant: "full", kind });
}

/** Deo predmeta na leđima koji se vidi spreda (kaiševi ranca) */
export function fullBackFront(wear: Wear | undefined, kind: CompanionKind): ReactNode {
    return renderWorn(wear, "back", { variant: "full", kind, front: true });
}
