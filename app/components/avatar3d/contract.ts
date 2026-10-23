// UGOVOR 3D drugara: ono o čemu se dogovaraju motor (#1), životinje (#2) i katalog predmeta (#3).
// Svako radi u svojim fajlovima i oslanja se samo na ovo:
//
//   #1 motor     app/components/avatar3d/engine/**, *.tsx, contract.ts, data.ts, looks.ts, manifest.ts
//   #2 životinje app/components/avatar3d/animals/**  i  items/pet.ts, items/pet.data.ts
//   #3 katalog   app/components/avatar3d/items/**    (osim pet.ts i pet.data.ts)
//
// Koordinate: metri, lik stoji na (0, 0, 0), gleda ka +z, gore je +y, levo od lika je +x
// (gledaocu desno). Sve „sidra” (Anchors) su u prostoru tela u položaju mirovanja.
//
// ── Kako se dodaje predmet (#3, za pet #2) ─────────────────────────────────────────────
//  1. podaci: zapis u items/<mesto>.data.ts (id, mesto, naziv, cena, `hides`) — bez three.js;
//  2. 3D: u items/<mesto>.ts  `registerItems("<mesto>", [{ id, build(ctx) { … } }, …])`;
//  3. items/index.ts uvozi sve items/<mesto>.ts (motor uvozi samo items/index.ts).
//  Predmet bez 3D crteža se jednostavno ne crta (ne ruši lik); test proverava da ga nema.
//
// ── Kako se dodaje životinja (#2) ──────────────────────────────────────────────────────
//  1. izgledi (krzna): animals/skins.data.ts (id, naziv, cena) — bez three.js;
//  2. 3D: animals/<vrsta>.ts  `registerCompanion({ kind, build(look, ctx) { … return FigureBody } })`;
//  3. animals/index.ts uvozi sve animals/<vrsta>.ts.
//  Životinje STOJE USPRAVNO kao crtani likovi (isto kao 2D drugari), sa istih 18 kostiju kao
//  čovek (+ svoje dodatne: rep, uši), pa odeća deli isti kroj (Kit) i isti kostur.
//
// ── Stabilni pomoćni moduli motora (smeju se uvoziti, ne menjati — pitaj #1) ─────────────
//  engine/materials.ts  materijali (keširani; nikad `new MeshStandardMaterial` po predmetu)
//  engine/textures.ts   proceduralne teksture (pruge, kocke, tkanine, printTexture)
//  engine/surface.ts    buildSurface, sweep, taperedTube, profile… (geometrija sa težinama kostiju)
//  engine/kit.ts        Kit: krojenje odeće po telu (ljuske trupa, rukavi, nogavice, suknja…)
//  engine/body.ts       torsoSurface/torsoPoint/armPath/legPath (površine tela za kroj)
//  engine/rig.ts        createRig(shape), težine kostiju
//  engine/garments.ts i engine/accessories.ts su odeća iz prototipa: #3 ih prenosi u items/
//  (kopira, prilagodi), a #1 ih briše iz motora posle spajanja.
//
// ── Budžet (srednji Android tablet; kvalitet „kao Bitmoji” — bez vidljivih ivica) ────────
//  gornji/donji deo ≤ 16k trouglova, kostim/haljina/kaput ≤ 24k, obuća (par), kapa, naočare,
//  oko vrata ≤ 10k, u ruci/na leđima ≤ 12k, ljubimac ≤ 15k, pozadina ≤ 60k; ceo obučen lik
//  ≤ ~150k. Uz quality "low" (sličice) upola manje podela. Teksture ≤ 512 px (keš).
//  Motor sam oslobađa geometrije (traverse → dispose) kad se predmet skine; materijali i
//  teksture iz fabrika su u kešu i dele se — ne oslobađaj ih u predmetu.

import type * as THREE from "three";
import type { FaceExpression } from "@/lib/emotion";
import type { CompanionKind, Proportion, SkinData, Slot, Wear } from "./data";
import type { Kit } from "./engine/kit";
import type { HumanLook } from "./looks";

export * from "./data";
export type { FaceExpression } from "@/lib/emotion";

