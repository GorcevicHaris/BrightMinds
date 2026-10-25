// Predmeti za igre „Šta fali?” i „Prve reči”: igračke i stvari iz kuće, u istom stilu kao hrana
// i životinje iz igre „Šta jede?” (krupni, jednostavni oblici, okvir 100 × 100, sredina u 50, 50).
//
// Neki predmeti su složeni od delova (kuća: vrata i prozor; bicikl: točak i sedište…), pa
// igra „Šta fali?” može da nacrta predmet bez jednog dela. Na mestu dela tada stoji „rupa”:
// svetlo polje sa isprekidanom ivicom u obliku tog dela. Deo se crta i sam (u kartici izbora),
// u svom kvadratu `box` — iz kartice doleti tačno na svoje mesto na slici.

import type { ReactNode } from "react";
import type { PartId, ThingId } from "@/app/components/games/data/missingItems";

const line = (color: string, width = 1.6) => ({ stroke: color, strokeWidth: width, strokeLinejoin: "round" as const, strokeLinecap: "round" as const });

const INK = "#4a3a32";
/** Boja ivice „rupe” (mesto gde deo fali) */
export const HOLE_EDGE = "#a24d7a";

/** Rupa: svetlo polje u obliku dela, sa isprekidanom ivicom */
function Hole({ d, children }: { d?: string; children?: ReactNode }) {
    return (
        <g fill="#fff7fb" fillOpacity={0.9} stroke={HOLE_EDGE} strokeWidth={1.8} strokeDasharray="4 3" strokeLinejoin="round">
            {d ? <path d={d} /> : children}
        </g>
    );
}

function Eye({ x, y, r = 3.4 }: { x: number; y: number; r?: number }) {
    return (
        <g>
            <circle cx={x} cy={y} r={r} fill={INK} />
            <circle cx={x - r * 0.35} cy={y - r * 0.4} r={r * 0.36} fill="#ffffff" />
        </g>
    );
}

/** Jedan sloj crteža: deo koji može da fali (`part`) ili osnova koja se uvek crta */
interface Layer {
    part?: PartId;
    draw: () => ReactNode;
}

export interface PartDrawing {
    /** Kvadrat oko dela u koordinatama slike: [x, y, stranica] */
    box: readonly [number, number, number];
    draw: () => ReactNode;
    /** Oblik rupe kad deo fali */
    hole: () => ReactNode;
}

// ── Delovi ────────────────────────────────────────────────────────────────────

const DOOR = "M41 63 Q41 60 44 60 H56 Q59 60 59 63 V90 H41Z";
const HOUSE_WINDOW = "M60 52 H74 V66 H60Z";
const CUP_HANDLE = "M66 38 Q88 38 88 54 Q88 70 66 70 V62 Q80 62 80 54 Q80 46 66 46Z";
const UMBRELLA_HANDLE = "M47.5 50 H52.5 V80 Q52.5 91 43 91 Q33.5 91 33.5 81.5 H39 Q39 86 43 86 Q47.5 86 47.5 80Z";
const CHAIR_LEG = "M66 58 H74 L75 92 Q75 94 73 94 H68 Q66 94 66 92Z";
const WING_RIGHT = "M53 46 Q62 18 80 20 Q94 24 86 42 Q80 50 53 50Z M53 54 Q76 52 82 64 Q86 78 72 80 Q58 80 53 58Z";
const FISH_TAIL = "M70 52 Q80 40 92 34 Q86 52 92 70 Q80 64 70 52Z";
const SEAT = "M30 30 Q40 26 50 30 Q50 34 44 35 H34 Q30 34 30 30Z";

