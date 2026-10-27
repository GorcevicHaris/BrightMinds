// lib/games.ts
// Jedini izvor istine za spisak igara: ID-jevi, nazivi, boje i ID aktivnosti u bazi.
// Koriste ga dečji ekran, live monitor, statistika i API rute.

export type GameId =
    | "shapes"
    | "memory"
    | "coloring"
    | "sound-to-image"
    | "social"
    | "social-story"
    | "emotions"
    | "sorting"
    | "sequence"
    | "where"
    | "uses"
    | "counting"
    | "gaze"
    | "letters"
    | "numbers"
    | "food"
    | "puzzle"
    | "inset"
    | "clock"
    | "maze"
    | "differences"
    | "weather"
    | "market"
    | "families"
    | "backpack"
    | "missing"
    | "words"
    | "opposites"
    | "syllables"
    | "jobs"
    | "habitats"
    | "seasons"
    | "body"
    | "traffic";

/** Naziv kanala/događaja koji igra šalje monitoru (istorijski se razlikuje od GameId). */
export type GameType =
    | "shape_matching"
    | "memory"
    | "coloring"
    | "sound-to-image"
    | "social"
    | "social-story"
    | "emotions"
    | "sorting"
    | "sequence"
    | "where"
    | "uses"
    | "counting"
    | "gaze"
    | "letters"
    | "numbers"
    | "food"
    | "puzzle"
    | "inset"
    | "clock"
    | "maze"
    | "differences"
    | "weather"
    | "market"
    | "families"
    | "backpack"
    | "missing"
    | "words"
    | "opposites"
    | "syllables"
    | "jobs"
    | "habitats"
    | "seasons"
    | "body"
    | "traffic";

export interface GameAccent {
    /** Puna boja (dugmad, bedževi) */
    solid: string;
    /** Tamnija ivica za "3D" dugme */
    edge: string;
    /** Svetla podloga */
    soft: string;
    /** Tekst u boji igre */
    text: string;
    /** Ivica u boji igre */
    border: string;
    /** Prsten/fokus */
    ring: string;
    /** Gradijent za ikonice i trake */
    gradient: string;
}

export interface GameDefinition {
    id: GameId;
    gameType: GameType;
    /** ID u tabeli `activities` */
    activityId: number;
    title: string;
    description: string;
    /** Veština koju igra razvija — prikazuje se roditeljima */
    skill: string;
    icon: string;
    image: string;
    accent: GameAccent;
    /** Predlog odraslom kako da istu veštinu vežba sa detetom van ekrana */
    offscreenTip: string;
    /**
     * false = u igri nema pogrešnih odgovora (npr. osećanja), pa se nivo ne „polaže”:
     * svaki završen nivo otključava sledeći, a broj `correct` znači „najčešći odgovor”.
     */
    graded: boolean;
    /**
     * Uzrast za koji je igra namenjena (navršene godine, uključivo). Prikazuje se samo
     * roditelju, diskretno; dete ne vidi brojeve godina.
     */
    ages: { min: number; max: number };
    /**
     * Redosled učenja: 1 = uči se prvo (najlakše), veći broj = oslanja se na ranije veštine.
     * Po njemu se igre ređaju na početnom ekranu i otključavaju jedna za drugom.
     */
    order: number;
}

