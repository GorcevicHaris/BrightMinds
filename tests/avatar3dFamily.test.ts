// Novi ljudski drugari (tinejdžerka, tinejdžer, nana, dedo) i novi izgledi: drugari su na
// spisku i u motoru, izgled je uvek besplatan, stari id-jevi izgleda važe kao pre, a svaka
// frizura, brada i hidžab se sagrade na svakom čoveku (sa kapom i bez) bez NaN koordinata.
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { installFakeCanvas } from "./setup/fakeCanvas";
import { COMPANION_LABELS, FAMILY_KINDS, HUMAN_KINDS, HUMAN_TRAITS, isHumanKind } from "@/app/components/avatar3d/data";
import { skinPrice } from "@/app/components/avatar3d/manifest";
import {
    BEARDS,
    EYE_COLORS,
    HAIR_COLORS,
    HAIRSTYLES,
    HIJAB_COLORS,
    HUMAN_DEFAULT,
    NO_BEARD,
    NO_HIJAB,
    hasBeardOption,
    hasHijabOption,
    humanLook,
    humanLookId,
    parseHumanLook,
    type HumanLook,
} from "@/app/components/avatar3d/looks";
import { COMPANION_KINDS } from "@/lib/companion";

installFakeCanvas();

/** Frizure starih drugara pre ove izmene (redosled se ne sme menjati: prva je podrazumevana) */
const OLD_STYLES: Record<"girl" | "boy" | "woman" | "man", string[]> = {
    girl: ["duga", "ravna-razdeljak", "do-ramena", "rep", "pletenice", "pundja", "kratka-kovrdzava", "kratka"],
    boy: ["kratka", "razbarusena", "zacesljana", "talasasta", "kovrdzava", "duza", "osisana"],
    woman: ["do-ramena", "duga", "ravna-razdeljak", "rep", "pletenice", "pundja", "kratka-kovrdzava", "kratka"],
    man: ["kratka", "talasasta", "zacesljana", "razbarusena", "kovrdzava", "duza", "osisana", "bez-kose"],
};
const OLD_EYES = ["smedje", "tamne", "lesnik", "zelene", "plave", "sive"];
const OLD_HAIR = ["crna", "smedja", "kestenjasta", "plava", "rida", "seda"];

type Human = typeof import("@/app/components/avatar3d/engine/human");
type Contract = typeof import("@/app/components/avatar3d/contract");
let human: Human;
let contract: Contract;

function finite(object: { traverse: (f: (o: unknown) => void) => void }, label: string) {
    object.traverse((o) => {
        const geometry = (o as { geometry?: { getAttribute: (n: string) => { array: ArrayLike<number> } | undefined } }).geometry;
        const position = geometry?.getAttribute("position");
        if (!position) return;
        for (let i = 0; i < position.array.length; i += 31) assert.ok(Number.isFinite(position.array[i]), `${label}: NaN`);
    });
}

