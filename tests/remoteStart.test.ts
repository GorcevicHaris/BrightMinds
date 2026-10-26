// „Krenimo!” u igri sa drugom na drugom uređaju: dodir uvek otvori igru, ili dugme jasno pokaže
// da još nije spremno. Isto pravilo (`remoteStartState`) čuva i otvaranje igre u GameContainer-u,
// pa dugme nikad ne izgleda spremno dok bi dodir prošao bez ičega.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RemoteStartButton } from "@/app/dashboard/child/[id]/playRemote";
import { remoteStartState, type RemoteStart } from "@/lib/invite";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const render = (start: RemoteStart) => renderToStaticMarkup(createElement(RemoteStartButton, { start, onStart: () => {}, onRetry: () => {} }));

describe("remoteStartState", () => {
    it("is ready only when progress is loaded and there is time left", () => {
        assert.equal(remoteStartState({ limitReached: false, loading: false, error: false }), "ready");
        assert.equal(remoteStartState({ limitReached: false, loading: true, error: false }), "loading");
        assert.equal(remoteStartState({ limitReached: false, loading: false, error: true }), "unavailable");
        assert.equal(remoteStartState({ limitReached: true, loading: false, error: false }), "rest");
    });

    it("prefers the state the child can act on", () => {
        // Neuspelo učitavanje se nudi za ponovni pokušaj i kad se ponovo učitava (a ne „Sprema se…” zauvek)
        assert.equal(remoteStartState({ limitReached: false, loading: true, error: true }), "unavailable");
        assert.equal(remoteStartState({ limitReached: true, loading: true, error: true }), "rest");
    });
});

describe("dugme „Krenimo!”", () => {
    it("is enabled and says „Krenimo!” only when ready", () => {
        const html = render("ready");
        assert.match(html, /Krenimo!/);
        assert.doesNotMatch(html, /disabled=""/);
    });

    it("visibly shows „Sprema se…” while progress is loading", () => {
        const html = render("loading");
        assert.match(html, /Sprema se…/);
        assert.doesNotMatch(html, /Krenimo!/);
        assert.match(html, /disabled=""/);
        assert.match(html, /aria-busy="true"/);
    });

    it("offers „Probaj ponovo” when progress did not load (a tap is never silent)", () => {
        const html = render("unavailable");
        assert.match(html, /Probaj ponovo/);
        assert.doesNotMatch(html, /disabled=""/);
    });

    it("is disabled when today's time is up", () => {
        const html = render("rest");
        assert.match(html, /Gotovo za danas/);
        assert.match(html, /disabled=""/);
    });
});

describe("put od GameContainer-a do predvorja", () => {
    const container = read("app/dashboard/child/[id]/GameContainer.tsx");
    const map = read("app/dashboard/child/[id]/GameMap.tsx");

    it("opens a game at a level only under the same rule the button shows", () => {
        const start = container.indexOf("const openAtLevel = ");
        assert.ok(start > 0, "openAtLevel postoji");
        const body = container.slice(start, container.indexOf("};", start));
        assert.match(body, /if \(startState !== "ready"\) return;/);
        // Nema posebnog, skrivenog uslova koji dugme ne bi znalo
        assert.doesNotMatch(body, /levelsLoading|levelsError|limitReached/);
        assert.match(container, /const startState = remoteStartState\(\{ limitReached: clock\.limitReached, loading: levelsLoading, error: levelsError \}\);/);
    });

    it("hands the same state to the lobby button", () => {
        assert.match(container, /onOpenLevel=\{openAtLevel\}\s+remoteStart=\{startState\}\s+onRetry=\{retryLevels\}/);
        assert.match(map, /<RemoteLobby start=\{remoteStart\} onOpenLevel=\{onOpenLevel\} onRetry=\{onRetry\} games=\{playable\} unlockedFor=\{unlockedFor\} \/>/);
        // Posle „Prihvati” igra se otvara sama, istim putem i istim pravilom (openAtLevel → startState)
        assert.match(container, /useRemoteAutoStart\(startState, openAtLevel\);/);
    });
});
