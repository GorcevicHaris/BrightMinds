// Spisak 3D drugara (manifest): čisti podaci koje uvozi server. Proverava da su svi stari
// predmeti, kompleti i izgledi sačuvani (id, mesto, cena), da su id-jevi jedinstveni i da
// se izgled čoveka (i stari 2D zapis) ispravno čita.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WEAR_ITEMS, WEAR_SETS } from "@/app/components/avatar/wearables";
import { ANIMAL_SKINS as SKINS_2D } from "@/app/components/avatar/skins";
import { ANIMAL_KINDS, EXTRA_ANIMAL_KINDS, FRIEND_KINDS, HUMAN_KINDS, MORE_ANIMAL_KINDS, SLOTS, SLOT_LABELS } from "@/app/components/avatar3d/data";
import { ANIMAL_SKINS } from "@/app/components/avatar3d/animals/skins.data";
import { COMPANION_CATALOG, ITEMS, SETS, animalSkins, getItem, getSet, skinPrice } from "@/app/components/avatar3d/manifest";
import { HAIRSTYLES, HUMAN_DEFAULT, NO_HIJAB, humanLook, humanLookId, parseHumanLook } from "@/app/components/avatar3d/looks";
import { COMPANION_KINDS, WEAR_SLOT_IDS } from "@/lib/companion";

describe("3D manifest", () => {
    it("mesta i drugari su konačan spisak iz ugovora", () => {
        assert.deepEqual([...WEAR_SLOT_IDS], ["hat", "glasses", "neck", "outfit", "bottom", "feet", "hand", "back", "pet", "background"]);
        assert.deepEqual([...COMPANION_KINDS], [...HUMAN_KINDS, ...ANIMAL_KINDS, ...EXTRA_ANIMAL_KINDS, ...MORE_ANIMAL_KINDS, ...FRIEND_KINDS]);
        for (const slot of SLOTS) assert.ok(SLOT_LABELS[slot]);
    });

    it("id-jevi predmeta su jedinstveni i svaki predmet je na svom mestu", () => {
        const ids = ITEMS.map((item) => item.id);
        assert.equal(new Set(ids).size, ids.length);
        for (const item of ITEMS) {
            assert.ok((SLOTS as readonly string[]).includes(item.slot), item.id);
            assert.ok(Number.isInteger(item.price) && item.price >= 0, item.id);
            for (const hidden of item.hides ?? []) assert.notEqual(hidden, item.slot, item.id);
        }
    });

    it("svih 228 starih predmeta postoji sa istim mestom, nazivom i cenom", () => {
        assert.equal(WEAR_ITEMS.length, 228);
        for (const old of WEAR_ITEMS) {
            const item = getItem(old.id);
            assert.ok(item, old.id);
            assert.equal(item.slot, old.slot, old.id);
            assert.equal(item.price, old.price, old.id);
            assert.equal(item.label, old.label, old.id);
        }
    });

    it("stari kompleti postoje, a svaki komplet ima samo poznate predmete na svom mestu", () => {
        for (const old of WEAR_SETS) assert.ok(getSet(old.id), old.id);
        for (const set of SETS) {
            for (const [slot, id] of Object.entries(set.items)) assert.equal(getItem(id!)?.slot, slot, `${set.id}/${id}`);
        }
    });

    it("izgledi životinja: stari id-jevi i cene su isti, prvi izgled je besplatan", () => {
        for (const [kind, list] of Object.entries(SKINS_2D)) {
            for (const old of list) assert.equal(skinPrice(kind, old.id), old.price, `${kind}/${old.id}`);
        }
        for (const kind of [...ANIMAL_KINDS, ...EXTRA_ANIMAL_KINDS, ...MORE_ANIMAL_KINDS, ...FRIEND_KINDS]) {
            const list = animalSkins(kind);
            assert.ok(list.length >= 1, kind);
            assert.equal(list[0].price, 0, kind);
            assert.equal(skinPrice(kind, list[0].id), 0, kind);
        }
    });

    it("izgled čoveka je uvek besplatan; stari zapis od tri dela važi", () => {
        assert.equal(skinPrice("woman", "svetla.kestenjasta.duga"), 0);
        assert.deepEqual(parseHumanLook("woman", "svetla.kestenjasta.duga"), { tone: "svetla", eye: "smedje", hair: "kestenjasta", style: "duga", hijab: NO_HIJAB });
        assert.equal(skinPrice("girl", "tamna.zelene.crna.pletenice.roze"), 0);
        // Hidžab se nudi devojčici i učiteljici
        assert.equal(parseHumanLook("boy", "tamna.zelene.crna.kratka.roze"), undefined);
        assert.equal(skinPrice("man", "svetla.smedja"), undefined);
        for (const kind of HUMAN_KINDS) {
            assert.deepEqual(humanLook(kind, humanLookId(HUMAN_DEFAULT[kind])), HUMAN_DEFAULT[kind]);
            assert.equal(HAIRSTYLES[kind][0].id, HUMAN_DEFAULT[kind].style);
        }
        assert.equal(COMPANION_CATALOG.skin("girl", "x")?.price, undefined);
    });

    it("pegice i brada se dopisuju samo kad nisu podrazumevane; stari id-jevi se ne menjaju", () => {
        const boy = { ...HUMAN_DEFAULT.boy, freckles: "malo" };
        assert.equal(humanLookId(boy), humanLookId(HUMAN_DEFAULT.boy) + ".malo");
        assert.deepEqual(parseHumanLook("boy", humanLookId(boy)), boy);
        const man = { ...HUMAN_DEFAULT.man, style: "talasasta", beard: "brada" };
        assert.equal(humanLookId(man).split(".").length, 7);
        assert.deepEqual(parseHumanLook("man", humanLookId(man)), man);
        assert.equal(skinPrice("man", humanLookId(man)), 0);
        // Podrazumevane vrednosti daju isti (stari) id od pet delova
        assert.equal(humanLookId({ ...HUMAN_DEFAULT.girl, freckles: "bez", beard: "bez" }), humanLookId(HUMAN_DEFAULT.girl));
        assert.deepEqual(parseHumanLook("girl", humanLookId(HUMAN_DEFAULT.girl) + ".bez"), HUMAN_DEFAULT.girl);
        // Brada samo kod učitelja; nepoznate pegice ne važe
        assert.equal(parseHumanLook("boy", humanLookId(HUMAN_DEFAULT.boy) + ".bez.brada"), undefined);
        assert.equal(parseHumanLook("girl", humanLookId(HUMAN_DEFAULT.girl) + ".puno"), undefined);
        // Nove frizure
        assert.ok(parseHumanLook("boy", "svetla.plave.smedja.razbarusena.nema"));
        assert.ok(parseHumanLook("girl", "svetla.plave.plava.ravna-razdeljak.nema"));
    });
});
