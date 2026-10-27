// Sadržaj igre „Ko šta radi?”: zanimanja, njihovi alati, mesta gde rade i ko nam pomaže u kojoj
// nevolji. Svaki radnik ima ime (Semir je vatrogasac, Emina je doktorka), pa dete upoznaje
// ljude, a ne samo reči. Bez Reacta, da bi se nivoi proveravali u testovima; crteži su u
// games/jobs/.
//
// Zašto ovako (uzrast 3–8, i deca sa autizmom):
//  • „Pomagači u zajednici” (vatrogasac, doktorka, policajac, pekar…) su omiljena tema
//    predškolaca i deo programa „svet oko nas”: deca ih viđaju svaki dan i igraju ih u igri
//    uloga. Znanje ko nam pomaže kad gori ili kad nas boli zub je i bezbednosna veština.
//  • Zanimanje se uči preko konkretnih predmeta (alat, vozilo, mesto) — vizuelna podrška koja
//    deci sa autizmom pomaže da apstraktnu reč („poštar”) vežu za ono što vide (pismo, torba).
//  • Učenje bez greške: prvi zadatak prvog nivoa (i nivoa sa novom vrstom zadatka) pokazuje
//    ruka; na lakim nivoima su dva izbora i pomoć posle prve greške. Slični radnici (doktorka,
//    zubarka, veterinarka; kuvar, pekar, prodavačica) nisu zajedno među izborima dok dete ne
//    bude spremno, jer bi zadatak bio dvosmislen.
//  • Podrška se povlači postepeno: alat → radnik za alat → razvrstavanje alata → mesto rada →
//    nevolja („Gori kuća.”) → zagonetka sa tragovima („Nosim beli mantil.”) → šta ne pripada.
//  • Reči su ekavske i srpske: doktorka, zubarka, učiteljica, prodavačica, poštar, građevinar,
//    poljoprivrednik, vatrogasno vozilo, toplomer, oklagija, kutlača.
//  • Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak.

import {
    choiceCount,
    cycleThrough,
    randomTools,
    roundCount,
    type BuildOptions,
    type PickRound,
    type SortRound,
    type WorldCard,
    type WorldRound,
} from "@/app/components/games/world/worldPlay";

// ── Radnici ──────────────────────────────────────────────────────────────────

export const JOB_IDS = [
    "firefighter",
    "doctor",
    "police",
    "cook",
    "baker",
    "teacher",
    "mail",
    "hairdresser",
    "pilot",
    "farmer",
    "dentist",
    "builder",
    "vet",
    "seller",
] as const;
export type JobId = (typeof JOB_IDS)[number];

export interface Tool {
    id: string;
    /** Crtež (games/jobs/JobsArt) ili postojeća slika („p:…”) */
    pic: string;
    /** Naziv (nominativ) */
    name: string;
    /** „Vatrogasac gasi vatru crevom.” — rečenica posle tačnog odgovora */
    use: string;
    /** Akuzativ („pištaljku”), za pitanje „Ko koristi pištaljku?” */
    acc: string;
}

export interface Job {
    id: JobId;
    /** Zanimanje (nominativ): „vatrogasac”, „doktorka” */
    title: string;
    /** Ime radnika */
    name: string;
    female: boolean;
    /** Šta radi, jednom rečenicom: „Semir gasi požar.” */
    does: string;
    tools: readonly [Tool, Tool, Tool];
    /** Gde radi: crtež i naziv mesta; „radi u …” */
    place: { pic: string; name: string; where: string };
    /** Zagonetka: tri traga, poslednji je najjasniji */
    clues: readonly [string, string, string];
    /** Grupa sličnih zanimanja (nisu zajedno među izborima na lakšim nivoima) */
    group: "medical" | "food" | "helper" | "school" | "craft" | "travel";
    /** 1 poznato i malom detetu · 2 · 3 */
    tier: 1 | 2 | 3;
}

const tool = (id: string, pic: string, name: string, use: string, acc = name): Tool => ({ id, pic, name, use, acc });

