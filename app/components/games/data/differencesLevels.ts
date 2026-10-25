// Sadržaj igre „Pronađi razlike”: dve iste slike (soba, park, kuhinja, plaža, učionica,
// dvorište, pijaca, akvarijum, zima), a na jednoj nešto nedostaje, nešto je druge boje ili
// veličine. Dete dodiruje razliku na bilo kojoj slici, a na obe se pojavi blag krug. Slike se
// crtaju iz delova slika situacija (scene/), pa su u istom stilu kao ostale igre; ovde su samo
// opisi, bez Reacta, da bi se nivoi proveravali u testovima.
//
// Zašto ovim redom (uzrast 4–10, i deca sa autizmom):
//  • Vizuelna pažnja i pretraživanje: poređenje dve slike traži sistematično gledanje
//    deo po deo i zadržavanje slike u pamćenju — veštinu koja raste od predškolskog uzrasta.
//    Deca sa autizmom često dobro uočavaju detalje, pa je igra prilika za uspeh.
//  • Učenje bez greške (errorless learning): prvo samo jedna velika, očigledna razlika (nema
//    sunca, lopta crvena — plava), a prvu razliku prvog nivoa pokazuje ruka (ne ocenjuje se).
//  • Podrška se povlači postepeno: 1–2 krupne razlike, pa 3–4 sa razlikama u boji, pa 5–6
//    suptilnih (veličina, sitan detalj: naočare, ranac). Razlike nikad ne stoje jedna uz drugu.
//  • Pogrešan dodir nije kazna: na tom mestu se pojavi mirna senka i glas kaže da su tu slike
//    iste. Dugme „Pomoć” (i pomoć posle grešaka ili čekanja) blago istakne jednu razliku.
//  • Svaka razlika je cilj od najmanje 48 px i kad je sam predmet sitan (meri se na ekranu).
//  • Nema žurbe ni sata; raspored je uvek isti (slike jedna ispod druge na telefonu, jedna
//    pored druge na širokom ekranu).
//  • Glas nikad ne kaže gde treba dodirnuti — samo šta je drugačije, posle pronalaska.
//  • Ocena: svaka razlika je jedan zadatak. „Tačno” = pronađena bez pogrešnog dodira posle
//    prethodne razlike i bez pomoći; „uz pomoć” = posle isticanja. Pokazna se ne ocenjuje.

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";
import { thing, who, type BackgroundId, type FigureItem, type PropItem, type SceneItem, type SceneSpec, type ViewId } from "@/app/components/games/scene/types";

// ── Scene i razlike ───────────────────────────────────────────────────────────

/** Vrsta razlike: nedostaje (ili je višak), druga boja, druga veličina, sitan detalj */
export type DiffKind = "missing" | "color" | "size" | "detail";

/** 1 = krupna i očigledna, 2 = srednja (boja, manji predmet), 3 = suptilna */
export type DiffTier = 1 | 2 | 3;

export interface Difference {
    id: string;
    kind: DiffKind;
    tier: DiffTier;
    /** Predmet na koji se razlika odnosi (ključ iz `items`); bez `patch` i `add` on nedostaje */
    target?: string;
    /** Šta je drugačije na predmetu (boja, veličina, odeća, pogled) */
    patch?: Partial<PropItem> & Partial<Pick<FigureItem, "wear" | "pose" | "hold" | "face" | "flip">>;
    /** Predmet kojeg na drugoj slici nema */
    add?: SceneItem;
    /** Gde je razlika na slici (240 × 160): sredina i poluprečnik */
    at: readonly [x: number, y: number, r: number];
    /** Rečenica posle pronalaska („Na jednoj slici nema sunca.”) */
    text: string;
}

export interface DiffScene {
    id: string;
    name: string;
    bg: BackgroundId;
    view?: ViewId;
    /** Predmeti po redu crtanja (prvi su najdalje), sa ključem */
    items: readonly (readonly [key: string, item: SceneItem])[];
    diffs: readonly Difference[];
}

const missing = (id: string, tier: DiffTier, target: string, at: Difference["at"], text: string): Difference => ({ id, kind: "missing", tier, target, at, text });
const extra = (id: string, tier: DiffTier, add: SceneItem, at: Difference["at"], text: string): Difference => ({ id, kind: "missing", tier, add, at, text });
const color = (id: string, tier: DiffTier, target: string, tone: string, at: Difference["at"], text: string): Difference => ({ id, kind: "color", tier, target, patch: { tone }, at, text });
const size = (id: string, tier: DiffTier, target: string, s: number, at: Difference["at"], text: string): Difference => ({ id, kind: "size", tier, target, patch: { s }, at, text });
const detail = (id: string, tier: DiffTier, target: string, patch: Difference["patch"], at: Difference["at"], text: string): Difference => ({ id, kind: "detail", tier, target, patch, at, text });

