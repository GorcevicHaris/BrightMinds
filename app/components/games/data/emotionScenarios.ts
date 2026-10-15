// Sadržaj igre "Emocije": osećanja, likovi, scenariji i raspored po nivoima.
//
// Pravila pisanja:
//  • Treće lice: svaki scenario govori o imenovanom detetu, nikad o detetu koje igra.
//  • Rečenice su kratke i doslovne; ime lika je na početku i po pravilu u nominativu.
//    Jedini drugi oblik za sada je akuzativ („Brat stalno prekida Lejlu.”, scenario 248).
//    Svaki padežni oblik imena mora da postoji u tabeli NAME_CASES (vidi „Imenjaci” niže).
//  • Rod glagola i prideva je napisan u samom scenariju, za tog lika (bez šablona).
//  • Nema pogrešnih osećanja: `common` su osećanja koja većina ljudi tada ima,
//    a svako drugo osećanje je takođe prihvatljiv odgovor.
//  • Emodži scene namerno nije lice, da ne bi odao odgovor.

import { toCyrillic } from "@/lib/script";

export type EmotionId = "happy" | "sad" | "angry" | "scared" | "surprised" | "proud";

interface Emotion {
    id: EmotionId;
    /** Reč na kartici — prilog, pa ne zavisi od roda lika */
    label: string;
    /** Oblik za objašnjenje u prvom licu množine: „često smo …” */
    plural: string;
}

/**
 * Stalan redosled prikaza i redosled uvođenja: deca sa 3 osećanja vide prva tri,
 * sa 5 prvih pet, sa 6 sva. Kartice su zato uvek na istom mestu.
 */
const EMOTION_ORDER: readonly EmotionId[] = ["happy", "sad", "angry", "scared", "surprised", "proud"];

export const EMOTIONS: Record<EmotionId, Emotion> = {
    happy: { id: "happy", label: "Srećno", plural: "srećni" },
    sad: { id: "sad", label: "Tužno", plural: "tužni" },
    angry: { id: "angry", label: "Ljuto", plural: "ljuti" },
    scared: { id: "scared", label: "Uplašeno", plural: "uplašeni" },
    surprised: { id: "surprised", label: "Iznenađeno", plural: "iznenađeni" },
    proud: { id: "proud", label: "Ponosno", plural: "ponosni" },
};

/** Osećanja koja dete poznaje, prema podešavanju uzrasta (3, 5 ili 6). */
function allowedEmotions(emotionCount: number): EmotionId[] {
    const count = Number.isFinite(emotionCount) ? Math.min(Math.max(Math.round(emotionCount), 3), EMOTION_ORDER.length) : 3;
    return EMOTION_ORDER.slice(0, count);
}

// ── Likovi ────────────────────────────────────────────────────────────────────
// Mali, stalan skup imena. Imena su izabrana tako da nemaju drugo značenje koje bi zbunilo dete.

type CharacterId = "lejla" | "amina" | "selma" | "haris" | "amar" | "tarik";

const CHARACTERS: Record<CharacterId, { name: string; female: boolean }> = {
    lejla: { name: "Lejla", female: true },
    amina: { name: "Amina", female: true },
    selma: { name: "Selma", female: true },
    haris: { name: "Haris", female: false },
    amar: { name: "Amar", female: false },
    tarik: { name: "Tarik", female: false },
};

// ── Scenariji ─────────────────────────────────────────────────────────────────

/** Težina scenarija: 1 = nivoi 1–5, 2 = nivoi 6–10, 3 = nivoi 11–15 */
type Tier = 1 | 2 | 3;

export interface EmotionScenario {
    id: number;
    tier: Tier;
    who: CharacterId;
    /** Emodži scene */
    scene: string;
    /** Šta se desilo: jedna ili dve kratke rečenice o liku */
    text: string;
    /** Osećanja koja većina ljudi tada ima; prvo je najčešće */
    common: readonly EmotionId[];
    /** Doslovan razlog, uvek u obliku „Kad …, često smo …” */
    why: string;
}

type ScenarioRow = [who: CharacterId, scene: string, text: string, why: string, alsoCommon?: EmotionId];

