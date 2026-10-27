// Sadržaj igre „Operi ruke i zube”: svakodnevne navike korak po korak.
//
// Zašto ovako (istraživanje i praksa rane podrške):
//  • Rutine svakodnevnog života (pranje ruku i zuba) deca uče lančanjem: korak po korak, uvek
//    istim redom, uz vizuelni raspored „prvo — zatim” (TEACCH, PECS rasporedi). Zato se vidi
//    traka koraka: na lakim nivoima sledeći korak svetli (model), na srednjim je umesto njega
//    „?”, a na teškim trake nema — dete se seća samo (pomoć bledi).
//  • Na slici je dete samo (dečak ili devojčica, po profilu): deca sa autizmom lakše prenesu
//    naviku kad vide sebe kako je izvode (samomodelovanje). Rečenice su u prvom licu množine
//    („Pokvasimo ruke.”), kao kad roditelj radi zajedno sa detetom.
//  • Ruke se trljaju bar 20 sekundi (preporuka SZO i zdravstvenih službi): trljanje je mirna,
//    stvarna radnja u igri — mehurići rastu dok se broji. Na lakim nivoima do 10 (kraće za
//    najmlađe), uz rečenicu da kod kuće trljamo do 20. Nema žurbe: kad dete stane, brojanje čeka.
//  • Greška nije kazna: kaže se mirno zašto taj korak dolazi kasnije („Prvo pokvasimo ruke, pa
//    onda uzmemo sapun.”), a posle podešenog broja promašaja ili čekanja pravi korak zasvetli.
//  • Teški nivoi dodaju „Kada peremo ruke?” (pre jela, posle toaleta, posle maženja psa, kad
//    dođemo spolja) — prenos navike na svakodnevne situacije.
//
// Nivoi:
//   Lako     1–5   pranje ruku (5 koraka), traka sa sledećim korakom, 2 slike, trljanje do 10
//   Srednje  6, 8, 10  pranje zuba (5 koraka); 7, 9 pranje ruku sa zatvaranjem slavine (6 koraka);
//                  traka sa „?”, 3 slike, trljanje i četkanje do 20
//   Teško    11–15 rutina bez trake i 1–3 pitanja „Kada peremo ruke?”, do 4 slike, i slike iz
//                  druge rutine (četkica dok peremo ruke); 13: pitanje pre pranja ruku
// Rutina se nikad ne skraćuje (korak koji fali bi naučio pogrešnu naviku); broj pitanja
// „Kada?” je onoliki koliko još staje u broj zadataka koji je roditelj dozvolio (`maxRounds`).

import type { BaseView } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { toCount } from "@/app/components/games/kit/utils";
import { art, draw, holdP, me, prop, type StepArtSpec } from "@/app/components/games/sequence/art";

export const HYGIENE_MAX_LEVEL = 15;

export type Routine = "hands" | "teeth";
export type StepId = "wet" | "soap" | "scrub" | "rinse" | "tapOff" | "dry" | "paste" | "brush" | "spit" | "cleanBrush" | "putAway";
export type SituationId = "beforeEat" | "afterToilet" | "afterDog" | "fromOutside" | "reading" | "music" | "drawing";

export interface HygieneStep {
    id: StepId;
    routine: Routine;
    /** Natpis na kartici */
    label: string;
    /** Rečenica posle tačnog izbora */
    text: string;
    /** Radnja malim slovom, za „Prvo …, pa onda …” */
    act: string;
    /** Slika posle ovog koraka (sequence/art.ts) */
    scene: (female?: boolean) => StepArtSpec;
}

// ── Slike (krupan kadar lavaboa i deteta; isti crteži kao u igri „Šta je prvo?”) ──

const Y = 182;
const BASIN = draw("basin", 120, 172);
const TAP = draw("tap", 150, 60, { s: 1.2 });
const STREAM = draw("bigStream", 102, 112, { s: 0.9 });
const HANDS = draw("hands", 104, 134, { s: 1.7 });
const BUBBLES = [prop("soapBubbles", 100, 112, { s: 1.6 }), prop("soapBubbles", 130, 108, { s: 1.3 })];

/** Pre prvog koraka: suve ruke iznad lavaboa, slavina zatvorena */
export const HANDS_START = (): StepArtSpec => art("bathroom", [BASIN, TAP, draw("hands", 110, 140, { s: 1.8 }), draw("soap", 196, 130, { s: 1.8 })]);
/** Pre pranja zuba: dete drži četkicu, pasta je na polici */
export const TEETH_START = (): StepArtSpec =>
    art("bathroom", [me(110, Y, { pose: "hold", hold: holdP("toothbrush", { s: 1.1, rot: -20 }), at: [180, 130] }), draw("toothpaste", 186, 138, { s: 2, rot: 10 }), prop("glass", 214, 140, { s: 1.4 })]);

