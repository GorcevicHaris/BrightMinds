// „Kamera”: kad su likovi i predmeti samo u delu slike, slika se približi tom delu, da lice
// bude dovoljno veliko i na telefonu. Okvir slike (VIEW_W × VIEW_H) ostaje isti, pa se visina
// slike na ekranu ne menja — samo je sadržaj krupniji.

import { isAdult } from "./figures";
import { isBubble, isFigure, isInset, VIEW_H, VIEW_W, type BackgroundId, type PropId, type SceneSpec } from "./types";

/** Najviše koliko se slika približava (krupnije bi odseklo previše pozadine) */
export const MAX_ZOOM = 1.6;
const PAD = 10;

type Box = [x0: number, y0: number, x1: number, y1: number];

/** Prozor u pozadini: kad je napolju kiša, mrak ili duga, prozor mora da ostane na slici */
const WINDOWS: Partial<Record<BackgroundId, Box[]>> = {
    room: [[156, 18, 224, 80]],
    bedroom: [[146, 16, 214, 78]],
    living: [[16, 18, 84, 80]],
    kitchen: [[146, 6, 210, 58]],
    classroom: [[8, 18, 56, 74], [190, 18, 234, 74]],
    clinic: [[166, 16, 224, 72]],
    restaurant: [[20, 16, 78, 72]],
};

/** Širina i visina većih predmeta (u razmeri 1); ostali su oko 40 × 36 */
const PROP_SIZE: Partial<Record<PropId, readonly [number, number]>> = {
    bed: [92, 44],
    table: [80, 36],
    sofa: [100, 40],
    door: [44, 94],
    doorOpen: [52, 94],
    lock: [44, 94],
    fridge: [42, 80],
    tree: [60, 80],
    swing: [60, 72],
    slide: [70, 62],
    climber: [56, 82],
    carousel: [74, 44],
    school: [100, 70],
    shopClosed: [76, 72],
    iceCreamStand: [70, 66],
    truck: [90, 42],
    bus: [90, 38],
    train: [142, 52],
    fireTruck: [92, 42],
    goal: [76, 42],
    bicycle: [66, 42],
    dentistChair: [80, 46],
    shopShelf: [62, 62],
    poolSlide: [70, 64],
    laneRope: [240, 6],
    waitingChairs: [90, 36],
    register: [62, 48],
    coatHook: [42, 76],
    bigDog: [96, 64],
    wave: [82, 34],
    confetti: [86, 54],
    shower: [34, 84],
    stove: [50, 44],
    eyeChart: [36, 50],
};

/** Ukrasi i okolina: smeju da ostanu delom van kadra kad se kamera približi glavnom liku */
const DECOR: ReadonlySet<PropId> = new Set<PropId>(["sparkle", "heart", "star", "tree", "flowers", "cloud", "sun", "balloons"]);

function union(boxes: Box[]): Box | null {
    if (boxes.length === 0) return null;
    return boxes.reduce<Box>((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])], boxes[0]);
}

/** Pravougaonik u kome je sve što je na slici važno (likovi, predmeti, oblačići, krugovi) */
export function sceneBounds(spec: SceneSpec): Box | null {
    const boxes: Box[] = [];
    for (const item of spec.items) {
        if (isFigure(item)) {
            const s = item.s ?? 1;
            const y = item.y ?? 148;
            const adult = item.fig !== "hero" && isAdult(item.fig);
            if (item.pose === "lie") boxes.push([item.x - 22 * s, y - 34 * s, item.x + 70 * s, y + 4]);
            else {
                // Predmet podignut iznad glave (baca, pruža se gore) mora da ostane u kadru
                const raised = item.hold && (item.pose === "throw" || item.pose === "up" || item.pose === "reach") ? 22 : 0;
                boxes.push([item.x - 24 * s, y - ((adult ? 128 : 82) + raised) * s, item.x + 24 * s, y + 2]);
            }
        } else if (isBubble(item)) {
            boxes.push([item.x - 26, item.y - 14, item.x + 26, item.y + 20]);
        } else if (isInset(item)) {
            boxes.push([item.x - item.r - 3, item.y - item.r - 3, item.x + item.r + 3, item.y + item.r + 3]);
        } else if (!DECOR.has(item.prop)) {
            const [w, h] = PROP_SIZE[item.prop] ?? [40, 36];
            const s = item.s ?? 1;
            boxes.push([item.x - (w / 2) * s, item.y - h * s, item.x + (w / 2) * s, item.y + 2]);
        }
    }
    // Pogled kroz prozor je deo priče (kiša, grmljavina, mrak, sneg, duga)
    if (spec.view && spec.view !== "day" && spec.view !== "clear") boxes.push(...(WINDOWS[spec.bg] ?? []));
    return union(boxes);
}

export interface Camera {
    zoom: number;
    /** Tačka slike koja je u sredini okvira */
    cx: number;
    cy: number;
}

/** Koliko i gde se slika približava; zoom 1 znači cela slika */
export function cameraFor(spec: SceneSpec): Camera {
    const box = spec.camera === "fixed" ? null : sceneBounds(spec);
    if (!box) return { zoom: 1, cx: VIEW_W / 2, cy: VIEW_H / 2 };
    const w = box[2] - box[0] + PAD * 2;
    const h = box[3] - box[1] + PAD * 2;
    // Kvadratna sličica vidi samo srednji deo slike (VIEW_H × VIEW_H), pa se kadar bira za taj okvir
    const frameW = spec.frame === "square" ? VIEW_H : VIEW_W;
    const zoom = Math.max(1, Math.min(spec.maxZoom ?? MAX_ZOOM, frameW / w, VIEW_H / h));
    // Sredina se pomera samo toliko da okvir ne izađe van slike
    const halfW = frameW / 2 / zoom;
    const halfH = VIEW_H / 2 / zoom;
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const cx = clamp((box[0] + box[2]) / 2, halfW, VIEW_W - halfW);
    // Dno slike (pod) ostaje vidljivo: kadar se radije pomera nadole
    const cy = clamp(Math.max((box[1] + box[3]) / 2, box[3] + PAD - halfH), halfH, VIEW_H - halfH);
    return { zoom, cx, cy };
}

export function cameraTransform({ zoom, cx, cy }: Camera): string | undefined {
    if (zoom === 1 && cx === VIEW_W / 2 && cy === VIEW_H / 2) return undefined;
    return `translate(${VIEW_W / 2} ${VIEW_H / 2}) scale(${zoom}) translate(${-cx} ${-cy})`;
}
