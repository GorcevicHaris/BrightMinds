"use client";

// Ekran „Moj drugar”: dete bira pratioca (učiteljica, učitelj, mačka, pas, zeka, meda) i
// za zarađene novčiće kupuje mu odeću. Pravila za decu od 3 do 10 godina i decu iz spektra:
//  • dodir na predmet ga prvo PROBNO obuče (dete vidi šta dobija), a glas kaže cenu;
//    kupuje se tek dugmetom „Kupi” — slučajan dodir ne troši novčiće;
//  • stalne cene, nema nasumičnih nagrada; novčići se ne gube;
//  • veliki dodirni ciljevi, sličica + reč, sve se i izgovara.

import { useMemo, useState } from "react";
import { Check, Lock } from "lucide-react";
import Companion, { COMPANIONS } from "@/app/components/avatar/Companion";
import { WEAR_ITEMS, type WearItem, type WearSlot } from "@/app/components/avatar/wearables";
import { playSfx, celebrateBig } from "@/app/components/games/kit";
import { CoinIcon } from "@/app/components/ui/CoinIcon";
import { Button } from "@/app/components/ui/Button";
import { cn } from "@/lib/cn";
import type { CompanionKindId } from "@/lib/companion";
import { useSpeech } from "@/lib/speech";
import { useCompanion } from "./companionState";

const SLOTS: { slot: WearSlot; label: string }[] = [
    { slot: "hat", label: "Kape i šeširi" },
    { slot: "glasses", label: "Naočare" },
    { slot: "neck", label: "Oko vrata" },
    { slot: "outfit", label: "Odeća" },
];

/** Deo crteža (240×280) u kome stoji predmet, za sličicu u prodavnici */
const SLOT_VIEW: Record<WearSlot, string> = {
    hat: "30 -6 180 96",
    glasses: "52 84 136 64",
    neck: "64 156 112 76",
    outfit: "16 176 208 108",
};

/** 1 novčić, 21 novčić; sve ostalo „novčića” (2–4 i 5+ imaju isti oblik) */
function coinWord(count: number): string {
    return count % 10 === 1 && count % 100 !== 11 ? "novčić" : "novčića";
}

function Coins({ count, className }: { count: number; className?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-sun-100 px-3 py-1 font-extrabold text-sun-700 ring-1 ring-sun-300", className)}>
            <CoinIcon />
            {count}
            <span className="sr-only"> {coinWord(count)}</span>
        </span>
    );
}

