// lib/customStories.ts
// „Moje priče” — kratke priče koje roditelj ili terapeut piše za jedno dete.
// Dete ih čita ili sluša korak po korak; nema pitanja, bodova ni tačnog odgovora.
//
// Zajednički deo za API rute i za forme: tipovi, ograničenja, provera ulaza i
// gotovi primeri. Bez serverskih zavisnosti, pa se uvozi i u klijentske komponente.
import { isRecord } from "./validation";

// ── Tipovi ─────────────────────────────────────────────────────────────────────

export interface CustomStoryStep {
    /** Jedna ili dve kratke rečenice */
    text: string;
    emoji: string | null;
}

export interface CustomStory {
    id: number;
    title: string;
    emoji: string | null;
    steps: CustomStoryStep[];
    updatedAt: string | null;
}

/** Ono što odrasli unosi (i što se upisuje u bazu). */
export interface CustomStoryInput {
    title: string;
    emoji: string | null;
    steps: CustomStoryStep[];
}

export type StoryValidation = { ok: true; value: CustomStoryInput } | { ok: false; error: string };

// ── Ograničenja ────────────────────────────────────────────────────────────────

export const STORY_TITLE_MAX = 60;
export const STORY_MIN_STEPS = 2;
export const STORY_MAX_STEPS = 8;
export const STORY_STEP_TEXT_MAX = 160;
/** Dužina sličice u UTF-16 jedinicama (složeni emodži zauzima više jedinica). */
export const STORY_EMOJI_MAX_UNITS = 8;
export const MAX_STORIES_PER_CHILD = 20;

/** Sličica kada priča ili korak nema svoju. */
export const STORY_FALLBACK_EMOJI = "📖";

// ── Poruke i pomoćnici za API rute ─────────────────────────────────────────────

export const STORY_INVALID_REQUEST = "Neispravan zahtev";
export const STORY_NOT_FOUND = "Priča nije pronađena";
export const STORY_LIMIT_REACHED = `Dostignut je najveći broj priča (${MAX_STORIES_PER_CHILD}). Obrišite neku da dodate novu.`;
export const STORY_MIGRATION_REQUIRED =
    "Priče traže novu verziju baze. Pokrenite migraciju 0003 iz fascikle supabase/migrations.";

export const STORY_TABLE = "custom_stories";
/** Kolone koje API čita; ostale (child_id, created_by…) ne izlaze iz baze. */
export const STORY_COLUMNS = "id, title, emoji, steps, updated_at";

/** Osam koraka od po 160 znakova stane u oko 4 KB; sve preko ovoga nije ispravan zahtev. */
const MAX_BODY_BYTES = 8192;

/**
 * Tabela ne postoji (Postgres 42P01) ili je PostgREST ne vidi u šemi (PGRST205).
 * Dešava se dok migracija 0003 još nije primenjena.
 */
export function isMissingTableError(error: unknown): boolean {
    if (!isRecord(error)) return false;
    return error.code === "42P01" || error.code === "PGRST205";
}

// ── Provera ulaza ──────────────────────────────────────────────────────────────

// Preko konstruktora jer TypeScript za cilj ES2017 ne prihvata \p{…} u literalu
const LETTER_OR_DIGIT = new RegExp("[\\p{L}\\p{N}]", "u");
const EMOJI_RULE = "može biti jedan emodži, bez slova i brojeva";

/** Tekst u jednom redu, bez viška razmaka; `null` ako vrednost nije string. */
function cleanText(value: unknown): string | null {
    return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : null;
}

/** Sličica bez razmaka; `null` = nema je, `undefined` = vrednost nije ispravna. */
function parseEmoji(value: unknown): string | null | undefined {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") return undefined;
    const emoji = value.replace(/\s+/g, "");
    if (emoji === "") return null;
    return emoji.length <= STORY_EMOJI_MAX_UNITS && !LETTER_OR_DIGIT.test(emoji) ? emoji : undefined;
}

function invalid(error: string): StoryValidation {
    return { ok: false, error };
}

/**
 * Proverava priču `{ title, emoji?, steps: [{ text, emoji? }] }` i vraća je
 * prečišćenu (bez viška razmaka, prazna sličica kao `null`, bez nepoznatih polja).
 * Poruka o grešci je spremna za prikaz korisniku.
 */
