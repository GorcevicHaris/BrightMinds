// Slike za „Socijalne priče”: naslovna slika i po jedna slika za svaku stranicu priče
// (data/socialStories.ts), po nivou. Priče su u prvom licu, pa je glavni lik dete koje igra.
//
// Slika prikazuje ono što piše na stranici. Ne crta ni izbor koji manje pomaže, ni odgovor na
// pitanje sa te stranice (npr. stranica „Šta može da te ugreje?” ne pokazuje šolju čaja), da
// pitanje ostane pitanje. Lice deteta odgovara tekstu stranice: nervozno kod zubara, umorno
// posle duge igre, nelagodno kad je glasno; nasmejano samo kad je situacija prijatna.

import { hero, inBed, scene, say, thing, who, type FigureItem, type SceneSpec } from "@/app/components/games/scene/types";

export interface StoryPictures {
    cover: SceneSpec;
    steps: readonly SceneSpec[];
}

const me = (x: number, options: Omit<FigureItem, "fig" | "x"> = {}): FigureItem => hero(x, { s: 1.1, ...options });
const swim = ["swim"] as const;
const winter = ["jacket", "beanie", "scarf"] as const;

export const STORY_SCENES: Readonly<Record<number, StoryPictures>> = {
    // 1 — Jutro
    1: {
        cover: scene("bedroom", [thing("bed", 64, 148), me(150, { pose: "up", face: "happy" })]),
        steps: [
            scene("bedroom", [...inBed("hero", 90, 1.3, { face: "calm" }), thing("doorOpen", 210, 148), thing("soundWaves", 186, 74, { flip: true })]),
            scene("bathroom", [thing("mirror", 160, 80, { s: 1.3 }), thing("sink", 160, 148), me(92, { pose: "give", face: "happy", hold: { prop: "toothbrush", s: 1 } })]),
            scene("kitchen", [me(60, { pose: "belly", face: "neutral" }), thing("table", 140, 150, { s: 1.1 }), thing("plate", 140, 112), thing("chair", 196, 150)]),
            scene("room", [me(100, { pose: "sit", face: "calm" }), thing("shoes", 150, 150, { s: 1.2 })]),
        ],
    },
    // 2 — Škola
    2: {
        cover: scene("street", [thing("school", 140, 112, { s: 1.3 }), me(56, { wear: ["backpack"], face: "happy" })]),
        steps: [
            scene("street", [thing("school", 150, 108, { s: 1.2 }), thing("soundWaves", 160, 44), me(50, { wear: ["backpack"], face: "neutral" }), who("girl", 186, { back: true }), who("boy", 216, { back: true })]),
            scene("classroom", [
                who("teacher", 120, { face: "talk", pose: "point" }),
                who("boy", 44, { pose: "sit", y: 162, back: true }),
                me(120, { pose: "sit", y: 166, back: true }),
                who("girl", 196, { pose: "sit", y: 162, back: true }),
            ]),
            scene("classroom", [who("teacher", 184, { flip: true, face: "talk" }), say(162, 36, true), me(64, { face: "happy" }), who("girl", 118, { pose: "reach", face: "happy" })]),
            scene("classroom", [thing("desk", 120, 150, { s: 1.2 }), thing("book", 104, 114), me(160, { pose: "hold", hold: { prop: "backpack", s: 0.9 }, face: "happy" })]),
        ],
    },
    // 3 — Kod zubara
    3: {
        cover: scene("clinic", [thing("tooth", 70, 96, { s: 1.6 }), thing("sparkle", 92, 54), thing("toothbrush", 112, 130, { s: 1.2 }), who("dentist", 180, { flip: true, pose: "wave", face: "happy" })]),
        steps: [
            scene("bathroom", [thing("mirror", 170, 80, { s: 1.3 }), thing("sink", 170, 148), me(96, { pose: "give", face: "happy", hold: { prop: "toothbrush", s: 1 } })]),
            scene("clinic", [thing("lampBright", 106, 22, { rot: 180, s: 1.4 }), thing("dentistChair", 104, 150, { s: 1.4 }), me(92, { pose: "sit", y: 124, s: 1, face: "worried" }), who("dentist", 186, { flip: true, pose: "give", hold: { prop: "mirror", s: 0.3 } })]),
            scene("clinic", [thing("dentistChair", 104, 150, { s: 1.4 }), me(92, { pose: "sit", y: 124, s: 1, face: "worried" }), thing("soundWaves", 150, 70), who("dentist", 186, { flip: true, pose: "give", hold: { prop: "toothbrush", s: 0.6 } })]),
            scene("clinic", [me(84, { face: "happy" }), thing("sparkle", 100, 64), who("dentist", 166, { flip: true, pose: "wave", face: "happy" })]),
        ],
    },
    // 4 — Prodavnica
    4: {
        cover: scene("shop", [thing("cart", 130, 150, { s: 1.8 }), thing("bread", 126, 118), thing("apple", 142, 116), me(60, { face: "happy" })]),
        steps: [
            scene("shop", [me(74, { face: "neutral" }), who("mama", 142), thing("cart", 196, 150, { s: 1.5 })]),
            scene("shop", [thing("fridge", 56, 148, { s: 1.1 }), thing("milk", 44, 96), thing("cheese", 66, 92), me(120, { pose: "give", hold: { prop: "milk", s: 1 }, face: "happy" }), thing("cart", 190, 150, { s: 1.4 })]),
            scene("shop", [thing("shopShelf", 70, 148, { s: 1.3 }), thing("sweets", 70, 106, { s: 1.2 }), me(150, { face: "neutral" }), who("mama", 204, { flip: true })]),
            scene("shop", [who("seller", 190, { y: 150, flip: true, face: "happy" }), thing("register", 186, 150, { s: 1.1 }), thing("soundWaves", 200, 82), who("mama", 120, { pose: "give" }), me(62, { face: "neutral" })]),
        ],
    },
    // 5 — Park
    5: {
        cover: scene("park", [thing("tree", 40, 136), thing("ball", 160, 150), me(112, { pose: "up", face: "happy" })]),
        steps: [
            scene("playground", [thing("sun", 34, 46, { s: 1.6 }), thing("swing", 70, 148), thing("slide", 186, 148), me(126, { face: "neutral" })]),
            scene("playground", [thing("slide", 110, 148, { s: 1.3 }), me(82, { y: 74, s: 0.9, pose: "hold", face: "happy" })]),
            scene("park", [thing("sun", 200, 46, { s: 1.6 }), thing("ball", 170, 150), me(104, { pose: "walk", face: "tired" })]),
            scene("park", [thing("slide", 48, 148), me(110, { face: "worried" }), who("mama", 182, { flip: true, face: "talk" }), say(160, 38, true)], "dusk"),
        ],
    },
    // 6 — Kod doktora
    6: {
        cover: scene("clinic", [me(84), thing("thermometer", 120, 110, { s: 1.4 }), who("doctor", 172, { flip: true, pose: "wave", face: "happy" })]),
        steps: [
            scene("bedroom", [...inBed("hero", 96, 1.3, { face: "sad" }), thing("thermometer", 50, 110, { s: 1.2 })]),
            scene("clinic", [
                thing("waitingChairs", 120, 150, { s: 1.2 }),
                who("boy", 84, { pose: "sit", y: 130, s: 0.85 }),
                me(120, { pose: "sit", y: 130, s: 0.95, face: "worried" }),
                who("mama", 156, { pose: "sit", y: 150, s: 0.85 }),
                who("woman", 210, { flip: true }),
            ]),
            scene("clinic", [who("mama", 40), me(98, { face: "worried" }), who("doctor", 168, { flip: true, pose: "give", hold: { prop: "lampBright", s: 0.4, rot: -90 } })]),
            scene("kitchen", [me(80, { face: "neutral" }), thing("syrup", 132, 112), thing("table", 130, 150, { s: 0.9 }), who("mama", 182, { flip: true, pose: "give", hold: { prop: "spoon", s: 1 } })]),
            scene("room", [me(100, { pose: "up", face: "happy" }), who("mama", 176, { flip: true, face: "happy" })]),
        ],
    },
    // 7 — Restoran
    7: {
        cover: scene("restaurant", [me(70, { face: "happy", y: 136 }), thing("table", 124, 150, { s: 1.3 }), thing("soup", 116, 106), thing("cup", 142, 106)]),
        steps: [
            scene("restaurant", [who("tata", 40), me(84, { face: "neutral" }), thing("chair", 140, 150), thing("table", 160, 150), who("waiter", 214, { flip: true, pose: "point" })]),
            scene("restaurant", [me(100, { pose: "sit", y: 132 }), thing("table", 116, 150, { s: 1.2 }), thing("menu", 128, 108), who("waiter", 196, { flip: true, face: "talk", pose: "give", hold: { prop: "menu", s: 0.8 } }), say(174, 36, true)]),
            scene("restaurant", [me(104, { pose: "sit", y: 132, face: "tired" }), thing("table", 116, 150, { s: 1.2 }), thing("hourglass", 140, 108), thing("plate", 104, 108)]),
            scene("restaurant", [me(104, { pose: "sitHold", y: 132, face: "happy", hold: { prop: "spoon", s: 0.9 } }), thing("table", 116, 150, { s: 1.2 }), thing("soup", 136, 108)]),
        ],
    },
    // 8 — Vatra
    8: {
        cover: scene("street", [thing("fireTruck", 120, 150, { s: 1.4 }), who("firefighter", 206, { flip: true, pose: "wave", face: "happy" })]),
        steps: [
            scene("kitchen", [me(52, { face: "neutral" }), thing("stove", 160, 148, { s: 1.2 }), thing("pot", 156, 100), thing("steam", 156, 82), who("mama", 206, { flip: true })]),
            scene("classroom", [thing("soundWaves", 128, 40), thing("soundWaves", 112, 40, { flip: true }), who("teacher", 170, { flip: true, pose: "point" }), me(84, { face: "worried" })]),
            scene("living", [thing("smoke", 190, 86, { s: 1.4 }), thing("doorOpen", 206, 148), me(96, { face: "worried" })]),
            scene("street", [who("man", 80, { pose: "give", face: "talk", hold: { prop: "phone", s: 1 } }), me(132, { face: "worried" }), thing("fireTruck", 210, 150, { s: 0.8 })]),
            scene("street", [thing("fireTruck", 104, 150, { s: 1.2 }), who("firefighter", 190, { flip: true, face: "happy" }), me(26, { s: 0.95, face: "happy" })]),
        ],
    },
    // 9 — Rođendan
    9: {
        cover: scene("room", [thing("balloons", 40, 120), me(120, { wear: ["partyHat"], face: "happy", y: 118 }), thing("table", 120, 150, { s: 1.3 }), thing("cake", 120, 106, { s: 0.8 }), thing("gift", 196, 150)]),
        steps: [
            scene("room", [thing("balloons", 36, 120), me(100, { wear: ["partyHat"], face: "neutral" }), thing("doorOpen", 188, 148), who("girl", 188, { pose: "wave", face: "happy" }), thing("soundWaves", 214, 70)]),
            scene("room", [me(88, { pose: "hold", face: "neutral", hold: { prop: "book", s: 1 } }), thing("wrapper", 122, 150), who("lejla", 170, { flip: true, face: "happy" })]),
            scene("room", [who("girl", 50, { face: "talk" }), me(120, { y: 118, wear: ["partyHat"], face: "worried" }), thing("table", 120, 150, { s: 1.3 }), thing("cake", 120, 106, { s: 0.8 }), who("boy", 190, { flip: true, face: "talk" }), thing("notes", 164, 60)], "dark"),
            scene("room", [who("boy", 60, { pose: "walk" }), thing("burst", 120, 46), who("girl", 170, { pose: "walk", flip: true }), me(214, { wear: ["partyHat"], face: "tired" })]),
            scene("room", [me(100, { pose: "wave", face: "happy" }), thing("doorOpen", 190, 148), who("girl", 190, { back: true })]),
        ],
    },
    // 10 — Moj pas
    10: {
        cover: scene("garden", [me(66, { face: "happy" }), thing("dog", 140, 150, { s: 2 }), thing("heart", 160, 70)]),
        steps: [
            scene("kitchen", [thing("dog", 104, 150, { s: 1.7 }), thing("dogBowl", 150, 150, { s: 1.4 }), me(200, { flip: true, face: "neutral" })]),
            scene("room", [me(64, { face: "neutral" }), thing("door", 198, 148), thing("dog", 166, 150, { s: 1.6 }), thing("soundWaves", 196, 102)]),
            scene("park", [me(56, { face: "worried" }), thing("poodle", 146, 150, { s: 1.7 }), who("man", 196, { flip: true })]),
            scene("living", [me(60), thing("dogBed", 150, 150, { s: 1.4 }), thing("dog", 150, 146, { s: 1.3 }), thing("zzz", 176, 104)]),
            scene("garden", [me(92, { pose: "pet", face: "happy" }), thing("dog", 126, 150, { s: 1.6, flip: true }), thing("heart", 120, 70)]),
        ],
    },
    // 11 — Voz
    11: {
        cover: scene("station", [thing("train", 120, 146, { s: 1.2 }), me(200, { face: "happy", hold: { prop: "suitcase", s: 0.7 }, pose: "give", flip: true })]),
        steps: [
            scene("station", [thing("bench", 60, 150), thing("clock", 200, 60), who("tata", 112), me(150, { face: "neutral" })]),
            scene("station", [thing("train", 70, 146), who("tata", 150), me(116, { face: "neutral" }), who("conductor", 206, { flip: true, pose: "give", hold: { prop: "ticket", s: 1 } })]),
            scene("train", [who("tata", 50), me(104, { face: "worried" }), thing("seat", 184, 152, { s: 1.3 }), who("baka", 184, { pose: "sit", y: 150, s: 0.9 })]),
            scene("train", [thing("seat", 60, 152, { s: 1.3 }), who("man", 60, { pose: "sitHold", y: 150, s: 0.9, hold: { prop: "book", s: 1 } }), thing("seat", 170, 152, { s: 1.3 }), me(170, { pose: "sit", y: 138, s: 1 }), who("woman", 214, { face: "sleep" })]),
            scene("train", [me(96, { face: "worried" }), who("tata", 150, { flip: true }), thing("door", 212, 148), thing("toilet", 212, 74, { s: 0.6 })]),
            scene("station", [me(100, { pose: "wave", face: "happy" }), who("tata", 160, { face: "happy", pose: "give", hold: { prop: "suitcase", s: 0.8 } })]),
        ],
    },
    // 12 — Vakcina
    12: {
        cover: scene("clinic", [me(80), thing("plaster", 120, 96, { s: 2 }), who("doctor", 172, { flip: true, pose: "wave", face: "happy" })]),
        steps: [
            scene("clinic", [
                who("mama", 30),
                me(64, { face: "neutral" }),
                thing("waitingChairs", 160, 150, { s: 1.1 }),
                who("boy", 127, { pose: "sit", y: 132, s: 0.85 }),
                who("girl", 160, { pose: "sit", y: 132, s: 0.85 }),
                who("boy2", 193, { pose: "sit", y: 132, s: 0.85 }),
            ]),
            scene("clinic", [me(80, { face: "worried" }), thing("clock", 120, 58), thing("doorOpen", 190, 148), who("nurse", 186, { flip: true, face: "talk" }), say(164, 34, true)]),
            scene("clinic", [me(96, { back: true }), who("doctor", 150, { flip: true, pose: "give", hold: { prop: "stethoscope", s: 1 } })]),
            scene("clinic", [me(90, { face: "worried" }), who("nurse", 166, { flip: true, pose: "give", hold: { prop: "syringe", s: 0.7 } })]),
            scene("room", [me(84, { wear: ["plaster"], face: "neutral" }), thing("plaster", 74, 104, { s: 0.8, rot: 70 }), thing("table", 160, 150, { s: 0.9 }), thing("syrup", 160, 120)]),
            scene("room", [me(100, { pose: "up", face: "happy" }), who("mama", 176, { flip: true, face: "happy" })]),
        ],
    },
    // 13 — Crtanje
    13: {
        cover: scene("classroom", [thing("table", 120, 150, { s: 1.4 }), thing("paints", 96, 102), thing("crayons", 128, 102), thing("scissors", 152, 102), me(50, { face: "happy" })]),
        steps: [
            scene("classroom", [me(60, { face: "neutral" }), thing("table", 128, 150, { s: 1.2 }), thing("paper", 116, 110), thing("crayons", 146, 110), who("girl", 196, { flip: true, pose: "give", hold: { prop: "pencil", tone: "#e8463f", s: 1 } })]),
            scene("classroom", [me(110, { pose: "sitHold", y: 134, hold: { prop: "scissors", s: 0.8 } }), thing("table", 116, 150, { s: 1.2 }), thing("paperCircle", 150, 110)]),
            scene("classroom", [me(100, { pose: "sit", y: 134, face: "angry" }), thing("table", 116, 150, { s: 1.2 }), thing("paperCircle", 140, 112, { rot: 12 }), thing("scissors", 100, 110)]),
            scene("classroom", [me(64, { face: "sad" }), thing("table", 128, 150, { s: 1.2 }), thing("drawing", 126, 110, { s: 1.2 }), thing("puddle", 140, 109, { s: 0.5 }), who("haris", 196, { flip: true, face: "talk" }), say(174, 38, true)]),
            scene("classroom", [me(54, { face: "sad" }), who("teacher", 150, { flip: true, pose: "reach", hold: { prop: "drawing", s: 1.1 } }), who("amina", 204, { flip: true, face: "happy" })]),
            scene("classroom", [thing("table", 104, 150, { s: 1.3 }), thing("crayons", 84, 106), thing("glue", 108, 106), thing("confetti", 120, 108, { s: 0.45 }), me(186, { flip: true })]),
        ],
    },
    // 14 — Bazen
    14: {
        cover: scene("pool", [thing("lifebuoy", 34, 66), thing("laneRope", 120, 98), me(150, { pose: "swim", y: 118, face: "happy" })]),
        steps: [
            scene("bathroom", [thing("towel", 50, 140), thing("shower", 168, 148, { s: 1.2 }), me(120, { wear: swim, face: "neutral" }), who("tata", 212, { flip: true })]),
            scene("pool", [thing("puddle", 110, 150, { s: 1.3 }), me(60, { wear: swim, face: "neutral" }), who("boy", 164, { pose: "swim", y: 110, face: "talk" }), say(184, 60), who("lifeguard", 214, { flip: true, hold: { prop: "whistle", s: 1 }, pose: "mouth" })]),
            scene("pool", [thing("poolSlide", 190, 128, { s: 1.1 }), me(56, { wear: swim, face: "neutral" }), who("boy2", 108, { wear: swim, flip: true, face: "neutral" }), thing("motionLeft", 124, 92), who("girl", 146, { wear: swim, back: true }), who("boy", 176, { wear: swim, back: true, s: 0.9 })]),
            scene("pool", [thing("laneRope", 120, 98), me(80, { pose: "swim", y: 120, face: "sad" }), who("boy", 186, { pose: "swim", y: 120, face: "happy" })]),
            scene("pool", [me(96, { pose: "swim", y: 120, face: "sad" }), thing("rainDrops", 100, 70, { s: 0.6 }), who("tata", 200, { flip: true })]),
            scene("pool", [thing("clock", 40, 50), me(90, { pose: "swim", y: 120, face: "worried" }), who("tata", 190, { flip: true, face: "talk" }), say(168, 22, true)]),
        ],
    },
    // 15 — Zima
    15: {
        cover: scene("snow", [thing("snowman", 80, 148, { s: 1.6 }), me(140, { wear: winter, face: "happy" }), thing("sled", 200, 150)]),
        steps: [
            scene("room", [thing("coatHook", 204, 148), me(110, { wear: winter, face: "happy" })], "snow"),
            scene("snow", [me(60, { wear: winter, face: "neutral", pose: "give", hold: { prop: "carrot", s: 1.2 } }), thing("snowman", 124, 148, { s: 1.5 }), who("selma", 190, { flip: true, wear: ["beanie"], pose: "give", hold: { prop: "stone", s: 0.4 } })]),
            scene("snow", [me(70, { wear: winter, back: true }), thing("snowball", 102, 92), thing("motion", 118, 94), who("boy", 180, { flip: true, wear: ["beanie"], face: "neutral", pose: "reach", hold: { prop: "snowball", s: 1 } })]),
            scene("snow", [me(56, { wear: winter, face: "neutral" }), thing("hourglass", 96, 70), thing("sled", 164, 150, { s: 1.2 }), who("selma", 164, { pose: "sit", y: 138, wear: ["beanie"], face: "happy" }), thing("motion", 136, 140)]),
            scene("snow", [me(110, { wear: winter, face: "sad", pose: "hold", hold: { prop: "glove", s: 0.9 } }), thing("rainDrops", 110, 120, { s: 0.3 })]),
            scene("living", [thing("sofa", 100, 152), me(100, { pose: "sit", y: 136, wear: ["scarf"] }), who("mama", 186, { flip: true, face: "talk" }), say(164, 36, true)]),
        ],
    },
};

export function storyScene(level: number, step: number | "cover"): SceneSpec | undefined {
    const pictures = STORY_SCENES[level];
    if (!pictures) return undefined;
    return step === "cover" ? pictures.cover : pictures.steps[step];
}
