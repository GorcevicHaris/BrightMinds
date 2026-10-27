// lib/gameWorlds.ts
// „Mape” (svetovi) na dečjem ekranu: igre su raspoređene u do sedam mapa po težini — Zelena
// livada, Čarobna šuma, Peščana pustinja, Podvodni svet, Vatreni vulkan, Ledeni vrhovi i
// Svemir. Na kraju svake mape je kapija sa ključem: kad dete skupi dovoljno zvezdica na toj
// mapi, kapija se otvara i otključava se sledeća mapa; na kraju svemira je raketa sa kovčegom
// blaga. Čist modul (bez Reacta), da se pravila lako testiraju.
//
// Zašto ovako (istraživanje i odluke):
//  • Predvidljiva struktura: uvek isti redosled mapa i isti put kroz svaku — kao vizuelni
//    raspored u TEACCH pristupu (dete vidi šta je sada, šta je posle i gde je kraj).
//  • Vidljiv napredak: „⭐ 3 / 5” na kartici mape i kod kapije; dete vidi koliko je ostalo.
//  • Kratke mape: najviše oko sedam igara po mapi, da cilj bude blizu — sa 47 igara bi
//    četiri mape od po dvanaest igara bile preduge za pažnju deteta od 3 do 10 godina.
//  • Jasan i dostižan cilj: za kapiju treba prosečno jedna pređena težina po igri (videti
//    `starsToOpen`). Nema vremenskog pritiska, a nijedna igra nije obavezna.
//  • Bez gubitka napretka: zvezdice se nikad ne oduzimaju, a mapa u kojoj je dete već nešto
//    igralo ostaje otvorena i kad se raspored promeni (roditelj isključi igru, dete poraste).
//  • Mirno otključavanje: kratko slavlje bez naglih zvukova i bljeskanja; zaključana mapa se
//    može pogledati i kaže mirno šta treba („Skupi još 3 zvezdice na livadi…”), bez kazne.
//  • Roditelj može sve da otvori („Sve mape otvorene”, `openAllMaps`) — za decu kojoj
//    katanci i čekanje stvaraju nemir.
//
// Kako se slaže sa ostalim pravilima (lib/gameAccess.ts):
//  • Mape su samo podsticaj na samostalnoj mapi deteta. „Otključavanje redom” i isključene
//    igre važe i dalje, unutar mape. Igra sa drugom (isti uređaj, drugi uređaj, takmičenje) ne
//    gleda mape, a ni server ih ne proverava (rezultat se čuva kao i do sada).
//  • Mape idu po težini igre (`byDifficulty`), ne po uzrastu deteta: livada ima najlakše igre.
//  • Igre se dele po svim igrama koje je roditelj uključio (i onima koje „Otključavanje
//    redom” još drži zaključanim), da igra ne bi prelazila iz mape u mapu kako se otvaraju.
//  • Dnevni plan roditelja ima svoj put (bez mapa); igra iz plana je uvek dostupna.
import { LEVELS_PER_TIER, MAX_LEVEL, type GameId } from "./games";
import type { GameProgress } from "./gameAccess";

// Redosled je težina (livada najlakša, svemir poslednji). Stari ID-jevi su ostali isti, pa
// zapamćena mapa i otvorene kapije (localStorage) i dalje važe.
export const WORLD_IDS = ["meadow", "forest", "desert", "ocean", "volcano", "ice", "space"] as const;
export type WorldId = (typeof WORLD_IDS)[number];

/** Najviše mapa (toliko ih je nacrtano) */
export const MAX_WORLDS = WORLD_IDS.length;

/** Reči za svaku mapu (padeži za rečenice detetu) */
export interface WorldWords {
    /** „Zelena livada” */
    name: string;
    /** Kratko ime za karticu na uskom telefonu */
    short: string;
    /** Akuzativ celog imena: „Otvorila si Zelenu livadu” */
    nameAcc: string;
    /** Akuzativ kratko: „da otključaš livadu” */
    acc: string;
    /** Gde: „na livadi” */
    where: string;
}

