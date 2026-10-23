// Sličice predmeta: isti 3D predmet, nacrtan sam (bez tela) u malom studiju van ekrana,
// iz ugla 3/4, pa sačuvan kao slika. Pravi se redom, po jedna u slobodnom trenutku, da
// izbor ostane gladak; gotove se čuvaju u memoriji (keš po liku, predmetu i boji).

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { AvatarLook, HairStyle, Slot3D } from "../catalog";
import { Avatar } from "./avatar";

export type ThumbRequest =
    | { kind: "item"; slot: Slot3D; id: string; color: number; look: AvatarLook }
    | { kind: "hair"; hair: HairStyle; look: AvatarLook }
    | { kind: "look"; look: AvatarLook };

export function thumbKey(req: ThumbRequest): string {
    const l = req.look;
    switch (req.kind) {
        case "item":
            return `i:${l.figure}:${req.id}:${req.color}:${req.slot === "head" ? l.hair : ""}`;
        case "hair":
            return `h:${l.figure}:${req.hair}:${l.hairColor}:${l.skin}`;
        case "look":
            return `l:${JSON.stringify(l)}`;
    }
}

const SIZE = 192;

export class ThumbnailRenderer {
    private renderer: THREE.WebGLRenderer;
    private scene = new THREE.Scene();
    private camera = new THREE.PerspectiveCamera(24, 1, 0.05, 20);
    private avatars = new Map<string, Avatar>();
    private cache = new Map<string, string>();
    private queue: { key: string; req: ThumbRequest; done: (url: string) => void }[] = [];
    private busy = false;
    private holder = new THREE.Group();

    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        this.renderer.setPixelRatio(1);
        this.renderer.setSize(SIZE, SIZE, false);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.setClearColor(0x000000, 0);
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environmentIntensity = 0.45;
        pmrem.dispose();
        const key = new THREE.DirectionalLight("#FFF2E2", 3);
        key.position.set(-1.2, 2.4, 3);
        const fill = new THREE.DirectionalLight("#E4EEFF", 0.8);
        fill.position.set(2, 1, 2);
        const rim = new THREE.DirectionalLight("#FFFFFF", 1.6);
        rim.position.set(0.5, 2, -3);
        this.scene.add(key, fill, rim, new THREE.HemisphereLight("#FFFFFF", "#D9CFC6", 0.45), this.holder);
    }

    get(req: ThumbRequest): string | undefined {
        return this.cache.get(thumbKey(req));
    }

    request(req: ThumbRequest, done: (url: string) => void) {
        const key = thumbKey(req);
        const hit = this.cache.get(key);
        if (hit) {
            done(hit);
            return;
        }
        this.queue.push({ key, req, done });
        this.pump();
    }

    /** Odbaci zahteve koji više nisu na ekranu (promena kartice) */
    clearQueue() {
        this.queue = [];
    }

    private pump() {
        if (this.busy || !this.queue.length) return;
        this.busy = true;
        const idle = (cb: () => void) => {
            const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
            if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout: 120 });
            else setTimeout(cb, 16);
        };
        idle(() => {
            const job = this.queue.shift();
            if (job) {
                const cached = this.cache.get(job.key);
                const url = cached ?? this.render(job.req);
                this.cache.set(job.key, url);
                job.done(url);
            }
            this.busy = false;
            this.pump();
        });
    }

    private avatarFor(look: AvatarLook): Avatar {
        let avatar = this.avatars.get(look.figure);
        if (!avatar) {
            avatar = new Avatar(look);
            this.avatars.set(look.figure, avatar);
        } else {
            avatar.setLook(look);
        }
        return avatar;
    }

    private render(req: ThumbRequest): string {
        const look: AvatarLook =
            req.kind === "item" ? { ...req.look, expression: "happy", wear: { [req.slot]: { id: req.id, color: req.color } } }
            : req.kind === "hair" ? { ...req.look, hair: req.hair, expression: "happy", wear: {} }
            : req.look;
        const avatar = this.avatarFor(look);
        this.holder.clear();
        this.holder.add(avatar.root);
        avatar.update(0, 0, false);
        let visible: THREE.Object3D[] = [];
        if (req.kind === "item") {
            avatar.setBodyVisible(false);
            visible = avatar.slotObjects(req.slot);
        } else if (req.kind === "hair") {
            avatar.setBodyVisible(false);
            avatar.setHeadVisible(true);
            visible = [avatar.faceObject, ...avatar.hairObjects];
        } else {
            avatar.setBodyVisible(true);
            visible = [avatar.root];
        }
        avatar.root.updateMatrixWorld(true);
        const box = new THREE.Box3();
        for (const object of visible) box.expandByObject(object, true);
        if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(0, 0.6, 0), new THREE.Vector3(0.4, 0.4, 0.4));
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const radius = Math.max(size.x, size.y, size.z) * (req.kind === "look" ? 0.52 : 0.62) + 0.01;
        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        const dist = radius / Math.tan(fov / 2);
        const yaw = req.kind === "look" ? 0.35 : req.kind === "hair" ? 0.55 : req.slot === "shoes" ? 0.9 : 0.5;
        this.camera.position.set(center.x + Math.sin(yaw) * dist, center.y + dist * 0.22, center.z + Math.cos(yaw) * dist);
        this.camera.lookAt(center);
        this.renderer.render(this.scene, this.camera);
        const url = this.renderer.domElement.toDataURL("image/png");
        avatar.setBodyVisible(true);
        this.holder.remove(avatar.root);
        return url;
    }

    dispose() {
        for (const avatar of this.avatars.values()) avatar.dispose();
        this.renderer.dispose();
    }
}
