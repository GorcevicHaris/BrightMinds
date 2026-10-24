// app/dashboard/child/[id]/gameMapLayout.ts — raspored „Mape” igara.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { currentStop, curvesPath, defaultPickerView, lanesFor, mapLayout, parsePickerView, stopStars } from "@/app/dashboard/child/[id]/gameMapLayout";

describe("mapLayout", () => {
    for (const width of [320, 375, 768, 1024, 1440]) {
        it(`places every stop inside the map at ${width}px`, () => {
            const layout = mapLayout(13, width);
            assert.equal(layout.nodes.length, 13);
            assert.equal(layout.lanes, lanesFor(width));
            for (const n of layout.nodes) {
                assert.ok(n.x - layout.nodeSize / 2 >= 0 && n.x + layout.nodeSize / 2 <= layout.width, `x=${n.x}`);
                assert.ok(n.y - layout.nodeSize / 2 >= 0 && n.y < layout.height, `y=${n.y}`);
            }
            assert.ok(layout.end.y > layout.nodes[12].y - 60, "castle at the end");
            assert.ok(layout.start.y < layout.nodes[0].y, "village at the start");
        });

        it(`keeps stops apart so they never overlap at ${width}px`, () => {
            const layout = mapLayout(13, width);
            for (let i = 0; i < layout.nodes.length; i += 1) {
                for (let j = i + 1; j < layout.nodes.length; j += 1) {
                    const a = layout.nodes[i];
                    const b = layout.nodes[j];
                    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > layout.nodeSize + 20, `${i}-${j}`);
                }
            }
        });
    }

    it("is a single vertical lane on a phone and a winding road on wider screens", () => {
        assert.equal(lanesFor(375), 1);
        assert.ok(lanesFor(768) >= 3);
        const phone = mapLayout(13, 375);
        const tablet = mapLayout(13, 768);
        assert.ok(phone.height > tablet.height, "phone scrolls further");
    });

    it("draws the road through the village, every stop and the castle, in order", () => {
        const layout = mapLayout(6, 800);
        assert.deepEqual(layout.curves[0].from, layout.start);
        assert.deepEqual(layout.curves[layout.curves.length - 1].to, layout.end);
        layout.nodes.forEach((n, i) => assert.deepEqual(layout.curves[layout.nodeCurve[i] - 1].to, n));
        for (let i = 1; i < layout.nodeCurve.length; i += 1) assert.ok(layout.nodeCurve[i] > layout.nodeCurve[i - 1]);
        assert.match(curvesPath(layout.curves), /^M[\d.-]+ [\d.-]+( C[\d. -]+)+$/);
        assert.equal(curvesPath(layout.curves, 0, 0), "");
    });

    it("is the same every time (no randomness between renders) and has a river with a bridge", () => {
        assert.deepEqual(mapLayout(13, 390), mapLayout(13, 390));
        assert.ok(mapLayout(13, 390).river);
        assert.ok(mapLayout(13, 1024).river);
    });

    for (const width of [375, 820, 1440]) {
        it(`lets the river flow between rows, never under a stop or its name, at ${width}px`, () => {
            const layout = mapLayout(13, width);
            const river = layout.river;
            assert.ok(river);
            for (const n of layout.nodes) {
                const top = n.y - layout.nodeSize / 2;
                const labelEnd = n.y + layout.nodeSize / 2 + 60;
                const clear = river.y + 22 < top || river.y - 22 > labelEnd;
                assert.ok(clear, `stanica na y=${n.y}, reka na y=${river.y}`);
            }
        });
    }

    it("works with very few stops", () => {
        assert.equal(mapLayout(0, 375).nodes.length, 0);
        assert.equal(mapLayout(1, 1024).nodes.length, 1);
    });
});

describe("map progress", () => {
    it("puts the companion on the first stop whose easy levels are not finished", () => {
        assert.equal(currentStop([{ done: 5, locked: false }, { done: 2, locked: false }, { done: 0, locked: false }]), 1);
        assert.equal(currentStop([{ done: 5, locked: false }, { done: 0, locked: true }, { done: 0, locked: false }]), 2);
        assert.equal(currentStop([{ done: 7, locked: false }, { done: 5, locked: false }]), 0);
        assert.equal(currentStop([{ done: 15, locked: false }, { done: 15, locked: false }]), 1);
        assert.equal(currentStop([{ done: 0, locked: true }]), -1);
    });

    it("gives one star per finished difficulty", () => {
        assert.deepEqual([0, 4, 5, 9, 10, 14, 15, 99].map(stopStars), [0, 0, 1, 1, 2, 2, 3, 3]);
    });
});

describe("map or cards", () => {
    it("defaults to the map up to 7 years and to cards for older children", () => {
        assert.equal(defaultPickerView(3), "map");
        assert.equal(defaultPickerView(7), "map");
        assert.equal(defaultPickerView(8), "grid");
        assert.equal(defaultPickerView(null), "map");
        assert.equal(parsePickerView("grid"), "grid");
        assert.equal(parsePickerView("tabla"), null);
    });
});
