"use client";

// Ekran „Moj drugar”: dete bira pratioca (učiteljica, učitelj, mačka, pas, zeka, meda) i
// za zarađene novčiće kupuje mu odeću. Pravila za decu od 3 do 10 godina i decu iz spektra:
//  • dodir na predmet ili komplet ga prvo PROBNO obuče (dete vidi šta dobija), a glas kaže
//    naziv i cenu; kupuje se tek dugmetom „Kupi” — slučajan dodir ne troši novčiće. Kupljen
//    predmet se dodirom oblači i skida (to se može vratiti, pa nema pitanja „Da li si siguran?”);
//  • stalne cene, nema nasumičnih nagrada, popusta, odbrojavanja ni „Kupi sad!”; novčići se ne gube;
//  • cilj („Radim za”): za skup predmet ili komplet dete bira da skuplja novčiće i vidi koliko je ostalo;
//  • kategorije su uvek istim redom, predmeti od najjeftinijeg — prvo ono što može da kupi;
//  • glas nikad ne kaže gde da dodirne; veliki dodirni ciljevi, sličica + reč;
//  • izgled drugara („Izgled”): izgled čoveka (koža, kosa, frizura) je uvek besplatan i bira se
//    jednim dodirom; životinje imaju nekoliko prirodnih boja besplatno, a posebno krzno se, kao
//    predmet, prvo proba pa kupuje dugmetom „Kupi”. Svaki drugar pamti svoj izgled.
// Predmeta ima i više od 200: prikazuje se samo jedna kategorija, a pločice van ekrana
// preglednik ne iscrtava (content-visibility), pa listanje ostaje glatko i na telefonu.

import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import {
    Backpack,
    Check,
    Crown,
    DoorClosed,
    Footprints,
    Gem,
    Glasses,
    Image as ImageIcon,
    Lock,
    PawPrint,
    Shirt,
    Sparkles,
    Target,
    Undo2,
    WandSparkles,
    X,
    type LucideIcon,
} from "lucide-react";
import Companion, { COMPANIONS } from "@/app/components/avatar/Companion";
import {
    ANIMAL_SKINS,
    HAIR_COLORS,
    HAIRSTYLES,
    SKIN_TONES,
    humanLook,
    humanSkinId,
    isHumanKind,
    type AnimalKind,
    type AnimalSkin,
    type HumanKind,
    type HumanLook,
} from "@/app/components/avatar/skins";
import { WEAR_ITEMS, WEAR_SETS, type WearItem, type WearSet } from "@/app/components/avatar/wearables";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { playSfx, celebrateBig } from "@/app/components/games/kit";
import { CoinIcon } from "@/app/components/ui/CoinIcon";
import { Button } from "@/app/components/ui/Button";
import { cn } from "@/lib/cn";
import { WEAR_SLOT_IDS, setGoalId, skinGoalId, skinKey, type CompanionAction, type CompanionKindId, type CompanionWear, type WearSlotId } from "@/lib/companion";
import { useSpeech } from "@/lib/speech";
import { useCompanion } from "./companionState";
import { Coins, GoalBar, GoalStatus, GoalThumb, ItemThumb, SetThumb, coinWord, goalProgress, setProgress, type GoalProgress } from "./companionUi";

const SLOT_TABS: Record<WearSlotId, { label: string; Icon: LucideIcon; tint: string }> = {
    hat: { label: "Kape i šeširi", Icon: Crown, tint: "bg-rose-100 text-rose-700" },
    glasses: { label: "Naočare i maske", Icon: Glasses, tint: "bg-sky-100 text-sky-700" },
    neck: { label: "Oko vrata", Icon: Gem, tint: "bg-violet-100 text-violet-700" },
    outfit: { label: "Odeća i kostimi", Icon: Shirt, tint: "bg-brand-100 text-brand-700" },
    feet: { label: "Obuća", Icon: Footprints, tint: "bg-amber-100 text-amber-800" },
    hand: { label: "U ruci", Icon: WandSparkles, tint: "bg-emerald-100 text-emerald-700" },
    back: { label: "Na leđima", Icon: Backpack, tint: "bg-teal-100 text-teal-700" },
    pet: { label: "Ljubimci", Icon: PawPrint, tint: "bg-orange-100 text-orange-700" },
    background: { label: "Pozadine", Icon: ImageIcon, tint: "bg-cyan-100 text-cyan-800" },
};

const SETS_TAB = { label: "Kompleti", Icon: Sparkles, tint: "bg-fuchsia-100 text-fuchsia-700" };
const WARDROBE = { label: "Moj ormar", Icon: DoorClosed, tint: "bg-sun-100 text-sun-700" };

type TabId = WearSlotId | "sets" | "wardrobe";

