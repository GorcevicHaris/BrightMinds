// Crteži igre „Poređaj po veličini”: isti predmet u više veličina (ribe, medvedići, baloni,
// dinosaurusi, rakete, babuške), kule od kocaka, zmije i olovke (dužina), korpe sa jabukama i
// kartice sa tačkicama (količina), kartice sa životinjama i brojevima. Isti stil kao ostale
// slike (pictures/kit): obli oblici, tanka tamnija ivica, oči sa sjajem i rumeni obrazi.
//
// Predmet veličine se crta u svom okviru (100 × visina) i umanjuje oko sredine donje ivice, pa
// svi stoje na istoj liniji (polica, pesak, trava) — razlika u veličini se vidi odmah. Kad je
// red pun, predmeti urade nešto veselo (mehurići, treptaj, skok, poletanje), talasom od prvog
// ka poslednjem; uz „Manje animacija” sve miruje.

import type { CSSProperties, ReactNode } from "react";
import { Picture } from "@/app/components/games/pictures";
import { Cheek, Eye, INK, line, Shadow, Shine, Smile } from "@/app/components/games/pictures/kit";
import { getAnimal, THEMES, type Direction, type ThemeId } from "@/app/components/games/data/seriationLevels";

interface Tone {
    main: string;
    light: string;
    edge: string;
}

const tone = (main: string, light: string, edge: string): Tone => ({ main, light, edge });

/** Boje po temi (zadaci se smenjuju bojama, a u jednom zadatku su svi predmeti iste boje) */
const TONES: Readonly<Record<ThemeId, readonly Tone[]>> = {
    fish: [tone("#ff9f43", "#ffe0b8", "#c8681a"), tone("#5fb4f0", "#d6eeff", "#2f7fc0"), tone("#f58bb5", "#ffe0ee", "#c2507f")],
    teddy: [tone("#c98b54", "#f2d6b4", "#8a5a30"), tone("#e3b25f", "#f8e6bd", "#a8782e"), tone("#b9a89a", "#ece3da", "#7d6c5e")],
    balloon: [tone("#f2685c", "#ffd3cc", "#b8413a"), tone("#f7c948", "#fff0b8", "#b98c12"), tone("#6aa8f0", "#d8e9ff", "#3a6fb8")],
    dino: [tone("#7cc46a", "#d8f0c8", "#468a38"), tone("#5cc2b0", "#d2f2ec", "#2d877a"), tone("#a98be0", "#e8ddff", "#6c4fb0")],
    rocket: [tone("#ef5a5a", "#ffd2d2", "#a83434"), tone("#4f8ef0", "#d4e4ff", "#2c5fb0"), tone("#f59a3c", "#ffe3c4", "#b0661c")],
    doll: [tone("#e04f5f", "#ffd6da", "#a02c3a"), tone("#4f7fe0", "#d6e2ff", "#2c4fa8"), tone("#3fa76a", "#d2f0de", "#23704a")],
    tower: [tone("#ef6b5e", "#ffd3cc", "#b0453a"), tone("#4f8ef0", "#d4e4ff", "#2c5fb0"), tone("#5bb85a", "#d6f2d2", "#33803a")],
    snake: [tone("#7cc46a", "#e2f5b8", "#468a38"), tone("#f59a3c", "#ffe7a8", "#b0661c"), tone("#a98be0", "#f0e2ff", "#6c4fb0")],
    pencil: [tone("#f7c948", "#fff0b8", "#b98c12"), tone("#ef5a5a", "#ffd2d2", "#a83434"), tone("#4f8ef0", "#d4e4ff", "#2c5fb0")],
    apples: [tone("#e8453c", "#ffd0cc", "#a8282a"), tone("#8cc63f", "#e4f5c8", "#5a8a22"), tone("#f5c033", "#fff0b8", "#b98c12")],
    dots: [tone("#589c31", "#def1d2", "#386320"), tone("#e0784a", "#ffe2d2", "#a8502a"), tone("#4f7fe0", "#d6e2ff", "#2c4fa8")],
    stars: [tone("#f2b01e", "#fff1c4", "#b07c0a"), tone("#e0784a", "#ffe2d2", "#a8502a"), tone("#a98be0", "#ede4ff", "#6c4fb0")],
    animal: [tone("#fffaf2", "#fffaf2", "#e3d7c6")],
    number: [tone("#589c31", "#def1d2", "#386320"), tone("#4f7fe0", "#d6e2ff", "#2c4fa8"), tone("#e0784a", "#ffe2d2", "#a8502a")],
};

function toneOf(theme: ThemeId, index: number): Tone {
    const list = TONES[theme];
    return list[Math.min(Math.max(Math.round(index) || 0, 0), list.length - 1)];
}

