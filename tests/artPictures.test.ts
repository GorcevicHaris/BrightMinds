// Zajednički komplet slika i igra „Razvrstaj” bez emodžija: svaki predmet i svaka korpa su crtež,
// predmet u nivoima boja je zaista te boje, a u igri nigde nema emodžija kao slike.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { basketFor, belongsTo, buildSortLevel, getSortItem, SORT_ITEMS, SORT_MAX_LEVEL, type BasketId, type SortColor, type SortItem } from "@/app/components/games/data/sortingItems";
import { Picture, PICTURE_IDS, isPictureId } from "@/app/components/games/pictures";
import SortingGame, { type SortingView } from "@/app/components/games/SortingGame";

const EMOJI = /\p{Extended_Pictographic}/u;

/** Tekst između oznaka (ono što bi bilo napisano na ekranu) */
function visibleText(markup: string): string {
    return markup.replace(/<[^>]*>/g, " ");
}

function seeded(seed: number) {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2 ** 31;
        return x / 2 ** 31;
    };
}

/** Nijansa (0–360) i zasićenost boje #rrggbb */
function hueOf(hex: string): { hue: number; sat: number } {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const sat = max === 0 ? 0 : d / max;
    if (d === 0) return { hue: 0, sat };
    const hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { hue: (hue * 60 + 360) % 360, sat };
}

const HUES: Record<SortColor, (hue: number) => boolean> = {
    red: (hue) => hue < 12 || hue > 340,
    yellow: (hue) => hue >= 38 && hue <= 58,
    green: (hue) => hue >= 85 && hue <= 165,
    blue: (hue) => hue >= 200 && hue <= 235,
};

/** Boje ispune na crtežu (zasićene, bez sive, bele i crne) */
function fills(markup: string): string[] {
    return [...markup.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1]).filter((hex) => hueOf(hex).sat > 0.45);
}

function render(item: SortItem, kind: SortingView["kind"], baskets: BasketId[], placed: SortingView["placed"] = {}): string {
    const monitorState: Partial<SortingView> = { kind, support: "model", itemId: item.id, baskets, placed, modelIds: Object.values(placed).flat() as string[], round: 1, totalRounds: 5 };
    return renderToStaticMarkup(createElement(SortingGame, { childId: 0, level: 1, isMonitor: true, monitorState, onComplete: () => {} }));
}

describe("shared picture set", () => {
    it("draws every picture as SVG, without any emoji", () => {
        assert.ok(PICTURE_IDS.length >= 150);
        for (const id of PICTURE_IDS) {
            const markup = renderToStaticMarkup(createElement(Picture, { id }));
            assert.match(markup, /^<svg [^>]*viewBox="[-\d. ]+"/, id);
            assert.match(markup, /<(path|circle|ellipse|rect)\b/, `${id}: has shapes`);
            assert.doesNotMatch(visibleText(markup), EMOJI, id);
        }
    });
});

