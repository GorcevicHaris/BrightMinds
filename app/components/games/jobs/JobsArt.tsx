// Crteži igre „Ko šta radi?”: radnici do pojasa (svako zanimanje ima svoju uniformu, kapu i
// znak po kom ga dete prepoznaje — šlem, beli mantil sa slušalicama, plava kapa sa značkom…),
// njihovi alati, mesta gde rade i male slike nevolja („Gori kuća!”). Isti stil kao ostale
// slike: tanka tamnija ivica, odsjaj, oči sa sjajem i rumeni obrazi. Postojeće slike (hleb,
// makaze, avion, traktor, škola) dolaze iz pictures/ preko world/basePics.

import type { ReactNode } from "react";
import { Cheek, Eye, INK, line, Shine, Smile } from "@/app/components/games/pictures/kit";
import { Figure } from "@/app/components/games/scene/figures";
import { basePic } from "@/app/components/games/world/basePics";
import type { JobId } from "@/app/components/games/data/jobsLevels";

// ── Radnici ──────────────────────────────────────────────────────────────────

const SKIN = { light: "#f6d2b5", mid: "#e8b48f", tan: "#c98d62" } as const;
const SKIN_EDGE = { light: "#d9a77f", mid: "#c58b62", tan: "#9c6740" } as const;
type Skin = keyof typeof SKIN;

type Hair = "short" | "curly" | "bun" | "long" | "pony" | "hijab" | "none";
type Hat = "fire" | "police" | "chef" | "baker" | "pilot" | "hard" | "straw" | "mail" | "none";

interface Look {
    skin: Skin;
    hair: Hair;
    hairColor: string;
    hat: Hat;
    /** Boja uniforme i ivice */
    coat: string;
    coatEdge: string;
    /** Boja kruga iza lika */
    bg: string;
    detail?: (look: Look) => ReactNode;
    glasses?: boolean;
    beard?: boolean;
}

const HX = 50;
const HY = 46;
const HR = 19;

/** Ramena i uniforma (do donje ivice) */
function Body({ look }: { look: Look }) {
    return (
        <>
            <rect x={44} y={60} width={12} height={12} fill={SKIN[look.skin]} />
            <path d="M14 100 Q14 74 34 69 L66 69 Q86 74 86 100Z" fill={look.coat} {...line(look.coatEdge, 2)} />
            <path d="M40 69 L50 80 L60 69" fill={SKIN[look.skin]} {...line(look.coatEdge, 1.6)} />
        </>
    );
}

function HairBack({ look }: { look: Look }) {
    const c = look.hairColor;
    if (look.hair === "long") return <path d={`M${HX - 22} ${HY} Q${HX - 24} ${HY + 26} ${HX - 14} ${HY + 30} L${HX + 14} ${HY + 30} Q${HX + 24} ${HY + 26} ${HX + 22} ${HY}Z`} fill={c} />;
    if (look.hair === "bun") return <circle cx={HX} cy={HY - 22} r={8} fill={c} />;
    if (look.hair === "pony") return <path d={`M${HX + 16} ${HY - 6} Q${HX + 30} ${HY + 4} ${HX + 24} ${HY + 22} Q${HX + 20} ${HY + 8} ${HX + 12} ${HY + 2}Z`} fill={c} />;
    return null;
}

function HairFront({ look }: { look: Look }) {
    const c = look.hairColor;
    switch (look.hair) {
        case "short":
            return <path d={`M${HX - 19} ${HY - 2} Q${HX - 20} ${HY - 22} ${HX} ${HY - 21} Q${HX + 20} ${HY - 22} ${HX + 19} ${HY - 2} Q${HX + 12} ${HY - 14} ${HX - 4} ${HY - 13} Q${HX - 14} ${HY - 12} ${HX - 19} ${HY - 2}Z`} fill={c} />;
        case "curly":
            return (
                <g fill={c}>
                    {[-16, -9, -2, 5, 12, 17].map((dx, i) => (
                        <circle key={i} cx={HX + dx} cy={HY - 15 - (i % 2) * 3} r={7} />
                    ))}
                    <circle cx={HX - 18} cy={HY - 6} r={5} />
                    <circle cx={HX + 18} cy={HY - 6} r={5} />
                </g>
            );
        case "bun":
        case "long":
        case "pony":
            return <path d={`M${HX - 20} ${HY + 2} Q${HX - 22} ${HY - 22} ${HX} ${HY - 21} Q${HX + 22} ${HY - 22} ${HX + 20} ${HY + 2} Q${HX + 14} ${HY - 10} ${HX + 2} ${HY - 14} Q${HX - 10} ${HY - 8} ${HX - 20} ${HY + 2}Z`} fill={c} />;
        default:
            return null;
    }
}

/** Marama: pokriva kosu i vrat, lice ostaje otvoreno */
function Hijab({ color }: { color: string }) {
    return (
        <g>
            <path d={`M${HX - 24} ${HY + 2} Q${HX - 26} ${HY - 26} ${HX} ${HY - 26} Q${HX + 26} ${HY - 26} ${HX + 24} ${HY + 2} Q${HX + 26} ${HY + 22} ${HX + 30} ${HY + 30} L${HX - 30} ${HY + 30} Q${HX - 26} ${HY + 22} ${HX - 24} ${HY + 2}Z`} fill={color} {...line("#00000022", 1.4)} />
            <path d={`M${HX - 14} ${HY - 20} Q${HX} ${HY - 24} ${HX + 14} ${HY - 20}`} fill="none" {...line("#ffffff", 2)} opacity={0.35} />
        </g>
    );
}

function Face({ look }: { look: Look }) {
    const hijab = look.hair === "hijab";
    return (
        <g>
            {!hijab && (
                <>
                    <circle cx={HX - HR} cy={HY + 2} r={4.5} fill={SKIN[look.skin]} {...line(SKIN_EDGE[look.skin], 1.2)} />
                    <circle cx={HX + HR} cy={HY + 2} r={4.5} fill={SKIN[look.skin]} {...line(SKIN_EDGE[look.skin], 1.2)} />
                </>
            )}
            {hijab ? (
                <ellipse cx={HX} cy={HY + 2} rx={15.5} ry={18} fill={SKIN[look.skin]} {...line(SKIN_EDGE[look.skin], 1.2)} />
            ) : (
                <circle cx={HX} cy={HY} r={HR} fill={SKIN[look.skin]} {...line(SKIN_EDGE[look.skin], 1.4)} />
            )}
            <Eye x={HX - 7} y={HY + 1} r={2.6} />
            <Eye x={HX + 7} y={HY + 1} r={2.6} />
            <Cheek x={HX - 11} y={HY + 8} r={3} />
            <Cheek x={HX + 11} y={HY + 8} r={3} />
            {look.beard && <path d={`M${HX - 14} ${HY + 6} Q${HX - 12} ${HY + 20} ${HX} ${HY + 20} Q${HX + 12} ${HY + 20} ${HX + 14} ${HY + 6} Q${HX + 6} ${HY + 12} ${HX} ${HY + 12} Q${HX - 6} ${HY + 12} ${HX - 14} ${HY + 6}Z`} fill={look.hairColor} />}
            <Smile x={HX} y={HY + 9} w={4.5} />
            {look.glasses && (
                <g fill="none" {...line(INK, 1.4)}>
                    <circle cx={HX - 7} cy={HY + 1} r={5} />
                    <circle cx={HX + 7} cy={HY + 1} r={5} />
                    <path d={`M${HX - 2} ${HY + 1} L${HX + 2} ${HY + 1}`} />
                </g>
            )}
        </g>
    );
}