/** Visina okvira predmeta (širina je uvek 100) */
export function boxHeight(theme: ThemeId): number {
    return Math.round(100 * THEMES[theme].aspect);
}

// ── Pokreti ───────────────────────────────────────────────────────────────────

export function SeriationStyles() {
    return (
        <style>{`
@keyframes sr-hop { 0%, 100% { transform: translateY(0) } 28% { transform: translateY(-14%) } 52% { transform: translateY(0) } 68% { transform: translateY(-5%) } 84% { transform: translateY(0) } }
@keyframes sr-bob { 0%, 100% { transform: translate(0, 0) rotate(0) } 30% { transform: translate(3%, -6%) rotate(-4deg) } 65% { transform: translate(-2%, 2%) rotate(3deg) } }
@keyframes sr-bubble { 0% { transform: translateY(0) scale(0.5); opacity: 0 } 20% { opacity: 0.9 } 100% { transform: translateY(-26px) scale(1.1); opacity: 0 } }
@keyframes sr-blink { 0%, 30%, 40%, 70%, 80%, 100% { transform: scaleY(1) } 35%, 75% { transform: scaleY(0.12) } }
@keyframes sr-rock { 0%, 100% { transform: rotate(0) } 25% { transform: rotate(-5deg) } 75% { transform: rotate(5deg) } }
@keyframes sr-float { 0%, 100% { transform: translateY(0) rotate(0) } 35% { transform: translateY(-9%) rotate(-4deg) } 70% { transform: translateY(-4%) rotate(4deg) } }
@keyframes sr-stomp { 0%, 100% { transform: translateY(0) scaleY(1) } 25% { transform: translateY(-9%) scaleY(1.02) } 45% { transform: translateY(0) scaleY(0.93) } 60% { transform: translateY(0) scaleY(1) } }
@keyframes sr-lift { 0%, 100% { transform: translateY(0) } 40%, 65% { transform: translateY(-13%) } }
@keyframes sr-flame { 0%, 100% { opacity: 0; transform: scaleY(0.4) } 20%, 80% { opacity: 1; transform: scaleY(1) } 50% { opacity: 1; transform: scaleY(1.25) } }
@keyframes sr-wave { 0%, 100% { transform: rotate(0) } 25%, 75% { transform: rotate(-38deg) } 50% { transform: rotate(-18deg) } }
@keyframes sr-slither { 0%, 100% { transform: skewX(0) } 25% { transform: skewX(-9deg) } 75% { transform: skewX(9deg) } }
@keyframes sr-pop { 0% { transform: scale(0.82); opacity: 0.5 } 60% { transform: scale(1.05); opacity: 1 } 100% { transform: scale(1) } }
.sr-hop, .sr-bob, .sr-rock, .sr-float, .sr-stomp, .sr-lift { transform-box: fill-box; transform-origin: 50% 100%; }
.sr-hop { animation: sr-hop 0.9s ease-in-out var(--sr-d, 0s) 2 both; }
.sr-bob { transform-origin: 50% 50%; animation: sr-bob 1.1s ease-in-out var(--sr-d, 0s) 2 both; }
.sr-bubble { transform-box: fill-box; transform-origin: 50% 50%; opacity: 0; animation: sr-bubble 1.2s ease-out calc(var(--sr-d, 0s) + var(--sr-b, 0s)) 2 both; }
.sr-blink { transform-box: fill-box; transform-origin: 50% 50%; animation: sr-blink 1.4s linear var(--sr-d, 0s) 2 both; }
.sr-rock { animation: sr-rock 1.1s ease-in-out var(--sr-d, 0s) 2 both; }
.sr-float { animation: sr-float 1.4s ease-in-out var(--sr-d, 0s) 2 both; }
.sr-stomp { animation: sr-stomp 0.8s ease-in-out var(--sr-d, 0s) 3 both; }
.sr-lift { animation: sr-lift 2.2s ease-in-out var(--sr-d, 0s) 1 both; }
.sr-flame { transform-box: fill-box; transform-origin: 50% 0%; opacity: 0; animation: sr-flame 2.2s ease-in-out var(--sr-d, 0s) 1 both; }
.sr-wave { transform-box: fill-box; transform-origin: 30% 15%; animation: sr-wave 0.9s ease-in-out var(--sr-d, 0s) 2 both; }
.sr-slither { transform-box: fill-box; transform-origin: 100% 50%; animation: sr-slither 0.7s ease-in-out var(--sr-d, 0s) 3 both; }
.sr-pop { animation: sr-pop 0.42s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .sr-hop, .sr-bob, .sr-bubble, .sr-blink, .sr-rock, .sr-float, .sr-stomp, .sr-lift, .sr-flame, .sr-wave, .sr-slither, .sr-pop { animation: none; }
  .sr-bubble, .sr-flame { opacity: 0; }
}
`}</style>
    );
}

