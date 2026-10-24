// lib/rateLimit.ts — ograničavač pokušaja sa kliznim prozorom. Vreme se prosleđuje kao
// treći argument `takeAttempt`, pa testovi ne čekaju i ne diraju sat.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getClientIp, resetRateLimit, takeAttempt, takeAttempts, type RateLimitRule } from "@/lib/rateLimit";

const RULE: RateLimitRule = { limit: 3, windowMs: 60_000 };
const START = 1_000_000;

let sequence = 0;
/** Svaki test dobija svoj ključ: stanje ograničavača je zajedničko za ceo proces. */
const freshKey = () => `test:${(sequence += 1)}`;

function requestWith(headers: Record<string, string>): Request {
    return new Request("http://localhost/api/test", { headers });
}

describe("takeAttempt", () => {
    it("allows attempts up to the limit and refuses the next one", () => {
        const key = freshKey();
        for (let index = 0; index < RULE.limit; index += 1) {
            const attempt = takeAttempt(key, RULE, START + index);
            assert.equal(attempt.allowed, true);
            assert.equal(attempt.retryAfterSec, 0);
        }
        assert.equal(takeAttempt(key, RULE, START + 10).allowed, false);
    });

    it("tells a refused caller how many seconds remain until the oldest attempt expires", () => {
        const key = freshKey();
        takeAttempt(key, RULE, START);
        takeAttempt(key, RULE, START + 10_000);
        takeAttempt(key, RULE, START + 20_000);
        assert.equal(takeAttempt(key, RULE, START + 20_000).retryAfterSec, 40);
        assert.equal(takeAttempt(key, RULE, START + 59_001).retryAfterSec, 1);
        assert.equal(takeAttempt(key, RULE, START + 59_999).retryAfterSec, 1);
    });

    it("allows a new attempt as soon as the oldest one leaves the window", () => {
        const key = freshKey();
        takeAttempt(key, RULE, START);
        takeAttempt(key, RULE, START + 10_000);
        takeAttempt(key, RULE, START + 20_000);
        assert.equal(takeAttempt(key, RULE, START + 59_999).allowed, false);
        assert.equal(takeAttempt(key, RULE, START + 60_000).allowed, true);
    });

    it("frees only one slot at a time as the window slides", () => {
        const key = freshKey();
        takeAttempt(key, RULE, START);
        takeAttempt(key, RULE, START + 10_000);
        takeAttempt(key, RULE, START + 20_000);
        assert.equal(takeAttempt(key, RULE, START + 60_000).allowed, true);
        assert.equal(takeAttempt(key, RULE, START + 60_001).allowed, false);
        assert.equal(takeAttempt(key, RULE, START + 70_000).allowed, true);
    });

    it("does not let refused attempts extend the lock", () => {
        const key = freshKey();
        for (let index = 0; index < RULE.limit; index += 1) takeAttempt(key, RULE, START);
        for (let second = 1; second < 60; second += 1) {
            assert.equal(takeAttempt(key, RULE, START + second * 1000).allowed, false);
        }
        assert.equal(takeAttempt(key, RULE, START + 60_000).allowed, true);
    });

    it("forgets everything once the whole window has passed", () => {
        const key = freshKey();
        for (let index = 0; index < RULE.limit; index += 1) takeAttempt(key, RULE, START);
        for (let index = 0; index < RULE.limit; index += 1) {
            assert.equal(takeAttempt(key, RULE, START + 120_000).allowed, true);
        }
    });

    it("counts each key separately", () => {
        const first = freshKey();
        const second = freshKey();
        for (let index = 0; index < RULE.limit; index += 1) takeAttempt(first, RULE, START);
        assert.equal(takeAttempt(first, RULE, START).allowed, false);
        assert.equal(takeAttempt(second, RULE, START).allowed, true);
    });

    it("uses the current time when no time is passed", () => {
        const key = freshKey();
        const rule = { limit: 1, windowMs: 60_000 };
        assert.equal(takeAttempt(key, rule).allowed, true);
        const refused = takeAttempt(key, rule);
        assert.equal(refused.allowed, false);
        assert.ok(refused.retryAfterSec >= 59 && refused.retryAfterSec <= 60);
    });
});

describe("refund", () => {
    it("gives the attempt back, so only failed attempts count", () => {
        const key = freshKey();
        for (let index = 0; index < 10; index += 1) {
            const attempt = takeAttempt(key, RULE, START + index);
            assert.equal(attempt.allowed, true);
            attempt.refund();
        }
    });

    it("gives back only one attempt even when called twice", () => {
        const key = freshKey();
        takeAttempt(key, RULE, START);
        takeAttempt(key, RULE, START);
        const third = takeAttempt(key, RULE, START);
        third.refund();
        third.refund();
        assert.equal(takeAttempt(key, RULE, START + 1).allowed, true);
        assert.equal(takeAttempt(key, RULE, START + 2).allowed, false);
    });

    it("does nothing for an attempt that was refused", () => {
        const key = freshKey();
        for (let index = 0; index < RULE.limit; index += 1) takeAttempt(key, RULE, START);
        const refused = takeAttempt(key, RULE, START + 1);
        refused.refund();
        assert.equal(takeAttempt(key, RULE, START + 2).allowed, false);
    });
});

