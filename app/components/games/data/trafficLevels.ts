// Sadržaj igre „Saobraćaj”: semafor za pešake (crveno — stojimo, zeleno — idemo), čekanje
// zelenog svetla i praznog puta, bezbedni izbori (kaciga, pojas, pešački prelaz, ruka odraslog,
// svetao prsluk noću), koraci prelaska ulice i saobraćajni znakovi. Bez Reacta, da bi se nivoi
// proveravali u testovima; crteži su u games/traffic/.
//
// Zašto ovako (uzrast 4–10, i deca sa autizmom):
//  • Bezbednost u saobraćaju je životna veština koju deca uče rano, a deca sa autizmom često
//    izričito, kroz jasna pravila i slike (vizuelni raspored, socijalne priče). Pravilo se uvek
//    kaže isto: „Crveno — stojimo. Zeleno — idemo.”
//  • Čekanje zelenog svetla vežba kočenje impulsa (inhibiciju), važnu izvršnu funkciju: dete
//    vidi ulicu i semafor, a samo bira kada će krenuti. Nema žurbe ni tajmera — zeleno dolazi
//    ponovo; pokret na crveno se mirno objasni („Crveno je. Čekamo zeleno svetlo.”).
//  • Bezbedan i nebezbedan izbor su uvek ista situacija koja se razlikuje u jednoj stvari
//    (sa kacigom i bez nje), pa dete vidi baš ono što je važno. Nebezbedne slike su mirne —
//    bez nesreće, plača i straha; objašnjenje kaže šta treba uraditi.
//  • Učenje bez greške: ruka pokazuje prvi zadatak (i prvi zadatak nove vrste); na lakim
//    nivoima pomoć posle prve greške — kod semafora glas kaže kad je zeleno.
//  • Podrška se povlači postepeno: semafor → čekanje → kaciga i pojas → razvrstavanje →
//    koraci prelaska (tri, pa četiri) → znakovi → semafor za automobile.
//  • Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak (reči „levo” i „desno”
//    ovde znače gde gledamo pre prelaska ulice).

import {
    choiceCount,
    cycleThrough,
    randomTools,
    roundCount,
    type BuildOptions,
    type HeroId,
    type OrderRound,
    type PickRound,
    type SortRound,
    type WaitRound,
    type WorldCard,
    type WorldRound,
} from "@/app/components/games/world/worldPlay";

// ── Bezbedno ili ne ───────────────────────────────────────────────────────────

export interface Scenario {
    id: string;
    /** Pitanje kad se bira bezbedna slika */
    ask: string;
    safe: { pic: string; label: string };
    unsafe: { pic: string; label: string };
    /** Zašto je bezbedno („Kaciga čuva glavu.”) */
    why: string;
    /** Šta se kaže za nebezbednu sliku */
    note: string;
    tier: 1 | 2;
}

export const SCENARIOS: readonly Scenario[] = [
    {
        id: "helmet",
        ask: "Ko bezbedno vozi bicikl?",
        safe: { pic: "bikeHelmet", label: "sa kacigom" },
        unsafe: { pic: "bikeNoHelmet", label: "bez kacige" },
        why: "Kaciga čuva glavu kad vozimo bicikl.",
        note: "Bez kacige glava nije zaštićena. Kaciga uvek ide na glavu.",
        tier: 1,
    },
    {
        id: "belt",
        ask: "Ko se bezbedno vozi u autu?",
        safe: { pic: "carBelt", label: "vezan pojasom" },
        unsafe: { pic: "carNoBelt", label: "nije vezan" },
        why: "U autu sedimo u sedištu i vežemo pojas.",
        note: "Ko nije vezan, nije bezbedan. Prvo vežemo pojas, pa krećemo.",
        tier: 1,
    },
    {
        id: "zebra",
        ask: "Gde je bezbedno preći ulicu?",
        safe: { pic: "crossZebra", label: "na pešačkom prelazu" },
        unsafe: { pic: "crossCars", label: "između auta" },
        why: "Ulicu prelazimo na pešačkom prelazu, zebri.",
        note: "Između auta nas vozači ne vide. Idemo do pešačkog prelaza.",
        tier: 1,
    },
    {
        id: "hand",
        ask: "Ko bezbedno ide pored ulice?",
        safe: { pic: "walkHand", label: "drži mamu za ruku" },
        unsafe: { pic: "walkRun", label: "trči sam" },
        why: "Pored ulice držimo odraslog za ruku.",
        note: "Ne trčimo sami pored ulice. Držimo odraslog za ruku.",
        tier: 1,
    },
    {
        id: "ball",
        ask: "Gde se bezbedno igramo loptom?",
        safe: { pic: "ballPark", label: "u parku" },
        unsafe: { pic: "ballStreet", label: "na ulici" },
        why: "Loptom se igramo u parku, daleko od ulice.",
        note: "Ulica nije za igru. Igramo se u parku ili u dvorištu.",
        tier: 2,
    },
    {
        id: "vest",
        ask: "Koga vozači bolje vide noću?",
        safe: { pic: "nightVest", label: "svetao prsluk" },
        unsafe: { pic: "nightDark", label: "tamna odeća" },
        why: "Svetao prsluk se vidi i u mraku.",
        note: "Tamna odeća se noću slabo vidi. Nosimo svetao prsluk.",
        tier: 2,
    },
    {
        id: "sidewalk",
        ask: "Gde pešaci bezbedno hodaju?",
        safe: { pic: "walkSidewalk", label: "trotoarom" },
        unsafe: { pic: "walkRoad", label: "po kolovozu" },
        why: "Pešaci hodaju trotoarom.",
        note: "Kolovoz je za automobile. Pešaci idu trotoarom.",
        tier: 2,
    },
];

