// Slušaj i spoji — zvuci, nivoi i plan rundi (bez Reacta, da ih testovi i igra dele).
//
// Svaki unos ima zvuk u /public/sounds i sliku: fotografiju iz /public/soundImage (`image`)
// ili, kad fotografije nema, crtež iz SoundPictures.tsx (`drawn`).
//
// Redosled je od tihih i poznatih ka naglim: viši nivoi dodaju zvukove s kraja liste,
// a prva četiri su tiha, pa svaki nivo ima šta da pusti i kad su glasni zvuci isključeni.
// Tihih zvukova je sedam (mačka, krava, svinja, ptica, kiša, sova, vetar); svi su na listi
// do nivoa 4, pa dete kome su glasni zvuci isključeni ne sluša stalno istih pet.
//
// `loud` označava nagle ili oštre zvuke (lavež, sirena, grmljavina, zvono…). Oni se puštaju
// samo ako je roditelj to dozvolio; njihove slike i dalje mogu biti ponuđene kao odgovor.
// `level` ujednačava jačinu snimaka (izmereno na fajlovima: najglasnija sekunda svakog
// snimka svedena je na oko −20 dBFS), da nijedan zvuk ne bude mnogo glasniji od ostalih.
//
// Novih snimaka nema (ne preuzimaju se), pa teži nivoi menjaju način biranja, a ne zvuke.

import { animalImage } from "@/lib/pictures";

export type SoundCategory = "animals" | "vehicles" | "weather" | "home";

export interface SoundMeta {
    id: string;
    label: string;
    sound: string;
    category: SoundCategory;
    loud: boolean;
    /** Udeo izabrane jačine kojim se pušta ovaj snimak (0–1) */
    level: number;
    /** Fotografija; bez nje se crta slika iz SoundPictures.tsx */
    image?: string;
}

export const SOUND_ITEMS: SoundMeta[] = [
    { id: "cat", label: "Mačka", image: animalImage("cat"), sound: "/sounds/macka.mp3", category: "animals", loud: false, level: 0.3 },
    { id: "cow", label: "Krava", image: animalImage("cow"), sound: "/sounds/krava.wav", category: "animals", loud: false, level: 0.4 },
    { id: "pig", label: "Svinja", image: animalImage("pig"), sound: "/sounds/svinja.mp3", category: "animals", loud: false, level: 1 },
    { id: "bird", label: "Ptica", image: animalImage("bird"), sound: "/sounds/ptica.mp3", category: "animals", loud: false, level: 1 },
    { id: "dog", label: "Pas", image: animalImage("dog"), sound: "/sounds/pas.mp3", category: "animals", loud: true, level: 0.65 },
    { id: "rain", label: "Kiša", image: "/soundImage/rain.webp", sound: "/sounds/kisa.mp3", category: "weather", loud: false, level: 1 },
    // Sova i vetar: NIKO IH JOŠ NIJE PRESLUŠAO. Jačina je namerno oprezna i određena samo merenjem fajla
    // (isti postupak kao za ostale: najglasnija sekunda na oko −20 dBFS; vetar se meri u prvih 6 s, koliko se
    // i pušta). Pre objave ih treba preslušati na uređaju i proveriti da nijedan ne počinje naglo.
    // Merenje fajlova (dekodirano, bez puštanja): sova 3,6 s, 44,1 kHz stereo, vrh −3,6 dBFS, bez odsecanja,
    // počinje posle 0,13 s tišine; vetar 19 s, 48 kHz stereo, polako raste iz tišine, ali ima 33 odsečena
    // uzorka (0 dBFS), jedan kratak niz na 4,8 s (u delu koji se pušta) — uz jačinu 0,35 verovatno se ne čuje.
    { id: "owl", label: "Sova", sound: "/sounds/sova.mp3", category: "animals", loud: false, level: 0.45 },
    { id: "horse", label: "Konj", image: animalImage("horse"), sound: "/sounds/konj.mp3", category: "animals", loud: true, level: 0.5 },
    { id: "wind", label: "Vetar", sound: "/sounds/vetar.mp3", category: "weather", loud: false, level: 0.35 },
    { id: "rooster", label: "Petao", image: animalImage("rooster"), sound: "/sounds/petao.wav", category: "animals", loud: true, level: 0.7 },
    { id: "car", label: "Auto", image: "/soundImage/car.webp", sound: "/sounds/sirenaAuta.mp3", category: "vehicles", loud: true, level: 0.55 },
    { id: "bell", label: "Zvono", image: "/soundImage/bell.webp", sound: "/sounds/zvonoKucno.mp3", category: "home", loud: true, level: 0.85 },
    { id: "bear", label: "Medved", image: animalImage("bear"), sound: "/sounds/medved.mp3", category: "animals", loud: true, level: 1 },
    { id: "monkey", label: "Majmun", image: animalImage("monkey"), sound: "/sounds/majmun.mp3", category: "animals", loud: true, level: 1 },
    { id: "police", label: "Policija", image: "/soundImage/policeCar.webp", sound: "/sounds/policija.mp3", category: "vehicles", loud: true, level: 1 },
    { id: "thunder", label: "Grmljavina", image: "/soundImage/thunder.webp", sound: "/sounds/grmljavina.mp3", category: "weather", loud: true, level: 0.7 },
];

/** Zvuk se sam utiša posle ovoliko (kiša, grmljavina i sirena traju dugo) */
export const MAX_PLAY_MS = 6000;

