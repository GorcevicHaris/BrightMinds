// Ulog u dvoboju (lib/duelStakes.ts, app/api/_lib/duels.ts, /invite/result, /duel, /duel/result):
// nikad ispod nule, obračun jednom (idempotentno), samo kad se oba uređaja slože, nerešeno bez
// prenosa, podešavanje roditelja kao gornja granica, stari podaci ostaju ispravni, račun novčića
// i reči na kraju dvoboja.
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { COMPANION_CATALOG } from "@/app/components/avatar3d/manifest";
import { POST as CREATE } from "@/app/api/children/[id]/invite/route";
import { POST as ANSWER } from "@/app/api/children/[id]/invite/answer/route";
import { POST as JOIN } from "@/app/api/children/[id]/invite/join/route";
import { POST as RESULT } from "@/app/api/children/[id]/invite/result/route";
import { POST as LOCAL_START } from "@/app/api/children/[id]/duel/route";
import { POST as LOCAL_RESULT } from "@/app/api/children/[id]/duel/result/route";
import { GET as COMPANION } from "@/app/api/children/[id]/companion/route";
import { GET as GET_SETTINGS } from "@/app/api/children/[id]/settings/route";
import { VersusEnd, type VersusSeat } from "@/app/dashboard/child/[id]/playVersus";
import { sanitizeSettings } from "@/lib/childSettings";
import { COINS_PER_STAR, POINTS_PER_STAR, coinsAvailable, coinsOf, sanitizeCompanion, type CompanionState } from "@/lib/companion";
import {
    DUEL_STAKE,
    DUEL_STAKE_OPTIONS,
    TIE_COINS_LINE,
    agreedOutcome,
    applyDuelLoss,
    applyDuelWin,
    coinsPhrase,
    duelStakeFor,
    duelWinner,
    parseDuelReport,
    stakeLines,
    transferAmount,
    type DuelReport,
} from "@/lib/duelStakes";
import { INVITE_SESSION_TTL_MS, parseStoredInvite } from "@/lib/invite";
import { resetRateLimit } from "@/lib/rateLimit";
import { CHILD_ID, OTHER_CHILD_ID, PARENT, STRANGER, advanceClock, db, idParams, jsonRequest, readJson, resetWorld, seedFamily, signInAsChild, signInAsParent } from "./setup/api";

const HOST = CHILD_ID; // Mila (porodica PARENT)
const GUEST = OTHER_CHILD_ID; // Luka (druga porodica, STRANGER)
const SIBLING = 3; // Amar (porodica PARENT)
const xpFor = (coins: number) => (coins / COINS_PER_STAR) * POINTS_PER_STAR;

const state = (extra: Partial<CompanionState> = {}): CompanionState => ({ kind: "cat", owned: [], wear: {}, spent: 0, v: 1, ...extra });

// ── Čist deo ────────────────────────────────────────────────────────────────────

