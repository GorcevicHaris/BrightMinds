// 3D katalog predmeta: svaki zapis iz items/*.data.ts ima 3D crtež i obrnuto, novi predmeti
// imaju podvrstu (čip u prodavnici) i stalnu cenu, kompleti koriste prave predmete, a svaki
// predmet se sagradi na devojčici, učitelju i životinji (zamena) u budžetu trouglova.
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { installFakeCanvas } from "./setup/fakeCanvas";
import { WEAR_ITEMS, WEAR_SETS } from "@/app/components/avatar/wearables";
import { SLOTS, SUBGROUPS, type CompanionKind, type Slot } from "@/app/components/avatar3d/data";
import { ITEMS, SETS, getItem, itemsOf } from "@/app/components/avatar3d/manifest";

installFakeCanvas();

type Harness = typeof import("@/app/components/avatar3d/items/dev/harness");
type Contract = typeof import("@/app/components/avatar3d/contract");
let harness: Harness;
let contract: Contract;

/** Budžet trouglova po mestu (contract.ts) */
function budget(slot: Slot, id: string): number {
    if (slot === "outfit") return (getItem(id)?.hides ?? []).includes("bottom") ? 24000 : 16000;
    if (slot === "bottom") return 16000;
    if (slot === "hand" || slot === "back") return 12000;
    if (slot === "background") return 60000;
    return 10000;
}

describe("3D katalog predmeta", () => {
    before(async () => {
        contract = await import("@/app/components/avatar3d/contract");
        harness = await import("@/app/components/avatar3d/items/dev/harness");
        await import("@/app/components/avatar3d/items/index");
        // Prave životinje (#2): predmeti se proveravaju na njima, ne na zamenama
        await import("@/app/components/avatar3d/animals/index");
    });

    it("svaki predmet iz podataka ima 3D crtež na svom mestu, i nema crteža bez podataka", () => {
        const { items, backgrounds } = contract.registeredIds();
        for (const item of ITEMS) {
            if (item.slot === "pet") continue; // ljubimci su posao #2
            if (item.slot === "background") assert.ok(backgrounds.includes(item.id), `pozadina ${item.id}`);
            else assert.equal(contract.itemBuilder(item.id)?.slot, item.slot, item.id);
        }
        for (const id of items) assert.ok(getItem(id), `crtež bez podataka: ${id}`);
        for (const id of backgrounds) assert.equal(getItem(id)?.slot, "background", id);
    });

    it("svih 228 starih predmeta je sačuvano, a novih ima (katalog ≥ 260)", () => {
        assert.equal(WEAR_ITEMS.length, 228);
        for (const old of WEAR_ITEMS) assert.equal(getItem(old.id)?.price, old.price, old.id);
        assert.ok(ITEMS.length >= 260, `ukupno ${ITEMS.length}`);
        assert.ok(itemsOf("bottom").length >= 24);
    });

    it("svaki predmet na mestima sa čipovima ima tačnu podvrstu", () => {
        for (const slot of SLOTS) {
            const groups = SUBGROUPS[slot];
            if (!groups) continue;
            const ids = new Set(groups.map((g) => g.id));
            for (const item of itemsOf(slot)) assert.ok(item.group && ids.has(item.group), `${item.id}: ${item.group}`);
        }
    });

    it("novi predmeti imaju stalnu razumnu cenu, a donji deo 3–15", () => {
        const old = new Set(WEAR_ITEMS.map((i) => i.id));
        for (const item of ITEMS) {
            if (old.has(item.id)) continue;
            assert.ok(Number.isInteger(item.price) && item.price >= 3 && item.price <= 30, `${item.id}: ${item.price}`);
            if (item.slot === "bottom") assert.ok(item.price <= 15, item.id);
        }
    });

    it("kompleti: stari su tu, ima bar 16 novih, i svi koriste postojeće predmete na pravom mestu", () => {
        for (const old of WEAR_SETS) assert.ok(SETS.some((s) => s.id === old.id), old.id);
        assert.ok(SETS.length >= WEAR_SETS.length + 16);
        for (const set of SETS) {
            for (const [slot, id] of Object.entries(set.items)) assert.equal(getItem(id!)?.slot, slot, `${set.id}/${id}`);
            // Gornji deo koji ne pokriva noge ide uz donji deo
            const outfit = set.items.outfit ? getItem(set.items.outfit) : undefined;
            if (outfit && !(outfit.hides ?? []).includes("bottom")) assert.ok(set.items.bottom, `${set.id}: nedostaje donji deo`);
        }
    });

    it("svaki predmet se sagradi na devojčici, učitelju, tinejdžerima, nani, dedi i životinjama (mačka, zeka, jednorog, pingvin, lav), bez grešaka i u budžetu", () => {
        // Učitelj (odrasli) i zeka (visoke uši) u slabijem kvalitetu — samo da se sagrade bez greške;
        // dedo (najširi struk) u punom kvalitetu, da se proveri i budžet na drugoj građi
        const kinds: [CompanionKind, "high" | "low"][] = [
            ["girl", "high"], ["cat", "high"], ["grandpa", "high"], ["man", "low"], ["teengirl", "low"], ["teenboy", "low"], ["grandma", "low"],
            ["bunny", "low"], ["unicorn", "low"], ["penguin", "low"], ["lion", "low"],
        ];
        const over: string[] = [];
        for (const [kind, quality] of kinds) {
            const plain = harness.buildTestFigure(kind, { hat: false });
            const hatted = harness.buildTestFigure(kind, { hat: true });
            for (const item of ITEMS) {
                if (item.slot === "pet" || item.slot === "background") continue;
                const figure = item.slot === "hat" ? hatted : plain;
                const worn = harness.wearItem(figure, item.id, { [item.slot]: item.id }, quality);
                assert.ok(worn, `${item.id} na ${kind}`);
                const tris = harness.triangles(worn.objects);
                if (quality === "high" && tris > budget(item.slot, item.id)) over.push(`${item.id}@${kind}: ${tris}`);
                // Ništa ne sme da ima NaN koordinate (pokvaren kroj)
                for (const object of worn.objects) {
                    object.traverse((o) => {
                        const geometry = (o as { geometry?: { getAttribute: (n: string) => { array: ArrayLike<number> } } }).geometry;
                        const position = geometry?.getAttribute("position");
                        if (!position) return;
                        for (let i = 0; i < position.array.length; i += 97) assert.ok(Number.isFinite(position.array[i]), `${item.id} na ${kind}: NaN`);
                    });
                }
                harness.takeOff(worn);
            }
        }
        assert.deepEqual(over, []);
    });

    it("svaka pozadina se sagradi u budžetu (široko i uspravno, i slabiji kvalitet)", () => {
        for (const item of itemsOf("background")) {
            const builder = contract.backgroundBuilder(item.id)!;
            for (const wide of [true, false]) {
                for (const quality of ["high", "low"] as const) {
                    const env = builder.build({ figureHeight: 1.2, wide, quality });
                    assert.ok(harness.triangles([env.root]) <= 60000, `${item.id} ${wide ? "široko" : "uspravno"} ${quality}`);
                    env.animate?.(1, 0.016, true);
                    env.animate?.(1, 0.016, false);
                }
            }
        }
    });
});
