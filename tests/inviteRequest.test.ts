// Poziv sa karticom („Prihvati” / „Ne sada”) i „Drugovi” za poziv bez koda (lib/invite.ts,
// lib/playFriends.ts, /api/children/[id]/invite, /invite/join, /invite/answer, /invite/requests,
// /play-friends): stanja zahteva, šta drug vidi PRE prihvatanja, ko sme da zove bez koda, rokovi
// i stari pozivi.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";
import { DELETE, GET, POST } from "@/app/api/children/[id]/invite/route";
import { POST as ANSWER } from "@/app/api/children/[id]/invite/answer/route";
import { POST as JOIN } from "@/app/api/children/[id]/invite/join/route";
import { GET as REQUESTS } from "@/app/api/children/[id]/invite/requests/route";
import { DELETE as FORGET, GET as FRIENDS } from "@/app/api/children/[id]/play-friends/route";
import { GET as GET_SETTINGS, PUT as PUT_SETTINGS } from "@/app/api/children/[id]/settings/route";
import {
    ANSWER_SHOWN_TTL_MS,
    INVITE_CODE_TTL_MS,
    REQUEST_ANSWER_TTL_MS,
    REQUEST_SEEN_TTL_MS,
    acceptedLine,
    askingLine,
    declinedLine,
    inviteStatus,
    missedLine,
    parseStoredInvite,
    requestLine,
    requestSpeech,
} from "@/lib/invite";
import { MAX_PLAY_FRIENDS, forgetPlayFriend, hasPlayFriend, parsePlayFriends, rememberPlayFriend } from "@/lib/playFriends";
import { resetRateLimit } from "@/lib/rateLimit";
import { friendKeyFor, inboxTopicFor } from "@/lib/realtimeTopic";
import { VISUAL_PIN_CATEGORIES } from "@/lib/visualPinData";
import {
    CHILD_ID,
    OTHER_CHILD_ID,
    PARENT,
    STRANGER,
    advanceClock,
    db,
    idParams,
    inboxPushes,
    jsonRequest,
    readJson,
    resetWorld,
    seedFamily,
    signInAsChild,
    signInAsParent,
} from "./setup/api";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
/** Reči koje detetu kažu gde da dodirne — nikad */
const WHERE_TO_TAP = /dodirni|pritisni|klikni|prevuci/i;

// ── Čist deo ───────────────────────────────────────────────────────────────────

const NOW = Date.UTC(2026, 9, 26, 12);
const iso = (ms: number) => new Date(ms).toISOString();
const OLD = {
    code: VISUAL_PIN_CATEGORIES.map((c) => c.items[0].id).join(","),
    channelKey: "abcdefghijklmnopqrstuvwx",
    expiresAt: iso(NOW + INVITE_CODE_TTL_MS),
    hostFirstName: "Lejla",
    game: "clock",
    level: 2,
    createdAt: iso(NOW),
};
const AMAR = { firstName: "Amar", companion: { kind: "dog", skin: null, wear: {} } };
const request = (extra: Record<string, unknown> = {}) => ({ key: "kkkkkkkkkkkkkkkkkkkkkkkk", guestId: 7, ...AMAR, via: "code", at: iso(NOW), ...extra });