describe("ulog: pravila", () => {
    it("default stake is small and the parent picks 0, 3 or 5", () => {
        assert.equal(DUEL_STAKE, 3);
        assert.deepEqual([...DUEL_STAKE_OPTIONS], [0, 3, 5]);
        assert.equal(sanitizeSettings({}, "middle").duelStake, 3);
        assert.equal(sanitizeSettings({ duelStake: 5 }, "middle").duelStake, 5);
        assert.equal(sanitizeSettings({ duelStake: 0 }, "middle").duelStake, 0);
        assert.equal(sanitizeSettings({ duelStake: 100 }, "middle").duelStake, 3);
        assert.equal(sanitizeSettings({ duelStake: "5" }, "middle").duelStake, 3);
    });

    it("two families: the smaller stake applies to both (each setting caps what that child can lose)", () => {
        assert.equal(duelStakeFor(3, 5), 3);
        assert.equal(duelStakeFor(5, 5), 5);
        assert.equal(duelStakeFor(0, 5), 0);
        assert.equal(duelStakeFor(5, 0), 0);
        assert.equal(duelStakeFor(Number.NaN, 5), 3);
    });

    it("never negative: the loser gives at most what they have", () => {
        assert.equal(transferAmount(3, 10), 3);
        assert.equal(transferAmount(5, 2), 2);
        assert.equal(transferAmount(3, 0), 0);
        assert.equal(transferAmount(3, -4), 0);
        const loss = applyDuelLoss(state({ spent: 0 }), "r:x:1:0", 5, xpFor(2));
        assert.equal(loss.given, 2);
        assert.equal(coinsOf(loss.state!, xpFor(2)), 0);
        const broke = applyDuelLoss(state(), "r:x:1:1", 3, 0);
        assert.equal(broke.given, 0);
        assert.equal(broke.state!.spent, 0);
        assert.equal(coinsOf(broke.state!, 0), 0);
    });

    it("settles once: replaying the same match changes nothing", () => {
        const first = applyDuelLoss(state(), "r:k:2:0", 3, xpFor(10));
        assert.equal(first.given, 3);
        const again = applyDuelLoss(first.state!, "r:k:2:0", 3, xpFor(10));
        assert.equal(again.state, null);
        assert.equal(again.given, 3);
        const won = applyDuelWin(state(), "r:k:2:0", 3)!;
        assert.equal(won.bonus, 3);
        assert.equal(applyDuelWin(won, "r:k:2:0", 3), null);
        // A different match is a new settlement
        assert.equal(applyDuelWin(won, "r:k:2:1", 3)!.bonus, 6);
    });

    it("coin math: earned + won − spent − given", () => {
        assert.equal(coinsAvailable(50, 4), 16);
        assert.equal(coinsAvailable(50, 4, 3), 19);
        assert.equal(coinsAvailable(0, 0, 3), 3);
        assert.equal(coinsAvailable(5, 9, 2), 0);
        const winner = applyDuelWin(state({ spent: 4 }), "id", 3)!;
        assert.equal(coinsOf(winner, 50), 19);
        const loser = applyDuelLoss(state({ spent: 4 }), "id", 3, 50).state!;
        assert.equal(coinsOf(loser, 50), 13);
    });

    it("old companion data stays valid (no bonus, no duels); broken ledgers are dropped", () => {
        const old = sanitizeCompanion({ kind: "cat", owned: [], wear: {}, spent: 4, v: 2 }, "female", COMPANION_CATALOG);
        assert.equal(old.bonus, undefined);
        assert.equal(old.duels, undefined);
        assert.equal(coinsOf(old, 50), 16);
        const kept = sanitizeCompanion({ kind: "cat", owned: [], wear: {}, spent: 4, v: 2, bonus: 6, duels: [{ id: "r:a:1:0", c: 3 }, { id: "bad id!", c: 1 }, { id: "r:a:1:1", c: 999 }, "x"] }, "female", COMPANION_CATALOG);
        assert.equal(kept.bonus, 6);
        assert.deepEqual(kept.duels, [{ id: "r:a:1:0", c: 3 }]);
        assert.equal(sanitizeCompanion({ kind: "cat", bonus: -5 }, "female", COMPANION_CATALOG).bonus, undefined);
    });
});

describe("ulog: ko je pobedio", () => {
    const s = (correct: number, total = 6, secs = 30) => ({ correct, total, secs });
    it("more first-try answers win; a tie on answers is broken by time in a race only", () => {
        assert.equal(duelWinner("race", s(5), s(3)), 0);
        assert.equal(duelWinner("race", s(3), s(5)), 1);
        assert.equal(duelWinner("race", s(4, 6, 50), s(4, 6, 40)), 1);
        assert.equal(duelWinner("race", s(4, 6, 40), s(4, 6, 40)), null);
        // Vreme nepoznato (stari klijent): nerešeno ostaje nerešeno
        assert.equal(duelWinner("race", s(4, 6, 0), s(4, 6, 40)), null);
        assert.equal(duelWinner("turns", s(4, 6, 50), s(4, 6, 40)), null);
    });

    it("different task counts (own age settings) compare the share of correct answers", () => {
        assert.equal(duelWinner("race", s(3, 4), s(4, 6)), 0);
        assert.equal(duelWinner("race", s(2, 4, 20), s(3, 6, 25)), 0);
    });

    it("settles only when both devices agree on the winner", () => {
        const host: DuelReport = { level: 2, round: 0, format: "race", mine: s(5), theirs: s(3) };
        const guest: DuelReport = { level: 2, round: 0, format: "race", mine: s(3), theirs: s(5) };
        assert.equal(agreedOutcome(host, undefined), "pending");
        assert.equal(agreedOutcome(host, guest), "host");
        assert.equal(agreedOutcome(host, { ...guest, mine: s(6) }), "disagree");
        assert.equal(agreedOutcome(host, { ...guest, round: 1 }), "disagree");
        assert.equal(agreedOutcome({ ...host, mine: s(3) }, { ...guest, theirs: s(3) }), "tie");
        assert.equal(parseDuelReport({ level: 2, round: 0, format: "race", mine: { correct: 7, total: 6 }, theirs: s(1) }, 15), null);
        assert.equal(parseDuelReport({ level: 99, round: 0, format: "race", mine: s(1), theirs: s(1) }, 15), null);
    });
});

