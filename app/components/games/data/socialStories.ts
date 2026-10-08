// Sadržaj igre sa pričama iz života: po jedna priča za svaki nivo (1–15).
//
// Priče OPISUJU situaciju, ne ispituju „dobro i loše ponašanje”.
//
// Pravila pisanja:
//  • Prvo lice („Stižem u školu”), strpljiv i pozitivan ton. Kratke, doslovne rečenice,
//    jedna informacija po rečenici. Bez ironije, prenesenog značenja i retorskih pitanja.
//  • Pretežno opis: šta vidim, čujem i osećam, ko je tu, ko pomaže, koliko traje,
//    šta sledi i da se završava. Čulne činjenice su važne („Bušilica zuji. Zvuk je glasan, ali kratko traje.”).
//  • Korak sa izborom pita „Šta može da pomogne?” ili „Šta možeš da uradiš?”. Obično pomažu DVA izbora,
//    a jedan je zastupanje sebe: tražim pomoć ili pauzu, kažem da je preglasno, držim mamu za ruku, nosim omiljenu igračku.
//  • Izbor koji manje pomaže dobija mirnu rečenicu o tome šta bi se verovatno desilo — bez osude.
//    Ono što je tipično za neurodivergentnu decu nikad nije takav izbor: pokrivanje ušiju,
//    pogled u stranu, loptica u ruci, želja za mirom.
//  • Korak sa `affirm: true` nema izbor: potvrđuje nešto što dete već ume („Već znam da operem zube.”).
//  • Oblik koji zavisi od pola deteta piše se kao par {muški|ženski}, npr. "{Želeo|Želela} sam" — vidi `genderText()` u kit/utils.
//  • Dužina: nivoi 1–5 imaju 4 koraka, 6–10 imaju 4–5, a 11–15 po 6 koraka.

export type SceneTone = "sun" | "lilac" | "aqua" | "leaf" | "rose" | "sky" | "snow";

export interface StoryOption {
    emoji: string;
    label: string;
    /** Šta se verovatno desi posle ovog izbora — kratko i bez osude */
    why: string;
}

export interface StoryDecision {
    question: string;
    options: readonly StoryOption[];
    /** Indeksi SVIH izbora koji pomažu */
    acceptable: readonly number[];
}

