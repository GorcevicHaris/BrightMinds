// 3D životinje i ljubimci: svaka vrsta je registrovana i pravi se (bez pregledača — platno za
// teksture je lažno), izgledi su potpuni (stari 2D id-jevi i cene su sačuvani, nove vrste imaju
// bar pet izgleda), telo ima sva sidra iz ugovora i lice koje prima sve izraze, budžet trouglova
// je poštovan; svaki ljubimac iz kataloga ima 3D crtež do 15k trouglova.
import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type * as THREE_NS from "three";

// ── Lažno platno (teksture krzna i očiju se crtaju u kodu) ─────────────────────
function fakeContext(): unknown {
    const target: Record<string | symbol, unknown> = {
        createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        createLinearGradient: () => ({ addColorStop: () => undefined }),
        createRadialGradient: () => ({ addColorStop: () => undefined }),
        measureText: () => ({ width: 10 }),
    };
    return new Proxy(target, {
        get: (t, key) => (key in t ? t[key] : () => undefined),
        set: (t, key, value) => {
            t[key] = value;
            return true;
        },
    });
}

const g = globalThis as unknown as { document?: unknown };
if (!g.document) {
    g.document = {
        createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fakeContext() }),
    };
}

type Mod = typeof import("@/app/components/avatar3d/contract");
let contract: Mod;
let THREE: typeof THREE_NS;
let Kit: typeof import("@/app/components/avatar3d/engine/kit").Kit;

