// Slike za izbore u igrama „Šta reći?” i „Socijalne priče”: svaki izbor je mala slika (komplet
// slika iz scene/) sa kratkim natpisom ispod, pa dete koje ne čita bira po slici.
//
// Slika pokazuje dete koje igra (glavni lik) kako radi ili kaže baš to što piše u izboru:
// „Gledam slikovnicu” → dete drži otvorenu knjigu; „Kažem učiteljici” → dete priča sa
// učiteljicom (oblačić); „Bacim igračku” → dete baca medu. Izbori koji manje pomažu se crtaju
// isto tako jasno (bez crvenih znakova), da slika ne oda odgovor.
//
// Slika se traži po tačnom tekstu izbora; test proverava da svaki ponuđeni izbor ima sliku.

import {
    ADULT_IDS,
    hero,
    say,
    scene,
    shout,
    thing,
    who,
    type AdultId,
    type BackgroundId,
    type Face,
    type FigureItem,
    type LookId,
    type PoseId,
    type PropId,
    type SceneItem,
    type SceneSpec,
    type ViewId,
    type WearId,
} from "@/app/components/games/scene/types";

/**
 * Kratak opis slike jednog izbora. Glavni lik je dete koje igra; ključevi su kratki jer ih ima
 * nekoliko stotina:
 *  p, f, h, hs, hr, w, hb — položaj, lice, predmet u ruci (razmera, nagib), odeća, okrenut leđima;
 *  s — dete govori („t”, oblačić) ili viče („l”);
 *  o, op, of, oh, ow, os, same — drugi lik desno: ko je, položaj, lice, predmet, odeća, govori,
 *  gleda u istu stranu (ide ispred deteta);
 *  props — predmeti (veliki stoje na podu, posle stola idu na sto, nebo i znaci su u vazduhu);
 *  bg, v — pozadina i pogled kroz prozor; away — dete gleda u stranu; none — bez lika (samo predmeti).
 */
export interface OptionArt {
    p?: PoseId;
    f?: Face;
    h?: PropId;
    hs?: number;
    hr?: number;
    w?: readonly WearId[];
    hb?: boolean;
    s?: "t" | "l";
    o?: LookId | AdultId;
    op?: PoseId;
    of?: Face;
    oh?: PropId;
    ow?: readonly WearId[];
    os?: boolean;
    same?: boolean;
    props?: readonly PropId[];
    bg?: BackgroundId;
    v?: ViewId;
    away?: boolean;
    none?: boolean;
}

const SIT_POSES: readonly PoseId[] = ["sit", "sitHold", "sitReach", "sitEat", "sitDraw"];
/** Predmeti koji se crtaju u vazduhu (nebo, znaci, zidni sat) */
const AIR: readonly PropId[] = ["sun", "cloud", "rainCloud", "moon", "star", "sparkle", "heart", "notes", "loudNotes", "soundWaves", "burst", "question", "zzz", "steam", "smoke", "spin", "rainDrops", "lightning", "hourglass", "clock", "snowflakes"];
/** Veliki predmeti: crtaju se u prirodnoj veličini */
const BIG: readonly PropId[] = [
    "door",
    "doorOpen",
    "lock",
    "bed",
    "sofa",
    "table",
    "desk",
    "slide",
    "swing",
    "carousel",
    "shopShelf",
    "fridge",
    "stove",
    "sink",
    "shower",
    "train",
    "register",
    "iceCreamStand",
    "poolSlide",
    "laneRope",
    "waitingChairs",
    "bench",
    "seat",
    "tvOff",
    "dentistChair",
    "sled",
    "dogBed",
    "toilet",
    "toyBox",
    "speaker",
    "chair",
];
/** Na čemu lik sedi kad je to već na slici */
const SEATS: readonly PropId[] = ["bench", "sofa", "seat", "sled"];

/** Sličica izbora je mala: kamera sme da priđe bliže nego kod velikih slika */
const ZOOM = 2.4;

const isAdultId = (id: string) => (ADULT_IDS as readonly string[]).includes(id);

