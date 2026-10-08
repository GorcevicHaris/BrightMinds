// lib/validation.ts — provera ulaza koju dele API rute i forme.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    APP_TIME_ZONE,
    asInt,
    asIntArray,
    asNumber,
    asTrimmedString,
    dateOnlyInTimeZone,
    escapeLikePattern,
    isBlank,
    isEmail,
    isPhone,
    isRecord,
    isValidVisualPin,
    normalizeEmail,
    normalizeVisualPin,
    oneOf,
    parseDateOnly,
    shiftDateOnly,
} from "@/lib/validation";

describe("isRecord and isBlank", () => {
    it("accepts plain objects and rejects arrays, null and primitives", () => {
        assert.equal(isRecord({}), true);
        assert.equal(isRecord({ a: 1 }), true);
        assert.equal(isRecord([]), false);
        assert.equal(isRecord(null), false);
        assert.equal(isRecord("x"), false);
        assert.equal(isRecord(undefined), false);
    });

    it("treats undefined, null and whitespace-only strings as blank, but not 0 or false", () => {
        assert.equal(isBlank(undefined), true);
        assert.equal(isBlank(null), true);
        assert.equal(isBlank("  \n"), true);
        assert.equal(isBlank("a"), false);
        assert.equal(isBlank(0), false);
        assert.equal(isBlank(false), false);
    });
});

describe("asTrimmedString", () => {
    it("trims and returns a string whose trimmed length is in range", () => {
        assert.equal(asTrimmedString("  Ana  ", { min: 1, max: 3 }), "Ana");
        assert.equal(asTrimmedString("", { max: 3 }), "");
    });

    it("returns null when the trimmed text is too short or too long", () => {
        assert.equal(asTrimmedString("   ", { min: 1, max: 3 }), null);
        assert.equal(asTrimmedString("Anja", { min: 1, max: 3 }), null);
    });

    it("returns null for anything that is not a string", () => {
        assert.equal(asTrimmedString(123, { max: 10 }), null);
        assert.equal(asTrimmedString(null, { max: 10 }), null);
        assert.equal(asTrimmedString(["a"], { max: 10 }), null);
    });
});

describe("oneOf", () => {
    it("returns the value only when it is in the allowed set", () => {
        assert.equal(oneOf("male", ["male", "female"]), "male");
        assert.equal(oneOf("Male", ["male", "female"]), null);
        assert.equal(oneOf(1, ["1"]), null);
        assert.equal(oneOf(undefined, ["male"]), null);
    });
});

describe("email", () => {
    it("accepts ordinary addresses", () => {
        assert.equal(isEmail("ana@example.com"), true);
        assert.equal(isEmail("ana.petrovic+test@mail.example.rs"), true);
    });

    it("rejects addresses without a domain dot, with spaces, with consecutive dots or with LIKE wildcards", () => {
        assert.equal(isEmail("ana@localhost"), false);
        assert.equal(isEmail("ana petrovic@example.com"), false);
        assert.equal(isEmail("ana..p@example.com"), false);
        assert.equal(isEmail("ana%@example.com"), false);
        assert.equal(isEmail("a*@example.com"), false);
        assert.equal(isEmail("@example.com"), false);
        assert.equal(isEmail(""), false);
    });

    it("rejects addresses longer than 254 characters", () => {
        assert.equal(isEmail(`${"a".repeat(243)}@example.com`), false);
        assert.equal(isEmail(`${"a".repeat(242)}@example.com`), true);
    });

    it("normalises to trimmed lower case and returns null for invalid input", () => {
        assert.equal(normalizeEmail("  Ana@Example.COM "), "ana@example.com");
        assert.equal(normalizeEmail("not an email"), null);
        assert.equal(normalizeEmail(42), null);
    });
});

describe("isPhone", () => {
    it("accepts common phone formats with 6 to 20 digits", () => {
        assert.equal(isPhone("+381 64 123-45-67"), true);
        assert.equal(isPhone("(011) 123/456"), true);
        assert.equal(isPhone("123456"), true);
    });

    it("rejects letters, too few digits and too many digits", () => {
        assert.equal(isPhone("064-CALL-ME"), false);
        assert.equal(isPhone("12345"), false);
        assert.equal(isPhone("1 2 3 4 5"), false);
        assert.equal(isPhone("1".repeat(21)), false);
    });
});

describe("escapeLikePattern", () => {
    it("escapes %, _ and backslash so the text matches literally", () => {
        assert.equal(escapeLikePattern("50%_off\\now"), "50\\%\\_off\\\\now");
        assert.equal(escapeLikePattern("ana@example.com"), "ana@example.com");
    });
});

describe("asNumber and asInt", () => {
    it("accept numbers and numeric strings inside the range", () => {
        assert.equal(asNumber(1.5), 1.5);
        assert.equal(asNumber(" 2.25 "), 2.25);
        assert.equal(asNumber("-3"), -3);
        assert.equal(asInt("42", { min: 1, max: 100 }), 42);
        assert.equal(asInt(1, { min: 1 }), 1);
    });

    it("return null for values outside the range", () => {
        assert.equal(asNumber(0, { min: 1 }), null);
        assert.equal(asNumber(101, { max: 100 }), null);
        assert.equal(asInt(16, { min: 1, max: 15 }), null);
    });

    it("return null for NaN, infinity, booleans, empty strings and other formats", () => {
        for (const value of [Number.NaN, Number.POSITIVE_INFINITY, true, "", " ", "1e3", "0x10", "1,5", "abc", null, undefined, [1], {}]) {
            assert.equal(asNumber(value), null, String(value));
        }
    });

    it("asInt rejects fractions and unsafe integers", () => {
        assert.equal(asInt(1.5), null);
        assert.equal(asInt("1.5"), null);
        assert.equal(asInt(2 ** 53), null);
    });
});