export function validateStoryInput(raw: unknown): StoryValidation {
    if (!isRecord(raw)) return invalid(STORY_INVALID_REQUEST);

    const title = cleanText(raw.title);
    if (!title || title.length > STORY_TITLE_MAX) {
        return invalid(`Unesite naslov priče (najviše ${STORY_TITLE_MAX} karaktera)`);
    }

    const emoji = parseEmoji(raw.emoji);
    if (emoji === undefined) return invalid(`Sličica priče ${EMOJI_RULE}`);

    if (!Array.isArray(raw.steps) || raw.steps.length < STORY_MIN_STEPS || raw.steps.length > STORY_MAX_STEPS) {
        return invalid(`Priča treba da ima od ${STORY_MIN_STEPS} do ${STORY_MAX_STEPS} koraka`);
    }

    const steps: CustomStoryStep[] = [];
    for (const [index, rawStep] of raw.steps.entries()) {
        const label = `Korak ${index + 1}`;
        const text = isRecord(rawStep) ? cleanText(rawStep.text) : null;
        if (!text) return invalid(`${label}: upišite tekst`);
        if (text.length > STORY_STEP_TEXT_MAX) {
            return invalid(`${label}: tekst može imati najviše ${STORY_STEP_TEXT_MAX} karaktera`);
        }
        const stepEmoji = isRecord(rawStep) ? parseEmoji(rawStep.emoji) : null;
        if (stepEmoji === undefined) return invalid(`${label}: sličica ${EMOJI_RULE}`);
        steps.push({ text, emoji: stepEmoji });
    }

    return { ok: true, value: { title, emoji, steps } };
}

/** Telo zahteva kao tekst; `null` čim pređe `MAX_BODY_BYTES` (ostatak se ne čita). */
async function readLimitedText(request: Request): Promise<string | null> {
    const declared = Number(request.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
    if (!request.body) return "";

    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let received = 0;
    let text = "";
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > MAX_BODY_BYTES) {
            await reader.cancel();
            return null;
        }
        text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
}

/** Za API rute: čita JSON telo (najviše 8 KB) i proverava ga kao priču. */
export async function readStoryRequest(request: Request): Promise<StoryValidation> {
    let body: unknown;
    try {
        const text = await readLimitedText(request);
        if (text === null) return invalid(STORY_INVALID_REQUEST);
        body = JSON.parse(text);
    } catch {
        return invalid(STORY_INVALID_REQUEST);
    }
    return validateStoryInput(body);
}

// ── Čitanje sačuvanih priča ────────────────────────────────────────────────────

function storedSteps(raw: unknown): CustomStoryStep[] {
    if (!Array.isArray(raw)) return [];
    const steps: CustomStoryStep[] = [];
    for (const item of raw) {
        if (!isRecord(item) || typeof item.text !== "string" || item.text.trim() === "") continue;
        steps.push({ text: item.text, emoji: typeof item.emoji === "string" && item.emoji !== "" ? item.emoji : null });
    }
    return steps;
}

function buildStory(raw: Record<string, unknown>, updatedAt: unknown): CustomStory | null {
    if (typeof raw.id !== "number" || !Number.isSafeInteger(raw.id) || typeof raw.title !== "string") return null;
    return {
        id: raw.id,
        title: raw.title,
        emoji: typeof raw.emoji === "string" && raw.emoji !== "" ? raw.emoji : null,
        steps: storedSteps(raw.steps),
        updatedAt: typeof updatedAt === "string" ? updatedAt : null,
    };
}

/** Redovi tabele `custom_stories` → priče za API; redovi neočekivanog oblika se preskaču. */
export function storiesFromRows(rows: unknown): CustomStory[] {
    if (!Array.isArray(rows)) return [];
    const stories: CustomStory[] = [];
    for (const row of rows) {
        const story = isRecord(row) ? buildStory(row, row.updated_at) : null;
        if (story) stories.push(story);
    }
    return stories;
}

/** Priča iz odgovora API-ja (`{ story }`); `null` ako oblik nije očekivan. */
export function parseStory(raw: unknown): CustomStory | null {
    return isRecord(raw) ? buildStory(raw, raw.updatedAt) : null;
}

/** Spisak iz odgovora API-ja (`{ stories }`). */
export function parseStoryList(payload: unknown): CustomStory[] {
    if (!isRecord(payload) || !Array.isArray(payload.stories)) return [];
    const stories: CustomStory[] = [];
    for (const item of payload.stories) {
        const story = parseStory(item);
        if (story) stories.push(story);
    }
    return stories;
}

