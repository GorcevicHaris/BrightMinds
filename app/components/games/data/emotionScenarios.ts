// Sadržaj igre "Emocije": osećanja, scenariji i raspored po nivoima.
// Tekstovi koriste parove `{muški|ženski}` koje razrešava `genderText` iz kit/utils.
// Emodži scene namerno nije lice, da ne bi odao odgovor.

export type EmotionId = "happy" | "sad" | "angry" | "scared" | "surprised" | "proud";

export interface Emotion {
    id: EmotionId;
    emoji: string;
    label: string;
}

/** Stalan redosled prikaza — osećanja su uvek na istom mestu, što detetu olakšava snalaženje. */
export const EMOTION_ORDER: readonly EmotionId[] = ["happy", "sad", "angry", "scared", "surprised", "proud"];

export const EMOTIONS: Record<EmotionId, Emotion> = {
    happy: { id: "happy", emoji: "😀", label: "Srećno" },
    sad: { id: "sad", emoji: "😢", label: "Tužno" },
    angry: { id: "angry", emoji: "😡", label: "Ljuto" },
    scared: { id: "scared", emoji: "😨", label: "Uplašeno" },
    surprised: { id: "surprised", emoji: "😲", label: "Iznenađeno" },
    proud: { id: "proud", emoji: "😌", label: "Ponosno" },
};

export interface EmotionScenario {
    id: number;
    /** Emodži scene */
    scene: string;
    /** Kratka rečenica koja opisuje situaciju */
    text: string;
    correct: EmotionId;
    /** Zašto se tako osećamo — prikazuje se posle tačnog odgovora */
    why: string;
    /** Osećanja koja bi takođe imala smisla, pa se ne nude kao pogrešan odgovor */
    avoid?: readonly EmotionId[];
}

type ScenarioRow = Omit<EmotionScenario, "id">;

function withIds(firstId: number, rows: ScenarioRow[]): EmotionScenario[] {
    return rows.map((row, i) => ({ id: firstId + i, ...row }));
}

// ── Lako, nivoi 1–2: srećno ili tužno (po 4 zadatka) ──────────────────────────
const EASY_TWO = withIds(101, [
    // Nivo 1
    { scene: "🎁", text: "Dobi{o|la} si poklon!", correct: "happy", why: "Kad dobijemo poklon, osećamo se srećno." },
    { scene: "🩹", text: "Pa{o|la} si i udari{o|la} koleno.", correct: "sad", why: "Kad padnemo i zaboli nas, osećamo se tužno." },
    { scene: "🎂", text: "Slaviš rođendan!", correct: "happy", why: "Kad slavimo rođendan, osećamo se srećno." },
    { scene: "💔", text: "Pokvarila se tvoja omiljena igračka.", correct: "sad", why: "Kad se omiljena igračka pokvari, osećamo se tužno." },
    // Nivo 2
    { scene: "⭐", text: "Mama te je pohvalila.", correct: "happy", why: "Kad nas neko pohvali, osećamo se srećno." },
    { scene: "📃", text: "Tvoj crtež se iscepao.", correct: "sad", why: "Kad se naš crtež iscepa, osećamo se tužno." },
    { scene: "🤝", text: "Drug želi da se igra s tobom.", correct: "happy", why: "Kad neko želi da se igra s nama, osećamo se srećno." },
    { scene: "🎈", text: "Tvoj balon je odleteo.", correct: "sad", why: "Kad nam balon odleti, osećamo se tužno." },
]);

// ── Lako, nivoi 3–5: dodaje se ljuto (po 4 zadatka) ───────────────────────────
const EASY_THREE = withIds(121, [
    // Nivo 3
    { scene: "🧸", text: "Drug ti je uzeo igračku.", correct: "angry", why: "Kad nam neko uzme igračku, osećamo se ljuto." },
    { scene: "🌳", text: "Ideš u park da se igraš.", correct: "happy", why: "Kad idemo u park, osećamo se srećno." },
    { scene: "🧱", text: "Neko je srušio tvoju kulu od kocaka.", correct: "angry", why: "Kad nam neko sruši kulu, osećamo se ljuto." },
    { scene: "🍦", text: "Sladoled ti je pao na zemlju.", correct: "sad", why: "Kad nam sladoled padne, osećamo se tužno." },
    // Nivo 4
    { scene: "🧍", text: "Neko te je gurnuo i nije se izvinio.", correct: "angry", why: "Kad nas neko gurne i ne izvini se, osećamo se ljuto." },
    { scene: "❤️", text: "Mama te je čvrsto zagrlila.", correct: "happy", why: "Kad nas mama zagrli, osećamo se srećno." },
    { scene: "🖍️", text: "Brat ti je išarao crtež.", correct: "angry", why: "Kad nam neko išara crtež, osećamo se ljuto." },
    { scene: "🌧️", text: "Pada kiša i ne možeš napolje.", correct: "sad", why: "Kad ne možemo napolje da se igramo, osećamo se tužno." },
    // Nivo 5
    { scene: "🍫", text: "Neko ti je pojeo čokoladu bez pitanja.", correct: "angry", why: "Kad nam neko uzme nešto bez pitanja, osećamo se ljuto." },
    { scene: "🐱", text: "Maziš malu macu.", correct: "happy", why: "Kad mazimo macu, osećamo se srećno." },
    { scene: "📺", text: "Neko ti je ugasio omiljeni crtani film.", correct: "angry", why: "Kad nam neko ugasi crtani film, osećamo se ljuto." },
    { scene: "🔍", text: "Ne možeš da nađeš svog medu.", correct: "sad", why: "Kad izgubimo omiljenu igračku, osećamo se tužno." },
]);

