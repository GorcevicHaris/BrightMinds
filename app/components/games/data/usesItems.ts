// Sadržaj igre „Čemu služi?”: dete čuje pitanje („Čime pišemo?”) i bira pravu sliku.
//
// To je „slušalačko reagovanje po funkciji, osobini i vrsti” (LRFFC iz VB-MAPP-a, „izbor po
// funkciji” iz ABLLS-R): dete prepoznaje predmet po tome čemu služi ili kakav je, a ne po
// nazivu. Napredovanje prati isti program: prvo funkcije svakodnevnih predmeta (2–3 slike),
// pa delovi tela i manje česti predmeti, pa osobine životinja i stvari (4 slike), pa sve izmešano.
//
// Pravila pisanja:
//  • Svaki predmet je u jednoj GRUPI; ostale slike u zadatku su iz iste grupe. Pitanje u grupi
//    ima samo jedan tačan odgovor — ako bi i neki drugi predmet iz grupe mogao da odgovara
//    (zubi i usta za „Čime grizemo?”), on je u `alsoFits` i nikad se ne nudi uz to pitanje.
//  • `answer` je cela rečenica sa pravim padežom (instrumental: olovkom, makazama, ušima;
//    akuzativ: loptu, kapu) i rečcom na drugom mestu („Sijalica nam daje…”, „Kupamo se…”).
//  • `name` je nominativ za natpis i za „To je … / To su …” (`plural` za makaze, oči, zube…).
//  • Slika je crtež iz zajedničkog kompleta slika (pictures/), ne emodži: emodži je na svakom
//    uređaju drugačiji (negde siv ili ga nema) — test proverava da svaki predmet ima svoju sliku.

import type { BaseView } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { toCount } from "@/app/components/games/kit/utils";
import type { PictureId } from "@/app/components/games/pictures";

export type UseGroup = "home" | "body" | "things" | "animals" | "world";

export interface UseItem {
    id: string;
    /** Slika (zajednički komplet slika) */
    pic: PictureId;
    /** Nominativ, velikim početnim slovom (natpis na kartici) */
    name: string;
    /** Množina („To su makaze.”) */
    plural?: boolean;
    group: UseGroup;
    /** Pitanje koje glas postavlja */
    question: string;
    /** Odgovor posle tačnog izbora */
    answer: string;
    /** Predmeti iz iste grupe koji bi takođe mogli da odgovaraju — ne nude se uz ovo pitanje */
    alsoFits?: readonly string[];
}

const u = (id: string, pic: PictureId, name: string, group: UseGroup, question: string, answer: string, extra: Partial<Pick<UseItem, "plural" | "alsoFits">> = {}): UseItem => ({
    id,
    pic,
    name,
    group,
    question,
    answer,
    ...extra,
});

