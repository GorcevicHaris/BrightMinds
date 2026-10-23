// Mačka u istom stilu kao ljudski lik: velika glava, iste sjajne oči sa kapcima, meko
// krzno (sheen + mapa normala), rep koji se polako njiše i ogrlica sa zvoncetom.
// Pokazuje da i životinje (drugari) mogu u isti 3D studio.

import * as THREE from "three";
import { EYE_COLORS, swatch, type AvatarLook } from "../catalog";
import { fabricMaterial, glossyMaterial, metalMaterial } from "./materials";
import type { Animated } from "./stage";
import { buildSurface, polyPath, profile, taperedTube } from "./surface";
import { irisTexture } from "./textures";

const FUR = "#EE8A3E";
const CREAM = "#FFF1DD";

function furMaterial(hex: string) {
    return fabricMaterial(hex, "fleece", { sheen: 1, sheenLift: 0.5, roughness: 0.85, normalScale: 0.35 });
}

/** Telo koje sedi: kruška od karlice do vrata (lathe sa profilom) */
function lathe(radius: (t: number) => number, y0: number, y1: number, depth = 1, zShift: (t: number) => number = () => 0): THREE.BufferGeometry {
    return buildSurface((u, v, out) => {
        const a = u * Math.PI * 2;
        const r = radius(v);
        return out.set(Math.sin(a) * r, y0 + (y1 - y0) * v, Math.cos(a) * r * depth + zShift(v));
    }, { nu: 48, nv: 32, closedU: true, inside: (_u, v, out) => out.set(0, y0 + (y1 - y0) * v, zShift(v)) });
}

export class Cat implements Animated {
    readonly root = new THREE.Group();
    height = 0.78;
    private head = new THREE.Group();
    private tail = new THREE.Group();
    private body = new THREE.Group();
    private lids: THREE.Object3D[] = [];
    private ears: THREE.Object3D[] = [];
    private nextBlink = 2;
    private blinkStart = -1;
    private eyeHex = "";

    constructor(look: AvatarLook) {
        this.build(look);
    }

