// Mame, tate i bebe za igru „Mama i beba”. Mame koje već postoje uzimaju se iz igre „Šta jede?”
// (food/animals.tsx), a ovde su dodate svinja, patka, lavica i leptir, tate (bik, ovan, jarac,
// petao, patak, lav, slon: mama sa onim po čemu se tata vidi — rogovi, griva, krešta, kljove)
// i sve bebe. Isti stil: okrenuti licem ka detetu, mirnog izraza, okvir 100 × 100, stopala oko
// y = 96. Beba je manja i oblija verzija mame: velika okrugla glava, malo telo, krupne oči.

import type { ReactNode } from "react";
import type { AnimalId } from "@/app/components/games/data/foodItems";
import type { SpeciesId } from "@/app/components/games/data/familyLevels";
import { ANIMAL_ART } from "@/app/components/games/food/animals";

const INK = "#4a3a32";
const BLUSH = "#f59a9a";

const line = (color: string, width = 1.6) => ({ stroke: color, strokeWidth: width, strokeLinejoin: "round" as const, strokeLinecap: "round" as const });

function Eye({ x, y, r = 3.2 }: { x: number; y: number; r?: number }) {
    return (
        <g>
            <circle cx={x} cy={y} r={r} fill={INK} />
            <circle cx={x - r * 0.35} cy={y - r * 0.4} r={r * 0.36} fill="#ffffff" />
        </g>
    );
}

function Eyes({ y, dx, r }: { y: number; dx: number; r?: number }) {
    return (
        <>
            <Eye x={50 - dx} y={y} r={r} />
            <Eye x={50 + dx} y={y} r={r} />
        </>
    );
}

function Cheeks({ y, dx, r = 3.4 }: { y: number; dx: number; r?: number }) {
    return (
        <>
            <circle cx={50 - dx} cy={y} r={r} fill={BLUSH} opacity={0.45} />
            <circle cx={50 + dx} cy={y} r={r} fill={BLUSH} opacity={0.45} />
        </>
    );
}

function Smile({ y, w = 4, color = INK }: { y: number; w?: number; color?: string }) {
    return <path d={`M${50 - w} ${y} Q50 ${y + w * 0.9} ${50 + w} ${y}`} fill="none" {...line(color, 1.5)} />;
}

function Feet({ color, edge, y = 95, dx = 10, rx = 7 }: { color: string; edge: string; y?: number; dx?: number; rx?: number }) {
    return (
        <>
            <ellipse cx={50 - dx} cy={y} rx={rx} ry={3.6} fill={color} {...line(edge, 1.2)} />
            <ellipse cx={50 + dx} cy={y} rx={rx} ry={3.6} fill={color} {...line(edge, 1.2)} />
        </>
    );
}

function Shadow({ rx = 26 }: { rx?: number }) {
    return <ellipse cx={50} cy={97} rx={rx} ry={3} fill="#000000" opacity={0.09} />;
}

/** Telo bebe: malo, okruglo, sa kratkim nogama (glava se crta posle) */
function BabyBody({ color, edge, belly, feet = color, feetEdge = edge }: { color: string; edge: string; belly?: string; feet?: string; feetEdge?: string }) {
    return (
        <>
            <Shadow rx={17} />
            <ellipse cx={50} cy={83} rx={15} ry={11} fill={color} {...line(edge)} />
            {belly && <ellipse cx={50} cy={86} rx={8} ry={7} fill={belly} />}
            <Feet color={feet} edge={feetEdge} y={94} dx={7} rx={5} />
        </>
    );
}

/** Lice bebe: krupne oči, rumeni obrazi, mali osmeh */
function BabyFace({ eyeY = 54, dx = 8, smileY = 66, cheeksY = 62 }: { eyeY?: number; dx?: number; smileY?: number; cheeksY?: number }) {
    return (
        <>
            <Eyes y={eyeY} dx={dx} r={3.9} />
            <Cheeks y={cheeksY} dx={dx + 5} r={3.2} />
            <Smile y={smileY} w={3} />
        </>
    );
}

