// Igra „Spakuj ranac” (app/components/games/data/backpackLevels.ts): stvari, raspored, nivoi i bodovanje.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
    BACKPACK_MAX_LEVEL,
    backpackResult,
    backpackRule,
    buildBackpackLevel,
    DAILY_ITEMS,
    DAY_IDS,
    emptyBackpackView,
    getItem,
    getSubject,
    itemForSubject,
    itemsForTimetable,
    ITEM_IDS,
    ITEMS,
    listWords,
    MAX_DESK,
    mergeBackpackMonitor,
    nextNeeded,
    OWNERS,
    refuseSentence,
    REFUSE_LINE,
    roundQuestion,
    roundTitle,
    roundView,
    solveBackpackView,
    SUBJECT_IDS,
    SUBJECTS,
    type BackpackRound,
    type BackpackView,
} from "@/app/components/games/data/backpackLevels";
import BackpackGame from "@/app/components/games/BackpackGame";
import { ITEM_ART } from "@/app/components/games/backpack/items";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame } from "@/lib/games";
import { isTogetherGame } from "@/lib/playTogether";
import { isRemoteGame } from "@/lib/invite";

function seeded(seed: number) {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2 ** 31;
        return x / 2 ** 31;
    };
}

const LEVELS = Array.from({ length: BACKPACK_MAX_LEVEL }, (_, i) => i + 1);
const build = (level: number, seed = 1, preset = BAND_PRESETS.older) => buildBackpackLevel(level, { maxChoices: preset.maxChoices, maxRounds: preset.maxRounds, random: seeded(seed) });

describe("backpack content", () => {
    it("maps every school subject (grades 1–4) to what the child brings", () => {
        assert.deepEqual(Object.fromEntries(SUBJECT_IDS.map((id) => [getSubject(id)!.name, itemForSubject(id)])), {
            "Srpski jezik": "book-srpski",
            Matematika: "book-matematika",
            "Svet oko nas": "book-svet",
            "Engleski jezik": "book-engleski",
            Muzičko: "book-muzicko",
            Likovno: "sketchbook",
            Fizičko: "sneakers",
            "Digitalni svet": "book-digitalni",
        });
        for (const subject of SUBJECTS) assert.equal(getItem(subject.item)?.subject, subject.id, subject.id);
        // Svaki predmet ima svoju boju (knjige su slične, razlikuju se bojom i znakom)
        assert.equal(new Set(SUBJECTS.map((s) => s.color)).size, SUBJECTS.length);
    });

    it("packs the subject items and then pencil case, bottle and snack for a timetable", () => {
        assert.deepEqual(itemsForTimetable(["matematika", "srpski", "likovno"]), ["book-matematika", "book-srpski", "sketchbook", "pencilcase", "bottle", "lunch"]);
        assert.deepEqual(itemsForTimetable(["fizicko"], []), ["sneakers"]);
        assert.deepEqual([...DAILY_ITEMS], ["pencilcase", "bottle", "lunch"]);
    });

    it("has a picture and a name for every item, and toys are never school items", () => {
        assert.deepEqual(Object.keys(ITEM_ART).sort(), [...ITEM_IDS].sort());
        for (const item of ITEMS) {
            assert.ok(item.name.length > 1, item.id);
            assert.equal(item.school, item.packLine.length > 0, item.id);
        }
        assert.deepEqual(ITEMS.filter((i) => !i.school).map((i) => i.id).sort(), ["ball", "blocks", "car", "icecream", "phone", "teddy"]);
    });

    it("refuses calmly: toys „do not go to school today”, books for another class are named", () => {
        assert.equal(REFUSE_LINE, "To ne treba za školu danas.");
        assert.equal(refuseSentence("phone"), REFUSE_LINE);
        assert.equal(refuseSentence("ruler"), REFUSE_LINE);
        assert.equal(refuseSentence("sketchbook"), "Danas nemamo likovno.");
        assert.equal(refuseSentence("book-matematika"), "Danas nemamo matematiku.");
    });

    it("uses names from Novi Pazar for the children whose backpack it is", () => {
        assert.deepEqual(OWNERS.map((o) => o.name), ["Amar", "Lejla", "Haris", "Emina", "Semir", "Ajla"]);
        assert.equal(listWords(["Sveska", "Pernica", "Flašica"]), "sveska, pernica i flašica");
    });
});

