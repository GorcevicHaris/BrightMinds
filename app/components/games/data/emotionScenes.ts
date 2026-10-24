// Slike situacija za igru „Emocije”, po ID-ju scenarija (data/emotionScenarios.ts).
//
// Glavni lik je uvek „hero”: igra mu daje izgled lika iz scenarija (ili zamenskog lika istog
// roda) i izraz lica. Na lakim nivoima lice pokazuje tačno osećanje; na srednjim i teškim lik
// je okrenut leđima, pa slika pokazuje samo situaciju, a lice se vidi tek uz pomoć ili posle
// tačnog odgovora. Zato ni držanje lika ni ostali likovi ne smeju da govore suprotno od
// tačnog odgovora. Sporedni likovi imaju miran izraz; onaj ko radi nešto neprijatno
// (uzme, sruši, gurne, ruga se) nije nasmejan.

import { hero, inBed, scene, say, shout, thing, think, who, type FigureItem, type SceneSpec } from "@/app/components/games/scene/types";

/** Glavni lik je malo veći od ostale dece, da se odmah vidi o kome je reč */
const me = (x: number, options: Omit<FigureItem, "fig" | "x"> = {}): FigureItem => hero(x, { s: 1.15, ...options });

export const EMOTION_SCENES: Readonly<Record<number, SceneSpec>> = {
    // ── Lako: srećno ──────────────────────────────────────────────────────────
    101: scene("room", [me(110, { pose: "hold", hold: { prop: "gift", s: 0.9 } }), thing("sparkle", 136, 64)]),
    102: scene("room", [
        thing("balloons", 36, 120),
        thing("balloons", 206, 120),
        me(120, { y: 126, wear: ["partyHat"] }),
        thing("table", 120, 150, { s: 1.2 }),
        thing("cake", 120, 110, { s: 0.9 }),
    ]),
    103: scene("room", [who("mama", 104, { pose: "embrace", face: "happy" }), me(132, { flip: true, pose: "embrace" }), thing("heart", 172, 56), thing("heart", 70, 64, { s: 0.6 })]),
    104: scene("park", [me(76, { pose: "kick" }), thing("ball", 112, 140, { s: 1.1 }), who("boy", 168, { pose: "run", flip: true, face: "happy" })]),
    105: scene("park", [thing("tree", 40, 136), thing("swing", 196, 138), me(118, { pose: "walk" }), thing("flowers", 70, 152)]),
    106: scene("room", [me(100, { pose: "pet" }), thing("cat", 134, 150, { s: 1.2, flip: true }), thing("heart", 150, 100, { s: 0.6 })]),
    107: scene("room", [thing("toyBox", 52, 148, { s: 1.2 }), me(112), who("mama", 182, { pose: "wave", flip: true, face: "happy" }), thing("star", 140, 56)]),
    108: scene("park", [me(96, { pose: "eat", hold: { prop: "iceCream", s: 0.9 } }), thing("iceCreamStand", 186, 150, { s: 1.2 })]),
    109: scene("playground", [thing("swing", 120, 150, { s: 1.5 }), me(120, { pose: "sitHold", y: 117, s: 1 }), thing("tree", 30, 140)]),
    110: scene("garden", [me(80, { pose: "run" }), thing("dog", 150, 150, { s: 1.6 }), thing("motionLeft", 120, 130), thing("flowers", 210, 152)]),

    // ── Lako: tužno ───────────────────────────────────────────────────────────
    121: scene("park", [me(100, { pose: "knee", wear: ["plaster"] }), thing("ball", 190, 146)]),
    122: scene("room", [me(96), thing("toyCarBroken", 156, 150, { s: 1.5 })]),
    123: scene("room", [me(118, { pose: "hold", hold: { prop: "drawingTorn", s: 1.1 } }), thing("crayons", 180, 150)]),
    124: scene("park", [me(96, { pose: "reach" }), thing("balloon", 168, 58, { s: 1.3 }), thing("motion", 156, 30)]),
    125: scene("street", [me(100, { pose: "give", hold: { prop: "cone", s: 1 } }), thing("iceCreamDropped", 150, 150, { s: 1.3 })]),
    126: scene("room", [me(140)], "rain"),
    127: scene("bedroom", [thing("bed", 64, 148), me(160, { pose: "shrug" }), thing("question", 196, 62)]),
    128: scene("room", [me(70, { pose: "floor" }), thing("blocksFallen", 160, 150, { s: 1.5 })]),

    // ── Lako: ljuto ───────────────────────────────────────────────────────────
    141: scene("room", [me(80, { pose: "point" }), who("boy", 170, { face: "neutral", pose: "give", hold: { prop: "toyCar", s: 0.9 } }), thing("motion", 152, 118)]),
    142: scene("room", [me(64), thing("blocksFallen", 128, 150, { s: 1.4 }), who("boy2", 192, { face: "neutral", s: 0.9, flip: true })]),
    143: scene("room", [me(56), thing("table", 128, 150), thing("drawingScribbled", 122, 116, { s: 1.1 }), who("girl2", 192, { face: "neutral", s: 0.9, flip: true, pose: "give", hold: { prop: "crayons", s: 0.7 } })]),
    144: scene("kitchen", [me(80), thing("wrapper", 128, 150), who("boy2", 170, { face: "neutral", s: 0.9, flip: true, pose: "eat", hold: { prop: "chocolate", s: 0.6 } })]),
    145: scene("living", [thing("sofa", 84, 152), me(84, { pose: "sit", y: 136 }), thing("tvOff", 196, 134), thing("table", 196, 150, { s: 0.6 }), who("girl2", 152, { face: "neutral", s: 0.9, pose: "give", hold: { prop: "remote" } })]),
    146: scene("street", [who("boy2", 36, { face: "neutral", back: true }), me(108), thing("motionLeft", 132, 104), who("boy", 168, { face: "neutral", pose: "push", flip: true })]),
    147: scene("kitchen", [me(78, { pose: "point" }), who("boy2", 160, { face: "neutral", s: 0.9, flip: true, pose: "run", hold: { prop: "sandwich", s: 0.8 } }), thing("motion", 196, 120)]),

    // ── Srednje: srećno ───────────────────────────────────────────────────────
    201: scene("room", [thing("doorOpen", 64, 148), who("baka", 64, { pose: "wave", face: "happy" }), me(160, { pose: "wave" })]),
    202: scene("beach", [who("mama", 52, { face: "happy" }), me(122, { pose: "up" }), who("tata", 192, { face: "happy" }), thing("ball", 160, 150, { tone: "#f4c94a" })]),
    203: scene("living", [thing("sofa", 120, 152, { s: 1.2 }), who("tata", 96, { pose: "sitHold", y: 140, hold: { prop: "bookOpen", s: 1 } }), me(148, { pose: "sit", y: 134 })]),
    204: scene("snow", [thing("snowman", 92, 148, { s: 1.7 }), me(150, { pose: "give", flip: true, wear: ["beanie", "scarf"], hold: { prop: "carrot", s: 0.9 } })]),
    205: scene("park", [thing("lion", 76, 128, { s: 1.6 }), thing("fence", 76, 134, { s: 1.1 }), me(170)]),
    206: scene("playground", [thing("slide", 110, 148, { s: 1.5 }), me(113, { pose: "floor", y: 101, s: 0.9, rot: 34 })]),
    207: scene("kitchen", [thing("chair", 80, 150, { tone: "#f4b73f" }), me(86, { pose: "sitDraw", y: 134, s: 1, hold: { prop: "fork", s: 0.8 } }), thing("table", 136, 150, { s: 1 }), thing("pancakes", 124, 116), who("baka", 204, { flip: true, face: "happy" })]),
    208: scene("park", [thing("bicycle", 126, 148, { s: 1.4 }), me(116, { pose: "ride", y: 126, s: 1 })]),
    209: scene("pool", [thing("laneRope", 120, 100), me(96, { pose: "swim", y: 120 }), who("tata", 160, { pose: "swim", y: 118, face: "happy" })]),
    210: scene("beach", [me(100, { pose: "give", hold: { prop: "watermelon", s: 0.9 } }), thing("plate", 150, 150), thing("watermelon", 146, 146, { s: 0.7, rot: -80 }), thing("ball", 200, 150, { tone: "#f4c94a" })]),

    // ── Srednje: tužno ────────────────────────────────────────────────────────
    221: scene("street", [me(56), thing("truck", 160, 148, { s: 1.2 }), who("boy", 214, { pose: "wave", flip: true })]),
    222: scene("room", [me(72), thing("clock", 120, 60), think(scene("bedroom", [...inBed("girl", 120, 1.9, { face: "sleep" }), thing("thermometer", 50, 90, { s: 1.6 })]), 172, 58, 40, [104, 76])]),
    223: scene("room", [me(84), thing("doorOpen", 186, 148), who("boy", 186, { pose: "wave", face: "calm" })]),
    224: scene("room", [who("tata", 60), me(104), thing("doorOpen", 190, 148), who("mama", 190, { pose: "wave", flip: true }), thing("suitcase", 214, 148)]),
    225: scene("room", [me(78), think(scene("living", [thing("sofa", 120, 152, { s: 1.6 }), thing("teddy", 112, 124, { s: 2 }), who("baka", 200, { flip: true })]), 172, 58, 36, [104, 76])]),
    226: scene("street", [who("baka", 40, { pose: "wave" }), who("deka", 78, { pose: "wave" }), me(150, { pose: "wave", flip: true }), who("mama", 196)]),
    227: scene("park", [thing("glove", 46, 140, { s: 1.1 }), me(160, { pose: "give", hold: { prop: "glove", s: 1 } })]),
    228: scene("street", [thing("shopClosed", 70, 148, { s: 1.25 }), me(160), think(scene("plain", [thing("iceCream", 120, 150, { s: 4 })]), 210, 44, 26, [176, 70])]),

    // ── Srednje: ljuto ────────────────────────────────────────────────────────
    241: scene("room", [me(92, { pose: "give", hold: { prop: "bookTorn", s: 0.9 } }), who("boy", 170, { face: "neutral", flip: true, pose: "give", hold: { prop: "paper", s: 0.6 } })]),
    242: scene("shop", [me(84), who("boy", 146, { face: "neutral", flip: true }), thing("motionLeft", 164, 96), thing("register", 210, 148)]),
    243: scene("street", [me(70), thing("puddle", 150, 150, { s: 1.2 }), thing("cap", 150, 149, { tone: "#e0574f" }), who("boy", 210, { face: "neutral", flip: true })]),
    244: scene("room", [me(60), thing("puzzlePieces", 124, 150, { s: 1.6 }), who("boy2", 192, { face: "neutral", s: 0.9, flip: true })]),
    245: scene("room", [me(56), thing("table", 122, 150, { s: 1.1 }), thing("boardGame", 122, 112, { s: 1.1 }), who("boy", 188, { face: "neutral", flip: true, pose: "give", hold: { prop: "cards", s: 0.6 } })]),
    246: scene("park", [me(70, { pose: "point" }), thing("motion", 166, 118), who("girl2", 190, { face: "neutral", pose: "hold", hold: { prop: "ball", s: 1 } })]),
    247: scene("beach", [me(60), thing("sandcastleCrushed", 130, 150, { s: 1.5 }), who("boy", 162, { face: "neutral", flip: true, pose: "kick" })]),
    248: scene("kitchen", [who("boy2", 44, { s: 0.9, face: "neutral" }), shout(56, 42), me(124), say(140, 52, true), who("mama", 196, { face: "neutral", flip: true })]),
    249: scene("room", [thing("chair", 70, 150), me(76, { pose: "sitDraw", y: 134, s: 1, hold: { prop: "pencil", s: 0.7, rot: 150 } }), thing("table", 120, 150), thing("paper", 116, 116, { s: 1.2 }), who("boy2", 170, { face: "neutral", s: 0.9, flip: true, pose: "push" })]),

    // ── Srednje: uplašeno ─────────────────────────────────────────────────────
    261: scene("street", [thing("bigDog", 66, 150, { s: 1.35 }), me(180, { pose: "walk", flip: true })]),
    262: scene("room", [me(124), thing("soundWaves", 150, 52)], "storm"),
    263: scene("shop", [thing("shopShelf", 40, 148, { s: 1.2 }), thing("shopShelf", 204, 148, { s: 1.2 }), me(122)]),
    264: scene("bedroom", [thing("lamp", 60, 148), me(128)], "dark"),
    265: scene("bedroom", [...inBed("hero", 80, 1.3), thing("doorOpen", 200, 148), thing("soundWaves", 172, 80, { flip: true })], "night"),
    266: scene("park", [thing("bench", 110, 150, { s: 1.3 }), me(110, { pose: "sit", y: 134 }), thing("bee", 146, 64, { s: 1.6 }), thing("motionLeft", 158, 58)]),
    267: scene("bedroom", [...inBed("hero", 78, 1.3), think(scene("sky", [thing("rainCloud", 120, 110, { s: 2.4 }), thing("lightning", 130, 150, { s: 1.4 })], "storm"), 184, 50, 32, [118, 84])], "night"),
    268: scene("clinic", [me(84), who("doctor", 172, { flip: true, pose: "give", hold: { prop: "syringe", s: 0.8 } })]),
    269: scene("street", [me(120, { pose: "ears" }), thing("burst", 60, 52, { s: 1.2 }), thing("burst", 186, 40), thing("sparkle", 120, 30)], "night"),
    270: scene("beach", [me(70), thing("wave", 170, 140, { s: 2.2 }), thing("motionLeft", 120, 104)]),

    // ── Srednje: iznenađeno ───────────────────────────────────────────────────
    281: scene("hall", [me(56, { pose: "sit", y: 156 }), thing("table", 152, 148, { s: 0.8 }), thing("topHat", 152, 122, { flip: true, rot: 180 }), who("magician", 152, { pose: "reach", hold: { prop: "rabbit", s: 1.4 } })]),
    282: scene("park", [me(72, { pose: "walk" }), thing("squirrel", 146, 140, { s: 1.4 }), thing("motion", 128, 134)]),
    283: scene("room", [me(190)], "rainbow"),
    284: scene("room", [me(84), thing("doorOpen", 170, 148), who("baka", 170, { pose: "wave", face: "happy" })]),
    285: scene("room", [me(84, { pose: "take" }), thing("dog", 138, 130, { s: 1.2, flip: true }), thing("boxOpen", 140, 150, { s: 1.3 }), thing("wrapper", 186, 150)]),
    286: scene("garden", [thing("bench", 110, 150, { s: 1.3 }), me(110, { pose: "sitReach", y: 134 }), thing("butterfly", 140, 62, { s: 0.9 }), thing("flowers", 200, 152)]),

    // ── Teško: srećno ─────────────────────────────────────────────────────────
    301: scene("street", [thing("cloud", 60, 40), thing("sun", 190, 46), me(110), thing("puddle", 170, 152)]),
    302: scene("park", [me(100, { pose: "holdHand" }), who("boy", 138, { pose: "holdHand", flip: true, face: "happy" }), thing("heart", 120, 46)]),
    303: scene("bedroom", [thing("backpack", 46, 148), thing("basket", 78, 148), me(126), think(scene("park", [thing("bus", 120, 140, { s: 1.6 })]), 192, 48, 30, [150, 70])]),
    304: scene("room", [me(90, { pose: "give", hold: { prop: "envelope", s: 1 } }), think(scene("room", [thing("balloons", 50, 120, { s: 1.4 }), who("boy", 130, { s: 1.5, y: 170, wear: ["partyHat"], face: "happy" })]), 176, 56, 36, [116, 70])]),
    305: scene("bedroom", [thing("bed", 76, 148, { s: 1.1 }), me(150, { pose: "give", hold: { prop: "teddy", s: 0.9 } })]),
    306: scene("classroom", [thing("blocks", 40, 150), me(90), who("girl2", 166, { flip: true, pose: "give", face: "happy", hold: { prop: "ball", s: 0.9 } })]),
    307: scene("kitchen", [me(60), thing("table", 120, 150, { s: 1.2 }), thing("cake", 120, 110), who("baka", 190, { flip: true, face: "happy" })]),
    308: scene("room", [thing("suitcase", 40, 148), who("tata", 104, { pose: "embrace", face: "happy" }), me(132, { flip: true, pose: "embrace" })]),
    309: scene("garden", [me(96, { pose: "pet" }), thing("dog", 132, 150, { s: 1.4, flip: true }), thing("dogBed", 196, 150), thing("heart", 150, 60)]),

    // ── Teško: tužno ──────────────────────────────────────────────────────────
    321: scene("beach", [me(66), thing("sandcastleCrushed", 150, 152, { s: 1.4 }), thing("wave", 196, 132, { s: 1.1 })]),
    322: scene("room", [thing("clock", 110, 60), me(84), thing("chair", 186, 148, { tone: "#f4b73f" }), think(scene("street", [who("boy", 120, { s: 1.8, y: 190, pose: "wave", face: "happy" })]), 196, 44, 30, [118, 66])]),
    323: scene("beach", [me(110, { pose: "give", hold: { prop: "suitcase", s: 0.9 } }), thing("bag", 170, 150)], "dusk"),
    324: scene("park", [me(44), who("boy", 140, { pose: "reach", face: "happy" }), thing("kite", 166, 42), who("girl", 194, { pose: "wave", flip: true, face: "happy" })]),
    325: scene("bedroom", [...inBed("hero", 78, 1.3), thing("thermometer", 34, 112), think(scene("room", [thing("balloons", 40, 120, { s: 1.5 }), who("girl", 110, { s: 1.5, y: 170, wear: ["partyHat"], face: "happy" }), thing("cake", 186, 156, { s: 1.6 })]), 188, 50, 34, [126, 84])]),
    326: scene("street", [thing("school", 160, 110, { s: 1 }), me(96, { wear: ["backpack"] }), think(scene("plain", [who("boy", 120, { s: 1.6, y: 160 })]), 196, 40, 26, [128, 62])]),
    327: scene("room", [me(56), thing("table", 122, 150, { s: 1.1 }), thing("boardGame", 122, 112, { s: 1.1 }), who("boy2", 188, { flip: true, pose: "up", face: "happy" })]),
    328: scene("room", [me(84, { pose: "give", hold: { prop: "drawing", s: 0.9 } }), thing("doorOpen", 196, 148), who("tata", 196, { back: true, pose: "walk" })]),
    329: scene("snow", [thing("sun", 190, 40, { s: 1.4 }), me(64), thing("puddle", 140, 152, { s: 1.6 }), thing("carrot", 132, 148), thing("stone", 150, 150, { s: 0.35 }), thing("stone", 160, 151, { s: 0.35 })]),

    // ── Teško: ljuto ──────────────────────────────────────────────────────────
    341: scene("playground", [me(56), thing("hourglass", 96, 70), thing("swing", 164, 148, { s: 1.2 }), who("girl", 164, { face: "neutral", pose: "sit", y: 128 })]),
    342: scene("room", [me(84), say(104, 48, true), who("mama", 168, { face: "neutral", flip: true, pose: "shrug" }), who("girl2", 212, { face: "neutral", s: 0.9, flip: true })]),
    343: scene("kitchen", [me(50), thing("juiceSpill", 112, 152), who("mama", 160, { face: "neutral", flip: true }), who("boy2", 206, { face: "neutral", s: 0.9, flip: true, pose: "point" })]),
    344: scene("classroom", [me(84, { wear: ["glasses"] }), who("boy", 170, { flip: true, pose: "point", face: "neutral" })]),
    345: scene("bedroom", [thing("bed", 56, 148), thing("blocks", 150, 152, { s: 0.8 }), thing("teddy", 174, 152), me(118), who("mama", 206, { flip: true, pose: "point" })], "night"),
    346: scene("park", [me(44), who("boy", 120, { pose: "mouth", face: "neutral" }), who("girl", 162, { face: "neutral", flip: true }), who("boy2", 204, { face: "neutral", flip: true })]),
    347: scene("room", [me(56), thing("table", 124, 150), thing("crayonsBroken", 124, 114, { s: 1.4 }), who("boy2", 192, { face: "neutral", s: 0.9, flip: true })]),
    348: scene("room", [me(96, { pose: "stop" }), thing("motionLeft", 128, 100), who("girl2", 160, { face: "neutral", s: 0.9, flip: true, pose: "push" })]),

    // ── Teško: uplašeno ───────────────────────────────────────────────────────
    361: scene("bedroom", [me(86), think(scene("clinic", [thing("dentistChair", 110, 140, { s: 1.8 }), thing("lampBright", 70, 30, { s: 1.6, rot: 180 }), who("dentist", 200, { flip: true })]), 176, 52, 34, [110, 74])]),
    362: scene("classroom", [
        who("girl", 50, { pose: "sit", y: 120, s: 0.8 }),
        who("boy", 120, { pose: "sit", y: 120, s: 0.8 }),
        who("girl2", 190, { pose: "sit", y: 120, s: 0.8 }),
        thing("desk", 50, 124, { s: 0.9 }),
        thing("desk", 120, 124, { s: 0.9 }),
        thing("desk", 190, 124, { s: 0.9 }),
        me(120, { y: 162, s: 1.25 }),
    ]),
    363: scene("street", [thing("school", 150, 106), me(66, { wear: ["backpack"] }), who("boy", 150), who("girl2", 182, { flip: true }), who("boy2", 214, { flip: true })]),
    364: scene("bedroom", [...inBed("hero", 80, 1.3), thing("doorOpen", 196, 148), who("deka", 172, { flip: true }), who("baka", 208, { flip: true })], "night"),
    365: scene("playground", [thing("climber", 120, 148, { s: 1 }), me(120, { pose: "hug", y: 108, s: 0.95 })]),
    366: scene("bathroom", [thing("sink", 200, 148), thing("spider", 70, 148, { s: 2 }), thing("motionLeft", 100, 140), me(150)]),
    367: scene("street", [me(56), thing("fireTruck", 150, 150, { s: 1.2 }), thing("soundWaves", 196, 76), thing("loudNotes", 168, 68)]),

    // ── Teško: iznenađeno ─────────────────────────────────────────────────────
    381: scene("room", [thing("doorOpen", 36, 148), me(72), thing("confetti", 160, 92), thing("balloons", 222, 116), who("girl", 150, { pose: "up", face: "happy" }), who("boy", 196, { pose: "up", face: "happy", flip: true }), thing("gift", 116, 150)]),
    382: scene("park", [me(110, { pose: "reach" }), thing("burst", 142, 46, { s: 1.1 })]),
    383: scene("bedroom", [thing("bed", 60, 148), me(180)], "snow"),
    384: scene("garden", [me(80, { pose: "give", hold: { prop: "stone", s: 0.9 } }), thing("frog", 134, 150, { s: 1.4 })]),
    385: scene("classroom", [me(80, { wear: ["backpack"] }), who("teacher2", 164, { flip: true, pose: "wave", face: "happy" })]),
    386: scene("room", [me(78), who("tata", 156, { flip: true, pose: "wave", face: "happy", wear: ["shaved"] }), thing("sparkle", 180, 52), think(scene("plain", [who("tata", 120, { s: 2.2, y: 330 })]), 206, 36, 28, [182, 64])]),
    387: scene("kitchen", [me(66, { wear: ["backpack"] }), thing("table", 150, 150, { s: 1.2 }), thing("cake", 150, 110, { s: 1.1 })]),

    // ── Teško: ponosno ────────────────────────────────────────────────────────
    401: scene("room", [me(64), thing("puzzle", 150, 150, { s: 1.8 })]),
    402: scene("room", [me(84, { pose: "sitTie" }), thing("sparkle", 140, 96)]),
    403: scene("park", [thing("bicycle", 126, 148, { s: 1.4, tone: "#3f8fd8" }), me(116, { pose: "ride", y: 126, s: 1 }), thing("motion", 92, 128)]),
    404: scene("classroom", [
        who("teacher", 150, { flip: true, pose: "reach", hold: { prop: "drawing", s: 1.1 } }),
        who("boy", 196, { pose: "sit", y: 156, s: 0.8, back: true }),
        who("girl", 230, { pose: "sit", y: 156, s: 0.8, back: true }),
        me(66),
    ]),
    405: scene("street", [who("baka", 70, { pose: "give" }), thing("bag", 102, 128, { s: 1.2 }), me(132, { pose: "give", flip: true })]),
    406: scene("room", [thing("coatHook", 204, 148), me(118, { wear: ["jacket"] }), thing("sparkle", 146, 70)]),
    407: scene("room", [thing("chair", 60, 150), me(66, { pose: "sitDraw", y: 134, s: 1, hold: { prop: "pencil", s: 0.7, rot: 150 } }), thing("table", 116, 150, { s: 1.1 }), thing("paper", 116, 113, { s: 1.4 }), thing("letters", 116, 98, { s: 0.6 })]),
    408: scene("pool", [thing("laneRope", 120, 100), thing("lifebuoy", 30, 66), me(170, { pose: "swim", y: 118 })]),
    409: scene("garden", [me(80, { pose: "give", hold: { prop: "wateringCan", s: 1 } }), thing("flowers", 140, 152, { s: 1.3 }), thing("flowers", 200, 152, { s: 1.2 })]),
    410: scene("kitchen", [me(80, { pose: "give", hold: { prop: "milk", s: 0.9, rot: 110 } }), thing("table", 136, 150, { s: 1.1 }), thing("glass", 118, 112, { s: 1.1 })]),
};

export function emotionScene(id: number): SceneSpec | undefined {
    return EMOTION_SCENES[id];
}
