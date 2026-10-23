// Jedna 3D scena drugara (bez sopstvenog renderera): svet ili providna pozadina, meko studijsko
// svetlo (glavno, popunjavajuće, kontra; okruženje za odsjaje), meka senka na podu („contact
// shadow”), kadar po sidrima tela i okretanje prevlačenjem sa mirnim povratkom u 3/4 ugao.
// Crta je deljeni renderer (live.ts za živi prikaz, snapshots.ts za sličice).

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";
import type { Slot } from "../contract";
import type { Figure } from "./figure";
import { World } from "./world";

/** Kadar: ceo lik, široko (baner), poprsje, lice, portret (do pojasa) */
export type Framing = "full" | "wide" | "bust" | "face" | "portrait";

const FOV = 28;
/** Podrazumevani blagi 3/4 ugao (rad) */
export const REST_YAW = 0.22;

const SHADOW_VERT = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
varying float vHeight;
void main() {
    #include <skinbase_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>
    #include <project_vertex>
    vHeight = (modelMatrix * vec4(transformed, 1.0)).y;
}`;
const SHADOW_FRAG = /* glsl */ `
uniform float uMaxHeight;
uniform float uDarkness;
varying float vHeight;
void main() {
    float k = 1.0 - smoothstep(0.0, uMaxHeight, vHeight);
    gl_FragColor = vec4(0.0, 0.0, 0.0, uDarkness * k * k);
}`;

const envMaps = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();

/** Okruženje za odsjaje (sobna svetla, pravi se u kodu) — jednom po rendereru */
function environmentFor(renderer: THREE.WebGLRenderer): THREE.Texture {
    let texture = envMaps.get(renderer);
    if (!texture) {
        const pmrem = new THREE.PMREMGenerator(renderer);
        texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose();
        envMaps.set(renderer, texture);
    }
    return texture;
}

export interface SceneOptions {
    framing: Framing;
    /** id pozadine (svet iz kataloga), null = podrazumevani svetlosivi svet, "none" = providno */
    background: string | null;
    quality: "high" | "low";
    /** Široki kadar: gde je lik na ekranu (−1 levo … 1 desno) */
    align?: number;
}

export class StageScene {
    readonly scene = new THREE.Scene();
    readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 80);
    readonly turntable = new THREE.Group();
    readonly world = new World();
    figure: Figure | null = null;
    private keyLight: THREE.DirectionalLight;
    private hemi: THREE.HemisphereLight;
    private fill: THREE.DirectionalLight;
    private shadow: { rt: THREE.WebGLRenderTarget; rtBlur: THREE.WebGLRenderTarget; camera: THREE.OrthographicCamera; plane: THREE.Mesh; blurPlane: THREE.Mesh; depth: THREE.ShaderMaterial; hBlur: THREE.ShaderMaterial; vBlur: THREE.ShaderMaterial } | null = null;
    private frames = 0;
    private options: SceneOptions;
    private aspect = 1;
    // Okretanje
    yaw = REST_YAW;
    restYaw = REST_YAW;
    private velocity = 0;
    private dragging = false;
    private releasedAt = 0;
    private lastDragT = 0;
    /** Pomeraj kadra za sličicu predmeta (okvir oko predmeta) */
    private focusBox: THREE.Box3 | null = null;
    dirty = true;

    constructor(options: SceneOptions) {
        this.options = { ...options };
        this.scene.add(this.world.root, this.turntable);
        // Toplo glavno svetlo spreda-levo-gore, hladnije popunjavajuće, dva kontra svetla pozadi
        const key = new THREE.DirectionalLight("#FFF1E0", 3.7);
        key.position.set(-1.3, 2.7, 3.0);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.intensity = 0.5;
        key.shadow.bias = -0.0004;
        key.shadow.normalBias = 0.003;
        key.shadow.radius = 4;
        this.keyLight = key;
        this.fill = new THREE.DirectionalLight("#E4EEFF", 0.32);
        this.fill.position.set(2.2, 1.0, 2.2);
        const rim = new THREE.DirectionalLight("#FFE4CF", 1.9);
        rim.position.set(0.8, 2.6, -3.0);
        const rim2 = new THREE.DirectionalLight("#FFE9DC", 1.0);
        rim2.position.set(-2.2, 1.8, -2.0);
        this.hemi = new THREE.HemisphereLight("#FFFFFF", "#CFC4BA", 0.2);
        this.scene.add(key, key.target, this.fill, rim, rim2, this.hemi);
        this.applyWorld();
    }

    get framing(): Framing {
        return this.options.framing;
    }

    private envContext() {
        return { figureHeight: this.figure?.height ?? 1.3, wide: this.options.framing === "wide", quality: this.options.quality };
    }

    private applyWorld() {
        const transparent = this.options.background === "none";
        const env = this.world.set(transparent ? null : this.options.background, this.envContext(), transparent);
        this.world.applyTo(this.scene);
        const light = env?.light;
        this.hemi.color.set(light?.hemi?.sky ?? "#FFFFFF");
        this.hemi.groundColor.set(light?.hemi?.ground ?? "#CFC4BA");
        this.hemi.intensity = light?.hemi?.intensity ?? 0.2;
        if (light?.sun) {
            this.keyLight.color.set(light.sun.color);
            this.keyLight.intensity = light.sun.intensity;
            this.keyLight.position.set(...(light.sun.dir as [number, number, number])).normalize().multiplyScalar(4);
        } else {
            this.keyLight.color.set("#FFF1E0");
            this.keyLight.intensity = 3.7;
            this.keyLight.position.set(-1.3, 2.7, 3.0);
        }
        this.dirty = true;
    }

    setBackground(background: string | null) {
        if (background === this.options.background) return;
        this.options.background = background;
        this.applyWorld();
    }

    setFraming(framing: Framing, align = this.options.align ?? 0) {
        if (framing === this.options.framing && align === this.options.align) return;
        const wideChanged = (framing === "wide") !== (this.options.framing === "wide");
        this.options.framing = framing;
        this.options.align = align;
        if (wideChanged && this.options.background !== "none") {
            // Široki kadar raspoređuje rekvizite šire — svet se pravi ponovo
            this.world.id = undefined;
            this.applyWorld();
        }
        this.frameCamera();
    }

    setFigure(figure: Figure | null) {
        if (this.figure) this.turntable.remove(this.figure.root);
        this.figure = figure;
        if (figure) this.turntable.add(figure.root);
        this.frameCamera();
    }

    resize(width: number, height: number) {
        this.aspect = Math.max(0.1, width / Math.max(1, height));
        this.camera.aspect = this.aspect;
        this.camera.updateProjectionMatrix();
        this.frameCamera();
    }

    /** Kadar oko okvira (sličica predmeta); null vraća kadar po vrsti */
    focus(box: THREE.Box3 | null) {
        this.focusBox = box;
        this.frameCamera();
    }

    frameCamera() {
        const figure = this.figure;
        const H = figure?.height ?? 1.3;
        const a = figure?.body.anchors;
        const fov = THREE.MathUtils.degToRad(FOV);
        const tan = Math.tan(fov / 2);
        let target: number;
        let span: number;
        let width: number;
        if (this.focusBox) {
            const box = this.focusBox;
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            span = Math.max(size.y, size.x / this.aspect, size.z / this.aspect) * 1.35 + 0.02;
            const dist = span / 2 / tan + size.z / 2;
            this.camera.position.set(center.x, center.y + dist * 0.12, center.z + dist);
            this.camera.lookAt(center);
            this.dirty = true;
            return;
        }
        // Vrh lika: teme, ili vrh ušiju/roga (zeka, jednorog) — da se u krupnom kadru ne odseku
        const top = a ? Math.max(a.head.top.y, a.ears.tipL.y, a.ears.tipR.y, a.horn?.tip.y ?? 0) : H;
        switch (this.options.framing) {
            case "face":
                target = a ? a.head.center.y : H * 0.85;
                span = a ? a.head.h * 1.7 : H * 0.3;
                width = span;
                break;
            case "bust":
                target = a ? (a.torso.shoulderY + top) / 2 - 0.01 : H * 0.8;
                span = a ? (top - a.torso.chestY) * 1.3 : H * 0.42;
                width = span * 0.9;
                break;
            case "portrait":
                target = a ? (a.torso.waistY + top) / 2 : H * 0.72;
                span = a ? (top - a.torso.waistY) * 1.2 : H * 0.6;
                width = span * 0.8;
                break;
            case "wide":
                // Baner: lik ≈ 90 % visine banera
                target = Math.max(H, top) * 0.5;
                span = Math.max(H, top) * 1.06;
                width = H * 0.62;
                break;
            default:
                // Ceo lik ≈ 88 % visine prikaza
                target = Math.max(H, top) * 0.5;
                span = Math.max(H, top) * 1.08;
                width = H * (this.figure && this.figure.hasPet ? 1.05 : 0.66);
        }
        const vDist = span / 2 / tan;
        const hDist = width / 2 / tan / this.aspect;
        const dist = Math.max(vDist, hDist);
        let pan = 0;
        if (this.options.framing === "wide") {
            // Lik na zadatom mestu ekrana (npr. desno od pozdrava)
            const halfW = tan * dist * this.aspect;
            pan = -(this.options.align ?? 0) * halfW * 0.8;
        }
        this.camera.position.set(pan, target + dist * 0.07, dist);
        this.camera.lookAt(pan, target - 0.01, 0);
        // Senka glavnog svetla pokriva lik bilo koje visine
        const s = H / 1.2;
        const cam = this.keyLight.shadow.camera;
        cam.left = -0.8 * s;
        cam.right = 0.8 * s;
        cam.top = 1.4 * s;
        cam.bottom = -0.6 * s;
        cam.near = 0.5;
        cam.far = 9;
        cam.updateProjectionMatrix();
        if (this.shadow) this.shadow.depth.uniforms.uMaxHeight.value = 0.35 * s;
        this.dirty = true;
    }

    // ── Okretanje prevlačenjem ────────────────────────────────────────────────────

    dragStart() {
        this.dragging = true;
        this.velocity = 0;
        this.lastDragT = performance.now();
        this.dirty = true;
    }

    dragBy(dxPixels: number, widthPixels: number) {
        if (!this.dragging) return;
        const now = performance.now();
        const delta = (dxPixels / Math.max(200, widthPixels)) * Math.PI * 1.6;
        this.yaw += delta;
        this.velocity = delta / Math.max(8, now - this.lastDragT);
        this.lastDragT = now;
        this.dirty = true;
    }

    dragEnd() {
        if (!this.dragging) return;
        this.dragging = false;
        this.releasedAt = performance.now();
    }

    get isDragging(): boolean {
        return this.dragging;
    }

    /** Inercija posle prevlačenja, pa posle 2,5 s mirno vraćanje u 3/4 ugao */
    private updateYaw(dt: number, calm: boolean): boolean {
        if (this.dragging) return true;
        let moving = false;
        if (Math.abs(this.velocity) > 1e-5) {
            this.yaw += this.velocity * dt * 1000;
            this.velocity *= Math.pow(0.04, dt);
            if (Math.abs(this.velocity) < 2e-5) this.velocity = 0;
            moving = true;
        }
        const offset = Math.atan2(Math.sin(this.yaw - this.restYaw), Math.cos(this.yaw - this.restYaw));
        if (Math.abs(offset) > 0.002) {
            if (performance.now() - this.releasedAt > 2500) {
                const k = calm ? 1 : 1 - Math.pow(0.02, dt);
                this.yaw = this.restYaw + offset * (1 - k);
            }
            moving = true;
        } else this.yaw = this.restYaw;
        return moving;
    }

    /** Pomera lik i kameru; vraća true dok ima pokreta */
    update(time: number, dt: number, live: boolean): boolean {
        const turning = this.updateYaw(dt, !live);
        this.turntable.rotation.y = this.yaw;
        const animating = this.figure ? this.figure.update(time, dt, live) : false;
        this.world.environment?.animate?.(time, dt, live);
        return turning || animating || this.dirty;
    }

    // ── Crtanje ──────────────────────────────────────────────────────────────────

    private contactShadow() {
        if (this.shadow) return this.shadow;
        const size = 256;
        const w = 1.6;
        const h = 1.6;
        const rt = new THREE.WebGLRenderTarget(size, size);
        const rtBlur = new THREE.WebGLRenderTarget(size, size);
        rt.texture.generateMipmaps = rtBlur.texture.generateMipmaps = false;
        // Kamera gleda odozdo nagore; slika: x → +x, gore → +z
        const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0, 1.6);
        camera.up.set(0, 0, 1);
        camera.lookAt(0, 1, 0);
        camera.updateMatrixWorld();
        const planeGeo = new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2);
        const uv = planeGeo.getAttribute("uv");
        for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
        const plane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ map: rt.texture, transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false }));
        plane.position.y = 0.002;
        plane.renderOrder = -1;
        const blurPlane = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(Math.PI / 2).translate(0, 0.5, 0));
        blurPlane.visible = false;
        const depth = new THREE.ShaderMaterial({
            vertexShader: SHADOW_VERT,
            fragmentShader: SHADOW_FRAG,
            uniforms: { uMaxHeight: { value: 0.4 * ((this.figure?.height ?? 1.3) / 1.2) }, uDarkness: { value: 1.0 } },
            transparent: true,
            depthTest: false,
            depthWrite: false,
            blending: THREE.CustomBlending,
            blendEquation: THREE.MaxEquation,
            side: THREE.DoubleSide,
        });
        const hBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
        const vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
        hBlur.depthTest = vBlur.depthTest = false;
        this.scene.add(plane, blurPlane);
        this.shadow = { rt, rtBlur, camera, plane, blurPlane, depth, hBlur, vBlur };
        return this.shadow;
    }

    private renderContactShadow(r: THREE.WebGLRenderer) {
        const { rt, rtBlur, camera, plane, blurPlane, depth, hBlur, vBlur } = this.contactShadow();
        const prevTone = r.toneMapping;
        r.toneMapping = THREE.NoToneMapping;
        plane.visible = false;
        const worldVisible = this.world.root.visible;
        this.world.root.visible = false;
        const env = this.scene.environment;
        const bg = this.scene.background;
        const fog = this.scene.fog;
        this.scene.environment = null;
        this.scene.background = null;
        this.scene.fog = null;
        this.scene.overrideMaterial = depth;
        r.setRenderTarget(rt);
        r.setClearColor(0x000000, 0);
        r.clear();
        r.render(this.scene, camera);
        this.scene.overrideMaterial = null;
        this.scene.environment = env;
        this.scene.background = bg;
        this.scene.fog = fog;
        const blur = (amount: number) => {
            blurPlane.visible = true;
            blurPlane.material = hBlur;
            hBlur.uniforms.tDiffuse.value = rt.texture;
            hBlur.uniforms.h.value = amount / 256;
            r.setRenderTarget(rtBlur);
            r.render(blurPlane, camera);
            blurPlane.material = vBlur;
            vBlur.uniforms.tDiffuse.value = rtBlur.texture;
            vBlur.uniforms.v.value = amount / 256;
            r.setRenderTarget(rt);
            r.render(blurPlane, camera);
            blurPlane.visible = false;
        };
        blur(2.2);
        blur(0.9);
        r.setRenderTarget(null);
        r.toneMapping = prevTone;
        plane.visible = true;
        this.world.root.visible = worldVisible;
    }

    /** Crta scenu; senka na podu se jedva menja dok lik diše — osvežava se u svakom trećem kadru */
    render(renderer: THREE.WebGLRenderer, forceShadow = false) {
        this.scene.environment = environmentFor(renderer);
        this.scene.environmentIntensity = 0.22;
        const floorShadow = this.options.background !== "none" || this.options.framing === "full";
        if (this.shadow) this.shadow.plane.visible = floorShadow;
        if (floorShadow && (forceShadow || this.dirty || this.frames % 3 === 0)) this.renderContactShadow(renderer);
        if (this.options.background === "none") renderer.setClearColor(0x000000, 0);
        renderer.render(this.scene, this.camera);
        this.frames++;
        this.dirty = false;
    }

    set castShadows(on: boolean) {
        this.keyLight.castShadow = on;
    }

    /** Okvir predmeta na mestu (za sličicu), u prostoru scene */
    slotBox(slot: Slot): THREE.Box3 | null {
        const figure = this.figure;
        if (!figure) return null;
        const objects = figure.slotObjects(slot);
        if (!objects.length) return null;
        this.scene.updateMatrixWorld(true);
        const box = new THREE.Box3();
        for (const object of objects) box.expandByObject(object, true);
        return box.isEmpty() ? null : box;
    }

    dispose() {
        if (this.shadow) {
            this.shadow.rt.dispose();
            this.shadow.rtBlur.dispose();
            this.shadow.plane.geometry.dispose();
            this.shadow.blurPlane.geometry.dispose();
            this.shadow.depth.dispose();
            this.shadow.hBlur.dispose();
            this.shadow.vBlur.dispose();
        }
        this.world.dispose();
        this.scene.clear();
    }
}
