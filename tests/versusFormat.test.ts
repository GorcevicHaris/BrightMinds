// Način dvoboja po igri (lib/versusFormat.ts): svaka igra ima tačno jedan, igre pamćenja i logike
// se igraju „jedan po jedan”, igre kratkog odgovora „ko je brži”, a način piše na kartici poziva,
// izboru igre i ekranu „VS”.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FormatChip, ModeChoice, VsIntro } from "@/app/dashboard/child/[id]/playVersus";
import { GAMES } from "@/lib/games";
import { hasSharedBoard } from "@/lib/sharedPlay";
import { FORMAT_NAMES, VERSUS_FORMATS, duelLabel, formatRule, remoteVersusFormat, versusFormat } from "@/lib/versusFormat";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const WHERE_TO_TAP = /dodirni|pritisni|klikni|prevuci/i;

describe("način dvoboja po igri", () => {
    it("every game has exactly one format, and nothing else is listed", () => {
        assert.equal(GAMES.length, 34);
        assert.deepEqual(Object.keys(VERSUS_FORMATS).sort(), GAMES.map((g) => g.id).sort());
        for (const game of GAMES) assert.ok(versusFormat(game.id) === "race" || versusFormat(game.id) === "turns", game.id);
    });

    it("memory and logic games alternate on one board; quick-answer games race", () => {
        for (const id of ["memory", "sequence", "sorting", "puzzle", "inset", "maze", "missing", "differences", "clock", "market"] as const) {
            assert.equal(versusFormat(id), "turns", id);
        }
        for (const id of ["shapes", "gaze", "emotions", "counting", "food", "words", "uses", "where", "families"] as const) {
            assert.equal(versusFormat(id), "race", id);
        }
        // Pisanje prstom i duga čitanja: nikad trka
        for (const id of ["letters", "numbers", "coloring", "social", "social-story"] as const) assert.equal(versusFormat(id), "turns", id);
    });

    it("on two devices, turn games use the shared board; without one they race with the same tasks", () => {
        for (const game of GAMES) {
            assert.equal(remoteVersusFormat(game.id, false), "race", game.id);
            assert.equal(remoteVersusFormat(game.id, true), versusFormat(game.id), game.id);
        }
        for (const game of GAMES) assert.equal(remoteVersusFormat(game.id), hasSharedBoard(game.id) ? versusFormat(game.id) : "race", game.id);
        assert.equal(remoteVersusFormat("memory"), "turns");
        // Pisanje prstom nema zajedničku tablu: na dva uređaja svako piše na svom ekranu
        assert.equal(remoteVersusFormat("letters"), "race");
    });

    it("each choice is explained in the data file header", () => {
        const source = read("lib/versusFormat.ts");
        for (const game of GAMES) assert.match(source, new RegExp(`${game.id.includes("-") ? `"${game.id}"` : game.id}: "(race|turns)", // .+`), game.id);
        assert.match(source, /autizm/);
        assert.match(source, /uzrast|3 do 10/);
    });
});

describe("reči i prikaz načina", () => {
    it("names the format in plain Serbian, never where to tap", () => {
        assert.equal(duelLabel("race"), "Dvoboj: ko je brži");
        assert.equal(duelLabel("turns"), "Dvoboj: jedan po jedan");
        assert.deepEqual(FORMAT_NAMES, { race: "ko je brži", turns: "jedan po jedan" });
        for (const format of ["race", "turns"] as const) {
            for (const where of ["remote", "local"] as const) {
                assert.match(formatRule(format, where), /Više tačnih pobeđuje\.$/);
                assert.doesNotMatch(formatRule(format, where), WHERE_TO_TAP);
            }
        }
    });

    it("shows on the mode choice, the chip and the VS intro (with the stake)", () => {
        const choice = renderToStaticMarkup(createElement(ModeChoice, { mode: "versus", onChange: () => {}, format: "turns" }));
        assert.match(choice, /Dvoboj: jedan po jedan/);
        assert.match(renderToStaticMarkup(createElement(FormatChip, { format: "race" })), /ko je brži/);
        assert.match(renderToStaticMarkup(createElement(FormatChip, { format: "race", full: true })), /Dvoboj: ko je brži/);
        const intro = renderToStaticMarkup(
            createElement(VsIntro, { players: [{ name: "Lejla", kind: "girl" }, { name: "Amar", kind: "dog" }], gameTitle: "Pogodi oblik", format: "race", stake: 3, onDone: () => {} })
        );
        assert.match(intro, /Dvoboj: ko je brži/);
        assert.match(intro, /Ulog: 3 novčića/);
        // Bez uloga: ni reči o novčićima
        const free = renderToStaticMarkup(
            createElement(VsIntro, { players: [{ name: "Lejla", kind: "girl" }, { name: "Amar", kind: "dog" }], gameTitle: "Spoji parove", format: "turns", stake: 0, onDone: () => {} })
        );
        assert.match(free, /Dvoboj: jedan po jedan/);
        assert.doesNotMatch(free, /Ulog/);
    });

    it("the invite card, the host's game list and the together picker show the format", () => {
        const remote = read("app/dashboard/child/[id]/playRemote.tsx");
        assert.match(remote, /duelLabel\(remoteVersusFormat\(game\.id\)\)/, "kartica poziva i predvorje (GameBadge)");
        assert.match(remote, /mode === "versus" && <FormatChip format=\{remoteVersusFormat\(game\.id\)\}/, "izbor igre domaćina");
        assert.match(read("app/dashboard/child/[id]/playTogether.tsx"), /versus && <FormatChip format=\{versusFormat\(game\.id\)\}/, "izbor igre na istom uređaju");
    });
});
