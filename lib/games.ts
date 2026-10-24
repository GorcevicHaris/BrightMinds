// lib/games.ts
// Jedini izvor istine za spisak igara: ID-jevi, nazivi, boje i ID aktivnosti u bazi.
// Koriste ga dečji ekran, live monitor, statistika i API rute.

export type GameId =
    | "shapes"
    | "memory"
    | "coloring"
    | "sound-to-image"
    | "social"
    | "social-story"
    | "emotions"
    | "sorting"
    | "sequence"
    | "where"
    | "uses"
    | "counting"
    | "gaze";

/** Naziv kanala/događaja koji igra šalje monitoru (istorijski se razlikuje od GameId). */
export type GameType =
    | "shape_matching"
    | "memory"
    | "coloring"
    | "sound-to-image"
    | "social"
    | "social-story"
    | "emotions"
    | "sorting"
    | "sequence"
    | "where"
    | "uses"
    | "counting"
    | "gaze";

export interface GameAccent {
    /** Puna boja (dugmad, bedževi) */
    solid: string;
    /** Tamnija ivica za "3D" dugme */
    edge: string;
    /** Svetla podloga */
    soft: string;
    /** Tekst u boji igre */
    text: string;
    /** Ivica u boji igre */
    border: string;
    /** Prsten/fokus */
    ring: string;
    /** Gradijent za ikonice i trake */
    gradient: string;
}

export interface GameDefinition {
    id: GameId;
    gameType: GameType;
    /** ID u tabeli `activities` */
    activityId: number;
    title: string;
    description: string;
    /** Veština koju igra razvija — prikazuje se roditeljima */
    skill: string;
    icon: string;
    image: string;
    accent: GameAccent;
    /** Predlog odraslom kako da istu veštinu vežba sa detetom van ekrana */
    offscreenTip: string;
    /**
     * false = u igri nema pogrešnih odgovora (npr. osećanja), pa se nivo ne „polaže”:
     * svaki završen nivo otključava sledeći, a broj `correct` znači „najčešći odgovor”.
     */
    graded: boolean;
    /**
     * Uzrast za koji je igra namenjena (navršene godine, uključivo). Prikazuje se samo
     * roditelju, diskretno; dete ne vidi brojeve godina.
     */
    ages: { min: number; max: number };
    /**
     * Redosled učenja: 1 = uči se prvo (najlakše), veći broj = oslanja se na ranije veštine.
     * Po njemu se igre ređaju na početnom ekranu i otključavaju jedna za drugom.
     */
    order: number;
}

