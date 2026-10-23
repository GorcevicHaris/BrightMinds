import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { hasBackground } from "@/app/components/games/scene/backgrounds";
import { cameraFor, MAX_ZOOM } from "@/app/components/games/scene/camera";
import { eyesPoint, Figure, gazeToward, headCenter, isAdult, LOOKS } from "@/app/components/games/scene/figures";
import { SceneArt } from "@/app/components/games/scene/SceneArt";
import { emotionHero } from "@/app/components/games/scene/heroes";
import { hasProp } from "@/app/components/games/scene/props";
import { allScenarios } from "@/app/components/games/data/emotionScenarios";
import { EMOTION_SCENES } from "@/app/components/games/data/emotionScenes";
import { socialScene } from "@/app/components/games/data/socialScenes";
import { getSituationsForLevel } from "@/app/components/games/data/socialSituations";
import { storyForLevel } from "@/app/components/games/data/socialStories";
import { STORY_SCENES, storyScene } from "@/app/components/games/data/storyScenes";
import { USE_ITEMS } from "@/app/components/games/data/usesItems";
import { USES_SCENES, usesScene } from "@/app/components/games/data/usesScenes";
import type { PropId, ViewId } from "@/app/components/games/scene/types";
import { BACKGROUND_IDS, hero, inBed, isFigure, PROP_IDS, scene, sceneParts, thing, think, who, type SceneSpec } from "@/app/components/games/scene/types";

/** Svaki deo slike postoji u kompletu: pozadine, predmeti i likovi */
function assertDrawable(spec: SceneSpec, where: string) {
    const { backgrounds, props, figures } = sceneParts(spec);
    for (const bg of backgrounds) assert.ok(hasBackground(bg), `${where}: nema pozadine „${bg}”`);
    for (const prop of props) assert.ok(hasProp(prop), `${where}: nema predmeta „${prop}”`);
    for (const fig of figures) assert.ok(fig === "hero" || isAdult(fig) || Object.hasOwn(LOOKS, fig), `${where}: nema lika „${fig}”`);
}

describe("scene kit", () => {
    it("draws every background and every prop it names", () => {
        for (const bg of BACKGROUND_IDS) assert.ok(hasBackground(bg), bg);
        for (const prop of PROP_IDS) assert.ok(hasProp(prop), prop);
    });

    it("lists the parts of a scene, inside thought bubbles too", () => {
        const spec = scene("bedroom", [...inBed("hero", 80), think(scene("park", [thing("ball", 120, 140), hero(60)]), 180, 50, 30)]);
        assertDrawable(spec, "primer");
        assert.deepEqual(sceneParts(spec), { backgrounds: ["bedroom", "park"], props: ["bed", "ball"], figures: ["hero", "hero"] });
    });
});

describe("emotion scenes", () => {
    it("has a picture for every scenario, and only for existing scenarios", () => {
        const ids = allScenarios().map((s) => s.id);
        const missing = ids.filter((id) => !EMOTION_SCENES[id]);
        assert.deepEqual(missing, [], `bez slike: ${missing.join(", ")}`);
        const extra = Object.keys(EMOTION_SCENES).map(Number).filter((id) => !ids.includes(id));
        assert.deepEqual(extra, [], `slika bez scenarija: ${extra.join(", ")}`);
    });

    it("draws every picture from existing parts, with the main character in it", () => {
        for (const [id, spec] of Object.entries(EMOTION_SCENES)) {
            assertDrawable(spec, `scenario ${id}`);
            assert.ok(sceneParts(spec).figures.includes("hero"), `scenario ${id}: na slici nema glavnog lika`);
            // Izraz glavnog lika zadaje igra (tačno osećanje ili leđa), nikad opis slike
            const faces = spec.items.filter((item) => "fig" in item && item.fig === "hero" && item.face !== undefined);
            assert.deepEqual(faces, [], `scenario ${id}: glavni lik ne sme imati svoj izraz`);
        }
    });

    it("shows the correct face on easy levels, and hides the face on harder levels until help or answer", () => {
        for (const scenario of allScenarios()) {
            const hidden = emotionHero(scenario, false);
            const revealed = emotionHero(scenario, true);
            assert.equal(hidden.look, scenario.who);
            if (scenario.tier === 1) {
                assert.equal(hidden.face, scenario.common[0], `${scenario.id}: lice mora da pokazuje tačno osećanje`);
                assert.notEqual(hidden.back, true);
            } else {
                assert.equal(hidden.back, true, `${scenario.id}: lice ne sme da se vidi pre pomoći`);
                assert.equal(hidden.face, undefined, `${scenario.id}: lice bez izraza ne sme da se crta`);
            }
            assert.equal(revealed.face, scenario.common[0]);
            assert.notEqual(revealed.back, true);
        }
    });
});

