"use client";

// Mali delovi ekrana „Moj drugar” koje koriste i početna strana i kraj nivoa: sličica
// predmeta i kompleta, novčići i cilj („Radim za”). Cilj je tabla sa žetonima iz ABA
// terapije: dete vidi koliko još novčića treba. Bez odbrojavanja i bez žurbe — samo koliko
// je ostalo. Cilj može biti jedan predmet, ceo komplet (`set:<id>`) ili poseban izgled
// drugara (`skin:<drugar>:<izgled>`, npr. tigrasta mačka).

import Companion, { COMPANIONS } from "@/app/components/avatar/Companion";
import { skinLabel, skinPrice } from "@/app/components/avatar/skins";
import WearThumb from "@/app/components/avatar/WearThumb";
import { getWearItem, getWearSet, type WearItem, type WearSet } from "@/app/components/avatar/wearables";
import { CoinIcon } from "@/app/components/ui/CoinIcon";
import { cn } from "@/lib/cn";
import { goalSetId, goalSkin, setMissing, skinKey, type CompanionKindId, type WearSlotId } from "@/lib/companion";
import { chosenSkin, LOCAL_CATALOG, useCompanion } from "./companionState";

/** 1 novčić, 21 novčić; sve ostalo „novčića” (2–4 i 5+ imaju isti oblik) */
export function coinWord(count: number): string {
    return count % 10 === 1 && count % 100 !== 11 ? "novčić" : "novčića";
}

export function Coins({ count, className }: { count: number; className?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-sun-100 px-3 py-1 font-extrabold text-sun-700 ring-1 ring-sun-300", className)}>
            <CoinIcon />
            {count}
            <span className="sr-only"> {coinWord(count)}</span>
        </span>
    );
}

/** Sličica predmeta u prodavnici, na početnoj i posle nivoa */
export function ItemThumb({ item, className }: { item: WearItem; className?: string }) {
    return <WearThumb item={item} className={className} />;
}

/** Sličica kompleta: izabrani drugar (u svom izgledu) u celom kompletu */
export function SetThumb({ set, kind, skin, className }: { set: WearSet; kind: string; skin?: string; className?: string }) {
    return <Companion kind={kind as CompanionKindId} wear={set.items} skin={skin} variant="full" className={className} />;
}

/** Kolika je cena kompleta za ovo dete: zbir cena predmeta koji mu još nedostaju */
export function setProgress(set: WearSet, owned: readonly string[]): { have: number; total: number; price: number } {
    const missing = setMissing(set.id, owned, LOCAL_CATALOG);
    const total = Object.keys(set.items).length;
    return { have: total - (missing?.items.length ?? total), total, price: missing?.price ?? 0 };
}

export interface GoalProgress {
    /** Isti oblik kao `goal` u stanju: id predmeta ili `set:<id>` */
    id: string;
    label: string;
    /** Koliko još košta (za komplet: samo predmeti koji nedostaju) */
    price: number;
    coins: number;
    /** Koliko novčića još nedostaje (0 = može da kupi) */
    missing: number;
    item?: WearItem;
    set?: WearSet;
    /** Poseban izgled drugara */
    skin?: { kind: string; id: string };
}

/** Cilj iz stanja → napredak, ili null kad cilja nema (ili je već ostvaren) */
export function goalProgress(goal: string | undefined, owned: readonly string[], coins: number, skins: readonly string[] = []): GoalProgress | null {
    if (!goal) return null;
    const target = goalSkin(goal);
    if (target) {
        const price = skinPrice(target.kind, target.skin) ?? 0;
        const name = skinLabel(target.kind, target.skin);
        const companion = COMPANIONS.find((entry) => entry.kind === target.kind)?.label;
        if (price === 0 || !name || !companion || skins.includes(skinKey(target.kind, target.skin))) return null;
        // „Mačka: tigrasta” — jasno je čiji je izgled i kad dete trenutno ima drugog drugara
        const label = `${companion}: ${name.toLocaleLowerCase("sr")}`;
        return { id: goal, label, price, coins, missing: Math.max(0, price - coins), skin: { kind: target.kind, id: target.skin } };
    }
    const setId = goalSetId(goal);
    if (setId !== null) {
        const set = getWearSet(setId);
        if (!set) return null;
        const { price, have, total } = setProgress(set, owned);
        if (have >= total) return null;
        return { id: goal, label: set.label, price, coins, missing: Math.max(0, price - coins), set };
    }
    const item = getWearItem(goal);
    if (!item || owned.includes(item.id)) return null;
    return { id: goal, label: item.label, price: item.price, coins, missing: Math.max(0, item.price - coins), item };
}