/** Šta dete upravo proba: jedan predmet, ceo komplet ili posebno krzno */
type Selection = { type: "item"; item: WearItem } | { type: "set"; set: WearSet } | { type: "skin"; kind: AnimalKind; skin: AnimalSkin };

/** Predmeti po mestu, od najjeftinijeg; isti redosled pri svakom ulasku */
function itemsBySlot(): Map<WearSlotId, WearItem[]> {
    const map = new Map<WearSlotId, WearItem[]>();
    for (const slot of WEAR_SLOT_IDS) {
        const items = WEAR_ITEMS.filter((item) => item.slot === slot).sort((a, b) => a.price - b.price || a.label.localeCompare(b.label, "sr"));
        // Mesto bez predmeta se ne prikazuje
        if (items.length > 0) map.set(slot, items);
    }
    return map;
}

// Katalog je stalan: predmeti po mestu, mesta koja imaju predmete i kartice računaju se jednom.
// Red kartica se nikad ne menja: mesta, pa kompleti, pa ormar.
const BY_SLOT = itemsBySlot();
const SHOP_SLOTS = [...BY_SLOT.keys()];
const TABS: { id: TabId; label: string; Icon: LucideIcon; tint: string }[] = [
    ...SHOP_SLOTS.map((slot) => ({ id: slot as TabId, ...SLOT_TABS[slot] })),
    ...(WEAR_SETS.length > 0 ? [{ id: "sets" as TabId, ...SETS_TAB }] : []),
    { id: "wardrobe", ...WARDROBE },
];

/** Pločica van ekrana se ne iscrtava dok ne dođe blizu (glatko listanje i sa 200+ predmeta) */
const OFFSCREEN = "[content-visibility:auto] [contain-intrinsic-size:auto_10rem]";

function sameLook(wear: CompanionWear, items: CompanionWear): boolean {
    return Object.entries(items).every(([slot, id]) => wear[slot as WearSlotId] === id);
}

