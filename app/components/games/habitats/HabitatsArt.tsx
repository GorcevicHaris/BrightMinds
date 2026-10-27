// Crteži igre „Ko gde živi?”: šest staništa kao mali prizori (farma sa štalom, šuma sa jelkama,
// more sa talasima, led i sneg, džungla sa lijanama, savana sa akacijom), nove životinje u istom
// stilu kao životinje iz igre „Šta jede?” (okrugla glava, oči sa sjajem, rumeni obrazi) i domovi
// (gnezdo, košnica, kućica za psa, štala, paukova mreža, akvarijum). Ostale životinje su
// postojeće slike (world/basePics).

import type { ReactNode } from "react";
import { Cheek, Eye, INK, line, Shine, Smile } from "@/app/components/games/pictures/kit";
import { basePic } from "@/app/components/games/world/basePics";

const Shadow = ({ cx = 50, cy = 95, rx = 26 }: { cx?: number; cy?: number; rx?: number }) => <ellipse cx={cx} cy={cy} rx={rx} ry={3.2} fill="#1f1b3a" opacity={0.08} />;

/** Okvir prizora: zaobljeni kvadrat sa nebom */
function Frame({ sky, children }: { sky: string; children: ReactNode }) {
    return (
        <>
            <defs>
                <clipPath id="hb-frame">
                    <rect x={2} y={2} width={96} height={96} rx={14} />
                </clipPath>
            </defs>
            <g clipPath="url(#hb-frame)">
                <rect x={0} y={0} width={100} height={100} fill={sky} />
                {children}
            </g>
        </>
    );
}

// ── Staništa ─────────────────────────────────────────────────────────────────

const Pine = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
        <rect x={-2.5} y={-6} width={5} height={8} fill="#7a4f2a" />
        <path d="M0 -40 L14 -16 L7 -16 L17 -4 L-17 -4 L-7 -16 L-14 -16Z" fill="#3f8a4a" {...line("#2a6a36", 1.2)} />
    </g>
);