/** Klasa pokreta samo dok predmeti slave (inače nema klase, pa nema ni pokreta) */
const on = (cheer: boolean, name: string) => (cheer ? name : undefined);

// ── Predmeti iste vrste, različite veličine ───────────────────────────────────

function Fish({ c, cheer }: { c: Tone; cheer: boolean }) {
    return (
        <g>
            <Shadow cx={54} cy={77} rx={30} />
            <g className={on(cheer, "sr-bob")}>
                <path d="M28 44 Q16 30 6 24 Q11 44 6 64 Q16 58 28 44Z" fill={c.main} {...line(c.edge)} />
                <path d="M30 40 Q20 34 12 32 M30 48 Q20 54 12 56" fill="none" {...line(c.edge, 1.1)} opacity={0.5} />
                <path d="M42 24 Q50 8 68 15 Q73 19 71 26Z" fill={c.main} {...line(c.edge)} />
                <ellipse cx={56} cy={45} rx={34} ry={25} fill={c.main} {...line(c.edge)} />
                <path d="M28 52 Q56 74 86 54 Q62 63 28 52Z" fill={c.light} opacity={0.85} />
                <path d="M40 36 Q45 41 40 46 M50 30 Q55 35 50 40 M50 44 Q55 49 50 54 M60 36 Q64 40 60 44" fill="none" {...line(c.edge, 1.2)} opacity={0.45} />
                <path d="M56 50 Q66 56 58 66 Q50 60 56 50Z" fill={c.light} {...line(c.edge, 1.2)} />
                <circle cx={73} cy={38} r={7} fill="#ffffff" {...line(c.edge, 1.2)} />
                <Eye x={74} y={38.5} r={4} />
                <Cheek x={72} y={52} r={3.6} />
                <Smile x={84} y={50} w={3.4} />
                <Shine x={42} y={30} rx={3} ry={6} rotate={60} opacity={0.4} />
            </g>
            {cheer && (
                <g fill="#ffffff" fillOpacity={0.55} {...line("#7fb8e0", 1.2)}>
                    <circle className="sr-bubble" style={{ ["--sr-b" as string]: "0s" } as CSSProperties} cx={92} cy={40} r={3.5} />
                    <circle className="sr-bubble" style={{ ["--sr-b" as string]: "0.35s" } as CSSProperties} cx={95} cy={30} r={2.6} />
                    <circle className="sr-bubble" style={{ ["--sr-b" as string]: "0.7s" } as CSSProperties} cx={90} cy={22} r={4.2} />
                </g>
            )}
        </g>
    );
}

function Teddy({ c, cheer }: { c: Tone; cheer: boolean }) {
    return (
        <g>
            <Shadow cx={50} cy={102} rx={30} />
            <circle cx={28} cy={20} r={11} fill={c.main} {...line(c.edge)} />
            <circle cx={72} cy={20} r={11} fill={c.main} {...line(c.edge)} />
            <circle cx={28} cy={20} r={5.5} fill={c.light} />
            <circle cx={72} cy={20} r={5.5} fill={c.light} />
            <ellipse cx={35} cy={92} rx={12} ry={9.5} fill={c.main} {...line(c.edge)} />
            <ellipse cx={65} cy={92} rx={12} ry={9.5} fill={c.main} {...line(c.edge)} />
            <ellipse cx={33} cy={94} rx={6} ry={4.6} fill={c.light} />
            <ellipse cx={67} cy={94} rx={6} ry={4.6} fill={c.light} />
            <ellipse cx={50} cy={72} rx={25} ry={22} fill={c.main} {...line(c.edge)} />
            <ellipse cx={50} cy={76} rx={14.5} ry={13} fill={c.light} />
            <ellipse cx={25} cy={70} rx={7.5} ry={13} transform="rotate(28 25 70)" fill={c.main} {...line(c.edge)} />
            <g className={on(cheer, "sr-wave")}>
                <ellipse cx={75} cy={70} rx={7.5} ry={13} transform="rotate(-28 75 70)" fill={c.main} {...line(c.edge)} />
            </g>
            <circle cx={50} cy={40} r={25} fill={c.main} {...line(c.edge)} />
            <ellipse cx={50} cy={50} rx={11} ry={8.5} fill={c.light} />
            <ellipse cx={50} cy={46} rx={4.2} ry={3.2} fill={INK} />
            <path d="M50 49 V52 M45.5 52.5 Q50 56.5 54.5 52.5" fill="none" {...line(INK, 1.5)} />
            <g className={on(cheer, "sr-blink")}>
                <Eye x={40} y={36} r={3.4} />
                <Eye x={60} y={36} r={3.4} />
            </g>
            <Cheek x={33} y={46} r={3.6} />
            <Cheek x={67} y={46} r={3.6} />
            <Shine x={38} y={25} rx={3} ry={6} rotate={50} opacity={0.35} />
        </g>
    );
}

