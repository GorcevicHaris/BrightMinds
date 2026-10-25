// app/dashboard/child/[id]/mapWorlds.tsx — crteži četiri sveta „Mape” (livada, pustinja, vulkan, led).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mapLayout } from "@/app/dashboard/child/[id]/gameMapLayout";
import { WORLDS, WorldBadge, WorldBridge, WorldGate, WorldScenery, WorldStart, worldRoad, worldTheme, type WorldId } from "@/app/dashboard/child/[id]/mapWorlds";

const IDS: WorldId[] = ["meadow", "desert", "volcano", "ice"];
const STATES = ["locked", "key", "open"] as const;
const EMOJI = /\p{Extended_Pictographic}/u;
const HEX = /^#[0-9A-F]{6}$/;

/** Boja tela katanca: postoji samo dok je katanac na kapiji ili kovčegu */
const PADLOCK = "#F7BE3B";

describe("map worlds", () => {
    it("has the four worlds in order, with Serbian (ekavian) names and places", () => {
        assert.deepEqual(
            WORLDS.map((w) => w.id),
            IDS
        );
        assert.deepEqual(
            WORLDS.map((w) => w.name),
            ["Zelena livada", "Peščana pustinja", "Vatreni vulkan", "Ledeni vrhovi"]
        );
        assert.deepEqual(
            WORLDS.map((w) => w.where),
            ["na livadi", "u pustinji", "na vulkanu", "na ledenim vrhovima"]
        );
        for (const id of IDS) assert.equal(worldTheme(id).id, id);
    });

    it("gives every world its own colors", () => {
        const all = WORLDS.flatMap((w) => Object.values(w.colors));
        for (const c of all) assert.match(c, HEX);
        assert.equal(new Set(all).size, all.length, "no color repeats across worlds");
        const roads = IDS.map((id) => worldRoad(id).fill);
        assert.equal(new Set(roads).size, roads.length, "each world has its own road");
        for (const id of IDS) for (const c of Object.values(worldRoad(id))) assert.match(c, HEX);
    });

    it("keeps names and places free of emoji", () => {
        for (const w of WORLDS) assert.doesNotMatch(`${w.name} ${w.where}`, EMOJI, w.id);
    });

    for (const width of [360, 768, 1200]) {
        it(`renders every piece of every world at ${width}px`, () => {
            const layout = mapLayout(5, width);
            for (const id of IDS) {
                for (const calm of [false, true]) {
                    const parts = [
                        createElement(WorldScenery, { world: id, layout, calm }),
                        createElement(WorldBridge, { world: id, x: 100, y: 100, angle: 30 }),
                        createElement(WorldStart, { world: id, x: layout.start.x, y: layout.start.y }),
                        ...STATES.flatMap((state) => [
                            createElement(WorldGate, { world: id, x: layout.end.x, y: layout.end.y, state, calm }),
                            createElement(WorldGate, { world: id, x: layout.end.x, y: layout.end.y, state, final: true, calm }),
                        ]),
                    ];
                    for (const part of parts) {
                        const html = renderToStaticMarkup(createElement("svg", null, part));
                        assert.ok(html.length > 200, `${id} drew something`);
                        assert.doesNotMatch(html, EMOJI, id);
                        assert.doesNotMatch(html, /NaN|undefined/, id);
                    }
                }
            }
        });
    }

    it("draws a different scenery for each world", () => {
        const layout = mapLayout(5, 390);
        const html = IDS.map((id) => renderToStaticMarkup(createElement("svg", null, createElement(WorldScenery, { world: id, layout, calm: true }))));
        assert.equal(new Set(html).size, IDS.length);
    });

    it("shows the padlock until the gate (or the treasure chest) opens", () => {
        for (const id of IDS) {
            for (const final of [false, true]) {
                const gate = (state: (typeof STATES)[number]) => renderToStaticMarkup(createElement("svg", null, createElement(WorldGate, { world: id, x: 0, y: 0, state, final, calm: true })));
                assert.ok(gate("locked").includes(PADLOCK), `${id} locked`);
                assert.ok(gate("key").includes(PADLOCK), `${id} key`);
                assert.ok(!gate("open").includes(PADLOCK), `${id} open`);
                assert.notEqual(gate("locked"), gate("key"), `${id}: the key shows up`);
            }
        }
    });

    it("stays still when motion is calm and moves gently otherwise", () => {
        const layout = mapLayout(5, 768);
        for (const id of IDS) {
            const calm = renderToStaticMarkup(
                createElement("svg", null, createElement(WorldScenery, { world: id, layout, calm: true }), createElement(WorldGate, { world: id, x: 300, y: 300, state: "key", calm: true }))
            );
            assert.doesNotMatch(calm, /class="bmw-/, id);
        }
        const volcano = renderToStaticMarkup(createElement("svg", null, createElement(WorldScenery, { world: "volcano", layout, calm: false })));
        assert.match(volcano, /bmw-smoke/);
        const key = renderToStaticMarkup(createElement("svg", null, createElement(WorldGate, { world: "meadow", x: 0, y: 0, state: "key", calm: false })));
        assert.match(key, /bmw-bob/);
    });

    it("renders a round badge for every world, locked and open", () => {
        for (const id of IDS) {
            const open = renderToStaticMarkup(createElement(WorldBadge, { world: id, locked: false, className: "h-16 w-16" }));
            const locked = renderToStaticMarkup(createElement(WorldBadge, { world: id, locked: true }));
            assert.match(open, /^<svg[^>]*viewBox="0 0 64 64"[^>]*class="h-16 w-16"/);
            assert.match(open, /aria-hidden="true"/);
            assert.ok(!open.includes(PADLOCK) && locked.includes(PADLOCK), `${id} padlock only when locked`);
            assert.doesNotMatch(open + locked, EMOJI);
        }
    });
});