// ── Oprema ────────────────────────────────────────────────────────────────────

export interface Gear {
    id: string;
    pic: string;
    name: string;
    /** Kada nam treba: slika i pitanje */
    cue: { pic: string; label: string };
    ask: string;
    why: string;
}

export const GEAR: readonly Gear[] = [
    { id: "helmet", pic: "helmet", name: "kaciga", cue: { pic: "p:bicycle", label: "bicikl" }, ask: "Šta stavljamo na glavu kad vozimo bicikl?", why: "Kad vozimo bicikl, nosimo kacigu." },
    { id: "belt", pic: "belt", name: "pojas", cue: { pic: "p:car", label: "auto" }, ask: "Šta vežemo kad sednemo u auto?", why: "U autu uvek vežemo pojas." },
    { id: "vest", pic: "vest", name: "svetao prsluk", cue: { pic: "nightRoad", label: "noć" }, ask: "Šta nosimo kad noću idemo pored puta?", why: "Noću nosimo svetao prsluk, da nas vozači vide." },
    { id: "seat", pic: "carSeat", name: "dečje sedište", cue: { pic: "p:jeep", label: "auto" }, ask: "Gde u autu sedi malo dete?", why: "Malo dete u autu sedi u dečjem sedištu." },
    { id: "scooterHelmet", pic: "helmet", name: "kaciga", cue: { pic: "p:scooter", label: "trotinet" }, ask: "Šta nam treba kad vozimo trotinet?", why: "I na trotinetu nosimo kacigu." },
];

// ── Znakovi ───────────────────────────────────────────────────────────────────

export interface Sign {
    id: string;
    pic: string;
    name: string;
    ask: string;
    why: string;
}

export const SIGNS: readonly Sign[] = [
    { id: "stop", pic: "signStop", name: "stop", ask: "Koji znak kaže vozačima: stani?", why: "Znak STOP kaže: stani i pogledaj." },
    { id: "crossing", pic: "signCrossing", name: "pešački prelaz", ask: "Koji znak pokazuje pešački prelaz?", why: "Plavi znak sa pešakom pokazuje pešački prelaz." },
    { id: "children", pic: "signChildren", name: "deca", ask: "Koji znak kaže vozačima: pazi, tu su deca i škola?", why: "Trougao sa decom kaže: pazi, blizu je škola." },
    { id: "bike", pic: "signBike", name: "staza za bicikle", ask: "Koji znak pokazuje stazu za bicikle?", why: "Plavi krug sa biciklom pokazuje stazu za bicikle." },
];

// ── Semafori ──────────────────────────────────────────────────────────────────

/** Koraci prelaska ulice, redom */
export const STEPS_3 = ["stepStop", "stepLook", "stepCross"] as const;
export const STEPS_4 = ["stepStop", "stepLeft", "stepRight", "stepCross"] as const;
export const STEP_NAMES: Readonly<Record<string, string>> = {
    stepStop: "stanemo na ivici",
    stepLook: "pogledamo levo i desno",
    stepLeft: "pogledamo levo",
    stepRight: "pogledamo desno",
    stepCross: "pređemo ulicu",
};

