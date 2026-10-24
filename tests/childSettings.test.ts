// lib/childSettings.ts — uzrast, preporuke po uzrasnoj grupi i čišćenje sačuvanih podešavanja.
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
    AGE_BANDS,
    BAND_PRESETS,
    FALLBACK_SETTINGS,
    MAX_PLAN_GAMES,
    ageInYears,
    bandForAge,
    defaultSettings,
    resolveSettings,
    sanitizeSettings,
    type AgeBand,
} from "@/lib/childSettings";
import { GAMES } from "@/lib/games";

/** Lokalni datum (zona procesa testa je UTC — videti tests/setup/register.mjs). */
const day = (year: number, month: number, date: number, hour = 12) => new Date(year, month - 1, date, hour);

/** Datum rođenja deteta koje je 1. januara ove godine napunilo `years` godina. */
const bornYearsAgo = (years: number) => `${new Date().getFullYear() - years}-01-01`;

describe("ageInYears", () => {
    it("counts a year only once the birthday has arrived", () => {
        assert.equal(ageInYears("2020-06-15", day(2026, 6, 14)), 5);
        assert.equal(ageInYears("2020-06-15", day(2026, 6, 15)), 6);
        assert.equal(ageInYears("2020-06-15", day(2026, 6, 16)), 6);
    });

    it("uses the Belgrade calendar, wherever the server or device clock is", () => {
        // 14. jun 22:30 UTC je već 15. jun 00:30 u Beogradu — rođendan je stigao
        assert.equal(ageInYears("2020-06-15", new Date("2026-06-14T22:30:00Z")), 6);
        // 14. jun 21:30 UTC je 23:30 istog dana u Beogradu — još nije
        assert.equal(ageInYears("2020-06-15", new Date("2026-06-14T21:30:00Z")), 5);
    });

    it("handles birthdays in an earlier and in a later month of the current year", () => {
        assert.equal(ageInYears("2020-03-31", day(2026, 4, 1)), 6);
        assert.equal(ageInYears("2020-12-01", day(2026, 4, 1)), 5);
    });

    it("is 0 for a baby born today or earlier this year", () => {
        assert.equal(ageInYears("2026-06-15", day(2026, 6, 15)), 0);
        assert.equal(ageInYears("2026-01-01", day(2026, 12, 31)), 0);
    });

    it("turns a child born on 29 February one year older on 1 March in common years", () => {
        assert.equal(ageInYears("2020-02-29", day(2025, 2, 28)), 4);
        assert.equal(ageInYears("2020-02-29", day(2025, 3, 1)), 5);
        assert.equal(ageInYears("2020-02-29", day(2024, 2, 29)), 4);
    });

    it("returns null when the date of birth is missing, invalid or in the future", () => {
        assert.equal(ageInYears(null), null);
        assert.equal(ageInYears(undefined), null);
        assert.equal(ageInYears(""), null);
        assert.equal(ageInYears("not-a-date"), null);
        assert.equal(ageInYears("2027-01-01", day(2026, 6, 15)), null);
    });

    describe("in a time zone west of UTC", () => {
        afterEach(() => {
            process.env.TZ = "UTC";
        });

        it(
            "does not count the birthday a day early",
            () => {
                process.env.TZ = "America/New_York";
                // Lokalno podne 14. juna: dan PRE šestog rođendana
                assert.equal(ageInYears("2020-06-15", new Date(2026, 5, 14, 12)), 5);
            }
        );
    });
});

describe("bandForAge", () => {
    it("puts ages up to 4 in the young band and 5 in the middle band", () => {
        assert.equal(bandForAge(0), "young");
        assert.equal(bandForAge(3), "young");
        assert.equal(bandForAge(4), "young");
        assert.equal(bandForAge(5), "middle");
    });

    it("puts 6 in the middle band and 7 and above in the older band", () => {
        assert.equal(bandForAge(6), "middle");
        assert.equal(bandForAge(7), "older");
        assert.equal(bandForAge(8), "older");
        assert.equal(bandForAge(12), "older");
    });

    it("falls back to the middle band when the age is unknown", () => {
        assert.equal(bandForAge(null), "middle");
    });
});