export const JOBS: readonly Job[] = [
    {
        id: "firefighter",
        title: "vatrogasac",
        name: "Semir",
        female: false,
        does: "Vatrogasac gasi požar i spasava ljude.",
        tools: [
            tool("hose", "hose", "crevo za vodu", "Vatrogasac gasi vatru vodom iz creva."),
            tool("ladder", "ladder", "merdevine", "Vatrogasac se penje merdevinama do prozora."),
            tool("fireTruck", "p:fireTruck", "vatrogasno vozilo", "Vatrogasac vozi crveno vatrogasno vozilo."),
        ],
        place: { pic: "station", name: "vatrogasna stanica", where: "u vatrogasnoj stanici" },
        clues: ["Nosim šlem.", "Vozim crveno vozilo.", "Gasim vatru."],
        group: "helper",
        tier: 1,
    },
    {
        id: "doctor",
        title: "doktorka",
        name: "Emina",
        female: true,
        does: "Doktorka pregleda i leči bolesne.",
        tools: [
            tool("stethoscope", "stethoscope", "slušalice", "Doktorka slušalicama sluša srce."),
            tool("thermometer", "p:thermometer", "toplomer", "Doktorka toplomerom meri temperaturu."),
            tool("bandage", "bandage", "flaster", "Doktorka stavlja flaster na ranu."),
        ],
        place: { pic: "hospital", name: "bolnica", where: "u bolnici" },
        clues: ["Nosim beli mantil.", "Slušam srce.", "Lečim bolesne."],
        group: "medical",
        tier: 1,
    },
    {
        id: "police",
        title: "policajac",
        name: "Haris",
        female: false,
        does: "Policajac čuva red i pomaže ljudima.",
        tools: [
            tool("whistle", "whistle", "pištaljka", "Policajac pištaljkom zaustavlja saobraćaj.", "pištaljku"),
            tool("policeCar", "policeCar", "policijski auto", "Policajac vozi policijski auto."),
            tool("policeCap", "policeCap", "policijska kapa", "Policajac nosi kapu sa značkom.", "policijsku kapu"),
        ],
        place: { pic: "policeStation", name: "policijska stanica", where: "u policijskoj stanici" },
        clues: ["Nosim plavu uniformu.", "Imam pištaljku.", "Pomažem kad se izgubiš."],
        group: "helper",
        tier: 1,
    },
    {
        id: "cook",
        title: "kuvar",
        name: "Tarik",
        female: false,
        does: "Kuvar kuva ručak.",
        tools: [
            tool("pot", "pot", "lonac", "Kuvar kuva supu u loncu."),
            tool("ladle", "ladle", "kutlača", "Kuvar kutlačom sipa supu.", "kutlaču"),
            tool("chefHat", "chefHat", "kuvarska kapa", "Kuvar nosi visoku belu kapu.", "kuvarsku kapu"),
        ],
        place: { pic: "restaurant", name: "restoran", where: "u restoranu" },
        clues: ["Nosim visoku belu kapu.", "Mešam u loncu.", "Kuvam ručak."],
        group: "food",
        tier: 1,
    },
    {
        id: "baker",
        title: "pekar",
        name: "Adnan",
        female: false,
        does: "Pekar peče hleb i peciva.",
        tools: [
            tool("bread", "p:bread", "hleb", "Pekar peče hleb."),
            tool("pretzel", "p:pretzel", "đevrek", "Pekar peče đevreke."),
            tool("rollingPin", "rollingPin", "oklagija", "Pekar razvlači testo oklagijom.", "oklagiju"),
        ],
        place: { pic: "bakery", name: "pekara", where: "u pekari" },
        clues: ["Ustajem rano.", "Mesim testo.", "Pečem hleb."],
        group: "food",
        tier: 1,
    },
    {
        id: "teacher",
        title: "učiteljica",
        name: "Ajla",
        female: true,
        does: "Učiteljica uči decu da čitaju i računaju.",
        tools: [
            tool("board", "board", "tabla", "Učiteljica piše na tabli.", "tablu"),
            tool("globe", "globe", "globus", "Učiteljica na globusu pokazuje zemlje i mora."),
            tool("notebook", "p:notebook", "sveska", "Učiteljica pregleda sveske.", "svesku"),
        ],
        place: { pic: "p:school", name: "škola", where: "u školi" },
        clues: ["Pišem na tabli.", "Čitam deci priče.", "Radim u školi."],
        group: "school",
        tier: 1,
    },
    {
        id: "mail",
        title: "poštar",
        name: "Kenan",
        female: false,
        does: "Poštar donosi pisma i pakete.",
        tools: [
            tool("letter", "letter", "pismo", "Poštar nosi pismo do vrata."),
            tool("parcel", "parcel", "paket", "Poštar donosi pakete."),
            tool("mailbox", "mailbox", "poštansko sanduče", "Poštar stavlja pisma u sanduče."),
        ],
        place: { pic: "postOffice", name: "pošta", where: "u pošti" },
        clues: ["Nosim veliku torbu.", "Idem od vrata do vrata.", "Donosim pisma."],
        group: "helper",
        tier: 2,
    },
    {
        id: "hairdresser",
        title: "frizerka",
        name: "Amina",
        female: true,
        does: "Frizerka šiša i češlja kosu.",
        tools: [
            tool("scissors", "p:scissors", "makaze", "Frizerka šiša kosu makazama."),
            tool("comb", "comb", "češalj", "Frizerka češlja kosu češljem."),
            tool("hairDryer", "hairDryer", "fen", "Frizerka suši kosu fenom."),
        ],
        place: { pic: "salon", name: "frizerski salon", where: "u frizerskom salonu" },
        clues: ["Imam češalj i makaze.", "Perem i sušim kosu.", "Šišam."],
        group: "craft",
        tier: 2,
    },
    {
        id: "pilot",
        title: "pilot",
        name: "Emir",
        female: false,
        does: "Pilot upravlja avionom.",
        tools: [
            tool("plane", "p:plane", "avion", "Pilot vozi avion."),
            tool("helicopter", "p:helicopter", "helikopter", "Pilot leti i helikopterom."),
            tool("pilotCap", "pilotCap", "pilotska kapa", "Pilot nosi kapu sa krilima.", "pilotsku kapu"),
        ],
        place: { pic: "airport", name: "aerodrom", where: "na aerodromu" },
        clues: ["Nosim kapu sa krilima.", "Sedim u kabini.", "Upravljam avionom."],
        group: "travel",
        tier: 2,
    },
    {
        id: "farmer",
        title: "poljoprivrednik",
        name: "Faris",
        female: false,
        does: "Poljoprivrednik gaji biljke i životinje.",
        tools: [
            tool("tractor", "p:tractor", "traktor", "Poljoprivrednik ore njivu traktorom."),
            tool("pitchfork", "pitchfork", "vile", "Poljoprivrednik vilama skuplja seno."),
            tool("wateringCan", "wateringCan", "kanta za zalivanje", "Poljoprivrednik zaliva biljke.", "kantu za zalivanje"),
        ],
        place: { pic: "farm", name: "farma", where: "na farmi" },
        clues: ["Vozim traktor.", "Hranim krave i ovce.", "Sadim kukuruz i povrće."],
        group: "craft",
        tier: 2,
    },
    {
        id: "dentist",
        title: "zubarka",
        name: "Nejla",
        female: true,
        does: "Zubarka pregleda i leči zube.",
        tools: [
            tool("toothbrush", "p:toothbrush", "četkica za zube", "Zubarka pokazuje kako se peru zubi.", "četkicu za zube"),
            tool("tooth", "tooth", "zub", "Zubarka leči zube."),
            tool("dentalMirror", "dentalMirror", "ogledalce", "Zubarka ogledalcem gleda zube."),
        ],
        place: { pic: "dentistOffice", name: "zubna ordinacija", where: "u zubnoj ordinaciji" },
        clues: ["Kažem: otvori usta.", "Gledam zube ogledalcem.", "Čistim i lečim zube."],
        group: "medical",
        tier: 2,
    },
    {
        id: "builder",
        title: "građevinar",
        name: "Mirza",
        female: false,
        does: "Građevinar gradi kuće i zgrade.",
        tools: [
            tool("hammer", "p:hammer", "čekić", "Građevinar zakucava eksere čekićem."),
            tool("bricks", "bricks", "cigle", "Građevinar zida zid od cigala."),
            tool("hardHat", "hardHat", "zaštitna kaciga", "Građevinar nosi žutu kacigu.", "zaštitnu kacigu"),
        ],
        place: { pic: "site", name: "gradilište", where: "na gradilištu" },
        clues: ["Nosim žutu kacigu.", "Slažem cigle.", "Gradim kuće."],
        group: "craft",
        tier: 3,
    },
    {
        id: "vet",
        title: "veterinarka",
        name: "Ilma",
        female: true,
        does: "Veterinarka leči životinje.",
        tools: [
            tool("puppy", "p:puppy", "kuca", "Veterinarka pregleda kucu.", "kucu"),
            tool("kitten", "p:kitten", "mače", "Veterinarka leči mače."),
            tool("bunny", "p:rabbit", "zeka", "Veterinarka pregleda zeku.", "zeku"),
        ],
        place: { pic: "vetOffice", name: "veterinarska ambulanta", where: "u veterinarskoj ambulanti" },
        clues: ["Lečim, ali ne ljude.", "Pregledam pse i mačke.", "Pomažem bolesnim životinjama."],
        group: "medical",
        tier: 3,
    },
    {
        id: "seller",
        title: "prodavačica",
        name: "Merjem",
        female: true,
        does: "Prodavačica prodaje hranu i stvari.",
        tools: [
            tool("register", "register", "kasa", "Prodavačica naplaćuje na kasi.", "kasu"),
            tool("shopBasket", "shopBasket", "korpa", "Prodavačica slaže voće u korpu.", "korpu"),
            tool("coins", "coins", "novac", "Prodavačica uzima novac i vraća kusur."),
        ],
        place: { pic: "shop", name: "prodavnica", where: "u prodavnici" },
        clues: ["Radim za kasom.", "Slažem robu na police.", "Prodajem hranu i stvari."],
        group: "food",
        tier: 3,
    },
];