// ── Srednje, nivoi 6–10: sva četiri osnovna osećanja (po 5 zadataka) ──────────
const MEDIUM = withIds(201, [
    // Nivo 6
    { scene: "🐕", text: "Veliki pas laje i trči prema tebi.", correct: "scared", why: "Kad veliki pas trči prema nama, osećamo se uplašeno." },
    { scene: "👵", text: "Baka ti je došla u goste.", correct: "happy", why: "Kad nam dođe neko koga volimo, osećamo se srećno." },
    { scene: "⛈️", text: "Napolju jako grmi.", correct: "scared", why: "Kad jako grmi, osećamo se uplašeno." },
    { scene: "🚚", text: "Tvoj najbolji drug se seli daleko.", correct: "sad", why: "Kad se drug odseli, osećamo se tužno." },
    { scene: "📕", text: "Drug ti je pocepao knjigu.", correct: "angry", why: "Kad nam neko pocepa knjigu, osećamo se ljuto." },
    // Nivo 7
    { scene: "🏪", text: "Izgubi{o|la} si se u prodavnici.", correct: "scared", why: "Kad se izgubimo, osećamo se uplašeno." },
    { scene: "🏖️", text: "Ideš na more!", correct: "happy", why: "Kad idemo na more, osećamo se srećno." },
    { scene: "💡", text: "Odjednom se ugasilo svetlo u sobi.", correct: "scared", why: "Kad odjednom ostanemo u mraku, osećamo se uplašeno." },
    { scene: "🛏️", text: "Tvoj drug je bolestan i ne može da dođe.", correct: "sad", why: "Kad drug ne može da dođe, osećamo se tužno." },
    { scene: "🚶", text: "Neko se ugurao ispred tebe u redu.", correct: "angry", why: "Kad se neko ugura preko reda, osećamo se ljuto." },
    // Nivo 8
    { scene: "🌙", text: "Čuješ čudan zvuk u mraku.", correct: "scared", why: "Kad čujemo čudan zvuk u mraku, osećamo se uplašeno." },
    { scene: "📖", text: "Tata ti čita omiljenu priču.", correct: "happy", why: "Kad nam čitaju omiljenu priču, osećamo se srećno." },
    { scene: "🐝", text: "Pčela zuji oko tvoje glave.", correct: "scared", why: "Kad pčela zuji oko nas, osećamo se uplašeno." },
    { scene: "👋", text: "Igra je gotova i drug ide kući.", correct: "sad", why: "Kad se igra završi i drug ode, osećamo se tužno." },
    { scene: "🧢", text: "Neko ti je namerno bacio kapu u baru.", correct: "angry", why: "Kad nam neko namerno baci stvari, osećamo se ljuto." },
    // Nivo 9
    { scene: "💤", text: "Sanja{o|la} si ružan san.", correct: "scared", why: "Kad sanjamo ružan san, osećamo se uplašeno." },
    { scene: "⛄", text: "Pao je sneg i praviš Sneška.", correct: "happy", why: "Kad se igramo na snegu, osećamo se srećno." },
    { scene: "🕷️", text: "Veliki pauk ide prema tebi.", correct: "scared", why: "Kad veliki pauk ide prema nama, osećamo se uplašeno." },
    { scene: "🧳", text: "Mama ide na put i neće je biti nekoliko dana.", correct: "sad", why: "Kad neko koga volimo ode na put, osećamo se tužno." },
    { scene: "🧩", text: "Sestra ti je namerno rasturila slagalicu.", correct: "angry", why: "Kad nam neko namerno pokvari igru, osećamo se ljuto." },
    // Nivo 10
    { scene: "💉", text: "Doktor treba da ti da vakcinu.", correct: "scared", why: "Kad treba da primimo vakcinu, osećamo se uplašeno." },
    { scene: "🦁", text: "Ideš u zoološki vrt.", correct: "happy", why: "Kad idemo u zoološki vrt, osećamo se srećno." },
    { scene: "🧗", text: "Pope{o|la} si se visoko i ne možeš da siđeš.", correct: "scared", why: "Kad smo visoko i ne možemo da siđemo, osećamo se uplašeno." },
    { scene: "🐻", text: "Zaboravi{o|la} si omiljenog medu kod bake.", correct: "sad", why: "Kad nam nedostaje omiljena igračka, osećamo se tužno." },
    { scene: "🎲", text: "Drug vara u igri.", correct: "angry", why: "Kad neko vara u igri, osećamo se ljuto." },
]);