export const WORLD_WORDS: Record<WorldId, WorldWords> = {
    meadow: { name: "Zelena livada", short: "Livada", nameAcc: "Zelenu livadu", acc: "livadu", where: "na livadi" },
    forest: { name: "Čarobna šuma", short: "Šuma", nameAcc: "Čarobnu šumu", acc: "šumu", where: "u šumi" },
    desert: { name: "Peščana pustinja", short: "Pustinja", nameAcc: "Peščanu pustinju", acc: "pustinju", where: "u pustinji" },
    ocean: { name: "Podvodni svet", short: "More", nameAcc: "Podvodni svet", acc: "podvodni svet", where: "pod morem" },
    volcano: { name: "Vatreni vulkan", short: "Vulkan", nameAcc: "Vatreni vulkan", acc: "vulkan", where: "na vulkanu" },
    ice: { name: "Ledeni vrhovi", short: "Led", nameAcc: "Ledene vrhove", acc: "ledene vrhove", where: "na ledenim vrhovima" },
    space: { name: "Svemir", short: "Svemir", nameAcc: "Svemir", acc: "svemir", where: "u svemiru" },
};

export function isWorldId(value: unknown): value is WorldId {
    return typeof value === "string" && (WORLD_IDS as readonly string[]).includes(value);
}

// ── Raspored igara po mapama ───────────────────────────────────────────────────

/**
 * Igre od najlakše ka najtežoj, isto za svako dete: po najmanjem uzrastu za koji je igra, pa po
 * najvećem, pa po redu učenja. (Redosled „za uzrast deteta” stavlja igre za mlađu decu na kraj,
 * pa bi najlakše igre završile na poslednjoj, ledenoj mapi.)
 */
export function byDifficulty<T extends { ages: { min: number; max: number }; order: number }>(games: readonly T[]): T[] {
    return [...games].sort((a, b) => a.ages.min - b.ages.min || a.ages.max - b.ages.max || a.order - b.order);
}

/** Najmanje igara na mapi (osim kad je ukupno samo jedna igra) */
const MIN_PER_WORLD = 2;

/**
 * Deli igre (poređane po težini, `byDifficulty`) na mape, redom, bez obzira koliko ih ima.
 * Najviše igara na mapi je `ceil(n / 7)`, a mape su podjednake: razlikuju se najviše za jednu
 * igru i veće su prve. 47 igara → 7·7·7·7·7·6·6, 40 → 6·6·6·6·6·5·5, 33 → 5·5·5·5·5·4·4.
 * Tako za svaki broj od 14 igara naviše postoji svih sedam mapa (cilj je uvek u svemiru), a
 * nijedna mapa nema samo jednu igru. Sa malo igara (roditelj je isključio mnoge) mapa je
 * manje, bar dve igre po mapi: 5 igara → 3 / 2, 3 igre → jedna mapa.
 */
export function splitIntoWorlds<T>(games: readonly T[], maxWorlds: number = MAX_WORLDS): T[][] {
    const n = games.length;
    if (n === 0) return [];
    const limit = Math.max(1, Math.min(maxWorlds, MAX_WORLDS));
    const count = Math.min(limit, Math.max(1, Math.floor(n / MIN_PER_WORLD)));
    const base = Math.floor(n / count);
    const extra = n % count;
    const worlds: T[][] = [];
    let at = 0;
    for (let i = 0; i < count; i += 1) {
        const size = base + (i < extra ? 1 : 0);
        worlds.push(games.slice(at, at + size));
        at += size;
    }
    return worlds;
}

// ── Zvezdice i kapija ──────────────────────────────────────────────────────────

/** Završeni nivoi igre (0–15) iz napretka sa servera (prvi još nepoložen nivo) */
export function levelsDone(progress: GameProgress, id: GameId): number {
    const next = progress[id];
    return typeof next === "number" && Number.isFinite(next) ? Math.min(Math.max(Math.floor(next) - 1, 0), MAX_LEVEL) : 0;
}

/** Zvezdice igre: po jedna za svaku pređenu težinu (lako, srednje, teško) — isto kao na mapi */
export function gameStars(done: number): 0 | 1 | 2 | 3 {
    return Math.min(Math.floor(Math.max(done, 0) / LEVELS_PER_TIER), 3) as 0 | 1 | 2 | 3;
}

