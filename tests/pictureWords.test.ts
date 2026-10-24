// Slika mora da pokaže tačno ono što piše u tekstu: ko, šta radi i sa čim.
//
// Tabela ispod povezuje ključne reči iz tekstova (glagole i predmete) sa onim što slika mora da
// ima: položaj lika (jede, mazi, trči…), predmet (sladoled, lopta, krevet…), izraz lica, odeću,
// odraslu osobu ili pozadinu. Proverava se svaki tekst iz igara „Emocije”, „Šta reći?” i
// „Socijalne priče” (i naslovne strane priča). Kad tekst pominje nešto što se namerno ne crta
// (pitanje čiji je odgovor to, nešto što se desilo ranije), izuzetak stoji u spisku sa razlogom.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allScenarios } from "@/app/components/games/data/emotionScenarios";
import { EMOTION_SCENES } from "@/app/components/games/data/emotionScenes";
import { socialScene } from "@/app/components/games/data/socialScenes";
import { getSituationsForLevel } from "@/app/components/games/data/socialSituations";
import { storyForLevel } from "@/app/components/games/data/socialStories";
import { storyScene } from "@/app/components/games/data/storyScenes";
import { isFigure, isInset, isProp, type BackgroundId, type Face, type PoseId, type PropId, type SceneSpec, type ViewId, type WearId } from "@/app/components/games/scene/types";

/** Šta sve slika ima (i u krugovima misli) */
interface Drawn {
    poses: Set<PoseId>;
    props: Set<PropId>;
    held: Set<PropId>;
    faces: Set<Face>;
    wear: Set<WearId>;
    figures: Set<string>;
    backgrounds: Set<BackgroundId>;
    views: Set<ViewId>;
}

function drawn(spec: SceneSpec, into?: Drawn): Drawn {
    const d: Drawn = into ?? { poses: new Set(), props: new Set(), held: new Set(), faces: new Set(), wear: new Set(), figures: new Set(), backgrounds: new Set(), views: new Set() };
    d.backgrounds.add(spec.bg);
    if (spec.view) d.views.add(spec.view);
    for (const item of spec.items) {
        if (isProp(item)) d.props.add(item.prop);
        if (isFigure(item)) {
            d.figures.add(item.fig);
            d.poses.add(item.pose ?? "stand");
            if (item.face) d.faces.add(item.face);
            for (const w of item.wear ?? []) d.wear.add(w);
            if (item.hold) {
                d.props.add(item.hold.prop);
                d.held.add(item.hold.prop);
            }
        }
        if (isInset(item)) drawn(item.inset, d);
    }
    return d;
}

/** Jedna mogućnost: sve navedeno mora da postoji (u svakoj grupi bar jedno) */
interface Need {
    pose?: PoseId[];
    props?: PropId[][];
    held?: PropId[];
    face?: Face[];
    wear?: WearId[];
    fig?: string[];
    bg?: BackgroundId[];
    view?: ViewId[];
}

function satisfied(need: Need, d: Drawn): boolean {
    const any = <T,>(list: readonly T[] | undefined, set: Set<T>) => !list || list.some((value) => set.has(value));
    return (
        any(need.pose, d.poses) &&
        (need.props ?? []).every((group) => group.some((prop) => d.props.has(prop))) &&
        any(need.held, d.held) &&
        any(need.face, d.faces) &&
        any(need.wear, d.wear) &&
        any(need.fig, d.figures) &&
        any(need.bg, d.backgrounds) &&
        any(need.view, d.views)
    );
}

const FOOD: PropId[] = ["iceCream", "cone", "cake", "cookie", "sandwich", "chocolate", "watermelon", "apple", "bread", "pancakes", "soup", "plate", "sweets", "lollipop", "cheese", "bowlEmpty"];
const DRINK: PropId[] = ["glass", "cup", "juiceBox", "milk", "bottle", "syrup"];
const ANIMAL: PropId[] = ["cat", "dog", "bigDog", "poodle", "rabbit"];

interface Rule {
    /** Šta pravilo proverava (za poruku) */
    what: string;
    /** Cele reči iz teksta (mala slova) */
    words: string[];
    /** Bar jedna mogućnost mora da važi */
    anyOf: Need[];
}