export const DIFF_SCENES: readonly DiffScene[] = [
    {
        id: "soba",
        name: "Soba",
        bg: "room",
        view: "clear",
        items: [
            ["shelf", thing("shelf", 40, 112, { s: 1.3 })],
            ["clock", thing("clock", 100, 52, { s: 1.7 })],
            ["lamp", thing("lamp", 140, 112, { s: 1.05 })],
            ["blocks", thing("blocks", 20, 152, { s: 1.15 })],
            ["teddy", thing("teddy", 62, 152, { s: 1.5 })],
            ["lejla", who("lejla", 108, { y: 148, s: 0.86, pose: "wave" })],
            ["ball", thing("ball", 166, 152, { s: 2.1, tone: "#e8605a" })],
            ["car", thing("toyCar", 214, 154, { s: 1.5, tone: "#3f8fd8" })],
        ],
        diffs: [
            missing("teddy", 1, "teddy", [62, 132, 16], "Na jednoj slici nema mede."),
            color("ball", 1, "ball", "#3f8fd8", [166, 135, 17], "Lopte nisu iste boje."),
            missing("clock", 1, "clock", [100, 34, 16], "Na jednoj slici nema sata."),
            color("car", 2, "car", "#f4c94a", [212, 141, 17], "Autići nisu iste boje."),
            missing("lamp", 2, "lamp", [143, 78, 16], "Na jednoj slici nema lampe."),
            extra("sun", 2, thing("sun", 192, 52, { s: 0.75 }), [192, 42, 15], "Kroz jedan prozor se vidi sunce."),
            size("blocks", 3, "blocks", 0.8, [20, 132, 15], "Kocke nisu iste veličine."),
            detail("glasses", 3, "lejla", { wear: ["glasses"] }, [108, 96, 13], "Lejla na jednoj slici nosi naočare."),
        ],
    },
    {
        id: "park",
        name: "Park",
        bg: "park",
        view: "clear",
        items: [
            ["sun", thing("sun", 210, 44, { s: 1.6 })],
            ["cloud", thing("cloud", 72, 40, { s: 1.4 })],
            ["kite", thing("kite", 142, 62, { s: 1.3 })],
            ["tree", thing("tree", 30, 128, { s: 1.0 })],
            ["bench", thing("bench", 166, 112, { s: 1.25 })],
            ["dog", thing("dog", 68, 152, { s: 1.6 })],
            ["amar", who("amar", 110, { y: 148, s: 0.86 })],
            ["bird", thing("bird", 150, 152, { s: 1.6, tone: "#4d9be8" })],
            ["flowers", thing("flowers", 214, 152, { s: 1.6 })],
        ],
        diffs: [
            missing("sun", 1, "sun", [210, 30, 17], "Na jednoj slici nema sunca."),
            missing("dog", 1, "dog", [66, 138, 17], "Na jednoj slici nema kuce."),
            color("dogColor", 1, "dog", "#a8794e", [66, 138, 17], "Kuce nisu iste boje."),
            missing("kite", 1, "kite", [142, 40, 17], "Na jednoj slici nema zmaja."),
            color("bird", 2, "bird", "#e8605a", [152, 140, 14], "Ptice nisu iste boje."),
            missing("cloud", 2, "cloud", [72, 28, 18], "Na jednoj slici nema oblaka."),
            size("tree", 3, "tree", 0.82, [30, 76, 20], "Drveće nije iste veličine."),
            size("flowers", 3, "flowers", 1.15, [214, 135, 15], "Cveće nije iste veličine."),
            detail("backpack", 3, "amar", { wear: ["backpack"] }, [110, 118, 14], "Amar na jednoj slici nosi ranac."),
            missing("bench", 2, "bench", [166, 99, 18], "Na jednoj slici nema klupe."),
        ],
    },
    {
        id: "kuhinja",
        name: "Kuhinja",
        bg: "kitchen",
        view: "day",
        items: [
            ["clock", thing("clock", 104, 40, { s: 1.5 })],
            ["fridge", thing("fridge", 222, 112, { s: 1.0 })],
            ["pot", thing("pot", 28, 82, { s: 1.6 })],
            ["cup", thing("cup", 70, 82, { s: 1.7, tone: "#6cc0e8" })],
            ["table", thing("table", 130, 152, { s: 1.15 })],
            ["plate", thing("plate", 110, 111, { s: 1.2 })],
            ["apple", thing("apple", 150, 111, { s: 1.4 })],
            ["mama", who("mama", 190, { y: 150, s: 0.72 })],
            ["cat", thing("cat", 42, 152, { s: 1.6, tone: "#f4b06a" })],
        ],
        diffs: [
            missing("cat", 1, "cat", [42, 135, 18], "Na jednoj slici nema mace."),
            missing("clock", 1, "clock", [104, 26, 15], "Na jednoj slici nema sata."),
            missing("mama", 1, "mama", [190, 104, 22], "Na jednoj slici nema mame."),
            color("cup", 2, "cup", "#e8605a", [71, 70, 14], "Šolje nisu iste boje."),
            missing("apple", 2, "apple", [150, 100, 13], "Na jednoj slici nema jabuke."),
            color("catColor", 1, "cat", "#a9a29a", [42, 135, 18], "Mace nisu iste boje."),
            size("pot", 3, "pot", 1.15, [28, 72, 15], "Šerpe nisu iste veličine."),
            missing("plate", 3, "plate", [110, 105, 15], "Na jednoj slici nema tanjira."),
            size("fridge", 3, "fridge", 0.85, [222, 74, 20], "Frižideri nisu iste veličine."),
        ],
    },
    {
        id: "plaza",
        name: "Plaža",
        bg: "beach",
        view: "clear",
        items: [
            ["sun", thing("sun", 40, 42, { s: 1.6 })],
            ["cloud", thing("cloud", 150, 36, { s: 1.3 })],
            ["boat", thing("boat", 112, 94, { s: 1.15 })],
            ["parasol", thing("parasol", 206, 140, { s: 1.25, tone: "#e8605a" })],
            ["starfish", thing("starfish", 20, 154, { s: 1.4 })],
            ["haris", who("haris", 58, { y: 148, s: 0.86, wear: ["swim"] })],
            ["ball", thing("ball", 102, 154, { s: 2.1, tone: "#e8605a" })],
            ["bucket", thing("bucket", 138, 154, { s: 1.6, tone: "#3f8fd8" })],
            ["crab", thing("crab", 178, 154, { s: 1.4 })],
        ],
        diffs: [
            missing("sun", 1, "sun", [40, 28, 17], "Na jednoj slici nema sunca."),
            missing("boat", 1, "boat", [112, 72, 18], "Na jednoj slici nema broda."),
            color("ball", 1, "ball", "#8fd07a", [102, 137, 17], "Lopte nisu iste boje."),
            color("bucket", 2, "bucket", "#f4c94a", [138, 139, 14], "Kofice nisu iste boje."),
            color("parasol", 2, "parasol", "#3f8fd8", [206, 76, 20], "Suncobrani nisu iste boje."),
            missing("crab", 2, "crab", [178, 140, 14], "Na jednoj slici nema raka."),
            size("starfish", 3, "starfish", 0.95, [20, 140, 13], "Morske zvezde nisu iste veličine."),
            size("cloud", 3, "cloud", 0.9, [150, 26, 18], "Oblaci nisu iste veličine."),
            detail("glasses", 3, "haris", { wear: ["swim", "glasses"] }, [58, 96, 13], "Haris na jednoj slici nosi naočare."),
        ],
    },
    {
        id: "ucionica",
        name: "Učionica",
        bg: "classroom",
        view: "clear",
        items: [
            ["star", thing("star", 92, 52, { s: 1.4 })],
            ["heart", thing("heart", 162, 50, { s: 1.4 })],
            ["deskL", thing("desk", 40, 152, { s: 1.15 })],
            ["book", thing("book", 40, 112, { s: 1.2, tone: "#3f8fd8" })],
            ["deskR", thing("desk", 206, 152, { s: 1.15 })],
            ["crayons", thing("crayons", 206, 112, { s: 1.4 })],
            ["teacher", who("teacher", 156, { y: 146, s: 0.72 })],
            ["ajla", who("ajla", 84, { y: 148, s: 0.82 })],
            ["backpack", thing("backpack", 120, 154, { s: 1.35, tone: "#f4b73f" })],
        ],
        diffs: [
            missing("teacher", 1, "teacher", [156, 102, 22], "Na jednoj slici nema učiteljice."),
            missing("star", 1, "star", [92, 40, 15], "Na jednoj tabli nema zvezde."),
            color("backpack", 1, "backpack", "#3fbf8a", [120, 136, 16], "Ranci nisu iste boje."),
            color("book", 2, "book", "#e8605a", [40, 98, 13], "Knjige nisu iste boje."),
            missing("heart", 2, "heart", [162, 38, 15], "Na jednoj tabli nema srca."),
            extra("bird", 2, thing("bird", 213, 76, { s: 1.4, tone: "#e8605a" }), [213, 65, 14], "Na jednom prozoru sedi ptica."),
            missing("crayons", 3, "crayons", [206, 102, 14], "Na jednoj slici nema bojica."),
            detail("glasses", 3, "ajla", { wear: ["glasses"] }, [84, 98, 13], "Ajla na jednoj slici nosi naočare."),
            size("bookSize", 3, "book", 0.85, [40, 98, 13], "Knjige nisu iste veličine."),
        ],
    },
    {
        id: "dvoriste",
        name: "Dvorište",
        bg: "garden",
        view: "clear",
        items: [
            ["sun", thing("sun", 218, 40, { s: 1.5 })],
            ["cloud", thing("cloud", 112, 38, { s: 1.3 })],
            ["butterfly", thing("butterfly", 172, 72, { s: 1.5 })],
            ["tree", thing("tree", 26, 128, { s: 1.0 })],
            ["bird", thing("bird", 96, 94, { s: 1.4, tone: "#4d9be8" })],
            ["bicycle", thing("bicycle", 76, 154, { s: 1.0, tone: "#e8605a" })],
            ["deka", who("deka", 132, { y: 150, s: 0.7, pose: "hold", hold: { prop: "wateringCan", hand: "r", s: 1 } })],
            ["rabbit", thing("rabbit", 178, 154, { s: 1.4 })],
            ["flowers", thing("flowers", 218, 154, { s: 1.6 })],
        ],
        diffs: [
            missing("sun", 1, "sun", [218, 28, 16], "Na jednoj slici nema sunca."),
            missing("rabbit", 1, "rabbit", [178, 133, 16], "Na jednoj slici nema zeke."),
            color("bicycle", 1, "bicycle", "#3f8fd8", [76, 136, 20], "Bicikli nisu iste boje."),
            missing("butterfly", 2, "butterfly", [172, 60, 14], "Na jednoj slici nema leptira."),
            color("bird", 2, "bird", "#f4c94a", [97, 85, 13], "Ptice nisu iste boje."),
            missing("cloud", 2, "cloud", [112, 28, 17], "Na jednoj slici nema oblaka."),
            size("flowers", 3, "flowers", 1.15, [218, 137, 15], "Cveće nije iste veličine."),
            detail("can", 3, "deka", { pose: "stand", hold: undefined }, [132, 112, 18], "Deka na jednoj slici nema kantu."),
            size("tree", 3, "tree", 0.82, [26, 76, 20], "Drveće nije iste veličine."),
        ],
    },
    {
        id: "pijaca",
        name: "Pijaca",
        bg: "market",
        view: "clear",
        items: [
            ["sun", thing("sun", 120, 50, { s: 1.4 })],
            ["stallL", thing("stall", 60, 128, { s: 1.1, tone: "#e8605a" })],
            ["stallR", thing("stall", 182, 128, { s: 1.1, tone: "#3f8fd8" })],
            ["apples", thing("crate", 40, 100, { s: 1.0, tone: "#e8605a" })],
            ["oranges", thing("crate", 80, 100, { s: 1.0, tone: "#f6a23e" })],
            ["melon", thing("watermelon", 164, 100, { s: 1.5 })],
            ["bread", thing("bread", 204, 100, { s: 1.5 })],
            ["cat", thing("cat", 26, 154, { s: 1.5, tone: "#f4b06a" })],
            ["mama", who("mama", 116, { y: 152, s: 0.68 })],
            ["basket", thing("basket", 156, 154, { s: 1.4 })],
        ],
        diffs: [
            missing("melon", 1, "melon", [164, 90, 15], "Na jednoj slici nema lubenice."),
            missing("cat", 1, "cat", [26, 138, 17], "Na jednoj slici nema mace."),
            color("apples", 1, "apples", "#8fd07a", [40, 86, 16], "Jabuke nisu iste boje."),
            missing("oranges", 2, "oranges", [80, 86, 16], "Na jednoj slici nema gajbe sa pomorandžama."),
            color("lemons", 2, "oranges", "#f4e04a", [80, 86, 16], "U jednoj gajbi je drugo voće."),
            missing("bread", 2, "bread", [204, 92, 14], "Na jednoj slici nema hleba."),
            missing("sun", 2, "sun", [120, 36, 15], "Na jednoj slici nema sunca."),
            size("basket", 3, "basket", 1.05, [156, 141, 15], "Korpe nisu iste veličine."),
            detail("glasses", 3, "mama", { wear: ["glasses"] }, [116, 76, 13], "Mama na jednoj slici nosi naočare."),
            detail("catTurn", 3, "cat", { flip: true }, [26, 138, 17], "Mace ne gledaju na istu stranu."),
        ],
    },
    {
        id: "akvarijum",
        name: "Akvarijum",
        bg: "aquarium",
        items: [
            ["bubbles", thing("bubbles", 104, 44, { s: 1.5 })],
            ["fish1", thing("fish", 52, 60, { s: 2.2, tone: "#f6a23e" })],
            ["fish2", thing("fish", 160, 46, { s: 2.0, tone: "#4d9be8", flip: true })],
            ["fish3", thing("fish", 204, 104, { s: 1.8, tone: "#f4c94a", flip: true })],
            ["fish4", thing("fish", 104, 100, { s: 1.5, tone: "#e8605a" })],
            ["seaweed", thing("seaweed", 24, 140, { s: 1.5 })],
            ["coral", thing("coral", 70, 142, { s: 1.4 })],
            ["crab", thing("crab", 130, 152, { s: 1.4 })],
            ["starfish", thing("starfish", 174, 152, { s: 1.4, tone: "#f28b6e" })],
            ["stone", thing("stone", 214, 152, { s: 1.2 })],
        ],
        diffs: [
            missing("crab", 1, "crab", [130, 138, 15], "Na jednoj slici nema raka."),
            color("fish1", 1, "fish1", "#9b7ef0", [52, 42, 18], "Ribice nisu iste boje."),
            missing("fish2", 1, "fish2", [160, 30, 18], "Na jednoj slici nema plave ribice."),
            color("fish3", 2, "fish3", "#3fbf8a", [204, 90, 15], "Ribice nisu iste boje."),
            color("starfish", 2, "starfish", "#9b7ef0", [174, 138, 14], "Morske zvezde nisu iste boje."),
            missing("seaweed", 2, "seaweed", [24, 112, 18], "Na jednoj slici nema morske trave."),
            size("fish4", 3, "fish4", 1.1, [104, 88, 13], "Ribice nisu iste veličine."),
            missing("bubbles", 3, "bubbles", [104, 30, 14], "Na jednoj slici nema mehurića."),
            size("coral", 3, "coral", 1.05, [70, 120, 16], "Korali nisu iste veličine."),
            missing("stone", 3, "stone", [214, 144, 14], "Na jednoj slici nema kamena."),
        ],
    },
    {
        id: "zima",
        name: "Zima",
        bg: "snow",
        view: "snow",
        items: [
            ["sun", thing("sun", 34, 42, { s: 1.2 })],
            ["cloud", thing("cloud", 140, 40, { s: 1.4 })],
            ["pine", thing("pine", 188, 134, { s: 1.15 })],
            ["snowman", thing("snowman", 58, 150, { s: 1.6 })],
            ["bird", thing("bird", 58, 86, { s: 1.5, tone: "#e8605a" })],
            ["snowball", thing("snowball", 18, 154, { s: 1.8 })],
            ["amina", who("amina", 104, { y: 148, s: 0.86, wear: ["beanie", "scarf"] })],
            ["sled", thing("sled", 152, 154, { s: 1.3 })],
            ["dog", thing("dog", 214, 154, { s: 1.2 })],
        ],
        diffs: [
            missing("snowman", 1, "snowman", [58, 124, 20], "Na jednoj slici nema sneška."),
            missing("pine", 1, "pine", [188, 96, 22], "Na jednoj slici nema jelke."),
            missing("sled", 1, "sled", [152, 146, 18], "Na jednoj slici nema sanki."),
            color("bird", 1, "bird", "#4d9be8", [59, 78, 14], "Ptice nisu iste boje."),
            missing("cloud", 2, "cloud", [140, 28, 18], "Na jednoj slici nema oblaka."),
            missing("sun", 2, "sun", [34, 32, 14], "Na jednoj slici nema sunca."),
            missing("dog", 2, "dog", [212, 141, 15], "Na jednoj slici nema kuce."),
            color("dogColor", 2, "dog", "#a8794e", [212, 141, 15], "Kuce nisu iste boje."),
            detail("scarf", 3, "amina", { wear: ["beanie"] }, [104, 104, 13], "Amina na jednoj slici nema šal."),
            size("snowball", 3, "snowball", 1.3, [18, 145, 13], "Grudve nisu iste veličine."),
            detail("beanie", 3, "amina", { wear: ["scarf"] }, [104, 80, 14], "Amina na jednoj slici nema kapu."),
        ],
    },
];

