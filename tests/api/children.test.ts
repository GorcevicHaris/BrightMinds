// GET/POST /api/children — spisak i dodavanje dece; PUT /api/children/[id] — izmena tajnog koda.
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { PUT } from "@/app/api/children/[id]/route";
import { GET, POST } from "@/app/api/children/route";
import { shiftDateOnly } from "@/lib/validation";
import { CHILD_ID, CHILD_PIN, OTHER_CHILD_ID, PARENT, belgradeDay, db, idParams, jsonRequest, readJson, resetWorld, seedFamily, signInAsParent } from "../setup/api";

const FREE_PIN = "lion,eggs,ball,cedevita";

const newChild = (overrides: Record<string, unknown> = {}) => ({
    first_name: "Ana",
    last_name: "Petrović",
    date_of_birth: "2021-04-10",
    gender: "female",
    ...overrides,
});

const post = (body: unknown) => POST(jsonRequest("POST", body));
const children = () => db.rows("children");
const links = () => db.rows("user_children");

beforeEach(() => {
    resetWorld();
    seedFamily();
    signInAsParent();
});

describe("POST /api/children", () => {
    it("creates the child, links it to the signed-in adult and returns it", async () => {
        const response = await post(newChild({ first_name: "  Ana ", notes: "  voli slagalice ", pin_code: ` ${FREE_PIN.replaceAll(",", " , ")} ` }));
        assert.equal(response.status, 201);

        const created = children().at(-1);
        assert.ok(created);
        assert.deepEqual(await readJson(response), {
            child: {
                id: created.id,
                first_name: "Ana",
                last_name: "Petrović",
                date_of_birth: "2021-04-10",
                gender: "female",
                notes: "voli slagalice",
                pin_code: FREE_PIN,
                streak: 0,
                experience_points: 0,
                created_at: null,
                settings: {},
            },
        });
        assert.equal(children().length, 3);
        assert.deepEqual(
            links().filter((link) => link.child_id === created.id).map(({ user_id, relationship, is_primary }) => ({ user_id, relationship, is_primary })),
            [{ user_id: PARENT.id, relationship: "parent", is_primary: true }]
        );
    });

    it("answers 409 when another child already uses the picture PIN", async () => {
        const response = await post(newChild({ pin_code: CHILD_PIN }));
        assert.equal(response.status, 409);
        assert.match(String((await readJson(response)).error), /tajni kod/i);
        assert.equal(children().length, 2);
        assert.equal(links().length, 2);
    });

    it("answers 409 for a taken PIN that belongs to a child of another account", async () => {
        const response = await post(newChild({ pin_code: "cat,burger,book,sprite" }));
        assert.equal(response.status, 409);
        assert.equal(children().length, 2);
    });

    it("answers 409 when the unique index catches a PIN taken in the same moment", async () => {
        db.failNext("children", "insert", { code: "23505" });
        const response = await post(newChild({ pin_code: FREE_PIN }));
        assert.equal(response.status, 409);
        assert.equal(children().length, 2);
    });

    it("stores a child without a PIN and without notes as nulls", async () => {
        const response = await post(newChild({ pin_code: "", notes: "   " }));
        assert.equal(response.status, 201);
        const created = children().at(-1);
        assert.equal(created?.pin_code, null);
        assert.equal(created?.notes, null);
    });

    it("lets several children have no PIN", async () => {
        assert.equal((await post(newChild())).status, 201);
        assert.equal((await post(newChild({ first_name: "Iva" }))).status, 201);
        assert.equal(children().length, 4);
    });

    // Datumi se računaju u trenutku testa (lažni sat), zato su ovo funkcije
    const invalid: [string, () => Record<string, unknown>][] = [
        ["a missing first name", () => newChild({ first_name: undefined })],
        ["a blank first name", () => newChild({ first_name: "   " })],
        ["a first name longer than 60 characters", () => newChild({ first_name: "a".repeat(61) })],
        ["a missing last name", () => newChild({ last_name: "" })],
        ["a date of birth that does not exist", () => newChild({ date_of_birth: "2021-02-30" })],
        ["a date of birth in another format", () => newChild({ date_of_birth: "10.04.2021" })],
        ["a date of birth in the future", () => newChild({ date_of_birth: belgradeDay(1) })],
        ["a date of birth more than 25 years ago", () => newChild({ date_of_birth: shiftDateOnly(belgradeDay(-1), { years: -25 }) })],
        ["an unknown gender", () => newChild({ gender: "robot" })],
        ["notes longer than 500 characters", () => newChild({ notes: "a".repeat(501) })],
        ["a PIN with a picture from the wrong group", () => newChild({ pin_code: "pizza,dog,car,pepsi" })],
        ["a PIN with only three pictures", () => newChild({ pin_code: "dog,pizza,car" })],
    ];

    for (const [name, body] of invalid) {
        it(`answers 400 and stores nothing for ${name}`, async () => {
            const response = await post(body());
            assert.equal(response.status, 400);
            assert.equal(typeof (await readJson(response)).error, "string");
            assert.equal(children().length, 2);
        });
    }

    it("accepts a child born today and a child exactly 25 years old", async () => {
        assert.equal((await post(newChild({ date_of_birth: belgradeDay() }))).status, 201);
        assert.equal((await post(newChild({ date_of_birth: shiftDateOnly(belgradeDay(), { years: -25 }) }))).status, 201);
    });

    it("removes the child again when linking it to the adult fails", async (t) => {
        const logged = t.mock.method(console, "error", () => undefined);
        db.failNext("user_children", "insert", { code: "XX000" });
        const response = await post(newChild());
        assert.equal(response.status, 500);
        assert.equal(children().length, 2);
        assert.equal(links().length, 2);
        assert.equal(logged.mock.callCount(), 1);
    });

    it("works before migration 0002, when the settings column does not exist", async () => {
        db.dropColumns("children", "settings");
        const response = await post(newChild());
        assert.equal(response.status, 201);
        assert.deepEqual(((await readJson(response)).child as { settings: unknown }).settings, {});
    });
});