describe("stanja poziva sa karticom", () => {
    it("old payloads without a request or an answer behave exactly as before", () => {
        const old = parseStoredInvite(OLD)!;
        assert.equal(old.request, undefined);
        assert.equal(old.declined, undefined);
        assert.equal(old.mode, "together");
        assert.equal(inviteStatus(old, NOW), "waiting");
        assert.equal(inviteStatus(old, NOW + INVITE_CODE_TTL_MS), "expired");
        const joined = parseStoredInvite({ ...OLD, code: null, guest: AMAR, joinedAt: iso(NOW) })!;
        assert.equal(inviteStatus(joined, NOW + 60_000), "joined");
    });

    it("a friend who entered the code is asked: then answers, or after a while is „not here”", () => {
        const asking = parseStoredInvite({ ...OLD, code: null, request: request() })!;
        assert.equal(asking.request?.firstName, "Amar");
        assert.equal(inviteStatus(asking, NOW + 1000), "asking");
        assert.equal(inviteStatus(asking, NOW + REQUEST_ANSWER_TTL_MS - 1), "asking");
        assert.equal(inviteStatus(asking, NOW + REQUEST_ANSWER_TTL_MS), "missed");
        assert.equal(inviteStatus(asking, NOW + REQUEST_ANSWER_TTL_MS + ANSWER_SHOWN_TTL_MS), "expired");
    });

    it("a direct request must reach an open page within a minute; once seen, the friend has time", () => {
        const unseen = parseStoredInvite({ ...OLD, code: null, request: request({ via: "direct" }) })!;
        assert.equal(inviteStatus(unseen, NOW + REQUEST_SEEN_TTL_MS - 1), "asking");
        assert.equal(inviteStatus(unseen, NOW + REQUEST_SEEN_TTL_MS), "missed");
        const seen = parseStoredInvite({ ...OLD, code: null, request: request({ via: "direct", seenAt: iso(NOW + 30_000) }) })!;
        assert.equal(inviteStatus(seen, NOW + REQUEST_SEEN_TTL_MS + 5000), "asking");
        assert.equal(inviteStatus(seen, NOW + 30_000 + REQUEST_ANSWER_TTL_MS), "missed");
    });

    it("„Ne sada” is shown to the host for a while, then the invite is simply gone", () => {
        const declined = parseStoredInvite({ ...OLD, code: null, declined: { ...AMAR, at: iso(NOW) } })!;
        assert.equal(inviteStatus(declined, NOW + 1000), "declined");
        assert.equal(inviteStatus(declined, NOW + ANSWER_SHOWN_TTL_MS), "expired");
    });

    it("drops a broken request (the invite itself stays valid)", () => {
        for (const broken of [request({ key: "short" }), request({ guestId: -1 }), request({ via: "sms" }), request({ at: "juče" }), request({ firstName: "" }), "x"]) {
            const invite = parseStoredInvite({ ...OLD, request: broken });
            assert.ok(invite, JSON.stringify(broken));
            assert.equal(invite.request, undefined, JSON.stringify(broken));
            assert.equal(inviteStatus(invite, NOW), "waiting");
        }
    });
});

describe("reči kartice poziva", () => {
    it("the friend sees who, which game, which level and how, before accepting", () => {
        assert.equal(requestLine("Lejla", "Sat", 2, "versus"), "Lejla te izaziva na dvoboj u igri Sat — Nivo 2");
        assert.equal(requestLine("Lejla", "Sat", 2, "together"), "Lejla te zove da igrate zajedno: Sat");
        assert.equal(askingLine("Amar"), "Čekamo da Amar prihvati…");
        assert.equal(declinedLine("Amar"), "Amar sada ne može. Probaj kasnije ili izaberi drugu igru.");
        assert.equal(missedLine("Amar"), "Amar sada nije tu.");
        // Bez roda (pol drugog deteta se ne šalje): važi i za Lejlu i za Amara
        assert.equal(acceptedLine("Lejla"), "Lejla kaže: može!");
    });

    it("voice: no other child's name, never where to tap", () => {
        for (const mode of ["together", "versus"] as const) {
            const line = requestSpeech("Sat", mode);
            assert.ok(!line.includes("Lejla"));
            assert.match(line, /Sat/);
            assert.doesNotMatch(line, WHERE_TO_TAP);
        }
        assert.doesNotMatch(requestLine("Lejla", "Sat", 1, "versus") + declinedLine("Amar") + missedLine("Amar") + askingLine("Amar"), WHERE_TO_TAP);
        // Ni ekrani poziva ne kažu gde da se dodirne
        const remote = read("app/dashboard/child/[id]/playRemote.tsx");
        const ui = remote.slice(remote.indexOf("// ── Poziv: izbor igre"), remote.indexOf("// ── U igri: traka sa drugom"));
        assert.doesNotMatch(ui.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""), WHERE_TO_TAP);
    });
});

