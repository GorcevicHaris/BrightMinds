// Ceo drugar na sceni: telo (čovek ili životinja iz registra), predmeti po mestima (registri
// iz items/), osnovna odeća čoveka kad je mesto prazno, lice koje prati glas (izraz, usta) i
// pokreti: mirno disanje, treptanje i prenošenje težine; mahanje na pozdrav; skok, radost,
// navijanje i pojava (isti API kao 2D motion.ts: action + actionKey). Uz „Manje animacija”
// lik stoji mirno (lice se i dalje menja, bez pokreta).

import * as THREE from "three";
import { FACE_FOR_EMOTION, type FaceExpression, type FaceGesture, type VoiceEmotion } from "@/lib/emotion";
import { ITEMS_3D, type AvatarLook, type Item3D } from "../catalog";
import {
    companionBuilder,
    itemBuilder,
    SLOTS,
    type BodyPart,
    type BoneName,
    type CompanionLook,
    type FigureBody,
    type ItemBuilder,
    type ItemContext,
    type ItemMotion,
    type Slot,
    type Wear,
} from "../contract";
import { humanLookId } from "../looks";
import { getItem } from "../manifest";
import { FACE_POSES } from "./expressions";
import { solvePose, type PoseName, type PoseSolution } from "./pose";
import { buildGarment } from "./garments";
import { isHumanBody, type HumanBody } from "./human";
import { Kit } from "./kit";
import { disposeObject } from "./materials";

/** Jednokratni pokreti (kao 2D motion.ts) i mahanje */
export type FigureAction = "hop" | "joy" | "cheer" | "appear" | "wave";

const ACTION_S: Record<FigureAction, number> = { hop: 0.6, joy: 1.0, cheer: 1.75, appear: 0.5, wave: 2.4 };

/** Redosled oblačenja: donji deo pre gornjeg (kaput zna šta je ispod), kapa posle kose */
const DRESS_ORDER: readonly Slot[] = ["bottom", "outfit", "feet", "neck", "hat", "glasses", "hand", "back", "pet"];

interface Worn {
    id: string;
    key: string;
    objects: THREE.Object3D[];
    builder: ItemBuilder;
    motion?: ItemMotion;
    animate?: (time: number, dt: number, live: boolean) => void;
    /** Osnovna odeća (nije kupljena; skida se čim dete obuče svoj predmet na to mesto) */
    base?: boolean;
}

/** Predmeti uz koje lik ne prekršta ruke (krut deo na grudima) */
const NO_CROSSED_ARMS = new Set(["kostim-astronauta"]);

/** Osnovna odeća iz kataloga (#3): obične stvari koje idu uz sve */
const BASE_ITEMS: Record<string, Partial<Record<"outfit" | "bottom" | "feet", string>>> = {
    girl: { outfit: "bela-majica", bottom: "farmerke", feet: "bele-patike" },
    boy: { outfit: "majica-pruge", bottom: "farmerke", feet: "plave-patike" },
    woman: { outfit: "bordo-majica-dugi-rukav", bottom: "siroke-farmerke", feet: "krem-patike" },
    man: { outfit: "plava-polo-majica", bottom: "teget-pantalone", feet: "crno-bele-patike" },
};

/** Osnovna odeća čoveka (prototip motora) kad je mesto prazno — lik nikad nije neobučen */
const BASE: Record<string, Partial<Record<"outfit" | "bottom" | "feet", [string, number]>>> = {
    girl: { outfit: ["majica-dugi-rukav", 1], bottom: ["farmerke", 0], feet: ["patike", 2] },
    boy: { outfit: ["majica", 1], bottom: ["trenerka", 1], feet: ["patike", 0] },
    woman: { outfit: ["dzemper", 1], bottom: ["farmerke", 2], feet: ["patike", 0] },
    man: { outfit: ["kosulja", 1], bottom: ["farmerke", 0], feet: ["patike", 3] },
};

const PROTO = new Map<string, Item3D>(ITEMS_3D.map((item) => [item.id, item]));

