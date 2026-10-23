import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    applyCompanionAction,
    COINS_PER_STAR,
    coinsAvailable,
    defaultCompanion,
    parseCompanionAction,
    POINTS_PER_STAR,
    sanitizeCompanion,
    setMissing,
    skinGoalId,
    WEAR_SLOT_IDS,
    type CompanionCatalog,
    type WearSlotId,
} from "@/lib/companion";

/** Poeni iskustva za tačno `coins` novčića (5 poena = jedna zvezdica = COINS_PER_STAR novčića) */
const xp = (coins: number) => (coins / COINS_PER_STAR) * POINTS_PER_STAR;

const ITEMS: Record<string, { slot: WearSlotId; price: number }> = {
    crown: { slot: "hat", price: 10 },
    cap: { slot: "hat", price: 3 },
    glasses: { slot: "glasses", price: 4 },
    boots: { slot: "feet", price: 5 },
    wings: { slot: "back", price: 14 },
    puppy: { slot: "pet", price: 12 },
    beach: { slot: "background", price: 8 },
};
const SETS: Record<string, { items: Partial<Record<WearSlotId, string>> }> = {
    king: { items: { hat: "crown", back: "wings", pet: "puppy" } },
    beach: { items: { hat: "cap", glasses: "glasses", background: "beach" } },
    broken: { items: { hat: "rocket" } },
    wrongSlot: { items: { feet: "crown" } },
    empty: { items: {} },
};
/** Izgledi: mačka ima dve besplatne boje i jednu koja se plaća; učiteljica jedan besplatan izgled */
const SKINS: Record<string, Record<string, number>> = {
    cat: { orange: 0, grey: 0, tiger: 12, gold: 25 },
    dog: { brown: 0, spots: 14 },
    woman: { "dark.black.braids": 0 },
};
const catalog: CompanionCatalog = {
    isKind: (value) => typeof value === "string" && ["woman", "man", "cat", "dog", "bunny", "bear"].includes(value),
    item: (id) => ITEMS[id],
    set: (id) => SETS[id],
    skin: (kind, id) => (Object.hasOwn(SKINS, kind) && Object.hasOwn(SKINS[kind], id) ? { price: SKINS[kind][id] } : undefined),
};

