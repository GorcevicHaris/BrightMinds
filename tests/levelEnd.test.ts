// Kraj nivoa u svim igrama: svaka igra javlja rezultat okviru (GameContainer), a okvir tada
// uvek slavi (konfeti, novčići ka drugaru, pohvala). Ovde proveravamo da nijedna igra ne
// zaobilazi taj put i da slavlje ne zavisi od vrste rezultata (pročitana priča, slobodno bojenje…).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { GAMES } from "@/lib/games";

const ROOT = process.cwd();
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
const CONTAINER = read("app/dashboard/child/[id]/GameContainer.tsx");

/** Fajl igre za svaki id, iz spiska `GAME_LOADERS` u okviru */
function gameFiles(): Map<string, string> {
    const loaders = CONTAINER.slice(CONTAINER.indexOf("const GAME_LOADERS"), CONTAINER.indexOf("} satisfies"));
    const files = new Map<string, string>();
    for (const match of loaders.matchAll(/^\s+"?([\w-]+)"?: \(\) => import\("@\/(app\/components\/games\/\w+)"\)/gm)) {
        files.set(match[1], `${match[2]}.tsx`);
    }
    return files;
}

/** Telo funkcije `handleComplete` do čuvanja rezultata (deo koji se izvršava i u probnom prikazu) */
function completeBody(): string {
    const start = CONTAINER.indexOf("const handleComplete = useCallback(");
    const end = CONTAINER.indexOf("if (preview) return;", start);
    assert.ok(start > 0 && end > start, "handleComplete postoji");
    return CONTAINER.slice(start, end);
}

describe("level end in every game", () => {
    it("every game is loaded by the container", () => {
        const files = gameFiles();
        assert.deepEqual([...files.keys()].sort(), GAMES.map((game) => game.id).sort());
    });

    it("every game (and both kinds of memory levels) reports its result through onComplete", () => {
        const files = [...gameFiles().values(), "app/components/games/MemoryScene.tsx"];
        for (const file of files) {
            const source = read(file);
            assert.match(source, /\bonComplete(Ref\.current)?\(\{|\bonComplete(Ref\.current)?\(\w+Result\(/, `${file} poziva onComplete sa rezultatom`);
        }
    });

    it("the container always celebrates a finished level, for every kind of result", () => {
        const body = completeBody();
        const celebrate = body.indexOf("celebrateBigWhenSettled();");
        assert.ok(celebrate > 0, "konfeti i zvezdice preko celog ekrana");
        assert.ok(body.indexOf('playSfx("win")') > 0, "zvuk kraja nivoa");
        assert.match(body, /void say\(\s*practice \? "Pročitano\." : advance \?/, "pohvala glasom i za pročitanu priču");
        // Jedini rani izlaz pre slavlja je zaštita od dvostrukog rezultata
        const before = body.slice(0, celebrate);
        assert.equal(before.match(/\breturn\b/g)?.length, 1, "slavlje nije uslovljeno vrstom rezultata");
        assert.match(before, /if \(completingRef\.current \|\| !game\) return;/);
        // Završen nivo uvek donosi bar jednu zvezdicu (pa i novčiće koji lete drugaru)
        assert.match(before, /Math\.max\(1, starsForGame\(/);
    });

    it("the result screen shows praise and coins even with reduced motion", () => {
        // Sloj sa konfetima se gasi uz „Manje animacija”, ali ekran sa rezultatom i pohvala ostaju
        assert.match(CONTAINER, /<CelebrationLayer disabled=\{settings\.reduceMotion\} \/>/);
        assert.match(CONTAINER, /\{screen === "playing" && outcome && !togetherEnd && \(\s*<LevelResult/);
        const ticker = CONTAINER.slice(CONTAINER.indexOf("function useCoinTicker"), CONTAINER.indexOf("function LevelResult"));
        assert.match(ticker, /if \(calm\) \{\s*queueMicrotask\(\(\) => setAdded\(earned\)\);/, "bez leta novčići se odmah dodaju brojaču");
    });
});
