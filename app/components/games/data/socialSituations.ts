// Sadržaj igre „Šta reći?” (socijalna komunikacija).
//
// Igra ne ispituje „lepo i ružno ponašanje”. Ona vežba korisne rečenice (skripte):
//  • svaka situacija prvo pokaže MODEL — drugo dete u istoj situaciji izgovara rečenicu;
//  • dete zatim bira šta ONO može da kaže ili uradi. Obično pomažu DVA izbora
//    (rečenica i njena zamena: druga rečenica, pokret rukom, pokazivanje, poziv odrasloj osobi);
//  • ostali izbori „manje pomažu”: uz njih stoji mirno objašnjenje šta bi se verovatno desilo.
//
// Pravila pisanja:
//  • Kratke, doslovne rečenice. Jedna informacija po rečenici. Bez ironije i prenesenog značenja.
//  • Zastupanje sebe („Treba mi pomoć.”, „Preglasno je.”, „Ne želim.”) važno je koliko i učtivost.
//  • Ono što je tipično za neurodivergentnu decu nikad nije izbor koji „manje pomaže”:
//    pokrivanje ušiju, pogled u stranu, želja za mirom, pokret umesto reči.
//    Manje pomažu samo: trpljenje u tišini, vika, udaranje, guranje, uzimanje bez pitanja.
//  • Zagrljaj, poljubac i gledanje u oči se nikad ne traže.
//  • Oblik koji zavisi od pola deteta piše se kao par {muški|ženski} — vidi `genderText()` u kit/utils.
//
// Raspored: 15 nivoa po 5 situacija. Situacije 1–15 se ponavljaju na tri težine
// (ID-jevi 1–45: nivoi 1–5 nude 2 izbora, 6–10 nude 3, 11–15 nude 4), a svaki nivo
// dobija i jednu situaciju zastupanja sebe (ID-jevi 46–60) i jednu novu situaciju
// (ID-jevi 61–75) koje se ne ponavljaju, pa nijedan nivo nije isti kao drugi.

export type SituationKind = "polite" | "advocacy";

export interface SocialOption {
    emoji: string;
    /** "say" = rečenica koju dete može da izgovori (prikazuje se pod navodnicima), "do" = radnja */
    type: "say" | "do";
    text: string;
    /** Uz izbor koji pomaže: zašto pomaže. Uz ostale: šta bi se verovatno desilo — mirno, bez osude. */
    note: string;
}

export interface SocialSituation {
    id: number;
    /** Učtivost ili zastupanje sebe (vidi se u dnevniku roditelja) */
    kind: SituationKind;
    /** Emodži scene */
    scene: string;
    /** Model: drugo dete u istoj situaciji izgovara rečenicu. Čita se pre nego što se pojave izbori. */
    model: string;
    /** Ista situacija iz ugla deteta */
    text: string;
    /** Pitanje: šta možeš da kažeš ili uradiš */
    ask: string;
    /** Rečenica za ponavljanje, bez navodnika */
    script: string;
    /** Ponuđeni izbori; redosled prikaza se meša u igri */
    options: SocialOption[];
    /** Indeksi SVIH izbora koji pomažu */
    acceptable: number[];
}

interface Draft extends Omit<SocialSituation, "options" | "acceptable"> {
    /** Izbori koji pomažu: prvi je rečenica za ponavljanje, drugi je njena zamena (primer u modelu je treća, drugačija rečenica) */
    good: SocialOption[];
    /** Izbori koji manje pomažu */
    other: SocialOption[];
}

const ASK_SAY = "Šta možeš da kažeš?";
const ASK_SAY_OR_DO = "Šta možeš da kažeš ili uradiš?";

const say = (emoji: string, text: string, note: string): SocialOption => ({ emoji, type: "say", text, note });
const act = (emoji: string, text: string, note: string): SocialOption => ({ emoji, type: "do", text, note });

const GROUP_COUNT = 5;
const TIER_COUNT = 3;
const MAX_LEVEL = GROUP_COUNT * TIER_COUNT;

// ── Situacije koje se ponavljaju na tri težine (ID-jevi 1–15, +15 po težini) ───

