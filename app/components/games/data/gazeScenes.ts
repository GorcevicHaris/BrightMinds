// Slike za igru „Šta gleda?” (data/gazeRounds.ts), crtane iz istog kompleta kao ostale slike.
//
// Pozadina je mirna i prazna („plain”), da ništa osim lika i predmeta ne vuče pogled.
// look/want: lik je u sredini, krupno (glava i ramena), a predmeti su levo i desno od njega —
// dole na podu ili gore na polici. know: dvoje dece i otvorena kutija između njih; jedno gleda
// u kutiju (kutija je bliže njemu), drugo gleda nešto daleko, gore.

import { getGazeObject, headTurn, slotSide, type GazeObject, type GazeView, type SlotId } from "@/app/components/games/data/gazeRounds";
import { scene, thing, who, type SceneItem, type SceneSpec } from "@/app/components/games/scene/types";

/** Gde stoji predmet (sredina donje ivice); gornja mesta imaju policu na zidu */
const SLOT_POINT: Record<SlotId, readonly [number, number]> = {
    left: [36, 152],
    right: [204, 152],
    upLeft: [38, 70],
    upRight: [202, 70],
};

/** Lik u sredini: stopala ispod slike, pa se vide glava i ramena (krupno lice i oči) */
const BUST = { x: 120, y: 200, s: 2.1 } as const;

/** Sredina predmeta na slici i poluprečnik kruga oko njega */
function objectCenter(object: GazeObject, x: number, y: number): { cx: number; cy: number; r: number } {
    const [x0, y0, x1, y1] = object.box;
    return { cx: x + ((x0 + x1) / 2) * object.s, cy: y + ((y0 + y1) / 2) * object.s, r: (Math.max(x1 - x0, y1 - y0) * object.s) / 2 + 5 };
}

function objectItems(object: GazeObject, slot: SlotId): SceneItem[] {
    const [x, y] = SLOT_POINT[slot];
    const items: SceneItem[] = [];
    if (slot === "upLeft" || slot === "upRight") items.push(thing("wallShelf", x, y, { s: 1.4 }));
    items.push(thing(object.prop, x, y, { s: object.s, ...(object.tone ? { tone: object.tone } : {}) }));
    return items;
}

/**
 * Slika zadatka. `line` = pomoć „prati pogled” (tačkice od očiju do predmeta i krug oko njega);
 * crta se i posle tačnog odgovora, kao potvrda.
 */
export function gazeScene(round: Pick<GazeView, "kind" | "cue" | "hero" | "other" | "objects" | "target" | "heroSide">, line: boolean): SceneSpec | null {
    if (round.kind === "know") return knowScene(round, line);
    const placed = round.objects.map((item) => ({ item, object: getGazeObject(item.id) })).filter((entry): entry is { item: (typeof round.objects)[number]; object: GazeObject } => entry.object !== undefined);
    const target = placed.find((entry) => entry.item.id === round.target);
    if (!round.hero || !target) return null;
    const [tx, ty] = SLOT_POINT[target.item.slot];
    const center = objectCenter(target.object, tx, ty);
    const pointing = round.cue === "point";
    const items: SceneItem[] = placed.flatMap(({ item, object }) => objectItems(object, item.slot));
    items.push(
        who(round.hero, BUST.x, {
            y: BUST.y,
            s: BUST.s,
            face: "calm",
            // Ruka koja pokazuje je desna; za predmet levo lik se crta preokrenut. Ka predmetu gore
            // (na polici) ruka ide uvis, ka predmetu dole pokazuje ispred sebe.
            pose: pointing ? (upper(target.item.slot) ? "reach" : "point") : "stand",
            flip: pointing && slotSide(target.item.slot) === "left",
            gaze: { x: center.cx, y: center.cy, head: headTurn(round.cue), line, ring: line ? center.r : 0 },
        })
    );
    return { ...scene("plain", items), camera: "fixed" };
}

/** Otvorena kutija pri podu, bliže detetu koje gleda u nju (pogled jasno ide nadole, u kutiju) */
const BOX = { left: 100, right: 140, y: 152, s: 1.35 } as const;
const KID = { left: 48, right: 192, y: 150, s: 1.3 } as const;
const FAR_POINT = { left: [26, 46], right: [214, 46] } as const;

function upper(slot: SlotId): boolean {
    return slot === "upLeft" || slot === "upRight";
}

function knowScene(round: Pick<GazeView, "cue" | "hero" | "other" | "objects" | "heroSide">, line: boolean): SceneSpec | null {
    const far = getGazeObject(round.objects[0]?.id);
    if (!round.hero || !round.other || !far) return null;
    const heroX = KID[round.heroSide];
    const otherSide = round.heroSide === "left" ? "right" : "left";
    const otherX = KID[otherSide];
    // Ono daleko je na strani drugog deteta, pa ono gleda od kutije
    const [fx, fy] = FAR_POINT[otherSide];
    const farCenter = objectCenter(far, fx, fy);
    const boxX = BOX[round.heroSide];
    const boxInside = { x: boxX, y: BOX.y - 24 * BOX.s };
    return {
        ...scene("plain", [
            thing(far.prop, fx, fy, { s: far.s, ...(far.tone ? { tone: far.tone } : {}) }),
            thing("boxOpen", boxX, BOX.y, { s: BOX.s }),
            who(round.hero, heroX, { y: KID.y, s: KID.s, face: "calm", gaze: { x: boxInside.x, y: boxInside.y, head: headTurn(round.cue), line, ring: line ? 26 : 0 } }),
            who(round.other, otherX, { y: KID.y, s: KID.s, face: "calm", gaze: { x: farCenter.cx, y: farCenter.cy, head: headTurn(round.cue) } }),
        ]),
        camera: "fixed",
    };
}