/** Cilj deteta i koliko je do njega, ili null kad cilja nema */
export function useGoal(): GoalProgress | null {
    const companion = useCompanion();
    if (!companion) return null;
    return goalProgress(companion.goal, companion.owned, companion.coins, companion.skins);
}

/** Sličica cilja: predmet, drugar u kompletu ili lice drugara u posebnom izgledu */
export function GoalThumb({ goal, kind, skin, itemClassName, setClassName }: { goal: GoalProgress; kind: string; skin?: string; itemClassName?: string; setClassName?: string }) {
    if (goal.skin) return <Companion kind={goal.skin.kind as CompanionKindId} skin={goal.skin.id} variant="face" emotion="happy" className={itemClassName} />;
    if (goal.set) return <SetThumb set={goal.set} kind={kind} skin={skin} className={setClassName} />;
    return goal.item ? <ItemThumb item={goal.item} className={itemClassName} /> : null;
}

/** Traka napretka: koliko je novčića skupljeno od cene cilja */
export function GoalBar({ goal, className }: { goal: GoalProgress; className?: string }) {
    const have = Math.min(goal.coins, goal.price);
    return (
        <span
            role="progressbar"
            aria-label={`Novčići za: ${goal.label}`}
            aria-valuemin={0}
            aria-valuemax={goal.price}
            aria-valuenow={have}
            className={cn("block h-3 overflow-hidden rounded-full bg-sun-100 ring-1 ring-sun-300", className)}
        >
            <span className="block h-full rounded-full bg-sun-400" style={{ width: `${goal.price > 0 ? (have / goal.price) * 100 : 100}%` }} />
        </span>
    );
}

/** „Još 7 [novčić]” ili „Možeš da kupiš!” */
export function GoalStatus({ goal, className }: { goal: GoalProgress; className?: string }) {
    if (goal.missing === 0) return <span className={cn("font-extrabold text-emerald-700", className)}>Možeš da kupiš!</span>;
    return (
        <span className={cn("inline-flex items-center gap-1 font-extrabold text-sun-700", className)}>
            Još {goal.missing} <CoinIcon />
            <span className="sr-only">{coinWord(goal.missing)}</span>
        </span>
    );
}

/**
 * Mali znak cilja: sličica, „Radim za: …” i napredak. Sa `onClick` je dugme (početna →
 * ekran „Moj drugar”), bez njega samo prikaz (kraj nivoa). Bez cilja se ne prikazuje.
 */
export function GoalChip({ onClick, className }: { onClick?: () => void; className?: string }) {
    const companion = useCompanion();
    const goal = useGoal();
    if (!companion || !goal) return null;
    const content = (
        <>
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-2 ring-sun-300">
                <GoalThumb goal={goal} kind={companion.kind} skin={chosenSkin(companion)} itemClassName="h-8 w-9" setClassName="h-12 w-11 translate-y-1" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                <span className="truncate text-sm font-extrabold leading-tight text-ink">
                    <span className="font-bold text-ink-soft">Radim za:</span> {goal.label}
                </span>
                <span className="flex items-center gap-2 text-sm leading-none">
                    <GoalBar goal={goal} className="h-2.5 w-16 shrink-0 sm:w-24" />
                    <GoalStatus goal={goal} className="whitespace-nowrap" />
                </span>
            </span>
        </>
    );
    const classes = cn("inline-flex max-w-full items-center gap-2 rounded-2xl bg-white/95 py-1.5 pl-1.5 pr-3 shadow-soft", className);
    if (!onClick) return <div className={classes}>{content}</div>;
    return (
        <button type="button" onClick={onClick} className={cn(classes, "min-h-12 hover:bg-white")}>
            {content}
        </button>
    );
}