export interface StoryStep {
    /** Emodžiji koji čine sliku: prvi je glavni, ostali su sporedni */
    scene: readonly string[];
    /** Rečenice priče za ovaj korak */
    text: string;
    /** Korak koji potvrđuje ono što dete već ume; nema izbor */
    affirm?: boolean;
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

const DO = "Šta možeš da uradiš?";

const o = (emoji: string, label: string, why: string): StoryOption => ({ emoji, label, why });

/** Odluka: prvo izbori koji pomažu, zatim oni koji manje pomažu. */
const choice = (question: string, good: StoryOption[], other: StoryOption[]): StoryDecision => ({
    question,
    options: [...good, ...other],
    acceptable: good.map((_, i) => i),
});

export const STORIES: readonly Story[] = [
    // ── Laki nivoi (1–5): 4 koraka ────────────────────────────────────────────
    {
        title: "Jutro",
        icon: "🌅",
        tone: "sun",
        cover: ["🌅", "🛏️", "🪥"],
        intro: "Ovo je priča o jutru. Jutro je početak dana.",
        steps: [
            {
                scene: ["🛏️", "☀️"],
                text: "Jutro je. Budim se u svom krevetu. U sobi je svetlo. Čujem mamu i tatu u kuhinji.",
                decision: choice(
                    "Šta možeš da uradiš kad se probudiš?",
                    [
                        o("🚿", "Umijem se", "Voda je sveža. Posle umivanja sam {budan|budna}."),
                        o("🙆", "Protegnem se u krevetu", "Protezanje budi telo. Posle toga ustajem."),
                    ],
                    [o("📱", "Gledam telefon u krevetu", "Uz telefon vreme brzo prolazi. Tada mogu da zakasnim. Telefon može da sačeka.")]
                ),
            },
            {
                scene: ["🪥", "🚿"],
                text: "Idem u kupatilo. Pasta za zube miriše na mentu. Već znam da operem zube. To radim {sam|sama}.",
                affirm: true,
            },
            {
                scene: ["🥣", "🥛"],
                text: "U kuhinji je doručak. Stomak mi je prazan. Hrana mi daje snagu za ceo dan.",
                decision: choice(
                    "Šta možeš da izabereš za doručak?",
                    [o("🥣", "Kašu i mleko", "Kaša i mleko daju snagu do ručka."), o("🥪", "Hleb i sir", "Hleb i sir daju snagu do ručka.")],
                    [o("🍬", "Samo bombone", "Bombone su slatke. Posle njih glad brzo dođe opet.")]
                ),
            },
            {
                scene: ["🎒", "👟"],
                text: "Doručak je gotov. Oblačim se i obuvam patike. Uskoro krećem u vrtić ili u školu.",
                decision: choice(
                    "Šta može da pomogne da ništa ne zaboraviš?",
                    [
                        o("🎒", "Spakujem ranac sa mamom", "Sa mamom proverim ranac. Sve je unutra."),
                        o("📋", "Pogledam raspored u slikama", "Raspored u slikama pokazuje šta ide u ranac."),
                    ],
                    [o("🏃", "Istrčim bez ranca", "Bez ranca nemam svoje stvari. Tada se vraćamo po njega.")]
                ),
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
                text: "Stižem u školu. U hodniku ima mnogo dece. Zvono zvoni. Zvono je glasno i traje kratko. Posle zvona počinje čas.",
                decision: choice(
                    "Šta možeš da uradiš kad zvoni zvono?",
                    [
                        o("🪑", "Sednem na svoje mesto", "Na svom mestu imam svoju klupu i svoje stvari."),
                        o("🙉", "Pokrijem uši dok zvono zvoni", "Pokrivene uši stišaju zvono. Zvono brzo prestane."),
                    ],
                    [o("🏃", "Trčim po hodniku", "U hodniku ima mnogo dece. Kad trčim, mogu da se sudarim sa nekim.")]
                ),
            },
            {
                scene: ["👩‍🏫", "📖"],
                text: "Učiteljica priča pred tablom. Deca sede u klupama. Kad je tiho, svi čuju učiteljicu.",
                decision: choice(
                    "Šta može da pomogne dok učiteljica priča?",
                    [
                        o("👂", "Slušam", "Kad slušam, čujem šta je važno. Mogu da slušam i dok gledam u klupu."),
                        o("🟡", "Držim lopticu za stiskanje", "Loptica u ruci pomaže telu da bude mirno. Tako lakše slušam."),
                    ],
                    [o("🗣️", "Glasno pričam sa drugom", "Kad pričamo glasno, deca ne čuju učiteljicu. Sa drugom mogu da pričam na odmoru.")]
                ),
            },
            {
                scene: ["🙋", "💡"],
                text: "Učiteljica pita nešto. Ja znam odgovor. I druga deca žele da odgovore.",
                decision: choice(
                    "Šta možeš da uradiš kad znaš odgovor?",
                    [
                        o("✋", "Podignem ruku", "Podignuta ruka kaže učiteljici da želim da odgovorim. Onda čekam da me prozove."),
                        o("💭", "Sačuvam odgovor za sebe", "Ne moram uvek da odgovorim. Dovoljno je da znam odgovor."),
                    ],
                    [o("📣", "Viknem odgovor", "Kad viknem, druga deca ne stignu da odgovore. Učiteljica proziva dete koje podigne ruku.")]
                ),
            },
            {
                scene: ["🎒", "😊"],
                text: "Čas je gotov. Zvono opet zvoni. Već znam gde je moja klupa. Znam i da spakujem svoje stvari u ranac.",
                affirm: true,
            },
        ],
    },
    {
        title: "Stomatolog",
        icon: "🦷",
        tone: "aqua",
        cover: ["🦷", "🪥", "😁"],
        intro: "Ovo je priča o stomatologu. Stomatolog je zubar. On čuva naše zube.",
        steps: [
            {
                scene: ["🪥", "🦷"],
                text: "Zubima jedem i smejem se. Perem ih ujutru i uveče. Već znam da držim četkicu. To radim {sam|sama}.",
                affirm: true,
            },
            {
                scene: ["🦷", "💡"],
                text: "Danas idem kod zubara. Sedam u veliku stolicu. Stolica se polako spušta. Iznad mene je jaka lampa. Zubar gleda zube malim ogledalom.",
                decision: choice(
                    "Šta može da pomogne dok zubar gleda zube?",
                    [
                        o("😮", "Otvorim usta široko", "Kad su usta otvorena, zubar vidi sve zube. Pregled tada kraće traje."),
                        o("🕶️", "Zamolim za tamne naočare", "Lampa je jaka. Sa tamnim naočarima svetlo ne smeta."),
                    ],
                    [o("🤐", "Stisnem usta", "Kad su usta zatvorena, zubar ne vidi zube. Tada pregled duže traje.")]
                ),
            },
            {
                scene: ["🔧", "👂"],
                text: "Nekad zubar popravlja zub. Bušilica zuji. Zvuk je glasan, ali kratko traje. Voda prska u usta. Mala cev usisava vodu.",
                decision: choice(
                    "Šta možeš da uradiš ako ti je teško?",
                    [
                        o("✋", "Podignem ruku za pauzu", "Podignuta ruka znači: „Stani.” Zubar tada zastane."),
                        o("🤝", "Držim mamu ili tatu za ruku", "Ruka mame ili tate pomaže kad je glasno."),
                    ],
                    [o("😣", "Trpim i ništa ne pokažem", "Ako ništa ne pokažem, zubar ne zna da mi je teško. Smem da podignem ruku.")]
                ),
            },
            {
                scene: ["😁", "⭐"],
                text: "Pregled je gotov. Stolica se podiže. Zubar kaže: „Gotovo.” Zubi su mi čisti i glatki. Idem kući.",
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
                text: "Idem sa mamom u prodavnicu. U prodavnici ima mnogo ljudi i mnogo polica. Svetla su jaka. Nekad svira muzika. Kupujemo hleb, mleko i sir.",
                decision: choice(
                    "Šta može da pomogne u prodavnici?",
                    [
                        o("📋", "Držim spisak sa slikama", "Na spisku je sve što kupujemo. Kad nešto nađemo, to precrtam."),
                        o("🛒", "Držim se za kolica", "Kad se držim za kolica, ostajem uz mamu."),
                    ],
                    [o("🏃", "Odem {sam|sama} među police", "Prodavnica je velika. Mama tada ne zna gde sam. Uz mamu se ne gubim.")]
                ),
            },
            {
                scene: ["🧀", "🥛"],
                text: "Tražimo mleko i sir. Oni stoje u frižideru. Kod frižidera je hladno. Već znam kako izgleda naše mleko. Stavljam ga u kolica.",
                affirm: true,
            },
            {
                scene: ["🍫", "🙂"],
                text: "Na polici vidim slatkiše. Želim čokoladu. Čokolada danas nije na spisku.",
                decision: choice(
                    "Šta možeš da uradiš kad nešto želiš?",
                    [
                        o("🙋", "Pitam mamu: „Može li čokolada?”", "Smem da pitam. Mama kaže „može” ili „danas ne”. Oba odgovora su u redu."),
                        o("📋", "Pogledam spisak i idemo dalje", "Spisak pokazuje šta danas kupujemo. Čokolada može drugi put."),
                    ],
                    [o("🍫", "Otvorim čokoladu u prodavnici", "Stvari iz prodavnice nisu naše dok ih ne platimo.")]
                ),
            },
            {
                scene: ["💳", "🛍️"],
                text: "Stižemo do kase. Tu je red. Kasa pišti: „bip, bip”. Mama plaća. Posle kase idemo kući.",
                decision: choice(
                    "Šta može da pomogne dok čekaš u redu?",
                    [
                        o("🧺", "Stavljam stvari na traku", "Prodavačica uzima stvari sa trake, jednu po jednu. Tako red brže prolazi."),
                        o("🔢", "Brojim stvari u kolicima", "Dok brojim, čekanje brže prolazi."),
                    ],
                    [o("💢", "Guram se ispred ljudi", "Ljudi u redu čekaju duže od nas. Kad se guram, neko može da padne.")]
                ),
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
                text: "Leto je. Idem u park. U parku su ljuljaške, tobogan i pesak. Deca viču i smeju se. Sunce jako sija.",
                decision: choice(
                    "Šta može da pomogne na jakom suncu?",
                    [
                        o("🧴", "Namažem kremu za sunce", "Krema čuva kožu od sunca. Hladna je samo na početku."),
                        o("🧢", "Stavim kapu", "Kapa pravi hlad za glavu i oči."),
                    ],
                    [o("🧥", "Obučem zimsku jaknu", "U zimskoj jakni je leti previše vruće.")]
                ),
            },
            {
                scene: ["🎢", "😊"],
                text: "Penjem se na tobogan. Već znam da se držim za ogradu. Spuštam se kad je tobogan prazan.",
                affirm: true,
            },
            {
                scene: ["⚽", "💦"],
                text: "Trčim i igram se. Vruće mi je. Usta su mi suva. To znači da sam {žedan|žedna}.",
                decision: choice(
                    "Šta možeš da uradiš kad si {žedan|žedna}?",
                    [
                        o("💧", "Pijem vodu iz svoje flašice", "Voda gasi žeđ i hladi telo."),
                        o("🌳", "Sednem u hlad da se odmorim", "U hladu se telo ohladi. Posle odmora se opet igram."),
                    ],
                    [o("🏃", "Trčim dalje bez vode", "Bez vode telo postaje umorno. Glava može da zaboli.")]
                ),
            },
            {
                scene: ["🌆", "🏠"],
                text: "Polako pada mrak. Mama kaže: „Još pet minuta, pa idemo kući.” Teško je prekinuti igru.",
                decision: choice(
                    "Šta može da pomogne kad je vreme za polazak?",
                    [
                        o("🎢", "Spustim se još jednom, pa krenem", "Poslednje spuštanje je kraj igre za danas. Sutra mogu opet u park."),
                        o("👋", "Kažem: „Ćao! Vidimo se sutra.”", "Pozdrav pomaže da završim igru. Park je tu i sutra."),
                    ],
                    [o("🌙", "Ostanem u parku bez mame", "U mraku se ne vidi dobro. Mama bi se zabrinula.")]
                ),
            },
        ],
    },

    // ── Srednji nivoi (6–10): 4–5 koraka ──────────────────────────────────────
    {
        title: "Kod doktora",
        icon: "🏥",
        tone: "aqua",
        cover: ["🏥", "🩺", "🌡️"],
        intro: "Ovo je priča o odlasku kod doktora. Doktor pomaže da ozdravimo.",
        steps: [
            {
                scene: ["🤒", "🌡️"],
                text: "Jutros me boli grlo. Vruće mi je. Nemam snage za igru.",
                decision: choice(
                    "Šta možeš da uradiš kad te nešto boli?",
                    [
                        o("🗣️", "Kažem mami: „Boli me grlo.”", "Mama sada zna šta me boli. Može da mi pomogne."),
                        o("👉", "Pokažem mami gde me boli", "I pokazivanje kaže mami šta me boli."),
                    ],
                    [o("🤐", "Ne kažem nikome", "Ako ne kažem, niko ne zna da me boli. Grlo i dalje boli.")]
                ),
            },
            {
                scene: ["🏥", "🪑"],
                text: "Mama me vodi kod doktora. U čekaonici sede deca i roditelji. Neko dete kašlje. Jedna beba plače. Svi čekaju svoj red.",
                decision: choice(
                    "Šta može da pomogne dok čekaš?",
                    [
                        o("📚", "Gledam slikovnicu", "Uz slikovnicu vreme brže prolazi. Moj red dolazi."),
                        o("🎧", "Stavim slušalice ako je preglasno", "Slušalice stišaju plač i kašalj. Tako je lakše čekati."),
                    ],
                    [o("🚪", "Uđem kod doktora preko reda", "Doktor prima decu po redu. Kod njega je sada drugo dete.")]
                ),
            },
            {
                scene: ["👨‍⚕️", "🩺"],
                text: "Doktor me zove u ordinaciju. Kaže: „Otvori usta i reci A.” Gleda grlo malom lampom. Drveni štapić mi pritiska jezik. To je neprijatno i traje nekoliko sekundi.",
                decision: choice(
                    "Šta može da pomogne dok doktor gleda grlo?",
                    [
                        o("😮", "Otvorim usta i kažem „A”", "Doktor sada vidi grlo. Za nekoliko sekundi je gotovo."),
                        o("🤝", "Držim mamu za ruku", "Mamina ruka pomaže dok doktor gleda grlo."),
                    ],
                    [o("🤐", "Stisnem usta", "Kad su usta zatvorena, doktor ne vidi grlo. Tada pregled duže traje.")]
                ),
            },
            {
                scene: ["💊", "🥄"],
                text: "Doktor daje sirup. Sirup je lek za grlo. Sladak je i lepljiv. Mama mi daje jednu kašiku.",
                decision: choice(
                    "Šta može da pomogne da popiješ lek?",
                    [
                        o("🥄", "Popijem kašiku koju mi mama da", "Lek pomaže grlu. Lek pijem samo kad mi ga da odrasla osoba."),
                        o("💧", "Posle leka popijem vodu", "Voda spere ukus leka."),
                    ],
                    [o("🥤", "Popijem ceo sirup bez mame", "Previše leka nije dobro za telo. Mama zna koliko leka treba.")]
                ),
            },
            {
                scene: ["😊", "🏠"],
                text: "Posle nekoliko dana grlo me više ne boli. Pomogli su mi mama, doktor i lek. Već znam da kažem kad me nešto boli.",
                affirm: true,
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
                text: "Idem sa porodicom u restoran. U restoranu je mnogo stolova. Ljudi pričaju. Čuju se tanjiri i muzika. Konobar nam pokazuje naš sto.",
                decision: choice(
                    "Šta možeš da uradiš kad stignete?",
                    [
                        o("🪑", "Sednem za naš sto", "Za stolom sedim sa porodicom. Tu čekamo ručak."),
                        o("🙋", "Zamolim da sednemo u tiši ugao", "U uglu je manje buke. Smem da pitam za tiše mesto."),
                    ],
                    [o("🏃", "Trčim između stolova", "Konobari nose toplu hranu. Kad trčim, možemo da se sudarimo.")]
                ),
            },
            {
                scene: ["🤵", "📋"],
                text: "Konobar dolazi do stola. Pita: „Šta želiš da jedeš?” Na jelovniku su slike jela.",
                decision: choice(
                    "Kako možeš da naručiš?",
                    [
                        o("🙂", "Kažem: „Supu, molim vas.”", "Konobar sada zna šta želim. „Molim vas” je lep način da tražimo."),
                        o("👉", "Pokažem jelo na jelovniku", "I pokazivanje je naručivanje. Konobar vidi šta želim."),
                    ],
                    [o("📣", "Viknem: „Daj supu!”", "Vika može da uplaši ljude za drugim stolovima.")]
                ),
            },
            {
                scene: ["⏳", "🍲"],
                text: "Hrana još nije stigla. Kuvar je kuva u kuhinji. To traje oko dvadeset minuta. Stomak mi krči.",
                decision: choice(
                    "Šta može da pomogne dok čekaš?",
                    [o("🖍️", "Crtam", "Dok crtam, čekanje brže prolazi."), o("❓", "Pitam: „Koliko još čekamo?”", "Kad znam koliko još, lakše je čekati.")],
                    [o("🥄", "Lupam kašikom o sto", "Lupanje je glasno. Smeta ljudima za drugim stolovima.")]
                ),
            },
            {
                scene: ["😋", "🧻"],
                text: "Ručak je stigao. Supa je topla, pa duvam u kašiku. Već znam da jedem kašikom. Posle jela plaćamo i idemo kući.",
                affirm: true,
            },
        ],
    },
    {
        title: "Vatra i bezbednost",
        icon: "🚒",
        tone: "rose",
        cover: ["🚒", "👨‍🚒", "🔔"],
        intro: "Ovo je priča o vatri. Kad znamo šta da radimo, ostajemo bezbedni.",
        steps: [
            {
                scene: ["🍳", "♨️"],
                text: "Mama kuva ručak. Šporet je uključen. Iz šerpe izlazi para. Ringla je vruća i kad nije crvena.",
                decision: choice(
                    "Šta može da pomogne da ostaneš {bezbedan|bezbedna}?",
                    [
                        o("🙋", "Pitam mamu: „Da li je vruće?”", "Odrasli znaju šta je vruće. Kad pitam, ruke ostaju zdrave."),
                        o("↔️", "Stojim jedan korak dalje od šporeta", "Jedan korak dalje para i ringla ne mogu da me opeku."),
                    ],
                    [o("🤚", "Dotaknem ringlu da proverim", "Vruća ringla može da opeče ruku. Opekotina boli.")]
                ),
            },
            {
                scene: ["🏫", "🔔"],
                text: "U školi zvoni alarm. To je vežba za slučaj požara. Alarm je vrlo glasan. Nije opasan. Vežba traje nekoliko minuta. Posle vežbe se vraćamo u učionicu.",
                decision: choice(
                    "Šta može da pomogne kad zvoni alarm?",
                    [
                        o("🚶", "Stanem u red i pratim učiteljicu", "Učiteljica zna put napolje. U redu izlazimo mirno."),
                        o("🙉", "Pokrijem uši i hodam u redu", "Ako je preglasno, mogu da pokrijem uši. I dalje hodam sa odeljenjem."),
                    ],
                    [o("🎒", "Pakujem sve stvari u ranac", "Pakovanje dugo traje. Stvari čekaju u učionici dok se ne vratimo.")]
                ),
            },
            {
                scene: ["🏠", "💨"],
                text: "Ovo se dešava retko. Dobro je da znam šta mogu da uradim. Nekad se u kući pojavi dim. Dim je siv i peče oči.",
                decision: choice(
                    "Šta možeš da uradiš ako vidiš dim?",
                    [
                        o("🚪", "Izađem napolje", "Napolju je vazduh čist. Tu sam {bezbedan|bezbedna}."),
                        o("📣", "Glasno zovem odrasle", "Odrasli tada znaju za dim. Oni zovu pomoć."),
                    ],
                    [o("🧸", "Idem po svoje igračke", "Igračke mogu da sačekaju. Najvažnije je da ja budem napolju.")]
                ),
            },
            {
                scene: ["📞", "🚒"],
                text: "Sada sam napolju. Odrasli zovu vatrogasce na broj 193. Vatrogasni kamion ima glasnu sirenu i plava svetla.",
                decision: choice(
                    "Šta može da pomogne dok čekate vatrogasce?",
                    [
                        o("🤝", "Stojim uz odraslu osobu", "Uz odraslu osobu sam na sigurnom. Zajedno čekamo."),
                        o("🙉", "Pokrijem uši kad čujem sirenu", "Sirena je vrlo glasna. Pokrivene uši je stišaju."),
                    ],
                    [o("🏠", "Vratim se u kuću", "U kući je dim. Unutra ulaze samo vatrogasci.")]
                ),
            },
            {
                scene: ["🚒", "👨‍🚒"],
                text: "Vatrogasci stižu brzo. Nose šlemove i velika creva. Oni gase vatru. Svi su bezbedni. Sada znam šta mogu da uradim.",
            },
        ],
    },
    {
        title: "Rođendan",
        icon: "🥳",
        tone: "rose",
        cover: ["🎂", "🎈", "🎁"],
        intro: "Ovo je priča o mom rođendanu. Na rođendan dolaze gosti.",
        steps: [
            {
                scene: ["🚪", "🎈"],
                text: "Danas je moj rođendan. U sobi su baloni. Zvono na vratima zvoni. Stižu gosti. Biće ih mnogo i biće glasno.",
                decision: choice(
                    "Šta možeš da uradiš kad stignu gosti?",
                    [
                        o("👋", "Kažem „Zdravo” ili mahnem", "Pozdrav kaže gostima da ih vidim. Mahanje je isto pozdrav."),
                        o("🤝", "Stojim uz mamu dok gosti ulaze", "Uz mamu je lakše kad ulazi mnogo ljudi."),
                    ],
                    [o("📺", "Pojačam crtani film do kraja", "Tada je u sobi još glasnije. Gosti i ja se ne čujemo.")]
                ),
            },
            {
                scene: ["🎁", "📕"],
                text: "Drugarica Mila mi daje poklon. Papir šuška dok ga otvaram. U poklonu je knjiga. {Želeo|Želela} sam nešto drugo.",
                decision: choice(
                    "Šta možeš da kažeš Mili?",
                    [
                        o("🙏", "„Hvala, Mila!”", "Mila je birala poklon za mene. „Hvala” joj kaže da to vidim."),
                        o("📖", "„Hvala. Pogledaću knjigu kasnije.”", "To je istina i mirno je rečeno. Mila zna da sam {dobio|dobila} poklon."),
                    ],
                    [o("🗑️", "Bacim poklon", "Knjiga može da se pocepa. Mila može da se rastuži.")]
                ),
            },
            {
                scene: ["🎂", "🕯️"],
                text: "Stiže torta sa svećicama. Svetlo se gasi. Svi pevaju „Srećan rođendan”. Pesma je glasna i traje kratko. Na kraju svi tapšu.",
                decision: choice(
                    "Šta može da pomogne dok svi pevaju?",
                    [
                        o("🙉", "Pokrijem uši dok traje pesma", "Ako je preglasno, mogu da pokrijem uši. Pesma se brzo završi."),
                        o("💨", "Sačekam kraj pesme, pa dunem svećice", "Posle pesme duvam svećice. Onda mama seče tortu."),
                    ],
                    [o("☝️", "Gurnem prst u tortu", "Torta je za sve goste. Jedemo je kad je mama iseče.")]
                ),
            },
            {
                scene: ["🎈", "💥"],
                text: "Deca jedu tortu i trče po sobi. Nekad pukne balon. Balon pukne glasno i iznenada. Posle duge igre mogu da budem {umoran|umorna}.",
                decision: choice(
                    "Šta možeš da uradiš kad ti je previše?",
                    [
                        o("🛏️", "Odem u svoju sobu da se odmorim", "U sobi je tiho. Posle odmora mogu da se vratim gostima."),
                        o("🗣️", "Kažem mami: „Treba mi pauza.”", "Mama tada zna kako mi je. Pomaže mi da nađem mirno mesto."),
                    ],
                    [o("😣", "Ostanem i trpim buku", "Kad trpim, postaje mi sve teže. Smem da tražim pauzu.")]
                ),
            },
            {
                scene: ["👋", "🎈"],
                text: "Rođendan traje oko dva sata. Onda gosti idu kući. Na vratima kažem „Ćao” ili mahnem. To već znam. U kući je opet tiho.",
                affirm: true,
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
                text: "Moj pas se zove Žuća. Žuća stoji pored prazne činije. Gleda me i cvili. To znači da je gladan.",
                decision: choice(
                    "Šta možeš da uradiš za Žuću?",
                    [
                        o("🦴", "Sipam mu hranu za pse", "Hrana za pse je zdrava za Žuću."),
                        o("💧", "Sipam mu svežu vodu", "Psi piju vodu uz jelo. Sveža voda mu prija."),
                    ],
                    [o("🍫", "Dam mu čokoladu", "Čokolada je opasna za pse. Od nje ih boli stomak.")]
                ),
            },
            {
                scene: ["🐕", "🚪"],
                text: "Žuća stoji kod vrata i maše repom. Laje dva puta. Lavež je glasan i kratak. To znači da želi napolje.",
                decision: choice(
                    "Šta može da pomogne Žući?",
                    [
                        o("🦮", "Idemo u šetnju na povocu", "Na povocu je Žuća bezbedan. Šetnja traje oko pola sata."),
                        o("🗣️", "Kažem tati: „Žuća hoće napolje.”", "Tata tada zna. Zajedno izvodimo Žuću."),
                    ],
                    [o("🚪", "Pustim ga samog napolje", "Sam na ulici pas može da se izgubi.")]
                ),
            },
            {
                scene: ["🐩", "🌳"],
                text: "U parku vidim psa kog ne poznajem. Čupav je. Ne znam da li voli maženje.",
                decision: choice(
                    DO,
                    [
                        o("🙋", "Pitam vlasnika: „Smem li da ga pomazim?”", "Vlasnik zna da li pas voli maženje."),
                        o("👀", "Gledam psa iz daljine", "I gledanje je lepo. Ne moram da ga dodirnem."),
                    ],
                    [o("🤗", "Odmah ga zagrlim", "Pas kog ne poznajem može da se uplaši. Uplašen pas može da ugrize.")]
                ),
            },
            {
                scene: ["🐶", "💤"],
                text: "Posle šetnje Žuća je umoran. Leži u svojoj korpi i spava. Diše polako.",
                decision: choice(
                    "Šta možeš da radiš dok Žuća spava?",
                    [
                        o("🤫", "Pustim ga da spava", "I psima treba odmor. Kad se naspava, opet se igramo."),
                        o("🧩", "Igram se tiho pored njega", "Tiha igra ne budi Žuću."),
                    ],
                    [o("🔊", "Probudim ga da se igramo", "Umoran pas želi da spava. Može da se uplaši kad ga naglo probudim.")]
                ),
            },
            {
                scene: ["🐶", "❤️"],
                text: "Žuća se probudio. Maše repom i liže mi ruku. Jezik mu je mokar i topao. Već znam da ga mazim nežno, po leđima.",
                affirm: true,
            },
        ],
    },

    // ── Teški nivoi (11–15): 6 koraka, suptilnije situacije ───────────────────
    {
        title: "Putovanje vozom",
        icon: "🚆",
        tone: "sky",
        cover: ["🚆", "🎫", "🧳"],
        intro: "Ovo je priča o putovanju vozom. Na putu nekad nešto ne ide po planu. I to je u redu.",
        steps: [
            {
                scene: ["🚉", "🕐"],
                text: "Sa tatom čekam voz na stanici. Na stanici je mnogo ljudi. Zvučnik glasno najavljuje vozove. Na tabli piše: naš voz kasni deset minuta.",
                decision: choice(
                    "Šta može da pomogne dok čekaš voz?",
                    [
                        o("🪑", "Sednem na klupu sa tatom", "Vozovi nekad kasne. To nije ničija greška. Na klupi je čekanje lakše."),
                        o("⏱️", "Zamolim tatu da uključi sat koji odbrojava", "Kad vidim koliko još minuta, lakše čekam."),
                    ],
                    [o("🛤️", "Priđem šinama da vidim voz", "Blizu šina je opasno. Voz je brz i težak. Stojimo iza žute linije.")]
                ),
            },
            {
                scene: ["🚆", "🎫"],
                text: "Voz stiže. Kočnice škripe. Vrata se otvaraju uz pisak. Ulazimo. Kroz vagon ide kondukter i gleda karte.",
                decision: choice(
                    "Šta možeš da uradiš kad kondukter dođe?",
                    [
                        o("🎟️", "Pokažem svoju kartu", "Karta pokazuje da smem da putujem ovim vozom. Kondukter je označi i vrati."),
                        o("🤝", "Dam kartu tati da je on pokaže", "Tata može da pokaže kartu umesto mene. To je u redu."),
                    ],
                    [o("🙈", "Sakrijem kartu", "Kondukter mora da vidi kartu. To je njegov posao.")]
                ),
            },
            {
                scene: ["💺", "👵"],
                text: "Tražimo svoja mesta. Na mom sedištu pored prozora sedi jedna baka.",
                decision: choice(
                    DO,
                    [
                        o("🗣️", "Kažem tati: „Na mom mestu neko sedi.”", "Tata mirno pita baku. Baka je možda pogrešila mesto."),
                        o("🎟️", "Pokažem baki broj na karti", "Na karti piše broj sedišta. Baka tada vidi čije je mesto."),
                    ],
                    [o("👉", "Povučem baku za rukav", "Povlačenje može da uplaši baku. Ona ne zna šta želim.")]
                ),
            },
            {
                scene: ["🤫", "😴"],
                text: "Voz kreće. Točkovi ravnomerno lupkaju. Voz se blago ljulja. Putnici oko mene čitaju ili spavaju.",
                decision: choice(
                    "Šta možeš da radiš u vozu?",
                    [
                        o("🪟", "Gledam kroz prozor", "Kroz prozor vidim polja, kuće i reke."),
                        o("🎧", "Slušam muziku na slušalice", "Sa slušalicama muziku čujem samo ja. Putnici mogu da se odmaraju."),
                    ],
                    [o("🤸", "Skačem po sedištu", "Voz se ljulja. Na sedištu mogu da padnem.")]
                ),
            },
            {
                scene: ["🚻", "🚆"],
                text: "Put dugo traje. Moram u toalet.",
                decision: choice(
                    DO,
                    [
                        o("🙋", "Kažem tati: „Moram u toalet.”", "Tata zna gde je toalet u vozu. Ide sa mnom."),
                        o("🖼️", "Pokažem tati sličicu toaleta", "Sličica kaže isto što i reči. Tata razume."),
                    ],
                    [o("😣", "Trpim i ne kažem ništa", "Od trpljenja boli stomak. Uvek smem da kažem da moram u toalet.")]
                ),
            },
            {
                scene: ["🚉", "😊"],
                text: "Voz usporava i staje. Stigli smo. Voz je kasnio, a mi smo ipak stigli. Već znam da pokažem kartu i da nađem svoje mesto.",
                affirm: true,
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
                text: "Dolazim sa mamom na pregled. U čekaonici čeka još troje dece. Oni su došli pre mene. Sestra proziva decu po redu.",
                decision: choice(
                    "Šta može da pomogne dok čekaš svoj red?",
                    [
                        o("🧸", "Držim svoju omiljenu igračku", "Omiljena igračka sme da ide sa mnom. Uz nju je čekanje lakše."),
                        o("🔢", "Brojim koliko je dece ispred mene", "Kad znam ko je ispred mene, znam kad sam ja na redu."),
                    ],
                    [o("🚪", "Uđem odmah, pre svih", "Deca koja su došla ranije čekaju duže. Lekar ih prima po redu.")]
                ),
            },
            {
                scene: ["🕐", "👩‍⚕️"],
                text: "Sestra izlazi i kaže: „Doktor kasni. Čekaćete još malo.” Plan se promenio. To može da bude neprijatno.",
                decision: choice(
                    "Šta može da pomogne kad se plan promeni?",
                    [
                        o("🌬️", "Udahnem duboko tri puta", "Duboko disanje smiruje telo."),
                        o("❓", "Pitam mamu: „Koliko još?”", "Kad znam koliko još, lakše je čekati."),
                    ],
                    [o("✊", "Lupam na doktorova vrata", "Doktor sada pregleda drugo dete. Lupanje ga prekida, pa pregled duže traje.")]
                ),
            },
            {
                scene: ["🩺", "👨‍⚕️"],
                text: "Došao je moj red. Doktor stavlja stetoskop na moja leđa. Stetoskop je hladan nekoliko sekundi. Doktor sluša kako dišem. To ne boli.",
                decision: choice(
                    "Šta možeš da uradiš dok doktor sluša?",
                    [
                        o("😌", "Dišem duboko i polako", "Kad dišem duboko, doktor dobro čuje pluća."),
                        o("🗣️", "Kažem: „Hladno mi je.”", "Doktor tada zagreje stetoskop rukom."),
                    ],
                    [o("🏃", "Ustanem i odem sa stolice", "Tada doktor ne može da čuje pluća. Pregled počinje ispočetka.")]
                ),
            },
            {
                scene: ["💉", "😟"],
                text: "Doktor kaže: „Danas dobijaš vakcinu.” Sestra briše ruku mokrom vatom. Vata je hladna. Ubod traje dve sekunde. Bocne kao štipanje.",
                decision: choice(
                    "Šta može da pomogne kad se plašiš?",
                    [
                        o("🗣️", "Kažem: „Strah me je.”", "Strah je u redu. Kad kažem, mama i doktor mi pomažu."),
                        o("🤝", "Držim mamu za ruku i gledam u stranu", "Mamina ruka pomaže. Ne moram da gledam u iglu."),
                    ],
                    [o("🙅", "Mašem rukama", "Kad se ruka pomera, ubod može više da zaboli. Kad je ruka mirna, brzo je gotovo.")]
                ),
            },
            {
                scene: ["💊", "🥤"],
                text: "Kod kuće pijem lek. Lek je gorak. Gorak ukus traje kratko.",
                decision: choice(
                    "Šta može da pomogne sa gorkim lekom?",
                    [
                        o("🥤", "Popijem lek, pa vodu", "Voda spere gorak ukus."),
                        o("🗣️", "Kažem mami: „Gorko mi je.”", "Mama tada zna. Može da mi da vodu ili sok posle leka."),
                    ],
                    [o("🌱", "Sipam lek u saksiju", "Lek pomaže samo kad ga popijem. U saksiji ne može da mi pomogne.")]
                ),
            },
            {
                scene: ["🩹", "😊"],
                text: "Pregled je gotov. Na ruci je flaster. Bilo je čekanja i malo straha. Sve je prošlo. Već znam da kažem kad me je strah.",
                affirm: true,
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
                text: "U radionici svako crta svoju sliku. Miriše na boje i lepak. Želim crvenu bojicu. Crvenu sada koristi Ana.",
                decision: choice(
                    "Šta možeš da uradiš kad neko koristi ono što ti treba?",
                    [
                        o("🙋", "Pitam: „Ana, mogu li posle tebe?”", "Ana sada zna da čekam crvenu. Daje mi je kad završi."),
                        o("🖍️", "Crtam drugom bojom dok čekam", "Dok čekam crvenu, crtež raste i sa drugim bojama."),
                    ],
                    [o("✊", "Uzmem joj bojicu iz ruke", "Ako uzmem bojicu bez pitanja, Ana se može rastužiti.")]
                ),
            },
            {
                scene: ["✂️", "📄"],
                text: "Sada sečem krug od papira. Makaze su oštre. Već znam da sedim dok sečem. Gledam u papir i sečem polako.",
                affirm: true,
            },
            {
                scene: ["😕", "✂️"],
                text: "Krug mi nije ispao kako sam {želeo|želela}. Papir se iskrivio. To me nervira.",
                decision: choice(
                    "Šta može da pomogne kad nešto ne ide?",
                    [
                        o("🙋", "Kažem učiteljici: „Treba mi pomoć.”", "Svakome nekad treba pomoć. Učiteljica pokaže kako da držim papir."),
                        o("🔁", "Uzmem nov papir i probam opet", "Sečenje se uči polako. Svaki novi krug je malo lakši."),
                    ],
                    [o("🗑️", "Zgužvam i bacim sve", "Tada nemam ni krug ni papir. Krug može da se popravi.")]
                ),
            },
            {
                scene: ["🖼️", "💧"],
                text: "Drug Luka slučajno prospe vodu. Voda kvasi ugao mog crteža. Luka kaže: „Izvini!”",
                decision: choice(
                    "Šta možeš da kažeš Luki?",
                    [
                        o("🤝", "„U redu je, bilo je slučajno.”", "Luka nije hteo da pokvasi crtež. Crtež se osuši."),
                        o("😟", "„{Tužan|Tužna} sam zbog crteža. Pomozi mi da ga osušim.”", "Smem da kažem kako se osećam. Luka može da pomogne papirnim ubrusom."),
                    ],
                    [o("💦", "Prospem vodu na njegov crtež", "Tada su dva crteža mokra. I Luka i ja smo tužni.")]
                ),
            },
            {
                scene: ["🖼️", "👏"],
                text: "Crteži su gotovi. Učiteljica danas bira Anin crtež za zid. Moj crtež nije izabran. Mogu da budem {tužan|tužna}. To je u redu.",
                decision: choice(
                    "Šta možeš da uradiš kad je izabran tuđi crtež?",
                    [
                        o("👏", "Kažem Ani: „Bravo!”", "Ana se raduje. Moj crtež je i dalje moj."),
                        o("🏠", "Odnesem svoj crtež kući", "Kod kuće crtež može na moj zid ili na frižider."),
                    ],
                    [o("📄", "Pocepam svoj crtež", "Pocepan crtež ne mogu da pokažem mami i tati.")]
                ),
            },
            {
                scene: ["🧹", "🗑️"],
                text: "Radionica je gotova. Na stolu su papirići, bojice i lepak.",
                decision: choice(
                    "Šta možeš da uradiš na kraju radionice?",
                    [
                        o("🧹", "Bacim papiriće u kantu", "Sto je čist i spreman za sledeću radionicu."),
                        o("🖍️", "Vratim bojice u kutiju", "Bojice u kutiji čekaju sledeću radionicu."),
                    ],
                    [o("💥", "Gurnem sve na pod", "Na podu se bojice lome i gube.")]
                ),
            },
        ],
    },
    {
        title: "Bazen",
        icon: "🏊",
        tone: "sky",
        cover: ["🏊", "🩱", "💦"],
        intro: "Ovo je priča o bazenu. Na bazenu pravila čuvaju sve plivače.",
        steps: [
            {
                scene: ["🩱", "🚿"],
                text: "Dolazim sa tatom na bazen. U svlačionici oblačim kupaći. Bazen miriše na hlor. Glasovi odjekuju. Pre plivanja se tuširamo.",
                decision: choice(
                    "Šta može da pomogne pre ulaska u vodu?",
                    [
                        o("🚿", "Istuširam se", "Tuš spira prašinu i znoj. Voda u bazenu ostaje čista."),
                        o("🥽", "Stavim naočare za plivanje", "Sa naočarima voda ne peče oči."),
                    ],
                    [o("👟", "Uđem u vodu u patikama", "Mokre patike su teške. U vodu ulazimo bosi.")]
                ),
            },
            {
                scene: ["⚠️", "💦"],
                text: "Pod pored bazena je mokar i klizav. Spasilac nekad dune u pištaljku. Pištaljka je glasna i kratka. Drug me zove sa druge strane: „Dođi!”",
                decision: choice(
                    "Kako možeš da stigneš do druga?",
                    [
                        o("🚶", "Hodam polako", "Na mokrom podu hodanje je bezbedno. Drug može da sačeka."),
                        o("🖐️", "Mahnem drugu da on dođe do mene", "Drug vidi mahanje. Tada on dolazi polako."),
                    ],
                    [o("🏃", "Trčim", "Mokar pod je klizav. Kad trčim, mogu da padnem.")]
                ),
            },
            {
                scene: ["🎢", "⏳"],
                text: "Na toboganu je red. Ispred mene čeka četvoro dece. Jedan dečak staje ispred mene.",
                decision: choice(
                    DO,
                    [
                        o("☝️", "Kažem: „Ja čekam red. Ti si posle mene.”", "Dečak sada zna gde je kraj reda."),
                        o("🙋", "Kažem tati ili spasiocu", "Odrasli pomažu oko reda."),
                    ],
                    [o("👊", "Gurnem dečaka", "Guranje pored vode je opasno. Neko može da padne.")]
                ),
            },
            {
                scene: ["🏊", "🥈"],
                text: "Trkam se sa drugom do kraja bazena. Drug stiže prvi. Mogu da budem {ljut|ljuta} ili {tužan|tužna}. To osećanje prođe.",
                decision: choice(
                    "Šta može da pomogne kad izgubiš trku?",
                    [
                        o("🌬️", "Udahnem duboko i odmorim se uz ivicu", "Duboko disanje smiruje telo. Ljutnja polako prolazi."),
                        o("🤝", "Kažem: „Bravo! Hoćemo opet?”", "Drug se raduje. U novoj trci opet imam priliku."),
                    ],
                    [o("💦", "Prskam ga u lice", "Voda u očima peče. Drug može da se naljuti.")]
                ),
            },
            {
                scene: ["😣", "💧"],
                text: "Voda mi ulazi u oči i u nos. Peče me i kašljem.",
                decision: choice(
                    "Šta možeš da uradiš kad ti u vodi nije dobro?",
                    [
                        o("🙋", "Uhvatim se za ivicu i zovem tatu", "Uz ivicu sam {bezbedan|bezbedna}. Tata odmah dolazi."),
                        o("🧖", "Izađem iz vode i obrišem lice peškirom", "Peškir je suv i mek. Oči prestanu da peku."),
                    ],
                    [o("🏊", "Plivam dalje ka dubokom", "Kad oči peku, ne vidim dobro. U dubokoj vodi je tada teško.")]
                ),
            },
            {
                scene: ["🕐", "🏠"],
                text: "Tata kaže: „Još pet minuta, pa idemo kući.” Još želim da plivam. Teško je prekinuti igru.",
                decision: choice(
                    "Šta može da pomogne kad je vreme za polazak?",
                    [
                        o("🏊", "Plivam još pet minuta, pa izađem", "To je dogovor. Poslednji minuti su moji."),
                        o("🤿", "Izaberem poslednju igru u vodi", "Poslednja igra je kraj plivanja za danas. Na bazen dolazimo opet."),
                    ],
                    [o("🙉", "Pravim se da ne čujem", "Tata tada zove više puta i brine. Dogovor je pet minuta.")]
                ),
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
                text: "Napolju pada sneg. Hladno je. Oblačim jaknu, kapu i rukavice. Već znam da zakopčam jaknu. Sneg škripi pod čizmama.",
                affirm: true,
            },
            {
                scene: ["⛄", "🥕"],
                text: "Sa drugaricom Sarom pravim Sneška Belića. Ja želim da nos bude šargarepa. Sara želi da nos bude šišarka.",
                decision: choice(
                    "Šta može da pomogne kad želite različite stvari?",
                    [
                        o("🤝", "Predložim: nos šargarepa, dugmad šišarke", "To je dogovor. Sneško je tada i moj i Sarin."),
                        o("⛄", "Predložim da napravimo dva Sneška", "Tada svako ima svog Sneška i svoj nos."),
                    ],
                    [o("💥", "Srušim Sneška", "Tada nema Sneška ni za mene ni za Saru.")]
                ),
            },
            {
                scene: ["❄️", "✋"],
                text: "Deca se grudvaju. Grudva me pogađa u leđa. Hladna je i mokra. Meni se grudvanje ne sviđa.",
                decision: choice(
                    DO,
                    [
                        o("✋", "Kažem: „Stani, ne volim grudvanje.”", "Deca sada znaju da ne želim. Kad neko drugi kaže „Stani”, i ja stanem."),
                        o("⛄", "Odem da pravim Sneška", "Mogu da izaberem drugu igru na snegu."),
                    ],
                    [o("❄️", "Bacim grudvu nekome u lice", "Grudva u lice boli. Lice je osetljivo.")]
                ),
            },
            {
                scene: ["🛷", "⏳"],
                text: "Imamo jedne sanke. Sada se spušta Sara. Ja jedva čekam svoj red.",
                decision: choice(
                    "Šta može da pomogne dok čekaš svoj red?",
                    [
                        o("🔢", "Brojim do dvadeset dok se Sara spušta", "Dok brojim, čekanje brže prolazi. Onda je moj red."),
                        o("🗣️", "Pitam: „Saro, mogu li ja posle tebe?”", "Sara tada zna da čekam. Menjamo se: jednom ona, jednom ja."),
                    ],
                    [o("✊", "Uzmem joj sanke", "Ako uzmem sanke bez pitanja, Sara se može rastužiti.")]
                ),
            },
            {
                scene: ["🥶", "🧤"],
                text: "Rukavice su mi mokre. Prsti su crveni i bole od hladnoće. Igra je zabavna. Telo mi kaže da mu treba toplota.",
                decision: choice(
                    "Šta možeš da uradiš kad ti je mnogo hladno?",
                    [
                        o("🏠", "Kažem: „Hladno mi je” i uđem da se ugrejem", "U kući se prsti zagreju. Posle mogu opet napolje."),
                        o("🧤", "Zamolim za suve rukavice", "Suve rukavice opet greju prste."),
                    ],
                    [o("🤐", "Ćutim i igram se dalje", "Promrzli prsti jako bole. Kad kažem, odrasli mi pomognu.")]
                ),
            },
            {
                scene: ["🍵", "🛋️"],
                text: "U kući je toplo. Obrazi mi bride. Mama pita: „Šta želiš da popiješ?”",
                decision: choice(
                    "Šta može da te ugreje?",
                    [o("🍵", "Topao čaj", "Topao čaj greje iznutra."), o("🥛", "Toplo mleko", "Toplo mleko greje stomak.")],
                    [o("🍦", "Sladoled", "Sladoled je hladan. Posle njega mi je još hladnije.")]
                ),
            },
        ],
    },
];

/** Priča za nivo 1–15; vrednosti van opsega se svode na najbliži nivo. */
export function storyForLevel(level: number): Story {
    const safe = Number.isFinite(level) ? Math.round(level) : 1;
    return STORIES[Math.min(Math.max(safe, 1), STORIES.length) - 1];
}

/** Broj koraka sa odlukom — to je `total` za ocenu nivoa u režimu „Čitaj i biraj”. */
export function decisionCount(story: Story): number {
    return story.steps.filter((step) => step.decision).length;
}

/**
 * Indeksi izbora koji se nude kad dete sme da vidi najviše `limit` izbora.
 * Ostaju svi izbori koji pomažu a staju, i uvek bar jedan koji manje pomaže.
 */
export function offeredOptions(decision: StoryDecision, limit: number): number[] {
    const all = decision.options.map((_, i) => i);
    const size = Math.max(2, Math.min(all.length, limit));
    if (size >= all.length) return all;
    const good = all.filter((i) => decision.acceptable.includes(i));
    const other = all.filter((i) => !decision.acceptable.includes(i));
    const keptOther = other.slice(0, Math.max(1, size - good.length));
    const keptGood = good.slice(0, size - keptOther.length);
    return [...keptGood, ...keptOther].sort((a, b) => a - b);
}
