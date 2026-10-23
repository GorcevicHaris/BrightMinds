import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    applyCompanionAction,
    coinsAvailable,
    defaultCompanion,
    parseCompanionAction,
    sanitizeCompanion,
    WEAR_SLOT_IDS,
    type CompanionCatalog,
    type WearSlotId,
} from "@/lib/companion";

const ITEMS: Record<string, { slot: WearSlotId; price: number }> = {
    crown: { slot: "hat", price: 10 },
    cap: { slot: "hat", price: 3 },
    glasses: { slot: "glasses", price: 4 },
    boots: { slot: "feet", price: 5 },
    wings: { slot: "back", price: 14 },
    puppy: { slot: "pet", price: 12 },
    beach: { slot: "background", price: 8 },
};
const catalog: CompanionCatalog = {
    isKind: (value) => typeof value === "string" && ["woman", "man", "cat", "dog", "bunny", "bear"].includes(value),
    item: (id) => ITEMS[id],
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

    it("has nine slots in a fixed order and wears all of them at once", () => {
        assert.deepEqual(WEAR_SLOT_IDS, ["hat", "glasses", "neck", "outfit", "feet", "hand", "back", "pet", "background"]);
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
    });

    it("turns stars into coins: one star is one coin, spent coins are subtracted, never below zero", () => {
        assert.equal(coinsAvailable(15, 0), 3); // 3 zvezdice × 5 poena
        assert.equal(coinsAvailable(50, 4), 6);
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
        assert.deepEqual(applyCompanionAction(start, { action: "buy", item: "crown" }, 9 * 5, catalog), { ok: false, reason: "coins" });
        const bought = applyCompanionAction(start, { action: "buy", item: "crown" }, 10 * 5, catalog);
        assert.ok(bought.ok);
        assert.deepEqual(bought.state.owned, ["crown"]);
        assert.equal(bought.state.spent, 10);
        assert.equal(bought.state.wear.hat, "crown");
        // Isti predmet se ne kupuje dvaput
        assert.deepEqual(applyCompanionAction(bought.state, { action: "buy", item: "crown" }, 100 * 5, catalog), { ok: false, reason: "owned" });
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
        const other = applyCompanionAction(withGoal, { action: "buy", item: "cap" }, 20 * 5, catalog);
        assert.ok(other.ok && other.state.goal === "wings");
        const reached = applyCompanionAction(other.state, { action: "buy", item: "wings" }, 20 * 5, catalog);
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

    it("parses only well-formed requests", () => {
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
