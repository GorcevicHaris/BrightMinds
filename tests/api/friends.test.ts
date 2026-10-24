// GET /api/children/[id]/friends — deca sa istog naloga za „Igraj sa drugom” (samo ime i drugar).
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { GET } from "@/app/api/children/[id]/friends/route";
import { CHILD_ID, OTHER_CHILD_ID, PARENT, STRANGER, db, idParams, jsonRequest, readJson, resetWorld, seedFamily, signInAsChild, signInAsParent, type TestUser } from "../setup/api";

const SIBLING_ID = 3;
const get = (childId = CHILD_ID) => GET(jsonRequest("GET"), idParams(childId));

beforeEach(() => {
    resetWorld();
    seedFamily();
    db.seed("children", [
        {
            id: SIBLING_ID,
            first_name: "Amar Hasan",
            last_name: "Prezimenić",
            date_of_birth: "2019-02-02",
            gender: "male",
            pin_code: "sun,moon,star,tree",
            experience_points: 30,
            settings: { companion: { kind: "dog", owned: [], wear: {}, spent: 0, v: 1 }, volume: 0.4 },
        },
    ]);
    db.seed("user_children", [{ user_id: PARENT.id, child_id: SIBLING_ID, relationship: "parent", is_primary: true }]);
});

describe("GET /api/children/[id]/friends", () => {
    it("lists the other children of the same account with only first name and companion", async () => {
        signInAsChild(CHILD_ID);
        const response = await get();
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        const body = await readJson(response);
        assert.deepEqual(body, { friends: [{ id: SIBLING_ID, firstName: "Amar", companion: { kind: "dog", skin: null, wear: {} } }] });
        // Ništa lično osim imena: bez prezimena, datuma rođenja, PIN-a, poena, podešavanja
        const text = JSON.stringify(body);
        for (const secret of ["Hasan", "Prezimeni", "2019", "sun,moon", "experience", "0.4", "male"]) assert.ok(!text.includes(secret), secret);
    });

    it("works for the parent too and never lists the child itself", async () => {
        signInAsParent();
        const body = await readJson(await get());
        assert.deepEqual((body.friends as { id: number }[]).map((f) => f.id), [SIBLING_ID]);
    });

    it("does not show children of another family", async () => {
        signInAsParent(STRANGER);
        const body = await readJson(await get(OTHER_CHILD_ID));
        assert.deepEqual(body, { friends: [] });
    });

    for (const role of ["teacher", "therapist"]) {
        it(`returns an empty list for a ${role} account, whose children come from different families`, async () => {
            const professional: TestUser = { id: 30, email: `${role}@example.com`, role };
            db.seed("users", [{ ...professional, full_name: "Stručnjak Test" }]);
            db.seed("user_children", [
                { user_id: professional.id, child_id: CHILD_ID, relationship: role, is_primary: false },
                { user_id: professional.id, child_id: OTHER_CHILD_ID, relationship: role, is_primary: false },
                { user_id: professional.id, child_id: SIBLING_ID, relationship: role, is_primary: false },
            ]);
            signInAsParent(professional);
            const asAdult = await get();
            assert.equal(asAdult.status, 200);
            assert.deepEqual(await readJson(asAdult), { friends: [] });
            // Dete prijavljeno PIN-om na nalogu stručnjaka: isto prazno
            signInAsChild(CHILD_ID, professional);
            assert.deepEqual(await readJson(await get()), { friends: [] });
        });
    }

    it("refuses another family's child and anonymous calls", async () => {
        signInAsChild(OTHER_CHILD_ID, STRANGER);
        assert.equal((await get(CHILD_ID)).status, 403);
        resetWorld();
        seedFamily();
        assert.equal((await get(CHILD_ID)).status, 401);
    });
});
