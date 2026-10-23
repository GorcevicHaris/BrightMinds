// Probni studio kataloga (samo /dev/avatar3d-items): jedan WebGL crtač koji redom crta
// lik sa predmetima (ili pozadinu) u sličicu i vraća je kao sliku. Svetla kao u studiju
// motora (toplo glavno, hladno popunjavajuće, dva kontra svetla), meka senka ispod lika.

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { CompanionKind, Environment, Slot, ThumbHint, Wear } from "../../contract";
import { backgroundBuilder, itemBuilder } from "../../contract";
import { getItem } from "../../manifest";
import { blobTexture } from "../../engine/textures";
import { solvePose, type PoseName } from "../../engine/pose";
import { buildTestFigure, takeOff, triangles, wearItem, type TestFigure, type Worn } from "./harness";
import "../index";

/** Budžet trouglova po mestu (dogovor sa motorom) */
export function budgetFor(slot: Slot, id: string): number {
    switch (slot) {
        case "outfit":
            return (getItem(id)?.hides ?? []).includes("bottom") ? 24000 : 16000;
        case "bottom":
            return 16000;
        case "hand":
        case "back":
            return 12000;
        case "background":
            return 60000;
        case "pet":
            return 15000;
        default:
            return 10000;
    }
}

/** Redosled oblačenja (donji deo pre gornjeg, kapa posle kose, ranac preko kaputa) */
const ORDER: Slot[] = ["bottom", "outfit", "feet", "neck", "back", "hat", "glasses", "hand"];

export interface CellRequest {
    kind: CompanionKind;
    wear: Wear;
    focus: ThumbHint["focus"];
    yaw?: number;
    zoom?: number;
    hijab?: string | null;
    width: number;
    height: number;
    /** Pozadina (id) — tada se crta okruženje, širi kadar */
    background?: string;
    wide?: boolean;
    /** Vreme animacije (oblaci, mehurići) — da se vidi i pokret */
    time?: number;
    /** "low" kao u sličicama prodavnice */
    quality?: "high" | "low";
    /** Poza ruku (engine/pose.ts): prekrštene ruke, šake na ustima… */
    pose?: PoseName;
}

export interface CellResult {
    url: string;
    tris: Record<string, number>;
    missing: string[];
    errors: string[];
}