function HatArt({ hat }: { hat: Hat }) {
    switch (hat) {
        case "fire":
            return (
                <g>
                    <path d={`M${HX - 26} ${HY - 6} Q${HX} ${HY - 2} ${HX + 26} ${HY - 6} L${HX + 22} ${HY - 10} Q${HX} ${HY - 7} ${HX - 22} ${HY - 10}Z`} fill="#c8352b" {...line("#8f1f18", 1.4)} />
                    <path d={`M${HX - 20} ${HY - 9} Q${HX - 20} ${HY - 32} ${HX} ${HY - 32} Q${HX + 20} ${HY - 32} ${HX + 20} ${HY - 9}Z`} fill="#e8463f" {...line("#8f1f18", 1.6)} />
                    <path d={`M${HX} ${HY - 32} L${HX} ${HY - 10}`} {...line("#8f1f18", 2)} />
                    <rect x={HX - 6} y={HY - 24} width={12} height={10} rx={2} fill="#f6c518" {...line("#a87b10", 1.2)} />
                </g>
            );
        case "police":
            return (
                <g>
                    <path d={`M${HX - 22} ${HY - 12} Q${HX - 24} ${HY - 30} ${HX} ${HY - 30} Q${HX + 26} ${HY - 30} ${HX + 22} ${HY - 12}Z`} fill="#26346b" {...line("#141c40", 1.6)} />
                    <rect x={HX - 21} y={HY - 14} width={42} height={6} rx={2} fill="#141c40" />
                    <path d={`M${HX - 18} ${HY - 8} Q${HX} ${HY - 2} ${HX + 18} ${HY - 8}`} fill="#141c40" />
                    <path d={`M${HX} ${HY - 27} l4 3 l0 5 l-4 3 l-4 -3 l0 -5z`} fill="#f6c518" {...line("#a87b10", 1)} />
                </g>
            );
        case "chef":
            return (
                <g>
                    <rect x={HX - 15} y={HY - 26} width={30} height={12} rx={2} fill="#ffffff" {...line("#b9b2d8", 1.4)} />
                    <path d={`M${HX - 16} ${HY - 24} Q${HX - 26} ${HY - 34} ${HX - 16} ${HY - 42} Q${HX - 10} ${HY - 52} ${HX} ${HY - 46} Q${HX + 10} ${HY - 54} ${HX + 16} ${HY - 42} Q${HX + 26} ${HY - 34} ${HX + 16} ${HY - 24}Z`} fill="#ffffff" {...line("#b9b2d8", 1.4)} />
                </g>
            );
        case "baker":
            return (
                <g>
                    <path d={`M${HX - 20} ${HY - 10} Q${HX - 22} ${HY - 30} ${HX} ${HY - 30} Q${HX + 22} ${HY - 30} ${HX + 20} ${HY - 10}Z`} fill="#ffffff" {...line("#b9b2d8", 1.4)} />
                    <rect x={HX - 20} y={HY - 14} width={40} height={6} rx={3} fill="#f2e2b8" {...line("#c9a86a", 1.2)} />
                </g>
            );
        case "pilot":
            return (
                <g>
                    <path d={`M${HX - 21} ${HY - 12} Q${HX - 22} ${HY - 30} ${HX} ${HY - 30} Q${HX + 22} ${HY - 30} ${HX + 21} ${HY - 12}Z`} fill="#1f2a4d" {...line("#0f1630", 1.6)} />
                    <rect x={HX - 21} y={HY - 14} width={42} height={5} rx={2} fill="#f6c518" />
                    <path d={`M${HX - 19} ${HY - 9} Q${HX} ${HY - 3} ${HX + 19} ${HY - 9}`} fill="#0f1630" />
                    <path d={`M${HX - 9} ${HY - 22} L${HX - 2} ${HY - 22} L${HX} ${HY - 19} L${HX + 2} ${HY - 22} L${HX + 9} ${HY - 22} L${HX + 2} ${HY - 18} L${HX - 2} ${HY - 18}Z`} fill="#f6c518" />
                </g>
            );
        case "hard":
            return (
                <g>
                    <path d={`M${HX - 26} ${HY - 8} L${HX + 26} ${HY - 8} L${HX + 26} ${HY - 4} L${HX - 26} ${HY - 4}Z`} fill="#e0a812" {...line("#a87b10", 1.2)} />
                    <path d={`M${HX - 20} ${HY - 8} Q${HX - 20} ${HY - 32} ${HX} ${HY - 32} Q${HX + 20} ${HY - 32} ${HX + 20} ${HY - 8}Z`} fill="#f6c518" {...line("#a87b10", 1.6)} />
                    <path d={`M${HX - 4} ${HY - 31} L${HX - 4} ${HY - 10} M${HX + 4} ${HY - 31} L${HX + 4} ${HY - 10}`} {...line("#e0a812", 2)} />
                </g>
            );
        case "straw":
            return (
                <g>
                    <ellipse cx={HX} cy={HY - 10} rx={30} ry={7} fill="#e8c36a" {...line("#b88a2a", 1.4)} />
                    <path d={`M${HX - 16} ${HY - 11} Q${HX - 16} ${HY - 30} ${HX} ${HY - 30} Q${HX + 16} ${HY - 30} ${HX + 16} ${HY - 11}Z`} fill="#f0d27a" {...line("#b88a2a", 1.4)} />
                    <rect x={HX - 16} y={HY - 17} width={32} height={5} fill="#c8352b" />
                </g>
            );
        case "mail":
            return (
                <g>
                    <path d={`M${HX - 20} ${HY - 12} Q${HX - 22} ${HY - 30} ${HX} ${HY - 30} Q${HX + 22} ${HY - 30} ${HX + 20} ${HY - 12}Z`} fill="#2f7fc8" {...line("#1f5a94", 1.6)} />
                    <path d={`M${HX - 18} ${HY - 10} Q${HX} ${HY - 4} ${HX + 18} ${HY - 10} L${HX + 18} ${HY - 14} L${HX - 18} ${HY - 14}Z`} fill="#1f5a94" />
                    <rect x={HX - 6} y={HY - 26} width={12} height={8} rx={1.5} fill="#f6c518" />
                    <path d={`M${HX - 6} ${HY - 26} L${HX} ${HY - 21} L${HX + 6} ${HY - 26}`} fill="none" {...line("#a87b10", 1)} />
                </g>
            );
        default:
            return null;
    }
}

/** Slušalice oko vrata (doktorka) */
const Stetho = () => (
    <g fill="none" {...line("#4a5a7a", 2.4)}>
        <path d="M38 70 Q36 86 44 90 M62 70 Q64 86 56 90" />
        <path d="M44 90 Q50 96 56 90" />
        <circle cx={60} cy={92} r={3.5} fill="#c9d2e2" />
    </g>
);

/** Značka na grudima */
const Badge = ({ x = 64, y = 82, color = "#f6c518" }: { x?: number; y?: number; color?: string }) => (
    <path d={`M${x} ${y - 5} l4 2.5 l0 5 l-4 2.5 l-4 -2.5 l0 -5z`} fill={color} {...line("#a87b10", 1)} />
);

