// Studio: renderer, kamera, meko svetlo (glavno, popunjavajuće, kontra), okruženje
// (RoomEnvironment — pravi se u kodu, bez preuzimanja), mekana senka na podu (kao
// „contact shadow”), okretanje prevlačenjem i povratak licem napred. Crta samo kada
// treba: dok lik diše/trepće ili dok se okreće; inače miruje (i ne troši bateriju).

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";
import { floorTexture } from "./textures";

export interface Animated {
    root: THREE.Object3D;
    /** Vraća true ako još ima pokreta (traži sledeći kadar) */
    update: (time: number, dt: number, live: boolean) => boolean;
    /** Visina lika (za kadar) */
    height: number;
}

export interface StageOptions {
    /** Mirovanje: bez disanja i treptanja (Manje animacija / sistemsko „smanji pokrete”) */
    still: boolean;
    /** Kadar: `full` ceo lik, `bust` glava i ramena */
    framing?: "full" | "bust";
}

/** Senka kao od mekog svetla iznad: visina tela ispod 0,3 m daje tamniju senku */
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

export class Stage {
    readonly renderer: THREE.WebGLRenderer;
    readonly scene = new THREE.Scene();
    readonly camera = new THREE.PerspectiveCamera(22, 1, 0.1, 30);
    private figure: Animated | null = null;
    private turntable = new THREE.Group();
    private frame = 0;
    private last = 0;
    private dirty = true;
    private still: boolean;
    private framing: "full" | "bust";
    private yaw = 0;
    private velocity = 0;
    private dragging = false;
    private dragX = 0;
    private releasedAt = 0;
    private resizeObserver: ResizeObserver;
    private shadow: { rt: THREE.WebGLRenderTarget; rtBlur: THREE.WebGLRenderTarget; camera: THREE.OrthographicCamera; plane: THREE.Mesh; blurPlane: THREE.Mesh; depth: THREE.ShaderMaterial; hBlur: THREE.ShaderMaterial; vBlur: THREE.ShaderMaterial };
    private floor: THREE.Mesh;
    private keyLight: THREE.DirectionalLight;
    private disposed = false;
    /** Merenje brzine (za izveštaj i podešavanje kvaliteta) */
    frames = 0;
    frameTime = 0;

