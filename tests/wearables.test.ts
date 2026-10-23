import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { COMPANIONS, isCompanionKind } from "@/app/components/avatar/companions";
import { WearThumb, wearThumbBox } from "@/app/components/avatar/WearThumb";
import { THUMB_BOXES } from "@/app/components/avatar/wear/thumbBoxes";
import {
    WEAR_ITEMS,
    WEAR_SETS,
    WEAR_SLOT_LABELS,
    WEAR_SLOTS,
    getWearItem,
    getWearSet,
    renderWorn,
    slotVisible,
    wornItem,
    type WearSlot,
} from "@/app/components/avatar/wearables";

/** Prvih 15 predmeta iz prve prodavnice: sačuvane kupovine moraju i dalje da važe */
const ORIGINAL: [string, WearSlot, number, string][] = [
    ["kapa", "hat", 4, "Kapa"],
    ["sesir", "hat", 5, "Šešir"],
    ["masna", "hat", 3, "Mašna"],
    ["cvetni-venac", "hat", 6, "Cvetni venac"],
    ["cilindar", "hat", 8, "Cilindar"],
    ["kruna", "hat", 12, "Kruna"],
    ["naocare", "glasses", 4, "Naočare"],
    ["suncane-naocare", "glasses", 6, "Sunčane naočare"],
    ["leptir-masna", "neck", 3, "Leptir-mašna"],
    ["sal", "neck", 5, "Šal"],
    ["ogrlica-zvezda", "neck", 7, "Ogrlica sa zvezdom"],
    ["majica-zvezda", "outfit", 6, "Majica sa zvezdom"],
    ["dzemper-srce", "outfit", 8, "Džemper sa srcem"],
    ["odelo", "outfit", 12, "Odelo sa kravatom"],
    ["super-ogrtac", "outfit", 15, "Super-ogrtač"],
];

/** Najmanje predmeta po mestu */
const MIN_PER_SLOT: Record<WearSlot, number> = { hat: 30, glasses: 15, neck: 15, outfit: 50, feet: 25, hand: 25, back: 15, pet: 12, background: 12 };

/** Engleske reči koje ne smeju u nazive za dete */
const ENGLISH = /\b(hat|cap|glasses|shirt|dress|shoes?|boots?|the|with|and|pet|wings?|ball|blue|red|green|pink|yellow|costume|helmet|crown)\b/i;

const KINDS = COMPANIONS.map((companion) => companion.kind);

describe("WEAR_SLOTS", () => {
    it("ima tačno devet mesta, ovim redom (ugovor sa prodavnicom i serverom)", () => {
        assert.deepEqual([...WEAR_SLOTS], ["hat", "glasses", "neck", "outfit", "feet", "hand", "back", "pet", "background"]);
        for (const slot of WEAR_SLOTS) assert.ok(WEAR_SLOT_LABELS[slot].length > 0, slot);
    });

    it("poprsje i lice crtaju samo predmete koji se tu vide; ceo lik sve", () => {
        for (const slot of WEAR_SLOTS) assert.equal(slotVisible(slot, "full"), true, slot);
        for (const slot of ["feet", "hand", "back", "pet", "background"] as const) {
            assert.equal(slotVisible(slot, "bust"), false, slot);
            assert.equal(slotVisible(slot, "face"), false, slot);
        }
        for (const slot of ["hat", "glasses", "neck", "outfit"] as const) assert.equal(slotVisible(slot, "bust"), true, slot);
    });
});