export const STEPS: Record<StepId, HygieneStep> = {
    wet: {
        id: "wet",
        routine: "hands",
        label: "Voda",
        text: "Pustimo vodu i pokvasimo ruke.",
        act: "pokvasimo ruke",
        scene: () => art("bathroom", [BASIN, TAP, STREAM, HANDS, draw("splash", 104, 112, { s: 0.9 })]),
    },
    soap: {
        id: "soap",
        routine: "hands",
        label: "Sapun",
        text: "Uzmemo sapun.",
        act: "uzmemo sapun",
        scene: () => art("bathroom", [BASIN, TAP, draw("hands", 110, 140, { s: 1.8 }), ...BUBBLES, draw("soap", 190, 130, { s: 1.8 })]),
    },
    scrub: {
        id: "scrub",
        routine: "hands",
        label: "Trljanje",
        text: "Trljamo ruke: dlanove, između prstiju i palčeve.",
        act: "istrljamo ruke",
        scene: () =>
            art("bathroom", [BASIN, TAP, draw("hands", 110, 140, { s: 1.8 }), ...BUBBLES, prop("soapBubbles", 84, 138, { s: 1.4 }), prop("soapBubbles", 140, 140, { s: 1.5 }), prop("soapBubbles", 114, 96, { s: 1.2 })]),
    },
    rinse: {
        id: "rinse",
        routine: "hands",
        label: "Ispiranje",
        text: "Isperemo sapun vodom.",
        act: "isperemo sapun",
        scene: () => art("bathroom", [BASIN, TAP, STREAM, HANDS, prop("soapBubbles", 128, 150, { s: 1 }), prop("soapBubbles", 80, 150, { s: 0.8 })]),
    },
    tapOff: {
        id: "tapOff",
        routine: "hands",
        label: "Slavina",
        text: "Zatvorimo slavinu, da voda ne teče uzalud.",
        act: "zatvorimo slavinu",
        scene: () => art("bathroom", [BASIN, TAP, draw("hand", 170, 40, { s: 1.6, rot: -30 }), draw("hands", 104, 140, { s: 1.5 }), prop("sparkle", 70, 110, { s: 0.8 })]),
    },
    dry: {
        id: "dry",
        routine: "hands",
        label: "Peškir",
        text: "Obrišemo ruke peškirom. Ruke su čiste!",
        act: "obrišemo ruke",
        scene: () => art("bathroom", [me(120, Y, { pose: "hold", hold: holdP("towel", { s: 1.3, dy: 30 }), at: [120, 150], face: "happy" }), prop("sparkle", 60, 70, { s: 1 }), prop("sparkle", 186, 60, { s: 0.8 })]),
    },
    paste: {
        id: "paste",
        routine: "teeth",
        label: "Pasta",
        text: "Stavimo malo paste na četkicu.",
        act: "stavimo pastu na četkicu",
        scene: () => art("bathroom", [me(120, Y, { pose: "hold", at: [118, 128] }), draw("brushPaste", 112, 140, { s: 2.2 }), draw("toothpaste", 150, 122, { s: 2, rot: 24 })]),
    },
    brush: {
        id: "brush",
        routine: "teeth",
        label: "Četkanje",
        text: "Četkamo zube: gore, dole i unutra.",
        act: "očetkamo zube",
        scene: () => art("bathroom", [me(120, Y, { pose: "mouth", hold: holdP("toothbrush", { s: 1.2, rot: -30 }), face: "happy" }), prop("soapBubbles", 150, 96, { s: 0.9 })]),
    },
    spit: {
        id: "spit",
        routine: "teeth",
        label: "Čaša vode",
        text: "Ispljunemo pastu i isperemo usta vodom.",
        act: "isperemo usta",
        scene: () => art("bathroom", [me(120, Y, { pose: "mouth", hold: holdP("glass", { s: 1, dx: 2, dy: 13 }) }), prop("sink", 196, 172, { s: 1.4 })]),
    },
    cleanBrush: {
        id: "cleanBrush",
        routine: "teeth",
        label: "Pranje četkice",
        text: "Operemo četkicu pod vodom.",
        act: "operemo četkicu",
        scene: () => art("bathroom", [BASIN, TAP, STREAM, prop("toothbrush", 104, 136, { s: 2.6, rot: -10 }), draw("splash", 104, 112, { s: 0.8 })]),
    },
    putAway: {
        id: "putAway",
        routine: "teeth",
        label: "Na mesto",
        text: "Vratimo četkicu u čašu. Zubi su čisti!",
        act: "vratimo četkicu na mesto",
        scene: () => art("bathroom", [me(110, Y, { face: "happy", at: [190, 120] }), prop("glass", 196, 146, { s: 1.6 }), prop("toothbrush", 200, 118, { s: 1.4, rot: 80 }), prop("sparkle", 150, 70, { s: 1 })]),
    },
};