// ── Mame kojih nema u igri „Šta jede?” ───────────────────────────────────────

function Pig() {
    return (
        <g>
            <Shadow />
            <path d="M70 80 q8 -2 6 -8 q-2 -5 -6 -1" fill="none" {...line("#d98a9c", 2.2)} />
            <ellipse cx={50} cy={80} rx={21} ry={15} fill="#f7bccb" {...line("#d98a9c")} />
            <Feet color="#e89aae" edge="#c47a8e" dx={11} rx={6} />
            <path d="M33 38 L31 22 L45 31Z M67 38 L69 22 L55 31Z" fill="#f7bccb" {...line("#d98a9c")} />
            <circle cx={50} cy={49} r={19} fill="#f7bccb" {...line("#d98a9c")} />
            <Eyes y={45} dx={8} />
            <Cheeks y={54} dx={13} r={3} />
            <ellipse cx={50} cy={57} rx={8.5} ry={6} fill="#f59aae" {...line("#d9788e", 1.2)} />
            <ellipse cx={47} cy={57} rx={1.6} ry={2.2} fill="#b85a70" />
            <ellipse cx={53} cy={57} rx={1.6} ry={2.2} fill="#b85a70" />
            <Smile y={65.5} w={3.6} />
        </g>
    );
}

function Duck({ drake = false }: { drake?: boolean }) {
    const head = drake ? "#3f9a5a" : "#fbfbf5";
    const headEdge = drake ? "#2f7a44" : "#cfcabb";
    return (
        <g>
            <Shadow rx={22} />
            <path d="M42 88 V95 M38 95 H46 M58 88 V95 M54 95 H62" fill="none" {...line("#f08a2e", 2.2)} />
            <path d="M68 70 Q82 62 80 76 Q76 84 68 82Z" fill="#fbfbf5" {...line("#cfcabb")} />
            {drake && <path d="M74 66 q5 -6 9 -2" fill="none" {...line("#2f4a5a", 2)} />}
            <ellipse cx={50} cy={76} rx={22} ry={16} fill="#fbfbf5" {...line("#cfcabb")} />
            <ellipse cx={36} cy={76} rx={8} ry={10} fill="#efeadc" transform="rotate(20 36 76)" />
            <ellipse cx={64} cy={76} rx={8} ry={10} fill="#efeadc" transform="rotate(-20 64 76)" />
            <circle cx={50} cy={44} r={17} fill={head} {...line(headEdge)} />
            {drake && <path d="M37 56 Q50 64 63 56" fill="none" {...line("#ffffff", 3)} />}
            <Eyes y={40} dx={7} />
            <Cheeks y={47} dx={11} r={2.8} />
            <ellipse cx={50} cy={51} rx={9} ry={4} fill="#f6a23e" {...line("#d9822e", 1.2)} />
            <path d="M43 51 H57" {...line("#d9822e", 1)} />
        </g>
    );
}

function Lion({ male = false }: { male?: boolean }) {
    return (
        <g>
            <Shadow />
            <path d="M68 84 Q84 82 82 66" fill="none" {...line("#c9934e", 3.5)} />
            <ellipse cx={82} cy={64} rx={4} ry={5} fill="#a8622a" />
            <ellipse cx={50} cy={80} rx={20} ry={15} fill="#e8b46a" {...line("#b98544")} />
            <ellipse cx={50} cy={84} rx={11} ry={9} fill="#f6dcb0" />
            <Feet color="#e8b46a" edge="#b98544" dx={10} rx={6.5} />
            {male && (
                <g fill="#c0702e" {...line("#9a5622", 1.2)}>
                    {Array.from({ length: 12 }, (_, i) => {
                        const angle = (i / 12) * Math.PI * 2;
                        return <circle key={i} cx={50 + Math.cos(angle) * 21} cy={48 + Math.sin(angle) * 21} r={9} />;
                    })}
                    <circle cx={50} cy={48} r={22} stroke="none" />
                </g>
            )}
            <circle cx={36} cy={33} r={6.5} fill="#e8b46a" {...line("#b98544")} />
            <circle cx={64} cy={33} r={6.5} fill="#e8b46a" {...line("#b98544")} />
            <circle cx={36} cy={33} r={3.4} fill="#f6c6a0" />
            <circle cx={64} cy={33} r={3.4} fill="#f6c6a0" />
            <circle cx={50} cy={48} r={18} fill="#e8b46a" {...line("#b98544")} />
            <ellipse cx={50} cy={58} rx={10} ry={7.5} fill="#f6dcb0" />
            <Eyes y={45} dx={7.5} />
            <Cheeks y={55} dx={12.5} r={3} />
            <path d="M46.5 53.5 H53.5 L50 57Z" fill="#8a5a3a" />
            <path d="M50 57 V59 M46.5 60.5 Q48.5 62.5 50 59 Q51.5 62.5 53.5 60.5" fill="none" {...line(INK, 1.2)} />
        </g>
    );
}