export const GAMES: GameDefinition[] = [
    {
        id: "shapes",
        gameType: "shape_matching",
        activityId: 1,
        title: "Pogodi oblik",
        description: "Pronađi isti oblik",
        skill: "Vizuelna percepcija",
        icon: "🔷",
        image: "/images/pogodioblik.webp",
        accent: {
            solid: "bg-emerald-500",
            edge: "border-emerald-700",
            soft: "bg-emerald-50",
            text: "text-emerald-700",
            border: "border-emerald-200",
            ring: "ring-emerald-200",
            gradient: "from-emerald-400 to-teal-500",
        },
        offscreenTip: "Potražite zajedno iste oblike po kući: tanjir je krug, prozor je kvadrat.",
        graded: true,
        // 1. po redu: isti oblik: najjednostavnije vizuelno uparivanje
        ages: { min: 3, max: 5 },
        order: 1,
    },
    {
        id: "memory",
        gameType: "memory",
        activityId: 3,
        title: "Spoji parove",
        description: "Pronađi dve iste slike",
        skill: "Pamćenje i pažnja",
        icon: "🧠",
        image: "/images/spojiparove.webp",
        accent: {
            solid: "bg-violet-500",
            edge: "border-violet-700",
            soft: "bg-violet-50",
            text: "text-violet-700",
            border: "border-violet-200",
            ring: "ring-violet-200",
            gradient: "from-violet-400 to-indigo-500",
        },
        offscreenTip: "Sakrijte dve-tri igračke pod čaše, pa neka dete pogodi gde je koja.",
        graded: true,
        // 6. po redu: pamćenje mesta: traži pažnju kroz više poteza
        ages: { min: 4, max: 7 },
        order: 6,
    },
    {
        id: "coloring",
        gameType: "coloring",
        activityId: 4,
        title: "Bojanka",
        description: "Izaberi boje i oboji sliku",
        skill: "Fina motorika i boje",
        icon: "🎨",
        image: "/images/oboji.webp",
        accent: {
            solid: "bg-orange-500",
            edge: "border-orange-700",
            soft: "bg-orange-50",
            text: "text-orange-700",
            border: "border-orange-200",
            ring: "ring-orange-200",
            gradient: "from-orange-400 to-pink-500",
        },
        offscreenTip: "Bojite zajedno na papiru i imenujte boje predmeta oko sebe.",
        graded: true,
        // 4. po redu: boje i fina motorika, bez tačnog i netačnog
        ages: { min: 3, max: 7 },
        order: 4,
    },
    {
        id: "sound-to-image",
        gameType: "sound-to-image",
        activityId: 5,
        title: "Slušaj i spoji",
        description: "Čuj zvuk i pronađi sliku",
        skill: "Slušna pažnja",
        icon: "🔊",
        image: "/images/slusajispoji.webp",
        accent: {
            solid: "bg-sky-500",
            edge: "border-sky-700",
            soft: "bg-sky-50",
            text: "text-sky-700",
            border: "border-sky-200",
            ring: "ring-sky-200",
            gradient: "from-cyan-400 to-blue-500",
        },
        offscreenTip: "Zastanite u šetnji i pitajte: „Šta čuješ?” — ptica, auto, vetar.",
        graded: true,
        // 2. po redu: zvuk → slika: uparivanje sluhom
        ages: { min: 3, max: 5 },
        order: 2,
    },
    {
        id: "social",
        gameType: "social",
        activityId: 6,
        title: "Šta reći?",
        description: "Izaberi lepe reči",
        skill: "Socijalna komunikacija",
        icon: "💬",
        image: "/images/stareci.webp",
        accent: {
            solid: "bg-indigo-500",
            edge: "border-indigo-700",
            soft: "bg-indigo-50",
            text: "text-indigo-700",
            border: "border-indigo-200",
            ring: "ring-indigo-200",
            gradient: "from-indigo-400 to-purple-600",
        },
        offscreenTip: "Odigrajte kratku scenu sa igračkama: ko šta kaže kad dobije poklon ili traži pomoć.",
        graded: true,
        // 13. po redu: izbor reči u društvenoj situaciji
        ages: { min: 5, max: 10 },
        order: 13,
    },
    {
        id: "social-story",
        gameType: "social-story",
        activityId: 7,
        title: "Socijalne priče",
        description: "Šta se dešava u školi, kod zubara, u parku",
        skill: "Svakodnevne situacije",
        icon: "📖",
        image: "/images/socijalneprice.webp",
        accent: {
            solid: "bg-teal-500",
            edge: "border-teal-700",
            soft: "bg-teal-50",
            text: "text-teal-700",
            border: "border-teal-200",
            ring: "ring-teal-200",
            gradient: "from-teal-400 to-emerald-600",
        },
        offscreenTip: "Pre odlaska kod zubara ili u prodavnicu, ispričajte redom šta će se dešavati.",
        graded: true,
        // 14. po redu: cela situacija iz svakodnevice, korak po korak
        ages: { min: 5, max: 10 },
        order: 14,
    },
    {
        id: "emotions",
        gameType: "emotions",
        activityId: 8,
        title: "Emocije",
        description: "Kako se oseća dete u priči?",
        skill: "Prepoznavanje emocija",
        icon: "😊",
        image: "/images/emocije.svg",
        accent: {
            solid: "bg-pink-500",
            edge: "border-pink-700",
            soft: "bg-pink-50",
            text: "text-pink-700",
            border: "border-pink-200",
            ring: "ring-pink-200",
            gradient: "from-pink-400 to-rose-500",
        },
        offscreenTip: "Dok čitate slikovnicu, pitajte: „Kako se oseća ovaj lik? Po čemu to vidiš?”",
        graded: true,
        // 9. po redu: prepoznavanje osećanja na licu i u priči
        ages: { min: 4, max: 8 },
        order: 9,
    },
    {
        id: "sorting",
        gameType: "sorting",
        activityId: 9,
        title: "Razvrstaj",
        description: "Stavi u pravu korpu",
        skill: "Razvrstavanje",
        icon: "🧺",
        image: "/images/razvrstaj.svg",
        accent: {
            solid: "bg-amber-500",
            edge: "border-amber-700",
            soft: "bg-amber-50",
            text: "text-amber-700",
            border: "border-amber-200",
            ring: "ring-amber-200",
            gradient: "from-amber-400 to-orange-500",
        },
        offscreenTip:
            "Napravite kod kuće „čarobne kutije” i razvrstajte zajedno igračke ili pribor za jelo: „Crvene kocke ovde, plave tamo.” Sa starijim detetom uvedite pravilo: „U ovu kutiju stavljamo samo ono što koristimo za jelo.”",
        graded: true,
        // 11. po redu: razvrstavanje — od iste slike (od treće godine) do boje, veličine, vrste i pravila (namena)
        ages: { min: 3, max: 8 },
        order: 11,
    },
    {
        id: "sequence",
        gameType: "sequence",
        activityId: 10,
        title: "Šta je prvo?",
        description: "Složi korake redom",
        skill: "Redosled i planiranje",
        icon: "🔢",
        image: "/images/redosled.svg",
        accent: {
            solid: "bg-lime-500",
            edge: "border-lime-700",
            soft: "bg-lime-50",
            text: "text-lime-700",
            border: "border-lime-200",
            ring: "ring-lime-200",
            gradient: "from-lime-400 to-green-500",
        },
        offscreenTip: "Pre nove aktivnosti recite korake redom: „Prvo obučemo jaknu, zatim obujemo cipele, na kraju idemo napolje.”",
        graded: true,
        // 12. po redu: redosled koraka: planiranje
        ages: { min: 5, max: 10 },
        order: 12,
    },
    {
        id: "where",
        gameType: "where",
        activityId: 11,
        title: "Gde je?",
        description: "U, na, ispod ili pored?",
        skill: "Prostorni pojmovi",
        icon: "📦",
        image: "/images/gdeje.svg",
        accent: {
            solid: "bg-cyan-500",
            edge: "border-cyan-700",
            soft: "bg-cyan-50",
            text: "text-cyan-700",
            border: "border-cyan-200",
            ring: "ring-cyan-200",
            gradient: "from-cyan-400 to-sky-500",
        },
        offscreenTip: "U igri sa igračkama recite gde su i neka dete pokaže ili sakrije: „Meda je ispod stola.”, „Stavi loptu u kutiju.”",
        graded: true,
        // 5. po redu: u, na, ispod, pored: prvi prostorni pojmovi
        ages: { min: 3, max: 6 },
        order: 5,
    },
    {
        id: "uses",
        gameType: "uses",
        activityId: 12,
        title: "Čemu služi?",
        description: "Čuj pitanje i pronađi predmet",
        skill: "Razumevanje govora",
        icon: "✂️",
        image: "/images/cemusluzi.svg",
        accent: {
            solid: "bg-fuchsia-500",
            edge: "border-fuchsia-700",
            soft: "bg-fuchsia-50",
            text: "text-fuchsia-700",
            border: "border-fuchsia-200",
            ring: "ring-fuchsia-200",
            gradient: "from-fuchsia-400 to-purple-500",
        },
        offscreenTip: "Dok spremate doručak ili se kupate, pitajte: „Čime jedemo supu?”, „Čime peremo kosu?” — neka dete pokaže ili donese predmet.",
        graded: true,
        // 8. po redu: razumevanje rečenice o nameni predmeta
        ages: { min: 4, max: 7 },
        order: 8,
    },
    {
        id: "counting",
        gameType: "counting",
        activityId: 13,
        title: "Brojimo",
        description: "Koliko ima? Gde ima više?",
        skill: "Brojanje i količine",
        icon: "🧮",
        image: "/images/brojimo.svg",
        accent: {
            solid: "bg-yellow-500",
            edge: "border-yellow-700",
            soft: "bg-yellow-50",
            text: "text-yellow-800",
            border: "border-yellow-200",
            ring: "ring-yellow-200",
            gradient: "from-yellow-400 to-orange-400",
        },
        offscreenTip: "Brojite zajedno ono što je oko vas: stepenice, kašike na stolu, autiće u kutiji. Neka dete dodirne svaku stvar dok broji, pa pitajte: „Koliko ima?” ili „Gde ima više?”",
        graded: true,
        // 10. po redu: brojanje i poređenje količina
        ages: { min: 4, max: 7 },
        order: 10,
    },
    {
        id: "gaze",
        gameType: "gaze",
        activityId: 14,
        title: "Šta gleda?",
        description: "Prati pogled i pronađi predmet",
        skill: "Zajednička pažnja",
        icon: "👀",
        image: "/images/stagleda.svg",
        accent: {
            solid: "bg-blue-500",
            edge: "border-blue-700",
            soft: "bg-blue-50",
            text: "text-blue-700",
            border: "border-blue-200",
            ring: "ring-blue-200",
            gradient: "from-blue-400 to-indigo-500",
        },
        offscreenTip:
            "Sedite jedno pored drugog, pogledajte u neku igračku i pitajte: „Šta ja gledam?” Pokažite i rukom ako treba. Ne tražite da vas dete gleda u oči — dovoljno je da prati gde gledate.",
        graded: true,
        // 3. po redu: praćenje pogleda: osnova zajedničke pažnje
        ages: { min: 3, max: 6 },
        order: 3,
    },
    {
        id: "letters",
        gameType: "letters",
        activityId: 15,
        title: "Slova",
        description: "Piši slova prstom",
        skill: "Slova i pisanje",
        icon: "🔤",
        image: "/images/slova.svg",
        accent: {
            solid: "bg-rose-500",
            edge: "border-rose-700",
            soft: "bg-rose-50",
            text: "text-rose-700",
            border: "border-rose-200",
            ring: "ring-rose-200",
            gradient: "from-rose-400 to-orange-400",
        },
        offscreenTip:
            "Pišite slova prstom po pesku, brašnu ili po leđima deteta, krupno i polako, i recite: „M kao mačka.” Prvo vi napišete, pa dete preko vašeg slova, pa samostalno. Dobro je početi od slova iz detetovog imena.",
        ages: { min: 4, max: 10 },
        order: 15,
        graded: true,
    },
    {
        id: "numbers",
        gameType: "numbers",
        activityId: 16,
        title: "Brojevi",
        description: "Piši brojeve i pronađi broj",
        skill: "Pisanje i čitanje brojeva",
        icon: "🔟",
        image: "/images/brojevi.svg",
        accent: {
            solid: "bg-green-500",
            edge: "border-green-700",
            soft: "bg-green-50",
            text: "text-green-700",
            border: "border-green-200",
            ring: "ring-green-200",
            gradient: "from-green-400 to-teal-500",
        },
        offscreenTip:
            "Tražite brojeve oko sebe: na liftu, satu, tablici kola, kalendaru — i pitajte: „Koji je ovo broj?” Pišite broj prstom po stolu i pored njega stavite toliko dugmića ili kockica. Na stepenicama brojite i pitajte: „Koji broj dolazi posle tri?”",
        ages: { min: 4, max: 8 },
        order: 16,
        graded: true,
    },
    {
        id: "food",
        gameType: "food",
        activityId: 17,
        title: "Šta jede?",
        description: "Ko šta jede: nahrani životinje",
        skill: "Razumevanje govora i svet oko nas",
        icon: "🥕",
        image: "/images/stajede.svg",
        accent: {
            solid: "bg-red-500",
            edge: "border-red-700",
            soft: "bg-red-50",
            text: "text-red-700",
            border: "border-red-200",
            ring: "ring-red-200",
            gradient: "from-orange-400 to-red-500",
        },
        offscreenTip:
            "U zoološkom vrtu, na selu ili uz slikovnicu pitajte: „Šta jede zeka?”, „Ko jede travu?” Neka dete pokaže ili kaže, a vi ponovite celu rečenicu: „Zeka jede šargarepu.” Dok spremate obrok, dajte detetu da „nahrani” plišane životinje.",
        graded: true,
        // 7. po redu: ko šta jede — poznate životinje i hrana, pre pitanja o nameni predmeta
        ages: { min: 3, max: 7 },
        order: 7,
    },
    {
        id: "puzzle",
        gameType: "puzzle",
        activityId: 22,
        title: "Složi sliku",
        description: "Spoji delove u celu sliku",
        skill: "Vizuelno-prostorno opažanje",
        icon: "🧩",
        image: "/images/slozisliku.svg",
        accent: {
            solid: "bg-purple-500",
            edge: "border-purple-700",
            soft: "bg-purple-50",
            text: "text-purple-700",
            border: "border-purple-200",
            ring: "ring-purple-200",
            gradient: "from-fuchsia-400 to-purple-600",
        },
        offscreenTip:
            "Isecite staru razglednicu ili crtež na dva dela, pa na tri-četiri, i slažite zajedno. Prvo vi pokažite gde ide jedan deo, pa neka dete doda ostale. Pričajte šta je na delu: „Ovde je nebo, ono ide gore.”",
        graded: true,
        // Slaganje slike od delova: od dve polovine do 16 delova, za sve uzraste
        ages: { min: 3, max: 10 },
        order: 17,
    },
    {
        id: "clock",
        gameType: "clock",
        activityId: 18,
        title: "Sat",
        description: "Složi brojeve i sat, pa pogodi koliko je sati",
        skill: "Brojevi, redosled i vreme",
        icon: "🕒",
        image: "/images/sat.svg",
        accent: {
            solid: "bg-stone-500",
            edge: "border-stone-700",
            soft: "bg-stone-50",
            text: "text-stone-700",
            border: "border-stone-200",
            ring: "ring-stone-200",
            gradient: "from-amber-300 to-orange-600",
        },
        offscreenTip:
            "Na pravom satu pokažite malu kazaljku: „Mala kazaljka je na sedmici — sedam sati, vreme za doručak.” Vežite sat za svakodnevne stvari (crtani u pet, spavanje u osam). Brojte stepenice ili dugmiće i stavite pored njih broj od papira.",
        graded: true,
        // 19. po redu: brojevi redom na satu i čitanje vremena — posle brojanja i brojeva
        ages: { min: 4, max: 9 },
        order: 19,
    },
    {
        id: "inset",
        gameType: "inset",
        activityId: 19,
        title: "Umetaljka",
        description: "Svaki oblik u svoju rupu",
        skill: "Oblici i spretnost ruku",
        icon: "🔶",
        image: "/images/umetaljka.svg",
        accent: {
            solid: "bg-slate-500",
            edge: "border-slate-700",
            soft: "bg-slate-50",
            text: "text-slate-700",
            border: "border-slate-200",
            ring: "ring-slate-200",
            gradient: "from-sky-400 to-indigo-500",
        },
        offscreenTip:
            "Drvena umetaljka, kutija sa otvorima ili poklopci tegli: neka dete proba koji oblik gde ulazi. Imenujte oblik dok ga drži („To je trougao.”), a kad ne ulazi, recite mirno: „Okreni ga.” Kasnije tražite predmete po senci: šolja, ključ, jabuka.",
        graded: true,
        // 18. po redu: uparivanje oblika sa rupom, rukom i okom — posle slaganja slike
        ages: { min: 3, max: 7 },
        order: 18,
    },
    {
        id: "maze",
        gameType: "maze",
        activityId: 23,
        title: "Lavirint",
        description: "Pronađi put do cilja",
        skill: "Fina motorika i planiranje",
        icon: "🌿",
        image: "/images/lavirint.svg",
        accent: {
            solid: "bg-moss-500",
            edge: "border-moss-700",
            soft: "bg-moss-50",
            text: "text-moss-700",
            border: "border-moss-200",
            ring: "ring-moss-200",
            gradient: "from-lime-400 to-moss-600",
        },
        offscreenTip:
            "Nacrtajte kredom na asfaltu ili trakom na podu široku stazu sa jednim skretanjem i neka dete hoda po njoj do igračke na kraju. Kasnije crtajte lavirinte na papiru i vodite prst zajedno, pa olovku. Pitajte: „Kuda dalje?”, a ne pokazujte odmah.",
        graded: true,
        // 20. po redu: vođenje prsta po stazi i planiranje puta — posle umetaljke i slaganja slike
        ages: { min: 3, max: 9 },
        order: 20,
    },
    {
        id: "differences",
        gameType: "differences",
        activityId: 24,
        title: "Pronađi razlike",
        description: "Dve slike, a nisu iste",
        skill: "Vizuelna pažnja",
        icon: "🔍",
        image: "/images/razlike.svg",
        accent: {
            solid: "bg-coral-500",
            edge: "border-coral-700",
            soft: "bg-coral-50",
            text: "text-coral-700",
            border: "border-coral-200",
            ring: "ring-coral-200",
            gradient: "from-coral-400 to-pink-500",
        },
        offscreenTip:
            "Postavite na sto tri-četiri predmeta, neka dete zatvori oči, pa jedan sklonite ili zamenite: „Šta se promenilo?” U slikovnici tražite iste stvari na dve stranice. Počnite od velikih promena (nema lopte), pa boja, pa sitnice.",
        graded: true,
        // 21. po redu: pažljivo poređenje dve slike — posle uparivanja oblika i slaganja slike
        ages: { min: 4, max: 10 },
        order: 21,
    },
    {
        id: "weather",
        gameType: "weather",
        activityId: 27,
        title: "Obuci se",
        description: "Pogledaj kroz prozor i obuci lik",
        skill: "Vreme i svakodnevne veštine",
        icon: "🧥",
        image: "/images/obucise.svg",
        accent: {
            solid: "bg-storm-500",
            edge: "border-storm-700",
            soft: "bg-storm-50",
            text: "text-storm-700",
            border: "border-storm-200",
            ring: "ring-storm-200",
            gradient: "from-storm-300 to-storm-600",
        },
        offscreenTip:
            "Svako jutro pogledajte zajedno kroz prozor: „Pada kiša. Šta nam treba?” Neka dete samo izabere kišobran ili kapu. Zalepite pored vrata sličice odeće redom (čarape, pa patike; majica, pa jakna), a starije dete neka uveče pogleda prognozu i spremi odeću za sutra.",
        graded: true,
        // Oblačenje prema vremenu: od jedne stvari do cele odeće, redosleda i nedeljne prognoze
        ages: { min: 4, max: 9 },
        order: 22,
    },
    {
        id: "market",
        gameType: "market",
        activityId: 28,
        title: "Prodavnica",
        description: "Kupi sa spiska i plati kod Emine",
        skill: "Brojanje i novac",
        icon: "🛒",
        image: "/images/prodavnica.svg",
        accent: {
            solid: "bg-honey-500",
            edge: "border-honey-700",
            soft: "bg-honey-50",
            text: "text-honey-700",
            border: "border-honey-200",
            ring: "ring-honey-200",
            gradient: "from-honey-300 to-honey-600",
        },
        offscreenTip:
            "Igrajte se prodavnice kod kuće: na igračke zalepite cene od 1 do 10 dinara i plaćajte pravim novčićima. U pravoj prodavnici neka dete samo plati nešto malo i dobije račun. Starije dete neka unapred sabere cene sa spiska i proveri koliko je kusura dobilo.",
        graded: true,
        // Novac posle brojanja i brojeva: od spiska sa slikama do kusura i budžeta (školski uzrast)
        ages: { min: 5, max: 10 },
        order: 23,
    },
    {
        id: "families",
        gameType: "families",
        activityId: 20,
        title: "Mama i beba",
        description: "Svaka beba traži svoju mamu",
        skill: "Uparivanje i svet oko nas",
        icon: "🐣",
        image: "/images/mamaibeba.svg",
        accent: {
            solid: "bg-[#c07a45]",
            edge: "border-[#8f5428]",
            soft: "bg-[#fbf3ec]",
            text: "text-[#8f5428]",
            border: "border-[#efd6c2]",
            ring: "ring-[#efd6c2]",
            gradient: "from-amber-300 to-[#c07a45]",
        },
        offscreenTip:
            "Uz slikovnicu ili na selu pitajte: „Gde je mama od teleta?”, „Kako se zove beba od ovce?” Neka dete pokaže ili kaže, a vi ponovite: „Ovca i njeno jagnje.” Igrajte se plišanim životinjama: velika i mala zajedno, pa tata, mama i beba u istu kutiju-kućicu.",
        graded: true,
        // 24. po redu: uparivanje mame i bebe, pa porodice — od izgleda ka znanju
        ages: { min: 3, max: 8 },
        order: 24,
    },
    {
        id: "backpack",
        gameType: "backpack",
        activityId: 21,
        title: "Spakuj ranac",
        description: "Spakuj ono što treba za školu",
        skill: "Radno pamćenje i planiranje",
        icon: "🎒",
        image: "/images/spakujranac.svg",
        accent: {
            solid: "bg-[#2f86a6]",
            edge: "border-[#1f5f7a]",
            soft: "bg-[#eef7fa]",
            text: "text-[#1f5f7a]",
            border: "border-[#c6e2ec]",
            ring: "ring-[#c6e2ec]",
            gradient: "from-sky-300 to-[#2f86a6]",
        },
        offscreenTip:
            "Uveče pred školu napravite zajedno slikovnu listu (sveska, pernica, flašica, užina) i neka dete samo pakuje i štiklira. Starije dete neka pogleda raspored časova i kaže šta treba za koji čas, pa ujutru proverite: „Šta fali u rancu?”",
        graded: true,
        // 25. po redu: lista, pamćenje liste i raspored časova — za školski uzrast
        ages: { min: 5, max: 10 },
        order: 25,
    },
    {
        id: "missing",
        gameType: "missing",
        activityId: 25,
        title: "Šta fali?",
        description: "Zapamti i pronađi šta fali",
        skill: "Vizuelno pamćenje i opažanje",
        icon: "🙈",
        image: "/images/stafali.svg",
        accent: {
            solid: "bg-berry-500",
            edge: "border-berry-700",
            soft: "bg-berry-50",
            text: "text-berry-700",
            border: "border-berry-200",
            ring: "ring-berry-200",
            gradient: "from-berry-300 to-berry-600",
        },
        offscreenTip:
            "Kimova igra kod kuće: stavite tri igračke na sto, neka ih dete pogleda i imenuje, pa neka zatvori oči dok sklonite jednu. „Šta fali?” Kasnije stavite više stvari ili zamenite dve stvari mesta. Uz slikovnicu pitajte: „Šta fali autu?”, „Šta fali kući?”",
        graded: true,
        // 26. po redu: dopunjavanje slike, pa pamćenje šta je bilo na polici (Kimova igra)
        ages: { min: 3, max: 8 },
        order: 26,
    },
    {
        id: "words",
        gameType: "words",
        activityId: 26,
        title: "Prve reči",
        description: "Čitaj reči, slogove i slova",
        skill: "Rano čitanje",
        icon: "📝",
        image: "/images/prvereci.svg",
        accent: {
            solid: "bg-pine-500",
            edge: "border-pine-700",
            soft: "bg-pine-50",
            text: "text-pine-700",
            border: "border-pine-200",
            ring: "ring-pine-200",
            gradient: "from-pine-300 to-pine-600",
        },
        offscreenTip:
            "Napišite krupnim štampanim slovima MAMA, TATA i ime deteta i zalepite kartice na vrata ili fotografije. Čitajte po slogovima uz tapšanje: LO-PTA. U šetnji pitajte: „Na koje slovo počinje reč lopta?” Starijem detetu napišite kratku rečenicu („Amar ima loptu.”) i neka nacrta šta piše.",
        graded: true,
        // 27. po redu: rano čitanje — slika i reč, prvo slovo, slogovi, slova i rečenica (posle igre „Slova”)
        ages: { min: 5, max: 8 },
        order: 27,
    },
    {
        id: "body",
        gameType: "body",
        activityId: 41,
        title: "Moje telo",
        description: "Delovi tela i čula",
        skill: "Telo i čula",
        icon: "🖐️",
        image: "/images/mojetelo.svg",
        accent: {
            solid: "bg-peach-500",
            edge: "border-peach-700",
            soft: "bg-peach-50",
            text: "text-peach-700",
            border: "border-peach-200",
            ring: "ring-peach-200",
            gradient: "from-peach-300 to-peach-600",
        },
        offscreenTip:
            "Igrajte „Glava, ramena, kolena, prsti” uz pesmu i pokrete. Na kupanju pitajte: „Gde je lakat? Čime mirišemo?” Zatvorite oči i pogađajte šta čujete, mirišete i dodirujete — tako se uče čula. Starije dete neka prebroji: „Koliko prstiju imaš na jednoj ruci?”",
        graded: true,
        // Delovi lica, pa tela, pa čula — prvi pojmovi o sebi
        ages: { min: 3, max: 7 },
        order: 28,
    },
    {
        id: "opposites",
        gameType: "opposites",
        activityId: 36,
        title: "Suprotnosti",
        description: "Veliko i malo, dan i noć",
        skill: "Pojmovi i govor",
        icon: "↔️",
        image: "/images/suprotnosti.svg",
        accent: {
            solid: "bg-orchid-500",
            edge: "border-orchid-700",
            soft: "bg-orchid-50",
            text: "text-orchid-700",
            border: "border-orchid-200",
            ring: "ring-orchid-200",
            gradient: "from-orchid-300 to-orchid-600",
        },
        offscreenTip:
            "U kući tražite parove: velika i mala kašika, puna i prazna čaša, otvorena i zatvorena vrata. Recite prvi deo: „Ova čaša je puna, a ova je…?” i sačekajte da dete dopuni. Starije dete neka samo smisli suprotnost: „Šta je suprotno od toplo?”",
        graded: true,
        // Parovi pojmova: od iste stvari na dve slike do suprotnosti samo rečima
        ages: { min: 3, max: 7 },
        order: 29,
    },
    {
        id: "habitats",
        gameType: "habitats",
        activityId: 39,
        title: "Ko gde živi?",
        description: "Životinje i njihov dom",
        skill: "Priroda i razvrstavanje",
        icon: "🏞️",
        image: "/images/kogdezivi.svg",
        accent: {
            solid: "bg-fern-500",
            edge: "border-fern-700",
            soft: "bg-fern-50",
            text: "text-fern-700",
            border: "border-fern-200",
            ring: "ring-fern-200",
            gradient: "from-fern-300 to-fern-600",
        },
        offscreenTip:
            "Uz slikovnicu ili u zoološkom vrtu pitajte: „Gde živi ova životinja?” Napravite od kutija farmu, šumu i more i razvrstajte igračke-životinje. Starije dete neka kaže i zašto: „Pingvin živi na ledu, a riba u vodi.”",
        graded: true,
        // Životinje i staništa: od dva različita mesta do zagonetki o tome ko gde živi
        ages: { min: 3, max: 8 },
        order: 30,
    },
    {
        id: "jobs",
        gameType: "jobs",
        activityId: 38,
        title: "Ko šta radi?",
        description: "Zanimanja, alati i mesta rada",
        skill: "Zanimanja i svet oko nas",
        icon: "🧑‍🚒",
        image: "/images/kostaradi.svg",
        accent: {
            solid: "bg-cobalt-500",
            edge: "border-cobalt-700",
            soft: "bg-cobalt-50",
            text: "text-cobalt-700",
            border: "border-cobalt-200",
            ring: "ring-cobalt-200",
            gradient: "from-cobalt-300 to-cobalt-600",
        },
        offscreenTip:
            "U šetnji i u prodavnici pokažite ko radi i čime: „Ovo je pekar. On peče hleb.” Igrajte se uloga uz igračke — doktorka sa slušalicama, kuvar sa loncem. Pitajte: „Koga zovemo kad gori?” i naučite zajedno brojeve 192 (policija), 193 (vatrogasci) i 194 (hitna pomoć).",
        graded: true,
        // Zanimanja: alat, mesto rada, ko pomaže u kojoj nevolji, pa zagonetke
        ages: { min: 3, max: 8 },
        order: 31,
    },
    {
        id: "syllables",
        gameType: "syllables",
        activityId: 37,
        title: "Koliko slogova?",
        description: "Tapši slogove i prebroj ih",
        skill: "Slogovi i rano čitanje",
        icon: "🥁",
        image: "/images/kolikoslogova.svg",
        accent: {
            solid: "bg-saffron-500",
            edge: "border-saffron-700",
            soft: "bg-saffron-50",
            text: "text-saffron-700",
            border: "border-saffron-200",
            ring: "ring-saffron-200",
            gradient: "from-saffron-300 to-saffron-600",
        },
        offscreenTip:
            "Tapšite imena ukućana po slogovima: A-MAR, LEJ-LA, MA-MA. Za svaki slog jedan pljesak ili jedan skok. U šetnji tapšite ono što vidite: MA-ČKA, KU-ĆA, JA-BU-KA, pa pitajte: „Koja reč je duža?” Starije dete neka smisli reč sa tri sloga.",
        graded: true,
        // Slogovi uz tapšanje: od tapšanja uz glas do brojanja, razvrstavanja i prvog sloga
        ages: { min: 4, max: 8 },
        order: 32,
    },
    {
        id: "seasons",
        gameType: "seasons",
        activityId: 40,
        title: "Godišnja doba",
        description: "Proleće, leto, jesen, zima",
        skill: "Vreme i godišnji ciklus",
        icon: "🍂",
        image: "/images/godisnjadoba.svg",
        accent: {
            solid: "bg-rust-500",
            edge: "border-rust-700",
            soft: "bg-rust-50",
            text: "text-rust-700",
            border: "border-rust-200",
            ring: "ring-rust-200",
            gradient: "from-rust-300 to-rust-600",
        },
        offscreenTip:
            "Svakog meseca pogledajte zajedno kroz prozor i na kalendar: „Sad je jesen. Lišće pada.” Spremite kutiju sa stvarima za svako godišnje doba (kapa, kupaći, kišobran). Starije dete neka nabroji mesece redom i kaže u kom godišnjem dobu mu je rođendan.",
        graded: true,
        // Godišnja doba, delovi dana i meseci: od leta i zime do redosleda kroz celu godinu
        ages: { min: 4, max: 9 },
        order: 33,
    },
    {
        id: "traffic",
        gameType: "traffic",
        activityId: 42,
        title: "Saobraćaj",
        description: "Semafor, prelaz, kaciga i pojas",
        skill: "Bezbednost u saobraćaju",
        icon: "🚦",
        image: "/images/saobracaj.svg",
        accent: {
            solid: "bg-denim-500",
            edge: "border-denim-700",
            soft: "bg-denim-50",
            text: "text-denim-700",
            border: "border-denim-200",
            ring: "ring-denim-200",
            gradient: "from-denim-300 to-denim-600",
        },
        offscreenTip:
            "Svaki put kad prelazite ulicu, stanite na ivici i recite naglas: „Crveno — stojimo. Zeleno — idemo. Gledamo levo, desno, pa opet levo.” Pre vožnje neka dete samo veže pojas i stavi kacigu kad vozi bicikl. Usput pokazujte znakove: pešački prelaz, škola, STOP.",
        graded: true,
        // Bezbednost u saobraćaju: semafor, čekanje, prelaz, kaciga i pojas, pa znakovi
        ages: { min: 4, max: 10 },
        order: 34,
    },
];

