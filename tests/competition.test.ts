// „Takmičenje” (VS) u igri sa drugom: način igre u pozivu (i stari pozivi bez njega), reči
// pobednika, nerešenog i pohvale za trud (srpski, rod), kraj takmičenja i ekran „VS”.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { POST } from "@/app/api/children/[id]/invite/route";
import { POST as JOIN } from "@/app/api/children/[id]/invite/join/route";
import { ModeChoice, VersusEnd, VsIntro, type VersusSeat } from "@/app/dashboard/child/[id]/playVersus";
import { INVITE_CODE_TTL_MS, parseStoredInvite } from "@/lib/invite";
import {
    TIE_TITLE,
    VS_INTRO_MS,
    effortPraise,
    genderOf,
    parsePlayMode,
    playModeOr,
    scoreLine,
    versusLiveScore,
    versusScore,
    versusTexts,
    versusWinner,
    winnerTitle,
} from "@/lib/versus";
import { resetRateLimit } from "@/lib/rateLimit";
import { VISUAL_PIN_CATEGORIES } from "@/lib/visualPinData";
import { CHILD_ID, OTHER_CHILD_ID, STRANGER, db, idParams, jsonRequest, readJson, resetWorld, seedFamily, signInAsChild } from "./setup/api";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const NOW = Date.UTC(2026, 9, 24, 12);
const OLD_INVITE = {
    code: VISUAL_PIN_CATEGORIES.map((c) => c.items[0].id).join(","),
    channelKey: "abcdefghijklmnopqrstuvwx",
    expiresAt: new Date(NOW + INVITE_CODE_TTL_MS).toISOString(),
    hostFirstName: "Lejla",
    game: "counting",
    level: 3,
    createdAt: new Date(NOW).toISOString(),
};
/** Reči koje posramljuju dete — nikad u takmičenju */
const SHAME = /izgubi|poraz|loše|lose|tužn|šteta|nisi uspe/i;