export function getJob(id: unknown): Job | undefined {
    return JOBS.find((job) => job.id === id);
}

const job = (id: JobId): Job => getJob(id)!;

/** Svi crteži igre (test proverava da svaki postoji) */
export function jobPics(): string[] {
    return Array.from(new Set([...JOBS.flatMap((j) => [`job:${j.id}`, j.place.pic, ...j.tools.map((t) => t.pic)]), ...SITUATIONS.map((s) => s.pic)]));
}

// ── Nevolje: ko nam pomaže ────────────────────────────────────────────────────

export interface Situation {
    id: string;
    pic: string;
    /** Šta se desilo (pitanje počinje ovim) */
    text: string;
    helper: JobId;
    /** Zašto baš on/ona */
    why: string;
}

export const SITUATIONS: readonly Situation[] = [
    { id: "fire", pic: "sitFire", text: "Gori kuća!", helper: "firefighter", why: "Vatrogasac gasi požar." },
    { id: "fever", pic: "sitFever", text: "Lejla ima temperaturu.", helper: "doctor", why: "Doktorka pregleda Lejlu i daje joj lek." },
    { id: "tooth", pic: "sitTooth", text: "Amara boli zub.", helper: "dentist", why: "Zubarka leči zub." },
    { id: "kitten", pic: "sitKitten", text: "Mače je povredilo šapu.", helper: "vet", why: "Veterinarka leči životinje." },
    { id: "lost", pic: "sitLost", text: "Tarik se izgubio u gradu.", helper: "police", why: "Policajac pomaže deci koja su se izgubila." },
    { id: "hungry", pic: "sitHungry", text: "Gladni smo, a ručak još nije gotov.", helper: "cook", why: "Kuvar kuva ručak." },
    { id: "letter", pic: "sitLetter", text: "Baka nam šalje pismo.", helper: "mail", why: "Poštar donosi pismo do naših vrata." },
    { id: "build", pic: "sitBuild", text: "Gradimo novu kuću.", helper: "builder", why: "Građevinar gradi kuće." },
];

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/**
 * tool    — „Šta koristi vatrogasac?” (radnik → alat)
 * worker  — „Ko koristi makaze?” (alat → radnik)
 * sort    — alati do svojih radnika
 * place   — „Gde radi pekar?”
 * help    — „Gori kuća! Ko nam pomaže?”
 * riddle  — „Ko sam ja?” (tragovi)
 * odd     — „Šta ne pripada kuvaru?”
 */
