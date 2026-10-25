// Sadržaj igre „Šta je prvo?”: nizovi koraka iz svakodnevnog života i raspored po nivoima.
//
// Pravila pisanja (važna za decu iz spektra autizma):
//  • Svaki niz ima JEDAN logičan redosled: korak zavisi od prethodnog (čarape pa patike,
//    seme pa voda pa cvet). Nema rutina koje se razlikuju od kuće do kuće (doručak i zubi) —
//    dete ne sme da dobije „netačno” za ono što kod kuće radi drugačije.
//  • Koraci su u prvom licu sadašnjeg vremena („Obučem čarape.”) — bez roda, isto za dečake
//    i devojčice.
//  • Svaki korak ima svoju sliku koja doslovno pokazuje rečenicu: „Obučem čarape.” — dete
//    sedi i drži čarape; „Zalijem ga.” — kantica iznad saksije i voda koja curi. Dete na slici
//    je dečak ili devojčica, prema profilu deteta koje igra (koraci su u prvom licu).
//  • Kad glas prepričava niz („Prvo …, zatim …”), kratke reči se, ga, mu, me, je moraju
//    na drugo mesto u rečenici: „Probudim se.” → „Prvo se probudim”. Takvi koraci imaju
//    i oblik za prepričavanje (`retell`).

import { art, draw, holdD, holdP, me, prop, who, type ArtItem, type DrawId, type StepArtSpec } from "@/app/components/games/sequence/art";
import type { PropId } from "@/app/components/games/scene/types";

export interface SequenceStep {
    text: string;
    /** Slika koraka (sequence/art.ts) */
    art: StepArtSpec;
    /** Oblik posle „prvo / zatim / na kraju”, kad se reči moraju premestiti (malim slovom, bez tačke) */
    retell?: string;
    /**
     * Korak u kome dete nešto kaže (komunikacija ugrađena u rutinu): kratka rečenica koju dete
     * uči da kaže baš u tom trenutku — „Dobro jutro!”, „Molim vas, jedan hleb.”, „Boli me ovde.”
     * Na slici dete govori (oblačić), a glas rečenicu i pročita.
     */
    say?: string;
}

export interface Sequence {
    id: string;
    title: string;
    steps: SequenceStep[];
}

const s = (text: string, picture: StepArtSpec, retell?: string): SequenceStep => (retell ? { text, art: picture, retell } : { text, art: picture });

/** Korak u kome dete govori: „Kažem mami: „Dobro jutro!””; `who` je kome (ili prazno) */
const talk = (lead: string, script: string, picture: StepArtSpec): SequenceStep => ({ text: `${lead}: „${script}”`, art: picture, say: script });

// ── Slike ─────────────────────────────────────────────────────────────────────
// Krupan kadar: dete od glave do pojasa (stopala su ispod slike), predmet u rukama.
const Y = 182;
/** Visina stola u kuhinji kad je sto u prvom planu (gornja ploča) */
const TABLE = { x: 120, y: 214, s: 2.4 } as const;
const table = (x: number = TABLE.x) => prop("table", x, TABLE.y, { s: TABLE.s });
/** Gornja ploča stola iz `table()` */
const TOP = TABLE.y - 34 * TABLE.s + 4;
/** Kašika kod usta (ne preko očiju) */
const SPOON = holdP("spoon", { s: 1.1, dy: 13 });

// Pranje ruku (dva niza ga koriste): krupan kadar lavaboa — česma, mlaz, šake, sapun
const BASIN = draw("basin", 120, 172);
const TAP = draw("tap", 150, 60, { s: 1.2 });
/** Mlaz iz česme, do šaka */
const STREAM = draw("bigStream", 102, 112, { s: 0.9 });
const washTap = art("bathroom", [BASIN, TAP, draw("bigStream", 102, 92, { s: 0.45 }), draw("hand", 170, 40, { s: 1.6, rot: -30 })]);
const washWet = art("bathroom", [BASIN, TAP, STREAM, draw("hands", 104, 134, { s: 1.7 }), draw("splash", 104, 112, { s: 0.9 })]);
const washSoap = art("bathroom", [
    BASIN,
    TAP,
    draw("hands", 110, 140, { s: 1.8 }),
    prop("soapBubbles", 100, 112, { s: 1.6 }),
    prop("soapBubbles", 130, 108, { s: 1.3 }),
    draw("soap", 190, 130, { s: 1.8 }),
]);
const washRinse = art("bathroom", [BASIN, TAP, STREAM, draw("hands", 104, 134, { s: 1.7 }), prop("soapBubbles", 128, 150, { s: 1 }), prop("soapBubbles", 80, 150, { s: 0.8 })]);
const washDry = art("bathroom", [me(120, Y, { pose: "hold", hold: holdP("towel", { s: 1.3, dy: 30 }), at: [120, 150], face: "happy" })]);

// Razbijanje jaja nad činijom (kolač i palačinke)
const crackEggs = art("kitchen", [me(78, Y, { pose: "give", hold: holdD("eggCrack", { s: 1.2 }), at: [118, 130] }), table(150), draw("bowl", 122, TOP, { s: 2.2 })]);
const mixBatter = art("kitchen", [me(78, Y, { pose: "give", at: [128, 120] }), table(150), draw("batter", 125, TOP, { s: 2.2 })]);
const eatAtTable = (food: ArtItem) => art("kitchen", [me(120, Y - 6, { pose: "mouth", hold: SPOON, face: "happy" }), table(), food]);

// Igranje u sobi
const SHELF_X = 196;

/**
 * Oblačić govora: vrh repića je kod usta (x, y), a u oblačiću je sličica onoga što dete kaže
 * (srce = hvala, sunce = dobro jutro / dobar dan, hleb, upitnik…).
 */
function bubble(x: number, y: number, icon: { p?: PropId; d?: DrawId; rot?: number }, iconScale = 1.2): ArtItem[] {
    const cx = x + 28.6;
    const options = { s: iconScale, ...(icon.rot ? { rot: icon.rot } : {}) };
    return [draw("talk", x, y, { s: 1.3 }), icon.p ? prop(icon.p, cx, y - 25, options) : draw(icon.d ?? "coin", cx, y - 25, options)];
}
/** Dete govori (krupno, usta otvorena), oblačić desno od glave */
const speaking = (x: number, options: Parameters<typeof me>[2] = {}) => me(x, Y, { face: "talk", ...options });
const MOUTH = (x: number) => [x + 14, 86] as const;