/** Kontekst predmeta za jedno telo (izvozi se i za probne stranice kataloga) */
export function makeItemContext(body: FigureBody, wear: Wear, extras: { hairCrown: number; quality: "high" | "low"; hijab: string | null }): { ctx: ItemContext; objects: THREE.Object3D[] } {
    const kit = new Kit({ rig: body.rig, root: body.root });
    const objects = kit.objects;
    const ctx: ItemContext = {
        body,
        wear,
        hijab: extras.hijab,
        hairCrown: extras.hairCrown,
        quality: extras.quality,
        kit,
        attach: (bone: BoneName, object: THREE.Object3D) => {
            body.rig.bone(bone).add(object);
            objects.push(object);
            return object;
        },
        toBone: (bone: BoneName, p: THREE.Vector3) => p.clone().sub(body.rig.rest[bone]),
    };
    return { ctx, objects };
}

function lookKey(look: CompanionLook): string {
    return look.human ? `${look.kind}|${humanLookId(look.human)}` : `${look.kind}|${look.skin}`;
}

export interface FigureOptions {
    quality: "high" | "low";
}

export class Figure {
    /** Koren: telo, predmeti i ljubimac (okretanje i kadar su na sceni) */
    readonly root = new THREE.Group();
    body!: FigureBody;
    private bodyKey = "";
    private wear: Wear = {};
    private worn = new Map<Slot, Worn>();
    private base = new Map<string, { key: string; objects: THREE.Object3D[] }>();
    private hairCrown = 0;
    private rest = new Map<THREE.Bone, THREE.Vector3>();
    // Lice
    private emotion: VoiceEmotion = "neutral";
    private expression: FaceExpression = "neutral";
    private gesture: FaceGesture = "none";
    private exprT = 1;
    private speaking = false;
    private mouth = 0;
    private nextBlink = 2;
    private blinkStart = -1;
    // Pokreti
    private action: FigureAction | null = null;
    private actionAt = 0;
    private pendingAction: FigureAction | null = null;
    private phase = Math.random() * 10;
    private clock = 0;
    // Poza ruku (opušteno, na kukovima, prekrštene, šake na ustima, iza leđa)
    private poses = new Map<PoseName, PoseSolution>();
    private poseName: PoseName = "relaxed";
    private posePrev: PoseName = "relaxed";
    private poseT = 1;
    private poseAt = 0;
    private poseHold: { name: PoseName; until: number } | null = null;
    /** Sama menja mirne poze (stalnim redom, bez nasumičnosti) dok je lik „živ” */
    autoPose = true;
    // Pogled: kratki skokovi pogleda (sakade) oko pravca ka gledaocu
    private gazeTarget = new THREE.Vector2();
    private gaze = new THREE.Vector2();
    private nextSaccade = 0;
    private worldQ = new THREE.Quaternion();
    private worldE = new THREE.Euler();
    /** Jačina glasa 0–1 (lib/voice mouthLevel), čita se u svakom kadru dok lik govori */
    mouthLevel: () => number = () => 0;

    constructor(look: CompanionLook, wear: Wear, private options: FigureOptions = { quality: "high" }) {
        this.root.name = "drugar";
        this.setLook(look);
        this.setWear(wear);
    }

    /** Da li za tu vrstu postoji 3D telo (životinje stižu iz animals/) */
    static supports(kind: string): boolean {
        return Boolean(companionBuilder(kind));
    }

    get height(): number {
        return this.body.shape.height;
    }

    setLook(look: CompanionLook) {
        const key = lookKey(look);
        if (key === this.bodyKey && this.body) return;
        const builder = companionBuilder(look.kind);
        if (!builder) throw new Error(`Nema 3D drugara: ${look.kind}`);
        // Staro telo i sva odeća na njemu
        if (this.body) {
            for (const slot of [...this.worn.keys()]) this.takeOff(slot);
            for (const key of [...this.base.keys()]) this.takeOffBase(key);
            this.root.remove(this.body.root);
            this.body.dispose();
        }
        this.body = builder.build(look, { quality: this.options.quality });
        this.bodyKey = key;
        this.root.add(this.body.root);
        this.rest.clear();
        for (const bone of this.body.rig.bones) this.rest.set(bone, bone.position.clone());
        this.poses.clear();
        this.body.face.setExpression(this.expression, 1);
        const wear = this.wear;
        this.wear = {};
        this.setWear(wear);
    }