describe("resetRateLimit", () => {
    it("clears all recorded attempts for the key", () => {
        const key = freshKey();
        for (let index = 0; index < RULE.limit; index += 1) takeAttempt(key, RULE, START);
        resetRateLimit(key);
        assert.equal(takeAttempt(key, RULE, START + 1).allowed, true);
    });
});

describe("memory bound", () => {
    it("drops expired keys, then the oldest ones, once more than 10 000 keys are tracked", () => {
        const store = (globalThis as { __brightMindsRateLimit?: Map<string, unknown> }).__brightMindsRateLimit;
        assert.ok(store, "the limiter keeps its state on globalThis");
        store.clear();

        const shortRule = { limit: 1, windowMs: 1000 };
        for (let index = 0; index < 6000; index += 1) takeAttempt(`expired:${index}`, shortRule, START);
        for (let index = 0; index < 4000; index += 1) takeAttempt(`live:${index}`, RULE, START + 5000);
        assert.equal(store.size, 10_000);

        // 10 001. ključ pokreće čišćenje: 6000 isteklih nestaje, živi ostaju
        takeAttempt("live:trigger", RULE, START + 5000);
        assert.equal(store.size, 4001);
        assert.equal(store.has("expired:0"), false);
        assert.equal(store.has("live:0"), true);

        // Sve živo, a i dalje previše: izbacuju se najstariji ključevi
        for (let index = 0; index < 6000; index += 1) takeAttempt(`flood:${index}`, RULE, START + 5000);
        assert.equal(store.size, 10_000);
        assert.equal(store.has("live:0"), false);
        assert.equal(store.has("flood:5999"), true);
        store.clear();
    });
});

describe("getClientIp", () => {
    it("takes the first address from x-forwarded-for", () => {
        assert.equal(getClientIp(requestWith({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" })), "203.0.113.7");
    });

    it("falls back to x-real-ip, then to unknown", () => {
        assert.equal(getClientIp(requestWith({ "x-real-ip": " 198.51.100.4 " })), "198.51.100.4");
        assert.equal(getClientIp(requestWith({})), "unknown");
        assert.equal(getClientIp(requestWith({ "x-forwarded-for": " , 10.0.0.1", "x-real-ip": "198.51.100.4" })), "198.51.100.4");
    });

    it("cuts an oversized header value to 64 characters", () => {
        assert.equal(getClientIp(requestWith({ "x-forwarded-for": "9".repeat(500) })).length, 64);
    });
});

describe("takeAttempts", () => {
    const LONG: RateLimitRule = { limit: 5, windowMs: 600_000 };

    it("is allowed only while every rule allows it", () => {
        const short = freshKey();
        const long = freshKey();
        const entries = [
            { key: short, rule: RULE },
            { key: long, rule: LONG },
        ];
        for (let index = 0; index < RULE.limit; index += 1) assert.equal(takeAttempts(entries, START + index).allowed, true);
        const refused = takeAttempts(entries, START + 10);
        assert.equal(refused.allowed, false);
        // Odbijen zahtev ne troši duži prozor: od pet su potrošena samo tri
        assert.equal(takeAttempt(long, LONG, START + 11).allowed, true);
        assert.equal(takeAttempt(long, LONG, START + 12).allowed, true);
        assert.equal(takeAttempt(long, LONG, START + 13).allowed, false);
    });

    it("reports the longest wait among the rules that refuse", () => {
        const short = freshKey();
        const long = freshKey();
        for (let index = 0; index < LONG.limit; index += 1) takeAttempt(long, LONG, START);
        for (let index = 0; index < RULE.limit; index += 1) takeAttempt(short, RULE, START);
        const refused = takeAttempts([{ key: short, rule: RULE }, { key: long, rule: LONG }], START + 1000);
        assert.equal(refused.allowed, false);
        assert.equal(refused.retryAfterSec, 599);
    });

    it("refunds every rule at once", () => {
        const first = freshKey();
        const second = freshKey();
        const entries = [
            { key: first, rule: RULE },
            { key: second, rule: RULE },
        ];
        for (let index = 0; index < RULE.limit * 3; index += 1) takeAttempts(entries, START + index).refund();
        assert.equal(takeAttempt(first, RULE, START + 100).allowed, true);
        assert.equal(takeAttempt(second, RULE, START + 100).allowed, true);
    });
});
