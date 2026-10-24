// Pozdravni baner na početnoj strani deteta: drugar (3D platno) leži ispod sloja sa pozdravom.
// Taj sloj mora da propušta dodire, inače se drugar ne okreće prstom i dodir ne otvara „Moj drugar”.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const SOURCE = readFileSync(path.join(process.cwd(), "app/dashboard/child/[id]/ChildPageClient.tsx"), "utf8");
const BANNER = SOURCE.slice(SOURCE.indexOf("function GreetingBanner"), SOURCE.indexOf("function ChildPage("));

describe("pozdravni baner sa drugarom", () => {
    it("drugar se okreće prevlačenjem", () => {
        assert.match(BANNER, /<CompanionStage[^>]*\binteractive\b/);
    });

    it("sloj sa pozdravom preko platna propušta dodire, a kartica pozdrava ih hvata", () => {
        const overlay = BANNER.slice(BANNER.indexOf("<CompanionStage"));
        const layer = overlay.match(/<div className="([^"]*)">/);
        assert.ok(layer, "sloj sa pozdravom postoji");
        assert.match(layer[1], /\bpointer-events-none\b/);
        assert.match(overlay, /pointer-events-auto[^"]*rounded-2xl/);
    });
});