// ── Kostur ────────────────────────────────────────────────────────────────────────────

/** Kosti koje ima SVAKI lik (čovek i životinja); predmeti se oslanjaju samo na njih */
export const BONES = [
    "root", "hips", "spine", "chest", "neck", "head",
    "upperArmL", "forearmL", "handL", "upperArmR", "forearmR", "handR",
    "thighL", "shinL", "footL", "thighR", "shinR", "footR",
] as const;
export type BoneName = (typeof BONES)[number];

/** Dodatne kosti koje životinja SME da ima (posle 18 obaveznih, istim redom); predmeti ih ne koriste */
export const EXTRA_BONES = ["tail1", "tail2", "tail3", "earL", "earR", "trunk1", "trunk2", "wingL", "wingR"] as const;
export type ExtraBoneName = (typeof EXTRA_BONES)[number];

/**
 * Mere tela (osnova za kroj odeće). Profili trupa su funkcije visine y: poluširina, dubina
 * napred i dubina pozadi od ose tela. Životinja daje svoje profile — odeća se kroji po njima.
 */
export interface BodyShape {
    kind: CompanionKind;
    proportion: Proportion;
    crotchY: number;
    hipY: number;
    waistY: number;
    chestY: number;
    shoulderY: number;
    neckBaseY: number;
    headBoneY: number;
    /** Glava (ljudi; životinja daje približno): širina, visina, dubina; središte iznad kosti glave */
    head: { w: number; h: number; d: number; up: number; fwd: number; chin: number; cheeks: number };
    torsoW: (y: number) => number;
    torsoFront: (y: number) => number;
    torsoBack: (y: number) => number;
    /** Grudi odrasle žene (0 = bez) */
    bust: number;
    neckR: number;
    /** Ruke: zglob ramena (x), ugao od tela, dužine, poluprečnik duž ruke (s ∈ [0, 1]) */
    shoulderX: number;
    armAngle: number;
    upperArm: number;
    forearm: number;
    armR: (s: number) => number;
    /** Veličina šake (umnožak poluprečnika zgloba) */
    hand: number;
    hipX: number;
    thigh: number;
    shin: number;
    legR: (s: number) => number;
    ankleY: number;
    foot: { len: number; w: number; h: number; back: number };
    /** Visina do temena (bez ušiju i roga) — za kadar */
    height: number;
}

/** Zglobovi jedne strane u mirovanju (prostor tela) */
export interface Joints {
    shoulder: THREE.Vector3;
    elbow: THREE.Vector3;
    wrist: THREE.Vector3;
    hip: THREE.Vector3;
    knee: THREE.Vector3;
    ankle: THREE.Vector3;
}

export interface Rig {
    shape: BodyShape;
    /** BONES redom, pa EXTRA_BONES koje lik ima */
    bones: THREE.Bone[];
    skeleton: THREE.Skeleton;
    root: THREE.Bone;
    bone: (name: BoneName) => THREE.Bone;
    /** Leva (+x) i desna (−x) strana */
    left: Joints;
    right: Joints;
    /** Položaj svake kosti u mirovanju (prostor tela); kosti u mirovanju nemaju rotaciju */
    rest: Record<string, THREE.Vector3>;
}

// ── Sidra za predmete ─────────────────────────────────────────────────────────────────

type V3 = THREE.Vector3;

/** Vrsta uha: kapa se prilagođava (ljudsko uho je ispod kape; visoke uši prolaze kroz kapu) */
export type EarKind = "human" | "round" | "pointy" | "tall" | "floppy" | "none";

/** Vrsta šake/stopala: predmet u ruci i obuća se prilagođavaju */
export type HandKind = "hand" | "paw" | "flipper" | "hoof";
export type FootKind = "foot" | "paw" | "webbed" | "hoof";

