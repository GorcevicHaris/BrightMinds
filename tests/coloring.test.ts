// Bojanka: slike i nivoi (povlačenje podrške, palete, zadaci).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildColoringPlan, colorNumber, COLORING_LEVELS, coloringLevel, mirrorPartner } from "@/app/components/games/data/coloringLevels";
import { BASIC_COLORS, COLOR_BY_ID, COLORS, colorSentence, mirrorPath, modelColors, PICTURE_BY_ID, PICTURES, zoneOrder } from "@/app/components/games/data/coloringPictures";
import { MAX_LEVEL } from "@/lib/games";

/** Ponovljiv „nasumičan” niz za planove */
function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

const LIMITS = { young: { rounds: 5, choices: 3 }, middle: { rounds: 6, choices: 4 }, older: { rounds: 8, choices: 6 } };

/** Koliko podrške nivo daje (veći broj = više pomoći); mora da opada kroz nivoe */
function support(level: (typeof COLORING_LEVELS)[number]): number {
    const byMode = { copy: 40, number: 20, mirror: 15, verbal: 10, free: 0 }[level.mode];
    const model = level.model === "shown" ? 8 : level.model === "request" ? 4 : 0;
    return byMode + model + (level.showZone ? 2 : 0) + (level.showColor ? 2 : 0) + (level.showMatches ? 1 : 0) + (level.showSwatch ? 1 : 0) + (level.pulseZone ? 0.5 : 0);
}

describe("coloring pictures", () => {
    it("has at least 30 pictures with unique ids", () => {
        assert.ok(PICTURES.length >= 30, `${PICTURES.length}`);
        assert.equal(new Set(PICTURES.map((p) => p.id)).size, PICTURES.length);
    });

    for (const picture of PICTURES) {
        it(`${picture.id}: zones, model colours and order are valid`, () => {
            const ids = picture.zones.map((zone) => zone.id);
            assert.equal(new Set(ids).size, ids.length, "unique zone ids");
            assert.match(picture.viewBox, /^-?\d+(\.\d+)? -?\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)?$/);
            for (const zone of picture.zones) {
                assert.ok(COLOR_BY_ID[zone.c], `${zone.id} colour`);
                assert.match(zone.d, /^M/, `${zone.id} path starts with M`);
                assert.doesNotMatch(zone.d, /NaN|undefined/, `${zone.id} path`);
                // Rečenica „Krov je crven.” se gradi za svaki deo
                assert.match(colorSentence(zone, COLOR_BY_ID[zone.c]!), /^\p{Lu}.+ (je|su) .+\.$/u);
            }
            for (const id of picture.order ?? []) assert.ok(ids.includes(id), `order id ${id}`);
            assert.equal(zoneOrder(picture).length, picture.zones.length);
        });
    }
});