const Palm = ({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) => (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
        <path d="M0 0 Q4 -24 -2 -46" fill="none" {...line("#8a5a2b", 5)} />
        <path d="M-2 -46 Q-22 -50 -30 -36 Q-16 -42 -2 -44 Q-12 -60 -2 -64 Q0 -52 0 -46 Q14 -60 26 -54 Q12 -50 2 -45 Q22 -44 28 -30 Q14 -40 -2 -44Z" fill="#3fa85a" {...line("#2a7a40", 1.2)} />
    </g>
);

const HABITAT_ART: Record<string, () => ReactNode> = {
    farm: () => (
        <Frame sky="#cdeefc">
            <circle cx={82} cy={18} r={9} fill="#f6c518" />
            <path d="M0 64 Q30 56 60 62 Q84 66 100 60 L100 100 L0 100Z" fill="#9ad66a" />
            <path d="M0 82 Q50 74 100 84 L100 100 L0 100Z" fill="#7cc56a" />
            <path d="M10 60 L32 42 L54 60 L54 84 L10 84Z" fill="#d9584a" {...line("#8f2f22", 1.6)} />
            <path d="M10 60 L32 42 L54 60" fill="none" {...line("#ffffff", 2.4)} />
            <rect x={24} y={66} width={16} height={18} fill="#ffffff" {...line("#8f2f22", 1.2)} />
            <path d="M24 66 L40 84 M40 66 L24 84" {...line("#d9584a", 1.6)} />
            <g {...line("#ffffff", 2.2)}>
                <path d="M58 76 L98 76 M58 84 L98 84" />
                {[62, 72, 82, 92].map((x) => (
                    <path key={x} d={`M${x} 72 L${x} 88`} />
                ))}
            </g>
            <ellipse cx={74} cy={56} rx={8} ry={4} fill="#f0d27a" />
        </Frame>
    ),
    forest: () => (
        <Frame sky="#d6f0e2">
            <path d="M0 70 Q50 62 100 70 L100 100 L0 100Z" fill="#6aae54" />
            <Pine x={18} y={72} s={1.2} />
            <Pine x={44} y={66} s={1.5} />
            <Pine x={74} y={72} s={1.25} />
            <Pine x={92} y={78} s={0.9} />
            <Pine x={6} y={86} s={0.8} />
            <g>
                <circle cx={58} cy={90} r={4} fill="#e8604a" />
                <rect x={56.5} y={90} width={3} height={6} fill="#f4e1c4" />
                <circle cx={57} cy={89} r={0.9} fill="#ffffff" />
                <circle cx={60} cy={91} r={0.8} fill="#ffffff" />
            </g>
        </Frame>
    ),
    sea: () => (
        <Frame sky="#bfe6fb">
            <path d="M0 34 Q12 28 24 34 Q36 40 48 34 Q60 28 72 34 Q84 40 100 34 L100 100 L0 100Z" fill="#3f8fd8" />
            <path d="M0 60 L100 60 L100 100 L0 100Z" fill="#2f74c0" />
            <path d="M0 86 Q50 78 100 88 L100 100 L0 100Z" fill="#e8d6a0" />
            <path d="M10 44 Q16 40 22 44 M54 50 Q60 46 66 50 M78 70 Q84 66 90 70" fill="none" {...line("#9ad0f5", 2)} />
            <g fill="#ffffff" opacity={0.7}>
                <circle cx={30} cy={66} r={2} />
                <circle cx={33} cy={58} r={1.4} />
                <circle cx={28} cy={52} r={1} />
            </g>
            <path d="M80 98 Q76 84 82 76 Q86 84 84 98Z M86 98 Q90 86 88 80" fill="#e86a8a" {...line("#b94868", 1)} />
            <path d="M14 98 Q10 90 16 82 Q18 90 18 98" fill="#5fae4f" />
        </Frame>
    ),
    polar: () => (
        <Frame sky="#d8ecfb">
            <path d="M0 52 L22 30 L40 46 L58 22 L80 44 L100 30 L100 60 L0 60Z" fill="#ffffff" {...line("#a8c8e8", 1.4)} />
            <path d="M0 58 L100 58 L100 100 L0 100Z" fill="#4f8fd0" />
            <path d="M0 72 Q20 66 46 72 L52 100 L0 100Z" fill="#f4f9ff" {...line("#a8c8e8", 1.4)} />
            <path d="M58 82 L92 78 L96 92 L60 96Z" fill="#f4f9ff" {...line("#a8c8e8", 1.4)} />
            <g fill="#ffffff">
                <circle cx={14} cy={14} r={1.6} />
                <circle cx={36} cy={10} r={1.2} />
                <circle cx={70} cy={12} r={1.6} />
                <circle cx={88} cy={18} r={1.2} />
            </g>
            <path d="M58 22 L64 28 L58 30 L52 28Z" fill="#e8f2fc" />
        </Frame>
    ),
    jungle: () => (
        <Frame sky="#c8ecd2">
            <path d="M0 76 Q50 68 100 76 L100 100 L0 100Z" fill="#3f9a4a" />
            <Palm x={20} y={86} s={1.15} />
            <Palm x={80} y={84} s={1.05} flip />
            <path d="M40 0 Q36 26 46 40 M62 0 Q66 20 58 34" fill="none" {...line("#4f9a3a", 2.4)} />
            <g fill="#5fbf4a">
                <ellipse cx={46} cy={40} rx={4} ry={2.5} transform="rotate(30 46 40)" />
                <ellipse cx={58} cy={34} rx={4} ry={2.5} transform="rotate(-30 58 34)" />
                <ellipse cx={40} cy={22} rx={3.5} ry={2} transform="rotate(-20 40 22)" />
            </g>
            <path d="M30 100 Q34 80 50 74 Q46 86 52 100Z M60 100 Q66 84 80 82 Q70 90 72 100Z" fill="#2f7a3a" />
            <circle cx={50} cy={84} r={3} fill="#e86a8a" />
            <circle cx={56} cy={90} r={2.4} fill="#f6c518" />
        </Frame>
    ),
    savanna: () => (
        <Frame sky="#fde6b8">
            <circle cx={78} cy={22} r={11} fill="#f59e0b" opacity={0.85} />
            <path d="M0 66 Q50 58 100 66 L100 100 L0 100Z" fill="#e8c36a" />
            <path d="M0 84 Q50 78 100 86 L100 100 L0 100Z" fill="#d9a84a" />
            <g transform="translate(34 66)">
                <path d="M0 0 L2 -26 M2 -26 L-10 -34 M2 -26 L12 -34" fill="none" {...line("#7a4f2a", 3)} />
                <ellipse cx={1} cy={-36} rx={24} ry={7} fill="#6a9a3a" />
                <ellipse cx={-8} cy={-40} rx={12} ry={5} fill="#7cae48" />
            </g>
            <g {...line("#b8862a", 1.6)} fill="none">
                {[10, 18, 60, 72, 86].map((x) => (
                    <path key={x} d={`M${x} 92 l-2 -8 M${x} 92 l0 -9 M${x} 92 l2 -8`} />
                ))}
            </g>
        </Frame>
    ),
};

// ── Nove životinje ───────────────────────────────────────────────────────────

const ANIMAL_ART: Record<string, () => ReactNode> = {
    fox: () => (
        <g>
            <Shadow />
            <path d="M66 86 Q92 84 90 60 Q86 72 72 74Z" fill="#e8742a" {...line("#a8501a", 1.4)} />
            <path d="M84 64 Q90 62 90 60 Q88 70 82 70Z" fill="#ffffff" />
            <ellipse cx={50} cy={80} rx={17} ry={14} fill="#e8742a" {...line("#a8501a", 1.4)} />
            <ellipse cx={50} cy={84} rx={9} ry={9} fill="#ffffff" />
            <ellipse cx={42} cy={93} rx={5} ry={3} fill="#3b2a20" />
            <ellipse cx={58} cy={93} rx={5} ry={3} fill="#3b2a20" />
            <path d="M32 40 L28 18 L44 30Z M68 40 L72 18 L56 30Z" fill="#e8742a" {...line("#a8501a", 1.4)} />
            <path d="M32 34 L30 22 L40 30Z M68 34 L70 22 L60 30Z" fill="#3b2a20" />
            <path d="M30 44 Q30 28 50 28 Q70 28 70 44 Q70 56 50 66 Q30 56 30 44Z" fill="#e8742a" {...line("#a8501a", 1.4)} />
            <path d="M34 50 Q42 52 50 66 Q58 52 66 50 Q60 64 50 66 Q40 64 34 50Z" fill="#ffffff" />
            <Eye x={42} y={44} r={2.8} />
            <Eye x={58} y={44} r={2.8} />
            <ellipse cx={50} cy={62} rx={3} ry={2.2} fill={INK} />
            <Cheek x={37} y={52} r={2.8} />
            <Cheek x={63} y={52} r={2.8} />
        </g>
    ),
    crab: () => (
        <g>
            <Shadow cy={90} rx={30} />
            <g {...line("#c8352b", 3)} fill="none">
                <path d="M30 70 L16 80 M32 76 L20 88 M70 70 L84 80 M68 76 L80 88" />
                <path d="M32 58 Q18 50 16 38 M68 58 Q82 50 84 38" />
            </g>
            <path d="M8 32 Q8 20 18 22 L16 32 L24 30 Q26 40 16 42 Q8 40 8 32Z" fill="#e8463f" {...line("#a8291f", 1.4)} />
            <path d="M92 32 Q92 20 82 22 L84 32 L76 30 Q74 40 84 42 Q92 40 92 32Z" fill="#e8463f" {...line("#a8291f", 1.4)} />
            <ellipse cx={50} cy={66} rx={24} ry={16} fill="#e8463f" {...line("#a8291f", 1.6)} />
            <path d="M42 50 L40 40 M58 50 L60 40" {...line("#a8291f", 2)} />
            <circle cx={40} cy={38} r={5} fill="#ffffff" {...line("#a8291f", 1.2)} />
            <circle cx={60} cy={38} r={5} fill="#ffffff" {...line("#a8291f", 1.2)} />
            <Eye x={40} y={38} r={2.4} />
            <Eye x={60} y={38} r={2.4} />
            <Smile x={50} y={68} w={5} />
            <Cheek x={38} y={68} r={3} />
            <Cheek x={62} y={68} r={3} />
            <Shine x={40} y={58} rx={3} ry={6} rotate={60} />
        </g>
    ),
    starfish: () => (
        <g>
            <Shadow cy={92} rx={30} />
            <path d="M50 8 Q56 30 62 36 Q84 34 92 40 Q74 52 72 60 Q80 80 78 90 Q60 78 50 76 Q40 78 22 90 Q20 80 28 60 Q26 52 8 40 Q16 34 38 36 Q44 30 50 8Z" fill="#f59e42" {...line("#c8701a", 1.8)} />
            <g fill="#ffd28a">
                {[
                    [50, 24],
                    [76, 42],
                    [68, 74],
                    [32, 74],
                    [24, 42],
                ].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r={2.2} />
                ))}
            </g>
            <Eye x={44} y={50} r={2.6} />
            <Eye x={56} y={50} r={2.6} />
            <Smile x={50} y={58} w={4} />
            <Cheek x={40} y={58} r={2.6} />
            <Cheek x={60} y={58} r={2.6} />
        </g>
    ),
    polarBear: () => (
        <g>
            <Shadow />
            <ellipse cx={50} cy={80} rx={20} ry={16} fill="#f4f6fb" {...line("#b8c2d6")} />
            <ellipse cx={42} cy={94} rx={7} ry={3.5} fill="#f4f6fb" {...line("#b8c2d6")} />
            <ellipse cx={58} cy={94} rx={7} ry={3.5} fill="#f4f6fb" {...line("#b8c2d6")} />
            <circle cx={34} cy={33} r={7} fill="#f4f6fb" {...line("#b8c2d6")} />
            <circle cx={66} cy={33} r={7} fill="#f4f6fb" {...line("#b8c2d6")} />
            <circle cx={34} cy={33} r={3.6} fill="#e3e8f2" />
            <circle cx={66} cy={33} r={3.6} fill="#e3e8f2" />
            <circle cx={50} cy={49} r={19} fill="#f4f6fb" {...line("#b8c2d6")} />
            <ellipse cx={50} cy={58} rx={9.5} ry={7.5} fill="#ffffff" {...line("#d6dcea", 1)} />
            <Eye x={42} y={46} r={2.8} />
            <Eye x={58} y={46} r={2.8} />
            <ellipse cx={50} cy={55} rx={3.4} ry={2.4} fill={INK} />
            <Cheek x={37} y={56} r={3} />
            <Cheek x={63} y={56} r={3} />
            <Smile x={50} y={60} w={3.4} />
        </g>
    ),
    seal: () => (
        <g>
            <Shadow cy={92} rx={32} />
            <path d="M20 88 Q10 70 26 56 Q34 30 54 30 Q74 30 76 52 Q78 70 70 82 Q86 86 92 80 Q90 92 74 92 L26 92 Q20 92 20 88Z" fill="#9aa8bc" {...line("#6a7890", 1.6)} />
            <path d="M34 80 Q30 90 22 92 Q32 94 40 88Z" fill="#7a889e" />
            <ellipse cx={54} cy={56} rx={14} ry={10} fill="#c9d2e2" />
            <Eye x={46} y={44} r={3.2} />
            <Eye x={62} y={44} r={3.2} />
            <ellipse cx={54} cy={53} rx={3.4} ry={2.4} fill={INK} />
            <g {...line("#6a7890", 1)}>
                <path d="M46 56 L36 54 M46 58 L36 60 M62 56 L72 54 M62 58 L72 60" />
            </g>
            <Cheek x={42} y={58} r={2.8} />
            <Cheek x={66} y={58} r={2.8} />
            <Shine x={36} y={44} rx={3} ry={7} rotate={-20} />
        </g>
    ),
    parrot: () => (
        <g>
            <Shadow cy={95} rx={18} />
            <path d="M44 74 L40 96 L48 92 L50 96 L54 76Z" fill="#3a7be8" {...line("#1f4fa8", 1.2)} />
            <ellipse cx={50} cy={64} rx={16} ry={20} fill="#e8463f" {...line("#a8291f", 1.6)} />
            <path d="M36 56 Q24 70 34 84 Q42 76 44 62Z" fill="#f6c518" {...line("#b88a10", 1.2)} />
            <path d="M36 70 Q30 76 34 84" fill="none" {...line("#3a7be8", 3)} />
            <circle cx={52} cy={36} r={16} fill="#e8463f" {...line("#a8291f", 1.6)} />
            <ellipse cx={56} cy={36} rx={8} ry={9} fill="#ffffff" />
            <Eye x={56} y={35} r={3} />
            <path d="M64 38 Q76 38 74 50 Q70 46 64 46Z" fill="#f6d84a" {...line("#a8801a", 1.2)} />
            <path d="M46 22 Q44 12 52 14 Q50 18 52 22" fill="#e8463f" />
            <path d="M40 92 L36 98 M60 92 L64 98" {...line("#5a5a6a", 2)} />
        </g>
    ),
    tiger: () => (
        <g>
            <Shadow />
            <ellipse cx={50} cy={80} rx={20} ry={15} fill="#f28c28" {...line("#b8601a", 1.4)} />
            <ellipse cx={50} cy={84} rx={10} ry={9} fill="#fff1d9" />
            <path d="M33 74 L39 76 M31 82 L38 82 M67 74 L61 76 M69 82 L62 82" {...line(INK, 2.2)} />
            <ellipse cx={42} cy={94} rx={6} ry={3} fill="#f28c28" {...line("#b8601a", 1.2)} />
            <ellipse cx={58} cy={94} rx={6} ry={3} fill="#f28c28" {...line("#b8601a", 1.2)} />
            <circle cx={34} cy={33} r={7} fill="#f28c28" {...line("#b8601a", 1.4)} />
            <circle cx={66} cy={33} r={7} fill="#f28c28" {...line("#b8601a", 1.4)} />
            <circle cx={34} cy={33} r={3.4} fill="#fff1d9" />
            <circle cx={66} cy={33} r={3.4} fill="#fff1d9" />
            <circle cx={50} cy={49} r={19} fill="#f28c28" {...line("#b8601a", 1.4)} />
            <path d="M44 31 L46 38 M50 30 L50 38 M56 31 L54 38 M32 46 L38 47 M31 52 L37 51 M68 46 L62 47 M69 52 L63 51" {...line(INK, 2.2)} />
            <ellipse cx={50} cy={58} rx={11} ry={8} fill="#fff1d9" />
            <Eye x={42} y={46} r={2.8} />
            <Eye x={58} y={46} r={2.8} />
            <path d="M47 54 L53 54 L50 57Z" fill="#e86a8a" />
            <Smile x={50} y={60} w={3.6} />
            <Cheek x={38} y={56} r={2.6} />
            <Cheek x={62} y={56} r={2.6} />
        </g>
    ),
    snake: () => (
        <g>
            <Shadow cy={92} rx={34} />
            <path d="M16 86 Q14 72 30 72 L66 72 Q80 72 80 60 Q80 48 66 48 L44 48 Q32 48 32 38 Q32 28 44 28" fill="none" {...line("#4fae4a", 13)} />
            <path d="M16 86 Q14 72 30 72 L66 72 Q80 72 80 60 Q80 48 66 48 L44 48 Q32 48 32 38 Q32 28 44 28" fill="none" {...line("#f6d84a", 2)} strokeDasharray="3 8" />
            <ellipse cx={54} cy={28} rx={14} ry={11} fill="#5fbf4a" {...line("#2f7a2a", 1.6)} />
            <Eye x={50} y={25} r={2.6} />
            <Eye x={60} y={25} r={2.6} />
            <Smile x={56} y={32} w={4} />
            <Cheek x={47} y={32} r={2.4} />
            <path d="M68 30 L76 30 L80 27 M76 30 L80 33" fill="none" {...line("#e8463f", 1.6)} />
        </g>
    ),
    zebra: () => (
        <g>
            <Shadow />
            <ellipse cx={50} cy={80} rx={19} ry={14} fill="#ffffff" {...line("#5a5a6a", 1.4)} />
            <path d="M36 72 Q40 80 36 88 M46 68 Q50 80 46 92 M56 68 Q60 80 56 92 M64 72 Q68 80 64 88" fill="none" {...line(INK, 2.6)} />
            <rect x={38} y={88} width={7} height={8} rx={2} fill="#ffffff" {...line("#5a5a6a", 1.2)} />
            <rect x={55} y={88} width={7} height={8} rx={2} fill="#ffffff" {...line("#5a5a6a", 1.2)} />
            <rect x={38} y={93} width={7} height={3} fill={INK} />
            <rect x={55} y={93} width={7} height={3} fill={INK} />
            <path d="M38 22 L34 8 L44 18Z M62 22 L66 8 L56 18Z" fill="#ffffff" {...line("#5a5a6a", 1.4)} />
            <path d="M42 18 Q50 6 58 18 L56 30 L44 30Z" fill={INK} />
            <path d="M36 42 Q36 24 50 24 Q64 24 64 42 L62 58 Q60 70 50 70 Q40 70 38 58Z" fill="#ffffff" {...line("#5a5a6a", 1.4)} />
            <path d="M40 34 L46 36 M38 42 L45 43 M60 34 L54 36 M62 42 L55 43" {...line(INK, 2.4)} />
            <ellipse cx={50} cy={62} rx={10} ry={8} fill="#5a5a6a" />
            <circle cx={46} cy={62} r={1.4} fill={INK} />
            <circle cx={54} cy={62} r={1.4} fill={INK} />
            <Eye x={43} y={48} r={2.8} />
            <Eye x={57} y={48} r={2.8} />
            <Cheek x={39} y={54} r={2.4} />
            <Cheek x={61} y={54} r={2.4} />
        </g>
    ),
};

