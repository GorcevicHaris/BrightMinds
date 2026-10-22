// Sadržaj igre „Šta je prvo?”: nizovi koraka iz svakodnevnog života i raspored po nivoima.
//
// Pravila pisanja (važna za decu iz spektra autizma):
//  • Svaki niz ima JEDAN logičan redosled: korak zavisi od prethodnog (čarape pa patike,
//    seme pa voda pa cvet). Nema rutina koje se razlikuju od kuće do kuće (doručak i zubi) —
//    dete ne sme da dobije „netačno” za ono što kod kuće radi drugačije.
//  • Koraci su u prvom licu sadašnjeg vremena („Obučem čarape.”) — bez roda, isto za dečake
//    i devojčice.
//  • Svaki korak ima svoju sličicu; u istom nizu se sličice ne ponavljaju (test).

export interface SequenceStep {
    emoji: string;
    text: string;
}

export interface Sequence {
    id: string;
    title: string;
    steps: SequenceStep[];
}

const s = (emoji: string, text: string): SequenceStep => ({ emoji, text });

export const SEQUENCES: readonly Sequence[] = [
    // Dva koraka
    { id: "socks", title: "Patike", steps: [s("🧦", "Obučem čarape."), s("👟", "Obujem patike.")] },
    { id: "rain", title: "Kiša", steps: [s("🌧️", "Pada kiša."), s("☂️", "Otvorim kišobran.")] },
    { id: "hands-eat", title: "Ručak", steps: [s("🧼", "Operem ruke."), s("🍽️", "Ručam.")] },
    { id: "night", title: "Veče", steps: [s("🌙", "Padne mrak."), s("🛏️", "Idem na spavanje.")] },
    { id: "balloon", title: "Balon", steps: [s("🎈", "Naduvam balon."), s("🤾", "Igram se balonom.")] },
    { id: "ice-cream", title: "Sladoled", steps: [s("🛒", "Kupim sladoled."), s("🍦", "Jedem sladoled.")] },
    { id: "egg", title: "Jaje", steps: [s("🥚", "Razbijem jaje."), s("🍳", "Ispržim jaje.")] },
    { id: "juice", title: "Sok", steps: [s("🧃", "Otvorim sok."), s("😋", "Popijem sok.")] },

    // Tri koraka
    { id: "teeth", title: "Pranje zuba", steps: [s("🪥", "Uzmem četkicu."), s("🦷", "Operem zube."), s("💧", "Isperem usta.")] },
    { id: "sandwich", title: "Sendvič", steps: [s("🍞", "Uzmem hleb."), s("🧈", "Namažem hleb."), s("😋", "Pojedem sendvič.")] },
    { id: "plant", title: "Cvet", steps: [s("🌱", "Posadim seme."), s("💧", "Zalijem ga."), s("🌻", "Izraste cvet.")] },
    { id: "drawing", title: "Crtež", steps: [s("✏️", "Nacrtam kuću."), s("🖍️", "Obojim crtež."), s("🖼️", "Pokažem crtež mami.")] },
    { id: "morning", title: "Jutro", steps: [s("⏰", "Probudim se."), s("👕", "Obučem se."), s("🎒", "Idem u vrtić.")] },
    { id: "snowman", title: "Sneško", steps: [s("❄️", "Pada sneg."), s("⛄", "Pravim Sneška."), s("🥕", "Stavim mu nos.")] },
    { id: "birthday", title: "Rođendan", steps: [s("🎂", "Mama donese tortu."), s("🕯️", "Dunem svećice."), s("🍰", "Jedemo tortu.")] },

    // Četiri koraka
    { id: "wash-hands", title: "Pranje ruku", steps: [s("🚰", "Pustim vodu."), s("🧼", "Nasapunjam ruke."), s("💧", "Isperem sapun."), s("🧻", "Obrišem ruke.")] },
    { id: "park", title: "Park", steps: [s("👟", "Obujem patike."), s("🚪", "Izađem iz kuće."), s("🌳", "Igram se u parku."), s("🏠", "Vratim se kući.")] },
    { id: "cereal", title: "Pahuljice", steps: [s("🥣", "Uzmem činiju."), s("🥛", "Sipam mleko i pahuljice."), s("🥄", "Jedem pahuljice."), s("🧽", "Operem činiju.")] },
    { id: "cookies", title: "Kolač", steps: [s("🥚", "Razbijemo jaja."), s("🥄", "Umešamo testo."), s("🔥", "Ispečemo kolač."), s("🍪", "Jedemo kolač.")] },
    { id: "puzzle", title: "Slagalica", steps: [s("📦", "Otvorim kutiju."), s("🧩", "Složim slagalicu."), s("👏", "Pokažem slagalicu."), s("🗃️", "Vratim delove u kutiju.")] },
    { id: "doctor", title: "Kod doktora", steps: [s("🏥", "Uđem kod doktora."), s("🩺", "Doktor me pregleda."), s("⭐", "Dobijem nalepnicu."), s("🏠", "Idem kući.")] },
    { id: "letter", title: "Pismo", steps: [s("✏️", "Napišem pismo baki."), s("✉️", "Stavim ga u koverat."), s("📮", "Ubacim koverat u sanduče."), s("📬", "Pismo stigne baki.")] },

    // Pet koraka
    { id: "garden", title: "Sadnja", steps: [s("🕳️", "Iskopam rupu."), s("🌰", "Stavim seme."), s("🟫", "Zatrpam ga zemljom."), s("💧", "Zalijem zemlju."), s("🌷", "Izraste cvet.")] },
    { id: "teeth-5", title: "Zubi", steps: [s("🪥", "Uzmem četkicu."), s("🧴", "Stavim pastu."), s("🦷", "Operem zube."), s("💧", "Isperem usta."), s("🚰", "Operem četkicu.")] },
    { id: "shopping", title: "Prodavnica", steps: [s("📝", "Napišemo spisak."), s("🛒", "Uzmemo kolica."), s("🍎", "Stavimo voće u kolica."), s("💳", "Platimo na kasi."), s("🛍️", "Ponesemo kese kući.")] },
    { id: "wash-hands-5", title: "Čiste ruke", steps: [s("🚰", "Pustim vodu."), s("🖐️", "Pokvasim ruke."), s("🧼", "Nasapunjam ruke."), s("💧", "Isperem sapun."), s("🧻", "Obrišem ruke.")] },
    { id: "tower", title: "Kula", steps: [s("📦", "Izvadim kocke."), s("🧱", "Stavim prvu kocku."), s("🏗️", "Slažem kocke jednu na drugu."), s("🏰", "Kula je gotova."), s("🗃️", "Vratim kocke u kutiju.")] },
];

