// Probni pokretač životinje za stranicu u razvoju (app/dev/avatar3d-animals): mirni pokreti
// kostiju (disanje, prenošenje težine, pogled), treptanje i meki prelaz izraza — isto ono što
// motor radi za svaki FigureBody. Pravi motor (#1) ima svoj; ovo služi samo za proveru.

import type * as THREE from "three";
import type { FaceExpression, FigureBody } from "../contract";
import type { Animated } from "../engine/stage";

export class FigurePreview implements Animated {
    readonly root: THREE.Object3D;
    height: number;
    private nextBlink = 2;
    private blinkStart = -1;
    private phase = Math.random() * 10;
    private expression: FaceExpression = "neutral";
    private exprT = 1;
    /** Govor (proba usta): 0 = ćuti */
    talk = 0;
    /** Pomeraji uz objekte predmeta (ljubimci, plašt) */
    extra: ((time: number, dt: number, live: boolean) => void)[] = [];

    constructor(readonly body: FigureBody) {
        this.root = body.root;
        this.height = body.anchors.height;
    }

    setExpression(e: FaceExpression) {
        if (e === this.expression) return;
        this.expression = e;
        this.exprT = 0;
    }

    update(time: number, dt: number, live: boolean): boolean {
        const rig = this.body.rig;
        const bone = rig.bone;
        if (this.exprT < 1) {
            this.exprT = Math.min(1, this.exprT + dt / 0.35);
            this.body.face.setExpression(this.expression, live ? this.exprT : 1);
            if (!live) this.exprT = 1;
        }
        if (!live) {
            for (const b of rig.bones) b.rotation.set(0, 0, 0);
            this.body.face.setBlink(0);
            this.body.face.setMouth(this.talk, 0.2);
            this.body.animate?.(time, dt, false);
            for (const fn of this.extra) fn(time, dt, false);
            return this.exprT < 1;
        }
        const t = time + this.phase;
        const breath = Math.sin(t * 1.7);
        const sway = Math.sin(t * 0.55) * 0.5 + Math.sin(t * 0.23) * 0.5;
        bone("hips").rotation.z = sway * 0.018;
        bone("thighL").rotation.z = -sway * 0.018;
        bone("thighR").rotation.z = -sway * 0.018;
        bone("spine").rotation.z = -sway * 0.012;
        bone("spine").rotation.x = breath * 0.006;
        bone("chest").rotation.x = -breath * 0.012;
        bone("neck").rotation.x = breath * 0.006;
        const look = Math.sin(t * 0.31) * 0.6 + Math.sin(t * 0.13) * 0.4;
        bone("head").rotation.y = look * 0.09;
        bone("head").rotation.z = sway * 0.025 + Math.sin(t * 0.4) * 0.012;
        bone("head").rotation.x = Math.sin(t * 0.27) * 0.02;
        bone("upperArmL").rotation.z = 0.02 + breath * 0.01;
        bone("upperArmR").rotation.z = -0.02 - breath * 0.01;
        bone("forearmL").rotation.x = -0.05 + Math.sin(t * 0.7) * 0.015;
        bone("forearmR").rotation.x = -0.05 + Math.sin(t * 0.7 + 2) * 0.015;
        if (this.blinkStart < 0 && time > this.nextBlink) this.blinkStart = time;
        if (this.blinkStart >= 0) {
            const p = (time - this.blinkStart) / 0.16;
            this.body.face.setBlink(Math.min(1, p < 0.5 ? p * 2 : Math.max(0, 2 - p * 2)));
            if (p >= 1) {
                this.blinkStart = -1;
                this.nextBlink = time + (Math.random() < 0.15 ? 0.25 : 2 + Math.random() * 4);
                this.body.face.setBlink(0);
            }
        }
        const talk = this.talk > 0 ? Math.max(0, Math.sin(t * 11) * 0.5 + Math.sin(t * 7.3) * 0.5) * this.talk : 0;
        this.body.face.setMouth(talk, 0.25 + 0.25 * Math.sin(t * 3));
        this.body.animate?.(time, dt, true);
        for (const fn of this.extra) fn(time, dt, true);
        return true;
    }
}