export type JobsKind = "tool" | "worker" | "sort" | "place" | "help" | "riddle" | "odd";

export interface JobsLevel {
    kinds: readonly JobsKind[];
    jobs: readonly JobId[];
    rounds: number;
    choices: number;
    /** Slični radnici smeju zajedno među izborima (doktorka i zubarka) */
    close: boolean;
    /** Broj tragova u zagonetki */
    clues: number;
    intro: boolean;
    earlyHint: boolean;
}

const T1: JobId[] = ["firefighter", "doctor", "police", "cook", "baker", "teacher"];
const T2: JobId[] = [...T1, "mail", "hairdresser", "pilot", "farmer", "dentist"];
const ALL: JobId[] = [...JOB_IDS];

const lvl = (kinds: JobsKind[], jobs: JobId[], rounds: number, choices: number, extra: Partial<JobsLevel> = {}): JobsLevel => ({
    kinds,
    jobs,
    rounds,
    choices,
    close: false,
    clues: 3,
    intro: false,
    earlyHint: false,
    ...extra,
});

export const JOBS_LEVELS: readonly JobsLevel[] = [
    // Lako: poznati pomagači i njihovi alati, dva izbora
    lvl(["tool"], ["firefighter", "doctor", "police", "cook"], 4, 2, { earlyHint: true }),
    lvl(["worker"], ["firefighter", "doctor", "police", "cook", "baker"], 5, 2, { earlyHint: true }),
    lvl(["sort"], T1, 3, 2, { intro: true, earlyHint: true }),
    lvl(["tool", "worker"], T1, 5, 3, { earlyHint: true }),
    lvl(["help"], ["firefighter", "doctor", "police", "cook", "mail"], 5, 2, { earlyHint: true }),
    // Srednje: nova zanimanja, mesto rada, tri radnika u razvrstavanju
    lvl(["tool", "worker"], T2, 5, 3),
    lvl(["place"], T2, 5, 3, { intro: true }),
    lvl(["sort"], T2, 3, 3),
    lvl(["help"], [...T2, "builder", "vet"], 5, 3),
    lvl(["place", "worker"], T2, 5, 4),
    // Teško: svi radnici, slični zajedno, zagonetke i „šta ne pripada”
    lvl(["riddle"], T2, 5, 3, { clues: 2, intro: true }),
    lvl(["sort"], ALL, 3, 3, { close: true }),
    lvl(["riddle"], ALL, 5, 4, { close: true }),
    lvl(["odd"], ALL, 5, 4, { intro: true, close: true }),
    lvl(["riddle", "odd", "help", "place", "worker"], ALL, 6, 4, { close: true }),
];

