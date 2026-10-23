import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    DEFAULT_LOOK,
    EYE_COLORS,
    HAIR_COLORS_3D,
    ITEMS_3D,
    PRESETS_3D,
    SKIN_TONES_3D,
    SLOTS_3D,
    applyPreset,
    getItem3D,
    takeOff,
    wearItem,
} from "@/app/components/avatar3d/catalog";
import { HAIR_COLORS, SKIN_TONES } from "@/app/components/avatar/skins";

describe("3D katalog", () => {
    it("id-jevi predmeta su jedinstveni, svaki predmet ima mesto i bar jednu boju", () => {
        const ids = ITEMS_3D.map((item) => item.id);
        assert.equal(new Set(ids).size, ids.length);
        const slots = new Set(SLOTS_3D.map((s) => s.slot));
        for (const item of ITEMS_3D) {
            assert.ok(slots.has(item.slot), item.id);
            assert.ok(item.colors.length >= 1, item.id);
            for (const color of item.colors) assert.match(color.hex, /^#[0-9A-F]{6}$/i, `${item.id}/${color.id}`);
        }
    });

    it("ima traženi obim prototipa po mestu", () => {
        const count = (slot: string) => ITEMS_3D.filter((item) => item.slot === slot).length;
        assert.ok(count("top") >= 6);
        assert.ok(count("bottom") >= 4);
        assert.ok(count("long") >= 3);
        assert.ok(count("shoes") >= 4);
        assert.ok(count("head") >= 4, "hidžab + bar tri kape");
        assert.ok(count("glasses") >= 2);
        assert.ok(count("bag") >= 1);
        assert.ok(getItem3D("hidzab"), "hidžab postoji");
        assert.ok((getItem3D("hidzab")?.colors.length ?? 0) >= 3, "hidžab u bar tri boje");
    });

    it("boje kože i kose koriste iste id-jeve kao 2D izgledi (sačuvan izbor važi i za 3D)", () => {
        const skin2d = new Set(SKIN_TONES.map((s: { id: string }) => s.id));
        const hair2d = new Set(HAIR_COLORS.map((s: { id: string }) => s.id));
        for (const s of SKIN_TONES_3D) assert.ok(skin2d.has(s.id), s.id);
        for (const h of HAIR_COLORS_3D) assert.ok(hair2d.has(h.id), h.id);
        assert.ok(SKIN_TONES_3D.length >= 5);
        assert.ok(EYE_COLORS.length >= 3);
    });

    it("dugačka haljina skida gornji i donji deo, a gornji deo skida haljinu", () => {
        const withDress = wearItem(DEFAULT_LOOK, "haljina", 1);
        assert.deepEqual(withDress.wear.long, { id: "haljina", color: 1 });
        assert.equal(withDress.wear.top, undefined);
        assert.equal(withDress.wear.bottom, undefined);
        assert.equal(withDress.wear.shoes?.id, "patike", "obuća ostaje");
        const back = wearItem(withDress, "majica");
        assert.equal(back.wear.long, undefined);
        assert.equal(back.wear.top?.id, "majica");
    });

    it("dugi kaput se nosi preko pantalona (skida samo gornji deo)", () => {
        const coat = wearItem(DEFAULT_LOOK, "dugi-kaput");
        assert.equal(coat.wear.top, undefined);
        assert.equal(coat.wear.bottom?.id, "farmerke");
        const jeans = wearItem(coat, "trenerka");
        assert.equal(jeans.wear.long?.id, "dugi-kaput", "donji deo ne skida kaput");
    });

    it("nepoznat predmet ne menja izgled; skidanje briše samo to mesto", () => {
        assert.equal(wearItem(DEFAULT_LOOK, "ne-postoji"), DEFAULT_LOOK);
        const without = takeOff(DEFAULT_LOOK, "shoes");
        assert.equal(without.wear.shoes, undefined);
        assert.equal(without.wear.top?.id, "majica");
        assert.equal(DEFAULT_LOOK.wear.shoes?.id, "patike", "original se ne menja");
    });

    it("kompleti koriste postojeće predmete, na pravom mestu i sa postojećom bojom", () => {
        assert.ok(PRESETS_3D.some((p) => p.look.wear?.head?.id === "hidzab" && p.look.wear?.long?.id === "dugi-kaput"), "hidžab sa dugim kaputom");
        for (const preset of PRESETS_3D) {
            const look = applyPreset(DEFAULT_LOOK, preset);
            for (const [slot, worn] of Object.entries(look.wear)) {
                const item = getItem3D(worn.id);
                assert.ok(item, `${preset.id}: ${worn.id}`);
                assert.equal(item.slot, slot, `${preset.id}: ${worn.id}`);
                assert.ok(worn.color < item.colors.length, `${preset.id}: boja ${worn.id}`);
                for (const covered of item.covers ?? []) assert.equal(look.wear[covered], undefined, `${preset.id}: ${worn.id} prekriva ${covered}`);
            }
        }
    });
});