    constructor(private host: HTMLElement, options: StageOptions) {
        this.loop = this.loop.bind(this);
        this.still = options.still;
        this.framing = options.framing ?? "full";
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.setClearColor(0x000000, 0);
        const canvas = this.renderer.domElement;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        canvas.style.touchAction = "pan-y";
        canvas.setAttribute("aria-hidden", "true");
        host.appendChild(canvas);

        // Okruženje za odsjaje (sobna svetla), slabije od direktnog svetla
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environmentIntensity = 0.3;
        pmrem.dispose();

        // Svetla: toplo glavno spreda-levo-gore, hladnije popunjavajuće sa desne, kontra svetlo pozadi
        const key = new THREE.DirectionalLight("#FFF2E2", 3.1);
        key.position.set(-1.3, 2.7, 3.0);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.intensity = 0.55;
        key.shadow.camera.left = -0.8;
        key.shadow.camera.right = 0.8;
        key.shadow.camera.top = 1.2;
        key.shadow.camera.bottom = -0.6;
        key.shadow.camera.near = 0.5;
        key.shadow.camera.far = 8;
        key.shadow.bias = -0.0004;
        key.shadow.normalBias = 0.003;
        key.shadow.radius = 4;
        this.keyLight = key;
        const fill = new THREE.DirectionalLight("#E4EEFF", 0.6);
        fill.position.set(2.2, 1.0, 2.2);
        const rim = new THREE.DirectionalLight("#FFFFFF", 2.0);
        rim.position.set(0.8, 2.6, -3.0);
        const rim2 = new THREE.DirectionalLight("#F2F4FF", 1.2);
        rim2.position.set(-2.2, 1.8, -2.0);
        const hemi = new THREE.HemisphereLight("#FFFFFF", "#D9CFC6", 0.3);
        this.scene.add(key, key.target, fill, rim, rim2, hemi);

        // Pod: svetao krug koji se utapa u pozadinu
        this.floor = new THREE.Mesh(
            new THREE.CircleGeometry(1.6, 64).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ map: floorTexture(), color: "#F4F4F6", transparent: true, depthWrite: false, toneMapped: false }),
        );
        this.floor.renderOrder = -2;
        this.scene.add(this.floor);

        this.shadow = this.createContactShadow();
        this.scene.add(this.turntable);

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(host);
        this.resize();
        this.bindPointer(canvas);
        this.frame = requestAnimationFrame(this.loop);
    }

    /** Meka senka ispod lika: lik se crta odozdo u malu teksturu (tamnije što je bliže podu), pa se zamuti */
    private createContactShadow() {
        const size = 256;
        const w = 1.2;
        const h = 1.2;
        const rt = new THREE.WebGLRenderTarget(size, size);
        const rtBlur = new THREE.WebGLRenderTarget(size, size);
        rt.texture.generateMipmaps = rtBlur.texture.generateMipmaps = false;
        // Kamera gleda odozdo nagore; slika: x → +x, gore → +z
        const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0, 1.5);
        camera.up.set(0, 0, 1);
        camera.lookAt(0, 1, 0);
        camera.updateMatrixWorld();
        const planeGeo = new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2);
        const uv = planeGeo.getAttribute("uv");
        for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
        const plane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ map: rt.texture, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }));
        plane.position.y = 0.0015;
        plane.renderOrder = -1;
        const blurPlane = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(Math.PI / 2).translate(0, 0.5, 0));
        blurPlane.visible = false;
        const depth = new THREE.ShaderMaterial({
            vertexShader: SHADOW_VERT,
            fragmentShader: SHADOW_FRAG,
            uniforms: { uMaxHeight: { value: 0.45 }, uDarkness: { value: 1.0 } },
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
        return { rt, rtBlur, camera, plane, blurPlane, depth, hBlur, vBlur };
    }

    private renderContactShadow() {
        const { rt, rtBlur, camera, plane, blurPlane, depth, hBlur, vBlur } = this.shadow;
        const r = this.renderer;
        const prevTone = r.toneMapping;
        r.toneMapping = THREE.NoToneMapping;
        plane.visible = false;
        this.floor.visible = false;
        const env = this.scene.environment;
        this.scene.environment = null;
        this.scene.overrideMaterial = depth;
        r.setRenderTarget(rt);
        r.setClearColor(0x000000, 0);
        r.clear();
        r.render(this.scene, camera);
        this.scene.overrideMaterial = null;
        this.scene.environment = env;
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
        this.floor.visible = true;
    }

    setFigure(figure: Animated | null) {
        if (this.figure) this.turntable.remove(this.figure.root);
        this.figure = figure;
        if (figure) {
            this.turntable.add(figure.root);
            figure.root.traverse((o) => {
                if ((o as THREE.Mesh).isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                }
            });
        }
        this.frameCamera();
        this.invalidate();
    }

    setFraming(framing: "full" | "bust") {
        this.framing = framing;
        this.frameCamera();
        this.invalidate();
    }

    /** Kadar na visini y (udeo visine lika) sa rasponom span (udeo visine) — za krupne planove */
    frameAt(y: number, span: number) {
        const height = this.figure?.height ?? 1.2;
        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        const dist = (span * height) / 2 / Math.tan(fov / 2) / Math.min(1, this.camera.aspect * 1.1);
        this.camera.position.set(0, y * height + 0.02, dist);
        this.camera.lookAt(0, y * height, 0);
        this.invalidate();
    }

    setStill(still: boolean) {
        this.still = still;
        this.invalidate();
    }

    /** Okreni lik na ugao (rad), npr. za snimke 3/4 i pozadi */
    setYaw(yaw: number) {
        this.yaw = yaw;
        this.velocity = 0;
        this.releasedAt = Number.POSITIVE_INFINITY;
        this.invalidate();
    }

    invalidate() {
        this.dirty = true;
        if (!this.frame && !this.disposed) {
            this.last = performance.now();
            this.frame = requestAnimationFrame(this.loop);
        }
    }

    private frameCamera() {
        const height = this.figure?.height ?? 1.2;
        const aspect = this.camera.aspect;
        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        if (this.framing === "bust") {
            const target = height * 0.82;
            const span = height * 0.42;
            const dist = span / 2 / Math.tan(fov / 2) / Math.min(1, aspect * 1.1);
            this.camera.position.set(0, target + 0.02, dist);
            this.camera.lookAt(0, target, 0);
        } else {
            // Ceo lik sa malo vazduha; na uskom ekranu kamera ide dalje
            const span = height * 1.16;
            const vDist = span / 2 / Math.tan(fov / 2);
            const hDist = (height * 0.62) / 2 / Math.tan(fov / 2) / aspect;
            const dist = Math.max(vDist, hDist);
            const target = height * 0.5;
            this.camera.position.set(0, target + dist * 0.09, dist);
            this.camera.lookAt(0, target - 0.01, 0);
        }
        // Senka glavnog svetla pokriva lik bilo koje visine
        const s = height / 1.2;
        const cam = this.keyLight.shadow.camera;
        cam.left = -0.8 * s;
        cam.right = 0.8 * s;
        cam.top = 1.3 * s;
        cam.bottom = -0.6 * s;
        cam.updateProjectionMatrix();
        this.shadow.depth.uniforms.uMaxHeight.value = 0.35 * s;
    }

    private resize() {
        const { clientWidth: w, clientHeight: h } = this.host;
        if (!w || !h) return;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.frameCamera();
        this.invalidate();
    }

    private bindPointer(canvas: HTMLCanvasElement) {
        let lastT = 0;
        canvas.addEventListener("pointerdown", (e) => {
            this.dragging = true;
            this.dragX = e.clientX;
            lastT = performance.now();
            this.velocity = 0;
            canvas.setPointerCapture(e.pointerId);
            this.invalidate();
        });
        canvas.addEventListener("pointermove", (e) => {
            if (!this.dragging) return;
            const now = performance.now();
            const dx = e.clientX - this.dragX;
            this.dragX = e.clientX;
            const delta = (dx / Math.max(200, canvas.clientWidth)) * Math.PI * 1.6;
            this.yaw += delta;
            this.velocity = delta / Math.max(8, now - lastT);
            lastT = now;
            this.invalidate();
        });
        const end = () => {
            if (!this.dragging) return;
            this.dragging = false;
            this.releasedAt = performance.now();
            this.invalidate();
        };
        canvas.addEventListener("pointerup", end);
        canvas.addEventListener("pointercancel", end);
    }

    /** Okretanje: inercija posle prevlačenja, pa posle 2,5 s mirno vraćanje licem napred */
    private updateYaw(dt: number, now: number): boolean {
        if (this.dragging) return true;
        let moving = false;
        if (Math.abs(this.velocity) > 1e-5) {
            this.yaw += this.velocity * dt * 1000;
            this.velocity *= Math.pow(0.04, dt);
            if (Math.abs(this.velocity) < 2e-5) this.velocity = 0;
            moving = true;
        }
        if (now - this.releasedAt > 2500) {
            // Najkraći put do lica napred
            const wrapped = Math.atan2(Math.sin(this.yaw), Math.cos(this.yaw));
            this.yaw = wrapped;
            if (Math.abs(wrapped) > 0.002) {
                const k = this.still ? 1 : 1 - Math.pow(0.02, dt);
                this.yaw = wrapped * (1 - k);
                moving = true;
            } else {
                this.yaw = 0;
            }
        } else if (this.releasedAt !== Number.POSITIVE_INFINITY && this.yaw !== 0) {
            moving = true;
        }
        return moving;
    }

    private loop(now: number) {
        this.frame = 0;
        if (this.disposed) return;
        const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
        this.last = now;
        const turning = this.updateYaw(dt, now);
        this.turntable.rotation.y = this.yaw;
        const live = !this.still;
        const animating = this.figure ? this.figure.update(now / 1000, dt, live) : false;
        if (this.dirty || turning || animating) {
            const t0 = performance.now();
            // Senka na podu se jedva menja dok lik diše: dovoljno je osvežiti je u svakom trećem kadru
            if (this.dirty || turning || this.frames % 3 === 0) this.renderContactShadow();
            this.renderer.render(this.scene, this.camera);
            this.frameTime += performance.now() - t0;
            this.frames++;
            this.dirty = false;
            this.adaptQuality(now);
        }
        if (turning || animating || this.dragging) this.frame = requestAnimationFrame(this.loop);
        else this.slowSince = 0;
    }

    private slowSince = 0;
    private slowFrames = 0;
    private lastFrameAt = 0;
    private lowQuality = false;
    private adaptive = true;

    /**
     * Ako uređaj ne stiže (≈ ispod 24 kadra u sekundi dve sekunde zaredom), smanjuje oštrinu
     * slike i gasi senku glavnog svetla; meka senka na podu ostaje.
     */
    private adaptQuality(now: number) {
        const gap = this.lastFrameAt ? now - this.lastFrameAt : 0;
        this.lastFrameAt = now;
        if (!this.adaptive || this.lowQuality || gap <= 0 || gap > 200) return;
        if (gap > 42) {
            if (!this.slowSince) this.slowSince = now;
            this.slowFrames++;
            if (now - this.slowSince > 2000 && this.slowFrames > 30) {
                this.lowQuality = true;
                this.renderer.setPixelRatio(1);
                this.renderer.shadowMap.enabled = false;
                this.keyLight.castShadow = false;
                this.resize();
            }
        } else {
            this.slowSince = 0;
            this.slowFrames = 0;
        }
    }

    /** Da li je kvalitet smanjen zbog sporog uređaja */
    get reducedQuality(): boolean {
        return this.lowQuality;
    }

    /** Za snimke ekrana: uvek pun kvalitet */
    disableAdaptiveQuality() {
        this.adaptive = false;
    }

    /** Snimak trenutnog kadra (PNG data URL) */
    snapshot(): string {
        this.renderContactShadow();
        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL("image/png");
    }

    dispose() {
        this.disposed = true;
        cancelAnimationFrame(this.frame);
        this.resizeObserver.disconnect();
        this.shadow.rt.dispose();
        this.shadow.rtBlur.dispose();
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }
}