/** „1 korak”, „5 koraka” (priče imaju najviše 8 koraka). */
export function stepCountLabel(count: number): string {
    return count === 1 ? "1 korak" : `${count} koraka`;
}

// ── Gotovi primeri ─────────────────────────────────────────────────────────────
// Polazne tačke koje odrasli učita i prilagodi detetu. Pisane su po pravilima za
// ovakve priče: prvo lice iz ugla deteta, sadašnje vreme, doslovne kratke
// rečenice; uglavnom OPIS (šta će se desiti, kako zvuči, ko pomaže i da se
// završava), najviše jedna blaga rečenica-savet, bez prenesenih značenja i bez
// oblika koji zavise od pola.

export const STORY_TEMPLATES: readonly CustomStoryInput[] = [
    {
        title: "Idemo kod zubara",
        emoji: "🦷",
        steps: [
            { text: "Idem kod zubara. Zubar je doktor za zube.", emoji: "🦷" },
            { text: "Prvo čekamo u čekaonici. Sa mnom je odrasla osoba koju poznajem.", emoji: "🪑" },
            { text: "Zubar me zove u ordinaciju. Sedam na veliku stolicu koja se polako spušta.", emoji: "💺" },
            { text: "Zubar gleda moje zube malim ogledalom. Ja držim usta otvorena.", emoji: "😮" },
            { text: "Neki aparati zuje i prskaju vodu. Ako mi treba pauza, mogu da podignem ruku.", emoji: "✋" },
            { text: "Kada zubar završi, ustajem sa stolice. Pregled je gotov i idemo kući.", emoji: "🏠" },
        ],
    },
    {
        title: "Šišanje",
        emoji: "✂️",
        steps: [
            { text: "Idem na šišanje. U frizerskom salonu mi skraćuju kosu.", emoji: "💈" },
            { text: "Sedam na stolicu ispred ogledala. Oko vrata dobijam ogrtač.", emoji: "🪑" },
            { text: "Kosa se prvo prska vodom. Voda je malo hladna.", emoji: "💧" },
            { text: "Makaze tiho zveckaju blizu ušiju. Šišanje ne boli.", emoji: "✂️" },
            { text: "Mašinica zuji i malo golica po vratu. Ako mi smeta, mogu da kažem „pauza”.", emoji: "✋" },
            { text: "Na kraju se dlačice skidaju mekom četkom. Šišanje je gotovo i idemo kući.", emoji: "🏠" },
        ],
    },
    {
        title: "Vožnja autobusom",
        emoji: "🚌",
        steps: [
            { text: "Danas se vozim autobusom. Sa mnom je odrasla osoba koju poznajem.", emoji: "🚌" },
            { text: "Čekamo na stanici. Autobus nekad stigne brzo, a nekad čekamo duže.", emoji: "🚏" },
            { text: "Kada autobus stane, vrata se otvaraju. Ulazimo i tražimo mesto.", emoji: "🚪" },
            { text: "U autobusu ima i drugih ljudi. Ako nema slobodnog mesta, stojim i držim se za šipku.", emoji: "👥" },
            { text: "Motor bruji i autobus se malo ljulja. Ako je preglasno, mogu da pokrijem uši.", emoji: "👂" },
            { text: "Na našoj stanici izlazimo iz autobusa. Vožnja je gotova.", emoji: "👋" },
        ],
    },
    {
        title: "Dolaze nam gosti",
        emoji: "🏡",
        steps: [
            { text: "Danas nam dolaze gosti. Gosti su ljudi koji dođu kod nas kući na neko vreme.", emoji: "🏡" },
            { text: "Kada gosti stignu, zvoni zvono na vratima. Odrasli otvaraju vrata.", emoji: "🔔" },
            { text: "Gosti kažu „zdravo”. Odrasli se pozdravljaju i razgovaraju.", emoji: "👋" },
            { text: "U kući je tada glasnije nego obično. Ljudi pričaju i smeju se.", emoji: "💬" },
            { text: "Ako mi treba mir, mogu da odem u svoju sobu. Kasnije mogu da se vratim.", emoji: "🧸" },
            { text: "Posle nekog vremena gosti odlaze svojoj kući. Kod nas je opet tiho.", emoji: "🌙" },
        ],
    },
];