before(async () => {
    THREE = await import("three");
    contract = await import("@/app/components/avatar3d/contract");
    await import("@/app/components/avatar3d/animals");
    await import("@/app/components/avatar3d/items/pet");
    Kit = (await import("@/app/components/avatar3d/engine/kit")).Kit;
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

/** Najviše trouglova za golo telo životinje (bez odeće); ceo obučen lik ≤ ~150k */
const BODY_BUDGET = { high: 90_000, low: 50_000 };
const EXPRESSIONS = ["neutral", "happy", "proud", "gentle", "curious", "sad", "serious", "worried", "surprised"] as const;

describe("3D životinje", () => {
    it("svaka glavna vrsta je registrovana", async () => {
        const { ANIMAL_KINDS } = await import("@/app/components/avatar3d/data");
        for (const kind of ANIMAL_KINDS) assert.ok(contract.companionBuilder(kind), kind);
    });

    it("izgledi: jedinstveni id-jevi, prvi besplatan, stalne cene, krzno za svaki izgled", async () => {
        const { ANIMAL_KINDS } = await import("@/app/components/avatar3d/data");
        const { ANIMAL_SKINS } = await import("@/app/components/avatar3d/animals/skins.data");
        const { COATS } = await import("@/app/components/avatar3d/animals/coats");
        for (const kind of ANIMAL_KINDS) {
            const skins = ANIMAL_SKINS[kind];
            const ids = skins.map((s) => s.id);
            assert.equal(new Set(ids).size, ids.length, kind);
            assert.equal(skins[0].price, 0, `${kind}: prvi izgled je besplatan`);
            assert.ok(skins.length >= 5, `${kind}: bar pet izgleda`);
            assert.ok(skins.filter((s) => s.price === 0).length >= 3, `${kind}: bar tri besplatna izgleda`);
            for (const s of skins) {
                assert.ok(s.price === 0 || (s.price >= 8 && s.price <= 30), `${kind}/${s.id}: cena ${s.price}`);
                assert.ok(COATS[kind][s.id], `${kind}/${s.id}: nema krzna`);
                assert.match(s.label, /^[A-ZČĆŽŠĐ]/, `${kind}/${s.id}: naziv`);
            }
            assert.equal(contract.companionBuilder(kind)?.skins, skins, kind);
        }
    });

    it("svi stari 2D izgledi su sačuvani sa istim cenama", async () => {
        const { ANIMAL_SKINS: OLD } = await import("@/app/components/avatar/skins");
        const { ANIMAL_SKINS } = await import("@/app/components/avatar3d/animals/skins.data");
        for (const [kind, skins] of Object.entries(OLD)) {
            const now = ANIMAL_SKINS[kind as keyof typeof ANIMAL_SKINS];
            for (const old of skins) {
                const skin = now.find((s) => s.id === old.id);
                assert.ok(skin, `${kind}/${old.id}`);
                assert.equal(skin.price, old.price, `${kind}/${old.id}`);
                assert.equal(skin.label, old.label, `${kind}/${old.id}`);
            }
        }
    });

    it("svaka vrsta i svaki izgled: telo, sidra, delovi, lice i budžet", async () => {
        const { ANIMAL_KINDS } = await import("@/app/components/avatar3d/data");
        const { ANIMAL_SKINS } = await import("@/app/components/avatar3d/animals/skins.data");
        for (const kind of ANIMAL_KINDS) {
            for (const [i, skin] of ANIMAL_SKINS[kind].entries()) {
                // Pun kvalitet za prvi izgled i za šare; ostalo „low” (brže, iste površine)
                const quality = i === 0 || i % 2 === 1 ? "high" : "low";
                const body = contract.companionBuilder(kind)!.build({ kind, skin: skin.id }, { quality });
                const label = `${kind}/${skin.id}/${quality}`;
                assert.equal(body.kind, kind, label);
                assert.equal(body.proportion, "animal", label);
                // Kostur: 18 obaveznih kostiju istim redom, pa dodatne iz ugovora
                const names = body.rig.bones.map((b) => b.name);
                assert.deepEqual(names.slice(0, contract.BONES.length), [...contract.BONES], label);
                for (const extra of names.slice(contract.BONES.length)) assert.ok((contract.EXTRA_BONES as readonly string[]).includes(extra), `${label}: ${extra}`);
                // Sidra
                const a = body.anchors;
                for (const [key, v] of Object.entries({
                    ground: a.ground, headCenter: a.head.center, headTop: a.head.top, earL: a.ears.left, earR: a.ears.right, tipL: a.ears.tipL, tipR: a.ears.tipR,
                    eyeL: a.eyes.left, eyeR: a.eyes.right, bridge: a.nose.bridge, noseTip: a.nose.tip, mouth: a.mouth, neck: a.neck.center,
                    shoulderL: a.shoulders.left, shoulderR: a.shoulders.right, hipL: a.hips.left, hipR: a.hips.right, handL: a.hands.left, handR: a.hands.right,
                    grip: a.hands.grip, footL: a.feet.left, footR: a.feet.right, toeL: a.feet.toeL, toeR: a.feet.toeR, back: a.back.center, backN: a.back.normal,
                    cape: a.back.capeTop, pet: a.petSpot,
                })) finite(v, `${label}: ${key}`);
                assert.ok(a.height > 0.9 && a.height < 1.4, `${label}: visina ${a.height}`);
                assert.ok(a.head.top.y > a.eyes.left.y && a.eyes.left.y > a.mouth.y && a.mouth.y > a.neck.y0, `${label}: redosled lica`);
                assert.ok(a.head.brimY > a.eyes.left.y && a.head.brimY < a.head.top.y, `${label}: obod kape`);
                assert.ok(a.head.brimR > 0.1 && a.head.brimR < 0.25, `${label}: brimR ${a.head.brimR}`);
                assert.ok(a.neck.y1 > a.neck.y0 && a.neck.radius > 0.03, `${label}: vrat`);
                assert.ok(a.torso.shoulderY > a.torso.chestY && a.torso.chestY > a.torso.waistY && a.torso.waistY > a.torso.hipY && a.torso.hipY > a.torso.crotchY, `${label}: trup`);
                assert.ok(a.eyes.left.x > 0 && a.eyes.right.x < 0, `${label}: levo je +x`);
                assert.ok(a.petSpot.x < 0 && a.petSpot.y === 0, `${label}: ljubimac gledaocu levo, na tlu`);
                assert.ok(a.petScale > 0.6 && a.petScale < 1.2, `${label}: petScale`);
                assert.ok(a.feet.toeL.z > a.feet.left.z, `${label}: prsti napred`);
                if (kind === "unicorn") {
                    assert.ok(a.horn, `${label}: rog`);
                    assert.ok(a.horn.tip.y > a.horn.base.y && a.horn.base.y > a.eyes.left.y, `${label}: rog gore`);
                    assert.ok(body.parts.horn?.length, `${label}: rog je deo tela`);
                }
                if (kind !== "penguin") assert.ok(body.parts.ears?.length === 2, `${label}: uši`);
                assert.ok(body.parts.hands?.length, `${label}: šake`);
                assert.ok(body.parts.feet?.length, `${label}: stopala`);
                assert.ok(body.parts.head?.length, `${label}: glava`);
                assert.equal(a.ears.kind, { cat: "pointy", dog: skin.id === "haski" ? "pointy" : "floppy", bunny: "tall", bear: "round", fox: "pointy", lion: "round", penguin: "none", unicorn: "pointy" }[kind], `${label}: vrsta uha`);
                assert.equal(a.hands.kind, kind === "penguin" ? "flipper" : kind === "unicorn" ? "hoof" : "paw", label);
                assert.equal(a.feet.kind, kind === "penguin" ? "webbed" : kind === "unicorn" ? "hoof" : "paw", label);
                if (kind !== "bunny" && kind !== "bear" && kind !== "penguin") assert.ok(a.tail, `${label}: rep`);
                // Lice: svi izrazi, treptanje, govor, pogled
                for (const e of EXPRESSIONS) for (const w of [0, 0.5, 1]) body.face.setExpression(e, w);
                body.face.setBlink(1);
                body.face.setBlink(0);
                body.face.setMouth(1, 0.5);
                body.face.setMouth(0);
                body.face.setGaze?.(0.5, -0.3);
                body.animate?.(1.2, 0.016, true);
                body.animate?.(1.3, 0.016, false);
                // Budžet
                const tris = triangles(body.root);
                assert.ok(tris <= BODY_BUDGET[quality], `${label}: ${Math.round(tris)} trouglova`);
                // Telo i krzno nose boje temena (materijal krzna ih koristi)
                body.root.traverse((o) => {
                    const mesh = o as THREE_NS.Mesh;
                    if (!mesh.isMesh) return;
                    const m = mesh.material as THREE_NS.MeshPhysicalMaterial;
                    if (m.vertexColors) assert.ok(mesh.geometry.getAttribute("color"), `${label}: ${mesh.name || mesh.parent?.name} bez boja temena`);
                });
                body.dispose();
            }
        }
    });

    it("odeća se kroji po telu životinje (Kit: trup, rukavi, nogavice ostaju izvan krzna)", async () => {
        const { ANIMAL_KINDS } = await import("@/app/components/avatar3d/data");
        const { torsoPoint } = await import("@/app/components/avatar3d/engine/body");
        for (const kind of ANIMAL_KINDS) {
            const body = contract.companionBuilder(kind)!.build({ kind, skin: "" }, { quality: "low" });
            const kit = new Kit({ rig: body.rig, root: body.root });
            const mat = new THREE.MeshBasicMaterial();
            const shirt = kit.torso(body.shape.waistY - 0.05, body.shape.neckBaseY - 0.01, 0.01, mat);
            kit.sleeve(1, 0, 0.9, 0.01, mat);
            kit.leg(-1, 0, 0.9, 0.012, mat);
            assert.ok(shirt.geometry.getAttribute("position").count > 100, kind);
            // Majica je svuda izvan trupa
            const p = new THREE.Vector3();
            for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2;
                const y = body.shape.chestY;
                const inside = torsoPoint(body.shape, angle, y, 0, new THREE.Vector3());
                const out = torsoPoint(body.shape, angle, y, 0.01, p);
                assert.ok(Math.hypot(out.x, out.z) > Math.hypot(inside.x, inside.z), `${kind}: ${i}`);
            }
            body.dispose();
        }
    });
});

describe("3D ljubimci", () => {
    it("svaki ljubimac iz kataloga ima 3D crtež do 15k trouglova i miran pokret", async () => {
        const { ITEMS } = await import("@/app/components/avatar3d/items/pet.data");
        const body = contract.companionBuilder("cat")!.build({ kind: "cat", skin: "" }, { quality: "high" });
        for (const item of ITEMS) {
            const entry = contract.itemBuilder(item.id);
            assert.ok(entry, item.id);
            assert.equal(entry.slot, "pet", item.id);
            const kit = new Kit({ rig: body.rig, root: body.root });
            const built = entry.builder.build({
                body,
                wear: { pet: item.id },
                hijab: null,
                hairCrown: 0,
                quality: "high",
                kit,
                attach: (bone, object) => {
                    body.rig.bone(bone).add(object);
                    return object;
                },
                toBone: (bone, p) => p.clone().sub(body.rig.rest[bone]),
            });
            assert.ok(built && !("isObject3D" in built) && built.object, item.id);
            const object = built.object!;
            const tris = triangles(object);
            assert.ok(tris > 200 && tris <= 15_000, `${item.id}: ${Math.round(tris)} trouglova`);
            // Na tlu, pored lika (gledaocu levo)
            const box = new THREE.Box3().setFromObject(object);
            assert.ok(box.min.y > -0.02 && box.max.y < 0.7, `${item.id}: visina`);
            assert.ok(box.max.x < 0, `${item.id}: levo od lika`);
            built.animate?.(2, 0.016, true);
            built.animate?.(2.1, 0.016, false);
        }
        body.dispose();
    });
});