export default function CompanionRoom({ gender }: { gender?: string }) {
    const companion = useCompanion();
    const { say } = useSpeech(gender);
    const [selected, setSelected] = useState<WearItem | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    // Probno obučen predmet se vidi na velikom pratiocu
    const previewWear = useMemo(() => {
        if (!companion) return {};
        return selected ? { ...companion.wear, [selected.slot]: selected.id } : companion.wear;
    }, [companion, selected]);

    if (!companion) return null;
    const { kind, owned, wear, coins } = companion;

    const choose = async (next: CompanionKindId, label: string) => {
        if (busy || next === kind) return;
        setBusy(true);
        playSfx("tap");
        const error = await companion.act({ action: "choose", kind: next });
        setBusy(false);
        if (error) setMessage(error);
        else say(`${label}. Ovo je tvoj drugar.`, undefined, "happy");
    };

    const pick = (item: WearItem) => {
        playSfx("tap");
        setMessage(null);
        setSelected(item);
        if (owned.includes(item.id)) say(wear[item.slot] === item.id ? `${item.label}. Drugar to nosi.` : `${item.label}.`);
        else if (coins >= item.price) say(`${item.label}. Košta ${item.price} ${coinWord(item.price)}.`);
        else say(`${item.label}. Košta ${item.price} ${coinWord(item.price)}. Igraj još malo i skupi novčiće.`, undefined, "gentle");
    };

    const buy = async (item: WearItem) => {
        setBusy(true);
        const error = await companion.act({ action: "buy", item: item.id });
        setBusy(false);
        if (error) {
            setMessage(error);
            return;
        }
        playSfx("correct");
        celebrateBig();
        setSelected(null);
        say(`Bravo! ${item.label}. Drugar to sada nosi.`, undefined, "proud");
    };

    const toggleWear = async (item: WearItem) => {
        setBusy(true);
        const wearing = wear[item.slot] === item.id;
        const error = await companion.act({ action: "wear", slot: item.slot, item: wearing ? null : item.id });
        setBusy(false);
        if (error) setMessage(error);
        else playSfx("tap");
        setSelected(null);
    };

    const selectedOwned = selected ? owned.includes(selected.id) : false;
    const selectedWorn = selected ? wear[selected.slot] === selected.id : false;
    const missing = selected && !selectedOwned ? Math.max(0, selected.price - coins) : 0;

    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start xl:gap-8">
            {/* Pratilac i novčići */}
            <section className="flex flex-col items-center gap-3 rounded-card bg-gradient-to-b from-brand-100 to-brand-50 p-5 shadow-soft lg:sticky lg:top-24" aria-label="Moj drugar">
                <Coins count={coins} className="self-end text-lg" />
                <Companion kind={kind as CompanionKindId} wear={previewWear} className="h-56 w-48 sm:h-64 sm:w-56" />
                {selected ? (
                    <div className="flex w-full flex-col items-center gap-2 rounded-2xl bg-surface p-3 text-center shadow-soft">
                        <p className="text-lg font-extrabold text-ink">{selected.label}</p>
                        {selectedOwned ? (
                            <Button chunky block onClick={() => toggleWear(selected)} disabled={busy}>
                                {selectedWorn ? "Skini" : "Obuci"}
                            </Button>
                        ) : missing === 0 ? (
                            <Button chunky block variant="success" onClick={() => buy(selected)} disabled={busy}>
                                Kupi za <CoinIcon /> {selected.price}
                            </Button>
                        ) : (
                            <p className="text-base font-bold text-ink-soft">
                                Još <CoinIcon /> {missing} — igraj i skupljaj zvezdice!
                            </p>
                        )}
                        <button type="button" onClick={() => setSelected(null)} className="min-h-10 text-sm font-bold text-ink-soft hover:text-ink">
                            Vrati
                        </button>
                    </div>
                ) : (
                    <p className="text-center text-sm font-bold text-ink-soft">Svaka zvezdica u igri je jedan novčić.</p>
                )}
                {message && (
                    <p role="status" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
                        {message}
                    </p>
                )}
            </section>

            <div className="space-y-6">
                {/* Izbor drugara */}
                <section aria-labelledby="companion-choose" className="space-y-3">
                    <h2 id="companion-choose" className="text-xl font-extrabold text-ink sm:text-2xl">
                        Izaberi drugara
                    </h2>
                    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                        {COMPANIONS.map((option) => {
                            const active = option.kind === kind;
                            return (
                                <li key={option.kind}>
                                    <button
                                        type="button"
                                        onClick={() => choose(option.kind as CompanionKindId, option.label)}
                                        aria-pressed={active}
                                        disabled={busy}
                                        className={cn(
                                            "relative flex w-full flex-col items-center gap-1 rounded-tile border-2 border-b-[5px] bg-surface p-2 font-extrabold text-ink shadow-soft transition-colors",
                                            active ? "border-brand-500 bg-brand-50" : "border-line hover:border-brand-300"
                                        )}
                                    >
                                        <Companion kind={option.kind as CompanionKindId} variant="face" emotion="happy" className="h-16 w-16 sm:h-20 sm:w-20" />
                                        <span className="text-sm sm:text-base">{option.label}</span>
                                        {active && (
                                            <span aria-hidden="true" className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-white shadow-soft ring-2 ring-white">
                                                <Check className="h-4 w-4" />
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                {/* Prodavnica */}
                <section aria-labelledby="companion-shop" className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id="companion-shop" className="text-xl font-extrabold text-ink sm:text-2xl">
                            Prodavnica
                        </h2>
                        <Coins count={coins} />
                    </div>
                    {SLOTS.map(({ slot, label }) => (
                        <div key={slot} className="space-y-2">
                            <h3 className="text-base font-extrabold text-ink-soft">{label}</h3>
                            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                                {WEAR_ITEMS.filter((item) => item.slot === slot).map((item) => {
                                    const isOwned = owned.includes(item.id);
                                    const worn = wear[item.slot] === item.id;
                                    const affordable = coins >= item.price;
                                    const active = selected?.id === item.id;
                                    return (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                onClick={() => pick(item)}
                                                aria-pressed={active}
                                                aria-label={`${item.label}${isOwned ? (worn ? ", nosi" : ", kupljeno") : `, ${item.price} ${coinWord(item.price)}`}`}
                                                className={cn(
                                                    "relative flex w-full flex-col items-center gap-1 rounded-tile border-2 border-b-[5px] bg-surface p-2 text-center shadow-soft transition-colors",
                                                    active ? "border-brand-500 bg-brand-50" : worn ? "border-emerald-400" : "border-line hover:border-brand-300",
                                                    !isOwned && !affordable && "opacity-70"
                                                )}
                                            >
                                                <svg viewBox={SLOT_VIEW[item.slot]} className="h-14 w-full sm:h-16" aria-hidden="true">
                                                    {item.render()}
                                                </svg>
                                                <span className="line-clamp-2 min-h-8 text-xs font-extrabold leading-tight text-ink sm:text-sm">{item.label}</span>
                                                {isOwned ? (
                                                    <span className={cn("text-xs font-extrabold", worn ? "text-emerald-700" : "text-ink-soft")}>{worn ? "Nosi" : "Kupljeno"}</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-sun-700">
                                                        {!affordable && <Lock className="h-3 w-3" aria-hidden="true" />}
                                                        <CoinIcon /> {item.price}
                                                    </span>
                                                )}
                                                {worn && (
                                                    <span aria-hidden="true" className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-emerald-600 text-white shadow-soft ring-2 ring-white">
                                                        <Check className="h-4 w-4" />
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </section>
            </div>
        </div>
    );
}
