// Izgled drugara (app/components/avatar/skins.ts): pravila cene i da se svaki izgled crta.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Companion from "@/app/components/avatar/Companion";
import { COMPANIONS } from "@/app/components/avatar/companions";
import {
    ANIMAL_SKINS,
    HAIR_COLORS,
    HAIRSTYLES,
    HUMAN_DEFAULT,
    SKIN_TONES,
    defaultSkin,
    humanSkinId,
    parseHumanSkin,
    skinPrice,
    type AnimalKind,
    type HumanKind,
} from "@/app/components/avatar/skins";

const ANIMALS = Object.keys(ANIMAL_SKINS) as AnimalKind[];
const HUMANS: HumanKind[] = ["woman", "man"];
/** Najmanje izgleda po životinji */
const MIN_SKINS: Record<AnimalKind, number> = { cat: 8, dog: 8, bunny: 5, bear: 5 };
const ENGLISH = /\b(black|white|grey|gray|brown|gold|golden|rainbow|tiger|spots?|hair|skin|short|long|curly|bald)\b/i;

const render = (kind: (typeof COMPANIONS)[number]["kind"], skin: string, variant: "face" | "bust" | "full") =>
    renderToStaticMarkup(createElement(Companion, { kind, skin, variant, emotion: "happy" }));

describe("izgled životinja", () => {
    it("ima dovoljno izgleda, sa jedinstvenim id-jevima i nazivima na srpskom", () => {
        for (const kind of ANIMALS) {
            const skins = ANIMAL_SKINS[kind];
            assert.ok(skins.length >= MIN_SKINS[kind], kind);
            assert.equal(new Set(skins.map((skin) => skin.id)).size, skins.length, `${kind}: id-jevi nisu jedinstveni`);
            for (const skin of skins) {
                assert.match(skin.id, /^[a-z0-9-]+$/, skin.id);
                assert.ok(skin.label.length > 0 && !ENGLISH.test(skin.label), skin.label);
            }
        }
    });

    it("prvi izgled je dosadašnji crtež i besplatan je", () => {
        for (const kind of ANIMALS) {
            assert.equal(defaultSkin(kind), ANIMAL_SKINS[kind][0].id);
            assert.equal(ANIMAL_SKINS[kind][0].price, 0, kind);
            // Bez izgleda, sa nepoznatim i sa podrazumevanim — isti crtež
            const plain = renderToStaticMarkup(createElement(Companion, { kind, variant: "full", emotion: "happy" })).replace(/«[^»]*»|:[^:"]*:/g, "");
            assert.equal(render(kind, defaultSkin(kind), "full").replace(/«[^»]*»|:[^:"]*:/g, ""), plain, kind);
            assert.equal(render(kind, "nema-takvog", "full").replace(/«[^»]*»|:[^:"]*:/g, ""), plain, kind);
        }
    });

    it("3–4 prirodne boje su besplatne, a posebna krzna imaju stalnu cenu 8–30", () => {
        for (const kind of ANIMALS) {
            const free = ANIMAL_SKINS[kind].filter((skin) => skin.price === 0);
            assert.ok(free.length >= 3 && free.length <= 4, `${kind}: ${free.length} besplatnih`);
            for (const skin of ANIMAL_SKINS[kind].filter((entry) => entry.price > 0)) {
                assert.ok(Number.isInteger(skin.price) && skin.price >= 8 && skin.price <= 30, `${kind}:${skin.id} ${skin.price}`);
            }
            for (const skin of ANIMAL_SKINS[kind]) assert.equal(skinPrice(kind, skin.id), skin.price);
        }
        assert.equal(skinPrice("cat", "nema-takvog"), undefined);
        assert.equal(skinPrice("zmaj", "bela"), undefined);
    });

    it("svako krzno se crta u svim oblicima, sa id-jevima šara samo za taj lik", () => {
        for (const kind of ANIMALS) {
            for (const skin of ANIMAL_SKINS[kind]) {
                for (const variant of ["face", "bust", "full"] as const) {
                    const svg = render(kind, skin.id, variant);
                    assert.match(svg, /^<svg/, `${kind}:${skin.id}:${variant}`);
                    if (skin.coat.pattern) assert.match(svg, /<pattern id="[^"]+-coat"/, `${kind}:${skin.id}`);
                }
            }
        }
        // Dva lika na istoj strani dobijaju različite id-jeve šara
        const both = renderToStaticMarkup(createElement("div", null, createElement(Companion, { kind: "cat", skin: "tigrasta" }), createElement(Companion, { kind: "cat", skin: "tigrasta" })));
        const ids = [...both.matchAll(/<pattern id="([^"]+)"/g)].map((match) => match[1]);
        assert.equal(ids.length, 2);
        assert.notEqual(ids[0], ids[1]);
    });
});

describe("izgled učitelja i učiteljice", () => {
    it("koža od svetle do tamne, kosa i frizure: dovoljno izbora i jedinstveni id-jevi", () => {
        assert.ok(SKIN_TONES.length >= 5);
        assert.ok(HAIR_COLORS.length >= 5);
        for (const list of [SKIN_TONES, HAIR_COLORS, ...HUMANS.map((kind) => HAIRSTYLES[kind])]) {
            assert.equal(new Set(list.map((part) => part.id)).size, list.length);
            for (const part of list) assert.match(part.id, /^[a-z-]+$/, part.id);
        }
        for (const kind of HUMANS) assert.ok(HAIRSTYLES[kind].length >= 4, kind);
        // Od svetle ka tamnoj: osnovna boja kože je sve tamnija
        const lightness = SKIN_TONES.map((tone) => {
            const hex = tone.colors[1].slice(1);
            return [0, 2, 4].reduce((sum, at) => sum + parseInt(hex.slice(at, at + 2), 16), 0);
        });
        for (let i = 1; i < lightness.length; i++) assert.ok(lightness[i] < lightness[i - 1], SKIN_TONES[i].id);
    });

    it("svaki izgled čoveka je uvek besplatan (identitet se ne plaća) i crta se", () => {
        for (const kind of HUMANS) {
            assert.equal(defaultSkin(kind), humanSkinId(HUMAN_DEFAULT[kind]));
            for (const tone of SKIN_TONES) {
                for (const hair of HAIR_COLORS) {
                    for (const style of HAIRSTYLES[kind]) {
                        const id = humanSkinId({ tone: tone.id, hair: hair.id, style: style.id });
                        assert.equal(skinPrice(kind, id), 0, id);
                        assert.deepEqual(parseHumanSkin(kind, id), { tone: tone.id, hair: hair.id, style: style.id });
                    }
                }
            }
            for (const style of HAIRSTYLES[kind]) {
                for (const variant of ["face", "bust", "full"] as const) assert.match(render(kind, humanSkinId({ ...HUMAN_DEFAULT[kind], style: style.id }), variant), /^<svg/);
            }
        }
        // Nepoznat deo ili frizura drugog lika nije izgled
        assert.equal(skinPrice("woman", "svetla.zelena.duga"), undefined);
        assert.equal(skinPrice("man", "svetla.crna.pletenice"), undefined);
        assert.equal(skinPrice("man", "svetla.crna.kratka.x"), undefined);
    });

    it("dosadašnji izgled crta isto kao i bez izbora", () => {
        for (const kind of HUMANS) {
            const strip = (svg: string) => svg.replace(/«[^»]*»|:[^:"]*:/g, "");
            const plain = strip(renderToStaticMarkup(createElement(Companion, { kind, variant: "full", emotion: "happy" })));
            assert.equal(strip(render(kind, defaultSkin(kind), "full")), plain, kind);
        }
    });
});