/** Redovi jedne grupe (ista težina, isto najčešće osećanje) dobijaju uzastopne stalne brojeve. */
function group(tier: Tier, emotion: EmotionId, firstId: number, rows: ScenarioRow[]): EmotionScenario[] {
    return rows.map(([who, scene, text, why, alsoCommon], i) => ({
        id: firstId + i,
        tier,
        who,
        scene,
        text,
        common: alsoCommon ? [emotion, alsoCommon] : [emotion],
        why,
    }));
}

const SCENARIOS: readonly EmotionScenario[] = [
    // ── Lako (nivoi 1–5): jasne, svakodnevne situacije ────────────────────────
    ...group(1, "happy", 101, [
        ["lejla", "🎁", "Lejla je dobila poklon.", "Kad dobijemo poklon, često smo srećni."],
        ["haris", "🎂", "Haris slavi rođendan.", "Kad slavimo rođendan, često smo srećni."],
        ["amina", "❤️", "Amina je dobila zagrljaj od mame.", "Kad nas mama zagrli, često smo srećni."],
        ["amar", "🤝", "Amar se igra sa drugom.", "Kad se igramo sa drugom, često smo srećni."],
        ["selma", "🌳", "Selma ide u park da se igra.", "Kad idemo u park, često smo srećni."],
        ["tarik", "🐱", "Tarik mazi malu macu.", "Kad mazimo macu, često smo srećni."],
        ["amina", "⭐", "Amina je lepo složila igračke. Mama ju je pohvalila.", "Kad nas neko pohvali, često smo srećni."],
    ]),
    ...group(1, "sad", 121, [
        ["haris", "🩹", "Haris je pao i udario koleno.", "Kad padnemo i zaboli nas, često smo tužni."],
        ["lejla", "🚗", "Lejla ne može da se igra. Njena igračka se pokvarila.", "Kad nam se igračka pokvari, često smo tužni."],
        ["amar", "📃", "Amar je slučajno pocepao svoj crtež.", "Kad nam se crtež pocepa, često smo tužni."],
        ["selma", "🎈", "Selma je ispustila balon. Balon je odleteo.", "Kad nam balon odleti, često smo tužni."],
        ["tarik", "🍦", "Tarik je ispustio sladoled na zemlju.", "Kad nam sladoled padne, često smo tužni."],
        ["amina", "🌧️", "Amina ne može napolje jer pada kiša.", "Kad ne možemo napolje da se igramo, često smo tužni."],
        ["haris", "🔍", "Haris ne može da nađe svog medu.", "Kad ne možemo da nađemo omiljenu igračku, često smo tužni."],
    ]),
    ...group(1, "angry", 141, [
        ["amar", "🧸", "Amar se igra autićem. Drug mu je uzeo autić bez pitanja.", "Kad nam neko uzme igračku bez pitanja, često smo ljuti."],
        ["selma", "🧱", "Selma je napravila kulu od kocaka. Brat joj je srušio kulu.", "Kad nam neko sruši kulu, često smo ljuti."],
        ["haris", "🖍️", "Haris je nacrtao crtež. Sestra mu je išarala crtež.", "Kad nam neko išara crtež, često smo ljuti."],
        ["lejla", "🍫", "Lejla ima čokoladu. Brat joj je pojeo čokoladu bez pitanja.", "Kad nam neko uzme nešto bez pitanja, često smo ljuti."],
        ["tarik", "📺", "Tarik gleda crtani film. Sestra mu je ugasila televizor.", "Kad nam neko ugasi crtani film, često smo ljuti."],
        ["amina", "🧍", "Amina stoji u redu. Jedan dečak ju je gurnuo.", "Kad nas neko gurne, često smo ljuti."],
    ]),

    // ── Srednje (nivoi 6–10): više okolnosti, dodaju se uplašeno i iznenađeno ─
    ...group(2, "happy", 201, [
        ["haris", "👵", "Haris voli svoju baku. Baka je došla u goste.", "Kad nam dođe neko koga volimo, često smo srećni."],
        ["lejla", "🏖️", "Lejla ide na more sa mamom i tatom.", "Kad idemo na more, često smo srećni."],
        ["amar", "📖", "Amar sluša omiljenu priču. Tata mu čita.", "Kad slušamo omiljenu priču, često smo srećni."],
        ["selma", "⛄", "Selma pravi Sneška Belića.", "Kad se igramo na snegu, često smo srećni."],
        ["tarik", "🦁", "Tarik ide u zoološki vrt.", "Kad idemo u zoološki vrt, često smo srećni."],
        ["amina", "🌳", "Amina se spušta niz tobogan u parku.", "Kad se spuštamo niz tobogan, često smo srećni."],
        ["haris", "🥞", "Haris jede palačinke kod bake.", "Kad jedemo hranu koju volimo, često smo srećni."],
        ["lejla", "🚲", "Lejla vozi bicikl u parku.", "Kad vozimo bicikl, često smo srećni."],
    ]),
    ...group(2, "sad", 221, [
        ["haris", "🚚", "Haris ima najboljeg druga. Drug se seli u drugi grad.", "Kad se drug odseli, često smo tužni."],
        ["selma", "🛏️", "Selma čeka drugaricu. Drugarica je bolesna i ne može da dođe.", "Kad drugarica ne može da dođe, često smo tužni."],
        ["amar", "👋", "Amar se igra sa drugom. Drug mora da ide kući.", "Kad drug ode kući, često smo tužni."],
        ["lejla", "🧳", "Lejla je kod kuće sa tatom. Mama je otišla na put na tri dana.", "Kad neko koga volimo ode na put, često smo tužni."],
        ["tarik", "🐻", "Tarik je zaboravio medu kod bake.", "Kad omiljena igračka nije kod nas, često smo tužni."],
        ["amina", "🏠", "Amina je bila kod bake i deke. Sada mora da ide kući.", "Kad odlazimo od nekoga koga volimo, često smo tužni."],
        ["haris", "🧤", "Haris je izgubio novu rukavicu u parku.", "Kad izgubimo nešto svoje, često smo tužni."],
        ["selma", "🍦", "Selma je htela sladoled. Prodavnica je zatvorena.", "Kad ne dobijemo ono što smo želeli, često smo tužni."],
    ]),
    ...group(2, "angry", 241, [
        ["lejla", "📕", "Lejla ima novu knjigu. Drug joj je pocepao stranu.", "Kad nam neko pocepa knjigu, često smo ljuti."],
        ["amar", "🚶", "Amar čeka u redu u prodavnici. Jedan dečak je stao ispred njega.", "Kad neko stane ispred nas u redu, često smo ljuti."],
        ["tarik", "🧢", "Tarik ima novu kapu. Jedan dečak mu je namerno bacio kapu u baru.", "Kad nam neko namerno baci stvari, često smo ljuti."],
        ["amina", "🧩", "Amina slaže slagalicu. Brat joj je namerno rasturio slagalicu.", "Kad nam neko namerno pokvari igru, često smo ljuti."],
        ["haris", "🎲", "Haris igra igru sa drugom. Drug ne poštuje pravila igre.", "Kad neko ne poštuje pravila igre, često smo ljuti."],
        ["selma", "⚽", "Selma se igra loptom. Jedna devojčica joj je uzela loptu i otišla.", "Kad nam neko uzme loptu, često smo ljuti."],
        ["amar", "🏰", "Amar je napravio zamak od peska. Jedan dečak je namerno zgazio zamak.", "Kad nam neko namerno pokvari ono što smo napravili, često smo ljuti."],
        ["lejla", "🗣️", "Lejla priča mami šta je radila u vrtiću. Brat stalno prekida Lejlu.", "Kad nas neko stalno prekida, često smo ljuti."],
    ]),
    ...group(2, "scared", 261, [
        ["haris", "🐕", "Haris šeta ulicom. Veliki pas laje i trči prema njemu.", "Kad veliki pas trči prema nama, često smo uplašeni."],
        ["lejla", "⛈️", "Lejla je u svojoj sobi. Napolju jako grmi.", "Kad jako grmi, često smo uplašeni."],
        ["amar", "🏪", "Amar je u prodavnici. Nigde ne vidi mamu.", "Kad ne vidimo mamu u prodavnici, često smo uplašeni."],
        ["selma", "💡", "Selma je u sobi. Svetlo se odjednom ugasilo.", "Kad odjednom ostanemo u mraku, često smo uplašeni."],
        ["tarik", "🌙", "Tarik leži u krevetu. U mraku čuje čudan zvuk.", "Kad u mraku čujemo čudan zvuk, često smo uplašeni."],
        ["amina", "🐝", "Amina sedi u parku. Pčela zuji oko njene glave.", "Kad pčela zuji oko nas, često smo uplašeni."],
        ["haris", "💤", "Haris je sanjao ružan san.", "Kad sanjamo ružan san, često smo uplašeni."],
        ["lejla", "💉", "Lejla je kod doktora. Treba da primi vakcinu.", "Kad treba da primimo vakcinu, često smo uplašeni."],
    ]),
    ...group(2, "surprised", 281, [
        ["amar", "🎩", "Amar gleda mađioničara. Mađioničar je izvukao zeca iz šešira.", "Kad vidimo nešto što nismo očekivali, često smo iznenađeni."],
        ["amina", "🐿️", "Amina šeta parkom. Veverica je odjednom pretrčala stazu ispred nje.", "Kad se nešto desi odjednom, često smo iznenađeni."],
        ["tarik", "🌈", "Tarik je pogledao kroz prozor. Na nebu je velika duga.", "Kad vidimo nešto što retko viđamo, često smo iznenađeni.", "happy"],
        ["selma", "🚪", "Selma je otvorila vrata. Na vratima je baka. Selma nije znala da baka dolazi.", "Kad dođe neko koga nismo očekivali, često smo iznenađeni.", "happy"],
    ]),

    // ── Teško (nivoi 11–15): manje očigledne situacije, dodaje se ponosno ─────
    ...group(3, "happy", 301, [
        ["amina", "🌤️", "Amina je čekala da kiša stane. Kiša je stala i Amina ide napolje.", "Kad možemo napolje da se igramo, često smo srećni."],
        ["haris", "🤝", "Haris se posvađao sa drugom. Sada su se pomirili.", "Kad se pomirimo sa drugom, često smo srećni."],
        ["lejla", "🧺", "Lejla zna da sutra ide na izlet sa vrtićem.", "Kad znamo da nas čeka nešto lepo, često smo srećni."],
        ["amar", "💌", "Amar je dobio pozivnicu za rođendan svog druga.", "Kad nas neko pozove na rođendan, često smo srećni."],
        ["selma", "🧸", "Selma je izgubila medu. Posle je našla medu ispod kreveta.", "Kad nađemo ono što smo izgubili, često smo srećni."],
        ["tarik", "🏫", "Tarik je nov u vrtiću. Jedna devojčica ga je pozvala da se igraju.", "Kad nas neko pozove u igru, često smo srećni."],
        ["amina", "🍰", "Amina je sa bakom napravila kolač. Kolač je ukusan.", "Kad sa nekim napravimo nešto lepo, često smo srećni."],
        ["haris", "🧳", "Haris dugo nije video tatu. Tata se vratio sa puta.", "Kad se vrati neko koga volimo, često smo srećni."],
    ]),
    ...group(3, "sad", 321, [
        ["lejla", "🏰", "Lejla je dugo pravila kulu od peska. Talas je srušio kulu.", "Kad se sruši nešto što smo dugo pravili, često smo tužni."],
        ["amar", "📅", "Amar je čekao druga. Drug je obećao da će doći, ali nije došao.", "Kad se ne desi ono čemu smo se radovali, često smo tužni."],
        ["selma", "🌅", "Selma je bila na moru. Leto je gotovo i Selma ide kući.", "Kad se završi nešto lepo, često smo tužni."],
        ["tarik", "🪁", "Tarik gleda decu u parku. Deca se igraju, a njega nisu pozvala.", "Kad nas ne pozovu u igru, često smo tužni."],
        ["amina", "🤒", "Amina je bolesna. Zato ne može da ide na rođendan drugarice.", "Kad ne možemo da idemo na rođendan, često smo tužni."],
        ["haris", "🏫", "Haris ide u novu školu. Njegov najbolji drug je ostao u staroj školi.", "Kad više nismo sa najboljim drugom, često smo tužni."],
        ["lejla", "🎲", "Lejla je igrala igru sa bratom. Lejla je izgubila.", "Kad izgubimo u igri, često smo tužni.", "angry"],
        ["amar", "🖼️", "Amar je nacrtao crtež za tatu. Tata nije stigao da pogleda crtež.", "Kad neko ne pogleda ono što smo napravili, često smo tužni."],
    ]),
    ...group(3, "angry", 341, [
        ["selma", "⏳", "Selma dugo čeka na ljuljašku. Devojčica na ljuljašci neće da siđe.", "Kad dugo čekamo, a ne dođemo na red, često smo ljuti."],
        ["tarik", "💬", "Tarik je rekao istinu. Niko mu ne veruje.", "Kad kažemo istinu, a ne veruju nam, često smo ljuti.", "sad"],
        ["amina", "🥤", "Amina nije prosula sok. Brat je rekao mami da je Amina prosula sok.", "Kad neko kaže da smo uradili nešto što nismo, često smo ljuti."],
        ["haris", "👓", "Haris ima nove naočare. Jedan dečak mu se ruga zbog naočara.", "Kad nam se neko ruga, često smo ljuti.", "sad"],
        ["lejla", "🌙", "Lejla je htela još da se igra. Mama je rekla da je vreme za spavanje.", "Kad moramo da prekinemo igru, često smo ljuti.", "sad"],
        ["amar", "🤫", "Amar je rekao tajnu svom drugu. Drug je rekao tajnu drugoj deci.", "Kad neko kaže našu tajnu drugima, često smo ljuti."],
        ["selma", "✏️", "Selma je pozajmila bratu bojice. Brat je polomio bojice.", "Kad neko pokvari stvar koju smo mu pozajmili, često smo ljuti."],
        ["tarik", "✋", "Tarik je tri puta rekao sestri: „Prestani.” Sestra ga i dalje gura.", "Kad neko ne prestane, a zamolili smo ga, često smo ljuti."],
    ]),
    ...group(3, "scared", 361, [
        ["amina", "🦷", "Amina sutra prvi put ide kod zubara. Ne zna šta će zubar raditi.", "Kad ne znamo šta nas čeka, često smo uplašeni."],
        ["haris", "🎤", "Haris treba da recituje pesmu pred celim razredom.", "Kad treba da nastupamo pred drugima, često smo uplašeni."],
        ["lejla", "🏫", "Lejla je prvi dan u novoj školi. Nikoga ne poznaje.", "Kad smo na novom mestu i nikoga ne poznajemo, često smo uplašeni."],
        ["amar", "🛏️", "Amar prvi put spava kod bake i deke, bez mame i tate.", "Kad prvi put spavamo bez mame i tate, često smo uplašeni."],
        ["selma", "🧗", "Selma se popela visoko na penjalicu. Ne zna kako da siđe.", "Kad smo visoko i ne znamo kako da siđemo, često smo uplašeni."],
        ["tarik", "🕷️", "Tarik je u kupatilu. Veliki pauk ide prema njemu.", "Kad veliki pauk ide prema nama, često smo uplašeni."],
    ]),
    ...group(3, "surprised", 381, [
        ["amina", "🎉", "Amina je ušla u sobu. Drugari su rekli: „Iznenađenje!”", "Kad se desi nešto što nismo očekivali, često smo iznenađeni.", "happy"],
        ["haris", "🎈", "Haris drži balon. Balon je odjednom pukao.", "Kad se nešto desi odjednom, često smo iznenađeni.", "scared"],
        ["lejla", "❄️", "Lejla se probudila. Napolju je sve belo od snega. Lejla nije znala da će pasti sneg.", "Kad vidimo nešto što nismo očekivali, često smo iznenađeni.", "happy"],
        ["amar", "🐸", "Amar je podigao kamen u bašti. Ispod kamena je žaba.", "Kad nađemo nešto što nismo očekivali, često smo iznenađeni."],
        ["selma", "🎒", "Selma je došla u vrtić. U vrtiću je nova vaspitačica. Selma to nije znala.", "Kad vidimo nekog novog koga nismo očekivali, često smo iznenađeni."],
        ["tarik", "🏠", "Tarik je došao kući. Tata je obrijao bradu. Tata sada izgleda drugačije.", "Kad neko odjednom izgleda drugačije, često smo iznenađeni."],
    ]),
    // Ponosno je novo osećanje, pa svaki scenario izričito kaže šta je lik sam uradio ili naučio
    ...group(3, "proud", 401, [
        ["lejla", "🧩", "Lejla je sama složila celu slagalicu. Slagalica je bila teška.", "Kad sami uradimo nešto teško, često smo ponosni."],
        ["haris", "👟", "Haris je prvi put sam vezao pertle.", "Kad prvi put nešto uradimo sami, često smo ponosni."],
        ["amina", "🚲", "Amina je dugo vežbala. Sada vozi bicikl bez pomoćnih točkića.", "Kad dugo vežbamo i uspemo, često smo ponosni."],
        ["amar", "🖼️", "Amar je nacrtao crtež. Učiteljica je pokazala crtež celom razredu.", "Kad drugi vide naš trud, često smo ponosni."],
        ["selma", "🛍️", "Selma je pomogla baki da ponese tešku kesu.", "Kad nekome pomognemo, često smo ponosni.", "happy"],
        ["tarik", "🧥", "Tarik je sam obukao jaknu i sam je zakopčao.", "Kad nešto uradimo sami, često smo ponosni."],
        ["lejla", "🔤", "Lejla je naučila da napiše svoje ime.", "Kad naučimo nešto novo, često smo ponosni."],
        ["haris", "🏊", "Haris je dugo učio da pliva. Danas je sam preplivao bazen.", "Kad uspemo posle mnogo truda, često smo ponosni."],
    ]),
];