describe("social scenes", () => {
    const situations = Array.from({ length: 15 }, (_, i) => getSituationsForLevel(i + 1)).flat();

    it("has a picture for every situation on every level", () => {
        const missing = situations.filter((situation) => !socialScene(situation.id)).map((situation) => situation.id);
        assert.deepEqual(missing, [], `bez slike: ${missing.join(", ")}`);
        assert.equal(new Set(situations.map((situation) => situation.id)).size, 60);
    });

    it("draws the child from the example, by name, from existing parts", () => {
        for (const situation of situations) {
            const picture = socialScene(situation.id)!;
            assertDrawable(picture.scene, `situacija ${situation.id}`);
            assert.ok(sceneParts(picture.scene).figures.includes("hero"), `situacija ${situation.id}: nema deteta iz primera`);
            // „Harisov brat”, „Ilmin prijatelj”, „Selmi”: ime je u primeru, bar bez poslednjeg slova
            const name = picture.hero[0].toUpperCase() + picture.hero.slice(1);
            assert.ok(situation.model.includes(name.slice(0, -1)), `situacija ${situation.id}: u primeru nema imena ${name}`);
        }
    });

    it("never shows a smiling child when the child stands up for itself or something is wrong", () => {
        const SMILING = ["happy", "calm", "talk", "proud"];
        // Učtive situacije u kojima nešto nije u redu: dete je gurnulo druga, brat plače, prijatelj je pao
        const UPSET = new Set([3, 7, 12]);
        for (const situation of situations) {
            if (situation.kind !== "advocacy" && !UPSET.has(((situation.id - 1) % 15) + 1)) continue;
            const { scene: spec } = socialScene(situation.id)!;
            for (const item of spec.items) {
                if (!("fig" in item) || item.fig !== "hero") continue;
                // Bez zadatog izraza lik dobija podrazumevani blagi osmeh za razgovor
                assert.ok(item.face && !SMILING.includes(item.face), `situacija ${situation.id}: dete iz primera se smeši (${item.face ?? "talk"})`);
            }
        }
    });
});

describe("story scenes", () => {
    it("has a cover and one picture per page for every story", () => {
        for (let level = 1; level <= 15; level += 1) {
            const story = storyForLevel(level);
            assert.ok(storyScene(level, "cover"), `nivo ${level}: nema naslovne slike`);
            assert.equal(STORY_SCENES[level].steps.length, story.steps.length, `nivo ${level}: broj slika ≠ broj stranica`);
            story.steps.forEach((_, i) => assert.ok(storyScene(level, i), `nivo ${level}, stranica ${i + 1}: nema slike`));
        }
        assert.deepEqual(Object.keys(STORY_SCENES).map(Number), Array.from({ length: 15 }, (_, i) => i + 1));
    });

    it("draws every page from existing parts", () => {
        for (const [level, pictures] of Object.entries(STORY_SCENES)) {
            assertDrawable(pictures.cover, `nivo ${level}, naslovna`);
            pictures.steps.forEach((spec, i) => assertDrawable(spec, `nivo ${level}, stranica ${i + 1}`));
        }
    });
});