/** Svi crteži igre (test proverava da svaki postoji) */
export function trafficPics(): string[] {
    return Array.from(
        new Set([
            ...SCENARIOS.flatMap((s) => [s.safe.pic, s.unsafe.pic]),
            ...GEAR.flatMap((g) => [g.pic, g.cue.pic]),
            ...SIGNS.map((s) => s.pic),
            ...STEPS_4,
            ...STEPS_3,
            "pedRed",
            "pedGreen",
            "carRed",
            "carYellow",
            "carGreen",
            "actStop",
            "actGo",
            "safe",
            "unsafe",
        ])
    );
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/**
 * light    — „Pešački semafor je crven. Šta radimo?” (stojimo / idemo)
 * wait     — čekanje zelenog (ili praznog puta), pa „Kreni”
 * safe     — „Ko bezbedno vozi bicikl?”
 * sort     — bezbedno / nije bezbedno
 * gear     — „Šta stavljamo na glavu kad vozimo bicikl?”
 * steps    — koraci prelaska ulice redom
 * sign     — „Koji znak pokazuje pešački prelaz?”
 * carLight — „Kada auto sme da krene?”
 */
export type TrafficKind = "light" | "wait" | "safe" | "sort" | "gear" | "steps" | "sign" | "carLight";

export interface TrafficLevel {
    kinds: readonly TrafficKind[];
    rounds: number;
    choices: number;
    /** Koje situacije (bezbedno/nije) */
    tier: 1 | 2;
    /** Čekanje: semafor, prelaz bez semafora ili oba */
    scenes: readonly ("light" | "zebra")[];
    /** Koliko dugo se čeka prvo zeleno (u krugovima) */
    cycles: number;
    /** Koraci prelaska: tri ili četiri */
    steps: 3 | 4;
    signs: number;
    intro: boolean;
    earlyHint: boolean;
}

const lvl = (kinds: TrafficKind[], rounds: number, choices: number, extra: Partial<TrafficLevel> = {}): TrafficLevel => ({
    kinds,
    rounds,
    choices,
    tier: 1,
    scenes: ["light"],
    cycles: 1,
    steps: 3,
    signs: 3,
    intro: false,
    earlyHint: false,
    ...extra,
});

export const TRAFFIC_LEVELS: readonly TrafficLevel[] = [
    // Lako: semafor za pešake, čekanje zelenog, kaciga i pojas
    lvl(["light"], 4, 2, { earlyHint: true }),
    lvl(["wait"], 3, 2, { intro: true, earlyHint: true }),
    lvl(["safe"], 4, 2, { earlyHint: true }),
    lvl(["sort"], 3, 4, { intro: true, earlyHint: true }),
    lvl(["wait", "light"], 4, 2, { scenes: ["light", "zebra"], earlyHint: true }),
    // Srednje: oprema, koraci prelaska, nove situacije, znakovi
    lvl(["gear"], 5, 3),
    lvl(["steps"], 3, 3, { intro: true }),
    lvl(["safe", "carLight"], 5, 2, { tier: 2 }),
    lvl(["sign"], 5, 3, { signs: 3 }),
    lvl(["wait", "gear"], 4, 3, { scenes: ["light", "zebra"], cycles: 2 }),
    // Teško: četiri koraka, više slika, svi znakovi, duže čekanje
    lvl(["steps"], 3, 4, { steps: 4 }),
    lvl(["sort"], 3, 6, { tier: 2 }),
    lvl(["sign", "carLight"], 5, 4, { signs: 4 }),
    lvl(["safe", "gear", "steps"], 5, 3, { tier: 2, steps: 4 }),
    lvl(["wait", "sign", "safe", "steps", "sort"], 6, 4, { tier: 2, steps: 4, signs: 4, scenes: ["light", "zebra"], cycles: 2 }),
];

export const TRAFFIC_MAX_LEVEL = TRAFFIC_LEVELS.length;

export function trafficLevel(level: number): TrafficLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), TRAFFIC_MAX_LEVEL);
    return TRAFFIC_LEVELS[safe - 1];
}

// ── Plan nivoa ────────────────────────────────────────────────────────────────

function pickRound(round: Pick<PickRound, "prompt" | "why" | "modeled" | "cue" | "choices" | "answer" | "notes"> & Partial<Pick<PickRound, "style">>): PickRound {
    return { kind: "pick", cueWide: false, clues: [], style: "pic", ...round };
}

