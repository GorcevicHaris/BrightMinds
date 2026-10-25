// Životinje kojih nema u igrama „Šta jede?” i „Mama i beba”: kit, plavi leptir, puž, sova,
// hobotnica, delfin, bubamara, ćurka i irvas. Isti stil: okrenute ka detetu (ili bočno, kad se
// tako lakše prepoznaju), velike oči sa sjajem, blag osmeh, bez zuba i kandži; okvir 100 × 100.

import type { ReactNode } from "react";
import { Cheek, Eye, INK, line, Shadow, Shine, Smile } from "./kit";

export const CREATURE_ART = {
    // Plavi kit sa vodoskokom (u nivoima boja je plav)
    whale: () => (
        <g>
            <path d="M50 30 Q46 18 38 16 M50 30 Q54 18 62 16 M50 30 V14" fill="none" {...line("#5fb4f0", 3)} />
            <path d="M12 62 Q12 34 46 34 Q74 34 80 56 Q84 50 92 44 Q94 58 88 64 Q94 72 92 80 Q84 74 80 70 Q70 86 44 86 Q12 86 12 62Z" fill="#3e7bfa" {...line("#2a58c0")} />
            <path d="M16 68 Q30 82 54 80 Q70 78 76 70 Q60 74 44 72 Q26 72 16 68Z" fill="#cfe1ff" />
            <path d="M44 76 Q52 86 60 78" fill="#2a58c0" />
            <Eye x={30} y={54} r={3.4} />
            <Cheek x={38} y={63} r={3} />
            <Smile x={24} y={64} w={4} />
            <Shine x={28} y={42} rx={3} ry={7} rotate={60} opacity={0.35} />
        </g>
    ),
    // Plavi leptir (u nivoima boja je plav)
    butterflyBlue: () => (
        <g>
            <path d="M48 30 Q24 8 12 22 Q4 40 24 50 Q8 62 18 78 Q32 90 48 62Z" fill="#3e7bfa" {...line("#2a58c0")} />
            <path d="M52 30 Q76 8 88 22 Q96 40 76 50 Q92 62 82 78 Q68 90 52 62Z" fill="#3e7bfa" {...line("#2a58c0")} />
            <g fill="#9cc2ff">
                <circle cx={26} cy={30} r={6} />
                <circle cx={74} cy={30} r={6} />
                <circle cx={28} cy={68} r={4.5} />
                <circle cx={72} cy={68} r={4.5} />
            </g>
            <rect x={45} y={28} width={10} height={44} rx={5} fill="#3a3a5a" />
            <circle cx={50} cy={26} r={7} fill="#3a3a5a" />
            <path d="M47 21 Q42 10 36 9 M53 21 Q58 10 64 9" fill="none" {...line("#3a3a5a", 1.6)} />
            <circle cx={47.5} cy={25} r={1.4} fill="#ffffff" />
            <circle cx={52.5} cy={25} r={1.4} fill="#ffffff" />
        </g>
    ),
    snail: () => (
        <g>
            <Shadow cy={88} rx={36} />
            <path d="M10 86 Q12 74 24 74 H70 Q80 74 82 62 Q82 46 88 40 Q96 40 94 54 Q92 72 84 82 Q78 88 66 88 H16Q10 88 10 86Z" fill="#c9e08a" {...line("#8aa04a")} />
            <path d="M86 42 L82 28 M92 42 L96 28" {...line("#8aa04a", 1.8)} />
            <circle cx={82} cy={27} r={2.6} fill={INK} />
            <circle cx={96} cy={27} r={2.6} fill={INK} />
            <circle cx={46} cy={54} r={28} fill="#e0a05a" {...line("#a8683a")} />
            <path d="M46 54 Q46 46 54 48 Q62 52 58 62 Q52 72 40 68 Q28 62 30 50 Q32 34 48 32 Q66 32 72 48" fill="none" {...line("#a8683a", 2.2)} />
            <Shine x={32} y={40} rx={3} ry={6} rotate={40} opacity={0.4} />
            <path d="M86 58 Q89 61 92 58" fill="none" {...line(INK, 1.3)} />
            <Eye x={89} y={50} r={2.4} />
        </g>
    ),
    owl: () => (
        <g>
            <Shadow cy={95} rx={22} />
            <path d="M24 30 L28 14 L40 24Z M76 30 L72 14 L60 24Z" fill="#9a6a42" {...line("#6a4426")} />
            <ellipse cx={50} cy={58} rx={28} ry={34} fill="#a8784a" {...line("#6a4426")} />
            <ellipse cx={50} cy={70} rx={17} ry={20} fill="#f0d9b0" />
            <path d="M42 64 Q44 67 46 64 M54 64 Q56 67 58 64 M38 74 Q40 77 42 74 M48 74 Q50 77 52 74 M58 74 Q60 77 62 74 M44 84 Q46 87 48 84 M52 84 Q54 87 56 84" fill="none" {...line("#c9a06a", 1.2)} />
            <circle cx={38} cy={40} r={11} fill="#ffffff" {...line("#c9a06a", 1.2)} />
            <circle cx={62} cy={40} r={11} fill="#ffffff" {...line("#c9a06a", 1.2)} />
            <Eye x={38} y={41} r={5} />
            <Eye x={62} y={41} r={5} />
            <path d="M46 50 L54 50 L50 57Z" fill="#f6b13a" {...line("#c9831a", 1.2)} />
            <path d="M24 56 Q18 72 30 86 M76 56 Q82 72 70 86" fill="none" {...line("#6a4426", 2)} />
            <path d="M40 92 V96 M46 92 V96 M54 92 V96 M60 92 V96" {...line("#c9831a", 2.4)} />
        </g>
    ),
    octopus: () => (
        <g>
            <g fill="#f08aa8" {...line("#c95a7a")}>
                <path d="M24 56 Q10 70 14 86 Q20 80 22 72 Q28 66 32 62Z" />
                <path d="M34 62 Q26 80 32 94 Q38 84 38 76 Q42 70 44 64Z" />
                <path d="M46 64 Q46 82 54 94 Q58 82 54 74 Q54 68 54 64Z" />
                <path d="M56 64 Q64 78 72 88 Q74 76 66 68 Q64 64 64 62Z" />
                <path d="M66 60 Q82 66 88 80 Q90 66 78 58Z" />
            </g>
            <path d="M18 50 Q14 14 50 12 Q86 14 82 50 Q80 66 50 66 Q20 66 18 50Z" fill="#f59ab4" {...line("#c95a7a")} />
            <Eye x={38} y={40} r={4.2} />
            <Eye x={62} y={40} r={4.2} />
            <Cheek x={30} y={50} />
            <Cheek x={70} y={50} />
            <Smile x={50} y={50} w={5} />
            <Shine x={34} y={22} rx={4} ry={7} rotate={50} opacity={0.4} />
        </g>
    ),
    dolphin: () => (
        <g>
            <path d="M8 66 Q20 30 58 30 Q84 30 92 52 Q94 60 86 60 Q78 58 74 64 Q66 76 46 78 Q36 80 30 86 Q26 78 30 72 Q18 74 8 66Z" fill="#6fa8e8" {...line("#3f78c0")} />
            <path d="M52 30 Q52 16 66 14 Q60 22 62 31Z" fill="#6fa8e8" {...line("#3f78c0")} />
            <path d="M14 66 Q30 70 46 70 Q64 70 74 62 Q60 60 44 62 Q28 64 14 66Z" fill="#d6e8fb" />
            <path d="M50 64 Q56 72 62 64Z" fill="#3f78c0" />
            <Eye x={72} y={44} r={3} />
            <path d="M84 54 Q88 56 91 54" fill="none" {...line(INK, 1.3)} />
            <Shine x={44} y={40} rx={3} ry={8} rotate={70} opacity={0.35} />
        </g>
    ),
    ladybug: () => (
        <g>
            <path d="M36 26 Q30 16 24 14 M64 26 Q70 16 76 14" fill="none" {...line("#2a2a2a", 2)} />
            <circle cx={23} cy={13} r={3} fill="#2a2a2a" />
            <circle cx={77} cy={13} r={3} fill="#2a2a2a" />
            <circle cx={50} cy={58} r={34} fill="#e5484d" {...line("#a8282a")} />
            <path d="M50 30 V92" {...line("#2a2a2a", 2)} />
            <path d="M24 36 Q50 18 76 36 Q66 26 50 26 Q34 26 24 36Z" fill="#2a2a2a" />
            <path d="M28 38 Q50 24 72 38 Q70 26 50 22 Q30 26 28 38Z" fill="#2a2a2a" />
            <g fill="#2a2a2a">
                <circle cx={34} cy={52} r={6} />
                <circle cx={66} cy={52} r={6} />
                <circle cx={30} cy={72} r={5} />
                <circle cx={70} cy={72} r={5} />
                <circle cx={42} cy={84} r={4} />
                <circle cx={58} cy={84} r={4} />
            </g>
            <circle cx={42} cy={30} r={2} fill="#ffffff" />
            <circle cx={58} cy={30} r={2} fill="#ffffff" />
            <Shine x={30} y={44} rx={3} ry={6} rotate={40} opacity={0.4} />
        </g>
    ),
    // Ćurka: raširen rep u lepezi iza okruglog tela
    turkey: () => (
        <g>
            <Shadow cy={95} rx={24} />
            <g {...line("#8a4a2a", 1.3)}>
                {[
                    ["#e5484d", -60],
                    ["#f6922e", -36],
                    ["#f6c43a", -12],
                    ["#f6c43a", 12],
                    ["#f6922e", 36],
                    ["#e5484d", 60],
                ].map(([color, angle]) => (
                    <ellipse key={angle} cx={50} cy={30} rx={10} ry={24} fill={color as string} transform={`rotate(${angle} 50 56)`} />
                ))}
            </g>
            <ellipse cx={50} cy={68} rx={22} ry={24} fill="#a8683a" {...line("#6a4426")} />
            <path d="M42 92 V96 M58 92 V96" {...line("#e0a03a", 2.6)} />
            <circle cx={50} cy={46} r={13} fill="#b97a4a" {...line("#6a4426")} />
            <Eye x={45} y={43} r={2.6} />
            <Eye x={55} y={43} r={2.6} />
            <path d="M46 49 L54 49 L50 55Z" fill="#f6b13a" {...line("#c9831a", 1)} />
            <path d="M52 52 Q56 58 53 64 Q49 60 50 54Z" fill="#e5484d" />
        </g>
    ),
    reindeer: () => (
        <g>
            <path d="M36 30 Q26 18 30 6 M30 18 Q22 16 18 8 M64 30 Q74 18 70 6 M70 18 Q78 16 82 8" fill="none" {...line("#8a5a32", 3.4)} />
            <ellipse cx={30} cy={40} rx={8} ry={4.5} fill="#b9844e" transform="rotate(-25 30 40)" {...line("#8a5a32", 1.2)} />
            <ellipse cx={70} cy={40} rx={8} ry={4.5} fill="#b9844e" transform="rotate(25 70 40)" {...line("#8a5a32", 1.2)} />
            <path d="M50 28 Q70 28 70 50 Q70 74 62 86 Q50 94 38 86 Q30 74 30 50 Q30 28 50 28Z" fill="#b9844e" {...line("#8a5a32")} />
            <ellipse cx={50} cy={78} rx={13} ry={10} fill="#e8c9a0" />
            <Eye x={41} y={50} r={3.2} />
            <Eye x={59} y={50} r={3.2} />
            <Cheek x={36} y={62} />
            <Cheek x={64} y={62} />
            <circle cx={50} cy={74} r={6} fill="#e5484d" {...line("#b9302a", 1.2)} />
            <circle cx={48} cy={72} r={1.6} fill="#ffffff" opacity={0.7} />
            <Smile x={50} y={84} w={4} />
        </g>
    ),
} satisfies Record<string, () => ReactNode>;
