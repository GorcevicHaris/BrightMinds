// lib/versusFormat.ts
// Kako se igra dvoboj u kojoj igri — čist deo (server, pregledač i testovi).
//
// Svaka igra ima tačno jedan način dvoboja; dete i odrasli ga ne biraju — bira ga igra:
//
//  • „jedan po jedan” (turns) — oboje igraju na JEDNOJ tabli i smenjuju se: jedan potez (par
//    kartica, komad slagalice, razlika, predmet u korpi…) jedno dete, sledeći drugo. Za igre
//    pamćenja, slaganja i logike, gde je smena prirodna i gde se tabla deli (kao „Memorija”
//    za stolom).
//  • „ko je brži” (race) — svako igra svoju kopiju istog nivoa, sa ISTIM zadacima istim redom
//    (zajedničko seme, lib/seededRandom.ts). Za igre kratkog odgovora (jedan izbor od nekoliko
//    slika). Pobeđuje ko ima više tačnih odgovora iz prvog pokušaja; tek kad je to isto,
//    odlučuje ukupno vreme.
//
// Kako je odlučeno, igra po igra (pravda, dužina poteza, čitanje, uzrast):
//  • Trka samo tamo gde je jedan zadatak jedan izbor i traje nekoliko sekundi: tada su isti
//    zadaci zaista isti izazov za oba deteta, a razlika u brzini čitanja ne odlučuje, jer se
//    zadaci izgovaraju (deca od 3 do 6 godina većinom ne čitaju).
//  • Smena tamo gde zadatak traži planiranje, pamćenje ili fini pokret (prevlačenje, pisanje
//    prstom, crtanje puta): pritisak brzine kod dece od 3 do 10 godina, a posebno kod dece sa
//    autizmom i teškoćama motorike, kvari tačnost i podiže napetost; u smeni svako ima svoje
//    vreme, a dete koje čeka uči gledajući (učenje po modelu).
//  • Smena i tamo gde je priča ili situacija duga za čitanje i razmišljanje (socijalne igre):
//    brzina bi nagradila pogađanje umesto razmišljanja o osećanjima drugih.
//  • Dvoboj nikad ne meri sat dok dete igra: u trci se vreme ne prikazuje; ono samo razrešava
//    nerešen broj tačnih odgovora na kraju.
//
// Na jednom uređaju („na smenu”, playTogether.tsx) oba načina su smena na istoj tabli: u trci
// svako dobija svoj zadatak iz istog nivoa (jedan zadatak — jedno dete), jer bi isti zadatak
// redom za oba dao prednost detetu koje drugo — gledalo je odgovor. Na dva uređaja (playRemote)
// trka je prava trka, a „jedan po jedan” se igra na zajedničkoj tabli (lib/sharedPlay.ts);
// igra bez zajedničke table (pisanje prstom) se na dva uređaja igra kao trka sa istim zadacima
// (remoteVersusFormat).

import type { GameId } from "./games";
import { hasSharedBoard } from "./sharedPlay";

export type VersusFormat = "turns" | "race";

