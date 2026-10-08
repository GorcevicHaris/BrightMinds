// Sadržaj igre "Šta da kažeš?" (socijalna komunikacija).
// 15 situacija u 5 grupa po 3. Svaka grupa se igra na tri težine:
//   nivoi 1–5   → 2 ponuđena odgovora
//   nivoi 6–10  → 3 ponuđena odgovora
//   nivoi 11–15 → 4 ponuđena odgovora
// Tekstovi koriste parove `{muški|ženski}` koje razrešava `genderText` iz kit/utils.

export interface SocialSituation {
    id: number;
    /** Emodži scene */
    scene: string;
    /** Opis situacije sa pitanjem */
    text: string;
    /** Ponuđeni odgovori; redosled prikaza se meša u igri */
    answers: string[];
    /** Indeks tačnog odgovora u `answers` */
    correct: number;
    /** Zašto je odgovor tačan — prikazuje se posle tačnog odgovora */
    why: string;
}

interface BaseSituation extends SocialSituation {
    /** Dodatni pogrešni odgovori: prvi se dodaje na srednjem, oba na teškom nivou */
    extra: [string, string];
}

const GROUP_COUNT = 5;
const TIER_COUNT = 3;
const MAX_LEVEL = GROUP_COUNT * TIER_COUNT;

const GROUPS: BaseSituation[][] = [
    // Grupa 1 — hvala, pozdrav, izvini
    [
        {
            id: 1,
            scene: "🎁",
            text: "Dobi{o|la} si poklon. Šta kažeš?",
            answers: ["Hvala!", "Neću to."],
            correct: 0,
            extra: ["Daj još!", "Ništa ne kažeš."],
            why: "Kad dobijemo poklon, kažemo hvala.",
        },
        {
            id: 2,
            scene: "👩‍🏫",
            text: "Srećeš učiteljicu. Šta kažeš?",
            answers: ["Ćutiš.", "Dobar dan!"],
            correct: 1,
            extra: ["Okreneš glavu.", "Šta hoćeš?"],
            why: "Kad sretnemo starije, lepo ih pozdravimo.",
        },
        {
            id: 3,
            scene: "😢",
            text: "Slučajno si gurnu{o|la} druga. Šta kažeš?",
            answers: ["Izvini!", "Skloni se."],
            correct: 0,
            extra: ["Sam si kriv.", "Pobegneš."],
            why: "Kad pogrešimo, kažemo izvini.",
        },
    ],
    // Grupa 2 — molim, zahvaljivanje, odlazak
    [
        {
            id: 4,
            scene: "💧",
            text: "Želiš vodu. Šta kažeš?",
            answers: ["Daj vodu!", "Molim te, daj mi vodu."],
            correct: 1,
            extra: ["Vičeš: „Vode!”", "Uzmeš tuđu čašu."],
            why: "Kad nešto želimo, kažemo molim.",
        },
        {
            id: 5,
            scene: "🧸",
            text: "Drug ti daje igračku. Šta kažeš?",
            answers: ["Hvala ti!", "Baciš je."],
            correct: 0,
            extra: ["Daj mi još jednu!", "Okreneš mu leđa."],
            why: "Kad nam neko nešto da, lepo se zahvalimo.",
        },
        {
            id: 6,
            scene: "🏠",
            text: "Ideš kući. Šta kažeš?",
            answers: ["Doviđenja!", "Samo odeš."],
            correct: 0,
            extra: ["Zalupiš vrata.", "Kažeš: „Baš je bilo dosadno.”"],
            why: "Kad odlazimo, uvek se pozdravimo.",
        },
    ],
    // Grupa 3 — briga o drugima, obrok, odgovor na pozdrav
    [
        {
            id: 7,
            scene: "😭",
            text: "Brat plače. Šta uradiš?",
            answers: ["Smeješ se.", "Pitaš: „Jesi li dobro?”"],
            correct: 1,
            extra: ["Odeš u drugu sobu.", "Kažeš: „Ne plači, dosadan si.”"],
            why: "Brinemo o drugima. Kad neko plače, pitamo ga da li je dobro.",
        },
        {
            id: 8,
            scene: "🍽️",
            text: "Mama je napravila ručak. Šta kažeš?",
            answers: ["Baš je ukusno, hvala!", "Fuj."],
            correct: 0,
            extra: ["Neću da jedem!", "Odgurneš tanjir."],
            why: "Kad nam neko spremi jelo, zahvalimo se.",
        },
        {
            id: 9,
            scene: "👋",
            text: "Drug ti kaže zdravo. Šta kažeš?",
            answers: ["Zdravo!", "Gledaš u pod."],
            correct: 0,
            extra: ["Ćutiš.", "Odeš dalje."],
            why: "Kad nas neko pozdravi, i mi njega pozdravimo.",
        },
    ],
    // Grupa 4 — uključivanje u igru, rešavanje sukoba, pomoć
    [
        {
            id: 10,
            scene: "⚽",
            text: "Želiš da se igraš sa drugima. Šta pitaš?",
            answers: ["Mogu li i ja?", "Uzmeš im loptu."],
            correct: 0,
            extra: ["Vičeš na njih.", "Pokvariš im igru."],
            why: "Kad želimo da se igramo sa drugima, lepo pitamo.",
        },
        {
            id: 11,
            scene: "✏️",
            text: "Neko ti uzme olovku. Šta kažeš?",
            answers: ["Vrati to, molim te.", "Udariš ga."],
            correct: 0,
            extra: ["Vičeš na njega.", "Uzmeš njegovu olovku."],
            why: "Kad nam nešto smeta, to kažemo mirno i lepo.",
        },
        {
            id: 12,
            scene: "🤕",
            text: "Prijatelj je pao. Šta kažeš?",
            answers: ["Smeješ se.", "Treba li ti pomoć?"],
            correct: 1,
            extra: ["Samo prođeš.", "Baš si smotan."],
            why: "Kad neko padne, ponudimo mu pomoć.",
        },
    ],
    // Grupa 5 — kupovina, čestitanje, kulturno obraćanje
    [
        {
            id: 13,
            scene: "🍦",
            text: "Kupuješ sladoled. Šta kažeš?",
            answers: ["Molim vas, jedan sladoled.", "Daj sladoled!"],
            correct: 0,
            extra: ["Hoću odmah!", "Guraš se preko reda."],
            why: "Kad nešto kupujemo, kažemo molim vas.",
        },
        {
            id: 14,
            scene: "🎂",
            text: "Drug slavi rođendan. Šta mu kažeš?",
            answers: ["Srećan rođendan!", "Daj mi tortu."],
            correct: 0,
            extra: ["Gde je moj poklon?", "Tvoja torta je ružna."],
            why: "Kad neko slavi rođendan, čestitamo mu.",
        },
        {
            id: 15,
            scene: "🚶",
            text: "Želiš da prođeš. Šta kažeš?",
            answers: ["Skloni se!", "Izvinite, mogu li da prođem?"],
            correct: 1,
            extra: ["Guraš ljude.", "Vičeš: „Pusti me!”"],
            why: "Kad želimo da prođemo, kulturno zamolimo.",
        },
    ],
];