describe("coloring levels", () => {
    it(`has exactly ${MAX_LEVEL} levels whose pictures exist`, () => {
        assert.equal(COLORING_LEVELS.length, MAX_LEVEL);
        for (const level of COLORING_LEVELS) {
            assert.ok(level.pictures.length > 0);
            for (const id of level.pictures) assert.ok(PICTURE_BY_ID[id], id);
        }
    });

    it("every level is distinct", () => {
        const keys = COLORING_LEVELS.map((level) => JSON.stringify(level));
        assert.equal(new Set(keys).size, keys.length);
    });

    it("support only fades: model → numbers → other half → verbal instruction → free", () => {
        for (let i = 1; i < COLORING_LEVELS.length; i += 1) {
            assert.ok(support(COLORING_LEVELS[i]) <= support(COLORING_LEVELS[i - 1]), `level ${i + 1} gives more help than level ${i}`);
        }
        assert.deepEqual(COLORING_LEVELS.slice(0, 3).map((l) => [l.mode, l.model, l.showZone, l.showColor]), Array(3).fill(["copy", "shown", true, true]));
        assert.ok(COLORING_LEVELS.some((l) => l.mode === "copy" && l.model === "request"), "a level with the model on request");
        assert.ok(COLORING_LEVELS.some((l) => l.mode === "number"), "colour-by-number levels");
        // Druga polovina: posle bojenja po brojevima, pre bojenja po uputstvu; prvi put uz pokazni deo
        const mirrors = COLORING_LEVELS.flatMap((l, i) => (l.mode === "mirror" ? [i] : []));
        assert.deepEqual(mirrors, [9, 10], "levels 10 and 11 colour the other half");
        assert.ok(COLORING_LEVELS[mirrors[0]].demo && COLORING_LEVELS[mirrors[0]].showZone, "the first one is modelled and marked");
        assert.ok(!COLORING_LEVELS[mirrors[1]].demo && !COLORING_LEVELS[mirrors[1]].showZone, "the second one has no marks");
        assert.equal(COLORING_LEVELS.filter((l) => l.demo).length, 1);
        assert.equal(COLORING_LEVELS[MAX_LEVEL - 1].mode, "free");
    });

    it("pictures get bigger (more parts) as levels rise", () => {
        const average = (i: number) => COLORING_LEVELS[i].pictures.reduce((sum, id) => sum + PICTURE_BY_ID[id]!.zones.length, 0) / COLORING_LEVELS[i].pictures.length;
        for (let tier = 0; tier < 3; tier += 1) {
            const first = average(tier * 5);
            const last = average(tier * 5 + 4);
            assert.ok(last >= first, `tier ${tier + 1}: ${first} → ${last}`);
        }
        assert.ok(average(0) <= 3 && average(14) >= 8);
    });

    it("colour by number starts with 2–3 colours and big numbers, then more colours and smaller numbers", () => {
        const levels = COLORING_LEVELS.filter((l) => l.mode === "number");
        assert.ok(levels.length >= 3);
        const colours = (l: (typeof levels)[number]) => Math.max(...l.pictures.map((id) => modelColors(zoneOrder(PICTURE_BY_ID[id]!)).length));
        assert.ok(colours(levels[0]) <= 3, `first: ${colours(levels[0])}`);
        assert.ok(levels[0].showColor && levels[0].showMatches);
        for (let i = 1; i < levels.length; i += 1) {
            assert.ok(levels[i].numberSize < levels[i - 1].numberSize);
            assert.ok(colours(levels[i]) >= colours(levels[i - 1]));
        }
    });

    it("level numbers outside 1–15 fall back to the nearest level", () => {
        assert.equal(coloringLevel(0), COLORING_LEVELS[0]);
        assert.equal(coloringLevel(99), COLORING_LEVELS[MAX_LEVEL - 1]);
        assert.equal(coloringLevel(Number.NaN), COLORING_LEVELS[0]);
    });
});

describe("symmetric pictures (colour the other half)", () => {
    const symmetric = PICTURES.filter((picture) => picture.mirror);

    it("there are symmetric pictures for every mirror level", () => {
        assert.ok(symmetric.length >= 6);
        for (const level of COLORING_LEVELS.filter((l) => l.mode === "mirror")) {
            for (const id of level.pictures) assert.ok(PICTURE_BY_ID[id]?.mirror, `${id} is symmetric`);
        }
    });

    for (const picture of symmetric) {
        it(`${picture.id}: every right part is the mirror image of its left part`, () => {
            const { axis, pairs } = picture.mirror!;
            const byId = new Map(picture.zones.map((zone) => [zone.id, zone]));
            assert.ok(Object.keys(pairs).length >= 3);
            for (const [right, left] of Object.entries(pairs)) {
                const r = byId.get(right);
                const l = byId.get(left);
                assert.ok(r && l, `${right} ↔ ${left}`);
                assert.equal(r!.c, l!.c, "same colour");
                assert.equal(r!.name, l!.name, "same name");
                assert.equal(r!.d, mirrorPath(l!.d, axis), "right = left in the mirror");
                assert.notEqual(r!.d, l!.d);
                // Levi deo je levo od ose, desni desno (proverava se po x-koordinatama apsolutnih tačaka)
                const xs = (d: string) => [...d.matchAll(/[ML](-?[\d.]+),/g)].map((m) => Number(m[1]));
                assert.ok(xs(l!.d).every((x) => x <= axis + 0.01), `${left} stays left of the axis`);
                assert.ok(xs(r!.d).every((x) => x >= axis - 0.01), `${right} stays right of the axis`);
            }
            // Svaki deo slike je u nekom paru (središnji ukrasi su obojeni detalji)
            const paired = new Set([...Object.keys(pairs), ...Object.values(pairs)]);
            assert.deepEqual(picture.zones.map((zone) => zone.id).filter((id) => !paired.has(id)), []);
        });
    }

    it("the left half is coloured from the start, the child colours the right half", () => {
        for (const picture of symmetric) {
            const level = COLORING_LEVELS.findIndex((l) => l.mode === "mirror" && l.pictures.includes(picture.id)) + 1;
            assert.ok(level > 0, picture.id);
            const plan = buildColoringPlan(level, null, picture.id);
            const { pairs } = picture.mirror!;
            assert.deepEqual(
                plan.zones.map((zone) => zone.id),
                picture.order
            );
            for (const zone of plan.zones) assert.ok(zone.id in pairs);
            for (const left of Object.values(pairs)) assert.equal(plan.prefilled[left], PICTURE_BY_ID[picture.id]!.zones.find((z) => z.id === left)!.c);
        }
    });

    it("mirrors absolute and relative path commands, arcs included", () => {
        assert.equal(mirrorPath("M150,10 L180,20 Z", 200), "M250,10 L220,20 Z");
        assert.equal(mirrorPath("M10,10 h20 v5 a5,5 0 0,1 5,5 Z", 50), "M90,10 h-20 v5 a5,5 0 0,0 -5,5 Z");
        assert.equal(mirrorPath("M0,0 C10,0 20,5 30,10", 100), "M200,0 C190,0 180,5 170,10");
    });
});