const GROUPS: Draft[][] = [
    // Grupa 1 — hvala, pozdrav, izvini
    [
        {
            id: 1,
            kind: "polite",
            scene: "🎁",
            model: "Lejla dobija poklon. Lejla kaže: „Hvala ti mnogo!”",
            text: "Ti dobijaš poklon.",
            ask: ASK_SAY,
            script: "Hvala!",
            good: [
                say("🙏", "Hvala!", "„Hvala” je lep način da pokažemo da nam je drago."),
                say("😊", "Sviđa mi se.", "Kad kažemo „Sviđa mi se”, osoba zna da nam je drago."),
            ],
            other: [
                act("🗑️", "Bacim poklon na pod.", "Ako bacimo poklon, on može da se polomi. Osoba koja ga je dala može da se rastuži."),
                say("➕", "Daj još!", "Ako odmah tražimo još, osoba može da se zbuni. Prvo kažemo „Hvala”."),
            ],
        },
        {
            id: 2,
            kind: "polite",
            scene: "👩‍🏫",
            model: "Amar ujutru sreće učiteljicu. Amar kaže: „Dobro jutro!”",
            text: "Ti srećeš učiteljicu.",
            ask: ASK_SAY_OR_DO,
            script: "Dobar dan!",
            good: [
                say("🙂", "Dobar dan!", "„Dobar dan” kažemo kad sretnemo odraslu osobu. To je pozdrav."),
                act("👋", "Mahnem rukom.", "I kad mahneš, to je pozdrav. Učiteljica vidi da je pozdravljaš."),
            ],
            other: [
                say("😠", "Šta hoćeš?", "Te reči mogu da zvuče ljuto. Učiteljica može da se zbuni."),
                act("📣", "Viknem iz sveg glasa: „Ej!”", "Vika može da uplaši. Pozdrav kažemo običnim glasom."),
            ],
        },
        {
            id: 3,
            kind: "polite",
            scene: "😢",
            model: "Amina je slučajno gurnula druga. Amina kaže: „Oprosti, nisam htela.”",
            text: "Ti slučajno gurneš druga.",
            ask: ASK_SAY,
            script: "Izvini!",
            good: [
                say("🙏", "Izvini!", "„Izvini” kaže drugu da nije bilo namerno."),
                say("❓", "Jesi li dobro?", "Kad pitamo „Jesi li dobro?”, drug zna da nam je stalo."),
            ],
            other: [
                say("😤", "Skloni se!", "Drug ne zna da je bilo slučajno. Posle tih reči može da se rastuži."),
                say("👉", "Ti si kriv!", "Drug nije kriv. Posle tih reči može da se naljuti."),
            ],
        },
    ],
    // Grupa 2 — traženje, zahvaljivanje, odlazak
    [
        {
            id: 4,
            kind: "advocacy",
            scene: "💧",
            model: "Emir je žedan. Emir kaže: „Mogu li da dobijem vode, molim te?”",
            text: "Ti želiš vodu.",
            ask: ASK_SAY_OR_DO,
            script: "Molim te, daj mi vodu.",
            good: [
                say("💧", "Molim te, daj mi vodu.", "Kad kažemo šta želimo, drugi mogu da nam pomognu. „Molim te” je lep način da tražimo."),
                act("👉", "Pokažem rukom na vodu.", "I kad pokažemo, drugi znaju šta želimo."),
            ],
            other: [
                act("🤐", "Čekam i ništa ne kažem.", "Ako ne kažemo, niko ne zna da smo žedni."),
                act("🥤", "Uzmem tuđu čašu.", "To je čaša drugog deteta. Ono može da se rastuži."),
            ],
        },
        {
            id: 5,
            kind: "polite",
            scene: "🧸",
            model: "Drug daje Selmi igračku. Selma kaže: „Hvala, baš je lepa!”",
            text: "Drug ti daje igračku.",
            ask: ASK_SAY_OR_DO,
            script: "Hvala ti!",
            good: [
                say("🙏", "Hvala ti!", "Kad kažemo „Hvala”, drug zna da nam je drago."),
                act("👍", "Pokažem palac gore.", "Palac gore znači: „Hvala, sviđa mi se.”"),
            ],
            other: [
                act("💥", "Bacim igračku.", "Ako bacimo igračku, ona može da se polomi. Drug može da se rastuži."),
                act("✊", "Otmem mu i drugu igračku.", "Ako uzmemo igračku bez pitanja, drugo dete se može rastužiti."),
            ],
        },
        {
            id: 6,
            kind: "polite",
            scene: "🏠",
            model: "Merjem ide kući iz vrtića. Merjem kaže: „Ćao, vidimo se sutra!”",
            text: "Ti ideš kući iz vrtića.",
            ask: ASK_SAY_OR_DO,
            script: "Doviđenja!",
            good: [
                say("🙂", "Doviđenja!", "„Doviđenja” kažemo kad odlazimo. Tako drugi znaju da idemo."),
                act("👋", "Mahnem rukom.", "I kad mahneš, to je pozdrav. Vaspitačica vidi da odlaziš."),
            ],
            other: [
                act("🚪", "Zalupim vrata.", "Vrata glasno lupe. Taj zvuk može da uplaši drugu decu."),
                act("🚶", "Odem i nikome se ne javim.", "Ako se ne javimo, vaspitačica ne zna da smo otišli. Može da se zabrine."),
            ],
        },
    ],
    // Grupa 3 — briga o drugima, obrok, odgovor na pozdrav
    [
        {
            id: 7,
            kind: "polite",
            scene: "😭",
            model: "Harisov brat plače. Haris pita: „Šta se desilo? Da ti pomognem?”",
            text: "Tvoj brat plače.",
            ask: ASK_SAY_OR_DO,
            script: "Jesi li dobro?",
            good: [
                say("❓", "Jesi li dobro?", "Kad pitamo „Jesi li dobro?”, brat zna da nam je stalo."),
                act("👩", "Pozovem mamu.", "Mama može da pomogne bratu. Pozvati odraslu osobu je dobra ideja."),
            ],
            other: [
                say("😒", "Ne plači, dosadan si.", "Posle tih reči brat može još više da se rastuži."),
                act("🧸", "Uzmem mu igračku.", "Ako uzmemo igračku bez pitanja, brat se može još više rastužiti."),
            ],
        },
        {
            id: 8,
            kind: "polite",
            scene: "🍽️",
            model: "Mama daje Ajli ručak. Ajla kaže: „Hvala, mama, baš je ukusno!”",
            text: "Mama ti daje ručak.",
            ask: ASK_SAY,
            script: "Hvala na ručku!",
            good: [
                say("🙏", "Hvala na ručku!", "Mama je kuvala. „Hvala” joj kaže da to vidimo."),
                say("🙂", "Ovo ne volim. Mogu li nešto drugo?", "Smeš da kažeš šta ne voliš. Kad to kažeš mirno, mama te razume."),
            ],
            other: [
                act("💥", "Bacim hranu na pod.", "Hrana na podu se isprlja. Niko ne može da je pojede."),
                say("🤢", "Fuj!", "Posle te reči mama može da se rastuži. Možeš mirno da kažeš: „Ovo ne volim.”"),
            ],
        },
        {
            id: 9,
            kind: "polite",
            scene: "👋",
            model: "Drug maše Tariku. Tarik mu mahne i kaže: „Ćao, drugar!”",
            text: "Drug ti kaže: „Zdravo!”",
            ask: ASK_SAY_OR_DO,
            script: "Zdravo!",
            good: [
                say("🙂", "Zdravo!", "Kad nas neko pozdravi, možemo i mi njega da pozdravimo."),
                act("👋", "Mahnem rukom.", "I kad mahneš, to je pozdrav. Možemo da pozdravimo i kad ne gledamo u oči."),
            ],
            other: [
                say("😠", "Beži odavde!", "Drug je hteo da te pozdravi. Posle tih reči može da se rastuži."),
                act("💢", "Gurnem druga.", "Kad guramo, to boli. Drug može da padne."),
            ],
        },
    ],
    // Grupa 4 — uključivanje u igru, čuvanje svojih stvari, pomoć drugome
    [
        {
            id: 10,
            kind: "advocacy",
            scene: "⚽",
            model: "Deca se igraju loptom. Nejla pita: „Da li smem da igram sa vama?”",
            text: "Deca se igraju loptom. Ti želiš da se igraš sa njima.",
            ask: ASK_SAY,
            script: "Mogu li i ja da se igram?",
            good: [
                say("🙋", "Mogu li i ja da se igram?", "Kad pitamo, deca znaju da želimo da se igramo."),
                say("❓", "Šta igrate? Hoću i ja.", "Kad pitamo šta igraju, deca mogu da nam objasne igru."),
            ],
            other: [
                act("✊", "Uzmem im loptu.", "Ako uzmemo loptu bez pitanja, igra staje. Deca se mogu naljutiti."),
                act("📣", "Vičem na decu.", "Vika može da uplaši decu. Ona tada ne znaju šta želiš."),
            ],
        },
        {
            id: 11,
            kind: "advocacy",
            scene: "✏️",
            model: "Dečak je uzeo Adnanovu olovku. Adnan kaže: „To je moja olovka. Daj mi je, molim te.”",
            text: "Neko uzme tvoju olovku.",
            ask: ASK_SAY_OR_DO,
            script: "To je moje. Vrati mi, molim te.",
            good: [
                say("✋", "To je moje. Vrati mi, molim te.", "Kad mirno kažemo šta je naše, drugo dete zna šta želimo."),
                act("🙋", "Kažem učiteljici.", "Učiteljica može da pomogne. Tražiti pomoć je u redu."),
            ],
            other: [
                act("👊", "Udarim ga.", "Udarac boli. Posle udarca su oba deteta tužna."),
                act("🤐", "Ćutim i ostanem bez olovke.", "Ako ne kažemo, dete ne zna da nam olovka treba."),
            ],
        },
        {
            id: 12,
            kind: "polite",
            scene: "🤕",
            model: "Ilmin prijatelj je pao. Ilma pita: „Jesi li dobro? Da ti pomognem da ustaneš?”",
            text: "Tvoj prijatelj je pao.",
            ask: ASK_SAY_OR_DO,
            script: "Treba li ti pomoć?",
            good: [
                say("🤝", "Treba li ti pomoć?", "Kad ponudimo pomoć, prijatelj zna da nije sam."),
                act("🙋", "Pozovem odraslu osobu.", "Odrasla osoba zna kako da pomogne kad nekoga boli."),
            ],
            other: [
                say("😏", "Baš si smotan.", "Prijatelja već boli. Posle tih reči može i da se rastuži."),
                say("🙄", "Ustani, nije ti ništa!", "Mi ne znamo koliko ga boli. Prijatelj može da se rastuži."),
            ],
        },
    ],
    // Grupa 5 — kupovina, čestitanje, prolazak
    [
        {
            id: 13,
            kind: "polite",
            scene: "🍦",
            model: "Kenan kupuje sladoled. Kenan kaže: „Molim vas, jedan sladoled od jagode.”",
            text: "Ti kupuješ sladoled.",
            ask: ASK_SAY_OR_DO,
            script: "Jedan sladoled, molim vas.",
            good: [
                say("🍦", "Jedan sladoled, molim vas.", "Prodavac sada zna šta želiš. „Molim vas” kažemo odraslima kad nešto tražimo."),
                act("👉", "Pokažem prstom sladoled koji želim.", "I kad pokažemo, drugi znaju šta želimo."),
            ],
            other: [
                act("💢", "Guram se preko reda.", "Kad se guramo, neko može da padne. Deca koja čekaju mogu da se naljute."),
                act("📣", "Vičem: „Hoću odmah!”", "Vika može da uplaši ljude u redu. Sladoled ne stiže brže."),
            ],
        },
        {
            id: 14,
            kind: "polite",
            scene: "🎂",
            model: "Lamijin drug slavi rođendan. Lamija kaže: „Sve najbolje za rođendan!”",
            text: "Tvoj drug slavi rođendan.",
            ask: ASK_SAY_OR_DO,
            script: "Srećan rođendan!",
            good: [
                say("🎈", "Srećan rođendan!", "„Srećan rođendan” kažemo detetu koje slavi. Tako zna da mislimo na njega."),
                act("🎁", "Dam mu čestitku ili poklon.", "Čestitka i poklon takođe kažu: „Srećan rođendan.”"),
            ],
            other: [
                say("🤨", "Gde je moj poklon?", "Danas je drugov rođendan. Danas on dobija poklone. Ti dobijaš poklone na svoj rođendan."),
                act("🕯️", "Dunem u njegove svećice.", "Svećice duva dete koje slavi. Drug može da se rastuži."),
            ],
        },
        {
            id: 15,
            kind: "polite",
            scene: "🚶",
            model: "Ljudi stoje na vratima. Faris kaže: „Izvinite, da prođem, molim vas?”",
            text: "Ljudi stoje na vratima. Ti želiš da prođeš.",
            ask: ASK_SAY_OR_DO,
            script: "Izvinite, mogu li da prođem?",
            good: [
                say("🙂", "Izvinite, mogu li da prođem?", "Kad pitamo, ljudi znaju da želimo da prođemo. Tada se pomere."),
                act("⏳", "Sačekam da se ljudi pomere.", "U redu je da sačekamo. Kad ima mesta, lako se prođe."),
            ],
            other: [
                act("💢", "Guram ljude.", "Kad guramo, to boli. Neko može da padne."),
                say("😠", "Sklanjaj se!", "Te reči mogu da zvuče ljuto. Ljudi mogu da se uplaše."),
            ],
        },
    ],
];