export const PART_ART: Record<PartId, PartDrawing> = {
    houseDoor: {
        box: [33, 58, 34],
        draw: () => (
            <g>
                <path d={DOOR} fill="#b97a4a" {...line("#7f4f2a")} />
                <path d="M44.5 66 H55.5 V73 H44.5Z M44.5 77 H55.5 V86 H44.5Z" fill="none" {...line("#9a6236", 1.2)} />
                <circle cx={55.5} cy={76} r={1.6} fill="#f2c94c" {...line("#b98a1e", 0.8)} />
            </g>
        ),
        hole: () => <Hole d={DOOR} />,
    },
    houseWindow: {
        box: [55, 47, 24],
        draw: () => (
            <g>
                <path d={HOUSE_WINDOW} fill="#bfe3f6" {...line("#5a7a92")} />
                <path d="M67 52 V66 M60 59 H74" {...line("#5a7a92", 1.6)} />
                <path d="M62 54 L65 54" {...line("#ffffff", 1.4)} />
            </g>
        ),
        hole: () => <Hole d={HOUSE_WINDOW} />,
    },
    bikeWheel: {
        box: [4, 44, 44],
        draw: () => (
            <g>
                <circle cx={26} cy={66} r={17} fill="none" {...line("#3b3f52", 5)} />
                <circle cx={26} cy={66} r={14.5} fill="none" {...line("#8a90a6", 1)} />
                <path d="M26 52 V80 M12 66 H40 M16 56 L36 76 M36 56 L16 76" {...line("#9aa0b4", 1)} />
                <circle cx={26} cy={66} r={3} fill="#c9ccd6" {...line("#6a7086", 1)} />
            </g>
        ),
        hole: () => (
            <Hole>
                <circle cx={26} cy={66} r={19.5} />
            </Hole>
        ),
    },
    bikeSeat: {
        box: [26, 18, 28],
        draw: () => <path d={SEAT} fill="#3b3f52" {...line("#23262f", 1.4)} />,
        hole: () => <Hole d={SEAT} />,
    },
    carWheel: {
        box: [56, 58, 28],
        draw: () => (
            <g>
                <circle cx={70} cy={72} r={10} fill="#3b3f52" {...line("#23262f", 1.4)} />
                <circle cx={70} cy={72} r={4.4} fill="#c9ccd6" {...line("#6a7086", 1)} />
            </g>
        ),
        hole: () => (
            <Hole>
                <circle cx={70} cy={72} r={11} />
            </Hole>
        ),
    },
    cupHandle: {
        box: [59, 37, 34],
        draw: () => <path d={CUP_HANDLE} fill="#5aa0e0" {...line("#2f6fb0")} />,
        hole: () => <Hole d={CUP_HANDLE} />,
    },
    umbrellaHandle: {
        box: [22, 48, 44],
        draw: () => <path d={UMBRELLA_HANDLE} fill="#8a5a32" {...line("#5a3a1e", 1.4)} />,
        hole: () => <Hole d={UMBRELLA_HANDLE} />,
    },
    faceNose: {
        box: [40, 52, 20],
        draw: () => (
            <g>
                <ellipse cx={50} cy={62} rx={5.5} ry={4.5} fill="#e9a27c" {...line("#c47a56", 1.3)} />
                <ellipse cx={48.2} cy={60.6} rx={1.6} ry={1.1} fill="#ffffff" opacity={0.6} />
            </g>
        ),
        hole: () => (
            <Hole>
                <ellipse cx={50} cy={62} rx={6.5} ry={5.5} />
            </Hole>
        ),
    },
    faceEar: {
        box: [70, 46, 20],
        draw: () => (
            <g>
                <ellipse cx={80} cy={56} rx={7} ry={8.5} fill="#f6cfa8" {...line("#c99a72", 1.5)} />
                <path d="M81.5 52 Q78 56 81.5 60" fill="none" {...line("#d9a982", 1.4)} />
            </g>
        ),
        hole: () => (
            <Hole>
                <ellipse cx={80} cy={56} rx={7.5} ry={9} />
            </Hole>
        ),
    },
    teddyEar: {
        box: [57, 13, 26],
        draw: () => (
            <g>
                <circle cx={70} cy={26} r={11} fill="#c98e5a" {...line("#8f5d34")} />
                <circle cx={70} cy={26} r={5.5} fill="#f0d2b0" />
            </g>
        ),
        hole: () => (
            <Hole>
                <circle cx={70} cy={26} r={11.5} />
            </Hole>
        ),
    },
    chairLeg: {
        box: [53, 58, 36],
        draw: () => <path d={CHAIR_LEG} fill="#c8915a" {...line("#8a5a32")} />,
        hole: () => <Hole d={CHAIR_LEG} />,
    },
    butterflyWing: {
        box: [40, 17, 65],
        draw: () => (
            <g>
                <path d={WING_RIGHT} fill="#9b7ef0" {...line("#6a4fc0")} />
                <circle cx={72} cy={33} r={5} fill="#f4c94a" {...line("#d9a01e", 1)} />
                <circle cx={70} cy={67} r={4} fill="#f78fb3" {...line("#d9628e", 1)} />
            </g>
        ),
        hole: () => <Hole d={WING_RIGHT} />,
    },
    fishTail: {
        box: [63, 33, 38],
        draw: () => (
            <g>
                <path d={FISH_TAIL} fill="#f6a23e" {...line("#c9741a")} />
                <path d="M78 47 L86 42 M78 57 L86 62" fill="none" {...line("#c9741a", 1.2)} />
            </g>
        ),
        hole: () => <Hole d={FISH_TAIL} />,
    },
};

