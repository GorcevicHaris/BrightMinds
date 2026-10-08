// Sadržaj igre „Socijalne priče”: po jedna priča za svaki nivo (1–15).
//
// Pravila pisanja:
//  • Rečenice su kratke i konkretne, u drugom licu („Stigao si u školu”), izbori u prvom („Sednem u klupu”).
//  • Oblik koji zavisi od pola deteta piše se kao par {muški|ženski}, npr. "{Stigao|Stigla} si" — vidi `genderText()` u kit/utils.
//  • Svaka odluka ima jedan najbolji izbor (`right`) i jedan ili dva slabija (`wrong`).
//    `why` je kod najboljeg izbora pohvala sa objašnjenjem, a kod slabijeg kratko i blago „zašto ne”.
//  • Težina: nivoi 1–5 imaju 3 koraka i 2 izbora, 6–10 imaju 4–5 koraka i 3 izbora,
//    11–15 imaju 6 koraka i 3 suptilnija izbora (čekanje na red, traženje pomoći, promena plana, poraz u igri).

export type SceneTone = "sun" | "lilac" | "aqua" | "leaf" | "rose" | "sky" | "snow";

export interface StoryOption {
    emoji: string;
    label: string;
    why: string;
}

export interface StoryDecision {
    question: string;
    right: StoryOption;
    wrong: readonly StoryOption[];
}

export interface StoryStep {
    /** Emodžiji koji čine sliku: prvi je glavni, ostali su sporedni */
    scene: readonly string[];
    /** Rečenice priče za ovaj korak */
    text: string;
    /** Bez odluke korak je samo pripovedni i ne ulazi u ocenu */
    decision?: StoryDecision;
}

export interface Story {
    title: string;
    icon: string;
    tone: SceneTone;
    /** Slika na naslovnoj strani priče */
    cover: readonly string[];
    /** Jedna-dve rečenice koje najavljuju o čemu je priča */
    intro: string;
    steps: readonly StoryStep[];
}

const o = (emoji: string, label: string, why: string): StoryOption => ({ emoji, label, why });