describe("companion state", () => {
    it("starts with the teacher the child already knows (girl → woman, boy → man)", () => {
        assert.equal(defaultCompanion("female").kind, "woman");
        assert.equal(defaultCompanion("male").kind, "man");
        assert.equal(defaultCompanion(null).kind, "man");
    });

    it("drops unknown companions and items, and never wears an item that was not bought", () => {
        const state = sanitizeCompanion(
            { kind: "dragon", owned: ["cap", "cap", "rocket"], wear: { hat: "crown", glasses: "glasses" }, spent: -5, v: 2 },
            "female",
            catalog
        );
        assert.equal(state.kind, "woman");
        assert.deepEqual(state.owned, ["cap"]);
        assert.deepEqual(state.wear, {});
        assert.equal(state.spent, 0);
        assert.equal(state.v, 2);
    });

    it("keeps data saved before the new slots and the goal existed", () => {
        const old = { kind: "cat", owned: ["cap", "glasses"], wear: { hat: "cap", glasses: "glasses" }, spent: 7, v: 4 };
        const state = sanitizeCompanion(old, "male", catalog);
        assert.deepEqual(state, old);
        assert.equal("goal" in state, false);
    });

    it("has ten slots in a fixed order and wears all of them at once", () => {
        assert.deepEqual(WEAR_SLOT_IDS, ["hat", "glasses", "neck", "outfit", "bottom", "feet", "hand", "back", "pet", "background"]);
        const owned = ["cap", "glasses", "boots", "wings", "puppy", "beach"];
        const wear = { hat: "cap", glasses: "glasses", feet: "boots", back: "wings", pet: "puppy", background: "beach" };
        assert.deepEqual(sanitizeCompanion({ kind: "dog", owned, wear, spent: 0, v: 1 }, null, catalog).wear, wear);
        // Predmet na tuđem mestu se ne nosi
        assert.deepEqual(sanitizeCompanion({ kind: "dog", owned, wear: { feet: "wings", pet: "puppy" } }, null, catalog).wear, { pet: "puppy" });
    });

    it("keeps a goal only for a known item that is not bought yet", () => {
        assert.equal(sanitizeCompanion({ owned: [], goal: "wings" }, null, catalog).goal, "wings");
        assert.equal(sanitizeCompanion({ owned: ["wings"], goal: "wings" }, null, catalog).goal, undefined);
        assert.equal(sanitizeCompanion({ owned: [], goal: "rocket" }, null, catalog).goal, undefined);
        assert.equal(sanitizeCompanion({ owned: [], goal: 5 }, null, catalog).goal, undefined);
        // Komplet: važi dok mu nešto nedostaje
        assert.equal(sanitizeCompanion({ owned: ["crown"], goal: "set:king" }, null, catalog).goal, "set:king");
        assert.equal(sanitizeCompanion({ owned: ["crown", "wings", "puppy"], goal: "set:king" }, null, catalog).goal, undefined);
        assert.equal(sanitizeCompanion({ owned: [], goal: "set:nope" }, null, catalog).goal, undefined);
    });

    it("keeps each companion's own look and owned special looks; drops unknown or unpaid ones", () => {
        const state = sanitizeCompanion(
            {
                kind: "cat",
                skin: { cat: "tiger", dog: "spots", woman: "dark.black.braids", bear: "nope", dragon: "orange" },
                skins: ["cat:tiger", "cat:tiger", "cat:orange", "dog:nope", "dragon:tiger", 5, "tiger"],
            },
            null,
            catalog
        );
        // Pegavi pas nije kupljen, pa ostaje dosadašnji; besplatna boja se ne „kupuje”
        assert.deepEqual(state.skin, { woman: "dark.black.braids", cat: "tiger" });
        assert.deepEqual(state.skins, ["cat:tiger"]);
        // Bez izgleda: nema ključeva (sačuvani podaci ostaju isti)
        const plain = sanitizeCompanion({ kind: "cat", skin: { cat: "nope" }, skins: [] }, null, catalog);
        assert.equal("skin" in plain, false);
        assert.equal("skins" in plain, false);
    });

    it("keeps a goal for a special look only while it is not bought", () => {
        assert.equal(sanitizeCompanion({ goal: "skin:cat:tiger" }, null, catalog).goal, "skin:cat:tiger");
        assert.equal(sanitizeCompanion({ goal: "skin:cat:tiger", skins: ["cat:tiger"] }, null, catalog).goal, undefined);
        assert.equal(sanitizeCompanion({ goal: "skin:cat:grey" }, null, catalog).goal, undefined);
        assert.equal(sanitizeCompanion({ goal: "skin:dragon:tiger" }, null, catalog).goal, undefined);
        assert.equal(sanitizeCompanion({ goal: "skin:cat" }, null, catalog).goal, undefined);
    });

    it("turns stars into coins: one star is two coins, spent coins are subtracted, never below zero", () => {
        assert.equal(coinsAvailable(15, 0), 6); // 3 zvezdice × 5 poena → 6 novčića
        assert.equal(coinsAvailable(50, 4), 16);
        assert.equal(coinsAvailable(5, 9), 0);
        assert.equal(coinsAvailable(null, 0), 0);
    });
});