const RULES: Rule[] = [
    // Radnje
    { what: "liže → sladoled kod usta (ili pas liže ruku koju lik mazi)", words: ["liže", "ližem", "ližu"], anyOf: [{ pose: ["eat"], props: [["iceCream", "lollipop"]] }, { pose: ["pet"], props: [["dog"]] }] },
    {
        what: "jede → hrana kod usta, ili pribor i hrana, ili hrana u ruci",
        words: ["jede", "jedu", "jedem", "jedemo", "ješ", "pojeo", "pojela"],
        anyOf: [{ pose: ["eat", "sitEat"], props: [FOOD] }, { props: [["fork", "spoon"], FOOD] }, { held: FOOD }],
    },
    { what: "pije → piće kod usta ili na slici", words: ["pije", "pijem", "piješ", "popiješ", "popije", "pijemo"], anyOf: [{ pose: ["drink"] }, { props: [DRINK] }] },
    { what: "mazi → ruka na životinji", words: ["mazi", "mazim", "mazimo", "maze"], anyOf: [{ pose: ["pet"], props: [ANIMAL] }] },
    { what: "grli / zagrljaj → zagrljaj", words: ["zagrli", "zagrljaj", "zagrlim", "grli", "grlimo"], anyOf: [{ pose: ["embrace", "hug"] }] },
    { what: "pao → sedi na zemlji", words: ["pao", "pala", "padne", "padnem"], anyOf: [{ pose: ["knee", "floor"] }] },
    { what: "plače → suze", words: ["plače", "plačem", "plaču"], anyOf: [{ face: ["cry", "sad"] }] },
    { what: "spava → spava (ili spava pas)", words: ["spava", "spavaju", "spavam", "spavamo"], anyOf: [{ face: ["sleep"] }, { pose: ["lie"] }, { props: [["zzz"]] }] },
    { what: "trči → trči", words: ["trči", "trčim", "trče", "trčiš", "trčimo"], anyOf: [{ pose: ["run"] }, { props: [["bigDog", "motion", "motionLeft"]] }] },
    { what: "šutira → šutira loptu", words: ["šutira", "šutiram", "šutne"], anyOf: [{ pose: ["kick"], props: [["ball"]] }] },
    { what: "pere zube / ruke → četkica kod usta ili ruke pod vodom", words: ["operem", "perem", "peremo"], anyOf: [{ pose: ["brush"], props: [["toothbrush"]] }, { pose: ["wash"] }] },
    { what: "maše / mahne → ruka mahne (ili pas maše repom)", words: ["maše", "mahne", "mahnem", "mašem"], anyOf: [{ pose: ["wave"] }, { props: [["dog"]] }] },
    { what: "pokaže → pokazuje rukom ili drži ono što pokazuje", words: ["pokaže", "pokazuje", "pokazala", "pokazao", "pokažem"], anyOf: [{ pose: ["point", "belly"] }, { held: ["drawing", "ticket"] }] },
    { what: "čita → knjiga", words: ["čita", "čitam", "čitaju", "čitamo"], anyOf: [{ props: [["book", "bookOpen"]] }] },
    { what: "crta → crtež, papir ili olovka", words: ["crta", "crtam", "crtaš", "crtamo", "nacrtao", "nacrtala"], anyOf: [{ props: [["drawing", "paper", "pencil", "crayons", "paints", "drawingScribbled"]] }] },
    { what: "seče → makaze", words: ["sečem", "sečemo", "seče"], anyOf: [{ props: [["scissors"]] }] },
    { what: "pliva → pliva", words: ["pliva", "plivam", "preplivao", "preplivala", "plivaju"], anyOf: [{ pose: ["swim"] }] },
    { what: "pertle → vezuje pertle", words: ["pertle"], anyOf: [{ pose: ["sitTie"] }] },
    { what: "zalila → kanta za zalivanje", words: ["zalila", "zalio", "zalivam"], anyOf: [{ held: ["wateringCan"] }] },
    { what: "sipao → sipa iz flaše ili tetrapaka", words: ["sipao", "sipala", "sipam"], anyOf: [{ held: ["milk", "bottle", "juiceBox"] }] },
    {
        what: "sedi → lik sedi (na stolici, klupi, podu, biciklu)",
        words: ["sedi", "sedim", "sede", "sedimo", "sednem"],
        anyOf: [{ pose: ["sit", "sitHold", "sitReach", "sitEat", "sitDraw", "sitTie", "floor", "knee", "ride"] }],
    },
    { what: "leži → leži", words: ["leži", "ležim", "leže"], anyOf: [{ pose: ["lie"] }, { props: [["dogBed"]] }] },
    { what: "piše → olovka i papir", words: ["piše", "pišem", "pišeš", "napiše", "napišem"], anyOf: [{ props: [["pencil"], ["paper", "letters"]] }] },
    { what: "penje se → penjalica ili tobogan", words: ["penjem", "popela", "popeo", "penje"], anyOf: [{ props: [["climber", "slide", "poolSlide"]] }] },
    { what: "ljulja / ljuljaška → ljuljaška", words: ["ljulja", "ljuljašci", "ljuljašku", "ljuljaške", "ljuljaška"], anyOf: [{ props: [["swing"]] }] },
    { what: "tobogan → tobogan", words: ["tobogan", "toboganu", "tobogana"], anyOf: [{ props: [["slide", "poolSlide"]] }] },
    { what: "vozi bicikl → bicikl", words: ["bicikl"], anyOf: [{ props: [["bicycle", "bicycleSmall"]] }] },
    // Predmeti i životinje
    { what: "poklon → poklon (ili otvoren poklon)", words: ["poklon", "poklona", "poklonu"], anyOf: [{ props: [["gift", "wrapper", "boxOpen"]] }] },
    { what: "sladoled → sladoled", words: ["sladoled", "sladoleda"], anyOf: [{ props: [["iceCream", "iceCreamDropped", "cone", "iceCreamStand"]] }] },
    { what: "balon → balon", words: ["balon", "balona", "baloni"], anyOf: [{ props: [["balloon", "balloons", "burst"]] }] },
    { what: "torta → torta", words: ["torta", "tortu", "torte"], anyOf: [{ props: [["cake"]] }] },
    { what: "pas / kuče → pas", words: ["pas", "psa", "psom", "kuče", "kucom", "kuca", "žuća"], anyOf: [{ props: [["dog", "bigDog", "poodle"]] }] },
    { what: "maca → maca", words: ["maca", "macu", "mače"], anyOf: [{ props: [["cat"]] }] },
    { what: "lopta → lopta", words: ["lopta", "loptu", "loptom"], anyOf: [{ props: [["ball"]] }] },
    { what: "Sneško → Sneško (ili ono što je od njega ostalo)", words: ["sneška", "sneško"], anyOf: [{ props: [["snowman", "carrot"]] }] },
    { what: "krevet → krevet", words: ["krevet", "krevetu", "kreveta"], anyOf: [{ props: [["bed"]] }] },
    { what: "slagalica → slagalica", words: ["slagalica", "slagalicu"], anyOf: [{ props: [["puzzle", "puzzlePieces"]] }] },
    { what: "kocke → kocke", words: ["kocaka", "kocke"], anyOf: [{ props: [["blocks", "blocksFallen"]] }] },
    { what: "jakna → jakna", words: ["jakna", "jaknu", "jakni"], anyOf: [{ wear: ["jacket"] }] },
    { what: "flaster → flaster", words: ["flaster"], anyOf: [{ wear: ["plaster"] }, { props: [["plaster"]] }] },
    { what: "naočare → naočare", words: ["naočare", "naočara"], anyOf: [{ wear: ["glasses"] }, { props: [["glasses"]] }] },
    { what: "telefon → telefon", words: ["telefon"], anyOf: [{ props: [["phone"]] }] },
    { what: "pčela → pčela", words: ["pčela"], anyOf: [{ props: [["bee"]] }] },
    { what: "pauk → pauk", words: ["pauk"], anyOf: [{ props: [["spider"]] }] },
    { what: "žaba → žaba", words: ["žaba"], anyOf: [{ props: [["frog"]] }] },
    { what: "veverica → veverica", words: ["veverica"], anyOf: [{ props: [["squirrel"]] }] },
    { what: "leptir → leptir", words: ["leptir"], anyOf: [{ props: [["butterfly"]] }] },
    { what: "zec → zec", words: ["zeca"], anyOf: [{ props: [["rabbit"]] }, { held: ["rabbit"] }] },
    // Ljudi i mesta
    { what: "doktor → doktor", words: ["doktor", "doktora", "doktoru"], anyOf: [{ fig: ["doctor"] }] },
    { what: "zubar → zubar ili zubarska stolica", words: ["zubar", "zubara", "zubaru"], anyOf: [{ fig: ["dentist"] }, { props: [["dentistChair"]] }] },
    { what: "baka → baka", words: ["baka", "baku", "bake", "baki", "bakom"], anyOf: [{ fig: ["baka"] }] },
    { what: "mama → mama", words: ["mama", "mamu", "mami", "mame", "mamom"], anyOf: [{ fig: ["mama"] }] },
    { what: "vatrogasci → vatrogasci ili kamion", words: ["vatrogasni", "vatrogasci", "vatrogasce"], anyOf: [{ fig: ["firefighter"] }, { props: [["fireTruck"]] }] },
    { what: "bazen → bazen", words: ["bazen", "bazenu", "bazena"], anyOf: [{ bg: ["pool"] }] },
    { what: "more → plaža", words: ["more", "moru"], anyOf: [{ bg: ["beach"] }] },
    { what: "park → park ili igralište", words: ["park", "parku", "parkom"], anyOf: [{ bg: ["park", "playground"] }] },
    { what: "kiša → kiša (ili bara kad je stala)", words: ["kiša", "kiše"], anyOf: [{ view: ["rain", "storm"] }, { props: [["rainDrops", "rainCloud", "puddle"]] }] },
    { what: "sneg → sneg", words: ["sneg", "snega", "snegu"], anyOf: [{ bg: ["snow"] }, { view: ["snow"] }, { props: [["snowflakes"]] }] },
    { what: "mrak → noć ili mrak", words: ["mrak", "mraku", "mraka"], anyOf: [{ view: ["night", "dark", "stars", "dusk"] }] },
];