describe("ulog: reči", () => {
    it("names winner and loser gently, with the right coin forms; a tie loses nothing", () => {
        const players = [{ name: "Lejla", gender: "female" as const }, { name: "Amar" }] as const;
        assert.deepEqual(stakeLines(players, 0, 3), {
            winner: "Lejla dobija 3 novčića",
            loser: "Amar daje 3 novčića — sledeći put možda ti! Bravo za trud.",
            tie: null,
        });
        assert.deepEqual(stakeLines(players, 1, 1).winner, "Amar dobija 1 novčić");
        assert.deepEqual(stakeLines(players, null, 3), { winner: null, loser: null, tie: "Nerešeno — niko ne gubi novčiće." });
        // Poražen bez novčića: samo pohvala, bez reči o novčićima
        assert.equal(stakeLines(players, 0, 0).loser, "Amar, sledeći put možda ti! Bravo za trud.");
        assert.equal(coinsPhrase(5), "5 novčića");
        assert.equal(coinsPhrase(21), "21 novčić");
        assert.equal(coinsPhrase(11), "11 novčića");
        for (const line of [...Object.values(stakeLines(players, 0, 3)), TIE_COINS_LINE]) assert.doesNotMatch(String(line), /izgubi|tužn|kazn/i);
    });

    it("the end screen shows „Lejla je pobedila! 5 : 3”, who gives and who gets, and keeps „Revanš”", () => {
        const seats: [VersusSeat, VersusSeat] = [
            { player: { name: "Lejla", kind: "girl" }, gender: "female", score: 5, total: 6, secs: 40 },
            { player: { name: "Amar", kind: "dog" }, score: 3, total: 6, secs: 30 },
        ];
        const html = renderToStaticMarkup(
            createElement(VersusEnd, { seats, format: "race", coins: { state: "settled", amount: 3 }, limitReached: false, saved: "ok", onRematch: () => {}, onLeave: () => {}, adultNote: "x" })
        );
        assert.match(html, /Lejla je pobedila!/);
        assert.match(html, /⭐ 5 : 3/);
        assert.match(html, /Lejla dobija 3 novčića/);
        assert.match(html, /Amar daje 3 novčića — sledeći put možda ti! Bravo za trud\./);
        assert.match(html, /Revanš/);
        const tie = renderToStaticMarkup(
            createElement(VersusEnd, {
                seats: [{ ...seats[0], score: 4 }, { ...seats[1], score: 4, secs: 40 }],
                format: "race",
                coins: { state: "settled", amount: 0 },
                limitReached: false,
                saved: "ok",
                onRematch: () => {},
                onLeave: () => {},
                adultNote: "x",
            })
        );
        assert.match(tie, /Nerešeno — oboje ste super!/);
        assert.match(tie, /Nerešeno — niko ne gubi novčiće\./);
        // Bez uloga (drug bez naloga): ni reči o novčićima
        const off = renderToStaticMarkup(createElement(VersusEnd, { seats, format: "race", coins: { state: "off", amount: 0 }, limitReached: false, saved: "ok", onLeave: () => {}, adultNote: "x" }));
        assert.doesNotMatch(off, /dobija|daje/);
        assert.match(off, /Lejla je pobedila!/);
    });
});

// ── Server ──────────────────────────────────────────────────────────────────────