const LOOKS: Record<JobId, Look> = {
    firefighter: {
        skin: "mid",
        hair: "short",
        hairColor: "#3b2a20",
        hat: "fire",
        coat: "#d9a62a",
        coatEdge: "#9a7210",
        bg: "#ffe1d6",
        detail: () => (
            <g>
                <path d="M15 90 L85 90 L85 95 L15 95Z" fill="#e8eef4" />
                <path d="M15 92.5 L85 92.5" {...line("#c9d2de", 1.4)} />
                <path d="M40 69 L40 100 M60 69 L60 100" {...line("#9a7210", 1.6)} />
            </g>
        ),
    },
    doctor: {
        skin: "light",
        hair: "hijab",
        hairColor: "#000",
        hat: "none",
        coat: "#ffffff",
        coatEdge: "#b9b2d8",
        bg: "#dff3fb",
        detail: () => (
            <g>
                <path d="M40 69 L50 80 L60 69 L58 100 L42 100Z" fill="#8fd0e8" />
                <Stetho />
            </g>
        ),
    },
    police: {
        skin: "light",
        hair: "short",
        hairColor: "#2a1d16",
        hat: "police",
        coat: "#2f4a8a",
        coatEdge: "#1c2d5c",
        bg: "#dfe6fa",
        detail: () => (
            <g>
                <path d="M47 74 L53 74 L52 92 L50 95 L48 92Z" fill="#1c2d5c" />
                <Badge x={66} y={82} />
                <rect x={26} y={80} width={12} height={8} rx={2} fill="#26407a" {...line("#1c2d5c", 1)} />
            </g>
        ),
    },
    cook: {
        skin: "light",
        hair: "short",
        hairColor: "#6b4226",
        hat: "chef",
        coat: "#ffffff",
        coatEdge: "#b9b2d8",
        bg: "#fff1d9",
        beard: true,
        detail: () => (
            <g fill="#b9b2d8">
                <circle cx={44} cy={84} r={1.8} />
                <circle cx={44} cy={93} r={1.8} />
                <circle cx={56} cy={84} r={1.8} />
                <circle cx={56} cy={93} r={1.8} />
                <path d="M40 70 Q50 78 60 70 L58 75 Q50 81 42 75Z" fill="#e8463f" />
            </g>
        ),
    },
    baker: {
        skin: "mid",
        hair: "short",
        hairColor: "#2a1d16",
        hat: "baker",
        coat: "#f4ecdf",
        coatEdge: "#c9a86a",
        bg: "#fbe9cf",
        detail: () => (
            <g>
                <path d="M32 80 L68 80 L70 100 L30 100Z" fill="#c98a4b" {...line("#8f5a2b", 1.4)} />
                <circle cx={40} cy={90} r={1.6} fill="#ffffff" opacity={0.7} />
                <circle cx={58} cy={86} r={1.4} fill="#ffffff" opacity={0.7} />
            </g>
        ),
    },
    teacher: {
        skin: "mid",
        hair: "bun",
        hairColor: "#5a3a26",
        hat: "none",
        coat: "#2fae9c",
        coatEdge: "#1f7a6e",
        bg: "#dff5ef",
        glasses: true,
        detail: () => (
            <g>
                <path d="M40 69 L50 80 L60 69" fill="#ffffff" {...line("#1f7a6e", 1.4)} />
                <g fill="#ffffff">
                    <circle cx={50} cy={86} r={1.6} />
                    <circle cx={50} cy={94} r={1.6} />
                </g>
            </g>
        ),
    },
    mail: {
        skin: "tan",
        hair: "short",
        hairColor: "#1f1610",
        hat: "mail",
        coat: "#2f7fc8",
        coatEdge: "#1f5a94",
        bg: "#fff4cc",
        detail: () => (
            <g>
                <path d="M30 72 L72 100" {...line("#8f5a2b", 5)} />
                <rect x={64} y={88} width={20} height={12} rx={2} fill="#c98a4b" {...line("#8f5a2b", 1.4)} />
            </g>
        ),
    },
    hairdresser: {
        skin: "light",
        hair: "pony",
        hairColor: "#a8552b",
        hat: "none",
        coat: "#f29bc0",
        coatEdge: "#c8648f",
        bg: "#fde4ef",
        detail: () => (
            <g>
                <rect x={58} y={80} width={14} height={14} rx={2} fill="#e07aa6" {...line("#c8648f", 1.2)} />
                <path d="M61 80 L61 72 M64 80 L64 70 M67 80 L67 72" {...line("#4a5a7a", 1.6)} />
            </g>
        ),
    },
    pilot: {
        skin: "light",
        hair: "short",
        hairColor: "#8a5a2b",
        hat: "pilot",
        coat: "#1f2a4d",
        coatEdge: "#0f1630",
        bg: "#dcecfb",
        detail: () => (
            <g>
                <path d="M40 69 L50 80 L60 69" fill="#ffffff" />
                <path d="M47 74 L53 74 L52 90 L50 92 L48 90Z" fill="#0f1630" />
                <path d="M58 82 L74 82 L70 85 L62 85Z" fill="#f6c518" />
                <path d="M18 96 L30 96 M70 96 L82 96" {...line("#f6c518", 2.4)} />
            </g>
        ),
    },
    farmer: {
        skin: "tan",
        hair: "short",
        hairColor: "#3b2a20",
        hat: "straw",
        coat: "#d9584a",
        coatEdge: "#a8392b",
        bg: "#e8f4d6",
        beard: true,
        detail: () => (
            <g>
                <path d="M16 86 L84 86 M14 96 L86 96" {...line("#f0a59c", 1.6)} />
                <path d="M30 84 L70 84 L72 100 L28 100Z" fill="#4a73b8" {...line("#2f4f8a", 1.4)} />
                <path d="M34 72 L34 86 M66 72 L66 86" {...line("#4a73b8", 4)} />
                <circle cx={34} cy={86} r={2} fill="#f6c518" />
                <circle cx={66} cy={86} r={2} fill="#f6c518" />
            </g>
        ),
    },
    dentist: {
        skin: "light",
        hair: "long",
        hairColor: "#2a1d16",
        hat: "none",
        coat: "#8fe0c8",
        coatEdge: "#4fae92",
        bg: "#dcf6ee",
        detail: () => (
            <g>
                <path d="M40 69 L50 80 L60 69" fill="#ffffff" {...line("#4fae92", 1.4)} />
                <path d="M63 84 q3 -4 6 0 q1 6 -1.5 9 q-1.5 -3 -1.5 -3 q0 0 -1.5 3 q-2.5 -3 -1.5 -9z" fill="#ffffff" {...line("#4fae92", 1)} />
            </g>
        ),
    },
    builder: {
        skin: "mid",
        hair: "short",
        hairColor: "#1f1610",
        hat: "hard",
        coat: "#5a6a8a",
        coatEdge: "#3b4a6b",
        bg: "#f4ebd9",
        detail: () => (
            <g>
                <path d="M26 74 L40 70 L40 100 L22 100 Q20 84 26 74Z M74 74 L60 70 L60 100 L78 100 Q80 84 74 74Z" fill="#f28c28" {...line("#c86a12", 1.4)} />
                <path d="M23 90 L40 90 M60 90 L77 90" {...line("#e8eef4", 3)} />
            </g>
        ),
    },
    vet: {
        skin: "mid",
        hair: "hijab",
        hairColor: "#000",
        hat: "none",
        coat: "#7cc59a",
        coatEdge: "#4f9a72",
        bg: "#e3f4e6",
        detail: () => (
            <g>
                <path d="M40 69 L50 80 L60 69" fill="#ffffff" />
                <g transform="translate(64 86)">
                    <ellipse cx={0} cy={2} rx={4.4} ry={3.6} fill="#ffffff" />
                    <circle cx={-4.5} cy={-3} r={1.8} fill="#ffffff" />
                    <circle cx={-1.5} cy={-5} r={1.8} fill="#ffffff" />
                    <circle cx={1.8} cy={-5} r={1.8} fill="#ffffff" />
                    <circle cx={4.6} cy={-3} r={1.8} fill="#ffffff" />
                </g>
            </g>
        ),
    },
    seller: {
        skin: "light",
        hair: "curly",
        hairColor: "#3b2a20",
        hat: "none",
        coat: "#e86a6a",
        coatEdge: "#b94848",
        bg: "#fde6e2",
        detail: () => (
            <g>
                <path d="M34 78 L66 78 L68 100 L32 100Z" fill="#ffffff" {...line("#c9b8a8", 1.4)} />
                <rect x={54} y={82} width={10} height={6} rx={1.5} fill="#f6c518" />
            </g>
        ),
    },
};

