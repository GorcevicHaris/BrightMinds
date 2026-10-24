// „Još životinja” (animals/more): svaka od 26 vrsta je registrovana (spiskovi drugara, nazivi,
// izgledi u prodavnici i na serveru) i pravi se bez pregledača; izgledi su potpuni (bar tri,
// prvi besplatan, stalne cene 8–30, srpski nazivi); telo ima sva sidra (rogovi, uši koje
// prolaze kroz kapu, peraja/krila kao šaka „flipper”, dug vrat sa kragnom na ramenima), lice
// prima sve izraze, treptanje i govor; budžet trouglova je poštovan, odeća (Kit: majica, rukav,
// nogavica) i pravi predmeti iz kataloga pristaju, a oklop kornjače ostaje ispod majice.
import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type * as THREE_NS from "three";
import { installFakeCanvas } from "./setup/fakeCanvas";

installFakeCanvas();

type Contract = typeof import("@/app/components/avatar3d/contract");
type Harness = typeof import("@/app/components/avatar3d/items/dev/harness");
let contract: Contract;
let harness: Harness;
let THREE: typeof THREE_NS;
let Kit: typeof import("@/app/components/avatar3d/engine/kit").Kit;
let KINDS: readonly string[];

before(async () => {
    THREE = await import("three");
    contract = await import("@/app/components/avatar3d/contract");
    harness = await import("@/app/components/avatar3d/items/dev/harness");
    await import("@/app/components/avatar3d/items/index");
    await import("@/app/components/avatar3d/animals");
    Kit = (await import("@/app/components/avatar3d/engine/kit")).Kit;
    KINDS = (await import("@/app/components/avatar3d/data")).MORE_ANIMAL_KINDS;
});

function triangles(object: THREE_NS.Object3D): number {
    let tris = 0;
    object.traverse((o) => {
        const mesh = o as THREE_NS.Mesh;
        if (!mesh.isMesh) return;
        const geo = mesh.geometry;
        tris += (geo.index ? geo.index.count : geo.getAttribute("position").count) / 3;
    });
    return tris;
}

function finite(v: THREE_NS.Vector3 | undefined, label: string) {
    assert.ok(v, label);
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), label);
}

/** Najviše trouglova za golo telo životinje (isto kao glavne i dodatne vrste) */
const BODY_BUDGET = { high: 90_000, low: 50_000 };
const EXPRESSIONS = ["neutral", "happy", "proud", "gentle", "curious", "sad", "serious", "worried", "surprised"] as const;

/** Vrsta uha (kapa se prilagođava: visoke i šiljate prolaze kroz kapu) */
const EARS: Record<string, string> = {
    wolf: "pointy", zebra: "tall", hippo: "round", crocodile: "none", kangaroo: "tall", cow: "floppy", pig: "floppy", goat: "floppy",
    duck: "none", chicken: "none", parrot: "none", flamingo: "none", seal: "none", dolphin: "none", turtle: "none", beaver: "round",
    otter: "round", mole: "none", alpaca: "tall", rhino: "pointy", fennec: "pointy", cheetah: "round", leopard: "round", mouse: "round",
    bat: "pointy", dragon: "none",
};
const HOOVES = new Set(["zebra", "cow", "pig", "goat", "alpaca"]);
const FLIPPERS = new Set(["duck", "chicken", "parrot", "flamingo", "seal", "dolphin", "bat"]);
const FINGERS = new Set(["crocodile", "beaver", "otter", "mole", "mouse", "dragon"]);
const WEBBED = new Set(["duck", "flamingo", "seal", "dolphin"]);
/** Rogovi: kapa ih zaobilazi (sidro `horn`), a predmet „rog” ih sakriva */
const HORNS = new Set(["goat", "cow", "rhino", "dragon"]);
/** Bez repa na kostima repa (ptice imaju perje na kukovima, slepi miš nema rep) */
const NO_TAIL_BONES = new Set(["duck", "chicken", "parrot", "flamingo", "bat"]);
/** Dug vrat (kragna i ogrlica ostaju na ramenima) */
const LONG_NECK = new Set(["flamingo", "alpaca"]);
/** Kapa sakriva grivu, krestu, čuperak, vunu ili šiljke na temenu */
const HAIR = new Set(["zebra", "cow", "goat", "duck", "chicken", "parrot", "alpaca", "dragon"]);

