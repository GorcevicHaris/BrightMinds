"use client";

import { useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { PIN_LENGTH, VISUAL_PIN_CATEGORIES } from "@/lib/visualPinData";

const PICK_GUARD_MS = 350;

interface VisualPinPadProps {
    /** Izabrani ID-jevi, redom po kategorijama (0–4 komada) */
    value: string[];
    onChange: (next: string[]) => void;
    status?: "idle" | "checking" | "error";
    disabled?: boolean;
    className?: string;
    /** Naziv polja za čitač ekrana (podrazumevano „Tvoj tajni kod”) */
    label?: string;
}

/**
 * Unos vizuelnog PIN-a: četiri polja + mreža sličica za trenutni korak.
 * Isti deo koristi dete pri prijavi i roditelj pri postavljanju koda.
 */
export default function VisualPinPad({ value, onChange, status = "idle", disabled = false, className, label = "Tvoj tajni kod" }: VisualPinPadProps) {
    const step = Math.min(value.length, PIN_LENGTH - 1);
    const complete = value.length >= PIN_LENGTH;
    const category = VISUAL_PIN_CATEGORIES[step];
    const locked = disabled || status === "checking";

    // Posle svakog izbora mreža se menja pod prstom: drugi dodir dvostrukog dodira
    // ne sme da izabere sličicu i za sledeće polje.
    const lastPick = useRef(-PICK_GUARD_MS);
    const pick = (id: string, at: number) => {
        if (at - lastPick.current < PICK_GUARD_MS) return;
        lastPick.current = at;
        onChange([...value, id]);
    };

    return (
        <div className={cn("flex w-full flex-col items-center", className)}>
            {/* Polja koda */}
            <ol className={cn("mb-5 flex justify-center gap-2.5 sm:gap-3", status === "error" && "animate-shake")} aria-label={label}>
                {VISUAL_PIN_CATEGORIES.map((cat, idx) => {
                    const item = cat.items.find((i) => i.id === value[idx]);
                    const isCurrent = !complete && idx === value.length;
                    return (
                        <li
                            key={cat.id}
                            className={cn(
                                "relative grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border-2 bg-surface transition-colors sm:h-20 sm:w-20",
                                status === "error"
                                    ? "border-rose-300 bg-rose-50"
                                    : item
                                      ? "border-brand-500"
                                      : isCurrent
                                        ? "animate-soft-pulse border-brand-400 bg-brand-50"
                                        : "border-line bg-canvas"
                            )}
                        >
                            {item ? (
                                <Image src={item.image} alt={item.name} width={80} height={80} sizes="80px" className="h-full w-full animate-pop object-cover" />
                            ) : (
                                <span className="text-lg font-extrabold text-ink-faint" aria-label={`${idx + 1}. polje je prazno`}>
                                    {idx + 1}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>

            {!complete && (
                <>
                    <p className="mb-3 text-center text-base font-extrabold text-ink sm:text-lg" aria-live="polite">
                        <span className="mr-2 inline-grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-sm text-white">{step + 1}</span>
                        Izaberi {category.prompt}
                    </p>

                    <div className="grid w-full grid-cols-5 gap-2 sm:gap-3">
                        {category.items.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                disabled={locked}
                                onClick={(e) => pick(item.id, e.timeStamp)}
                                aria-label={item.name}
                                title={item.name}
                                className="group relative aspect-square overflow-hidden rounded-xl border-2 border-b-4 border-line bg-surface transition-[transform,border-color] hover:border-brand-400 active:translate-y-0.5 active:border-b-2 disabled:opacity-50 sm:rounded-2xl"
                            >
                                <Image
                                    src={item.image}
                                    alt=""
                                    fill
                                    sizes="(min-width: 640px) 96px, 18vw"
                                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                            </button>
                        ))}
                    </div>
                </>
            )}

            <div className="mt-4 flex min-h-11 w-full justify-center gap-3">
                {value.length > 0 && !locked && (
                    <>
                        <button
                            type="button"
                            onClick={() => onChange(value.slice(0, -1))}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-sm font-extrabold text-ink-soft transition-colors hover:bg-brand-50 hover:text-ink"
                        >
                            <span aria-hidden="true">←</span> Obriši poslednju
                        </button>
                        {value.length > 1 && (
                            <button
                                type="button"
                                onClick={() => onChange([])}
                                className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-extrabold text-ink-faint transition-colors hover:bg-brand-50 hover:text-ink"
                            >
                                Ispočetka
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