export const STEP_IDS = Object.keys(STEPS) as StepId[];

export const ROUTINES: Record<"hands5" | "hands6" | "teeth", readonly StepId[]> = {
    hands5: ["wet", "soap", "scrub", "rinse", "dry"],
    hands6: ["wet", "soap", "scrub", "rinse", "tapOff", "dry"],
    teeth: ["paste", "brush", "spit", "cleanBrush", "putAway"],
};
export type RoutineKey = keyof typeof ROUTINES;

export function getStep(id: unknown): HygieneStep | undefined {
    return typeof id === "string" && id in STEPS ? STEPS[id as StepId] : undefined;
}

/** Koraci posle kojih dete trlja ili četka (mirno brojanje) */
export function rubStep(id: StepId): boolean {
    return id === "scrub" || id === "brush";
}

// ── Kada peremo ruke? ─────────────────────────────────────────────────────────

export interface Situation {
    id: SituationId;
    label: string;
    /** true = tada treba oprati ruke */
    wash: boolean;
    /** Objašnjenje (tačno) ili mirna rečenica (pogrešan izbor) */
    text: string;
    scene: StepArtSpec;
}

export const SITUATIONS: Record<SituationId, Situation> = {
    beforeEat: {
        id: "beforeEat",
        label: "Pre jela",
        wash: true,
        text: "Pre jela peremo ruke, da klice ne uđu u stomak.",
        scene: art("kitchen", [me(96, Y, { face: "happy", at: [180, 140] }), prop("table", 176, 214, { s: 1.8 }), prop("soup", 176, 150, { s: 1.3 }), prop("spoon", 200, 150, { s: 0.9 })]),
    },
    afterToilet: {
        id: "afterToilet",
        label: "Posle toaleta",
        wash: true,
        text: "Posle toaleta uvek operemo ruke.",
        scene: art("bathroom", [prop("toilet", 70, 160, { s: 1.6 }), me(150, Y, { pose: "walk", face: "calm", at: [220, 120] })]),
    },
    afterDog: {
        id: "afterDog",
        label: "Posle maženja psa",
        wash: true,
        text: "Posle maženja psa operemo ruke.",
        scene: art("park", [me(96, Y, { pose: "pet", face: "happy" }), prop("dog", 150, 160, { s: 1.6, flip: true }), prop("heart", 150, 70, { s: 0.7 })]),
    },
    fromOutside: {
        id: "fromOutside",
        label: "Kad dođemo spolja",
        wash: true,
        text: "Kad dođemo spolja, prvo operemo ruke.",
        scene: art("hall", [prop("doorOpen", 64, 158, { s: 1.2 }), me(140, Y, { pose: "walk", wear: ["jacket", "backpack"], face: "happy", at: [60, 100] })]),
    },
    reading: {
        id: "reading",
        label: "Dok čitamo",
        wash: false,
        text: "Dok čitamo knjigu, ruke ne moramo da peremo.",
        scene: art("room", [me(120, 168, { pose: "sitHold", hold: holdP("bookOpen", { s: 1.1 }), face: "calm", at: [120, 130] })]),
    },
    music: {
        id: "music",
        label: "Dok slušamo muziku",
        wash: false,
        text: "Dok slušamo muziku, ruke ne moramo da peremo.",
        scene: art("room", [me(120, Y, { wear: ["headphones"], face: "happy" }), prop("notes", 184, 70, { s: 1.1 })]),
    },
    drawing: {
        id: "drawing",
        label: "Dok crtamo",
        wash: false,
        text: "Dok crtamo bojicama, ruke ne moramo da peremo.",
        scene: art("room", [me(120, 168, { pose: "sitHold", hold: holdP("drawing", { s: 1.1 }), face: "happy", at: [120, 130] }), prop("crayons", 190, 150, { s: 1.3 })]),
    },
};

