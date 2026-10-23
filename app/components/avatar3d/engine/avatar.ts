// Sastavljen lik: kostur, telo, glava sa licem, kosa i odeća po mestima. Pri promeni
// izgleda menja se samo ono što se promenilo (npr. samo patike). Mirni pokreti:
// disanje, treptanje, blago prenošenje težine i pogled; uz „Manje animacija” — stoji mirno.

import * as THREE from "three";
import { EYE_COLORS, HAIR_COLORS_3D, SKIN_TONES_3D, getItem3D, swatch, type AvatarLook, type BodyKind, type Slot3D } from "../catalog";
import { buildBody } from "./body";
import { buildGarment, type GarmentContext } from "./garments";
import { buildHair } from "./hair";
import { buildHead, headInfo, type FaceRig, type HeadInfo } from "./head";
import { skinMaterial } from "./materials";
import { bodyShape, createRig, type Rig } from "./rig";
import type { Animated } from "./stage";

/** Od čega zavisi kroj predmeta na mestu (hidžab preko kaputa, naočare preko hidžaba…) */
function dependsOn(slot: Slot3D, look: AvatarLook): string {
    switch (slot) {
        case "head":
            return `${look.hair}:${look.wear.top?.id ?? ""}:${look.wear.long?.id ?? ""}`;
        case "glasses":
            return look.wear.head?.id ?? "";
        case "bag":
            return `${look.wear.top?.id ?? ""}:${look.wear.long?.id ?? ""}`;
        default:
            return "";
    }
}

/** Redosled mesta pri sastavljanju (dugačko pre gornjeg, da kaput zna šta je ispod) */
const SLOT_ORDER: Slot3D[] = ["bottom", "top", "long", "shoes", "head", "glasses", "bag"];

export class Avatar implements Animated {
    readonly root = new THREE.Group();
    height = 1.2;
    private rig!: Rig;
    private head!: HeadInfo;
    private face!: FaceRig;
    private body: THREE.Object3D[] = [];
    private hair: THREE.Object3D[] = [];
    private worn = new Map<Slot3D, { key: string; objects: THREE.Object3D[] }>();
    private look: AvatarLook | null = null;
    private nextBlink = 2;
    private blinkStart = -1;
    private phase = Math.random() * 10;
    private feet: THREE.Object3D[] = [];
    /** Za sličice: bez tela, samo predmet */
    hideBody = false;

    constructor(look: AvatarLook) {
        this.setLook(look);
    }

    setLook(look: AvatarLook) {
        const prev = this.look;
        const kind = look.figure as BodyKind;
        const rebuildBody = !prev || prev.figure !== look.figure || prev.skin !== look.skin || prev.eyes !== look.eyes || prev.hairColor !== look.hairColor;
        if (rebuildBody) this.buildFigure(kind, look);
        else if (prev.expression !== look.expression) this.face.setExpression(look.expression);

        // Odeća: menja se samo mesto čiji se predmet (ili boja) promenio
        const wearChanged = rebuildBody || JSON.stringify(prev?.wear) !== JSON.stringify(look.wear);
        if (wearChanged) {
            for (const slot of SLOT_ORDER) {
                const worn = look.wear[slot];
                const key = worn ? `${worn.id}:${worn.color}:${dependsOn(slot, look)}` : "";
                const current = this.worn.get(slot);
                if (!rebuildBody && current?.key === key) continue;
                if (current) this.detach(current.objects);
                this.worn.delete(slot);
                if (!worn) continue;
                const item = getItem3D(worn.id);
                if (!item) continue;
                const objects = buildGarment(this.garmentContext(look), item, worn.color);
                this.worn.set(slot, { key, objects });
            }
        }

        // Kosa: pod hidžabom je nema; ispod kape se prilagođava
        const hijab = look.wear.head?.id === "hidzab";
        const hatKey = `${look.hair}:${look.hairColor}:${hijab}:${look.wear.head?.id ?? ""}:${look.figure}`;
        if (rebuildBody || !prev || this.hairKey !== hatKey) {
            this.detach(this.hair);
            this.hair = hijab ? [] : buildHair(this.rig, this.head, look.hair, swatch(HAIR_COLORS_3D, look.hairColor).hex, Boolean(look.wear.head));
            this.hairKey = hatKey;
        }
        // Uši se ne vide ispod hidžaba
        this.face.ears.forEach((ear) => (ear.visible = !hijab));
        // Bosa stopala se ne crtaju u zatvorenoj obući
        const shoe = look.wear.shoes?.id;
        this.feet.forEach((foot) => (foot.visible = !shoe || shoe === "sandale"));
        this.look = look;
        this.applyShadows();
    }

    private hairKey = "";

    private garmentContext(look: AvatarLook): GarmentContext {
        return { rig: this.rig, head: this.head, look, skin: swatch(SKIN_TONES_3D, look.skin).hex, root: this.root };
    }