export const GAMES: GameDefinition[] = [
    {
        id: "shapes",
        gameType: "shape_matching",
        activityId: 1,
        title: "Pogodi oblik",
        description: "Pronađi isti oblik",
        skill: "Vizuelna percepcija",
        icon: "🔷",
        image: "/images/pogodioblik.webp",
        accent: {
            solid: "bg-emerald-500",
            edge: "border-emerald-700",
            soft: "bg-emerald-50",
            text: "text-emerald-700",
            border: "border-emerald-200",
            ring: "ring-emerald-200",
            gradient: "from-emerald-400 to-teal-500",
        },
        offscreenTip: "Potražite zajedno iste oblike po kući: tanjir je krug, prozor je kvadrat.",
        graded: true,
        // 1. po redu: isti oblik: najjednostavnije vizuelno uparivanje
        ages: { min: 3, max: 5 },
        order: 1,
    },
    {
        id: "memory",
        gameType: "memory",
        activityId: 3,
        title: "Spoji parove",
        description: "Pronađi dve iste slike",
        skill: "Pamćenje i pažnja",
        icon: "🧠",
        image: "/images/spojiparove.webp",
        accent: {
            solid: "bg-violet-500",
            edge: "border-violet-700",
            soft: "bg-violet-50",
            text: "text-violet-700",
            border: "border-violet-200",
            ring: "ring-violet-200",
            gradient: "from-violet-400 to-indigo-500",
        },
        offscreenTip: "Sakrijte dve-tri igračke pod čaše, pa neka dete pogodi gde je koja.",
        graded: true,
        // 6. po redu: pamćenje mesta: traži pažnju kroz više poteza
        ages: { min: 4, max: 7 },
        order: 6,
    },
    {
        id: "coloring",
        gameType: "coloring",
        activityId: 4,
        title: "Bojanka",
        description: "Izaberi boje i oboji sliku",
        skill: "Fina motorika i boje",
        icon: "🎨",
        image: "/images/oboji.webp",
        accent: {
            solid: "bg-orange-500",
            edge: "border-orange-700",
            soft: "bg-orange-50",
            text: "text-orange-700",
            border: "border-orange-200",
            ring: "ring-orange-200",
            gradient: "from-orange-400 to-pink-500",
        },
        offscreenTip: "Bojite zajedno na papiru i imenujte boje predmeta oko sebe.",
        graded: true,
        // 4. po redu: boje i fina motorika, bez tačnog i netačnog
        ages: { min: 3, max: 7 },
        order: 4,
    },
    {
        id: "sound-to-image",
        gameType: "sound-to-image",
        activityId: 5,
        title: "Slušaj i spoji",
        description: "Čuj zvuk i pronađi sliku",
        skill: "Slušna pažnja",
        icon: "🔊",
        image: "/images/slusajispoji.webp",
        accent: {
            solid: "bg-sky-500",
            edge: "border-sky-700",
            soft: "bg-sky-50",
            text: "text-sky-700",
            border: "border-sky-200",
            ring: "ring-sky-200",
            gradient: "from-cyan-400 to-blue-500",
        },
        offscreenTip: "Zastanite u šetnji i pitajte: „Šta čuješ?” — ptica, auto, vetar.",
        graded: true,
        // 2. po redu: zvuk → slika: uparivanje sluhom
        ages: { min: 3, max: 5 },
        order: 2,
    },
    {
        id: "social",
        gameType: "social",
        activityId: 6,
        title: "Šta reći?",
        description: "Izaberi lepe reči",
        skill: "Socijalna komunikacija",
        icon: "💬",
        image: "/images/stareci.webp",
        accent: {
            solid: "bg-indigo-500",
            edge: "border-indigo-700",
            soft: "bg-indigo-50",
            text: "text-indigo-700",
            border: "border-indigo-200",
            ring: "ring-indigo-200",
            gradient: "from-indigo-400 to-purple-600",
        },
        offscreenTip: "Odigrajte kratku scenu sa igračkama: ko šta kaže kad dobije poklon ili traži pomoć.",
        graded: true,
        // 12. po redu: izbor reči u društvenoj situaciji
        ages: { min: 5, max: 10 },
        order: 12,
    },
    {
        id: "social-story",
        gameType: "social-story",
        activityId: 7,
        title: "Socijalne priče",
        description: "Šta se dešava u školi, kod zubara, u parku",
        skill: "Svakodnevne situacije",
        icon: "📖",
        image: "/images/socijalneprice.webp",
        accent: {
            solid: "bg-teal-500",
            edge: "border-teal-700",
            soft: "bg-teal-50",
            text: "text-teal-700",
            border: "border-teal-200",
            ring: "ring-teal-200",
            gradient: "from-teal-400 to-emerald-600",
        },
        offscreenTip: "Pre odlaska kod zubara ili u prodavnicu, ispričajte redom šta će se dešavati.",
        graded: true,
        // 13. po redu: cela situacija iz svakodnevice, korak po korak
        ages: { min: 5, max: 10 },
        order: 13,
    },
    {
        id: "emotions",
        gameType: "emotions",
        activityId: 8,
        title: "Emocije",
        description: "Kako se oseća dete u priči?",
        skill: "Prepoznavanje emocija",
        icon: "😊",
        image: "/images/emocije.svg",
        accent: {
            solid: "bg-pink-500",
            edge: "border-pink-700",
            soft: "bg-pink-50",
            text: "text-pink-700",
            border: "border-pink-200",
            ring: "ring-pink-200",
            gradient: "from-pink-400 to-rose-500",
        },
        offscreenTip: "Dok čitate slikovnicu, pitajte: „Kako se oseća ovaj lik? Po čemu to vidiš?”",
        graded: true,
        // 8. po redu: prepoznavanje osećanja na licu i u priči
        ages: { min: 4, max: 8 },
        order: 8,
    },
    {
        id: "sorting",
        gameType: "sorting",
        activityId: 9,
        title: "Razvrstaj",
        description: "Stavi u pravu korpu",
        skill: "Razvrstavanje",
        icon: "🧺",
        image: "/images/razvrstaj.svg",
        accent: {
            solid: "bg-amber-500",
            edge: "border-amber-700",
            soft: "bg-amber-50",
            text: "text-amber-700",
            border: "border-amber-200",
            ring: "ring-amber-200",
            gradient: "from-amber-400 to-orange-500",
        },
        offscreenTip: "Pri sklanjanju veša ili igračaka razvrstavajte zajedno: „Čarape ovde, majice tamo.” ili „Crvene kocke u ovu kutiju.”",
        graded: true,
        // 10. po redu: razvrstavanje po pravilu (kategorija, boja)
        ages: { min: 4, max: 8 },
        order: 10,
    },
    {
        id: "sequence",
        gameType: "sequence",
        activityId: 10,
        title: "Šta je prvo?",
        description: "Složi korake redom",
        skill: "Redosled i planiranje",
        icon: "🔢",
        image: "/images/redosled.svg",
        accent: {
            solid: "bg-lime-500",
            edge: "border-lime-700",
            soft: "bg-lime-50",
            text: "text-lime-700",
            border: "border-lime-200",
            ring: "ring-lime-200",
            gradient: "from-lime-400 to-green-500",
        },
        offscreenTip: "Pre nove aktivnosti recite korake redom: „Prvo obučemo jaknu, zatim obujemo cipele, na kraju idemo napolje.”",
        graded: true,
        // 11. po redu: redosled koraka: planiranje
        ages: { min: 5, max: 10 },
        order: 11,
    },
    {
        id: "where",
        gameType: "where",
        activityId: 11,
        title: "Gde je?",
        description: "U, na, ispod ili pored?",
        skill: "Prostorni pojmovi",
        icon: "📦",
        image: "/images/gdeje.svg",
        accent: {
            solid: "bg-cyan-500",
            edge: "border-cyan-700",
            soft: "bg-cyan-50",
            text: "text-cyan-700",
            border: "border-cyan-200",
            ring: "ring-cyan-200",
            gradient: "from-cyan-400 to-sky-500",
        },
        offscreenTip: "U igri sa igračkama recite gde su i neka dete pokaže ili sakrije: „Meda je ispod stola.”, „Stavi loptu u kutiju.”",
        graded: true,
        // 5. po redu: u, na, ispod, pored: prvi prostorni pojmovi
        ages: { min: 3, max: 6 },
        order: 5,
    },
    {
        id: "uses",
        gameType: "uses",
        activityId: 12,
        title: "Čemu služi?",
        description: "Čuj pitanje i pronađi predmet",
        skill: "Razumevanje govora",
        icon: "✂️",
        image: "/images/cemusluzi.svg",
        accent: {
            solid: "bg-fuchsia-500",
            edge: "border-fuchsia-700",
            soft: "bg-fuchsia-50",
            text: "text-fuchsia-700",
            border: "border-fuchsia-200",
            ring: "ring-fuchsia-200",
            gradient: "from-fuchsia-400 to-purple-500",
        },
        offscreenTip: "Dok spremate doručak ili se kupate, pitajte: „Čime jedemo supu?”, „Čime peremo kosu?” — neka dete pokaže ili donese predmet.",
        graded: true,
        // 7. po redu: razumevanje rečenice o nameni predmeta
        ages: { min: 4, max: 7 },
        order: 7,
    },
    {
        id: "counting",
        gameType: "counting",
        activityId: 13,
        title: "Brojimo",
        description: "Koliko ima? Gde ima više?",
        skill: "Brojanje i količine",
        icon: "🧮",
        image: "/images/brojimo.svg",
        accent: {
            solid: "bg-yellow-500",
            edge: "border-yellow-700",
            soft: "bg-yellow-50",
            text: "text-yellow-800",
            border: "border-yellow-200",
            ring: "ring-yellow-200",
            gradient: "from-yellow-400 to-orange-400",
        },
        offscreenTip: "Brojite zajedno ono što je oko vas: stepenice, kašike na stolu, autiće u kutiji. Neka dete dodirne svaku stvar dok broji, pa pitajte: „Koliko ima?” ili „Gde ima više?”",
        graded: true,
        // 9. po redu: brojanje i poređenje količina
        ages: { min: 4, max: 7 },
        order: 9,
    },
    {
        id: "gaze",
        gameType: "gaze",
        activityId: 14,
        title: "Šta gleda?",
        description: "Prati pogled i pronađi predmet",
        skill: "Zajednička pažnja",
        icon: "👀",
        image: "/images/stagleda.svg",
        accent: {
            solid: "bg-blue-500",
            edge: "border-blue-700",
            soft: "bg-blue-50",
            text: "text-blue-700",
            border: "border-blue-200",
            ring: "ring-blue-200",
            gradient: "from-blue-400 to-indigo-500",
        },
        offscreenTip:
            "Sedite jedno pored drugog, pogledajte u neku igračku i pitajte: „Šta ja gledam?” Pokažite i rukom ako treba. Ne tražite da vas dete gleda u oči — dovoljno je da prati gde gledate.",
        graded: true,
        // 3. po redu: praćenje pogleda: osnova zajedničke pažnje
        ages: { min: 3, max: 6 },
        order: 3,
    },
];