describe("scene camera", () => {
    it("moves closer to a lone main character, but keeps every figure in the frame", () => {
        const specs = [...Object.values(EMOTION_SCENES), ...Object.values(STORY_SCENES).flatMap((p) => [p.cover, ...p.steps])];
        let closer = 0;
        for (const spec of specs) {
            const { zoom, cx, cy } = cameraFor(spec);
            assert.ok(zoom >= 1 && zoom <= MAX_ZOOM);
            if (zoom > 1.15) closer += 1;
            const halfW = 120 / zoom;
            const halfH = 80 / zoom;
            for (const item of spec.items) {
                if (!("fig" in item)) continue;
                // Sredina lika (stopala i glava) je u kadru
                assert.ok(item.x >= cx - halfW && item.x <= cx + halfW, `lik na x=${item.x} je van kadra`);
                assert.ok((item.y ?? 148) - 30 <= cy + halfH, `lik na y=${item.y} je van kadra`);
            }
        }
        assert.ok(closer > specs.length / 3, `kamera se približila na samo ${closer} od ${specs.length} slika`);
        // Slike za „Čemu služi?” su već krupne i ostaju cele
        for (const spec of Object.values(USES_SCENES)) assert.equal(cameraFor(spec).zoom, 1);
    });
});

describe("figures match the words in the text", () => {
    // Reči koje imenuju dete određenog pola (svi padeži koji se javljaju u tekstovima)
    const MALE = ["drug", "druga", "drugu", "drugom", "drugar", "brat", "brata", "bratu", "bratom", "dečak", "dečaka", "dečaku", "dečakom", "prijatelj", "prijatelja", "prijatelju"];
    const FEMALE = ["drugarica", "drugaricu", "drugarice", "drugarici", "drugaricom", "sestra", "sestru", "sestre", "sestri", "sestrom", "devojčica", "devojčicu", "devojčice", "devojčici"];
    // Kad tekst govori o grupi, uz imenovano dete mogu da budu i deca drugog pola
    const GROUP = ["deca", "deci", "decu", "dece", "drugari", "dete", "gosti", "ljudi", "gužva", "razredom", "putnici"];
    const ADULT_WORDS: Record<string, readonly string[]> = { tata: ["tata", "tatu", "tati", "tate", "tatom"], deka: ["deka", "deke", "deki", "deku", "dekom"] };
    // Osoba se pominje, ali je namerno nema na slici
    const ABSENT = new Set(["emocije 364: tata", "priča 1/1: tata"]);

    interface Page {
        where: string;
        text: string;
        spec: SceneSpec;
    }
    const pages: Page[] = [
        ...allScenarios().map((s) => ({ where: `emocije ${s.id}`, text: s.text, spec: EMOTION_SCENES[s.id] })),
        ...Array.from({ length: 15 }, (_, i) => getSituationsForLevel(i + 1))
            .flat()
            .filter((s) => s.id <= 15 || s.id > 45)
            .map((s) => ({ where: `šta reći ${s.id}`, text: `${s.model} ${s.text}`, spec: socialScene(s.id)!.scene })),
        ...Array.from({ length: 15 }, (_, i) => storyForLevel(i + 1).steps.map((step, j) => ({ where: `priča ${i + 1}/${j + 1}`, text: step.text, spec: storyScene(i + 1, j)! }))).flat(),
    ];

    function words(text: string): string[] {
        const tokens = (text.toLocaleLowerCase("sr").match(/\p{L}+/gu) ?? []) as string[];
        // „druga deca” znači „ostala deca”, ne „drug”
        return tokens.filter((word, i) => !(word === "druga" && tokens[i + 1] === "deca"));
    }

    it("draws a boy for drug/brat/dečak and a girl for drugarica/sestra/devojčica", () => {
        const problems: string[] = [];
        const check = (ok: boolean, message: string) => {
            if (!ok) problems.push(message);
        };
        for (const { where, text, spec } of pages) {
            const tokens = words(text);
            const kids = sceneParts(spec).figures.filter((fig) => fig !== "hero" && Object.hasOwn(LOOKS, fig)) as (keyof typeof LOOKS)[];
            const boys = kids.filter((fig) => !LOOKS[fig].female).length;
            const girls = kids.length - boys;
            const male = tokens.some((word) => MALE.includes(word));
            const female = tokens.some((word) => FEMALE.includes(word));
            const group = tokens.some((word) => GROUP.includes(word));
            if (male) check(boys > 0, `${where}: tekst pominje dečaka, a na slici ga nema — „${text}”`);
            // „Sestra” u ambulanti je medicinska sestra
            if (female) check(girls > 0 || sceneParts(spec).figures.includes("nurse"), `${where}: tekst pominje devojčicu, a na slici je nema — „${text}”`);
            if (male && !female && !group) check(girls === 0, `${where}: tekst pominje samo dečaka, a na slici je devojčica — „${text}”`);
            if (female && !male && !group) check(boys === 0, `${where}: tekst pominje samo devojčicu, a na slici je dečak — „${text}”`);
        }
        assert.deepEqual(problems, []);
    });

    it("draws tata and deka when the text names them", () => {
        for (const { where, text, spec } of pages) {
            const tokens = words(text);
            const figures = sceneParts(spec).figures;
            for (const [adult, forms] of Object.entries(ADULT_WORDS)) {
                if (!tokens.some((word) => forms.includes(word)) || ABSENT.has(`${where}: ${adult}`)) continue;
                assert.ok(figures.includes(adult), `${where}: tekst pominje „${adult}”, a na slici ga nema — „${text}”`);
            }
        }
    });
});