describe("asIntArray", () => {
    it("returns the integers without duplicates", () => {
        assert.deepEqual(asIntArray([3, "3", 1, 2, 1], { maxItems: 10 }), [3, 1, 2]);
    });

    it("returns null when the list is too short, too long or not a list", () => {
        assert.equal(asIntArray([], { minItems: 1, maxItems: 3 }), null);
        assert.equal(asIntArray([1, 2, 3, 4], { maxItems: 3 }), null);
        assert.equal(asIntArray("1,2", { maxItems: 3 }), null);
    });

    it("returns null when any item is not an integer in range", () => {
        assert.equal(asIntArray([1, "x"], { maxItems: 3 }), null);
        assert.equal(asIntArray([1, 0], { maxItems: 3, min: 1 }), null);
        assert.equal(asIntArray([1, 2.5], { maxItems: 3 }), null);
    });
});

describe("parseDateOnly", () => {
    it("accepts a real calendar date in the form YYYY-MM-DD", () => {
        assert.equal(parseDateOnly("2020-06-15"), "2020-06-15");
        assert.equal(parseDateOnly(" 2024-02-29 "), "2024-02-29");
    });

    it("rejects dates that do not exist", () => {
        assert.equal(parseDateOnly("2024-02-31"), null);
        assert.equal(parseDateOnly("2023-02-29"), null);
        assert.equal(parseDateOnly("2020-13-01"), null);
        assert.equal(parseDateOnly("2020-00-10"), null);
    });

    it("rejects other formats and non-strings", () => {
        assert.equal(parseDateOnly("15.06.2020"), null);
        assert.equal(parseDateOnly("2020-6-15"), null);
        assert.equal(parseDateOnly("2020-06-15T00:00:00Z"), null);
        assert.equal(parseDateOnly(20200615), null);
        assert.equal(parseDateOnly(null), null);
    });
});

describe("dateOnlyInTimeZone", () => {
    it("uses Europe/Belgrade by default", () => {
        assert.equal(APP_TIME_ZONE, "Europe/Belgrade");
    });

    it("moves late-evening UTC times to the next Belgrade day (winter, UTC+1)", () => {
        assert.equal(dateOnlyInTimeZone(new Date("2026-01-10T22:59:59Z")), "2026-01-10");
        assert.equal(dateOnlyInTimeZone(new Date("2026-01-10T23:00:00Z")), "2026-01-11");
    });

    it("moves late-evening UTC times to the next Belgrade day (summer, UTC+2)", () => {
        assert.equal(dateOnlyInTimeZone(new Date("2026-07-10T21:59:59Z")), "2026-07-10");
        assert.equal(dateOnlyInTimeZone(new Date("2026-07-10T22:00:00Z")), "2026-07-11");
    });

    it("can compute the day in another time zone", () => {
        const instant = new Date("2026-01-01T03:00:00Z");
        assert.equal(dateOnlyInTimeZone(instant, "UTC"), "2026-01-01");
        assert.equal(dateOnlyInTimeZone(instant, "America/New_York"), "2025-12-31");
    });
});

describe("shiftDateOnly", () => {
    it("moves a date by days across month and year boundaries", () => {
        assert.equal(shiftDateOnly("2026-01-01", { days: -1 }), "2025-12-31");
        assert.equal(shiftDateOnly("2024-02-28", { days: 1 }), "2024-02-29");
        assert.equal(shiftDateOnly("2026-03-29", { days: 1 }), "2026-03-30");
        assert.equal(shiftDateOnly("2026-10-08", { days: -29 }), "2026-09-09");
    });

    it("moves a date by years", () => {
        assert.equal(shiftDateOnly("2026-10-08", { years: -25 }), "2001-10-08");
        assert.equal(shiftDateOnly("2024-02-29", { years: 1 }), "2025-03-01");
    });

    it("returns the same date when nothing is shifted", () => {
        assert.equal(shiftDateOnly("2026-10-08", {}), "2026-10-08");
    });
});

describe("visual PIN", () => {
    it("accepts one picture from each category, in category order", () => {
        assert.equal(normalizeVisualPin("dog,pizza,car,pepsi"), "dog,pizza,car,pepsi");
        assert.equal(isValidVisualPin("dog,pizza,car,pepsi"), true);
    });

    it("removes spaces around the pictures", () => {
        assert.equal(normalizeVisualPin(" dog, pizza ,car,pepsi "), "dog,pizza,car,pepsi");
    });

    it("rejects pictures in the wrong order or from the wrong category", () => {
        assert.equal(normalizeVisualPin("pizza,dog,car,pepsi"), null);
        assert.equal(normalizeVisualPin("dog,dog,car,pepsi"), null);
    });

    it("rejects too few or too many pictures, unknown pictures and non-strings", () => {
        assert.equal(normalizeVisualPin("dog,pizza,car"), null);
        assert.equal(normalizeVisualPin("dog,pizza,car,pepsi,dog"), null);
        assert.equal(normalizeVisualPin("dog,pizza,car,water"), null);
        assert.equal(normalizeVisualPin("Dog,pizza,car,pepsi"), null);
        assert.equal(normalizeVisualPin(""), null);
        assert.equal(normalizeVisualPin(1234), null);
        assert.equal(normalizeVisualPin(["dog", "pizza", "car", "pepsi"]), null);
        assert.equal(isValidVisualPin(null), false);
    });

    it("rejects input longer than 200 characters without looking at it", () => {
        assert.equal(normalizeVisualPin(`dog,pizza,car,pepsi${" ".repeat(200)}`), null);
    });
});
