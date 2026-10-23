// Svet oko drugara: podrazumevani mirni svetlosivi „studio-grad” (veliki jednostavni blokovi
// u daljini, meka magla, svetao pod) ili pozadina iz kataloga (registerBackgrounds, mesto
// `background`). Ista pravila za oba: lik stoji na (0, 0, 0), rekviziti su iza njega.

import * as THREE from "three";
import { backgroundBuilder, type Environment, type EnvironmentContext } from "../contract";
import { disposeObject } from "./materials";

const SKY_TOP = "#D6D9E0";
const SKY_BOTTOM = "#EBECF0";
const FLOOR = "#DADCE2";

/** Podrazumevani svet: tih, svetlosiv, sa krupnim geometrijskim „zgradama” u izmaglici */
export function defaultEnvironment(ctx: EnvironmentContext): Environment {
    const root = new THREE.Group();
    root.name = "svet";
    const low = ctx.quality === "low";
    const shades = ["#E4E6EB", "#D9DCE3", "#CED3DC", "#E0E3E9", "#C9CFD9"];
    const material = (i: number) => new THREE.MeshStandardMaterial({ color: shades[i % shades.length], roughness: 0.95, metalness: 0 });
    const materials = shades.map((_, i) => material(i));
    // Stalan raspored (bez nasumičnosti): blokovi različite visine levo i desno, dalje od lika
    const blocks: [number, number, number, number, number][] = [
        // x, z, širina, visina, dubina
        [-7.5, -11, 2.4, 6.5, 2.4], [-4.6, -13.5, 3.2, 9.5, 3], [-2.2, -16, 2.6, 5.4, 2.6], [1.6, -17, 3.6, 7.8, 3],
        [4.8, -13, 2.6, 11, 2.6], [7.6, -10.5, 2.2, 5.2, 2.2], [10.5, -14, 3, 8.4, 3], [-10.5, -15, 3, 7.2, 3],
        [-6, -7.5, 1.2, 1.6, 1.2], [6.2, -7, 1.4, 2.2, 1.4], [-3.4, -8.5, 0.9, 0.9, 0.9], [3.2, -9, 1.1, 1.3, 1.1],
    ];
    const box = new THREE.BoxGeometry(1, 1, 1);
    blocks.forEach(([x, z, w, h, d], i) => {
        if (low && i % 3 === 2) return;
        const mesh = new THREE.Mesh(box, materials[i % materials.length]);
        mesh.scale.set(w, h, d);
        mesh.position.set(x * (ctx.wide ? 1.25 : 1), h / 2, z);
        mesh.rotation.y = ((i * 37) % 9) * 0.04 - 0.16;
        root.add(mesh);
    });
    // Nekoliko oblih oblika (valjak, lopta) da svet ne bude samo od kocki
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 40), materials[1]);
    cyl.scale.set(1.3, 4.2, 1.3);
    cyl.position.set(-1.2, 2.1, -12);
    root.add(cyl);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), materials[0]);
    ball.scale.setScalar(0.9);
    ball.position.set(8.8, 0.9, -8.2);
    root.add(ball);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.35, 16, 48, Math.PI), materials[3]);
    arch.position.set(-8.6, 0, -9.5);
    arch.rotation.y = 0.4;
    root.add(arch);
    return {
        root,
        sky: [SKY_TOP, SKY_BOTTOM],
        fog: { color: SKY_BOTTOM, near: 4.5, far: 22 },
        floor: "default",
        floorColor: FLOOR,
    };
}

function skyTexture(sky: Environment["sky"]): THREE.Texture | THREE.Color {
    if (typeof sky === "string") return new THREE.Color(sky);
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, sky[0]);
    g.addColorStop(1, sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/** Okruženje na sceni: nebo, magla, pod i dodatno svetlo; menja se kad se promeni pozadina */
export class World {
    readonly root = new THREE.Group();
    private env: Environment | null = null;
    private sky: THREE.Texture | THREE.Color | null = null;
    readonly floor: THREE.Mesh;
    id: string | null | undefined = undefined;

    constructor() {
        this.root.name = "okruzenje";
        this.floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: FLOOR, roughness: 1, metalness: 0 }));
        this.floor.name = "pod";
        this.floor.renderOrder = -3;
        this.root.add(this.floor);
    }

    get environment(): Environment | null {
        return this.env;
    }

    /** id pozadine iz kataloga, null = podrazumevani svet; `transparent` = bez sveta (sličice) */
    set(id: string | null, ctx: EnvironmentContext, transparent = false): Environment | null {
        const key = transparent ? "__prozirno" : (id ?? "");
        if (key === this.id) return this.env;
        this.clear();
        this.id = key;
        if (transparent) {
            this.floor.visible = false;
            return null;
        }
        const builder = id ? backgroundBuilder(id) : undefined;
        let env: Environment;
        try {
            env = builder ? builder.build(ctx) : defaultEnvironment(ctx);
        } catch (error) {
            console.error(`3D pozadina ${id}:`, error);
            env = defaultEnvironment(ctx);
        }
        this.env = env;
        this.root.add(env.root);
        this.floor.visible = env.floor === "default";
        (this.floor.material as THREE.MeshStandardMaterial).color.set(env.floorColor ?? FLOOR);
        this.sky = skyTexture(env.sky);
        return env;
    }

    /** Primena na scenu (nebo i magla) */
    applyTo(scene: THREE.Scene) {
        const env = this.env;
        scene.background = env ? this.sky : null;
        scene.fog = env?.fog ? new THREE.Fog(env.fog.color, env.fog.near, env.fog.far) : null;
    }

    private clear() {
        if (this.env) {
            this.root.remove(this.env.root);
            disposeObject(this.env.root);
        }
        if (this.sky instanceof THREE.Texture) this.sky.dispose();
        this.env = null;
        this.sky = null;
    }

    dispose() {
        this.clear();
        this.floor.geometry.dispose();
        (this.floor.material as THREE.Material).dispose();
    }
}