export const USE_ITEMS: readonly UseItem[] = [
    // Kuća (lako): predmeti koje dete svaki dan koristi
    u("spoon", "spoon", "Kašika", "home", "Čime jedemo supu?", "Supu jedemo kašikom."),
    u("pencil", "pencil", "Olovka", "home", "Čime pišemo?", "Pišemo olovkom."),
    u("scissors", "scissors", "Makaze", "home", "Čime sečemo papir?", "Papir sečemo makazama.", { plural: true }),
    u("soap", "soap", "Sapun", "home", "Čime peremo ruke?", "Ruke peremo sapunom."),
    u("key", "key", "Ključ", "home", "Šta stavljamo u bravu da otvorimo vrata?", "Ključ stavljamo u bravu."),
    u("umbrella", "umbrella", "Kišobran", "home", "Šta nas čuva od kiše?", "Kišobran nas čuva od kiše."),
    u("bed", "bed", "Krevet", "home", "Na čemu spavamo?", "Spavamo na krevetu."),
    u("glass", "glass", "Čaša", "home", "Iz čega pijemo vodu?", "Vodu pijemo iz čaše."),
    u("broom", "broom", "Metla", "home", "Čime čistimo pod?", "Pod čistimo metlom."),
    u("phone", "phone", "Telefon", "home", "Čime zovemo baku?", "Baku zovemo telefonom."),
    u("ball", "ball", "Lopta", "home", "Šta šutiramo nogom?", "Loptu šutiramo nogom."),
    u("fork", "fork", "Viljuška", "home", "Čime nabadamo hranu?", "Hranu nabadamo viljuškom."),
    u("lamp", "bulb", "Sijalica", "home", "Šta nam daje svetlo u mraku?", "Sijalica nam daje svetlo."),

    // Delovi tela (srednje)
    u("eyes", "eyes", "Oči", "body", "Čime gledamo?", "Gledamo očima.", { plural: true }),
    u("ear", "ear", "Uvo", "body", "Čime slušamo?", "Slušamo ušima."),
    u("nose", "nose", "Nos", "body", "Čime mirišemo cveće?", "Cveće mirišemo nosom."),
    u("mouth", "mouth", "Usta", "body", "Čime pričamo?", "Pričamo ustima.", { plural: true }),
    u("hand", "hand", "Ruka", "body", "Čime mašemo kad se pozdravljamo?", "Mašemo rukom."),
    u("leg", "leg", "Noga", "body", "Čime šutiramo loptu?", "Loptu šutiramo nogom."),
    u("teeth", "teeth", "Zubi", "body", "Čime grizemo jabuku?", "Jabuku grizemo zubima.", { plural: true, alsoFits: ["mouth"] }),
    u("tongue", "tongue", "Jezik", "body", "Čime ližemo sladoled?", "Sladoled ližemo jezikom.", { alsoFits: ["mouth"] }),

    // Stvari (srednje): manje česti predmeti iz kuće, odeća
    u("backpack", "backpack", "Ranac", "things", "Šta nosimo na leđima u školu?", "Ranac nosimo na leđima."),
    u("alarm", "alarm", "Budilnik", "things", "Šta zvoni ujutru da ustanemo?", "Budilnik zvoni ujutru."),
    u("bathtub", "bathtub", "Kada", "things", "U čemu se kupamo?", "Kupamo se u kadi."),
    u("glasses", "glasses", "Naočare", "things", "Šta nam pomaže da bolje vidimo?", "Naočare nam pomažu da bolje vidimo.", { plural: true }),
    u("sneakers", "sneakers", "Patike", "things", "Šta obuvamo na noge?", "Patike obuvamo na noge.", { plural: true }),
    u("gloves", "gloves", "Rukavice", "things", "Šta zimi navlačimo na šake?", "Zimi na šake navlačimo rukavice.", { plural: true }),
    u("cap", "cap", "Kapa", "things", "Šta stavljamo na glavu?", "Kapu stavljamo na glavu."),
    u("bin", "bin", "Kanta", "things", "Gde bacamo smeće?", "Smeće bacamo u kantu."),
    u("thermometer", "thermometer", "Toplomer", "things", "Čime merimo temperaturu?", "Temperaturu merimo toplomerom."),
    u("brush", "paintbrush", "Četkica", "things", "Čime slikamo bojama?", "Slikamo četkicom."),
    u("book", "bookOpen", "Knjiga", "things", "Šta čitamo?", "Čitamo knjigu."),
    u("hammer", "hammer", "Čekić", "things", "Čime zakucavamo ekser?", "Ekser zakucavamo čekićem."),
    u("crayons", "crayons", "Bojice", "things", "Čime crtamo šarene crteže?", "Šarene crteže crtamo bojicama.", { plural: true, alsoFits: ["brush"] }),
    u("scarf", "scarf", "Šal", "things", "Šta nosimo oko vrata kad je hladno?", "Oko vrata nosimo šal."),

    // Životinje (teško): po osobini
    u("elephant", "elephant", "Slon", "animals", "Ko ima surlu?", "Slon ima surlu."),
    u("giraffe", "giraffe", "Žirafa", "animals", "Ko ima dugačak vrat?", "Žirafa ima dugačak vrat."),
    u("hedgehog", "hedgehog", "Jež", "animals", "Ko ima bodlje?", "Jež ima bodlje."),
    u("rabbit", "rabbit", "Zec", "animals", "Ko ima duge uši?", "Zec ima duge uši."),
    u("bird", "bird", "Ptica", "animals", "Ko ima perje?", "Ptica ima perje."),
    u("fish", "fish", "Riba", "animals", "Ko ima peraja i pliva?", "Riba ima peraja i pliva."),
    u("turtle", "turtle", "Kornjača", "animals", "Ko nosi oklop na leđima?", "Kornjača nosi oklop na leđima."),
    u("cow", "cow", "Krava", "animals", "Ko nam daje mleko?", "Krava nam daje mleko."),
    u("bee", "bee", "Pčela", "animals", "Ko pravi med?", "Pčela pravi med."),
    u("frog", "frog", "Žaba", "animals", "Ko skače i kreketa u bari?", "Žaba skače i kreketa u bari."),
    u("spider", "spider", "Pauk", "animals", "Ko plete mrežu?", "Pauk plete mrežu."),

    // Priroda i prevoz (teško): po osobini i funkciji
    u("bicycle", "bicycle", "Bicikl", "world", "Šta ima pedale?", "Bicikl ima pedale."),
    u("boat", "boat", "Brod", "world", "Šta plovi po moru?", "Brod plovi po moru."),
    u("plane", "plane", "Avion", "world", "Šta leti visoko na nebu?", "Avion leti visoko na nebu."),
    u("guitar", "guitar", "Gitara", "world", "Šta ima žice?", "Gitara ima žice."),
    u("magnifier", "magnifier", "Lupa", "world", "Šta povećava sitne stvari?", "Lupa povećava sitne stvari."),
    u("sun", "sunFace", "Sunce", "world", "Šta sija danju i greje nas?", "Sunce sija danju i greje nas."),
    u("moon", "moon", "Mesec", "world", "Šta svetli na nebu noću?", "Mesec svetli na nebu noću."),
    u("rainbow", "rainbow", "Duga", "world", "Šta je šareno i vidi se posle kiše?", "Duga se vidi posle kiše."),
    u("snowman", "snowman", "Sneško", "world", "Šta pravimo od snega?", "Od snega pravimo Sneška."),
    u("train", "train", "Voz", "world", "Šta ide po šinama?", "Voz ide po šinama."),
    u("rocket", "rocket", "Raketa", "world", "Šta leti u svemir?", "Raketa leti u svemir.", { alsoFits: ["plane"] }),
];