function Butterfly() {
    return (
        <g>
            <Shadow rx={16} />
            <ellipse cx={30} cy={44} rx={18} ry={16} fill="#f6a23e" transform="rotate(-20 30 44)" {...line("#c9741e")} />
            <ellipse cx={70} cy={44} rx={18} ry={16} fill="#f6a23e" transform="rotate(20 70 44)" {...line("#c9741e")} />
            <ellipse cx={34} cy={72} rx={13} ry={12} fill="#9b7ef0" transform="rotate(20 34 72)" {...line("#6f52c8")} />
            <ellipse cx={66} cy={72} rx={13} ry={12} fill="#9b7ef0" transform="rotate(-20 66 72)" {...line("#6f52c8")} />
            <circle cx={28} cy={44} r={6} fill="#ffe08a" />
            <circle cx={72} cy={44} r={6} fill="#ffe08a" />
            <circle cx={34} cy={73} r={4} fill="#d8ccff" />
            <circle cx={66} cy={73} r={4} fill="#d8ccff" />
            <rect x={45} y={36} width={10} height={50} rx={5} fill="#5a4a6a" {...line("#3f3250", 1.2)} />
            <path d="M47 27 Q42 16 38 14 M53 27 Q58 16 62 14" fill="none" {...line("#3f3250", 1.6)} />
            <circle cx={38} cy={14} r={2.2} fill="#3f3250" />
            <circle cx={62} cy={14} r={2.2} fill="#3f3250" />
            <circle cx={50} cy={31} r={9} fill="#6a5a7a" {...line("#3f3250", 1.2)} />
            <circle cx={46.5} cy={30} r={1.9} fill="#ffffff" />
            <circle cx={53.5} cy={30} r={1.9} fill="#ffffff" />
            <circle cx={46.5} cy={30} r={1.1} fill={INK} />
            <circle cx={53.5} cy={30} r={1.1} fill={INK} />
            <path d="M47 35 Q50 37 53 35" fill="none" {...line("#ffffff", 1.2)} />
        </g>
    );
}

/** Mame iz igre „Šta jede?” (isti crtež, mirno lice) */
const FOOD_MOTHER: Partial<Record<SpeciesId, AnimalId>> = {
    cow: "cow",
    sheep: "sheep",
    cat: "cat",
    dog: "dog",
    horse: "horse",
    goat: "goat",
    rabbit: "rabbit",
    bear: "bear",
    elephant: "elephant",
    chicken: "chicken",
    frog: "frog",
};

export function motherArt(id: SpeciesId): ReactNode {
    const food = FOOD_MOTHER[id];
    if (food) return ANIMAL_ART[food].draw(false);
    if (id === "pig") return <Pig />;
    if (id === "duck") return <Duck />;
    if (id === "lion") return <Lion />;
    return <Butterfly />;
}

// ── Tate ──────────────────────────────────────────────────────────────────────