export const JOBS_MAX_LEVEL = JOBS_LEVELS.length;

export function jobsLevel(level: number): JobsLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), JOBS_MAX_LEVEL);
    return JOBS_LEVELS[safe - 1];
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Veterinarka ne „koristi” životinje — ona ih leči; ostali radnici koriste alate */
const HEALS: readonly JobId[] = ["vet"];

/** Pitanje radnik → alat: „Šta koristi pekar?”, „Koga leči veterinarka?” */
export function toolQuestion(j: Job): string {
    return HEALS.includes(j.id) ? `Koga leči ${j.title}?` : `Šta koristi ${j.title}?`;
}

/** Za stvari koje se ne „koriste” (hleb, pismo, avion) pitanje kaže šta se sa njima radi */
const WORKER_QUESTIONS: Readonly<Record<string, string>> = {
    fireTruck: "Ko vozi vatrogasno vozilo?",
    policeCar: "Ko vozi policijski auto?",
    bread: "Ko peče hleb?",
    pretzel: "Ko peče đevreke?",
    board: "Ko piše na tabli?",
    letter: "Ko donosi pisma?",
    parcel: "Ko donosi pakete?",
    mailbox: "Ko stavlja pisma u sanduče?",
    plane: "Ko upravlja avionom?",
    helicopter: "Ko leti helikopterom?",
    tractor: "Ko vozi traktor?",
    tooth: "Ko leči zube?",
    register: "Ko radi na kasi?",
    coins: "Ko uzima novac i vraća kusur?",
};