export function getDiffScene(id: unknown): DiffScene | undefined {
    return DIFF_SCENES.find((s) => s.id === id);
}

export function getDifference(scene: DiffScene | undefined, id: unknown): Difference | undefined {
    return scene?.diffs.find((d) => d.id === id);
}

/** Dve razlike nikad nisu bliže od ovoga (jedinice slike): krugovi i mesta za dodir se ne preklapaju */
export const MIN_GAP = 36;

const far = (a: Difference, b: Difference) => Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) >= MIN_GAP && (a.target === undefined || a.target !== b.target);

// ── Slike sa razlikama ────────────────────────────────────────────────────────

/** Na kojoj slici je promena: „a” (gornja ili leva) ili „b” */
export type DiffSide = "a" | "b";

export interface PickedDiff {
    id: string;
    side: DiffSide;
}

function applyDiffs(scene: DiffScene, diffs: readonly Difference[]): SceneSpec {
    const items: SceneItem[] = [];
    for (const [key, item] of scene.items) {
        const touching = diffs.filter((d) => d.target === key);
        if (touching.some((d) => !d.patch && !d.add)) continue;
        let next = item;
        for (const d of touching) if (d.patch) next = { ...next, ...d.patch } as SceneItem;
        items.push(next);
    }
    for (const d of diffs) if (d.add) items.push(d.add);
    return { bg: scene.bg, view: scene.view, items, camera: "fixed" };
}