let n = 0;
const from = () => `10.88.${Math.floor(++n / 250)}.${n % 250}`;
const create = (body: unknown) => CREATE(jsonRequest("POST", body, { "x-forwarded-for": from() }), idParams(HOST));
const join = (body: unknown) => JOIN(jsonRequest("POST", body, { "x-forwarded-for": from() }), idParams(GUEST));
const answer = (body: unknown) => ANSWER(jsonRequest("POST", body), idParams(GUEST));
const result = (childId: number, body: unknown) => RESULT(jsonRequest("POST", body), idParams(childId));
const row = (id: number) => db.rows("children").find((r) => r.id === id) as Record<string, unknown>;
/** Menja red deteta u lažnoj bazi (redovi su živi objekti) */
const patch = (id: number, values: Record<string, unknown>) => Object.assign(row(id), values);
const companionOf = (id: number) => ((row(id).settings as Record<string, unknown>).companion ?? {}) as Record<string, unknown>;
async function coins(id: number, owner = id === GUEST ? STRANGER : PARENT): Promise<number> {
    signInAsChild(id, owner);
    return (await readJson(await COMPANION(jsonRequest("GET"), idParams(id)))).coins as number;
}

const score = (correct: number, total = 6, secs = 30) => ({ correct, total, secs });

/** Mila zove Luku na dvoboj u „Pogodi oblik”, Luka prihvata: kanal za oba */
async function duel(mode: "versus" | "together" = "versus"): Promise<string> {
    signInAsChild(HOST);
    const created = (await readJson(await create({ game: "shapes", level: 2, mode }))).invite as { code: string[]; channel: string };
    signInAsChild(GUEST, STRANGER);
    const card = (await readJson(await join({ code: created.code, ask: true }))).request as { key: string };
    const accepted = await readJson(await answer({ key: card.key, accept: true }));
    assert.equal(accepted.channel, created.channel);
    return created.channel;
}

/** Oba uređaja javljaju istu partiju: Mila `hostCorrect`, Luka `guestCorrect` */
async function reportBoth(channel: string, hostScore: ReturnType<typeof score>, guestScore: ReturnType<typeof score>, extra: Record<string, unknown> = {}) {
    signInAsChild(HOST);
    const first = await readJson(await result(HOST, { channel, level: 2, round: 0, format: "race", mine: hostScore, theirs: guestScore, ...extra }));
    signInAsChild(GUEST, STRANGER);
    const second = await readJson(await result(GUEST, { channel, level: 2, round: 0, format: "race", mine: guestScore, theirs: hostScore, ...extra }));
    signInAsChild(HOST);
    const again = await readJson(await result(HOST, { channel, level: 2, round: 0, format: "race", mine: hostScore, theirs: guestScore, ...extra }));
    return { first, second, again };
}

beforeEach(() => {
    resetWorld();
    // Mila ima 20 novčića, Luka 16 (40 poena)
    seedFamily({ experience_points: xpFor(20), settings: { companion: { kind: "cat", owned: [], wear: {}, spent: 0, v: 4 } } });
    db.seed("children", [{ id: SIBLING, first_name: "Amar", last_name: "Test", date_of_birth: "2019-02-02", gender: "male", pin_code: "lion,eggs,ball,cola", experience_points: xpFor(10), settings: {} }]);
    db.seed("user_children", [{ user_id: PARENT.id, child_id: SIBLING, relationship: "parent", is_primary: true }]);
    for (const id of [HOST, GUEST, SIBLING]) {
        for (const key of ["invite-join:child", "invite-create:child", "invite-answer:child", "duel-result:child", "duel-local:child"]) resetRateLimit(`${key}:${id}`);
    }
    resetRateLimit("invite-join:all");
});