    /** Šta je skriveno (haljina skriva donji deo) */
    private hiddenSlots(wear: Wear): Set<Slot> {
        const hidden = new Set<Slot>();
        for (const slot of SLOTS) {
            const id = wear[slot];
            if (!id || !itemBuilder(id)) continue;
            for (const other of getItem(id)?.hides ?? []) hidden.add(other);
        }
        return hidden;
    }

    private dependency(builder: ItemBuilder, wear: Wear): string {
        const human = isHumanBody(this.body) ? this.body : null;
        return (builder.dependsOn ?? [])
            .map((dep) => (dep === "hair" ? (human?.look.style ?? "") : dep === "hijab" ? (human?.hijab ?? "") : (wear[dep] ?? "")))
            .join(",");
    }

    setWear(next: Wear) {
        const wear: Wear = { ...next };
        delete wear.background;
        const body = this.body;
        const human = isHumanBody(body) ? body : null;
        const hidden = this.hiddenSlots(wear);
        // Kosa pod kapom: kapa koja se crta spušta kosu
        const hatId = wear.hat && !hidden.has("hat") && itemBuilder(wear.hat) ? wear.hat : undefined;
        if (human) this.hairCrown = human.setHeadwear(Boolean(hatId) && !(human.hijab && itemBuilder(hatId!)?.builder.withHijab === "hide"));

        for (const slot of DRESS_ORDER) {
            const id = wear[slot];
            const entry = id ? itemBuilder(id) : undefined;
            const skip = !id || !entry || entry.slot !== slot || hidden.has(slot) || (human?.hijab && entry.builder.withHijab === "hide");
            const current = this.worn.get(slot);
            if (skip) {
                // Osnovna odeća ostaje dok je mesto prazno i nije skriveno (dodaje se ispod)
                if (current && !(current.base && !id && !hidden.has(slot))) this.takeOff(slot);
                continue;
            }
            const key = `${id}|${this.dependency(entry.builder, wear)}|${this.hairCrown}`;
            if (current?.key === key) continue;
            if (current) this.takeOff(slot);
            this.putOn(slot, id, key, entry.builder, wear);
        }
        // Osnovna odeća čoveka na praznim mestima: obični predmeti iz kataloga (ako postoje u 3D),
        // inače odeća iz prototipa motora. Ne kupuju se i ne vide u ormaru — samo da lik nije neobučen.
        if (human) {
            for (const slot of ["bottom", "outfit", "feet"] as const) {
                const id = BASE_ITEMS[body.kind]?.[slot];
                const entry = id ? itemBuilder(id) : undefined;
                const needed = Boolean(entry) && !this.worn.has(slot) && !hidden.has(slot);
                if (needed && id && entry) {
                    this.putOn(slot, id, `osnova|${id}|${this.hairCrown}`, entry.builder, wear);
                    const worn = this.worn.get(slot);
                    if (worn) worn.base = true;
                }
            }
        }
        if (human) {
            const base = BASE[body.kind] ?? {};
            for (const slot of ["bottom", "outfit", "feet"] as const) {
                const want = base[slot];
                const needed = want && !this.worn.has(slot) && !hidden.has(slot) && !itemBuilder(BASE_ITEMS[body.kind]?.[slot] ?? "");
                const key = needed ? `${want[0]}:${want[1]}` : "";
                const current = this.base.get(slot);
                if (current?.key === key) continue;
                if (current) this.takeOffBase(slot);
                if (needed) this.putOnBase(slot, human, want[0], want[1], key);
            }
        }
        this.wear = wear;
        this.applyCovers();
        this.applyShadows();
    }

    private putOn(slot: Slot, id: string, key: string, builder: ItemBuilder, wear: Wear) {
        const body = this.body;
        const human = isHumanBody(body) ? body : null;
        const { ctx, objects } = makeItemContext(body, wear, { hairCrown: this.hairCrown, quality: this.options.quality, hijab: human?.hijab ?? null });
        let animate: Worn["animate"];
        try {
            const result = builder.build(ctx);
            const object = result && "isObject3D" in result ? result : result?.object;
            if (result && !("isObject3D" in result)) animate = result.animate;
            if (object) {
                body.root.add(object);
                objects.push(object);
            }
        } catch (error) {
            // Neispravan predmet ne sme da sruši lik: skida se ono što je stiglo da se napravi
            console.error(`3D predmet ${id}:`, error);
            for (const object of objects) {
                object.removeFromParent();
                disposeObject(object);
            }
            return;
        }
        for (const object of objects) object.userData.slot = slot;
        this.worn.set(slot, { id, key, objects, builder, motion: builder.motion ?? (slot === "pet" ? "pet-hop" : undefined), animate });
    }