describe("coloring plans", () => {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
        for (const [band, limits] of Object.entries(LIMITS)) {
            it(`level ${level}, ${band}: palette and tasks fit the picture`, () => {
                for (let seed = 1; seed <= 6; seed += 1) {
                    const plan = buildColoringPlan(level, limits, undefined, seeded(seed * 31 + level));
                    const def = plan.level;
                    assert.ok(def.pictures.includes(plan.picture.id));
                    // Mlađa deca boje manje delova; ostali su obojeni od početka (bojom sa primera)
                    if (def.mode !== "free") assert.ok(plan.zones.length <= limits.rounds);
                    for (const [id, color] of Object.entries(plan.prefilled)) {
                        assert.equal(plan.picture.zones.find((z) => z.id === id)?.c, color);
                        assert.ok(!plan.zones.some((z) => z.id === id));
                    }
                    assert.equal(plan.zones.length + Object.keys(plan.prefilled).length, plan.picture.zones.length);

                    if (def.mode === "copy" || def.mode === "number" || def.mode === "mirror") {
                        // Svaka boja sa primera mora biti u paleti — inače dete ne može da završi
                        for (const zone of plan.zones) assert.ok(plan.palette.includes(zone.c), `${plan.picture.id}/${zone.id}`);
                        assert.equal(new Set(plan.palette).size, plan.palette.length);
                        if (def.mode === "copy" || def.mode === "mirror") {
                            const needed = modelColors(plan.zones).length;
                            assert.ok(plan.palette.length <= Math.max(needed, limits.choices));
                            if (def.colors === 0) assert.equal(plan.palette.length, needed, "first level offers only the colours of the model");
                            if (def.mode === "mirror") {
                                // Dete boji samo desnu polovinu; leva je obojena (bojom odraza) od početka
                                for (const zone of plan.zones) {
                                    const partner = mirrorPartner(plan.picture, zone.id);
                                    assert.ok(partner, `${plan.picture.id}/${zone.id} has a mirror partner`);
                                    assert.equal(plan.prefilled[partner!], zone.c, `${plan.picture.id}/${partner} is coloured like ${zone.id}`);
                                }
                            }
                        } else {
                            // Po brojevima: samo boje koje imaju broj, 1…n
                            assert.deepEqual(plan.palette, modelColors(plan.zones));
                            plan.zones.forEach((zone) => assert.ok(colorNumber(plan, zone.c) >= 1));
                        }
                        assert.equal(plan.tasks.length, 0);
                    } else if (def.mode === "verbal") {
                        assert.equal(plan.tasks.length, plan.zones.length);
                        for (const task of plan.tasks) {
                            assert.ok(task.options.includes(task.color));
                            assert.equal(new Set(task.options).size, task.options.length);
                            assert.equal(task.options.length, Math.max(2, Math.min(def.colors, limits.choices)));
                            const allowed = COLORS.slice(0, def.full ? COLORS.length : BASIC_COLORS).map((c) => c.id as string);
                            for (const option of task.options) assert.ok(option === task.color || allowed.includes(option));
                        }
                    } else {
                        assert.equal(plan.palette.length, COLORS.length);
                        assert.deepEqual(plan.prefilled, {});
                    }
                }
            });
        }
    }

    it("the monitor gets the picture the game chose, with all parts", () => {
        const plan = buildColoringPlan(7, null, "lopta");
        assert.equal(plan.picture.id, "lopta");
        assert.equal(plan.zones.length, PICTURE_BY_ID.lopta!.zones.length);
        // Nepoznata slika: prva slika nivoa
        assert.equal(buildColoringPlan(7, null, "nema-je").picture.id === "nema-je", false);
    });
});
