"use client";

// Pregled izgleda (samo u razvoju): svako krzno svake životinje i svaka koža, kosa i frizura
// učitelja i učiteljice — lice i ceo lik — i frizure ispod kapa, da se vidi da kape sede.

import Companion, { COMPANIONS } from "@/app/components/avatar/Companion";
import {
    ANIMAL_SKINS,
    HAIR_COLORS,
    HAIRSTYLES,
    HUMAN_DEFAULT,
    SKIN_TONES,
    humanSkinId,
    isHumanKind,
    type AnimalKind,
    type HumanKind,
    type HumanLook,
} from "@/app/components/avatar/skins";
import type { Wear } from "@/app/components/avatar/wearables";

/** Kape i sve ostalo što se nosi na glavi, za proveru frizura */
const HEAD_WEAR: Wear[] = [{ hat: "kruna" }, { hat: "kapa-siltom", glasses: "naocare" }, { hat: "astronautski-slem" }, { hat: "zimska-kapa", neck: "prugasti-sal" }];

function Tile({ kind, skin, label, price }: { kind: (typeof COMPANIONS)[number]["kind"]; skin: string; label: string; price: number }) {
    return (
        <figure className="rounded-xl border border-line bg-white p-1 text-center" data-skin={`${kind}:${skin}`}>
            <div className="flex items-end justify-center gap-1">
                <Companion kind={kind} skin={skin} variant="face" emotion="happy" className="h-16 w-16 rounded-full bg-brand-50" />
                <Companion kind={kind} skin={skin} variant="full" emotion="neutral" className="h-28 w-20" />
            </div>
            <figcaption className="text-[11px] font-extrabold leading-tight text-ink">
                {label}
                <span className="block text-ink-soft">{price > 0 ? `${price} novčića` : "besplatno"}</span>
            </figcaption>
        </figure>
    );
}

function HumanRows({ kind }: { kind: HumanKind }) {
    const base = HUMAN_DEFAULT[kind];
    const id = (change: Partial<HumanLook>) => humanSkinId({ ...base, ...change });
    return (
        <>
            {[
                { title: "Boja kože", parts: SKIN_TONES.map((part) => ({ part, skin: id({ tone: part.id }) })) },
                { title: "Boja kose", parts: HAIR_COLORS.map((part) => ({ part, skin: id({ hair: part.id }) })) },
                { title: "Frizura", parts: HAIRSTYLES[kind].map((part) => ({ part, skin: id({ style: part.id }) })) },
            ].map(({ title, parts }) => (
                <div key={title} className="mb-3">
                    <h3 className="mb-1 text-xs font-extrabold text-ink-soft">{title}</h3>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2">
                        {parts.map(({ part, skin }) => (
                            <Tile key={skin} kind={kind} skin={skin} label={part.label} price={0} />
                        ))}
                    </div>
                </div>
            ))}
            {/* Frizure ispod kapa (tamna koža i druga kosa, da se vidi i drugi spoj) */}
            <h3 className="mb-1 text-xs font-extrabold text-ink-soft">Frizure ispod kapa</h3>
            <div className="mb-3 flex flex-wrap gap-1" data-hats={kind}>
                {HAIRSTYLES[kind].map((style) =>
                    HEAD_WEAR.map((wear, index) => (
                        <Companion
                            key={`${style.id}-${index}`}
                            kind={kind}
                            variant="bust"
                            emotion="happy"
                            wear={wear}
                            skin={humanSkinId({ tone: SKIN_TONES[(index * 2 + 1) % SKIN_TONES.length].id, hair: HAIR_COLORS[index % HAIR_COLORS.length].id, style: style.id })}
                            className="h-24 w-20 rounded-lg bg-brand-50"
                        />
                    ))
                )}
            </div>
        </>
    );
}

export default function SkinsPreview() {
    return (
        <section className="mb-8 rounded-card border border-line bg-surface p-4" data-skins="">
            <h2 className="mb-3 text-lg font-extrabold text-ink">Izgled drugara</h2>
            {COMPANIONS.map(({ kind, label }) => (
                <div key={kind} className="mb-5">
                    <h3 className="mb-2 text-sm font-extrabold text-ink">{label}</h3>
                    {isHumanKind(kind) ? (
                        <HumanRows kind={kind} />
                    ) : (
                        <>
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2">
                                {ANIMAL_SKINS[kind as AnimalKind].map((skin) => (
                                    <Tile key={skin.id} kind={kind} skin={skin.id} label={skin.label} price={skin.price} />
                                ))}
                            </div>
                            {/* Krzna sa kapom i naočarima */}
                            <div className="mt-2 flex flex-wrap gap-1" data-hats={kind}>
                                {ANIMAL_SKINS[kind as AnimalKind].map((skin, index) => (
                                    <Companion key={skin.id} kind={kind} skin={skin.id} variant="bust" emotion="happy" wear={HEAD_WEAR[index % HEAD_WEAR.length]} className="h-24 w-20 rounded-lg bg-brand-50" />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            ))}
        </section>
    );
}