describe("spisak drugova (čist deo)", () => {
    const friend = (id: number) => ({ id, firstName: `Drug${id}`, companion: { kind: "cat", skin: null, wear: {} }, at: iso(NOW + id) });

    it("keeps at most eight friends, newest first, without repeats", () => {
        let list = parsePlayFriends(undefined);
        for (let i = 1; i <= MAX_PLAY_FRIENDS + 3; i++) list = rememberPlayFriend(list, friend(i));
        assert.equal(list.list.length, MAX_PLAY_FRIENDS);
        assert.equal(list.list[0].id, MAX_PLAY_FRIENDS + 3);
        list = rememberPlayFriend(list, { ...friend(5), firstName: "Haris" });
        assert.equal(list.list[0].firstName, "Haris");
        assert.equal(list.list.filter((f) => f.id === 5).length, 1);
        assert.ok(hasPlayFriend(list, 5));
        list = forgetPlayFriend(list, 5);
        assert.ok(!hasPlayFriend(list, 5));
        assert.ok(list.v > 0, "svaka izmena podiže brojač (upis „uporedi pa zameni”)");
    });

    it("parses leniently and drops broken entries", () => {
        const parsed = parsePlayFriends({ v: 3, list: [friend(1), { ...friend(2), id: "2" }, { ...friend(3), firstName: "" }, friend(1), "x", { ...friend(4), companion: null }] });
        assert.deepEqual(
            parsed.list.map((f) => f.id),
            [1]
        );
        assert.equal(parsed.v, 3);
        assert.deepEqual(parsePlayFriends("x"), { v: 0, list: [] });
    });
});

// ── API ────────────────────────────────────────────────────────────────────────

const HOST = CHILD_ID; // Mila (porodica PARENT)
const GUEST = OTHER_CHILD_ID; // Luka (druga porodica, STRANGER)
const SIBLING = 3; // Amar (porodica PARENT)

let n = 0;
const from = () => `10.66.${Math.floor(++n / 250)}.${n % 250}`;
const create = (body: unknown, childId = HOST) => POST(jsonRequest("POST", body, { "x-forwarded-for": from() }), idParams(childId));
const status = (childId = HOST) => GET(jsonRequest("GET"), idParams(childId));
const cancel = (childId = HOST) => DELETE(jsonRequest("DELETE"), idParams(childId));
const join = (body: unknown, childId = GUEST) => JOIN(jsonRequest("POST", body, { "x-forwarded-for": from() }), idParams(childId));
const answer = (body: unknown, childId = GUEST) => ANSWER(jsonRequest("POST", body), idParams(childId));
const inbox = (childId = GUEST) => REQUESTS(jsonRequest("GET"), idParams(childId));
const friendsOf = async (childId: number) => ((await readJson(await FRIENDS(jsonRequest("GET"), idParams(childId)))).friends ?? []) as { key: string; firstName: string; companion: Record<string, unknown> }[];
const row = (id: number) => db.rows("children").find((r) => r.id === id) as Record<string, unknown>;
const stored = (id = HOST) => (row(id).settings as Record<string, unknown>).invite as Record<string, unknown> | undefined;

interface Card {
    key: string;
    friend: { firstName: string; companion: { kind: string } };
    game: string;
    level: number;
    mode?: string;
}

/** Domaćin pravi poziv kodom; gost unosi kod i dobija karticu poziva. */
async function hostAndCard(body: unknown = { game: "clock", level: 2, mode: "versus" }): Promise<{ code: string[]; channel: string; card: Card }> {
    signInAsChild(HOST);
    const created = (await readJson(await create(body))).invite as { code: string[]; channel: string };
    signInAsChild(GUEST, STRANGER);
    const response = await join({ code: created.code, ask: true });
    assert.equal(response.status, 200);
    return { code: created.code, channel: created.channel, card: (await readJson(response)).request as Card };
}

/** Prva igra preko koda (prihvaćena): deca se posle toga pamte jedno drugom */
async function playOnceWithCode() {
    const { card } = await hostAndCard({ game: "clock", level: 1 });
    signInAsChild(GUEST, STRANGER);
    assert.equal((await answer({ key: card.key, accept: true })).status, 200);
    signInAsChild(HOST);
    assert.equal((await cancel()).status, 200);
}