export const ACTIVITY_IDS: number[] = GAMES.map((g) => g.activityId);

export const LEVELS_PER_TIER = 5;
export const MAX_LEVEL = 15;

export function getGame(id: GameId): GameDefinition {
    return GAMES.find((g) => g.id === id) ?? GAMES[0];
}

export function getGameByType(gameType: string): GameDefinition | undefined {
    return GAMES.find((g) => g.gameType === gameType);
}

export function getGameByActivityId(activityId: number): GameDefinition | undefined {
    return GAMES.find((g) => g.activityId === activityId);
}

// ── Uzrast i redosled ─────────────────────────────────────────────────────────

/** „3–5 god.” — diskretna oznaka uzrasta za roditelje. */
export function ageLabel(game: Pick<GameDefinition, "ages">): string {
    return `${game.ages.min}–${game.ages.max} god.`;
}

/**
 * Grupa igre za dete datog uzrasta: 0 = baš za taj uzrast, 1 = za mlađu decu (lako
 * ponavljanje), 2 = za stariju decu (teže; dolazi na kraju).
 */
function ageGroup(game: Pick<GameDefinition, "ages">, ageYears: number): 0 | 1 | 2 {
    if (ageYears < game.ages.min) return 2;
    if (ageYears > game.ages.max) return 1;
    return 0;
}

