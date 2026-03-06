"use client";

import { useState, useEffect, useRef } from "react";
import { useGameEmitter } from "@/lib/useSocket";

interface GameProps {
    childId: number;
    level: number;
    onComplete: (score: number, duration: number, moodBefore?: string | null, moodAfter?: string | null) => void;
    isMonitor?: boolean;
    monitorState?: any;
}

interface Situation {
    id: number;
    scene: string;
    description: string;
    question: string;
    answers: string[];
    correct: number;
    hint: string;
    color: string;
    bgColor: string;
}

// ─── SITUACIJE PO NIVOIMA ────────────────────────────────────────────────────
const SITUATIONS_BY_LEVEL: Record<number, Situation[]> = {
    1: [
        {
            id: 1, scene: "🎁",
            description: "Dobio/la si poklon od bake.",
            question: "Šta treba da kažeš?",
            answers: ["Hvala, bako!", "Ostavi to tu.", "Hoću drugi!"],
            correct: 0,
            hint: "Kada dobijemo nešto lepo, uvek kažemo 'hvala'.",
            color: "#7C3AED", bgColor: "#EDE9FE",
        },
        {
            id: 2, scene: "👋",
            description: "Srećeš komšiju u hodniku zgrade.",
            question: "Kako ga pozdravljaš?",
            answers: ["Zdravo!", "Dobar dan!", "Skloni se."],
            correct: 1,
            hint: "Starije osobe pozdravljamo sa 'Dobar dan'.",
            color: "#0891B2", bgColor: "#E0F2FE",
        },
        {
            id: 3, scene: "🍎",
            description: "Sediš za stolom i želiš jabuku koja je daleko.",
            question: "Šta kažeš roditeljima?",
            answers: ["Daj mi jabuku!", "Molim te, dodaj mi jabuku.", "Sam ću uzeti kasnije."],
            correct: 1,
            hint: "Uvek koristimo magičnu reč 'molim'.",
            color: "#059669", bgColor: "#D1FAE5",
        },
        {
            id: 4, scene: "😢",
            description: "Slučajno si prosuo/la sok po drugarovom crtežu.",
            question: "Šta kažeš?",
            answers: ["To je samo papir.", "Baš me briga.", "Izvini, slučajno sam prosuo/la."],
            correct: 2,
            hint: "Kada napravimo grešku, makar i slučajno, kažemo 'izvini'.",
            color: "#DC2626", bgColor: "#FEE2E2",
        },
        {
            id: 5, scene: "🚪",
            description: "Učiteljica ulazi u učionicu.",
            question: "Kako reaguješ?",
            answers: ["Ustaneš i kažeš: 'Dobar dan!'", "Nastaviš da pričaš.", "Sakriješ se ispod stola."],
            correct: 0,
            hint: "Pozdravljamo učitelje kada uđu na čas.",
            color: "#D97706", bgColor: "#FEF3C7",
        },
    ],

    2: [
        {
            id: 6, scene: "🎮",
            description: "Drugar se igra na tabletu. I ti bi hteo/la.",
            question: "Šta ga/je pitaš?",
            answers: ["Daj mi to, ja sam na redu!", "Mogu li i ja da se igram s tobom?", "Čekaš da završi bez reči."],
            correct: 1,
            hint: "Pitaj lepo da se pridružiš igri.",
            color: "#7C3AED", bgColor: "#EDE9FE",
        },
        {
            id: 7, scene: "🍫",
            description: "Nude ti bombonu, ali tvoji mama i tata ne dozvoljavaju pre ručka.",
            question: "Šta kažeš?",
            answers: ["Uzmeš i brzo pojedeš.", "Neću to, fuj!", "Hvala, ali ne smem pre ručka."],
            correct: 2,
            hint: "Pristojno odbijamo ono što ne smemo.",
            color: "#0891B2", bgColor: "#E0F2FE",
        },
        {
            id: 8, scene: "🧸",
            description: "Neko dete ti je uzelo omiljenu igračku.",
            question: "Šta radiš?",
            answers: ["Vrati mi moju igračku, molim te.", "Udariš dete.", "Počneš da plačeš jako."],
            correct: 0,
            hint: "Koristi reči da bi vratio/la svoju igračku.",
            color: "#DC2626", bgColor: "#FEE2E2",
        },
        {
            id: 9, scene: "🥤",
            description: "Mnogo si žedan/na nakon trčanja.",
            question: "Šta kažeš vaspitačici?",
            answers: ["Vode! Odmah!", "Mogu li da dobijem malo vode, molim vas?", "Samo odeš do česme bez pitanja."],
            correct: 1,
            hint: "Zamoli vaspitačicu na ljubazan način.",
            color: "#059669", bgColor: "#D1FAE5",
        },
        {
            id: 10, scene: "🎂",
            description: "Drugarica te je pozvala na rođendan.",
            question: "Šta joj kažeš kad uđeš u sobu?",
            answers: ["Srećan rođendan! Izvoli poklon.", "Gde su druge zvanice?", "Mogu li odmah da jedem tortu?"],
            correct: 0,
            hint: "Uvek prvo čestitamo rođendan.",
            color: "#DB2777", bgColor: "#FCE7F3",
        },
        {
            id: 11, scene: "🚿",
            description: "U kupatilu si i potrošio/la si sav toalet papir.",
            question: "Šta vikneš mami?",
            answers: ["Nema više!", "Mama, možeš li mi doneti papir, molim te?", "Ćutiš i čekaš."],
            correct: 1,
            hint: "Traži pomoć na jasan i ljubazan način.",
            color: "#D97706", bgColor: "#FEF3C7",
        },
    ],

    3: [
        {
            id: 12, scene: "😡",
            description: "Jako si ljut/a jer si izgubio/la u igri 'Čoveče, ne ljuti se'.",
            question: "Šta radiš?",
            answers: ["Razbacaš figure po sobi.", "Udahneš duboko i čestitaš pobedniku.", "Kažeš da svi varaju."],
            correct: 1,
            hint: "Nauči da gubiš dostojanstveno.",
            color: "#7C3AED", bgColor: "#EDE9FE",
        },
        {
            id: 13, scene: "🏠",
            description: "Došao si kod drugara kući prvi put.",
            question: "Šta radiš sa svojim patikama?",
            answers: ["Uđeš unutra u patikama.", "Pitaš: 'Da li treba da se izujem?'", "Ostaviš ih nasred vrata."],
            correct: 1,
            hint: "Uvek pitamo domaćina za pravila u njegovoj kući.",
            color: "#0891B2", bgColor: "#E0F2FE",
        },
        {
            id: 14, scene: "🤒",
            description: "Vidiš da se drugarica u parku udarila i plače.",
            question: "Šta uradiš?",
            answers: ["Smeješ se jer je pala.", "Priđeš i pitaš: 'Jesi li dobro? Treba li ti pomoć?'", "Pobegneš da te ne okrive."],
            correct: 1,
            hint: "Pokaži empatiju i brigu za druge.",
            color: "#DC2626", bgColor: "#FEE2E2",
        },
        {
            id: 15, scene: "📱",
            description: "Mama razgovara sa tatom i ti želiš nešto važno da kažeš.",
            question: "Kako se uključuješ?",
            answers: ["Prekineš ih glasnim vikanjem.", "Sačekaš da naprave pauzu i kažeš: 'Izvinite, mogu li samo nešto da kažem?'", "Počneš da ih vučeš za odeću."],
            correct: 1,
            hint: "Ne prekidaj ljude dok razgovaraju.",
            color: "#D97706", bgColor: "#FEF3C7",
        },
        {
            id: 16, scene: "🚌",
            description: "U autobusu sediš, a pored tebe stoji baka sa torbama.",
            question: "Šta radiš?",
            answers: ["Gledaš kroz prozor i žmuriš.", "Ustaneš i kažeš: 'Izvolite, bako, sedite.'", "Pitaš je šta ima u torbama."],
            correct: 1,
            hint: "Mlađi treba da ustupaju mesto starijima.",
            color: "#059669", bgColor: "#D1FAE5",
        },
        {
            id: 17, scene: "🤫",
            description: "Drugar ti je poverio tajnu o svojoj novoj igrački.",
            question: "Šta radiš?",
            answers: ["Omah ispričaš celom razredu.", "Čuvaš tu tajnu samo za sebe.", "Ismevaš tu tajnu."],
            correct: 1,
            hint: "Prijatelji čuvaju tajne jedni drugima.",
            color: "#DB2777", bgColor: "#FCE7F3",
        },
    ],

    4: [
        {
            id: 18, scene: "😭",
            description: "Video/la si da drugar plače jer je dobio lošu ocenu.",
            question: "Šta mu kažeš?",
            answers: ["Ja sam dobio peticu, ti si loš.", "Nemoj da plačeš, popravićeš to sledeći put.", "Samo prođeš pored njega."],
            correct: 1,
            hint: "Uteši prijatelja kada mu je teško.",
            color: "#7C3AED", bgColor: "#EDE9FE",
        },
        {
            id: 19, scene: "🏆",
            description: "Tvoj tim je pobedio u fudbalu.",
            question: "Šta kažeš protivničkom timu?",
            answers: ["Mi smo najbolji, vi nemate pojma!", "Dobra igra! Baš je bilo napeto.", "Sledeći put nemojte ni da dolazite."],
            correct: 1,
            hint: "Budi fer igrač i čestitaj protivniku.",
            color: "#059669", bgColor: "#D1FAE5",
        },
        {
            id: 20, scene: "😠",
            description: "Brat ti je slučajno srušio kulu od kockica koju si dugo gradio/la.",
            question: "Kako reaguješ?",
            answers: ["Srušiš i ti njegovu kulu.", "Besan/na si, ali kažeš: 'Molim te, pazi drugi put, baš sam se trudio/la.'", "Udariš brata."],
            correct: 1,
            hint: "Kontroliši bes i objasni kako se osećaš.",
            color: "#DC2626", bgColor: "#FEE2E2",
        },
        {
            id: 21, scene: "🤗",
            description: "Tata je došao s posla ranije da te vodi u bioskop.",
            question: "Šta uradiš?",
            answers: ["Kažeš 'Super' i odeš u sobu po ranac.", "Zagrliš ga i kažeš: 'Baš si me obradovao, tata!'", "Pitaš ga zašto nije kupio i čokoladu."],
            correct: 1,
            hint: "Pokaži radost i zahvalnost roditeljima.",
            color: "#D97706", bgColor: "#FEF3C7",
        },
        {
            id: 22, scene: "😔",
            description: "Izgubio/la si omiljenu loptu u parku.",
            question: "Šta kažeš roditeljima?",
            answers: ["Kriviš njih što nisu pazili.", "Tužan/na sam što sam izgubio/la loptu. Možemo li je potražiti sutra?", "Ništa ne pričaš i ljutiš se na sve."],
            correct: 1,
            hint: "Reci iskreno kako se osećaš i zamoli za pomoć.",
            color: "#DB2777", bgColor: "#FCE7F3",
        },
    ],

    5: [
        {
            id: 23, scene: "🏫",
            description: "Neki dečak u školi tvojoj drugarici uporno govori da je ružna.",
            question: "Šta ti radiš kao njen prijatelj?",
            answers: ["I ja počnem da je zadirkujem.", "Kažem mu: 'To nije lepo, prestani da je vređaš.'", "Pravim se da ne čujem."],
            correct: 1,
            hint: "Brani svoje prijatelje od nepravde.",
            color: "#7C3AED", bgColor: "#EDE9FE",
        },
        {
            id: 24, scene: "🍽️",
            description: "U restoranu konobar ti donosi pogrešan sok.",
            question: "Kako mu to kažeš?",
            answers: ["Vikneš: 'Ovo nije moje, nosi ovo nazad!'", "Ljubazno kažeš: 'Izvinite, mislim da sam naručio sok od jabuke, a ne od narandže.'", "Popiješ sok i ćutiš, ali si nezadovoljan."],
            correct: 1,
            hint: "Uvek se obraćaj ljudima sa poštovanjem, čak i kad naprave grešku.",
            color: "#0891B2", bgColor: "#E0F2FE",
        },
        {
            id: 25, scene: "🤝",
            description: "Mama te upoznaje sa svojom koleginicom sa posla.",
            question: "Šta kažeš i uradiš?",
            answers: ["Pružiš ruku i kažeš: 'Dobar dan, ja sam [ime]. Drago mi je.'", "Sakriješ se iza mamine noge.", "Samo mahneš i nastaviš da gledaš u telefon."],
            correct: 0,
            hint: "Lepo predstavljanje ostavlja dobar prvi utisak.",
            color: "#059669", bgColor: "#D1FAE5",
        },
        {
            id: 26, scene: "🛒",
            description: "U velikoj prodavnici si i odjednom ne vidiš roditelje.",
            question: "Šta je najsigurnije da uradiš?",
            answers: ["Počneš da trčiš na sve strane i tražiš ih.", "Priđeš radnici na kasi i kažeš: 'Izgubio sam se, možete li pozvati moje roditelje?'", "Izađeš sam napolje na parking."],
            correct: 1,
            hint: "Obrati se zaposlenom za pomoć ako se izgubiš na javnom mestu.",
            color: "#DC2626", bgColor: "#FEE2E2",
        },
        {
            id: 27, scene: "🎨",
            description: "Drugar radi na crtežu, a ti hoćeš baš tu plavu bojicu koju on koristi.",
            question: "Šta uradiš?",
            answers: ["Otmeš mu bojicu iz ruke.", "Kažeš: 'Mogu li da koristim tu plavu kad završiš?'", "Počneš da žvrljaš po njegovom papiru."],
            correct: 1,
            hint: "Uvek pitamo pre nego što uzmemo nešto tuđe.",
            color: "#D97706", bgColor: "#FEF3C7",
        },
    ],

    6: [
        {
            id: 28, scene: "🧩",
            description: "U školi radite grupni projekat i svako ima svoj zadatak.",
            question: "Šta radiš ako završiš svoj deo ranije?",
            answers: ["Počneš da ometaš druge.", "Pitaš: 'Da li nekome treba pomoć sa njegovim delom?'", "Sedneš i gledaš u plafon."],
            correct: 1,
            hint: "Timski rad znači da pomažemo jedni drugima.",
            color: "#7C3AED", bgColor: "#EDE9FE",
        },
        {
            id: 29, scene: "🌧️",
            description: "Vidiš da se dete na igralištu srušilo sa ljuljaške i izgleda uplašeno.",
            question: "Šta radiš?",
            answers: ["Smeješ se i kažeš ostalima da dođu da vide.", "Pitaš: 'Jesi li se povredio? Hoćeš da pozovemo nekog starijeg?'", "Produžiš dalje."],
            correct: 1,
            hint: "Ponudi pomoć drugima kad vidiš da su u nevolji.",
            color: "#0891B2", bgColor: "#E0F2FE",
        },
        {
            id: 30, scene: "🎯",
            description: "Neko dete želi da uđe u vašu grupu za fudbal, ali nije baš vešto.",
            question: "Šta kažeš?",
            answers: ["Ne možeš, ti si spor, pokvarićeš nam igru.", "Hajde, upašni u naš tim, mi ćemo ti pomoći da vežbaš!", "Pitaš druge da li se slažu, a nadaš se da će reći ne."],
            correct: 1,
            hint: "Inkluzivnost je važna – svako treba da dobije priliku za igru.",
            color: "#059669", bgColor: "#D1FAE5",
        },
        {
            id: 31, scene: "🏠",
            description: "Sledi vreme za spavanje, a ti bi još da gledaš crtani.",
            question: "Šta kažeš tati?",
            answers: ["Počneš da plačeš i odbijaš da ideš.", "Kažeš: 'U redu, idem sad, ali možemo li sutra pogledati do kraja?'", "Sakriješ daljinski upravljač."],
            correct: 1,
            hint: "Kompromis i dogovor su bolji od vikanja.",
            color: "#DC2626", bgColor: "#FEE2E2",
        },
        {
            id: 32, scene: "🌟",
            description: "Dobio si manju igračku od sestre, a ti si hteo tu njenu.",
            question: "Kako se ponašaš?",
            answers: ["Baciš svoju igračku i otmeš njenu.", "Kažeš: 'Hvala na poklonu. Sestro, možemo li sutra da se zamenimo na kratko?'", "Počneš da je udaraš."],
            correct: 1,
            hint: "Budi zahvalan na onome što imaš i pregovaraj mirno.",
            color: "#D97706", bgColor: "#FEF3C7",
        },
    ],

    7: [
        {
            id: 33, scene: "🤫",
            description: "Drugar je uradio nešto loše nastavnici i moli te da ne kažeš nikome.",
            question: "Šta radiš ako te nastavnica pita šta se desilo?",
            answers: ["Lažeš da ne znaš ništa.", "Kažeš istinu ljubazno, jer je to ispravno.", "Pitaš drugara da ti plati da ćutiš."],
            correct: 1,
            hint: "Iskrenost je važnija od čuvanja tajni koje kriju loše postupke.",
            color: "#7C3AED", bgColor: "#EDE9FE",
        },
        {
            id: 34, scene: "💻",
            description: "Neki nepoznat dečak na internetu te pita kako se zove tvoja škola.",
            question: "Šta mu odgovaraš?",
            answers: ["Kažeš mu tačno ime škole.", "Ne odgovaraš mu i odmah obaveštavaš roditelje.", "Ljubazno mu odgovoriš, ali mu ne kažeš istinu."],
            correct: 1,
            hint: "Nikada ne dajemo lične podatke nepoznatim osobama na internetu.",
            color: "#0891B2", bgColor: "#E0F2FE",
        },
        {
            id: 35, scene: "🚑",
            description: "Stariji čovek je pao ispred tebe i ne može da ustane.",
            question: "Šta radiš odmah?",
            answers: ["Pokušaš sam da ga podigneš.", "Brzo potražiš najbližu stariju osobu ili radnika i obavestiš ih.", "Samo ga zaobiđeš."],
            correct: 1,
            hint: "U hitnim situacijama uvek zovemo odrasle u pomoć.",
            color: "#DC2626", bgColor: "#FEE2E2",
        },
        {
            id: 36, scene: "🎓",
            description: "Zaboravio si da uradiš domaći zadatak.",
            question: "Šta kažeš nastavniku?",
            answers: ["Kažem istinu i zamolim da donesem sutra.", "Lažem da mi je pas pojeo svesku.", "Prepišem od drugara pre časa bez pitanja."],
            correct: 0,
            hint: "Bolje je priznati grešku nego se osloniti na laži.",
            color: "#059669", bgColor: "#D1FAE5",
        },
        {
            id: 37, scene: "😶",
            description: "Dete u odeljenju stalno sedi samo jer ima staru odeću.",
            question: "Kako se ponašaš?",
            answers: ["Smejem mu se sa drugima.", "Priđem mu i ponudim mu da sednemo zajedno na odmoru.", "Ignorišem ga jer se plašim šta će drugi reći."],
            correct: 1,
            hint: "Ne sudi ljudima po odeći, budi ljubazan prema svima.",
            color: "#D97706", bgColor: "#FEF3C7",
        },
    ],

    8: [
        {
            id: 38, scene: "🌍",
            description: "U vašu grupu je stiglo novo dete koje slabo govori vaš jezik.",
            question: "Kako mu pomažeš da se uklopi?",
            answers: ["Smejem se kad nešto pogrešno izgovori.", "Govorim polako, koristim slike i uključujem ga u igru.", "Ne družiš se sa njim jer je preteško razumeti ga."],
            correct: 1,
            hint: "Pokaži strpljenje i budi inkluzivan.",
            color: "#7C3AED", bgColor: "#EDE9FE",
        },
        {
            id: 39, scene: "🏅",
            description: "Pobedio si na takmičenju iz matematike, a tvoj najbolji drugar je bio zadnji.",
            question: "Šta mu kažeš?",
            answers: ["Ha-ha, ja sam pobedio, ti si baš spor!", "Čestitam i tebi na trudu, sledeći put ćeš ti biti bolji!", "Ne pričam sa njim da ga ne bih podsećao na poraz."],
            correct: 1,
            hint: "Uspeh proslavljaj skromno i podrži one koji nisu uspeli.",
            color: "#D97706", bgColor: "#FEF3C7",
        },
        {
            id: 40, scene: "📣",
            description: "Video si grupu starijih dečaka kako otimaju loptu mlađem detetu.",
            question: "Šta je najpametnije da uradiš?",
            answers: ["Pokušaš sam da im otmeš loptu.", "Odmah obavestiš vaspitača ili nastavnika šta se dešava.", "Praviš se da nisi video."],
            correct: 1,
            hint: "Nasilje uvek treba prijaviti odrasloj osobi.",
            color: "#DC2626", bgColor: "#FEE2E2",
        },
        {
            id: 41, scene: "💬",
            description: "Drugar ti priča o nečemu što ga plaši, a ti misliš da je to smešno.",
            question: "Kako reaguješ?",
            answers: ["Počneš da mu se smeješ u lice.", "Pažljivo ga saslušaš i pokušaš da razumeš zašto se on tako oseća.", "Kažeš mu: 'To je glupo, ne izmišljaj.'"],
            correct: 1,
            hint: "Poštuj tuđa osećanja, čak i ako ih ne deliš.",
            color: "#059669", bgColor: "#D1FAE5",
        },
        {
            id: 42, scene: "🧠",
            description: "Imaš drugačiju ideju za projekat od tvog tima.",
            question: "Kako je predstavljaš?",
            answers: ["Kažem da je njihova ideja užasna.", "Kažem: 'Uvažavam vaše, ali imam i ja jednu ideju, šta mislite o ovome?'", "Ćutim i posle se žalim roditeljima."],
            correct: 1,
            hint: "Nauči da braniš svoje mišljenje na konstruktivan način.",
            color: "#DB2777", bgColor: "#FCE7F3",
        },
    ],
};