/** Reč se pominje, ali se namerno ne crta (sa razlogom) */
const EXCEPTIONS: Record<string, string> = {
    "emocije 263: mama → mama": "Amar ne vidi mamu — zato je nema na slici.",
    "emocije 364: mama → mama": "Amar spava bez mame i tate.",
    "priča 1/1: mama → mama": "Mamu i tatu čujem iz kuhinje; na slici su zvučni talasi kroz vrata.",
    "priča 3/1: jede → hrana kod usta, ili pribor i hrana, ili hrana u ruci": "„Zubima jedem” — stranica je o pranju zuba.",
    "priča 6/2: doktor → doktor": "Čekamo doktora u čekaonici; on je u svojoj sobi.",
    "priča 10/3: mazi → ruka na životinji": "Ne znam da li pas voli da ga maze — dete ga ne mazi.",
    "priča 11/4: ljulja / ljuljaška → ljuljaška": "Voz se ljulja; nije reč o ljuljašci.",
    "priča 11/1: piše → olovka i papir": "„Na tabli piše” — natpis na stanici, niko ne piše.",
    "priča 12/2: doktor → doktor": "Doktor kasni — zato ga nema.",
    "priča 12/5: doktor → doktor": "Doktor je to rekao ranije; dete je kod kuće.",
    "priča 14/1: bazen → bazen": "Stranica je o svlačionici i tušu pre bazena.",
    "priča 15/6: pije → piće kod usta ili na slici": "Mama pita šta želim da popijem — odgovor (čaj) se ne crta.",
};