/** Pitanje alat → radnik: „Ko koristi pištaljku?”, „Ko leči mače?”, „Ko peče hleb?” */
export function workerQuestion(t: Tool): string {
    if (WORKER_QUESTIONS[t.id]) return WORKER_QUESTIONS[t.id];
    return HEALS.includes(ownerOf(t).id) ? `Ko leči ${t.acc}?` : `Ko koristi ${t.acc}?`;
}

/** Čije je, rečenicom o tome šta radnik radi: „Pekar peče hleb.”, „Veterinarka leči mače.” */
export function belongsTo(t: Tool): string {
    return t.use;
}

/** Pitanje „šta ne pripada”: „Šta ne koristi kuvar?”, „Ko nije za veterinarku?” */
export function oddQuestion(j: Job): string {
    return HEALS.includes(j.id) ? `Šta ne pripada veterinarki?` : `Šta ne koristi ${j.title}?`;
}

export function ownerOf(t: Tool): Job {
    return JOBS.find((j) => j.tools.some((x) => x.id === t.id))!;
}

/** „Semir je vatrogasac.” */
export function introOf(j: Job): string {
    return `${j.name} je ${j.title}.`;
}

// ── Plan nivoa ────────────────────────────────────────────────────────────────

/** Kartica radnika: crtež i zanimanje (ime se kaže u rečenicama) */
export const workerCard = (j: Job): WorldCard => ({ id: j.id, pic: `job:${j.id}`, label: j.title });
const toolCard = (t: Tool): WorldCard => ({ id: t.id, pic: t.pic, label: t.name });

/** Plan nivoa: zadaci jedan za drugim. `random` daje [0, 1) (seme dvoboja ili Math.random). */
export function buildJobsLevel(level: number, { maxRounds, maxChoices, random = Math.random }: BuildOptions): WorldRound[] {
    const rule = jobsLevel(level);
    const { shuffle, pick } = randomTools(random);
    const count = roundCount(rule.rounds, maxRounds);
    const choices = choiceCount(rule.choices, maxChoices);
    const kinds = cycleThrough(rule.kinds, count, shuffle);
    const situations = SITUATIONS.filter((s) => rule.jobs.includes(s.helper));
    // Radnici redom (svaki pre ponavljanja); pokazni zadatak prvog nivoa je vatrogasac
    const order = cycleThrough(rule.jobs, count, shuffle);
    if (level === 1) order[0] = "firefighter";
    const helps = cycleThrough(situations, count, shuffle, (s) => s.id);

    /** Ostali radnici za izbor: bez sličnih (osim kad nivo dozvoljava) */
    const others = (target: Job, size: number): Job[] => {
        const pool = shuffle(rule.jobs.filter((id) => id !== target.id).map(job));
        // Daleki radnici, po jedan iz svake grupe (raznovrsni izbori), pa ostali
        const far: Job[] = [];
        for (const j of pool) if (j.group !== target.group && !far.some((f) => f.group === j.group)) far.push(j);
        for (const j of pool) if (j.group !== target.group && !far.includes(j)) far.push(j);
        const near = pool.filter((j) => j.group === target.group);
        return (rule.close ? [...near.slice(0, 1), ...far, ...near.slice(1)] : far).slice(0, size);
    };

    return kinds.map((kind, index): WorldRound => {
        const modeled = index === 0 && (level === 1 || rule.intro);
        const target = job(order[index]);
        switch (kind) {
            case "tool": {
                const t = level === 1 && index === 0 ? target.tools[0] : pick(target.tools);
                const rest = others(target, choices - 1).map((j) => pick(j.tools));
                return pickRound({
                    prompt: `${introOf(target)} ${toolQuestion(target)}`,
                    why: t.use,
                    modeled,
                    cue: workerCard(target),
                    choices: shuffle([toolCard(t), ...rest.map(toolCard)]),
                    answer: t.id,
                    notes: Object.fromEntries(rest.map((r) => [r.id, belongsTo(r)])),
                });
            }
            case "worker": {
                const t = pick(target.tools);
                const rest = others(target, choices - 1);
                return pickRound({
                    prompt: workerQuestion(t),
                    why: t.use,
                    modeled,
                    cue: toolCard(t),
                    choices: shuffle([target, ...rest].map(workerCard)),
                    answer: target.id,
                    notes: Object.fromEntries(rest.map((r) => [r.id, `${introOf(r)} ${r.does}`])),
                });
            }
            case "place": {
                const rest = others(target, choices - 1);
                const placeCard = (j: Job): WorldCard => ({ id: j.id, pic: j.place.pic, label: j.place.name });
                return pickRound({
                    prompt: `Gde radi ${target.title}?`,
                    why: `${cap(target.title)} radi ${target.place.where}.`,
                    modeled,
                    cue: workerCard(target),
                    choices: shuffle([target, ...rest].map(placeCard)),
                    answer: target.id,
                    notes: Object.fromEntries(rest.map((r) => [r.id, `${cap(r.title)} radi ${r.place.where}.`])),
                });
            }
            case "help": {
                const s = helps[index];
                const helper = job(s.helper);
                const rest = others(helper, choices - 1);
                return pickRound({
                    prompt: `${s.text} Ko nam pomaže?`,
                    why: s.why,
                    modeled,
                    cue: { id: s.id, pic: s.pic, label: "" },
                    choices: shuffle([helper, ...rest].map(workerCard)),
                    answer: helper.id,
                    notes: Object.fromEntries(rest.map((r) => [r.id, r.does])),
                });
            }
            case "riddle": {
                const rest = others(target, choices - 1);
                const clues = target.clues.slice(target.clues.length - rule.clues);
                return {
                    ...pickRound({
                        prompt: "Ko sam ja?",
                        why: `${introOf(target)} ${target.does}`,
                        modeled,
                        cue: null,
                        choices: shuffle([target, ...rest].map(workerCard)),
                        answer: target.id,
                        notes: Object.fromEntries(rest.map((r) => [r.id, r.does])),
                    }),
                    clues: [...clues],
                };
            }
            case "odd": {
                const own = target.tools.slice(0, Math.max(1, choices - 1));
                const stranger = others(target, 1)[0] ?? job(target.id === "cook" ? "firefighter" : "cook");
                const foreign = pick(stranger.tools);
                return pickRound({
                    prompt: oddQuestion(target),
                    why: belongsTo(foreign),
                    modeled,
                    cue: workerCard(target),
                    choices: shuffle([foreign, ...own].map(toolCard)),
                    answer: foreign.id,
                    notes: Object.fromEntries(own.map((t) => [t.id, t.use])),
                });
            }
            case "sort":
                return sortRound(rule, index, order, modeled, shuffle);
        }
    });
}