/** Plan nivoa: zadaci jedan za drugim. `random` daje [0, 1) (seme dvoboja ili Math.random). */
export function buildTrafficLevel(level: number, { maxRounds, maxChoices, random = Math.random }: BuildOptions): WorldRound[] {
    const rule = trafficLevel(level);
    const { shuffle } = randomTools(random);
    const count = roundCount(rule.rounds, maxRounds);
    const choices = choiceCount(rule.choices, maxChoices);
    const kinds = cycleThrough(rule.kinds, count, shuffle);
    const firstHero: HeroId = random() < 0.5 ? "amar" : "lejla";
    const heroAt = (index: number): HeroId => (index % 2 === 0 ? firstHero : firstHero === "amar" ? "lejla" : "amar");
    const scenarios = cycleThrough(
        SCENARIOS.filter((s) => s.tier <= rule.tier),
        count,
        shuffle,
        (s) => s.id
    );
    const lights = cycleThrough(["red", "green"] as const, count, shuffle);
    if (level === 1) lights[0] = "red";
    const scenes = cycleThrough(rule.scenes, count, shuffle);
    const gear = cycleThrough(GEAR, count, shuffle, (g) => g.id);
    const signs = cycleThrough(SIGNS.slice(0, rule.signs), count, shuffle, (s) => s.id);
    const carLights = cycleThrough(["go", "stop"] as const, count, shuffle);

    return kinds.map((kind, index): WorldRound => {
        const modeled = index === 0 && (level === 1 || rule.intro);
        switch (kind) {
            case "light": {
                const red = lights[index] === "red";
                const stop: WorldCard = { id: "stop", pic: "actStop", label: "stojimo" };
                const go: WorldCard = { id: "go", pic: "actGo", label: "idemo" };
                return pickRound({
                    prompt: red ? "Pešački semafor je crven. Šta radimo?" : "Pešački semafor je zelen. Šta radimo?",
                    why: red ? "Crveno svetlo: stojimo i čekamo." : "Zeleno svetlo: pogledamo levo i desno, pa idemo.",
                    modeled,
                    cue: { id: red ? "red" : "green", pic: red ? "pedRed" : "pedGreen", label: red ? "crveno" : "zeleno" },
                    choices: shuffle([stop, go]),
                    answer: red ? "stop" : "go",
                    notes: red ? { go: "Na crveno ne idemo. Stojimo i čekamo zeleno." } : { stop: "Zeleno je. Sada smemo da pređemo ulicu." },
                });
            }
            case "wait": {
                const scene = scenes[index];
                return {
                    kind: "wait",
                    prompt: scene === "light" ? "Čekamo zeleno svetlo, pa prelazimo ulicu." : "Nema semafora. Čekamo da put bude prazan.",
                    why: scene === "light" ? "Zeleno je. Prelazimo na pešačkom prelazu." : "Put je prazan. Pogledali smo levo i desno i prelazimo.",
                    modeled,
                    scene,
                    hero: heroAt(index),
                    cycles: rule.cycles,
                } satisfies WaitRound;
            }
            case "safe": {
                const s = scenarios[index];
                const safeCard: WorldCard = { id: `${s.id}.safe`, pic: s.safe.pic, label: s.safe.label, quiet: true };
                // Dva izbora: ista situacija; tri ili više: i nebezbedne slike iz drugih situacija
                const others = shuffle(SCENARIOS.filter((x) => x.id !== s.id && x.tier <= rule.tier)).slice(0, Math.max(0, choices - 2));
                const unsafe: WorldCard[] = [s, ...others].map((x) => ({ id: `${x.id}.unsafe`, pic: x.unsafe.pic, label: x.unsafe.label, quiet: true }));
                return pickRound({
                    prompt: choices > 2 ? "Koja slika je bezbedna?" : s.ask,
                    why: s.why,
                    modeled,
                    cue: null,
                    choices: shuffle([safeCard, ...unsafe]),
                    answer: safeCard.id,
                    notes: Object.fromEntries([[`${s.id}.unsafe`, s.note], ...others.map((x) => [`${x.id}.unsafe`, x.note])]),
                });
            }
            case "gear": {
                const g = gear[index];
                const others = shuffle(GEAR.filter((x) => x.pic !== g.pic))
                    .filter((x, i, list) => list.findIndex((y) => y.pic === x.pic) === i)
                    .slice(0, choices - 1);
                return pickRound({
                    prompt: g.ask,
                    why: g.why,
                    modeled,
                    cue: { id: `cue-${g.id}`, pic: g.cue.pic, label: g.cue.label },
                    choices: shuffle([g, ...others]).map((x) => ({ id: x.id, pic: x.pic, label: x.name })),
                    answer: g.id,
                    notes: Object.fromEntries(others.map((x) => [x.id, `${x.name.charAt(0).toUpperCase()}${x.name.slice(1)} nam sada ne treba. ${g.why}`])),
                });
            }
            case "sign": {
                const s = signs[index];
                const others = shuffle(SIGNS.slice(0, Math.max(rule.signs, 2)).filter((x) => x.id !== s.id)).slice(0, choices - 1);
                return pickRound({
                    prompt: s.ask,
                    why: s.why,
                    modeled,
                    cue: null,
                    choices: shuffle([s, ...others]).map((x) => ({ id: x.id, pic: x.pic, label: x.name })),
                    answer: s.id,
                    notes: Object.fromEntries(others.map((x) => [x.id, x.why])),
                });
            }
            case "carLight": {
                const go = carLights[index] === "go";
                const cards: WorldCard[] = [
                    { id: "carRed", pic: "carRed", label: "crveno" },
                    { id: "carYellow", pic: "carYellow", label: "žuto" },
                    { id: "carGreen", pic: "carGreen", label: "zeleno" },
                ];
                return pickRound({
                    prompt: go ? "Kada auto sme da krene?" : "Kada auto mora da stane?",
                    why: go ? "Na zeleno auto sme da krene." : "Na crveno auto mora da stane.",
                    modeled,
                    cue: { id: "car", pic: "p:car", label: "" },
                    choices: choices >= 3 ? shuffle(cards) : shuffle([cards[0], cards[2]]),
                    answer: go ? "carGreen" : "carRed",
                    notes: go
                        ? { carRed: "Na crveno auto stoji.", carYellow: "Žuto kaže: pažnja, svetlo se menja." }
                        : { carGreen: "Na zeleno auto ide.", carYellow: "Žuto kaže: pažnja, svetlo se menja." },
                });
            }
            case "steps":
                return stepsRound(rule, modeled, shuffle);
            case "sort":
                return sortRound(rule, index, scenarios, modeled, shuffle);
        }
    });
}

