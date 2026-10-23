// Slike za igru „Šta reći?”, po ID-ju situacije (data/socialSituations.ts).
//
// Slika prikazuje PRIMER: dete iz primera (glavni lik, sa svojim imenom i izgledom) u toj
// situaciji, sa oblačićem kad nešto kaže. Ne crta se nijedan izbor koji „manje pomaže”.
// Lica odgovaraju situaciji: u prijatnim situacijama dete se smeši; kad nešto smeta, boli ili
// je previše, lice je zabrinuto, umorno ili ozbiljno; dete koje radi nešto neprijatno nije
// nasmejano.
// Situacije 1–15 se ponavljaju na tri težine (ID-jevi 16–45), sa istom slikom.

import { hero, scene, say, shout, thing, who, type FigureItem, type LookId, type SceneSpec } from "@/app/components/games/scene/types";

export interface SocialPicture {
    /** Dete iz primera */
    hero: LookId;
    scene: SceneSpec;
}

const me = (x: number, options: Omit<FigureItem, "fig" | "x"> = {}): FigureItem => hero(x, { s: 1.1, face: "talk", ...options });

const pictures = (rows: Record<number, [LookId, SceneSpec]>): Record<number, SocialPicture> =>
    Object.fromEntries(Object.entries(rows).map(([id, [look, spec]]) => [Number(id), { hero: look, scene: spec }]));

