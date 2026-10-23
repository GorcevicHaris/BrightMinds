"use client";

// Pregled prodavnice (samo u razvoju): ceo lik sa kompletima, sličice svih predmeta sa
// cenom i provera svakog predmeta na svakom drugaru (po mestu, na celom liku ili poprsju).
// Likovi ovde miruju (`still`), da se crteži porede bez pokreta; pokreti su u MotionPreview.

import { useState } from "react";
import Companion, { COMPANIONS } from "@/app/components/avatar/Companion";
import { WearThumb } from "@/app/components/avatar/WearThumb";
import { slotVisible, WEAR_ITEMS, WEAR_SETS, WEAR_SLOT_LABELS, WEAR_SLOTS, type WearSlot } from "@/app/components/avatar/wearables";

const tab = (active: boolean) => `rounded-xl px-3 py-2 text-sm font-extrabold ${active ? "bg-brand-600 text-white" : "bg-white text-ink"}`;

export default function ShopPreview() {
    const [setId, setSetId] = useState(WEAR_SETS[0].id);
    const [slot, setSlot] = useState<WearSlot | null>(null);
    const [variant, setVariant] = useState<"full" | "bust">("full");
    const chosen = WEAR_SETS.find((set) => set.id === setId) ?? WEAR_SETS[0];

    return (
        <>
            {/* Ceo lik: svaki drugar u kompletu */}
            <section className="mb-8 rounded-card border border-line bg-surface p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                    {WEAR_SETS.map((set) => (
                        <button key={set.id} type="button" data-set={set.id} onClick={() => setSetId(set.id)} className={tab(set.id === setId)}>
                            {set.label}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-6 gap-2" data-set-row={chosen.id}>
                    {COMPANIONS.map(({ kind, label }) => (
                        <figure key={kind} className="text-center">
                            <Companion kind={kind} variant="full" emotion="happy" wear={chosen.items} still className="mx-auto h-72 w-full rounded-xl bg-brand-50" />
                            <figcaption className="text-xs font-extrabold text-ink-soft">{label}</figcaption>
                        </figure>
                    ))}
                </div>
                <div className="mt-4 grid grid-cols-6 gap-2">
                    {COMPANIONS.map(({ kind }) => (
                        <Companion key={kind} kind={kind} variant="full" emotion="neutral" still className="mx-auto h-56 w-full rounded-xl bg-brand-50" />
                    ))}
                </div>
            </section>

            {/* Sličice svih predmeta sa cenom */}
            <section className="mb-8 rounded-card border border-line bg-surface p-4" data-thumbs="">
                {WEAR_SLOTS.map((s) => (
                    <div key={s} className="mb-4">
                        <h2 className="mb-2 text-sm font-extrabold text-ink">
                            {WEAR_SLOT_LABELS[s]} · {WEAR_ITEMS.filter((item) => item.slot === s).length}
                        </h2>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
                            {WEAR_ITEMS.filter((item) => item.slot === s).map((item) => (
                                <figure key={item.id} className="rounded-xl border border-line bg-white p-1 text-center">
                                    <WearThumb item={item} className="mx-auto h-20 w-20 overflow-hidden rounded-lg bg-brand-50" />
                                    <figcaption className="text-[11px] leading-tight font-extrabold text-ink">
                                        {item.label}
                                        <span className="block text-ink-soft">{item.price} novčića</span>
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    </div>
                ))}
            </section>

            {/* Svaki predmet na svakom drugaru */}
            <section className="mb-8 rounded-card border border-line bg-surface p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                    {WEAR_SLOTS.map((s) => (
                        <button key={s} type="button" data-slot-tab={s} onClick={() => setSlot(s)} className={tab(s === slot)}>
                            {WEAR_SLOT_LABELS[s]}
                        </button>
                    ))}
                    <span className="mx-2 w-px bg-line" />
                    {(["full", "bust"] as const).map((v) => (
                        <button key={v} type="button" data-variant-tab={v} onClick={() => setVariant(v)} className={tab(v === variant)}>
                            {v === "full" ? "ceo lik" : "poprsje"}
                        </button>
                    ))}
                </div>
                {slot && (
                    <div className="grid grid-cols-[8rem_repeat(6,minmax(0,1fr))] items-center gap-2">
                        {WEAR_ITEMS.filter((item) => item.slot === slot && slotVisible(slot, variant)).map((item) => (
                            <div key={item.id} className="contents" data-wear-row={item.id}>
                                <p className="text-sm font-extrabold text-ink">
                                    {item.label}
                                    <span className="block text-xs text-ink-soft">{item.price} novčića</span>
                                </p>
                                {COMPANIONS.map(({ kind }) => (
                                    <Companion
                                        key={kind}
                                        kind={kind}
                                        variant={variant}
                                        emotion="happy"
                                        wear={{ [item.slot]: item.id }}
                                        still
                                        className={variant === "full" ? "mx-auto h-80 w-full" : "mx-auto h-28 w-24"}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}
