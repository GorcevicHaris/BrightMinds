// Ulaz u 3D motor (poseban paket, učitava se lenjo): ljudi, životinje i predmeti se
// registruju pri uvozu, pa su posle ovoga svi graditelji spremni.

import "./human";
import "../items";
import "../animals";
import { Figure } from "./figure";

export { Figure } from "./figure";
export { liveRenderer, webglAvailable } from "./live";
export { StageScene, REST_YAW, type Framing } from "./scene";
export { snapshots, snapKey, type SnapSpec } from "./snapshots";
export type { PoseName } from "./pose";

/** Da li za tog drugara postoji 3D telo (inače se crta 2D) */
export function supports3D(kind: string): boolean {
    return Figure.supports(kind);
}