/**
 * Igre poređane za dete: prvo one namenjene njegovom uzrastu, pa igre za mlađu decu, pa
 * igre za stariju; u svakoj grupi od najlakše (ono što se uči prvo, `order`). Bez poznatog
 * uzrasta samo po redosledu učenja. Ne menja ulazni niz.
 */
export function sortGamesForChild<T extends Pick<GameDefinition, "ages" | "order">>(games: readonly T[], ageYears: number | null): T[] {
    const age = typeof ageYears === "number" && Number.isFinite(ageYears) ? ageYears : null;
    return [...games].sort((a, b) => {
        if (age !== null) {
            const group = ageGroup(a, age) - ageGroup(b, age);
            if (group !== 0) return group;
        }
        return a.order - b.order;
    });
}

// ── Raspoloženje ───────────────────────────────────────────────────────────────

export type Mood = "very_upset" | "upset" | "neutral" | "happy" | "very_happy";

export const MOODS: { value: Mood; emoji: string; label: string }[] = [
    { value: "very_upset", emoji: "😢", label: "Tužno" },
    { value: "upset", emoji: "😕", label: "Umorno" },
    { value: "neutral", emoji: "😐", label: "Okej" },
    { value: "happy", emoji: "😊", label: "Dobro" },
    { value: "very_happy", emoji: "😄", label: "Super" },
];