export const ACTIVITY_IDS: number[] = GAMES.map((g) => g.activityId);

export const LEVELS_PER_TIER = 5;
export const MAX_LEVEL = 15;

export function getGame(id: GameId): GameDefinition {
    return GAMES.find((g) => g.id === id) ?? GAMES[0];
}

export function getGameByType(gameType: string): GameDefinition | undefined {
    return GAMES.find((g) => g.gameType === gameType);
}

export function getGameByActivityId(activityId: number): GameDefinition | undefined {
    return GAMES.find((g) => g.activityId === activityId);
}

// ── Uzrast i redosled ─────────────────────────────────────────────────────────

/** „3–5 god.” — diskretna oznaka uzrasta za roditelje. */
export function ageLabel(game: Pick<GameDefinition, "ages">): string {
    return `${game.ages.min}–${game.ages.max} god.`;
}

/**
 * Grupa igre za dete datog uzrasta: 0 = baš za taj uzrast, 1 = za mlađu decu (lako
 * ponavljanje), 2 = za stariju decu (teže; dolazi na kraju).
 */
function ageGroup(game: Pick<GameDefinition, "ages">, ageYears: number): 0 | 1 | 2 {
    if (ageYears < game.ages.min) return 2;
    if (ageYears > game.ages.max) return 1;
    return 0;
}