export const SEQUENCES: readonly Sequence[] = [
    // ── Dva koraka ────────────────────────────────────────────────────────────
    {
        id: "socks",
        title: "Patike",
        steps: [
            s("Obučem čarape.", art("bedroom", [me(110, 168, { pose: "sitHold", hold: holdP("socks", { s: 1.4 }), at: [110, 130] })])),
            s("Obujem patike.", art("bedroom", [me(100, 168, { pose: "sitHold", hold: holdP("shoe", { s: 1.3 }), at: [100, 130] }), prop("shoe", 186, 156, { s: 1.8 })])),
        ],
    },
    {
        id: "rain",
        title: "Kiša",
        steps: [
            s("Pada kiša.", art("park", [prop("rainCloud", 70, 48, { s: 1.8 }), prop("rainDrops", 70, 96, { s: 1.6 }), me(160, Y, { at: [70, 40], face: "neutral" })], "rain")),
            s("Otvorim kišobran.", art("park", [me(120, Y, { pose: "wave", hold: holdD("umbrella", { s: 1.15, dx: -8, dy: 20 }), face: "happy" }), prop("rainDrops", 40, 80, { s: 1.4 }), prop("rainDrops", 200, 90, { s: 1.4 })], "rain")),
        ],
    },
    {
        id: "hands-eat",
        title: "Ručak",
        steps: [
            s("Operem ruke.", washSoap),
            s("Ručam.", eatAtTable(prop("soup", 120, TOP, { s: 2 }))),
        ],
    },
    {
        id: "night",
        title: "Veče",
        steps: [
            s("Padne mrak.", art("bedroom", [me(80, Y, { at: [190, 30], face: "neutral" })], "night")),
            s("Idem na spavanje.", art("bedroom", [prop("bed", 132, 156, { s: 2.2 }), { f: "me", x: 68, y: 116, s: 2.2, pose: "lie", face: "sleep" }, prop("zzz", 70, 70, { s: 1.8 })], "night")),
        ],
    },
    {
        id: "balloon",
        title: "Balon",
        steps: [
            s("Naduvam balon.", art("room", [me(100, Y, { pose: "mouth", hold: holdD("balloonSmall", { s: 1.3, dx: 2, dy: -8 }) })])),
            s("Igram se balonom.", art("park", [me(120, Y + 8, { pose: "up", face: "happy", at: [120, 30] }), prop("balloon", 120, 52, { s: 1.6 })]), "se igram balonom"),
        ],
    },
    {
        id: "ice-cream",
        title: "Sladoled",
        steps: [
            s("Kupim sladoled.", art("park", [who("seller", 172, 168, { s: 1.15 }), prop("iceCreamStand", 172, 168, { s: 1.5 }), me(70, Y, { pose: "give", hold: holdD("coin", { s: 1.4 }), at: [150, 110] })])),
            s("Jedem sladoled.", art("park", [me(120, Y, { pose: "mouth", hold: holdP("iceCream", { s: 1.2, dx: 6, dy: 12 }), face: "happy" })])),
        ],
    },
    {
        id: "egg",
        title: "Jaje",
        steps: [
            s("Razbijem jaje.", crackEggs),
            s("Ispržim jaje.", art("kitchen", [prop("stove", 150, 186, { s: 2.2 }), draw("panEgg", 146, 186 - 40 * 2.2 + 2, { s: 2.2 }), me(64, Y, { pose: "give", at: [146, 92] })])),
        ],
    },
    {
        id: "juice",
        title: "Sok",
        steps: [
            s("Otvorim sok.", art("kitchen", [me(120, Y, { pose: "give", hold: holdD("juiceOpen", { s: 1.3, hand: "l" }) }), draw("bottleCap", 120 + 23 * 1.7, Y - 33 * 1.7 + 4, { s: 2 })])),
            s("Popijem sok.", art("kitchen", [me(120, Y, { pose: "mouth", hold: holdD("juiceGlass", { s: 1.1, dx: 2, dy: 13 }) })])),
        ],
    },
    {
        id: "light",
        title: "Lampa",
        steps: [
            s("U sobi je mrak.", art("bedroom", [prop("table", 180, 160, { s: 1.4 }), draw("tableLamp", 180, 113, { s: 1.6 }), me(80, Y, { at: [180, 80], face: "neutral" })], "dark"), "je u sobi mrak"),
            s("Upalim lampu.", art("bedroom", [prop("table", 180, 160, { s: 1.4 }), draw("tableLampOn", 180, 113, { s: 1.6 }), me(110, Y, { pose: "give", at: [180, 80], face: "happy" })], "night")),
        ],
    },
    {
        id: "apple",
        title: "Jabuka",
        steps: [
            s("Operem jabuku.", art("kitchen", [BASIN, TAP, STREAM, draw("hands", 104, 140, { s: 1.7 }), prop("apple", 104, 124, { s: 1.6 })])),
            s("Pojedem jabuku.", art("kitchen", [me(120, Y, { pose: "mouth", hold: holdP("apple", { s: 1, dx: 4, dy: 11 }), face: "happy" })])),
        ],
    },

    // Komunikacija u rutini (dva koraka)
    {
        id: "gift-thanks",
        title: "Poklon",
        steps: [
            s("Baka mi da poklon.", art("living", [who("baka", 172, 214, { s: 1.6, pose: "give", flip: true, hold: holdP("gift", { s: 1.2 }), face: "happy" }), me(70, Y, { at: [130, 120], face: "happy" })]), "mi baka da poklon"),
            talk("Kažem baki", "Hvala!", art("living", [who("baka", 196, 214, { s: 1.6, face: "happy" }), speaking(70, { pose: "hold", hold: holdP("gift", { s: 1.1 }) }), ...bubble(...MOUTH(70), { p: "heart" }, 1.3)])),
        ],
    },
    {
        id: "kindergarten-hello",
        title: "Dobar dan",
        steps: [
            s("Uđem u vrtić.", art("street", [prop("school", 166, 132, { s: 1.4 }), me(66, Y, { pose: "walk", wear: ["backpack"], at: [166, 90] })])),
            talk("Kažem vaspitačici", "Dobar dan!", art("classroom", [who("teacher", 196, 214, { s: 1.6, pose: "wave", face: "happy", at: [80, 90] }), speaking(64, { pose: "wave" }), ...bubble(...MOUTH(64), { p: "sun" }, 0.8)])),
        ],
    },

    // ── Tri koraka ────────────────────────────────────────────────────────────
    {
        id: "teeth",
        title: "Pranje zuba",
        steps: [
            s("Stavim pastu na četkicu.", art("bathroom", [me(120, Y, { pose: "hold", at: [118, 128] }), draw("brushPaste", 112, 140, { s: 2.2 }), draw("toothpaste", 150, 122, { s: 2, rot: 24 })])),
            s("Operem zube.", art("bathroom", [me(120, Y, { pose: "mouth", hold: holdP("toothbrush", { s: 1.2, rot: -30 }), face: "happy" })])),
            s("Isperem usta.", art("bathroom", [me(120, Y, { pose: "mouth", hold: holdP("glass", { s: 1, dx: 2, dy: 13 }) }), prop("sink", 196, 172, { s: 1.4 })])),
        ],
    },
    {
        id: "sandwich",
        title: "Sendvič",
        steps: [
            s("Uzmem hleb.", art("kitchen", [me(100, Y - 4, { pose: "give", hold: holdD("breadSlice", { s: 1.2 }), at: [140, 110] }), table(), prop("plate", 70, TOP, { s: 1.6 })])),
            s("Namažem hleb.", art("kitchen", [me(84, Y - 4, { pose: "give", hold: holdD("knife", { s: 1.3, dy: 6 }), at: [130, 132] }), table(), prop("plate", 136, TOP, { s: 2 }), draw("breadButter", 136, TOP - 6, { s: 1.4 })])),
            s("Pojedem sendvič.", art("kitchen", [me(120, Y, { pose: "mouth", hold: holdD("sandwich", { s: 1, dx: 2, dy: 11 }), face: "happy" })])),
        ],
    },
    {
        id: "plant",
        title: "Cvet",
        steps: [
            s("Posadim seme.", art("garden", [draw("pot", 150, 158, { s: 2.6 }), me(84, Y, { pose: "give", at: [150, 100] }), draw("seeds", 152, 120, { s: 1.8 })])),
            s("Zalijem ga.", art("garden", [draw("pot", 162, 158, { s: 2.6 }), draw("pour", 160, 92, { s: 1.6 }), me(76, Y, { pose: "give", hold: holdD("wateringCan", { s: 1.2, rot: 20 }), at: [160, 110] })]), "ga zalijem"),
            s("Izraste cvet.", art("garden", [draw("potFlower", 160, 158, { s: 2.4 }), me(74, Y, { at: [160, 50], face: "happy" })])),
        ],
    },
    {
        id: "drawing",
        title: "Crtež",
        steps: [
            s("Nacrtam kuću.", art("room", [me(84, Y - 6, { pose: "give", hold: holdP("pencil", { s: 1.3, rot: 30 }), at: [132, 120] }), table(), draw("paperHouse", 140, TOP, { s: 2 })])),
            s("Obojim crtež.", art("room", [me(84, Y - 6, { pose: "give", hold: holdP("pencil", { s: 1.3, rot: 30, tone: "#e8605a" }), at: [132, 120] }), table(), draw("paperHouseColor", 140, TOP, { s: 2 }), prop("crayons", 196, TOP, { s: 1.3 })])),
            s("Pokažem crtež mami.", art("room", [who("mama", 186, 196, { s: 1.4, face: "happy", at: [100, 100] }), me(84, Y, { pose: "give", hold: holdD("paperHouseColor", { s: 1.2 }), face: "happy", at: [180, 50] })])),
        ],
    },
    {
        id: "morning",
        title: "Jutro",
        steps: [
            s("Probudim se.", art("bedroom", [me(84, 172, { pose: "up", s: 1.6, face: "happy" }), prop("bed", 112, 166, { s: 2 })]), "se probudim"),
            s("Obučem se.", art("bedroom", [me(120, Y, { pose: "hold", hold: holdD("tshirt", { s: 1.3, dy: 34 }), at: [120, 140] })]), "se obučem"),
            s("Idem u vrtić.", art("street", [prop("school", 176, 128, { s: 1.3 }), me(70, Y, { pose: "walk", wear: ["backpack"], at: [176, 80], face: "happy" })])),
        ],
    },
    {
        id: "birthday",
        title: "Rođendan",
        steps: [
            s("Mama donese tortu.", art("living", [who("mama", 150, 200, { s: 1.4, pose: "hold", hold: holdD("cakeCandles", { s: 0.8 }), face: "happy" }), me(56, Y, { at: [150, 100], face: "happy" })])),
            s("Dunem svećice.", art("living", [me(80, Y, { face: "surprised", at: [150, 110] }), draw("blow", 106, 104, { s: 1.6 }), table(156), draw("cakeSmoke", 156, TOP, { s: 1.6 })])),
            s("Jedemo tortu.", art("living", [me(120, Y - 6, { pose: "mouth", hold: SPOON, face: "happy" }), table(), draw("cakeSlice", 120, TOP, { s: 1.8 })])),
        ],
    },
    {
        id: "sleep",
        title: "Spavanje",
        steps: [
            s("Obučem pidžamu.", art("bedroom", [me(120, Y, { pose: "hold", hold: holdD("pajamas", { s: 1.3, dy: 34 }), at: [120, 140] })], "night")),
            s("Legnem u krevet.", art("bedroom", [prop("bed", 132, 156, { s: 2.2 }), { f: "me", x: 68, y: 116, s: 2.2, pose: "lie", face: "calm" }], "night")),
            s("Zaspim.", art("bedroom", [prop("bed", 132, 156, { s: 2.2 }), { f: "me", x: 68, y: 116, s: 2.2, pose: "lie", face: "sleep" }, prop("zzz", 70, 70, { s: 1.8 })], "dark")),
        ],
    },
    {
        id: "dishes",
        title: "Pranje sudova",
        steps: [
            s("Stavim tanjir u sudoperu.", art("kitchen", [BASIN, TAP, draw("plateDirty", 104, 118, { s: 3, rot: -18 }), draw("hand", 60, 124, { s: 1.6, rot: -70 })])),
            s("Operem tanjir sunđerom.", art("kitchen", [BASIN, TAP, draw("plateDirty", 104, 150, { s: 3 }), draw("sponge", 118, 132, { s: 2.6, rot: -10 }), prop("soapBubbles", 84, 130, { s: 1.4 }), prop("soapBubbles", 146, 128, { s: 1.1 })])),
            s("Obrišem tanjir krpom.", art("kitchen", [me(120, Y, { pose: "hold", hold: holdD("plateClean", { s: 1.3 }), face: "happy", at: [120, 140] }), draw("dishCloth", 146, 150, { s: 1.6 })])),
        ],
    },
    {
        id: "street",
        title: "Ulica",
        steps: [
            s("Stanem pored ulice.", art("street", [draw("crosswalk", 150, 152, { s: 2 }), draw("trafficRed", 214, 128, { s: 1.4 }), who("mama", 34, 150, { s: 1.15 }), me(70, 150, { s: 1.25, at: [214, 60] })])),
            s("Sačekam zeleno svetlo.", art("street", [draw("crosswalk", 150, 152, { s: 2 }), draw("trafficGreen", 214, 128, { s: 1.4 }), who("mama", 34, 150, { s: 1.15, at: [214, 60] }), me(70, 150, { s: 1.25, at: [214, 60], face: "happy" })])),
            s("Pređem ulicu.", art("street", [draw("crosswalk", 150, 152, { s: 2 }), draw("trafficGreen", 214, 128, { s: 1.4 }), who("mama", 120, 156, { s: 1.15, pose: "walk" }), me(154, 158, { s: 1.25, pose: "walk", face: "happy" })])),
        ],
    },
    {
        id: "puddles",
        title: "Barice",
        steps: [
            s("Napolju pada kiša.", art("park", [prop("rainCloud", 120, 50, { s: 2 }), prop("rainDrops", 100, 100, { s: 1.6 }), prop("rainDrops", 150, 104, { s: 1.6 }), prop("puddle", 120, 150, { s: 2.4 })], "rain")),
            s("Obujem čizme.", art("room", [me(100, 168, { pose: "sitHold", hold: holdD("boots", { s: 0.9 }), at: [100, 130] })])),
            s("Skačem po baricama.", art("park", [prop("puddle", 120, 156, { s: 3 }), draw("splash", 120, 154, { s: 2 }), me(120, 136, { s: 1.4, pose: "up", face: "happy" })], "rain")),
        ],
    },
    {
        id: "feed-cat",
        title: "Mače",
        steps: [
            s("Uzmem hranu za mače.", art("kitchen", [me(100, Y, { pose: "hold", hold: holdD("catFood", { s: 1.1, dy: 22 }), at: [100, 140] }), prop("cat", 190, 152, { s: 1.8 })])),
            s("Sipam hranu u činiju.", art("kitchen", [me(84, Y, { pose: "give", hold: holdD("catFood", { s: 1.1, rot: 110, dx: 6 }), at: [140, 150] }), draw("seeds", 140, 136, { s: 1.4, tone: "#b07a4a" }), draw("catBowl", 140, 156, { s: 2 })])),
            s("Mače jede.", art("kitchen", [draw("catBowlFull", 150, 156, { s: 2 }), prop("cat", 116, 156, { s: 2, flip: true }), me(56, Y, { at: [140, 140], face: "happy" })])),
        ],
    },
    {
        id: "tidy-up",
        title: "Spremanje",
        steps: [
            s("Igram se kockama.", art("room", [me(90, 168, { pose: "sitReach", face: "happy" }), prop("blocks", 146, 156, { s: 1.8 }), prop("blocksFallen", 180, 156, { s: 1.6 })]), "se igram kockama"),
            s("Stavim kocke u kutiju.", art("room", [me(84, Y, { pose: "give", hold: holdP("blocks", { s: 0.6 }), at: [150, 130] }), prop("toyBox", 156, 160, { s: 2 })])),
            s("Stavim kutiju na policu.", art("room", [prop("shelf", SHELF_X, 160, { s: 2 }), me(104, Y, { pose: "reach", hold: holdP("toyBox", { s: 0.55 }), at: [170, 40] })])),
        ],
    },
    {
        id: "bubbles",
        title: "Mehurići",
        steps: [
            s("Otvorim bočicu.", art("park", [me(120, Y, { pose: "give", hold: holdD("bubbleBottle", { s: 1.3, hand: "l" }) }), draw("bottleCap", 120 + 23 * 1.7, Y - 33 * 1.7 + 4, { s: 2, tone: "#e8605a" })])),
            s("Umočim štapić.", art("park", [me(120, Y, { pose: "hold", hold: holdD("bubbleBottle", { s: 1.3 }), at: [120, 120] }), draw("bubbleWand", 124, 128, { s: 1.4, rot: 10 })])),
            s("Duvam mehuriće.", art("park", [me(100, Y, { pose: "mouth", hold: holdD("bubbleWand", { s: 1, rot: 70, dx: 4, dy: 4 }), face: "happy" }), prop("bubbles", 170, 80, { s: 2.2 }), prop("bubbles", 200, 120, { s: 1.6 })])),
        ],
    },

    // Komunikacija u rutini (tri koraka)
    {
        id: "good-morning",
        title: "Dobro jutro",
        steps: [
            s("Mama me probudi.", art("bedroom", [prop("bed", 112, 156, { s: 2.2 }), { f: "me", x: 48, y: 116, s: 2.2, pose: "lie", face: "calm" }, who("mama", 196, 200, { s: 1.4, pose: "wave", face: "happy", at: [60, 100] })]), "me mama probudi"),
            talk("Kažem mami", "Dobro jutro!", art("bedroom", [speaking(70, { pose: "sit", s: 1.6 }), prop("bed", 100, 172, { s: 2 }), who("mama", 200, 200, { s: 1.4, face: "happy", at: [80, 90] }), ...bubble(...MOUTH(70), { p: "sun" }, 0.8)])),
            s("Ustanem iz kreveta.", art("bedroom", [prop("bed", 150, 160, { s: 1.8 }), me(66, Y, { pose: "up", face: "happy" })])),
        ],
    },
    {
        id: "ask-help",
        title: "Pomoć",
        steps: [
            s("Ne mogu da otvorim kutiju.", art("room", [me(120, Y, { pose: "hold", hold: holdD("boxClosed", { s: 1.3, dy: 6 }), face: "worried", at: [120, 140] })])),
            talk("Kažem tati", "Pomozi mi, molim te.", art("room", [who("tata", 196, 214, { s: 1.6, at: [80, 90] }), speaking(66, { pose: "hold", hold: holdD("boxClosed", { s: 1.1, dy: 6 }) }), ...bubble(...MOUTH(66), { p: "question" }, 1.1)])),
            s("Tata mi otvori kutiju.", art("room", [who("tata", 160, 214, { s: 1.6, pose: "hold", hold: holdP("boxOpen", { s: 0.9 }), face: "happy" }), me(60, Y, { face: "happy", at: [150, 110] })]), "mi tata otvori kutiju"),
        ],
    },
    {
        id: "swing-turn",
        title: "Ljuljaška",
        steps: [
            s("Drug se ljulja na ljuljašci.", art("playground", [prop("swing", 160, 156, { s: 1.8 }), who("boy2", 160, 132, { s: 1.4, pose: "sit", face: "happy" }), me(56, Y, { at: [160, 90] })]), "se drug ljulja na ljuljašci"),
            talk("Pitam druga", "Mogu li ja posle?", art("playground", [prop("swing", 176, 156, { s: 1.8 }), who("boy2", 176, 132, { s: 1.4, pose: "sit", at: [70, 80] }), speaking(64), ...bubble(...MOUTH(64), { p: "question" }, 1.1)])),
            s("Ljuljam se ja.", art("playground", [prop("swing", 120, 156, { s: 1.8 }), { f: "me", x: 120, y: 132, s: 1.4, pose: "sit", face: "happy" }, who("boy2", 200, 166, { s: 1.4, face: "happy", at: [120, 90] })]), "se ljuljam ja"),
        ],
    },

    // ── Četiri koraka ─────────────────────────────────────────────────────────
    {
        id: "wash-hands",
        title: "Pranje ruku",
        steps: [s("Pustim vodu.", washTap), s("Nasapunjam ruke.", washSoap), s("Isperem sapun.", washRinse), s("Obrišem ruke.", washDry)],
    },
    {
        id: "park",
        title: "Park",
        steps: [
            s("Obujem patike.", art("room", [me(100, 168, { pose: "sitHold", hold: holdP("shoe", { s: 1.3 }), at: [100, 130] }), prop("shoe", 186, 156, { s: 1.8 })])),
            s("Izađem iz kuće.", art("street", [draw("house", 80, 150, { s: 2.4 }), me(150, 166, { s: 1.4, pose: "walk", face: "happy" })])),
            s("Igram se u parku.", art("playground", [prop("slide", 80, 150, { s: 1.6 }), me(160, 168, { s: 1.4, pose: "up", face: "happy" })]), "se igram u parku"),
            s("Vratim se kući.", art("street", [draw("house", 160, 150, { s: 2.4 }), me(70, 166, { s: 1.4, pose: "walk", at: [160, 100] })], "dusk"), "se vratim kući"),
        ],
    },
    {
        id: "cereal",
        title: "Pahuljice",
        steps: [
            s("Uzmem činiju.", art("kitchen", [me(120, Y, { pose: "hold", hold: holdD("bowl", { s: 1.2 }), at: [120, 140] })])),
            s("Sipam mleko i pahuljice.", art("kitchen", [me(70, Y - 4, { pose: "give", at: [130, 130] }), table(150), draw("cerealBowl", 140, TOP, { s: 2 }), draw("milkPour", 112, TOP - 22, { s: 1.6 }), draw("cerealBox", 204, TOP, { s: 1.4 })])),
            s("Jedem pahuljice.", eatAtTable(draw("cerealBowl", 120, TOP, { s: 2 }))),
            s("Operem činiju.", art("kitchen", [BASIN, TAP, draw("bowl", 104, 150, { s: 2.6 }), draw("sponge", 126, 124, { s: 2.6, rot: -10 }), prop("soapBubbles", 80, 120, { s: 1.4 }), prop("soapBubbles", 150, 118, { s: 1.1 })])),
        ],
    },
    {
        id: "cookies",
        title: "Kolač",
        steps: [
            s("Razbijemo jaja.", crackEggs),
            s("Umešamo testo.", mixBatter),
            s("Ispečemo kolač.", art("kitchen", [draw("ovenCake", 150, 166, { s: 2.4 }), me(62, Y, { at: [150, 110], face: "happy" })])),
            s("Jedemo kolač.", eatAtTable(draw("cakeSlice", 120, TOP, { s: 1.8 }))),
        ],
    },
    {
        id: "puzzle",
        title: "Slagalica",
        steps: [
            s("Otvorim kutiju.", art("room", [me(84, Y, { pose: "give", at: [150, 120] }), prop("boxOpen", 156, 160, { s: 2.2 }), prop("puzzlePieces", 156, 112, { s: 1.1 })])),
            s("Složim slagalicu.", art("room", [me(84, 168, { pose: "sitReach", at: [160, 150] }), draw("puzzleDone", 162, 156, { s: 1.6 })])),
            s("Pokažem slagalicu.", art("room", [me(120, Y, { pose: "hold", hold: holdD("puzzleDone", { s: 1.05, dy: 8 }), face: "proud" })])),
            s("Vratim delove u kutiju.", art("room", [me(76, Y, { pose: "give", hold: holdP("puzzlePieces", { s: 0.7 }), at: [150, 130] }), prop("boxOpen", 150, 160, { s: 2 }), prop("puzzlePieces", 206, 156, { s: 1.3 })])),
        ],
    },
    {
        id: "doctor",
        title: "Kod doktora",
        steps: [
            s("Uđem kod doktora.", art("clinic", [prop("doorOpen", 70, 152, { s: 1.4 }), me(78, 156, { s: 1.15, pose: "walk" }), who("doctor", 170, 156, { s: 1.15, pose: "wave", face: "happy" })])),
            s("Doktor me pregleda.", art("clinic", [who("doctor", 160, 214, { s: 1.6, pose: "give", flip: true, hold: holdP("stethoscope", { s: 1.2 }), at: [80, 100] }), me(74, Y, { face: "calm", at: [150, 70] })]), "me doktor pregleda"),
            s("Dobijem nalepnicu.", art("clinic", [who("doctor", 170, 214, { s: 1.6, flip: true, face: "happy" }), me(84, Y, { pose: "give", hold: holdD("sticker", { s: 1.4 }), face: "happy", at: [126, 116] })])),
            s("Idem kući.", art("street", [draw("house", 176, 150, { s: 2.2 }), who("mama", 52, 160, { s: 1.1, pose: "walk" }), me(92, 160, { s: 1.15, pose: "walk", hold: holdD("sticker", { s: 1 }), face: "happy" })])),
        ],
    },
    {
        id: "letter",
        title: "Pismo",
        steps: [
            s("Napišem pismo baki.", art("room", [me(84, Y - 6, { pose: "give", hold: holdP("pencil", { s: 1.3, rot: 30 }), at: [132, 120] }), table(), draw("letter", 142, TOP, { s: 1.5 })])),
            s("Stavim ga u koverat.", art("room", [me(120, Y, { pose: "hold", hold: holdP("envelope", { s: 1.3 }), at: [120, 120] }), draw("letter", 120, Y - 29 * 1.7 - 2, { s: 1.1 })]), "ga stavim u koverat"),
            s("Ubacim koverat u sanduče.", art("street", [draw("mailbox", 160, 164, { s: 2.6 }), me(80, Y, { pose: "give", hold: holdP("envelope", { s: 1.1 }), at: [160, 70] })])),
            s("Pismo stigne baki.", art("living", [who("baka", 120, 214, { s: 1.6, pose: "hold", hold: holdD("letter", { s: 0.7 }), face: "happy" })])),
        ],
    },
    {
        id: "snowman",
        title: "Sneško",
        steps: [
            s("Napravim veliku grudvu.", art("snow", [me(70, Y, { pose: "push", face: "happy", wear: ["jacket", "beanie"] }), draw("snowBall", 156, 156, { s: 3 })], "snow")),
            s("Stavim manju grudvu na nju.", art("snow", [draw("snowBall", 156, 158, { s: 3 }), draw("snowBall", 156, 104, { s: 2.2 }), me(70, Y, { pose: "give", wear: ["jacket", "beanie"], at: [156, 80] })], "snow")),
            s("Stavim glavu.", art("snow", [draw("snowBall", 156, 158, { s: 3 }), draw("snowBall", 156, 104, { s: 2.2 }), draw("snowBall", 156, 64, { s: 1.6 }), me(70, Y, { pose: "reach", wear: ["jacket", "beanie"], at: [156, 50] })], "snow")),
            s("Stavim mu nos od šargarepe.", art("snow", [draw("snowBall", 156, 158, { s: 3 }), draw("snowBall", 156, 104, { s: 2.2 }), draw("snowBall", 156, 64, { s: 1.6 }), draw("carrotNose", 140, 50, { s: 1.6 }), me(70, Y, { pose: "reach", wear: ["jacket", "beanie"], face: "happy", at: [150, 50] })], "snow"), "mu stavim nos od šargarepe"),
        ],
    },
    {
        id: "winter",
        title: "Zima",
        steps: [
            s("Obučem jaknu.", art("room", [me(120, Y, { pose: "hold", hold: holdD("jacket", { s: 1.3, dy: 20 }), at: [120, 140] })])),
            s("Zakopčam jaknu.", art("room", [me(120, Y, { pose: "belly", wear: ["jacket"], at: [120, 135] }), draw("zipper", 120, Y - 22 * 1.7, { s: 1.5 })])),
            s("Navučem rukavice.", art("room", [me(120, Y, { pose: "hold", wear: ["jacket"], hold: holdP("glove", { s: 1.6, hand: "r" }), at: [120, 130] })])),
            s("Izađem na sneg.", art("snow", [me(120, Y, { pose: "up", wear: ["jacket", "beanie", "scarf"], face: "happy" }), prop("snowflakes", 60, 60, { s: 1.8 }), prop("snowflakes", 190, 70, { s: 1.8 })], "snow")),
        ],
    },
    {
        id: "bath",
        title: "Kupanje",
        steps: [
            s("Napunim kadu vodom.", art("bathroom", [draw("bathtubEmpty", 140, 160, { s: 2 }), draw("tapWater", 196, 112, { s: 1.4, flip: true }), me(60, Y, { at: [160, 120] })])),
            s("Uđem u kadu.", art("bathroom", [draw("bathtub", 150, 160, { s: 1.9 }), me(56, Y, { pose: "walk", wear: ["swim"], at: [150, 120] })])),
            s("Operem se sapunom.", art("bathroom", [me(120, 166, { s: 1.5, pose: "hold", wear: ["swim"], hold: holdD("soap", { s: 1.2 }), face: "happy" }), draw("bathtub", 120, 160, { s: 2.2 }), prop("soapBubbles", 76, 118, { s: 1.4 }), prop("soapBubbles", 166, 116, { s: 1.2 })]), "se operem sapunom"),
            s("Obrišem se peškirom.", art("bathroom", [me(120, Y, { pose: "hold", wear: ["swim"], hold: holdP("towel", { s: 1.3, dy: 30 }), face: "happy" })]), "se obrišem peškirom"),
        ],
    },

    // Komunikacija u rutini (četiri koraka)
    {
        id: "tummy-ache",
        title: "Boli me stomak",
        steps: [
            s("Boli me stomak.", art("bedroom", [me(120, Y, { pose: "belly", face: "sad" })]), "me boli stomak"),
            s("Idem kod doktora.", art("clinic", [prop("doorOpen", 176, 152, { s: 1.4 }), who("mama", 70, 156, { s: 1.15, pose: "walk" }), me(110, 156, { s: 1.15, pose: "walk", face: "sad" })])),
            talk("Kažem doktoru", "Boli me ovde.", art("clinic", [who("doctor", 196, 214, { s: 1.6, at: [80, 120] }), speaking(64, { pose: "belly" }), ...bubble(...MOUTH(64), { p: "arrow", rot: 120 }, 1)])),
            s("Doktor me pregleda.", art("clinic", [who("doctor", 160, 214, { s: 1.6, pose: "give", flip: true, hold: holdP("stethoscope", { s: 1.2 }), at: [80, 100] }), me(74, Y, { face: "calm", at: [150, 70] })]), "me doktor pregleda"),
        ],
    },
    {
        id: "play-together",
        title: "Igra sa drugarima",
        steps: [
            s("Drugari se igraju loptom.", art("park", [who("amar", 130, 166, { s: 1.4, pose: "give", face: "happy", at: [190, 120] }), prop("ball", 168, 130, { s: 1.8 }), who("ajla", 206, 166, { s: 1.4, pose: "up", face: "happy", flip: true })]), "se drugari igraju loptom"),
            talk("Pitam drugare", "Mogu li i ja da se igram?", art("park", [who("amar", 170, 166, { s: 1.4, at: [70, 80] }), who("ajla", 212, 166, { s: 1.4, at: [70, 80] }), speaking(64), ...bubble(...MOUTH(64), { p: "ball" }, 1.4)])),
            talk("Drugari kažu", "Može!", art("park", [who("amar", 160, 166, { s: 1.4, face: "talk", pose: "wave" }), ...bubble(176, 82, { p: "heart" }, 1.3), me(60, Y, { face: "happy", at: [160, 90] })])),
            s("Igramo se zajedno.", art("park", [me(70, Y, { pose: "up", face: "happy" }), prop("ball", 132, 70, { s: 2 }), who("amar", 196, 166, { s: 1.4, pose: "up", face: "happy" })]), "se igramo zajedno"),
        ],
    },

    // ── Pet koraka ────────────────────────────────────────────────────────────
    {
        id: "garden",
        title: "Sadnja",
        steps: [
            s("Iskopam rupu.", art("garden", [draw("hole", 150, 156, { s: 2.2 }), me(76, Y, { pose: "give", hold: holdD("shovel", { s: 1.3, rot: 20 }), at: [150, 150] })])),
            s("Stavim seme.", art("garden", [draw("hole", 150, 156, { s: 2.2 }), me(84, Y, { pose: "give", at: [150, 150] }), draw("seeds", 150, 146, { s: 1.8 })])),
            s("Zatrpam ga zemljom.", art("garden", [draw("mound", 150, 156, { s: 2.4 }), me(76, Y, { pose: "give", hold: holdD("shovel", { s: 1.3, rot: 40 }), at: [150, 140] })]), "ga zatrpam zemljom"),
            s("Zalijem zemlju.", art("garden", [draw("mound", 160, 156, { s: 2.4 }), draw("pour", 158, 108, { s: 1.6 }), me(76, Y, { pose: "give", hold: holdD("wateringCan", { s: 1.2, rot: 20 }), at: [160, 140] })])),
            s("Izraste cvet.", art("garden", [draw("mound", 160, 158, { s: 2.4 }), draw("flower", 160, 140, { s: 2.6 }), me(70, Y, { at: [160, 60], face: "happy" })])),
        ],
    },
    {
        id: "pancakes",
        title: "Palačinke",
        steps: [
            s("Razbijemo jaja.", crackEggs),
            s("Umešamo smesu.", mixBatter),
            s("Ispečemo palačinku.", art("kitchen", [prop("stove", 150, 186, { s: 2.2 }), draw("panPancake", 146, 186 - 40 * 2.2 + 2, { s: 2.2 }), who("mama", 70, 214, { s: 1.6, pose: "give", at: [146, 92] })])),
            s("Namažemo je medom.", art("kitchen", [me(84, Y - 4, { pose: "give", hold: holdP("spoon", { s: 1.3 }), at: [136, 130] }), table(), prop("pancakes", 140, TOP, { s: 2 }), draw("honeyJar", 196, TOP, { s: 1.6 })]), "je namažemo medom"),
            s("Pojedemo palačinku.", eatAtTable(prop("pancakes", 120, TOP, { s: 2 }))),
        ],
    },
    {
        id: "shopping",
        title: "Prodavnica",
        steps: [
            s("Napišemo spisak.", art("kitchen", [me(84, Y - 6, { pose: "give", hold: holdP("pencil", { s: 1.3, rot: 30 }), at: [132, 120] }), table(), draw("list", 142, TOP, { s: 1.6 })])),
            s("Uzmemo kolica.", art("shop", [me(70, Y, { pose: "push" }), prop("cart", 150, 166, { s: 2.6 })])),
            s("Stavimo voće u kolica.", art("shop", [prop("cart", 150, 166, { s: 2.6 }), me(70, Y, { pose: "give", hold: holdP("apple", { s: 1.3 }), at: [150, 110] })])),
            s("Platimo na kasi.", art("shop", [who("seller", 170, 170, { s: 1.15, flip: true }), prop("register", 168, 170, { s: 1.5 }), me(70, Y, { pose: "give", hold: holdD("coin", { s: 1.4 }), at: [150, 110] })])),
            s("Ponesemo kese kući.", art("street", [draw("house", 176, 150, { s: 2.2 }), me(80, 166, { s: 1.4, pose: "walk", hold: holdD("fruitBag", { s: 0.9 }), face: "happy" })])),
        ],
    },
    {
        id: "wash-hands-5",
        title: "Čiste ruke",
        steps: [s("Pustim vodu.", washTap), s("Pokvasim ruke.", washWet), s("Nasapunjam ruke.", washSoap), s("Isperem sapun.", washRinse), s("Obrišem ruke.", washDry)],
    },
    {
        id: "tower",
        title: "Kula",
        steps: [
            s("Izvadim kocke.", art("room", [prop("toyBox", 160, 160, { s: 2 }), me(84, Y, { pose: "reach", hold: holdD("block", { s: 1.3, tone: "#4d9be8" }), at: [126, 60], face: "happy" })])),
            s("Stavim prvu kocku.", art("room", [me(84, 168, { pose: "sitReach", at: [156, 150] }), draw("block", 156, 156, { s: 2.2 })])),
            s("Slažem kocke jednu na drugu.", art("room", [me(84, 168, { pose: "sitReach", at: [156, 120] }), prop("blocks", 156, 156, { s: 1.8 })])),
            s("Kula je gotova.", art("room", [draw("tower", 160, 158, { s: 1.6 }), me(76, Y, { pose: "up", face: "proud" })]), "je kula gotova"),
            s("Vratim kocke u kutiju.", art("room", [me(76, Y, { pose: "give", hold: holdD("block", { s: 1.2 }), at: [140, 130] }), prop("toyBox", 146, 160, { s: 1.8 }), prop("blocksFallen", 206, 156, { s: 1.4 })])),
        ],
    },
    {
        id: "bakery",
        title: "Pekara",
        steps: [
            s("Mama mi da novac.", art("street", [who("mama", 172, 214, { s: 1.6, pose: "give", flip: true, face: "happy" }), me(70, Y, { pose: "give", hold: holdD("coin", { s: 1.4 }), at: [130, 110] })]), "mi mama da novac"),
            s("Uđem u pekaru.", art("shop", [prop("doorOpen", 120, 152, { s: 1.4 }), me(120, 156, { s: 1.15, pose: "walk", hold: holdD("coin", { s: 1 }) }), prop("bread", 196, 100, { s: 2 })])),
            talk("Kažem prodavačici", "Molim vas, jedan hleb.", art("shop", [who("seller", 190, 170, { s: 1.15, flip: true, at: [80, 80] }), prop("register", 190, 170, { s: 1.5 }), speaking(64), ...bubble(...MOUTH(64), { p: "bread" }, 1.3)])),
            s("Dobijem hleb.", art("shop", [who("seller", 190, 170, { s: 1.15, flip: true, face: "happy" }), prop("register", 190, 170, { s: 1.5 }), me(70, Y, { pose: "hold", hold: holdP("bread", { s: 1.3 }), face: "happy", at: [150, 80] })])),
            talk("Kažem", "Hvala, doviđenja!", art("shop", [who("seller", 196, 170, { s: 1.15, flip: true, pose: "wave", face: "happy" }), prop("register", 196, 170, { s: 1.5 }), speaking(64, { pose: "wave", hold: holdP("bread", { s: 1.1, hand: "l" }) }), ...bubble(...MOUTH(64), { p: "heart" }, 1.3)])),
        ],
    },
    {
        id: "pizza",
        title: "Pica",
        steps: [
            s("Razvaljamo testo.", art("kitchen", [me(120, Y - 4, { pose: "hold", hold: holdD("rollingPin", { s: 1.3 }), at: [120, 140] }), table(), draw("dough", 120, TOP, { s: 2.2 })])),
            s("Namažemo kečap.", art("kitchen", [me(84, Y - 4, { pose: "give", hold: holdP("spoon", { s: 1.3 }), at: [136, 130] }), table(), draw("pizzaSauce", 140, TOP, { s: 2.2 })])),
            s("Stavimo sir.", art("kitchen", [me(84, Y - 4, { pose: "give", hold: holdP("cheese", { s: 1 }), at: [136, 130] }), table(), draw("pizzaCheese", 140, TOP, { s: 2.2 })])),
            s("Ispečemo picu.", art("kitchen", [draw("ovenPizza", 150, 166, { s: 2.4 }), me(62, Y, { at: [150, 110], face: "happy" })])),
            s("Jedemo picu.", art("kitchen", [me(120, Y - 6, { pose: "mouth", face: "happy" }), table(), draw("pizzaSlice", 120, TOP, { s: 2 })])),
        ],
    },
];