describe("backpack levels", () => {
    it("builds every level for every age band and many seeds, with lists that are on the scene", () => {
        for (const level of LEVELS) {
            for (const preset of Object.values(BAND_PRESETS)) {
                for (let seed = 1; seed <= 25; seed += 1) {
                    const rounds = build(level, seed, preset);
                    assert.equal(rounds.length, Math.max(2, Math.min(backpackRule(level).rounds, preset.maxRounds)), `level ${level}`);
                    for (const round of rounds) checkRound(round, level);
                }
            }
        }
    });

    it("grows from two items with the list always visible to five, then a list to remember", () => {
        assert.ok(build(1).every((r) => r.kind === "pack" && r.needed.length === 2));
        assert.ok(build(1).every((r) => r.desk.filter((id) => !getItem(id)!.school).length === 2), "level 1: two toys only");
        assert.ok(build(3).every((r) => r.needed.length === 3));
        assert.ok(build(6).every((r) => r.needed.length === 4));
        assert.ok(build(7).every((r) => r.needed.length === 5));
        assert.ok(build(8).every((r) => r.kind === "peek"));
        assert.ok(build(10).some((r) => r.kind === "missing") && build(10).some((r) => r.kind === "peek"));
    });

    it("uses the timetable in the hard tier and asks for a specific day at the end", () => {
        for (const level of [11, 12, 13]) assert.ok(build(level).every((r) => r.kind === "timetable" && r.subjects.length === backpackRule(level).needed));
        for (const level of [14, 15]) {
            for (let seed = 1; seed <= 20; seed += 1) {
                for (const round of build(level, seed)) {
                    assert.equal(round.kind, "week");
                    assert.deepEqual(round.week.map((w) => w.day), [...DAY_IDS]);
                    assert.deepEqual(round.week.find((w) => w.day === round.day)?.subjects, round.subjects);
                    // Svaki dan ima drugačije časove (dete mora da nađe pravi dan)
                    assert.equal(new Set(round.week.map((w) => [...w.subjects].sort().join())).size, DAY_IDS.length);
                }
            }
        }
        // Slične knjige: na stolu su i knjige za druge časove
        assert.ok(build(13).every((r) => r.desk.filter((id) => getItem(id)!.subject && !r.needed.includes(id as never)).length >= 2));
    });

    it("says the list or the timetable aloud, never where to tap", () => {
        for (const level of LEVELS) {
            for (const round of build(level, 3)) {
                for (const text of [roundQuestion(round), roundTitle(round), roundTitle(round, false)]) {
                    assert.ok(text.length > 0);
                    assert.doesNotMatch(text, /dodirni|klikni|prevuci|levo|desno|gore|dole|ovde/iu, text);
                }
            }
        }
        const owner = { name: "Lejla", female: true };
        assert.equal(roundQuestion({ kind: "pack", needed: ["notebook", "pencilcase"], subjects: [], day: "", owner }), "Spakuj ranac za školu. Na listi su sveska i pernica.");
        assert.equal(roundQuestion({ kind: "missing", needed: ["notebook"], subjects: [], day: "", owner }), "Lejla je spakovala ranac. Šta fali u rancu?");
        assert.equal(roundQuestion({ kind: "timetable", needed: [], subjects: ["matematika", "srpski", "likovno"], day: "uto", owner }), "Utorak: matematika, srpski jezik i likovno. Spakuj ranac za utorak.");
        assert.equal(roundQuestion({ kind: "week", needed: [], subjects: [], day: "sre", owner }), "Sutra je sreda. Spakuj ranac za sredu.");
    });
});

function checkRound(round: BackpackRound, level: number) {
    const where = `level ${level} ${round.kind}`;
    assert.equal(new Set(round.needed).size, round.needed.length, `${where}: list without repeats`);
    assert.equal(new Set(round.desk).size, round.desk.length, `${where}: desk without repeats`);
    assert.ok(round.desk.length <= MAX_DESK, `${where}: desk fits`);
    // Lista je podskup onoga što je na sceni (sto + ono što je već u rancu)
    for (const id of round.needed) assert.ok(round.desk.includes(id) || round.packed.includes(id), `${where}: ${id} is on the scene`);
    for (const id of round.packed) assert.ok(round.needed.includes(id) && !round.desk.includes(id), `${where}: packed ${id}`);
    // Bar jedna stvar na stolu ne treba (inače nema šta da se odbije)
    assert.ok(round.desk.some((id) => !round.needed.includes(id)), `${where}: something to leave`);
    if (round.kind === "missing") assert.equal(round.needed.length - round.packed.length, 1, `${where}: exactly one missing`);
    else assert.deepEqual(round.packed, [], where);
    if (round.kind === "timetable" || round.kind === "week") {
        assert.deepEqual(round.needed, itemsForTimetable(round.subjects), `${where}: timetable mapping`);
        assert.equal(new Set(round.subjects).size, round.subjects.length);
        // Knjige za druge časove na stolu nisu na listi
        for (const id of round.desk) {
            const subject = getItem(id)!.subject;
            if (subject) assert.equal(round.needed.includes(id), round.subjects.includes(subject), `${where}: ${id}`);
        }
    }
}