/** Boja marame (doktorka Emina, veterinarka Ilma) */
const HIJAB: Partial<Record<JobId, string>> = { doctor: "#6c8fd8", vet: "#2f8a6a" };

export function WorkerArt({ id }: { id: JobId }) {
    const look = LOOKS[id];
    return (
        <g>
            <circle cx={50} cy={50} r={47} fill={look.bg} />
            <HairBack look={look} />
            <Body look={look} />
            {look.detail?.(look)}
            {look.hair === "hijab" && <Hijab color={HIJAB[id] ?? "#7a6aa0"} />}
            <Face look={look} />
            <HairFront look={look} />
            <HatArt hat={look.hat} />
        </g>
    );
}

// ── Alati ─────────────────────────────────────────────────────────────────────

const G = ({ y = 92, rx = 30 }: { y?: number; rx?: number }) => <ellipse cx={50} cy={y} rx={rx} ry={3} fill="#1f1b3a" opacity={0.08} />;

const TOOLS: Record<string, () => ReactNode> = {
    hose: () => (
        <>
            <G />
            <circle cx={44} cy={58} r={26} fill="none" {...line("#c8352b", 9)} />
            <circle cx={44} cy={58} r={14} fill="none" {...line("#e8463f", 8)} />
            <path d="M70 58 Q80 58 82 44 L86 26" fill="none" {...line("#c8352b", 8)} />
            <path d="M80 26 L92 26 L90 14 L82 14Z" fill="#c9c9d6" {...line("#8a8aa0", 1.6)} />
            <g fill="#6cc0e8">
                <circle cx={84} cy={8} r={2.4} />
                <circle cx={90} cy={6} r={2} />
                <circle cx={78} cy={6} r={1.8} />
            </g>
        </>
    ),
    ladder: () => (
        <>
            <G />
            <g transform="rotate(8 50 50)">
                <path d="M32 4 L32 94 M68 4 L68 94" {...line("#c98a4b", 6)} />
                {[16, 32, 48, 64, 80].map((y) => (
                    <path key={y} d={`M32 ${y} L68 ${y}`} {...line("#e0a86a", 5)} />
                ))}
            </g>
        </>
    ),
    stethoscope: () => (
        <>
            <path d="M30 10 Q22 46 44 60 M70 10 Q78 46 56 60" fill="none" {...line("#4a5a7a", 5)} />
            <path d="M44 60 Q50 66 56 60" fill="none" {...line("#4a5a7a", 5)} />
            <path d="M50 64 Q50 86 66 86" fill="none" {...line("#4a5a7a", 5)} />
            <circle cx={72} cy={84} r={11} fill="#c9d2e2" {...line("#4a5a7a", 3)} />
            <circle cx={72} cy={84} r={5} fill="#e8eef4" />
            <circle cx={30} cy={10} r={4} fill="#4a5a7a" />
            <circle cx={70} cy={10} r={4} fill="#4a5a7a" />
        </>
    ),
    bandage: () => (
        <g transform="rotate(-30 50 50)">
            <rect x={8} y={36} width={84} height={28} rx={14} fill="#f2c8a0" {...line("#c9935f", 2)} />
            <rect x={36} y={38} width={28} height={24} rx={4} fill="#f8e2c8" {...line("#c9935f", 1.4)} />
            <g fill="#c9935f" opacity={0.7}>
                {[16, 22, 78, 84].map((x) => (
                    <circle key={x} cx={x} cy={46} r={1.4} />
                ))}
                {[16, 22, 78, 84].map((x) => (
                    <circle key={`b${x}`} cx={x} cy={54} r={1.4} />
                ))}
            </g>
        </g>
    ),
    whistle: () => (
        <>
            <G />
            <path d="M14 46 L52 46 Q86 44 86 66 Q86 86 64 86 Q46 86 44 70 L44 60 L14 60Z" fill="#c9c9d6" {...line("#6a6a80", 2.4)} />
            <circle cx={64} cy={66} r={9} fill="#9a9ab0" />
            <rect x={12} y={44} width={10} height={18} rx={2} fill="#9a9ab0" />
            <path d="M17 44 Q14 18 40 14 Q62 12 66 46" fill="none" {...line("#e8463f", 3)} />
            <Shine x={58} y={56} rx={3} ry={6} rotate={60} />
        </>
    ),
    policeCar: () => (
        <>
            <G y={88} rx={42} />
            <path d="M10 70 L10 56 Q12 48 22 46 L32 34 Q36 30 44 30 L62 30 Q70 30 74 36 L82 46 Q92 48 92 58 L92 70Z" fill="#ffffff" {...line("#1c2d5c", 2.2)} />
            <path d="M10 58 L92 58 L92 66 L10 66Z" fill="#2f4a8a" />
            <path d="M34 36 L44 36 L44 46 L28 46Z M50 36 L62 36 Q66 36 70 46 L50 46Z" fill="#bfe6fb" {...line("#1c2d5c", 1.4)} />
            <rect x={40} y={22} width={20} height={9} rx={3} fill="#3a7be8" {...line("#1c2d5c", 1.2)} />
            <rect x={50} y={22} width={10} height={9} rx={2} fill="#e8463f" />
            <circle cx={28} cy={72} r={10} fill="#3b3b4b" />
            <circle cx={28} cy={72} r={4} fill="#c9c9d6" />
            <circle cx={74} cy={72} r={10} fill="#3b3b4b" />
            <circle cx={74} cy={72} r={4} fill="#c9c9d6" />
        </>
    ),
    policeCap: () => (
        <>
            <G y={84} rx={34} />
            <path d="M14 56 Q12 22 50 22 Q90 22 86 56Z" fill="#26346b" {...line("#141c40", 2)} />
            <rect x={14} y={52} width={72} height={12} rx={3} fill="#141c40" />
            <path d="M18 64 Q50 84 82 64Z" fill="#0f1630" />
            <path d="M50 30 l9 6 l0 11 l-9 6 l-9 -6 l0 -11z" fill="#f6c518" {...line("#a87b10", 1.6)} />
        </>
    ),
    pot: () => (
        <>
            <G />
            <path d="M18 40 L82 40 L78 84 Q50 92 22 84Z" fill="#9aa3b5" {...line("#5a6378", 2.4)} />
            <ellipse cx={50} cy={40} rx={34} ry={7} fill="#c9cfdb" {...line("#5a6378", 2.2)} />
            <path d="M18 46 L6 44 M82 46 L94 44" {...line("#5a6378", 5)} />
            <Shine x={28} y={60} rx={3} ry={10} rotate={0} />
            <g fill="none" {...line("#c9b8a8", 2.4)} opacity={0.9}>
                <path d="M38 30 q-5 -7 0 -13 q5 -6 0 -13" />
                <path d="M54 28 q-5 -7 0 -13 q5 -6 0 -13" />
            </g>
        </>
    ),
    ladle: () => (
        <g transform="rotate(-35 50 50)">
            <path d="M50 4 L50 62" {...line("#8a8fa0", 6)} />
            <path d="M30 64 Q30 90 50 90 Q70 90 70 64Z" fill="#c9cfdb" {...line("#5a6378", 2.4)} />
            <ellipse cx={50} cy={64} rx={20} ry={5} fill="#e8604a" opacity={0.7} />
            <circle cx={50} cy={6} r={4} fill="#5a6378" />
        </g>
    ),
    chefHat: () => (
        <>
            <G y={92} rx={28} />
            <rect x={26} y={64} width={48} height={24} rx={4} fill="#ffffff" {...line("#b9b2d8", 2)} />
            <path d="M26 66 Q8 52 24 36 Q28 14 46 22 Q58 6 72 22 Q92 24 84 46 Q92 58 74 66Z" fill="#ffffff" {...line("#b9b2d8", 2)} />
            <path d="M38 66 L38 50 M50 66 L50 46 M62 66 L62 50" {...line("#e6e1ee", 2)} />
        </>
    ),
    rollingPin: () => (
        <g transform="rotate(-20 50 50)">
            <rect x={20} y={38} width={60} height={24} rx={10} fill="#e0b07a" {...line("#a8703a", 2.2)} />
            <rect x={6} y={44} width={16} height={12} rx={5} fill="#c98a4b" {...line("#a8703a", 2)} />
            <rect x={78} y={44} width={16} height={12} rx={5} fill="#c98a4b" {...line("#a8703a", 2)} />
            <path d="M28 44 L72 44" {...line("#f2d2a8", 3)} />
        </g>
    ),
    board: () => (
        <>
            <rect x={8} y={14} width={84} height={60} rx={4} fill="#2f6b4a" {...line("#8b5e3c", 5)} />
            <g fill="none" {...line("#ffffff", 2.4)} opacity={0.9}>
                <path d="M18 34 L24 24 L30 34 M20 30 L28 30" />
                <path d="M38 24 L38 34 M34 28 L42 28" />
                <path d="M48 26 L52 24 L52 34" />
                <path d="M60 28 L68 28 M60 31 L68 31" />
                <path d="M74 26 Q80 22 80 28 Q80 31 74 34 L81 34" />
                <circle cx={30} cy={54} r={6} />
                <path d="M50 60 L58 46 L66 60Z" />
            </g>
            <path d="M24 74 L18 92 M76 74 L82 92" {...line("#8b5e3c", 4)} />
            <rect x={60} y={68} width={14} height={4} rx={1.5} fill="#ffffff" />
        </>
    ),
    globe: () => (
        <>
            <G />
            <path d="M50 92 L50 82 M36 92 L64 92" {...line("#8b5e3c", 4)} />
            <path d="M22 46 A30 30 0 0 0 78 64" fill="none" {...line("#c9971a", 3)} />
            <circle cx={50} cy={46} r={28} fill="#5aa8e8" {...line("#2f6fa8", 2)} />
            <path d="M34 30 Q42 26 46 34 Q40 40 44 46 Q36 50 30 42Z M56 50 Q66 46 70 54 Q66 66 58 64 Q52 58 56 50Z M52 24 Q60 22 64 28 Q58 32 52 28Z" fill="#7cc56a" />
            <Shine x={38} y={32} rx={4} ry={8} rotate={30} />
        </>
    ),
    letter: () => (
        <>
            <G y={84} />
            <rect x={10} y={26} width={80} height={52} rx={5} fill="#ffffff" {...line("#b9b2d8", 2.2)} />
            <path d="M10 30 L50 58 L90 30" fill="none" {...line("#b9b2d8", 2.2)} />
            <rect x={70} y={32} width={14} height={16} rx={1.5} fill="#e8604a" />
            <path d="M74 38 q3 -3 6 0 q-3 5 -6 0z" fill="#ffffff" />
        </>
    ),
    parcel: () => (
        <>
            <G />
            <path d="M14 40 L50 26 L86 40 L50 54Z" fill="#e8c38a" {...line("#a8703a", 2)} />
            <path d="M14 40 L14 78 L50 92 L50 54Z" fill="#d9a35f" {...line("#a8703a", 2)} />
            <path d="M86 40 L86 78 L50 92 L50 54Z" fill="#c38a48" {...line("#a8703a", 2)} />
            <path d="M32 33 L68 47 L68 64 M32 47 L32 84" fill="none" {...line("#f2e2b8", 4)} />
        </>
    ),
    mailbox: () => (
        <>
            <G y={94} rx={20} />
            <rect x={44} y={60} width={12} height={34} fill="#8a8a9a" />
            <path d="M20 30 Q20 12 50 12 Q80 12 80 30 L80 64 L20 64Z" fill="#f6c518" {...line("#b88a10", 2.4)} />
            <rect x={30} y={30} width={40} height={6} rx={3} fill="#3b3b4b" />
            <path d="M34 46 l16 10 l16 -10" fill="none" {...line("#b88a10", 3)} />
            <rect x={34} y={42} width={32} height={16} rx={2} fill="none" {...line("#b88a10", 2)} />
        </>
    ),
    comb: () => (
        <g transform="rotate(-15 50 50)">
            <rect x={10} y={30} width={80} height={16} rx={6} fill="#e07aa6" {...line("#b04f7a", 2)} />
            {Array.from({ length: 12 }, (_, i) => (
                <rect key={i} x={14 + i * 6.2} y={44} width={3.4} height={26} rx={1.5} fill="#e07aa6" {...line("#b04f7a", 1)} />
            ))}
        </g>
    ),
    hairDryer: () => (
        <>
            <G />
            <path d="M14 34 Q14 18 34 18 L66 18 Q78 18 78 30 L78 40 Q78 50 66 50 L34 50 Q14 50 14 34Z" fill="#8a7be8" {...line("#5a4ac0", 2.2)} />
            <rect x={78} y={22} width={12} height={24} rx={3} fill="#5a4ac0" />
            <path d="M40 50 L36 86 Q36 92 44 92 L50 92 Q56 92 56 86 L58 50Z" fill="#8a7be8" {...line("#5a4ac0", 2.2)} />
            <circle cx={30} cy={34} r={8} fill="#c4bcf5" />
            <path d="M92 26 L98 24 M92 34 L99 34 M92 42 L98 44" {...line("#aab8d0", 2)} />
        </>
    ),
    pilotCap: () => (
        <>
            <G y={84} rx={34} />
            <path d="M14 56 Q12 22 50 22 Q90 22 86 56Z" fill="#1f2a4d" {...line("#0f1630", 2)} />
            <rect x={14} y={52} width={72} height={10} rx={3} fill="#f6c518" />
            <path d="M18 62 Q50 82 82 62Z" fill="#0f1630" />
            <path d="M26 36 L44 36 L50 42 L56 36 L74 36 L58 44 L42 44Z" fill="#f6c518" {...line("#a87b10", 1.2)} />
        </>
    ),
    pitchfork: () => (
        <g transform="rotate(25 50 50)">
            <path d="M50 30 L50 98" {...line("#a8703a", 6)} />
            <path d="M30 32 L70 32" {...line("#8a8fa0", 5)} />
            <path d="M30 32 L30 4 M43 32 L43 2 M57 32 L57 2 M70 32 L70 4" {...line("#8a8fa0", 4)} />
        </g>
    ),
    wateringCan: () => (
        <>
            <G />
            <path d="M24 40 L66 40 L64 86 L26 86Z" fill="#3fae6a" {...line("#257a48", 2.4)} />
            <path d="M66 54 L88 30" {...line("#257a48", 7)} />
            <rect x={84} y={22} width={12} height={10} rx={2} fill="#257a48" transform="rotate(-45 90 27)" />
            <path d="M24 46 Q6 52 18 70" fill="none" {...line("#257a48", 5)} />
            <path d="M34 40 Q45 22 56 40" fill="none" {...line("#257a48", 5)} />
            <g fill="#6cc0e8">
                <circle cx={94} cy={42} r={2} />
                <circle cx={90} cy={50} r={2} />
                <circle cx={96} cy={54} r={1.6} />
            </g>
        </>
    ),
    tooth: () => (
        <>
            <G y={94} rx={22} />
            <path d="M24 26 Q24 10 40 12 Q50 16 60 12 Q76 10 76 26 Q78 46 70 62 Q66 76 64 90 Q58 94 56 86 Q54 72 50 70 Q46 72 44 86 Q42 94 36 90 Q34 76 30 62 Q22 46 24 26Z" fill="#ffffff" {...line("#9aa3c8", 2.4)} />
            <Shine x={36} y={28} rx={3} ry={8} rotate={-20} opacity={0.9} />
            <Eye x={42} y={38} r={2.6} />
            <Eye x={58} y={38} r={2.6} />
            <Smile x={50} y={46} w={5} />
            <Cheek x={36} y={46} r={3} />
            <Cheek x={64} y={46} r={3} />
        </>
    ),
    dentalMirror: () => (
        <g transform="rotate(-35 50 50)">
            <path d="M50 30 L50 96" {...line("#8a8fa0", 6)} />
            <path d="M50 32 L58 22" {...line("#8a8fa0", 4)} />
            <circle cx={64} cy={16} r={11} fill="#d8f0fb" {...line("#5a6378", 2.4)} />
            <Shine x={60} y={12} rx={2.4} ry={5} rotate={30} opacity={0.9} />
            <rect x={45} y={70} width={10} height={26} rx={4} fill="#6cc0e8" />
        </g>
    ),
    bricks: () => {
        const rows = [0, 1, 2, 3];
        return (
            <>
                <G y={94} rx={40} />
                {rows.map((r) =>
                    [0, 1, 2].map((c) => {
                        const x = 10 + c * 28 + (r % 2 === 0 ? 0 : -14);
                        if (x < 0 || x + 26 > 104) return null;
                        return <rect key={`${r}-${c}`} x={x} y={74 - r * 18} width={26} height={16} rx={2} fill={(r + c) % 2 === 0 ? "#d9584a" : "#c84a3c"} {...line("#8f2f22", 1.6)} />;
                    })
                )}
            </>
        );
    },
    hardHat: () => (
        <>
            <G y={86} rx={40} />
            <path d="M8 66 L92 66 L92 74 L8 74Z" fill="#e0a812" {...line("#a87b10", 2)} />
            <path d="M18 66 Q18 22 50 22 Q82 22 82 66Z" fill="#f6c518" {...line("#a87b10", 2.4)} />
            <path d="M42 24 L42 64 M58 24 L58 64" {...line("#e0a812", 4)} />
            <Shine x={32} y={40} rx={4} ry={10} rotate={30} />
        </>
    ),
    register: () => (
        <>
            <G y={94} rx={40} />
            <path d="M12 56 L88 56 L92 92 L8 92Z" fill="#5a6a8a" {...line("#3b4a6b", 2.2)} />
            <rect x={20} y={62} width={60} height={22} rx={3} fill="#3b4a6b" />
            <g fill="#c9d2e2">
                {[0, 1, 2, 3].map((c) => [0, 1].map((r) => <rect key={`${c}${r}`} x={24 + c * 14} y={65 + r * 10} width={10} height={7} rx={1.5} />))}
            </g>
            <rect x={30} y={18} width={40} height={30} rx={4} fill="#3b4a6b" />
            <rect x={35} y={23} width={30} height={14} rx={2} fill="#8fe0c8" />
            <path d="M48 48 L48 56 M52 48 L52 56" {...line("#3b4a6b", 4)} />
        </>
    ),
    shopBasket: () => (
        <>
            <G y={92} rx={36} />
            <path d="M24 44 Q24 14 50 14 Q76 14 76 44" fill="none" {...line("#2f8a6a", 6)} />
            {basePic("p:apple", 22, 22, 28)}
            {basePic("p:banana", 46, 24, 30)}
            <path d="M10 44 L90 44 L82 88 Q50 94 18 88Z" fill="#3fae84" {...line("#2f8a6a", 2.4)} />
            <g {...line("#2f8a6a", 2)}>
                <path d="M14 58 L86 58 M16 72 L84 72" />
                <path d="M32 44 L34 90 M50 44 L50 92 M68 44 L66 90" />
            </g>
        </>
    ),
    coins: () => {
        const coin = (x: number, y: number, r: number, c: string, e: string) => (
            <g>
                <circle cx={x} cy={y + 3} r={r} fill={e} />
                <circle cx={x} cy={y} r={r} fill={c} {...line(e, 2)} />
                <circle cx={x} cy={y} r={r * 0.68} fill="none" {...line(e, 1.6)} opacity={0.7} />
                <Shine x={x - r * 0.4} y={y - r * 0.4} rx={r * 0.12} ry={r * 0.3} rotate={40} />
            </g>
        );
        return (
            <>
                <G y={92} rx={38} />
                <rect x={14} y={30} width={56} height={32} rx={4} fill="#7cc59a" {...line("#3f8a5a", 2)} transform="rotate(-10 42 46)" />
                <circle cx={42} cy={46} r={8} fill="#a8dcb8" transform="rotate(-10 42 46)" />
                {coin(66, 66, 18, "#f6c518", "#b88a10")}
                {coin(34, 74, 14, "#d9d9e4", "#8a8aa0")}
            </>
        );
    },
};