/** Natpis i odgovor posle pogrešnog izbora: „To je kapa.” / „To su makaze.” */
export function itIs(item: UseItem): string {
    return `To ${item.plural ? "su" : "je"} ${item.name.toLocaleLowerCase("sr")}.`;
}

export function getUseItem(id: unknown): UseItem | undefined {
    return USE_ITEMS.find((item) => item.id === id);
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

interface LevelRule {
    first: number;
    last: number;
    groups: readonly UseGroup[];
    /** Broj slika u zadatku */
    choices: number;
    rounds: number;
}

const RULES: readonly LevelRule[] = [
    // Lako: svakodnevni predmeti, dve pa tri slike
    { first: 1, last: 2, groups: ["home"], choices: 2, rounds: 5 },
    { first: 3, last: 5, groups: ["home"], choices: 3, rounds: 5 },
    // Srednje: delovi tela, pa manje česti predmeti, pa četiri slike
    { first: 6, last: 7, groups: ["body"], choices: 3, rounds: 6 },
    { first: 8, last: 8, groups: ["things"], choices: 3, rounds: 6 },
    { first: 9, last: 10, groups: ["body", "things"], choices: 4, rounds: 6 },
    // Teško: osobine životinja i stvari, pa sve izmešano
    { first: 11, last: 11, groups: ["animals"], choices: 4, rounds: 8 },
    { first: 12, last: 12, groups: ["world"], choices: 4, rounds: 8 },
    { first: 13, last: 13, groups: ["animals", "world"], choices: 4, rounds: 8 },
    { first: 14, last: 15, groups: ["home", "body", "things", "animals", "world"], choices: 4, rounds: 8 },
];

export const USES_MAX_LEVEL = 15;

export interface UsesRound {
    /** Predmet koji je odgovor (njegovo pitanje se postavlja) */
    itemId: string;
    /** Slike na ekranu, redom (jedna je `itemId`) */
    choices: string[];
}

export function usesRule(level: number): LevelRule {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), USES_MAX_LEVEL);
    return RULES.find((rule) => safe >= rule.first && safe <= rule.last) ?? RULES[0];
}