const SCENARIOS_BY_ID = new Map<number, EmotionScenario>(SCENARIOS.map((scenario) => [scenario.id, scenario]));

// ── Imenjaci ──────────────────────────────────────────────────────────────────
// Kad se dete zove isto kao lik, pitanje „Kako se Lejla oseća?” zvuči kao pitanje o samom
// detetu. Takav scenario se zato ispriča o drugom liku istog roda (rod glagola, prideva i
// zamenica u tekstu ostaje tačan): menja se svako pojavljivanje imena — u tekstu, pitanju
// i objašnjenju, na ekranu i u govoru.
//
// Imena se ne menjaju rezanjem i lepljenjem nastavaka: svaki oblik koji sme da se pojavi
// u tekstu stoji u tabeli, a zamenjuje se samo cela reč, oblikom istog padeža. Lokativ je
// kod ovih imena jednak dativu; vokativ i prisvojni pridevi („Lejlin”) nisu podržani, jer
// se o liku uvek govori u trećem licu — scenario ih ne sme sadržati.

type ObliqueCase = "gen" | "dat" | "acc" | "ins";

const NAME_CASES: Record<CharacterId, Record<ObliqueCase, string>> = {
    lejla: { gen: "Lejle", dat: "Lejli", acc: "Lejlu", ins: "Lejlom" },
    amina: { gen: "Amine", dat: "Amini", acc: "Aminu", ins: "Aminom" },
    selma: { gen: "Selme", dat: "Selmi", acc: "Selmu", ins: "Selmom" },
    haris: { gen: "Harisa", dat: "Harisu", acc: "Harisa", ins: "Harisom" },
    amar: { gen: "Amara", dat: "Amaru", acc: "Amara", ins: "Amarom" },
    tarik: { gen: "Tarika", dat: "Tariku", acc: "Tarika", ins: "Tarikom" },
};

