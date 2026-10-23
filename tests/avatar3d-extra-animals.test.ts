// Dodatne 3D životinje (animals/extra): svaka od 16 vrsta je registrovana i pravi se (bez
// pregledača — platno za teksture je lažno), izgledi su potpuni (bar tri, jedinstveni id-jevi,
// prvi besplatan, stalne cene 8–30, srpski nazivi), telo ima sva sidra iz ugovora (i posebna:
// surla slona, roščići žirafe, dug vrat), lice prima sve izraze, budžet trouglova je poštovan,
// a odeća (Kit) ostaje izvan krzna, vune i bodlji.
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

type Contract = typeof import("@/app/components/avatar3d/contract");
let contract: Contract;
let THREE: typeof THREE_NS;
let Kit: typeof import("@/app/components/avatar3d/engine/kit").Kit;
let KINDS: readonly string[];

before(async () => {
    THREE = await import("three");
    contract = await import("@/app/components/avatar3d/contract");
    await import("@/app/components/avatar3d/animals");
    Kit = (await import("@/app/components/avatar3d/engine/kit")).Kit;
    KINDS = (await import("@/app/components/avatar3d/data")).EXTRA_ANIMAL_KINDS;
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

/** Najviše trouglova za golo telo životinje (bez odeće; isto kao glavne vrste) */
const BODY_BUDGET = { high: 90_000, low: 50_000 };
const EXPRESSIONS = ["neutral", "happy", "proud", "gentle", "curious", "sad", "serious", "worried", "surprised"] as const;

/** Vrsta uha po životinji (kapa se prilagođava) */
const EARS: Record<string, string> = {
    panda: "round", koala: "round", elephant: "floppy", monkey: "round", owl: "pointy", tiger: "round", dinosaur: "none", giraffe: "tall",
    pony: "tall", frog: "none", hedgehog: "round", raccoon: "pointy", deer: "tall", sheep: "floppy", hamster: "round", squirrel: "pointy",
};
const HOOVES = new Set(["giraffe", "pony", "deer", "sheep"]);

describe("dodatne 3D životinje", () => {
    it("svih 16 vrsta je registrovano, sa izgledima iz extra/skins.data.ts", async () => {
        const { EXTRA_SKINS } = await import("@/app/components/avatar3d/animals/extra/skins.data");
        assert.equal(KINDS.length, 16);
        for (const kind of KINDS) {
            const builder = contract.companionBuilder(kind);
            assert.ok(builder, kind);
            assert.equal(builder.skins, EXTRA_SKINS[kind as keyof typeof EXTRA_SKINS], kind);
        }
    });

    it("izgledi: bar tri, jedinstveni id-jevi, prvi besplatan, stalne cene, srpski nazivi", async () => {
        const { EXTRA_SKINS } = await import("@/app/components/avatar3d/animals/extra/skins.data");
        const { ANIMAL_SKINS } = await import("@/app/components/avatar3d/animals/skins.data");
        for (const kind of KINDS) {
            const skins = EXTRA_SKINS[kind as keyof typeof EXTRA_SKINS];
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
                // Ekavica: bez „ije”/„je” oblika boja (bijela, sjajna je u redu)
                assert.doesNotMatch(s.label, /bijel|cvijet|mlijek/i, `${kind}/${s.id}: ekavica`);
            }
            // Spojeno u zajednički spisak izgleda (server i prodavnica)
            assert.equal(ANIMAL_SKINS[kind], skins, kind);
        }
    });

    it("svaka vrsta i svaki izgled: kostur, sidra, delovi, lice i budžet", () => {
        for (const kind of KINDS) {
            const builder = contract.companionBuilder(kind)!;
            for (const [i, skin] of builder.skins.entries()) {
                // Pun kvalitet za prvi izgled i za svaki drugi; ostalo „low” (brže, iste površine)
                const quality = i === 0 || i % 2 === 1 ? "high" : "low";
                const body = builder.build({ kind: kind as never, skin: skin.id }, { quality });
                const label = `${kind}/${skin.id}/${quality}`;
                assert.equal(body.kind, kind, label);
                assert.equal(body.proportion, "animal", label);
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
                assert.ok(a.height > 0.9 && a.height < 1.6, `${label}: visina ${a.height}`);
                assert.ok(a.head.top.y > a.eyes.left.y && a.eyes.left.y > a.mouth.y && a.mouth.y > a.neck.y0, `${label}: redosled lica`);
                assert.ok(a.head.brimY > a.eyes.left.y - 0.02 && a.head.brimY < a.head.top.y, `${label}: obod kape`);
                assert.ok(a.head.brimR > 0.08 && a.head.brimR < 0.25, `${label}: brimR ${a.head.brimR}`);
                assert.ok(a.neck.y1 > a.neck.y0 && a.neck.radius > 0.03, `${label}: vrat`);
                assert.ok(a.torso.shoulderY > a.torso.chestY && a.torso.chestY > a.torso.waistY && a.torso.waistY > a.torso.hipY && a.torso.hipY > a.torso.crotchY, `${label}: trup`);
                assert.ok(a.eyes.left.x > 0 && a.eyes.right.x < 0, `${label}: levo je +x`);
                assert.ok(a.petSpot.x < 0 && a.petSpot.y === 0, `${label}: ljubimac gledaocu levo, na tlu`);
                assert.ok(a.feet.toeL.z > a.feet.left.z, `${label}: prsti napred`);
                assert.equal(a.ears.kind, EARS[kind], `${label}: vrsta uha`);
                if (EARS[kind] !== "none") assert.ok((body.parts.ears?.length ?? 0) >= 2, `${label}: uši`);
                assert.equal(a.hands.kind, HOOVES.has(kind) ? "hoof" : kind === "owl" ? "flipper" : ["monkey", "frog", "raccoon", "hamster", "squirrel"].includes(kind) ? "hand" : "paw", `${label}: šaka`);
                assert.equal(a.feet.kind, HOOVES.has(kind) ? "hoof" : kind === "frog" ? "webbed" : "paw", `${label}: stopalo`);
                assert.ok(body.parts.hands?.length, `${label}: šake`);
                assert.ok(body.parts.feet?.length, `${label}: stopala`);
                assert.ok(body.parts.head?.length, `${label}: glava`);
                if (kind !== "frog" && kind !== "owl") assert.ok(a.tail, `${label}: rep`);
                // Posebno po vrsti
                if (kind === "elephant") {
                    assert.ok(names.includes("trunk1") && names.includes("trunk2"), `${label}: kosti surle`);
                    assert.ok(a.nose.tip.distanceTo(a.nose.bridge) > 0.12, `${label}: vrh nosa je vrh surle`);
                }
                if (kind === "giraffe") {
                    assert.ok(a.horn && a.horn.tip.y > a.horn.base.y && a.horn.base.y > a.eyes.left.y, `${label}: roščići`);
                    assert.ok(body.parts.horn?.length, `${label}: roščići su deo tela`);
                    assert.ok(a.neck.y1 - a.neck.y0 > 0.15, `${label}: dug vrat`);
                }
                if (kind === "hedgehog" || kind === "sheep" || kind === "pony" || kind === "dinosaur") assert.ok(body.parts.hair?.length, `${label}: kapa sakriva bodlje/vunu/šišku`);
                // Lice: svi izrazi, treptanje, govor, pogled; pokreti repa, ušiju (i surle)
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
                // Delovi sa materijalom krzna imaju boje temena
                body.root.traverse((o) => {
                    const mesh = o as THREE_NS.Mesh;
                    if (!mesh.isMesh) return;
                    const m = mesh.material as THREE_NS.MeshPhysicalMaterial;
                    if (m.vertexColors) assert.ok(mesh.geometry.getAttribute("color"), `${label}: ${mesh.name || mesh.parent?.name} bez boja temena`);
                    // Bez NaN u geometriji
                    const pos = mesh.geometry.getAttribute("position");
                    for (let k = 0; k < pos.count; k += 97) assert.ok(Number.isFinite(pos.getX(k) + pos.getY(k) + pos.getZ(k)), `${label}: ${mesh.name} NaN`);
                });
                body.dispose();
            }
        }
    });

    it("odeća se kroji po telu (Kit): majica, rukav i nogavica, i vuna ovčice ostaje ispod odeće", async () => {
        const { torsoPoint } = await import("@/app/components/avatar3d/engine/body");
        for (const kind of KINDS) {
            const body = contract.companionBuilder(kind)!.build({ kind: kind as never, skin: "" }, { quality: "low" });
            const kit = new Kit({ rig: body.rig, root: body.root });
            const mat = new THREE.MeshBasicMaterial();
            const shirt = kit.torso(body.shape.waistY - 0.05, body.shape.neckBaseY - 0.01, 0.012, mat);
            kit.sleeve(1, 0, 0.9, 0.011, mat);
            kit.leg(-1, 0, 0.9, 0.014, mat);
            assert.ok(shirt.geometry.getAttribute("position").count > 100, kind);
            if (kind === "sheep") {
                // Vuna na trupu je bliže telu od majice (odmak 0,012): udaljenost od preseka trupa
                const wool = body.root.children.filter((o) => o.name === "vuna") as THREE_NS.Mesh[];
                assert.ok(wool.length >= 1, "vuna");
                const pos = wool[0].geometry.getAttribute("position");
                const p = new THREE.Vector3();
                const q = new THREE.Vector3();
                for (let i = 0; i < pos.count; i += 11) {
                    p.fromBufferAttribute(pos, i);
                    if (p.y < body.shape.waistY || p.y > body.shape.shoulderY - 0.03) continue;
                    let best = Infinity;
                    for (let k = 0; k < 180; k++) {
                        torsoPoint(body.shape, (k / 180) * Math.PI * 2, p.y, 0, q);
                        best = Math.min(best, Math.hypot(p.x - q.x, p.z - q.z));
                    }
                    assert.ok(best < 0.011, `vuna probija majicu (${i}: ${best.toFixed(4)})`);
                }
            }
            body.dispose();
        }
    });
});