export const SITUATION_IDS = Object.keys(SITUATIONS) as SituationId[];
const WASH_TIMES = SITUATION_IDS.filter((id) => SITUATIONS[id].wash);
const NO_WASH = SITUATION_IDS.filter((id) => !SITUATIONS[id].wash);

export const WHEN_QUESTION = "Kada treba da operemo ruke?";

// ── Nivoi ─────────────────────────────────────────────────────────────────────

export type StripMode = "next" | "mystery" | "none";

export interface LevelRule {
    routine: RoutineKey;
    strip: StripMode;
    choices: number;
    rubTarget: number;
    /** Pitanja „Kada peremo ruke?” (najviše; manje ako ne staju u `maxRounds`) */
    when: number;
    /** Pitanje pre rutine („Pre jela… operimo ruke”) */
    whenFirst: boolean;
    /** Slike iz druge rutine među ponuđenim */
    mixRoutines: boolean;
}

export function hygieneRule(level: number): LevelRule {
    const lv = Math.min(Math.max(Math.round(level), 1), HYGIENE_MAX_LEVEL);
    if (lv <= 5) return { routine: "hands5", strip: "next", choices: 2, rubTarget: 10, when: 0, whenFirst: false, mixRoutines: false };
    if (lv <= 10) return { routine: lv % 2 === 0 ? "teeth" : "hands6", strip: "mystery", choices: 3, rubTarget: 20, when: 0, whenFirst: false, mixRoutines: false };
    const teeth = lv === 12 || lv === 14;
    const when = lv === 11 || lv === 13 ? 1 : lv === 12 || lv === 15 ? 2 : 3;
    return { routine: teeth ? "teeth" : "hands6", strip: "none", choices: 4, rubTarget: 20, when, whenFirst: lv === 13, mixRoutines: true };
}

export type HygieneRound =
    | { kind: "step"; routine: RoutineKey; index: number; step: StepId; choices: StepId[] }
    | { kind: "when"; situation: SituationId; choices: SituationId[] };

function shuffled<T>(list: readonly T[], random: () => number): T[] {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export function buildHygieneLevel(level: number, { maxChoices, maxRounds, random = Math.random }: { maxChoices: number; maxRounds: number; random?: () => number }): HygieneRound[] {
    const rule = hygieneRule(level);
    const count = Math.max(2, Math.min(rule.choices, Math.max(maxChoices, 2)));
    const steps = ROUTINES[rule.routine];
    const routine = STEPS[steps[0]].routine;
    const other = STEP_IDS.filter((id) => STEPS[id].routine !== routine && !rubStep(id));

    const stepRounds: HygieneRound[] = steps.map((step, index) => {
        const later = shuffled(steps.slice(index + 1), random);
        const earlier = shuffled(steps.slice(0, index), random);
        // Prvo koraci koji dolaze kasnije (najčešća greška), pa (na teškim) slika iz druge rutine, pa već urađeni
        const pool = rule.mixRoutines ? [...later.slice(0, Math.max(1, count - 2)), ...shuffled(other, random).slice(0, 1), ...later.slice(Math.max(1, count - 2)), ...earlier] : [...later, ...earlier];
        const distractors = pool.slice(0, count - 1);
        return { kind: "step", routine: rule.routine, index, step, choices: shuffled([step, ...distractors], random) };
    });

    const whenCount = Math.max(0, Math.min(rule.when, Math.max(maxRounds, 2) - steps.length));
    const asks = shuffled(WASH_TIMES, random).slice(0, whenCount);
    const whenRounds: HygieneRound[] = asks.map((situation) => ({
        kind: "when",
        situation,
        choices: shuffled([situation, ...shuffled(NO_WASH, random).slice(0, count - 1)], random),
    }));
    return rule.whenFirst ? [...whenRounds, ...stepRounds] : [...stepRounds, ...whenRounds];
}

// ── Reči ──────────────────────────────────────────────────────────────────────

export function introText(routine: RoutineKey): string {
    return routine === "teeth" ? "Peremo zube, korak po korak." : "Peremo ruke, korak po korak.";
}

export function stepQuestion(index: number): string {
    return index === 0 ? "Šta radimo prvo?" : "Šta je sledeće?";
}

/**
 * Mirno objašnjenje pogrešnog izbora: korak koji dolazi kasnije, korak koji je već urađen, ili
 * predmet iz druge rutine.
 */
export function wrongStepText(routine: RoutineKey, index: number, picked: StepId): string {
    const steps = ROUTINES[routine];
    const correct = STEPS[steps[index]];
    const step = STEPS[picked];
    if (step.routine !== correct.routine) return `${step.label} nam treba kad peremo ${step.routine === "teeth" ? "zube" : "ruke"}. Sada ${routine === "teeth" ? "peremo zube" : "peremo ruke"}.`;
    const at = steps.indexOf(picked);
    if (at >= 0 && at < index) return "To smo već uradili. Šta je sledeće?";
    return `Još ne. Prvo ${correct.act}, pa onda ${step.act}.`;
}

export function wrongWhenText(picked: SituationId): string {
    return `${SITUATIONS[picked].text} Probaj ponovo.`;
}

/** Posle trljanja ili četkanja */
export function rubDoneText(step: StepId, target: number): string {
    if (step === "brush") return target >= 20 ? "Dvadeset! Zubi su čisti. Kod kuće četkamo dva minuta." : "Bravo! Zubi su čisti.";
    return target >= 20 ? "Dvadeset! Sapun je oterao klice." : "Deset! Kod kuće trljamo do dvadeset, dok otpevamo pesmicu.";
}

export function rubPrompt(step: StepId): string {
    return step === "brush" ? "Četkamo zube dok se ne napune svi mehurići." : "Trljamo ruke dok se ne napune svi mehurići.";
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface HygieneView extends BaseView {
    kind: "step" | "when";
    routine: RoutineKey;
    /** Koji korak rutine je na redu (0…); za pitanje „Kada?” broj već završenih koraka */
    index: number;
    /** Tačan odgovor: korak ili situacija */
    answer: string;
    choices: string[];
    wrong: string[];
    picked: string | null;
    feedback: FeedbackKind;
    hint: boolean;
    promptedCount: number;
    strip: StripMode;
    /** Trljanje (četkanje) traje: koliko je mehurića, od koliko */
    rubbing: boolean;
    rub: number;
    rubTarget: number;
}

export function emptyHygieneView(totalRounds: number, rule?: LevelRule): HygieneView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        kind: "step",
        routine: rule?.routine ?? "hands5",
        index: 0,
        answer: "",
        choices: [],
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
        strip: rule?.strip ?? "next",
        rubbing: false,
        rub: 0,
        rubTarget: rule?.rubTarget ?? 10,
    };
}