/**
 * Ko zamenjuje koga. Zamena je uvek istog roda. Kod sva tri muška imena genitiv i akuzativ
 * glase isto („Harisa”, „Amara”, „Tarika”), pa svaka reč ima tačno jednu zamenu.
 */
const STAND_IN: Record<CharacterId, CharacterId> = {
    lejla: "amina",
    amina: "selma",
    selma: "lejla",
    haris: "amar",
    amar: "tarik",
    tarik: "haris",
};

const OBLIQUE_CASES: readonly ObliqueCase[] = ["gen", "dat", "acc", "ins"];
const WORD = /\p{L}+/gu;

/** Tekst u kome je svaki oblik imena lika `from` zamenjen istim padežom imena `to`. */
function renameCharacter(text: string, from: CharacterId, to: CharacterId): string {
    const swaps = new Map<string, string>([[CHARACTERS[from].name, CHARACTERS[to].name]]);
    for (const nameCase of OBLIQUE_CASES) swaps.set(NAME_CASES[from][nameCase], NAME_CASES[to][nameCase]);
    return text.replace(WORD, (word) => swaps.get(word) ?? word);
}

const STAND_IN_SCENARIOS = new Map<number, EmotionScenario>(
    SCENARIOS.map((scenario) => {
        const who = STAND_IN[scenario.who];
        const rename = (text: string) => renameCharacter(text, scenario.who, who);
        return [scenario.id, { ...scenario, who, text: rename(scenario.text), why: rename(scenario.why) }];
    })
);

