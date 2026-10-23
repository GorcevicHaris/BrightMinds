/* eslint-disable react/display-name -- crteži su čiste funkcije koje vraćaju SVG, nisu komponente */
// Obuća: samo na celom liku. Leva cipela je oko (97, 398), desna je njen odraz oko x = 120.
// Đon dodiruje tlo (y ≈ 410–412). Čizme imaju sare preko nogavica (od y ≈ 352).

import type { ReactNode } from "react";
import type { CompanionKind } from "../companions";
import type { WearVariant } from "../wearables";
import { gloss, heartPath, itemsFor, mirror, sparkle, starPath } from "./art";

/** Deo cipele: putanja leve, boja, i (po želji) obris */
type Part = [d: string, fill: string, stroke?: string];

/** Crta deo levo i u ogledalu desno */
function pair(parts: Part[]): ReactNode {
    return parts.map(([d, fill, stroke], i) => (
        <g key={i}>
            {[d, mirror(d)].map((path, side) =>
                stroke ? (
                    <path key={side} d={path} fill={fill === "none" ? "none" : fill} stroke={stroke} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                    <path key={side} d={path} fill={fill} />
                )
            )}
        </g>
    ));
}

/** Krugovi levo i u ogledalu desno: [x, y, r, boja] */
function circles(points: [number, number, number, string][]): ReactNode {
    return points.flatMap(([x, y, r, fill], i) => [<circle key={`l${i}`} cx={x} cy={y} r={r} fill={fill} />, <circle key={`r${i}`} cx={240 - x} cy={y} r={r} fill={fill} />]);
}

/** Boja stopala (sandale): koža učitelja ili krzno životinje */
const FOOT_TONE: Record<CompanionKind, string> = {
    woman: "#F8CEAC",
    man: "#F4C39C",
    cat: "#F7B771",
    dog: "#EDCB9C",
    bunny: "#F2EDF7",
    bear: "#BC8656",
};

const SNEAKER = "M76 404Q74 386 92 384H102Q118 386 118 400V404Q118 410 110 410H82Q76 410 76 404Z";
const SOLE = "M75 402H119V406Q119 412 111 412H82Q75 412 75 406Z";
const TOE = "M76 404Q76 396 84 395H90V410H82Q76 410 76 404Z";
const LACES = "M92 390L104 392M92 396L105 397";
const BOOT = "M84 352H114V390Q120 393 120 402V406Q120 412 112 412H80Q74 412 74 404Q74 392 84 390Z";
const BOOT_SOLE = "M74 404H120V406Q120 412 112 412H80Q74 412 74 406Z";
const FLAT = "M78 404Q78 392 92 391H104Q117 392 117 402V405Q117 410 110 410H84Q78 410 78 404Z";

function sneakers(color: string, accent: string): () => ReactNode {
    return () => (
        <>
            {pair([
                [SNEAKER, color],
                [TOE, accent],
                [SOLE, "#fff"],
                [LACES, "none", "#fff"],
            ])}
            {gloss("M84 390Q90 386 98 386", 2.5, 0.45)}
        </>
    );
}

function sparkleSneakers(): ReactNode {
    return (
        <>
            {pair([
                [SNEAKER, "#C7D0DD"],
                [TOE, "#DDE4EE"],
                [SOLE, "#B9A2F2"],
                [LACES, "none", "#fff"],
            ])}
            {sparkle(86, 392, 4)}
            {sparkle(150, 394, 4)}
            {sparkle(108, 388, 3, "#FFE08A")}
            {sparkle(134, 388, 3, "#FFE08A")}
        </>
    );
}

function lightSneakers(): ReactNode {
    return (
        <>
            {pair([
                [SNEAKER, "#F78FB3"],
                [TOE, "#FFB8CB"],
                [SOLE, "#fff"],
                [LACES, "none", "#fff"],
            ])}
            {[82, 92, 102, 112, 128, 138, 148, 158].map((x, i) => (
                <circle key={x} cx={x} cy="407" r="2.6" fill={["#3D9BE9", "#FFD15C", "#3BB273", "#F45B8D"][i % 4]} />
            ))}
        </>
    );
}

function cleats(color: string, accent: string): () => ReactNode {
    return () => (
        <>
            {sneakers(color, accent)()}
            {pair([["M80 411H86V415H80ZM92 411H98V415H92ZM104 411H110V415H104Z", "#3A3546"]])}
            {pair([["M96 386L110 398", "none", accent]])}
        </>
    );
}