// ── Teško, nivoi 11–13: iznenađeno i ponosno + suptilnije situacije ───────────
const HARD_FOUR = withIds(301, [
    // Nivo 11
    { scene: "🎉", text: "Uđeš u sobu, a drugari viknu: „Iznenađenje!”", correct: "surprised", avoid: ["happy"], why: "Kad se desi nešto što nismo očekivali, osećamo se iznenađeno." },
    { scene: "🧩", text: "Sam{|a} si složi{o|la} celu slagalicu.", correct: "proud", avoid: ["happy"], why: "Kad sami uradimo nešto teško, osećamo se ponosno." },
    { scene: "🪁", text: "Deca se igraju, a tebe nisu pozvala.", correct: "sad", avoid: ["angry"], why: "Kad nas ne pozovu u igru, osećamo se tužno." },
    { scene: "🦷", text: "Sutra prvi put ideš kod zubara.", correct: "scared", why: "Kad ne znamo šta nas čeka, možemo da se osećamo uplašeno." },
    { scene: "⏳", text: "Dugo čekaš na ljuljašku, a drug neće da siđe.", correct: "angry", avoid: ["sad"], why: "Kad dugo čekamo, a ne dobijemo svoj red, osećamo se ljuto." },
    // Nivo 12
    { scene: "🎩", text: "Mađioničar je izvukao zeca iz šešira!", correct: "surprised", avoid: ["happy"], why: "Kad vidimo nešto neočekivano, osećamo se iznenađeno." },
    { scene: "👟", text: "Prvi put si sam{|a} veza{o|la} pertle.", correct: "proud", avoid: ["happy"], why: "Kad naučimo nešto novo, osećamo se ponosno." },
    { scene: "🌈", text: "Kiša je stala i možeš napolje da se igraš.", correct: "happy", avoid: ["surprised"], why: "Kad možemo napolje da se igramo, osećamo se srećno." },
    { scene: "🎤", text: "Treba da recituješ pred celim razredom.", correct: "scared", why: "Pred nastup možemo da se osećamo uplašeno. To se zove trema." },
    { scene: "🗣️", text: "Rek{ao|la} si istinu, a niko ti ne veruje.", correct: "angry", avoid: ["sad"], why: "Kad govorimo istinu, a ne veruju nam, osećamo se ljuto." },
    // Nivo 13
    { scene: "🚪", text: "Na vratima je baka, a nisi zna{o|la} da dolazi!", correct: "surprised", avoid: ["happy"], why: "Kad neko dođe, a nismo ga očekivali, osećamo se iznenađeno." },
    { scene: "🖼️", text: "Učiteljica je pokazala tvoj crtež celom razredu.", correct: "proud", avoid: ["happy"], why: "Kad drugi pohvale naš trud, osećamo se ponosno." },
    { scene: "🏰", text: "Talas je srušio tvoju kulu od peska.", correct: "sad", avoid: ["angry"], why: "Kad se sruši nešto što smo dugo pravili, osećamo se tužno." },
    { scene: "🏫", text: "Prvi dan si u novoj školi i nikoga ne poznaješ.", correct: "scared", why: "Na novom mestu, među nepoznatom decom, možemo da se osećamo uplašeno." },
    { scene: "🤝", text: "Posvađali ste se, ali ste se drug i ti pomirili.", correct: "happy", avoid: ["proud"], why: "Kad se pomirimo sa drugom, osećamo se srećno." },
]);

