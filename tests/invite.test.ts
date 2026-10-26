// lib/invite.ts — poziv za igru sa drugom na drugom uređaju: kod, rokovi, poruke kanala.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_LEVEL } from "@/lib/games";
import {
    INVITE_CODE_TTL_MS,
    INVITE_SESSION_TTL_MS,
    REMOTE_GAMES,
    firstNameOnly,
    inviteStatus,
    liveStars,
    nextTogetherLevel,
    normalizeInviteCode,
    parseRemoteState,
    parseStoredInvite,
    randomInviteCode,
} from "@/lib/invite";
import { VISUAL_PIN_CATEGORIES } from "@/lib/visualPinData";

const CODE = VISUAL_PIN_CATEGORIES.map((c) => c.items[0].id).join(",");
const NOW = Date.UTC(2026, 9, 24, 12);
const base = {
    code: CODE,
    channelKey: "abcdefghijklmnopqrstuvwx",
    expiresAt: new Date(NOW + INVITE_CODE_TTL_MS).toISOString(),
    hostFirstName: "Lejla",
    game: "counting",
    level: 3,
    createdAt: new Date(NOW).toISOString(),
};

describe("kod od sličica", () => {
    it("accepts exactly one picture per group, in order", () => {
        assert.equal(normalizeInviteCode(CODE), CODE);
        assert.equal(normalizeInviteCode(CODE.split(",")), CODE);
        assert.equal(normalizeInviteCode(CODE.split(",").reverse()), null);
        assert.equal(normalizeInviteCode("dog"), null);
        assert.equal(normalizeInviteCode(42), null);
    });

    it("random codes are always valid", () => {
        let seed = 7;
        const rand = (n: number) => (seed = (seed * 31 + 11) % 997) % n;
        for (let i = 0; i < 50; i++) assert.ok(normalizeInviteCode(randomInviteCode(rand)));
    });

    it("keeps only the first name", () => {
        assert.equal(firstNameOnly("  Amar Hasan "), "Amar");
        assert.equal(firstNameOnly(""), null);
        assert.equal(firstNameOnly(null), null);
    });

    it("offers every game except the sound game", () => {
        assert.ok(!REMOTE_GAMES.includes("sound-to-image"));
        assert.ok(REMOTE_GAMES.includes("memory") && REMOTE_GAMES.includes("coloring"));
    });
});

describe("parseStoredInvite / inviteStatus", () => {
    it("waits until the code expires, silently", () => {
        const invite = parseStoredInvite(base)!;
        assert.equal(inviteStatus(invite, NOW), "waiting");
        assert.equal(inviteStatus(invite, NOW + INVITE_CODE_TTL_MS), "expired");
    });

    it("after the friend joins the code is gone and the session lasts a few hours", () => {
        const joined = parseStoredInvite({ ...base, code: null, guest: { firstName: "Amar", companion: { kind: "dog", skin: null, wear: {} } }, joinedAt: new Date(NOW).toISOString() })!;
        assert.equal(joined.code, null);
        assert.equal(inviteStatus(joined, NOW + INVITE_CODE_TTL_MS * 3), "joined");
        assert.equal(inviteStatus(joined, NOW + INVITE_SESSION_TTL_MS), "expired");
    });

    it("drops broken invites", () => {
        for (const broken of [null, "x", { ...base, channelKey: "short" }, { ...base, game: "nope" }, { ...base, level: MAX_LEVEL + 1 }, { ...base, code: "dog" }, { ...base, expiresAt: "kad" }]) {
            assert.equal(parseStoredInvite(broken), null, JSON.stringify(broken));
        }
        // Iskorišćen kod bez druga = istekao
        assert.equal(inviteStatus(parseStoredInvite({ ...base, code: null })!, NOW), "expired");
    });
});

describe("poruke kanala", () => {
    it("clamps everything a friend's device sends", () => {
        assert.deepEqual(parseRemoteState({ phase: "playing", done: -3, round: 500, total: 6, stars: 9, sessionStars: 1e9, correct: "x", advance: "yes", extra: "<b>" }), {
            phase: "playing",
            done: 0,
            round: 6,
            total: 6,
            stars: 3,
            sessionStars: 3000,
            correct: 0,
            advance: false,
            secs: 0,
        });
        assert.equal(parseRemoteState({ phase: "hack" }), null);
        assert.equal(parseRemoteState("x"), null);
    });

    it("live stars grow with correct answers and end where the level result ends", () => {
        assert.equal(liveStars(true, 0, 1, 6), 0);
        assert.ok(liveStars(true, 3, 4, 6) >= 1);
        assert.equal(liveStars(true, 6, 6, 6), 3);
        assert.equal(liveStars(false, 0, 1, 4), 0);
        assert.equal(liveStars(false, 0, 4, 4), 2);
        assert.equal(liveStars(true, 0, 0, 0), 0);
    });

    it("moves on together only when both passed the level", () => {
        assert.equal(nextTogetherLevel(3, true, true), 4);
        assert.equal(nextTogetherLevel(3, true, false), 3);
        assert.equal(nextTogetherLevel(3, false, true), 3);
        assert.equal(nextTogetherLevel(3, true, null), 4, "drug je otišao: odlučuje samo svoj rezultat");
        assert.equal(nextTogetherLevel(MAX_LEVEL, true, true), MAX_LEVEL);
    });
});
