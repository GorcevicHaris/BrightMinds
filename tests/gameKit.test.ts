// app/components/games/kit/utils.ts — čiste pomoćne funkcije koje dele sve igre.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    finiteOr,
    genderText,
    hintDue,
    isFemale,
    offeredOptions,
    shuffle,
    toCount,
    toIndexList,
} from "@/app/components/games/kit/utils";

describe("genderText", () => {
    it("picks the first form for a boy and the second for a girl", () => {
        assert.equal(genderText("Dobi{o|la} si poklon", false), "Dobio si poklon");
        assert.equal(genderText("Dobi{o|la} si poklon", true), "Dobila si poklon");
    });

    it("resolves several pairs in one sentence", () => {
        const text = "To radim {sam|sama}. {Žedan|Žedna} sam.";
        assert.equal(genderText(text, false), "To radim sam. Žedan sam.");
        assert.equal(genderText(text, true), "To radim sama. Žedna sam.");
    });

    it("allows either side of a pair to be empty", () => {
        assert.equal(genderText("umoran{|a}", false), "umoran");
        assert.equal(genderText("umoran{|a}", true), "umorana");
        assert.equal(genderText("{on|}", true), "");
    });

    it("leaves text without pairs unchanged", () => {
        assert.equal(genderText("Hvala!", true), "Hvala!");
        assert.equal(genderText("", false), "");
    });
});

describe("isFemale", () => {
    it("is true only for the gender female, in any letter case", () => {
        assert.equal(isFemale("female"), true);
        assert.equal(isFemale("FEMALE"), true);
        assert.equal(isFemale("male"), false);
        assert.equal(isFemale("other"), false);
        assert.equal(isFemale(undefined), false);
    });
});

describe("offeredOptions", () => {
    const source = { options: ["a", "b", "c", "d"], acceptable: [0, 1] };

    it("offers everything when the limit is at least the number of options", () => {
        assert.deepEqual(offeredOptions(source, 4), [0, 1, 2, 3]);
        assert.deepEqual(offeredOptions(source, 6), [0, 1, 2, 3]);
    });

    it("keeps all helpful choices that fit and one less helpful choice", () => {
        assert.deepEqual(offeredOptions(source, 3), [0, 1, 2]);
    });

    it("keeps one helpful and one less helpful choice when only two fit", () => {
        assert.deepEqual(offeredOptions(source, 2), [0, 2]);
    });

    it("never offers fewer than two choices", () => {
        assert.deepEqual(offeredOptions(source, 1), [0, 2]);
        assert.deepEqual(offeredOptions(source, 0), [0, 2]);
    });

    it("returns the offered indexes in their original order", () => {
        assert.deepEqual(offeredOptions({ options: ["a", "b", "c", "d"], acceptable: [3] }, 3), [0, 1, 3]);
    });
});

describe("hintDue", () => {
    it("is never due when the adult turned hints off", () => {
        assert.equal(hintDue(0, 5, 3), false);
    });

    it("is due after as many misses as the adult chose", () => {
        assert.equal(hintDue(2, 1, 3), false);
        assert.equal(hintDue(2, 2, 3), true);
        assert.equal(hintDue(1, 1, 3), true);
    });

    it("is due at the latest when every less helpful choice on offer has been tried", () => {
        assert.equal(hintDue(2, 1, 1), true);
        assert.equal(hintDue(2, 0, 1), false);
    });
});

describe("shuffle", () => {
    it("returns a new list with the same items and leaves the original untouched", () => {
        const original = [1, 2, 3, 4, 5, 6];
        const shuffled = shuffle(original);
        assert.notEqual(shuffled, original);
        assert.deepEqual(original, [1, 2, 3, 4, 5, 6]);
        assert.deepEqual([...shuffled].sort(), original);
    });
});

describe("values received by the live monitor", () => {
    it("finiteOr keeps finite numbers and replaces everything else", () => {
        assert.equal(finiteOr(3.5, 0), 3.5);
        assert.equal(finiteOr(Number.NaN, 7), 7);
        assert.equal(finiteOr("3", 7), 7);
        assert.equal(finiteOr(undefined, 7), 7);
    });

    it("toCount keeps whole non-negative numbers and floors fractions", () => {
        assert.equal(toCount(4, 0), 4);
        assert.equal(toCount(4.9, 0), 4);
        assert.equal(toCount(-1, 9), 9);
        assert.equal(toCount(Number.POSITIVE_INFINITY, 9), 9);
        assert.equal(toCount(null, 9), 9);
    });

    it("toIndexList keeps distinct whole indexes inside the range, in arrival order", () => {
        assert.deepEqual(toIndexList([2, 0, 2, 5, -1, 1.5, "1", 1], 4), [2, 0, 1]);
        assert.deepEqual(toIndexList("0,1", 4), []);
        assert.deepEqual(toIndexList(undefined, 4), []);
    });
});

describe("demoRounds", () => {
    it("leaves out only the first task of level 1, and never a level's only task", async () => {
        const { demoRounds } = await import("@/app/components/games/kit/utils");
        assert.equal(demoRounds(1, 5), 1);
        assert.equal(demoRounds(1, 1), 0);
        assert.equal(demoRounds(2, 5), 0);
        assert.equal(demoRounds(15, 8), 0);
    });
});