describe("još 3D životinja (animals/more)", () => {
    it("26 vrsta je u spisku drugara (posle dodatnih), sa nazivom, izgledima i 3D crtežom", async () => {
        const { COMPANION_KINDS } = await import("@/lib/companion");
        const data = await import("@/app/components/avatar3d/data");
        const { MORE_SKINS } = await import("@/app/components/avatar3d/animals/more/skins.data");
        const { animalSkins, isCompanionKind, skinPrice } = await import("@/app/components/avatar3d/manifest");
        assert.equal(KINDS.length, 26);
        assert.equal(new Set(KINDS).size, KINDS.length);
        for (const kind of KINDS) {
            assert.ok((COMPANION_KINDS as readonly string[]).includes(kind), `${kind}: lib/companion.ts`);
            assert.ok(isCompanionKind(kind), kind);
            assert.ok(data.isMoreAnimalKind(kind), kind);
            assert.ok(!data.isAnimalKind(kind) && !data.isExtraAnimalKind(kind) && !data.isHumanKind(kind), `${kind}: jedan spisak`);
            const label = data.COMPANION_LABELS[kind as keyof typeof data.COMPANION_LABELS];
            assert.match(label, /^[A-ZČĆŽŠĐ]/, `${kind}: naziv`);
            const builder = contract.companionBuilder(kind);
            assert.ok(builder, kind);
            assert.equal(builder.skins, MORE_SKINS[kind as keyof typeof MORE_SKINS], kind);
            // Prodavnica i server vide izglede (cena izgleda pri kupovini)
            assert.equal(animalSkins(kind), builder.skins, kind);
            for (const skin of builder.skins) assert.equal(skinPrice(kind, skin.id), skin.price, `${kind}/${skin.id}`);
            assert.equal(skinPrice(kind, "nepostoji"), undefined, kind);
        }
    });

    it("izgledi: bar tri, jedinstveni id-jevi, prvi besplatan, prirodne boje besplatne, posebna 8–30, srpski nazivi", async () => {
        const { MORE_SKINS } = await import("@/app/components/avatar3d/animals/more/skins.data");
        const { ANIMAL_SKINS } = await import("@/app/components/avatar3d/animals/skins.data");
        for (const kind of KINDS) {
            const skins = MORE_SKINS[kind as keyof typeof MORE_SKINS];
            const ids = skins.map((s) => s.id);
            assert.equal(new Set(ids).size, ids.length, `${kind}: jedinstveni id-jevi`);
            assert.ok(skins.length >= 3, `${kind}: bar tri izgleda`);
            assert.equal(skins[0].price, 0, `${kind}: prvi izgled je besplatan`);
            assert.ok(skins.filter((s) => s.price === 0).length >= 2, `${kind}: prirodne boje su besplatne`);
            assert.ok(skins.some((s) => s.price > 0), `${kind}: ima posebnih izgleda`);
            for (const s of skins) {
                assert.match(s.id, /^[a-z-]+$/, `${kind}/${s.id}: id`);
                assert.ok(s.price === 0 || (s.price >= 8 && s.price <= 30), `${kind}/${s.id}: cena ${s.price}`);
                assert.ok(Number.isInteger(s.price), `${kind}/${s.id}: cena je ceo broj`);
                assert.match(s.label, /^[A-ZČĆŽŠĐ]/, `${kind}/${s.id}: naziv`);
                assert.doesNotMatch(s.label, /bijel|cvijet|mlijek|snijež|sjeć/i, `${kind}/${s.id}: ekavica`);
            }
            assert.equal(ANIMAL_SKINS[kind], skins, kind);
        }
    });

    it("svaka vrsta i svaki izgled: kostur, sidra, delovi, lice, pokreti i budžet", () => {
        for (const kind of KINDS) {
            const builder = contract.companionBuilder(kind)!;
            for (const [i, skin] of builder.skins.entries()) {
                // Pun kvalitet za prvi i svaki drugi izgled, ostalo „low” (iste površine, manje podela)
                const quality = i === 0 || i % 2 === 1 ? "high" : "low";
                const body = builder.build({ kind: kind as never, skin: skin.id }, { quality });
                const label = `${kind}/${skin.id}/${quality}`;
                assert.equal(body.kind, kind, label);
                assert.equal(body.proportion, "animal", label);
                const names = body.rig.bones.map((b) => b.name);
                assert.deepEqual(names.slice(0, contract.BONES.length), [...contract.BONES], label);
                for (const extra of names.slice(contract.BONES.length)) assert.ok((contract.EXTRA_BONES as readonly string[]).includes(extra), `${label}: ${extra}`);
                const a = body.anchors;
                for (const [key, v] of Object.entries({
                    ground: a.ground, headCenter: a.head.center, headTop: a.head.top, earL: a.ears.left, earR: a.ears.right, tipL: a.ears.tipL, tipR: a.ears.tipR,
                    eyeL: a.eyes.left, eyeR: a.eyes.right, bridge: a.nose.bridge, noseTip: a.nose.tip, mouth: a.mouth, neck: a.neck.center,
                    shoulderL: a.shoulders.left, shoulderR: a.shoulders.right, hipL: a.hips.left, hipR: a.hips.right, handL: a.hands.left, handR: a.hands.right,
                    grip: a.hands.grip, footL: a.feet.left, footR: a.feet.right, toeL: a.feet.toeL, toeR: a.feet.toeR, back: a.back.center, backN: a.back.normal,
                    cape: a.back.capeTop, pet: a.petSpot,
                })) finite(v, `${label}: ${key}`);
                for (const [key, n] of Object.entries({ height: a.height, radius: a.head.radius, brimY: a.head.brimY, brimR: a.head.brimR, eyeR: a.eyes.radius, snout: a.nose.snout, neckR: a.neck.radius, hand: a.hands.radius })) {
                    assert.ok(Number.isFinite(n), `${label}: ${key}`);
                }
                assert.ok(a.height > 0.9 && a.height < 1.6, `${label}: visina ${a.height}`);
                assert.ok(a.head.top.y > a.eyes.left.y && a.eyes.left.y > a.mouth.y && a.mouth.y > a.neck.y0, `${label}: redosled lica`);
                assert.ok(a.head.brimY > a.eyes.left.y - 0.02 && a.head.brimY < a.head.top.y, `${label}: obod kape`);
                assert.ok(a.head.brimR > 0.08 && a.head.brimR < 0.25, `${label}: brimR ${a.head.brimR}`);
                assert.ok(a.neck.y1 > a.neck.y0 && a.neck.radius > 0.03, `${label}: vrat`);
                assert.ok(a.torso.shoulderY > a.torso.chestY && a.torso.chestY > a.torso.waistY && a.torso.waistY > a.torso.hipY && a.torso.hipY > a.torso.crotchY, `${label}: trup`);
                assert.ok(a.eyes.left.x > 0 && a.eyes.right.x < 0, `${label}: levo je +x`);
                assert.ok(a.petSpot.x < 0 && a.petSpot.y === 0, `${label}: ljubimac gledaocu levo, na tlu`);
                assert.ok(a.feet.toeL.z > a.feet.left.z, `${label}: prsti napred`);
                assert.ok(a.nose.tip.z > a.eyes.left.z - 0.01, `${label}: nos ispred očiju`);
                // Uši
                assert.equal(a.ears.kind, EARS[kind], `${label}: vrsta uha`);
                if (EARS[kind] !== "none") assert.ok((body.parts.ears?.length ?? 0) >= 2, `${label}: uši`);
                if (EARS[kind] === "tall" || EARS[kind] === "pointy") {
                    // Uspravne uši: vrh je iznad korena i iznad oboda kape (prolaze kroz kapu)
                    assert.ok(a.ears.tipL.y > a.ears.left.y && a.ears.tipL.y > a.head.brimY, `${label}: uho iznad kape`);
                    assert.ok(a.ears.radius > 0.01, `${label}: poluprečnik uha`);
                }
                // Šake i stopala
                const hand = HOOVES.has(kind) ? "hoof" : FLIPPERS.has(kind) ? "flipper" : FINGERS.has(kind) ? "hand" : "paw";
                assert.equal(a.hands.kind, hand, `${label}: šaka`);
                assert.equal(a.feet.kind, HOOVES.has(kind) ? "hoof" : WEBBED.has(kind) ? "webbed" : "paw", `${label}: stopalo`);
                assert.ok(body.parts.hands?.length, `${label}: šake`);
                assert.ok(body.parts.feet?.length, `${label}: stopala`);
                assert.ok(body.parts.head?.length, `${label}: glava`);
                // Rep (prolazi kroz odeću): kosti repa ili perje/peraja kao deo „tail”
                if (!NO_TAIL_BONES.has(kind)) {
                    assert.ok(a.tail && names.includes("tail1") && names.includes("tail3"), `${label}: rep`);
                    finite(a.tail.base, `${label}: koren repa`);
                    assert.ok(a.tail.base.z < 0, `${label}: rep pozadi`);
                }
                if (kind !== "bat") assert.ok(body.parts.tail?.length, `${label}: rep je deo tela`);
                // Rogovi
                if (HORNS.has(kind)) {
                    assert.ok(a.horn, `${label}: sidro roga`);
                    finite(a.horn.base, `${label}: koren roga`);
                    finite(a.horn.tip, `${label}: vrh roga`);
                    assert.ok(a.horn.radius > 0.005 && a.horn.base.distanceTo(a.horn.tip) > 0.03, `${label}: rog`);
                    assert.ok(body.parts.horn?.length, `${label}: rogovi su deo tela (kapa ih sakriva)`);
                    if (kind === "rhino") assert.ok(a.horn.base.z > a.eyes.left.z, `${label}: rog na nosu`);
                    else assert.ok(a.horn.base.y > a.eyes.left.y, `${label}: rogovi na temenu`);
                } else assert.equal(a.horn, undefined, `${label}: bez roga`);
                if (HAIR.has(kind)) assert.ok(body.parts.hair?.length, `${label}: kapa sakriva grivu/krestu/čuperak`);
                if (LONG_NECK.has(kind)) {
                    // Dug vrat: kragna i ogrlica ostaju na ramenima, a glava je iznad dugog vrata
                    assert.ok(Math.abs(a.neck.y0 - a.torso.shoulderY) < 0.02 && a.neck.y1 - a.neck.y0 < 0.08, `${label}: ogrlica na ramenima`);
                    assert.ok(body.shape.headBoneY - body.shape.neckBaseY > 0.12, `${label}: dug vrat`);
                }
                // Lice: svi izrazi, treptanje, govor (i „o”), pogled; pokreti repa i ušiju
                for (const e of EXPRESSIONS) for (const w of [0, 0.5, 1]) body.face.setExpression(e, w);
                body.face.setBlink(1);
                body.face.setBlink(0.5);
                body.face.setBlink(0);
                for (const open of [0, 0.4, 1]) body.face.setMouth(open, open > 0.5 ? 1 : 0);
                body.face.setMouth(0);
                body.face.setGaze?.(0.5, -0.3);
                for (let t = 0; t < 3; t += 0.37) body.animate?.(t, 0.016, true);
                body.animate?.(3.3, 0.016, false);
                // Budžet
                const tris = triangles(body.root);
                assert.ok(tris <= BODY_BUDGET[quality], `${label}: ${Math.round(tris)} trouglova`);
                body.root.traverse((o) => {
                    const mesh = o as THREE_NS.Mesh;
                    if (!mesh.isMesh) return;
                    const m = mesh.material as THREE_NS.MeshPhysicalMaterial;
                    if (m.vertexColors) assert.ok(mesh.geometry.getAttribute("color"), `${label}: ${mesh.name || mesh.parent?.name} bez boja temena`);
                    const pos = mesh.geometry.getAttribute("position");
                    for (let k = 0; k < pos.count; k += 97) assert.ok(Number.isFinite(pos.getX(k) + pos.getY(k) + pos.getZ(k)), `${label}: ${mesh.name} NaN`);
                });
                body.dispose();
            }
        }
    });

    it("lice: usta (ili kljun) se pomeraju pri govoru, kapci pri treptanju", () => {
        for (const kind of KINDS) {
            const body = contract.companionBuilder(kind)!.build({ kind: kind as never, skin: "" }, { quality: "low" });
            body.root.updateMatrixWorld(true);
            const snapshot = () => {
                const out: number[] = [];
                body.root.traverse((o) => {
                    const mesh = o as THREE_NS.Mesh;
                    out.push(o.rotation.x, o.position.y);
                    if (mesh.isMesh && mesh.morphTargetInfluences) out.push(...mesh.morphTargetInfluences);
                });
                return out;
            };
            body.face.setMouth(0);
            body.face.setBlink(0);
            const rest = snapshot();
            body.face.setMouth(1);
            const talk = snapshot();
            assert.notDeepEqual(talk, rest, `${kind}: govor pomera usta`);
            body.face.setMouth(0);
            body.face.setBlink(1);
            assert.notDeepEqual(snapshot(), rest, `${kind}: treptanje`);
            body.dispose();
        }
    });

    it("odeća se kroji po telu (Kit): majica, rukav i nogavica izvan tela; oklop kornjače ispod majice", async () => {
        const { torsoPoint } = await import("@/app/components/avatar3d/engine/body");
        for (const kind of KINDS) {
            const body = contract.companionBuilder(kind)!.build({ kind: kind as never, skin: "" }, { quality: "low" });
            const kit = new Kit({ rig: body.rig, root: body.root });
            const mat = new THREE.MeshBasicMaterial();
            const shirt = kit.torso(body.shape.waistY - 0.05, body.shape.neckBaseY - 0.01, 0.012, mat);
            const sleeve = kit.sleeve(1, 0, 0.9, 0.011, mat);
            const leg = kit.leg(-1, 0, 0.9, 0.014, mat);
            for (const m of [shirt, sleeve, leg]) {
                const pos = m.geometry.getAttribute("position");
                assert.ok(pos.count > 100, kind);
                for (let i = 0; i < pos.count; i += 53) assert.ok(Number.isFinite(pos.getX(i) + pos.getY(i) + pos.getZ(i)), `${kind}: NaN u kroju`);
            }
            // Majica je svuda izvan trupa
            const p = new THREE.Vector3();
            for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2;
                const y = body.shape.chestY;
                const inside = torsoPoint(body.shape, angle, y, 0, new THREE.Vector3());
                const out = torsoPoint(body.shape, angle, y, 0.012, p);
                assert.ok(Math.hypot(out.x, out.z) > Math.hypot(inside.x, inside.z), `${kind}: ${i}`);
            }
            if (kind === "turtle") {
                // Oklop je bliže telu od majice (odmak 0,012): udaljenost od preseka trupa
                const shell = body.root.children.filter((o) => o.name === "oklop") as THREE_NS.Mesh[];
                assert.equal(shell.length, 1, "oklop");
                const pos = shell[0].geometry.getAttribute("position");
                const q = new THREE.Vector3();
                for (let i = 0; i < pos.count; i += 7) {
                    p.fromBufferAttribute(pos, i);
                    if (p.y < body.shape.waistY || p.y > body.shape.shoulderY - 0.03) continue;
                    let best = Infinity;
                    for (let k = 0; k < 180; k++) {
                        torsoPoint(body.shape, (k / 180) * Math.PI * 2, p.y, 0, q);
                        best = Math.min(best, Math.hypot(p.x - q.x, p.z - q.z));
                    }
                    assert.ok(best < 0.011, `oklop probija majicu (${i}: ${best.toFixed(4)})`);
                }
            }
            body.dispose();
        }
    });

    it("pravi predmeti iz kataloga (kapa, šešir, naočare, oko vrata, majica, pantalone, patike, u ruci, na leđima) se oblače na svaku vrstu", async () => {
        const { itemsOf } = await import("@/app/components/avatar3d/manifest");
        const pick = (slot: Parameters<typeof itemsOf>[0], group?: string) => itemsOf(slot).find((item) => (!group || item.group === group) && contract.itemBuilder(item.id))?.id;
        const items = [pick("hat", "kape"), pick("hat", "sesiri"), pick("hat", "krune"), pick("glasses"), pick("neck"), pick("outfit", "majice"), pick("outfit", "haljine"), pick("bottom", "pantalone"), pick("feet", "patike"), pick("hand"), pick("back")].filter(Boolean) as string[];
        assert.ok(items.length >= 8, `predmeti: ${items.join(", ")}`);
        for (const kind of KINDS) {
            const plain = harness.buildTestFigure(kind as never, { hat: false });
            const hatted = harness.buildTestFigure(kind as never, { hat: true });
            const a = plain.body.anchors;
            for (const id of items) {
                const slot = itemsOf("hat").some((i) => i.id === id) ? "hat" : undefined;
                const figure = slot === "hat" ? hatted : plain;
                const entry = contract.itemBuilder(id)!;
                const worn = harness.wearItem(figure, id, { [entry.slot]: id }, "low");
                assert.ok(worn, `${id} na ${kind}`);
                for (const object of worn.objects) {
                    object.traverse((o) => {
                        const geometry = (o as THREE_NS.Mesh).geometry;
                        const position = geometry?.getAttribute("position");
                        if (!position) return;
                        for (let i = 0; i < position.count; i += 97) assert.ok(Number.isFinite(position.getX(i) + position.getY(i) + position.getZ(i)), `${id} na ${kind}: NaN`);
                    });
                }
                if (entry.slot === "hat") {
                    // Kapa sedi na glavi: iznad očiju, ne iznad temena u vazduhu
                    figure.body.root.updateMatrixWorld(true);
                    const box = new THREE.Box3();
                    for (const object of worn.objects) box.expandByObject(object);
                    assert.ok(box.max.y > a.head.top.y - 0.02 && box.min.y < a.head.top.y, `${id} na ${kind}: visina kape`);
                    assert.ok(box.min.y > a.eyes.left.y - a.eyes.radius * 2.5, `${id} na ${kind}: kapa ne pada preko lica`);
                }
                harness.takeOff(worn);
            }
            plain.body.dispose();
            hatted.body.dispose();
        }
    });
});
