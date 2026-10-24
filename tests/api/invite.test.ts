// /api/children/[id]/invite i /invite/join — igra sa drugom na drugom uređaju (lib/invite.ts).
// Bezbednost: ko sme da pravi i koristi poziv, šta odgovor otkriva, jednokratnost, rok,
// ograničenje pogađanja i to da se tajni kanal ne može izvesti iz koda od sličica.
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { beforeEach, describe, it } from "node:test";
import { DELETE, GET, POST } from "@/app/api/children/[id]/invite/route";
import { POST as JOIN } from "@/app/api/children/[id]/invite/join/route";
import { GET as GET_SETTINGS, PUT as PUT_SETTINGS } from "@/app/api/children/[id]/settings/route";
import { INVITE_CODE_TTL_MS, INVITE_SESSION_TTL_MS } from "@/lib/invite";
import { resetRateLimit } from "@/lib/rateLimit";
import { VISUAL_PIN_CATEGORIES } from "@/lib/visualPinData";
import {
    CHILD_ID,
    OTHER_CHILD_ID,
    PARENT,
    STRANGER,
    advanceClock,
    cookieJar,
    db,
    idParams,
    jsonRequest,
    readJson,
    resetWorld,
    seedFamily,
    signInAsChild,
    signInAsParent,
} from "../setup/api";

const HOST = CHILD_ID; // Mila (porodica PARENT)
const GUEST = OTHER_CHILD_ID; // Luka (druga porodica, STRANGER)
const SIBLING = 3; // Amar (porodica PARENT)

let ipCounter = 0;
/** Svaki test sa svoje adrese, da se ograničenja po adresi ne prenose između testova */
let ip = "10.0.0.1";

const create = (body: unknown = { game: "counting", level: 2 }, childId = HOST, from = ip) => POST(jsonRequest("POST", body, { "x-forwarded-for": from }), idParams(childId));
const status = (childId = HOST) => GET(jsonRequest("GET"), idParams(childId));
const end = (childId = HOST) => DELETE(jsonRequest("DELETE"), idParams(childId));
const join = (code: unknown, childId = GUEST, from = ip) => JOIN(jsonRequest("POST", { code }, { "x-forwarded-for": from }), idParams(childId));
const childRow = (id: number) => db.rows("children").find((row) => row.id === id) as Record<string, unknown>;
const storedInvite = (id = HOST) => (childRow(id).settings as Record<string, unknown>).invite as Record<string, unknown> | undefined;

interface HostInvite {
    status: string;
    channel: string;
    code?: string[];
    game: string;
    level: number;
    friend?: { firstName: string; companion: Record<string, unknown> };
}

/** Domaćin (dečja sesija) pravi poziv; vraća kod i kanal. */
async function hostCreates(body: unknown = { game: "counting", level: 2 }): Promise<HostInvite> {
    signInAsChild(HOST);
    const response = await create(body);
    assert.equal(response.status, 200);
    return (await readJson(response)).invite as HostInvite;
}

/** Ostala sličica u svakoj grupi — sigurno drugačiji kod od datog. */
function otherCode(code: string[]): string[] {
    return VISUAL_PIN_CATEGORIES.map((category, index) => category.items.find((item) => item.id !== code[index])!.id);
}