function Rooster() {
    return (
        <g>
            <path d="M66 70 Q78 40 92 46 Q84 52 84 60 Q92 56 94 64 Q84 66 80 76Z" fill="#3f9a5a" {...line("#2f7a44", 1.2)} />
            <path d="M68 74 Q84 54 92 66 Q82 70 76 80Z" fill="#e8742e" {...line("#b9561e", 1.2)} />
            {ANIMAL_ART.chicken.draw(false)}
            <path d="M39 34 Q37 18 45 24 Q46 12 51 22 Q55 12 58 24 Q65 18 62 34Z" fill="#e8483f" {...line("#b9302a", 1.2)} />
            <path d="M47 60 Q50 72 53 60Z" fill="#e8483f" />
            <path d="M34 66 Q50 74 66 66" fill="none" {...line("#e8a23e", 3)} />
        </g>
    );
}

export function fatherArt(id: SpeciesId): ReactNode {
    switch (id) {
        case "cow":
            return (
                <g>
                    {ANIMAL_ART.cow.draw(false)}
                    <path d="M37 33 Q28 30 26 18 Q32 24 40 28Z M63 33 Q72 30 74 18 Q68 24 60 28Z" fill="#f2e3c4" {...line("#b9a070", 1.2)} />
                    <circle cx={50} cy={68} r={3.4} fill="none" {...line("#d9a82e", 1.6)} />
                </g>
            );
        case "sheep":
            return (
                <g>
                    {ANIMAL_ART.sheep.draw(false)}
                    {[-1, 1].map((side) => (
                        <g key={side} transform={`translate(${50 + side * 17} 44) scale(${side} 1)`}>
                            <circle r={8.5} fill="#d9c39a" {...line("#a8905e", 1.3)} />
                            <path d="M0 -5 A5 5 0 1 1 -4.6 2 A3 3 0 1 1 0 -1" fill="none" {...line("#a8905e", 1.3)} />
                        </g>
                    ))}
                </g>
            );
        case "goat":
            return (
                <g>
                    <path d="M42 33 Q34 10 18 10 Q30 16 36 35Z M58 33 Q66 10 82 10 Q70 16 64 35Z" fill="#b9a070" {...line("#8a744a", 1.2)} />
                    {ANIMAL_ART.goat.draw(false)}
                    <path d="M45 68 Q50 90 55 68Z" fill="#d8d0c0" {...line("#a8a090", 1.2)} />
                </g>
            );
        case "lion":
            return <Lion male />;
        case "elephant":
            return (
                <g>
                    {ANIMAL_ART.elephant.draw(false)}
                    <path d="M45 61 Q38 66 37 74 Q40 70 46 66Z M56 61 Q63 66 64 74 Q61 70 55 66Z" fill="#fffaf0" {...line("#c9bfa8", 1.2)} />
                </g>
            );
        case "duck":
            return <Duck drake />;
        case "chicken":
            return <Rooster />;
        default:
            return motherArt(id);
    }
}

// ── Bebe ──────────────────────────────────────────────────────────────────────

