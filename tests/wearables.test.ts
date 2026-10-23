import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isValidElement } from "react";
import { COMPANIONS, isCompanionKind } from "@/app/components/avatar/companions";
import { WEAR_ITEMS, WEAR_SLOTS, getWearItem, wornItem, type WearSlot } from "@/app/components/avatar/wearables";

describe("WEAR_ITEMS", () => {
    it("ima jedinstvene id-jeve (mala slova, bez dijakritika)", () => {
        const ids = WEAR_ITEMS.map((item) => item.id);
        assert.equal(new Set(ids).size, ids.length);
        for (const id of ids) assert.match(id, /^[a-z]+(-[a-z]+)*$/);
    });

    it("svako mesto ima bar dva predmeta", () => {
        for (const slot of WEAR_SLOTS) {
            const count = WEAR_ITEMS.filter((item) => item.slot === slot).length;
            assert.ok(count >= 2, `${slot}: ${count}`);
        }
        const slots = new Set<WearSlot>(WEAR_SLOTS);
        for (const item of WEAR_ITEMS) assert.ok(slots.has(item.slot), item.id);
    });

    it("cene su cele, od 3 do 15 novčića; posebni predmeti su skupi", () => {
        for (const item of WEAR_ITEMS) {
            assert.ok(Number.isInteger(item.price) && item.price >= 3 && item.price <= 15, `${item.id}: ${item.price}`);
        }
        for (const id of ["kruna", "odelo", "super-ogrtac"]) assert.ok(getWearItem(id)!.price >= 10, id);
    });

    it("nazivi su na srpskom, latinicom, bez ćirilice", () => {
        for (const item of WEAR_ITEMS) {
            assert.ok(item.label.trim().length > 0, item.id);
            assert.equal(item.label, item.label.trim());
            assert.match(item.label, /^[A-ZČĆŽŠĐ][A-Za-zČĆŽŠĐčćžšđ -]*$/, item.label);
        }
        const labels = WEAR_ITEMS.map((item) => item.label);
        for (const expected of ["Kapa", "Šešir", "Cilindar", "Kruna", "Mašna", "Cvetni venac", "Naočare", "Sunčane naočare", "Leptir-mašna", "Šal", "Ogrlica sa zvezdom", "Odelo sa kravatom", "Džemper sa srcem", "Super-ogrtač", "Majica sa zvezdom"]) {
            assert.ok(labels.includes(expected), expected);
        }
    });

    it("svaki predmet ima crtež", () => {
        for (const item of WEAR_ITEMS) {
            const drawing = item.render();
            assert.ok(isValidElement(drawing), item.id);
        }
    });
});

describe("getWearItem / wornItem", () => {
    it("nalazi predmet po id-ju", () => {
        assert.equal(getWearItem("kruna")?.slot, "hat");
        assert.equal(getWearItem("odelo")?.label, "Odelo sa kravatom");
        for (const item of WEAR_ITEMS) assert.equal(getWearItem(item.id), item);
    });

    it("nepoznat id daje undefined", () => {
        assert.equal(getWearItem("nema-ga"), undefined);
        assert.equal(getWearItem(""), undefined);
    });

    it("predmet se crta samo na svom mestu", () => {
        assert.equal(wornItem({ hat: "kruna" }, "hat")?.id, "kruna");
        assert.equal(wornItem({ hat: "odelo" }, "hat"), undefined);
        assert.equal(wornItem({ hat: "nema-ga" }, "hat"), undefined);
        assert.equal(wornItem(undefined, "neck"), undefined);
    });
});

describe("isCompanionKind", () => {
    it("prepoznaje sve drugare", () => {
        assert.deepEqual(
            COMPANIONS.map((companion) => companion.kind),
            ["woman", "man", "cat", "dog", "bunny", "bear"]
        );
        for (const { kind } of COMPANIONS) assert.equal(isCompanionKind(kind), true);
        assert.deepEqual(
            COMPANIONS.map((companion) => companion.label),
            ["Učiteljica", "Učitelj", "Mačka", "Pas", "Zeka", "Meda"]
        );
    });

    it("odbija sve ostalo", () => {
        for (const value of ["", "Cat", "female", "lion", null, undefined, 3, {}, ["cat"]]) {
            assert.equal(isCompanionKind(value), false, String(value));
        }
    });
});