function rainBoots(color: string, shade: string, spots?: string): () => ReactNode {
    return () => (
        <>
            {pair([
                [BOOT, color],
                [BOOT_SOLE, shade],
                ["M84 352H114V358H84Z", shade],
            ])}
            {spots &&
                [
                    [92, 368],
                    [106, 378],
                    [94, 392],
                    [148, 368],
                    [134, 378],
                    [146, 392],
                ].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" fill={spots} />)}
            {gloss("M90 362V384M150 362V384", 3.5, 0.35)}
        </>
    );
}

function sandals(strap: string): (variant?: WearVariant, kind?: CompanionKind) => ReactNode {
    return (_variant, kind) => (
        <>
            {pair([
                [FLAT, FOOT_TONE[kind ?? "man"]],
                ["M77 404H118V407Q118 412 110 412H84Q77 412 77 407Z", strap],
                ["M82 398Q98 388 116 398", "none", strap],
                ["M86 404Q90 394 96 392", "none", strap],
            ])}
            {circles([[100, 395, 3, "#FFD15C"]])}
        </>
    );
}

function slippers(fur: string, inner: string, ears: "bunny" | "bear" | "frog"): () => ReactNode {
    return () => (
        <>
            {ears === "bunny" &&
                pair([
                    ["M86 392Q78 370 84 366Q92 366 92 390Z", fur],
                    ["M88 388Q84 374 86 371Q89 372 90 388Z", inner],
                ])}
            {ears === "bear" &&
                circles([
                    [84, 389, 7, fur],
                    [84, 389, 3.5, inner],
                ])}
            {ears === "frog" &&
                circles([
                    [87, 387, 7, fur],
                    [87, 387, 4.2, "#fff"],
                    [87, 388, 2.2, "#2A1D18"],
                ])}
            {pair([["M74 402Q74 386 96 386Q120 386 120 402Q120 412 108 412H86Q74 412 74 402Z", fur]])}
            {circles([
                [93, 398, 2, "#2A1D18"],
                [103, 398, 2, "#2A1D18"],
                [98, 404, 2.4, ears === "frog" ? "#3E9950" : "#F08AA0"],
            ])}
        </>
    );
}

function iceSkates(): ReactNode {
    return (
        <>
            {pair([
                [BOOT, "#fff"],
                ["M84 352H114V358H84Z", "#DDE4EE"],
                ["M88 364L110 368M88 374L110 377", "none", "#AEB9C9"],
                ["M80 412V418M112 412V418", "none", "#AEB9C9"],
                ["M72 419H122Q124 419 122 421", "none", "#8C98AB"],
            ])}
        </>
    );
}

function rollerSkates(): ReactNode {
    return (
        <>
            {pair([
                [BOOT, "#F45B8D"],
                ["M84 352H114V358H84Z", "#fff"],
                [BOOT_SOLE, "#fff"],
                ["M84 368L110 372M84 378L110 381", "none", "#fff"],
            ])}
            {circles([
                [84, 416, 5, "#FFD15C"],
                [110, 416, 5, "#FFD15C"],
            ])}
        </>
    );
}

function snowBoots(): ReactNode {
    return (
        <>
            {pair([
                [BOOT, "#9A6236"],
                [BOOT_SOLE, "#5C3A25"],
            ])}
            {circles([80, 89, 98, 107, 116].map((x) => [x, 356, 6, "#fff"] as [number, number, number, string]))}
        </>
    );
}

function cowboyBoots(): ReactNode {
    return (
        <>
            {pair([
                ["M84 350L90 356L96 350L102 356L108 350L114 356V390Q120 393 120 402V406Q120 412 112 412H80Q72 412 72 404Q74 392 84 390Z", "#9A6236"],
                ["M72 404H120V406Q120 412 112 412H80Q72 412 72 406Z", "#5C3A25"],
                ["M90 368Q99 376 108 368", "none", "#E9A10E"],
            ])}
            <path d={starPath(99, 382, 4.5, 2)} fill="#FFC83D" />
            <path d={starPath(141, 382, 4.5, 2)} fill="#FFC83D" />
        </>
    );
}

function bowShoes(): ReactNode {
    return (
        <>
            {pair([
                [FLAT, "#E5484D"],
                ["M78 405H117V406Q117 411 110 411H84Q78 411 78 406Z", "#B8323A"],
                ["M97 392L88 386Q86 392 88 398ZM97 392L106 386Q108 392 106 398Z", "#FFD15C"],
            ])}
            {gloss("M84 396Q88 393 94 393M146 396Q150 393 156 393", 2.5, 0.6)}
        </>
    );
}

function balletFlats(): ReactNode {
    return (
        <>
            {pair([
                [FLAT, "#FFB8CB"],
                ["M80 392Q74 376 86 360M114 392Q120 376 108 360", "none", "#F78FB3"],
            ])}
            {circles([[97, 393, 3, "#F45B8D"]])}
        </>
    );
}

function patentShoes(): ReactNode {
    return (
        <>
            {pair([
                [FLAT, "#2A2733"],
                ["M78 405H117V406Q117 411 110 411H84Q78 411 78 406Z", "#14121A"],
            ])}
            {gloss("M84 396Q90 392 100 393M140 393Q150 392 156 396", 3, 0.55)}
        </>
    );
}

function flippers(): ReactNode {
    return (
        <>
            {pair([
                ["M86 386H112L128 418Q100 430 64 418Z", "#3BB273"],
                ["M80 410L84 422M96 408V426M110 408L114 424", "none", "#2A8E57"],
                ["M86 386H112V396H86Z", "#2A8E57"],
            ])}
        </>
    );
}

function bigBoots(color: string, shade: string, band?: string, emblem?: string): () => ReactNode {
    return () => (
        <>
            {pair([
                ["M82 348H116V390Q122 393 122 402V406Q122 413 114 413H78Q72 413 72 404Q72 392 82 390Z", color],
                ["M72 404H122V406Q122 413 114 413H78Q72 413 72 406Z", shade],
                ["M82 348H116V356H82Z", shade],
            ])}
            {band && pair([["M82 372H116V380H82Z", band]])}
            {emblem && (
                <>
                    <path d={heartPath(99, 368, 5)} fill={emblem} />
                    <path d={heartPath(141, 368, 5)} fill={emblem} />
                </>
            )}
            {gloss("M88 360V384M152 360V384", 3.5, 0.3)}
        </>
    );
}

const feet = itemsFor("feet");

export const FEET = [
    feet("sandale", "Sandale", 4, sandals("#9A6236")),
    feet("roze-sandale", "Roze sandale", 4, sandals("#F45B8D")),
    feet("plave-patike", "Plave patike", 5, sneakers("#3D86E0", "#2C6BC0")),
    feet("crvene-patike", "Crvene patike", 5, sneakers("#E5484D", "#B8323A")),
    feet("zelene-patike", "Zelene patike", 5, sneakers("#3BB273", "#2A8E57")),
    feet("roze-patike", "Roze patike", 5, sneakers("#F78FB3", "#E0709A")),
    feet("zute-patike", "Žute patike", 6, sneakers("#FFD15C", "#F2A516")),
    feet("ljubicaste-patike", "Ljubičaste patike", 6, sneakers("#8E77E6", "#7258C9")),
    feet("baletanke", "Baletanke", 6, balletFlats),
    feet("zute-cizme", "Žute gumene čizme", 7, rainBoots("#FFD15C", "#E9A10E")),
    feet("crvene-cizme", "Crvene gumene čizme", 7, rainBoots("#E5484D", "#B8323A")),
    feet("cizme-tufne", "Plave čizme na tufne", 8, rainBoots("#3D86E0", "#2C6BC0", "#fff")),
    feet("cipele-masna", "Cipele sa mašnom", 8, bowShoes),
    feet("papuce-zeke", "Papuče zeke", 9, slippers("#fff", "#F9B9C9", "bunny")),
    feet("papuce-mede", "Papuče mede", 9, slippers("#BC8656", "#F1CBA4", "bear")),
    feet("papuce-zabice", "Papuče žabice", 9, slippers("#6CC46F", "#fff", "frog")),
    feet("lakovane-cipele", "Lakovane cipele", 9, patentShoes),
    feet("kopacke", "Kopačke", 10, cleats("#2A2733", "#3BB273")),
    feet("narandzaste-kopacke", "Narandžaste kopačke", 10, cleats("#FF8A3D", "#E5732A")),
    feet("cizme-sneg", "Čizme za sneg", 10, snowBoots),
    feet("peraja", "Peraja", 11, flippers),
    feet("sjajne-patike", "Sjajne patike", 12, sparkleSneakers),
    feet("svetlece-patike", "Svetleće patike", 14, lightSneakers),
    feet("kaubojske-cizme", "Kaubojske čizme", 14, cowboyBoots),
    feet("klizaljke", "Klizaljke", 15, iceSkates),
    feet("rolsue", "Rolšue", 16, rollerSkates),
    feet("vatrogasne-cizme", "Vatrogasne čizme", 16, bigBoots("#2A2733", "#14121A", "#FFD15C")),
    feet("cizme-superheroja", "Čizme superheroja", 18, bigBoots("#E5484D", "#B8323A", undefined, "#FFD15C")),
    feet("cizme-astronauta", "Čizme astronauta", 25, bigBoots("#F2F5FA", "#AEB9C9", "#3D9BE9")),
];