/** Slika jednog izbora iz kratkog opisa */
export function optionScene(a: OptionArt): SceneSpec {
    const back: SceneItem[] = [];
    const front: SceneItem[] = [];
    const air: SceneItem[] = [];
    const props = a.props ?? [];
    const onGround = props.filter((prop) => !AIR.includes(prop));
    const inAir = props.filter((prop) => AIR.includes(prop));

    if (a.none) {
        onGround.forEach((prop, i) => back.push(thing(prop, 120 + (i - (onGround.length - 1) / 2) * 50, 140, { s: BIG.includes(prop) ? 1.2 : 2.2 })));
        inAir.forEach((prop, i) => air.push(thing(prop, 126 + i * 20, 70, { s: 1.4 })));
        return { ...scene(a.bg ?? "plain", [...back, ...air], a.v), maxZoom: ZOOM, frame: "square" };
    }

    // Sličica je kvadrat (srednji deo slike), pa su likovi bliže jedan drugom
    const heroX = a.o ? 86 : 100;
    const seated = (pose: PoseId | undefined) => pose !== undefined && SIT_POSES.includes(pose);
    const seatProp = props.find((prop) => SEATS.includes(prop));
    const swim = a.p === "swim";

    // Predmeti: prvi stoji desno od deteta (između dece kad ih je dvoje); posle stola idu na sto
    let x = a.o ? 124 : 146;
    let tableTop: { x: number; y: number } | null = null;
    for (const prop of onGround) {
        if (seatProp === prop && seated(a.p)) {
            back.push(thing(prop, heroX, 150, { s: 1.2 }));
            continue;
        }
        if (tableTop) {
            back.push(thing(prop, tableTop.x, tableTop.y, { s: 1.1 }));
            tableTop.x += 18;
            continue;
        }
        const s = BIG.includes(prop) ? 0.95 : 1.35;
        back.push(thing(prop, x, 150, { s }));
        if (prop === "table" || prop === "desk") tableTop = { x: x - 8, y: 150 - 34 * s };
        else x += BIG.includes(prop) ? 50 : 34;
    }
    inAir.forEach((prop, i) => air.push(thing(prop, (a.o ? 124 : 140) + i * 26, 58, { s: 1.1 })));

    // Glavni lik
    const heroItem: FigureItem = hero(heroX, {
        s: seated(a.p) ? 1.1 : 1.25,
        y: swim ? 120 : seated(a.p) ? 134 : 148,
        pose: a.p,
        face: a.f ?? (a.s ? "talk" : "calm"),
        back: a.hb,
        wear: a.w,
        hold: a.h ? { prop: a.h, s: a.hs ?? 0.8, rot: a.hr } : undefined,
        gaze: a.away ? { x: 0, y: 60 } : undefined,
    });
    if (seated(a.p) && !seatProp) back.push(thing(a.bg === "train" ? "seat" : "chair", heroX - 6, 150, { s: 1.1 }));
    front.push(heroItem);

    // Drugi lik
    if (a.o) {
        const adult = isAdultId(a.o);
        // Zagrljaj: drugi lik stoji tik uz dete i crta se preko njega
        const hugs = a.op === "embrace";
        const otherX = hugs ? heroX + 30 : a.op === "holdHand" && a.p === "holdHand" ? heroX + 52 : 160;
        const sits = seated(a.op);
        if (sits) back.push(thing(a.bg === "train" ? "seat" : "chair", otherX + (a.same ? -6 : 6), 150, { s: adult ? 1.4 : 1.1 }));
        front[hugs ? "push" : "unshift"](
            who(a.o, otherX, {
                s: a.o === "baby" ? 1.3 : adult ? 0.95 : 1.15,
                y: a.op === "swim" ? 120 : sits ? (adult ? 150 : 134) : 148,
                flip: !a.same,
                pose: a.op,
                face: a.of ?? (a.os ? "talk" : "calm"),
                wear: a.ow,
                hold: a.oh ? { prop: a.oh, s: 0.8 } : undefined,
            })
        );
        if (a.os) air.push(say(otherX - 24, 30, true));
    }
    if (a.s === "t") air.push(say(heroX + 24, 34));
    if (a.s === "l") air.push(shout(heroX + 26, 34));
    return { ...scene(a.bg ?? "plain", [...back, ...front, ...air], a.v), maxZoom: ZOOM, frame: "square" };
}

const WINTER: readonly WearId[] = ["jacket", "beanie", "scarf"];
const SWIM: readonly WearId[] = ["swim"];