export default function CompanionRoom({ gender }: { gender?: string }) {
    const companion = useCompanion();
    const { reduceMotion } = useChildSettings();
    const { say } = useSpeech(gender);
    const [tab, setTab] = useState<TabId>(TABS[0].id);
    const [selected, setSelected] = useState<Selection | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    // Probno obučen predmet (ili ceo komplet, tačno kao na sličici) se vidi na velikom pratiocu
    const previewWear = useMemo(() => {
        if (!companion || !selected || selected.type === "skin") return companion?.wear ?? {};
        return selected.type === "set" ? selected.set.items : { ...companion.wear, [selected.item.slot]: selected.item.id };
    }, [companion, selected]);

    if (!companion) return null;
    const { kind, owned, wear, coins, goal, skins } = companion;
    const skin = companion.skin[kind];
    // Probno krzno se vidi na velikom drugaru; inače njegov izgled
    const previewSkin = selected?.type === "skin" && selected.kind === kind ? selected.skin.id : skin;
    const goalNow = goalProgress(goal, owned, coins, skins);
    const anythingWorn = Object.keys(wear).length > 0;
    const tabInfo = TABS.find((entry) => entry.id === tab) ?? TABS[0];
    const items = tab === "wardrobe" ? SHOP_SLOTS.flatMap((slot) => (BY_SLOT.get(slot) ?? []).filter((item) => owned.includes(item.id))) : tab === "sets" ? [] : (BY_SLOT.get(tab) ?? []);

    const run = async (action: CompanionAction): Promise<boolean> => {
        setBusy(true);
        const error = await companion.act(action);
        setBusy(false);
        setMessage(error);
        return error === null;
    };

    const choose = async (next: CompanionKindId, label: string) => {
        if (busy || next === kind) return;
        playSfx("tap");
        if (await run({ action: "choose", kind: next })) {
            // Proba krzna pripada prethodnom drugaru
            if (selected?.type === "skin") setSelected(null);
            say(`${label}. Ovo je tvoj drugar.`, undefined, "happy");
        }
    };

    const openTab = (next: TabId, label: string, event: MouseEvent<HTMLButtonElement>) => {
        playSfx("tap");
        setTab(next);
        say(label);
        // Na telefonu se izabrana kategorija pomeri u vidno polje (bez klizanja kad je kretanje smanjeno)
        event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    };

    const pick = async (item: WearItem) => {
        setMessage(null);
        if (owned.includes(item.id)) {
            // Kupljen predmet: dodir oblači ili skida (ništa se ne troši)
            if (busy) return;
            playSfx("tap");
            setSelected(null);
            const worn = wear[item.slot] === item.id;
            if (await run({ action: "wear", slot: item.slot, item: worn ? null : item.id })) say(worn ? `${item.label}. Skinuto.` : `${item.label}.`);
            return;
        }
        // Nije kupljen: samo proba (ponovljen dodir ostavlja probu i ponovi naziv)
        playSfx("tap");
        setSelected({ type: "item", item });
        const missing = item.price - coins;
        const text = `${item.label}. Košta ${item.price} ${coinWord(item.price)}.`;
        say(missing > 0 ? `${text} Treba još ${missing}.` : text, undefined, missing > 0 ? "gentle" : undefined);
    };

    const pickSet = (set: WearSet) => {
        setMessage(null);
        playSfx("tap");
        setSelected({ type: "set", set });
        const { have, total, price } = setProgress(set, owned);
        if (have >= total) {
            say(`${set.label}. Sve imaš.`);
            return;
        }
        const text = `${set.label}. ${have > 0 ? "Ostatak košta" : "Komplet košta"} ${price} ${coinWord(price)}.`;
        say(price > coins ? `${text} Treba još ${price - coins}.` : text, undefined, price > coins ? "gentle" : undefined);
    };

    const celebrate = (text: string) => {
        playSfx("correct");
        if (!reduceMotion) celebrateBig();
        setSelected(null);
        say(text, undefined, "proud");
    };

    const buy = async (item: WearItem) => {
        if (busy) return;
        if (await run({ action: "buy", item: item.id })) celebrate(`Bravo! ${item.label}. Drugar to sada nosi.`);
    };

    const buySet = async (set: WearSet) => {
        if (busy) return;
        if (await run({ action: "buySet", set: set.id })) celebrate(`Bravo! ${set.label}. Drugar sada nosi ceo komplet.`);
    };

    const wearSet = async (set: WearSet) => {
        if (busy) return;
        playSfx("tap");
        if (await run({ action: "outfit", wear: set.items })) {
            setSelected(null);
            say(`${set.label}.`);
        }
    };

    const workFor = async (goalId: string, label: string) => {
        if (busy) return;
        playSfx("tap");
        if (await run({ action: "goal", item: goalId })) say(`${label}. Skupljaš novčiće za to.`);
    };

    const clearGoal = async () => {
        if (busy) return;
        playSfx("tap");
        await run({ action: "goal", item: null });
    };

    /** Besplatan ili kupljen izgled: jedan dodir ga obuče (ništa se ne troši) */
    const putOnSkin = async (next: string, label: string) => {
        if (busy) return;
        playSfx("tap");
        setSelected(null);
        setMessage(null);
        if (next === skin) {
            say(`${label}.`);
            return;
        }
        if (await run({ action: "skin", kind, skin: next })) say(`${label}.`);
    };

    /** Krzno životinje: kupljeno ili besplatno se obuče, posebno se prvo proba */
    const pickSkin = (animal: AnimalKind, entry: AnimalSkin) => {
        if (entry.price === 0 || skins.includes(skinKey(animal, entry.id))) {
            void putOnSkin(entry.id, entry.label);
            return;
        }
        setMessage(null);
        playSfx("tap");
        setSelected({ type: "skin", kind: animal, skin: entry });
        const missing = entry.price - coins;
        const text = `${entry.label}. Košta ${entry.price} ${coinWord(entry.price)}.`;
        say(missing > 0 ? `${text} Treba još ${missing}.` : text, undefined, missing > 0 ? "gentle" : undefined);
    };

    const buySkin = async (animal: AnimalKind, entry: AnimalSkin) => {
        if (busy) return;
        if (await run({ action: "buySkin", kind: animal, skin: entry.id })) celebrate(`Bravo! ${entry.label}. Drugar sada ima novu boju.`);
    };

    /** Cilj koji je posebno krzno: drugar mora biti izabran da bi se krzno probalo na njemu */
    const skinOfGoal = (target: { kind: string; id: string }) => {
        const animal = target.kind as AnimalKind;
        return ANIMAL_SKINS[animal]?.find((entry) => entry.id === target.id);
    };

    const undress = async () => {
        if (busy || !anythingWorn) return;
        playSfx("tap");
        setSelected(null);
        if (await run({ action: "undress" })) say("Sve je skinuto. Stvari su u ormaru.");
    };

    return (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:gap-8">
            {/* Pratilac, novčići, proba i cilj. Na telefonu ostaje gore dok dete lista predmete. */}
            <section
                aria-label="Moj drugar"
                className="sticky top-[4.5rem] z-30 rounded-card bg-gradient-to-b from-brand-100 to-brand-50 p-3 shadow-soft ring-1 ring-brand-200 sm:top-20 sm:p-4 lg:top-24 lg:p-5"
            >
                <div className="flex items-center gap-3 lg:flex-col lg:items-stretch">
                    <div className="relative flex shrink-0 justify-center">
                        <Companion kind={kind as CompanionKindId} wear={previewWear} skin={previewSkin} variant="full" className="h-40 w-32 sm:h-48 sm:w-40 lg:h-80 lg:w-64 xl:h-96 xl:w-80" />
                        {selected && (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-xs font-extrabold text-brand-700 shadow-soft ring-1 ring-brand-200">
                                Probaš
                            </span>
                        )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <Coins count={coins} className="self-start text-base sm:text-lg lg:absolute lg:right-4 lg:top-4" />
                        {selected?.type === "item" && (
                            <TryOn
                                label={selected.item.label}
                                price={selected.item.price}
                                coins={coins}
                                isGoal={goal === selected.item.id}
                                busy={busy}
                                buyLabel="Kupi"
                                workLabel="Radim za ovo"
                                onBuy={() => buy(selected.item)}
                                onWorkFor={() => workFor(selected.item.id, selected.item.label)}
                                onClose={() => setSelected(null)}
                            />
                        )}
                        {selected?.type === "skin" && (
                            <TryOn
                                label={selected.skin.label}
                                price={selected.skin.price}
                                coins={coins}
                                isGoal={goal === skinGoalId(selected.kind, selected.skin.id)}
                                busy={busy}
                                buyLabel="Kupi"
                                workLabel="Radim za ovo"
                                onBuy={() => buySkin(selected.kind, selected.skin)}
                                onWorkFor={() => workFor(skinGoalId(selected.kind, selected.skin.id), selected.skin.label)}
                                onClose={() => setSelected(null)}
                            />
                        )}
                        {selected?.type === "set" && (
                            <SetTryOn
                                set={selected.set}
                                owned={owned}
                                worn={sameLook(wear, selected.set.items)}
                                coins={coins}
                                isGoal={goal === setGoalId(selected.set.id)}
                                busy={busy}
                                onBuy={() => buySet(selected.set)}
                                onWear={() => wearSet(selected.set)}
                                onWorkFor={() => workFor(setGoalId(selected.set.id), selected.set.label)}
                                onClose={() => setSelected(null)}
                            />
                        )}
                        {goalNow && (
                            <GoalCard
                                goal={goalNow}
                                kind={kind}
                                skin={skin}
                                busy={busy}
                                onTry={() => {
                                    if (goalNow.skin) {
                                        const entry = skinOfGoal(goalNow.skin);
                                        // Krzno drugog drugara: prvo se izabere taj drugar, pa proba
                                        if (entry && goalNow.skin.kind === kind) pickSkin(goalNow.skin.kind as AnimalKind, entry);
                                        else if (entry) void choose(goalNow.skin.kind as CompanionKindId, COMPANIONS.find((option) => option.kind === goalNow.skin?.kind)?.label ?? "");
                                        return;
                                    }
                                    if (goalNow.set) pickSet(goalNow.set);
                                    else if (goalNow.item) pick(goalNow.item);
                                }}
                                onBuy={() => {
                                    if (goalNow.skin) {
                                        const entry = skinOfGoal(goalNow.skin);
                                        if (entry) void buySkin(goalNow.skin.kind as AnimalKind, entry);
                                        return;
                                    }
                                    if (goalNow.set) void buySet(goalNow.set);
                                    else if (goalNow.item) void buy(goalNow.item);
                                }}
                                onClear={clearGoal}
                                // Na telefonu je mesto malo: dok traje proba, cilj se ne vidi
                                className={selected ? "hidden lg:flex" : undefined}
                            />
                        )}
                        {!selected && !goalNow && <p className="text-sm font-bold text-ink-soft lg:text-center">Svaka zvezdica u igri je jedan novčić.</p>}
                        {message && (
                            <p role="status" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
                                {message}
                            </p>
                        )}
                    </div>
                </div>
            </section>

            <div className="min-w-0 space-y-6">
                {/* Prodavnica */}
                <section aria-labelledby="companion-shop" className="space-y-4">
                    <h2 id="companion-shop" className="text-xl font-extrabold text-ink sm:text-2xl">
                        Prodavnica
                    </h2>

                    {/* Kategorije: uvek istim redom; na telefonu se listaju vodoravno */}
                    <div role="tablist" aria-label="Kategorije" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-6 lg:overflow-visible">
                        {TABS.map(({ id, label, Icon, tint }) => {
                            const active = tab === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    id={`shop-tab-${id}`}
                                    aria-selected={active}
                                    aria-controls="shop-panel"
                                    onClick={(event) => openTab(id, label, event)}
                                    className={cn(
                                        "flex w-[5.75rem] shrink-0 flex-col items-center gap-1 rounded-tile border-2 border-b-[5px] bg-surface px-1.5 pb-2 pt-2.5 text-center shadow-soft transition-colors lg:w-auto",
                                        active ? "border-brand-500 bg-brand-50" : "border-line hover:border-brand-300"
                                    )}
                                >
                                    <span className={cn("grid h-11 w-11 place-items-center rounded-full", tint)} aria-hidden="true">
                                        <Icon className="h-6 w-6" />
                                    </span>
                                    <span className={cn("min-h-8 text-xs font-extrabold leading-tight sm:text-sm", active ? "text-brand-700" : "text-ink")}>{label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div role="tabpanel" id="shop-panel" aria-labelledby={`shop-tab-${tab}`} className="space-y-3">
                        <div className="flex min-h-11 items-center justify-between gap-3">
                            <h3 className="text-lg font-extrabold text-ink">{tabInfo.label}</h3>
                            {/* Daleko od „Kupi”; bez pitanja — sve se može ponovo obući */}
                            <Button variant="secondary" size="md" onClick={undress} disabled={busy || !anythingWorn}>
                                <Undo2 className="h-5 w-5" aria-hidden="true" />
                                Skini sve
                            </Button>
                        </div>
                        {tab === "sets" ? (
                            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
                                {WEAR_SETS.map((set) => (
                                    <SetTile
                                        key={set.id}
                                        set={set}
                                        kind={kind}
                                        skin={skin}
                                        owned={owned}
                                        worn={sameLook(wear, set.items)}
                                        coins={coins}
                                        active={selected?.type === "set" && selected.set.id === set.id}
                                        isGoal={goal === setGoalId(set.id)}
                                        onPick={pickSet}
                                    />
                                ))}
                            </ul>
                        ) : items.length === 0 ? (
                            <p className="rounded-tile bg-surface p-5 text-center text-base font-bold text-ink-soft shadow-soft">Ormar je još prazan.</p>
                        ) : (
                            <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 xl:grid-cols-5">
                                {items.map((item) => (
                                    <ItemTile
                                        key={item.id}
                                        item={item}
                                        owned={owned.includes(item.id)}
                                        worn={wear[item.slot] === item.id}
                                        affordable={coins >= item.price}
                                        active={selected?.type === "item" && selected.item.id === item.id}
                                        isGoal={goal === item.id}
                                        onPick={pick}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                {/* Izbor drugara (posle prodavnice: bira se retko, a prodavnica je glavni deo) */}
                <section aria-labelledby="companion-choose" className="space-y-3">
                    <h2 id="companion-choose" className="text-xl font-extrabold text-ink sm:text-2xl">
                        Izaberi drugara
                    </h2>
                    <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 pt-2 sm:grid sm:grid-cols-6 sm:overflow-visible">
                        {COMPANIONS.map((option) => {
                            const active = option.kind === kind;
                            return (
                                <li key={option.kind} className="w-24 shrink-0 sm:w-auto">
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
                                        <Companion kind={option.kind as CompanionKindId} skin={companion.skin[option.kind]} variant="face" emotion="happy" className="h-16 w-16 sm:h-20 sm:w-20" />
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

                {/* Izgled izabranog drugara: boja krzna, ili koža, kosa i frizura */}
                <section aria-labelledby="companion-look" className="space-y-3">
                    <h2 id="companion-look" className="text-xl font-extrabold text-ink sm:text-2xl">
                        Izgled
                    </h2>
                    {isHumanKind(kind) ? (
                        <HumanLooks kind={kind} skin={skin} busy={busy} onPick={putOnSkin} />
                    ) : (
                        <SkinRow title="Boja krzna">
                            {ANIMAL_SKINS[kind as AnimalKind].map((entry) => (
                                <SkinTile
                                    key={entry.id}
                                    kind={kind}
                                    skin={entry.id}
                                    label={entry.label}
                                    price={entry.price}
                                    owned={entry.price === 0 || skins.includes(skinKey(kind, entry.id))}
                                    worn={(skin ?? ANIMAL_SKINS[kind as AnimalKind][0].id) === entry.id}
                                    affordable={coins >= entry.price}
                                    active={selected?.type === "skin" && selected.skin.id === entry.id}
                                    isGoal={goal === skinGoalId(kind, entry.id)}
                                    disabled={busy}
                                    onPick={() => pickSkin(kind as AnimalKind, entry)}
                                />
                            ))}
                        </SkinRow>
                    )}
                </section>
            </div>
        </div>
    );
}

// ── Izgled ────────────────────────────────────────────────────────────────────

function SkinRow({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="space-y-2">
            <h3 className="text-base font-extrabold text-ink-soft sm:text-lg">{title}</h3>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3 lg:grid-cols-7 xl:grid-cols-8">{children}</ul>
        </div>
    );
}

interface SkinTileProps {
    kind: string;
    skin: string;
    label: string;
    /** Kraći natpis na pločici (glas i čitač ekrana kažu ceo naziv) */
    caption?: string;
    price: number;
    /** Besplatno ili kupljeno: dodir odmah obuče */
    owned: boolean;
    worn: boolean;
    affordable: boolean;
    active: boolean;
    isGoal: boolean;
    disabled: boolean;
    onPick: () => void;
}

/** Lice drugara u tom izgledu; posebno krzno pokazuje cenu (i katanac dok nema dosta novčića) */
function SkinTile({ kind, skin, label, caption, price, owned, worn, affordable, active, isGoal, disabled, onPick }: SkinTileProps) {
    const status = worn ? ", nosi" : owned ? "" : `, ${price} ${coinWord(price)}${isGoal ? ", radim za ovo" : ""}`;
    return (
        <li>
            <button
                type="button"
                onClick={onPick}
                disabled={disabled && owned}
                aria-pressed={owned ? worn : active}
                aria-label={`${label}${status}`}
                className={cn(TILE, "px-1 pb-1.5 pt-1.5", tileBorder(active, worn))}
            >
                <Companion kind={kind as CompanionKindId} skin={skin} variant="face" emotion="happy" className={cn("h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]", !owned && !affordable && "opacity-70")} />
                <span className="line-clamp-2 min-h-8 text-xs font-extrabold leading-tight text-ink">{caption ?? label}</span>
                {!owned && (
                    <span className={cn("inline-flex items-center gap-1 text-xs font-extrabold sm:text-sm", affordable ? "text-sun-700" : "text-ink-soft")}>
                        {!affordable && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                        <CoinIcon /> {price}
                    </span>
                )}
                {worn && <WornBadge />}
                {isGoal && <GoalBadge />}
            </button>
        </li>
    );
}

/** Učitelj i učiteljica: boja kože, boja kose i frizura — sve besplatno, jedan dodir */
function HumanLooks({ kind, skin, busy, onPick }: { kind: HumanKind; skin?: string; busy: boolean; onPick: (skin: string, label: string) => void }) {
    const look = humanLook(kind, skin);
    const rows: { title: string; part: keyof HumanLook; options: readonly { id: string; label: string }[] }[] = [
        { title: "Boja kože", part: "tone", options: SKIN_TONES },
        { title: "Boja kose", part: "hair", options: HAIR_COLORS },
        { title: "Frizura", part: "style", options: HAIRSTYLES[kind] },
    ];
    return (
        <>
            {rows.map(({ title, part, options }) => (
                <SkinRow key={part} title={title}>
                    {options.map((option) => {
                        const next = humanSkinId({ ...look, [part]: option.id });
                        return (
                            <SkinTile
                                key={option.id}
                                kind={kind}
                                skin={next}
                                label={option.label}
                                // U redu „Boja kože” je dovoljno „Tamna” (glas kaže „Tamna koža”)
                                caption={part === "style" ? undefined : option.label.replace(/ (koža|kosa)$/, "")}
                                price={0}
                                owned
                                worn={look[part] === option.id}
                                affordable
                                active={false}
                                isGoal={false}
                                disabled={busy}
                                onPick={() => onPick(next, option.label)}
                            />
                        );
                    })}
                </SkinRow>
            ))}
        </>
    );
}

// ── Pločice ───────────────────────────────────────────────────────────────────

function WornBadge() {
    return (
        <span aria-hidden="true" className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-emerald-600 text-white shadow-soft ring-2 ring-white">
            <Check className="h-4 w-4" />
        </span>
    );
}

function GoalBadge() {
    return (
        <span aria-hidden="true" className="absolute left-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-sun-400 text-ink shadow-soft ring-2 ring-white">
            <Target className="h-4 w-4" />
        </span>
    );
}

const TILE = "relative flex w-full flex-col items-center gap-1 rounded-tile border-2 border-b-[5px] bg-surface p-2 text-center shadow-soft transition-colors";

function tileBorder(active: boolean, worn: boolean): string {
    return active ? "border-brand-500 bg-brand-50" : worn ? "border-emerald-400 bg-emerald-50" : "border-line hover:border-brand-300";
}

interface ItemTileProps {
    item: WearItem;
    owned: boolean;
    worn: boolean;
    affordable: boolean;
    active: boolean;
    isGoal: boolean;
    onPick: (item: WearItem) => void;
}

function ItemTile({ item, owned, worn, affordable, active, isGoal, onPick }: ItemTileProps) {
    const status = owned ? (worn ? ", nosi" : ", kupljeno") : `, ${item.price} ${coinWord(item.price)}${isGoal ? ", radim za ovo" : ""}`;
    return (
        <li className={OFFSCREEN}>
            <button type="button" onClick={() => onPick(item)} aria-pressed={owned ? worn : active} aria-label={`${item.label}${status}`} className={cn(TILE, tileBorder(active, worn))}>
                <ItemThumb item={item} className={cn("h-16 w-full sm:h-20", !owned && !affordable && "opacity-60")} />
                <span className="line-clamp-2 min-h-8 text-xs font-extrabold leading-tight text-ink sm:text-sm">{item.label}</span>
                {owned ? (
                    <span className={cn("text-xs font-extrabold sm:text-sm", worn ? "text-emerald-700" : "text-ink-soft")}>{worn ? "Nosi" : "Kupljeno"}</span>
                ) : (
                    <span className={cn("inline-flex items-center gap-1 text-sm font-extrabold", affordable ? "text-sun-700" : "text-ink-soft")}>
                        {!affordable && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                        <CoinIcon /> {item.price}
                    </span>
                )}
                {worn && <WornBadge />}
                {isGoal && <GoalBadge />}
            </button>
        </li>
    );
}

interface SetTileProps {
    set: WearSet;
    kind: string;
    skin?: string;
    owned: readonly string[];
    worn: boolean;
    coins: number;
    active: boolean;
    isGoal: boolean;
    onPick: (set: WearSet) => void;
}

/** Komplet: drugar u celom kompletu, koliko predmeta dete već ima i cena ostatka */
function SetTile({ set, kind, skin, owned, worn, coins, active, isGoal, onPick }: SetTileProps) {
    const { have, total, price } = setProgress(set, owned);
    const complete = have >= total;
    const affordable = coins >= price;
    const status = complete ? (worn ? ", nosi" : ", sve imaš") : `, imaš ${have} od ${total}, ${price} ${coinWord(price)}${isGoal ? ", radim za ovo" : ""}`;
    return (
        <li className={cn(OFFSCREEN, "[contain-intrinsic-size:auto_14rem]")}>
            <button type="button" onClick={() => onPick(set)} aria-pressed={active} aria-label={`${set.label}${status}`} className={cn(TILE, tileBorder(active, worn))}>
                <SetThumb set={set} kind={kind} skin={skin} className={cn("h-28 w-24 sm:h-32 sm:w-28", !complete && !affordable && "opacity-70")} />
                <span className="line-clamp-2 min-h-8 text-sm font-extrabold leading-tight text-ink">{set.label}</span>
                <span className="text-xs font-bold text-ink-soft">
                    Imaš {have} od {total}
                </span>
                {complete ? (
                    <span className={cn("text-sm font-extrabold", worn ? "text-emerald-700" : "text-ink-soft")}>{worn ? "Nosi" : "Sve imaš"}</span>
                ) : (
                    <span className={cn("inline-flex items-center gap-1 text-sm font-extrabold", affordable ? "text-sun-700" : "text-ink-soft")}>
                        {!affordable && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                        <CoinIcon /> {price}
                    </span>
                )}
                {worn && <WornBadge />}
                {isGoal && <GoalBadge />}
            </button>
        </li>
    );
}

// ── Proba i cilj ──────────────────────────────────────────────────────────────

/** Natpis dugmeta za kupovinu: prelama se kao rečenica, a cena ostaje u istom redu sa novčićem */
function BuyLabel({ text, price }: { text: string; price: number }) {
    return (
        <span className="text-center leading-tight">
            {text}{" "}
            <span className="inline-flex items-center gap-1 whitespace-nowrap align-middle">
                <CoinIcon /> {price}
            </span>
        </span>
    );
}

function CloseButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <button type="button" onClick={onClick} aria-label={label} className="-m-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-brand-50 hover:text-ink">
            <X className="h-5 w-5" aria-hidden="true" />
        </button>
    );
}

interface TryOnProps {
    label: string;
    /** Šta još košta (za komplet: samo ono što nedostaje) */
    price: number;
    coins: number;
    isGoal: boolean;
    busy: boolean;
    buyLabel: string;
    workLabel: string;
    /** Dodatni red ispod naziva (npr. „Imaš 2 od 4”) */
    note?: string;
    onBuy: () => void;
    onWorkFor: () => void;
    onClose: () => void;
}

/** Ono što dete upravo proba: kupovina samo ovim dugmetom; za skupo — cilj */
function TryOn({ label, price, coins, isGoal, busy, buyLabel, workLabel, note, onBuy, onWorkFor, onClose }: TryOnProps) {
    const missing = Math.max(0, price - coins);
    return (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface p-2.5 shadow-soft sm:p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-base font-extrabold leading-tight text-ink sm:text-lg">
                        {label}
                        <span className="ml-1.5 inline-flex items-center gap-1 whitespace-nowrap align-middle text-sm text-sun-700">
                            <CoinIcon /> {price}
                        </span>
                    </p>
                    {note && <p className="text-xs font-bold text-ink-soft sm:text-sm">{note}</p>}
                </div>
                <CloseButton onClick={onClose} label="Vrati" />
            </div>
            {missing === 0 ? (
                <Button chunky size="lg" block variant="success" onClick={onBuy} disabled={busy}>
                    <BuyLabel text={buyLabel} price={price} />
                </Button>
            ) : isGoal ? (
                <p className="inline-flex items-center gap-1.5 text-sm font-extrabold text-sun-700">
                    <Target className="h-4 w-4" aria-hidden="true" />
                    Radiš za ovo · još {missing} <CoinIcon />
                </p>
            ) : (
                <>
                    <p className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft">
                        Još {missing} <CoinIcon />
                    </p>
                    <Button chunky size="lg" block variant="sun" onClick={onWorkFor} disabled={busy}>
                        <Target className="h-5 w-5" aria-hidden="true" />
                        {workLabel}
                    </Button>
                </>
            )}
        </div>
    );
}

interface SetTryOnProps {
    set: WearSet;
    owned: readonly string[];
    worn: boolean;
    coins: number;
    isGoal: boolean;
    busy: boolean;
    onBuy: () => void;
    onWear: () => void;
    onWorkFor: () => void;
    onClose: () => void;
}

/** Proba kompleta: „Kupi ceo komplet za N” (samo ono što nedostaje), „Obuci komplet” kad je sve kupljeno */
function SetTryOn({ set, owned, worn, coins, isGoal, busy, onBuy, onWear, onWorkFor, onClose }: SetTryOnProps) {
    const { have, total, price } = setProgress(set, owned);
    if (have < total) {
        return (
            <TryOn
                label={set.label}
                price={price}
                coins={coins}
                isGoal={isGoal}
                busy={busy}
                buyLabel="Kupi ceo komplet za"
                workLabel="Radim za ovaj komplet"
                note={`Imaš ${have} od ${total}`}
                onBuy={onBuy}
                onWorkFor={onWorkFor}
                onClose={onClose}
            />
        );
    }
    return (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface p-2.5 shadow-soft sm:p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-base font-extrabold leading-tight text-ink sm:text-lg">{set.label}</p>
                    <p className="text-xs font-bold text-ink-soft sm:text-sm">Sve imaš</p>
                </div>
                <CloseButton onClick={onClose} label="Vrati" />
            </div>
            {worn ? (
                <p className="inline-flex items-center gap-1.5 text-sm font-extrabold text-emerald-700">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Drugar ovo nosi
                </p>
            ) : (
                <Button chunky size="lg" block onClick={onWear} disabled={busy}>
                    <Shirt className="h-5 w-5" aria-hidden="true" />
                    Obuci komplet
                </Button>
            )}
        </div>
    );
}

interface GoalCardProps {
    goal: GoalProgress;
    kind: string;
    skin?: string;
    busy: boolean;
    onTry: () => void;
    onBuy: () => void;
    onClear: () => void;
    className?: string;
}

/** „Radim za”: sličica cilja, traka napretka i, kad je dosta novčića, dugme za kupovinu */
function GoalCard({ goal, kind, skin, busy, onTry, onBuy, onClear, className }: GoalCardProps) {
    return (
        <div className={cn("flex flex-col gap-2 rounded-2xl bg-surface p-2.5 shadow-soft ring-2 ring-sun-300 sm:p-3", className)}>
            <div className="flex items-center gap-2.5">
                <button
                    type="button"
                    onClick={onTry}
                    aria-label={`Probaj: ${goal.label}`}
                    className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-sun-50 ring-1 ring-sun-200 hover:bg-sun-100 sm:h-14 sm:w-14"
                >
                    <GoalThumb goal={goal} kind={kind} skin={skin} itemClassName="h-9 w-10 sm:h-11 sm:w-12" setClassName="h-14 w-12 translate-y-1 sm:h-16 sm:w-14" />
                </button>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-ink-soft sm:text-sm">Radim za:</p>
                    <p className="truncate text-base font-extrabold leading-tight text-ink">{goal.label}</p>
                </div>
                <CloseButton onClick={onClear} label="Ukloni cilj" />
            </div>
            <div className="flex items-center gap-2 text-sm">
                <GoalBar goal={goal} className="min-w-0 flex-1" />
                <span className="shrink-0 text-xs font-extrabold text-ink-soft">
                    {Math.min(goal.coins, goal.price)}/{goal.price}
                </span>
            </div>
            <GoalStatus goal={goal} className="text-base" />
            {goal.missing === 0 && (
                <Button chunky size="lg" block variant="success" onClick={onBuy} disabled={busy}>
                    <BuyLabel text={goal.set ? "Kupi ceo komplet za" : "Kupi"} price={goal.price} />
                </Button>
            )}
        </div>
    );
}