export function viewForRound(base: HygieneView, round: HygieneRound, roundNo: number): HygieneView {
    const shared = { ...base, round: roundNo, wrong: [], picked: null, feedback: null, hint: false, rubbing: false, rub: 0 };
    if (round.kind === "step") return { ...shared, kind: "step", routine: round.routine, index: round.index, answer: round.step, choices: round.choices };
    return { ...shared, kind: "when", answer: round.situation, choices: round.choices };
}

/** Rezultat nivoa: tačno iz prvog pokušaja (bez pokaznog prvog zadatka), uz pomoć, ukupno */
export function hygieneResult(view: Pick<HygieneView, "score" | "correctCount" | "promptedCount" | "totalRounds">, demo: number, durationSec: number) {
    return {
        score: view.score,
        durationSec,
        correct: view.correctCount,
        total: Math.max(view.totalRounds - demo, 1),
        prompted: view.promptedCount,
    };
}

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeHygieneMonitor(state: Partial<HygieneView> | null | undefined): HygieneView {
    const base = emptyHygieneView(1);
    if (!state) return base;
    const kind = state.kind === "when" ? "when" : "step";
    const routine = state.routine === "hands6" || state.routine === "teeth" ? state.routine : "hands5";
    const steps = ROUTINES[routine];
    const valid = (id: unknown): id is string => (kind === "step" ? getStep(id) !== undefined : typeof id === "string" && id in SITUATIONS);
    const choices = Array.isArray(state.choices) ? Array.from(new Set(state.choices.filter(valid))).slice(0, 6) : [];
    const answer = valid(state.answer) && choices.includes(state.answer) ? state.answer : "";
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const rubTarget = Math.min(Math.max(toCount(state.rubTarget, 10), 1), 20);
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        kind,
        routine,
        index: Math.min(toCount(state.index, 0), steps.length - 1),
        answer,
        choices: answer ? choices : [],
        wrong: answer && Array.isArray(state.wrong) ? state.wrong.filter((id): id is string => typeof id === "string" && choices.includes(id) && id !== answer) : [],
        picked: answer ? (choices.find((id) => id === state.picked) ?? null) : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
        strip: state.strip === "mystery" || state.strip === "none" ? state.strip : "next",
        rubbing: state.rubbing === true && answer !== "" && rubStep(answer as StepId),
        rub: Math.min(toCount(state.rub, 0), rubTarget),
        rubTarget,
    };
}