describe("defaultSettings", () => {
    it("keeps sudden loud sounds off for every age band", () => {
        for (const band of AGE_BANDS) assert.equal(defaultSettings(band).loudSounds, false, band);
    });

    it("turns the mood question off for the young band and uses three faces for the others", () => {
        assert.equal(defaultSettings("young").moodCheck, "off");
        assert.equal(defaultSettings("middle").moodCheck, "three");
        assert.equal(defaultSettings("older").moodCheck, "three");
    });

    it("limits daily play to 10, 15 and 20 minutes for young, middle and older", () => {
        assert.equal(defaultSettings("young").sessionMinutes, 10);
        assert.equal(defaultSettings("middle").sessionMinutes, 15);
        assert.equal(defaultSettings("older").sessionMinutes, 20);
    });

    it("offers the hint after one miss for the young band and after two for the others", () => {
        assert.equal(defaultSettings("young").hintAfter, 1);
        assert.equal(defaultSettings("middle").hintAfter, 2);
        assert.equal(defaultSettings("older").hintAfter, 2);
    });

    it("uses capital letters for children who are still learning letters, not for the older band", () => {
        assert.equal(defaultSettings("young").uppercase, true);
        assert.equal(defaultSettings("middle").uppercase, true);
        assert.equal(defaultSettings("older").uppercase, false);
    });

    it("starts with Latin script, sound on, no fixed band, age-based choices and an empty plan", () => {
        for (const band of AGE_BANDS) {
            const settings = defaultSettings(band);
            assert.equal(settings.band, null);
            assert.equal(settings.script, "latin");
            assert.equal(settings.voice, true);
            assert.equal(settings.effects, true);
            assert.equal(settings.gameSounds, true);
            assert.equal(settings.volume, 0.7);
            assert.equal(settings.reduceMotion, false);
            assert.equal(settings.maxChoices, 0);
            assert.deepEqual(settings.plan, []);
        }
    });
});

describe("sanitizeSettings", () => {
    it("returns the band defaults for anything that is not an object", () => {
        for (const raw of [null, undefined, "x", 5, true, [], [{ script: "cyrillic" }]]) {
            assert.deepEqual(sanitizeSettings(raw, "young"), defaultSettings("young"));
        }
    });

    it("drops unknown keys", () => {
        const result = sanitizeSettings({ script: "cyrillic", isAdmin: true, extra: { a: 1 }, Volume: 1 }, "middle");
        assert.deepEqual(Object.keys(result).sort(), Object.keys(defaultSettings("middle")).sort());
        assert.equal(result.script, "cyrillic");
    });

    it("keeps every valid value exactly as sent", () => {
        const valid = {
            band: "older" as AgeBand,
            script: "cyrillic",
            uppercase: true,
            voice: false,
            effects: false,
            gameSounds: false,
            loudSounds: true,
            volume: 0.4,
            reduceMotion: true,
            avatar: false,
            maxChoices: 2,
            hintAfter: 0,
            waitHint: true,
            sessionMinutes: 30,
            moodCheck: "off",
            plan: ["emotions", "shapes"],
        };
        assert.deepEqual(sanitizeSettings(valid, "young"), valid);
    });

    it("replaces invalid values with the defaults for the child's age band", () => {
        const result = sanitizeSettings(
            {
                script: "glagolitic",
                uppercase: "yes",
                voice: 1,
                loudSounds: "true",
                maxChoices: 5,
                hintAfter: 3,
                sessionMinutes: 12,
                moodCheck: "five",
                avatar: null,
            },
            "young"
        );
        assert.deepEqual(result, defaultSettings("young"));
    });

    it("accepts 0 as a real choice for hints, choices and the time limit", () => {
        const result = sanitizeSettings({ hintAfter: 0, maxChoices: 0, sessionMinutes: 0 }, "young");
        assert.equal(result.hintAfter, 0);
        assert.equal(result.maxChoices, 0);
        assert.equal(result.sessionMinutes, 0);
    });

    it("takes missing values from the explicitly chosen band, not from the age", () => {
        const result = sanitizeSettings({ band: "young" }, "older");
        assert.equal(result.band, "young");
        assert.equal(result.sessionMinutes, 10);
        assert.equal(result.moodCheck, "off");
        assert.equal(result.uppercase, true);
    });

    it("ignores an unknown band", () => {
        const result = sanitizeSettings({ band: "toddler" }, "older");
        assert.equal(result.band, null);
        assert.equal(result.sessionMinutes, 20);
    });

    it("clamps the volume to 0.2–1", () => {
        assert.equal(sanitizeSettings({ volume: 5 }, "middle").volume, 1);
        assert.equal(sanitizeSettings({ volume: 1 }, "middle").volume, 1);
        assert.equal(sanitizeSettings({ volume: 0 }, "middle").volume, 0.2);
        assert.equal(sanitizeSettings({ volume: -3 }, "middle").volume, 0.2);
        assert.equal(sanitizeSettings({ volume: 0.2 }, "middle").volume, 0.2);
    });

    it("rounds the volume to one decimal", () => {
        assert.equal(sanitizeSettings({ volume: 0.66 }, "middle").volume, 0.7);
        assert.equal(sanitizeSettings({ volume: 0.44 }, "middle").volume, 0.4);
        assert.equal(sanitizeSettings({ volume: 0.96 }, "middle").volume, 1);
    });

    it("uses the default volume when the value is not a finite number", () => {
        for (const volume of ["0.5", Number.NaN, Number.POSITIVE_INFINITY, null, {}]) {
            assert.equal(sanitizeSettings({ volume }, "middle").volume, 0.7);
        }
    });

    it("keeps only known game ids in the plan, without repeats, in the order given", () => {
        const result = sanitizeSettings({ plan: ["memory", "nope", "memory", 5, null, "shapes"] }, "middle");
        assert.deepEqual(result.plan, ["memory", "shapes"]);
    });

    it("cuts the plan to four games", () => {
        const everyGame = GAMES.map((game) => game.id);
        const result = sanitizeSettings({ plan: everyGame }, "middle");
        assert.equal(MAX_PLAN_GAMES, 4);
        assert.deepEqual(result.plan, everyGame.slice(0, 4));
    });

    it("uses an empty plan when the plan is not a list", () => {
        assert.deepEqual(sanitizeSettings({ plan: "shapes" }, "middle").plan, []);
        assert.deepEqual(sanitizeSettings({ plan: { 0: "shapes" } }, "middle").plan, []);
    });

    it("returns the same object when its own output is sanitised again", () => {
        const once = sanitizeSettings({ band: "young", volume: 0.33, plan: ["social", "x", "social"], maxChoices: 6 }, "older");
        assert.deepEqual(sanitizeSettings(once, "older"), once);
        assert.deepEqual(sanitizeSettings(once, "middle"), once);
    });
});