function pickRound(round: Pick<PickRound, "prompt" | "why" | "modeled" | "cue" | "choices" | "answer" | "notes">): PickRound {
    return { kind: "pick", cueWide: false, clues: [], style: "pic", ...round };
}

function sortRound(rule: JobsLevel, index: number, order: JobId[], modeled: boolean, shuffle: <T>(list: readonly T[]) => T[]): SortRound {
    // Radnici iz različitih grupa (osim kad nivo dozvoljava slične), svaki sa jednim ili dva alata
    const size = Math.max(2, Math.min(rule.choices, 3));
    const first = job(order[index]);
    const picked: Job[] = [first];
    for (const id of shuffle(rule.jobs)) {
        if (picked.length >= size) break;
        const j = job(id);
        if (picked.some((p) => p.id === j.id)) continue;
        if (!rule.close && picked.some((p) => p.group === j.group)) continue;
        picked.push(j);
    }
    const per = 2;
    const homes: Record<string, string> = {};
    const says: Record<string, string> = {};
    const notes: Record<string, string> = {};
    const items: WorldCard[] = [];
    for (const j of picked) {
        for (const t of shuffle(j.tools).slice(0, per)) {
            items.push(toolCard(t));
            homes[t.id] = j.id;
            says[t.id] = t.use;
            notes[t.id] = belongsTo(t);
        }
    }
    return {
        kind: "sort",
        prompt: "Šta je čije? Svaka stvar ide svom radniku.",
        why: "Sve stvari su kod svojih radnika.",
        modeled,
        bins: picked.map(workerCard),
        items: shuffle(items),
        homes,
        says,
        notes,
    };
}
