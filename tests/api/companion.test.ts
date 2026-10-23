// GET/PUT /api/children/[id]/companion — pratilac, odeća, novčići i cilj (model: lib/companion.ts).
// Predmeti se biraju iz pravog kataloga po mestu i ceni, pa testovi ne zavise od id-jeva crteža.
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { GET, PUT } from "@/app/api/children/[id]/companion/route";
import { WEAR_ITEMS, type WearItem } from "@/app/components/avatar/wearables";
import { POINTS_PER_STAR, setGoalId } from "@/lib/companion";
// posle spajanja: WEAR_SETS (uvoz iz wearables)
import { WEAR_SETS, type WearSet } from "@/lib/wearSets";
import { CHILD_ID, OTHER_CHILD_ID, db, idParams, jsonRequest, readJson, resetWorld, seedFamily, signInAsChild, signInAsParent } from "../setup/api";

const put = (body: unknown, childId = CHILD_ID) => PUT(jsonRequest("PUT", body), idParams(childId));
const get = (childId = CHILD_ID) => GET(jsonRequest("GET"), idParams(childId));
const childRow = (id = CHILD_ID) => db.rows("children").find((row) => row.id === id) as Record<string, unknown>;
const stored = () => (childRow().settings as Record<string, unknown>).companion as Record<string, unknown>;

const byPrice = [...WEAR_ITEMS].sort((a, b) => a.price - b.price);
/** Najjeftiniji predmet na mestu (ili bilo koji, ako mesto nije dato) */
const cheapest = (slot?: WearItem["slot"]) => byPrice.find((item) => !slot || item.slot === slot) as WearItem;
const priciest = byPrice[byPrice.length - 1];
const hat = cheapest("hat");
const glasses = cheapest("glasses");
const stars = (count: number) => count * POINTS_PER_STAR;

// Komplet iz kataloga; dok katalog nema komplete, probni od najjeftinijeg šešira i naočara
if (WEAR_SETS.length === 0) (WEAR_SETS as WearSet[]).push({ id: "probni-komplet", label: "Probni komplet", items: { hat: hat.id, glasses: glasses.id } });
const set = WEAR_SETS[0];
const setItems = Object.values(set.items) as string[];
const setPrice = setItems.reduce((sum, id) => sum + (WEAR_ITEMS.find((item) => item.id === id)?.price ?? 0), 0);

beforeEach(() => {
    resetWorld();
    seedFamily({ experience_points: stars(priciest.price + hat.price + glasses.price) });
    signInAsChild(CHILD_ID);
});

describe("GET /api/children/[id]/companion", () => {
    it("starts with the familiar teacher, nothing bought, no goal, and all earned coins", async () => {
        const response = await get();
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.deepEqual(await readJson(response), {
            companion: { kind: "woman", owned: [], wear: {}, goal: null },
            coins: priciest.price + hat.price + glasses.price,
        });
    });

    it("reads data saved before the goal and the new slots existed", async () => {
        const old = { kind: "cat", owned: [hat.id, glasses.id], wear: { hat: hat.id, glasses: glasses.id }, spent: hat.price + glasses.price, v: 3 };
        childRow().settings = { volume: 0.5, companion: old };
        const body = await readJson(await get());
        assert.deepEqual(body, { companion: { kind: "cat", owned: old.owned, wear: old.wear, goal: null }, coins: priciest.price });
    });

    it("drops a stored goal that is unknown or already bought", async () => {
        childRow().settings = { companion: { kind: "cat", owned: [hat.id], wear: {}, spent: hat.price, v: 1, goal: hat.id } };
        assert.equal(((await readJson(await get())).companion as Record<string, unknown>).goal, null);
        childRow().settings = { companion: { kind: "cat", owned: [], wear: {}, spent: 0, v: 1, goal: "nema-takvog" } };
        assert.equal(((await readJson(await get())).companion as Record<string, unknown>).goal, null);
    });

    it("refuses another family's child", async () => {
        const response = await get(OTHER_CHILD_ID);
        assert.ok(response.status === 403 || response.status === 404, String(response.status));
    });
});