    private build(look: AvatarLook) {
        this.root.clear();
        this.lids = [];
        this.ears = [];
        this.eyeHex = swatch(EYE_COLORS, look.eyes).hex;
        const fur = furMaterial(FUR);
        const cream = furMaterial(CREAM);
        const pink = fabricMaterial("#F4A0AE", "felt", { sheen: 0.4 });

        // Telo
        this.body = new THREE.Group();
        const torso = lathe(profile([[0, 0.0], [0.04, 0.1], [0.25, 0.148], [0.55, 0.13], [0.85, 0.085], [1, 0.05]]), 0.02, 0.36, 0.92, (t) => -0.02 * t);
        this.body.add(new THREE.Mesh(torso, fur));
        const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), cream);
        belly.scale.set(0.085, 0.13, 0.05);
        belly.position.set(0, 0.2, 0.085);
        this.body.add(belly);
        // Zadnje noge (sede bočno) i prednje noge sa šapama
        for (const side of [1, -1]) {
            const haunch = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), fur);
            haunch.scale.set(0.07, 0.085, 0.11);
            haunch.position.set(side * 0.105, 0.075, 0.01);
            this.body.add(haunch);
            const backPaw = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), cream);
            backPaw.scale.set(0.038, 0.026, 0.06);
            backPaw.position.set(side * 0.12, 0.022, 0.1);
            this.body.add(backPaw);
            const leg = new THREE.Mesh(taperedTube(polyPath([new THREE.Vector3(side * 0.055, 0.26, 0.06), new THREE.Vector3(side * 0.058, 0.14, 0.1), new THREE.Vector3(side * 0.056, 0.035, 0.12)]), profile([[0, 0.036], [0.6, 0.03], [1, 0.03]]), 24, 16), fur);
            this.body.add(leg);
            const paw = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), cream);
            paw.scale.set(0.034, 0.024, 0.042);
            paw.position.set(side * 0.056, 0.022, 0.135);
            this.body.add(paw);
            // Jastučići prstiju (male kvržice)
            for (let i = -1; i <= 1; i++) {
                const toe = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), cream);
                toe.position.set(side * 0.056 + i * 0.017, 0.026, 0.168);
                this.body.add(toe);
            }
        }
        this.root.add(this.body);

        // Rep: krivina iza tela koja se diže sa strane
        this.tail = new THREE.Group();
        this.tail.position.set(0, 0.05, -0.12);
        const tailPath = polyPath([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.09, 0.0, -0.06), new THREE.Vector3(0.18, 0.06, -0.04), new THREE.Vector3(0.21, 0.17, 0.0), new THREE.Vector3(0.19, 0.25, 0.03)]);
        this.tail.add(new THREE.Mesh(taperedTube(tailPath, profile([[0, 0.032], [0.5, 0.028], [0.9, 0.024], [1, 0.006]]), 48, 16), fur));
        const tip = new THREE.Mesh(taperedTube((s, out) => tailPath(0.88 + s * 0.12, out), profile([[0, 0.0255], [0.7, 0.022], [1, 0.004]]), 12, 16), cream);
        this.tail.add(tip);
        this.root.add(this.tail);

        // Ogrlica sa zvoncetom
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.011, 12, 40), fabricMaterial("#E0455A", "felt", { sheen: 0.5 }));
        collar.rotation.x = Math.PI / 2 - 0.25;
        collar.position.set(0, 0.345, -0.012);
        this.root.add(collar);
        const bell = new THREE.Mesh(new THREE.SphereGeometry(0.017, 20, 14), metalMaterial("#F2C230"));
        bell.position.set(0, 0.33, 0.065);
        this.root.add(bell);

        // Glava
        this.head = new THREE.Group();
        this.head.position.set(0, 0.36, 0.0);
        const R = 0.17;
        const headGeo = buildSurface((u, v, out) => {
            const th = (u - 0.5) * Math.PI * 2;
            const ph = v * Math.PI;
            let x = Math.sin(th) * Math.sin(ph);
            const y = Math.cos(ph);
            let z = Math.cos(th) * Math.sin(ph);
            // Široki obrazi, spljošteno teme
            const cheek = Math.exp(-((y + 0.35) ** 2) / 0.08) * Math.max(0, Math.abs(x) - 0.2);
            x *= 1.12 + cheek * 0.25;
            z *= 0.9;
            return out.set(x * R, 0.15 + y * R * 0.86, z * R);
        }, { nu: 72, nv: 54, closedU: true, inside: (_u, _v, out) => out.set(0, 0.15, 0) });
        this.head.add(new THREE.Mesh(headGeo, fur));
        // Šare na čelu (tri tamnije pruge)
        const stripe = furMaterial("#C8642A");
        for (const [x, len] of [[0, 0.07], [-0.03, 0.05], [0.03, 0.05]] as const) {
            const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, len, 4, 10), stripe);
            s.position.set(x, 0.27, 0.12);
            s.rotation.x = -0.75;
            s.scale.z = 0.4;
            this.head.add(s);
        }
        // Njuška, nos, usta, brkovi
        for (const side of [1, -1]) {
            const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), cream);
            m.scale.set(0.045, 0.036, 0.034);
            m.position.set(side * 0.032, 0.085, 0.138);
            this.head.add(m);
            for (let i = 0; i < 3; i++) {
                const start = new THREE.Vector3(side * 0.06, 0.09 - i * 0.012, 0.15);
                const whisker = new THREE.Mesh(taperedTube(polyPath([start, start.clone().add(new THREE.Vector3(side * 0.06, 0.006 - i * 0.008, -0.004)), start.clone().add(new THREE.Vector3(side * 0.12, -i * 0.018, -0.02))]), (s) => 0.0016 * (1 - s * 0.7), 12, 5), glossyMaterial("#FFFFFF", 0.5, 0));
                this.head.add(whisker);
            }
        }
        const chin = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), cream);
        chin.scale.set(0.035, 0.022, 0.03);
        chin.position.set(0, 0.058, 0.128);
        this.head.add(chin);
        const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), glossyMaterial("#F07C93", 0.35, 0.6));
        nose.scale.set(0.017, 0.011, 0.011);
        nose.position.set(0, 0.108, 0.168);
        this.head.add(nose);

        // Uši
        for (const side of [1, -1]) {
            const ear = new THREE.Group();
            const outer = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 24, 1, true), fur);
            outer.geometry.translate(0, 0.05, 0);
            const inner = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.072, 20, 1, true), pink);
            inner.geometry.translate(0, 0.036, 0.008);
            const back = new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), fur);
            back.rotation.x = Math.PI / 2;
            ear.add(outer, inner, back);
            ear.scale.z = 0.45;
            ear.position.set(side * 0.105, 0.27, -0.01);
            ear.rotation.set(-0.1, 0, -side * 0.42);
            this.head.add(ear);
            this.ears.push(ear);
        }

        // Oči: iste kao kod lika (sjajna sfera, dužica, kapci)
        const eyeMat = new THREE.MeshPhysicalMaterial({ map: irisTexture(this.eyeHex), roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04 });
        const shineMat = new THREE.MeshBasicMaterial({ color: "#FFFFFF" });
        const lidMat = furMaterial(FUR);
        const re = 0.042;
        for (const side of [1, -1]) {
            const eye = new THREE.Group();
            eye.position.set(side * 0.06, 0.16, 0.115);
            eye.rotation.set(0, side * 0.22, side * 0.1, "YXZ");
            eye.add(new THREE.Mesh(new THREE.SphereGeometry(re, 36, 22), eyeMat));
            const shine = new THREE.Mesh(new THREE.SphereGeometry(re * 0.15, 10, 8), shineMat);
            shine.position.copy(new THREE.Vector3(-0.22, 0.26, 0.94).normalize().multiplyScalar(re));
            eye.add(shine);
            const lid = new THREE.Group();
            lid.add(new THREE.Mesh(new THREE.SphereGeometry(re * 1.03, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), lidMat));
            const lash = new THREE.Mesh(taperedTube((s, out) => {
                const t = Math.PI * (0.06 + 0.88 * s);
                return out.set(Math.cos(t) * re * 1.04, 0, Math.sin(t) * re * 1.04);
            }, () => re * 0.06, 24, 6), new THREE.MeshStandardMaterial({ color: "#2A1A14", roughness: 0.8 }));
            lid.add(lash);
            eye.add(lid);
            this.lids.push(lid);
            this.head.add(eye);
        }
        this.setBlink(0);
        this.root.add(this.head);
    }

    private setBlink(amount: number) {
        const edge = THREE.MathUtils.lerp(0.62, -0.3, amount);
        this.lids.forEach((lid) => (lid.rotation.x = -edge));
    }

    setLook(look: AvatarLook) {
        if (swatch(EYE_COLORS, look.eyes).hex !== this.eyeHex) this.build(look);
    }

    update(time: number, _dt: number, live: boolean): boolean {
        if (!live) {
            this.head.rotation.set(0, 0, 0);
            this.tail.rotation.set(0, 0, 0);
            this.body.scale.set(1, 1, 1);
            this.setBlink(0);
            return false;
        }
        const breath = Math.sin(time * 1.9);
        this.body.scale.set(1 + breath * 0.006, 1 + breath * 0.004, 1 + breath * 0.006);
        this.head.rotation.y = Math.sin(time * 0.35) * 0.12;
        this.head.rotation.z = Math.sin(time * 0.5) * 0.04;
        this.tail.rotation.y = Math.sin(time * 1.1) * 0.18;
        this.tail.rotation.z = Math.sin(time * 0.7) * 0.06;
        const twitch = Math.max(0, Math.sin(time * 0.9) - 0.96) * 6;
        this.ears.forEach((ear, i) => (ear.rotation.x = -0.1 - twitch * 0.3 * (i === 0 ? 1 : 0)));
        if (this.blinkStart < 0 && time > this.nextBlink) this.blinkStart = time;
        if (this.blinkStart >= 0) {
            const p = (time - this.blinkStart) / 0.18;
            this.setBlink(Math.min(1, p < 0.5 ? p * 2 : Math.max(0, 2 - p * 2)));
            if (p >= 1) {
                this.blinkStart = -1;
                this.nextBlink = time + 2.5 + Math.random() * 4;
                this.setBlink(0);
            }
        }
        return true;
    }

    dispose() {
        this.root.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) mesh.geometry.dispose();
        });
    }
}