// ── Nivoi ─────────────────────────────────────────────────────────────────────
// Podrška se povlači: na lakim nivoima tačna slika zasvetli već posle prve greške, a ispod slika
// piše šta je na njima; zatim više slika i novih zvukova, pa slike iz iste grupe (životinje sa
// životinjama), slike bez reči i na kraju kraći deo zvuka (dete ga može pustiti koliko god puta želi).

export interface SoundLevel {
    rounds: number;
    /** Broj ponuđenih slika: lako 2–3, srednje 4, teško 6 (pre ograničenja iz podešavanja) */
    options: number;
    /** Koliko prvih zvukova sa liste učestvuje */
    pool: number;
    /** Pogrešne slike se biraju iz iste grupe kao tačna (životinje sa životinjama…) */
    similar: boolean;
    /** Ispod slika nema reči: prepoznaje se samo po slici */
    noLabels: boolean;
    /** Tačna slika zasvetli već posle prve greške (osim kad je roditelj isključio pomoć) */
    earlyHint: boolean;
    /** Koliko dugo se pušta zvuk (kraći deo snimka je teži za prepoznavanje) */
    clipMs: number;
}

const lv = (rounds: number, options: number, pool: number, extra: Partial<SoundLevel> = {}): SoundLevel => ({
    rounds,
    options,
    pool,
    similar: false,
    noLabels: false,
    earlyHint: false,
    clipMs: MAX_PLAY_MS,
    ...extra,
});

export const SOUND_LEVELS: SoundLevel[] = [
    // Lako: dve-tri slike sa nazivom, pomoć posle prve greške
    lv(5, 2, 5, { earlyHint: true }),
    lv(5, 2, 7, { earlyHint: true }),
    lv(5, 3, 8, { earlyHint: true }),
    lv(5, 3, 10, { earlyHint: true }),
    lv(6, 3, 11, { earlyHint: true }),
    // Srednje: četiri slike, novi (i glasniji) zvuci, pa slike iz iste grupe
    lv(5, 4, 12),
    lv(5, 4, 13),
    lv(6, 4, 14),
    lv(6, 4, 15),
    lv(6, 4, 16, { similar: true }),
    // Teško: šest slika, slične slike, slike bez reči i kraći zvuk
    lv(5, 6, 16),
    lv(6, 6, 16, { similar: true }),
    lv(6, 6, 16, { similar: true, clipMs: 4000 }),
    lv(6, 6, 16, { similar: true, noLabels: true, clipMs: 4000 }),
    lv(7, 6, 16, { similar: true, noLabels: true, clipMs: 3000 }),
];

export function soundLevelIndex(level: number): number {
    return Number.isFinite(level) ? Math.min(Math.max(Math.round(level), 1), SOUND_LEVELS.length) - 1 : 0;
}

export interface SoundRound {
    targetId: string;
    optionIds: string[];
}

export interface SoundLimits {
    /** Roditelj je dozvolio nagle i glasne zvuke */
    loudSounds: boolean;
    maxRounds: number;
    /** Najviše ponuđenih slika (podešavanja deteta i širina ekrana) */
    maxOptions: number;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Sve runde nivoa unapred. Traže se samo zvuci koji smeju da se puste. Zvuci koji su novi
 * na ovom nivou sigurno dolaze na red. Kad dozvoljenih zvukova ima manje nego rundi,
 * zvuci se ponavljaju, ali nikad dva puta zaredom.
 */
export function buildSoundRounds(level: number, { loudSounds, maxRounds, maxOptions }: SoundLimits, random: () => number = Math.random): SoundRound[] {
    const index = soundLevelIndex(level);
    const config = SOUND_LEVELS[index];
    const previousPool = index > 0 ? SOUND_LEVELS[index - 1].pool : 0;
    const pool = SOUND_ITEMS.slice(0, config.pool);
    const playable = (item: SoundMeta) => loudSounds || !item.loud;

    // Ako bi nivo ostao sa manje od dva zvuka, uzimaju se dozvoljeni zvuci sa cele liste
    const inPool = pool.filter(playable);
    const candidates = inPool.length >= 2 ? inPool : SOUND_ITEMS.filter(playable);
    const roundCount = candidates.length >= 2 ? Math.max(1, Math.min(config.rounds, maxRounds)) : candidates.length;

    const fresh = candidates.filter((item) => SOUND_ITEMS.indexOf(item) >= previousPool);
    const known = candidates.filter((item) => SOUND_ITEMS.indexOf(item) < previousPool);
    const targets = shuffled([...shuffled(fresh, random), ...shuffled(known, random)].slice(0, roundCount), random);
    while (targets.length < roundCount) {
        const again = shuffled(candidates, random);
        const next = again[0] === targets[targets.length - 1] ? [...again.slice(1), again[0]] : again;
        targets.push(...next.slice(0, roundCount - targets.length));
    }

    // Tačna slika mora biti među ponuđenima i kad je tražen zvuk sa cele liste (van ovog nivoa)
    const optionCount = Math.min(config.options, maxOptions, pool.length);
    return targets.map((target) => {
        let others = shuffled(
            pool.filter((item) => item.id !== target.id),
            random
        );
        if (config.similar) {
            others = [...others.filter((item) => item.category === target.category), ...others.filter((item) => item.category !== target.category)];
        }
        const options = shuffled([target, ...others.slice(0, optionCount - 1)], random);
        return { targetId: target.id, optionIds: options.map((item) => item.id) };
    });
}