export const SOCIAL_SCENES: Readonly<Record<number, SocialPicture>> = pictures({
    // Grupa 1 — hvala, pozdrav, izvini
    1: ["lejla", scene("room", [me(90, { pose: "hold", hold: { prop: "gift", s: 0.9 } }), say(114, 40), who("girl", 166, { flip: true, pose: "give", face: "happy" })])],
    2: ["amar", scene("classroom", [me(84, { pose: "wave" }), say(106, 40), who("teacher", 172, { flip: true, pose: "wave", face: "happy" })])],
    3: ["amina", scene("park", [me(92, { pose: "give", face: "worried" }), say(70, 40, true), who("boy", 160, { pose: "sit", flip: true, face: "sad" })])],
    // Grupa 2 — molim, hvala, doviđenja
    4: ["emir", scene("kitchen", [me(84, { face: "neutral" }), say(106, 40), who("mama", 172, { flip: true, pose: "give", hold: { prop: "glass", s: 1 } })])],
    5: ["selma", scene("room", [me(88, { pose: "give" }), say(110, 40), who("boy", 164, { flip: true, pose: "give", hold: { prop: "teddy", s: 0.9 } })])],
    6: ["merjem", scene("classroom", [who("teacher", 52, { pose: "wave", face: "happy" }), me(132, { pose: "wave", flip: true }), say(110, 40, true), thing("doorOpen", 206, 148), who("mama", 206, { flip: true })])],
    // Grupa 3 — pomoć, hvala za ručak, pozdrav
    7: ["haris", scene("room", [me(92, { pose: "give", face: "worried" }), say(70, 40, true), who("boy2", 158, { s: 0.85, flip: true, face: "sad" })])],
    8: ["ajla", scene("kitchen", [me(56), say(78, 40), thing("table", 128, 150, { s: 1.1 }), thing("plate", 128, 112, { s: 1.1 }), who("mama", 200, { flip: true, face: "happy" })])],
    9: ["tarik", scene("park", [me(84, { pose: "wave" }), say(106, 40), who("boy", 168, { flip: true, pose: "wave", face: "happy" })])],
    // Grupa 4 — igra, moja stvar, prijatelj je pao
    10: ["nejla", scene("park", [me(56, { face: "neutral" }), say(78, 40), who("boy", 140, { pose: "give", face: "happy" }), thing("ball", 172, 148), who("girl", 204, { flip: true, pose: "give", face: "happy" })])],
    11: ["adnan", scene("classroom", [me(88, { pose: "give", face: "firm" }), say(110, 40), who("boy", 168, { flip: true, pose: "give", face: "neutral", hold: { prop: "pencil", s: 1 } })])],
    12: ["ilma", scene("park", [me(92, { pose: "give", face: "worried" }), say(70, 40, true), who("boy", 160, { pose: "sit", flip: true, face: "sad" }), thing("plaster", 154, 149, { s: 0.8 })])],
    // Grupa 5 — kupovina, čestitanje, prolazak
    13: ["kenan", scene("street", [me(70), say(92, 40), who("seller", 176, { y: 178, flip: true, face: "happy" }), thing("iceCreamStand", 176, 152, { s: 1.6 })])],
    14: ["lamija", scene("room", [me(88, { pose: "hold", hold: { prop: "gift", s: 0.9 } }), say(110, 40), who("boy", 164, { flip: true, wear: ["partyHat"], face: "happy" }), thing("balloons", 214, 122)])],
    15: ["faris", scene("shop", [me(64), say(86, 40), thing("doorOpen", 168, 148, { s: 1.2 }), who("man", 156, { flip: true }), who("woman", 184, { flip: true })])],

    // Zastupanje sebe
    46: ["merjem", scene("classroom", [me(58, { face: "worried" }), say(80, 40), thing("table", 128, 150, { s: 1.1 }), thing("puzzlePieces", 128, 114, { s: 1.1 }), who("teacher", 202, { flip: true })])],
    47: ["amar", scene("classroom", [me(96, { pose: "ears", face: "worried" }), say(120, 40), thing("speaker", 196, 148, { s: 1.3 }), thing("loudNotes", 192, 80)])],
    48: ["amina", scene("park", [me(96, { pose: "stop", face: "firm" }), say(72, 40, true), who("boy", 150, { flip: true, pose: "push", face: "neutral" })])],
    49: ["emir", scene("kitchen", [me(56, { face: "neutral" }), say(78, 40), thing("table", 128, 150, { s: 1.1 }), thing("bowlEmpty", 128, 114, { s: 1.1 }), who("mama", 200, { flip: true, pose: "give", hold: { prop: "pot", s: 0.8 } })])],
    50: ["selma", scene("room", [me(84, { pose: "wave", face: "neutral" }), say(106, 40), who("aunt", 170, { flip: true, pose: "hug", face: "calm" })])],
    51: ["haris", scene("room", [me(56, { face: "worried" }), say(78, 40), thing("table", 128, 150, { s: 1.1 }), thing("cards", 128, 114, { s: 1.1 }), who("boy", 198, { flip: true, face: "talk" }), thing("motionLeft", 176, 80)])],
    52: ["ajla", scene("classroom", [thing("chair", 92, 150), me(84, { pose: "sitHold", y: 134, face: "tired", hold: { prop: "pencil", s: 0.9 } }), thing("desk", 100, 150, { s: 1.1 }), thing("paper", 100, 117), say(108, 40), who("teacher", 198, { flip: true })])],
    53: ["tarik", scene("clinic", [me(90, { pose: "belly", face: "worried" }), say(112, 40), who("doctor", 172, { flip: true, pose: "give", hold: { prop: "stethoscope", s: 1 } })])],
    54: ["nejla", scene("playground", [me(66, { face: "firm" }), say(88, 40), who("boy", 136, { flip: true, face: "neutral" }), thing("motionLeft", 154, 104), thing("slide", 196, 148)])],
    55: ["adnan", scene("park", [me(88, { pose: "stop", face: "firm" }), say(64, 40, true), who("boy", 160, { flip: true, pose: "hug", face: "neutral" })])],
    56: ["ilma", scene("hall", [thing("speaker", 30, 148, { s: 1.3 }), thing("loudNotes", 42, 76), me(120, { pose: "ears", face: "worried" }), say(144, 40), who("teacher", 200, { flip: true })])],
    57: ["kenan", scene("playground", [me(56, { face: "tired" }), say(78, 40), who("boy", 146, { flip: true, pose: "wave", face: "happy" }), who("girl", 184, { flip: true, face: "happy" }), who("boy2", 220, { flip: true, face: "happy" })])],
    58: ["lamija", scene("classroom", [me(84, { pose: "stop", face: "firm" }), say(60, 40, true), who("boy", 168, { flip: true, face: "neutral" }), shout(150, 42, true)])],
    59: ["faris", scene("playground", [thing("carousel", 112, 150, { s: 1.4 }), me(108, { pose: "stop", y: 138, s: 1, face: "worried" }), thing("spin", 112, 156), say(84, 44, true), who("boy", 196, { flip: true, pose: "push", face: "neutral" })])],
    60: ["emir", scene("clinic", [thing("dentistChair", 104, 150, { s: 1.4 }), me(92, { pose: "sitReach", y: 124, s: 1, face: "worried" }), thing("lampBright", 140, 24, { rot: 180, s: 1.3 }), who("dentist", 190, { flip: true })])],
});

/** Situacije 16–45 su situacije 1–15 na težoj težini: ista slika */
const REPEATED = 15;

export function socialScene(id: number): SocialPicture | undefined {
    const base = id > 0 && id <= REPEATED * 3 ? ((id - 1) % REPEATED) + 1 : id;
    return SOCIAL_SCENES[base];
}