function Balloon({ c, cheer }: { c: Tone; cheer: boolean }) {
    return (
        <g className={on(cheer, "sr-float")}>
            <path d="M50 84 Q43 97 52 108 Q60 119 50 129" fill="none" {...line("#9a8a7a", 1.8)} />
            <path d="M45.5 88 L54.5 88 L50 80Z" fill={c.main} {...line(c.edge, 1.4)} />
            <ellipse cx={50} cy={44} rx={32} ry={38} fill={c.main} {...line(c.edge)} />
            <ellipse cx={37} cy={25} rx={6} ry={11} transform="rotate(30 37 25)" fill="#ffffff" opacity={0.45} />
            <circle cx={30} cy={40} r={2.4} fill="#ffffff" opacity={0.5} />
            <g className={on(cheer, "sr-blink")}>
                <Eye x={41} y={45} r={3.4} />
                <Eye x={59} y={45} r={3.4} />
            </g>
            <Cheek x={34} y={53} r={3.6} />
            <Cheek x={66} y={53} r={3.6} />
            <Smile x={50} y={53} w={5} />
        </g>
    );
}

function Dino({ c, cheer }: { c: Tone; cheer: boolean }) {
    return (
        <g>
            <Shadow cx={50} cy={87} rx={36} />
            <g className={on(cheer, "sr-stomp")}>
                <path d="M30 58 Q12 62 3 48 Q14 54 32 49Z" fill={c.main} {...line(c.edge)} />
                <g fill="#f7c948" {...line("#c99a1e", 1.3)}>
                    <path d="M28 46 L32 34 L39 44Z" />
                    <path d="M38 41 L44 27 L51 40Z" />
                    <path d="M50 40 L57 27 L62 41Z" />
                </g>
                <path d="M34 70 V84 Q34 87 37 87 H44 Q47 87 47 84 V70Z" fill={c.main} {...line(c.edge)} />
                <path d="M54 70 V84 Q54 87 57 87 H64 Q67 87 67 84 V70Z" fill={c.main} {...line(c.edge)} />
                <ellipse cx={48} cy={60} rx={27} ry={19} fill={c.main} {...line(c.edge)} />
                <ellipse cx={53} cy={66} rx={15} ry={9} fill={c.light} />
                <circle cx={36} cy={56} r={3} fill={c.edge} opacity={0.25} />
                <circle cx={44} cy={50} r={2.2} fill={c.edge} opacity={0.25} />
                <path d="M62 50 Q66 38 70 30 L84 32 Q80 46 72 60Z" fill={c.main} />
                <circle cx={76} cy={28} r={15} fill={c.main} {...line(c.edge)} />
                <ellipse cx={86} cy={34} rx={12} ry={9} fill={c.main} {...line(c.edge)} />
                <path d="M62 50 Q66 38 70 30" fill="none" {...line(c.edge)} />
                <path d="M68 62 Q76 62 76 68" fill="none" {...line(c.edge, 2.4)} />
                <circle cx={94} cy={31} r={1.2} fill={INK} />
                <path d="M82 40 Q88 43 93 39" fill="none" {...line(INK, 1.5)} />
                <g className={on(cheer, "sr-blink")}>
                    <Eye x={78} y={24} r={3.4} />
                </g>
                <Cheek x={80} y={35} r={3.4} />
                <Shine x={70} y={19} rx={2.6} ry={5} rotate={50} opacity={0.35} />
            </g>
        </g>
    );
}

function Rocket({ c, cheer }: { c: Tone; cheer: boolean }) {
    return (
        <g className={on(cheer, "sr-lift")}>
            <g className={on(cheer, "sr-flame")} opacity={cheer ? undefined : 0}>
                <path d="M41 112 Q50 142 59 112Z" fill="#ffb347" />
                <path d="M45 112 Q50 130 55 112Z" fill="#ffe08a" />
            </g>
            <path d="M28 76 Q12 86 12 110 Q12 113 15 112 L29 104Z" fill={c.main} {...line(c.edge)} />
            <path d="M72 76 Q88 86 88 110 Q88 113 85 112 L71 104Z" fill={c.main} {...line(c.edge)} />
            <path d="M40 104 H60 L57 113 H43Z" fill="#a6a6bd" {...line("#6f6f88", 1.4)} />
            <path d="M50 4 Q74 22 72 64 V100 Q72 106 66 106 H34 Q28 106 28 100 V64 Q26 22 50 4Z" fill="#f7f5ff" {...line("#8a86a8")} />
            <path d="M50 4 Q63 13 68 30 H32 Q37 13 50 4Z" fill={c.main} {...line(c.edge)} />
            <rect x={28} y={86} width={44} height={7} fill={c.main} />
            <circle cx={50} cy={57} r={14} fill={c.main} {...line(c.edge)} />
            <circle cx={50} cy={57} r={10.5} fill="#cdeafb" {...line("#5a86a8", 1.2)} />
            <g className={on(cheer, "sr-blink")}>
                <Eye x={45.5} y={56} r={2.4} />
                <Eye x={54.5} y={56} r={2.4} />
            </g>
            <Smile x={50} y={61} w={3} />
            <Shine x={38} y={40} rx={2.6} ry={9} rotate={10} opacity={0.6} />
        </g>
    );
}

