// lib/reminder.ts — blag dnevni podsetnik (vreme i dani po Beogradu).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_REMINDER, type ReminderSettings } from "@/lib/childSettings";
import { isToday, localWeekdayAndTime, parentReminderText, playedTodayWindowStart, reminderDue } from "@/lib/reminder";

const on: ReminderSettings = { enabled: true, time: "17:00", days: [1, 2, 3, 4, 5] };
// Sreda, 18. 3. 2026: Beograd je tada UTC+1 (zimsko vreme)
const at = (iso: string) => new Date(iso);

describe("localWeekdayAndTime", () => {
    it("reads the weekday and the time in Belgrade, not in the server's zone", () => {
        assert.deepEqual(localWeekdayAndTime(at("2026-03-18T16:30:00Z")), { weekday: 3, time: "17:30" });
        // Nedelja 23:30 UTC je već ponedeljak u Beogradu
        assert.deepEqual(localWeekdayAndTime(at("2026-03-22T23:30:00Z")), { weekday: 1, time: "00:30" });
        // Leto (UTC+2)
        assert.deepEqual(localWeekdayAndTime(at("2026-07-01T15:00:00Z")), { weekday: 3, time: "17:00" });
    });
});

describe("reminderDue", () => {
    it("is off by default", () => {
        assert.equal(reminderDue(DEFAULT_REMINDER, false, at("2026-03-18T20:00:00Z")), false);
    });

    it("starts at the chosen time on a chosen day, when the child has not played today", () => {
        assert.equal(reminderDue(on, false, at("2026-03-18T15:59:00Z")), false, "16:59");
        assert.equal(reminderDue(on, false, at("2026-03-18T16:00:00Z")), true, "17:00");
        assert.equal(reminderDue(on, false, at("2026-03-18T22:30:00Z")), true, "23:30");
    });

    it("stays quiet when the child already played, and on days that were not chosen", () => {
        assert.equal(reminderDue(on, true, at("2026-03-18T18:00:00Z")), false);
        assert.equal(reminderDue(on, false, at("2026-03-21T18:00:00Z")), false, "Saturday");
    });
});

describe("played today", () => {
    it("is decided by the Belgrade calendar day", () => {
        const now = at("2026-03-18T10:00:00Z");
        assert.equal(isToday(at("2026-03-17T23:30:00Z"), now), true, "00:30 in Belgrade");
        assert.equal(isToday(at("2026-03-17T22:30:00Z"), now), false, "23:30 yesterday in Belgrade");
        assert.equal(isToday(null, now), false);
    });

    it("looks back far enough to cover the whole day", () => {
        const now = at("2026-03-18T22:59:00Z");
        assert.ok(playedTodayWindowStart(now) <= at("2026-03-17T23:00:00Z"));
    });
});

describe("parentReminderText", () => {
    it("uses the right form for the child's gender", () => {
        assert.equal(parentReminderText("Lejla", "female"), "Lejla danas još nije vežbala.");
        assert.equal(parentReminderText("Luka", "male"), "Luka danas još nije vežbao.");
        assert.equal(parentReminderText("Alex", "other"), "Alex danas još nije vežbao/la.");
    });
});
