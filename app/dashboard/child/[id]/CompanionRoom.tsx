"use client";

// Ekran „Moj drugar” (3D): gore živ drugar u mirnom svetlosivom svetu (ili u kupljenoj
// pozadini), dole list sa tri dela — Prodavnica, Ormar i Lik. Pravila za decu od 3 do 10
// godina i decu iz spektra:
//  • dodir na predmet ga PROBNO obuče (drugar skoči, glas kaže naziv i cenu); kupuje se samo
//    dugmetom „Kupi za N” — slučajan dodir ne troši novčiće; kupljen predmet se dodirom oblači/skida;
//  • jedan čip = jedna vrsta stvari (Kape, Obuća…), sa podvrstama (Patike, Čizme…); bez mešanih
//    strana, bez preporuka i bez nasumičnosti — redosled je uvek isti (od najjeftinijeg);
//  • „Vrati” i „Ponovo” menjaju samo probu i ono što drugar nosi, nikad kupovinu;
//  • stalne cene, bez popusta i odbrojavanja; cilj „Radim za ovo” pokazuje koliko je ostalo;
//  • glas nikad ne kaže gde da se dodirne; veliki dodirni ciljevi, slika + reč;
//  • Lik: drugar, koža, oči, kosa, frizura, hidžab (besplatno — identitet se ne plaća), krzno.
// Drugar se okreće prevlačenjem i sam se vrati; uz „Manje animacija” stoji mirno.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
    Backpack,
    Check,
    Crown,
    DoorClosed,
    Eye,
    Footprints,
    Gem,
    Glasses,
    Image as ImageIcon,
    Lock,
    Palette,
    PawPrint,
    Redo2,
    Scissors,
    Shirt,
    ShoppingBag,
    Sparkles,
    Target,
    Undo2,
    UserRound,
    WandSparkles,
    X,
    type LucideIcon,
} from "lucide-react";
import type { CompanionAction as CompanionMove } from "@/app/components/avatar/motion";
import CompanionPicture from "@/app/components/avatar3d/CompanionPicture";
import CompanionStage from "@/app/components/avatar3d/CompanionStage";
import { COMPANION_KINDS, COMPANION_LABELS, isHumanKind, type CompanionKind, type ItemData, type SetData, type SkinData, type Slot, type Wear } from "@/app/components/avatar3d/data";
import {
    EYE_COLORS,
    HAIR_COLORS,
    HAIRSTYLES,
    HIJAB_COLORS,
    HIJAB_STYLES,
    NO_HIJAB,
    SKIN_TONES,
    hasHijabOption,
    hijabParts,
    hijabValue,
    humanLook,
    humanLookId,
    type ColorLookPart,
    type HumanLook,
} from "@/app/components/avatar3d/looks";
import { SETS, animalSkins } from "@/app/components/avatar3d/manifest";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { celebrateBig, playSfx } from "@/app/components/games/kit";
import { CoinIcon } from "@/app/components/ui/CoinIcon";
import { Button } from "@/app/components/ui/Button";
import { cn } from "@/lib/cn";
import { setGoalId, skinGoalId, skinKey, type CompanionAction } from "@/lib/companion";
import { useSpeech } from "@/lib/speech";
import { useCompanion } from "./companionState";
import { Coins, GoalBar, GoalStatus, GoalThumb, ItemThumb, SetThumb, coinWord, goalProgress, setProgress, type GoalProgress } from "./companionUi";
import { CATEGORY_ORDER, groupOf, itemsInSlot, subgroupsOf, type CategoryId } from "./shopCatalog";

/** Pantalone (lucide nema takvu sličicu) */
function PantsIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 3h12l1 18h-5l-2-11-2 11H5z" />
            <path d="M6 7h12" />
        </svg>
    );
}

const CATEGORY_ICON: Record<CategoryId, LucideIcon | typeof PantsIcon> = {
    sets: Sparkles,
    hat: Crown,
    glasses: Glasses,
    neck: Gem,
    outfit: Shirt,
    bottom: PantsIcon,
    feet: Footprints,
    hand: WandSparkles,
    back: Backpack,
    pet: PawPrint,
    background: ImageIcon,
};

/** Kategorije koje imaju predmete (prazno mesto se ne prikazuje) */
const CATEGORIES = CATEGORY_ORDER.filter((c) => (c.id === "sets" ? SETS.length > 0 : itemsInSlot(c.id).length > 0));

type Panel = "shop" | "closet" | "look";
type LookTab = "companion" | "tone" | "eyes" | "hair" | "style" | "hijab" | "fur";

/** Šta dete upravo proba: jedan predmet, ceo komplet ili posebno krzno */
type Selection = { type: "item"; item: ItemData } | { type: "set"; set: SetData } | { type: "skin"; kind: string; skin: SkinData };

/** Stanje za „Vrati/Ponovo”: proba i ono što drugar nosi (nikad kupovina) */
interface LookState {
    selected: Selection | null;
    wear: Wear;
}

const CATEGORY_KEY = "bm-shop-category";

function storedCategory(): CategoryId {
    try {
        const value = window.localStorage.getItem(CATEGORY_KEY);
        if (value && CATEGORIES.some((c) => c.id === value)) return value as CategoryId;
    } catch {
        // Bez pristupa skladištu: prva kategorija
    }
    return CATEGORIES[0]?.id ?? "sets";
}

function sameWear(a: Wear, b: Wear): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) if (a[key as Slot] !== b[key as Slot]) return false;
    return true;
}

function sameLook(wear: Wear, items: Wear): boolean {
    return Object.entries(items).every(([slot, id]) => wear[slot as Slot] === id);
}