export const VERSUS_FORMATS: Readonly<Record<GameId, VersusFormat>> = {
    // ── Ko je brži: jedan izbor od nekoliko slika, kratak zadatak koji se izgovara ──
    shapes: "race", // Pogodi oblik — izbor oblika; zadatak od par sekundi
    "sound-to-image": "race", // Slušaj i spoji — čuje zvuk, bira sliku (samo na istom uređaju)
    gaze: "race", // Šta gleda? — gde lik gleda: jedan izbor
    emotions: "race", // Emocije — jedno lice od nekoliko; priča se izgovara
    counting: "race", // Brojimo — prebroji i izaberi broj
    food: "race", // Šta jede? — jedna hrana za jednu životinju
    uses: "race", // Čemu služi? — jedan predmet za jednu radnju
    where: "race", // Gde je? — jedan predmet na slici (iznad, ispod, u…)
    families: "race", // Mama i beba — spoji mamu i bebu: jedan izbor po tabli
    words: "race", // Prve reči — slika za izgovorenu reč
    pattern: "race", // Šta dolazi sledeće? — jedan izbor koji nastavlja niz
    arithmetic: "race", // Računanje — jedan broj kao odgovor; zadatak se izgovara
    oddone: "race", // Šta ne pripada? — jedna slika od nekoliko

    // ── Jedan po jedan: pamćenje, logika, slaganje, fini pokret, duže čitanje ──
    memory: "turns", // Spoji parove — klasična smena: dve kartice jedno dete, pa drugo
    sequence: "turns", // Šta je prvo? — slaganje redosleda traži planiranje, ne brzinu
    sorting: "turns", // Razvrstaj — predmet po predmet u iste korpe
    puzzle: "turns", // Složi sliku — komad po komad iste slike
    inset: "turns", // Umetaljka — oblik po oblik u istu tablu
    maze: "turns", // Lavirint — vođenje prstom (motorika); svako svoj lavirint redom
    differences: "turns", // Pronađi razlike — razlika po razlika na istim slikama
    missing: "turns", // Šta fali? — pamćenje police; trka bi nagradila pogađanje
    clock: "turns", // Sat — logika vremena za starije; komad po komad brojčanika
    market: "turns", // Prodavnica — računanje novca traži vreme za razmišljanje
    backpack: "turns", // Spakuj ranac — više predmeta u isti ranac, plan
    weather: "turns", // Obuci se — više komada odeće na istog lika, plan
    seriation: "turns", // Poređaj po veličini — komad po komad u isti red
    scale: "turns", // Vaga — tegovi na istu vagu; ravnoteža traži razmišljanje, ne brzinu
    coding: "turns", // Vodi robota — planiranje niza koraka; svako svoj put redom
    tangram: "turns", // Tangram — deo po deo istog oblika (prostorno mišljenje, fini pokret)
    coloring: "turns", // Bojanka — stvaranje nema „brže”; polje po polje iste slike
    letters: "turns", // Slova — pisanje prstom: brzina kvari oblik slova
    numbers: "turns", // Brojevi — isto (pisanje cifara, poređenje)
    social: "turns", // Šta reći? — razmišljanje o drugima, bez žurbe
    "social-story": "turns", // Socijalne priče — duga priča se sluša u komadu
};

export function versusFormat(id: GameId): VersusFormat {
    return VERSUS_FORMATS[id] ?? "race";
}

/**
 * Način dvoboja na dva uređaja (kartica poziva, ekran „VS”, rezultat): „jedan po jedan” samo kad
 * igra ima zajedničku tablu (lib/sharedPlay.ts → hasSharedBoard); inače — pisanje prstom, koje se
 * ne može igrati na tuđem ekranu — trka sa istim zadacima, i to piše na kartici poziva, pa dete
 * uvek zna kako igra.
 */
export function remoteVersusFormat(id: GameId, sharedBoard: boolean = hasSharedBoard(id)): VersusFormat {
    return sharedBoard ? versusFormat(id) : "race";
}

// ── Reči ──────────────────────────────────────────────────────────────────────

/** „ko je brži” / „jedan po jedan” */
export const FORMAT_NAMES: Readonly<Record<VersusFormat, string>> = { race: "ko je brži", turns: "jedan po jedan" };

/** „Dvoboj: ko je brži” / „Dvoboj: jedan po jedan” */
export function duelLabel(format: VersusFormat): string {
    return `Dvoboj: ${FORMAT_NAMES[format]}`;
}

/**
 * Pravilo jednom rečenicom, za dete i odraslog. `where`: dva uređaja ili isti uređaj (na smenu).
 * Nikad ne kaže gde se dodiruje.
 */
export function formatRule(format: VersusFormat, where: "remote" | "local"): string {
    if (where === "local") {
        return format === "race" ? "Na smenu, zadatak po zadatak. Više tačnih pobeđuje." : "Na smenu, na istoj tabli. Više tačnih pobeđuje.";
    }
    return format === "race" ? "Isti zadaci za oboje. Više tačnih pobeđuje." : "Na smenu, na istoj tabli. Više tačnih pobeđuje.";
}
