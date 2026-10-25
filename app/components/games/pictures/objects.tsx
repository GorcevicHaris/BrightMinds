// Predmeti kojih nema u postojećim kompletima: odeća, muzički instrumenti, školske i kućne stvari,
// srce i kap vode. Isti stil kao „Šta fali?” i „Spakuj ranac”: krupni obli oblici, mirne boje,
// tanka tamnija ivica, okvir 100 × 100. Predmet koji igra „Razvrstaj” razvrstava po boji ima
// jednu jasnu boju (crveno ili plavo srce, plava kap).

import type { ReactNode } from "react";
import { line, Shine } from "./kit";

const HEART = "M50 88 Q14 62 12 38 Q12 18 31 16 Q44 16 50 30 Q56 16 69 16 Q88 18 88 38 Q86 62 50 88Z";
const STAR = "M50 8 L62 36 L92 38 L69 58 L77 88 L50 72 L23 88 L31 58 L8 38 L38 36Z";

function heart(fill: string, edge: string) {
    return function drawHeart() {
        return (
            <g>
                <path d={HEART} fill={fill} {...line(edge, 1.8)} />
                <Shine x={30} y={32} rx={5} ry={8} rotate={-35} />
            </g>
        );
    };
}

export const OBJECT_ART = {
    heartRed: heart("#e5484d", "#b02a30"),
    heartBlue: heart("#3e7bfa", "#2a58c0"),
    star: () => (
        <g>
            <path d={STAR} fill="#f6c518" {...line("#c9971a", 1.8)} />
            <Shine x={42} y={34} rx={3} ry={6} rotate={30} opacity={0.55} />
        </g>
    ),
    drop: () => (
        <g>
            <path d="M50 8 Q60 30 74 48 Q86 66 76 80 Q66 92 50 92 Q34 92 24 80 Q14 66 26 48 Q40 30 50 8Z" fill="#3e8afa" {...line("#2a5ec0", 1.8)} />
            <path d="M34 64 Q32 76 42 82" fill="none" {...line("#ffffff", 3)} opacity={0.6} />
        </g>
    ),
    dress: () => (
        <g>
            <path d="M38 10 L40 26 H60 L62 10" fill="none" {...line("#c9467a", 3)} />
            <path d="M36 24 Q50 30 64 24 L66 44 L86 88 Q50 96 14 88 L34 44Z" fill="#f278a8" {...line("#c9467a")} />
            <path d="M34 44 Q50 50 66 44" fill="none" {...line("#c9467a", 2)} />
            <g fill="#ffffff" opacity={0.75}>
                <circle cx={36} cy={66} r={3} />
                <circle cx={56} cy={60} r={3} />
                <circle cx={64} cy={78} r={3} />
                <circle cx={44} cy={82} r={3} />
                <circle cx={50} cy={36} r={2.5} />
            </g>
        </g>
    ),
    sock: () => (
        <g>
            <path d="M34 8 H62 V54 Q62 60 66 64 L80 74 Q90 82 82 90 Q76 96 66 92 L40 78 Q32 74 34 64Z" fill="#f6922e" {...line("#c9631a")} />
            <rect x={34} y={8} width={28} height={12} fill="#ffffff" {...line("#c9631a")} />
            <path d="M34 34 H62 M34 44 H62" {...line("#ffffff", 4)} />
            <path d="M68 76 Q76 80 74 90 Q82 92 84 84 Q86 78 78 74Z" fill="#e07a1e" />
        </g>
    ),
    shirt: () => (
        <g>
            <path d="M36 14 L22 20 L8 44 L20 52 L28 42 V90 H72 V42 L80 52 L92 44 L78 20 L64 14 Q50 22 36 14Z" fill="#f6f8fc" {...line("#8a9ab8")} />
            <path d="M36 14 L50 30 L64 14 L60 10 L50 18 L40 10Z" fill="#ffffff" {...line("#8a9ab8", 1.4)} />
            <path d="M50 28 L45 36 L50 66 L55 36Z" fill="#3e7bfa" {...line("#2a58c0", 1.3)} />
            <path d="M50 30 V90" {...line("#c9d2e2", 1.2)} />
            <g fill="#8a9ab8">
                <circle cx={54} cy={72} r={1.6} />
                <circle cx={54} cy={82} r={1.6} />
            </g>
        </g>
    ),
    sunHat: () => (
        <g>
            <ellipse cx={50} cy={64} rx={44} ry={16} fill="#f6d77a" {...line("#c9a03a")} />
            <path d="M28 62 Q28 28 50 28 Q72 28 72 62 Q50 70 28 62Z" fill="#f8e09a" {...line("#c9a03a")} />
            <path d="M28 56 Q50 64 72 56 L72 62 Q50 70 28 62Z" fill="#f278a8" {...line("#c9467a", 1.2)} />
            <path d="M70 60 Q84 66 80 76 Q72 72 70 60Z" fill="#f278a8" {...line("#c9467a", 1.2)} />
            <circle cx={68} cy={56} r={5} fill="#ffffff" {...line("#c9467a", 1)} />
        </g>
    ),
    ski: () => (
        <g>
            <g transform="rotate(-35 50 50)">
                <path d="M12 44 H82 Q94 44 92 34 Q90 30 86 32 Q86 38 80 38 H12 Q8 41 12 44Z" fill="#e5484d" {...line("#a8282a")} />
                <path d="M12 60 H82 Q94 60 92 50 Q90 46 86 48 Q86 54 80 54 H12 Q8 57 12 60Z" fill="#e5484d" {...line("#a8282a")} />
                <rect x={36} y={34} width={16} height={6} rx={2} fill="#4a4a5a" />
                <rect x={36} y={50} width={16} height={6} rx={2} fill="#4a4a5a" />
            </g>
        </g>
    ),
    guitar: () => (
        <g transform="rotate(30 50 50)">
            <rect x={46} y={4} width={8} height={44} rx={2} fill="#8a5a32" {...line("#5f3a1e", 1.3)} />
            <rect x={43} y={2} width={14} height={10} rx={3} fill="#6a4426" />
            <path d="M50 44 Q32 40 30 56 Q30 64 36 68 Q26 74 30 86 Q36 98 50 98 Q64 98 70 86 Q74 74 64 68 Q70 64 70 56 Q68 40 50 44Z" fill="#f2a24a" {...line("#b9661e")} />
            <circle cx={50} cy={66} r={6} fill="#5f3a1e" />
            <rect x={42} y={82} width={16} height={4} rx={1.5} fill="#5f3a1e" />
            <path d="M48 8 V84 M52 8 V84" {...line("#f6efe0", 0.8)} />
        </g>
    ),
    trumpet: () => (
        <g>
            <path d="M14 46 H58 L84 30 V70 L58 54 H14Z" fill="#f6c43a" {...line("#c9901a")} />
            <ellipse cx={84} cy={50} rx={6} ry={20} fill="#f8d86a" {...line("#c9901a")} />
            <rect x={6} y={44} width={10} height={12} rx={3} fill="#f6c43a" {...line("#c9901a")} />
            <path d="M24 46 Q22 66 36 66 H52 Q58 66 58 56" fill="none" {...line("#c9901a", 3)} />
            <g fill="#e0a82a" {...line("#c9901a", 1.2)}>
                <rect x={30} y={32} width={5} height={14} rx={2} />
                <rect x={39} y={32} width={5} height={14} rx={2} />
                <rect x={48} y={32} width={5} height={14} rx={2} />
            </g>
            <Shine x={40} y={49} rx={1.5} ry={10} rotate={90} opacity={0.6} />
        </g>
    ),
    violin: () => (
        <g transform="rotate(-25 50 50)">
            <rect x={46} y={2} width={8} height={30} rx={2} fill="#3a2a1e" />
            <path d="M50 28 Q34 26 34 40 Q34 48 40 52 Q30 58 32 72 Q36 92 50 92 Q64 92 68 72 Q70 58 60 52 Q66 48 66 40 Q66 26 50 28Z" fill="#c9661e" {...line("#8a3a0e")} />
            <path d="M42 56 Q44 62 42 66 M58 56 Q56 62 58 66" fill="none" {...line("#5f2a0e", 1.6)} />
            <rect x={44} y={76} width={12} height={4} rx={1.5} fill="#3a2a1e" />
            <path d="M48 4 V78 M52 4 V78" {...line("#f6efe0", 0.7)} />
            <path d="M14 30 L86 70" {...line("#8a5a32", 2.4)} />
        </g>
    ),
    piano: () => (
        <g>
            <rect x={6} y={30} width={88} height={44} rx={6} fill="#3a3a4a" {...line("#22222e")} />
            <rect x={12} y={44} width={76} height={26} rx={2} fill="#ffffff" {...line("#8a8a9a", 1.2)} />
            <path d="M23 44 V70 M34 44 V70 M45 44 V70 M56 44 V70 M67 44 V70 M78 44 V70" {...line("#8a8a9a", 1.2)} />
            <g fill="#22222e">
                {[20, 31, 53, 64, 75].map((x) => (
                    <rect key={x} x={x} y={44} width={6} height={15} rx={1} />
                ))}
            </g>
            <circle cx={20} cy={37} r={2.2} fill="#e5484d" />
            <circle cx={28} cy={37} r={2.2} fill="#30a46c" />
            <rect x={60} y={34} width={26} height={5} rx={2} fill="#5a5a6a" />
        </g>
    ),
    saxophone: () => (
        <g>
            <path d="M56 6 L60 12 L60 60 Q60 86 42 86 Q24 86 24 68 L24 60 L16 58 L18 50 L40 52 L40 66 Q40 72 44 72 Q48 72 48 66 V14Z" fill="#f6c43a" {...line("#c9901a")} />
            <path d="M48 12 L54 4 L62 8" fill="none" {...line("#4a4a5a", 3)} />
            <g fill="#fbe7a8" {...line("#c9901a", 1)}>
                <circle cx={54} cy={24} r={2.6} />
                <circle cx={54} cy={34} r={2.6} />
                <circle cx={54} cy={44} r={2.6} />
                <circle cx={54} cy={54} r={2.6} />
            </g>
            <Shine x={58} y={70} rx={2} ry={8} rotate={30} opacity={0.6} />
        </g>
    ),
    crayon: () => (
        <g transform="rotate(-40 50 50)">
            <path d="M22 40 H70 L88 50 L70 60 H22Z" fill="#f6922e" {...line("#c9631a")} />
            <path d="M80 46 L88 50 L80 54Z" fill="#c9631a" />
            <rect x={16} y={40} width={8} height={20} rx={2} fill="#f6922e" {...line("#c9631a")} />
            <rect x={30} y={40} width={30} height={20} fill="#ffffff" opacity={0.85} />
            <path d="M34 46 Q40 54 46 46 Q52 54 56 46" fill="none" {...line("#f6922e", 1.8)} />
        </g>
    ),
    dice: () => (
        <g>
            <path d="M18 34 L50 18 L84 30 L52 46Z" fill="#ffffff" {...line("#a8a8b8")} />
            <path d="M18 34 L52 46 V86 L18 72Z" fill="#f2f2f8" {...line("#a8a8b8")} />
            <path d="M52 46 L84 30 V70 L52 86Z" fill="#e2e2ee" {...line("#a8a8b8")} />
            <ellipse cx={50} cy={32} rx={4.5} ry={2.4} fill="#e5484d" />
            <g fill="#3a3a5a">
                <circle cx={28} cy={46} r={3.2} />
                <circle cx={35} cy={60} r={3.2} />
                <circle cx={43} cy={74} r={3.2} />
                <circle cx={62} cy={50} r={3} />
                <circle cx={75} cy={44} r={3} />
                <circle cx={62} cy={74} r={3} />
                <circle cx={75} cy={68} r={3} />
            </g>
        </g>
    ),
    key: () => (
        <g transform="rotate(-35 50 50)">
            <circle cx={26} cy={50} r={18} fill="#f6c43a" {...line("#c9901a")} />
            <circle cx={22} cy={50} r={6} fill="#ffffff" {...line("#c9901a", 1.4)} />
            <path d="M42 45 H90 V55 H84 V64 H76 V55 H70 V62 H62 V55 H42Z" fill="#f6c43a" {...line("#c9901a")} />
        </g>
    ),
    puzzlePiece: () => (
        <g>
            <path d="M18 30 H38 Q34 20 42 16 Q50 12 56 18 Q62 24 58 30 H78 V50 Q86 46 90 52 Q94 60 88 66 Q84 70 78 66 V86 H58 Q62 78 56 74 Q48 70 42 76 Q38 80 40 86 H18 V66 Q26 70 30 64 Q34 56 28 52 Q22 48 18 52Z" fill="#3e9af0" {...line("#2a6ac0", 1.8)} />
            <Shine x={30} y={40} rx={3} ry={6} rotate={30} />
        </g>
    ),
    plate: () => (
        <g>
            <ellipse cx={50} cy={56} rx={42} ry={34} fill="#dcecfb" {...line("#6a8ab0", 2)} />
            <ellipse cx={50} cy={56} rx={28} ry={22} fill="#ffffff" {...line("#9ab4d0", 1.6)} />
            <path d="M16 46 Q22 32 38 26" fill="none" {...line("#ffffff", 3)} />
        </g>
    ),
    shampoo: () => (
        <g>
            <rect x={40} y={8} width={20} height={12} rx={3} fill="#8a6ad0" {...line("#5f4aa0")} />
            <path d="M56 12 H72 V18 H60" fill="#8a6ad0" {...line("#5f4aa0", 1.4)} />
            <path d="M34 24 Q34 18 44 18 H56 Q66 18 66 24 L72 40 V84 Q72 92 62 92 H38 Q28 92 28 84 V40Z" fill="#b8a6f2" {...line("#6a56b8")} />
            <rect x={36} y={48} width={28} height={26} rx={5} fill="#ffffff" />
            <g fill="#8fd0f6">
                <circle cx={46} cy={58} r={5} />
                <circle cx={55} cy={64} r={4} />
                <circle cx={54} cy={54} r={2.6} />
            </g>
            <Shine x={34} y={38} rx={2} ry={7} rotate={0} />
        </g>
    ),
    paintbrush: () => (
        <g transform="rotate(-40 50 50)">
            <rect x={6} y={45} width={50} height={10} rx={5} fill="#c98a4a" {...line("#8a5a32")} />
            <rect x={54} y={42} width={14} height={16} rx={2} fill="#b8bcc8" {...line("#7a7e8a")} />
            <path d="M66 42 Q86 40 94 50 Q86 60 66 58Z" fill="#3e7bfa" {...line("#2a58c0")} />
        </g>
    ),
    palette: () => (
        <g>
            <path d="M50 14 Q88 14 92 46 Q94 64 78 66 Q66 66 66 76 Q68 88 54 90 Q12 90 8 54 Q8 14 50 14Z" fill="#e8c08a" {...line("#a8783a")} />
            <ellipse cx={58} cy={74} rx={7} ry={6} fill="#ffffff" {...line("#a8783a", 1.3)} />
            <circle cx={30} cy={40} r={7} fill="#e5484d" />
            <circle cx={50} cy={30} r={7} fill="#f6c518" />
            <circle cx={70} cy={36} r={7} fill="#3e7bfa" />
            <circle cx={26} cy={62} r={7} fill="#30a46c" />
            <circle cx={78} cy={52} r={5} fill="#f278a8" />
        </g>
    ),
    bell: () => (
        <g>
            <path d="M50 10 V18" {...line("#c9901a", 3)} />
            <circle cx={50} cy={10} r={4} fill="none" {...line("#c9901a", 2.4)} />
            <path d="M50 18 Q26 18 26 46 Q26 64 14 76 H86 Q74 64 74 46 Q74 18 50 18Z" fill="#f6c43a" {...line("#c9901a")} />
            <rect x={12} y={74} width={76} height={8} rx={4} fill="#e0a82a" {...line("#c9901a")} />
            <circle cx={50} cy={88} r={6} fill="#e0a82a" {...line("#c9901a")} />
            <Shine x={38} y={40} rx={3} ry={10} rotate={10} opacity={0.55} />
        </g>
    ),
    broom: () => (
        <g transform="rotate(20 50 50)">
            <rect x={46} y={2} width={8} height={56} rx={4} fill="#c98a4a" {...line("#8a5a32")} />
            <rect x={38} y={54} width={24} height={8} rx={2} fill="#e5484d" {...line("#a8282a")} />
            <path d="M38 62 L28 96 H72 L62 62Z" fill="#f2cf6a" {...line("#c9a03a")} />
            <path d="M42 66 L36 94 M50 66 V94 M58 66 L64 94" {...line("#c9a03a", 1.3)} />
        </g>
    ),
    bulb: () => (
        <g>
            <g {...line("#f6c518", 3)}>
                <path d="M50 4 V10 M18 18 L23 23 M82 18 L77 23 M8 48 H14 M86 48 H92" />
            </g>
            <path d="M50 14 Q22 14 22 44 Q22 58 34 68 V74 H66 V68 Q78 58 78 44 Q78 14 50 14Z" fill="#fde68a" {...line("#d9a01e")} />
            <path d="M42 66 Q42 50 50 44 Q58 50 58 66" fill="none" {...line("#e0a01e", 1.6)} />
            <rect x={34} y={74} width={32} height={14} rx={3} fill="#a8b0c0" {...line("#6a7282")} />
            <path d="M34 79 H66 M34 84 H66" {...line("#6a7282", 1.2)} />
            <path d="M42 88 Q50 96 58 88Z" fill="#6a7282" />
            <Shine x={36} y={32} rx={4} ry={8} rotate={30} opacity={0.8} />
        </g>
    ),
    alarm: () => (
        <g>
            <path d="M30 80 L22 92 M70 80 L78 92" {...line("#5a5a6a", 4)} />
            <circle cx={24} cy={22} r={11} fill="#e5484d" {...line("#a8282a")} />
            <circle cx={76} cy={22} r={11} fill="#e5484d" {...line("#a8282a")} />
            <circle cx={50} cy={54} r={34} fill="#e5484d" {...line("#a8282a")} />
            <circle cx={50} cy={54} r={26} fill="#ffffff" {...line("#a8282a", 1.3)} />
            <g fill="#5a5a6a">
                <circle cx={50} cy={33} r={2} />
                <circle cx={71} cy={54} r={2} />
                <circle cx={50} cy={75} r={2} />
                <circle cx={29} cy={54} r={2} />
            </g>
            <path d="M50 54 V38 M50 54 L62 60" {...line("#3a3a4a", 3)} />
            <circle cx={50} cy={54} r={3} fill="#3a3a4a" />
        </g>
    ),
    bin: () => (
        <g>
            <rect x={40} y={8} width={20} height={8} rx={3} fill="#4fae6a" {...line("#2f7a4a")} />
            <rect x={16} y={14} width={68} height={10} rx={4} fill="#5fbf7a" {...line("#2f7a4a")} />
            <path d="M22 24 H78 L72 90 Q71 94 66 94 H34 Q29 94 28 90Z" fill="#6fcf8a" {...line("#2f7a4a")} />
            <path d="M38 34 L40 84 M50 34 V84 M62 34 L60 84" {...line("#2f7a4a", 2)} />
        </g>
    ),
    hammer: () => (
        <g transform="rotate(-30 50 50)">
            <rect x={45} y={30} width={10} height={64} rx={4} fill="#c98a4a" {...line("#8a5a32")} />
            <path d="M18 14 H72 Q84 14 84 24 V34 H18 Q14 24 18 14Z" fill="#8a94a8" {...line("#5a6274")} />
            <path d="M84 18 Q94 22 92 34 L84 30Z" fill="#8a94a8" {...line("#5a6274", 1.3)} />
            <Shine x={40} y={20} rx={2} ry={12} rotate={90} opacity={0.5} />
        </g>
    ),
    soccerBall: () => (
        <g>
            <circle cx={50} cy={50} r={40} fill="#ffffff" {...line("#4a4a5a", 2)} />
            <path d="M50 34 L64 44 L59 60 H41 L36 44Z" fill="#2a2a3a" />
            <path d="M50 34 V12 M64 44 L84 36 M59 60 L72 78 M41 60 L28 78 M36 44 L16 36" {...line("#4a4a5a", 1.6)} />
            <path d="M40 11 L50 12 L60 11 L58 4 Q50 2 42 4Z M84 36 L89 46 L88 30 Q86 26 82 26Z M72 78 L82 72 L76 84Z M28 78 L18 72 L24 84Z M16 36 L11 46 L12 30 Q14 26 18 26Z" fill="#2a2a3a" />
        </g>
    ),
    // Krevet sa jastukom i pokrivačem (bočno)
    bed: () => (
        <g>
            <rect x={6} y={30} width={12} height={58} rx={4} fill="#c98a4a" {...line("#8a5a32")} />
            <rect x={82} y={48} width={12} height={40} rx={4} fill="#c98a4a" {...line("#8a5a32")} />
            <rect x={14} y={56} width={72} height={16} rx={3} fill="#ffffff" {...line("#a8b0c0", 1.6)} />
            <path d="M40 50 H84 Q88 50 88 56 V74 Q88 78 84 78 H40Z" fill="#6c9cf0" {...line("#3e6ac0")} />
            <path d="M48 58 H80 M48 66 H80" {...line("#9cc0fa", 2)} />
            <path d="M18 54 Q18 42 28 42 H36 Q42 42 42 50 V56 H18Z" fill="#ffffff" {...line("#a8b0c0", 1.6)} />
            <rect x={14} y={72} width={72} height={8} rx={2} fill="#c98a4a" {...line("#8a5a32", 1.4)} />
        </g>
    ),
    tv: () => (
        <g>
            <path d="M38 6 L50 18 L62 6" fill="none" {...line("#5a5a6a", 2.4)} />
            <rect x={8} y={18} width={84} height={62} rx={8} fill="#5a5a6a" {...line("#3a3a4a")} />
            <rect x={16} y={26} width={68} height={46} rx={4} fill="#8fd0f6" />
            <circle cx={34} cy={44} r={7} fill="#fde68a" />
            <path d="M16 72 L38 52 L54 66 L66 56 L84 72Z" fill="#6fbf6a" />
            <path d="M30 80 L26 92 M70 80 L74 92" {...line("#3a3a4a", 4)} />
        </g>
    ),
} satisfies Record<string, () => ReactNode>;