/** Obe slike: na svakoj su promene čija je to strana */
export function diffPictures(scene: DiffScene, picked: readonly PickedDiff[]): { a: SceneSpec; b: SceneSpec } {
    const on = (side: DiffSide) => picked.filter((p) => p.side === side).map((p) => getDifference(scene, p.id)).filter((d): d is Difference => Boolean(d));
    return { a: applyDiffs(scene, on("a")), b: applyDiffs(scene, on("b")) };
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

export interface DiffLevel {
    /** Razlika na jednoj slici */
    count: number;
    /** Najviše slika (manje ako bi bilo previše zadataka za uzrast) */
    scenes: number;
    /** Iz kojih težina se bira, redom po prednosti */
    tiers: readonly DiffTier[];
    /** Koliko razlika mora biti u boji */
    colors: number;
    /** Samo predmeti koji nedostaju (najočiglednije) */
    missingOnly?: boolean;
    earlyHint: boolean;
}

const lv = (count: number, scenes: number, tiers: DiffTier[], extra: Partial<DiffLevel> = {}): DiffLevel => ({ count, scenes, tiers, colors: 0, earlyHint: false, ...extra });

export const DIFF_LEVELS: readonly DiffLevel[] = [
    // Lako: jedna ili dve krupne razlike (nema sunca, lopta druge boje)
    lv(1, 3, [1], { missingOnly: true, earlyHint: true }),
    lv(1, 3, [1], { colors: 1, earlyHint: true }),
    lv(2, 2, [1], { earlyHint: true }),
    lv(2, 3, [1], { colors: 1, earlyHint: true }),
    lv(2, 3, [1, 2], { earlyHint: true }),
    // Srednje: tri pa četiri razlike, i razlike u boji
    lv(3, 2, [1, 2]),
    lv(3, 2, [2, 1], { colors: 1 }),
    lv(3, 2, [2, 1], { colors: 2 }),
    lv(4, 2, [2, 1], { colors: 1 }),
    lv(4, 2, [2, 1, 3], { colors: 2 }),
    // Teško: pet-šest suptilnih razlika (veličina, sitni detalji)
    lv(5, 1, [3, 2]),
    lv(5, 1, [3, 2, 1]),
    lv(6, 1, [3, 2, 1]),
    lv(6, 1, [3, 2, 1]),
    lv(6, 1, [3, 2, 1], { colors: 1 }),
];

export const DIFF_MAX_LEVEL = DIFF_LEVELS.length;

export function diffLevel(level: number): DiffLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), DIFF_MAX_LEVEL);
    return DIFF_LEVELS[safe - 1];
}