// ── Nivoi ─────────────────────────────────────────────────────────────────────

interface LevelRule {
    first: number;
    last: number;
    /** Broj koraka u nizu */
    steps: number;
    /** Broj nizova u nivou */
    rounds: number;
}

const RULES: readonly LevelRule[] = [
    { first: 1, last: 3, steps: 2, rounds: 3 },
    { first: 4, last: 6, steps: 3, rounds: 3 },
    { first: 7, last: 10, steps: 4, rounds: 3 },
    { first: 11, last: 15, steps: 5, rounds: 3 },
];

export const SEQUENCE_MAX_LEVEL = 15;

export function sequenceRule(level: number): LevelRule {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), SEQUENCE_MAX_LEVEL);
    return RULES.find((rule) => safe >= rule.first && safe <= rule.last) ?? RULES[0];
}

/**
 * Nizovi jednog nivoa. `maxSteps` dolazi iz uzrasta (najmlađi: najviše tri koraka — ređanje
 * tri slike je tipično oko četvrte godine). Kad nizova te dužine ima manje nego što treba,
 * nivo uzima i kraće nizove; nikad duže od dozvoljenog.
 */
export function buildSequenceLevel(level: number, { maxSteps, random = Math.random }: { maxSteps: number; random?: () => number }): Sequence[] {
    const rule = sequenceRule(level);
    const steps = Math.max(2, Math.min(rule.steps, Number.isFinite(maxSteps) ? maxSteps : rule.steps));
    const shuffle = <T,>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const exact = shuffle(SEQUENCES.filter((sequence) => sequence.steps.length === steps));
    const shorter = shuffle(SEQUENCES.filter((sequence) => sequence.steps.length < steps)).sort((a, b) => b.steps.length - a.steps.length);
    return [...exact, ...shorter].slice(0, rule.rounds);
}

export function getSequence(id: string): Sequence | undefined {
    return SEQUENCES.find((sequence) => sequence.id === id);
}