beforeEach(() => {
    resetWorld();
    seedFamily({ settings: { companion: { kind: "cat", owned: [], wear: {}, spent: 0, v: 4 } } });
    db.seed("children", [{ id: SIBLING, first_name: "Amar", last_name: "Test", date_of_birth: "2019-02-02", gender: "male", pin_code: "lion,eggs,ball,cola", experience_points: 0, settings: {} }]);
    db.seed("user_children", [{ user_id: PARENT.id, child_id: SIBLING, relationship: "parent", is_primary: true }]);
    for (const id of [HOST, GUEST, SIBLING]) {
        for (const key of ["invite-join:child", "invite-create:child", "invite-answer:child", "invite-inbox:child"]) resetRateLimit(`${key}:${id}`);
        for (const other of [HOST, GUEST, SIBLING]) resetRateLimit(`invite-direct:${id}:${other}`);
    }
    resetRateLimit("invite-join:all");
});

describe("poziv kodom: kartica, „Prihvati”, „Ne sada”", () => {
    it("the friend sees game, level and mode BEFORE accepting — and nothing more (no channel yet)", async () => {
        const { card } = await hostAndCard();
        assert.deepEqual(Object.keys(card).sort(), ["friend", "game", "key", "level", "mode"]);
        assert.equal(card.game, "clock");
        assert.equal(card.level, 2);
        assert.equal(card.mode, "versus");
        assert.deepEqual(card.friend, { firstName: "Mila", companion: { kind: "cat", skin: null, wear: {} } });
        assert.ok(!JSON.stringify(card).includes("bm-inv-"), "kanal tek posle „Prihvati”");
        // Zajedno: bez polja `mode` (kao stari odgovori)
        signInAsChild(HOST);
        await cancel();
        const together = await hostAndCard({ game: "clock", level: 2 });
        assert.equal(together.card.mode, undefined);
    });

    it("while the friend looks at the card the host sees „Čekamo da … prihvati” and the code is used up", async () => {
        const { code } = await hostAndCard();
        signInAsChild(HOST);
        const host = (await readJson(await status())).invite as Record<string, unknown>;
        assert.equal(host.status, "asking");
        assert.deepEqual(host.asking, { firstName: "Luka", companion: { kind: "boy", skin: null, wear: {} } });
        assert.equal(host.code, undefined);
        assert.equal(host.friend, undefined);
        assert.ok(inboxPushes.some((p) => p.topic === inboxTopicFor(HOST)), "domaćin dobija znak na sanduče");
        // Isti kod više niko ne može da unese
        signInAsChild(SIBLING);
        assert.equal((await join({ code, ask: true }, SIBLING)).status, 404);
    });

    it("accept: the friend gets the channel and the host sees the friend joined", async () => {
        const { card, channel } = await hostAndCard();
        signInAsChild(GUEST, STRANGER);
        const response = await answer({ key: card.key, accept: true });
        assert.equal(response.status, 200);
        const body = await readJson(response);
        // Dvoboj: uz kanal stižu i zajedničko seme zadataka i ulog (lib/duelStakes.ts)
        assert.deepEqual(Object.keys(body).sort(), ["channel", "friend", "game", "level", "mode", "seed", "stake"]);
        assert.equal(body.channel, channel);
        assert.equal(body.mode, "versus");
        assert.match(body.seed as string, /^[A-Za-z0-9_-]{16,64}$/);
        assert.equal(body.stake, 3);
        signInAsChild(HOST);
        const host = (await readJson(await status())).invite as Record<string, unknown>;
        assert.equal(host.status, "joined");
        assert.equal((host.friend as { firstName: string }).firstName, "Luka");
        // Domaćin i drug dobijaju isto seme: iste zadatke istim redom
        assert.equal(host.seed, body.seed);
        assert.equal(host.stake, 3);
        // Odgovor važi jednom
        signInAsChild(GUEST, STRANGER);
        assert.equal((await answer({ key: card.key, accept: true })).status, 404);
    });

    it("decline: the host is told once, calmly, and the invite is cleaned up", async () => {
        const { card } = await hostAndCard();
        signInAsChild(GUEST, STRANGER);
        assert.deepEqual(await readJson(await answer({ key: card.key, accept: false })), { ok: true });
        signInAsChild(HOST);
        const first = await readJson(await status());
        assert.equal(first.invite, null);
        assert.deepEqual(first.declined, { firstName: "Luka", companion: { kind: "boy", skin: null, wear: {} } });
        assert.equal(first.game, "clock");
        assert.equal(stored(), undefined, "poziv je obrisan");
        assert.deepEqual(await readJson(await status()), { invite: null });
        // Posle „Ne sada” nema pamćenja druga
        assert.deepEqual(await friendsOf(HOST), []);
    });

    it("only the asked child can answer, only with the right key, and only before the deadline", async () => {
        const { card } = await hostAndCard();
        signInAsChild(SIBLING);
        assert.equal((await answer({ key: card.key, accept: true }, SIBLING)).status, 404);
        signInAsChild(GUEST, STRANGER);
        assert.equal((await answer({ key: "x".repeat(24), accept: true })).status, 404);
        assert.equal((await answer({ key: card.key })).status, 400, "odgovor mora biti da ili ne");
        advanceClock(REQUEST_ANSWER_TTL_MS + 1000);
        assert.equal((await answer({ key: card.key, accept: true })).status, 404);
        signInAsChild(HOST);
        const missed = await readJson(await status());
        assert.equal(missed.invite, null);
        assert.equal((missed.missed as { firstName: string }).firstName, "Luka");
        assert.equal(missed.via, "code");
    });

    it("an old client (code without `ask`) still joins at once, as before", async () => {
        signInAsChild(HOST);
        const created = (await readJson(await create({ game: "clock", level: 2 }))).invite as { code: string[] };
        signInAsChild(GUEST, STRANGER);
        const body = await readJson(await join({ code: created.code }));
        assert.deepEqual(Object.keys(body).sort(), ["channel", "friend", "game", "level"]);
    });

    it("the host giving up removes the card from the friend's page", async () => {
        await hostAndCard();
        signInAsChild(HOST);
        inboxPushes.length = 0;
        assert.equal((await cancel()).status, 200);
        assert.deepEqual(
            inboxPushes.map((p) => [p.topic, p.payload.r]),
            [[inboxTopicFor(GUEST), "cancel"]]
        );
    });
});