// ── Mesta rada ───────────────────────────────────────────────────────────────

interface BuildingProps {
    wall: string;
    roof: string;
    edge: string;
    sign: ReactNode;
    awning?: string;
    garage?: string;
    sky?: string;
}

/** Zgrada sa znakom iznad vrata: po znaku dete prepoznaje šta je unutra */
function Building({ wall, roof, edge, sign, awning, garage, sky = "#dff1fb" }: BuildingProps) {
    return (
        <>
            <rect x={2} y={2} width={96} height={96} rx={14} fill={sky} />
            <path d="M2 86 L98 86 L98 84 Q98 98 84 98 L16 98 Q2 98 2 84Z" fill="#9ad66a" />
            <path d="M10 40 L50 14 L90 40Z" fill={roof} {...line(edge, 2)} />
            <rect x={14} y={40} width={72} height={48} fill={wall} {...line(edge, 2)} />
            {awning && (
                <g>
                    <path d="M12 52 L88 52 L84 60 L16 60Z" fill={awning} {...line(edge, 1.4)} />
                    {[0, 1, 2, 3, 4].map((i) => (
                        <path key={i} d={`M${20 + i * 15} 52 L${27 + i * 15} 52 L${26 + i * 15} 60 L${19 + i * 15} 60Z`} fill="#ffffff" opacity={0.85} />
                    ))}
                </g>
            )}
            {garage ? (
                <>
                    <rect x={22} y={60} width={34} height={28} rx={2} fill={garage} {...line(edge, 1.6)} />
                    {[66, 72, 78].map((y) => (
                        <path key={y} d={`M24 ${y} L54 ${y}`} {...line(edge, 1.2)} opacity={0.6} />
                    ))}
                    <rect x={62} y={64} width={16} height={24} rx={2} fill="#8b5e3c" />
                </>
            ) : (
                <>
                    <rect x={42} y={66} width={16} height={22} rx={2} fill="#8b5e3c" />
                    <rect x={20} y={64} width={14} height={12} rx={2} fill="#cfeefc" {...line(edge, 1.2)} />
                    <rect x={66} y={64} width={14} height={12} rx={2} fill="#cfeefc" {...line(edge, 1.2)} />
                </>
            )}
            <circle cx={50} cy={31} r={10} fill="#ffffff" {...line(edge, 1.6)} />
            <svg x={41} y={22} width={18} height={18} viewBox="0 0 100 100">
                {sign}
            </svg>
        </>
    );
}