describe("uses scenes", () => {
    /** Predmeti iz kompleta koji crtaju neki od odgovora (i nebo sa suncem ili mesecom) */
    const DEPICTS: Partial<Record<string, readonly PropId[]>> = {
        spoon: ["spoon"],
        pencil: ["pencil"],
        scissors: ["scissors"],
        soap: ["soapBubbles"],
        key: [],
        bed: ["bed", "dogBed"],
        glass: ["glass", "cup"],
        phone: ["phone"],
        ball: ["ball"],
        eyes: ["glasses"],
        backpack: ["backpack", "book", "bookOpen", "shelf"],
        alarm: ["clock"],
        bathtub: ["bathtubTiles"],
        glasses: ["glasses"],
        sneakers: ["shoe", "shoes"],
        gloves: ["glove"],
        cap: ["cap"],
        thermometer: ["thermometer"],
        brush: [],
        book: ["book", "bookOpen", "shelf"],
        bird: ["bird", "duck"],
        fish: ["fish"],
        rabbit: ["rabbit"],
        bee: ["bee"],
        bicycle: ["bicycle", "bicycleSmall"],
        boat: ["boat"],
        plane: ["plane"],
        sun: ["sun"],
        moon: ["moon"],
        rainbow: ["rainbow"],
        snowman: ["snowman"],
        magnifier: ["magnifier"],
    };
    /** Pogled koji crta sunce, mesec ili dugu */
    const SKY_SHOWS: Partial<Record<ViewId, string>> = { day: "sun", night: "moon", dark: "moon", rainbow: "rainbow" };

    it("has a picture for every question", () => {
        const missing = USE_ITEMS.filter((item) => !usesScene(item.id)).map((item) => item.id);
        assert.deepEqual(missing, [], `bez slike: ${missing.join(", ")}`);
        const extra = Object.keys(USES_SCENES).filter((id) => !USE_ITEMS.some((item) => item.id === id));
        assert.deepEqual(extra, [], `slika bez pitanja: ${extra.join(", ")}`);
    });

    it("never shows the answer or another picture from the same group", () => {
        for (const item of USE_ITEMS) {
            const spec = usesScene(item.id)!;
            assertDrawable(spec, `pitanje ${item.id}`);
            const { props } = sceneParts(spec);
            for (const other of USE_ITEMS.filter((candidate) => candidate.group === item.group)) {
                for (const prop of DEPICTS[other.id] ?? []) assert.ok(!props.includes(prop), `pitanje ${item.id}: na slici je „${prop}” (${other.name})`);
                // Sunce, mesec i duga dolaze i sa neba (pogled), ne samo kao predmet
                const sky = spec.view ? SKY_SHOWS[spec.view] : spec.bg === "park" || spec.bg === "playground" || spec.bg === "beach" ? "sun" : undefined;
                if (item.group === "world") assert.notEqual(sky, other.id, `pitanje ${item.id}: nebo pokazuje ${other.name}`);
            }
        }
    });
});