interface Page {
    where: string;
    text: string;
    spec: SceneSpec;
}

const PAGES: Page[] = [
    ...allScenarios().map((s) => ({ where: `emocije ${s.id}`, text: s.text, spec: EMOTION_SCENES[s.id] })),
    ...Array.from({ length: 15 }, (_, i) => getSituationsForLevel(i + 1))
        .flat()
        .filter((s) => s.id <= 15 || s.id > 45)
        .map((s) => ({ where: `šta reći ${s.id}`, text: `${s.model} ${s.text}`, spec: socialScene(s.id)!.scene })),
    ...Array.from({ length: 15 }, (_, i) => {
        const story = storyForLevel(i + 1);
        return [
            { where: `priča ${i + 1}/naslovna`, text: story.intro, spec: storyScene(i + 1, "cover")! },
            ...story.steps.map((step, j) => ({ where: `priča ${i + 1}/${j + 1}`, text: step.text, spec: storyScene(i + 1, j)! })),
        ];
    }).flat(),
];

function words(text: string): Set<string> {
    // Oblik {muški|ženski} daje obe reči; navodnici i interpunkcija se ne broje
    return new Set((text.toLocaleLowerCase("sr").match(/\p{L}+/gu) ?? []) as string[]);
}

describe("pictures show what the text says", () => {
    it("has a picture for every text", () => {
        for (const page of PAGES) assert.ok(page.spec, `${page.where}: nema slike`);
    });

    it("draws the action and the object named by every key word", () => {
        const problems: string[] = [];
        const used = new Set<string>();
        for (const page of PAGES) {
            const tokens = words(page.text);
            const d = drawn(page.spec);
            for (const rule of RULES) {
                if (!rule.words.some((word) => tokens.has(word))) continue;
                const key = `${page.where}: ${rule.what}`;
                if (Object.hasOwn(EXCEPTIONS, key)) {
                    used.add(key);
                    continue;
                }
                if (!rule.anyOf.some((need) => satisfied(need, d))) problems.push(`${key} — „${page.text}”`);
            }
        }
        assert.deepEqual(problems, []);
        // Izuzetak koji više ništa ne pokriva treba obrisati
        const stale = Object.keys(EXCEPTIONS).filter((key) => !used.has(key));
        assert.deepEqual(stale, []);
    });

    it("knows every key word only once, so a word maps to one picture rule", () => {
        const seen = new Map<string, string>();
        for (const rule of RULES) {
            for (const word of rule.words) {
                assert.ok(!seen.has(word), `„${word}” je i u „${seen.get(word)}” i u „${rule.what}”`);
                seen.set(word, rule.what);
            }
        }
    });
});