/**
 * Da li se dete zove isto kao lik iz scenarija. Poredi se celo ime, bez obzira na velika i
 * mala slova i razmake oko imena; važi i ime upisano ćirilicom.
 */
export function isNamesake(scenario: EmotionScenario, childName: string | undefined): boolean {
    const given = childName?.trim().toLocaleLowerCase("sr");
    if (!given) return false;
    const name = CHARACTERS[scenario.who].name;
    return given === name.toLocaleLowerCase("sr") || given === toCyrillic(name).toLocaleLowerCase("sr");
}

/**
 * Scenario po ID-ju. Sa `standIn` vraća isti scenario ispričan o zamenskom liku
 * (za dete koje se zove kao lik iz scenarija — vidi `isNamesake`).
 */
export function getScenario(id: number, standIn = false): EmotionScenario | undefined {
    return (standIn ? STAND_IN_SCENARIOS : SCENARIOS_BY_ID).get(id);
}

/** Pitanje je uvek ista, kratka rečenica sa imenom lika. */
export function questionFor(scenario: EmotionScenario): string {
    return `Kako se ${CHARACTERS[scenario.who].name} oseća?`;
}

// ── Raspored po nivoima ───────────────────────────────────────────────────────

interface LevelRule {
    first: number;
    last: number;
    tier: Tier;
    /** Broj zadataka u nivou (igra ga dodatno ograničava prema uzrastu) */
    rounds: number;
    /** Najviše ponuđenih osećanja */
    choices: number;
    /** Koliko prvih osećanja iz EMOTION_ORDER učestvuje */
    paletteSize: number;
    /** Osećanje koje se na ovim nivoima uvodi — dobija dva zadatka po nivou */
    fresh?: EmotionId;
}

