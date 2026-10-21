import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AZURE_DEFAULT_VOICES, AZURE_LOCALE, AZURE_PROSODY, buildSsml } from "@/lib/azureTts";
import { VOICE_EMOTIONS } from "@/lib/emotion";

describe("Azure SSML", () => {
    it("uses the native Serbian Latin voices", () => {
        assert.equal(AZURE_LOCALE, "sr-Latn-RS");
        assert.match(AZURE_DEFAULT_VOICES.female, /^sr-Latn-RS-/);
        assert.match(AZURE_DEFAULT_VOICES.male, /^sr-Latn-RS-/);
    });

    it("speaks every emotion slower than ordinary speech", () => {
        for (const emotion of VOICE_EMOTIONS) {
            const rate = Number.parseInt(AZURE_PROSODY[emotion].rate, 10);
            assert.ok(rate < 0 && rate >= -20, `${emotion}: ${AZURE_PROSODY[emotion].rate}`);
        }
    });

    it("escapes the text so it cannot break the SSML", () => {
        const ssml = buildSsml(`Lejla kaže: "Ja & ti" <3 'ok'`, AZURE_DEFAULT_VOICES.female, "happy");
        assert.ok(ssml.includes("Lejla kaže: &quot;Ja &amp; ti&quot; &lt;3 &apos;ok&apos;"));
        assert.ok(ssml.includes(`<voice name="${AZURE_DEFAULT_VOICES.female}">`));
        assert.ok(ssml.includes(`rate="${AZURE_PROSODY.happy.rate}"`));
        // Samo oznake speak, voice i prosody (otvaranje i zatvaranje), nijedan znak „<” iz teksta
        assert.equal((ssml.match(/</g) ?? []).length, 6);
    });
});