/**
 * Igre poređane za dete: prvo one namenjene njegovom uzrastu, pa igre za mlađu decu, pa
 * igre za stariju; u svakoj grupi od najlakše (ono što se uči prvo, `order`). Bez poznatog
 * uzrasta samo po redosledu učenja. Ne menja ulazni niz.
 */
export function sortGamesForChild<T extends Pick<GameDefinition, "ages" | "order">>(games: readonly T[], ageYears: number | null): T[] {
    const age = typeof ageYears === "number" && Number.isFinite(ageYears) ? ageYears : null;
    return [...games].sort((a, b) => {
        if (age !== null) {
            const group = ageGroup(a, age) - ageGroup(b, age);
            if (group !== 0) return group;
        }
        return a.order - b.order;
    });
}

// ── Raspoloženje ───────────────────────────────────────────────────────────────

export type Mood = "very_upset" | "upset" | "neutral" | "happy" | "very_happy";

export const MOODS: { value: Mood; emoji: string; label: string }[] = [
    { value: "very_upset", emoji: "😢", label: "Tužno" },
    { value: "upset", emoji: "😕", label: "Umorno" },
    { value: "neutral", emoji: "😐", label: "Okej" },
    { value: "happy", emoji: "😊", label: "Dobro" },
    { value: "very_happy", emoji: "😄", label: "Super" },
];

/** Kraća skala za decu: tri lica umesto pet (mlađa deca ne razlikuju pouzdano više stupnjeva). */
export const MOODS_THREE: { value: Mood; emoji: string; label: string }[] = [
    { value: "upset", emoji: "😢", label: "Tužno" },
    { value: "neutral", emoji: "😐", label: "Onako" },
    { value: "happy", emoji: "🙂", label: "Dobro" },
];

export function getMood(value: string | null | undefined) {
    return MOODS.find((m) => m.value === value);
}

// ── Zvezdice ──────────────────────────────────────────────────────────────────

export type SuccessLevel = "struggled" | "partial" | "successful" | "excellent";

/**
 * Zvezdice za završen nivo, na osnovu udela samostalno tačnih odgovora.
 * Završen nivo uvek donosi bar jednu zvezdicu: nema ishoda „nisi uspeo” —
 * kazna za grešku obeshrabruje, a ne uči (videti docs/istrazivanje.md).
 * 0 se vraća samo kada nivo nije ni odigran.
 */
export function starsFor(correct: number, total: number): 0 | 1 | 2 | 3 {
    if (total <= 0) return 0;
    const ratio = correct / total;
    if (ratio >= 0.8) return 3;
    if (ratio >= 0.5) return 2;
    return 1;
}

/**
 * Zvezdice za završen nivo određene igre. U igri bez pogrešnih odgovora (osećanja) svaki
 * završen nivo donosi sve tri: tamo „1 od 3” ne bi značilo ništa osim da je dete izabralo
 * ređe osećanje, a to nije greška.
 */
export function starsForGame(graded: boolean, correct: number, total: number): 0 | 1 | 2 | 3 {
    if (total <= 0) return 0;
    return graded ? starsFor(correct, total) : 3;
}

/** Da li se u igri sa ovim ID-jem aktivnosti nivoi „polažu” (nepoznata aktivnost: da). */
export function isGradedActivity(activityId: number): boolean {
    return GAMES.find((g) => g.activityId === activityId)?.graded ?? true;
}

/** Udeo samostalno tačnih odgovora posle kog se predlaže sledeći nivo (ispod toga: „probaj još jednom”). */
export const ADVANCE_RATIO = 0.5;

export function successLevelFor(stars: number): SuccessLevel {
    if (stars >= 3) return "excellent";
    if (stars === 2) return "successful";
    if (stars === 1) return "partial";
    return "struggled";
}
