// lib/script.ts — preslovljavanje latinice u ćirilicu.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toCyrillic } from "@/lib/script";

describe("toCyrillic", () => {
    it("turns the digraph lj into one letter in every casing", () => {
        assert.equal(toCyrillic("ljubav"), "љубав");
        assert.equal(toCyrillic("Ljubav"), "Љубав");
        assert.equal(toCyrillic("LJUBAV"), "ЉУБАВ");
        assert.equal(toCyrillic("polje"), "поље");
    });

    it("turns the digraph nj into one letter in every casing", () => {
        assert.equal(toCyrillic("njiva"), "њива");
        assert.equal(toCyrillic("Njiva"), "Њива");
        assert.equal(toCyrillic("NJIVA"), "ЊИВА");
        assert.equal(toCyrillic("konj"), "коњ");
    });

    it("turns the digraph dž into one letter in every casing", () => {
        assert.equal(toCyrillic("džep"), "џеп");
        assert.equal(toCyrillic("Džep"), "Џеп");
        assert.equal(toCyrillic("DŽEP"), "ЏЕП");
        assert.equal(toCyrillic("odžak"), "оџак");
    });

    it("converts đ, č, ć, š and ž in both cases", () => {
        assert.equal(toCyrillic("đak čaša ćup šuma žaba"), "ђак чаша ћуп шума жаба");
        assert.equal(toCyrillic("ĐAK ČAŠA ĆUP ŠUMA ŽABA"), "ЂАК ЧАША ЋУП ШУМА ЖАБА");
    });

    it("converts the whole alphabet letter by letter", () => {
        assert.equal(toCyrillic("abcčćdđefghijklmnoprsštuvzž"), "абцчћдђефгхијклмнопрсштувзж");
        assert.equal(toCyrillic("ABCČĆDĐEFGHIJKLMNOPRSŠTUVZŽ"), "АБЦЧЋДЂЕФГХИЈКЛМНОПРСШТУВЗЖ");
    });

    it("keeps n+j apart in injekcija, konjugacija and Tanjug", () => {
        assert.equal(toCyrillic("injekcija"), "инјекција");
        assert.equal(toCyrillic("Injekcija"), "Инјекција");
        assert.equal(toCyrillic("INJEKCIJA"), "ИНЈЕКЦИЈА");
        assert.equal(toCyrillic("konjugacija"), "конјугација");
        assert.equal(toCyrillic("Tanjug"), "Танјуг");
    });

    it("keeps d+ž apart in nadživeti, odživeti and podžanr", () => {
        assert.equal(toCyrillic("nadživeti"), "надживети");
        assert.equal(toCyrillic("Nadživeti"), "Надживети");
        assert.equal(toCyrillic("odživeti"), "одживети");
        assert.equal(toCyrillic("podžanr"), "поджанр");
    });

    it("applies the split exceptions inside a sentence and leaves the neighbours alone", () => {
        assert.equal(toCyrillic("Konj ne voli injekcije, a Džoni nadživi sve."), "Коњ не воли инјекције, а Џони надживи све.");
    });

    it("leaves digits, punctuation, emoji and existing Cyrillic unchanged", () => {
        assert.equal(toCyrillic("123 🎁 Ћирилица, већ!"), "123 🎁 Ћирилица, већ!");
        assert.equal(toCyrillic("5 jabuka 🍎 i „hvala”"), "5 јабука 🍎 и „хвала”");
        assert.equal(toCyrillic(""), "");
        assert.equal(toCyrillic("…—?!"), "…—?!");
    });

    it("does not break emoji that are joined sequences", () => {
        assert.equal(toCyrillic("Učiteljica 👩‍🏫 i porodica 👨‍👩‍👧"), "Учитељица 👩‍🏫 и породица 👨‍👩‍👧");
    });

    it("converts mixed Latin and Cyrillic text to all Cyrillic", () => {
        assert.equal(toCyrillic("Мила ima lutku"), "Мила има лутку");
    });

    it("gives the same text when applied to its own output", () => {
        const samples = [
            "Ljubica i Njegoš džogiraju sa đacima.",
            "injekcija, nadživeti, Tanjug",
            "ŽIVELI! 123 🎉",
            "Šta možeš da kažeš ili uradiš?",
        ];
        for (const sample of samples) {
            const once = toCyrillic(sample);
            assert.equal(toCyrillic(once), once, sample);
            assert.doesNotMatch(once, /[a-zčćđšž]/i, sample);
        }
    });

    it("leaves q, w, x and y as they are, because Serbian Cyrillic has no letter for them", () => {
        assert.equal(toCyrillic("x y q w"), "x y q w");
        assert.equal(toCyrillic("Taxi"), "Таxи");
    });
});
