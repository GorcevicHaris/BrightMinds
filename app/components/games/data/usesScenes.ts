// Slike za igru „Čemu služi?”, po ID-ju predmeta (data/usesItems.ts).
//
// Slika pokazuje SITUACIJU iz pitanja, a ne odgovor: za „Čime sečemo papir?” papir sa
// isprekidanom linijom, ne makaze. Na slici nema ni drugih predmeta iz iste grupe (oni se
// nude kao ostale slike), da slika ne bi pokazivala na pogrešan izbor. Za „Ko ima …?” slika
// pokazuje sam taj deo (surlu, bodlje, perje), jer je to reč koju dete treba da razume.

import { hero, scene, say, thing, think, who, type SceneSpec } from "@/app/components/games/scene/types";

// Predmeti su već nacrtani krupno, preko cele slike: kamera se ne približava
const fixed = (scenes: Record<string, SceneSpec>): Record<string, SceneSpec> =>
    Object.fromEntries(Object.entries(scenes).map(([id, spec]) => [id, { ...spec, camera: "fixed" as const }]));

export const USES_SCENES: Readonly<Record<string, SceneSpec>> = fixed({
    // Kuća
    spoon: scene("kitchen", [thing("table", 120, 150, { s: 1.4 }), thing("soup", 120, 102, { s: 1.8 })]),
    pencil: scene("plain", [thing("paper", 120, 140, { s: 4 })]),
    scissors: scene("plain", [thing("paperCut", 120, 140, { s: 3.4 })]),
    soap: scene("bathroom", [thing("sink", 150, 150, { s: 1.9 }), thing("stream", 165, 70, { s: 1.2 }), hero(132, { pose: "wash", s: 1.3 })]),
    key: scene("room", [thing("lock", 120, 150, { s: 1.4 })]),
    umbrella: scene("street", [hero(120, { s: 1.3, pose: "shrug" }), thing("rainDrops", 120, 50, { s: 1.4 })], "rain"),
    bed: scene("room", [hero(110, { s: 1.3, pose: "mouth", face: "yawn" }), thing("zzz", 146, 50, { s: 1.4 })], "stars"),
    glass: scene("kitchen", [hero(70, { s: 1.2 }), thing("table", 150, 150, { s: 1.1 }), thing("bottle", 150, 112, { s: 1.6 })]),
    broom: scene("room", [thing("confetti", 120, 152, { s: 0.9 }), thing("leaves", 70, 150, { s: 1.2 }), thing("leaves", 170, 148, { s: 1.2 })]),
    phone: scene("room", [hero(70, { s: 1.2 }), think(scene("room", [who("baka", 120, { s: 1.2, pose: "wave", face: "happy" })]), 172, 64, 44, [100, 70])]),
    ball: scene("park", [thing("goal", 120, 132, { s: 1.8 })], "clear"),
    fork: scene("kitchen", [thing("table", 120, 150, { s: 1.4 }), thing("plate", 120, 100, { s: 2.2 })]),
    lamp: scene("room", [hero(110, { s: 1.3, face: "worried" })], "dark"),

    // Delovi tela
    eyes: scene("garden", [thing("butterfly", 120, 96, { s: 3 })], "clear"),
    ear: scene("plain", [thing("radio", 110, 140, { s: 2.4 }), thing("notes", 160, 70, { s: 1.6 })]),
    nose: scene("garden", [thing("flowers", 120, 150, { s: 3 })], "clear"),
    mouth: scene("plain", [say(80, 70), say(170, 100, true)]),
    hand: scene("room", [thing("doorOpen", 150, 148, { s: 1.2 }), who("boy", 150, { back: true, pose: "walk" })]),
    leg: scene("park", [thing("goal", 150, 132, { s: 1.4 }), thing("ball", 70, 150, { s: 1.8 })], "clear"),
    teeth: scene("plain", [thing("apple", 120, 140, { s: 3.6 })]),
    tongue: scene("plain", [thing("iceCream", 120, 146, { s: 4.2 })]),

    // Stvari
    backpack: scene("street", [thing("school", 120, 120, { s: 1.4 })], "clear"),
    alarm: scene("bedroom", [thing("bed", 110, 148, { s: 1.4 }), { fig: "hero", x: 69, y: 123, s: 1.4, pose: "lie", face: "sleep" }], "dusk"),
    bathtub: scene("bathroom", [thing("soapBubbles", 90, 120, { s: 2 }), thing("duck", 150, 140, { s: 2.6 })]),
    glasses: scene("clinic", [thing("eyeChart", 120, 140, { s: 2.2 })]),
    sneakers: scene("plain", [thing("socks", 120, 140, { s: 3 })]),
    gloves: scene("snow", [thing("snowflakes", 120, 60, { s: 1.4 }), hero(120, { s: 1.3, wear: ["jacket"] })]),
    cap: scene("park", [hero(110, { s: 1.4, face: "happy" })]),
    bin: scene("room", [thing("wrapper", 90, 150, { s: 1.8 }), thing("paperCircle", 150, 152, { s: 1.4, rot: 30 })]),
    thermometer: scene("bedroom", [thing("bed", 116, 148, { s: 1.6 }), { fig: "hero", x: 70, y: 119, s: 1.6, pose: "lie", face: "sad" }]),
    brush: scene("plain", [thing("paper", 90, 140, { s: 2.6 }), thing("paints", 176, 140, { s: 2 })]),
    book: scene("living", [thing("sofa", 120, 152, { s: 1.4 }), hero(110, { pose: "sit", y: 132 }), thing("lamp", 200, 150, { s: 1.2 })]),
    hammer: scene("plain", [thing("nail", 120, 140, { s: 2.6 })]),
    crayons: scene("plain", [thing("drawing", 120, 144, { s: 3.6 })]),
    scarf: scene("snow", [thing("snowflakes", 120, 60, { s: 1.4 }), hero(120, { s: 1.3, wear: ["jacket"], face: "tired" })]),

    // Životinje
    elephant: scene("plain", [thing("trunk", 120, 142, { s: 1.8 })]),
    giraffe: scene("park", [thing("tree", 120, 150, { s: 2 }), thing("arrow", 190, 80, { s: 1.6, rot: -90 })], "clear"),
    hedgehog: scene("plain", [thing("spikes", 120, 140, { s: 3 })]),
    rabbit: scene("plain", [thing("longEars", 120, 142, { s: 2.4 })]),
    bird: scene("plain", [thing("feather", 120, 144, { s: 2.6 })]),
    fish: scene("beach", [thing("bubbles", 100, 100, { s: 1.4 }), thing("bubbles", 160, 96, { s: 1.1 })], "clear"),
    turtle: scene("plain", [thing("shell", 120, 140, { s: 2.6 })]),
    cow: scene("plain", [thing("milk", 96, 140, { s: 3 }), thing("glass", 160, 140, { s: 2.6 })]),
    bee: scene("plain", [thing("honey", 120, 140, { s: 3.2 })]),
    frog: scene("garden", [thing("puddle", 120, 150, { s: 3.4 }), thing("leaves", 90, 146, { s: 1.2 })], "clear"),
    spider: scene("plain", [thing("web", 120, 150, { s: 3.4 })]),

    // Priroda i prevoz
    bicycle: scene("plain", [thing("pedal", 110, 140, { s: 3 })]),
    boat: scene("beach", [], "clear"),
    plane: scene("sky", [], "clear"),
    guitar: scene("plain", [thing("strings", 110, 140, { s: 2.6 })]),
    magnifier: scene("plain", [thing("ladybug", 120, 140, { s: 2.6 })]),
    sun: scene("park", [thing("flowers", 70, 150, { s: 1.4 }), hero(140, { s: 1.3, face: "happy" })], "clear"),
    moon: scene("street", [], "stars"),
    rainbow: scene("street", [thing("puddle", 70, 150, { s: 1.4 }), thing("puddle", 170, 152, { s: 1.1 })], "rain"),
    snowman: scene("snow", [thing("carrot", 110, 146, { s: 2 }), thing("stone", 150, 150, { s: 0.6 }), thing("stone", 166, 150, { s: 0.6 })]),
    train: scene("station", [], "clear"),
    rocket: scene("sky", [thing("star", 60, 60), thing("star", 180, 40), thing("star", 140, 110, { s: 0.7 })], "stars"),
});

export function usesScene(itemId: string): SceneSpec | undefined {
    return Object.hasOwn(USES_SCENES, itemId) ? USES_SCENES[itemId] : undefined;
}