export default function CompanionRoom({ gender }: { gender?: string }) {
    const companion = useCompanion();
    const { reduceMotion } = useChildSettings();
    const { say } = useSpeech(gender);
    const [panel, setPanel] = useState<Panel>("shop");
    const [category, setCategoryState] = useState<CategoryId>(() => (typeof window === "undefined" ? (CATEGORIES[0]?.id ?? "sets") : storedCategory()));
    const [sub, setSub] = useState<string | null>(null);
    const [lookTab, setLookTab] = useState<LookTab>("companion");
    const [selected, setSelected] = useState<Selection | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [history, setHistory] = useState<{ past: LookState[]; future: LookState[] }>({ past: [], future: [] });
    // List na telefonu: spušten (više drugara) ili podignut (više predmeta)
    const [expanded, setExpanded] = useState(false);
    const dragY = useRef<number | null>(null);
    // Jednokratni pokret: skok pri probi, radost posle kupovine, pojava novog izgleda
    const [move, setMove] = useState<{ action?: CompanionMove; key: number }>({ key: 0 });
    const play = (action: CompanionMove) => setMove((current) => ({ action, key: current.key + 1 }));

    const look = companion ? `${companion.kind}:${selected?.type === "skin" && selected.kind === companion.kind ? selected.skin.id : (companion.skin[companion.kind] ?? "")}` : null;
    const [shownLook, setShownLook] = useState(look);
    if (look !== shownLook) {
        setShownLook(look);
        if (shownLook !== null && look !== null) play("appear");
    }

    // Probno obučen predmet (ili ceo komplet) se vidi na velikom drugaru; pozadina je svet oko njega
    const previewWear = useMemo<Wear>(() => {
        if (!companion || !selected || selected.type === "skin") return companion?.wear ?? {};
        return selected.type === "set" ? selected.set.items : { ...companion.wear, [selected.item.slot]: selected.item.id };
    }, [companion, selected]);

    useEffect(() => {
        try {
            window.localStorage.setItem(CATEGORY_KEY, category);
        } catch {
            // Nije važno ako se ne zapamti
        }
    }, [category]);

    if (!companion) return null;
    const { kind, owned, wear, coins, goal, skins } = companion;
    const skin = companion.skin[kind];
    const previewSkin = selected?.type === "skin" && selected.kind === kind ? selected.skin.id : skin;
    const goalNow = goalProgress(goal, owned, coins, skins);
    const anythingWorn = Object.keys(wear).length > 0;
    const human = isHumanKind(kind);

    /** Pamti trenutnu probu i odeću pre promene (za „Vrati”) */
    const remember = () => setHistory((h) => ({ past: [...h.past.slice(-29), { selected, wear }], future: [] }));

    const run = async (action: CompanionAction): Promise<boolean> => {
        setBusy(true);
        const error = await companion.act(action);
        setBusy(false);
        setMessage(error);
        return error === null;
    };

    /** Vraća probu i odeću (samo kupljene stvari; kupovina ostaje) */
    const restore = async (state: LookState) => {
        setSelected(state.selected);
        if (!sameWear(state.wear, wear)) {
            const allowed = Object.fromEntries(Object.entries(state.wear).filter(([, id]) => id && owned.includes(id))) as Wear;
            await run({ action: "outfit", wear: allowed });
        }
        play("hop");
    };

    const undo = async () => {
        const prev = history.past[history.past.length - 1];
        if (!prev || busy) return;
        playSfx("tap");
        setHistory((h) => ({ past: h.past.slice(0, -1), future: [{ selected, wear }, ...h.future] }));
        await restore(prev);
    };

    const redo = async () => {
        const next = history.future[0];
        if (!next || busy) return;
        playSfx("tap");
        setHistory((h) => ({ past: [...h.past, { selected, wear }], future: h.future.slice(1) }));
        await restore(next);
    };

    const choose = async (next: CompanionKind) => {
        if (busy || next === kind) return;
        playSfx("tap");
        if (await run({ action: "choose", kind: next })) {
            if (selected?.type === "skin") setSelected(null);
            say(`${COMPANION_LABELS[next]}. Ovo je tvoj drugar.`, undefined, "happy");
        }
    };

    const openPanel = (next: Panel, label: string) => {
        playSfx("tap");
        setPanel(next);
        say(label);
    };

    const openCategory = (next: CategoryId, label: string) => {
        playSfx("tap");
        setCategoryState(next);
        setSub(null);
        say(label);
    };

    const pick = async (item: ItemData) => {
        setMessage(null);
        if (owned.includes(item.id)) {
            // Kupljen predmet: dodir oblači ili skida (ništa se ne troši)
            if (busy) return;
            playSfx("tap");
            remember();
            setSelected(null);
            const worn = wear[item.slot] === item.id;
            if (await run({ action: "wear", slot: item.slot, item: worn ? null : item.id })) {
                play("hop");
                say(worn ? `${item.label}. Skinuto.` : `${item.label}.`);
            }
            return;
        }
        playSfx("tap");
        remember();
        setSelected({ type: "item", item });
        play("hop");
        const missing = item.price - coins;
        const text = `${item.label}. Košta ${item.price} ${coinWord(item.price)}.`;
        say(missing > 0 ? `${text} Treba još ${missing}.` : text, undefined, missing > 0 ? "gentle" : undefined);
    };

    const pickSet = (set: SetData) => {
        setMessage(null);
        playSfx("tap");
        remember();
        setSelected({ type: "set", set });
        play("hop");
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
        play("joy");
        if (!reduceMotion) celebrateBig();
        setSelected(null);
        say(text, undefined, "proud");
    };

    const buy = async (item: ItemData) => {
        if (busy) return;
        if (await run({ action: "buy", item: item.id })) celebrate(`Bravo! ${item.label}. Drugar to sada nosi.`);
    };

    const buySet = async (set: SetData) => {
        if (busy) return;
        if (await run({ action: "buySet", set: set.id })) celebrate(`Bravo! ${set.label}. Drugar sada nosi ceo komplet.`);
    };

    const wearSet = async (set: SetData) => {
        if (busy) return;
        playSfx("tap");
        remember();
        if (await run({ action: "outfit", wear: set.items })) {
            setSelected(null);
            play("hop");
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

    const pickFur = (entry: SkinData) => {
        if (entry.price === 0 || skins.includes(skinKey(kind, entry.id))) {
            void putOnSkin(entry.id, entry.label);
            return;
        }
        setMessage(null);
        playSfx("tap");
        remember();
        setSelected({ type: "skin", kind, skin: entry });
        const missing = entry.price - coins;
        const text = `${entry.label}. Košta ${entry.price} ${coinWord(entry.price)}.`;
        say(missing > 0 ? `${text} Treba još ${missing}.` : text, undefined, missing > 0 ? "gentle" : undefined);
    };

    const buyFur = async (entry: SkinData) => {
        if (busy) return;
        if (await run({ action: "buySkin", kind, skin: entry.id })) celebrate(`Bravo! ${entry.label}. Drugar sada ima novu boju.`);
    };

    const undress = async () => {
        if (busy || !anythingWorn) return;
        playSfx("tap");
        remember();
        setSelected(null);
        if (await run({ action: "undress" })) say("Sve je skinuto. Stvari su u ormaru.");
    };

    const tryGoal = () => {
        if (!goalNow) return;
        if (goalNow.skin) {
            const entry = animalSkins(goalNow.skin.kind).find((s) => s.id === goalNow.skin?.id);
            if (entry && goalNow.skin.kind === kind) pickFur(entry);
            else if (entry) void choose(goalNow.skin.kind as CompanionKind);
            return;
        }
        if (goalNow.set) pickSet(goalNow.set);
        else if (goalNow.item) void pick(goalNow.item);
    };

    const buyGoal = () => {
        if (!goalNow) return;
        if (goalNow.skin) {
            const entry = animalSkins(goalNow.skin.kind).find((s) => s.id === goalNow.skin?.id);
            if (entry) void buyFur(entry);
            return;
        }
        if (goalNow.set) void buySet(goalNow.set);
        else if (goalNow.item) void buy(goalNow.item);
    };

    // ── Gornji deo: živ drugar ───────────────────────────────────────────────────
    const stage = (
        <section aria-label="Moj drugar" className="relative h-full overflow-hidden rounded-card bg-[#E4E6EB] shadow-soft ring-1 ring-line">
            <CompanionStage
                kind={kind}
                skin={previewSkin}
                wear={previewWear}
                framing="full"
                background
                interactive
                action={move.action}
                actionKey={move.key}
                className="absolute inset-0"
                label={`${COMPANION_LABELS[kind as CompanionKind] ?? "Drugar"}${selected ? ", proba" : ""}`}
            />
            {/* Gore levo: mali portret otvara izbor drugara i izgleda */}
            <button
                type="button"
                onClick={() => {
                    openPanel("look", "Lik");
                    setLookTab("companion");
                }}
                aria-label="Lik: drugar i izgled"
                className="absolute left-3 top-3 grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-white shadow-soft ring-2 ring-white hover:ring-brand-300"
            >
                <CompanionPicture kind={kind} skin={skin} variant="face" emotion="happy" className="h-full w-full" eager />
            </button>
            {/* Gore desno: novčići */}
            <Coins count={coins} className="absolute right-3 top-3 bg-white/95 text-base shadow-soft sm:text-lg" />
            {selected && (
                <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-3 py-1 text-sm font-extrabold text-brand-700 shadow-soft ring-1 ring-brand-200">
                    Probaš
                </span>
            )}
            {/* Dole: proba i kupovina, ili cilj */}
            <div className="absolute inset-x-3 bottom-3 flex items-end gap-2">
                <div className="flex shrink-0 flex-col gap-2">
                    <RoundButton label="Vrati" onClick={undo} disabled={busy || history.past.length === 0}>
                        <Undo2 className="h-6 w-6" aria-hidden="true" />
                    </RoundButton>
                    <RoundButton label="Ponovo" onClick={redo} disabled={busy || history.future.length === 0}>
                        <Redo2 className="h-6 w-6" aria-hidden="true" />
                    </RoundButton>
                </div>
                <div className="ml-auto flex w-full max-w-[22rem] flex-col gap-2">
                    {message && (
                        <p role="status" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 shadow-soft">
                            {message}
                        </p>
                    )}
                    {selected?.type === "item" && (
                        <TryOn
                            label={selected.item.label}
                            price={selected.item.price}
                            coins={coins}
                            isGoal={goal === selected.item.id}
                            busy={busy}
                            buyLabel="Kupi za"
                            workLabel="Radim za ovo"
                            onBuy={() => buy(selected.item)}
                            onWorkFor={() => workFor(selected.item.id, selected.item.label)}
                            onClose={() => {
                                remember();
                                setSelected(null);
                            }}
                        />
                    )}
                    {selected?.type === "skin" && (
                        <TryOn
                            label={selected.skin.label}
                            price={selected.skin.price}
                            coins={coins}
                            isGoal={goal === skinGoalId(selected.kind, selected.skin.id)}
                            busy={busy}
                            buyLabel="Kupi za"
                            workLabel="Radim za ovo"
                            onBuy={() => buyFur(selected.skin)}
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
                    {!selected && goalNow && <GoalCard goal={goalNow} kind={kind} skin={skin} busy={busy} onTry={tryGoal} onBuy={buyGoal} onClear={clearGoal} />}
                </div>
            </div>
        </section>
    );

    // ── Donji deo: list sa Prodavnicom, Ormarom i Likom ───────────────────────────
    const panels: { id: Panel; label: string; Icon: LucideIcon }[] = [
        { id: "shop", label: "Prodavnica", Icon: ShoppingBag },
        { id: "closet", label: "Ormar", Icon: DoorClosed },
        { id: "look", label: "Lik", Icon: UserRound },
    ];

    return (
        // Telefon: gore 3D (≈ 47 % visine), dole list koji se povlači nagore (≈ 75 %); tablet i
        // računar: 3D levo, list desno. List ima svoje listanje, a zaglavlje i čipovi ostaju vidljivi.
        <div className="flex h-[calc(100svh-11.5rem)] min-h-[32rem] flex-col gap-3 sm:h-[calc(100svh-13rem)] lg:grid lg:h-[calc(100svh-12.5rem)] lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] xl:gap-6">
            <div className={cn("min-h-0 flex-none lg:h-full", !reduceMotion && "transition-[height] duration-300", expanded ? "h-[26%]" : "h-[47%]")}>{stage}</div>

            <section aria-label="Prodavnica, ormar i lik" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-t-[1.75rem] bg-surface px-3 pb-6 shadow-soft ring-1 ring-line sm:px-4 lg:h-full lg:rounded-card">
                <div className="sticky top-0 z-20 -mx-3 bg-surface px-3 pb-2 pt-1 sm:-mx-4 sm:px-4">
                {/* Ručka: povlačenje nagore pokazuje više predmeta, nadole više drugara */}
                <button
                    type="button"
                    aria-label={expanded ? "Više drugara" : "Više predmeta"}
                    aria-expanded={expanded}
                    onClick={() => setExpanded((value) => !value)}
                    onPointerDown={(event) => {
                        dragY.current = event.clientY;
                    }}
                    onPointerUp={(event) => {
                        const dy = event.clientY - (dragY.current ?? event.clientY);
                        dragY.current = null;
                        if (dy < -24) setExpanded(true);
                        else if (dy > 24) setExpanded(false);
                    }}
                    className="mx-auto mb-1 flex h-7 w-24 touch-none items-center justify-center lg:hidden"
                >
                    <span aria-hidden="true" className="block h-1.5 w-12 rounded-full bg-line" />
                </button>
                {/* Tri dela: ikonica + reč */}
                <div role="tablist" aria-label="Delovi" className="grid grid-cols-3 gap-1 rounded-2xl bg-brand-50 p-1 lg:mt-2">
                    {panels.map(({ id, label, Icon }) => {
                        const active = panel === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => openPanel(id, label)}
                                className={cn("flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition-colors sm:text-base", active ? "bg-white text-brand-700 shadow-soft" : "text-ink-soft hover:text-ink")}
                            >
                                <Icon className="h-5 w-5" aria-hidden="true" />
                                {label}
                            </button>
                        );
                    })}
                </div>
                </div>

                {panel === "shop" && (
                    <ShopPanel
                        category={category}
                        sub={sub}
                        onCategory={openCategory}
                        onSub={(next, label) => {
                            playSfx("tap");
                            setSub(next);
                            say(label);
                        }}
                        owned={owned}
                        wear={wear}
                        coins={coins}
                        goal={goal}
                        kind={kind}
                        skin={skin}
                        selected={selected}
                        onPick={pick}
                        onPickSet={pickSet}
                    />
                )}
                {panel === "closet" && <ClosetPanel owned={owned} wear={wear} busy={busy} anythingWorn={anythingWorn} onPick={pick} onUndress={undress} />}
                {panel === "look" && (
                    <LookPanel
                        tab={lookTab}
                        onTab={(next, label) => {
                            playSfx("tap");
                            setLookTab(next);
                            say(label);
                        }}
                        kind={kind}
                        skin={skin}
                        human={human}
                        companionSkins={companion.skin}
                        busy={busy}
                        coins={coins}
                        goal={goal}
                        skins={skins}
                        selected={selected}
                        onChoose={choose}
                        onPutOn={putOnSkin}
                        onPickFur={pickFur}
                        wear={wear}
                    />
                )}
            </section>
        </div>
    );
}

// ── Prodavnica ────────────────────────────────────────────────────────────────

interface ShopPanelProps {
    category: CategoryId;
    sub: string | null;
    onCategory: (id: CategoryId, label: string) => void;
    onSub: (id: string | null, label: string) => void;
    owned: readonly string[];
    wear: Wear;
    coins: number;
    goal?: string;
    kind: string;
    skin?: string;
    selected: Selection | null;
    onPick: (item: ItemData) => void;
    onPickSet: (set: SetData) => void;
}

function ShopPanel({ category, sub, onCategory, onSub, owned, wear, coins, goal, kind, skin, selected, onPick, onPickSet }: ShopPanelProps) {
    const items = category === "sets" ? [] : itemsInSlot(category);
    const groups = category === "sets" ? [] : subgroupsOf(category, items);
    const shown = sub ? items.filter((item) => groupOf(item) === sub) : items;
    const label = CATEGORIES.find((c) => c.id === category)?.label ?? "";
    return (
        <div className="space-y-3">
            <StickyChips>
            <ChipRow label="Kategorije">
                {CATEGORIES.map((c) => (
                    <Chip key={c.id} active={c.id === category} onClick={() => onCategory(c.id, c.label)} Icon={CATEGORY_ICON[c.id]}>
                        {c.label}
                    </Chip>
                ))}
            </ChipRow>
            {groups.length > 1 && (
                <ChipRow label={`Vrste: ${label}`} small>
                    <Chip small active={sub === null} onClick={() => onSub(null, label)}>
                        {label}
                    </Chip>
                    {groups.map((g) => (
                        <Chip key={g.id} small active={sub === g.id} onClick={() => onSub(g.id, g.label)}>
                            {g.label}
                        </Chip>
                    ))}
                </ChipRow>
            )}
            </StickyChips>
            {category === "sets" ? (
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {SETS.map((set) => (
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
                            onPick={onPickSet}
                        />
                    ))}
                </ul>
            ) : (
                <ItemGrid items={shown} owned={owned} wear={wear} coins={coins} goal={goal} selected={selected} onPick={onPick} />
            )}
        </div>
    );
}

function ItemGrid({ items, owned, wear, coins, goal, selected, onPick }: { items: readonly ItemData[]; owned: readonly string[]; wear: Wear; coins: number; goal?: string; selected: Selection | null; onPick: (item: ItemData) => void }) {
    return (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 xl:grid-cols-5 2xl:grid-cols-6">
            {items.map((item) => (
                <ItemTile
                    key={item.id}
                    item={item}
                    owned={owned.includes(item.id)}
                    worn={wear[item.slot] === item.id}
                    affordable={coins >= item.price}
                    active={selected?.type === "item" && selected.item.id === item.id}
                    isGoal={goal === item.id}
                    onPick={onPick}
                />
            ))}
        </ul>
    );
}

// ── Ormar ─────────────────────────────────────────────────────────────────────

function ClosetPanel({ owned, wear, busy, anythingWorn, onPick, onUndress }: { owned: readonly string[]; wear: Wear; busy: boolean; anythingWorn: boolean; onPick: (item: ItemData) => void; onUndress: () => void }) {
    const [slot, setSlot] = useState<Slot | null>(null);
    const mine = CATEGORIES.filter((c) => c.id !== "sets")
        .map((c) => ({ ...c, items: itemsInSlot(c.id as Slot).filter((item) => owned.includes(item.id)) }))
        .filter((c) => c.items.length > 0);
    const current = mine.find((c) => c.id === slot) ?? mine[0];
    return (
        <div className="space-y-3">
            {mine.length === 0 ? (
                <p className="rounded-tile bg-brand-50 p-5 text-center text-base font-bold text-ink-soft">Ormar je još prazan.</p>
            ) : (
                <>
                    <StickyChips>
                    <ChipRow label="Kategorije u ormaru">
                        {mine.map((c) => (
                            <Chip
                                key={c.id}
                                active={c.id === current?.id}
                                onClick={() => {
                                    playSfx("tap");
                                    setSlot(c.id as Slot);
                                }}
                                Icon={CATEGORY_ICON[c.id]}
                            >
                                {c.label}
                            </Chip>
                        ))}
                    </ChipRow>
                    </StickyChips>
                    {current && <ItemGrid items={current.items} owned={owned} wear={wear} coins={0} selected={null} onPick={onPick} />}
                </>
            )}
            {/* Daleko od kupovine; bez pitanja — sve se može ponovo obući */}
            <Button variant="secondary" size="md" onClick={onUndress} disabled={busy || !anythingWorn}>
                <Undo2 className="h-5 w-5" aria-hidden="true" />
                Skini sve
            </Button>
        </div>
    );
}

// ── Lik ───────────────────────────────────────────────────────────────────────

interface LookPanelProps {
    tab: LookTab;
    onTab: (tab: LookTab, label: string) => void;
    kind: string;
    skin?: string;
    human: boolean;
    companionSkins: Partial<Record<string, string>>;
    busy: boolean;
    coins: number;
    goal?: string;
    skins: readonly string[];
    selected: Selection | null;
    wear: Wear;
    onChoose: (kind: CompanionKind) => void;
    onPutOn: (skin: string, label: string) => void;
    onPickFur: (entry: SkinData) => void;
}

function LookPanel({ tab, onTab, kind, skin, human, companionSkins, busy, coins, goal, skins, selected, wear, onChoose, onPutOn, onPickFur }: LookPanelProps) {
    const tabs: { id: LookTab; label: string; Icon: LucideIcon }[] = human
        ? [
              { id: "companion", label: "Drugar", Icon: UserRound },
              { id: "tone", label: "Koža", Icon: Palette },
              { id: "eyes", label: "Oči", Icon: Eye },
              { id: "hair", label: "Kosa", Icon: Palette },
              { id: "style", label: "Frizura", Icon: Scissors },
              ...(hasHijabOption(kind as never) ? [{ id: "hijab" as LookTab, label: "Hidžab", Icon: Sparkles }] : []),
          ]
        : [
              { id: "companion", label: "Drugar", Icon: UserRound },
              { id: "fur", label: "Krzno", Icon: PawPrint },
          ];
    const active = tabs.some((t) => t.id === tab) ? tab : "companion";
    const look = human ? humanLook(kind as never, skin) : null;
    const put = (next: Partial<HumanLook>, label: string) => look && onPutOn(humanLookId({ ...look, ...next }), label);
    // Izgled se vidi bez kape (kosa i frizura se jasno vide na sličici)
    const { hat: _hat, background: _bg, ...bareWear } = wear;
    void _hat;
    void _bg;

    return (
        <div className="space-y-3">
            <StickyChips>
                <ChipRow label="Lik">
                    {tabs.map((t) => (
                        <Chip key={t.id} active={active === t.id} onClick={() => onTab(t.id, t.label)} Icon={t.Icon}>
                            {t.label}
                        </Chip>
                    ))}
                </ChipRow>
            </StickyChips>

            {active === "companion" && (
                <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 xl:grid-cols-6">
                    {COMPANION_KINDS.map((option) => {
                        const chosen = option === kind;
                        return (
                            <li key={option}>
                                <button
                                    type="button"
                                    onClick={() => onChoose(option)}
                                    aria-pressed={chosen}
                                    disabled={busy}
                                    className={cn(TILE, tileBorder(false, chosen))}
                                >
                                    <CompanionPicture kind={option} skin={companionSkins[option]} variant="face" emotion="happy" className="aspect-square w-full rounded-xl bg-[#EEF0F3]" />
                                    <span className="text-sm font-extrabold text-ink">{COMPANION_LABELS[option]}</span>
                                    {chosen && <WornBadge />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {look && active === "tone" && <SwatchGrid parts={SKIN_TONES} chosen={look.tone} busy={busy} onPick={(p) => put({ tone: p.id }, p.label)} big />}
            {look && active === "eyes" && <SwatchGrid parts={EYE_COLORS} chosen={look.eye} busy={busy} onPick={(p) => put({ eye: p.id }, p.label)} />}
            {look && active === "hair" && <SwatchGrid parts={HAIR_COLORS} chosen={look.hair} busy={busy} onPick={(p) => put({ hair: p.id }, p.label)} />}
            {look && active === "style" && (
                <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 xl:grid-cols-6">
                    {HAIRSTYLES[kind as never as keyof typeof HAIRSTYLES].map((style) => {
                        const next = humanLookId({ ...look, style: style.id, hijab: NO_HIJAB });
                        const chosen = look.style === style.id;
                        return (
                            <li key={style.id}>
                                <button type="button" onClick={() => put({ style: style.id }, style.label)} aria-pressed={chosen} disabled={busy} className={cn(TILE, tileBorder(false, chosen))}>
                                    {/* Frizura na licu drugara u njegovoj boji kose (bez kape i hidžaba) */}
                                    <CompanionPicture kind={kind} skin={next} wear={bareWear} variant="face" emotion="happy" className="aspect-square w-full rounded-xl bg-[#EEF0F3]" />
                                    <span className="line-clamp-2 min-h-8 text-xs font-extrabold leading-tight text-ink sm:text-sm">{style.label}</span>
                                    {chosen && <WornBadge />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
            {look && active === "hijab" && <HijabPicker look={look} busy={busy} onPick={(value, label) => put({ hijab: value }, label)} />}

            {!human && active === "fur" && (
                <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 xl:grid-cols-6">
                    {animalSkins(kind).map((entry, index, list) => {
                        const mine = entry.price === 0 || skins.includes(skinKey(kind, entry.id));
                        const worn = (skin ?? list[0].id) === entry.id;
                        const affordable = coins >= entry.price;
                        const isGoal = goal === skinGoalId(kind, entry.id);
                        const trying = selected?.type === "skin" && selected.skin.id === entry.id;
                        const status = worn ? ", nosi" : mine ? "" : `, ${entry.price} ${coinWord(entry.price)}${isGoal ? ", radim za ovo" : ""}`;
                        return (
                            <li key={entry.id}>
                                <button type="button" onClick={() => onPickFur(entry)} disabled={busy && mine} aria-pressed={mine ? worn : trying} aria-label={`${entry.label}${status}`} className={cn(TILE, tileBorder(trying, worn))}>
                                    <CompanionPicture kind={kind} skin={entry.id} variant="face" emotion="happy" className={cn("aspect-square w-full rounded-xl bg-[#EEF0F3]", !mine && !affordable && "opacity-70")} />
                                    <span className="line-clamp-2 min-h-8 text-xs font-extrabold leading-tight text-ink sm:text-sm">{entry.label}</span>
                                    <Price price={entry.price} owned={mine} worn={worn} affordable={affordable} />
                                    {worn && <WornBadge />}
                                    {isGoal && <GoalBadge />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

/** Velike pločice boja (koža ~24 nijanse, oči, kosa): dodir odmah obuče (besplatno) */
function SwatchGrid({ parts, chosen, busy, onPick, big = false }: { parts: readonly ColorLookPart[]; chosen: string; busy: boolean; onPick: (part: ColorLookPart) => void; big?: boolean }) {
    return (
        <ul className={cn("grid gap-2.5", big ? "grid-cols-4 sm:grid-cols-6 xl:grid-cols-8" : "grid-cols-3 sm:grid-cols-6")}>
            {parts.map((part) => {
                const active = part.id === chosen;
                return (
                    <li key={part.id}>
                        <button
                            type="button"
                            onClick={() => onPick(part)}
                            disabled={busy}
                            aria-pressed={active}
                            aria-label={part.label}
                            className={cn("relative grid aspect-square w-full place-items-center rounded-2xl shadow-soft ring-2 transition-transform", active ? "ring-brand-500" : "ring-white hover:ring-brand-200")}
                            style={{ background: part.hex }}
                        >
                            {active && (
                                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-brand-700 shadow-soft">
                                    <Check className="h-5 w-5" aria-hidden="true" />
                                </span>
                            )}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

function HijabPicker({ look, busy, onPick }: { look: HumanLook; busy: boolean; onPick: (value: string, label: string) => void }) {
    const parts = hijabParts(look.hijab);
    const style = parts?.style ?? "omotan";
    return (
        <div className="space-y-3">
            <ChipRow label="Kroj hidžaba" small>
                <Chip small active={!parts} onClick={() => onPick(NO_HIJAB, "Bez hidžaba")}>
                    Bez hidžaba
                </Chip>
                {HIJAB_STYLES.map((s) => (
                    <Chip key={s.id} small active={parts?.style === s.id} onClick={() => onPick(hijabValue(parts?.color ?? HIJAB_COLORS[0].id, s.id as "omotan" | "sportski"), s.label)}>
                        {s.label.replace(" hidžab", "")}
                    </Chip>
                ))}
            </ChipRow>
            <SwatchGrid parts={HIJAB_COLORS} chosen={parts?.color ?? ""} busy={busy} onPick={(p) => onPick(hijabValue(p.id, style), p.label)} />
        </div>
    );
}

// ── Pločice i delovi ──────────────────────────────────────────────────────────

/** Čipovi ostaju vidljivi ispod zaglavlja lista dok dete lista predmete */
function StickyChips({ children }: { children: ReactNode }) {
    return <div className="sticky top-[6.25rem] z-10 -mx-3 space-y-2 bg-surface px-3 pb-2 sm:-mx-4 sm:px-4 lg:top-[4.5rem]">{children}</div>;
}

function ChipRow({ label, small = false, children }: { label: string; small?: boolean; children: ReactNode }) {
    return (
        <div role="group" aria-label={label} className={cn("-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0", small && "gap-1.5")}>
            {children}
        </div>
    );
}

function Chip({ active, onClick, Icon, small = false, children }: { active: boolean; onClick: () => void; Icon?: LucideIcon | typeof PantsIcon; small?: boolean; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 font-extrabold transition-colors",
                small ? "min-h-10 px-3 text-sm" : "min-h-12 px-4 text-sm sm:text-base",
                active ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-ink hover:border-brand-300"
            )}
        >
            {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
            {children}
        </button>
    );
}

function RoundButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled: boolean; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-ink shadow-soft ring-1 ring-line transition-opacity hover:bg-white disabled:opacity-40"
        >
            {children}
        </button>
    );
}

function WornBadge() {
    return (
        <span aria-hidden="true" className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-emerald-600 text-white shadow-soft ring-2 ring-white">
            <Check className="h-4 w-4" />
        </span>
    );
}

function GoalBadge() {
    return (
        <span aria-hidden="true" className="absolute left-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-sun-400 text-ink shadow-soft ring-2 ring-white">
            <Target className="h-4 w-4" />
        </span>
    );
}

const TILE = "relative flex w-full flex-col items-center gap-1.5 rounded-tile border-2 bg-white p-1.5 text-center shadow-soft transition-colors";

function tileBorder(active: boolean, worn: boolean): string {
    return active ? "border-brand-500 bg-brand-50" : worn ? "border-emerald-400 bg-emerald-50" : "border-transparent hover:border-brand-300";
}

/** Cena (ili „Besplatno”), katanac kad još nema dosta novčića; kupljeno: „Nosi” / „Kupljeno” */
function Price({ price, owned, worn, affordable }: { price: number; owned: boolean; worn: boolean; affordable: boolean }) {
    if (owned) return <span className={cn("text-xs font-extrabold sm:text-sm", worn ? "text-emerald-700" : "text-ink-soft")}>{worn ? "Nosi" : price === 0 ? "Besplatno" : "Kupljeno"}</span>;
    if (price === 0) return <span className="text-xs font-extrabold text-emerald-700 sm:text-sm">Besplatno</span>;
    return (
        <span className={cn("inline-flex items-center gap-1 text-sm font-extrabold", affordable ? "text-sun-700" : "text-ink-soft")}>
            {!affordable && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
            <CoinIcon /> {price}
        </span>
    );
}

/** Pločica van ekrana se ne iscrtava dok ne dođe blizu (glatko listanje i sa 200+ predmeta) */
const OFFSCREEN = "[content-visibility:auto] [contain-intrinsic-size:auto_11rem]";

function ItemTile({ item, owned, worn, affordable, active, isGoal, onPick }: { item: ItemData; owned: boolean; worn: boolean; affordable: boolean; active: boolean; isGoal: boolean; onPick: (item: ItemData) => void }) {
    const status = owned ? (worn ? ", nosi" : ", kupljeno") : `, ${item.price} ${coinWord(item.price)}${isGoal ? ", radim za ovo" : ""}`;
    return (
        <li className={OFFSCREEN}>
            <button type="button" onClick={() => onPick(item)} aria-pressed={owned ? worn : active} aria-label={`${item.label}${status}`} className={cn(TILE, tileBorder(active, worn))}>
                <ItemThumb item={item} className={cn("aspect-square w-full rounded-xl bg-[#EEF0F3]", !owned && !affordable && "opacity-75")} />
                <span className="line-clamp-2 min-h-8 text-xs font-extrabold leading-tight text-ink sm:text-sm">{item.label}</span>
                <Price price={item.price} owned={owned} worn={worn} affordable={affordable} />
                {worn && <WornBadge />}
                {isGoal && <GoalBadge />}
            </button>
        </li>
    );
}

function SetTile({ set, kind, skin, owned, worn, coins, active, isGoal, onPick }: { set: SetData; kind: string; skin?: string; owned: readonly string[]; worn: boolean; coins: number; active: boolean; isGoal: boolean; onPick: (set: SetData) => void }) {
    const { have, total, price } = setProgress(set, owned);
    const complete = have >= total;
    const affordable = coins >= price;
    const status = complete ? (worn ? ", nosi" : ", sve imaš") : `, imaš ${have} od ${total}, ${price} ${coinWord(price)}${isGoal ? ", radim za ovo" : ""}`;
    return (
        <li className={cn(OFFSCREEN, "[contain-intrinsic-size:auto_16rem]")}>
            <button type="button" onClick={() => onPick(set)} aria-pressed={active} aria-label={`${set.label}${status}`} className={cn(TILE, tileBorder(active, worn))}>
                <SetThumb set={set} kind={kind} skin={skin} className={cn("aspect-[4/5] w-full rounded-xl bg-[#EEF0F3]", !complete && !affordable && "opacity-80")} />
                <span className="line-clamp-1 text-sm font-extrabold leading-tight text-ink">{set.label}</span>
                <span className="text-xs font-bold text-ink-soft">
                    {have} / {total}
                </span>
                {complete ? <Price price={0} owned worn={worn} affordable /> : <Price price={price} owned={false} worn={false} affordable={affordable} />}
                {worn && <WornBadge />}
                {isGoal && <GoalBadge />}
            </button>
        </li>
    );
}

// ── Proba i cilj (preko donjeg dela 3D prikaza) ──────────────────────────────

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
    price: number;
    coins: number;
    isGoal: boolean;
    busy: boolean;
    buyLabel: string;
    workLabel: string;
    note?: string;
    onBuy: () => void;
    onWorkFor: () => void;
    onClose: () => void;
}

/** Proba: naziv (i koliko još treba) levo, jedno veliko dugme desno — sažeto, da se drugar vidi */
function TryOn({ label, price, coins, isGoal, busy, buyLabel, workLabel, note, onBuy, onWorkFor, onClose }: TryOnProps) {
    const missing = Math.max(0, price - coins);
    const status = missing > 0 ? (isGoal ? `Radiš za ovo · još ${missing}` : `Još ${missing}`) : "Možeš da kupiš";
    return (
        <div className="flex items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-soft backdrop-blur-sm">
            <CloseButton onClick={onClose} label="Skini probu" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold leading-tight text-ink sm:text-base">{label}</p>
                <p className="truncate text-xs font-bold text-ink-soft">{note ? `${note} · ${status}` : status}</p>
            </div>
            {missing === 0 ? (
                <Button chunky size="md" variant="success" onClick={onBuy} disabled={busy} className="shrink-0">
                    <BuyLabel text={buyLabel} price={price} />
                </Button>
            ) : isGoal ? (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sun-100 text-sun-700" aria-hidden="true">
                    <Target className="h-5 w-5" />
                </span>
            ) : (
                <Button chunky size="md" variant="sun" onClick={onWorkFor} disabled={busy} className="shrink-0">
                    <Target className="h-5 w-5" aria-hidden="true" />
                    {workLabel}
                </Button>
            )}
        </div>
    );
}

function SetTryOn({ set, owned, worn, coins, isGoal, busy, onBuy, onWear, onWorkFor, onClose }: { set: SetData; owned: readonly string[]; worn: boolean; coins: number; isGoal: boolean; busy: boolean; onBuy: () => void; onWear: () => void; onWorkFor: () => void; onClose: () => void }) {
    const { have, total, price } = setProgress(set, owned);
    if (have < total) {
        return (
            <TryOn label={set.label} price={price} coins={coins} isGoal={isGoal} busy={busy} buyLabel="Kupi komplet za" workLabel="Radim za ovaj komplet" note={`Imaš ${have} od ${total}`} onBuy={onBuy} onWorkFor={onWorkFor} onClose={onClose} />
        );
    }
    return (
        <div className="flex flex-col gap-2 rounded-2xl bg-white/95 p-2.5 shadow-soft sm:p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-base font-extrabold leading-tight text-ink sm:text-lg">{set.label}</p>
                    <p className="text-xs font-bold text-ink-soft sm:text-sm">Sve imaš</p>
                </div>
                <CloseButton onClick={onClose} label="Skini probu" />
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

/** „Radim za”: sličica cilja, naziv i traka napretka u jednom redu; kad je dosta novčića — „Kupi” */
function GoalCard({ goal, kind, skin, busy, onTry, onBuy, onClear }: { goal: GoalProgress; kind: string; skin?: string; busy: boolean; onTry: () => void; onBuy: () => void; onClear: () => void }) {
    return (
        <div className="flex items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-soft ring-2 ring-sun-300">
            <button type="button" onClick={onTry} aria-label={`Probaj: ${goal.label}`} className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-sun-50 ring-1 ring-sun-200 hover:bg-sun-100">
                <GoalThumb goal={goal} kind={kind} skin={skin} itemClassName="h-10 w-10" setClassName="h-11 w-10" />
            </button>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold leading-tight text-ink">
                    <span className="font-bold text-ink-soft">Radim za:</span> {goal.label}
                </p>
                <div className="mt-1 flex items-center gap-2">
                    <GoalBar goal={goal} className="h-2.5 min-w-0 flex-1" />
                    <GoalStatus goal={goal} className="shrink-0 text-xs" />
                </div>
            </div>
            {goal.missing === 0 ? (
                <Button chunky size="md" variant="success" onClick={onBuy} disabled={busy} className="shrink-0">
                    <BuyLabel text="Kupi" price={goal.price} />
                </Button>
            ) : (
                <CloseButton onClick={onClear} label="Ukloni cilj" />
            )}
        </div>
    );
}
