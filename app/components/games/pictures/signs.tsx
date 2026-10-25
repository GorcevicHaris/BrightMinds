// Sličice na korpama igre „Razvrstaj”: šta ide u korpu (korpa sa voćem, šapa za životinje,
// semafor za vozila, majica na vešalici, nota za muziku…) i pravila (jede se / ne jede se,
// leto / zima, u vazduhu / u vodi / na zemlji, za jelo / za pranje / za crtanje). Slika na korpi
// nije nijedan predmet iz igre, da ne bi odala odgovor; okvir 100 × 100.

import type { ReactNode } from "react";
import { Cheek, INK, line, Shine } from "./kit";

export const SIGN_ART = {
    fruitBasket: () => (
        <g>
            <path d="M24 46 Q24 12 50 12 Q76 12 76 46" fill="none" {...line("#a8683a", 4)} />
            <circle cx={36} cy={46} r={13} fill="#e8483f" {...line("#b9302a")} />
            <path d="M52 30 Q44 40 50 52 Q62 54 66 42 Q64 30 52 30Z" fill="#b8d54a" {...line("#7a9a2a")} />
            <circle cx={66} cy={48} r={11} fill="#f6922e" {...line("#c9631a")} />
            <path d="M42 36 Q48 26 56 26" fill="none" {...line("#4f7a2a", 2)} />
            <path d="M12 50 H88 L80 88 Q79 92 74 92 H26 Q21 92 20 88Z" fill="#d9a05a" {...line("#a8683a")} />
            <path d="M18 62 H82 M20 74 H80 M34 50 L36 92 M50 50 V92 M66 50 L64 92" {...line("#a8683a", 1.6)} />
        </g>
    ),
    paw: () => (
        <g fill="#a8784a" {...line("#6a4426", 1.6)}>
            <path d="M50 50 Q66 50 74 66 Q80 80 68 86 Q60 90 50 86 Q40 90 32 86 Q20 80 26 66 Q34 50 50 50Z" />
            <ellipse cx={22} cy={44} rx={9} ry={11} transform="rotate(-20 22 44)" />
            <ellipse cx={39} cy={26} rx={9} ry={12} transform="rotate(-8 39 26)" />
            <ellipse cx={61} cy={26} rx={9} ry={12} transform="rotate(8 61 26)" />
            <ellipse cx={78} cy={44} rx={9} ry={11} transform="rotate(20 78 44)" />
        </g>
    ),
    trafficLight: () => (
        <g>
            <rect x={46} y={80} width={8} height={18} fill="#5a5a6a" />
            <rect x={30} y={4} width={40} height={80} rx={10} fill="#3a3a4a" {...line("#22222e")} />
            <circle cx={50} cy={20} r={9} fill="#e5484d" />
            <circle cx={50} cy={44} r={9} fill="#f6c518" />
            <circle cx={50} cy={68} r={9} fill="#30a46c" />
            <g fill="#ffffff" opacity={0.45}>
                <circle cx={47} cy={17} r={2.5} />
                <circle cx={47} cy={41} r={2.5} />
                <circle cx={47} cy={65} r={2.5} />
            </g>
        </g>
    ),
    hanger: () => (
        <g>
            <path d="M50 22 Q50 14 56 12 Q62 10 62 6" fill="none" {...line("#6a6a7a", 3)} />
            <path d="M50 22 L12 40 H88Z" fill="none" {...line("#6a6a7a", 3)} />
            <path d="M36 38 L18 44 L8 62 L20 68 L26 60 V94 H74 V60 L80 68 L92 62 L82 44 L64 38 Q50 46 36 38Z" fill="#a78bfa" {...line("#6a4fc0")} />
            <path d="M40 38 Q50 50 60 38" fill="none" {...line("#6a4fc0", 1.6)} />
        </g>
    ),
    // Jede se: zadovoljno lice koje se oblizuje
    yum: () => (
        <g>
            <circle cx={50} cy={50} r={40} fill="#fcd34d" {...line("#d9a01e", 1.8)} />
            <path d="M30 40 Q36 32 42 40 M58 40 Q64 32 70 40" fill="none" {...line(INK, 2.6)} />
            <Cheek x={28} y={54} r={5} />
            <Cheek x={72} y={54} r={5} />
            <path d="M34 60 Q50 74 66 60" fill="none" {...line(INK, 2.4)} />
            <path d="M54 66 Q58 78 66 74 Q70 70 64 62Z" fill="#f28a9a" {...line("#c9566a", 1.4)} />
            <Shine x={34} y={24} rx={4} ry={7} rotate={-40} opacity={0.5} />
        </g>
    ),
    // Ne jede se: krug sa kosom crtom (blaga crvena, bez lica)
    noEat: () => (
        <g>
            <circle cx={50} cy={50} r={38} fill="#fff1f1" {...line("#e5484d", 8)} />
            <path d="M24 24 L76 76" {...line("#e5484d", 8)} />
        </g>
    ),
    snowflake: () => (
        <g {...line("#5fa8e8", 5)} fill="none">
            {[0, 60, 120].map((angle) => (
                <g key={angle} transform={`rotate(${angle} 50 50)`}>
                    <path d="M50 8 V92" />
                    <path d="M40 16 L50 26 L60 16 M40 84 L50 74 L60 84" />
                </g>
            ))}
            <circle cx={50} cy={50} r={6} fill="#bfe1fb" />
        </g>
    ),
    waves: () => (
        <g>
            <path d="M6 40 Q18 28 30 40 T54 40 T78 40 T102 40 V96 H6Z" fill="#5fa8e8" />
            <path d="M6 58 Q18 46 30 58 T54 58 T78 58 T102 58 V96 H6Z" fill="#3e7bfa" />
            <path d="M6 76 Q18 64 30 76 T54 76 T78 76 T102 76 V96 H6Z" fill="#2a58c0" />
            <path d="M6 40 Q18 28 30 40 T54 40 T78 40 T102 40" fill="none" {...line("#ffffff", 2.4)} opacity={0.7} />
        </g>
    ),
    // Za jelo: tanjir, kašika i viljuška
    cutlery: () => (
        <g>
            <circle cx={50} cy={52} r={31} fill="#dcecfb" {...line("#6a8ab0", 2)} />
            <circle cx={50} cy={52} r={20} fill="#ffffff" {...line("#9ab4d0", 1.6)} />
            <path d="M8 14 V34 Q8 40 13 40 Q18 40 18 34 V14 M13 14 V34 M13 40 V90" fill="none" {...line("#5a6274", 3.4)} />
            <ellipse cx={87} cy={26} rx={7} ry={11} fill="#a8b0c0" {...line("#5a6274", 1.8)} />
            <path d="M87 36 V90" {...line("#5a6274", 4)} />
        </g>
    ),
    // Za crtanje: crtež kuće i sunca na papiru, sa bojicom
    picture: () => (
        <g>
            <rect x={8} y={12} width={76} height={70} rx={4} fill="#ffffff" {...line("#c9b89a", 2)} />
            <circle cx={66} cy={30} r={8} fill="#f6c518" />
            <path d="M22 70 V48 L38 34 L54 48 V70Z" fill="#f28b6e" {...line("#c9563a", 1.4)} />
            <path d="M16 72 H76" {...line("#6cc06a", 3)} />
            <rect x={33} y={56} width={10} height={14} fill="#a8683a" />
            <g transform="rotate(-40 80 80)">
                <path d="M60 76 H92 L100 80 L92 84 H60Z" fill="#3e7bfa" {...line("#2a58c0", 1.4)} />
            </g>
        </g>
    ),
    tree: () => (
        <g>
            <rect x={44} y={58} width={12} height={36} rx={3} fill="#a8683a" {...line("#6a4426")} />
            <circle cx={50} cy={36} r={26} fill="#5fae4a" {...line("#3f7a3a")} />
            <circle cx={30} cy={52} r={16} fill="#5fae4a" {...line("#3f7a3a")} />
            <circle cx={70} cy={52} r={16} fill="#5fae4a" {...line("#3f7a3a")} />
            <path d="M30 52 Q50 64 70 52" fill="#5fae4a" />
            <Shine x={40} y={24} rx={5} ry={8} rotate={-40} opacity={0.3} />
            <path d="M16 94 H84" {...line("#6cc06a", 4)} />
        </g>
    ),
    cloud: () => (
        <g>
            <path d="M22 72 Q6 72 8 56 Q10 42 26 44 Q28 24 48 24 Q64 24 68 38 Q86 34 90 52 Q94 72 74 72Z" fill="#f4f9ff" {...line("#5f8fc8", 2.2)} />
            <path d="M20 66 Q50 72 80 64" fill="none" {...line("#cfe0f4", 3)} />
            <path d="M70 86 Q76 80 84 86 M54 92 Q60 86 68 92" fill="none" {...line("#5f8fc8", 2)} />
        </g>
    ),
    bathtub: () => (
        <g>
            <path d="M18 50 V20 Q18 12 26 12 Q34 12 34 20" fill="none" {...line("#8a94a8", 3)} />
            <circle cx={34} cy={24} r={3} fill="#8a94a8" />
            <g fill="#bfe1fb" {...line("#7ab0d8", 1.2)}>
                <circle cx={44} cy={42} r={7} />
                <circle cx={58} cy={38} r={9} />
                <circle cx={72} cy={44} r={6} />
                <circle cx={30} cy={46} r={5} />
            </g>
            <path d="M8 50 H92 V58 Q92 80 70 80 H30 Q8 80 8 58Z" fill="#ffffff" {...line("#8a94a8", 1.8)} />
            <path d="M8 50 H92" {...line("#8a94a8", 3)} />
            <path d="M26 80 L22 90 M74 80 L78 90" {...line("#8a94a8", 3)} />
        </g>
    ),
    // Muzika: dve note
    notes: () => (
        <g>
            <path d="M34 74 V22 L80 12 V64" fill="none" {...line("#6c61f0", 5)} />
            <path d="M34 22 L80 12 V24 L34 34Z" fill="#6c61f0" />
            <ellipse cx={26} cy={76} rx={11} ry={8} fill="#6c61f0" transform="rotate(-20 26 76)" />
            <ellipse cx={72} cy={66} rx={11} ry={8} fill="#6c61f0" transform="rotate(-20 72 66)" />
        </g>
    ),
    // Škola: zgrada sa zvonom i zastavicom
    school: () => (
        <g>
            <path d="M50 6 V20" {...line("#6a6a7a", 2)} />
            <path d="M50 6 H64 L60 10 L64 14 H50Z" fill="#e5484d" />
            <path d="M8 44 L50 20 L92 44Z" fill="#e5484d" {...line("#a8282a")} />
            <rect x={14} y={44} width={72} height={48} fill="#f6d77a" {...line("#c9a03a")} />
            <circle cx={50} cy={36} r={5} fill="#ffffff" {...line("#a8282a", 1.2)} />
            <g fill="#bfe6fb" {...line("#8a7a4a", 1.2)}>
                <rect x={20} y={52} width={14} height={12} />
                <rect x={66} y={52} width={14} height={12} />
                <rect x={20} y={72} width={14} height={12} />
                <rect x={66} y={72} width={14} height={12} />
            </g>
            <path d="M42 92 V70 Q42 62 50 62 Q58 62 58 70 V92Z" fill="#a8683a" {...line("#6a4426", 1.3)} />
        </g>
    ),
    gift: () => (
        <g>
            <rect x={14} y={42} width={72} height={50} rx={4} fill="#e5484d" {...line("#a8282a")} />
            <rect x={10} y={30} width={80} height={16} rx={4} fill="#f06a6e" {...line("#a8282a")} />
            <rect x={44} y={30} width={12} height={62} fill="#f6c518" {...line("#c9971a", 1.2)} />
            <path d="M50 30 Q30 8 24 20 Q20 30 50 30 Q80 30 76 20 Q70 8 50 30Z" fill="#f6c518" {...line("#c9971a", 1.4)} />
        </g>
    ),
} satisfies Record<string, () => ReactNode>;