/**
 * Razlike za jednu sliku po pravilu nivoa: prvo tražene razlike u boji, pa ostale po težini
 * (redom po prednosti), nikad dve blizu jedna druge. `random` daje broj u [0, 1).
 */
export function pickDifferences(scene: DiffScene, rule: DiffLevel, random: () => number): Difference[] {
    const shuffle = <T,>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const allowed = scene.diffs.filter((d) => rule.tiers.includes(d.tier) && (!rule.missingOnly || d.kind === "missing"));
    const ordered = rule.tiers.flatMap((tier) => shuffle(allowed.filter((d) => d.tier === tier)));
    const chosen: Difference[] = [];
    const add = (d: Difference) => {
        if (chosen.length < rule.count && !chosen.includes(d) && chosen.every((other) => far(other, d))) chosen.push(d);
    };
    for (const d of ordered.filter((d) => d.kind === "color")) if (chosen.filter((c) => c.kind === "color").length < rule.colors) add(d);
    for (const d of ordered) add(d);
    // Ako slika nema dovoljno razlika tražene težine, dopuni iz ostalih (uvek krupnije)
    for (const d of shuffle(scene.diffs).sort((x, y) => x.tier - y.tier)) add(d);
    return chosen;
}

// ── Plan nivoa ────────────────────────────────────────────────────────────────