function Doll({ c, cheer }: { c: Tone; cheer: boolean }) {
    return (
        <g>
            <Shadow cx={50} cy={122} rx={34} />
            <g className={on(cheer, "sr-rock")}>
                <path
                    d="M50 4 C70 4 79 20 77 38 C76 46 71 50 72 56 C90 67 93 96 87 110 C83 120 70 122 50 122 C30 122 17 120 13 110 C7 96 10 67 28 56 C29 50 24 46 23 38 C21 20 30 4 50 4Z"
                    fill={c.main}
                    {...line(c.edge)}
                />
                <ellipse cx={50} cy={36} rx={17.5} ry={16.5} fill="#ffe4d0" {...line(c.edge, 1.3)} />
                <path d="M33 33 Q36 21 50 22 Q64 21 67 33 Q62 26 56 28 Q50 24 44 28 Q38 26 33 33Z" fill="#7a4a2a" />
                <ellipse cx={50} cy={92} rx={26} ry={22} fill="#fff6e6" {...line(c.edge, 1.3)} />
                <g>
                    <path d="M38 98 Q34 92 40 90 Q44 94 38 98Z M62 98 Q66 92 60 90 Q56 94 62 98Z" fill="#5bb85a" />
                    {[0, 72, 144, 216, 288].map((angle) => (
                        <circle key={angle} cx={50 + 6.5 * Math.cos((angle * Math.PI) / 180)} cy={90 + 6.5 * Math.sin((angle * Math.PI) / 180)} r={4.6} fill={c.main} opacity={0.85} />
                    ))}
                    <circle cx={50} cy={90} r={3.6} fill="#f7c948" />
                </g>
                <circle cx={30} cy={70} r={2.2} fill="#ffffff" opacity={0.7} />
                <circle cx={70} cy={70} r={2.2} fill="#ffffff" opacity={0.7} />
                <circle cx={22} cy={96} r={2.2} fill="#ffffff" opacity={0.7} />
                <circle cx={78} cy={96} r={2.2} fill="#ffffff" opacity={0.7} />
                <g className={on(cheer, "sr-blink")}>
                    <Eye x={44} y={37} r={2.9} />
                    <Eye x={56} y={37} r={2.9} />
                </g>
                <circle cx={39.5} cy={43.5} r={3.6} fill="#f58a8a" opacity={0.6} />
                <circle cx={60.5} cy={43.5} r={3.6} fill="#f58a8a" opacity={0.6} />
                <Smile x={50} y={44} w={3.4} />
                <Shine x={36} y={14} rx={3} ry={6} rotate={50} opacity={0.4} />
            </g>
        </g>
    );
}

// ── Visina: kule od kocaka ────────────────────────────────────────────────────

const BLOCK_COLORS = ["#ef6b5e", "#f7c948", "#4f8ef0", "#5bb85a", "#f59a3c", "#a98be0"];

function Tower({ value, max, tone: index, cheer }: { value: number; max: number; tone: number; cheer: boolean }) {
    const height = boxHeight("tower");
    const side = Math.min(46, (height - 6) / Math.max(max, 1));
    const x = 50 - side / 2;
    const blocks = Array.from({ length: value }, (_, i) => i);
    return (
        <g>
            <Shadow cx={50} cy={height - 2} rx={side * 0.7} />
            <g className={on(cheer, "sr-hop")}>
                {blocks.map((i) => {
                    const y = height - 3 - side * (i + 1);
                    const color = BLOCK_COLORS[(i + index * 2) % BLOCK_COLORS.length];
                    return (
                        <g key={i}>
                            <rect x={x + 0.8} y={y + 0.8} width={side - 1.6} height={side - 1.6} rx={side * 0.16} fill={color} {...line("#00000033", 1.4)} />
                            <rect x={x + side * 0.16} y={y + side * 0.14} width={side * 0.68} height={side * 0.16} rx={side * 0.08} fill="#ffffff" opacity={0.35} />
                        </g>
                    );
                })}
                {/* Najviša kocka ima lice */}
                {value > 0 && (
                    <g className={on(cheer, "sr-blink")}>
                        <Eye x={50 - side * 0.17} y={height - 3 - side * value + side * 0.5} r={Math.max(1.8, side * 0.08)} />
                        <Eye x={50 + side * 0.17} y={height - 3 - side * value + side * 0.5} r={Math.max(1.8, side * 0.08)} />
                    </g>
                )}
                {value > 0 && <Smile x={50} y={height - 3 - side * value + side * 0.7} w={Math.max(2.4, side * 0.1)} />}
            </g>
        </g>
    );
}