const PLACES: Record<string, () => ReactNode> = {
    station: () => (
        <Building wall="#e8604a" roof="#a8392b" edge="#8f2f22" garage="#f4e1c4" sign={<path d="M50 6 Q80 40 70 70 Q64 90 50 94 Q36 90 30 70 Q22 46 40 30 Q42 50 50 52 Q44 30 50 6Z" fill="#f28c28" />} />
    ),
    hospital: () => <Building wall="#ffffff" roof="#6cc0e8" edge="#5a8ab0" sign={<path d="M38 10 L62 10 L62 38 L90 38 L90 62 L62 62 L62 90 L38 90 L38 62 L10 62 L10 38 L38 38Z" fill="#e8463f" />} />,
    policeStation: () => <Building wall="#dfe6fa" roof="#2f4a8a" edge="#1c2d5c" sign={<path d="M50 6 L86 26 L86 64 L50 94 L14 64 L14 26Z" fill="#2f4a8a" />} />,
    restaurant: () => (
        <Building
            wall="#fff1d9"
            roof="#c75d2c"
            edge="#873c1f"
            awning="#e8604a"
            sign={
                <g fill="none" {...line("#5a6378", 9)}>
                    <path d="M28 8 L28 92 M14 8 L14 34 Q14 44 28 44 Q42 44 42 34 L42 8" />
                    <path d="M72 92 L72 8 Q88 20 86 50 L72 50" />
                </g>
            }
        />
    ),
    bakery: () => <Building wall="#fbe9cf" roof="#a8703a" edge="#7a4a22" awning="#c98a4b" sign={basePic("p:bread", 0, 0, 100)} />,
    postOffice: () => <Building wall="#fff4cc" roof="#2f7fc8" edge="#1f5a94" sign={TOOLS.letter()} />,
    salon: () => <Building wall="#fde4ef" roof="#c8648f" edge="#9a3f6a" awning="#e07aa6" sign={basePic("p:scissors", 0, 0, 100)} />,
    dentistOffice: () => <Building wall="#ffffff" roof="#4fae92" edge="#2f7a62" sign={TOOLS.tooth()} />,
    vetOffice: () => <Building wall="#e3f4e6" roof="#4f9a72" edge="#2f6a4a" sign={basePic("p:paw", 0, 0, 100)} />,
    shop: () => <Building wall="#fde6e2" roof="#b94848" edge="#8f2f22" awning="#e86a6a" sign={TOOLS.shopBasket()} />,
    airport: () => (
        <>
            <rect x={2} y={2} width={96} height={96} rx={14} fill="#dff1fb" />
            <path d="M2 80 L98 80 L98 84 Q98 98 84 98 L16 98 Q2 98 2 84Z" fill="#a8a29a" />
            <path d="M8 89 L24 89 M34 89 L50 89 M60 89 L76 89 M86 89 L96 89" {...line("#ffffff", 2.4)} />
            <rect x={66} y={36} width={14} height={44} fill="#e6e1ee" {...line("#8a8aa0", 1.6)} />
            <path d="M58 22 L88 22 L84 36 L62 36Z" fill="#5aa8e8" {...line("#2f6fa8", 1.6)} />
            <rect x={56} y={18} width={34} height={5} rx={2} fill="#8a8aa0" />
            {basePic("p:plane", 6, 30, 52)}
        </>
    ),
    farm: () => (
        <>
            <rect x={2} y={2} width={96} height={96} rx={14} fill="#dff1fb" />
            <path d="M2 80 L98 80 L98 84 Q98 98 84 98 L16 98 Q2 98 2 84Z" fill="#9ad66a" />
            <rect x={70} y={26} width={16} height={56} rx={8} fill="#c9cfdb" {...line("#8a8fa0", 1.6)} />
            <path d="M70 32 Q78 18 86 32" fill="#8a8fa0" />
            <path d="M12 44 L40 22 L68 44 L68 84 L12 84Z" fill="#d9584a" {...line("#8f2f22", 2)} />
            <path d="M12 44 L40 22 L68 44" fill="none" {...line("#ffffff", 3)} />
            <rect x={28} y={56} width={24} height={28} fill="#ffffff" {...line("#8f2f22", 1.6)} />
            <path d="M28 56 L52 84 M52 56 L28 84" {...line("#d9584a", 2)} />
            <path d="M2 74 L12 74 M68 74 L98 74 M2 80 L98 80" {...line("#ffffff", 2)} />
        </>
    ),
    site: () => (
        <>
            <rect x={2} y={2} width={96} height={96} rx={14} fill="#dff1fb" />
            <path d="M2 82 L98 82 L98 84 Q98 98 84 98 L16 98 Q2 98 2 84Z" fill="#d9c08a" />
            <path d="M20 82 L20 14 M20 18 L84 18 M20 30 L32 18" {...line("#f6c518", 5)} />
            <path d="M24 18 L24 82" {...line("#e0a812", 2)} />
            <path d="M72 18 L72 40" {...line("#5a6378", 1.6)} />
            <rect x={66} y={40} width={12} height={8} fill="#d9584a" />
            <g>
                {[0, 1, 2].map((r) =>
                    [0, 1, 2].map((c) => (
                        <rect key={`${r}${c}`} x={38 + c * 16 + (r % 2 ? 8 : 0)} y={70 - r * 10} width={15} height={9} rx={1} fill="#d9584a" {...line("#8f2f22", 1)} />
                    ))
                )}
            </g>
        </>
    ),
};