export interface DiffRound {
    scene: string;
    diffs: PickedDiff[];
}

export interface DiffPlan {
    rounds: DiffRound[];
    earlyHint: boolean;
}

interface PlanOptions {
    maxRounds: number;
    random?: () => number;
}

/** Broj zadataka (razlika) u planu */
export function diffRoundsTotal(plan: Pick<DiffPlan, "rounds">): number {
    return plan.rounds.reduce((sum, round) => sum + round.diffs.length, 0);
}

/**
 * Plan nivoa: slike (bez ponavljanja) i razlike na njima. Sledeća slika se dodaje samo kad
 * stane u broj zadataka za uzrast (najmanje 6). Strana promene je nasumična.
 */
export function buildDiffLevel(level: number, { maxRounds, random = Math.random }: PlanOptions): DiffPlan {
    const rule = diffLevel(level);
    const cap = Math.max(6, Number.isFinite(maxRounds) ? maxRounds : 6);
    const scenes = [...DIFF_SCENES];
    for (let i = scenes.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
    }
    const rounds: DiffRound[] = [];
    let used = 0;
    for (const scene of scenes) {
        if (rounds.length >= rule.scenes) break;
        if (rounds.length > 0 && used + rule.count > cap) break;
        const diffs = pickDifferences(scene, rule, random).map((d) => ({ id: d.id, side: (random() < 0.5 ? "a" : "b") as DiffSide }));
        used += diffs.length;
        rounds.push({ scene: scene.id, diffs });
    }
    return { rounds, earlyHint: rule.earlyHint };
}

