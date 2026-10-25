// Likovi sa hidžabom (devojčica, tinejdžerka, mama): na spisku drugara su odmah pored vršnjaka,
// izgled je uvek besplatan i uvek sa hidžabom, motor ih pravi bez kose (hidžab pokriva kosu, uši
// i vrat), kape sede na hidžabu, a stvari za kosu se uz hidžab ne crtaju i ne nude. Server
// (sanitizeCompanion i katalog) ih prihvata, a stari sačuvani izbori ostaju isti.
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { installFakeCanvas } from "./setup/fakeCanvas";
import {
    COMPANION_GROUPS,
    COMPANION_LABELS,
    HIJAB_BODY,
    HIJAB_KINDS,
    HUMAN_KINDS,
    HUMAN_TRAITS,
    isHijabKind,
    isHumanKind,
} from "@/app/components/avatar3d/data";
import { COMPANION_CATALOG, ITEMS, getItem, skinPrice } from "@/app/components/avatar3d/manifest";
import {
    HAIRSTYLES,
    HIJAB_COLORS,
    HUMAN_DEFAULT,
    NO_HIJAB,
    alwaysHijab,
    companionLook,
    hasHairOption,
    hasHijabOption,
    hijabParts,
    hijabValue,
    humanLook,
    humanLookId,
    parseHumanLook,
    wearsHijab,
} from "@/app/components/avatar3d/looks";
import { COMPANION_KINDS, applyCompanionAction, sanitizeCompanion } from "@/lib/companion";

import type { CompanionLook } from "@/app/components/avatar3d/contract";

installFakeCanvas();

type Figures = typeof import("@/app/components/avatar3d/engine/figure");
type Human = typeof import("@/app/components/avatar3d/engine/human");
type Contract = typeof import("@/app/components/avatar3d/contract");
type Rig = typeof import("@/app/components/avatar3d/engine/rig");
type Hijab = typeof import("@/app/components/avatar3d/engine/hijab");
let figures: Figures;
let human: Human;
let contract: Contract;
let rig: Rig;
let hijab: Hijab;

const HAIR_NAMES = new Set(["kosa", "duga-kosa", "pramen", "rep", "pletenica"]);

function names(root: THREE.Object3D): string[] {
    const out: string[] = [];
    root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && o.visible) out.push(o.name);
    });
    return out;
}

function finite(root: THREE.Object3D, label: string) {
    root.traverse((o) => {
        const position = (o as THREE.Mesh).geometry?.getAttribute("position");
        if (!position) return;
        for (let i = 0; i < position.array.length; i += 29) assert.ok(Number.isFinite(position.array[i]), `${label}: NaN`);
    });
}