const REPEATED_PER_TIER = GROUPS.reduce((sum, group) => sum + group.length, 0);

// ── Zastupanje sebe: po jedna situacija za svaki nivo (ID-jevi 46–60) ──────────
// Ne ponavljaju se, pa su izbori napisani tačno za svoj nivo: na lakim nivoima
// dva izbora koja pomažu i jedan koji manje pomaže, dalje po dva i dva.

const ADVOCACY: Draft[] = [
    // Laki nivoi (1–5): vrtić, park, kuća
    {
        id: 46,
        kind: "advocacy",
        scene: "🧩",
        model: "Slagalica je teška. Merjem kaže: „Ne ide mi. Možeš li da mi pomogneš?”",
        text: "U vrtiću slažeš slagalicu. Slagalica je teška.",
        ask: ASK_SAY_OR_DO,
        script: "Treba mi pomoć.",
        good: [
            say("🙋", "Treba mi pomoć.", "Kad kažemo „Treba mi pomoć”, vaspitačica zna da treba da priđe."),
            act("🤲", "Odnesem slagalicu vaspitačici.", "I tako pokazujemo da nam treba pomoć."),
        ],
        other: [act("💥", "Bacim slagalicu.", "Delovi se raspu po podu. Slagalica i dalje nije složena.")],
    },
    {
        id: 47,
        kind: "advocacy",
        scene: "🔊",
        model: "Muzika je glasna. Amar kaže: „Muzika je preglasna za mene.”",
        text: "U vrtiću svira muzika. Tebi je preglasno.",
        ask: ASK_SAY_OR_DO,
        script: "Preglasno je.",
        good: [
            say("🔊", "Preglasno je.", "Kad kažemo „Preglasno je”, odrasli mogu da utišaju muziku."),
            act("🙉", "Pokrijem uši rukama.", "Kad pokrijemo uši, lakše je kad je preglasno. To je u redu."),
        ],
        other: [act("🤐", "Trpim buku i ništa ne kažem.", "Ako ne kažemo, niko ne zna da nam je preglasno. Buka i dalje smeta.")],
    },
    {
        id: 48,
        kind: "advocacy",
        scene: "✋",
        model: "Dete vuče Aminu za majicu. Amina kaže: „Pusti me, molim te. Ne volim to.”",
        text: "U parku te dete vuče za majicu. To ti se ne sviđa.",
        ask: ASK_SAY_OR_DO,
        script: "Stani, to mi se ne sviđa.",
        good: [
            say("✋", "Stani, to mi se ne sviđa.", "Kad kažemo „Stani”, dete zna da nam to smeta."),
            act("🖐️", "Pokažem rukom: stop.", "Ruka podignuta ispred sebe znači: „Stani.”"),
        ],
        other: [act("👊", "Udarim dete.", "Udarac boli. Posle udarca su oba deteta tužna.")],
    },
    {
        id: 49,
        kind: "advocacy",
        scene: "🥣",
        model: "Emir je još gladan. Emir kaže: „Mogu li još malo, molim te?”",
        text: "Jedeš užinu kod kuće. Tanjir je prazan. Još si {gladan|gladna}.",
        ask: ASK_SAY_OR_DO,
        script: "Hoću još.",
        good: [
            say("🥣", "Hoću još.", "Kad kažemo „Hoću još”, mama zna da smo još gladni."),
            act("🍽️", "Pokažem prazan tanjir.", "Prazan tanjir pokazuje da želimo još."),
        ],
        other: [act("🤐", "Ništa ne kažem i ostanem {gladan|gladna}.", "Ako ne kažemo, niko ne zna da želimo još.")],
    },
    {
        id: 50,
        kind: "advocacy",
        scene: "🤗",
        model: "Tetka želi da zagrli Selmu. Selma kaže: „Ne bih da se grlim. Mogu da ti mahnem.”",
        text: "Tetka želi da te zagrli. Ti ne želiš zagrljaj.",
        ask: ASK_SAY_OR_DO,
        script: "Ne želim zagrljaj. Mogu da mahnem.",
        good: [
            say("👋", "Ne želim zagrljaj. Mogu da mahnem.", "Tvoje telo je tvoje. Smeš da kažeš da ne želiš zagrljaj. I kad mahneš, to je pozdrav."),
            act("🖐️", "Ponudim: „Baci pet!”", "„Baci pet” je takođe pozdrav. Ti biraš kako pozdravljaš."),
        ],
        other: [act("😣", "Trpim zagrljaj, iako ga ne želim.", "Ne moraš da trpiš zagrljaj. Smeš da kažeš: „Ne želim zagrljaj.”")],
    },

    // Srednji nivoi (6–10): igra, škola, lekar, park
    {
        id: 51,
        kind: "advocacy",
        scene: "🃏",
        model: "Drug brzo objašnjava igru. Haris kaže: „Nisam razumeo. Možeš li polako?”",
        text: "Drug ti objašnjava novu igru sa kartama. Priča brzo. Ti ne razumeš.",
        ask: ASK_SAY_OR_DO,
        script: "Ne razumem. Reci ponovo.",
        good: [
            say("❓", "Ne razumem. Reci ponovo.", "Kad kažemo „Ne razumem”, drug zna da treba da ponovi."),
            say("👀", "Možeš li da mi pokažeš?", "Nekad je lakše kad vidimo. Smeš da tražiš da ti neko pokaže."),
        ],
        other: [
            act("🙂", "Klimam glavom, iako ne razumem.", "Kad klimamo glavom, drug misli da razumemo. Tada ne znamo kako se igra."),
            act("💥", "Bacim karte na pod.", "Karte se raspu i igra staje. Pravila i dalje ne znamo."),
        ],
    },
    {
        id: 52,
        kind: "advocacy",
        scene: "📝",
        model: "Ajla dugo piše. Ajla kaže: „Umorna sam. Mogu li malo da odmorim?”",
        text: "U školi dugo pišeš. Ruka te boli. {Umoran|Umorna} si.",
        ask: ASK_SAY_OR_DO,
        script: "Treba mi pauza.",
        good: [
            say("⏸️", "Treba mi pauza.", "Kad kažemo „Treba mi pauza”, učiteljica zna da nam treba odmor."),
            act("🟦", "Pokažem karticu za pauzu.", "Kartica za pauzu govori isto: „Treba mi pauza.”"),
        ],
        other: [
            act("😣", "Pišem dalje, iako ne mogu više.", "Kad smo previše umorni, teško je da pišemo. Posle pauze ide lakše."),
            act("📄", "Pocepam list iz sveske.", "List je pocepan, a ruka i dalje boli."),
        ],
    },
    {
        id: 53,
        kind: "advocacy",
        scene: "🩺",
        model: "Doktor pregleda Tarika. Tarik pokaže stomak i kaže: „Tu me boli.”",
        text: "Kod doktora si. Doktor ti pregleda stomak. Na jednom mestu te boli.",
        ask: ASK_SAY_OR_DO,
        script: "Boli me ovde.",
        good: [
            say("🩹", "Boli me ovde.", "Kad kažemo gde boli, doktor zna kako da pomogne."),
            act("👉", "Pokažem rukom gde me boli.", "I kad pokažemo, doktor zna gde boli."),
        ],
        other: [
            act("🤐", "Trpim i ništa ne kažem.", "Ako ne kažemo, doktor ne zna gde boli. Tada mu je teže da pomogne."),
            act("💢", "Odgurnem doktorovu ruku.", "Doktor tada ne zna šta se desilo. Kad kažemo „Boli me”, on zastane."),
        ],
    },
    {
        id: 54,
        kind: "advocacy",
        scene: "🎢",
        model: "Dete staje ispred Nejle u redu. Nejla kaže: „Ja sam bila pre tebe. Stani iza mene, molim te.”",
        text: "U parku čekaš red za tobogan. Jedno dete staje ispred tebe.",
        ask: ASK_SAY_OR_DO,
        script: "Čekam svoj red. Ti si posle mene.",
        good: [
            say("☝️", "Čekam svoj red. Ti si posle mene.", "Kad mirno kažemo čiji je red, dete zna gde da stane."),
            act("🙋", "Kažem odrasloj osobi.", "Odrasla osoba može da pomogne oko reda. Tražiti pomoć je u redu."),
        ],
        other: [
            act("💢", "Gurnem dete.", "Na toboganu je opasno da se guramo. Neko može da padne."),
            act("🤐", "Ništa ne kažem i pustim sve ispred sebe.", "Tada dugo čekaš. I ti imaš svoj red."),
        ],
    },
    {
        id: 55,
        kind: "advocacy",
        scene: "🙅",
        model: "Drug kaže: „Hajde da se rvemo.” Adnan kaže: „Ne, hvala. Neću to.”",
        text: "Drug želi da se rvete. Ti to ne želiš.",
        ask: ASK_SAY,
        script: "Ne želim.",
        good: [
            say("🙅", "Ne želim.", "Smeš da kažeš „Ne želim”. Tako drug zna šta ti ne prija."),
            say("🎲", "Ne želim. Hajde da igramo nešto drugo.", "Kažeš šta ne želiš i predložiš novu igru. Tako možete zajedno da se igrate."),
        ],
        other: [
            act("😣", "Rvem se, iako ne želim.", "Ne moraš da radiš ono što ti ne prija. Smeš da kažeš: „Ne želim.”"),
            act("📣", "Vičem na druga.", "Vika može da uplaši druga. On tada ne zna šta želiš."),
        ],
    },

    // Teški nivoi (11–15): škola, odmor, igralište, zubar
    {
        id: 56,
        kind: "advocacy",
        scene: "🎶",
        model: "Na priredbi je muzika glasna. Ilma kaže: „Ovde mi je preglasno. Smem li malo napolje?”",
        text: "U školi je priredba. Muzika je vrlo glasna. Uši te bole.",
        ask: ASK_SAY_OR_DO,
        script: "Preglasno je. Mogu li da izađem?",
        good: [
            say("🔊", "Preglasno je. Mogu li da izađem?", "Kad kažeš da je preglasno, učiteljica ti pomaže da nađeš tiše mesto."),
            act("🎧", "Stavim slušalice koje stišavaju zvuk.", "Slušalice stišaju muziku. Sa njima je lakše ostati u sali."),
        ],
        other: [
            act("😣", "Ostanem i trpim, iako me uši bole.", "Ne moraš da trpiš buku. Smeš da kažeš: „Preglasno je.”"),
            act("🏃", "Istrčim iz sale i nikome ne kažem.", "Učiteljica tada ne zna gde si. Može da se zabrine. Kad joj kažeš, ona zna gde si."),
        ],
    },
    {
        id: 57,
        kind: "advocacy",
        scene: "🌿",
        model: "Kenanu treba mir. Kenan kaže: „Treba mi malo mira. Igramo se kasnije.”",
        text: "Na odmoru je gužva. Tebi treba mir. Drug te zove da se igrate.",
        ask: ASK_SAY,
        script: "Sada želim da budem {sam|sama}. Igraćemo se posle.",
        good: [
            say(
                "🌿",
                "Sada želim da budem {sam|sama}. Igraćemo se posle.",
                "Želeti mir je u redu. Kad to kažeš, drug zna da nisi {ljut|ljuta} na njega."
            ),
            say("⏳", "Ne sada. Treba mi malo mira.", "Kad kažeš da ti treba mir, drug zna da treba da sačeka."),
        ],
        other: [
            act("😣", "Igram se, iako mi treba mir.", "Kad nam treba mir, igra ne prija. Posle odmora je igra lepša."),
            act("📣", "Viknem: „Ostavi me!”", "Drug ne zna da ti treba mir. Posle vike može da se rastuži."),
        ],
    },
    {
        id: 58,
        kind: "advocacy",
        scene: "🗯️",
        model: "Dečak zove Lamiju ružnim nadimkom. Lamija kaže: „Nemoj tako da me zoveš.”",
        text: "Jedan dečak te zove ružnim nadimkom. To ti se ne sviđa.",
        ask: ASK_SAY_OR_DO,
        script: "Stani. To mi se ne sviđa.",
        good: [
            say("✋", "Stani. To mi se ne sviđa.", "Kad jasno kažeš „Stani”, dečak zna da ti to smeta."),
            act("🙋", "Odem i kažem učiteljici.", "Učiteljica može da pomogne. Reći odrasloj osobi je u redu."),
        ],
        other: [
            act("😅", "Smejem se, iako mi se to ne sviđa.", "Kad se smejemo, dečak misli da nam je zabavno. Tada može da nastavi."),
            act("👊", "Udarim ga.", "Udarac boli. Posle udarca su oba deteta tužna."),
        ],
    },
    {
        id: 59,
        kind: "advocacy",
        scene: "🎠",
        model: "Drug brzo vrti vrtešku. Faris kaže: „Previše je brzo. Uspori, molim te.”",
        text: "Drug te vrti na vrtešci. Vrti sve brže. Tebi je dosta.",
        ask: ASK_SAY,
        script: "Dosta mi je. Zaustavi, molim te.",
        good: [
            say("✋", "Dosta mi je. Zaustavi, molim te.", "Kad kažeš „Dosta mi je”, drug zna da treba da stane."),
            say("🛑", "Stani! Hoću da siđem.", "„Stani” je kratka i jasna reč. Drug je odmah razume."),
        ],
        other: [
            act("🤢", "Vrtim se dalje, iako mi je muka.", "Ne moraš da trpiš. Smeš da kažeš: „Dosta mi je.”"),
            act("🤸", "Skočim dok se vrteška vrti.", "Skok sa vrteške koja se vrti je opasan. Možeš da padneš."),
        ],
    },
    {
        id: 60,
        kind: "advocacy",
        scene: "🦷",
        model: "Emir je kod zubara. Emir podigne ruku. To znači: „Stanite malo, molim vas.”",
        text: "Kod zubara si. Usta su ti dugo otvorena. Vilica te boli.",
        ask: ASK_SAY_OR_DO,
        script: "Treba mi pauza.",
        good: [
            act("✋", "Podignem ruku. To je znak za pauzu.", "Podignuta ruka kaže zubaru: „Stanite.” Zubar tada zastane."),
            say("⏸️", "Treba mi pauza.", "Kad zubar izvadi alat iz usta, možeš da kažeš šta ti treba."),
        ],
        other: [
            act("😣", "Trpim i ništa ne pokažem.", "Ako ne pokažemo, zubar ne zna da nam treba pauza."),
            act("↩️", "Naglo okrenem glavu.", "Zubar drži alat u ustima. Nagli pokret može da zaboli."),
        ],
    },
];