// ── Pogađanje ─────────────────────────────────────────────────────────────────

/** Najmanji poluprečnik mesta za dodir na ekranu (px): krug od 48 px */
export const MIN_HIT_PX = 24;

/**
 * Koja razlika je dodirnuta: tačka (x, y) u jedinicama slike, `unitPx` = koliko piksela je
 * jedna jedinica na ekranu. Mesto je bar MIN_HIT_PX oko sredine razlike (i kad je predmet
 * sitan); kad ih je više, bira se najbliža. Već pronađene se preskaču.
 */
export function hitDifference(scene: DiffScene, ids: readonly string[], found: readonly string[], x: number, y: number, unitPx: number): string | null {
    let best: { id: string; d: number } | null = null;
    for (const id of ids) {
        if (found.includes(id)) continue;
        const diff = getDifference(scene, id);
        if (!diff) continue;
        const reach = Math.max(diff.at[2], MIN_HIT_PX / Math.max(unitPx, 0.01));
        const d = Math.hypot(diff.at[0] - x, diff.at[1] - y);
        if (d <= reach && (!best || d < best.d)) best = { id, d };
    }
    return best?.id ?? null;
}

/** Da li je dodir pao na već pronađenu razliku (tad se ništa ne dešava) */
export function hitFound(scene: DiffScene, found: readonly string[], x: number, y: number, unitPx: number): boolean {
    return found.some((id) => {
        const diff = getDifference(scene, id);
        return diff ? Math.hypot(diff.at[0] - x, diff.at[1] - y) <= Math.max(diff.at[2], MIN_HIT_PX / Math.max(unitPx, 0.01)) : false;
    });
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

const NUMBER_WORDS = ["", "jednu", "dve", "tri", "četiri", "pet", "šest"];

export const SAME_HERE = "Tu su slike iste.";
export const SAME_HERE_SLOW = "Tu su slike iste. Pogledaj polako, deo po deo.";
export const ALL_FOUND = "Sve razlike su pronađene.";
export const HINT_TEXT = "Evo male pomoći.";

/** „Pronađi tri razlike.” (jedna: „Pronađi jednu razliku.”) */
export function findTitle(count: number): string {
    const n = Math.max(1, Math.min(count, NUMBER_WORDS.length - 1));
    return n === 1 ? "Pronađi jednu razliku." : `Pronađi ${NUMBER_WORDS[n]} ${n >= 5 ? "razlika" : "razlike"}.`;
}

/** Uputstvo na početku slike (o čemu je zadatak, nikad gde dodirnuti) */
export function diffIntro(count: number): string {
    return `Ove dve slike nisu iste. ${findTitle(count)}`;
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface DiffView extends BaseView {
    /** Redni broj slike u nivou (od 0) */
    picture: number;
    scene: string;
    diffs: PickedDiff[];
    found: string[];
    /** Razlika koja blago pulsira (pomoć) */
    hint: string | null;
    /** Razlike pronađene uz pomoć */
    hinted: string[];
    /** Pogrešni dodiri od poslednje pronađene razlike */
    misses: number;
    /** Poslednji pogrešan dodir (za mirnu senku na obe slike); `n` se menja pri svakom */
    miss: { x: number; y: number; n: number } | null;
    feedback: FeedbackKind;
    promptedCount: number;
}

export function emptyDiffView(totalRounds: number): DiffView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        picture: 0,
        scene: "",
        diffs: [],
        found: [],
        hint: null,
        hinted: [],
        misses: 0,
        miss: null,
        feedback: null,
    };
}