describe("PUT /api/children/[id]/companion", () => {
    it("sets a goal without spending anything and keeps the other settings", async () => {
        childRow().settings = { script: "cyrillic" };
        const response = await put({ action: "goal", item: priciest.id });
        assert.equal(response.status, 200);
        const body = await readJson(response);
        assert.equal((body.companion as Record<string, unknown>).goal, priciest.id);
        assert.equal(body.coins, priciest.price + hat.price + glasses.price);
        assert.equal((childRow().settings as Record<string, unknown>).script, "cyrillic");
        assert.equal(stored().goal, priciest.id);
        assert.equal(stored().spent, 0);
        assert.equal(stored().v, 1);
    });

    it("clears the goal when the child buys that item", async () => {
        await put({ action: "goal", item: priciest.id });
        const body = await readJson(await put({ action: "buy", item: priciest.id }));
        assert.deepEqual(body.companion, { kind: "woman", owned: [priciest.id], wear: { [priciest.slot]: priciest.id }, goal: null });
        assert.equal(body.coins, hat.price + glasses.price);
        assert.equal("goal" in stored(), false);
        assert.equal(stored().v, 2);
    });

    it("clears the goal on request, and refuses a goal that is unknown or already bought", async () => {
        await put({ action: "goal", item: priciest.id });
        assert.equal(((await readJson(await put({ action: "goal", item: null }))).companion as Record<string, unknown>).goal, null);
        assert.equal((await put({ action: "goal", item: "nema-takvog" })).status, 400);
        await put({ action: "buy", item: hat.id });
        const owned = await put({ action: "goal", item: hat.id });
        assert.equal(owned.status, 400);
        assert.match(String((await readJson(owned)).error), /kupljen/);
    });

    it("takes everything off and keeps every bought item", async () => {
        await put({ action: "buy", item: hat.id });
        await put({ action: "buy", item: glasses.id });
        const body = await readJson(await put({ action: "undress" }));
        assert.deepEqual(body.companion, { kind: "woman", owned: [hat.id, glasses.id], wear: {}, goal: null });
        assert.equal(body.coins, priciest.price);
    });

    it("puts on a whole look of owned items in one request", async () => {
        await put({ action: "buy", item: hat.id });
        await put({ action: "buy", item: glasses.id });
        await put({ action: "undress" });
        const body = await readJson(await put({ action: "outfit", wear: { hat: hat.id, glasses: glasses.id } }));
        assert.deepEqual((body.companion as Record<string, unknown>).wear, { hat: hat.id, glasses: glasses.id });
    });

    it("refuses a look with an item that is not bought, and writes nothing", async () => {
        await put({ action: "buy", item: hat.id });
        const before = structuredClone(stored());
        const updates = db.count("children", "update");
        const response = await put({ action: "outfit", wear: { hat: hat.id, glasses: glasses.id } });
        assert.equal(response.status, 400);
        assert.deepEqual(stored(), before);
        assert.equal(db.count("children", "update"), updates);
    });

    it("answers 402 when the coins are not enough, and spends nothing", async () => {
        childRow().experience_points = stars(priciest.price - 1);
        const response = await put({ action: "buy", item: priciest.id });
        assert.equal(response.status, 402);
        assert.equal(db.count("children", "update"), 0);
    });

    it("answers 400 for malformed requests", async () => {
        for (const body of [{ action: "outfit", wear: { tail: hat.id } }, { action: "outfit", wear: [hat.id] }, { action: "goal" }, { action: "goal", item: 7 }, { action: "wear", slot: "shoes", item: hat.id }]) {
            assert.equal((await put(body)).status, 400, JSON.stringify(body));
        }
        assert.equal(db.count("children", "update"), 0);
    });

    it("buys a whole set in one request, at the sum of the missing prices, wears it and clears the set goal", async () => {
        childRow().experience_points = stars(setPrice);
        await put({ action: "goal", item: setGoalId(set.id) });
        assert.equal(stored().goal, setGoalId(set.id));
        const response = await put({ action: "buySet", set: set.id });
        assert.equal(response.status, 200);
        const body = await readJson(response);
        assert.equal(body.coins, 0);
        assert.deepEqual([...((body.companion as Record<string, unknown>).owned as string[])].sort(), [...setItems].sort());
        assert.deepEqual((body.companion as Record<string, unknown>).wear, set.items);
        assert.equal((body.companion as Record<string, unknown>).goal, null);
        assert.equal(stored().spent, setPrice);
        assert.equal((await put({ action: "buySet", set: set.id })).status, 400);
    });

    it("buys nothing of a set without coins for all of it", async () => {
        childRow().experience_points = stars(setPrice - 1);
        assert.equal((await put({ action: "buySet", set: set.id })).status, 402);
        assert.equal((await put({ action: "buySet", set: "nema-takvog" })).status, 400);
        assert.equal(db.count("children", "update"), 0);
    });

    it("lets the parent act too", async () => {
        signInAsParent();
        assert.equal((await put({ action: "goal", item: priciest.id })).status, 200);
    });

    it("writes only over the state it read: a change in between is re-read, so coins are never spent twice", async (t) => {
        childRow().settings = { companion: { kind: "cat", owned: [], wear: {}, spent: 0, v: 5 } };
        childRow().experience_points = stars(hat.price);
        const from = db.from.bind(db);
        let updates = 0;
        t.mock.method(db, "from", (table: string) => {
            const query = from(table);
            const update = query.update.bind(query);
            query.update = (values) => {
                // Između čitanja i upisa „drugi uređaj” kupuje isti predmet (v 5 → 6)
                if (table === "children" && ++updates === 1) {
                    childRow().settings = { companion: { kind: "cat", owned: [hat.id], wear: { hat: hat.id }, spent: hat.price, v: 6 } };
                }
                return update(values);
            };
            return query;
        });
        const response = await put({ action: "buy", item: hat.id });
        // Drugo čitanje vidi da je predmet već kupljen
        assert.equal(response.status, 400);
        assert.equal(stored().spent, hat.price);
        assert.equal(stored().v, 6);
        assert.equal(updates, 1);
    });

    it("retries after a change in between and then writes on top of it", async (t) => {
        childRow().settings = { companion: { kind: "cat", owned: [], wear: {}, spent: 0, v: 2 } };
        const from = db.from.bind(db);
        let updates = 0;
        t.mock.method(db, "from", (table: string) => {
            const query = from(table);
            const update = query.update.bind(query);
            query.update = (values) => {
                if (table === "children" && ++updates === 1) {
                    childRow().settings = { companion: { kind: "dog", owned: [], wear: {}, spent: 0, v: 3 } };
                }
                return update(values);
            };
            return query;
        });
        const body = await readJson(await put({ action: "goal", item: priciest.id }));
        assert.equal(updates, 2);
        assert.deepEqual(body.companion, { kind: "dog", owned: [], wear: {}, goal: priciest.id });
        assert.equal(stored().v, 4);
    });
});