const RULES: readonly LevelRule[] = [
    { first: 1, last: 2, tier: 1, rounds: 4, choices: 2, paletteSize: 2 },
    { first: 3, last: 5, tier: 1, rounds: 4, choices: 3, paletteSize: 3, fresh: "angry" },
    { first: 6, last: 8, tier: 2, rounds: 5, choices: 4, paletteSize: 4, fresh: "scared" },
    { first: 9, last: 10, tier: 2, rounds: 6, choices: 4, paletteSize: 5, fresh: "surprised" },
    { first: 11, last: 13, tier: 3, rounds: 5, choices: 5, paletteSize: 6, fresh: "proud" },
    { first: 14, last: 15, tier: 3, rounds: 6, choices: 6, paletteSize: 6 },
];

const MAX_LEVEL = RULES[RULES.length - 1].last;

interface EmotionLevel {
    /** Scenariji nivoa u osnovnom redosledu (igra ih meša) */
    scenarios: EmotionScenario[];
    /** Najviše ponuđenih osećanja na ovom nivou */
    choices: number;
    /** Osećanja koja se na ovom nivou nude ovom detetu, u stalnom redosledu */
    palette: EmotionId[];
}

interface EmotionLevelOptions {
    /** Koliko osećanja dete poznaje: 3, 5 ili 6 */
    emotionCount: number;
    /** Najviše zadataka u nivou za ovaj uzrast */
    maxRounds: number;
    /**
     * Pomeraj u redovima scenarija (0 = uvek isti izbor). Igra ga bira nasumično pri svakom
     * pokretanju nivoa, pa ponovljen nivo donosi druge priče i svi scenariji dođu na red.
     */
    shift?: number;
}