export interface Anchors {
    /** Tačka na tlu ispod lika (0, 0, 0) */
    ground: V3;
    height: number;
    head: {
        /** Središte glave (približna sfera) i teme */
        center: V3;
        top: V3;
        radius: number;
        w: number;
        h: number;
        d: number;
        /** Z prednje površine lica u visini očiju */
        front: number;
        /** Gde kapa sedi: obim glave na visini čela (y) i poluprečnik tog obima */
        brimY: number;
        brimR: number;
    };
    ears: { kind: EarKind; left: V3; right: V3; tipL: V3; tipR: V3; radius: number };
    /** Rog (jednorog) — kapa ga zaobilazi ili ide iza njega */
    horn?: { base: V3; tip: V3; radius: number };
    eyes: { left: V3; right: V3; radius: number; front: number };
    /** Most nosa (gde naočare sede) i vrh nosa/njuške; `snout` = dužina njuške (0 za ljude) */
    nose: { bridge: V3; tip: V3; snout: number };
    mouth: V3;
    /** Vrat: uspravni prsten (ogrlice, marame, kragne) */
    neck: { center: V3; radius: number; y0: number; y1: number };
    torso: {
        shoulderY: number;
        chestY: number;
        waistY: number;
        hipY: number;
        crotchY: number;
        /** Poluširina / dubina napred / dubina pozadi u visini grudi i struka */
        chest: { w: number; front: number; back: number };
        waist: { w: number; front: number; back: number };
    };
    shoulders: { left: V3; right: V3 };
    arms: { upper: number; fore: number; radius: number; wristRadius: number };
    hips: { left: V3; right: V3 };
    legs: { thigh: number; shin: number; radius: number; ankleRadius: number };
    /**
     * Šake (zglob). Predmet u ruci se drži u DESNOJ šaci lika (kost handR, gledaocu levo);
     * `grip` je tačka hvata u lokalnim koordinatama kosti handR. Mahanje je levom rukom.
     */
    hands: { kind: HandKind; left: V3; right: V3; radius: number; grip: V3 };
    /** Stopala: zglob (ankle), dužina, širina, visina; `toeL/toeR` = vrh prstiju */
    feet: { kind: FootKind; left: V3; right: V3; toeL: V3; toeR: V3; len: number; w: number; h: number };
    /** Leđa: tačka između lopatica na površini, smer napolje (−z), širina i visina (plašt, krila, ranac) */
    back: { center: V3; normal: V3; width: number; height: number; capeTop: V3 };
    tail?: { base: V3; dir: V3 };
    /** Gde stoji ljubimac (na tlu, pored lika, gledaocu levo) i koliko je velik prema liku */
    petSpot: V3;
    petScale: number;
}

/** Površina glave (za kroj kapa, hidžaba, naočara) u koordinatama kosti glave */
export interface HeadSurface {
    center: V3;
    /** u ∈ [0, 1] oko glave (0,5 = napred), v ∈ [0, 1] od temena do dna */
    point: (u: number, v: number, out?: V3) => V3;
    normal: (u: number, v: number, out?: V3) => V3;
}

/** Delovi tela koje predmet može da sakrije (patike → stopala, slem → kosa i uši) */
export type BodyPart = "hair" | "ears" | "feet" | "hands" | "tail" | "horn" | "head";

/** Lice: izraz iz glasa (lib/emotion), treptanje i usta dok glas govori */
export interface FaceControl {
    /** Izraz lica; `weight` 0–1 za meki prelaz (motor ga sam menja kroz vreme) */
    setExpression: (expression: FaceExpression, weight?: number) => void;
    /** 0 = otvoreno, 1 = zatvoreno */
    setBlink: (amount: number) => void;
    /** Usta pri govoru: 0 = zatvorena, 1 = najviše otvorena; `round` 0–1 za „o” */
    setMouth: (open: number, round?: number) => void;
    /** Pogled (−1…1), opciono */
    setGaze?: (x: number, y: number) => void;
}

/** Lik spreman za scenu (čovek iz motora, životinja iz animals/) */
export interface FigureBody {
    kind: CompanionKind;
    proportion: Proportion;
    shape: BodyShape;
    rig: Rig;
    anchors: Anchors;
    head: HeadSurface;
    /** Koren lika: kostur je u njemu, SkinnedMesh odeće se dodaje u njega */
    root: THREE.Group;
    /** Boja kože/krzna (bosa stopala u sandalama, rukavi kratke majice) */
    tone: string;
    /** Delovi tela po vrsti (motor ih sakriva kad predmet to traži) */
    parts: Partial<Record<BodyPart, THREE.Object3D[]>>;
    face: FaceControl;
    /** Dodatni pokreti tela (rep, uši) — kosti BONES pokreće motor; `live` = false → mirno */
    animate?: (time: number, dt: number, live: boolean) => void;
    dispose: () => void;
}