describe("figure gaze", () => {
    const figure = (props: Parameters<typeof Figure>[0]) => renderToStaticMarkup(createElement("svg", null, createElement(Figure, props)));
    const art = (spec: SceneSpec) => renderToStaticMarkup(createElement(SceneArt, { spec }));
    /** Beonjače očiju koje gledaju (crtaju se samo uz pogled) */
    const SCLERA = /<ellipse cx="(35|65)" cy="47" rx="8" ry="9" fill="#ffffff"/g;
    /** Zenice očiju koje gledaju: x koordinate */
    const pupils = (markup: string) => [...markup.matchAll(/<circle cx="([\d.-]+)" cy="[\d.-]+" r="4.6"/g)].map((m) => Number(m[1]));
    const ears = (markup: string) => [...markup.matchAll(/<circle cx="([\d.-]+)" cy="2" r="4"/g)].map((m) => Number(m[1]));

    it("looks straight ahead by default: existing pictures are drawn as before", () => {
        const plain = figure({ id: "amina" });
        assert.equal(plain.match(SCLERA), null);
        assert.deepEqual(ears(plain), [-16.5, 16.5]);
        assert.doesNotMatch(plain, /r="4.6"/);
        // Nijedna postojeća slika ne zadaje pogled, pa nijedna ne crta oči koje gledaju
        const all: SceneSpec[] = [...Object.values(EMOTION_SCENES), ...Object.values(USES_SCENES)];
        for (let level = 1; level <= 15; level += 1) {
            for (const situation of getSituationsForLevel(level)) all.push(socialScene(situation.id)!.scene);
            const cover = storyScene(level, "cover");
            if (cover) all.push(cover);
        }
        for (const spec of all) {
            assert.ok(spec.items.filter(isFigure).every((item) => item.gaze === undefined));
            assert.equal(art(spec).match(SCLERA), null);
        }
    });

    it("turns the eyes and the head toward the point, or only the eyes", () => {
        const right = gazeToward("amina", "stand", 80, -60);
        assert.ok(Math.abs(right.dx - 1) < 1e-9 && Math.abs(right.dy) < 1e-9 && right.head === 1);
        const down = gazeToward("amina", "stand", 0, 0, 0);
        assert.ok(down.dy > 0.99 && down.head === 0);
        assert.deepEqual(gazeToward("amina", "stand", ...headCenter("amina")), { dx: 0, dy: 0, head: 1 });
        assert.equal(gazeToward("amina", "stand", 10, 10, 7).head, 1);

        const turned = figure({ id: "amina", gaze: right });
        assert.equal(turned.match(SCLERA)?.length, 2);
        assert.ok(pupils(turned).every((x) => x === 35 + 3.6 || x === 65 + 3.6), `zenice: ${pupils(turned)}`);
        // Glava okrenuta udesno: obe uši klize ulevo
        assert.deepEqual(ears(turned), [-19.5, 13.5]);

        const eyesOnly = figure({ id: "amina", gaze: { ...right, head: 0 } });
        assert.deepEqual(ears(eyesOnly), [-16.5, 16.5]);
        assert.deepEqual(pupils(eyesOnly), pupils(turned));

        // Okrenut leđima: lice se ne vidi, pa ni pogled
        assert.equal(figure({ id: "amina", back: true, gaze: right }), figure({ id: "amina", back: true }));
    });

    it("takes the point in picture coordinates, also for a mirrored figure, and draws dots only when asked", () => {
        // Preokrenut lik (flip) koji gleda ulevo na slici, u svojim koordinatama gleda „napred” (udesno)
        const mirrored = art(scene("plain", [who("haris", 120, { flip: true, gaze: { x: 20, y: 88 } })]));
        assert.ok(pupils(mirrored).every((x) => x > 35 && x !== 65), `zenice: ${pupils(mirrored)}`);
        const straight = art(scene("plain", [who("haris", 120, { gaze: { x: 20, y: 88 } })]));
        assert.ok(pupils(straight).every((x) => x < 65 && x !== 35), `zenice: ${pupils(straight)}`);

        const dots = (markup: string) => (markup.match(/r="2.7"/g) ?? []).length;
        assert.equal(dots(straight), 0);
        const hinted = art(scene("plain", [who("haris", 120, { gaze: { x: 20, y: 88, line: true, ring: 12 } })]));
        assert.ok(dots(hinted) >= 5, `tačkica: ${dots(hinted)}`);
        assert.match(hinted, /r="12"/);
        // Tačkice kreću od očiju: tačka između očiju je u glavi lika
        const [ex, ey] = eyesPoint("haris", "stand", gazeToward("haris", "stand", -100, -60));
        assert.ok(ex < 0 && ex > -17 && ey < -50 && ey > -70, `${ex}, ${ey}`);
    });
});