describe("3D likovi sa hidžabom", () => {
    before(async () => {
        contract = await import("@/app/components/avatar3d/contract");
        human = await import("@/app/components/avatar3d/engine/human");
        figures = await import("@/app/components/avatar3d/engine/figure");
        rig = await import("@/app/components/avatar3d/engine/rig");
        hijab = await import("@/app/components/avatar3d/engine/hijab");
        await import("@/app/components/avatar3d/items/index");
        await import("@/app/components/avatar3d/animals/index");
    });

    it("su na spisku drugara, ženski, sa nazivima na srpskom i telom vršnjaka", () => {
        assert.deepEqual([...HIJAB_KINDS], ["hijabgirl", "hijabteen", "hijabwoman"]);
        assert.equal(COMPANION_LABELS.hijabgirl, "Devojčica sa hidžabom");
        assert.equal(COMPANION_LABELS.hijabteen, "Tinejdžerka sa hidžabom");
        assert.equal(COMPANION_LABELS.hijabwoman, "Mama sa hidžabom");
        assert.deepEqual([...COMPANION_KINDS].slice(0, HUMAN_KINDS.length), [...HUMAN_KINDS]);
        const registered = contract.registeredIds().companions;
        for (const kind of HIJAB_KINDS) {
            assert.ok(isHumanKind(kind) && isHijabKind(kind), kind);
            assert.ok(registered.includes(kind), `${kind} nije u motoru`);
            assert.equal(HUMAN_TRAITS[kind].female, true, kind);
            assert.equal(HUMAN_TRAITS[kind].age, HUMAN_TRAITS[HIJAB_BODY[kind]].age, kind);
            // Isto telo kao vršnjak (mere i lice), pod svojim imenom
            const shape = rig.bodyShape(kind);
            const base = rig.bodyShape(HIJAB_BODY[kind]);
            assert.equal(shape.kind, kind);
            assert.equal(shape.height, base.height);
            assert.equal(rig.isFemaleKind(kind), true);
        }
        assert.ok(!isHijabKind("girl") && !isHijabKind("grandma"));
    });

    it("spisak drugara je po grupama: deca (devojčica sa hidžabom odmah do devojčice), tinejdžeri, odrasli, nana i dedo, pa životinje", () => {
        assert.deepEqual(COMPANION_GROUPS.map((g) => g.label), ["Deca", "Tinejdžeri", "Odrasli", "Nana i dedo", "Životinje"]);
        assert.deepEqual([...COMPANION_GROUPS[0].kinds], ["girl", "hijabgirl", "boy"]);
        assert.deepEqual([...COMPANION_GROUPS[1].kinds], ["teengirl", "hijabteen", "teenboy"]);
        assert.deepEqual([...COMPANION_GROUPS[2].kinds], ["woman", "hijabwoman", "man"]);
        assert.deepEqual([...COMPANION_GROUPS[3].kinds], ["grandma", "grandpa"]);
        // Svaki drugar je u tačno jednoj grupi (nove životinje se same pojave među životinjama)
        const all = COMPANION_GROUPS.flatMap((g) => [...g.kinds]);
        assert.equal(new Set(all).size, all.length);
        assert.deepEqual([...all].sort(), [...COMPANION_KINDS].sort());
        for (const kind of COMPANION_GROUPS[4].kinds) assert.ok(!isHumanKind(kind), kind);
    });

    it("izgled: koža, oči, boja i kroj hidžaba — uvek sa hidžabom, bez izbora kose, uvek besplatno", () => {
        for (const kind of HIJAB_KINDS) {
            assert.ok(alwaysHijab(kind) && hasHijabOption(kind) && !hasHairOption(kind), kind);
            const id = humanLookId(HUMAN_DEFAULT[kind]);
            assert.ok(hijabParts(HUMAN_DEFAULT[kind].hijab), `${kind}: podrazumevano sa hidžabom`);
            assert.deepEqual(humanLook(kind, id), HUMAN_DEFAULT[kind]);
            assert.equal(HAIRSTYLES[kind][0].id, HUMAN_DEFAULT[kind].style);
            assert.equal(skinPrice(kind, id), 0);
            assert.ok(wearsHijab(kind, undefined) && wearsHijab(kind, id), kind);
            for (const color of HIJAB_COLORS) {
                for (const style of ["omotan", "sportski"] as const) {
                    const look = { ...HUMAN_DEFAULT[kind], tone: "kakao", eye: "zelene", hijab: hijabValue(color.id, style) };
                    assert.deepEqual(parseHumanLook(kind, humanLookId(look)), look, `${kind}/${color.id}/${style}`);
                    assert.equal(skinPrice(kind, humanLookId(look)), 0);
                }
            }
            // Bez hidžaba izgled ne važi (crta se podrazumevani, sa hidžabom)
            const bare = humanLookId({ ...HUMAN_DEFAULT[kind], hijab: NO_HIJAB });
            assert.equal(parseHumanLook(kind, bare), undefined);
            assert.equal(skinPrice(kind, bare), undefined);
            assert.ok(hijabParts(humanLook(kind, bare).hijab));
            // Stari 2D zapis od tri dela (bez hidžaba) takođe nije izgled lika sa hidžabom
            assert.equal(parseHumanLook(kind, "svetla.smedja.duga"), undefined);
        }
        // Nana i ostale ženske osobe i dalje biraju hidžab (ili bez njega)
        assert.ok(parseHumanLook("grandma", "svetla.plave.seda.pundja.krem-sportski"));
        assert.ok(parseHumanLook("grandma", humanLookId(HUMAN_DEFAULT.grandma)));
        assert.ok(!wearsHijab("grandma", undefined) && wearsHijab("grandma", "svetla.plave.seda.pundja.krem"));
    });

    it("svaki lik sa hidžabom se sagradi kao Figure: hidžab je uvek tu, kose i ušiju nema, bez NaN", () => {
        for (const kind of HIJAB_KINDS) {
            for (const value of [HUMAN_DEFAULT[kind].hijab, hijabValue("teget", "sportski")]) {
                const look = companionLook(kind, humanLookId({ ...HUMAN_DEFAULT[kind], hijab: value })) as CompanionLook;
                const figure = new figures.Figure(look, {}, { quality: "low" });
                const body = figure.body;
                assert.ok(human.isHumanBody(body) && body.hijab, `${kind}: hidžab`);
                const visible = names(figure.root);
                assert.ok(visible.includes("hidzab") && visible.includes("porub-hidzaba"), `${kind}: mreža hidžaba`);
                assert.ok(!visible.some((n) => HAIR_NAMES.has(n)), `${kind}: kosa se ne crta`);
                assert.equal(body.parts.hair?.length ?? 0, 0, kind);
                assert.ok((body.parts.ears ?? []).every((ear) => !ear.visible), `${kind}: uši ispod hidžaba`);
                assert.equal(body.anchors.ears.kind, "none");
                // Kapa i ostalo uz kosu: kosa ne diže kapu (sedi na hidžabu)
                assert.equal(body.setHeadwear(true), 0);
                finite(figure.root, `${kind}/${value}`);
                // Kapa, naočare i jakna (hidžab se ponovo kroji po odeći)
                figure.setWear({ hat: "kapa-siltom", glasses: "naocare", outfit: "zimska-jakna" });
                finite(figure.root, `${kind}/${value} sa kapom`);
                assert.ok(figure.slotObjects("hat").length > 0 && figure.slotObjects("glasses").length > 0, kind);
                figure.dispose();
            }
        }
        // Čak i bez hidžaba u izgledu (npr. pokvaren zapis), lik sa hidžabom ga nosi
        const body = human.buildHuman("hijabgirl", { ...HUMAN_DEFAULT.hijabgirl, hijab: NO_HIJAB }, { quality: "low" });
        assert.ok(body.hijab);
        body.dispose();
    });

    it("kapa sedi tačno na hidžabu: površina glave za predmete je uvećana za debljinu tkanine", () => {
        const body = human.buildHuman("hijabgirl", HUMAN_DEFAULT.hijabgirl, { quality: "low" });
        const skin = new THREE.Vector3();
        const over = new THREE.Vector3();
        for (const [u, v] of [[0.5, 0.05], [0.5, 0.25], [0.75, 0.4], [0.0, 0.4]] as const) {
            body.headInfo.point(u, v, skin);
            body.head.point(u, v, over);
            const lift = over.distanceTo(skin);
            const cloth = hijab.hijabThickness(body.shape, u, v);
            assert.ok(lift > cloth && lift < cloth + 0.004, `(${u}, ${v}): ${lift} / ${cloth}`);
        }
        body.dispose();
    });

    it("deo preko ramena se kroji po odeći: jakna je deblja od majice, pa je i hidžab širi", () => {
        assert.ok(hijab.hijabOuter("zimska-jakna") > hijab.hijabOuter("plavi-duks"));
        assert.ok(hijab.hijabOuter("plavi-duks") > hijab.hijabOuter("bela-majica"));
        const body = human.buildHuman("hijabteen", HUMAN_DEFAULT.hijabteen, { quality: "low" });
        const width = () => {
            const mesh = body.root.children.find((o) => o.name === "hidzab") as THREE.Mesh;
            mesh.geometry.computeBoundingBox();
            return mesh.geometry.boundingBox!.max.x;
        };
        body.fitHijab("bela-majica");
        const thin = width();
        body.fitHijab("zimska-jakna");
        assert.ok(width() > thin + 0.01, `${width()} / ${thin}`);
        assert.equal(body.root.children.filter((o) => o.name === "hidzab").length, 1, "stari hidžab je uklonjen");
        body.dispose();
    });

    it("stvari za kosu, minđuše i mašne oko vrata se uz hidžab ne crtaju i ne nude", () => {
        for (const id of ["masna", "traka-za-kosu", "roze-traka-za-kosu", "traka-marama", "mindjuse-alke", "leptir-masna"]) {
            assert.equal(getItem(id)?.hijab, "hide", id);
            assert.ok(figures.hiddenByHijab(id), id);
        }
        // Kape, šeširi, krune i trake-ukrasi (zeka, cvet, venac) se nose preko hidžaba
        for (const id of ["kapa-siltom", "zimska-kapa", "kruna", "bela-kapica", "traka-zeka", "cvetni-venac"]) assert.ok(!figures.hiddenByHijab(id), id);
        // Svaki 3D crtež koji se uz hidžab ne crta je tako označen i u katalogu (prodavnica ga ne nudi)
        for (const item of ITEMS) {
            if (contract.itemBuilder(item.id)?.builder.withHijab === "hide") assert.equal(item.hijab, "hide", item.id);
        }
        const figure = new figures.Figure(companionLook("hijabgirl", undefined) as CompanionLook, {}, { quality: "low" });
        figure.setWear({ hat: "masna", neck: "mindjuse-alke" });
        assert.equal(figure.slotObjects("hat").length, 0);
        assert.equal(figure.slotObjects("neck").length, 0);
        figure.dispose();
    });

    it("server prihvata likove sa hidžabom i njihov izgled; stari sačuvani izbori ostaju isti", () => {
        for (const kind of HIJAB_KINDS) {
            const look = humanLookId({ ...HUMAN_DEFAULT[kind], tone: "tamna", hijab: hijabValue("zelena", "sportski") });
            const raw = { kind, owned: [], wear: {}, skin: { [kind]: look }, spent: 0, v: 3 };
            const state = sanitizeCompanion(raw, "female", COMPANION_CATALOG);
            assert.equal(state.kind, kind);
            assert.deepEqual(state.skin, { [kind]: look });
            const chosen = applyCompanionAction(sanitizeCompanion({}, "female", COMPANION_CATALOG), { action: "choose", kind }, 0, COMPANION_CATALOG);
            assert.ok(chosen.ok && chosen.state.kind === kind);
            // Izgled je besplatan (bez novčića), a bez hidžaba se odbija
            assert.ok(applyCompanionAction(state, { action: "skin", kind, skin: humanLookId(HUMAN_DEFAULT[kind]) }, 0, COMPANION_CATALOG).ok);
            const bare = applyCompanionAction(state, { action: "skin", kind, skin: humanLookId({ ...HUMAN_DEFAULT[kind], hijab: NO_HIJAB }) }, 0, COMPANION_CATALOG);
            assert.deepEqual(bare, { ok: false, reason: "unknown" });
        }
        // Stari zapisi (devojčica, nana sa hidžabom, učiteljica u 2D zapisu) se ne menjaju
        const old = {
            kind: "girl",
            owned: [],
            wear: {},
            skin: { girl: "tamna.zelene.crna.pletenice.roze", grandma: "svetla.plave.seda.pundja.krem", woman: "svetla.kestenjasta.duga" },
            spent: 0,
            v: 9,
        };
        assert.deepEqual(sanitizeCompanion(old, "female", COMPANION_CATALOG), old);
    });
});
