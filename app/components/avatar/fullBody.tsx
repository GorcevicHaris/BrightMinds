// Delovi celog lika (variant="full") koje dele učitelj i životinje: noge, ruke, senka na
// tlu i redosled slojeva predmeta iz prodavnice. Glava, vrat i trup ostaju u samim likovima.
//
// Slojevi od pozadi napred:
//   pozadina → senka → leđa → (kosa iza glave, rep) → noge → pantalone → trup → odeća →
//   obuća → vrat → leđa spreda (kaiševi) → oko vrata → ruke → u ruci → pesnica → glava
//   (naočare, kosa, kapa) → ljubimac
//
// Mirni pokreti (motion.ts, globals.css „Drugar”): sve od leđa do glave je u tri ugnježđene
// grupe — `cm-act` (jednokratni pokreti: skok, radost, aplauz, pojava), `cm-talk` (pokret
// uz govor) i `cm-breathe` (disanje). Pozadina, senka i ljubimac stoje van njih, pa tlo
// i ljubimac ne skaču zajedno sa drugarom. Ruke su svaka u svojoj grupi (mahanje, aplauz).

import type { ReactNode } from "react";
import type { CompanionKind } from "./companions";
import { ARM_L, ARM_R, FIST_LX, FIST_RX, FIST_Y, GROUND_Y, LEG_LX, LEG_RX, LEG_TOP, FOOT_Y } from "./geometry";
import { lowerPart } from "./wear/art";
import { renderWorn, wornItem, type Wear } from "./wearables";

/** Pozadina i senka na tlu (ne pomeraju se sa drugarom; senka se smanji kad skoči) */
export function fullScene(wear: Wear | undefined, kind: CompanionKind): ReactNode {
    return (
        <>
            {renderWorn(wear, "background", { variant: "full", kind })}
            <ellipse className="cm-shadow" cx="120" cy={GROUND_Y + 1} rx="62" ry="7" fill="#1D1030" opacity="0.13" />
        </>
    );
}

/** Predmet na leđima (iza lika) */
export function fullBack(wear: Wear | undefined, kind: CompanionKind): ReactNode {
    return renderWorn(wear, "back", { variant: "full", kind });
}

/** Sve što se pomera sa drugarom: jednokratni pokret → pokret uz govor → disanje */
export function fullMotion(body: ReactNode): ReactNode {
    return (
        <g className="cm-act">
            <g className="cm-talk">
                <g className="cm-breathe">{body}</g>
            </g>
        </g>
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

/** Obuća iz prodavnice, ili podrazumevana stopala lika; `tone` je boja kože ili krzna (sandale) */
export function fullFeet(wear: Wear | undefined, kind: CompanionKind, bare: ReactNode, tone?: string): ReactNode {
    return <g transform={FEET_ZOOM}>{renderWorn(wear, "feet", { variant: "full", kind, tone }) ?? bare}</g>;
}

/**
 * Ruke koje vise pored tela: podlaktica u boji kože, rukav do lakta, šake. Desna (na slici)
 * drži predmet iz prodavnice, a pesnica se crta preko njegove drške. Svaka ruka je u svojoj
 * grupi koja se okreće oko ramena (mahanje, aplauz).
 */
export function fullArms(wear: Wear | undefined, kind: CompanionKind, sleeve: string, skin: string, fist: (x: number, y: number) => ReactNode): ReactNode {
    const held = renderWorn(wear, "hand", { variant: "full", kind });
    const arm = (side: { x1: number; y1: number; x2: number; y2: number }, fistX: number, extra?: ReactNode) => {
        const elbow = { x: side.x1 + (side.x2 - side.x1) * 0.72, y: side.y1 + (side.y2 - side.y1) * 0.72 };
        return (
            <>
                <line x1={side.x1} y1={side.y1} x2={side.x2} y2={side.y2} stroke={skin} strokeWidth="21" strokeLinecap="round" />
                {/* Tanak obris rukava: i bela odeća se jasno vidi na svetloj pozadini */}
                <path d={`M${side.x1} ${side.y1}L${elbow.x} ${elbow.y}`} stroke="#1D1030" strokeOpacity="0.14" strokeWidth="29" strokeLinecap="round" />
                <line x1={side.x1} y1={side.y1} x2={elbow.x} y2={elbow.y} stroke={sleeve} strokeWidth="26" strokeLinecap="round" />
                {fist(fistX, FIST_Y)}
                {extra}
            </>
        );
    };
    return (
        <>
            <g className="cm-arm-l">{arm(ARM_L, FIST_LX)}</g>
            <g className="cm-arm-r">
                {arm(
                    ARM_R,
                    FIST_RX,
                    held && (
                        <>
                            {held}
                            {fist(FIST_RX, FIST_Y)}
                        </>
                    )
                )}
            </g>
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