// ── Domovi ────────────────────────────────────────────────────────────────────

const HOME_ART: Record<string, () => ReactNode> = {
    nest: () => (
        <g>
            <path d="M6 30 L94 24" {...line("#8a5a2b", 6)} />
            <ellipse cx={66} cy={18} rx={14} ry={7} fill="#5fae4f" />
            <path d="M14 56 Q14 82 50 84 Q86 82 86 56Z" fill="#b8864a" {...line("#7a4f2a", 2)} />
            <g fill="none" {...line("#8a5a2b", 1.6)}>
                <path d="M18 62 Q50 72 82 62 M20 70 Q50 80 80 70 M26 58 L34 80 M44 58 L46 84 M58 58 L56 84 M72 58 L66 80" />
            </g>
            <ellipse cx={50} cy={56} rx={36} ry={9} fill="#c99a5a" {...line("#7a4f2a", 2)} />
            <ellipse cx={40} cy={54} rx={7} ry={5} fill="#cfeefc" {...line("#8ab8d8", 1.2)} />
            <ellipse cx={54} cy={53} rx={7} ry={5} fill="#cfeefc" {...line("#8ab8d8", 1.2)} />
            <ellipse cx={62} cy={56} rx={6} ry={4.4} fill="#cfeefc" {...line("#8ab8d8", 1.2)} />
        </g>
    ),
    hive: () => (
        <g>
            <path d="M50 4 L50 14" {...line("#8a5a2b", 4)} />
            <path d="M30 20 L70 20 Q86 34 82 54 Q86 76 66 90 L34 90 Q14 76 18 54 Q14 34 30 20Z" fill="#f6c518" {...line("#b88a10", 2)} />
            <g fill="none" {...line("#d9a812", 2.4)}>
                <path d="M22 38 Q50 44 78 38 M18 56 Q50 62 82 56 M22 74 Q50 80 78 74" />
            </g>
            <ellipse cx={50} cy={70} rx={8} ry={6} fill="#5a3a1a" />
            <g transform="translate(78 30) scale(0.18)">{basePic("p:bee", 0, 0, 100)}</g>
        </g>
    ),
    doghouse: () => (
        <g>
            <Shadow cy={94} rx={38} />
            <path d="M14 46 L50 16 L86 46Z" fill="#d9584a" {...line("#8f2f22", 2)} />
            <rect x={20} y={46} width={60} height={46} fill="#e0b07a" {...line("#a8703a", 2)} />
            <path d="M20 58 L80 58 M20 70 L80 70 M20 82 L80 82" {...line("#c98a4b", 1.4)} />
            <path d="M38 92 L38 70 Q38 58 50 58 Q62 58 62 70 L62 92Z" fill="#5a3a26" />
            <rect x={36} y={38} width={28} height={8} rx={2} fill="#ffffff" {...line("#a8703a", 1.2)} />
            <g transform="translate(46 39)" fill="#a8703a">
                <ellipse cx={4} cy={4.4} rx={2.6} ry={2} />
                <circle cx={1.6} cy={2} r={1} />
                <circle cx={6.4} cy={2} r={1} />
            </g>
        </g>
    ),
    barn: () => (
        <g>
            <Shadow cy={94} rx={40} />
            <path d="M10 44 L50 14 L90 44 L90 92 L10 92Z" fill="#d9584a" {...line("#8f2f22", 2)} />
            <path d="M10 44 L50 14 L90 44" fill="none" {...line("#ffffff", 3)} />
            <rect x={32} y={56} width={36} height={36} fill="#ffffff" {...line("#8f2f22", 1.6)} />
            <path d="M32 56 L68 92 M68 56 L32 92" {...line("#d9584a", 2.4)} />
            <rect x={42} y={30} width={16} height={12} rx={2} fill="#f0d27a" {...line("#8f2f22", 1.2)} />
        </g>
    ),
    web: () => (
        <g>
            <g fill="none" {...line("#9aa3c8", 1.6)}>
                {[0, 45, 90, 135].map((r) => (
                    <path key={r} d="M50 6 L50 94" transform={`rotate(${r} 50 50)`} />
                ))}
                {[12, 22, 32, 42].map((r) => (
                    <polygon key={r} points={Array.from({ length: 8 }, (_, i) => `${Math.round((50 + r * Math.sin((i * Math.PI) / 4)) * 100) / 100},${Math.round((50 - r * Math.cos((i * Math.PI) / 4)) * 100) / 100}`).join(" ")} />
                ))}
            </g>
            <g transform="translate(58 48) scale(0.34)">{basePic("p:spider", 0, 0, 100)}</g>
        </g>
    ),
    aquarium: () => (
        <g>
            <Shadow cy={94} rx={40} />
            <rect x={10} y={22} width={80} height={68} rx={6} fill="#bfe6fb" {...line("#5a8ab0", 2.2)} />
            <rect x={12} y={34} width={76} height={54} rx={4} fill="#6cc0e8" />
            <path d="M12 80 Q50 74 88 82 L88 88 L12 88Z" fill="#e8d6a0" />
            <path d="M26 86 Q22 70 30 60 Q32 72 30 86 M70 86 Q74 72 68 64" fill="none" {...line("#3fa85a", 3)} />
            <g fill="#ffffff" opacity={0.8}>
                <circle cx={56} cy={46} r={2} />
                <circle cx={60} cy={40} r={1.4} />
            </g>
            <rect x={8} y={18} width={84} height={6} rx={3} fill="#5a8ab0" />
        </g>
    ),
};

export function habitatDrawing(pic: string): ReactNode {
    if (pic.startsWith("place:")) return HABITAT_ART[pic.slice(6)]?.() ?? null;
    if (pic.startsWith("p:") || pic.startsWith("a:")) return basePic(pic, 4, 4, 92);
    const draw = ANIMAL_ART[pic] ?? HOME_ART[pic];
    return draw ? draw() : null;
}

export function HabitatPic({ pic, className }: { pic: string; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {habitatDrawing(pic)}
        </svg>
    );
}