function gradientTexture(top: string, bottom: string): THREE.Texture {
    const el = document.createElement("canvas");
    el.width = 4;
    el.height = 256;
    const ctx = el.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(el);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

export class Lab {
    readonly renderer: THREE.WebGLRenderer;
    readonly scene = new THREE.Scene();
    readonly camera = new THREE.PerspectiveCamera(24, 1, 0.05, 80);
    private figures = new Map<string, TestFigure>();
    private lights: { key: THREE.DirectionalLight; fill: THREE.DirectionalLight; rim: THREE.DirectionalLight; rim2: THREE.DirectionalLight; hemi: THREE.HemisphereLight };
    private floor: THREE.Mesh;
    private blob: THREE.Mesh;
    private studioBg: THREE.Texture;

    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
        this.renderer.setPixelRatio(1);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environmentIntensity = 0.3;
        pmrem.dispose();
        const key = new THREE.DirectionalLight("#FFF2E2", 3.1);
        key.position.set(-1.3, 2.7, 3.0);
        const fill = new THREE.DirectionalLight("#E4EEFF", 0.6);
        fill.position.set(2.2, 1.0, 2.2);
        const rim = new THREE.DirectionalLight("#FFFFFF", 2.0);
        rim.position.set(0.8, 2.6, -3.0);
        const rim2 = new THREE.DirectionalLight("#F2F4FF", 1.2);
        rim2.position.set(-2.2, 1.8, -2.0);
        const hemi = new THREE.HemisphereLight("#FFFFFF", "#D9CFC6", 0.3);
        this.lights = { key, fill, rim, rim2, hemi };
        this.scene.add(key, fill, rim, rim2, hemi);
        this.floor = new THREE.Mesh(new THREE.CircleGeometry(1.6, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#EEEEF2", roughness: 0.9 }));
        this.scene.add(this.floor);
        this.blob = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTexture(), color: "#000000", transparent: true, opacity: 0.32, depthWrite: false }));
        this.blob.position.y = 0.002;
        this.blob.renderOrder = 1;
        this.scene.add(this.blob);
        this.studioBg = gradientTexture("#F4F5F8", "#E2E4EA");
    }

    private figure(kind: CompanionKind, hat: boolean, hijab: string | null): TestFigure {
        const key = `${kind}-${hat}-${hijab ?? ""}`;
        let figure = this.figures.get(key);
        if (!figure) {
            figure = buildTestFigure(kind, { hat, hijab });
            this.figures.set(key, figure);
        }
        return figure;
    }

    private frame(figure: TestFigure, req: CellRequest) {
        const a = figure.body.anchors;
        const h = a.height;
        let target = new THREE.Vector3(0, h * 0.5, 0);
        let span = h * 1.06;
        const yaw = req.yaw ?? -0.42;
        switch (req.focus) {
            case "head":
                target = new THREE.Vector3(0, a.head.center.y + a.head.h * 0.12, a.head.center.z);
                span = a.head.h * 2.0;
                break;
            case "face":
                target = new THREE.Vector3(0, (a.eyes.left.y + a.eyes.right.y) / 2, a.head.center.z);
                span = a.head.h * 1.35;
                break;
            case "upper":
                target = new THREE.Vector3(0, (a.head.top.y + a.torso.waistY) / 2 - 0.02, 0);
                span = (a.head.top.y - a.torso.waistY) * 1.35;
                break;
            case "lower":
                target = new THREE.Vector3(0, a.torso.waistY * 0.55, 0);
                span = a.torso.waistY * 1.25;
                break;
            case "feet":
                target = new THREE.Vector3(0, 0.07, 0.03);
                span = 0.36 * (h / 1.19);
                break;
            case "hand":
                target = a.hands.right.clone().add(new THREE.Vector3(0, 0.05, 0));
                span = 0.55 * (h / 1.19);
                break;
            case "back":
                target = new THREE.Vector3(0, (a.head.top.y + a.torso.hipY) / 2, 0);
                span = (a.head.top.y - a.torso.hipY) * 1.45;
                break;
            case "scene":
                target = new THREE.Vector3(0, h * 0.62, 0);
                span = h * 2.4;
                break;
            default:
                break;
        }
        span /= req.zoom ?? 1;
        const aspect = req.width / req.height;
        this.camera.aspect = aspect;
        this.camera.fov = req.background ? 30 : 24;
        this.camera.updateProjectionMatrix();
        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        // Visina kadra = span; širina predmeta ≈ 0,7 visine (da stane i u uzan kadar)
        let dist = Math.max(span / 2, (span * 0.7) / 2 / aspect) / Math.tan(fov / 2);
        if (req.background) {
            // Okruženje: kamera dalje, vidi se x ±4 u širokom kadru
            target = new THREE.Vector3(0, h * 0.75, 0);
            dist = req.wide ? 9.2 : 5.6;
        }
        const back = req.focus === "back" ? Math.PI : 0;
        const y = yaw + back;
        this.camera.position.set(target.x + Math.sin(y) * dist, target.y + dist * 0.07, target.z + Math.cos(y) * dist);
        this.camera.lookAt(target);
    }

    /** Crta jednu sličicu (lik + predmeti ili okruženje) */
    render(req: CellRequest): CellResult {
        const errors: string[] = [];
        const missing: string[] = [];
        const tris: Record<string, number> = {};
        const hijab = req.hijab ?? null;
        const figure = this.figure(req.kind, Boolean(req.wear.hat), hijab);
        const worn: Worn[] = [];
        const hidden = new Set<Slot>();
        for (const id of Object.values(req.wear)) for (const s of getItem(id ?? "")?.hides ?? []) hidden.add(s);
        this.scene.add(figure.body.root);
        for (const slot of ORDER) {
            const id = req.wear[slot];
            if (!id || hidden.has(slot)) continue;
            if (!itemBuilder(id)) {
                missing.push(id);
                continue;
            }
            try {
                const w = wearItem(figure, id, req.wear, req.quality ?? "high");
                if (w) {
                    worn.push(w);
                    tris[id] = triangles(w.objects);
                }
            } catch (error) {
                errors.push(`${id}: ${(error as Error).message}`);
            }
        }
        let env: Environment | null = null;
        if (req.background) {
            const bb = backgroundBuilder(req.background);
            if (!bb) missing.push(req.background);
            else {
                try {
                    env = bb.build({ figureHeight: figure.body.anchors.height, wide: Boolean(req.wide), quality: req.quality ?? "high" });
                    this.scene.add(env.root);
                    tris[req.background] = triangles([env.root]);
                    env.animate?.(req.time ?? 3, 0.016, true);
                } catch (error) {
                    errors.push(`${req.background}: ${(error as Error).message}`);
                }
            }
        }
        this.applyEnvironment(env);
        this.frame(figure, req);
        const rig = figure.body.rig;
        if (req.pose && req.pose !== "relaxed") {
            const sol = solvePose(rig, req.pose);
            for (const [side, arm] of [["L", sol.left], ["R", sol.right]] as const) {
                if (!arm) continue;
                rig.bone(`upperArm${side}`).quaternion.copy(arm.upper);
                rig.bone(`forearm${side}`).quaternion.copy(arm.fore);
                rig.bone(`hand${side}`).quaternion.copy(arm.hand);
            }
        }
        this.renderer.setSize(req.width, req.height, false);
        figure.body.root.updateMatrixWorld(true);
        this.renderer.render(this.scene, this.camera);
        // Pokreti predmeta (posle poze: balon i kišobran se ispravljaju prema ruci)
        figure.body.root.updateMatrixWorld(true);
        for (const w of worn) w.animate?.(req.time ?? 1.2, 0.016, false);
        figure.body.root.updateMatrixWorld(true);
        this.renderer.render(this.scene, this.camera);
        const url = this.renderer.domElement.toDataURL("image/png");
        for (const bone of rig.bones) bone.quaternion.identity();
        for (const w of worn.reverse()) takeOff(w);
        this.scene.remove(figure.body.root);
        if (env) {
            this.scene.remove(env.root);
            env.root.traverse((o) => {
                const m = o as THREE.Mesh;
                if (m.isMesh) m.geometry.dispose();
            });
        }
        return { url, tris, missing, errors };
    }

    private applyEnvironment(env: Environment | null) {
        const { key, fill, rim, rim2, hemi } = this.lights;
        key.color.set("#FFF2E2");
        key.intensity = 3.1;
        key.position.set(-1.3, 2.7, 3.0);
        hemi.color.set("#FFFFFF");
        hemi.groundColor.set("#D9CFC6");
        hemi.intensity = 0.3;
        fill.intensity = 0.6;
        rim.intensity = 2.0;
        rim2.intensity = 1.2;
        this.renderer.toneMappingExposure = 1;
        this.scene.fog = null;
        if (!env) {
            this.scene.background = this.studioBg;
            this.floor.visible = true;
            (this.floor.material as THREE.MeshStandardMaterial).color.set("#EEEEF2");
            return;
        }
        this.scene.background = typeof env.sky === "string" ? new THREE.Color(env.sky) : gradientTexture(env.sky[0], env.sky[1]);
        if (env.fog) this.scene.fog = new THREE.Fog(env.fog.color, env.fog.near, env.fog.far);
        this.floor.visible = env.floor === "default";
        if (env.floorColor) (this.floor.material as THREE.MeshStandardMaterial).color.set(env.floorColor);
        if (env.light?.hemi) {
            hemi.color.set(env.light.hemi.sky);
            hemi.groundColor.set(env.light.hemi.ground);
            hemi.intensity = env.light.hemi.intensity;
        }
        if (env.light?.sun) {
            key.color.set(env.light.sun.color);
            key.intensity = env.light.sun.intensity;
            key.position.set(...env.light.sun.dir).normalize().multiplyScalar(4);
        }
        if (env.light?.exposure) this.renderer.toneMappingExposure = env.light.exposure;
    }
}
