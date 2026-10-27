// Sadržaj igre „Posadi cvet”: Emina neguje biljku, a dete bira šta biljci sada treba.
//
// Zašto ovako (istraživanje i odluke):
//  • Šta je biljci potrebno (zemlja i mesto, voda, svetlo) je jedna od prvih prirodnih nauka u
//    vrtiću; uči se na konkretnom primeru — dete vidi da posle vode biljka nikne, a posle sunca
//    procveta (uzrok i posledica, ciklus rasta). Za 3–7 godina.
//  • Biološki redosled (rupa → seme → voda → sunce → cvet) vežba redosled i plan, kao prirodna
//    priča sa jasnim početkom i krajem: svaka biljka se završi cvetom, a na kraju nivoa je bašta.
//  • Bez grešaka na početku (errorless): na lakim nivoima biljka u oblačiću pokaže šta joj
//    treba i nude se samo dve stvari; prvi korak prvog nivoa pokazuje ruka. Kasnije se potreba
//    vidi samo po biljci (suva ispucala zemlja i oboren list, oblak, korov, koren iz saksije).
//  • Pogrešan izbor dobija mirno objašnjenje zašto ne sada („Biljka sada nije žedna.”), a posle
//    promašaja ili čekanja prava stvar blago zasvetli (pomoć se beleži).
//  • Na teškim nivoima biljke imaju različite potrebe (kaktus pije malo vode, mokroj zemlji
//    treba sunce, a ne još vode; paradajzu treba veća saksija) — razmišljanje umesto navike.
//
// Nivoi (koraka najviše oko onoliko koliko dozvoljava uzrast, `maxRounds`; biljka se ne prekida):
//   1–5   Lako     seme → voda → sunce, potreba u oblačiću, 2 stvari, 2 biljke
//   6–10  Srednje  potreba se vidi po biljci; dodaju se lopatica (rupa) i rukavice (korov); 3 stvari
//   11–15 Teško    različite biljke i potrebe (kaktus, suncokret, paradajz, previše vode), do 6 stvari

import type { BaseView } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { toCount } from "@/app/components/games/kit/utils";

export type ToolId = "shovel" | "seed" | "water" | "sun" | "pot" | "gloves";

export interface Tool {
    id: ToolId;
    /** Natpis na kartici */
    name: string;
}

export const TOOLS: readonly Tool[] = [
    { id: "shovel", name: "Lopatica" },
    { id: "seed", name: "Seme" },
    { id: "water", name: "Kanta" },
    { id: "sun", name: "Sunce" },
    { id: "pot", name: "Saksija" },
    { id: "gloves", name: "Rukavice" },
];

export function getTool(id: unknown): Tool | undefined {
    return TOOLS.find((tool) => tool.id === id);
}

export type PlantKind = "flower" | "tulip" | "sunflower" | "tomato" | "cactus";

/** Kako biljka izgleda: 0 ravna zemlja, 1 rupa, 2 posađeno seme, 3 klica, 4 listovi, 5 pupoljak, 6 cvet (plod) */
export type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Šta se vidi oko biljke (znak potrebe na srednjim i teškim nivoima) */
export type Cond = "none" | "dry" | "cloud" | "weeds" | "wet" | "cramped" | "moist-cloud";

export interface PlantStep {
    plant: PlantKind;
    /** Redni broj biljke u nivou (0…) */
    plantIndex: number;
    need: ToolId;
    /** Izgled pre koraka */
    stage: Stage;
    cond: Cond;
    /** Izgled posle tačnog koraka */
    next: Stage;
    /** Potreba se crta u oblačiću (lako) */
    bubble: boolean;
    /** Ponuđene stvari, redom na ekranu */
    tools: ToolId[];
    /** Rečenica posle tačnog izbora */
    explain: string;
    /** Boja cveta (latica) */
    petal: string;
}

export const PETALS = ["#F59FB5", "#FFB13B", "#B9A6EE", "#F08A7E", "#7FA8EE"] as const;

/** Rečenica posle tačnog koraka */
const EXPLAIN: Record<ToolId, string> = {
    shovel: "Rupa je spremna za seme.",
    seed: "Seme je u zemlji. Iz njega će niknuti biljka.",
    water: "Biljka pije vodu kroz koren.",
    sun: "Biljka voli sunce. Na suncu raste i cveta.",
    pot: "U većoj saksiji koren ima više mesta.",
    gloves: "Korov je iščupan. Sada biljka ima više mesta i vode.",
};