describe("resolveSettings", () => {
    it("derives the active band from the date of birth", () => {
        assert.equal(resolveSettings({}, bornYearsAgo(4)).activeBand, "young");
        assert.equal(resolveSettings({}, bornYearsAgo(5)).activeBand, "middle");
        assert.equal(resolveSettings({}, bornYearsAgo(6)).activeBand, "middle");
        assert.equal(resolveSettings({}, bornYearsAgo(7)).activeBand, "older");
    });

    it("takes the choice limit from the age band when the adult did not set one", () => {
        assert.equal(resolveSettings({}, bornYearsAgo(4)).choiceLimit, 3);
        assert.equal(resolveSettings({}, bornYearsAgo(6)).choiceLimit, 4);
        assert.equal(resolveSettings({}, bornYearsAgo(8)).choiceLimit, 6);
    });

    it("uses the adult's explicit choice limit over the age band", () => {
        assert.equal(resolveSettings({ maxChoices: 2 }, bornYearsAgo(8)).choiceLimit, 2);
        assert.equal(resolveSettings({ maxChoices: 6 }, bornYearsAgo(3)).choiceLimit, 6);
    });

    it("lets an explicit band override the band from the date of birth", () => {
        const resolved = resolveSettings({ band: "young" }, bornYearsAgo(8));
        assert.equal(resolved.band, "young");
        assert.equal(resolved.activeBand, "young");
        assert.equal(resolved.preset, BAND_PRESETS.young);
        assert.equal(resolved.choiceLimit, 3);
        assert.equal(resolved.sessionMinutes, 10);
    });

    it("uses the middle band when the date of birth is unknown", () => {
        for (const dateOfBirth of [null, undefined, "garbage"]) {
            const resolved = resolveSettings(null, dateOfBirth);
            assert.equal(resolved.activeBand, "middle");
            assert.equal(resolved.choiceLimit, 4);
        }
        assert.deepEqual(FALLBACK_SETTINGS, resolveSettings(null, null));
    });
});

describe("band presets", () => {
    it("grow with age: more choices, pairs, emotions and rounds", () => {
        const { young, middle, older } = BAND_PRESETS;
        for (const key of ["maxChoices", "memoryMaxPairs", "emotionCount", "maxRounds"] as const) {
            assert.ok(young[key] < middle[key] && middle[key] < older[key], key);
        }
    });

    it("show points only to the older band", () => {
        assert.deepEqual(
            AGE_BANDS.map((band) => BAND_PRESETS[band].showPoints),
            [false, false, true]
        );
    });
});

describe("waitHint", () => {
    it("is on for the youngest and off for older children by default, and survives sanitizing", async () => {
        const { defaultSettings, sanitizeSettings } = await import("@/lib/childSettings");
        assert.equal(defaultSettings("young").waitHint, true);
        assert.equal(defaultSettings("middle").waitHint, false);
        assert.equal(defaultSettings("older").waitHint, false);
        assert.equal(sanitizeSettings({ waitHint: true }, "middle").waitHint, true);
        assert.equal(sanitizeSettings({ waitHint: "yes" }, "young").waitHint, true);
    });
});

describe("playAge (age used to order the games)", () => {
    const born = (yearsAgo: number) => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - yearsAgo, date.getMonth(), Math.max(1, date.getDate() - 2));
        return date.toISOString().slice(0, 10);
    };

    it("is the child's age when the parent did not pick an age group", () => {
        assert.equal(resolveSettings({}, born(5)).playAge, 5);
        assert.equal(resolveSettings({}, null).playAge, null);
    });

    it("stays within the age group the parent picked", () => {
        assert.equal(resolveSettings({ band: "young" }, born(8)).playAge, 4);
        assert.equal(resolveSettings({ band: "older" }, born(5)).playAge, 7);
        assert.equal(resolveSettings({ band: "middle" }, born(6)).playAge, 6);
        assert.equal(resolveSettings({ band: "middle" }, null).playAge, 5);
    });
});