describe("način igre", () => {
    it("parses the mode from a request, and a missing mode means together", () => {
        assert.equal(parsePlayMode(undefined), "together");
        assert.equal(parsePlayMode(null), "together");
        assert.equal(parsePlayMode("together"), "together");
        assert.equal(parsePlayMode("versus"), "versus");
        for (const bad of ["VS", "Versus", "", 1, true, {}, ["versus"]]) assert.equal(parsePlayMode(bad), null, JSON.stringify(bad));
        assert.equal(playModeOr("hack"), "together");
        assert.equal(playModeOr("versus"), "versus");
    });

    it("an old stored invite without a mode is a together invite", () => {
        assert.equal(parseStoredInvite(OLD_INVITE)?.mode, "together");
        assert.equal(parseStoredInvite({ ...OLD_INVITE, mode: "versus" })?.mode, "versus");
        // Oštećeno polje ne kvari poziv: igra se zajedno
        assert.equal(parseStoredInvite({ ...OLD_INVITE, mode: "<b>" })?.mode, "together");
    });

    it("the invite API validates the mode, stores it and hands it to the friend", () => {
        const create = read("app/api/children/[id]/invite/route.ts");
        assert.match(create, /const mode = parsePlayMode\(body\.mode\);/);
        assert.match(create, /\|\| !mode\) \{\s*throw new HttpError\(400/);
        assert.match(create, /level,\s*mode,\s*createdAt/);
        assert.match(read("app/api/_lib/invites.ts"), /invite\.mode === "versus" \? \{ mode: invite\.mode \}/);
        assert.match(read("app/api/children/[id]/invite/join/route.ts"), /joined\.mode === "versus" \? \{ mode: joined\.mode \}/);
    });

    it("the host sends the chosen mode and both sides read it leniently", () => {
        const remote = read("app/dashboard/child/[id]/playRemote.tsx");
        assert.match(remote, /body: JSON\.stringify\(\{ game, level, mode \}\)/);
        assert.match(remote, /mode: playModeOr\(data\.mode\)/);
        assert.match(remote, /mode: playModeOr\(raw\.mode\)/, "gost posle osvežavanja zadržava način igre");
    });
});

describe("rezultat takmičenja", () => {
    it("counts correct answers as stars (ungraded games: every task)", () => {
        assert.equal(versusScore(true, 4, 5), 4);
        assert.equal(versusScore(true, 9, 5), 5);
        assert.equal(versusScore(true, -2, 5), 0);
        assert.equal(versusScore(false, 0, 4), 4);
        assert.equal(versusScore(true, 0, 0), 0);
    });

    it("live score follows the friend's state", () => {
        assert.equal(versusLiveScore(true, null), 0);
        assert.equal(versusLiveScore(true, { phase: "lobby", correct: 3, round: 2, total: 5 }), 0);
        assert.equal(versusLiveScore(true, { phase: "playing", correct: 2, round: 3, total: 5 }), 2);
        assert.equal(versusLiveScore(false, { phase: "playing", correct: 0, round: 3, total: 5 }), 2);
        assert.equal(versusLiveScore(true, { phase: "done", correct: 4, round: 5, total: 5 }), 4);
    });

    it("finds the winner or a tie", () => {
        assert.equal(versusWinner([4, 3]), 0);
        assert.equal(versusWinner([1, 5]), 1);
        assert.equal(versusWinner([2, 2]), null);
    });
});

describe("reči: pobednik, nerešeno, pohvala za trud", () => {
    it("names the winner gently, with the right gender", () => {
        assert.equal(winnerTitle({ name: "Lejla", gender: "female" }), "Lejla je pobedila!");
        assert.equal(winnerTitle({ name: "Amar", gender: "male" }), "Amar je pobedio!");
        // Pol se ne zna (drug sa drugog uređaja): rečenica važi za oboje
        assert.equal(winnerTitle({ name: "Haris" }), "Haris ima više zvezdica!");
        assert.equal(scoreLine([3, 4]), "⭐ 4 : 3");
    });

    it("praises the effort of the child who did not win (cases and gender)", () => {
        assert.equal(effortPraise({ name: "Amar", gender: "male" }, 3), "Amar, bravo za trud — skupio si 3 zvezdice!");
        assert.equal(effortPraise({ name: "Emina", gender: "female" }, 1), "Emina, bravo za trud — skupila si 1 zvezdicu!");
        assert.equal(effortPraise({ name: "Lejla", gender: "female" }, 5), "Lejla, bravo za trud — skupila si 5 zvezdica!");
        assert.equal(effortPraise({ name: "Haris", gender: null }, 2), "Haris, bravo za trud — imaš 2 zvezdice!");
        assert.equal(effortPraise({ name: "Amar", gender: "male" }, 0), "Amar, bravo za trud — lepo si igrao!");
        assert.equal(effortPraise({ name: "Emina", gender: "female" }, 0), "Emina, bravo za trud — lepo si igrala!");
        assert.equal(effortPraise({ name: "Haris" }, 0), "Haris, bravo za trud — super si!");
    });

    it("puts it together: win, tie, never shame", () => {
        const win = versusTexts([{ name: "Lejla", gender: "female" }, { name: "Amar", gender: "male" }], [4, 3]);
        assert.deepEqual(win, { winner: 0, title: "Lejla je pobedila!", score: "⭐ 4 : 3", praise: "Amar, bravo za trud — skupio si 3 zvezdice!" });
        const tie = versusTexts([{ name: "Lejla", gender: "female" }, { name: "Amar" }], [2, 2]);
        assert.equal(tie.winner, null);
        assert.equal(tie.title, TIE_TITLE);
        assert.equal(tie.title, "Nerešeno — oboje ste super!");
        assert.equal(tie.score, "⭐ 2 : 2");
        for (const t of [win, tie]) assert.doesNotMatch(t.title + t.praise, SHAME);
        assert.equal(genderOf("Female"), "female");
        assert.equal(genderOf("male"), "male");
        assert.equal(genderOf("other"), null);
    });
});

// ── Ekrani ────────────────────────────────────────────────────────────────────

const LEJLA = { name: "Lejla", kind: "cat" };
const AMAR = { name: "Amar", kind: "dog" };

function renderEnd(scores: [number | null, number | null], waitingLine: string | null = null) {
    const seats: [VersusSeat, VersusSeat] = [
        { player: LEJLA, gender: "female", score: scores[0] },
        { player: AMAR, score: scores[1] },
    ];
    return renderToStaticMarkup(
        createElement(VersusEnd, { seats, waitingLine, limitReached: false, saved: "ok", onRematch: () => {}, onLeave: () => {}, adultNote: "takmičenje je samo za zabavu." })
    );
}

describe("kraj takmičenja", () => {
    it("win: both companions with stars, the winner and warm praise for the other", () => {
        const html = renderEnd([4, 3]);
        assert.match(html, /Lejla je pobedila!/);
        assert.match(html, /⭐ 4 : 3/);
        assert.match(html, /Amar, bravo za trud — imaš 3 zvezdice!/);
        assert.match(html, /aria-label="Lejla ima 4 zvezdice"/);
        assert.match(html, /aria-label="Amar ima 3 zvezdice"/);
        assert.match(html, /Revanš/);
        assert.match(html, /Gotovo/);
        assert.doesNotMatch(html, SHAME);
    });

    it("loss (seen from my device): the friend wins, I am praised for effort", () => {
        const html = renderEnd([2, 5]);
        assert.match(html, /Amar ima više zvezdica!/);
        assert.match(html, /⭐ 5 : 2/);
        assert.match(html, /Lejla, bravo za trud — skupila si 2 zvezdice!/);
        assert.match(html, /Revanš/);
        assert.doesNotMatch(html, SHAME);
        assert.doesNotMatch(html, /😢|😞|☹/);
    });

    it("tie: „Nerešeno — oboje ste super!”", () => {
        const html = renderEnd([3, 3]);
        assert.match(html, /Nerešeno — oboje ste super!/);
        assert.match(html, /⭐ 3 : 3/);
        assert.match(html, /Bravo, Lejla i Amar!/);
        assert.doesNotMatch(html, /pobedi/);
    });

    it("while the friend still plays there is no winner yet", () => {
        const html = renderEnd([4, null], "Čekamo da Amar završi…");
        assert.match(html, /Nivo je gotov!/);
        assert.match(html, /Čekamo da Amar završi…/);
        assert.doesNotMatch(html, /pobedi|Nerešeno/);
    });
});

describe("ekran „VS”", () => {
    it("shows both names, VS and the game title, and is short", () => {
        const html = renderToStaticMarkup(createElement(VsIntro, { players: [LEJLA, AMAR], gameTitle: "Gde je?", onDone: () => {} }));
        assert.match(html, />Lejla</);
        assert.match(html, />Amar</);
        assert.match(html, />VS</);
        assert.match(html, /Gde je\?/);
        assert.match(html, /Takmičenje/);
        // Tekst ne kaže gde da se dodirne
        assert.doesNotMatch(html, /dodirni|klikni|pritisni/i);
        assert.ok(VS_INTRO_MS >= 1500 && VS_INTRO_MS <= 3000);
    });

    it("the mode choice starts with „Zajedno”", () => {
        const html = renderToStaticMarkup(createElement(ModeChoice, { mode: "together", onChange: () => {} }));
        assert.match(html, /role="radio" aria-checked="true"[^>]*>.*?Zajedno/);
        assert.match(html, /role="radio" aria-checked="false"[^>]*>.*?Takmičenje/);
    });

    it("lives in the game wrappers, so every game gets it", () => {
        assert.match(read("app/dashboard/child/[id]/playRemote.tsx"), /<VsIntro players=\{\[remote\.me, remote\.session\.friend\]\}/);
        assert.match(read("app/dashboard/child/[id]/playTogether.tsx"), /<VsIntro players=\{\[together\.host, together\.friend\]\}/);
    });
});

describe("poziv u takmičenju (API)", () => {
    let n = 0;
    const from = () => `10.77.0.${++n}`;
    const create = (body: unknown) => POST(jsonRequest("POST", body, { "x-forwarded-for": from() }), idParams(CHILD_ID));
    const join = (code: unknown) => JOIN(jsonRequest("POST", { code }, { "x-forwarded-for": from() }), idParams(OTHER_CHILD_ID));
    const stored = () => ((db.rows("children").find((row) => row.id === CHILD_ID) as Record<string, unknown>).settings as Record<string, unknown>).invite as Record<string, unknown>;

    beforeEach(() => {
        resetWorld();
        seedFamily({ settings: { companion: { kind: "cat", owned: [], wear: {}, spent: 0, v: 4 } } });
        for (const id of [CHILD_ID, OTHER_CHILD_ID]) {
            resetRateLimit(`invite-join:child:${id}`);
            resetRateLimit(`invite-create:child:${id}`);
        }
    });

    it("a versus invite is stored and the friend gets the mode when joining", async () => {
        signInAsChild(CHILD_ID);
        const response = await create({ game: "counting", level: 2, mode: "versus" });
        assert.equal(response.status, 200);
        const invite = (await readJson(response)).invite as { code: string[]; mode?: string };
        assert.equal(invite.mode, "versus");
        assert.equal(stored().mode, "versus");
        signInAsChild(OTHER_CHILD_ID, STRANGER);
        const joined = await readJson(await join(invite.code));
        assert.equal(joined.mode, "versus");
    });

    it("an old client without a mode still gets a together invite (no mode in the answers)", async () => {
        signInAsChild(CHILD_ID);
        const invite = (await readJson(await create({ game: "counting", level: 2 }))).invite as { code: string[]; mode?: string };
        assert.equal(invite.mode, undefined);
        assert.equal(stored().mode, "together");
        signInAsChild(OTHER_CHILD_ID, STRANGER);
        const joined = await readJson(await join(invite.code));
        assert.equal(joined.mode, undefined);
        assert.equal(playModeOr(joined.mode), "together");
    });

    it("refuses an unknown mode", async () => {
        signInAsChild(CHILD_ID);
        for (const mode of ["vs", 1, true, { x: 1 }]) assert.equal((await create({ game: "counting", level: 2, mode })).status, 400, JSON.stringify(mode));
        assert.equal((await create({ game: "counting", level: 2, mode: "together" })).status, 200);
    });
});