/** Posebna objašnjenja na teškim nivoima */
const SPECIAL: Partial<Record<string, string>> = {
    "cactus:sun": "Kaktus pije malo vode, a voli mnogo sunca.",
    "cactus:water": "Zemlja je potpuno suva. I kaktusu ponekad treba malo vode.",
    "wet:sun": "Zemlja je mokra. Vode ima dosta, sad treba sunce da je osuši.",
    "sunflower:sun": "Suncokret se okreće ka suncu.",
    "tomato:pot": "Paradajz je porastao. U većoj saksiji koren ima više mesta.",
};

/** Zašto izabrana stvar sada ne pomaže (mirno, bez osude) */
export function whyNot(step: Pick<PlantStep, "need" | "stage" | "cond" | "plant">, tool: ToolId): string {
    switch (tool) {
        case "shovel":
            return step.stage >= 1 ? "Rupa je već iskopana." : "Sada ne treba kopati.";
        case "seed":
            return step.stage === 0 ? "Prvo treba iskopati rupu za seme." : "Seme je već u zemlji.";
        case "water":
            if (step.cond === "wet" || step.cond === "moist-cloud") return "Zemlja je još mokra. Previše vode šteti biljci.";
            if (step.plant === "cactus") return "Kaktus pije malo vode, a zemlja je još vlažna.";
            if (step.stage <= 1) return "Prvo treba posaditi seme.";
            return "Biljka sada nije žedna.";
        case "sun":
            return step.stage <= 1 ? "Prvo treba posaditi seme." : "Biljka već ima dovoljno sunca.";
        case "pot":
            return "Saksija je još dovoljno velika.";
        case "gloves":
            return "Oko biljke nema korova.";
    }
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

export const PLANT_MAX_LEVEL = 15;

type StepPlan = { need: ToolId; stage: Stage; cond: Cond; next: Stage };

/** Laki nivoi: posađeno je u rupu, pa voda, pa sunce */
const EASY: StepPlan[] = [
    { need: "seed", stage: 1, cond: "none", next: 2 },
    { need: "water", stage: 2, cond: "dry", next: 3 },
    { need: "sun", stage: 3, cond: "cloud", next: 6 },
];

/** Srednji nivoi: potreba se vidi po biljci */
const MEDIUM_A: StepPlan[] = [
    { need: "shovel", stage: 0, cond: "none", next: 1 },
    { need: "seed", stage: 1, cond: "none", next: 2 },
    { need: "water", stage: 2, cond: "dry", next: 3 },
    { need: "sun", stage: 3, cond: "cloud", next: 5 },
    { need: "gloves", stage: 5, cond: "weeds", next: 6 },
];
const MEDIUM_B: StepPlan[] = [
    { need: "seed", stage: 1, cond: "none", next: 2 },
    { need: "water", stage: 2, cond: "dry", next: 3 },
    { need: "gloves", stage: 3, cond: "weeds", next: 4 },
    { need: "sun", stage: 4, cond: "cloud", next: 6 },
];
const MEDIUM_C: StepPlan[] = [
    { need: "shovel", stage: 0, cond: "none", next: 1 },
    { need: "seed", stage: 1, cond: "none", next: 2 },
    { need: "water", stage: 2, cond: "dry", next: 4 },
    { need: "water", stage: 4, cond: "dry", next: 5 },
    { need: "sun", stage: 5, cond: "cloud", next: 6 },
];

/** Teški nivoi: svaka biljka je jedan korak sa svojom potrebom */
interface Scenario extends StepPlan {
    plant: PlantKind;
    key: string;
}

const SCENARIOS: readonly Scenario[] = [
    { key: "cactus:sun", plant: "cactus", need: "sun", stage: 5, cond: "moist-cloud", next: 6 },
    { key: "cactus:water", plant: "cactus", need: "water", stage: 5, cond: "dry", next: 6 },
    { key: "sunflower:sun", plant: "sunflower", need: "sun", stage: 5, cond: "cloud", next: 6 },
    { key: "tomato:pot", plant: "tomato", need: "pot", stage: 5, cond: "cramped", next: 6 },
    { key: "wet:sun", plant: "flower", need: "sun", stage: 5, cond: "wet", next: 6 },
    { key: "flower:water", plant: "flower", need: "water", stage: 4, cond: "dry", next: 6 },
    { key: "tulip:gloves", plant: "tulip", need: "gloves", stage: 5, cond: "weeds", next: 6 },
    { key: "tomato:water", plant: "tomato", need: "water", stage: 4, cond: "dry", next: 6 },
    { key: "tulip:seed", plant: "tulip", need: "seed", stage: 1, cond: "none", next: 6 },
];

interface LevelRule {
    tier: "easy" | "medium" | "hard";
    plants: readonly PlantKind[];
    plans?: readonly StepPlan[][];
    tools: number;
    /** Teško: broj biljaka (koraka) */
    rounds?: number;
}

const RULES: readonly LevelRule[] = [
    { tier: "easy", plants: ["flower", "flower"], tools: 2 },
    { tier: "easy", plants: ["tulip", "flower"], tools: 2 },
    { tier: "easy", plants: ["sunflower", "tulip"], tools: 2 },
    { tier: "easy", plants: ["flower", "sunflower"], tools: 2 },
    { tier: "easy", plants: ["tulip", "sunflower"], tools: 2 },
    { tier: "medium", plants: ["flower"], plans: [MEDIUM_B], tools: 3 },
    { tier: "medium", plants: ["tulip"], plans: [MEDIUM_A], tools: 3 },
    { tier: "medium", plants: ["sunflower", "flower"], plans: [MEDIUM_B, MEDIUM_C], tools: 3 },
    { tier: "medium", plants: ["flower", "tulip"], plans: [MEDIUM_A, MEDIUM_B], tools: 3 },
    { tier: "medium", plants: ["tomato", "flower"], plans: [MEDIUM_C, MEDIUM_A], tools: 4 },
    { tier: "hard", plants: [], tools: 3, rounds: 5 },
    { tier: "hard", plants: [], tools: 4, rounds: 5 },
    { tier: "hard", plants: [], tools: 4, rounds: 6 },
    { tier: "hard", plants: [], tools: 5, rounds: 6 },
    { tier: "hard", plants: [], tools: 6, rounds: 7 },
];

export function plantRule(level: number): LevelRule {
    return RULES[Math.min(Math.max(Math.round(level), 1), PLANT_MAX_LEVEL) - 1];
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/** Ponuđene stvari: prava + ostale nasumično (bez dve iste) */
function toolsFor(need: ToolId, count: number, random: () => number, preferred: readonly ToolId[] = []): ToolId[] {
    const others = [...shuffle(preferred.filter((id) => id !== need), random), ...shuffle(TOOLS.map((t) => t.id).filter((id) => id !== need && !preferred.includes(id)), random)];
    return shuffle([need, ...others.slice(0, Math.max(1, count - 1))], random);
}

export function buildPlantLevel(level: number, { maxChoices, maxRounds, random = Math.random }: { maxChoices: number; maxRounds: number; random?: () => number }): PlantStep[] {
    const rule = plantRule(level);
    const toolCount = Math.max(2, Math.min(rule.tools, maxChoices));
    const petals = shuffle(PETALS, random);
    const steps: PlantStep[] = [];
    if (rule.tier === "hard") {
        // Različite biljke, svaka sa svojom potrebom (bez ponavljanja u nivou)
        const count = Math.max(2, Math.min(rule.rounds ?? 5, maxRounds));
        const pool = shuffle(SCENARIOS, random);
        for (let i = 0; i < count; i += 1) {
            const s = pool[i % pool.length];
            // Na teškim nivoima voda je uvek ponuđena kad je zamka (kaktus, mokra zemlja)
            const tempting: ToolId[] = s.need === "sun" ? ["water"] : s.need === "water" ? ["sun"] : [];
            steps.push({
                plant: s.plant,
                plantIndex: i,
                need: s.need,
                stage: s.stage,
                cond: s.cond,
                next: s.next,
                bubble: false,
                tools: toolsFor(s.need, toolCount, random, tempting),
                explain: SPECIAL[s.key] ?? EXPLAIN[s.need],
                petal: petals[i % petals.length],
            });
        }
        return steps;
    }
    const plans = rule.plans ?? [EASY];
    const perPlant = plans.map((plan) => plan.length);
    // Biljaka koliko dozvoljava uzrast (biljka se ne prekida na pola), bar jedna
    let plantCount = Math.max(1, Math.min(rule.plants.length, Math.round(maxRounds / Math.max(...perPlant))));
    if (plantCount > 1 && perPlant.slice(0, plantCount).reduce((a, b) => a + b, 0) > maxRounds + 2) plantCount = 1;
    for (let p = 0; p < plantCount; p += 1) {
        const plan = plans[p % plans.length];
        for (const step of plan) {
            steps.push({
                plant: rule.plants[p],
                plantIndex: p,
                need: step.need,
                stage: step.stage,
                cond: step.cond,
                next: step.next,
                bubble: rule.tier === "easy",
                tools: toolsFor(step.need, toolCount, random),
                explain: EXPLAIN[step.need],
                petal: petals[p % petals.length],
            });
        }
    }
    return steps;
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

/** Završena biljka u bašti (gornji red) */
export interface GardenPlant {
    plant: PlantKind;
    petal: string;
}

export interface PlantView extends BaseView {
    plant: PlantKind;
    plantIndex: number;
    need: string;
    stage: number;
    cond: Cond;
    bubble: boolean;
    tools: string[];
    petal: string;
    /** Pogrešno izabrane stvari u ovom koraku */
    wrong: string[];
    picked: string | null;
    feedback: FeedbackKind;
    hint: boolean;
    /** Objašnjenje posle tačnog izbora */
    explain: string;
    /** Završene biljke */
    garden: GardenPlant[];
    /** Koliko biljaka ima nivo (mesta u bašti) */
    plantsTotal: number;
    promptedCount: number;
}

export function emptyPlantView(totalRounds: number): PlantView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        plant: "flower",
        plantIndex: 0,
        need: "",
        stage: 0,
        cond: "none",
        bubble: false,
        tools: [],
        petal: PETALS[0],
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
        explain: "",
        garden: [],
        plantsTotal: 1,
    };
}

const KINDS: readonly PlantKind[] = ["flower", "tulip", "sunflower", "tomato", "cactus"];
const CONDS: readonly Cond[] = ["none", "dry", "cloud", "weeds", "wet", "cramped", "moist-cloud"];
const isKind = (value: unknown): value is PlantKind => KINDS.includes(value as PlantKind);
const isPetal = (value: unknown): value is string => typeof value === "string" && (PETALS as readonly string[]).includes(value);

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergePlantMonitor(state: Partial<PlantView> | null | undefined): PlantView {
    const base = emptyPlantView(1);
    if (!state) return base;
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const tools = Array.isArray(state.tools) ? Array.from(new Set(state.tools.filter((id): id is string => getTool(id) !== undefined))).slice(0, 6) : [];
    const need = getTool(state.need)?.id ?? "";
    const valid = need !== "" && tools.includes(need);
    const garden = Array.isArray(state.garden)
        ? state.garden.filter((g): g is GardenPlant => typeof g === "object" && g !== null && isKind((g as GardenPlant).plant) && isPetal((g as GardenPlant).petal)).slice(0, 12)
        : [];
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        plant: isKind(state.plant) ? state.plant : "flower",
        plantIndex: toCount(state.plantIndex, 0),
        need: valid ? need : "",
        stage: Math.min(toCount(state.stage, 0), 6),
        cond: CONDS.includes(state.cond as Cond) ? (state.cond as Cond) : "none",
        bubble: state.bubble === true,
        tools: valid ? tools : [],
        petal: isPetal(state.petal) ? state.petal : PETALS[0],
        wrong: valid && Array.isArray(state.wrong) ? state.wrong.filter((id) => tools.includes(id) && id !== need) : [],
        picked: valid ? (tools.find((id) => id === state.picked) ?? null) : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
        explain: typeof state.explain === "string" ? state.explain.slice(0, 200) : "",
        garden,
        plantsTotal: Math.min(Math.max(toCount(state.plantsTotal, 1), garden.length, 1), 12),
    };
}