describe("3D porodica: tinejdžeri, nana i dedo", () => {
    before(async () => {
        contract = await import("@/app/components/avatar3d/contract");
        human = await import("@/app/components/avatar3d/engine/human");
    });

    it("novi drugari su na spisku, odmah posle ljudi, sa nazivima i u motoru", () => {
        assert.deepEqual([...FAMILY_KINDS], ["teengirl", "teenboy", "grandma", "grandpa"]);
        assert.deepEqual([...COMPANION_KINDS].slice(0, HUMAN_KINDS.length), [...HUMAN_KINDS]);
        assert.equal(COMPANION_LABELS.teengirl, "Tinejdžerka");
        assert.equal(COMPANION_LABELS.teenboy, "Tinejdžer");
        assert.equal(COMPANION_LABELS.grandma, "Nana");
        assert.equal(COMPANION_LABELS.grandpa, "Dedo");
        const registered = contract.registeredIds().companions;
        for (const kind of FAMILY_KINDS) {
            assert.ok(isHumanKind(kind), kind);
            assert.ok(registered.includes(kind), `${kind} nije u motoru`);
            assert.equal(skinPrice(kind, humanLookId(HUMAN_DEFAULT[kind])), 0, `${kind}: izgled je besplatan`);
            assert.equal(HAIRSTYLES[kind][0].id, HUMAN_DEFAULT[kind].style, kind);
            assert.deepEqual(humanLook(kind, humanLookId(HUMAN_DEFAULT[kind])), HUMAN_DEFAULT[kind]);
        }
    });

    it("hidžab se nudi svim ženskim likovima (i nani), brada i brkovi učitelju i dedi", () => {
        for (const kind of HUMAN_KINDS) {
            assert.equal(hasHijabOption(kind), HUMAN_TRAITS[kind].female, kind);
            assert.equal(hasBeardOption(kind), kind === "man" || kind === "grandpa", kind);
        }
        assert.ok(parseHumanLook("grandma", "svetla.plave.seda.pundja.krem"));
        assert.ok(parseHumanLook("teengirl", "medena.tamne.crna.rep.teget-sportski"));
        assert.equal(parseHumanLook("teenboy", "karamel.smedje.crna.fejd.roze"), undefined);
        assert.ok(parseHumanLook("grandpa", "psenicna.smedje.bela.proredjena.nema.bez.puna"));
        assert.equal(parseHumanLook("teenboy", "karamel.smedje.crna.fejd.nema.bez.brkovi"), undefined);
    });

    it("stari izgledi važe kao pre: isti id-jevi, isti redosled frizura, stare boje na mestu", () => {
        for (const kind of ["girl", "boy", "woman", "man"] as const) {
            assert.deepEqual(HAIRSTYLES[kind].slice(0, OLD_STYLES[kind].length).map((s) => s.id), OLD_STYLES[kind], kind);
        }
        assert.deepEqual(EYE_COLORS.slice(0, OLD_EYES.length).map((e) => e.id), OLD_EYES);
        assert.deepEqual(HAIR_COLORS.slice(0, OLD_HAIR.length).map((h) => h.id), OLD_HAIR);
        assert.deepEqual(parseHumanLook("woman", "svetla.kestenjasta.duga"), { tone: "svetla", eye: "smedje", hair: "kestenjasta", style: "duga", hijab: NO_HIJAB });
        assert.ok(parseHumanLook("girl", "tamna.zelene.crna.pletenice.roze"));
        assert.deepEqual(parseHumanLook("man", "svetla.smedje.crna.talasasta.nema.bez.brada"), { tone: "svetla", eye: "smedje", hair: "crna", style: "talasasta", hijab: NO_HIJAB, beard: "brada" });
        assert.equal(humanLookId(HUMAN_DEFAULT.girl), "psenicna.lesnik.smedja.duga.nema");
    });

    it("ima novih izgleda: ≥ 8 frizura, ≥ 4 boje očiju, prirodne i vesele boje kose — sve besplatno", () => {
        const all = new Set(Object.values(HAIRSTYLES).flat().map((s) => s.id));
        const old = new Set(Object.values(OLD_STYLES).flat());
        assert.ok([...all].filter((id) => !old.has(id)).length >= 8);
        assert.ok(EYE_COLORS.length - OLD_EYES.length >= 4);
        for (const id of ["bela", "proseda", "roze", "ljubicasta", "nebo"]) assert.ok(HAIR_COLORS.some((h) => h.id === id), id);
        for (const list of [EYE_COLORS, HAIR_COLORS]) {
            const ids = list.map((p) => p.id);
            assert.equal(new Set(ids).size, ids.length);
            for (const part of list) assert.match(part.id, /^[a-z-]+$/, part.id);
        }
        assert.equal(skinPrice("girl", "svetla.cilibar.roze.afro-pundjice.nema"), 0);
        assert.equal(skinPrice("boy", "tamna.tamnoplave.nebo.siljci.nema"), 0);
    });

    it("svaka frizura svakog čoveka se sagradi (bez kape i ispod kape) bez NaN", () => {
        for (const kind of HUMAN_KINDS) {
            for (const style of HAIRSTYLES[kind]) {
                const look: HumanLook = { ...HUMAN_DEFAULT[kind], style: style.id, hijab: NO_HIJAB };
                const body = human.buildHuman(kind, look, { quality: "low" });
                for (const hat of [false, true]) {
                    const crown = body.setHeadwear(hat);
                    assert.ok(Number.isFinite(crown) && crown >= 0 && crown < 0.1, `${kind}/${style.id}: ${crown}`);
                    finite(body.root, `${kind}/${style.id}${hat ? " pod kapom" : ""}`);
                }
                body.dispose();
            }
        }
    });

    it("brade, hidžabi i telo novih drugara: mere tela su smislene, sidra konačna", () => {
        for (const beard of BEARDS) {
            if (beard.id === NO_BEARD) continue;
            for (const kind of ["man", "grandpa"] as const) {
                const body = human.buildHuman(kind, { ...HUMAN_DEFAULT[kind], beard: beard.id }, { quality: "low" });
                finite(body.root, `${kind}/${beard.id}`);
                body.dispose();
            }
        }
        for (const kind of HUMAN_KINDS.filter(hasHijabOption)) {
            for (const style of ["", "-sportski"]) {
                const body = human.buildHuman(kind, { ...HUMAN_DEFAULT[kind], hijab: HIJAB_COLORS[2].id + style }, { quality: "low" });
                assert.ok(body.hijab, kind);
                finite(body.root, `${kind}/hidžab${style}`);
                body.dispose();
            }
        }
        const height = (kind: (typeof HUMAN_KINDS)[number]) => {
            const body = human.buildHuman(kind, HUMAN_DEFAULT[kind], { quality: "low" });
            const h = body.anchors.height;
            for (const v of [body.anchors.head.center, body.anchors.feet.toeL, body.anchors.back.center, body.anchors.petSpot]) assert.ok([v.x, v.y, v.z].every(Number.isFinite), kind);
            body.dispose();
            return h;
        };
        // Deca < tinejdžeri < odrasli; nana i dedo malo niži od učiteljice i učitelja
        assert.ok(height("girl") < height("teengirl") && height("teengirl") < height("woman"));
        assert.ok(height("boy") < height("teenboy") && height("teenboy") < height("man"));
        assert.ok(height("grandma") < height("woman") && height("grandma") > height("teengirl") - 0.1);
        assert.ok(height("grandpa") < height("man"));
    });
});