// ── Nivoi ─────────────────────────────────────────────────────────────────────
//
// Pomoć se postepeno povlači (od najviše ka najmanje pomoći, „most-to-least prompting”):
//   • senka (bleda slika tačnog koraka na praznom mestu) — dete samo uparuje sliku sa senkom;
//   • model: prvi korak je već na svom mestu, dete nastavlja („Prvo …. Šta je zatim?”);
//   • bez pomoći; na kraju i bez natpisa na karticama (samo slika — natpis se vidi kad je korak na mestu).
// Svaka nova dužina niza (3, 4, 5) počinje modelom, pa se model povlači.

export interface LevelRule {
    level: number;
    /** Broj koraka u nizu (više brojeva: nizovi se smenjuju) */
    steps: readonly number[];
    /** Broj nizova u nivou */
    rounds: number;
    /** Prvi korak je već na mestu (model) */
    model: boolean;
    /** Na praznim mestima je bleda slika tačnog koraka */
    ghost: boolean;
    /** Natpis na karticama koje još čekaju (bez natpisa: dete čita samo sliku) */
    captions: boolean;
}

const rule = (level: number, steps: readonly number[], rounds: number, extra: Partial<Pick<LevelRule, "model" | "ghost" | "captions">> = {}): LevelRule => ({
    level,
    steps,
    rounds,
    model: extra.model ?? false,
    ghost: extra.ghost ?? false,
    captions: extra.captions ?? true,
});