// ── Predmeti ──────────────────────────────────────────────────────────────────

const ground = (rx = 30, cy = 93) => <ellipse cx={50} cy={cy} rx={rx} ry={3.6} fill="#000000" opacity={0.08} />;

export const THING_ART: Record<ThingId, readonly Layer[]> = {
    ball: [
        {
            draw: () => (
                <g>
                    {ground(26)}
                    <circle cx={50} cy={56} r={33} fill="#ef5a4f" {...line("#b9372f")} />
                    <path d="M50 23 Q36 56 50 89 M50 23 Q64 56 50 89" fill="#f6d84a" {...line("#b9372f", 1.3)} />
                    <path d="M17 56 Q50 66 83 56" fill="none" {...line("#ffffff", 4)} />
                    <ellipse cx={34} cy={40} rx={5} ry={8} fill="#ffffff" opacity={0.4} transform="rotate(35 34 40)" />
                </g>
            ),
        },
    ],
    teddy: [
        {
            draw: () => (
                <g>
                    <circle cx={30} cy={26} r={11} fill="#c98e5a" {...line("#8f5d34")} />
                    <circle cx={30} cy={26} r={5.5} fill="#f0d2b0" />
                </g>
            ),
        },
        { part: "teddyEar", draw: PART_ART.teddyEar.draw },
        {
            draw: () => (
                <g>
                    {ground(26, 95)}
                    <ellipse cx={26} cy={66} rx={7} ry={11} fill="#c98e5a" transform="rotate(25 26 66)" {...line("#8f5d34")} />
                    <ellipse cx={74} cy={66} rx={7} ry={11} fill="#c98e5a" transform="rotate(-25 74 66)" {...line("#8f5d34")} />
                    <ellipse cx={50} cy={72} rx={21} ry={20} fill="#c98e5a" {...line("#8f5d34")} />
                    <ellipse cx={50} cy={75} rx={12} ry={12} fill="#f0d2b0" />
                    <ellipse cx={36} cy={90} rx={9} ry={6} fill="#c98e5a" {...line("#8f5d34")} />
                    <ellipse cx={64} cy={90} rx={9} ry={6} fill="#c98e5a" {...line("#8f5d34")} />
                    <circle cx={50} cy={42} r={21} fill="#c98e5a" {...line("#8f5d34")} />
                    <ellipse cx={50} cy={50} rx={10} ry={7.5} fill="#f0d2b0" />
                    <ellipse cx={50} cy={46.5} rx={3.6} ry={2.6} fill={INK} />
                    <path d="M50 49 V52 M46 53 Q50 56 54 53" fill="none" {...line(INK, 1.4)} />
                    <Eye x={42} y={38} r={2.8} />
                    <Eye x={58} y={38} r={2.8} />
                    <path d="M44 66 Q50 62 56 66 L50 72Z" fill="#e8605a" {...line("#b9372f", 1.2)} />
                </g>
            ),
        },
    ],
    car: [
        {
            draw: () => (
                <g>
                    {ground(36, 84)}
                    <path d="M10 70 V58 Q10 50 18 50 H26 L34 34 Q36 31 40 31 H62 Q66 31 68 34 L76 50 H84 Q92 50 92 58 V70 Q92 74 88 74 H14 Q10 74 10 70Z" fill="#3f8fd8" {...line("#25609e")} />
                    <path d="M37 36 H50 V50 H30Z" fill="#dff1fb" {...line("#25609e", 1.3)} />
                    <path d="M54 36 H64 L71 50 H54Z" fill="#dff1fb" {...line("#25609e", 1.3)} />
                    <rect x={85} y={55} width={7} height={5} rx={2} fill="#fff3b0" {...line("#c9a03a", 1)} />
                    <rect x={10} y={56} width={5} height={5} rx={1.5} fill="#f28b6e" />
                    <path d="M46 58 H52" {...line("#25609e", 1.6)} />
                    <circle cx={30} cy={72} r={10} fill="#3b3f52" {...line("#23262f", 1.4)} />
                    <circle cx={30} cy={72} r={4.4} fill="#c9ccd6" {...line("#6a7086", 1)} />
                </g>
            ),
        },
        { part: "carWheel", draw: PART_ART.carWheel.draw },
    ],
    duck: [
        {
            draw: () => (
                <g>
                    {ground(32, 88)}
                    <path d="M18 62 Q16 86 46 86 H70 Q90 84 88 60 Q80 66 70 62 Q60 54 46 58 Q30 62 18 62Z" fill="#f6d34a" {...line("#c9a01e")} />
                    <circle cx={38} cy={40} r={16} fill="#f6d34a" {...line("#c9a01e")} />
                    <path d="M23 42 Q12 42 10 48 Q18 52 26 48Z" fill="#f6862e" {...line("#c9631a", 1.3)} />
                    <Eye x={36} y={36} r={2.8} />
                    <path d="M50 66 Q62 60 74 68 Q64 78 50 72Z" fill="#f2c430" {...line("#c9a01e", 1.3)} />
                    <ellipse cx={44} cy={34} rx={3} ry={2} fill="#ffffff" opacity={0.5} />
                </g>
            ),
        },
    ],
    cup: [
        {
            draw: () => (
                <g>
                    <ellipse cx={47} cy={84} rx={32} ry={6} fill="#ffffff" {...line("#9aa6b2")} />
                    <path d="M26 32 H68 V62 Q68 82 47 82 Q26 82 26 62Z" fill="#5aa0e0" {...line("#2f6fb0")} />
                    <ellipse cx={47} cy={32} rx={21} ry={4.5} fill="#e8f4fc" {...line("#2f6fb0", 1.4)} />
                    <path d="M28 50 H66" fill="none" {...line("#ffffff", 3.4)} />
                    <circle cx={40} cy={64} r={3} fill="#ffffff" opacity={0.8} />
                    <circle cx={52} cy={66} r={3} fill="#ffffff" opacity={0.8} />
                </g>
            ),
        },
        { part: "cupHandle", draw: PART_ART.cupHandle.draw },
    ],
    book: [
        {
            draw: () => (
                <g>
                    {ground(26, 90)}
                    <path d="M30 18 H72 Q75 18 75 21 V84 Q75 87 72 87 H30Z" fill="#f6f2e6" {...line("#b9ad94")} />
                    <path d="M26 16 H68 Q71 16 71 19 V82 Q71 85 68 85 H26 Q23 85 23 82 V19 Q23 16 26 16Z" fill="#3f8fd8" {...line("#25609e")} />
                    <path d="M30 16 V85" {...line("#25609e", 2)} />
                    <rect x={36} y={28} width={28} height={16} rx={3} fill="#ffffff" {...line("#25609e", 1.2)} />
                    <path d="M41 34 H59 M41 39 H54" {...line("#9ac4e8", 1.6)} />
                    <path d="M44 62 L48 54 L52 62 L60 62 L54 67 L56 75 L48 70 L40 75 L42 67 L36 62Z" fill="#f4c94a" {...line("#d9a01e", 1)} />
                </g>
            ),
        },
    ],
    cap: [
        {
            draw: () => (
                <g>
                    {ground(30, 84)}
                    <path d="M20 66 Q20 30 50 30 Q80 30 80 66Z" fill="#e8605a" {...line("#b9372f")} />
                    <path d="M34 34 Q30 50 32 64 M50 30 V64 M66 34 Q70 50 68 64" fill="none" {...line("#c9443f", 1.6)} />
                    <rect x={17} y={62} width={66} height={16} rx={7} fill="#f6d84a" {...line("#c9a01e")} />
                    <path d="M24 70 H76" {...line("#e0b52a", 1.4)} strokeDasharray="3 3" />
                    <circle cx={50} cy={24} r={9} fill="#ffffff" {...line("#c9c2b6")} />
                </g>
            ),
        },
    ],
    balloon: [
        {
            draw: () => (
                <g>
                    <path d="M50 70 Q42 80 52 86 Q60 92 50 98" fill="none" {...line("#8a8a96", 1.4)} />
                    <ellipse cx={50} cy={40} rx={24} ry={29} fill="#9b7ef0" {...line("#6a4fc0")} />
                    <path d="M46 69 L54 69 L50 73Z" fill="#9b7ef0" {...line("#6a4fc0", 1.2)} />
                    <ellipse cx={40} cy={28} rx={5} ry={9} fill="#ffffff" opacity={0.45} transform="rotate(20 40 28)" />
                </g>
            ),
        },
    ],
    umbrella: [
        {
            draw: () => (
                <g>
                    <path d="M50 16 V11" {...line("#5a3a1e", 2.6)} />
                    <path d="M12 50 Q14 18 50 16 Q86 18 88 50 Q79 43 69 50 Q59 43 50 50 Q41 43 31 50 Q21 43 12 50Z" fill="#3fb5a0" {...line("#23806f")} />
                    <path d="M50 16 Q40 30 31 50 M50 16 Q60 30 69 50 M50 16 V50" fill="none" {...line("#23806f", 1.3)} />
                    <path d="M22 34 Q30 24 40 21" fill="none" {...line("#ffffff", 2)} opacity={0.55} />
                </g>
            ),
        },
        { part: "umbrellaHandle", draw: PART_ART.umbrellaHandle.draw },
    ],
    sun: [
        {
            draw: () => (
                <g>
                    <g fill="#f6b73c" {...line("#d9901e", 1.2)}>
                        {Array.from({ length: 8 }, (_, i) => {
                            const a = (i * Math.PI) / 4;
                            const p = (r: number, da: number) => `${(50 + Math.cos(a + da) * r).toFixed(1)} ${(50 + Math.sin(a + da) * r).toFixed(1)}`;
                            return <path key={i} d={`M${p(26, -0.22)} L${p(44, 0)} L${p(26, 0.22)}Z`} />;
                        })}
                    </g>
                    <circle cx={50} cy={50} r={24} fill="#f9d64a" {...line("#d9a01e")} />
                    <circle cx={41} cy={47} r={2.6} fill={INK} />
                    <circle cx={59} cy={47} r={2.6} fill={INK} />
                    <path d="M42 56 Q50 63 58 56" fill="none" {...line(INK, 1.8)} />
                    <circle cx={36} cy={55} r={3.4} fill="#f59a9a" opacity={0.5} />
                    <circle cx={64} cy={55} r={3.4} fill="#f59a9a" opacity={0.5} />
                </g>
            ),
        },
    ],
    jam: [
        {
            draw: () => (
                <g>
                    {ground(26, 92)}
                    <path d="M28 34 H72 V82 Q72 90 64 90 H36 Q28 90 28 82Z" fill="#e6f4fb" {...line("#8ab4cc")} />
                    <path d="M30 44 H70 V81 Q70 88 63 88 H37 Q30 88 30 81Z" fill="#d9304a" />
                    <rect x={24} y={20} width={52} height={15} rx={4} fill="#e8605a" {...line("#b9372f")} />
                    <path d="M30 27 H70" {...line("#ffffff", 2)} strokeDasharray="3 4" />
                    <ellipse cx={50} cy={64} rx={15} ry={11} fill="#ffffff" {...line("#c9c2b6", 1.2)} />
                    <path d="M50 58 Q42 60 44 68 Q47 73 50 73 Q53 73 56 68 Q58 60 50 58Z" fill="#e8463f" {...line("#a82a24", 1)} />
                    <path d="M46 58 L50 55 L54 58" fill="none" {...line("#4f9a3a", 1.6)} />
                    <ellipse cx={36} cy={52} rx={2.4} ry={7} fill="#ffffff" opacity={0.5} />
                </g>
            ),
        },
    ],
    pretzel: [
        {
            draw: () => (
                <g>
                    {ground(30, 88)}
                    <path d="M18 52 a32 30 0 1 0 64 0 a32 30 0 1 0 -64 0Z M37 52 a13 11 0 1 0 26 0 a13 11 0 1 0 -26 0Z" fillRule="evenodd" fill="#d9944a" {...line("#9a5a22")} />
                    <path d="M24 44 Q34 26 54 24" fill="none" {...line("#f0c08a", 2.4)} opacity={0.7} />
                    <g fill="#fbf2dc" {...line("#c9a87a", 0.6)}>
                        {[
                            [30, 36, 20],
                            [44, 28, -10],
                            [60, 29, 30],
                            [72, 40, -30],
                            [76, 56, 10],
                            [66, 72, -20],
                            [50, 77, 40],
                            [34, 72, 0],
                            [24, 58, 60],
                            [56, 36, 70],
                            [40, 36, -40],
                            [68, 52, 80],
                        ].map(([x, y, r]) => (
                            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={2.2} ry={1.1} transform={`rotate(${r} ${x} ${y})`} />
                        ))}
                    </g>
                </g>
            ),
        },
    ],
    swing: [
        {
            draw: () => (
                <g>
                    <ellipse cx={50} cy={94} rx={40} ry={3.6} fill="#000000" opacity={0.08} />
                    <path d="M14 94 L30 14 M86 94 L70 14" fill="none" {...line("#8a5a32", 6)} />
                    <path d="M14 94 L30 14 M86 94 L70 14" fill="none" {...line("#c8915a", 3.4)} />
                    <rect x={22} y={9} width={56} height={8} rx={3} fill="#c8915a" {...line("#8a5a32")} />
                    <path d="M40 17 V66 M60 17 V66" {...line("#8a8a96", 1.6)} />
                    <rect x={33} y={64} width={34} height={7} rx={3} fill="#e8605a" {...line("#b9372f")} />
                </g>
            ),
        },
    ],
    shoe: [
        {
            draw: () => (
                <g>
                    {ground(36, 82)}
                    <path d="M14 76 Q12 56 22 46 L40 42 Q46 54 56 56 L76 60 Q90 64 88 76Z" fill="#e8605a" {...line("#b9372f")} />
                    <path d="M12 76 H90 Q90 82 84 82 H18 Q12 82 12 76Z" fill="#ffffff" {...line("#9aa6b2")} />
                    <path d="M22 46 Q24 40 32 40 L40 42" fill="#ffffff" {...line("#b9372f", 1.3)} />
                    <path d="M42 48 L50 45 M45 53 L54 50 M50 57 L58 54" {...line("#ffffff", 2.2)} />
                    <path d="M66 66 Q74 64 80 70" fill="none" {...line("#ffffff", 2)} />
                </g>
            ),
        },
    ],
    house: [
        {
            draw: () => (
                <g>
                    <ellipse cx={50} cy={91} rx={40} ry={4} fill="#8fd07a" opacity={0.7} />
                    <rect x={62} y={18} width={10} height={20} fill="#c9443f" {...line("#8f2a26")} />
                    <path d="M20 44 H80 V90 H20Z" fill="#fbe7c4" {...line("#c9a87a")} />
                    <path d="M12 46 L50 14 L88 46Z" fill="#e8605a" {...line("#b9372f")} />
                    <path d="M26 52 H40 V66 H26Z" fill="#bfe3f6" {...line("#5a7a92")} />
                    <path d="M33 52 V66 M26 59 H40" {...line("#5a7a92", 1.6)} />
                    <path d="M28 54 L31 54" {...line("#ffffff", 1.4)} />
                </g>
            ),
        },
        { part: "houseWindow", draw: PART_ART.houseWindow.draw },
        { part: "houseDoor", draw: PART_ART.houseDoor.draw },
    ],
    bicycle: [
        {
            draw: () => (
                <g>
                    <ellipse cx={50} cy={86} rx={42} ry={3} fill="#000000" opacity={0.08} />
                    <circle cx={74} cy={66} r={17} fill="none" {...line("#3b3f52", 5)} />
                    <circle cx={74} cy={66} r={14.5} fill="none" {...line("#8a90a6", 1)} />
                    <path d="M74 52 V80 M60 66 H88 M64 56 L84 76 M84 56 L64 76" {...line("#9aa0b4", 1)} />
                    <circle cx={74} cy={66} r={3} fill="#c9ccd6" {...line("#6a7086", 1)} />
                    <path d="M26 66 L42 42 H66 L74 66 M42 42 L50 66 L66 42 M26 66 H50" fill="none" {...line("#e8605a", 3.4)} />
                    <path d="M42 42 L40 34 M66 42 L68 26 M62 25 H74" fill="none" {...line("#3b3f52", 3)} />
                    <circle cx={50} cy={66} r={4} fill="#c9ccd6" {...line("#3b3f52", 1.4)} />
                    <path d="M50 66 L54 72 M51 74 H57" {...line("#3b3f52", 2)} />
                </g>
            ),
        },
        { part: "bikeSeat", draw: PART_ART.bikeSeat.draw },
        { part: "bikeWheel", draw: PART_ART.bikeWheel.draw },
    ],
    chair: [
        {
            draw: () => (
                <g>
                    <ellipse cx={50} cy={94} rx={32} ry={3} fill="#000000" opacity={0.08} />
                    <path d="M28 8 H72 Q75 8 75 11 V52 H67 V22 H33 V52 H25 V11 Q25 8 28 8Z" fill="#c8915a" {...line("#8a5a32")} />
                    <path d="M33 28 H67 M33 38 H67" {...line("#a8723e", 3)} />
                    <path d="M26 58 H34 V92 Q34 94 32 94 H27 Q25 94 25 92Z" fill="#c8915a" {...line("#8a5a32")} />
                    <path d="M20 50 H80 Q83 50 83 53 V58 Q83 61 80 61 H20 Q17 61 17 58 V53 Q17 50 20 50Z" fill="#e0a86a" {...line("#8a5a32")} />
                </g>
            ),
        },
        { part: "chairLeg", draw: PART_ART.chairLeg.draw },
    ],
    butterfly: [
        {
            draw: () => (
                <g>
                    <path d="M47 46 Q38 18 20 20 Q6 24 14 42 Q20 50 47 50Z M47 54 Q24 52 18 64 Q14 78 28 80 Q42 80 47 58Z" fill="#9b7ef0" {...line("#6a4fc0")} />
                    <circle cx={28} cy={33} r={5} fill="#f4c94a" {...line("#d9a01e", 1)} />
                    <circle cx={30} cy={67} r={4} fill="#f78fb3" {...line("#d9628e", 1)} />
                    <path d="M48 30 Q42 16 36 12 M52 30 Q58 16 64 12" fill="none" {...line("#4a4050", 1.6)} />
                    <circle cx={36} cy={12} r={2.2} fill="#4a4050" />
                    <circle cx={64} cy={12} r={2.2} fill="#4a4050" />
                </g>
            ),
        },
        { part: "butterflyWing", draw: PART_ART.butterflyWing.draw },
        {
            draw: () => (
                <g>
                    <ellipse cx={50} cy={54} rx={5} ry={24} fill="#4a4050" {...line("#2f2a36", 1.2)} />
                    <circle cx={50} cy={30} r={6} fill="#4a4050" {...line("#2f2a36", 1.2)} />
                </g>
            ),
        },
    ],
    face: [
        {
            draw: () => (
                <g>
                    <ellipse cx={20} cy={56} rx={7} ry={8.5} fill="#f6cfa8" {...line("#c99a72", 1.5)} />
                    <path d="M18.5 52 Q22 56 18.5 60" fill="none" {...line("#d9a982", 1.4)} />
                </g>
            ),
        },
        { part: "faceEar", draw: PART_ART.faceEar.draw },
        {
            draw: () => (
                <g>
                    <rect x={38} y={80} width={24} height={14} fill="#f6cfa8" />
                    <path d="M22 98 Q24 86 50 86 Q76 86 78 98Z" fill="#6cc0e8" {...line("#3f8fb8")} />
                    <ellipse cx={50} cy={54} rx={30} ry={32} fill="#f6cfa8" {...line("#c99a72")} />
                    <path d="M20 50 Q18 22 50 20 Q82 22 80 50 Q74 34 62 32 Q56 40 40 36 Q28 38 20 50Z" fill="#7a4a2a" {...line("#5a321a")} />
                    <Eye x={39} y={52} r={3.6} />
                    <Eye x={61} y={52} r={3.6} />
                    <path d="M33 45 Q39 42 44 45 M56 45 Q61 42 67 45" fill="none" {...line("#5a321a", 1.6)} />
                    <circle cx={33} cy={66} r={4.4} fill="#f59a9a" opacity={0.45} />
                    <circle cx={67} cy={66} r={4.4} fill="#f59a9a" opacity={0.45} />
                    <path d="M41 72 Q50 79 59 72" fill="none" {...line("#b9372f", 2)} />
                </g>
            ),
        },
        { part: "faceNose", draw: PART_ART.faceNose.draw },
    ],
    fish: [
        {
            draw: () => (
                <g>
                    <path d="M14 52 Q30 26 56 30 Q72 34 74 52 Q72 70 56 74 Q30 78 14 52Z" fill="#f6a23e" {...line("#c9741a")} />
                    <path d="M40 31 Q48 18 60 30" fill="#f08a2a" {...line("#c9741a", 1.3)} />
                    <path d="M44 56 Q52 62 46 70" fill="#f08a2a" {...line("#c9741a", 1.2)} />
                    <path d="M50 38 Q58 52 50 66 M60 40 Q66 52 60 64" fill="none" {...line("#c9741a", 1.2)} />
                    <Eye x={28} y={46} r={3.4} />
                    <path d="M16 56 Q20 58 24 56" fill="none" {...line(INK, 1.4)} />
                </g>
            ),
        },
        { part: "fishTail", draw: PART_ART.fishTail.draw },
    ],
};