// ── Nove situacije: po jedna za svaki nivo (ID-jevi 61–75) ─────────────────────
// Ne ponavljaju se, pa svaki nivo ima dve situacije koje dete još nije videlo. Napisane su sa
// dva i dva izbora; nivo bira koliko se nudi, isto kao kod situacija koje se ponavljaju
// (laki nivoi 1 + 1, srednji 1 + 2, teški 2 + 2). Situacije postaju teže iz nivoa u nivo.

const FRESH: Draft[] = [
    // Laki nivoi (1–5)
    {
        id: 61,
        kind: "polite",
        scene: "🍪",
        model: "Baka daje Amaru kolačić. Amar kaže: „Mmm, hvala ti, bako!”",
        text: "Baka ti daje kolačić.",
        ask: ASK_SAY_OR_DO,
        script: "Hvala!",
        good: [
            say("🙏", "Hvala!", "Kad kažemo „Hvala”, baka zna da nam je drago."),
            act("🙂", "Nasmešim se i klimnem glavom.", "Osmeh i klimanje glavom takođe kažu „Hvala”."),
        ],
        other: [
            act("✊", "Zgrabim celu kutiju kolačića.", "Baka je dala jedan kolačić. Ako uzmemo sve, drugi ostanu bez kolačića."),
            act("🗑️", "Bacim kolačić na pod.", "Kolačić na podu se isprlja. Niko ne može da ga pojede."),
        ],
    },
    {
        id: 62,
        kind: "advocacy",
        scene: "🚽",
        model: "Selmi treba toalet. Selma kaže vaspitačici: „Moram u toalet, molim vas.”",
        text: "U vrtiću si. Treba ti toalet.",
        ask: ASK_SAY_OR_DO,
        script: "Treba mi toalet.",
        good: [
            say("🚽", "Treba mi toalet.", "Kad kažemo šta nam treba, vaspitačica može odmah da pomogne."),
            act("🙋", "Podignem ruku i pokažem na vrata toaleta.", "I kad pokažemo, vaspitačica zna šta nam treba."),
        ],
        other: [
            act("🤐", "Čekam i ništa ne kažem.", "Ako ne kažemo, niko ne zna da nam treba toalet. Može biti kasno."),
            act("🏃", "Istrčim iz sobe i nikome ne kažem.", "Vaspitačica ne zna gde smo. Može da se zabrine."),
        ],
    },
    {
        id: 63,
        kind: "advocacy",
        scene: "🖍️",
        model: "Ilma crta. Drug ima plavu bojicu. Ilma pita: „Daš li mi plavu kad završiš?”",
        text: "Crtaš. Treba ti bojica. Bojicu ima drug.",
        ask: ASK_SAY,
        script: "Možeš li da mi daš bojicu?",
        good: [
            say("🖍️", "Možeš li da mi daš bojicu?", "Kad pitamo, drug zna šta nam treba. Može da nam da bojicu."),
            say("⏳", "Mogu li ja posle tebe?", "Kad pitamo za red, drug zna da čekamo bojicu."),
        ],
        other: [
            act("✊", "Otmem mu bojicu iz ruke.", "Bojica može da se polomi. Drug može da se naljuti."),
            act("😠", "Bacim svoj crtež.", "Crtež se izgužva. Bojicu i dalje nemamo."),
        ],
    },
    {
        id: 64,
        kind: "polite",
        scene: "🚪",
        model: "Nejla otvara vrata. Iza nje ide baka. Nejla kaže: „Izvolite, bako, prođite.”",
        text: "Otvaraš vrata. Iza tebe ide jedna baka.",
        ask: ASK_SAY_OR_DO,
        script: "Izvolite.",
        good: [
            say("🙂", "Izvolite.", "„Izvolite” kaže baki da može da prođe pre nas."),
            act("🚪", "Pridržim vrata dok baka ne prođe.", "Kad pridržimo vrata, baka lako prođe. Vrata je ne udare."),
        ],
        other: [
            act("💨", "Pustim vrata da se zalupe.", "Vrata mogu da udare baku. Glasan zvuk može da je uplaši."),
            act("🏃", "Protrčim ispred bake.", "Baka može da se uplaši ili izgubi ravnotežu."),
        ],
    },
    {
        id: 65,
        kind: "advocacy",
        scene: "🧥",
        model: "Kenanu je vruće u jakni. Kenan kaže: „Toplo mi je. Mogu li da skinem jaknu?”",
        text: "Napolju je toplo. Nosiš debelu jaknu. Vruće ti je.",
        ask: ASK_SAY_OR_DO,
        script: "Vruće mi je.",
        good: [
            say("🥵", "Vruće mi je.", "Kad kažemo da nam je vruće, odrasli mogu da pomognu."),
            act("🧥", "Pokažem mami jaknu.", "Mama vidi jaknu i pita da li želimo da je skinemo."),
        ],
        other: [
            act("😣", "Trpim i ništa ne kažem.", "Ne moraš da trpiš. Smeš da kažeš: „Vruće mi je.”"),
            act("🗑️", "Bacim jaknu na zemlju i odem.", "Jakna se isprlja ili izgubi. Mama ne zna gde je."),
        ],
    },
    // Srednji nivoi (6–10)
    {
        id: 66,
        kind: "polite",
        scene: "🤧",
        model: "Drug kija. Faris mu kaže: „Na zdravlje, drugar!”",
        text: "Drug pored tebe kine.",
        ask: ASK_SAY_OR_DO,
        script: "Na zdravlje!",
        good: [
            say("🙂", "Na zdravlje!", "„Na zdravlje” kažemo kad neko kine. Drug zna da mislimo na njega."),
            act("🧻", "Dam mu maramicu.", "Maramica mu pomaže da obriše nos."),
        ],
        other: [
            say("🤢", "Fuj, beži od mene!", "Kijanje se desi svakome. Posle tih reči drug može da se rastuži."),
            act("😆", "Smejem se glasno.", "Drug ne zna zašto se smejemo. Može da mu bude neprijatno."),
        ],
    },
    {
        id: 67,
        kind: "advocacy",
        scene: "🌙",
        model: "Lamija se plaši mraka. Lamija kaže: „Mama, ostavi malo svetla, molim te.”",
        text: "Uveče je mrak u sobi. Ti se plašiš mraka.",
        ask: ASK_SAY_OR_DO,
        script: "Može li da ostane svetlo?",
        good: [
            say("💡", "Može li da ostane svetlo?", "Kad kažemo šta nam treba, mama može da ostavi malo svetla."),
            act("🧸", "Uzmem medu u krevet.", "Meda u krevetu pomaže da se osećamo sigurno."),
        ],
        other: [
            act("😶", "Ćutim i ne spavam celu noć.", "Mama ne zna da nam je strah. Kad kažemo, ona može da pomogne."),
            act("📣", "Vrištim dok svi ne dođu.", "Vrisak može da uplaši druge. Mirne reči kažu šta nam treba."),
        ],
    },
    {
        id: 68,
        kind: "polite",
        scene: "🧸",
        model: "Mlađi brat plače. Emir mu kaže: „Evo, možeš malo da se igraš mojim medom.”",
        text: "Tvoj mlađi brat plače. On želi da se igra sa tobom.",
        ask: ASK_SAY_OR_DO,
        script: "Hoćeš da se igramo zajedno?",
        good: [
            say("🧸", "Hoćeš da se igramo zajedno?", "Kad pozovemo brata u igru, on prestaje da bude tužan."),
            act("🎁", "Dam mu jednu svoju igračku.", "Brat dobija igračku. Mi se i dalje igramo svojom."),
        ],
        other: [
            say("📣", "Beži, ovo je samo moje!", "Posle vike brat može još više da plače."),
            act("🙈", "Sakrijem sve igračke od njega.", "Brat i dalje plače. Niko se ne igra."),
        ],
    },
    {
        id: 69,
        kind: "polite",
        scene: "🏃",
        model: "Tarik i drug trče do drveta. Drug stiže prvi. Tarik kaže: „Bravo, bio si brži!”",
        text: "Trčiš sa drugom. Drug je stigao prvi.",
        ask: ASK_SAY_OR_DO,
        script: "Bravo!",
        good: [
            say("👏", "Bravo!", "Kad kažemo „Bravo”, drug je srećan. Sledeći put možda pobedimo mi."),
            act("🤝", "Pružim mu ruku.", "Pružena ruka kaže: „Lepo smo se igrali.”"),
        ],
        other: [
            say("😠", "Ti si varao!", "Drug nije varao. Posle tih reči može da se naljuti."),
            act("🦶", "Udarim nogom o zemlju i odem.", "Drug ne zna šta nam je. Igra se završi."),
        ],
    },
    {
        id: 70,
        kind: "advocacy",
        scene: "🚌",
        model: "U vozu je buka. Adnan kaže mami: „Previše mi je glasno. Mogu li da stavim slušalice?”",
        text: "U vozu je gužva i buka. Tebi je previše.",
        ask: ASK_SAY_OR_DO,
        script: "Previše mi je buke.",
        good: [
            say("🔊", "Previše mi je buke.", "Kad kažemo da nam je previše, mama može da pomogne."),
            act("🙉", "Pokrijem uši rukama.", "Pokrivene uši stišaju buku. To je u redu."),
        ],
        other: [
            act("📣", "Vičem da svi ućute.", "Posle vike je još glasnije. Ljudi se mogu uplašiti."),
            act("🚪", "Krenem {sam|sama} do vrata autobusa.", "Autobus vozi. Kod vrata možemo da padnemo."),
        ],
    },
    // Teški nivoi (11–15)
    {
        id: 71,
        kind: "polite",
        scene: "📞",
        model: "Zvoni telefon. Amina se javlja: „Halo, ovde Amina. Ko je to?”",
        text: "Zvoni telefon. Mama ti kaže da se javiš.",
        ask: ASK_SAY,
        script: "Halo?",
        good: [
            say("📞", "Halo?", "„Halo” kaže osobi da je slušamo."),
            say("🙂", "Dobar dan, ko je to?", "Tako saznamo ko zove. Onda možemo da pozovemo mamu."),
        ],
        other: [
            act("📵", "Spustim slušalicu bez reči.", "Osoba ne zna šta se desilo. Može ponovo da zove."),
            act("📣", "Viknem u telefon.", "Vika u telefonu jako boli uši."),
        ],
    },
    {
        id: 72,
        kind: "advocacy",
        scene: "🤒",
        model: "Merjem se ne oseća dobro na času. Merjem kaže: „Učiteljice, boli me stomak.”",
        text: "U školi si. Odjednom te boli stomak.",
        ask: ASK_SAY_OR_DO,
        script: "Boli me stomak.",
        good: [
            say("🤒", "Boli me stomak.", "Kad kažemo šta nas boli, učiteljica može da pomogne."),
            act("🙋", "Odem do učiteljice i pokažem stomak.", "I kad pokažemo, učiteljica zna gde nas boli."),
        ],
        other: [
            act("😣", "Ćutim i trpim do kraja dana.", "Ako ne kažemo, niko ne zna da nas boli."),
            act("🏃", "Izađem iz škole i nikome ne kažem.", "Učiteljica ne zna gde smo. Napolju možemo da se izgubimo."),
        ],
    },
    {
        id: 73,
        kind: "polite",
        scene: "🎁",
        model: "Selma je dobila poklon. Poklon joj se ne sviđa. Selma kaže: „Hvala što si mislila na mene.”",
        text: "Drugarica ti daje poklon. Poklon ti se ne sviđa.",
        ask: ASK_SAY,
        script: "Hvala ti.",
        good: [
            say("🙏", "Hvala ti.", "Drugarica je mislila na nas. „Hvala” joj kaže da to vidimo."),
            say("🙂", "Hvala što si se setila.", "Tako drugarica zna da nam je drago što je mislila na nas."),
        ],
        other: [
            say("🤢", "Fuj, ovo mi se ne sviđa!", "Drugarica se trudila oko poklona. Posle tih reči može da se rastuži."),
            act("🗑️", "Bacim poklon u ugao.", "Poklon može da se polomi. Drugarica može da se rastuži."),
        ],
    },
    {
        id: 74,
        kind: "advocacy",
        scene: "🔁",
        model: "Bazen je danas zatvoren. Haris kaže tati: „Baš sam se radovao. Šta ćemo sada?”",
        text: "Krenuli ste na bazen. Bazen je danas zatvoren. Plan se promenio.",
        ask: ASK_SAY_OR_DO,
        script: "Šta ćemo da radimo umesto toga?",
        good: [
            say("❓", "Šta ćemo da radimo umesto toga?", "Kad pitamo, tata kaže novi plan. Novi plan pomaže da se smirimo."),
            act("🌬️", "Dišem polako i brojim do pet.", "Polako disanje pomaže kad se plan promeni."),
        ],
        other: [
            act("🚪", "Lupam rukama po vratima bazena.", "Vrata ostaju zatvorena. Ruke mogu da zabole."),
            act("😶", "Ćutim i neću nigde da idem.", "Tata ne zna šta mislimo. Kad kažemo, lakše je naći novi plan."),
        ],
    },
    {
        id: 75,
        kind: "polite",
        scene: "👋",
        model: "U razred je došao novi dečak. Lejla mu kaže: „Zdravo, ja sam Lejla. Kako se ti zoveš?”",
        text: "U razred je došao novi dečak. On stoji sam.",
        ask: ASK_SAY_OR_DO,
        script: "Zdravo! Hoćeš da se igraš sa nama?",
        good: [
            say("👋", "Zdravo! Hoćeš da se igraš sa nama?", "Novi dečak više nije sam. Lakše mu je prvog dana."),
            act("🙋", "Mahnem mu i pokažem mu gde je naša igra.", "I kad mahnemo, dečak zna da je dobrodošao."),
        ],
        other: [
            act("👉", "Pokazujem ga prstom i smejem se.", "Dečak ne zna zašto se smejemo. Može da mu bude neprijatno."),
            act("🙅", "Kažem drugima: „Ne igrajte se sa njim.”", "Dečak ostaje sam. Može da se rastuži."),
        ],
    },
];

