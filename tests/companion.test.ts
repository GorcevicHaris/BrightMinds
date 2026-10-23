import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    applyCompanionAction,
    coinsAvailable,
    defaultCompanion,
    parseCompanionAction,
    sanitizeCompanion,
    type CompanionCatalog,
} from "@/lib/companion";

const ITEMS: Record<string, { slot: "hat" | "glasses" | "neck" | "outfit"; price: number }> = {
    crown: { slot: "hat", price: 10 },
    cap: { slot: "hat", price: 3 },
    glasses: { slot: "glasses", price: 4 },
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

    it("parses only well-formed requests", () => {
        assert.deepEqual(parseCompanionAction({ action: "buy", item: "cap" }), { action: "buy", item: "cap" });
        assert.deepEqual(parseCompanionAction({ action: "wear", slot: "hat", item: null }), { action: "wear", slot: "hat", item: null });
        assert.equal(parseCompanionAction({ action: "wear", slot: "shoes", item: "x" }), null);
        assert.equal(parseCompanionAction({ action: "buy", item: 5 }), null);
        assert.equal(parseCompanionAction("buy"), null);
    });
});