describe("companion actions", () => {
    const start = defaultCompanion("male");

    it("lets the child choose any known companion for free", () => {
        const result = applyCompanionAction(start, { action: "choose", kind: "cat" }, 0, catalog);
        assert.ok(result.ok && result.state.kind === "cat" && result.state.v === 1);
        assert.equal(applyCompanionAction(start, { action: "choose", kind: "dragon" }, 0, catalog).ok, false);
    });

    it("buys an item only with enough coins, then wears it right away", () => {
        assert.deepEqual(applyCompanionAction(start, { action: "buy", item: "crown" }, xp(9), catalog), { ok: false, reason: "coins" });
        const bought = applyCompanionAction(start, { action: "buy", item: "crown" }, xp(10), catalog);
        assert.ok(bought.ok);
        assert.deepEqual(bought.state.owned, ["crown"]);
        assert.equal(bought.state.spent, 10);
        assert.equal(bought.state.wear.hat, "crown");
        // Isti predmet se ne kupuje dvaput
        assert.deepEqual(applyCompanionAction(bought.state, { action: "buy", item: "crown" }, xp(100), catalog), { ok: false, reason: "owned" });
    });

    it("wears and takes off only owned items, each in its own slot", () => {
        const owned = { ...start, owned: ["cap", "glasses"] };
        assert.deepEqual(applyCompanionAction(owned, { action: "wear", slot: "hat", item: "crown" }, 0, catalog), { ok: false, reason: "not-owned" });
        assert.deepEqual(applyCompanionAction(owned, { action: "wear", slot: "hat", item: "glasses" }, 0, catalog), { ok: false, reason: "unknown" });
        const worn = applyCompanionAction(owned, { action: "wear", slot: "hat", item: "cap" }, 0, catalog);
        assert.ok(worn.ok && worn.state.wear.hat === "cap");
        const off = applyCompanionAction(worn.state, { action: "wear", slot: "hat", item: null }, 0, catalog);
        assert.ok(off.ok && off.state.wear.hat === undefined);
    });

    it("sets, replaces and clears the goal; a bought item cannot be a goal", () => {
        const set = applyCompanionAction(start, { action: "goal", item: "wings" }, 0, catalog);
        assert.ok(set.ok && set.state.goal === "wings" && set.state.v === 1);
        const replaced = applyCompanionAction(set.state, { action: "goal", item: "puppy" }, 0, catalog);
        assert.ok(replaced.ok && replaced.state.goal === "puppy");
        const cleared = applyCompanionAction(replaced.state, { action: "goal", item: null }, 0, catalog);
        assert.ok(cleared.ok && !("goal" in cleared.state));
        assert.deepEqual(applyCompanionAction(start, { action: "goal", item: "rocket" }, 0, catalog), { ok: false, reason: "unknown" });
        assert.deepEqual(applyCompanionAction({ ...start, owned: ["cap"] }, { action: "goal", item: "cap" }, 0, catalog), { ok: false, reason: "owned" });
        // Cilj ništa ne košta
        assert.ok(set.ok && set.state.spent === 0);
    });

    it("clears the goal when the child buys that item, and keeps it when buying something else", () => {
        const withGoal = { ...start, goal: "wings" };
        const other = applyCompanionAction(withGoal, { action: "buy", item: "cap" }, xp(20), catalog);
        assert.ok(other.ok && other.state.goal === "wings");
        const reached = applyCompanionAction(other.state, { action: "buy", item: "wings" }, xp(20), catalog);
        assert.ok(reached.ok);
        assert.equal("goal" in reached.state, false);
        assert.equal(reached.state.wear.back, "wings");
        assert.equal(reached.state.spent, 17);
    });

    it("takes everything off without losing anything", () => {
        const dressed = { ...start, owned: ["cap", "boots"], wear: { hat: "cap", feet: "boots" }, spent: 8, goal: "wings" };
        const result = applyCompanionAction(dressed, { action: "undress" }, 0, catalog);
        assert.ok(result.ok);
        assert.deepEqual(result.state.wear, {});
        assert.deepEqual(result.state.owned, ["cap", "boots"]);
        assert.equal(result.state.spent, 8);
        assert.equal(result.state.goal, "wings");
    });

    it("puts on a whole look at once, only from owned items in their own slots", () => {
        const owned = { ...start, owned: ["cap", "boots", "puppy"], wear: { hat: "cap" } };
        const look = applyCompanionAction(owned, { action: "outfit", wear: { feet: "boots", pet: "puppy" } }, 0, catalog);
        assert.ok(look.ok);
        // Izgled zamenjuje sve što je bilo obučeno
        assert.deepEqual(look.state.wear, { feet: "boots", pet: "puppy" });
        assert.deepEqual(applyCompanionAction(owned, { action: "outfit", wear: { feet: "boots", back: "wings" } }, 0, catalog), { ok: false, reason: "not-owned" });
        assert.deepEqual(applyCompanionAction(owned, { action: "outfit", wear: { hat: "boots" } }, 0, catalog), { ok: false, reason: "unknown" });
        const empty = applyCompanionAction(owned, { action: "outfit", wear: {} }, 0, catalog);
        assert.ok(empty.ok && Object.keys(empty.state.wear).length === 0);
    });

    it("buys the missing items of a set at once, at the sum of their fixed prices, and wears the whole set", () => {
        const some = { ...start, owned: ["crown"], wear: { glasses: "glasses" }, spent: 10, goal: "set:king" };
        // Nedostaju krila (14) i štene (12): 26 novčića; jedan manje — ne kupuje se ništa
        assert.deepEqual(applyCompanionAction(some, { action: "buySet", set: "king" }, xp(10 + 25), catalog), { ok: false, reason: "coins" });
        const bought = applyCompanionAction(some, { action: "buySet", set: "king" }, xp(10 + 26), catalog);
        assert.ok(bought.ok);
        assert.deepEqual(bought.state.owned, ["crown", "wings", "puppy"]);
        assert.equal(bought.state.spent, 36);
        assert.deepEqual(bought.state.wear, { hat: "crown", back: "wings", pet: "puppy" });
        assert.equal("goal" in bought.state, false);
        assert.equal(bought.state.v, 1);
        assert.deepEqual(applyCompanionAction(bought.state, { action: "buySet", set: "king" }, 999, catalog), { ok: false, reason: "owned" });
    });

    it("refuses unknown or broken sets", () => {
        for (const set of ["nope", "broken", "wrongSlot", "empty"]) {
            assert.deepEqual(applyCompanionAction(start, { action: "buySet", set }, 999, catalog), { ok: false, reason: "unknown" }, set);
        }
    });

    it("takes a set as a goal and clears it once every item of the set is owned, bought one by one too", () => {
        const goal = applyCompanionAction(start, { action: "goal", item: "set:beach" }, 0, catalog);
        assert.ok(goal.ok && goal.state.goal === "set:beach");
        assert.deepEqual(applyCompanionAction(start, { action: "goal", item: "set:nope" }, 0, catalog), { ok: false, reason: "unknown" });
        assert.deepEqual(applyCompanionAction({ ...start, owned: ["cap", "glasses", "beach"] }, { action: "goal", item: "set:beach" }, 0, catalog), { ok: false, reason: "owned" });
        let state = goal.state;
        for (const item of ["cap", "glasses"]) {
            const result = applyCompanionAction(state, { action: "buy", item }, xp(99), catalog);
            assert.ok(result.ok);
            state = result.state;
            assert.equal(state.goal, "set:beach");
        }
        const last = applyCompanionAction(state, { action: "buy", item: "beach" }, xp(99), catalog);
        assert.ok(last.ok && !("goal" in last.state));
    });

    it("tells what is still missing from a set and what it costs", () => {
        assert.deepEqual(setMissing("king", ["wings"], catalog), { items: ["crown", "puppy"], price: 22 });
        assert.deepEqual(setMissing("king", ["crown", "wings", "puppy"], catalog), { items: [], price: 0 });
        assert.equal(setMissing("broken", [], catalog), undefined);
    });

    it("puts on free looks any time and paid looks only once bought; each companion keeps its own", () => {
        const grey = applyCompanionAction(start, { action: "skin", kind: "cat", skin: "grey" }, 0, catalog);
        assert.ok(grey.ok);
        assert.deepEqual(grey.state.skin, { cat: "grey" });
        assert.equal(grey.state.spent, 0);
        // Drugi drugar ne menja boju mačke
        const human = applyCompanionAction(grey.state, { action: "skin", kind: "woman", skin: "dark.black.braids" }, 0, catalog);
        assert.ok(human.ok);
        assert.deepEqual(human.state.skin, { cat: "grey", woman: "dark.black.braids" });
        assert.deepEqual(applyCompanionAction(start, { action: "skin", kind: "cat", skin: "tiger" }, 999, catalog), { ok: false, reason: "not-owned" });
        assert.deepEqual(applyCompanionAction(start, { action: "skin", kind: "cat", skin: "spots" }, 0, catalog), { ok: false, reason: "unknown" });
        assert.deepEqual(applyCompanionAction(start, { action: "skin", kind: "dragon", skin: "grey" }, 0, catalog), { ok: false, reason: "unknown" });
        const owned = applyCompanionAction({ ...start, skins: ["cat:tiger"] }, { action: "skin", kind: "cat", skin: "tiger" }, 0, catalog);
        assert.ok(owned.ok && owned.state.skin?.cat === "tiger");
    });

    it("buys a special look at its fixed price, puts it on and clears it as a goal", () => {
        const withGoal = { ...start, skin: { dog: "brown" }, goal: skinGoalId("cat", "tiger") };
        assert.deepEqual(applyCompanionAction(withGoal, { action: "buySkin", kind: "cat", skin: "tiger" }, xp(11), catalog), { ok: false, reason: "coins" });
        const bought = applyCompanionAction(withGoal, { action: "buySkin", kind: "cat", skin: "tiger" }, xp(12), catalog);
        assert.ok(bought.ok);
        assert.deepEqual(bought.state.skins, ["cat:tiger"]);
        assert.deepEqual(bought.state.skin, { dog: "brown", cat: "tiger" });
        assert.equal(bought.state.spent, 12);
        assert.equal("goal" in bought.state, false);
        // Ne kupuje se dvaput, a besplatna boja se ne kupuje
        assert.deepEqual(applyCompanionAction(bought.state, { action: "buySkin", kind: "cat", skin: "tiger" }, 999, catalog), { ok: false, reason: "owned" });
        assert.deepEqual(applyCompanionAction(start, { action: "buySkin", kind: "cat", skin: "grey" }, 999, catalog), { ok: false, reason: "owned" });
        assert.deepEqual(applyCompanionAction(start, { action: "buySkin", kind: "cat", skin: "nope" }, 999, catalog), { ok: false, reason: "unknown" });
        // Novčići potrošeni na izgled se ne mogu potrošiti ponovo
        assert.deepEqual(applyCompanionAction(bought.state, { action: "buy", item: "wings" }, xp(12) + xp(13), catalog), { ok: false, reason: "coins" });
    });

    it("takes a paid look as a goal; a free or bought look cannot be one", () => {
        const goal = applyCompanionAction(start, { action: "goal", item: skinGoalId("cat", "gold") }, 0, catalog);
        assert.ok(goal.ok && goal.state.goal === "skin:cat:gold");
        assert.deepEqual(applyCompanionAction(start, { action: "goal", item: "skin:cat:grey" }, 0, catalog), { ok: false, reason: "unknown" });
        assert.deepEqual(applyCompanionAction(start, { action: "goal", item: "skin:cat:nope" }, 0, catalog), { ok: false, reason: "unknown" });
        assert.deepEqual(applyCompanionAction({ ...start, skins: ["cat:gold"] }, { action: "goal", item: "skin:cat:gold" }, 0, catalog), { ok: false, reason: "owned" });
        // Kupovina predmeta ne briše cilj izgleda
        const other = applyCompanionAction(goal.state, { action: "buy", item: "cap" }, xp(99), catalog);
        assert.ok(other.ok && other.state.goal === "skin:cat:gold");
    });

    it("parses only well-formed requests", () => {
        assert.deepEqual(parseCompanionAction({ action: "skin", kind: "cat", skin: "grey" }), { action: "skin", kind: "cat", skin: "grey" });
        assert.deepEqual(parseCompanionAction({ action: "buySkin", kind: "cat", skin: "tiger" }), { action: "buySkin", kind: "cat", skin: "tiger" });
        assert.equal(parseCompanionAction({ action: "skin", kind: "cat" }), null);
        assert.equal(parseCompanionAction({ action: "buySkin", kind: 1, skin: "tiger" }), null);
        assert.deepEqual(parseCompanionAction({ action: "buySet", set: "king" }), { action: "buySet", set: "king" });
        assert.equal(parseCompanionAction({ action: "buySet", set: ["king"] }), null);
        assert.deepEqual(parseCompanionAction({ action: "undress" }), { action: "undress" });
        assert.deepEqual(parseCompanionAction({ action: "goal", item: "wings" }), { action: "goal", item: "wings" });
        assert.deepEqual(parseCompanionAction({ action: "goal", item: null }), { action: "goal", item: null });
        assert.equal(parseCompanionAction({ action: "goal" }), null);
        assert.deepEqual(parseCompanionAction({ action: "wear", slot: "pet", item: "puppy" }), { action: "wear", slot: "pet", item: "puppy" });
        assert.deepEqual(parseCompanionAction({ action: "outfit", wear: { hat: "cap", feet: "boots" } }), { action: "outfit", wear: { hat: "cap", feet: "boots" } });
        assert.equal(parseCompanionAction({ action: "outfit", wear: { tail: "x" } }), null);
        assert.equal(parseCompanionAction({ action: "outfit", wear: { hat: 3 } }), null);
        assert.equal(parseCompanionAction({ action: "outfit", wear: ["cap"] }), null);
        assert.equal(parseCompanionAction(JSON.parse('{"action":"outfit","wear":{"__proto__":"x"}}')), null);
        assert.deepEqual(parseCompanionAction({ action: "buy", item: "cap" }), { action: "buy", item: "cap" });
        assert.deepEqual(parseCompanionAction({ action: "wear", slot: "hat", item: null }), { action: "wear", slot: "hat", item: null });
        assert.equal(parseCompanionAction({ action: "wear", slot: "shoes", item: "x" }), null);
        assert.equal(parseCompanionAction({ action: "buy", item: 5 }), null);
        assert.equal(parseCompanionAction("buy"), null);
    });
});