describe("ulog na dva uređaja (/invite/result)", () => {
    it("the loser gives 3 coins to the winner once both devices agree — and only once", async () => {
        const channel = await duel();
        assert.equal(await coins(HOST), 20);
        assert.equal(await coins(GUEST), 16);
        const { first, second, again } = await reportBoth(channel, score(5), score(3));
        assert.equal(first.status, "pending");
        assert.deepEqual({ status: second.status, outcome: second.outcome, amount: second.amount, coins: second.coins }, { status: "settled", outcome: "friend", amount: 3, coins: 13 });
        assert.deepEqual({ status: again.status, outcome: again.outcome, amount: again.amount, coins: again.coins }, { status: "settled", outcome: "you", amount: 3, coins: 23 });
        assert.equal(await coins(HOST), 23);
        assert.equal(await coins(GUEST), 13);
        assert.equal(companionOf(HOST).bonus, 3);
        assert.equal(companionOf(GUEST).spent, 3);
        // Ponovljeni izveštaji (i sa drugim brojevima) ne menjaju ništa
        await reportBoth(channel, score(0), score(6));
        assert.equal(await coins(HOST), 23);
        assert.equal(await coins(GUEST), 13);
    });

    it("a rematch is a new match, settled again", async () => {
        const channel = await duel();
        await reportBoth(channel, score(5), score(3));
        signInAsChild(HOST);
        await result(HOST, { channel, level: 2, round: 1, format: "race", mine: score(2), theirs: score(4) });
        signInAsChild(GUEST, STRANGER);
        const settled = await readJson(await result(GUEST, { channel, level: 2, round: 1, format: "race", mine: score(4), theirs: score(2) }));
        assert.equal(settled.outcome, "you");
        assert.equal(await coins(HOST), 20);
        assert.equal(await coins(GUEST), 16);
    });

    it("no transfer when the devices disagree", async () => {
        const channel = await duel();
        signInAsChild(HOST);
        await result(HOST, { channel, level: 2, round: 0, format: "race", mine: score(5), theirs: score(3) });
        signInAsChild(GUEST, STRANGER);
        const disagree = await readJson(await result(GUEST, { channel, level: 2, round: 0, format: "race", mine: score(6), theirs: score(1) }));
        assert.equal(disagree.status, "disagree");
        assert.equal(await coins(HOST), 20);
        assert.equal(await coins(GUEST), 16);
    });

    it("a tie moves nothing; a tie on answers is decided by time", async () => {
        const channel = await duel();
        const { again } = await reportBoth(channel, score(4, 6, 40), score(4, 6, 40));
        assert.deepEqual({ outcome: again.outcome, amount: again.amount }, { outcome: "tie", amount: 0 });
        assert.equal(await coins(HOST), 20);
        assert.equal(await coins(GUEST), 16);
        signInAsChild(HOST);
        await result(HOST, { channel, level: 2, round: 1, format: "race", mine: score(4, 6, 50), theirs: score(4, 6, 30) });
        signInAsChild(GUEST, STRANGER);
        const faster = await readJson(await result(GUEST, { channel, level: 2, round: 1, format: "race", mine: score(4, 6, 30), theirs: score(4, 6, 50) }));
        assert.deepEqual({ outcome: faster.outcome, amount: faster.amount }, { outcome: "you", amount: 3 });
    });

    it("a loser with 0 coins gives nothing and never goes negative; the winner is still named", async () => {
        patch(HOST, { experience_points: 0 });
        const channel = await duel();
        assert.equal(await coins(HOST), 0);
        const { second, again } = await reportBoth(channel, score(1), score(5));
        assert.deepEqual({ status: second.status, outcome: second.outcome, amount: second.amount }, { status: "settled", outcome: "you", amount: 0 });
        assert.equal(again.coins, 0);
        assert.equal(await coins(HOST), 0);
        assert.equal(await coins(GUEST), 16);
        assert.equal(companionOf(HOST).spent, 0);
    });

    it("the parent setting caps the stake: 0 in either family means no transfer; 5 and 5 means 5", async () => {
        patch(GUEST, { settings: { duelStake: 0 } });
        let channel = await duel();
        await reportBoth(channel, score(5), score(3));
        assert.equal(await coins(GUEST), 16);
        assert.equal(await coins(HOST), 20);

        patch(GUEST, { settings: { duelStake: 5 } });
        patch(HOST, { settings: { duelStake: 5, companion: { kind: "cat", owned: [], wear: {}, spent: 0, v: 9 } } });
        signInAsChild(HOST);
        channel = await duel();
        const { again } = await reportBoth(channel, score(5), score(3));
        assert.equal(again.amount, 5);
        assert.equal(await coins(GUEST), 11);
        // Ulog se ne vidi u javnim podešavanjima kao poziv, ali roditelj vidi svoje „Ulog u dvoboju”
        signInAsParent();
        const settings = (await readJson(await GET_SETTINGS(jsonRequest("GET"), idParams(HOST)))).settings as Record<string, unknown>;
        assert.equal(settings.duelStake, 5);
        assert.equal(settings.invite, undefined);
    });

    it("rejects expired, unaccepted, non-duel and foreign sessions", async () => {
        // Nije prihvaćen: poziv čeka kod
        signInAsChild(HOST);
        const waiting = (await readJson(await create({ game: "shapes", level: 2, mode: "versus" }))).invite as { channel: string };
        assert.equal((await result(HOST, { channel: waiting.channel, level: 2, round: 0, format: "race", mine: score(1), theirs: score(0) })).status, 404);
        // „Zajedno” nije dvoboj
        const together = await duel("together");
        signInAsChild(HOST);
        assert.equal((await result(HOST, { channel: together, level: 2, round: 0, format: "race", mine: score(1), theirs: score(0) })).status, 404);
        // Tuđe dete ne javlja za drugog, a pogrešan kanal ne postoji
        const channel = await duel();
        signInAsChild(SIBLING);
        assert.equal((await result(SIBLING, { channel, level: 2, round: 0, format: "race", mine: score(1), theirs: score(0) })).status, 404);
        signInAsChild(GUEST, STRANGER);
        assert.equal((await result(HOST, { channel, level: 2, round: 0, format: "race", mine: score(1), theirs: score(0) })).status, 403);
        assert.equal((await result(GUEST, { channel: "bm-inv-" + "0".repeat(40), level: 2, round: 0, format: "race", mine: score(1), theirs: score(0) })).status, 404);
        assert.equal((await result(GUEST, { channel, level: 2, round: 0, format: "race", mine: score(9), theirs: score(0) })).status, 400);
        // Istekla igra sa drugom (posle tri sata; nova sesija prijave)
        advanceClock(INVITE_SESSION_TTL_MS + 1000);
        signInAsChild(GUEST, STRANGER);
        assert.equal((await result(GUEST, { channel, level: 2, round: 0, format: "race", mine: score(1), theirs: score(0) })).status, 404);
        assert.equal(await coins(GUEST), 16);
    });

    it("the seed and the guest's ID stay on the server; the stake is the smaller of the two", async () => {
        patch(GUEST, { settings: { duelStake: 0 } });
        await duel();
        const stored = parseStoredInvite((row(HOST).settings as Record<string, unknown>).invite)!;
        assert.equal(stored.guestId, GUEST);
        assert.equal(stored.duel?.stake, 0);
        assert.match(stored.duel!.seed, /^[A-Za-z0-9_-]{16,64}$/);
    });
});

