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

describe("drugar u uglu dok dete skroluje", () => {
    const page = SOURCE.slice(SOURCE.indexOf("function ChildPage("));

    it("pojavljuje se samo kad je baner van ekrana, na igrama, i nikad preko otvorene igre", () => {
        assert.match(page, /view === "games" && showAvatar && bannerAway && !gameOpen && \(\s*<FloatingCompanion/);
        assert.match(page, /new IntersectionObserver/);
        assert.match(page, /sectionRef=\{setBanner\}/);
    });

    it("dodir otvara „Moj drugar”, a drugar stoji iznad donje navigacije na telefonu", () => {
        const floating = SOURCE.slice(SOURCE.indexOf("function FloatingCompanion"), SOURCE.indexOf("function ChildPage("));
        assert.match(floating, /aria-label="Moj drugar"/);
        assert.match(floating, /bottom-\[calc\(5\.25rem\+env\(safe-area-inset-bottom\)\)\]/);
        assert.match(floating, /<CompanionStage[^>]*framing="portrait"/);
    });
});

describe("kupljena pozadina preko cele strane", () => {
    it("baner pokazuje samo drugara (bez sveta koji bi se razvukao), a svet je iza cele strane", () => {
        assert.match(BANNER, /<CompanionStage[^>]*framing="wide"[^>]*background=\{false\}/);
        assert.match(SOURCE, /\{showAvatar && <CompanionWorld \/>\}/);
        assert.match(SOURCE, /relative isolate min-h-dvh/);
    });

    it("svet je snimak (ne živo platno), ispod svega i ne hvata dodir", () => {
        const world = readFileSync(path.join(process.cwd(), "app/dashboard/child/[id]/CompanionWorld.tsx"), "utf8");
        assert.match(world, /pointer-events-none fixed inset-0 -z-10/);
        assert.match(world, /aria-hidden="true"/);
        assert.match(world, /framing: "item" as const,\s*slot: "background" as const/);
        assert.doesNotMatch(world, /CompanionStage/);
    });
});