// ── Količina: korpe sa jabukama, kartice sa tačkicama i zvezdicama ────────────

const APPLE_SPOTS: readonly (readonly [number, number])[][] = [
    [],
    [[50, 44]],
    [[35, 44], [65, 44]],
    [[21, 46], [50, 46], [79, 46]],
    [[21, 46], [50, 46], [79, 46], [50, 19]],
    [[21, 46], [50, 46], [79, 46], [35.5, 19], [64.5, 19]],
    [[21, 46], [50, 46], [79, 46], [35.5, 19], [64.5, 19], [50, -8]],
];

/** Jabuka poluprečnika oko 14 (krupna, da se lako prebroji) */
function Apple({ x, y, c }: { x: number; y: number; c: Tone }) {
    return (
        <g transform={`translate(${x} ${y}) scale(1.3)`}>
            <path d="M0 -9 Q1 -14 3 -15" fill="none" {...line("#7a4a2a", 1.8)} />
            <path d="M1 -11 Q8 -17 12 -12 Q6 -8 1 -11Z" fill="#5bb85a" {...line("#33803a", 1)} />
            <path d="M0 -8 Q-11 -13 -11 0 Q-10 11 0 10 Q10 11 11 0 Q11 -13 0 -8Z" fill={c.main} {...line(c.edge, 1.4)} />
            <ellipse cx={-5} cy={-3} rx={2.4} ry={4} transform="rotate(25 -5 -3)" fill="#ffffff" opacity={0.5} />
        </g>
    );
}

function Basket({ value, c, cheer }: { value: number; c: Tone; cheer: boolean }) {
    const spots = APPLE_SPOTS[Math.min(Math.max(value, 0), APPLE_SPOTS.length - 1)];
    return (
        <g>
            <Shadow cx={50} cy={97} rx={36} />
            <g className={on(cheer, "sr-hop")}>
                {spots.map(([x, y], i) => (
                    <Apple key={i} x={x} y={y + 14} c={c} />
                ))}
                <path d="M10 70 H90 L82 94 Q80 97 75 97 H25 Q20 97 18 94Z" fill="#d9a25f" {...line("#9a6a35")} />
                <path d="M14 82 H86 M30 72 L32 96 M50 72 V97 M70 72 L68 96" fill="none" {...line("#b47c40", 1.4)} />
                <rect x={5} y={66} width={90} height={8} rx={4} fill="#c98f4c" {...line("#9a6a35")} />
            </g>
        </g>
    );
}

/** Raspored tačkica kao na kockici (mreža 3 × 3) */
const DOT_GRID: readonly number[][] = [
    [],
    [4],
    [0, 8],
    [0, 4, 8],
    [0, 2, 6, 8],
    [0, 2, 4, 6, 8],
    [0, 2, 3, 5, 6, 8],
    [0, 2, 3, 4, 5, 6, 8],
    [0, 1, 2, 3, 5, 6, 7, 8],
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
];

function starPath(cx: number, cy: number, r: number): string {
    const points = Array.from({ length: 10 }, (_, i) => {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const radius = i % 2 === 0 ? r : r * 0.48;
        return `${(cx + radius * Math.cos(angle)).toFixed(1)} ${(cy + radius * Math.sin(angle)).toFixed(1)}`;
    });
    return `M${points.join(" L")}Z`;
}

function Card({ c, children, cheer }: { c: Tone; children: ReactNode; cheer: boolean }) {
    const height = boxHeight("dots");
    return (
        <g className={on(cheer, "sr-hop")}>
            <rect x={4} y={4} width={92} height={height - 8} rx={14} fill="#ffffff" stroke={c.main} strokeWidth={3.5} />
            <rect x={10} y={10} width={80} height={height - 20} rx={10} fill={c.light} opacity={0.45} />
            {children}
        </g>
    );
}

function DotCard({ value, c, star, cheer }: { value: number; c: Tone; star: boolean; cheer: boolean }) {
    const cells = DOT_GRID[Math.min(Math.max(value, 0), DOT_GRID.length - 1)];
    return (
        <Card c={c} cheer={cheer}>
            {cells.map((cell) => {
                const x = 27 + (cell % 3) * 23;
                const y = 37 + Math.floor(cell / 3) * 25.5;
                return star ? <path key={cell} d={starPath(x, y, 10.5)} fill={c.main} {...line(c.edge, 1.2)} /> : <circle key={cell} cx={x} cy={y} r={8.5} fill={c.main} {...line(c.edge, 1.2)} />;
            })}
        </Card>
    );
}