// ── Predmeti ──────────────────────────────────────────────────────────────────────────

export interface ItemContext {
    body: FigureBody;
    /** Sve što lik trenutno nosi (da se predmet prilagodi: kapa preko hidžaba, ranac preko kaputa) */
    wear: Wear;
    /** Boja hidžaba (hex) ili null; kad je hidžab tu, `body.anchors.head` je već uvećan za njegovu debljinu */
    hijab: string | null;
    /** Koliko kosa (ili hidžab) diže kapu iznad temena, u metrima */
    hairCrown: number;
    /** "low" u sličicama i na slabijem uređaju: sme upola manje podela (Kit … res = 0,5) */
    quality: "high" | "low";
    /** Krojenje odeće po ovom telu (skinned delovi se sami dodaju u lik i prate) */
    kit: Kit;
    /** Rigidan deo koji prati kost (kapa → head, sat → handL…); motor ga prati i skida */
    attach: (bone: BoneName, object: THREE.Object3D) => THREE.Object3D;
    /** Tačka iz prostora tela (mirovanje) u lokalne koordinate kosti — ne zavisi od trenutne poze */
    toBone: (bone: BoneName, p: THREE.Vector3) => THREE.Vector3;
}

/** Stalni pokret predmeta (kao 2D WearMotion); motor ga gasi uz „Manje animacija” */
export type ItemMotion = "float" | "cape" | "wings" | "pet-hop" | "pet-lean" | "spin";

/** Kadar sličice u prodavnici */
export interface ThumbHint {
    focus: "head" | "face" | "upper" | "lower" | "feet" | "hand" | "back" | "full" | "pet" | "scene";
    /** Predmet sam, bez tela (podrazumevano: da, osim za outfit/bottom koji se vide na liku) */
    alone?: boolean;
    /** Okret kamere oko lika (rad; 0 = spreda; leđa ≈ π) i uvećanje */
    yaw?: number;
    zoom?: number;
}

/** Šta `build` vraća: objekat u prostoru tela (motor ga stavlja u lik), ili ništa ako je sve preko kit/attach */
export type ItemBuild = THREE.Object3D | { object?: THREE.Object3D; animate?: (time: number, dt: number, live: boolean) => void } | void;

export interface ItemBuilder {
    /** Isti id kao u items/<mesto>.data.ts (naziv i cena su tamo — jedan izvor istine) */
    id: string;
    build: (ctx: ItemContext) => ItemBuild;
    /** Delovi tela koji se ne crtaju dok je predmet obučen */
    covers?: readonly BodyPart[];
    /** Predmet se ponovo kroji kad se promeni nešto od ovoga (npr. kapa: "hair", "hijab") */
    dependsOn?: readonly (Slot | "hair" | "hijab")[];
    /** Uz hidžab: "over" (podrazumevano — nosi se preko hidžaba) ili "hide" (ne crta se, npr. šnala) */
    withHijab?: "over" | "hide";
    motion?: ItemMotion;
    thumb?: ThumbHint;
}

// ── Pozadine (mesto `background`) ──────────────────────────────────────────────────────

export interface EnvironmentContext {
    /** Visina lika (kadar) */
    figureHeight: number;
    /** Široki kadar (baner na početnoj) — rasporedi rekvizite šire (x ±4) */
    wide: boolean;
    /** "low" na slabijem uređaju i u sličicama: manje detalja */
    quality: "high" | "low";
}

/**
 * Okruženje: lik stoji na (0, 0, 0); kamera je ispred (+z). Rekviziti iza lika (z < −0,8) i sa
 * strane; ništa između kamere i lika. Pod je y = 0.
 */