describe("backpack scoring", () => {
    const view = (round: BackpackRound, total: number): BackpackView => ({ ...emptyBackpackView(total), ...roundView(round) });

    it("does not score the modelled first task of level 1", () => {
        const round = build(1)[0];
        const { next, modeled } = solveBackpackView(view(round, 4), 1);
        assert.ok(modeled);
        assert.equal(next.correctCount, 0);
        assert.deepEqual(backpackResult(next, 1, 20), { score: 5, durationSec: 20, correct: 0, total: 3, prompted: 0 });
    });

    it("counts correct (nothing refused, no help) and prompted (help or reopened list), never more than the total", () => {
        const rounds = build(9);
        let current = view(rounds[0], rounds.length);
        rounds.forEach((round, i) => {
            current = { ...current, ...roundView(round), round: i + 1, wrong: i === 2 ? ["teddy"] : [], hint: i === 1, feedback: null };
            current = solveBackpackView(current, 9).next;
        });
        const result = backpackResult(current, 9, 90);
        assert.equal(result.total, rounds.length);
        assert.equal(result.correct, rounds.length - 2);
        assert.equal(result.prompted, 1);
        // Ponovo otvorena lista je pomoć: zadatak nije „samostalno”, nego „uz pomoć”
        const reopened = solveBackpackView({ ...current, round: 2, wrong: [], hint: false, listHelp: true, feedback: null }, 9);
        assert.ok(!reopened.firstTry);
        assert.equal(reopened.next.promptedCount, current.promptedCount + 1);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
    });

    it("hints the next item from the list that is not packed yet", () => {
        assert.equal(nextNeeded({ needed: ["notebook", "bottle"], packed: ["notebook"] }), "bottle");
        assert.equal(nextNeeded({ needed: ["notebook"], packed: ["notebook"] }), null);
    });

    it("keeps only known values from the live-monitor state", () => {
        assert.deepEqual(mergeBackpackMonitor(null), emptyBackpackView(1));
        const round = build(14)[0];
        const merged = mergeBackpackMonitor({ ...view(round, 4), desk: [...round.desk, "dragon"], packed: ["teddy", round.needed[0]], wrong: ["<b>"], owner: { name: "X", female: false } });
        assert.deepEqual(merged.desk, round.desk);
        assert.deepEqual(merged.packed, [round.needed[0]]);
        assert.deepEqual(merged.wrong, []);
        assert.equal(merged.owner.name, "Amar");
        assert.equal(merged.week.length, 5);
    });

    it("draws the board in the live monitor with ticks for what is packed", () => {
        const html = renderToStaticMarkup(
            createElement(BackpackGame, {
                childId: 0,
                level: 2,
                isMonitor: true,
                onComplete: () => {},
                monitorState: { kind: "pack", needed: ["notebook", "pencilcase"], packed: ["notebook"], desk: ["teddy", "notebook", "pencilcase"], round: 2, totalRounds: 4 },
            })
        );
        assert.match(html, /Spakuj ranac za školu\./);
        assert.match(html, /aria-label="Ranac: Sveska"/);
        assert.match(html, /aria-label="Meda"/);
    });
});

describe("backpack registry entry", () => {
    const game = getGame("backpack");

    it("is activity 21, for ages 5–10, with its own colour and cover", () => {
        assert.equal(game.id, "backpack");
        assert.equal(game.gameType, "backpack");
        assert.equal(game.activityId, 21);
        assert.equal(game.title, "Spakuj ranac");
        assert.deepEqual(game.ages, { min: 5, max: 10 });
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        assert.match(readFileSync(path.join(process.cwd(), "public", game.image), "utf8"), /^<svg[^>]+viewBox="0 0 1380 752"/);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
    });

    it("can be played with a friend on one device and on two devices", () => {
        assert.ok(isTogetherGame("backpack"));
        assert.ok(isRemoteGame("backpack"));
    });

    it("has a migration that adds activity 21 in the cognitive category", () => {
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0016_backpack_game.sql"), "utf8");
        assert.match(sql, /\(21, 'Spakuj ranac', '[^']+', 'cognitive'/);
        assert.match(sql, /on conflict \(id\) do update/);
    });
});