const RULES: readonly LevelRule[] = [
    // Lako: dva i tri koraka; senka i model, pa sve manje pomoći
    rule(1, [2], 3, { ghost: true }),
    rule(2, [3], 3, { model: true, ghost: true }),
    rule(3, [2], 4),
    rule(4, [3], 3, { model: true }),
    rule(5, [3], 3),
    // Srednje: tri pa četiri koraka
    rule(6, [3], 4),
    rule(7, [4], 3, { model: true }),
    rule(8, [4], 3),
    rule(9, [4], 4),
    rule(10, [4], 4, { captions: false }),
    // Teško: pet koraka, pa slike bez natpisa i izmešane dužine
    rule(11, [5], 3, { model: true }),
    rule(12, [5], 3),
    rule(13, [5], 4),
    rule(14, [5], 3, { captions: false }),
    rule(15, [4, 5], 4, { captions: false }),
];

export const SEQUENCE_MAX_LEVEL = 15;

export function sequenceRule(level: number): LevelRule {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), SEQUENCE_MAX_LEVEL);
    return RULES[safe - 1];
}

/**
 * Nizovi jednog nivoa. `maxSteps` dolazi iz uzrasta (najmlađi: najviše tri koraka — ređanje
 * tri slike je tipično oko četvrte godine). Kad nizova te dužine ima manje nego što treba,
 * nivo uzima i kraće nizove; nikad duže od dozvoljenog. Kad nivo ima više dužina, smenjuju se.
 */