describe("WEAR_ITEMS", () => {
    it("ima jedinstvene id-jeve (mala slova, bez dijakritika)", () => {
        const ids = WEAR_ITEMS.map((item) => item.id);
        assert.equal(new Set(ids).size, ids.length);
        for (const id of ids) assert.match(id, /^[a-z]+(-[a-z]+)*$/);
    });

    it("ima bar 200 predmeta i dovoljno na svakom mestu", () => {
        assert.ok(WEAR_ITEMS.length >= 200, String(WEAR_ITEMS.length));
        const slots = new Set<WearSlot>(WEAR_SLOTS);
        for (const item of WEAR_ITEMS) assert.ok(slots.has(item.slot), item.id);
        for (const slot of WEAR_SLOTS) {
            const count = WEAR_ITEMS.filter((item) => item.slot === slot).length;
            assert.ok(count >= MIN_PER_SLOT[slot], `${slot}: ${count}`);
        }
    });

    it("prvih 15 predmeta je nepromenjeno (id, mesto, cena, naziv)", () => {
        for (const [id, slot, price, label] of ORIGINAL) {
            const item = getWearItem(id);
            assert.ok(item, id);
            assert.equal(item.slot, slot, id);
            assert.equal(item.price, price, id);
            assert.equal(item.label, label, id);
        }
    });

    it("cene su stalne, cele i pozitivne: ima jeftinih, srednjih i velikih želja", () => {
        for (const item of WEAR_ITEMS) assert.ok(Number.isInteger(item.price) && item.price >= 3 && item.price <= 80, `${item.id}: ${item.price}`);
        const count = (from: number, to: number) => WEAR_ITEMS.filter((item) => item.price >= from && item.price <= to).length;
        assert.ok(count(3, 8) >= 60, "jeftini");
        assert.ok(count(10, 20) >= 30, "srednji");
        assert.ok(count(25, 40) >= 15, "skuplji");
        assert.ok(count(50, 80) >= 4, "velike želje");
        // Pozadine i ljubimci su skuplji od kapa i naočara
        const average = (slot: WearSlot) => {
            const prices = WEAR_ITEMS.filter((item) => item.slot === slot).map((item) => item.price);
            return prices.reduce((a, b) => a + b, 0) / prices.length;
        };
        for (const slot of ["pet", "background"] as const) assert.ok(average(slot) > average("hat") && average(slot) > average("glasses"), slot);
    });

    it("nazivi su na srpskom, latinicom, bez ćirilice i engleskih reči", () => {
        for (const item of WEAR_ITEMS) {
            assert.equal(item.label, item.label.trim());
            assert.match(item.label, /^[A-ZČĆŽŠĐ][A-Za-zČĆŽŠĐčćžšđ -]*$/, item.label);
            assert.doesNotMatch(item.label, /[Ѐ-ӿ]/, item.label);
            assert.doesNotMatch(item.label, ENGLISH, item.label);
        }
        const labels = WEAR_ITEMS.map((item) => item.label);
        assert.equal(new Set(labels).size, labels.length, "nazivi se ne ponavljaju");
    });

    it("svaki predmet se crta na svakom drugaru, u svakom obliku, bez greške", () => {
        for (const item of WEAR_ITEMS) {
            assert.ok(isValidElement(item.render()), item.id);
            for (const kind of KINDS) {
                for (const variant of ["bust", "face", "full"] as const) {
                    const markup = renderToStaticMarkup(createElement("svg", null, item.render(variant, kind), item.front?.(variant, kind)));
                    assert.ok(markup.length > 20, `${item.id} ${kind} ${variant}`);
                    assert.doesNotMatch(markup, /NaN|undefined/, `${item.id} ${kind} ${variant}`);
                }
            }
        }
    });

    it("bez gradijenata i maski sa id-jem (isti predmet sme biti na više likova)", () => {
        for (const item of WEAR_ITEMS) {
            const markup = renderToStaticMarkup(createElement("svg", null, item.render("full")));
            assert.doesNotMatch(markup, /\sid="/, item.id);
        }
    });

    it("odeća ima boju rukava", () => {
        for (const item of WEAR_ITEMS.filter((i) => i.slot === "outfit")) assert.match(item.sleeve ?? "", /^#([0-9A-Fa-f]{3}){1,2}$/, item.id);
    });
});

describe("WearThumb", () => {
    it("svaki predmet ima izmeren okvir sličice i crta se", () => {
        for (const item of WEAR_ITEMS) {
            assert.ok(item.thumb ?? THUMB_BOXES[item.id], `${item.id} nema okvir (pokreni merenje na /dev/avatar)`);
            const [, , w, h] = wearThumbBox(item).split(" ").map(Number);
            assert.ok(w > 0 && h > 0, item.id);
            const markup = renderToStaticMarkup(createElement(WearThumb, { item, className: "h-20 w-20" }));
            assert.match(markup, /^<svg viewBox="[-\d. ]+"/, item.id);
            assert.match(markup, /aria-hidden="true"/, item.id);
        }
        for (const slot of WEAR_SLOTS) assert.ok(WEAR_ITEMS.some((item) => item.slot === slot && wearThumbBox(item)), slot);
    });

    it("nema okvira za predmete kojih nema u katalogu", () => {
        for (const id of Object.keys(THUMB_BOXES)) assert.ok(getWearItem(id), id);
    });
});

describe("WEAR_SETS", () => {
    it("ima bar 20 kompleta sa jedinstvenim id-jem i nazivom", () => {
        assert.ok(WEAR_SETS.length >= 20, String(WEAR_SETS.length));
        const ids = WEAR_SETS.map((set) => set.id);
        assert.equal(new Set(ids).size, ids.length);
        for (const id of ids) assert.match(id, /^[a-z]+(-[a-z]+)*$/);
        for (const set of WEAR_SETS) assert.match(set.label, /^[A-ZČĆŽŠĐ][A-Za-zČĆŽŠĐčćžšđ -]*$/, set.label);
    });

    it("svaki predmet iz kompleta postoji i stoji na svom mestu; komplet ima 4–7 mesta", () => {
        for (const set of WEAR_SETS) {
            const entries = Object.entries(set.items);
            assert.ok(entries.length >= 4 && entries.length <= 7, `${set.id}: ${entries.length}`);
            for (const [slot, id] of entries) {
                assert.equal(getWearItem(id!)?.slot, slot, `${set.id}: ${id}`);
            }
        }
    });

    it("getWearSet nalazi komplet po id-ju", () => {
        assert.equal(getWearSet("astronaut")?.items.outfit, "kostim-astronauta");
        assert.equal(getWearSet("nema-ga"), undefined);
        for (const set of WEAR_SETS) assert.equal(getWearSet(set.id), set);
    });
});

describe("getWearItem / wornItem / renderWorn", () => {
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

    it("renderWorn: poprsje ne crta obuću, ljubimca ni pozadinu; ceo lik ih crta", () => {
        const wear = { hat: "kruna", feet: "plave-patike", pet: "mace", background: "park", hand: "balon" };
        assert.ok(renderWorn(wear, "hat"));
        for (const slot of ["feet", "pet", "background", "hand"] as const) {
            assert.equal(renderWorn(wear, slot), null, slot);
            assert.ok(renderWorn(wear, slot, { variant: "full", kind: "cat" }), slot);
        }
        assert.equal(renderWorn({ back: "krila-leptira" }, "back", { variant: "full", front: true }), null, "krila nemaju prednji deo");
        assert.ok(renderWorn({ back: "ranac" }, "back", { variant: "full", front: true }), "kaiševi ranca");
    });
});

describe("isCompanionKind", () => {
    it("prepoznaje sve drugare", () => {
        assert.deepEqual(KINDS, ["woman", "man", "cat", "dog", "bunny", "bear"]);
        for (const kind of KINDS) assert.equal(isCompanionKind(kind), true);
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