const ALL_SITUATIONS = Object.values(SITUATIONS_BY_LEVEL).flat();

function getSituationsForLevel(level: number): Situation[] {
    if (level >= 1 && level <= 8) return SITUATIONS_BY_LEVEL[level] || SITUATIONS_BY_LEVEL[1];
    return [...ALL_SITUATIONS].sort(() => Math.random() - 0.5).slice(0, 8);
}

type AnswerState = "idle" | "correct" | "wrong";

export default function SocialCommunicationGame({
    childId, level, onComplete, isMonitor, monitorState
}: GameProps) {
    const situations = getSituationsForLevel(level);
    const [currentIndex, setCurrentIndex] = useState(monitorState?.currentIndex || 0);
    const [score, setScore] = useState(monitorState?.score || 0);
    const [correctCount, setCorrectCount] = useState(monitorState?.correctCount || 0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [answerState, setAnswerState] = useState<AnswerState>("idle");
    const [hintVisible, setHintVisible] = useState(false);
    const [isPlaying, setIsPlaying] = useState(isMonitor ? true : false);
    const [showMoodBefore, setShowMoodBefore] = useState(false);
    const [showMoodAfter, setShowMoodAfter] = useState(false);
    const [moodBefore, setMoodBefore] = useState<string | null>(null);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [completed, setCompleted] = useState(false);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [totalIncorrect, setTotalIncorrect] = useState(monitorState?.totalIncorrect || 0);
    const [advancing, setAdvancing] = useState(false); // blocks clicks during auto-advance

    const { emitGameStart, emitGameProgress, emitGameComplete, isConnected } = useGameEmitter();

    useEffect(() => {
        if (isMonitor && monitorState) {
            if (monitorState.currentIndex !== undefined) setCurrentIndex(monitorState.currentIndex);
            if (monitorState.score !== undefined) setScore(monitorState.score);
            if (monitorState.correctCount !== undefined) setCorrectCount(monitorState.correctCount);
            if (monitorState.totalIncorrect !== undefined) setTotalIncorrect(monitorState.totalIncorrect);
        }
    }, [isMonitor, monitorState]);

    const currentSituation = situations[currentIndex];
    const totalSituations = situations.length;

    const handleAnswerClick = (index: number) => {
        if (answerState !== "idle" || isMonitor || advancing) return;
        setSelectedAnswer(index);

        if (index === currentSituation.correct) {
            // Tačno!
            const points = wrongAttempts === 0 ? 100 : wrongAttempts === 1 ? 60 : 30;
            const newScore = score + points;
            const newCorrect = correctCount + 1;
            setScore(newScore);
            setCorrectCount(newCorrect);
            setAnswerState("correct");
            setHintVisible(false);
            setAdvancing(true);  // block further clicks

            emitGameProgress({
                childId, activityId: 6, gameType: "social" as any, event: "answer",
                data: { correct: true, situationId: currentSituation.id, score: newScore, correctCount: newCorrect, totalIncorrect, index: currentIndex, level, totalSituations },
                timestamp: new Date().toISOString(),
            });

            setTimeout(() => {
                if (currentIndex + 1 >= totalSituations) {
                    finishGame(newScore, newCorrect);
                } else {
                    setCurrentIndex((prev: number) => prev + 1);
                    setSelectedAnswer(null);
                    setAnswerState("idle");
                    setHintVisible(false);
                    setWrongAttempts(0);
                    setAdvancing(false);
                }
            }, 1500);

        } else {
            // Netačno
            setAnswerState("wrong");
            setWrongAttempts((prev: number) => prev + 1);
            const newTotalIncorrect = totalIncorrect + 1;
            setTotalIncorrect(newTotalIncorrect);

            // Šaljemo monitoru da je došlo do greške
            emitGameProgress({
                childId, activityId: 6, gameType: "social" as any, event: "answer",
                data: { correct: false, situationId: currentSituation.id, score, totalIncorrect: newTotalIncorrect, index: currentIndex, level },
                timestamp: new Date().toISOString(),
            });

            setTimeout(() => {
                setSelectedAnswer(null);
                setAnswerState("idle");
            }, 1200);
        }
    };

    const finishGame = (finalScore: number, finalCorrect: number) => {
        setCompleted(true);
        setIsPlaying(false);
        emitGameComplete({
            childId, activityId: 6, gameType: "social" as any, event: "completed",
            data: { finalScore, correctCount: finalCorrect, totalIncorrect, totalSituations },
            timestamp: new Date().toISOString(),
        });
        setTimeout(() => setShowMoodAfter(true), 1000);
    };

    const handleMoodBeforeSelect = (mood: string) => {
        setMoodBefore(mood);
        setShowMoodBefore(false);
        setIsPlaying(true);
        setStartTime(Date.now());
        setCurrentIndex(0);
        setScore(0);
        setCorrectCount(0);
        setCompleted(false);
        setAnswerState("idle");
        setSelectedAnswer(null);
        setWrongAttempts(0);
        setTotalIncorrect(0);
        setAdvancing(false);
        emitGameStart(childId, 6, "social" as any, { level });
    };

    const handleMoodAfterSelect = (mood: string) => {
        setShowMoodAfter(false);
        const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        onComplete(score, duration, moodBefore, mood);
    };

    const moodList = [
        { emoji: "😢", label: "Loše", value: "very_upset" },
        { emoji: "😕", label: "Nije sjajno", value: "upset" },
        { emoji: "😐", label: "Okej", value: "neutral" },
        { emoji: "😊", label: "Dobro", value: "happy" },
        { emoji: "😄", label: "Super", value: "very_happy" },
    ];

    // ─── MOOD BEFORE ──────────────────────────────────────────────────────────────
    if (!isMonitor && showMoodBefore) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl animate-in fade-in duration-500">
                <div className="text-center mb-10 md:mb-16">
                    <span className="px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 md:mb-4 inline-block">Mali upitnik</span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Kako se osećaš sada? ✨</h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-8 w-full max-w-5xl px-4">
                    {moodList.map(mood => (
                        <button
                            key={mood.value}
                            onClick={() => handleMoodBeforeSelect(mood.value)}
                            className="group relative flex flex-col items-center bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl border border-slate-100"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 rounded-[1.5rem] md:rounded-[2.5rem] transition-opacity`}></div>
                            <span className="text-5xl md:text-7xl mb-2 md:mb-4 transform group-hover:scale-110 transition-transform duration-300 select-none">{mood.emoji}</span>
                            <span className="text-sm md:text-lg font-black text-slate-700">{mood.label}</span>
                        </button>
                    ))}
                </div>

                {isConnected && (
                    <div className="mt-10 md:mt-16 flex items-center gap-3 px-4 py-2 md:px-6 md:py-3 bg-white/50 backdrop-blur-sm rounded-2xl border border-green-100 shadow-sm">
                        <span className="relative flex h-2 w-2 md:h-3 md:w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-full w-full bg-green-500"></span>
                        </span>
                        <span className="text-[10px] md:text-sm font-bold text-green-700 tracking-wide uppercase">Spremni za praćenje</span>
                    </div>
                )}
            </div>
        );
    }

    if (!isMonitor && showMoodAfter) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] w-full bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl animate-in fade-in duration-500">
                <div className="text-center mb-10 md:mb-16">
                    <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 md:mb-4 inline-block">Igra je završena!</span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-3 md:mb-4">Bravo! Kako si sada? 🌟</h2>
                    <p className="text-lg md:text-xl text-slate-500 font-medium tracking-wide">
                        Lepo si prepoznao/la šta treba reći! Rezultat: <span className="font-bold text-emerald-600 underline decoration-2 underline-offset-4">{score} poena</span>.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-8 w-full max-w-5xl px-4">
                    {moodList.map(mood => (
                        <button
                            key={mood.value}
                            onClick={() => handleMoodAfterSelect(mood.value)}
                            className="group relative flex flex-col items-center bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl border border-slate-100"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 rounded-[1.5rem] md:rounded-[2.5rem] transition-opacity`}></div>
                            <span className="text-5xl md:text-7xl mb-2 md:mb-4 transform group-hover:scale-110 transition-transform duration-300 select-none">{mood.emoji}</span>
                            <span className="text-sm md:text-lg font-black text-slate-700">{mood.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // ─── START SCREEN ─────────────────────────────────────────────────────────────
    if (!isPlaying && !completed) {
        return (
            <div className="relative min-h-[500px] w-full flex items-center justify-center overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 shadow-lg">
                <div className="absolute top-8 left-10 text-5xl opacity-10 animate-pulse">💬</div>
                <div className="absolute top-6 right-12 text-6xl opacity-10 animate-bounce">🗣️</div>
                <div className="absolute bottom-10 left-16 text-5xl opacity-10 animate-bounce">🤝</div>
                <div className="absolute bottom-8 right-10 text-4xl opacity-10 animate-pulse">❤️</div>
                <div className="absolute top-0 right-0 w-80 h-80 bg-violet-200/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl -ml-32 -mb-32"></div>

                <div className="relative z-10 w-full max-w-lg mx-auto p-6 flex flex-col items-center text-center">
                    <div className="mb-6">
                        <span className="px-6 py-2.5 rounded-full bg-white/80 backdrop-blur border border-violet-100 text-violet-600 text-sm font-black uppercase tracking-widest shadow-sm">
                            Nivo {level} • {totalSituations} situacija
                        </span>
                    </div>

                    <div className="mb-8 relative">
                        <div className="absolute inset-0 bg-violet-400 rounded-full blur-2xl opacity-20"></div>
                        <div className="relative w-36 h-36 bg-gradient-to-b from-white to-violet-50 rounded-[2.5rem] shadow-xl border-4 border-white flex items-center justify-center">
                            <span className="text-7xl">💬</span>
                        </div>
                        <div className="absolute -top-3 -right-3 text-2xl animate-bounce">🤝</div>
                        <div className="absolute -bottom-3 -left-3 text-2xl animate-bounce delay-200">❤️</div>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-3 tracking-tight">Šta treba da kažeš?</h2>
                    <p className="text-slate-500 text-base md:text-lg font-medium leading-relaxed mb-4 max-w-sm mx-auto">
                        Pročitaj situaciju i izaberi <span className="text-violet-600 font-bold">tačan odgovor</span> klikom na dugme.
                    </p>

                    {/* Legenda */}
                    <div className="grid grid-cols-2 gap-3 mb-10 w-full max-w-sm">
                        <div className="bg-white rounded-2xl p-3 shadow text-center border border-green-100">
                            <div className="text-2xl mb-1">✅</div>
                            <div className="text-xs font-bold text-green-700">Tačan odgovor</div>
                        </div>
                        <div className="bg-white rounded-2xl p-3 shadow text-center border border-blue-100">
                            <div className="text-2xl mb-1">💡</div>
                            <div className="text-xs font-bold text-blue-700">Pomoć ako zaglaviš</div>
                        </div>
                    </div>

                    <button onClick={() => setShowMoodBefore(true)}
                        className="w-full max-w-sm group bg-violet-600 hover:bg-violet-700 text-white rounded-2xl p-1.5 transition-all duration-300 shadow-xl shadow-violet-200 hover:-translate-y-1">
                        <div className="bg-white/10 border border-white/20 rounded-xl px-8 py-4 flex items-center justify-center gap-4">
                            <span className="text-xl font-bold">ZAPOČNI IGRU</span>
                            <div className="w-10 h-10 bg-white text-violet-600 rounded-xl flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">▶</div>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    // ─── END SCREEN ───────────────────────────────────────────────────────────────
    if (completed && !showMoodAfter) {
        const pct = Math.round((correctCount / totalSituations) * 100);
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-[3rem] p-12 shadow-2xl animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-8 max-w-2xl mx-auto">
                    <div className="relative inline-block mb-8">
                        <div className="absolute inset-0 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                        <div className="relative text-9xl animate-bounce drop-shadow-2xl">🏆</div>
                    </div>

                    <div>
                        <span className="px-6 py-2 rounded-full bg-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-widest mb-4 inline-block">Sjajan uspeh!</span>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tight">Fantastično si uradio/la!</h2>
                    </div>

                    <p className="text-2xl font-bold text-slate-600 italic leading-relaxed">
                        Tvoj rezultat je <span className="text-indigo-600 underline underline-offset-8 decoration-4">{score} poena</span>
                    </p>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end mb-2 px-2">
                            <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Tačnost</span>
                            <span className="text-2xl font-black text-indigo-600">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-8 p-1.5 shadow-inner ring-1 ring-slate-200">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1500 shadow-lg relative overflow-hidden"
                                style={{ width: `${pct}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-6 pt-10">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className={`text-6xl transition-all duration-700 delay-${i * 200} ${i * 33 < pct ? 'scale-125 opacity-100 rotate-12' : 'scale-50 opacity-20'}`}
                            >
                                ⭐
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ─── GAME SCREEN ──────────────────────────────────────────────────────────────
    if (!currentSituation) return null; // Guard clause for when currentSituation is not available
    return (
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl md:rounded-[3rem] p-4 pt-6 md:p-10 shadow-2xl border border-white/50 w-full max-w-6xl mx-auto flex-1 flex flex-col animate-in fade-in duration-700 relative">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>

            {/* Compact Header Area */}
            <div className="flex justify-between items-center mb-6 md:mb-10 bg-gradient-to-r from-violet-50/50 to-white rounded-2xl md:rounded-[2.5rem] px-4 py-3 md:px-10 md:py-6 shadow-xl relative overflow-hidden ring-1 ring-violet-100/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>

                <div className="flex items-center gap-3 md:gap-8 relative z-10">
                    <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl bg-white shadow-md flex items-center justify-center text-xl md:text-3xl ring-4 ring-violet-50 border border-violet-100 transform -rotate-3 transition-transform">
                        🗣️
                    </div>
                    <div>
                        <h3 className="text-lg md:text-2xl font-black text-slate-800 tracking-wide uppercase leading-tight">Bon-Ton</h3>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6 relative z-10">
                    <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl md:rounded-3xl px-4 py-2 md:px-8 md:py-3 border border-violet-100/50 text-center min-w-[80px] md:min-w-[120px]">
                        <span className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Napredak</span>
                        <span className="text-xl md:text-3xl font-black text-violet-500">{currentIndex + 1}<span className="text-slate-400 text-sm md:text-xl mx-1">/</span>{totalSituations}</span>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl md:rounded-3xl px-4 py-2 md:px-8 md:py-3 border border-violet-100/50 text-center min-w-[80px] md:min-w-[120px]">
                        <span className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Poena</span>
                        <span className="text-xl md:text-3xl font-black text-emerald-500">{score}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-6 md:gap-10 min-h-0 relative z-10">
                {/* Situation Display */}
                <div
                    className="relative group bg-white rounded-2xl md:rounded-[3.5rem] p-6 md:p-12 shadow-xl border-2 transition-all duration-700"
                    style={{ borderColor: `${currentSituation.color}20` }}
                >
                    <div
                        className="absolute inset-x-0 bottom-0 h-1.5 md:h-2 rounded-b-2xl md:rounded-b-[3.5rem]"
                        style={{ backgroundColor: currentSituation.color }}
                    ></div>

                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-14">
                        <div
                            className="relative w-32 h-32 md:w-56 md:h-56 rounded-2xl md:rounded-[3rem] shadow-lg flex items-center justify-center text-6xl md:text-9xl transform transition-transform duration-700 shrink-0 ring-4 md:ring-8 ring-slate-50"
                            style={{ backgroundColor: currentSituation.bgColor }}
                        >
                            {currentSituation.scene}
                        </div>

                        <div className="flex-1 text-center md:text-left space-y-4 md:space-y-6">
                            <div className="space-y-1">
                                <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Opis situacije</span>
                                <h4 className="text-xl md:text-4xl font-black text-slate-800 leading-tight">
                                    {currentSituation.description}
                                </h4>
                            </div>

                            <div
                                className="inline-flex items-center gap-2 md:gap-4 px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] text-sm md:text-xl font-black shadow-inner ring-1 ring-slate-100"
                                style={{ backgroundColor: `${currentSituation.color}08`, color: currentSituation.color }}
                            >
                                <span className="text-xl">💬</span>
                                {currentSituation.question}
                            </div>
                        </div>
                    </div>

                    {hintVisible && (
                        <div className="mt-4 md:mt-8 p-4 md:p-6 rounded-2xl md:rounded-3xl bg-slate-900 text-white animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                            <p className="relative z-10 flex items-start gap-4 text-sm md:text-lg font-medium">
                                <span className="text-xl">💡</span>
                                {currentSituation.hint}
                            </p>
                        </div>
                    )}
                </div>

                {/* Answers Grid */}
                <div className="space-y-3 md:space-y-4 max-w-5xl mx-auto w-full">
                    {currentSituation.answers.map((answer, i) => {
                        const isSelected = selectedAnswer === i;
                        const state = isSelected
                            ? (answerState === "correct" ? "correct" : (answerState === "wrong" ? "wrong" : "idle"))
                            : "idle";

                        return (
                            <button
                                key={i}
                                onClick={() => handleAnswerClick(i)}
                                disabled={answerState === "correct" || advancing}
                                className={`group w-full relative p-4 md:p-8 rounded-xl md:rounded-[2rem] text-left transition-all duration-300 border shadow-sm transform hover:-translate-y-1 active:scale-[0.98] ${state === "correct"
                                    ? "bg-emerald-50 border-emerald-400 shadow-xl ring-4 ring-emerald-50"
                                    : state === "wrong"
                                        ? "bg-rose-50 border-rose-200 opacity-60"
                                        : advancing
                                            ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                                            : "bg-white border-slate-100 hover:border-violet-200 hover:shadow-xl"
                                    }`}
                            >
                                <div className="flex items-center gap-4 md:gap-8">
                                    <div
                                        className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-2xl flex items-center justify-center font-black text-lg md:text-xl transition-colors duration-300 flex-shrink-0 ${state === "correct"
                                            ? "bg-emerald-500 text-white"
                                            : state === "wrong"
                                                ? "bg-rose-500 text-white"
                                                : "bg-slate-100 text-slate-400 group-hover:bg-violet-100 group-hover:text-violet-600"
                                            }`}
                                    >
                                        {String.fromCharCode(65 + i)}
                                    </div>
                                    <span className={`text-sm md:text-xl font-bold transition-colors ${state === "correct" ? "text-emerald-900" :
                                        state === "wrong" ? "text-rose-900" : "text-slate-700 font-bold"
                                        }`}>
                                        {answer}
                                    </span>

                                    {state === "correct" && (
                                        <div className="ml-auto w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-bounce">
                                            ✓
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-6 flex justify-between items-center text-[10px] md:text-sm font-black text-slate-400 uppercase tracking-widest opacity-60 px-4 pb-4">
                <p>💡 Misli o osećanjima drugih.</p>
                {!hintVisible && !advancing && wrongAttempts > 0 && (
                    <button
                        onClick={() => setHintVisible(true)}
                        className="text-violet-500 hover:text-violet-600 underline underline-offset-4 decoration-2"
                    >
                        Treba ti pomoć?
                    </button>
                )}
            </div>
        </div>
    );
}