function stepsRound(rule: TrafficLevel, modeled: boolean, shuffle: <T>(list: readonly T[]) => T[]): OrderRound {
    const sequence: string[] = rule.steps === 4 ? [...STEPS_4] : [...STEPS_3];
    const names = sequence.map((id) => STEP_NAMES[id]);
    return {
        kind: "order",
        prompt: "Kako prelazimo ulicu? Koraci redom.",
        why: `${names.map((name) => name.charAt(0).toUpperCase() + name.slice(1)).join(". ")}.`,
        modeled,
        items: shuffle(sequence.map((id) => ({ id, pic: id, label: STEP_NAMES[id] }))),
        sequence,
        given: 0,
        notes: Object.fromEntries(sequence.map((id, i) => [id, i === 0 ? "Prvo stanemo na ivici trotoara." : `Sada: ${STEP_NAMES[id]}.`])),
    };
}

function sortRound(rule: TrafficLevel, index: number, scenarios: Scenario[], modeled: boolean, shuffle: <T>(list: readonly T[]) => T[]): SortRound {
    const size = rule.choices >= 6 ? 3 : 2;
    // Situacije redom iz plana (od tekuće), svaka sa obe slike
    const pool = SCENARIOS.filter((s) => s.tier <= rule.tier);
    const start = scenarios[index];
    const chosen = [start, ...shuffle(pool.filter((s) => s.id !== start.id))].slice(0, size);
    const items: WorldCard[] = chosen.flatMap((s) => [
        { id: `${s.id}.safe`, pic: s.safe.pic, label: s.safe.label, quiet: true },
        { id: `${s.id}.unsafe`, pic: s.unsafe.pic, label: s.unsafe.label, quiet: true },
    ]);
    return {
        kind: "sort",
        prompt: "Šta je bezbedno, a šta nije?",
        why: "Sve slike su na svom mestu.",
        modeled,
        bins: [
            { id: "safe", pic: "safe", label: "bezbedno" },
            { id: "unsafe", pic: "unsafe", label: "nije bezbedno" },
        ],
        items: shuffle(items),
        homes: Object.fromEntries(chosen.flatMap((s) => [[`${s.id}.safe`, "safe"], [`${s.id}.unsafe`, "unsafe"]])),
        says: Object.fromEntries(chosen.flatMap((s) => [[`${s.id}.safe`, s.why], [`${s.id}.unsafe`, s.note]])),
        notes: Object.fromEntries(chosen.flatMap((s) => [[`${s.id}.safe`, `Ovo je bezbedno. ${s.why}`], [`${s.id}.unsafe`, `Ovo nije bezbedno. ${s.note}`]])),
    };
}