interface Rotation<T> {
    /** Sledeća stavka koja prolazi `accept`; undefined ako nijedna ne prolazi. */
    next: (accept?: (item: T) => boolean) => T | undefined;
}

/** Kružni red čekanja: svako uzimanje pomera pokazivač, pa se stavke ne ponavljaju dok se sve ne potroše. */
function rotation<T>(items: readonly T[], start = 0): Rotation<T> {
    let cursor = items.length > 0 ? Math.abs(Math.floor(start)) % items.length : 0;
    return {
        next: (accept = () => true) => {
            for (let step = 0; step < items.length; step += 1) {
                const item = items[(cursor + step) % items.length];
                if (!accept(item)) continue;
                cursor = (cursor + step + 1) % items.length;
                return item;
            }
            return undefined;
        },
    };
}

function clampLevel(level: number): number {
    return Number.isFinite(level) ? Math.min(Math.max(Math.round(level), 1), MAX_LEVEL) : 1;
}

/**
 * Scenariji i pravila za nivo, prilagođeni osećanjima koja dete poznaje.
 *
 * Izbor je determinisan za dati `shift`. Nivoi iste težine dele redove čekanja po osećanju, pa se
 * raspored računa redom od prvog nivoa te težine: susedni nivoi tako dobijaju različite
 * scenarije, a osećanja se smenjuju ravnomerno. Koriste se samo scenariji čija su sva
 * najčešća osećanja među onima koja se detetu nude na tom nivou.
 */