function NumberCard({ value, c, cheer }: { value: number; c: Tone; cheer: boolean }) {
    const height = boxHeight("number");
    const text = String(value);
    return (
        <Card c={c} cheer={cheer}>
            <text
                x={50}
                y={height / 2 + 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={text.length > 1 ? 54 : 70}
                fontWeight={900}
                fill={c.edge}
                style={{ fontFamily: "var(--font-display), ui-rounded, system-ui, sans-serif", letterSpacing: text.length > 1 ? "-2px" : undefined }}
            >
                {text}
            </text>
        </Card>
    );
}

function AnimalCard({ id, cheer }: { id: string; cheer: boolean }) {
    const animal = getAnimal(id);
    return (
        <g className={on(cheer, "sr-hop")}>
            <rect x={3} y={3} width={94} height={94} rx={16} fill="#fffaf2" stroke="#e3d7c6" strokeWidth={2.5} />
            {animal && <Picture id={animal.id} x={11} y={10} width={78} height={78} />}
        </g>
    );
}

// ── Predmet u kvadratu mesta ──────────────────────────────────────────────────

interface PieceArtProps {
    theme: ThemeId;
    /** Id predmeta (životinja) i vrednost (veličina, broj kocaka, količina, broj) */
    id: string;
    value: number;
    /** Najveća vrednost u zadatku (visina kocke) */
    max: number;
    tone: number;
    /** Red je pun: veseo pokret (talas, `index` pomera početak) */
    cheer?: boolean;
    index?: number;
    /** Bleda senka tačne veličine (pomoć na lakim nivoima) */
    silhouette?: boolean;
    className?: string;
}

/** Predmet nacrtan u okviru mesta (100 × visina teme), umanjen oko sredine donje ivice */
export function PieceArt({ theme, id, value, max, tone: toneIndex, cheer = false, index = 0, silhouette = false, className }: PieceArtProps) {
    const info = THEMES[theme];
    const height = boxHeight(theme);
    const c = toneOf(theme, toneIndex);
    const style = { ["--sr-d" as string]: `${index * 0.14}s`, ...(silhouette ? { filter: "brightness(0)", opacity: 0.13 } : {}) } as CSSProperties;
    let art: ReactNode = null;
    if (info.measure === "size") {
        const scale = Math.min(Math.max(value, 10), 100) / 100;
        const draw =
            theme === "fish" ? <Fish c={c} cheer={cheer} /> : theme === "teddy" ? <Teddy c={c} cheer={cheer} /> : theme === "balloon" ? <Balloon c={c} cheer={cheer} /> : theme === "dino" ? <Dino c={c} cheer={cheer} /> : theme === "rocket" ? <Rocket c={c} cheer={cheer} /> : <Doll c={c} cheer={cheer} />;
        art = <g transform={`translate(${50 - 50 * scale} ${height - height * scale}) scale(${scale})`}>{draw}</g>;
    } else if (theme === "tower") art = <Tower value={value} max={max} tone={toneIndex} cheer={cheer} />;
    else if (theme === "apples") art = <Basket value={value} c={c} cheer={cheer} />;
    else if (theme === "dots" || theme === "stars") art = <DotCard value={value} c={c} star={theme === "stars"} cheer={cheer} />;
    else if (theme === "number") art = <NumberCard value={value} c={c} cheer={cheer} />;
    else if (theme === "animal") art = <AnimalCard id={id} cheer={cheer} />;
    return (
        <svg viewBox={`0 0 100 ${height}`} className={className} style={style} overflow="visible" aria-hidden="true" focusable="false">
            {art}
        </svg>
    );
}

// ── Dužina: zmije i olovke (traka) ────────────────────────────────────────────

/** Odnos širine i visine najduže zmije (olovke) u zadatku */
export const LANE_RATIO = 5;
const LANE_H = 40;

function Snake({ length, c, cheer }: { length: number; c: Tone; cheer: boolean }) {
    const headX = length - 15;
    const bodyEnd = headX - 6;
    const waves = Math.max(1, Math.round((bodyEnd - 6) / 34));
    const step = (bodyEnd - 6) / waves;
    let d = `M6 25`;
    for (let i = 0; i < waves; i += 1) d += ` q${step / 4} -7 ${step / 2} 0 t${step / 2} 0`;
    return (
        <g>
            <g className={on(cheer, "sr-slither")}>
                <path d={d} fill="none" stroke={c.edge} strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" />
                <path d={d} fill="none" stroke={c.main} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
                <path d={d} fill="none" stroke={c.light} strokeWidth={12} strokeDasharray="4 9" strokeLinecap="butt" opacity={0.9} />
            </g>
            <g className={on(cheer, "sr-hop")}>
                <ellipse cx={headX} cy={21} rx={14} ry={12} fill={c.main} {...line(c.edge)} />
                <Eye x={headX + 2} y={17} r={2.8} />
                <Cheek x={headX + 5} y={25} r={2.6} />
                <path d={`M${headX + 6} 28 Q${headX + 10} 30 ${headX + 13} 27`} fill="none" {...line(INK, 1.4)} />
                <Shine x={headX - 5} y={15} rx={2} ry={4} rotate={60} opacity={0.4} />
            </g>
        </g>
    );
}

function Pencil({ length, c, cheer }: { length: number; c: Tone; cheer: boolean }) {
    const tip = length - 2;
    const wood = length - 26;
    return (
        <g className={on(cheer, "sr-hop")}>
            <rect x={2} y={9} width={14} height={22} rx={5} fill="#f6a5b8" {...line("#c46a82", 1.4)} />
            <rect x={14} y={8} width={10} height={24} fill="#c7cbd6" {...line("#7d8396", 1.4)} />
            <path d="M17 8 V32 M21 8 V32" {...line("#9aa0b2", 1)} />
            <rect x={24} y={8} width={wood - 24} height={24} fill={c.main} {...line(c.edge, 1.4)} />
            <path d={`M24 16 H${wood} M24 24 H${wood}`} {...line(c.edge, 1)} opacity={0.45} />
            <path d={`M${wood} 8 L${tip} 20 L${wood} 32Z`} fill="#f3d3a3" {...line("#b08a5a", 1.4)} />
            <path d={`M${tip - 8} 16.2 L${tip} 20 L${tip - 8} 23.8Z`} fill="#4a4a5a" />
            <rect x={28} y={11} width={Math.max(4, wood - 34)} height={3} rx={1.5} fill="#ffffff" opacity={0.4} />
        </g>
    );
}

/**
 * Zmija ili olovka na traci: dužina je srazmerna vrednosti (najduža u zadatku zauzima
 * LANE_RATIO visina trake). Crta se uz levu ivicu — svi počinju od iste linije, kao kad se meri.
 */
export function LengthArt({ theme, value, max, tone: toneIndex, cheer = false, index = 0, silhouette = false, className }: Omit<PieceArtProps, "id">) {
    const length = Math.max(40, (LANE_RATIO * LANE_H * value) / Math.max(max, 1));
    const c = toneOf(theme, toneIndex);
    const style = { ["--sr-d" as string]: `${index * 0.14}s`, ...(silhouette ? { filter: "brightness(0)", opacity: 0.13 } : {}) } as CSSProperties;
    return (
        <svg viewBox={`0 0 ${length} ${LANE_H}`} className={className} style={{ ...style, aspectRatio: `${length} / ${LANE_H}` }} overflow="visible" aria-hidden="true" focusable="false">
            {theme === "snake" ? <Snake length={length} c={c} cheer={cheer} /> : <Pencil length={length} c={c} cheer={cheer} />}
        </svg>
    );
}

/** Deo trake koji zauzima predmet (0–1) */
export function lengthShare(value: number, max: number): number {
    return Math.max(40, (LANE_RATIO * LANE_H * value) / Math.max(max, 1)) / (LANE_RATIO * LANE_H);
}

// ── Smer: klin koji raste (ili se smanjuje) ispod reda ────────────────────────

export function DirectionWedge({ dir, vertical = false, light = false, className }: { dir: Direction; vertical?: boolean; light?: boolean; className?: string }) {
    // Na travi je zelen klin slabo vidljiv, pa je beo
    const fill = light ? "#ffffff" : "var(--color-sprout-300)";
    const head = light ? "#ffffff" : "var(--color-sprout-500)";
    // Klin: tanak kraj je „najmanje”, debeo „najviše”. Red se uvek puni od početka, pa strelica
    // uvek pokazuje napred (nadesno, odnosno nadole); menja se samo oblik klina.
    const up = dir === "up";
    if (vertical) {
        return (
            <svg viewBox="0 0 16 100" preserveAspectRatio="none" className={className} aria-hidden="true" focusable="false">
                <path d={up ? "M7 2 L9 2 L15 88 L1 88Z" : "M1 2 L15 2 L9 88 L7 88Z"} fill={fill} opacity={0.75} />
                <path d="M1 90 L15 90 L8 99Z" fill={head} />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 200 16" preserveAspectRatio="none" className={className} aria-hidden="true" focusable="false">
            <path d={up ? "M2 7 L2 9 L186 15 L186 1Z" : "M2 1 L2 15 L186 9 L186 7Z"} fill={fill} opacity={light ? 0.85 : 0.75} />
            <path d="M188 1 L198 8 L188 15Z" fill={head} />
        </svg>
    );
}