export const STORIES: readonly Story[] = [
    // ── Laki nivoi (1–5): 3 koraka, 2 izbora ──────────────────────────────────
    {
        title: "Jutro",
        icon: "🌅",
        tone: "sun",
        cover: ["🌅", "🛏️", "🪥"],
        intro: "Ovo je priča o jutru. Jutro je početak dana.",
        steps: [
            {
                scene: ["🛏️", "☀️"],
                text: "Jutro je. {Probudio|Probudila} si se u svom krevetu.",
                decision: {
                    question: "Šta radiš prvo?",
                    right: o("🚿", "Umijem se", "Voda te razbudi. Čisto lice je lep početak dana."),
                    wrong: [o("📱", "Gledam telefon", "Telefon može da sačeka. Ujutru se prvo umijemo.")],
                },
            },
            {
                scene: ["🥣", "🥛"],
                text: "Sada si {čist|čista}. Stomak ti je prazan. Vreme je za doručak.",
                decision: {
                    question: "Šta jedeš za doručak?",
                    right: o("🥣", "Kašu i mleko", "Kaša i mleko ti daju snagu za ceo dan."),
                    wrong: [o("🍰", "Tortu", "Torta je za posebne dane. Ujutru nam treba hrana koja daje snagu.")],
                },
            },
            {
                scene: ["🎒", "👟"],
                text: "Doručak je gotov. Uskoro krećeš u školu.",
                decision: {
                    question: "Šta stavljaš u ranac?",
                    right: o("📓", "Svesku", "Sveska ti treba u školi. Sada je ranac spreman."),
                    wrong: [o("🧸", "Igračku", "Igračka ostaje kod kuće i čeka te. U ranac idu stvari za školu.")],
                },
            },
        ],
    },
    {
        title: "Škola",
        icon: "🏫",
        tone: "lilac",
        cover: ["🏫", "🎒", "📚"],
        intro: "Ovo je priča o školi. U školi učimo i družimo se.",
        steps: [
            {
                scene: ["🏫", "🔔"],
                text: "{Stigao|Stigla} si u školu. Zvono zvoni. Čas počinje.",
                decision: {
                    question: "Šta radiš?",
                    right: o("🪑", "Sednem u klupu", "Kad sediš u klupi, {spreman|spremna} si za čas."),
                    wrong: [o("🏃", "Trčim po hodniku", "Na hodniku možemo da se sudarimo. U školi hodamo polako.")],
                },
            },
            {
                scene: ["👩‍🏫", "📖"],
                text: "Učiteljica priča pred tablom. Sva deca je gledaju.",
                decision: {
                    question: "Šta radiš dok učiteljica priča?",
                    right: o("👂", "Slušam", "Kad slušaš, čuješ sve što je važno."),
                    wrong: [o("🗣️", "Pričam sa drugom", "Kad pričamo, ne čujemo učiteljicu. Sa drugom pričamo na odmoru.")],
                },
            },
            {
                scene: ["🙋", "💡"],
                text: "Učiteljica pita nešto. Ti znaš odgovor!",
                decision: {
                    question: "Šta radiš kad znaš odgovor?",
                    right: o("✋", "Podignem ruku", "Kad podigneš ruku, učiteljica zna da želiš da odgovoriš."),
                    wrong: [o("📣", "Viknem odgovor", "Vikanje smeta drugoj deci. Podignemo ruku i sačekamo.")],
                },
            },
        ],
    },
    {
        title: "Stomatolog",
        icon: "🦷",
        tone: "aqua",
        cover: ["🦷", "🪥", "😁"],
        intro: "Ovo je priča o zubima. Zdravi zubi su jaki i beli.",
        steps: [
            {
                scene: ["🦷", "🪥"],
                text: "Zubima jedemo i smejemo se. Zato ih čuvamo.",
                decision: {
                    question: "Kada peremo zube?",
                    right: o("☀️🌙", "Ujutru i uveče", "Zube peremo dva puta svakog dana: ujutru i uveče."),
                    wrong: [o("🎂", "Samo na rođendan", "To je premalo. Zubi vole da budu čisti svakog dana.")],
                },
            },
            {
                scene: ["🪥", "⏱️"],
                text: "Uzimaš četkicu i pastu. Pereš zube polako.",
                decision: {
                    question: "Koliko dugo pereš zube?",
                    right: o("⏱️", "Dva minuta", "Za dva minuta svaki zub postane čist."),
                    wrong: [o("⚡", "Pet sekundi", "Pet sekundi je prekratko. Zubi ne stignu da se operu.")],
                },
            },
            {
                scene: ["👩‍⚕️", "🦷"],
                text: "Stomatolog je doktor za zube. On gleda da li su zubi zdravi.",
                decision: {
                    question: "Kada idemo kod stomatologa?",
                    right: o("📆", "Redovno", "Kad idemo redovno, stomatolog pomaže da zubi ostanu zdravi."),
                    wrong: [o("😣", "Samo kad zub boli", "Ne čekamo da zub zaboli. Stomatolog pomaže da do bola i ne dođe.")],
                },
            },
        ],
    },
    {
        title: "Prodavnica",
        icon: "🛒",
        tone: "leaf",
        cover: ["🛒", "🍎", "🥖"],
        intro: "Ovo je priča o prodavnici. U prodavnici kupujemo hranu.",
        steps: [
            {
                scene: ["🛒", "📝"],
                text: "Ideš sa mamom u prodavnicu. Treba da kupite hleb, mleko i sir.",
                decision: {
                    question: "Šta vam pomaže da ništa ne zaboravite?",
                    right: o("📋", "Spisak", "Na spisku piše sve što treba da kupimo."),
                    wrong: [o("🎮", "Video-igra", "Igra je za kasnije. U prodavnici nam pomaže spisak.")],
                },
            },
            {
                scene: ["🧀", "🥛"],
                text: "Na spisku piše: sir. Tražite sir na policama.",
                decision: {
                    question: "Gde stoji sir?",
                    right: o("🥛", "Kod mleka i jogurta", "Sir se pravi od mleka. Zato stoji kod mleka i jogurta."),
                    wrong: [o("🍭", "Kod slatkiša", "Kod slatkiša su bombone i čokolade. Sir je na drugom mestu.")],
                },
            },
            {
                scene: ["🛒", "💳"],
                text: "Korpa je puna. {Stigao|Stigla} si sa mamom do kase.",
                decision: {
                    question: "Šta radite na kasi?",
                    right: o("💰", "Platimo", "Sve što uzmemo u prodavnici prvo platimo na kasi."),
                    wrong: [o("🚪", "Odemo bez plaćanja", "Stvari iz prodavnice nisu naše dok ih ne platimo.")],
                },
            },
        ],
    },
    {
        title: "Park",
        icon: "🌳",
        tone: "leaf",
        cover: ["🌳", "⚽", "☀️"],
        intro: "Ovo je priča o parku. U parku se igramo napolju.",
        steps: [
            {
                scene: ["🌳", "☀️"],
                text: "Leto je. Sunce jako sija. Ideš u park da se igraš.",
                decision: {
                    question: "Šta stavljaš pre igre na suncu?",
                    right: o("🧴", "Kremu za sunce", "Krema čuva kožu od jakog sunca."),
                    wrong: [o("🧥", "Zimsku jaknu", "U jakni bi ti bilo previše vruće. Leti kožu čuva krema za sunce.")],
                },
            },
            {
                scene: ["⚽", "💦"],
                text: "{Trčao|Trčala} si i {igrao|igrala} se. Vruće ti je i {žedan|žedna} si.",
                decision: {
                    question: "Šta radiš kad si {žedan|žedna}?",
                    right: o("💧", "Pijem vodu", "Voda te rashladi i vrati ti snagu."),
                    wrong: [o("🍔", "Jedem hamburger", "Hamburger ne gasi žeđ. Kad smo žedni, pijemo vodu.")],
                },
            },
            {
                scene: ["🌆", "🏠"],
                text: "Polako pada mrak. Mama te zove: „Idemo kući!”",
                decision: {
                    question: "Šta radiš kad te mama zove?",
                    right: o("🏠", "Idem kući sa mamom", "Kad padne mrak, igra je gotova. Sutra možeš opet u park."),
                    wrong: [o("🌙", "Ostanem u parku", "U mraku se ne vidi dobro. Sa mamom idemo kući.")],
                },
            },
        ],
    },

    // ── Srednji nivoi (6–10): 4–5 koraka, 3 izbora ────────────────────────────
    {
        title: "Kod doktora",
        icon: "🏥",
        tone: "aqua",
        cover: ["🏥", "🩺", "🌡️"],
        intro: "Ovo je priča o odlasku kod doktora. Doktor nam pomaže da ozdravimo.",
        steps: [
            {
                scene: ["🤒", "🌡️"],
                text: "Jutros te boli grlo. Vruće ti je i nemaš snage.",
                decision: {
                    question: "Šta radiš kad se ne osećaš dobro?",
                    right: o("🗣️", "Kažem mami", "Mama ne može da zna da te boli ako joj ne kažeš. Sada može da ti pomogne."),
                    wrong: [
                        o("🤫", "Ćutim", "Ako ćutiš, niko ne zna da te boli. Bolje je da kažeš."),
                        o("🛏️", "Sakrijem se u sobu", "Skrivanje ne leči grlo. Mama treba da zna kako ti je."),
                    ],
                },
            },
            {
                scene: ["🏥", "🪑"],
                text: "Mama te vodi kod doktora. U čekaonici ima još dece. Svi čekaju svoj red.",
                decision: {
                    question: "Šta radiš u čekaonici?",
                    right: o("📚", "Sedim i gledam slikovnicu", "Dok čekaš, možeš mirno da gledaš slikovnicu. Tvoj red će doći."),
                    wrong: [
                        o("🏃", "Trčim po čekaonici", "U čekaonici su deca koja su bolesna. Njima treba mir."),
                        o("🚪", "Uđem kod doktora preko reda", "Doktor prima decu po redu. I tvoj red će doći."),
                    ],
                },
            },
            {
                scene: ["👨‍⚕️", "🩺"],
                text: "Doktor te zove u ordinaciju. Kaže: „Otvori usta i reci A.”",
                decision: {
                    question: "Šta radiš?",
                    right: o("😮", "Otvorim usta i kažem A", "Tako doktor vidi tvoje grlo. Pregled kratko traje."),
                    wrong: [
                        o("🤐", "Stisnem usta", "Kad su usta zatvorena, doktor ne vidi grlo i ne može da pomogne."),
                        o("😱", "Vrištim", "Pregled grla ne boli. Ako te je strah, reci to doktoru ili mami."),
                    ],
                },
            },
            {
                scene: ["💊", "🥄"],
                text: "Doktor ti daje sirup. Sirup je lek koji leči grlo.",
                decision: {
                    question: "Šta radiš sa lekom?",
                    right: o("✅", "Popijem lek kad mi mama da", "Lek ti pomaže da ozdraviš. Lek pijemo samo kad nam ga da odrasla osoba."),
                    wrong: [
                        o("🚮", "Bacim lek", "Bez leka grlo duže boli. Lek je tu da pomogne."),
                        o("🥤", "Popijem ceo sirup odjednom", "Previše leka nije dobro. Mama zna koliko leka treba."),
                    ],
                },
            },
            {
                scene: ["😊", "🏠"],
                text: "Posle nekoliko dana grlo te više ne boli. {Ozdravio|Ozdravila} si! Pomogli su ti mama, doktor i lek.",
            },
        ],
    },
    {
        title: "Restoran",
        icon: "🍽️",
        tone: "sun",
        cover: ["🍽️", "🍲", "🥤"],
        intro: "Ovo je priča o ručku u restoranu. U restoranu jedemo zajedno sa drugim ljudima.",
        steps: [
            {
                scene: ["🍽️", "🪑"],
                text: "Ideš sa porodicom na ručak u restoran. Konobar vam pokazuje sto.",
                decision: {
                    question: "Šta radiš?",
                    right: o("🪑", "Sednem za sto", "Za stolom sediš sa porodicom i čekaš ručak."),
                    wrong: [
                        o("🏃", "Trčim između stolova", "Konobari nose toplu hranu. Ako trčiš, možete da se sudarite."),
                        o("🙈", "Sakrijem se ispod stola", "Ispod stola ne možeš da jedeš. U restoranu sedimo na stolici."),
                    ],
                },
            },
            {
                scene: ["🤵", "📋"],
                text: "Konobar dolazi i pita: „Šta želiš da jedeš?”",
                decision: {
                    question: "Kako naručuješ?",
                    right: o("🙂", "Kažem: „Supu, molim vas.”", "Kad lepo zamoliš, konobar te razume i rado ti donese jelo."),
                    wrong: [
                        o("😤", "Viknem: „Daj supu!”", "Vikanje nije prijatno. Lepše je kad kažemo „molim vas”."),
                        o("🤐", "Ćutim i gledam u pod", "Ako ćutiš, konobar ne zna šta želiš. Možeš da kažeš ili da pokažeš na jelovniku."),
                    ],
                },
            },
            {
                scene: ["⏳", "🍲"],
                text: "Hrana još nije stigla. Kuvar je sprema u kuhinji. To traje malo duže.",
                decision: {
                    question: "Šta radiš dok čekaš?",
                    right: o("🖍️", "Crtam ili pričam sa porodicom", "Čekanje brže prođe kad crtaš ili pričaš. Hrana uskoro stiže."),
                    wrong: [
                        o("🥄", "Lupam kašikom o sto", "Lupanje smeta ljudima za drugim stolovima."),
                        o("😫", "Vičem da sam {gladan|gladna}", "Kuvar kuva najbrže što može. Vikanje ne ubrzava ručak."),
                    ],
                },
            },
            {
                scene: ["😋", "🧻"],
                text: "Ručak je bio ukusan. {Završio|Završila} si jelo. Ruke i usta su ti masni.",
                decision: {
                    question: "Šta radiš posle jela?",
                    right: o("🧻", "Obrišem ruke i usta salvetom", "Uz salvetu su ruke i usta čisti posle jela."),
                    wrong: [
                        o("👕", "Obrišem ruke o majicu", "Majica se tako isprlja. Za brisanje imamo salvetu."),
                        o("🏃", "Odmah ustanem i odem", "Prvo se obrišemo i sačekamo porodicu. Iz restorana izlazimo zajedno."),
                    ],
                },
            },
        ],
    },
    {
        title: "Vatra i bezbednost",
        icon: "🚒",
        tone: "rose",
        cover: ["🚒", "👨‍🚒", "🔔"],
        intro: "Ovo je priča o vatri. Kad znamo šta treba da radimo, ostajemo bezbedni.",
        steps: [
            {
                scene: ["🍳", "♨️"],
                text: "Mama kuva ručak. Šporet je uključen. Ne znaš da li je ringla vruća.",
                decision: {
                    question: "Kako saznaješ da li je vruće?",
                    right: o("🙋", "Pitam odraslu osobu", "Odrasli znaju šta je vruće. Kad pitaš, ostaješ {bezbedan|bezbedna}."),
                    wrong: [
                        o("🤚", "Dotaknem da proverim", "Vruća ringla može da opeče ruku. Ne proveravamo dodirom."),
                        o("🧸", "Stavim igračku na šporet", "Igračka može da se istopi. Šporet nije mesto za igračke."),
                    ],
                },
            },
            {
                scene: ["🏫", "🔔"],
                text: "U školi zvoni glasno zvono. To je vežba za slučaj požara. Zvono je glasno, ali nije opasno. Ako ti smeta, pokrij uši rukama.",
                decision: {
                    question: "Šta radiš kad čuješ to zvono?",
                    right: o("🚶", "Stanem u red i pratim učiteljicu", "Učiteljica zna put napolje. U redu svi izlazimo mirno i brzo."),
                    wrong: [
                        o("🙉", "Sakrijem se ispod klupe", "Ispod klupe te učiteljica ne vidi. Bezbedno je da izađeš sa odeljenjem."),
                        o("🎒", "Pakujem sve stvari u ranac", "Stvari mogu da sačekaju. Najvažnije je da brzo izađemo."),
                    ],
                },
            },
            {
                scene: ["🏠", "💨"],
                text: "Ovo se dešava retko, ali je dobro da znaš: nekad se u kući može pojaviti dim.",
                decision: {
                    question: "Šta radiš ako u kući vidiš dim?",
                    right: o("🚪", "Izađem napolje i zovem odrasle", "Kad ima dima, najbezbednije je napolju. Odrasli će pomoći."),
                    wrong: [
                        o("🧸", "Idem po svoje igračke", "Igračke ostavljamo. Najvažnije je da ti budeš napolju, na sigurnom."),
                        o("🛏️", "Sakrijem se ispod kreveta", "Ispod kreveta te niko ne vidi. Kad ima dima, izlazimo napolje."),
                    ],
                },
            },
            {
                scene: ["📞", "🚒"],
                text: "Napolju si, na sigurnom. Odrasli telefonom zovu pomoć.",
                decision: {
                    question: "Koga zovemo kad je požar?",
                    right: o("🚒", "Vatrogasce, na broj 193", "Vatrogasci gase vatru. Njihov broj je 193."),
                    wrong: [
                        o("🍕", "Piceriju", "Piceriju zovemo kad smo gladni. Vatru gase vatrogasci."),
                        o("🦷", "Zubara", "Zubar čuva zube. Vatru gase vatrogasci."),
                    ],
                },
            },
            {
                scene: ["🚒", "👨‍🚒"],
                text: "Vatrogasci stižu brzo i gase vatru. Svi su bezbedni. Sada znaš šta treba da radiš.",
            },
        ],
    },
    {
        title: "Rođendan",
        icon: "🥳",
        tone: "rose",
        cover: ["🎂", "🎈", "🎁"],
        intro: "Ovo je priča o tvom rođendanu. Na rođendan dolaze gosti.",
        steps: [
            {
                scene: ["🚪", "🎈"],
                text: "Danas je tvoj rođendan! Čuje se zvono na vratima. Stigli su prvi gosti.",
                decision: {
                    question: "Šta radiš kad stignu gosti?",
                    right: o("👋", "Pozdravim goste", "Gosti su došli zbog tebe. Kad ih pozdraviš, osećaju se lepo."),
                    wrong: [
                        o("🙈", "Sakrijem se u sobu", "Gosti bi te tražili. Ako ti je previše bučno, reci mami da ti treba mali odmor."),
                        o("📺", "Nastavim da gledam crtani", "Crtani može da sačeka. Gosti su došli da se druže sa tobom."),
                    ],
                },
            },
            {
                scene: ["🎁", "📕"],
                text: "Drugarica Mila ti daje poklon. U poklonu je knjiga. Ti si {želeo|želela} nešto drugo.",
                decision: {
                    question: "Šta kažeš Mili?",
                    right: o("🙏", "„Hvala, Mila!”", "Mila je birala poklon baš za tebe. Kad kažeš hvala, ona je srećna."),
                    wrong: [
                        o("😠", "„Ovo mi se ne sviđa.”", "Te reči bi rastužile Milu. Trudila se da te obraduje."),
                        o("🗑️", "Bacim poklon", "Poklon je znak da te neko voli. Poklone čuvamo."),
                    ],
                },
            },
            {
                scene: ["🎂", "🕯️"],
                text: "Stiže torta sa svećicama. Svi pevaju „Srećan rođendan”. Ako ti je pesma preglasna, možeš da pokriješ uši.",
                decision: {
                    question: "Kada duvaš svećice?",
                    right: o("💨", "Kad se pesma završi", "Kad se pesma završi, duneš svećice i svi ti tapšu."),
                    wrong: [
                        o("🎶", "Usred pesme", "Gosti žele da otpevaju pesmu do kraja. Svećice duvamo na kraju."),
                        o("☝️", "Prvo gurnem prst u tortu", "Torta je za sve goste. Jedemo je kad se iseče."),
                    ],
                },
            },
            {
                scene: ["🍰", "🍽️"],
                text: "Mama seče tortu. Sva deca žele parče.",
                decision: {
                    question: "Šta radiš dok mama deli tortu?",
                    right: o("⏳", "Čekam svoj red", "Svako dobija svoje parče. I tvoje stiže."),
                    wrong: [
                        o("✊", "Otmem prvo parče", "Otimanje može da prospe tortu. Mama deli svima redom."),
                        o("🍰", "Uzmem dva parčeta", "Tako neko može da ostane bez torte. Prvo svako dobije po jedno parče."),
                    ],
                },
            },
            {
                scene: ["👋", "🎈"],
                text: "Žurka je gotova. Gosti polaze kući.",
                decision: {
                    question: "Šta kažeš gostima?",
                    right: o("😊", "„Hvala što ste došli!”", "Lepo je zahvaliti se gostima. Tako znaju da ti je bilo drago."),
                    wrong: [
                        o("🚪", "Odem u sobu bez pozdrava", "Gosti bi mislili da ti nije bilo lepo. Kažemo im doviđenja."),
                        o("😢", "Vičem da ne smeju da idu", "Svaka žurka ima kraj. Sa drugarima ćeš se videti opet."),
                    ],
                },
            },
        ],
    },
    {
        title: "Kućni ljubimac",
        icon: "🐶",
        tone: "leaf",
        cover: ["🐶", "🦴", "❤️"],
        intro: "Ovo je priča o psu Žući. O ljubimcu brinemo svakog dana.",
        steps: [
            {
                scene: ["🐶", "🥣"],
                text: "Tvoj pas Žuća stoji pored prazne činije. Gladan je.",
                decision: {
                    question: "Šta mu daješ da jede?",
                    right: o("🦴", "Hranu za pse", "Hrana za pse je zdrava za Žuću. Od nje je jak i veseo."),
                    wrong: [
                        o("🍫", "Čokoladu", "Čokolada je opasna za pse. Od nje ih boli stomak."),
                        o("🍟", "Svoj pomfrit", "Slana hrana za ljude nije dobra za pse. Žuća ima svoju hranu."),
                    ],
                },
            },
            {
                scene: ["🐕", "🚪"],
                text: "Žuća stoji kod vrata i maše repom. Želi napolje.",
                decision: {
                    question: "Šta radiš?",
                    right: o("🦮", "Idemo u šetnju na povocu", "Psu treba šetnja svakog dana. Na povocu je bezbedan."),
                    wrong: [
                        o("😡", "Viknem na njega", "Žuća se uplaši kad vičemo. On samo pokazuje šta mu treba."),
                        o("🚪", "Pustim ga samog napolje", "Sam na ulici može da se izgubi. Pas ide napolje sa nama."),
                    ],
                },
            },
            {
                scene: ["🐩", "🌳"],
                text: "U parku vidiš psa kog ne poznaješ. Lep je i čupav.",
                decision: {
                    question: "Šta radiš kad želiš da ga pomaziš?",
                    right: o("🙋", "Pitam vlasnika da li smem", "Ne znamo da li nepoznat pas voli maženje. Njegov vlasnik to zna."),
                    wrong: [
                        o("🤗", "Odmah ga zagrlim", "Nepoznat pas može da se uplaši. Prvo pitamo vlasnika."),
                        o("✊", "Povučem ga za rep", "To psa boli. Životinje diramo nežno i samo kad nam dozvole."),
                    ],
                },
            },
            {
                scene: ["🐶", "💤"],
                text: "Posle šetnje Žuća je umoran. Leži u svojoj korpi i spava.",
                decision: {
                    question: "Šta radiš dok Žuća spava?",
                    right: o("🤫", "Pustim ga da spava", "I psima treba odmor. Kad se naspava, opet ćete se igrati."),
                    wrong: [
                        o("🔊", "Probudim ga da se igramo", "Žuća je umoran. Igraćete se kad se probudi."),
                        o("🛏️", "Legnem preko njega", "To bi ga zabolelo i uplašilo. Psa ne diramo dok spava."),
                    ],
                },
            },
            {
                scene: ["🐶", "❤️"],
                text: "Žuća se probudio i veselo maše repom. Srećan je jer lepo brineš o njemu.",
            },
        ],
    },

    // ── Teški nivoi (11–15): 6 koraka, 3 suptilnija izbora ────────────────────
    {
        title: "Putovanje vozom",
        icon: "🚆",
        tone: "sky",
        cover: ["🚆", "🎫", "🧳"],
        intro: "Ovo je priča o putovanju vozom. Na putu nekad nešto ne ide po planu. I to je u redu.",
        steps: [
            {
                scene: ["🚉", "🕐"],
                text: "Sa tatom čekaš voz na stanici. Na tabli piše da voz kasni deset minuta.",
                decision: {
                    question: "Šta radiš kad voz kasni?",
                    right: o("🪑", "Sednem na klupu i čekam sa tatom", "Vozovi nekad kasne i to nije ničija greška. Čekanje prođe i voz stigne."),
                    wrong: [
                        o("😤", "Ljutim se i vičem", "Voz ne dolazi brže kad vičemo. Možeš tati da kažeš da ti je teško da čekaš."),
                        o("🛤️", "Priđem šinama da vidim voz", "Blizu šina je opasno. Stojimo iza žute linije."),
                    ],
                },
            },
            {
                scene: ["🚆", "🎫"],
                text: "Voz je stigao i ulazite. Kroz vagon prolazi kondukter i gleda karte.",
                decision: {
                    question: "Šta radiš kad kondukter dođe do tebe?",
                    right: o("🎟️", "Pokažem kartu", "Karta pokazuje da smeš da putuješ ovim vozom."),
                    wrong: [
                        o("🙈", "Sakrijem kartu", "Kondukter mora da vidi kartu. To je njegov posao."),
                        o("🏃", "Pobegnem u drugi vagon", "U vozu ostajemo uz tatu. Kondukter samo želi da vidi kartu."),
                    ],
                },
            },
            {
                scene: ["💺", "👵"],
                text: "Tražite svoja mesta. Na tvom sedištu pored prozora sedi jedna baka.",
                decision: {
                    question: "Šta radiš kad je tvoje mesto zauzeto?",
                    right: o("🗣️", "Kažem tati, pa lepo pitamo baku", "Baka je možda pogrešila mesto. Kad lepo pitamo, sve se brzo reši."),
                    wrong: [
                        o("😠", "Viknem: „To je moje mesto!”", "Baka nije namerno sela tu. Vikanje bi je uplašilo."),
                        o("👉", "Povučem baku za rukav", "Vući nekoga nije lepo. Problem rešavamo rečima, uz tatinu pomoć."),
                    ],
                },
            },
            {
                scene: ["🤫", "😴"],
                text: "Voz kreće. Putnici oko tebe čitaju ili spavaju.",
                decision: {
                    question: "Kako se ponašaš u vozu?",
                    right: o("🤫", "Sedim i tiho gledam kroz prozor", "Kad si {tih|tiha}, svi putnici mogu da se odmore."),
                    wrong: [
                        o("🤸", "Skačem po sedištu", "Voz se ljulja i možeš da padneš. U vozu sedimo."),
                        o("📢", "Pevam glasno", "Glasna pesma budi putnike koji spavaju. Pevaćeš kad stignete."),
                    ],
                },
            },
            {
                scene: ["🚻", "🚆"],
                text: "Put dugo traje. Odjednom moraš u toalet.",
                decision: {
                    question: "Šta radiš?",
                    right: o("🙋", "Kažem tati da moram u toalet", "Tata zna gde je toalet u vozu i ići će sa tobom."),
                    wrong: [
                        o("🚶", "{Sam|Sama} odem da tražim toalet", "Voz je dugačak i lako je izgubiti se. Prvo kažemo tati."),
                        o("😣", "Trpim i ne kažem ništa", "Od trpljenja boli stomak. Uvek smeš da kažeš da moraš u toalet."),
                    ],
                },
            },
            {
                scene: ["🚉", "😊"],
                text: "Voz staje. Stigli ste! Voz je kasnio, ali ti si mirno {čekao|čekala}. Bilo je to lepo putovanje.",
            },
        ],
    },
    {
        title: "Pregled kod lekara",
        icon: "👨‍⚕️",
        tone: "aqua",
        cover: ["👨‍⚕️", "🩺", "💉"],
        intro: "Ovo je priča o pregledu kod lekara. Na pregledu nekad osetimo strah. To je u redu.",
        steps: [
            {
                scene: ["🏥", "🪑"],
                text: "Dolaziš sa mamom na pregled. U čekaonici čeka još troje dece. Oni su došli pre tebe.",
                decision: {
                    question: "Kada ti ulaziš kod lekara?",
                    right: o("⏳", "Kad dođe moj red", "Deca koja su došla ranije ulaze prva. Posle njih si ti na redu."),
                    wrong: [
                        o("🚪", "Odmah, pre svih", "Druga deca čekaju duže od tebe. To ne bi bilo pravedno."),
                        o("🏠", "Nikad, idem kući", "Pregled je važan za tvoje zdravlje. Čekanje prođe."),
                    ],
                },
            },
            {
                scene: ["🕐", "👩‍⚕️"],
                text: "Sestra izlazi i kaže: „Doktor kasni. Čekaćete još malo.” Plan se promenio.",
                decision: {
                    question: "Šta radiš kad se plan promeni?",
                    right: o("🌬️", "Duboko udahnem i pitam mamu koliko još", "Promena plana je neprijatna, ali prođe. Kad znaš koliko još, lakše je čekati."),
                    wrong: [
                        o("😡", "Bacim se na pod", "Na podu čekanje ne prolazi brže. Možeš mami da kažeš da ti je teško."),
                        o("✊", "Lupam na doktorova vrata", "Doktor sada pomaže drugom detetu. Lupanje ga ometa."),
                    ],
                },
            },
            {
                scene: ["🩺", "👨‍⚕️"],
                text: "Došao je tvoj red. Doktor ti stavlja stetoskop na leđa. Stetoskop je malo hladan.",
                decision: {
                    question: "Šta radiš dok te doktor sluša?",
                    right: o("😌", "Dišem duboko i polako", "Kad dišeš duboko, doktor lepo čuje tvoja pluća."),
                    wrong: [
                        o("🏃", "Pobegnem sa stolice", "Stetoskop je hladan samo na početku. Ne boli i brzo je gotovo."),
                        o("🗣️", "Pričam sve vreme", "Kad pričaš, doktor ne čuje pluća. Pričaćete posle."),
                    ],
                },
            },
            {
                scene: ["💉", "😟"],
                text: "Doktor kaže: „Danas dobijaš vakcinu.” Ti se plašiš igle.",
                decision: {
                    question: "Šta radiš kad se plašiš?",
                    right: o("🤝", "Kažem da me je strah i držim mamu za ruku", "Strah je u redu. Kad kažeš da te je strah, mama i doktor ti pomažu. Ubod traje kratko."),
                    wrong: [
                        o("🤐", "Ne kažem nikom i trpim", "Ne moraš da trpiš u tišini. Kad kažeš da te je strah, odrasli ti pomognu."),
                        o("🙅", "Mašem rukama da me ne dotaknu", "Kad se ruka pomera, ubod može više da zaboli. Kad je ruka mirna, brzo je gotovo."),
                    ],
                },
            },
            {
                scene: ["💊", "🥤"],
                text: "Kod kuće treba da popiješ lek. Lek je gorak i ne sviđa ti se.",
                decision: {
                    question: "Šta radiš sa gorkim lekom?",
                    right: o("🥤", "Popijem lek, pa onda vodu", "Uz vodu gorak ukus brzo prođe. Lek ti pomaže da budeš {zdrav|zdrava}."),
                    wrong: [
                        o("🤮", "Ispljunem lek", "Ispljunut lek ne može da pomogne. Voda posle leka spira gorak ukus."),
                        o("🌱", "Sipam lek u saksiju", "Lek je za tebe, a ne za cveće. Ako je gorak, reci mami i ona će pomoći."),
                    ],
                },
            },
            {
                scene: ["🏅", "😊"],
                text: "Pregled je gotov. Bilo je čekanja i malo straha, ali ti si {uspeo|uspela}. Možeš da budeš {ponosan|ponosna}.",
            },
        ],
    },
    {
        title: "Likovna radionica",
        icon: "🎨",
        tone: "lilac",
        cover: ["🎨", "🖍️", "✂️"],
        intro: "Ovo je priča o likovnoj radionici. Tu crtamo, sečemo i delimo pribor.",
        steps: [
            {
                scene: ["🎨", "🖍️"],
                text: "U radionici svako crta svoju sliku. Ti želiš crvenu bojicu. Crvenu baš sada koristi Ana.",
                decision: {
                    question: "Šta radiš kad neko koristi ono što ti treba?",
                    right: o("🙋", "Pitam: „Ana, mogu li posle tebe?”", "Kad lepo pitaš i sačekaš, Ana ti rado da bojicu."),
                    wrong: [
                        o("✊", "Uzmem joj bojicu iz ruke", "Ana bi se rastužila i naljutila. Bojice delimo tako što pitamo."),
                        o("😞", "Odustanem od crtanja", "Ne moraš da odustaneš. Dok čekaš crvenu, možeš da crtaš drugom bojom."),
                    ],
                },
            },
            {
                scene: ["✂️", "📄"],
                text: "Sada treba da isečeš krug od papira. Makaze su oštre.",
                decision: {
                    question: "Kako sečeš makazama?",
                    right: o("👀", "Sedim, gledam u papir i sečem polako", "Kad gledaš i sečeš polako, prsti su bezbedni."),
                    wrong: [
                        o("🙈", "Sečem brzo, bez gledanja", "Bez gledanja makaze mogu da poseku prst."),
                        o("🚶", "Hodam sa makazama u ruci", "Ako se sapleteš, makaze mogu da te povrede. Sa makazama sedimo."),
                    ],
                },
            },
            {
                scene: ["😕", "✂️"],
                text: "Krug ti nije ispao lepo. Papir se iskrivio. To te nervira.",
                decision: {
                    question: "Šta radiš kad ti nešto ne ide?",
                    right: o("🙋", "Zamolim učiteljicu za pomoć", "Svakome nekad treba pomoć. Tražiti pomoć je pametno."),
                    wrong: [
                        o("🗑️", "Zgužvam i bacim sve", "Trud ne bacamo zbog jedne greške. Greška može da se popravi."),
                        o("😭", "Kažem da ništa ne umem", "To nije tačno. Sečenje je teško i uči se polako. Uz malo pomoći ide lakše."),
                    ],
                },
            },
            {
                scene: ["🖼️", "💧"],
                text: "Drug Luka slučajno prospe vodu. Voda kvasi ugao tvog crteža. Luka kaže: „Izvini!”",
                decision: {
                    question: "Šta kažeš Luki?",
                    right: o("🤝", "„U redu je, bilo je slučajno.”", "Luka nije hteo da pokvari crtež. Kad oprostiš, ostajete drugari, a crtež se osuši."),
                    wrong: [
                        o("😡", "Vičem na Luku", "Luka se već izvinio. Bilo je slučajno, a ne namerno."),
                        o("💦", "Prospem vodu na njegov crtež", "Tada bi bila dva pokvarena crteža i dva tužna druga."),
                    ],
                },
            },
            {
                scene: ["🖼️", "👏"],
                text: "Crteži su gotovi. Učiteljica danas bira Anin crtež za zid. Tvoj crtež nije izabran.",
                decision: {
                    question: "Šta radiš kad je izabran tuđi crtež?",
                    right: o("👏", "Kažem Ani: „Bravo!”", "Lepo je radovati se tuđem uspehu. Tvoj crtež je i dalje lep, a biće još prilika."),
                    wrong: [
                        o("📄", "Pocepam svoj crtež", "Tvoj crtež vredi i kad nije na zidu. Možeš da ga odneseš kući."),
                        o("😠", "Kažem da je Anin crtež ružan", "Te reči bi povredile Anu. Možeš da budeš {tužan|tužna}, a da ipak lepo govoriš."),
                    ],
                },
            },
            {
                scene: ["🧹", "🗑️"],
                text: "Radionica je gotova. Na stolu su papirići, bojice i lepak.",
                decision: {
                    question: "Šta radiš na kraju radionice?",
                    right: o("🧹", "Pospremim svoje mesto", "Kad svako pospremi svoje mesto, radionica je spremna za sledeći put."),
                    wrong: [
                        o("🏃", "Samo odem", "Tada bi neko drugi morao da čisti za tobom. Svako sprema svoje mesto."),
                        o("💥", "Gurnem sve na pod", "Na podu se pribor gubi i lomi. Stvari vraćamo na mesto."),
                    ],
                },
            },
        ],
    },
    {
        title: "Bazen",
        icon: "🏊",
        tone: "sky",
        cover: ["🏊", "🩱", "💦"],
        intro: "Ovo je priča o bazenu. Na bazenu važe pravila koja čuvaju sve plivače.",
        steps: [
            {
                scene: ["🩱", "🚿"],
                text: "Dolaziš sa tatom na bazen. U svlačionici oblačiš kupaći. Tu su i tuševi.",
                decision: {
                    question: "Šta radiš pre ulaska u bazen?",
                    right: o("🚿", "Istuširam se", "Tuš spira prašinu i znoj. Tako voda u bazenu ostaje čista za sve."),
                    wrong: [
                        o("👟", "Uđem u vodu u patikama", "Patike prljaju vodu i teške su kad se pokvase. U vodu ulazimo bosi."),
                        o("🤸", "Odmah skočim u vodu", "Prvo tuš, pa bazen. To pravilo važi za sve plivače."),
                    ],
                },
            },
            {
                scene: ["⚠️", "💦"],
                text: "Pod pored bazena je mokar. Drug te zove sa druge strane: „Dođi brzo!”",
                decision: {
                    question: "Kako ideš do druga?",
                    right: o("🚶", "Hodam polako", "Mokar pod je klizav. Kad hodaš, stižeš bezbedno. Drug može da sačeka."),
                    wrong: [
                        o("🏃", "Trčim da stignem brže", "Na mokrom podu lako se padne. Pored bazena ne trčimo."),
                        o("🤸", "Skočim u vodu i preplivam", "Ne skačemo dok ne vidimo ko pliva ispod nas. Hodamo okolo, polako."),
                    ],
                },
            },
            {
                scene: ["🎢", "⏳"],
                text: "Na toboganu je red. Ispred tebe čeka četvoro dece. Jedan dečak se gura preko reda.",
                decision: {
                    question: "Šta radiš kad se neko gura preko reda?",
                    right: o("⏳", "Ostanem na svom mestu u redu", "Ti radiš ispravno. Ako ti guranje smeta, možeš to da kažeš tati ili spasiocu."),
                    wrong: [
                        o("💪", "Guram se i ja", "Kad se svi guraju, neko može da padne. Red čuva sve."),
                        o("👊", "Gurnem tog dečaka", "Guranje pored vode je opasno. Problem rešavaju odrasli."),
                    ],
                },
            },
            {
                scene: ["🏊", "🥈"],
                text: "Trkaš se sa drugom do kraja bazena. Drug je stigao prvi. Ti si {izgubio|izgubila} trku.",
                decision: {
                    question: "Šta radiš kad izgubiš?",
                    right: o("🤝", "Kažem: „Bravo! Hoćemo opet?”", "Nekad pobedimo, a nekad izgubimo. Važno je da je bilo zabavno. Sledeći put možda pobediš ti."),
                    wrong: [
                        o("😠", "Kažem da je varao", "Drug je plivao pošteno. Takve reči bi ga povredile."),
                        o("💦", "Prskam ga u lice", "Prskanje u lice je neprijatno. Ljutnja prođe kad duboko udahneš."),
                    ],
                },
            },
            {
                scene: ["😣", "💧"],
                text: "Voda ti je ušla u oči i u nos. Peče te i kašlješ.",
                decision: {
                    question: "Šta radiš kad ti u vodi nije dobro?",
                    right: o("🙋", "Uhvatim se za ivicu i zovem tatu", "Uz ivicu si {bezbedan|bezbedna}. Tata ili spasilac ti odmah pomažu."),
                    wrong: [
                        o("🤐", "Ne kažem nikom", "Kad ti u vodi nije dobro, odrasli treba odmah da znaju."),
                        o("🏊", "Plivam dalje ka dubokom", "Kad te peku oči, ne vidiš dobro. Prvo se odmori uz ivicu."),
                    ],
                },
            },
            {
                scene: ["🕐", "🏠"],
                text: "Tata kaže: „Još pet minuta, pa idemo kući.” Ti još želiš da plivaš.",
                decision: {
                    question: "Šta radiš kad je vreme da se krene?",
                    right: o("🏊", "Plivam još pet minuta, pa izađem", "To je dogovor. Poslednji minuti su tvoji, a na bazen ćete doći opet."),
                    wrong: [
                        o("🙉", "Pravim se da ne čujem", "Tata bi morao da te zove više puta i brinuo bi. Dogovor je pet minuta."),
                        o("😭", "Plačem i ostanem u vodi", "Teško je prekinuti igru i to je u redu. Bazen će biti tu i sledeći put."),
                    ],
                },
            },
        ],
    },
    {
        title: "Zima",
        icon: "❄️",
        tone: "snow",
        cover: ["⛄", "❄️", "🛷"],
        intro: "Ovo je priča o zimi i snegu. Na snegu se igramo zajedno.",
        steps: [
            {
                scene: ["❄️", "🧥"],
                text: "Napolju pada sneg. Hladno je. Želiš da izađeš i da se igraš.",
                decision: {
                    question: "Šta oblačiš?",
                    right: o("🧤", "Jaknu, kapu i rukavice", "Topla odeća te čuva od hladnoće, pa možeš dugo da se igraš."),
                    wrong: [
                        o("👕", "Samo majicu", "U majici bi ti brzo bilo hladno. Zimi nam treba jakna."),
                        o("🩱", "Kupaći", "Kupaći je za leto i bazen. Zimi nam treba topla odeća."),
                    ],
                },
            },
            {
                scene: ["⛄", "🥕"],
                text: "Sa drugaricom Sarom praviš Sneška Belića. Ti želiš da nos bude šargarepa. Sara želi da nos bude šišarka.",
                decision: {
                    question: "Šta radiš kad želite različite stvari?",
                    right: o("🤝", "Predložim: nos šargarepa, dugmad šišarke", "To je dogovor. Sada je Sneško i tvoj i Sarin."),
                    wrong: [
                        o("💥", "Srušim Sneška", "Tada niko ne bi imao Sneška. Bolje je da zajedno nađete rešenje."),
                        o("😤", "Kažem: „Biće kako ja kažem!”", "I Sara ima svoje ideje. U zajedničkoj igri se dogovaramo."),
                    ],
                },
            },
            {
                scene: ["❄️", "✋"],
                text: "Deca se grudvaju. Jedan dečak ti kaže: „Stani, ne volim grudvanje.”",
                decision: {
                    question: "Šta radiš kad neko kaže „stani”?",
                    right: o("✋", "Prestanem da ga gađam", "Kad neko kaže „stani”, to poštujemo. Igra je lepa samo kad je svima zabavno."),
                    wrong: [
                        o("❄️", "Gađam ga još jednom", "Rekao je da ne želi. Ako nastaviš, biće tužan ili ljut."),
                        o("😂", "Smejem mu se", "Ismevanje boli. Svako sme da kaže šta ne voli."),
                    ],
                },
            },
            {
                scene: ["🛷", "⏳"],
                text: "Imate jedne sanke. Sada se spušta Sara. I ti jedva čekaš da se spustiš.",
                decision: {
                    question: "Šta radiš dok se Sara sanka?",
                    right: o("⏳", "Čekam da Sara završi, pa idem ja", "Kad se menjate, sankate se i ti i Sara. Tvoj red brzo dođe."),
                    wrong: [
                        o("✊", "Uzmem joj sanke", "Sara bi se rastužila. Sanke delimo: jednom ona, jednom ti."),
                        o("🚶", "Naljutim se i odem kući", "Tada bi {propustio|propustila} sankanje. Čekanje traje kratko."),
                    ],
                },
            },
            {
                scene: ["🥶", "🧤"],
                text: "Rukavice su ti mokre. Prsti su ti crveni i bole te od hladnoće. A igra je baš zabavna.",
                decision: {
                    question: "Šta radiš kad ti je mnogo hladno?",
                    right: o("🏠", "Kažem da mi je hladno i uđem da se ugrejem", "Telo ti govori da mu treba toplota. Kad se ugreješ, možeš opet napolje."),
                    wrong: [
                        o("🤐", "Ćutim i igram se dalje", "Promrzli prsti mogu jako da zabole. Važno je da kažeš kad ti je hladno."),
                        o("🖐️", "Skinem rukavice", "Bez rukavica je prstima još hladnije. Treba im toplo mesto."),
                    ],
                },
            },
            {
                scene: ["🍵", "🛋️"],
                text: "U kući je toplo. Mama pita: „Šta želiš da popiješ?”",
                decision: {
                    question: "Šta biraš da se ugreješ?",
                    right: o("🍵", "Topao čaj", "Topao čaj greje iznutra. Uz čaj se brzo ugreješ."),
                    wrong: [
                        o("🌨️", "Sneg sa prozora", "Sneg je hladan i nije čist. Od njega može da zaboli grlo."),
                        o("🍦", "Sladoled", "Sladoled bi te još više ohladio. Sada ti treba nešto toplo."),
                    ],
                },
            },
        ],
    },
];

/** Priča za nivo 1–15; vrednosti van opsega se svode na najbliži nivo. */
export function storyForLevel(level: number): Story {
    const safe = Number.isFinite(level) ? Math.round(level) : 1;
    return STORIES[Math.min(Math.max(safe, 1), STORIES.length) - 1];
}

/** Izbori jedne odluke: indeks 0 je uvek najbolji izbor, ostali su slabiji. */
export function optionsOf(decision: StoryDecision): readonly StoryOption[] {
    return [decision.right, ...decision.wrong];
}

/** Broj koraka sa odlukom — to je `total` za ocenu nivoa. */
export function decisionCount(story: Story): number {
    return story.steps.filter((step) => step.decision).length;
}
