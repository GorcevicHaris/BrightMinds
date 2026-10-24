// lib/companion.ts
// Pratilac deteta (lik koji mu čita i raduje se sa njim) i novčići za odeću pratioca.
//
//  • Dete bira pratioca: učiteljicu, učitelja ili životinju (mačka, pas, zeka, meda).
//  • Novčići su zarađene zvezdice: svaka zvezdica u igri donosi dva novčića. Dete novčiće ne
//    može da izgubi — samo da ih potroši na odeću (šešir, naočare, odelo…). Nema nasumičnih
//    nagrada ni „kutija iznenađenja”: svaki predmet ima stalnu cenu i dete zna šta dobija.
//    (Sistem žetona — token economy — u ABA terapiji je pozitivno potkrepljenje bez kazni.)
//  • Kompleti su gotovi izgledi (npr. gusar: šešir, odelo, papagaj). Komplet se kupuje odjednom
//    po zbiru cena predmeta koji detetu još nedostaju — bez popusta, cena je uvek predvidiva.
//  • Izgled drugara (skins.ts): svaki drugar pamti svoju boju. Izgled čoveka (koža, kosa,
//    frizura) je uvek besplatan — identitet se ne plaća. Životinje imaju nekoliko prirodnih boja
//    besplatno, a posebna krzna (tigrasta, dalmatinac, panda…) imaju stalnu cenu u novčićima.
//  • Dete može da izabere predmet ili komplet za koji „radi” (cilj, kao tabla sa žetonima u ABA
//    terapiji): vidi koliko novčića još treba. Kad ga kupi, cilj se sam briše.
//  • Stanje se čuva u postojećem JSON polju children.settings pod ključem `companion`, pa
//    nije potrebna promena tabele. Broj zarađenih zvezdica se izvodi iz experience_points
//    (5 poena po zvezdici, app/api/activities/complete).
//
// Modul nema zavisnosti od servera ni od React-a: koriste ga i API rute i ekran deteta.

export const POINTS_PER_STAR = 5;

/** Novčića po zvezdici. Novčići se računaju iz svih zarađenih zvezdica, pa promena važi i unazad. */
export const COINS_PER_STAR = 2;

/**
 * Pratioci koje dete može da izabere: ljudi (devojčica, dečak, učiteljica, učitelj, tinejdžerka,
 * tinejdžer, nana, dedo) i životinje.
 * 3D crteži: app/components/avatar3d; 2D (kad WebGL ne radi): app/components/avatar/Companion.
 */
export const COMPANION_KINDS = [
    "girl", "boy", "woman", "man",
    // ── Ljudi, porodica (tinejdžerka, tinejdžer, nana, dedo) — posebna grupa, odmah posle ljudi ──
    "teengirl", "teenboy", "grandma", "grandpa",
    // ── Životinje ──
    "cat", "dog", "bunny", "bear", "fox", "lion", "penguin", "unicorn",
    "panda", "koala", "elephant", "monkey", "owl", "tiger", "dinosaur", "giraffe",
    "pony", "frog", "hedgehog", "raccoon", "deer", "sheep", "hamster", "squirrel",
    // ── Još životinja (app/components/avatar3d/animals/more/) — dodaje se samo na kraj ──
    "wolf", "zebra", "hippo", "crocodile", "kangaroo", "cow", "pig", "goat", "duck",
    "chicken", "parrot", "flamingo", "seal", "dolphin", "turtle", "beaver", "otter",
    "mole", "alpaca", "rhino", "fennec", "cheetah", "leopard", "mouse", "bat", "dragon",
    // ── kraj: još životinja ──
] as const;
export type CompanionKindId = (typeof COMPANION_KINDS)[number];

export function isCompanionKindId(value: unknown): value is CompanionKindId {
    return typeof value === "string" && (COMPANION_KINDS as readonly string[]).includes(value);
}

/** Mesta na liku; na svakom mestu je najviše jedan predmet, a sva mesta se nose istovremeno */
export const WEAR_SLOT_IDS = ["hat", "glasses", "neck", "outfit", "bottom", "feet", "hand", "back", "pet", "background"] as const;
export type WearSlotId = (typeof WEAR_SLOT_IDS)[number];