/**
 * Zadaci jednog nivoa. `random` daje broj u [0, 1) (igra koristi Math.random, testovi stalan niz).
 * `maxChoices` i `maxRounds` dolaze iz podešavanja uzrasta. Svako pitanje se u nivou postavlja
 * jednom; kad nivo ima više grupa, grupe se smenjuju; ostale slike su iz iste grupe.
 */
export function buildUsesLevel(level: number, { maxChoices, maxRounds, random = Math.random }: { maxChoices: number; maxRounds: number; random?: () => number }): UsesRound[] {
    const rule = usesRule(level);
    const choiceCount = Math.max(2, Math.min(rule.choices, Number.isFinite(maxChoices) ? maxChoices : rule.choices));
    const roundCount = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    const shuffle = <T,>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };

    const pools = shuffle(rule.groups).map((group) => shuffle(USE_ITEMS.filter((item) => item.group === group)));
    const rounds: UsesRound[] = [];
    for (let i = 0; rounds.length < roundCount && i < roundCount * pools.length + pools.length; i += 1) {
        const pool = pools[i % pools.length];
        const item = pool.shift();
        if (!item) continue;
        const distractors = shuffle(USE_ITEMS.filter((other) => other.group === item.group && other.id !== item.id && !item.alsoFits?.includes(other.id) && !other.alsoFits?.includes(item.id)));
        rounds.push({ itemId: item.id, choices: shuffle([item.id, ...distractors.slice(0, choiceCount - 1).map((other) => other.id)]) });
    }
    return rounds;
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface UsesView extends BaseView {
    /** Predmet koji je odgovor (njegovo pitanje se postavlja) */
    itemId: string;
    /** Slike na ekranu, redom */
    choices: string[];
    /** Slike probane pogrešno u ovom zadatku */
    wrong: string[];
    /** Poslednja dodirnuta slika dok traje povratna poruka */
    picked: string | null;
    feedback: FeedbackKind;
    hint: boolean;
    promptedCount: number;
}

export function emptyUsesView(totalRounds: number): UsesView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        itemId: "",
        choices: [],
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
    };
}

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeUsesMonitor(state: Partial<UsesView> | null | undefined): UsesView {
    const base = emptyUsesView(1);
    if (!state) return base;
    const choices = Array.isArray(state.choices) ? Array.from(new Set(state.choices.filter((id): id is string => getUseItem(id) !== undefined))) : [];
    const item = getUseItem(state.itemId);
    const valid = item !== undefined && choices.includes(item.id);
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        itemId: valid ? item.id : "",
        choices: valid ? choices : [],
        wrong: valid && Array.isArray(state.wrong) ? state.wrong.filter((id) => choices.includes(id) && id !== item.id) : [],
        picked: valid ? (choices.find((id) => id === state.picked) ?? null) : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
    };
}