describe("sorting game pictures", () => {
    it("gives every item a drawing (shapes are drawn in their own color)", () => {
        for (const item of SORT_ITEMS) {
            if (item.shape) assert.ok(item.color && !item.pic, item.id);
            else assert.ok(item.pic && isPictureId(item.pic), `${item.id}: ${item.pic}`);
        }
    });

    it("draws every basket of every kind with a picture, a colour, a shape or a size, never an emoji", () => {
        const ids: BasketId[] = [
            ...(["red", "yellow", "green", "blue"] as const).map((key) => `color:${key}` as const),
            ...(["circle", "square", "triangle", "star"] as const).map((key) => `shape:${key}` as const),
            ...(["big", "small"] as const).map((key) => `size:${key}` as const),
            ...(["fruit", "animals", "vehicles", "clothes", "toys", "music", "school"] as const).map((key) => `category:${key}` as const),
            ...(["eat", "noEat", "summer", "winter", "air", "water", "land", "meal", "wash", "draw"] as const).map((key) => `rule:${key}` as const),
            ...(["apple-red", "banana", "ball", "car", "dog", "teddy", "fish", "frog"] as const).map((key) => `same:${key}` as const),
        ];
        for (const id of ids) {
            const basket = basketFor(id);
            assert.ok(basket.swatch || basket.shape || basket.size || (basket.pic && isPictureId(basket.pic)), id);
            if (id.startsWith("same:")) assert.equal(basket.pic, getSortItem(id.slice(5))!.pic, `${id}: same picture as the item`);
        }
        // Slika na korpi pravila nije predmet koji se razvrstava (ne odaje odgovor)
        const itemPictures = new Set(SORT_ITEMS.map((item) => item.pic));
        for (const id of ids.filter((key) => key.startsWith("category:") || (key.startsWith("rule:") && key !== "rule:summer"))) {
            assert.ok(!itemPictures.has(basketFor(id).pic), `${id}: basket picture is not one of the items`);
        }
    });

    it("draws each colored item clearly in its color", () => {
        for (const item of SORT_ITEMS.filter((it) => it.color && it.pic)) {
            const markup = renderToStaticMarkup(createElement(Picture, { id: item.pic! }));
            const hues = fills(markup).map((hex) => hueOf(hex).hue);
            assert.ok(hues.some(HUES[item.color!]), `${item.id} (${item.pic}) is not ${item.color}`);
            // Nijedna druga od četiri boje igre nije glavna boja crteža (npr. leptir u nivou plave nije ljubičast)
            const counts = (Object.keys(HUES) as SortColor[]).map((color) => [color, hues.filter(HUES[color]).length] as const);
            const top = Math.max(...counts.map(([, n]) => n));
            assert.equal(counts.find(([color]) => color === item.color)![1], top, `${item.id}: ${JSON.stringify(counts)}`);
        }
    });

    it("uses one drawing for big and small, and shows the small one at about 45 % of the big one", () => {
        const sized = SORT_ITEMS.filter((item) => item.size);
        for (const item of sized) {
            const twin = sized.find((other) => other.name === item.name && other.size !== item.size)!;
            assert.equal(item.pic, twin.pic, item.id);
        }
        const big = render(getSortItem("size-ball-big")!, "size", ["size:big", "size:small"]);
        const small = render(getSortItem("size-ball-small")!, "size", ["size:big", "size:small"]);
        assert.match(big, /h-\[80%\] w-\[80%\]/);
        assert.match(small, /h-\[36%\] w-\[36%\]/);
    });

    it("shows no emoji anywhere in the game, on any level, with items in the baskets", () => {
        for (let level = 1; level <= SORT_MAX_LEVEL; level += 1) {
            for (const seed of [3, 9]) {
                const built = buildSortLevel(level, { maxBaskets: 4, maxRounds: 8, random: seeded(level * 31 + seed) });
                // Svi zadaci nivoa su već u svojim korpama, a prvi je i na sredini
                const placed: SortingView["placed"] = {};
                for (const round of built.rounds) {
                    const item = getSortItem(round.itemId)!;
                    const basket = built.baskets.find((id) => belongsTo(item, id))!;
                    placed[basket] = [...(placed[basket] ?? []), item.id];
                }
                const first = getSortItem(built.rounds[0].itemId)!;
                const markup = render(first, built.kind, built.baskets, placed);
                assert.doesNotMatch(visibleText(markup), EMOJI, `level ${level}`);
                // Predmet na sredini i u korpama je crtež
                assert.ok((markup.match(/<svg /g) ?? []).length > built.rounds.length, `level ${level}: pictures drawn`);
            }
        }
    });

    it("renders every single item without emoji", () => {
        for (const item of SORT_ITEMS) {
            const markup = render(item, item.shape ? "shape" : item.size ? "size" : "category", ["category:fruit", "category:animals"]);
            assert.doesNotMatch(visibleText(markup), EMOJI, item.id);
        }
    });
});