export function buildSequenceLevel(level: number, { maxSteps, random = Math.random }: { maxSteps: number; random?: () => number }): Sequence[] {
    const current = sequenceRule(level);
    const cap = Math.max(2, Number.isFinite(maxSteps) ? maxSteps : 5);
    const lengths = Array.from(new Set(current.steps.map((steps) => Math.max(2, Math.min(steps, cap)))));
    const shuffle = <T,>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const byLength = lengths.map((length) => shuffle(SEQUENCES.filter((sequence) => sequence.steps.length === length)));
    const picked: Sequence[] = [];
    for (let i = 0; picked.length < current.rounds && byLength.some((list) => list.length > 0); i += 1) {
        const list = byLength[i % byLength.length];
        const next = list.shift();
        if (next) picked.push(next);
    }
    const longest = Math.max(...lengths);
    const shorter = shuffle(SEQUENCES.filter((sequence) => sequence.steps.length < longest && !picked.includes(sequence))).sort((a, b) => b.steps.length - a.steps.length);
    const chosen = [...picked, ...shorter].slice(0, current.rounds);
    // U svakom nivou je bar jedna rutina u kojoj dete nešto kaže (kad takva postoji za tu dužinu)
    if (!chosen.some(hasTalk)) {
        const talking = shuffle(SEQUENCES.filter((sequence) => hasTalk(sequence) && lengths.includes(sequence.steps.length)));
        const slot = chosen.findIndex((sequence) => talking.some((other) => other.steps.length === sequence.steps.length));
        if (slot >= 0) chosen[slot] = talking.find((other) => other.steps.length === chosen[slot].steps.length)!;
    }
    return shuffle(chosen);
}

/** Rutina sa korakom u kome dete nešto kaže */
export function hasTalk(sequence: Sequence): boolean {
    return sequence.steps.some((step) => step.say !== undefined);
}

export function getSequence(id: string): Sequence | undefined {
    return SEQUENCES.find((sequence) => sequence.id === id);
}
