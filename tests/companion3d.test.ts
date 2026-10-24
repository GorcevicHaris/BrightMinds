// Model drugara sa 3D katalogom: stari sačuvani podaci (predmeti, odeća, izgledi, cilj, novčići)
// preživljavaju prelazak; novo mesto „bottom”, nove vrste i besplatan izgled čoveka (sa očima i
// hidžabom) rade po istim pravilima. Uz to: kategorije i podvrste prodavnice su stalne.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SUBGROUPS, SLOTS } from "@/app/components/avatar3d/data";
import { COMPANION_CATALOG, ITEMS, getItem } from "@/app/components/avatar3d/manifest";
import { humanLookId, HUMAN_DEFAULT, hijabParts, hijabValue, parseHumanLook } from "@/app/components/avatar3d/looks";
import { applyCompanionAction, sanitizeCompanion, setGoalId, type CompanionState } from "@/lib/companion";
import { CATEGORY_ORDER, groupOf, itemsInSlot, subgroupsOf } from "@/app/dashboard/child/[id]/shopCatalog";

const POINTS = 5 * 1000; // dosta zvezdica za kupovinu u testu

describe("3D drugar: stari podaci", () => {
    it("stari zapis iz 2D prodavnice ostaje isti (predmeti, odeća, izgled, cilj)", () => {
        const raw = {
            kind: "woman",
            owned: ["kruna", "naocare", "kostim-pirata"],
            wear: { hat: "kruna", outfit: "kostim-pirata" },
            spent: 40,
            goal: setGoalId("pirat"),
            skin: { woman: "smedja.crna.rep", cat: "tigrasta" },
            skins: ["cat:tigrasta"],
            v: 7,
        };
        const state = sanitizeCompanion(raw, "female", COMPANION_CATALOG);
        assert.equal(state.kind, "woman");
        assert.deepEqual(state.owned, raw.owned);
        assert.deepEqual(state.wear, raw.wear);
        assert.equal(state.spent, 40);
        assert.equal(state.goal, raw.goal);
        assert.deepEqual(state.skin, raw.skin);
        assert.deepEqual(state.skins, ["cat:tigrasta"]);
        // Stari izgled od tri dela se i dalje čita (oči podrazumevane, bez hidžaba)
        assert.equal(parseHumanLook("woman", "smedja.crna.rep")?.style, "rep");
    });

    it("bez sačuvanog stanja: devojčica ili dečak prema polu deteta", () => {
        assert.equal(sanitizeCompanion(undefined, "female", COMPANION_CATALOG).kind, "girl");
        assert.equal(sanitizeCompanion(undefined, "male", COMPANION_CATALOG).kind, "boy");
    });
});

describe("3D drugar: nove mogućnosti", () => {
    const base: CompanionState = { kind: "girl", owned: [], wear: {}, spent: 0, v: 0 };

    it("nove vrste se biraju (devojčica, dečak, lisica, jednorog…)", () => {
        for (const kind of ["girl", "boy", "fox", "lion", "penguin", "unicorn"]) {
            const result = applyCompanionAction(base, { action: "choose", kind }, 0, COMPANION_CATALOG);
            assert.ok(result.ok, kind);
        }
        // Zmaj je sada pravi drugar (animals/more); nepoznata vrsta se i dalje odbija
        assert.ok(applyCompanionAction(base, { action: "choose", kind: "dragon" }, 0, COMPANION_CATALOG).ok);
        assert.equal(applyCompanionAction(base, { action: "choose", kind: "grifon" }, 0, COMPANION_CATALOG).ok, false);
    });

    it("izgled čoveka je besplatan: koža, oči, kosa, frizura i hidžab, bez kupovine", () => {
        const look = humanLookId({ ...HUMAN_DEFAULT.girl, tone: "kakao", eye: "zelene", hijab: hijabValue("roze", "sportski") });
        const result = applyCompanionAction(base, { action: "skin", kind: "girl", skin: look }, 0, COMPANION_CATALOG);
        assert.ok(result.ok);
        assert.equal(result.ok && result.state.skin?.girl, look);
        assert.equal(result.ok && result.state.spent, 0);
        assert.deepEqual(hijabParts("roze-sportski"), { color: "roze", style: "sportski" });
        // Izgled čoveka ne može da se „kupi” ni da bude cilj
        assert.equal(applyCompanionAction(base, { action: "buySkin", kind: "girl", skin: look }, POINTS, COMPANION_CATALOG).ok, false);
    });

    it("mesto „bottom” radi kao i ostala (kad katalog ima donji deo)", () => {
        const bottom = ITEMS.find((item) => item.slot === "bottom");
        if (!bottom) return; // katalog (#3) ga još nije dodao
        const bought = applyCompanionAction(base, { action: "buy", item: bottom.id }, POINTS, COMPANION_CATALOG);
        assert.ok(bought.ok);
        assert.equal(bought.ok && bought.state.wear.bottom, bottom.id);
    });

    it("kupljen stari predmet se oblači na svoje mesto, cena je ista kao ranije", () => {
        const item = getItem("kruna")!;
        const result = applyCompanionAction(base, { action: "buy", item: "kruna" }, POINTS, COMPANION_CATALOG);
        assert.ok(result.ok);
        assert.equal(result.ok && result.state.spent, item.price);
        assert.equal(result.ok && result.state.wear.hat, "kruna");
    });
});

describe("Prodavnica: kategorije i podvrste", () => {
    it("kategorije su stalnim redom, svako mesto ima tačno jednu", () => {
        const ids = CATEGORY_ORDER.map((c) => c.id);
        assert.equal(ids[0], "sets");
        for (const slot of SLOTS) assert.equal(ids.filter((id) => id === slot).length, 1, slot);
    });

    it("predmeti su od najjeftinijeg (stalan redosled)", () => {
        for (const slot of SLOTS) {
            const list = itemsInSlot(slot);
            for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].price <= list[i].price, `${slot}: ${list[i].id}`);
        }
    });

    it("svaki predmet mesta sa podvrstama ima poznatu podvrstu", () => {
        for (const slot of SLOTS) {
            const groups = SUBGROUPS[slot];
            if (!groups) continue;
            const known = new Set(groups.map((g) => g.id));
            for (const item of itemsInSlot(slot)) {
                const group = groupOf(item);
                assert.ok(group && known.has(group), `${item.id} → ${group}`);
            }
            for (const g of subgroupsOf(slot)) assert.ok(known.has(g.id));
        }
    });
});