export function diffPictureView(round: DiffRound, index: number): Partial<DiffView> {
    return { picture: index, scene: round.scene, diffs: round.diffs.map((d) => ({ ...d })), found: [], hint: null, hinted: [], misses: 0, miss: null, feedback: null };
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Razlika je pronađena. Prva razlika prvog nivoa je pokazna (ne ocenjuje se); „correct” = bez
 * pogrešnog dodira od prethodne razlike i bez pomoći; „prompted” = uz pomoć (osim pokazne).
 */
export function solveDiffView(current: DiffView, level: number, id: string, solved: Partial<DiffView> = {}): { next: DiffView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const helped = current.hint === id || current.hinted.includes(id);
    const firstTry = current.misses === 0 && !helped && !modeled;
    const next: DiffView = {
        ...current,
        ...solved,
        found: [...current.found, id],
        hint: null,
        misses: 0,
        miss: null,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

export function diffResult(final: DiffView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return { score: final.score, durationSec, correct, total, prompted: Math.min(final.promptedCount, total - correct) };
}

// ── Monitor ───────────────────────────────────────────────────────────────────

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeDiffMonitor(state: Partial<DiffView> | null | undefined): DiffView {
    const base = emptyDiffView(1);
    if (!state) return base;
    const scene = getDiffScene(state.scene);
    const known = (id: unknown): id is string => typeof id === "string" && getDifference(scene, id) !== undefined;
    const diffs: PickedDiff[] = [];
    if (scene && Array.isArray(state.diffs)) {
        for (const raw of state.diffs as unknown[]) {
            const d = raw as Partial<PickedDiff> | null;
            if (d && known(d.id) && (d.side === "a" || d.side === "b") && !diffs.some((x) => x.id === d.id)) diffs.push({ id: d.id, side: d.side });
        }
    }
    const ids = diffs.map((d) => d.id);
    const list = (value: unknown) => (Array.isArray(value) ? Array.from(new Set(value.filter((id): id is string => typeof id === "string" && ids.includes(id)))) : []);
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const miss = state.miss && typeof state.miss === "object" ? (state.miss as Partial<NonNullable<DiffView["miss"]>>) : null;
    const coord = (v: unknown, max: number) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        picture: toCount(state.picture, 0),
        scene: scene ? scene.id : "",
        diffs,
        found: list(state.found),
        hint: typeof state.hint === "string" && ids.includes(state.hint) ? state.hint : null,
        hinted: list(state.hinted),
        misses: toCount(state.misses, 0),
        miss: miss && coord(miss.x, 240) && coord(miss.y, 160) ? { x: miss.x as number, y: miss.y as number, n: toCount(miss.n, 0) } : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
    };
}