// ── Slaganje nivoa ────────────────────────────────────────────────────────────

function toSituation({ good, other, ...base }: Draft): SocialSituation {
    return { ...base, options: [...good, ...other], acceptable: good.map((_, i) => i) };
}

/**
 * Izbori po težini (svaki izbor je slika sa kratkim natpisom, pa ih je malo): laka težina nudi
 * 1 + 1 izbor, srednja 1 + 2, teška 2 + 1. Od srednje težine su na ekranu tri slike; na teškoj
 * dete uz to uči da više od jednog odgovora može da pomogne.
 */
function forTier(draft: Draft, tier: number, repeated = true): SocialSituation {
    return toSituation({
        ...draft,
        id: repeated ? draft.id + tier * REPEATED_PER_TIER : draft.id,
        good: draft.good.slice(0, tier === TIER_COUNT - 1 ? 2 : 1),
        other: draft.other.slice(0, tier === 1 ? 2 : 1),
    });
}

/**
 * Zastupanje sebe je drugo po redu, a nova situacija nivoa treća, pa obe ostaju u nivou i kad
 * je broj zadataka skraćen (najmanje 5 zadataka po nivou).
 */
function buildLevel(level: number): SocialSituation[] {
    const tier = Math.floor((level - 1) / GROUP_COUNT);
    const [first, ...rest] = GROUPS[(level - 1) % GROUP_COUNT].map((draft) => forTier(draft, tier));
    return [first, forTier(ADVOCACY[level - 1], tier, false), forTier(FRESH[level - 1], tier, false), ...rest];
}

/** Situacije po nivoima 1–15 (ID-jevi 1–45 se ponavljaju na tri težine; 46–75 su jedinstvene). */
const SITUATIONS_BY_LEVEL: Record<number, SocialSituation[]> = Object.fromEntries(
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