// ── Teško, nivoi 14–15: isto, ali sa pet ponuđenih osećanja ───────────────────
const HARD_FIVE = withIds(351, [
    // Nivo 14
    { scene: "🎈", text: "Balon je odjednom glasno pukao!", correct: "surprised", avoid: ["scared"], why: "Kad se nešto desi iznenada, osećamo se iznenađeno." },
    { scene: "🚲", text: "Nauči{o|la} si da voziš bicikl bez pomoćnih točkića.", correct: "proud", avoid: ["happy"], why: "Kad posle mnogo vežbanja uspemo, osećamo se ponosno." },
    { scene: "📅", text: "Drug je obećao da će doći, ali nije došao.", correct: "sad", avoid: ["angry"], why: "Kad se ne desi ono čemu smo se radovali, osećamo se tužno." },
    { scene: "🛏️", text: "Prvi put spavaš kod bake, bez mame i tate.", correct: "scared", avoid: ["sad"], why: "Kad prvi put spavamo bez mame i tate, možemo da se osećamo uplašeno." },
    { scene: "⚖️", text: "Okrivili su te za nešto što nisi uradi{o|la}.", correct: "angry", avoid: ["sad"], why: "Kad nas okrive za nešto što nismo uradili, osećamo se ljuto." },
    // Nivo 15
    { scene: "❄️", text: "Probudi{o|la} si se, a napolju je sve belo od snega!", correct: "surprised", avoid: ["happy"], why: "Kad ugledamo nešto što nismo očekivali, osećamo se iznenađeno." },
    { scene: "🛍️", text: "Pomog{ao|la} si baki da ponese tešku kesu.", correct: "proud", avoid: ["happy"], why: "Kad nekome pomognemo, osećamo se ponosno." },
    { scene: "👓", text: "Neko ti se ruga zbog novih naočara.", correct: "angry", avoid: ["sad"], why: "Kad nam se neko ruga, osećamo se ljuto." },
    { scene: "🧺", text: "Mama kaže: „Sutra idemo na izlet!”", correct: "happy", avoid: ["surprised"], why: "Kad se nečemu radujemo, osećamo se srećno." },
    { scene: "🌅", text: "Leto je gotovo i odlaziš sa mora.", correct: "sad", avoid: ["angry"], why: "Kad se završi nešto lepo, osećamo se tužno." },
]);

// ── Raspored po nivoima ───────────────────────────────────────────────────────

interface LevelBand {
    first: number;
    last: number;
    /** Broj zadataka u nivou */
    rounds: number;
    /** Broj ponuđenih osećanja */
    choices: number;
    /** Osećanja koja se na ovim nivoima mogu ponuditi */
    palette: readonly EmotionId[];
    pool: readonly EmotionScenario[];
}

const BASIC_FOUR: readonly EmotionId[] = ["happy", "sad", "angry", "scared"];

const BANDS: readonly LevelBand[] = [
    { first: 1, last: 2, rounds: 4, choices: 2, palette: ["happy", "sad"], pool: EASY_TWO },
    { first: 3, last: 5, rounds: 4, choices: 3, palette: ["happy", "sad", "angry"], pool: EASY_THREE },
    { first: 6, last: 10, rounds: 5, choices: 4, palette: BASIC_FOUR, pool: MEDIUM },
    { first: 11, last: 13, rounds: 5, choices: 4, palette: EMOTION_ORDER, pool: HARD_FOUR },
    { first: 14, last: 15, rounds: 5, choices: 5, palette: EMOTION_ORDER, pool: HARD_FIVE },
];

const MAX_LEVEL = BANDS[BANDS.length - 1].last;

const SCENARIOS_BY_ID = new Map<number, EmotionScenario>(
    BANDS.flatMap((band) => band.pool).map((scenario) => [scenario.id, scenario])
);

export interface EmotionLevel {
    /** Scenariji nivoa u osnovnom redosledu (igra ih meša) */
    scenarios: EmotionScenario[];
    choices: number;
    palette: readonly EmotionId[];
}

/**
 * Scenariji i pravila za nivo. Izbor je determinisan: svaki nivo dobija svoj
 * deo skupa za tu težinu, pa se isti scenariji ne ponavljaju u susednim nivoima.
 * Nivo van opsega 1–15 se svodi na najbliži postojeći.
 */
export function getEmotionLevel(level: number): EmotionLevel {
    const safe = Number.isFinite(level) ? Math.min(Math.max(Math.round(level), 1), MAX_LEVEL) : 1;
    const band = BANDS.find((b) => safe >= b.first && safe <= b.last) ?? BANDS[0];
    const start = (safe - band.first) * band.rounds;
    const scenarios = Array.from({ length: band.rounds }, (_, i) => band.pool[(start + i) % band.pool.length]);
    return { scenarios, choices: band.choices, palette: band.palette };
}

export function getScenario(id: number): EmotionScenario | undefined {
    return SCENARIOS_BY_ID.get(id);
}

/** Osećanja koja smeju da se ponude kao pogrešan odgovor za dati scenario. */
export function distractorsFor(scenario: EmotionScenario, palette: readonly EmotionId[]): EmotionId[] {
    return palette.filter((id) => id !== scenario.correct && !scenario.avoid?.includes(id));
}

/** Ređa osećanja u stalni redosled prikaza i izbacuje duplikate i nepoznate vrednosti. */
export function inEmotionOrder(ids: readonly unknown[]): EmotionId[] {
    return EMOTION_ORDER.filter((id) => ids.includes(id));
}