/** Kraća skala za decu: tri lica umesto pet (mlađa deca ne razlikuju pouzdano više stupnjeva). */
export const MOODS_THREE: { value: Mood; emoji: string; label: string }[] = [
    { value: "upset", emoji: "😢", label: "Tužno" },
    { value: "neutral", emoji: "😐", label: "Onako" },
    { value: "happy", emoji: "🙂", label: "Dobro" },
];

export function getMood(value: string | null | undefined) {
    return MOODS.find((m) => m.value === value);
}

// ── Zvezdice ──────────────────────────────────────────────────────────────────

export type SuccessLevel = "struggled" | "partial" | "successful" | "excellent";

/**
 * Zvezdice za završen nivo, na osnovu udela samostalno tačnih odgovora.
 * Završen nivo uvek donosi bar jednu zvezdicu: nema ishoda „nisi uspeo” —
 * kazna za grešku obeshrabruje, a ne uči (videti docs/istrazivanje.md).
 * 0 se vraća samo kada nivo nije ni odigran.
 */
export function starsFor(correct: number, total: number): 0 | 1 | 2 | 3 {
    if (total <= 0) return 0;
    const ratio = correct / total;
    if (ratio >= 0.8) return 3;
    if (ratio >= 0.5) return 2;
    return 1;
}

/**
 * Zvezdice za završen nivo određene igre. U igri bez pogrešnih odgovora (osećanja) svaki
 * završen nivo donosi sve tri: tamo „1 od 3” ne bi značilo ništa osim da je dete izabralo
 * ređe osećanje, a to nije greška.
 */
export function starsForGame(graded: boolean, correct: number, total: number): 0 | 1 | 2 | 3 {
    if (total <= 0) return 0;
    return graded ? starsFor(correct, total) : 3;
}

/** Da li se u igri sa ovim ID-jem aktivnosti nivoi „polažu” (nepoznata aktivnost: da). */
export function isGradedActivity(activityId: number): boolean {
    return GAMES.find((g) => g.activityId === activityId)?.graded ?? true;
}

/** Udeo samostalno tačnih odgovora posle kog se predlaže sledeći nivo (ispod toga: „probaj još jednom”). */
export const ADVANCE_RATIO = 0.5;

export function successLevelFor(stars: number): SuccessLevel {
    if (stars >= 3) return "excellent";
    if (stars === 2) return "successful";
    if (stars === 1) return "partial";
    return "struggled";
}