describe("drugovi i poziv bez koda", () => {
    it("after an accepted code session both children remember each other: first name and companion only", async () => {
        await playOnceWithCode();
        signInAsChild(HOST);
        const mine = await friendsOf(HOST);
        assert.deepEqual(
            mine.map((f) => [f.firstName, f.companion.kind]),
            [["Luka", "boy"]]
        );
        assert.deepEqual(Object.keys(mine[0]).sort(), ["companion", "firstName", "key"]);
        assert.ok(!JSON.stringify(mine).includes(`"${GUEST}"`) && !/"id"/.test(JSON.stringify(mine)), "bez ID-ja drugog deteta");
        signInAsChild(GUEST, STRANGER);
        assert.deepEqual(
            (await friendsOf(GUEST)).map((f) => f.firstName),
            ["Mila"]
        );
        // Spisak ne izlazi kroz podešavanja, a čuvanje podešavanja ga ne briše
        signInAsParent(PARENT);
        const settings = (await readJson(await GET_SETTINGS(jsonRequest("GET"), idParams(HOST)))).settings as Record<string, unknown>;
        assert.equal(settings.playFriends, undefined);
        assert.equal((await PUT_SETTINGS(jsonRequest("PUT", { settings: { volume: 0.3 } }), idParams(HOST))).status, 200);
        signInAsChild(HOST);
        assert.equal((await friendsOf(HOST)).length, 1);
    });

    it("a direct request goes only to a remembered friend; strangers and made-up keys are refused", async () => {
        signInAsChild(HOST);
        assert.equal((await create({ game: "clock", level: 1, friend: "nepoznat-kljuc-1234567" })).status, 404);
        assert.equal(stored(), undefined);
        await playOnceWithCode();
        signInAsChild(HOST);
        const [luka] = await friendsOf(HOST);
        // Ključ važi samo za dete kome je dat: brat sa istog naloga ga ne može iskoristiti
        signInAsChild(SIBLING);
        assert.equal((await create({ game: "clock", level: 1, friend: luka.key }, SIBLING)).status, 404);
        signInAsChild(HOST);
        inboxPushes.length = 0;
        const response = await create({ game: "clock", level: 3, mode: "versus", friend: luka.key });
        assert.equal(response.status, 200);
        const host = (await readJson(response)).invite as Record<string, unknown>;
        assert.equal(host.status, "asking");
        assert.equal(host.via, "direct");
        assert.equal(host.code, undefined, "bez koda");
        assert.deepEqual(
            inboxPushes.map((p) => [p.topic, p.payload]),
            [[inboxTopicFor(GUEST), { r: "request" }]]
        );
    });

    it("the friend's open page gets the card (game and mode first), marks it seen, and can accept", async () => {
        await playOnceWithCode();
        signInAsChild(HOST);
        const [luka] = await friendsOf(HOST);
        await create({ game: "clock", level: 3, mode: "versus", friend: luka.key });
        // Drugi ne vide tuđe pozive
        signInAsChild(SIBLING);
        assert.deepEqual(await readJson(await inbox(SIBLING)), { requests: [] });
        signInAsChild(GUEST, STRANGER);
        const { requests } = (await readJson(await inbox())) as { requests: Card[] };
        assert.equal(requests.length, 1);
        assert.equal(requests[0].game, "clock");
        assert.equal(requests[0].level, 3);
        assert.equal(requests[0].mode, "versus");
        assert.equal(requests[0].friend.firstName, "Mila");
        assert.ok(((stored()!.request as Record<string, unknown>).seenAt as string).length > 0, "poziv je stigao do otvorene stranice");
        // Viđen poziv ima više vremena od jednog minuta
        advanceClock(REQUEST_SEEN_TTL_MS + 5000);
        const accepted = await answer({ key: requests[0].key, accept: true });
        assert.equal(accepted.status, 200);
        assert.equal((await readJson(accepted)).mode, "versus");
    });

    it("a direct request nobody sees within a minute: the host sees „nije tu” (and can fall back to the code)", async () => {
        await playOnceWithCode();
        signInAsChild(HOST);
        const [luka] = await friendsOf(HOST);
        await create({ game: "clock", level: 1, friend: luka.key });
        advanceClock(REQUEST_SEEN_TTL_MS + 1000);
        const body = await readJson(await status());
        assert.equal(body.invite, null);
        assert.equal((body.missed as { firstName: string }).firstName, "Luka");
        assert.equal(body.via, "direct");
        signInAsChild(GUEST, STRANGER);
        assert.deepEqual(await readJson(await inbox()), { requests: [] });
    });

    it("a parent removing the friend stops direct requests in both directions", async () => {
        await playOnceWithCode();
        signInAsChild(HOST);
        const [luka] = await friendsOf(HOST);
        // Dete ne briše samo (samo roditelj)
        assert.equal((await FORGET(jsonRequest("DELETE", { key: luka.key }), idParams(HOST))).status, 403);
        signInAsParent(STRANGER);
        const [mila] = await friendsOf(GUEST);
        assert.equal((await FORGET(jsonRequest("DELETE", { key: mila.key }), idParams(GUEST))).status, 200);
        assert.deepEqual(await friendsOf(GUEST), []);
        signInAsChild(HOST);
        assert.deepEqual(await friendsOf(HOST), [], "i drug zaboravlja");
        assert.equal((await create({ game: "clock", level: 1, friend: luka.key })).status, 404);
    });

    it("refuses a direct request for a game the friend does not have open", async () => {
        await playOnceWithCode();
        (row(GUEST).settings as Record<string, unknown>).disabledGames = ["clock"];
        signInAsChild(HOST);
        const [luka] = await friendsOf(HOST);
        assert.equal((await create({ game: "clock", level: 1, friend: luka.key })).status, 409);
    });

    it("limits direct requests to the same friend", async () => {
        await playOnceWithCode();
        signInAsChild(HOST);
        const [luka] = await friendsOf(HOST);
        for (let i = 0; i < 5; i++) assert.equal((await create({ game: "clock", level: 1, friend: luka.key })).status, 200);
        assert.equal((await create({ game: "clock", level: 1, friend: luka.key })).status, 429);
    });
});