    private takeOff(slot: Slot) {
        const worn = this.worn.get(slot);
        if (!worn) return;
        for (const object of worn.objects) {
            object.removeFromParent();
            disposeObject(object);
        }
        this.worn.delete(slot);
    }

    private putOnBase(slot: string, human: HumanBody, id: string, color: number, key: string) {
        const item = PROTO.get(id);
        if (!item) return;
        const look: AvatarLook = { figure: human.kind as AvatarLook["figure"], skin: "", eyes: "", hair: "short", hairColor: "", expression: "neutral", wear: {} };
        const objects = buildGarment({ rig: human.rig, root: human.root, head: human.headInfo, look, skin: human.tone }, item, color);
        this.base.set(slot, { key, objects });
    }

    private takeOffBase(slot: string) {
        const base = this.base.get(slot);
        if (!base) return;
        for (const object of base.objects) {
            object.removeFromParent();
            disposeObject(object);
        }
        this.base.delete(slot);
    }

    /** Delovi tela ispod predmeta (bosa stopala u patikama, kosa pod šlemom) */
    private applyCovers() {
        const covered = new Set<BodyPart>();
        for (const worn of this.worn.values()) for (const part of worn.builder.covers ?? []) covered.add(part);
        // Osnovne patike skrivaju stopala
        if (this.base.has("feet")) covered.add("feet");
        // Životinja sa kapom: kosa/griva na temenu se ne crta (kapa sedi na glavi, kao kod ostalih)
        if (!isHumanBody(this.body) && this.worn.has("hat")) covered.add("hair");
        for (const [part, objects] of Object.entries(this.body.parts) as [BodyPart, THREE.Object3D[]][]) {
            // Uši ispod hidžaba su već skrivene
            if (part === "ears" && isHumanBody(this.body) && this.body.hijab) continue;
            for (const object of objects) object.visible = !covered.has(part);
        }
    }

