import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    FACE_FOR_EMOTION,
    TTS_DELIVERY,
    VOICE_EMOTIONS,
    emotionForText,
    isVoiceEmotion,
} from "@/lib/emotion";

describe("emotionForText", () => {
    const cases: [string, string][] = [
        ["Zdravo. Dobro došla.", "hello"],
        ["Bravo. To je tačno.", "happy"],
        ["Odlično!", "happy"],
        ["Nivo je završen. Tri zvezdice.", "proud"],
        ["Probaj opet.", "gentle"],
        ["Nije to. Poslušaj još jednom.", "gentle"],
        ["Šta čuješ? Dodirni sliku.", "neutral"],
        ["Haris je pao i udario koleno. Kako se Haris oseća?", "neutral"],
        ["Polako pada mrak. Mama kaže da idemo kući.", "neutral"],
        ["Lepo oboji sliku.", "neutral"],
        ["Kako se oseća Lejla?", "curious"],
        ["Da li je Lejla tužna?", "curious"],
        ["Lejla je tužna jer je izgubila loptu.", "sad"],
        ["Amar je ljut jer mu je kula pala.", "angry"],
        ["Amina se uplašila grmljavine.", "scared"],
        ["Haris je iznenađen poklonom.", "surprised"],
        ["Selma je srećna jer je dobila psa.", "happy"],
        ["Dodirni isti oblik.", "neutral"],
        ["", "neutral"],
    ];
    for (const [text, expected] of cases) {
        it(`„${text}” → ${expected}`, () => assert.equal(emotionForText(text), expected));
    }

    it("odrečna rečenica ne nosi tu emociju", () => {
        assert.equal(emotionForText("Lejla nije tužna."), "neutral");
        assert.equal(emotionForText("Amar se više ne plaši mraka."), "neutral");
        assert.equal(emotionForText("Amina nije više ljuta."), "neutral");
    });

    it("radi i bez dijakritika i velikim slovima", () => {
        assert.equal(emotionForText("MILA JE TUZNA."), "sad");
    });
});

describe("tabele emocija", () => {
    it("svaka emocija ima ton glasa i izraz lica", () => {
        for (const emotion of VOICE_EMOTIONS) {
            assert.ok(TTS_DELIVERY[emotion], emotion);
            assert.ok(FACE_FOR_EMOTION[emotion], emotion);
        }
    });

    it("glas ostaje u mirnim granicama (nikad brz, nikad piskav)", () => {
        for (const emotion of VOICE_EMOTIONS) {
            const { stability, style, speed } = TTS_DELIVERY[emotion];
            assert.ok(stability >= 0.35 && stability <= 0.75, `${emotion} stability`);
            assert.ok(style >= 0 && style <= 0.6, `${emotion} style`);
            assert.ok(speed >= 0.85 && speed <= 1.02, `${emotion} speed`);
        }
    });

    it("lice okrenuto detetu nikad nije ljutito", () => {
        assert.equal(FACE_FOR_EMOTION.angry.expression, "serious");
        assert.equal(FACE_FOR_EMOTION.scared.expression, "worried");
    });

    it("isVoiceEmotion prihvata samo poznate vrednosti", () => {
        assert.equal(isVoiceEmotion("happy"), true);
        assert.equal(isVoiceEmotion("furious"), false);
        assert.equal(isVoiceEmotion(undefined), false);
    });
});
