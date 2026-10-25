"use client";

// Crteži igre „Brojimo”: predmeti za brojanje na tabli (u redovima po pet, kao na kockici,
// u okviru od deset), grupe na karticama i kartice sa brojem. Predmeti su veliki i razmaknuti,
// uvek u urednom rasporedu — nikad rasuti. Kad pomoć broji naglas, izbrojani predmet zasvetli.

import type { CSSProperties, ReactNode } from "react";
import { DICE_PATTERNS, rowsOf, type CountNoun, type CountRound } from "@/app/components/games/data/countingItems";
import { Picture } from "@/app/components/games/pictures";
import { cn } from "@/lib/cn";

/**
 * Veličine predmeta: deo širine i visine ekrana, pa staju i na telefon i na položen tablet.
 * Kad tabla ima svoju kolonu (položen telefon, `flat`), `--count-k` uvećava deo visine, a
 * `--count-w` smanjuje deo širine (kolona je oko četvrtine ekrana).
 */
const SIZE = {
    /** Do tri predmeta: krupno */
    few: "min(calc(21vw * var(--count-w, 1)), calc(11dvh * var(--count-k, 1)), 7rem)",
    /** Četiri–pet predmeta u jednom redu */
    row: "min(calc(15.5vw * var(--count-w, 1)), calc(10dvh * var(--count-k, 1)), 6rem)",
    /** Dva reda po pet */
    rows: "min(calc(14.5vw * var(--count-w, 1)), calc(8dvh * var(--count-k, 1)), 5.25rem)",
    dice: "min(calc(16vw * var(--count-w, 1)), calc(6dvh * var(--count-k, 1)), 5rem)",
    frame: "min(calc(13.5vw * var(--count-w, 1)), calc(6.5dvh * var(--count-k, 1)), 4.5rem)",
    /** Dva okvira (preko deset): u svojoj koloni stoje jedan ispod drugog, pa su niži */
    frames: "min(calc(13.5vw * var(--count-w, 1)), calc(6.5dvh * min(var(--count-k, 1), 0.95)), 4.5rem)",
    /** Grupa na kartici */
    group: "min(calc(11.5vw * var(--count-w, 1)), calc(5.8dvh * var(--count-k, 1)), 3.75rem)",
};

/**
 * Sabiranje, jedan više / manje: dve grupe jedna do druge. Veličina zavisi od toga koliko predmeta
 * ima u širinu (najviše šest), da obe grupe sa znakom između stanu u red i na uskom telefonu.
 */
function pairSize(across: number): string {
    const cells = Math.max(across, 2);
    return `min(calc(${((66 - 1.5 * cells) / cells).toFixed(1)}vw * var(--count-w, 1)), calc(7dvh * var(--count-k, 1)), 5rem)`;
}

function sized(size: string): CSSProperties {
    return { width: size, height: size };
}

/** Jedan predmet. `lit` = izbrojan pri brojanju uz pomoć; `faded` = odlazi (ne broji se) */
function Thing({ noun, size, lit = false, faded = false }: { noun: CountNoun; size: string; lit?: boolean; faded?: boolean }) {
    return (
        <span
            aria-hidden="true"
            style={sized(size)}
            className={cn(
                "grid shrink-0 select-none place-items-center rounded-full leading-none transition-[background-color,box-shadow,transform] duration-200",
                lit && "bg-sun-100 ring-[3px] ring-inset ring-sun-400",
                faded && "opacity-35 grayscale"
            )}
        >
            <Picture id={noun.pic} className="h-[88%] w-[88%]" />
        </span>
    );
}

/** Predmeti u redovima po pet; `offset` = koliko je predmeta ispred ove grupe pri brojanju */
function Rows({ noun, count, size, lit, offset = 0, perRow = 5 }: { noun: CountNoun; count: number; size: string; lit: number; offset?: number; perRow?: number }) {
    return (
        <div className="flex flex-col items-start gap-[min(1.5vw,0.6rem)]">
            {rowsOf(count, perRow).map((length, row) => (
                <div key={row} className="flex gap-[min(1.5vw,0.6rem)]">
                    {Array.from({ length }, (_, i) => {
                        // Redni broj predmeta pri brojanju (od 1)
                        const index = offset + row * perRow + i + 1;
                        return <Thing key={index} noun={noun} size={size} lit={index <= lit} />;
                    })}
                </div>
            ))}
        </div>
    );
}

/** Raspored kao na kockici (1–6), na beloj pločici */
function Dice({ noun, count, lit }: { noun: CountNoun; count: number; lit: number }) {
    const spots = DICE_PATTERNS[count] ?? [];
    return (
        <div className="grid grid-cols-3 gap-1 rounded-3xl border-2 border-line bg-surface p-2 shadow-soft">
            {Array.from({ length: 9 }, (_, cell) => {
                const order = spots.indexOf(cell);
                return order < 0 ? <span key={cell} style={sized(SIZE.dice)} /> : <Thing key={cell} noun={noun} size={SIZE.dice} lit={order < lit} />;
            })}
        </div>
    );
}