export function getEmotionLevel(level: number, { emotionCount, maxRounds, shift = 0 }: EmotionLevelOptions): EmotionLevel {
    const safe = clampLevel(level);
    const rule = RULES.find((r) => safe >= r.first && safe <= r.last) ?? RULES[0];
    const allowed = allowedEmotions(emotionCount);
    const roundLimit = Math.max(1, Number.isFinite(maxRounds) ? Math.floor(maxRounds) : 1);

    const queues = new Map<EmotionId, Rotation<EmotionScenario>>(
        allowed.map((emotion) => [emotion, rotation(SCENARIOS.filter((s) => s.tier === rule.tier && s.common[0] === emotion), shift)])
    );
    // Redosled smenjivanja osećanja se nastavlja iz nivoa u nivo
    const turns = rotation(allowed);

    let result: EmotionLevel = { scenarios: [], choices: rule.choices, palette: [] };
    for (const step of RULES.filter((r) => r.tier === rule.tier)) {
        const palette = allowed.filter((id) => EMOTION_ORDER.indexOf(id) < step.paletteSize);
        const fits = (scenario: EmotionScenario) => scenario.common.every((id) => palette.includes(id));
        const fresh = step.fresh && palette.includes(step.fresh) ? step.fresh : undefined;
        const rounds = Math.min(step.rounds, roundLimit);

        for (let current = step.first; current <= Math.min(step.last, safe); current += 1) {
            const scenarios: EmotionScenario[] = [];
            for (let slot = 0; slot < rounds; slot += 1) {
                // Novo osećanje dolazi na svako treće mesto; ostala mesta dele već poznata osećanja
                const emotion = fresh && slot % 3 === 0 ? fresh : turns.next((id) => palette.includes(id) && id !== fresh);
                const scenario = emotion && queues.get(emotion)?.next((s) => fits(s) && !scenarios.includes(s));
                if (scenario) scenarios.push(scenario);
            }
            if (current === safe) result = { scenarios, choices: step.choices, palette };
        }
    }
    return result;
}

/** Ređa osećanja u stalni redosled prikaza i izbacuje duplikate i nepoznate vrednosti. */
export function inEmotionOrder(ids: readonly unknown[]): EmotionId[] {
    return EMOTION_ORDER.filter((id) => ids.includes(id));
}