/** Ceo predmet u okviru 100 × 100 */
export function ThingPicture({ id, className }: { id: ThingId; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {THING_ART[id].map((layer, i) => (
                <g key={i}>{layer.draw()}</g>
            ))}
        </svg>
    );
}

/**
 * Predmet bez jednog dela: na njegovom mestu je rupa (ili ništa, kad `hole` nije uključen).
 * `placed` = deo je upravo vraćen (crta se normalno, preko rupe doleće posebno).
 */
export function ThingLayers({ id, missing, hole, placed, holeClassName }: { id: ThingId; missing: PartId | null; hole: boolean; placed: boolean; holeClassName?: string }) {
    return (
        <>
            {THING_ART[id].map((layer, i) => {
                if (layer.part && layer.part === missing && !placed)
                    return (
                        <g key={i} className={holeClassName}>
                            {hole ? PART_ART[layer.part].hole() : null}
                        </g>
                    );
                return <g key={i}>{layer.draw()}</g>;
            })}
        </>
    );
}

/** Kvadrat dela kao viewBox (malo vazduha oko dela) */
export function partViewBox(part: PartId, pad = 2): string {
    const [x, y, s] = PART_ART[part].box;
    return `${x - pad} ${y - pad} ${s + pad * 2} ${s + pad * 2}`;
}

/** Sam deo (kartica izbora): crta se u svom kvadratu, krupno */
export function PartPicture({ part, className }: { part: PartId; className?: string }) {
    return (
        <svg viewBox={partViewBox(part)} className={className} aria-hidden="true" focusable="false">
            {PART_ART[part].draw()}
        </svg>
    );
}