/** Okvir od deset (2 × 5), puni se red po red; preko deset — drugi okvir */
function Frames({ noun, count, lit }: { noun: CountNoun; count: number; lit: number }) {
    const frames = count > 10 ? 2 : 1;
    const size = frames > 1 ? SIZE.frames : SIZE.frame;
    return (
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4 flat:flex-col flat:sm:flex-col flat:sm:gap-2">
            {Array.from({ length: frames }, (_, frame) => (
                <div key={frame} className="grid grid-cols-5 gap-px overflow-hidden rounded-xl border-[3px] border-blue-300 bg-blue-300">
                    {Array.from({ length: 10 }, (_, cell) => {
                        const index = frame * 10 + cell + 1;
                        return (
                            <span key={cell} className="grid place-items-center bg-surface p-[min(0.8vw,0.3rem)]">
                                {index <= count ? <Thing noun={noun} size={size} lit={index <= lit} /> : <span style={sized(size)} />}
                            </span>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function Sign({ children }: { children: string }) {
    return (
        <span aria-hidden="true" className="shrink-0 font-display text-[min(9vw,3rem)] font-black leading-none text-blue-600">
            {children}
        </span>
    );
}

/** Grupa u okviru (sabiranje, jedan više / manje) */
function Box({ children, dashed = false }: { children: ReactNode; dashed?: boolean }) {
    return <div className={cn("rounded-2xl border-2 bg-surface p-[min(1.5vw,0.6rem)]", dashed ? "border-dashed border-blue-300" : "border-blue-200")}>{children}</div>;
}

/**
 * Tabla sa predmetima za zadatke u kojima dete bira broj. `lit` = koliko je predmeta izbrojano
 * pri pomoći (redom kojim se broji: prva grupa, pa druga).
 */
export function CountingBoard({ round, noun, lit }: { round: CountRound; noun: CountNoun; lit: number }) {
    if (round.kind === "add") {
        // Sabirci u malim urednim grupama: četiri kao 2 + 2, pet kao 3 + 2
        const cols = (count: number) => (count === 4 ? 2 : Math.min(count, 3));
        const size = pairSize(cols(round.a) + cols(round.b));
        return (
            <div className="flex items-center justify-center gap-[min(2.5vw,1rem)]">
                <Box>
                    <Rows noun={noun} count={round.a} size={size} lit={lit} perRow={cols(round.a)} />
                </Box>
                <Sign>+</Sign>
                <Box>
                    <Rows noun={noun} count={round.b} size={size} lit={lit} offset={round.a} perRow={cols(round.b)} />
                </Box>
            </div>
        );
    }
    if (round.kind === "plus1") {
        // Grupa i još jedan koji dolazi
        const size = pairSize(Math.min(round.a, 5) + 1);
        return (
            <div className="flex items-center justify-center gap-[min(2.5vw,1rem)]">
                <Box>
                    <Rows noun={noun} count={round.a} size={size} lit={lit} />
                </Box>
                <Sign>+</Sign>
                <Box dashed>
                    <Rows noun={noun} count={1} size={size} lit={lit} offset={round.a} />
                </Box>
            </div>
        );
    }
    if (round.kind === "minus1") {
        // Ostaju u okviru; onaj koji odlazi je bled, iza strelice
        const size = pairSize(Math.min(round.a - 1, 5) + 1);
        return (
            <div className="flex items-center justify-center gap-[min(2.5vw,1rem)]">
                <Box>
                    <Rows noun={noun} count={round.a - 1} size={size} lit={lit} />
                </Box>
                <Sign>→</Sign>
                <Thing noun={noun} size={size} faded />
            </div>
        );
    }
    if (round.layout === "frame") return <Frames noun={noun} count={round.a} lit={lit} />;
    if (round.layout === "dice" && round.a <= 6) return <Dice noun={noun} count={round.a} lit={lit} />;
    return <Rows noun={noun} count={round.a} size={round.a <= 3 ? SIZE.few : round.a <= 5 ? SIZE.row : SIZE.rows} lit={lit} />;
}

/** Grupa predmeta na kartici („Gde su tri jabuke?”, „Gde ima više?”) */
export function GroupPicture({ noun, count, lit }: { noun: CountNoun; count: number; lit: number }) {
    return <Rows noun={noun} count={count} size={SIZE.group} lit={lit} />;
}

/** Kartica sa brojem: velika cifra, a na lakim nivoima i isto toliko tačkica ispod */
export function NumeralFace({ value, dots }: { value: number; dots: boolean }) {
    return (
        <span className="flex flex-col items-center gap-1.5 sm:gap-2.5">
            {/* Dvocifren broj je nešto manji, da stane i u četiri kartice u redu na telefonu */}
            <span aria-hidden="true" style={{ fontSize: value < 10 ? "min(20vw, 8.5dvh, 5.75rem)" : "min(11.5vw, 7.5dvh, 4.75rem)" }} className="font-display font-black leading-none text-ink">
                {value}
            </span>
            {dots && (
                <span aria-hidden="true" className="flex max-w-[5.5rem] flex-wrap justify-center gap-1 sm:max-w-none sm:gap-1.5">
                    {Array.from({ length: value }, (_, i) => (
                        <span key={i} className="h-3 w-3 rounded-full bg-blue-500 sm:h-4 sm:w-4" />
                    ))}
                </span>
            )}
        </span>
    );
}