beforeEach(() => {
    resetWorld();
    seedFamily({ settings: { companion: { kind: "cat", owned: [], wear: {}, spent: 0, v: 4 }, volume: 0.5 } });
    db.seed("children", [
        { id: SIBLING, first_name: "Amar", last_name: "Test", date_of_birth: "2019-02-02", gender: "male", pin_code: "lion,eggs,ball,cola", experience_points: 0, settings: {} },
    ]);
    db.seed("user_children", [{ user_id: PARENT.id, child_id: SIBLING, relationship: "parent", is_primary: true }]);
    // Drugo dete ima pravo prezime i nadimak — ne sme da stigne do domaćina
    childRow(GUEST).first_name = "Luka Marko";
    ip = `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;
    for (const id of [HOST, GUEST, SIBLING]) {
        resetRateLimit(`invite-join:child:${id}`);
        resetRateLimit(`invite-create:child:${id}`);
    }
    resetRateLimit("invite-join:all");
});

describe("POST /api/children/[id]/invite (domaćin)", () => {
    it("creates a 4-picture code and a secret channel, stored in the host's settings", async () => {
        const invite = await hostCreates();
        assert.equal(invite.status, "waiting");
        assert.equal(invite.game, "counting");
        assert.equal(invite.level, 2);
        assert.equal(invite.code?.length, 4);
        invite.code!.forEach((id, index) => assert.ok(VISUAL_PIN_CATEGORIES[index].items.some((item) => item.id === id)));
        assert.match(invite.channel, /^bm-inv-[0-9a-f]{40}$/);

        const stored = storedInvite()!;
        assert.equal(stored.code, invite.code!.join(","));
        assert.equal(stored.hostFirstName, "Mila");
        assert.equal(Date.parse(stored.expiresAt as string) - Date.now(), INVITE_CODE_TTL_MS);
        // Ostala podešavanja i drugar ostaju netaknuti
        const settings = childRow(HOST).settings as Record<string, unknown>;
        assert.equal(settings.volume, 0.5);
        assert.deepEqual((settings.companion as Record<string, unknown>).v, 4);
    });

    it("requires access to the host child: no session, another family, or another child's session are refused", async () => {
        cookieJar.clear();
        assert.equal((await create()).status, 401);
        signInAsParent(STRANGER);
        assert.equal((await create()).status, 403);
        signInAsChild(SIBLING);
        assert.equal((await create()).status, 403);
        signInAsChild(GUEST, STRANGER);
        assert.equal((await create()).status, 403);
        assert.equal(storedInvite(), undefined);
        // Roditelj domaćina sme (otvara igru iz svog panela)
        signInAsParent(PARENT);
        assert.equal((await create()).status, 200);
    });

    it("refuses a child session whose secret code was changed (session revoked)", async () => {
        signInAsChild(HOST);
        childRow(HOST).pin_code = "tiger,burger,lego,cola";
        const response = await create();
        assert.equal(response.status, 401);
        assert.equal(storedInvite(), undefined);
    });

    it("rejects unknown games, the sound game and impossible levels", async () => {
        signInAsChild(HOST);
        for (const body of [{ game: "nope", level: 1 }, { game: "sound-to-image", level: 1 }, { game: "memory", level: 0 }, { game: "memory", level: 99 }, { game: "memory", level: 1.5 }, {}]) {
            assert.equal((await create(body)).status, 400, JSON.stringify(body));
        }
    });

    it("refuses a game the parent turned off for the host", async () => {
        (childRow(HOST).settings as Record<string, unknown>).disabledGames = ["memory"];
        signInAsChild(HOST);
        assert.equal((await create({ game: "memory", level: 1 })).status, 403);
    });

    it("never hands out a code that is someone's login code or another active invite", async () => {
        // Nijedan od 30 kodova nije jednak tajnom kodu bilo kog deteta ni drugom aktivnom pozivu
        const pins = new Set(db.rows("children").map((row) => row.pin_code));
        const seen = new Set<string>();
        for (let i = 0; i < 30; i++) {
            const id = 100 + i;
            db.seed("children", [{ id, first_name: `Dete${i}`, last_name: "T", date_of_birth: "2019-01-01", gender: "male", pin_code: null, settings: {} }]);
            db.seed("user_children", [{ user_id: PARENT.id, child_id: id, relationship: "parent", is_primary: true }]);
            signInAsParent(PARENT);
            const invite = (await readJson(await create(undefined, id, `10.9.${i}.1`))).invite as HostInvite;
            const code = invite.code!.join(",");
            assert.ok(!pins.has(code));
            assert.ok(!seen.has(code), "isti kod kao drugi aktivan poziv");
            seen.add(code);
        }
    });

    it("rate-limits creating codes per child", async () => {
        signInAsChild(HOST);
        for (let i = 0; i < 10; i++) assert.equal((await create(undefined, HOST, `10.8.${i}.1`)).status, 200);
        const limited = await create(undefined, HOST, "10.8.99.1");
        assert.equal(limited.status, 429);
        assert.ok(limited.headers.get("retry-after"));
    });

    it("a new invite replaces the old one (the old code stops working)", async () => {
        const first = await hostCreates();
        const second = await hostCreates({ game: "memory", level: 1 });
        assert.notEqual(first.channel, second.channel);
        signInAsChild(GUEST, STRANGER);
        if (first.code!.join(",") !== second.code!.join(",")) assert.equal((await join(first.code)).status, 404);
        assert.equal((await join(second.code)).status, 200);
    });
});

describe("POST /api/children/[id]/invite/join (gost)", () => {
    it("a child from another family joins with a valid code and gets ONLY first name, companion, game, level and channel", async () => {
        const invite = await hostCreates();
        signInAsChild(GUEST, STRANGER);
        const response = await join(invite.code);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        const body = await readJson(response);
        assert.deepEqual(Object.keys(body).sort(), ["channel", "friend", "game", "level"]);
        assert.deepEqual(body.friend, { firstName: "Mila", companion: { kind: "cat", skin: null, wear: {} } });
        assert.equal(body.game, "counting");
        assert.equal(body.level, 2);
        assert.equal(body.channel, invite.channel);
        const text = JSON.stringify(body);
        for (const secret of ["Test", "2020", "female", "\"id\"", "dog,pizza", "0.5", "expires", "code"]) assert.ok(!text.includes(secret), secret);

        // Domaćin vidi samo ime i drugara gosta (bez drugog imena, prezimena, uzrasta)
        signInAsChild(HOST);
        const host = (await readJson(await status())).invite as HostInvite;
        assert.equal(host.status, "joined");
        assert.equal(host.code, undefined);
        assert.deepEqual(host.friend, { firstName: "Luka", companion: { kind: "boy", skin: null, wear: {} } });
        assert.ok(!JSON.stringify(host).includes("Marko") && !JSON.stringify(host).includes("Drugi"));
    });

    it("the code is single-use: a second join (anyone) is refused", async () => {
        const invite = await hostCreates();
        signInAsChild(GUEST, STRANGER);
        assert.equal((await join(invite.code)).status, 200);
        assert.equal(storedInvite()!.code, null);
        assert.equal((await join(invite.code)).status, 404);
        signInAsChild(SIBLING);
        assert.equal((await join(invite.code, SIBLING)).status, 404);
    });

    it("refuses an expired code and clears it", async () => {
        const invite = await hostCreates();
        advanceClock(INVITE_CODE_TTL_MS + 1000);
        signInAsChild(GUEST, STRANGER);
        const response = await join(invite.code);
        assert.equal(response.status, 404);
        assert.equal(storedInvite(), undefined);
        // Domaćin: „Kod više ne važi, napravi novi”
        signInAsChild(HOST);
        assert.deepEqual(await readJson(await status()), { invite: null });
    });

    it("the host's status call reports and clears an expired code", async () => {
        await hostCreates();
        advanceClock(INVITE_CODE_TTL_MS + 1000);
        const body = await readJson(await status());
        assert.deepEqual(body, { invite: null, expired: true });
        assert.equal(storedInvite(), undefined);
    });

    it("a joined session ends after a few hours", async () => {
        const invite = await hostCreates();
        signInAsChild(GUEST, STRANGER);
        assert.equal((await join(invite.code)).status, 200);
        advanceClock(INVITE_SESSION_TTL_MS + 1000);
        signInAsChild(HOST);
        assert.deepEqual(await readJson(await status()), { invite: null, expired: true });
    });

    it("refuses unknown and malformed codes with the same answer", async () => {
        const invite = await hostCreates();
        signInAsChild(GUEST, STRANGER);
        const unknown = await join(otherCode(invite.code!));
        assert.equal(unknown.status, 404);
        const message = (await readJson(unknown)).error;
        for (const bad of [null, "", "dog", ["dog", "x", "y", "z"], { a: 1 }, invite.code!.slice().reverse()]) {
            const response = await join(bad);
            assert.equal(response.status, 404, JSON.stringify(bad));
            assert.equal((await readJson(response)).error, message);
        }
        assert.ok(storedInvite()!.code, "pogrešni pokušaji ne troše tuđi poziv");
    });

    it("the host cannot join their own invite", async () => {
        const invite = await hostCreates();
        const response = await join(invite.code, HOST);
        assert.equal(response.status, 400);
        assert.ok(storedInvite()!.code, "kod i dalje čeka druga");
    });

    it("requires a session for the guest's OWN child", async () => {
        const invite = await hostCreates();
        cookieJar.clear();
        assert.equal((await join(invite.code)).status, 401);
        // Dečja sesija drugog deteta ne sme da uđe „u ime” gosta
        signInAsChild(SIBLING);
        assert.equal((await join(invite.code, GUEST)).status, 403);
        // Ni tuđi roditelj
        signInAsParent(PARENT);
        assert.equal((await join(invite.code, GUEST)).status, 403);
        assert.ok(storedInvite()!.code);
        // Roditelj gosta sme (otvorio je igru deteta iz svog panela)
        signInAsParent(STRANGER);
        assert.equal((await join(invite.code, GUEST)).status, 200);
    });

    it("refuses a guest whose child session was revoked (secret code changed)", async () => {
        const invite = await hostCreates();
        signInAsChild(GUEST, STRANGER);
        childRow(GUEST).pin_code = "tiger,burger,lego,cola";
        assert.equal((await join(invite.code)).status, 401);
        assert.ok(storedInvite()!.code);
    });

    it("rate-limits guesses per address and per guest child", async () => {
        const invite = await hostCreates();
        const wrong = otherCode(invite.code!);
        signInAsChild(GUEST, STRANGER);
        for (let i = 0; i < 10; i++) assert.equal((await join(wrong)).status, 404);
        const limited = await join(invite.code);
        assert.equal(limited.status, 429, "ni tačan kod ne prolazi posle 10 pogrešnih");
        assert.ok(Number(limited.headers.get("retry-after")) > 0);

        // Isto dete sa druge adrese: i dalje ograničeno (brojanje po detetu)
        assert.equal((await join(invite.code, GUEST, "10.200.0.1")).status, 429);
        // Drugo dete sa iste adrese: ograničeno po adresi
        signInAsChild(SIBLING);
        assert.equal((await join(invite.code, SIBLING)).status, 429);

        // Posle 10 minuta ponovo može
        advanceClock(10 * 60 * 1000 + 1000);
        signInAsChild(HOST);
        const fresh = (await readJson(await create(undefined, HOST, "10.201.0.1"))).invite as HostInvite;
        signInAsChild(GUEST, STRANGER);
        assert.equal((await join(fresh.code)).status, 200);
    });

    it("refuses a game that is turned off for the guest, without using up the code", async () => {
        const invite = await hostCreates();
        (childRow(GUEST).settings as Record<string, unknown>).disabledGames = ["counting"];
        signInAsChild(GUEST, STRANGER);
        assert.equal((await join(invite.code)).status, 409);
        assert.ok(storedInvite()!.code);
    });

    it("never accepts an invite code that has become a login code", async () => {
        const invite = await hostCreates();
        childRow(SIBLING).pin_code = invite.code!.join(",");
        signInAsChild(GUEST, STRANGER);
        assert.equal((await join(invite.code)).status, 404);
        assert.equal(storedInvite(), undefined);
    });

    it("refuses when two hosts got the same code (nobody gets paired with the wrong friend)", async () => {
        const invite = await hostCreates();
        const copy = { ...storedInvite()!, channelKey: "AAAAAAAAAAAAAAAAAAAAAAAA" };
        (childRow(SIBLING).settings as Record<string, unknown>).invite = copy;
        signInAsChild(GUEST, STRANGER);
        assert.equal((await join(invite.code)).status, 404);
    });
});

describe("tajni kanal", () => {
    it("is not derivable from the code: not a hash of it, no child id inside, new for every invite", async () => {
        const first = await hostCreates();
        const code = first.code!.join(",");
        const secret = process.env.JWT_SECRET!;
        const tag = first.channel.replace("bm-inv-", "");
        for (const guess of [
            createHash("sha256").update(code).digest("hex"),
            createHmac("sha256", secret).update(code).digest("hex"),
            createHmac("sha256", secret).update(`invite:${code}`).digest("hex"),
            createHmac("sha256", secret).update(`invite:${HOST}:${code}`).digest("hex"),
        ]) {
            assert.ok(!guess.startsWith(tag.slice(0, 16)), "kanal se izvodi iz koda");
        }
        for (const id of code.split(",")) assert.ok(!first.channel.includes(id));
        assert.ok(!first.channel.includes(`-${HOST}-`));
        // Ključ kanala je nasumičan: novi poziv istog deteta ima drugi kanal
        const second = await hostCreates();
        assert.notEqual(first.channel, second.channel);
        // Ključ kanala nije ni u kodu
        assert.ok(!code.includes(storedInvite()!.channelKey as string));
    });
});

describe("DELETE /api/children/[id]/invite i podešavanja", () => {
    it("the host ends the game with a friend: the invite is cleared", async () => {
        const invite = await hostCreates();
        signInAsChild(GUEST, STRANGER);
        assert.equal((await join(invite.code)).status, 200);
        // Gost ne može da obriše tuđi poziv
        assert.equal((await end()).status, 403);
        signInAsChild(HOST);
        assert.equal((await end()).status, 200);
        assert.equal(storedInvite(), undefined);
        assert.deepEqual(await readJson(await status()), { invite: null });
        // Drugar i ostala podešavanja ostaju
        assert.equal(((childRow(HOST).settings as Record<string, unknown>).companion as Record<string, unknown>).kind, "cat");
    });

    it("the invite never leaves through the settings API, and saving settings keeps it", async () => {
        await hostCreates();
        signInAsParent(PARENT);
        const body = await readJson(await GET_SETTINGS(jsonRequest("GET"), idParams(HOST)));
        assert.equal((body.settings as Record<string, unknown>).invite, undefined);
        assert.ok((body.settings as Record<string, unknown>).companion);
        const saved = await PUT_SETTINGS(jsonRequest("PUT", { settings: { volume: 0.3 } }), idParams(HOST));
        assert.equal(saved.status, 200);
        assert.ok(storedInvite()?.code, "poziv ostaje posle čuvanja podešavanja");
    });
});