    private buildFigure(kind: BodyKind, look: AvatarLook) {
        // Sve staro van scene
        this.detach(this.body);
        this.detach(this.hair);
        for (const { objects } of this.worn.values()) this.detach(objects);
        this.worn.clear();
        if (this.rig) this.root.remove(this.rig.root);

        const shape = bodyShape(kind);
        this.height = shape.height;
        this.rig = createRig(shape);
        this.root.add(this.rig.root);
        const skinHex = swatch(SKIN_TONES_3D, look.skin).hex;
        const body = buildBody(this.rig, skinMaterial(skinHex), { feet: true });
        for (const mesh of body.skinned) this.root.add(mesh);
        this.body = [...body.skinned, ...body.rigid];
        this.feet = body.rigid.filter((mesh) => mesh.name === "stopalo");
        this.head = headInfo(shape);
        this.face = buildHead(this.head, skinHex, swatch(EYE_COLORS, look.eyes).hex, swatch(HAIR_COLORS_3D, look.hairColor).hex, look.expression);
        this.rig.bone("head").add(this.face.group);
        this.body.push(this.face.group);
    }

    /** Skida objekte sa scene i oslobađa geometriju (materijali su u kešu) */
    private detach(objects: THREE.Object3D[]) {
        for (const object of objects) {
            object.removeFromParent();
            object.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (mesh.isMesh) mesh.geometry.dispose();
            });
        }
    }

    private applyShadows() {
        this.root.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) {
                const transparent = (mesh.material as THREE.Material).transparent;
                mesh.castShadow = !transparent;
                mesh.receiveShadow = !transparent;
            }
        });
    }

    /** Svi delovi jednog mesta (za sličicu predmeta) */
    slotObjects(slot: Slot3D): THREE.Object3D[] {
        return this.worn.get(slot)?.objects ?? [];
    }

    setBodyVisible(visible: boolean) {
        for (const object of [...this.body, ...this.hair]) object.visible = visible;
    }

    setHeadVisible(visible: boolean) {
        this.face.group.visible = visible;
    }

    get faceObject(): THREE.Object3D {
        return this.face.group;
    }

    get hairObjects(): THREE.Object3D[] {
        return this.hair;
    }

    get rigBones(): Rig {
        return this.rig;
    }

    update(time: number, dt: number, live: boolean): boolean {
        const rig = this.rig;
        if (!rig) return false;
        const t = time + this.phase;
        if (!live) {
            for (const bone of rig.bones) bone.rotation.set(0, 0, 0);
            this.restPose();
            this.face.setBlink(0);
            return false;
        }
        // Disanje (≈ 16 udaha u minuti), prenošenje težine (sporo), pogled levo-desno
        const breath = Math.sin(t * 1.7);
        const sway = Math.sin(t * 0.55) * 0.5 + Math.sin(t * 0.23) * 0.5;
        this.restPose();
        rig.bone("hips").rotation.z = sway * 0.018;
        rig.bone("hips").position.x = sway * 0.004;
        rig.bone("thighL").rotation.z = -sway * 0.018;
        rig.bone("thighR").rotation.z = -sway * 0.018;
        rig.bone("spine").rotation.z = -sway * 0.012;
        rig.bone("spine").rotation.x = breath * 0.006;
        rig.bone("chest").rotation.x = -breath * 0.012;
        rig.bone("chest").rotation.z = -sway * 0.006;
        rig.bone("neck").rotation.x = breath * 0.006;
        const look = Math.sin(t * 0.31) * 0.6 + Math.sin(t * 0.13) * 0.4;
        rig.bone("head").rotation.y = look * 0.09;
        rig.bone("head").rotation.z = sway * 0.025 + Math.sin(t * 0.4) * 0.012;
        rig.bone("head").rotation.x = Math.sin(t * 0.27) * 0.02;
        rig.bone("upperArmL").rotation.z = 0.02 + breath * 0.01 + sway * 0.01;
        rig.bone("upperArmR").rotation.z = -0.02 - breath * 0.01 + sway * 0.01;
        rig.bone("upperArmL").rotation.x = Math.sin(t * 0.5) * 0.02;
        rig.bone("upperArmR").rotation.x = Math.sin(t * 0.5 + 1) * 0.02;
        rig.bone("forearmL").rotation.x = -0.05 + Math.sin(t * 0.7) * 0.015;
        rig.bone("forearmR").rotation.x = -0.05 + Math.sin(t * 0.7 + 2) * 0.015;
        // Treptanje na 2–6 s, ponekad dvaput
        if (this.blinkStart < 0 && time > this.nextBlink) this.blinkStart = time;
        if (this.blinkStart >= 0) {
            const p = (time - this.blinkStart) / 0.16;
            const amount = p < 0.5 ? p * 2 : Math.max(0, 2 - p * 2);
            this.face.setBlink(Math.min(1, amount));
            if (p >= 1) {
                this.blinkStart = -1;
                this.nextBlink = time + (Math.random() < 0.15 ? 0.25 : 2 + Math.random() * 4);
                this.face.setBlink(0);
            }
        }
        return true;
    }

    /** Mirna poza: ruke opuštene, malo savijene u laktovima */
    private restPose() {
        const rig = this.rig;
        rig.bone("upperArmL").rotation.z = 0.02;
        rig.bone("upperArmR").rotation.z = -0.02;
        rig.bone("forearmL").rotation.x = -0.05;
        rig.bone("forearmR").rotation.x = -0.05;
        rig.bone("hips").position.x = 0;
    }

    dispose() {
        this.detach(this.body);
        this.detach(this.hair);
        for (const { objects } of this.worn.values()) this.detach(objects);
    }
}