    private applyShadows() {
        this.root.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh) return;
            const material = mesh.material as THREE.Material;
            const transparent = Array.isArray(material) ? false : material.transparent;
            // Sitni delovi lica (oči, kapci, trepavice, obrve) bez senke: mapa senke je za njih gruba
            const shadow = !transparent && !mesh.userData.noShadow;
            mesh.castShadow = shadow;
            mesh.receiveShadow = shadow;
        });
    }

    /** Svi objekti predmeta na mestu (za sličicu predmeta bez tela) */
    slotObjects(slot: Slot): THREE.Object3D[] {
        return this.worn.get(slot)?.objects ?? [];
    }

    /** Sakriva telo i ostale predmete (sličica jednog predmeta) */
    isolate(slot: Slot | null) {
        const keep = new Set(slot ? this.slotObjects(slot) : []);
        const visible = (o: THREE.Object3D) => {
            let p: THREE.Object3D | null = o;
            while (p) {
                if (keep.has(p)) return true;
                p = p.parent;
            }
            return false;
        };
        this.root.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) o.visible = slot === null ? o.visible : visible(o);
        });
        if (slot === null) this.applyCovers();
    }

    // ── Lice i glas ──────────────────────────────────────────────────────────────

    setEmotion(emotion: VoiceEmotion) {
        if (emotion === this.emotion) return;
        this.emotion = emotion;
        const { expression, gesture } = FACE_FOR_EMOTION[emotion];
        if (expression !== this.expression) {
            this.expression = expression;
            this.exprT = 0;
        }
        // Iznenađenje i strah: šake na ustima, kratko
        if (emotion === "surprised" || emotion === "scared") {
            this.setPose("mouth");
            this.poseHold = { name: "mouth", until: this.clock + 2.4 };
        }
        if (gesture !== this.gesture) {
            this.gesture = gesture;
            if (gesture === "wave") this.play("wave");
            if (gesture === "cheer") this.play("cheer");
        }
    }

    /** Izraz odmah (sličice) */
    setExpressionNow(expression: FaceExpression) {
        this.expression = expression;
        this.exprT = 1;
        this.body.face.setExpression(expression, 1);
    }

    setSpeaking(speaking: boolean) {
        this.speaking = speaking;
    }

    play(action: FigureAction) {
        this.pendingAction = action;
    }

    /** Poza ruku; sa `now` = true bez prelaza (sličice) */
    setPose(name: PoseName, now = false) {
        if (name === this.poseName && this.poseT >= 1) return;
        this.posePrev = now ? name : this.poseName;
        this.poseName = name;
        this.poseT = now ? 1 : 0;
    }

    private solution(name: PoseName): PoseSolution {
        let solved = this.poses.get(name);
        if (!solved) {
            solved = solvePose(this.body.rig, name);
            this.poses.set(name, solved);
        }
        return solved;
    }

    /** Redosled mirnih poza (stalan, bez nasumičnosti); sa predmetom u ruci samo slobodnom rukom */
    private nextAutoPose(): PoseName {
        // Prekrštene ruke se preskaču uz predmete koji bi se sudarili sa rukama (krut deo na grudima)
        const noCross = [...this.worn.values()].some((w) => NO_CROSSED_ARMS.has(w.id));
        // Nove poze (džepovi, razmišljanje, slegnuta ramena) samo kod ljudi; životinje kao ranije
        const human = isHumanBody(this.body);
        const order: PoseName[] = this.worn.has("hand")
            ? ["relaxed", "hips"]
            : !human
              ? noCross
                  ? ["relaxed", "hips", "relaxed", "behind"]
                  : ["relaxed", "hips", "relaxed", "crossed", "relaxed", "behind"]
              : noCross
              ? ["relaxed", "hips", "relaxed", "pockets", "relaxed", "think", "relaxed", "behind"]
              : ["relaxed", "hips", "relaxed", "crossed", "relaxed", "pockets", "relaxed", "think", "relaxed", "shrug", "relaxed", "behind"];
        // Peraja (pingvin) ne idu na kukove
        const usable: PoseName[] = this.body.anchors.hands.kind === "flipper" ? order.filter((p) => p !== "hips") : order;
        const i = usable.indexOf(this.poseName);
        return usable[(i + 1) % usable.length];
    }

    private applyPose(time: number, dt: number, live: boolean, armsBusy: number): boolean {
        const rig = this.body.rig;
        let busy = false;
        // Kratka poza zbog emocije (šake na ustima), pa nazad
        if (this.poseHold && time > this.poseHold.until) {
            this.poseHold = null;
            this.setPose("relaxed");
        }
        if (live && this.autoPose && !this.poseHold && time - this.poseAt > 9) {
            this.poseAt = time;
            this.setPose(this.nextAutoPose());
        }
        if (this.poseT < 1) {
            this.poseT = live ? Math.min(1, this.poseT + dt / 0.7) : 1;
            busy = true;
        }
        const t = this.poseT * this.poseT * (3 - 2 * this.poseT);
        const from = this.solution(this.posePrev);
        const to = this.solution(this.poseName);
        const holding = this.worn.has("hand");
        const free = 1 - armsBusy;
        const blend = (bone: THREE.Bone, a: THREE.Quaternion | null, b: THREE.Quaternion | null) => {
            if (!a && !b) return;
            const idle = bone.quaternion.clone();
            const qa = a ?? idle;
            const qb = b ?? idle;
            const q = new THREE.Quaternion().slerpQuaternions(qa, qb, t);
            bone.quaternion.slerpQuaternions(idle, q, free);
        };
        for (const side of ["left", "right"] as const) {
            if (side === "right" && holding) continue;
            const a = from[side];
            const b = to[side];
            const k = side === "left" ? "L" : "R";
            blend(rig.bone(`upperArm${k}`), a?.upper ?? null, b?.upper ?? null);
            blend(rig.bone(`forearm${k}`), a?.fore ?? null, b?.fore ?? null);
            blend(rig.bone(`hand${k}`), a?.hand ?? null, b?.hand ?? null);
        }
        return busy;
    }

    // ── Kadar po kadar ───────────────────────────────────────────────────────────

    /** Pomera lik; vraća true dok ima pokreta (traži sledeći kadar) */
    update(time: number, dt: number, live: boolean): boolean {
        const rig = this.body.rig;
        this.clock = time;
        let busy = false;
        // Kosti iz mirovanja
        for (const bone of rig.bones) {
            bone.rotation.set(0, 0, 0);
            bone.position.copy(this.rest.get(bone)!);
        }
        rig.root.scale.setScalar(1);

        // Izraz: meki prelaz ≈ četvrt sekunde (bez animacija odmah)
        if (this.exprT < 1) {
            this.exprT = live ? Math.min(1, this.exprT + dt / 0.28) : 1;
            const t = this.exprT;
            this.body.face.setExpression(this.expression, t * t * (3 - 2 * t));
            busy = true;
        }
        const pose = FACE_POSES[this.expression];

        // Usta po glasu (bez animacija: mirno poluotvorena dok govori)
        const target = this.speaking ? (live ? Math.min(1, this.mouthLevel() * 1.15) : 0.3) : 0;
        const k = live ? 1 - Math.exp(-dt / 0.05) : 1;
        const mouth = this.mouth + (target - this.mouth) * k;
        if (Math.abs(mouth - this.mouth) > 0.002 || (this.mouth !== 0 && target === 0)) {
            this.mouth = Math.abs(mouth) < 0.003 ? 0 : mouth;
            this.body.face.setMouth(this.mouth, 0);
        }
        if (this.speaking && live) busy = true;

        if (this.pendingAction) {
            this.action = live || this.pendingAction === "appear" ? this.pendingAction : null;
            this.actionAt = time;
            this.pendingAction = null;
        }
        if (!live) this.action = null;

        const head = rig.bone("head");
        head.rotation.z = pose.tilt;
        // Predmet u ruci: podlaktica malo napred, da se predmet vidi
        const holding = this.worn.has("hand");
        if (holding) {
            rig.bone("forearmR").rotation.x = -0.55;
            rig.bone("upperArmR").rotation.x = -0.12;
        }
        // Mirna poza: ruke opuštene
        rig.bone("upperArmL").rotation.z = 0.03;
        rig.bone("upperArmR").rotation.z = -0.03;
        // Opuštene ruke: laktovi blago savijeni, šake okrenute ka telu
        rig.bone("forearmL").rotation.x = -0.16;
        rig.bone("forearmL").rotation.y = 0.25;
        if (!holding) {
            rig.bone("forearmR").rotation.x = -0.16;
            rig.bone("forearmR").rotation.y = -0.25;
        }

        if (live) {
            this.idle(time, dt);
            if (this.speaking) {
                // Dok govori, glava jedva primetno klima
                head.rotation.x += Math.sin(time * 2.6) * 0.03;
                head.rotation.y += Math.sin(time * 1.3) * 0.03;
            }
            busy = true;
        } else {
            this.body.face.setBlink(0);
        }

        // Poza ruku; mahanje i navijanje imaju prednost (poza se tada meko povuče)
        const armsAction = this.action === "wave" || this.action === "cheer" || this.action === "joy" ? this.action : null;
        const armsBusy = armsAction ? Math.min(1, Math.sin(Math.min(1, (time - this.actionAt) / ACTION_S[armsAction]) * Math.PI) * 3) : 0;
        if (this.applyPose(time, dt, live, armsBusy)) busy = true;

        if (this.action) {
            const p = (time - this.actionAt) / ACTION_S[this.action];
            if (p >= 1) this.action = null;
            else {
                this.applyAction(this.action, p, time);
                busy = true;
            }
        }

        if (isHumanBody(this.body)) this.updateGaze(time, dt, live);

        // Predmeti sa svojim pokretom (balon, ljubimac) i dodatni pokreti tela (rep)
        for (const worn of this.worn.values()) {
            worn.animate?.(time, dt, live);
            if (live && worn.motion) this.itemMotion(worn, time);
        }
        this.body.animate?.(time, dt, live);
        return busy;
    }

    /**
     * Oči gledaju malo ka gledaocu (lik je okrenut u 3/4, a i glava se pomera), uz retke
     * kratke skokove pogleda — pogled nije ukočen u sredini.
     */
    private updateGaze(time: number, dt: number, live: boolean) {
        const face = this.body.face;
        if (!face.setGaze) return;
        this.root.getWorldQuaternion(this.worldQ);
        this.worldE.setFromQuaternion(this.worldQ, "YXZ");
        const head = this.body.rig.bone("head");
        const yaw = this.worldE.y + head.rotation.y;
        // Jabučica se okreće ≈ 0,34 rad po jedinici pogleda: pola ugla ka gledaocu
        const baseX = THREE.MathUtils.clamp((-yaw * 0.5) / 0.34, -0.75, 0.75);
        const baseY = THREE.MathUtils.clamp(0.06 - head.rotation.x * 0.8, -0.4, 0.4);
        if (live && time > this.nextSaccade) {
            const r = Math.random();
            // Najčešće nazad ka gledaocu, ponekad malo u stranu ili gore
            this.gazeTarget.set(r < 0.5 ? 0 : (Math.random() - 0.5) * 0.7, r < 0.5 ? 0 : (Math.random() - 0.4) * 0.35);
            this.nextSaccade = time + 0.8 + Math.random() * 2.6;
        }
        if (!live) this.gazeTarget.set(0, 0);
        const k = live ? 1 - Math.exp(-dt / 0.035) : 1;
        this.gaze.lerp(this.gazeTarget, k);
        face.setGaze(baseX + this.gaze.x, baseY + this.gaze.y);
    }

    /** Disanje (≈ 16 udaha u minuti), prenošenje težine, pogled levo-desno, treptanje */
    private idle(time: number, _dt: number) {
        const rig = this.body.rig;
        const t = time + this.phase;
        const breath = Math.sin(t * 1.7);
        const sway = Math.sin(t * 0.55) * 0.5 + Math.sin(t * 0.23) * 0.5;
        rig.bone("hips").rotation.z += sway * 0.016;
        rig.bone("hips").position.x += sway * 0.004;
        rig.bone("thighL").rotation.z -= sway * 0.016;
        rig.bone("thighR").rotation.z -= sway * 0.016;
        // Težina na jednoj nozi: druga je u kolenu jedva savijena
        rig.bone("shinL").rotation.x += Math.max(0, -sway) * 0.05;
        rig.bone("shinR").rotation.x += Math.max(0, sway) * 0.05;
        rig.bone("spine").rotation.z -= sway * 0.011;
        rig.bone("spine").rotation.x += breath * 0.006;
        rig.bone("chest").rotation.x -= breath * 0.012;
        rig.bone("chest").rotation.z -= sway * 0.006;
        rig.bone("neck").rotation.x += breath * 0.006;
        const look = Math.sin(t * 0.31) * 0.6 + Math.sin(t * 0.13) * 0.4;
        const head = rig.bone("head");
        head.rotation.y += look * 0.08;
        // Glava se blago naginje uz prenošenje težine (živahnije, ne ukočeno)
        head.rotation.z += sway * 0.03 + Math.sin(t * 0.4) * 0.014;
        head.rotation.x += Math.sin(t * 0.27) * 0.018;
        rig.bone("upperArmL").rotation.z += breath * 0.01 + sway * 0.01;
        rig.bone("upperArmR").rotation.z += -breath * 0.01 + sway * 0.01;
        rig.bone("upperArmL").rotation.x += Math.sin(t * 0.5) * 0.02;
        rig.bone("upperArmR").rotation.x += Math.sin(t * 0.5 + 1) * 0.02;
        // Treptanje na 2–6 s, ponekad dvaput
        if (this.blinkStart < 0 && time > this.nextBlink) this.blinkStart = time;
        if (this.blinkStart >= 0) {
            const p = (time - this.blinkStart) / 0.16;
            const amount = p < 0.5 ? p * 2 : Math.max(0, 2 - p * 2);
            this.body.face.setBlink(Math.min(1, amount));
            if (p >= 1) {
                this.blinkStart = -1;
                this.nextBlink = time + (Math.random() < 0.15 ? 0.25 : 2 + Math.random() * 4);
                this.body.face.setBlink(0);
            }
        }
    }

    private applyAction(action: FigureAction, p: number, time: number) {
        const rig = this.body.rig;
        const scale = this.body.shape.height / 1.2;
        const ease = (x: number) => x * x * (3 - 2 * x);
        const up = (a: number, b: number) => ease(Math.min(1, p / a)) * (1 - ease(Math.max(0, (p - b) / (1 - b))));
        const hop = (q: number, h: number) => (q > 0 && q < 1 ? 4 * q * (1 - q) * h : 0);
        const root = rig.root;
        switch (action) {
            case "wave": {
                // Leva ruka gore, šaka maše; posle toga se mirno spusti
                const r = up(0.15, 0.82);
                rig.bone("upperArmL").rotation.z += 2.35 * r;
                rig.bone("upperArmL").rotation.x += -0.25 * r;
                rig.bone("forearmL").rotation.z += (0.35 + 0.38 * Math.sin((time - this.actionAt) * 9)) * r;
                rig.bone("head").rotation.z += -0.05 * r;
                break;
            }
            case "hop": {
                root.position.y += hop(p, 0.06 * scale);
                const r = up(0.2, 0.7);
                rig.bone("upperArmL").rotation.z += 0.35 * r;
                rig.bone("upperArmR").rotation.z -= 0.35 * r;
                break;
            }
            case "joy": {
                root.position.y += hop(p * 2, 0.05 * scale) + hop(p * 2 - 1, 0.05 * scale);
                const r = up(0.15, 0.75);
                rig.bone("upperArmL").rotation.z += 1.4 * r;
                rig.bone("upperArmR").rotation.z -= 1.4 * r;
                rig.bone("head").rotation.z += Math.sin(p * Math.PI * 2) * 0.08;
                break;
            }
            case "cheer": {
                // Obe ruke visoko, dva skoka, pa ruke dole
                const r = up(0.12, 0.8);
                rig.bone("upperArmL").rotation.z += 2.6 * r;
                rig.bone("upperArmR").rotation.z -= 2.6 * r;
                rig.bone("forearmL").rotation.z += 0.2 * r + Math.sin(p * 30) * 0.08 * r;
                rig.bone("forearmR").rotation.z -= 0.2 * r + Math.sin(p * 30) * 0.08 * r;
                root.position.y += hop((p - 0.1) * 2.6, 0.07 * scale) + hop((p - 0.1) * 2.6 - 1.1, 0.06 * scale);
                break;
            }
            case "appear": {
                // Pojava: mali „iskok” iz ničega
                const s = p < 1 ? 1 - Math.pow(1 - p, 3) * 0.18 + Math.sin(p * Math.PI) * 0.04 : 1;
                root.scale.setScalar(s);
                break;
            }
        }
    }

    private itemMotion(worn: Worn, time: number) {
        const object = worn.objects[worn.objects.length - 1];
        if (!object || object.parent !== this.body.root) return;
        const t = time + this.phase;
        switch (worn.motion) {
            case "pet-hop": {
                // Ljubimac povremeno poskoči (svake 4 s)
                const q = ((t % 4) - 3.4) / 0.6;
                object.position.y = q > 0 && q < 1 ? 4 * q * (1 - q) * 0.04 : 0;
                break;
            }
            case "pet-lean":
                object.rotation.z = Math.sin(t * 0.8) * 0.03;
                break;
            case "float":
                object.rotation.z = Math.sin(t * 1.1) * 0.05;
                break;
            case "spin":
                object.rotation.y = t * 0.6;
                break;
            default:
                break;
        }
    }

    dispose() {
        for (const slot of [...this.worn.keys()]) this.takeOff(slot);
        for (const key of [...this.base.keys()]) this.takeOffBase(key);
        this.body.dispose();
        this.root.clear();
    }

    get hasPet(): boolean {
        return this.worn.has("pet");
    }

    /** Samo mirno disanje (bez pokreta, prelaza i govora) — dovoljno je ređe crtanje */
    get isCalm(): boolean {
        return !this.action && !this.pendingAction && this.exprT >= 1 && this.poseT >= 1 && !this.speaking;
    }

    /** Vreme poslednjeg kadra (za probne stranice) */
    get time(): number {
        return this.clock;
    }
}