export function isWearSlotId(value: unknown): value is WearSlotId {
    return typeof value === "string" && (WEAR_SLOT_IDS as readonly string[]).includes(value);
}

export type CompanionWear = Partial<Record<WearSlotId, string>>;

export interface CompanionState {
    /** Izabrani pratilac (CompanionKind iz app/components/avatar/Companion) */
    kind: string;
    /** Kupljeni predmeti */
    owned: string[];
    /** Šta pratilac trenutno nosi, po mestu */
    wear: CompanionWear;
    /** Za šta dete skuplja novčiće: id predmeta, `set:<id kompleta>` ili `skin:<drugar>:<izgled>`; bez cilja — nema ključa */
    goal?: string;
    /** Izabrani izgled po drugaru (svaki drugar pamti svoj); dok dete ništa ne izabere — nema ključa */
    skin?: Partial<Record<CompanionKindId, string>>;
    /** Kupljeni posebni izgledi, kao `<drugar>:<izgled>`; dok ništa nije kupljeno — nema ključa */
    skins?: string[];
    /** Ukupno potrošeni novčići */
    spent: number;
    /** Brojač izmena: upis uspeva samo ako se stanje u međuvremenu nije promenilo */
    v: number;
}

/** Ono što modul treba da zna o katalogu (dolazi iz app/components/avatar) */
export interface CompanionCatalog {
    isKind: (value: unknown) => boolean;
    /** Mesto i cena predmeta, ili undefined za nepoznat predmet */
    item: (id: string) => { slot: WearSlotId; price: number } | undefined;
    /** Predmeti kompleta po mestu, ili undefined za nepoznat komplet */
    set: (id: string) => { items: CompanionWear } | undefined;
    /** Cena izgleda drugara (0 = besplatno), ili undefined za nepoznat izgled */
    skin: (kind: string, id: string) => { price: number } | undefined;
}

/** Cilj koji je komplet ima oblik `set:<id>` */
export const SET_GOAL_PREFIX = "set:";

export function setGoalId(setId: string): string {
    return SET_GOAL_PREFIX + setId;
}

/** Id kompleta iz cilja, ili null kad je cilj jedan predmet */
export function goalSetId(goal: string): string | null {
    return goal.startsWith(SET_GOAL_PREFIX) ? goal.slice(SET_GOAL_PREFIX.length) : null;
}

/** Cilj koji je poseban izgled ima oblik `skin:<drugar>:<izgled>` */
export const SKIN_GOAL_PREFIX = "skin:";

/** Kupljen izgled se pamti kao `<drugar>:<izgled>` */
export function skinKey(kind: string, skin: string): string {
    return `${kind}:${skin}`;
}

export function skinGoalId(kind: string, skin: string): string {
    return SKIN_GOAL_PREFIX + skinKey(kind, skin);
}

/** Drugar i izgled iz cilja, ili null kad cilj nije izgled */
export function goalSkin(goal: string): { kind: string; skin: string } | null {
    if (!goal.startsWith(SKIN_GOAL_PREFIX)) return null;
    const rest = goal.slice(SKIN_GOAL_PREFIX.length);
    const split = rest.indexOf(":");
    return split > 0 ? { kind: rest.slice(0, split), skin: rest.slice(split + 1) } : null;
}

/** Izgled se može obući: poznat je, i besplatan ili kupljen */
function skinWearable(kind: string, skin: string, skins: readonly string[], catalog: CompanionCatalog): boolean {
    if (!catalog.isKind(kind)) return false;
    const price = catalog.skin(kind, skin)?.price;
    return price !== undefined && (price === 0 || skins.includes(skinKey(kind, skin)));
}

/**
 * Šta detetu još nedostaje do kompleta: predmeti koji nisu kupljeni i zbir njihovih cena.
 * Undefined za nepoznat komplet (ili komplet sa nepoznatim predmetom ili predmetom na tuđem mestu).
 */
export function setMissing(setId: string, owned: readonly string[], catalog: CompanionCatalog): { items: string[]; price: number } | undefined {
    const set = catalog.set(setId);
    if (!set) return undefined;
    const items: string[] = [];
    let price = 0;
    let size = 0;
    for (const slot of WEAR_SLOT_IDS) {
        const id = set.items[slot];
        if (id === undefined) continue;
        const item = catalog.item(id);
        if (!item || item.slot !== slot) return undefined;
        size += 1;
        if (!owned.includes(id)) {
            items.push(id);
            price += item.price;
        }
    }
    return size > 0 ? { items, price } : undefined;
}