/** Slike izbora, po tačnom tekstu izbora (isti tekst u obe igre ima istu sliku) */
export const OPTION_ART: Readonly<Record<string, OptionArt>> = {
    // ── Šta reći? ─────────────────────────────────────────────────────────────
    "Hvala!": { s: "t", f: "happy", props: ["heart"] },
    "Bacim poklon na pod.": { p: "throw", h: "gift", f: "angry" },
    "Treba mi pomoć.": { s: "t", f: "worried", o: "teacher", props: ["puzzlePieces"] },
    "Bacim slagalicu.": { p: "throw", h: "puzzle", f: "angry" },
    "Zgrabim celu kutiju kolačića.": { p: "hold", h: "boxOpen", f: "neutral", props: ["cookie"] },
    "Dobar dan!": { s: "t", o: "teacher", of: "happy" },
    "Šta hoćeš?": { s: "l", f: "angry", o: "teacher", of: "worried" },
    "Izvini!": { s: "t", f: "worried", o: "boy", op: "floor", of: "sad" },
    "Skloni se!": { s: "l", f: "angry", p: "push", o: "boy", op: "floor", of: "sad" },
    "Molim te, daj mi vodu.": { s: "t", o: "mama", op: "give", oh: "glass" },
    "Čekam i ništa ne kažem.": { p: "mouth", f: "neutral", props: ["glass", "hourglass"] },
    "Preglasno je.": { s: "t", f: "worried", props: ["speaker", "loudNotes"] },
    "Trpim buku i ništa ne kažem.": { f: "pain", props: ["speaker", "loudNotes"] },
    "Treba mi toalet.": { s: "t", f: "worried", props: ["toilet"] },
    "Hvala ti!": { s: "t", p: "take", h: "teddy", o: "boy", op: "give", of: "happy" },
    "Bacim igračku.": { p: "throw", h: "teddy", f: "angry" },
    "Doviđenja!": { p: "wave", s: "t", props: ["doorOpen"] },
    "Zalupim vrata.": { p: "push", f: "angry", props: ["door", "burst"] },
    "Jesi li dobro?": { s: "t", f: "worried", o: "boy2", of: "cry" },
    "Ne plači, dosadan si.": { s: "l", f: "angry", o: "boy2", of: "cry" },
    "Stani, to mi se ne sviđa.": { p: "stop", f: "firm", s: "t", o: "boy", op: "take", of: "neutral" },
    "Udarim dete.": { p: "push", f: "angry", o: "boy", of: "sad" },
    "Možeš li da mi daš bojicu?": { s: "t", o: "boy", op: "hold", oh: "crayons" },
    "Otmem mu bojicu iz ruke.": { p: "take", h: "crayons", f: "angry", o: "boy", of: "sad" },
    "Hvala na ručku!": { s: "t", props: ["table", "plate"], o: "mama", of: "happy" },
    "Bacim hranu na pod.": { p: "throw", h: "plate", f: "angry" },
    "Zdravo!": { p: "wave", s: "t", o: "boy", op: "wave", of: "happy" },
    "Beži odavde!": { s: "l", f: "angry", p: "point", o: "boy", of: "sad" },
    "Mogu li i ja da se igram?": { s: "t", o: "boy", op: "kick", of: "happy", props: ["ball"] },
    "Uzmem im loptu.": { p: "hold", h: "ball", f: "neutral", o: "boy", of: "sad" },
    "Hoću još.": { s: "t", props: ["table", "bowlEmpty"], o: "mama", op: "give", oh: "pot" },
    "Ništa ne kažem i ostanem {gladan|gladna}.": { p: "belly", f: "worried", props: ["table", "bowlEmpty"] },
    "Izvolite.": { p: "give", s: "t", props: ["doorOpen"], o: "baka", of: "happy" },
    "Pustim vrata da se zalupe.": { f: "neutral", props: ["door", "burst"], o: "baka", of: "scared" },
    "To je moje. Vrati mi, molim te.": { s: "t", f: "firm", p: "take", o: "boy", op: "hold", oh: "pencil", of: "neutral" },
    "Udarim ga.": { p: "push", f: "angry", o: "boy", of: "sad" },
    "Treba li ti pomoć?": { p: "give", s: "t", f: "worried", o: "boy", op: "knee", of: "pain", ow: ["plaster"] },
    "Baš si smotan.": { s: "l", f: "laugh", p: "point", o: "boy", op: "knee", of: "pain" },
    "Jedan sladoled, molim vas.": { s: "t", o: "seller", op: "give", oh: "iceCream", of: "happy" },
    "Guram se preko reda.": { p: "push", f: "neutral", o: "girl", of: "sad", props: ["iceCreamStand"] },
    "Ne želim zagrljaj. Mogu da mahnem.": { p: "wave", s: "t", f: "neutral", o: "aunt", op: "hug" },
    "Trpim zagrljaj, iako ga ne želim.": { f: "worried", o: "aunt", op: "embrace" },
    "Vruće mi je.": { s: "t", f: "tired", w: ["jacket"], props: ["sun"], bg: "park", v: "clear" },
    "Trpim i ništa ne kažem.": { f: "pain", w: ["jacket"], props: ["sun"], bg: "park", v: "clear" },
    "Srećan rođendan!": { s: "t", f: "happy", o: "boy", ow: ["partyHat"], of: "happy", props: ["balloons"] },
    "Gde je moj poklon?": { s: "t", f: "neutral", p: "shrug", o: "boy", ow: ["partyHat"], of: "worried", props: ["gift"] },
    "Izvinite, mogu li da prođem?": { s: "t", o: "man", props: ["doorOpen"] },
    "Guram ljude.": { p: "push", f: "angry", o: "man", of: "worried" },
    "Daj još!": { s: "l", f: "neutral", p: "take", props: ["gift"] },
    "Ne razumem. Reci ponovo.": { s: "t", f: "worried", o: "boy", op: "hold", oh: "cards" },
    "Klimam glavom, iako ne razumem.": { f: "worried", props: ["question"], o: "boy", op: "hold", oh: "cards", os: true },
    "Bacim karte na pod.": { p: "throw", h: "cards", f: "angry" },
    "Na zdravlje!": { s: "t", o: "boy", op: "mouth", of: "yawn" },
    "Fuj, beži od mene!": { s: "l", f: "angry", o: "boy", op: "mouth", of: "yawn" },
    "Smejem se glasno.": { f: "laugh", p: "point", o: "boy", op: "mouth", of: "yawn" },
    "Viknem iz sveg glasa: „Ej!”": { s: "l", f: "angry", p: "up", o: "teacher", of: "scared" },
    "Ti si kriv!": { s: "l", f: "angry", p: "point", o: "boy", op: "floor", of: "sad" },
    "Uzmem tuđu čašu.": { p: "take", h: "glass", f: "neutral", o: "girl", of: "sad" },
    "Treba mi pauza.": { p: "stop", s: "t", f: "tired" },
    "Pišem dalje, iako ne mogu više.": { p: "sitDraw", h: "pencil", hr: 150, f: "pain", props: ["table", "paper"] },
    "Pocepam list iz sveske.": { p: "hold", h: "drawingTorn", f: "angry" },
    "Može li da ostane svetlo?": { s: "t", f: "worried", bg: "bedroom", v: "night", props: ["lamp"] },
    "Ćutim i ne spavam celu noć.": { p: "mouth", f: "tired", bg: "bedroom", v: "night", props: ["moon"] },
    "Vrištim dok svi ne dođu.": { s: "l", p: "up", f: "scared", bg: "bedroom", v: "night" },
    "Otmem mu i drugu igračku.": { p: "take", h: "toyCar", f: "angry", o: "boy", op: "hold", oh: "teddy", of: "sad" },
    "Odem i nikome se ne javim.": { p: "walk", hb: true, props: ["doorOpen"] },
    "Uzmem mu igračku.": { p: "hold", h: "teddy", f: "neutral", o: "boy2", of: "cry" },
    "Boli me ovde.": { p: "belly", f: "pain", s: "t", o: "doctor" },
    "Odgurnem doktorovu ruku.": { p: "push", f: "angry", o: "doctor", op: "give", oh: "stethoscope" },
    "Hoćeš da se igramo zajedno?": { s: "t", p: "give", h: "teddy", o: "baby", of: "cry" },
    "Beži, ovo je samo moje!": { s: "l", f: "angry", p: "hold", h: "teddy", o: "baby", of: "cry" },
    "Sakrijem sve igračke od njega.": { p: "hold", h: "toyBox", hs: 0.6, f: "neutral", o: "baby", of: "cry" },
    "Fuj!": { s: "l", f: "angry", props: ["table", "plate"] },
    "Gurnem druga.": { p: "push", f: "angry", o: "boy", of: "sad" },
    "Vičem na decu.": { s: "l", f: "angry", o: "girl", of: "scared" },
    "Čekam svoj red. Ti si posle mene.": { s: "t", f: "firm", p: "point", o: "boy", of: "neutral", props: ["slide"] },
    "Gurnem dete.": { p: "push", f: "angry", o: "boy", of: "sad", props: ["slide"] },
    "Ništa ne kažem i pustim sve ispred sebe.": { p: "mouth", f: "sad", o: "boy", same: true, props: ["slide"] },
    "Bravo!": { p: "up", s: "t", f: "happy", o: "boy", op: "up", of: "happy" },
    "Ti si varao!": { s: "l", f: "angry", p: "point", o: "boy", of: "sad" },
    "Udarim nogom o zemlju i odem.": { p: "kick", f: "angry", props: ["burst"] },
    "Ćutim i ostanem bez olovke.": { p: "mouth", f: "sad", o: "boy", op: "hold", oh: "pencil" },
    "Ustani, nije ti ništa!": { s: "l", f: "neutral", p: "point", o: "boy", op: "knee", of: "pain" },
    "Vičem: „Hoću odmah!”": { s: "l", f: "angry", p: "up", o: "seller", of: "worried" },
    "Ne želim.": { p: "stop", f: "firm", s: "t", o: "boy", op: "hug" },
    "Rvem se, iako ne želim.": { p: "push", f: "worried", o: "boy", op: "push", of: "neutral" },
    "Vičem na druga.": { s: "l", f: "angry", o: "boy", of: "sad" },
    "Previše mi je buke.": { s: "t", f: "worried", bg: "train", props: ["soundWaves"], o: "mama" },
    "Vičem da svi ućute.": { s: "l", p: "up", f: "angry", bg: "train", o: "man", of: "scared" },
    "Krenem {sam|sama} do vrata autobusa.": { p: "walk", hb: true, bg: "train", props: ["door"] },
    "Dunem u njegove svećice.": { f: "blow", props: ["table", "cake"], o: "boy", ow: ["partyHat"], of: "sad" },
    "Sklanjaj se!": { s: "l", f: "angry", o: "man", of: "worried" },
    "Sviđa mi se.": { s: "t", f: "happy", p: "hold", h: "gift" },
    "Preglasno je. Mogu li da izađem?": { s: "t", p: "ears", f: "worried", o: "teacher", props: ["loudNotes"] },
    "Stavim slušalice koje stišavaju zvuk.": { f: "calm", w: ["headphones"], props: ["loudNotes"] },
    "Ostanem i trpim, iako me uši bole.": { f: "pain", props: ["speaker", "loudNotes"] },
    "Halo?": { p: "drink", h: "phone", hs: 0.7, s: "t" },
    "Dobar dan, ko je to?": { p: "drink", h: "phone", hs: 0.7, s: "t", f: "happy", props: ["question"] },
    "Spustim slušalicu bez reči.": { p: "give", h: "phone", hs: 0.7, f: "neutral", props: ["table"] },
    "Mahnem rukom.": { p: "wave", f: "happy" },
    "Pokažem rukom na vodu.": { p: "point", props: ["table", "glass"] },
    "Sada želim da budem {sam|sama}. Igraćemo se posle.": { s: "t", f: "calm", o: "boy", op: "wave", props: ["bench"] },
    "Ne sada. Treba mi malo mira.": { p: "stop", s: "t", f: "tired", o: "boy", op: "wave" },
    "Igram se, iako mi treba mir.": { p: "kick", f: "tired", props: ["ball"], o: "boy", of: "happy" },
    "Boli me stomak.": { p: "belly", f: "pain", s: "t" },
    "Odem do učiteljice i pokažem stomak.": { p: "belly", f: "pain", o: "teacher" },
    "Ćutim i trpim do kraja dana.": { p: "belly", f: "pain", props: ["clock"] },
    "Pokažem palac gore.": { p: "wave", f: "happy", o: "boy", op: "give", oh: "teddy", of: "happy" },
    "Pozovem mamu.": { p: "wave", s: "t", f: "worried", o: "mama" },
    "Stani. To mi se ne sviđa.": { p: "stop", f: "firm", s: "t", o: "boy", of: "neutral" },
    "Odem i kažem učiteljici.": { s: "t", f: "neutral", o: "teacher" },
    "Smejem se, iako mi se to ne sviđa.": { f: "laugh", o: "boy", of: "neutral" },
    "Hvala ti.": { s: "t", p: "hold", h: "gift", o: "girl", of: "happy" },
    "Hvala što si se setila.": { s: "t", p: "hold", h: "gift", props: ["heart"], o: "girl", of: "happy" },
    "Fuj, ovo mi se ne sviđa!": { s: "l", f: "angry", p: "hold", h: "gift", o: "girl", of: "sad" },
    "Ovo ne volim. Mogu li nešto drugo?": { s: "t", f: "neutral", props: ["table", "plate"], o: "mama" },
    "Šta igrate? Hoću i ja.": { s: "t", props: ["ball", "question"], o: "girl", op: "kick", of: "happy" },
    "Dosta mi je. Zaustavi, molim te.": { p: "stop", s: "t", f: "worried", props: ["carousel", "spin"] },
    "Stani! Hoću da siđem.": { p: "stop", s: "t", f: "firm", o: "boy", op: "push", props: ["carousel"] },
    "Vrtim se dalje, iako mi je muka.": { f: "pain", props: ["carousel", "spin"] },
    "Šta ćemo da radimo umesto toga?": { s: "t", props: ["question"], o: "tata", bg: "pool" },
    "Dišem polako i brojim do pet.": { f: "blow", bg: "pool" },
    "Lupam rukama po vratima bazena.": { p: "push", f: "angry", props: ["lock", "burst"], bg: "pool" },
    "Kažem učiteljici.": { s: "t", o: "teacher" },
    "Pozovem odraslu osobu.": { p: "wave", s: "t", f: "worried", o: "man" },
    "Pokažem prstom sladoled koji želim.": { p: "point", props: ["iceCreamStand"] },
    "Podignem ruku. To je znak za pauzu.": { p: "wave", f: "worried", o: "dentist", bg: "clinic" },
    "Trpim i ništa ne pokažem.": { f: "pain", o: "dentist", op: "give", oh: "toothbrush", bg: "clinic" },
    "Zdravo! Hoćeš da se igraš sa nama?": { p: "wave", s: "t", o: "boy", ow: ["backpack"], of: "calm" },
    "Mahnem mu i pokažem mu gde je naša igra.": { p: "point", o: "boy", ow: ["backpack"], props: ["blocks"] },
    "Pokazujem ga prstom i smejem se.": { p: "point", f: "laugh", o: "boy", ow: ["backpack"], of: "sad" },
    "Dam mu čestitku ili poklon.": { p: "give", h: "gift", o: "boy", ow: ["partyHat"], of: "happy" },
    "Sačekam da se ljudi pomere.": { f: "calm", props: ["hourglass"], o: "man", same: true },

    // ── Socijalne priče ───────────────────────────────────────────────────────
    "Umijem se": { p: "wash", bg: "bathroom", props: ["sink"] },
    "Gledam telefon u krevetu": { p: "hold", h: "phone", hs: 0.7, f: "tired", bg: "bedroom", props: ["bed"] },
    "Kašu i mleko": { none: true, props: ["soup", "milk"] },
    "Samo bombone": { none: true, props: ["sweets", "lollipop"] },
    "Spakujem ranac sa mamom": { p: "hold", h: "backpack", o: "mama", of: "happy" },
    "Istrčim bez ranca": { p: "run", f: "happy", props: ["doorOpen"] },
    "Sednem na svoje mesto": { p: "sit", bg: "classroom", props: ["desk"] },
    "Trčim po hodniku": { p: "run", bg: "hall" },
    "Slušam": { f: "calm", o: "teacher", os: true, bg: "classroom" },
    "Glasno pričam sa drugom": { s: "l", f: "talk", o: "boy", of: "talk", bg: "classroom" },
    "Podignem ruku": { p: "wave", bg: "classroom" },
    "Viknem odgovor": { s: "l", p: "up", bg: "classroom" },
    "Otvorim usta široko": { f: "open", o: "dentist", bg: "clinic" },
    "Stisnem usta": { p: "mouth", f: "firm", o: "dentist", bg: "clinic" },
    "Podignem ruku za pauzu": { p: "wave", f: "worried", o: "dentist", bg: "clinic" },
    "Trpim i ništa ne pokažem": { f: "pain", o: "dentist", op: "give", oh: "toothbrush", bg: "clinic" },
    "Držim spisak sa slikama": { p: "hold", h: "paper", bg: "shop" },
    "Odem {sam|sama} među police": { p: "walk", hb: true, bg: "shop", props: ["shopShelf"] },
    "Pitam mamu: „Može li čokolada?”": { s: "t", props: ["chocolate"], o: "mama", bg: "shop" },
    "Otvorim čokoladu u prodavnici": { p: "eat", h: "chocolate", hs: 0.6, bg: "shop" },
    "Stavljam stvari na traku": { p: "give", h: "milk", props: ["register"], bg: "shop" },
    "Guram se ispred ljudi": { p: "push", f: "angry", o: "woman", of: "worried", bg: "shop" },
    "Namažem kremu za sunce": { p: "give", h: "sunscreen", props: ["sun"], bg: "park", v: "clear" },
    "Obučem zimsku jaknu": { f: "tired", w: WINTER, props: ["sun"], bg: "park", v: "clear" },
    "Pijem vodu iz svoje flašice": { p: "drink", h: "bottle", hs: 0.6, hr: -30, bg: "park" },
    "Trčim dalje bez vode": { p: "run", f: "tired", props: ["sun"], bg: "park", v: "clear" },
    "Spustim se još jednom, pa krenem": { p: "up", f: "happy", props: ["slide"], bg: "playground" },
    "Ostanem u parku bez mame": { f: "worried", bg: "park", v: "dusk" },
    "Kažem mami: „Boli me grlo.”": { s: "t", f: "pain", o: "mama" },
    "Ne kažem nikome": { p: "mouth", f: "pain" },
    "Igram se kao da me ništa ne boli": { p: "kick", f: "pain", props: ["ball"] },
    "Gledam slikovnicu": { p: "hold", h: "bookOpen", f: "calm", bg: "clinic" },
    "Uđem kod doktora preko reda": { p: "walk", hb: true, props: ["doorOpen"], bg: "clinic" },
    "Uzmem igračku drugom detetu": { p: "hold", h: "teddy", f: "neutral", o: "girl", of: "sad", bg: "clinic" },
    "Otvorim usta i kažem „A”": { f: "open", o: "doctor", op: "give", oh: "stick", bg: "clinic" },
    "Odgurnem doktorovu ruku": { p: "push", f: "angry", o: "doctor", op: "give", oh: "stick", bg: "clinic" },
    "Popijem kašiku koju mi mama da": { p: "eat", h: "spoon", o: "mama", op: "give", oh: "syrup" },
    "Popijem ceo sirup bez mame": { p: "drink", h: "syrup", hs: 0.7, hr: -40 },
    "Prospem lek u lavabo": { p: "give", h: "syrup", hr: 120, props: ["sink"], bg: "bathroom" },
    "Sednem za naš sto": { p: "sitEat", bg: "restaurant", props: ["table", "plate"] },
    "Trčim između stolova": { p: "run", bg: "restaurant", props: ["table"] },
    "Sednem za tuđi sto": { p: "sit", bg: "restaurant", o: "man", op: "sit", of: "worried" },
    "Kažem: „Supu, molim vas.”": { s: "t", o: "waiter", op: "hold", oh: "menu", bg: "restaurant" },
    "Viknem: „Daj supu!”": { s: "l", f: "angry", o: "waiter", of: "worried", bg: "restaurant" },
    "Uzmem hranu sa tuđeg stola": { p: "take", h: "cake", hs: 0.4, o: "woman", of: "worried", bg: "restaurant" },
    "Crtam": { p: "sitDraw", h: "pencil", hr: 150, props: ["table", "paper"], bg: "restaurant" },
    "Lupam kašikom o sto": { p: "sitDraw", h: "spoon", f: "angry", props: ["table", "burst"], bg: "restaurant" },
    "Odem u kuhinju da vidim hranu": { p: "walk", hb: true, props: ["doorOpen"], o: "cook", bg: "restaurant" },
    "Pitam mamu: „Da li je vruće?”": { s: "t", props: ["stove", "steam"], o: "mama", bg: "kitchen" },
    "Dotaknem ringlu da proverim": { p: "give", f: "neutral", props: ["stove", "steam"], bg: "kitchen" },
    "Podignem poklopac da vidim ručak": { p: "give", h: "pot", props: ["stove", "steam"], bg: "kitchen" },
    "Stanem u red i pratim učiteljicu": { p: "walk", o: "teacher", op: "walk", same: true, bg: "classroom", props: ["soundWaves"] },
    "Pakujem sve stvari u ranac": { p: "hold", h: "backpack", props: ["book", "soundWaves"], bg: "classroom" },
    "Istrčim napolje ispred svih": { p: "run", props: ["doorOpen", "soundWaves"], bg: "classroom" },
    "Izađem napolje": { p: "walk", bg: "street", props: ["smoke"] },
    "Idem po svoje igračke": { p: "walk", hb: true, props: ["toyBox", "smoke"], bg: "living" },
    "Sakrijem se u ormar": { f: "scared", props: ["door", "smoke"], bg: "living" },
    "Stojim uz odraslu osobu": { p: "holdHand", o: "man", op: "holdHand", bg: "street" },
    "Vratim se u kuću": { p: "walk", hb: true, props: ["doorOpen", "smoke"], bg: "street" },
    "Otrčim daleko niz ulicu": { p: "run", bg: "street" },
    "Kažem „Zdravo” ili mahnem": { p: "wave", s: "t", o: "girl", op: "wave", of: "happy" },
    "Pojačam televizor najjače": { p: "give", h: "remote", props: ["tvOff", "loudNotes"], bg: "living" },
    "Odmah tražim poklone": { p: "take", s: "t", f: "neutral", props: ["gift"], o: "girl", of: "worried" },
    "„Hvala, Lejla!”": { s: "t", p: "hold", h: "book", o: "lejla", of: "happy" },
    "Bacim poklon": { p: "throw", h: "book", f: "angry" },
    "Kažem: „Ovo ne volim.”": { s: "t", f: "neutral", p: "hold", h: "book", o: "lejla", of: "sad" },
    "Pokrijem uši dok traje pesma": { p: "ears", f: "calm", props: ["table", "cake", "notes"] },
    "Gurnem prst u tortu": { p: "point", f: "neutral", props: ["table", "cake"] },
    "Dunem svećice usred pesme": { f: "blow", props: ["table", "cake", "notes"] },
    "Odem u svoju sobu da se odmorim": { f: "tired", p: "walk", bg: "bedroom", props: ["bed"] },
    "Ostanem i trpim buku": { f: "pain", props: ["balloons", "loudNotes"] },
    "Vičem na decu da ućute": { s: "l", f: "angry", o: "girl", of: "scared" },
    "Sipam mu hranu za pse": { p: "give", h: "bag", hr: 100, props: ["dogBowl", "dog"], bg: "kitchen" },
    "Dam mu čokoladu": { p: "give", h: "chocolate", props: ["dog"], bg: "kitchen" },
    "Dam mu svoj ručak": { p: "give", h: "plate", props: ["dog"], bg: "kitchen" },
    "Idemo u šetnju na povocu": { p: "walk", props: ["dog"], bg: "park" },
    "Pustim ga samog napolje": { f: "neutral", props: ["doorOpen", "dog"] },
    "Kažem mu da ćuti": { p: "mouth", f: "firm", props: ["dog", "soundWaves"] },
    "Pitam vlasnika: „Smem li da ga pomazim?”": { s: "t", o: "man", props: ["poodle"], bg: "park" },
    "Odmah ga zagrlim": { p: "embrace", props: ["poodle"], bg: "park" },
    "Dam mu svoju užinu": { p: "give", h: "sandwich", props: ["poodle"], bg: "park" },
    "Pustim ga da spava": { p: "mouth", f: "calm", props: ["dogBed", "dog", "zzz"], bg: "living" },
    "Probudim ga da se igramo": { s: "l", props: ["dogBed", "dog"], bg: "living" },
    "Pojačam crtani film": { p: "give", h: "remote", props: ["tvOff", "loudNotes"], bg: "living" },
    "Sednem na klupu sa tatom": { p: "sit", props: ["bench"], o: "tata", bg: "station" },
    "Zamolim tatu da uključi sat": { s: "t", o: "tata", props: ["clock"], bg: "station" },
    "Priđem šinama da vidim voz": { p: "walk", hb: true, bg: "station", props: ["train"] },
    "Pokažem svoju kartu": { p: "give", h: "ticket", o: "conductor", bg: "station" },
    "Dam kartu tati da je on pokaže": { p: "give", h: "ticket", o: "tata", bg: "station" },
    "Sakrijem kartu": { f: "firm", hb: false, o: "conductor", op: "take", bg: "station" },
    "Kažem tati: „Na mom mestu neko sedi.”": { s: "t", o: "tata", bg: "train", props: ["seat"] },
    "Pokažem baki broj na karti": { p: "give", h: "ticket", o: "baka", op: "sit", bg: "train" },
    "Povučem baku za rukav": { p: "take", f: "neutral", o: "baka", op: "sit", of: "worried", bg: "train" },
    "Gledam kroz prozor": { hb: true, bg: "train" },
    "Slušam muziku na slušalicama": { f: "calm", w: ["headphones"], props: ["notes"], bg: "train" },
    "Skačem po sedištu": { p: "up", f: "laugh", props: ["seat"], bg: "train" },
    "Kažem tati: „Moram u toalet.”": { s: "t", f: "worried", o: "tata", bg: "train" },
    "Pokažem tati sličicu toaleta": { p: "give", h: "toilet", hs: 0.4, o: "tata", bg: "train" },
    "Trpim i ne kažem ništa": { p: "belly", f: "pain", bg: "train" },
    "Držim svoju omiljenu igračku": { p: "hold", h: "teddy", bg: "clinic" },
    "Brojim koliko je dece ispred mene": { p: "point", props: ["waitingChairs"], bg: "clinic" },
    "Uđem odmah, pre svih": { p: "run", props: ["doorOpen"], bg: "clinic" },
    "Udahnem duboko tri puta": { f: "blow", bg: "clinic" },
    "Pitam mamu: „Koliko još?”": { s: "t", o: "mama", props: ["clock"], bg: "clinic" },
    "Lupam na doktorova vrata": { p: "push", f: "angry", props: ["door", "burst"], bg: "clinic" },
    "Dišem duboko i polako": { f: "blow", o: "doctor", op: "give", oh: "stethoscope", bg: "clinic" },
    "Kažem: „Hladno mi je.”": { s: "t", f: "worried", o: "doctor", op: "give", oh: "stethoscope", bg: "clinic" },
    "Ustanem i odem sa stolice": { p: "walk", hb: true, props: ["chair"], bg: "clinic" },
    "Kažem: „Strah me je.”": { s: "t", f: "scared", o: "nurse", op: "give", oh: "syringe", bg: "clinic" },
    "Držim mamu za ruku i gledam u stranu": { p: "holdHand", f: "worried", away: true, o: "mama", op: "holdHand", bg: "clinic" },
    "Naglo povučem ruku": { p: "throw", f: "scared", o: "nurse", op: "give", oh: "syringe", bg: "clinic" },
    "Popijem lek, pa vodu": { p: "drink", h: "glass", hr: -30, props: ["syrup"] },
    "Kažem mami: „Gorko mi je.”": { s: "t", f: "pain", o: "mama", op: "give", oh: "spoon" },
    "Sipam lek u saksiju": { p: "give", h: "syrup", hr: 120, props: ["flowers"] },
    "Pitam: „Mogu li posle tebe?”": { s: "t", o: "girl", op: "hold", oh: "pencil", bg: "classroom" },
    "Crtam drugom bojom dok čekam": { p: "sitDraw", h: "pencil", hr: 150, props: ["table", "paper"], bg: "classroom" },
    "Uzmem joj bojicu iz ruke": { p: "take", h: "pencil", f: "angry", o: "girl", of: "sad", bg: "classroom" },
    "Kažem učiteljici: „Treba mi pomoć.”": { s: "t", f: "worried", o: "teacher", props: ["paperCircle"], bg: "classroom" },
    "Uzmem nov papir i probam opet": { p: "hold", h: "paper", f: "calm", props: ["scissors"], bg: "classroom" },
    "Zgužvam i bacim sve": { p: "throw", h: "paperCircle", f: "angry", bg: "classroom" },
    "„U redu je, bilo je slučajno.”": { s: "t", f: "calm", o: "haris", of: "worried", bg: "classroom" },
    "„{Tužan|Tužna} sam zbog crteža. Pomozi mi da ga osušim.”": { s: "t", f: "sad", p: "hold", h: "drawing", o: "haris", of: "worried", bg: "classroom" },
    "Prospem vodu na njegov crtež": { p: "give", h: "glass", hr: 110, f: "angry", o: "haris", op: "hold", oh: "drawing", of: "sad", bg: "classroom" },
    "Kažem drugarici: „Bravo!”": { p: "up", s: "t", f: "happy", o: "amina", op: "hold", oh: "drawing", of: "happy", bg: "classroom" },
    "Odnesem svoj crtež kući": { p: "hold", h: "drawing", bg: "street" },
    "Pocepam svoj crtež": { p: "hold", h: "drawingTorn", f: "angry", bg: "classroom" },
    "Bacim papiriće u kantu": { p: "give", h: "paperCircle", props: ["basket"], bg: "classroom" },
    "Vratim bojice u kutiju": { p: "give", h: "crayons", props: ["toyBox"], bg: "classroom" },
    "Gurnem sve na pod": { p: "push", f: "angry", props: ["crayonsBroken", "paper"], bg: "classroom" },
    "Istuširam se": { w: SWIM, f: "happy", props: ["shower"], bg: "bathroom" },
    "Stavim naočare za plivanje": { w: ["swim", "glasses"], f: "happy", bg: "pool" },
    "Uđem u vodu u patikama": { f: "neutral", props: ["shoes"], bg: "pool" },
    "Hodam polako": { p: "walk", w: SWIM, bg: "pool" },
    "Mahnem drugu da on dođe do mene": { p: "wave", w: SWIM, o: "boy", ow: SWIM, bg: "pool" },
    "Trčim": { p: "run", w: SWIM, props: ["puddle"], bg: "pool" },
    "Kažem: „Ja čekam red. Ti si posle mene.”": { s: "t", f: "firm", p: "point", w: SWIM, o: "boy", ow: SWIM, of: "neutral", props: ["poolSlide"], bg: "pool" },
    "Kažem tati ili spasiocu": { s: "t", w: SWIM, o: "lifeguard", bg: "pool" },
    "Gurnem dečaka": { p: "push", f: "angry", w: SWIM, o: "boy", ow: SWIM, of: "sad", bg: "pool" },
    "Udahnem duboko i odmorim se uz ivicu": { p: "swim", f: "blow", bg: "pool" },
    "Kažem: „Bravo! Hoćemo opet?”": { p: "swim", s: "t", f: "happy", o: "boy", op: "swim", of: "happy", bg: "pool" },
    "Prskam ga u lice": { p: "swim", f: "angry", o: "boy", op: "swim", of: "sad", props: ["rainDrops"], bg: "pool" },
    "Uhvatim se za ivicu i zovem tatu": { p: "swim", s: "t", f: "worried", o: "tata", bg: "pool" },
    "Izađem iz vode i obrišem lice peškirom": { p: "hold", h: "towel", w: SWIM, bg: "pool" },
    "Plivam dalje ka dubokom": { p: "swim", f: "worried", props: ["motion"], bg: "pool" },
    "Plivam još pet minuta, pa izađem": { p: "swim", f: "happy", props: ["clock"], bg: "pool" },
    "Izaberem poslednju igru u vodi": { p: "swim", f: "happy", props: ["ball"], bg: "pool" },
    "Pravim se da ne čujem": { p: "ears", w: SWIM, o: "tata", os: true, bg: "pool" },
    "Predložim: nos šargarepa, dugmad šišarke": { s: "t", p: "give", h: "carrot", w: WINTER, props: ["snowman"], bg: "snow" },
    "Predložim da napravimo dva Sneška": { s: "t", w: WINTER, props: ["snowman", "snowman"], bg: "snow" },
    "Srušim Sneška": { p: "push", f: "angry", w: WINTER, props: ["snowman", "burst"], bg: "snow" },
    "Kažem: „Stani, ne volim da se grudvam.”": { p: "stop", f: "firm", s: "t", w: WINTER, o: "boy", op: "throw", oh: "snowball", ow: ["beanie"], bg: "snow" },
    "Odem da pravim Sneška": { p: "walk", w: WINTER, props: ["snowman"], bg: "snow" },
    "Bacim grudvu nekome u lice": { p: "throw", h: "snowball", f: "angry", w: WINTER, o: "boy", ow: ["beanie"], of: "sad", bg: "snow" },
    "Brojim do dvadeset dok se Selma spušta": { p: "point", f: "calm", w: WINTER, props: ["sled", "hourglass"], bg: "snow" },
    "Pitam: „Selmo, mogu li ja posle tebe?”": { s: "t", w: WINTER, o: "selma", ow: ["beanie"], props: ["sled"], bg: "snow" },
    "Uzmem joj sanke": { p: "take", f: "neutral", w: WINTER, props: ["sled"], o: "selma", ow: ["beanie"], of: "sad", bg: "snow" },
    "Kažem: „Hladno mi je” i uđem da se ugrejem": { s: "t", f: "worried", w: WINTER, props: ["doorOpen"], bg: "snow" },
    "Zamolim za suve rukavice": { s: "t", w: WINTER, o: "mama", op: "give", oh: "glove", bg: "snow" },
    "Ćutim i igram se dalje": { p: "mouth", f: "pain", w: WINTER, props: ["snowball"], bg: "snow" },
    "Topao čaj": { none: true, props: ["cup", "steam"] },
    "Toplo mleko": { none: true, props: ["milk", "steam"] },
    "Sladoled": { none: true, props: ["iceCream"] },
};

/** Slika izbora po njegovom tekstu (pre `genderText`, onako kako piše u sadržaju) */
export function optionPicture(text: string): SceneSpec | undefined {
    return Object.hasOwn(OPTION_ART, text) ? optionScene(OPTION_ART[text]) : undefined;
}