/**
 * Koliko zvezdica treba za kapiju mape sa `gameCount` igara: koliko i igara.
 * To je prosečno jedna pređena težina (lako = 5 nivoa) po igri. Dostižno je za svako dete
 * (lakša težina, bez žurbe), a opet znači da je mapa zaista istražena. Dete samo bira kako:
 * sve igre na „lako”, ili manje igara do kraja — omiljena igra se računa jednako.
 */
export function starsToOpen(gameCount: number): number {
    return Math.max(1, gameCount);
}

export interface WorldOptions {
    /** Roditelj: „Sve mape otvorene (bez ključeva)” */
    openAll?: boolean;
}

export interface WorldState<G extends { id: GameId }> {
    id: WorldId;
    index: number;
    games: G[];
    /** Zbir zvezdica igara na mapi */
    stars: number;
    /** Najviše zvezdica (3 po igri) */
    maxStars: number;
    /** Zvezdice za kapiju na kraju mape */
    need: number;
    /** Kapija je zaslužena (stars ≥ need) */
    earned: boolean;
    /** Mapa je otvorena: igre na njoj se mogu igrati */
    open: boolean;
    /** Dete je do mape stiglo samo (zvezdicama ili igrom na njoj), bez „Sve mape otvorene” */
    reached: boolean;
    /** Poslednja mapa: na kraju je cilj, ne put u sledeću mapu */
    final: boolean;
    /** Da li je na mapi dovršena svaka igra (svih 15 nivoa) */
    complete: boolean;
}

/**
 * Mape deteta sa zvezdicama i stanjem. Prva mapa je uvek otvorena; svaka sledeća kad je
 * kapija prethodne zaslužena — ili ako je dete na njoj već nešto igralo (napredak se ne gubi),
 * ili kad je roditelj sve otvorio.
 */
export function buildWorlds<G extends { id: GameId }>(games: readonly G[], progress: GameProgress, options: WorldOptions = {}): WorldState<G>[] {
    const groups = splitIntoWorlds(games);
    const worlds: WorldState<G>[] = [];
    groups.forEach((group, index) => {
        const done = group.map((g) => levelsDone(progress, g.id));
        const stars = done.reduce((sum, d) => sum + gameStars(d), 0);
        const need = starsToOpen(group.length);
        const previous = worlds[index - 1];
        const started = done.some((d) => d > 0);
        const reached = index === 0 || Boolean(previous?.earned) || started;
        worlds.push({
            id: WORLD_IDS[index],
            index,
            games: group,
            stars,
            maxStars: group.length * 3,
            need,
            earned: stars >= need,
            open: reached || Boolean(options.openAll),
            reached,
            final: index === groups.length - 1,
            complete: done.every((d) => d >= MAX_LEVEL),
        });
    });
    return worlds;
}

export type GateState = "locked" | "key" | "open";

/**
 * Kapija na kraju mape: „locked” dok zvezdica nema dovoljno, „key” kad su skupljene a dete je
 * još nije otvorilo (ključ čeka), „open” posle otvaranja. `opened` je samo pogodnost (pamti
 * se na uređaju): bez nje (null) se kapija otvara sama čim su zvezdice skupljene.
 * Kad je roditelj otvorio sve mape, kapije su otvorene i nema ključeva.
 */
export function gateState(world: Pick<WorldState<{ id: GameId }>, "id" | "earned">, opened: readonly WorldId[] | null, options: WorldOptions = {}): GateState {
    if (options.openAll) return "open";
    if (!world.earned) return "locked";
    if (opened === null || opened.includes(world.id)) return "open";
    return "key";
}

/**
 * Igra je zaključana mapom (ne može se igrati): mapa nije otvorena, a igra nije u planu
 * roditelja (igra iz plana je uvek dostupna).
 */
export function lockedByWorld(world: Pick<WorldState<{ id: GameId }>, "open">, id: GameId, plan: readonly GameId[] = []): boolean {
    return !world.open && !plan.includes(id);
}

