// lib/companion.ts
// Pratilac deteta (lik koji mu čita i raduje se sa njim) i novčići za odeću pratioca.
//
//  • Dete bira pratioca: učiteljicu, učitelja ili životinju (mačka, pas, zeka, meda).
//  • Novčići su zarađene zvezdice: svaka zvezdica u igri je jedan novčić. Dete novčiće ne
//    može da izgubi — samo da ih potroši na odeću (šešir, naočare, odelo…). Nema nasumičnih
//    nagrada ni „kutija iznenađenja”: svaki predmet ima stalnu cenu i dete zna šta dobija.
//    (Sistem žetona — token economy — u ABA terapiji je pozitivno potkrepljenje bez kazni.)
//  • Dete može da izabere predmet za koji „radi” (cilj, kao tabla sa žetonima u ABA terapiji):
//    vidi koliko novčića još treba. Kad kupi taj predmet, cilj se sam briše.
//  • Stanje se čuva u postojećem JSON polju children.settings pod ključem `companion`, pa
//    nije potrebna promena tabele. Broj zarađenih zvezdica se izvodi iz experience_points
//    (5 poena po zvezdici, app/api/activities/complete).
//
// Modul nema zavisnosti od servera ni od React-a: koriste ga i API rute i ekran deteta.

export const POINTS_PER_STAR = 5;

/** Pratioci koje dete može da izabere (crteži: app/components/avatar/Companion) */
export const COMPANION_KINDS = ["woman", "man", "cat", "dog", "bunny", "bear"] as const;
export type CompanionKindId = (typeof COMPANION_KINDS)[number];

export function isCompanionKindId(value: unknown): value is CompanionKindId {
    return typeof value === "string" && (COMPANION_KINDS as readonly string[]).includes(value);
}

/** Mesta na liku; na svakom mestu je najviše jedan predmet, a sva mesta se nose istovremeno */
export const WEAR_SLOT_IDS = ["hat", "glasses", "neck", "outfit", "feet", "hand", "back", "pet", "background"] as const;
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
    /** Predmet za koji dete skuplja novčiće (još nije kupljen); bez cilja — nema ključa */
    goal?: string;
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
}

/** Podrazumevani pratilac: isti kao dosadašnji učitelj (devojčica — učiteljica, dečak — učitelj) */
export function defaultCompanion(gender: string | null | undefined): CompanionState {
    return { kind: gender?.toLowerCase() === "female" ? "woman" : "man", owned: [], wear: {}, spent: 0, v: 0 };
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
    // Cilj je samo poznat predmet koji još nije kupljen
    if (typeof raw.goal === "string" && catalog.item(raw.goal) !== undefined && !owned.includes(raw.goal)) state.goal = raw.goal;
    return state;
}

/** Novčići na raspolaganju: zarađene zvezdice minus potrošeno (nikad ispod nule) */
export function coinsAvailable(experiencePoints: number | null | undefined, spent: number): number {
    const earned = Math.floor(Math.max(0, experiencePoints ?? 0) / POINTS_PER_STAR);
    return Math.max(0, earned - Math.max(0, spent));
}

export type CompanionAction =
    | { action: "choose"; kind: string }
    | { action: "buy"; item: string }
    | { action: "wear"; slot: WearSlotId; item: string | null }
    /** Ceo izgled odjednom (npr. sačuvana kombinacija): mesta kojih nema ostaju prazna */
    | { action: "outfit"; wear: CompanionWear }
    /** Skini sve (ništa se ne gubi — predmeti ostaju u ormaru) */
    | { action: "undress" }
    /** Predmet za koji dete skuplja novčiće; null briše cilj */
    | { action: "goal"; item: string | null };

export type CompanionResult = { ok: true; state: CompanionState } | { ok: false; reason: "unknown" | "not-owned" | "owned" | "coins" };

/** Primena jedne radnje deteta na stanje (bez upisa u bazu — to radi API ruta). */
export function applyCompanionAction(
    state: CompanionState,
    action: CompanionAction,
    experiencePoints: number | null | undefined,
    catalog: CompanionCatalog
): CompanionResult {
    const next: CompanionState = { ...state, owned: [...state.owned], wear: { ...state.wear }, v: state.v + 1 };
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
            // Cilj je ostvaren
            if (bought.goal === action.item) delete bought.goal;
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
            if (!catalog.item(action.item)) return { ok: false, reason: "unknown" };
            if (state.owned.includes(action.item)) return { ok: false, reason: "owned" };
            return { ok: true, state: { ...next, goal: action.item } };
        }
    }
}

/** Telo zahteva → radnja, ili null za neispravan zahtev */
export function parseCompanionAction(body: unknown): CompanionAction | null {
    if (!isRecord(body)) return null;
    if (body.action === "choose" && typeof body.kind === "string") return { action: "choose", kind: body.kind };
    if (body.action === "buy" && typeof body.item === "string") return { action: "buy", item: body.item };
    if (body.action === "wear" && isWearSlotId(body.slot) && (body.item === null || typeof body.item === "string")) {
        return { action: "wear", slot: body.slot, item: body.item as string | null };
    }
    if (body.action === "undress") return { action: "undress" };
    if (body.action === "goal" && (body.item === null || typeof body.item === "string")) return { action: "goal", item: body.item as string | null };
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