/** Cilj još važi: poznat predmet koji nije kupljen, komplet kome nešto nedostaje ili poseban izgled koji nije kupljen */
function isOpenGoal(goal: string, owned: readonly string[], catalog: CompanionCatalog, skins: readonly string[] = []): boolean {
    const setId = goalSetId(goal);
    if (setId !== null) return (setMissing(setId, owned, catalog)?.items.length ?? 0) > 0;
    const target = goalSkin(goal);
    if (target) {
        if (!catalog.isKind(target.kind)) return false;
        const price = catalog.skin(target.kind, target.skin)?.price ?? 0;
        return price > 0 && !skins.includes(skinKey(target.kind, target.skin));
    }
    return catalog.item(goal) !== undefined && !owned.includes(goal);
}

/**
 * Podrazumevani drugar dok dete ništa ne izabere: dete kao i ono (devojčica ili dečak). Već
 * sačuvan izbor (i dosadašnja učiteljica/učitelj) ostaje kakav je.
 */
export function defaultCompanion(gender: string | null | undefined): CompanionState {
    return { kind: gender?.toLowerCase() === "female" ? "girl" : "boy", owned: [], wear: {}, spent: 0, v: 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Sačuvano stanje → ispravno stanje (nepoznati pratioci i predmeti se odbacuju). */
export function sanitizeCompanion(raw: unknown, gender: string | null | undefined, catalog: CompanionCatalog): CompanionState {
    const base = defaultCompanion(gender);
    if (!isRecord(raw)) return base;
    const owned = Array.isArray(raw.owned) ? Array.from(new Set(raw.owned.filter((id): id is string => typeof id === "string" && catalog.item(id) !== undefined))) : [];
    const wear: CompanionState["wear"] = {};
    if (isRecord(raw.wear)) {
        for (const slot of WEAR_SLOT_IDS) {
            const id = raw.wear[slot];
            // Nosi se samo kupljen predmet, i to na svom mestu
            if (typeof id === "string" && owned.includes(id) && catalog.item(id)?.slot === slot) wear[slot] = id;
        }
    }
    const spent = typeof raw.spent === "number" && Number.isFinite(raw.spent) && raw.spent > 0 ? Math.floor(raw.spent) : 0;
    const v = typeof raw.v === "number" && Number.isInteger(raw.v) && raw.v >= 0 ? raw.v : 0;
    const state: CompanionState = { kind: catalog.isKind(raw.kind) ? (raw.kind as string) : base.kind, owned, wear, spent, v };
    // Kupljeni izgledi: samo poznati izgledi koji imaju cenu (besplatni se ne „kupuju”)
    const skins = Array.isArray(raw.skins)
        ? Array.from(
              new Set(
                  raw.skins.filter((key): key is string => {
                      if (typeof key !== "string") return false;
                      const split = key.indexOf(":");
                      if (split <= 0) return false;
                      const kind = key.slice(0, split);
                      return catalog.isKind(kind) && (catalog.skin(kind, key.slice(split + 1))?.price ?? 0) > 0;
                  })
              )
          )
        : [];
    if (skins.length > 0) state.skins = skins;
    // Izabrani izgled po drugaru: samo poznat, i besplatan ili kupljen
    if (isRecord(raw.skin)) {
        const skin: Partial<Record<CompanionKindId, string>> = {};
        for (const kind of COMPANION_KINDS) {
            const id = raw.skin[kind];
            if (typeof id === "string" && skinWearable(kind, id, skins, catalog)) skin[kind] = id;
        }
        if (Object.keys(skin).length > 0) state.skin = skin;
    }
    // Cilj je samo poznat predmet ili izgled koji još nije kupljen, ili komplet kome nešto nedostaje
    if (typeof raw.goal === "string" && isOpenGoal(raw.goal, owned, catalog, skins)) state.goal = raw.goal;
    return state;
}

/** Novčići na raspolaganju: zarađene zvezdice minus potrošeno (nikad ispod nule) */
export function coinsAvailable(experiencePoints: number | null | undefined, spent: number): number {
    const earned = Math.floor(Math.max(0, experiencePoints ?? 0) / POINTS_PER_STAR) * COINS_PER_STAR;
    return Math.max(0, earned - Math.max(0, spent));
}

export type CompanionAction =
    | { action: "choose"; kind: string }
    | { action: "buy"; item: string }
    /** Kupuje sve predmete kompleta koji nedostaju (zbir njihovih cena) i oblači ceo komplet */
    | { action: "buySet"; set: string }
    | { action: "wear"; slot: WearSlotId; item: string | null }
    /** Ceo izgled odjednom (npr. sačuvana kombinacija): mesta kojih nema ostaju prazna */
    | { action: "outfit"; wear: CompanionWear }
    /** Skini sve (ništa se ne gubi — predmeti ostaju u ormaru) */
    | { action: "undress" }
    /** Predmet, `set:<id>` ili `skin:<drugar>:<izgled>` za koji dete skuplja novčiće; null briše cilj */
    | { action: "goal"; item: string | null }
    /** Izgled drugara (besplatan ili kupljen); drugi drugari zadržavaju svoj */
    | { action: "skin"; kind: string; skin: string }
    /** Kupuje poseban izgled po stalnoj ceni i odmah ga obuče */
    | { action: "buySkin"; kind: string; skin: string };

export type CompanionResult = { ok: true; state: CompanionState } | { ok: false; reason: "unknown" | "not-owned" | "owned" | "coins" };

/** Primena jedne radnje deteta na stanje (bez upisa u bazu — to radi API ruta). */
export function applyCompanionAction(
    state: CompanionState,
    action: CompanionAction,
    experiencePoints: number | null | undefined,
    catalog: CompanionCatalog
): CompanionResult {
    const next: CompanionState = { ...state, owned: [...state.owned], wear: { ...state.wear }, v: state.v + 1 };
    const skins = state.skins ?? [];
    switch (action.action) {
        case "choose":
            if (!catalog.isKind(action.kind)) return { ok: false, reason: "unknown" };
            return { ok: true, state: { ...next, kind: action.kind } };

        case "buy": {
            const item = catalog.item(action.item);
            if (!item) return { ok: false, reason: "unknown" };
            if (state.owned.includes(action.item)) return { ok: false, reason: "owned" };
            if (coinsAvailable(experiencePoints, state.spent) < item.price) return { ok: false, reason: "coins" };
            // Kupljen predmet pratilac odmah obuče — dete odmah vidi šta je dobilo
            const bought: CompanionState = { ...next, owned: [...next.owned, action.item], spent: state.spent + item.price, wear: { ...next.wear, [item.slot]: action.item } };
            // Cilj je ostvaren (i komplet kome je ovo bio poslednji predmet)
            if (bought.goal && !isOpenGoal(bought.goal, bought.owned, catalog, skins)) delete bought.goal;
            return { ok: true, state: bought };
        }

        case "buySet": {
            const missing = setMissing(action.set, state.owned, catalog);
            const set = catalog.set(action.set);
            if (!missing || !set) return { ok: false, reason: "unknown" };
            if (missing.items.length === 0) return { ok: false, reason: "owned" };
            // Sve ili ništa: bez dovoljno novčića za ceo ostatak ne kupuje se ni deo
            if (coinsAvailable(experiencePoints, state.spent) < missing.price) return { ok: false, reason: "coins" };
            // Pratilac odmah obuče ceo komplet — tačno kao na sličici kompleta
            const bought: CompanionState = { ...next, owned: [...next.owned, ...missing.items], spent: state.spent + missing.price, wear: { ...set.items } };
            if (bought.goal && !isOpenGoal(bought.goal, bought.owned, catalog, skins)) delete bought.goal;
            return { ok: true, state: bought };
        }

        case "wear": {
            if (action.item === null) {
                delete next.wear[action.slot];
                return { ok: true, state: next };
            }
            const item = catalog.item(action.item);
            if (!item || item.slot !== action.slot) return { ok: false, reason: "unknown" };
            if (!state.owned.includes(action.item)) return { ok: false, reason: "not-owned" };
            return { ok: true, state: { ...next, wear: { ...next.wear, [action.slot]: action.item } } };
        }

        case "outfit": {
            const wear: CompanionWear = {};
            for (const slot of WEAR_SLOT_IDS) {
                const id = action.wear[slot];
                if (id === undefined) continue;
                if (catalog.item(id)?.slot !== slot) return { ok: false, reason: "unknown" };
                if (!state.owned.includes(id)) return { ok: false, reason: "not-owned" };
                wear[slot] = id;
            }
            return { ok: true, state: { ...next, wear } };
        }

        case "undress":
            return { ok: true, state: { ...next, wear: {} } };

        case "goal": {
            if (action.item === null) {
                delete next.goal;
                return { ok: true, state: next };
            }
            const setId = goalSetId(action.item);
            const target = goalSkin(action.item);
            if (setId !== null) {
                const missing = setMissing(setId, state.owned, catalog);
                if (!missing) return { ok: false, reason: "unknown" };
                if (missing.items.length === 0) return { ok: false, reason: "owned" };
            } else if (target) {
                // Cilj može biti samo izgled koji se plaća (besplatan dete može odmah da obuče)
                const price = catalog.isKind(target.kind) ? catalog.skin(target.kind, target.skin)?.price : undefined;
                if (!price) return { ok: false, reason: "unknown" };
                if (skins.includes(skinKey(target.kind, target.skin))) return { ok: false, reason: "owned" };
            } else {
                if (!catalog.item(action.item)) return { ok: false, reason: "unknown" };
                if (state.owned.includes(action.item)) return { ok: false, reason: "owned" };
            }
            return { ok: true, state: { ...next, goal: action.item } };
        }

        case "skin": {
            if (!catalog.isKind(action.kind) || !catalog.skin(action.kind, action.skin)) return { ok: false, reason: "unknown" };
            if (!skinWearable(action.kind, action.skin, skins, catalog)) return { ok: false, reason: "not-owned" };
            return { ok: true, state: { ...next, skin: { ...state.skin, [action.kind as CompanionKindId]: action.skin } } };
        }

        case "buySkin": {
            const price = catalog.isKind(action.kind) ? catalog.skin(action.kind, action.skin)?.price : undefined;
            if (price === undefined) return { ok: false, reason: "unknown" };
            // Besplatan izgled se ne kupuje (već je detetov); kupljen se ne plaća dvaput
            const key = skinKey(action.kind, action.skin);
            if (price === 0 || skins.includes(key)) return { ok: false, reason: "owned" };
            if (coinsAvailable(experiencePoints, state.spent) < price) return { ok: false, reason: "coins" };
            const bought: CompanionState = { ...next, skins: [...skins, key], spent: state.spent + price, skin: { ...state.skin, [action.kind as CompanionKindId]: action.skin } };
            if (bought.goal && !isOpenGoal(bought.goal, bought.owned, catalog, bought.skins)) delete bought.goal;
            return { ok: true, state: bought };
        }
    }
}

/** Telo zahteva → radnja, ili null za neispravan zahtev */
export function parseCompanionAction(body: unknown): CompanionAction | null {
    if (!isRecord(body)) return null;
    if (body.action === "choose" && typeof body.kind === "string") return { action: "choose", kind: body.kind };
    if (body.action === "buy" && typeof body.item === "string") return { action: "buy", item: body.item };
    if (body.action === "buySet" && typeof body.set === "string") return { action: "buySet", set: body.set };
    if (body.action === "wear" && isWearSlotId(body.slot) && (body.item === null || typeof body.item === "string")) {
        return { action: "wear", slot: body.slot, item: body.item as string | null };
    }
    if (body.action === "undress") return { action: "undress" };
    if (body.action === "goal" && (body.item === null || typeof body.item === "string")) return { action: "goal", item: body.item as string | null };
    if ((body.action === "skin" || body.action === "buySkin") && typeof body.kind === "string" && typeof body.skin === "string") {
        return { action: body.action, kind: body.kind, skin: body.skin };
    }
    if (body.action === "outfit" && isRecord(body.wear)) {
        const wear: CompanionWear = {};
        for (const [slot, id] of Object.entries(body.wear)) {
            // Nepoznato mesto ili predmet koji nije tekst — ceo zahtev je neispravan
            if (!isWearSlotId(slot) || typeof id !== "string") return null;
            wear[slot] = id;
        }
        return { action: "outfit", wear };
    }
    return null;
}