const BABY_ART: Record<SpeciesId, () => ReactNode> = {
    cow: () => (
        <g>
            <BabyBody color="#fbfbfb" edge="#a29ea8" feet="#6b6470" feetEdge="#4a444f" />
            <path d="M40 80 Q44 76 47 80 Q45 85 41 84Z" fill="#3f3a44" />
            <ellipse cx={29} cy={50} rx={7.5} ry={4} fill="#fbfbfb" transform="rotate(-20 29 50)" {...line("#a29ea8")} />
            <ellipse cx={71} cy={50} rx={7.5} ry={4} fill="#fbfbfb" transform="rotate(20 71 50)" {...line("#a29ea8")} />
            <circle cx={41} cy={36} r={2.6} fill="#f2e3c4" {...line("#c9b48a", 1)} />
            <circle cx={59} cy={36} r={2.6} fill="#f2e3c4" {...line("#c9b48a", 1)} />
            <circle cx={50} cy={55} r={20} fill="#fbfbfb" {...line("#a29ea8")} />
            <path d="M55 37 Q65 39 66 48 Q59 49 55 43Z" fill="#3f3a44" />
            <ellipse cx={50} cy={67} rx={10.5} ry={6.5} fill="#f7c1c8" {...line("#d99aa4", 1.2)} />
            <ellipse cx={46} cy={66} rx={1.5} ry={2} fill="#c47a86" />
            <ellipse cx={54} cy={66} rx={1.5} ry={2} fill="#c47a86" />
            <Eyes y={52} dx={8} r={3.9} />
            <Cheeks y={59} dx={14} r={3} />
        </g>
    ),
    sheep: () => (
        <g>
            <Shadow rx={17} />
            <Feet color="#5a5560" edge="#3f3a44" y={94} dx={7} rx={4.5} />
            <g fill="#fbf8f1" {...line("#d6cfc0", 1.3)}>
                <circle cx={40} cy={82} r={9} />
                <circle cx={60} cy={82} r={9} />
                <circle cx={50} cy={84} r={10} />
            </g>
            <ellipse cx={33} cy={56} rx={7} ry={3.6} fill="#e9d2b8" transform="rotate(-20 33 56)" {...line("#c9a888", 1.2)} />
            <ellipse cx={67} cy={56} rx={7} ry={3.6} fill="#e9d2b8" transform="rotate(20 67 56)" {...line("#c9a888", 1.2)} />
            <circle cx={50} cy={58} r={16} fill="#f2dcc4" {...line("#c9a888")} />
            <g fill="#fbf8f1" {...line("#d6cfc0", 1.2)}>
                <circle cx={43} cy={42} r={5.5} />
                <circle cx={50} cy={39.5} r={6} />
                <circle cx={57} cy={42} r={5.5} />
            </g>
            <BabyFace eyeY={56} dx={6.5} smileY={66} cheeksY={62} />
        </g>
    ),
    cat: () => (
        <g>
            <BabyBody color="#f4b06a" edge="#c98a55" belly="#fbe3c4" />
            <path d="M34 50 L35 31 L47 41Z M66 50 L65 31 L53 41Z" fill="#f4b06a" {...line("#c98a55")} />
            <path d="M37 45 L37.5 36 L43.5 41Z M63 45 L62.5 36 L56.5 41Z" fill="#f7c3c3" />
            <circle cx={50} cy={57} r={19} fill="#f4b06a" {...line("#c98a55")} />
            <path d="M46 40 Q47 43 46.5 46 M54 40 Q53 43 53.5 46" fill="none" {...line("#d98a45", 1.4)} />
            <ellipse cx={50} cy={65} rx={8} ry={5.5} fill="#fbe3c4" />
            <path d="M48 62 H52 L50 64Z" fill="#e88aa8" />
            <path d="M38 63 L30 62 M38 66 L30 67 M62 63 L70 62 M62 66 L70 67" {...line("#c98a55", 0.9)} />
            <BabyFace eyeY={55} dx={7.5} smileY={66} cheeksY={62} />
        </g>
    ),
    dog: () => (
        <g>
            <BabyBody color="#e8c27a" edge="#b9894a" belly="#f6e2b8" />
            <circle cx={50} cy={56} r={19} fill="#e8c27a" {...line("#b9894a")} />
            <ellipse cx={32} cy={56} rx={6.5} ry={12} fill="#a8783e" transform="rotate(16 32 56)" {...line("#8a5f2e", 1.2)} />
            <ellipse cx={68} cy={56} rx={6.5} ry={12} fill="#a8783e" transform="rotate(-16 68 56)" {...line("#8a5f2e", 1.2)} />
            <ellipse cx={50} cy={65} rx={9} ry={6.5} fill="#f6e2b8" />
            <ellipse cx={50} cy={62} rx={3.2} ry={2.3} fill={INK} />
            <BabyFace eyeY={53} dx={7.5} smileY={66} cheeksY={61} />
        </g>
    ),
    horse: () => (
        <g>
            <BabyBody color="#d29a66" edge="#9a6a3e" feet="#6a4a36" feetEdge="#4a3426" />
            <path d="M38 41 L36 29 L45 36Z M62 41 L64 29 L55 36Z" fill="#d29a66" {...line("#9a6a3e")} />
            <circle cx={50} cy={55} r={19} fill="#d29a66" {...line("#9a6a3e")} />
            <path d="M44 37 Q50 32 56 37 Q54 43 50 45 Q47 42 44 37Z" fill="#7a4e2c" />
            <ellipse cx={50} cy={67} rx={10} ry={7} fill="#ecc49e" {...line("#b98a5e", 1.2)} />
            <ellipse cx={46.5} cy={66} rx={1.5} ry={2} fill="#8a5a32" />
            <ellipse cx={53.5} cy={66} rx={1.5} ry={2} fill="#8a5a32" />
            <Eyes y={52} dx={8} r={3.9} />
            <Cheeks y={59} dx={13} r={3} />
        </g>
    ),
    pig: () => (
        <g>
            <path d="M64 82 q6 -2 5 -6 q-2 -4 -5 -1" fill="none" {...line("#d98a9c", 2)} />
            <BabyBody color="#f7bccb" edge="#d98a9c" feet="#e89aae" feetEdge="#c47a8e" />
            <path d="M35 46 L34 33 L45 40Z M65 46 L66 33 L55 40Z" fill="#f7bccb" {...line("#d98a9c")} />
            <circle cx={50} cy={56} r={19} fill="#f7bccb" {...line("#d98a9c")} />
            <ellipse cx={50} cy={63} rx={7} ry={5} fill="#f59aae" {...line("#d9788e", 1.2)} />
            <ellipse cx={47.5} cy={63} rx={1.3} ry={1.8} fill="#b85a70" />
            <ellipse cx={52.5} cy={63} rx={1.3} ry={1.8} fill="#b85a70" />
            <Eyes y={52} dx={8} r={3.9} />
            <Cheeks y={60} dx={13} r={3} />
            <Smile y={70} w={2.8} />
        </g>
    ),
    duck: () => (
        <g>
            <Shadow rx={17} />
            <path d="M44 89 V95 M41 95 H47 M56 89 V95 M53 95 H59" fill="none" {...line("#f08a2e", 2)} />
            <ellipse cx={50} cy={80} rx={17} ry={12} fill="#ffd84d" {...line("#e0b02e")} />
            <ellipse cx={37} cy={79} rx={5} ry={7} fill="#f6c83a" transform="rotate(20 37 79)" />
            <ellipse cx={63} cy={79} rx={5} ry={7} fill="#f6c83a" transform="rotate(-20 63 79)" />
            <circle cx={50} cy={54} r={18} fill="#ffd84d" {...line("#e0b02e")} />
            <path d="M47 37 Q49 31 52 36" fill="none" {...line("#e0b02e", 2)} />
            <Eyes y={51} dx={7} r={3.6} />
            <Cheeks y={58} dx={11.5} r={2.8} />
            <ellipse cx={50} cy={61} rx={7.5} ry={3.4} fill="#f6a23e" {...line("#d9822e", 1.1)} />
        </g>
    ),
    goat: () => (
        <g>
            <BabyBody color="#ece6da" edge="#b8ae9c" feet="#6b6470" feetEdge="#4a444f" />
            <path d="M42 39 Q40 32 44 31 Q45 35 46 39Z M58 39 Q60 32 56 31 Q55 35 54 39Z" fill="#c9b48a" {...line("#9a865e", 1)} />
            <ellipse cx={31} cy={54} rx={8} ry={3.6} fill="#ece6da" transform="rotate(-15 31 54)" {...line("#b8ae9c")} />
            <ellipse cx={69} cy={54} rx={8} ry={3.6} fill="#ece6da" transform="rotate(15 69 54)" {...line("#b8ae9c")} />
            <circle cx={50} cy={55} r={18} fill="#ece6da" {...line("#b8ae9c")} />
            <ellipse cx={50} cy={65} rx={7.5} ry={5} fill="#f2cfc6" />
            <circle cx={48} cy={63.5} r={0.9} fill="#b47a72" />
            <circle cx={52} cy={63.5} r={0.9} fill="#b47a72" />
            <Eyes y={52} dx={7} r={3.8} />
            <Cheeks y={59} dx={12} r={2.8} />
            <Smile y={68} w={2.6} />
        </g>
    ),
    rabbit: () => (
        <g>
            <BabyBody color="#f6f2f8" edge="#c9c2d6" belly="#ffffff" />
            <ellipse cx={43} cy={32} rx={5} ry={12} fill="#f6f2f8" transform="rotate(-10 43 32)" {...line("#c9c2d6")} />
            <ellipse cx={57} cy={32} rx={5} ry={12} fill="#f6f2f8" transform="rotate(10 57 32)" {...line("#c9c2d6")} />
            <ellipse cx={43} cy={33} rx={2.2} ry={8} fill="#f7c3d4" transform="rotate(-10 43 33)" />
            <ellipse cx={57} cy={33} rx={2.2} ry={8} fill="#f7c3d4" transform="rotate(10 57 33)" />
            <circle cx={50} cy={57} r={18} fill="#f6f2f8" {...line("#c9c2d6")} />
            <ellipse cx={50} cy={61} rx={2.2} ry={1.6} fill="#e88aa8" />
            <BabyFace eyeY={54} dx={7.5} smileY={65} cheeksY={61} />
        </g>
    ),
    bear: () => (
        <g>
            <BabyBody color="#b98050" edge="#8a5a32" belly="#e2b98a" />
            <circle cx={35} cy={41} r={6.5} fill="#b98050" {...line("#8a5a32")} />
            <circle cx={65} cy={41} r={6.5} fill="#b98050" {...line("#8a5a32")} />
            <circle cx={35} cy={41} r={3.4} fill="#e2b98a" />
            <circle cx={65} cy={41} r={3.4} fill="#e2b98a" />
            <circle cx={50} cy={56} r={19} fill="#b98050" {...line("#8a5a32")} />
            <ellipse cx={50} cy={64} rx={8.5} ry={6.5} fill="#ecc89e" />
            <ellipse cx={50} cy={61.5} rx={3} ry={2.1} fill={INK} />
            <BabyFace eyeY={53} dx={7.5} smileY={66} cheeksY={61} />
        </g>
    ),
    lion: () => (
        <g>
            <BabyBody color="#efc27e" edge="#c09050" belly="#fae6c0" />
            <circle cx={36} cy={40} r={6} fill="#efc27e" {...line("#c09050")} />
            <circle cx={64} cy={40} r={6} fill="#efc27e" {...line("#c09050")} />
            <circle cx={36} cy={40} r={3} fill="#f6c6a0" />
            <circle cx={64} cy={40} r={3} fill="#f6c6a0" />
            <circle cx={50} cy={56} r={19} fill="#efc27e" {...line("#c09050")} />
            <path d="M45 38 Q48 33 50 37 Q52 33 55 38" fill="#c9843a" {...line("#a8622a", 1)} />
            <ellipse cx={50} cy={64} rx={9} ry={6.5} fill="#fae6c0" />
            <path d="M47.5 61 H52.5 L50 63.5Z" fill="#8a5a3a" />
            <BabyFace eyeY={53} dx={7.5} smileY={66} cheeksY={61} />
        </g>
    ),
    elephant: () => (
        <g>
            <BabyBody color="#b5bdcc" edge="#7d8698" />
            <path d="M36 44 Q18 38 18 55 Q19 68 36 64Z M64 44 Q82 38 82 55 Q81 68 64 64Z" fill="#b5bdcc" {...line("#7d8698")} />
            <path d="M33 48 Q23 47 23 55 Q24 62 33 61Z M67 48 Q77 47 77 55 Q76 62 67 61Z" fill="#f2c3cc" />
            <circle cx={50} cy={55} r={17} fill="#b5bdcc" {...line("#7d8698")} />
            <path d="M46 63 Q45 72 49 77 Q52 80 55 77 Q53 75 52.5 71 Q52 67 54 63Z" fill="#b5bdcc" {...line("#7d8698")} />
            <Eyes y={52} dx={7.5} r={3.8} />
            <Cheeks y={59} dx={11} r={2.8} />
        </g>
    ),
    // Bebe koje ne liče na mamu
    chicken: () => (
        <g>
            <Shadow rx={16} />
            <path d="M44 88 V95 M41 95 H47 M56 88 V95 M53 95 H59" fill="none" {...line("#f08a2e", 2)} />
            <ellipse cx={34} cy={68} rx={5} ry={9} fill="#f6c83a" transform="rotate(25 34 68)" />
            <ellipse cx={66} cy={68} rx={5} ry={9} fill="#f6c83a" transform="rotate(-25 66 68)" />
            <ellipse cx={50} cy={64} rx={19} ry={23} fill="#ffd84d" {...line("#e0b02e")} />
            <path d="M46 42 Q47 35 50 40 Q52 34 54 42" fill="#ffd84d" {...line("#e0b02e", 1.4)} />
            <Eyes y={56} dx={7} r={3.6} />
            <Cheeks y={63} dx={11.5} r={2.8} />
            <path d="M46 61 L54 61 L50 67Z" fill="#f6a23e" {...line("#d9822e", 1.1)} />
        </g>
    ),
    frog: () => (
        <g>
            <ellipse cx={50} cy={92} rx={34} ry={4} fill="#8fc8e8" opacity={0.5} />
            <path d="M58 64 Q72 52 80 62 Q88 72 96 60 Q92 78 80 76 Q70 76 60 74Z" fill="#6a7a44" {...line("#4a5a2e", 1.3)} />
            <ellipse cx={42} cy={66} rx={20} ry={16} fill="#6a7a44" {...line("#4a5a2e")} />
            <ellipse cx={40} cy={71} rx={11} ry={7} fill="#8a9a5e" />
            <circle cx={34} cy={60} r={5.2} fill="#ffffff" />
            <circle cx={50} cy={60} r={5.2} fill="#ffffff" />
            <Eye x={34} y={60} r={3.3} />
            <Eye x={50} y={60} r={3.3} />
            <path d="M37 71 Q42 75 47 71" fill="none" {...line("#3f4a26", 1.4)} />
        </g>
    ),
    butterfly: () => (
        <g>
            <Shadow rx={30} />
            <path d="M20 88 v6 M32 88 v6 M44 88 v6 M56 88 v6" {...line("#3f8a3a", 2)} />
            {[18, 30, 42, 54].map((x, i) => (
                <circle key={x} cx={x} cy={i % 2 ? 80 : 82} r={10} fill={i % 2 ? "#8fd16a" : "#7fc45a"} {...line("#4f8a44", 1.3)} />
            ))}
            {[18, 30, 42, 54].map((x) => (
                <circle key={`d${x}`} cx={x} cy={78} r={2} fill="#f6d23e" />
            ))}
            <path d="M68 58 Q64 46 60 44 M76 58 Q80 46 84 44" fill="none" {...line("#3f5a2e", 1.6)} />
            <circle cx={60} cy={44} r={2.2} fill="#3f5a2e" />
            <circle cx={84} cy={44} r={2.2} fill="#3f5a2e" />
            <circle cx={72} cy={72} r={14} fill="#8fd16a" {...line("#4f8a44")} />
            <Eye x={66.5} y={70} r={3} />
            <Eye x={77.5} y={70} r={3} />
            <circle cx={63} cy={76} r={2.4} fill={BLUSH} opacity={0.5} />
            <circle cx={81} cy={76} r={2.4} fill={BLUSH} opacity={0.5} />
            <path d="M69 78 Q72 80.5 75 78" fill="none" {...line(INK, 1.3)} />
        </g>
    ),
};

export function babyArt(id: SpeciesId): ReactNode {
    return BABY_ART[id]();
}

export type Role = "mother" | "father" | "baby";

/** Životinja u svom okviru 100 × 100 (kartica, mesto na tabli, velika slika) */
export function FamilyAnimal({ species, role, className }: { species: SpeciesId; role: Role; className?: string }) {
    const art = role === "baby" ? babyArt(species) : role === "father" ? fatherArt(species) : motherArt(species);
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {art}
        </svg>
    );
}

/** Sve vrste imaju crtež mame i bebe; tate samo vrste iz porodica (za testove) */
export const DRAWN_BABIES = Object.keys(BABY_ART) as SpeciesId[];