describe("GET /api/children", () => {
    it("lists the adult's children by first name, without internal columns", async () => {
        await post(newChild({ first_name: "Ana" }));
        db.rows("children")[0].last_login_at = "2026-03-14T10:00:00Z";
        const body = await readJson(await GET());
        const list = body.children as Record<string, unknown>[];
        assert.deepEqual(
            list.map((item) => item.first_name),
            ["Ana", "Mila"]
        );
        for (const item of list) {
            assert.deepEqual(Object.keys(item).sort(), [
                "created_at",
                "date_of_birth",
                "experience_points",
                "first_name",
                "gender",
                "id",
                "last_name",
                "notes",
                "pin_code",
                "settings",
                "streak",
            ]);
        }
    });

    it("returns an empty list for an adult without children", async () => {
        signInAsParent({ id: 30, email: "nov@example.com", role: "teacher" });
        assert.deepEqual(await readJson(await GET()), { children: [] });
    });
});

describe("PUT /api/children/[id]", () => {
    const put = (body: unknown, id = CHILD_ID) => PUT(jsonRequest("PUT", body), idParams(id));
    const mila = () => children().find((row) => row.id === CHILD_ID);

    it("lets a child keep its own PIN when the profile is edited", async () => {
        const response = await put(newChild({ first_name: "Milica", pin_code: CHILD_PIN }));
        assert.equal(response.status, 200);
        assert.equal(mila()?.first_name, "Milica");
        assert.equal(mila()?.pin_code, CHILD_PIN);
    });

    it("answers 409 when the new PIN belongs to another child", async () => {
        const response = await put(newChild({ pin_code: "cat,burger,book,sprite" }));
        assert.equal(response.status, 409);
        assert.equal(mila()?.pin_code, CHILD_PIN);
        assert.equal(mila()?.first_name, "Mila");
    });

    it("leaves PIN and notes alone when they are not sent, and clears them when sent as null", async () => {
        db.rows("children")[0].notes = "stara napomena";
        await put(newChild());
        assert.equal(mila()?.pin_code, CHILD_PIN);
        assert.equal(mila()?.notes, "stara napomena");

        await put(newChild({ pin_code: null, notes: null }));
        assert.equal(mila()?.pin_code, null);
        assert.equal(mila()?.notes, null);
    });

    it("does not change points, streak or settings", async () => {
        Object.assign(db.rows("children")[0], { experience_points: 55, streak: 4, settings: { script: "cyrillic" } });
        await put(newChild({ experience_points: 9999, streak: 99, settings: {} }));
        assert.equal(mila()?.experience_points, 55);
        assert.equal(mila()?.streak, 4);
        assert.deepEqual(mila()?.settings, { script: "cyrillic" });
        assert.equal(children().find((row) => row.id === OTHER_CHILD_ID)?.first_name, "Luka");
    });
});