export interface Environment {
    root: THREE.Object3D;
    /** Nebo/zid: jedna boja ili prelaz [gore, dole] */
    sky: string | readonly [string, string];
    fog?: { color: string; near: number; far: number };
    /** "default" = motor crta svoj meki pod sa senkom; "own" = pod je u `root` (senka lika i dalje radi) */
    floor: "default" | "own";
    floorColor?: string;
    light?: {
        hemi?: { sky: string; ground: string; intensity: number };
        sun?: { color: string; intensity: number; dir: readonly [number, number, number] };
        exposure?: number;
    };
    animate?: (time: number, dt: number, live: boolean) => void;
}

export interface BackgroundBuilder {
    id: string;
    build: (ctx: EnvironmentContext) => Environment;
    thumb?: ThumbHint;
}

// ── Drugari (ljudi iz motora, životinje iz animals/) ───────────────────────────────────

/** Šta lik treba da zna da bi se napravio */
export interface CompanionLook {
    kind: CompanionKind;
    /** Životinja: id izgleda iz animals/skins.data.ts (nepoznat → prvi); čovek: ne koristi se */
    skin: string;
    /** Samo za ljude */
    human?: HumanLook;
}

export interface FigureContext {
    /** "low" u sličicama i na slabijem uređaju: manje segmenata */
    quality: "high" | "low";
}

export interface CompanionBuilder {
    kind: CompanionKind;
    /** Izgledi (isti zapisi kao u animals/skins.data.ts); za ljude prazno */
    skins: readonly SkinData[];
    build: (look: CompanionLook, ctx: FigureContext) => FigureBody;
}

// ── Registri (popunjavaju ih items/index.ts i animals/index.ts pri uvozu) ───────────────

const itemBuilders = new Map<string, { slot: Slot; builder: ItemBuilder }>();
const backgroundBuilders = new Map<string, BackgroundBuilder>();
const companionBuilders = new Map<CompanionKind, CompanionBuilder>();

export function registerItems(slot: Exclude<Slot, "background">, builders: readonly ItemBuilder[]): void {
    for (const builder of builders) itemBuilders.set(builder.id, { slot, builder });
}

export function registerBackgrounds(builders: readonly BackgroundBuilder[]): void {
    for (const builder of builders) backgroundBuilders.set(builder.id, builder);
}

export function registerCompanion(builder: CompanionBuilder): void {
    companionBuilders.set(builder.kind, builder);
}

export function itemBuilder(id: string): { slot: Slot; builder: ItemBuilder } | undefined {
    return itemBuilders.get(id);
}

export function backgroundBuilder(id: string): BackgroundBuilder | undefined {
    return backgroundBuilders.get(id);
}

export function companionBuilder(kind: string): CompanionBuilder | undefined {
    return companionBuilders.get(kind as CompanionKind);
}

/** Za testove: šta je sve registrovano */
export function registeredIds(): { items: string[]; backgrounds: string[]; companions: CompanionKind[] } {
    return { items: [...itemBuilders.keys()], backgrounds: [...backgroundBuilders.keys()], companions: [...companionBuilders.keys()] };
}

// ── Boje (male pomoćne funkcije, bez three.js) ───────────────────────────────────────

function channels(hex: string): [number, number, number] {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
    const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
    return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** Mešavina dve boje (t = 0 → a, 1 → b) */
export function mix(a: string, b: string, t: number): string {
    const x = channels(a);
    const y = channels(b);
    return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/** Svetlije (k > 0, ka beloj) ili tamnije (k < 0, ka crnoj) */
export function shade(hex: string, k: number): string {
    return k >= 0 ? mix(hex, "#FFFFFF", k) : mix(hex, "#000000", -k);
}

// Materijali (keširani, zajednički za sve): koža, krzno, tkanine, plastika, metal, staklo…
export {
    basicMaterial,
    fabricMaterial,
    furMaterial,
    gemMaterial,
    glossyMaterial,
    hairMaterial,
    leatherMaterial,
    lensMaterial,
    material,
    metalMaterial,
    patternedFabric,
    skinMaterial,
    type MaterialKind,
    type MaterialSpec,
} from "./engine/materials";