// ── Nevolje (ko nam pomaže) ───────────────────────────────────────────────────

/** Lik iz slika situacija u kvadratu */
function Kid({ id, face, pose = "stand", x = 0, y = 0, size = 100 }: { id: "lejla" | "amar" | "tarik"; face: "worried" | "pain" | "tired" | "calm" | "sad"; pose?: "stand" | "belly" | "mouth"; x?: number; y?: number; size?: number }) {
    return (
        <svg x={x} y={y} width={size} height={size} viewBox="-42 -84 84 88">
            <Figure id={id} pose={pose} face={face} />
        </svg>
    );
}

function Flames({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <path d="M0 0 Q-14 -10 -8 -26 Q-4 -18 0 -20 Q-2 -34 8 -42 Q8 -28 16 -22 Q20 -12 12 0Z" fill="#f28c28" />
            <path d="M2 0 Q-6 -8 -2 -16 Q2 -12 4 -14 Q4 -22 10 -26 Q12 -16 14 -10 Q14 -4 10 0Z" fill="#f6c518" />
        </g>
    );
}

const SITUATIONS_ART: Record<string, () => ReactNode> = {
    sitFire: () => (
        <>
            <rect x={2} y={2} width={96} height={96} rx={14} fill="#f6e3d8" />
            <g fill="#a8a29a" opacity={0.75}>
                <circle cx={64} cy={20} r={9} />
                <circle cx={76} cy={14} r={7} />
                <circle cx={54} cy={12} r={6} />
            </g>
            {basePic("p:house", 8, 18, 80)}
            <Flames x={58} y={34} s={1.1} />
            <Flames x={30} y={46} s={0.8} />
            <Flames x={70} y={62} s={0.7} />
        </>
    ),
    sitFever: () => (
        <>
            <rect x={2} y={2} width={96} height={96} rx={14} fill="#e8f0fb" />
            <path d="M6 72 L94 72 L94 96 L6 96Z" fill="#a8d8f0" />
            <Kid id="lejla" face="tired" x={0} y={-2} size={96} />
            <g transform="translate(58 36) rotate(30)">
                <rect x={0} y={-2.5} width={22} height={5} rx={2.5} fill="#ffffff" {...line("#8a8aa0", 1.2)} />
                <circle cx={22} cy={0} r={3.4} fill="#e8463f" />
                <rect x={8} y={-1} width={14} height={2} fill="#e8463f" />
            </g>
            <g fill="none" {...line("#f28c28", 2.4)}>
                <path d="M16 26 q4 -4 0 -8 q-4 -4 0 -8" />
                <path d="M84 26 q4 -4 0 -8 q-4 -4 0 -8" />
            </g>
        </>
    ),
    sitTooth: () => (
        <>
            <rect x={2} y={2} width={96} height={96} rx={14} fill="#e3f4ef" />
            <Kid id="amar" face="pain" pose="mouth" x={-6} y={2} size={96} />
            <g transform="translate(64 6) scale(0.34)">
                <circle cx={50} cy={50} r={46} fill="#ffffff" {...line("#9aa3c8", 4)} />
                {TOOLS.tooth()}
                <path d="M46 18 L54 34 L46 44 L54 58" fill="none" {...line("#e8463f", 4)} />
            </g>
        </>
    ),
    sitKitten: () => (
        <>
            <rect x={2} y={2} width={96} height={96} rx={14} fill="#eef6e8" />
            {basePic("p:kitten", 10, 10, 80)}
            <g transform="translate(26 74) rotate(-10)">
                <rect x={0} y={0} width={22} height={9} rx={4.5} fill="#f2c8a0" {...line("#c9935f", 1.4)} />
                <rect x={7} y={1} width={8} height={7} rx={1.5} fill="#f8e2c8" />
            </g>
        </>
    ),
    sitLost: () => (
        <>
            <rect x={2} y={2} width={96} height={96} rx={14} fill="#e6e8f4" />
            <rect x={2} y={74} width={96} height={24} fill="#c9c3bb" />
            <path d="M80 74 L80 20 Q80 12 88 12" fill="none" {...line("#5a6378", 3)} />
            <circle cx={88} cy={16} r={5} fill="#fff3b0" {...line("#5a6378", 1.4)} />
            <rect x={6} y={30} width={22} height={44} fill="#f4e1c4" {...line("#a8703a", 1.4)} />
            <rect x={10} y={36} width={6} height={6} fill="#cfeefc" />
            <rect x={18} y={36} width={6} height={6} fill="#cfeefc" />
            <Kid id="tarik" face="worried" x={14} y={4} size={88} />
            <g transform="translate(66 22)">
                <circle r={11} fill="#ffffff" {...line("#8a82f7", 2)} />
                <path d="M-3.5 -3 Q-3.5 -7 0 -7 Q4 -7 4 -3.5 Q4 -1 0 1 L0 3" fill="none" {...line("#6c61f0", 2.6)} />
                <circle cx={0} cy={6.5} r={1.6} fill="#6c61f0" />
            </g>
        </>
    ),
    sitHungry: () => (
        <>
            <rect x={2} y={2} width={96} height={96} rx={14} fill="#fff4dc" />
            <rect x={2} y={70} width={96} height={28} fill="#e0b07a" />
            <Kid id="amar" face="worried" pose="belly" x={-14} y={2} size={92} />
            {basePic("p:plate", 50, 56, 44)}
            <path d="M48 66 L48 86 M96 66 L96 86" {...line("#8a8fa0", 3)} />
        </>
    ),
    sitLetter: () => (
        <>
            <rect x={2} y={2} width={96} height={96} rx={14} fill="#fdf0e6" />
            <svg x={8} y={18} width={84} height={84} viewBox="0 0 100 100">
                {TOOLS.letter()}
            </svg>
            <path d="M74 22 C74 14 84 14 84 22 C84 28 74 34 74 34 C74 34 64 28 64 22 C64 14 74 14 74 22Z" fill="#e8604a" />
            <g fill="none" {...line("#c9b8a8", 2)}>
                <path d="M16 20 L26 20 M12 28 L24 28" />
            </g>
        </>
    ),
    sitBuild: () => (
        <>
            <rect x={2} y={2} width={96} height={96} rx={14} fill="#e4f2fb" />
            <path d="M2 84 L98 84 L98 84 Q98 98 84 98 L16 98 Q2 98 2 84Z" fill="#d9c08a" />
            <path d="M14 84 L14 44 L40 26 L66 44 L66 84" fill="none" {...line("#c98a4b", 3)} strokeDasharray="5 4" />
            <svg x={10} y={44} width={60} height={44} viewBox="0 20 100 80">
                {TOOLS.bricks()}
            </svg>
            <svg x={60} y={44} width={38} height={38} viewBox="0 0 100 100">
                {TOOLS.hardHat()}
            </svg>
        </>
    ),
};

// ── Jedna slika po ključu ─────────────────────────────────────────────────────

export function jobDrawing(pic: string): ReactNode {
    if (pic.startsWith("job:")) {
        const id = pic.slice(4) as JobId;
        return LOOKS[id] ? <WorkerArt id={id} /> : null;
    }
    if (pic.startsWith("p:") || pic.startsWith("a:")) return basePic(pic, 4, 4, 92);
    const draw = TOOLS[pic] ?? PLACES[pic] ?? SITUATIONS_ART[pic];
    return draw ? draw() : null;
}

export function hasJobDrawing(pic: string): boolean {
    return jobDrawing(pic) !== null;
}

export function JobPic({ pic, className }: { pic: string; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {jobDrawing(pic)}
        </svg>
    );
}