describe("braća i sestre: isti roditeljski nalog, poziv na drugi telefon bez koda", () => {
    const siblingsOf = async (childId: number) => ((await readJson(await FRIENDS(jsonRequest("GET"), idParams(childId)))).siblings ?? []) as { key: string; firstName: string }[];

    it("a sibling is requestable from the start: no code, no earlier game together", async () => {
        signInAsChild(HOST);
        assert.deepEqual(await friendsOf(HOST), [], "nisu igrali zajedno");
        const siblings = await siblingsOf(HOST);
        assert.deepEqual(
            siblings.map((s) => s.firstName),
            ["Amar"]
        );
        assert.equal(siblings[0].key, friendKeyFor(HOST, SIBLING));
        assert.ok(!JSON.stringify(siblings).includes('"id"'), "bez ID-ja");
        const response = await create({ game: "clock", level: 1, mode: "versus", friend: siblings[0].key });
        assert.equal(response.status, 200);
        const host = (await readJson(response)).invite as Record<string, unknown>;
        assert.equal(host.status, "asking");
        assert.equal(host.via, "direct");
        assert.deepEqual(
            inboxPushes.map((p) => p.topic),
            [inboxTopicFor(SIBLING)]
        );
        // Amar na drugom telefonu (svoja dečja sesija istog naloga): kartica, pa „Prihvati”
        signInAsChild(SIBLING);
        const { requests } = (await readJson(await inbox(SIBLING))) as { requests: Card[] };
        assert.equal(requests.length, 1);
        assert.equal(requests[0].friend.firstName, "Mila");
        assert.equal(requests[0].mode, "versus");
        const accepted = await answer({ key: requests[0].key, accept: true }, SIBLING);
        assert.equal(accepted.status, 200);
        assert.equal((await readJson(accepted)).mode, "versus");
        signInAsChild(HOST);
        assert.equal(((await readJson(await status())).invite as Record<string, unknown>).status, "joined");
    });

    it("the parent's own session sees the same siblings; the child of another family is not one", async () => {
        signInAsParent(PARENT);
        assert.deepEqual(
            (await siblingsOf(HOST)).map((s) => s.firstName),
            ["Amar"]
        );
        signInAsChild(HOST);
        assert.equal((await create({ game: "clock", level: 1, friend: friendKeyFor(HOST, GUEST) })).status, 404);
        signInAsChild(GUEST, STRANGER);
        assert.deepEqual(await siblingsOf(GUEST), []);
    });

    it("a teacher or therapist account never makes children directly requestable (same rule as /friends)", async () => {
        const TEACHER = { id: 30, email: "uciteljica@example.com", role: "teacher" };
        db.seed("users", [{ ...TEACHER, full_name: "Učiteljica" }]);
        db.seed("children", [
            { id: 4, first_name: "Emina", last_name: "A", date_of_birth: "2019-01-01", gender: "female", pin_code: "puma,fish,drums,pepsi", experience_points: 0, settings: {} },
            { id: 5, first_name: "Tarik", last_name: "B", date_of_birth: "2019-01-01", gender: "male", pin_code: "zebra,fries,laptop,sprite", experience_points: 0, settings: {} },
        ]);
        db.seed("user_children", [
            { user_id: TEACHER.id, child_id: 4, relationship: "teacher", is_primary: true },
            { user_id: TEACHER.id, child_id: 5, relationship: "teacher", is_primary: true },
        ]);
        resetRateLimit("invite-create:child:4");
        signInAsChild(4, TEACHER);
        assert.deepEqual(await siblingsOf(4), []);
        assert.equal((await create({ game: "clock", level: 1, friend: friendKeyFor(4, 5) }, 4)).status, 404);
        assert.equal(stored(4), undefined);
        signInAsParent(TEACHER);
        assert.equal((await create({ game: "clock", level: 1, friend: friendKeyFor(4, 5) }, 4)).status, 404);
    });

    it("siblings are not stored as friends and do not show up in the parent's removable list", async () => {
        signInAsChild(HOST);
        const [amar] = await siblingsOf(HOST);
        await create({ game: "clock", level: 1, friend: amar.key });
        assert.equal((row(HOST).settings as Record<string, unknown>).playFriends, undefined);
        signInAsParent(PARENT);
        assert.deepEqual(await friendsOf(HOST), []);
    });

    it("the picker lists siblings first, under „Pozovi na drugi telefon”, apart from turn-taking on this device", () => {
        const remote = read("app/dashboard/child/[id]/playRemote.tsx");
        assert.match(remote, /data\.siblings/);
        assert.match(remote, /Pozovi na drugi telefon/);
        assert.match(read("app/dashboard/child/[id]/playTogether.tsx"), /Na ovom uređaju, na smenu/);
    });
});