/**
 * Mapa koja se prikazuje kad dete dođe: najviša otvorena mapa na kojoj još ima
 * nedovršenih igara; kad je sve dovršeno — poslednja otvorena. Kad je roditelj otvorio sve
 * mape, računaju se samo mape do kojih je dete stiglo samo (novo dete kreće od livade, a ne
 * od najteže mape).
 */
export function defaultWorld(worlds: readonly Pick<WorldState<{ id: GameId }>, "id" | "open" | "reached" | "complete">[]): WorldId | null {
    const open = worlds.filter((w) => w.open && w.reached);
    if (open.length === 0) return worlds[0]?.id ?? null;
    for (let i = open.length - 1; i >= 0; i -= 1) if (!open[i].complete) return open[i].id;
    return open[open.length - 1].id;
}

/**
 * Mapa za prikaz: prvo mapa čiji ključ čeka kapiju (`waiting`, da dete doživi otvaranje), pa
 * zapamćena mapa ako je i dalje otvorena, inače podrazumevana.
 */
export function chooseWorld(worlds: readonly Pick<WorldState<{ id: GameId }>, "id" | "open" | "reached" | "complete">[], remembered: unknown, waiting: WorldId | null = null): WorldId | null {
    if (waiting && worlds.some((w) => w.id === waiting)) return waiting;
    if (isWorldId(remembered) && worlds.some((w) => w.id === remembered && w.open)) return remembered;
    return defaultWorld(worlds);
}

// ── Reči ───────────────────────────────────────────────────────────────────────

/** „zvezdicu / zvezdice / zvezdica” u akuzativu, po broju: 1, 21 → zvezdicu; 2–4 → zvezdice; 5+, 11–14 → zvezdica */
export function starsWord(n: number): string {
    const tens = Math.abs(n) % 100;
    const ones = Math.abs(n) % 10;
    if (ones === 1 && tens !== 11) return "zvezdicu";
    if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)) return "zvezdice";
    return "zvezdica";
}

/** „3 zvezdice”, „1 zvezdicu”, „21 zvezdicu” */
export function starsPhrase(n: number): string {
    return `${n} ${starsWord(n)}`;
}

/**
 * Poruka na zaključanoj mapi: šta treba da bi se otvorila. Kad je i prethodna mapa još
 * zaključana, samo kaže koja je na redu.
 */
export function lockedWorldMessage(worlds: readonly Pick<WorldState<{ id: GameId }>, "id" | "open" | "stars" | "need">[], id: WorldId): string {
    const index = worlds.findIndex((w) => w.id === id);
    const previous = worlds[index - 1];
    if (!previous) return "";
    const words = WORLD_WORDS[id];
    if (!previous.open) return `Prvo treba otključati ${WORLD_WORDS[previous.id].acc}.`;
    const missing = Math.max(previous.need - previous.stars, 1);
    return `Skupi još ${starsPhrase(missing)} ${WORLD_WORDS[previous.id].where} da otključaš ${words.acc}.`;
}

/** Pohvala kad dete otvori kapiju (rod kao i u ostalim porukama: muški kad nije poznat) */
export function gateOpenedPraise(world: { id: WorldId; final: boolean }, next: WorldId | null, female: boolean): string {
    if (world.final || !next) return female ? "Bravo! Prešla si sve mape!" : "Bravo! Prešao si sve mape!";
    return `Bravo! ${female ? "Otvorila" : "Otvorio"} si ${WORLD_WORDS[next].nameAcc}!`;
}

// ── Pamćenje na uređaju (samo pogodnost) ───────────────────────────────────────

/** Poslednja pogledana mapa, po detetu */
export function worldViewKey(childId: number): string {
    return `bm-map-world-${childId}`;
}

/** Kapije koje je dete otvorilo (ključem), po detetu */
export function worldOpenedKey(childId: number): string {
    return `bm-map-opened-${childId}`;
}

export function parseOpened(raw: string | null): WorldId[] {
    if (!raw) return [];
    try {
        const value: unknown = JSON.parse(raw);
        return Array.isArray(value) ? WORLD_IDS.filter((id) => value.includes(id)) : [];
    } catch {
        return [];
    }
}