describe("ulog na istom uređaju (/duel, /duel/result)", () => {
    const start = (body: unknown, childId = HOST) => LOCAL_START(jsonRequest("POST", body), idParams(childId));
    const local = (body: unknown, childId = HOST) => LOCAL_RESULT(jsonRequest("POST", body), idParams(childId));

    it("siblings on the parent's account: the loser gives, once per match", async () => {
        signInAsChild(HOST);
        const opened = await readJson(await start({ friend: SIBLING }));
        assert.equal(typeof opened.session, "string");
        assert.equal(opened.stake, 3);
        const body = { session: opened.session, level: 3, round: 0, format: "turns", mine: score(2), theirs: score(4) };
        const settled = await readJson(await local(body));
        assert.deepEqual(settled, { status: "settled", outcome: "friend", amount: 3, coins: { you: 17, friend: 13 } });
        // Ponovljen zahtev (i sa obrnutim rezultatom) ne prenosi ponovo
        const again = await readJson(await local({ ...body, mine: score(5), theirs: score(0) }));
        assert.deepEqual(again.coins, { you: 17, friend: 13 });
        // Nerešeno: niko ništa
        const tie = await readJson(await local({ ...body, round: 1, mine: score(3), theirs: score(3) }));
        assert.deepEqual({ outcome: tie.outcome, amount: tie.amount }, { outcome: "tie", amount: 0 });
        assert.equal(await coins(SIBLING), 13);
    });

    it("only siblings: a friend from another family or an old session is refused", async () => {
        signInAsChild(HOST);
        assert.equal((await start({ friend: GUEST })).status, 404);
        assert.equal((await start({ friend: "3" })).status, 400);
        const opened = await readJson(await start({ friend: SIBLING }));
        assert.equal((await local({ session: "x".repeat(24), level: 3, round: 0, format: "race", mine: score(2), theirs: score(4) })).status, 404);
        advanceClock(INVITE_SESSION_TTL_MS + 1000);
        signInAsChild(HOST);
        assert.equal((await local({ session: opened.session, level: 3, round: 0, format: "race", mine: score(2), theirs: score(4) })).status, 404);
        // Dečja sesija druge porodice ne može da otvori dvoboj za tuđe dete
        signInAsChild(GUEST, STRANGER);
        assert.equal((await start({ friend: SIBLING }, HOST)).status, 403);
    });
});