const SITUATIONS_PER_TIER = GROUPS.reduce((sum, group) => sum + group.length, 0);

function buildLevel(level: number): SocialSituation[] {
    const tier = Math.floor((level - 1) / GROUP_COUNT);
    return GROUPS[(level - 1) % GROUP_COUNT].map(({ extra, ...base }) => ({
        ...base,
        id: base.id + tier * SITUATIONS_PER_TIER,
        answers: [...base.answers, ...extra.slice(0, tier)],
    }));
}

/** Situacije po nivoima 1–15 (ID-jevi 1–45, isti raspored kao ranije). */
export const SITUATIONS_BY_LEVEL: Record<number, SocialSituation[]> = Object.fromEntries(
    Array.from({ length: MAX_LEVEL }, (_, i) => [i + 1, buildLevel(i + 1)])
);

const SITUATIONS_BY_ID = new Map<number, SocialSituation>(
    Object.values(SITUATIONS_BY_LEVEL)
        .flat()
        .map((situation) => [situation.id, situation])
);

/** Situacije za nivo; nivo van opsega 1–15 se svodi na najbliži postojeći. */
export function getSituationsForLevel(level: number): SocialSituation[] {
    const safe = Number.isFinite(level) ? Math.min(Math.max(Math.round(level), 1), MAX_LEVEL) : 1;
    return SITUATIONS_BY_LEVEL[safe];
}

export function getSituation(id: number): SocialSituation | undefined {
    return SITUATIONS_BY_ID.get(id);
}
