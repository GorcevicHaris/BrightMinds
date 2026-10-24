// Leopard: mačja glava sa belim obrazima i sitnim tačkicama, rozete po telu (tamni isprekidani
// prsten oko tamnijeg središta), svetao stomak i dug debeo rep sa rozetama. Snežni leopard je
// sivobeo sa gustim krznom i debljim repom; crni (pantera) ima jedva vidljive rozete.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import { asMore, coat, dots, goldCoat, RAINBOW, rosettes } from "./common";
import { CAT_HEAD, paintBigCat } from "./bigcat";
import { MORE_SKINS } from "./skins.data";

function leopard(fur: string, spot: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, "#FFFBF2", { muzzle: "#FFFFFF", inner: "#FFF4EA", nose: "#E58F86", brow: shade(spot, 0.15), iris: ["#9AD06A", "#3A6A18"], marks: [spot], ...extra });
}

export const LEOPARD_COATS: Record<string, Coat> = {
    zuti: leopard("#EFB862", "#2E2226"),
    snezni: leopard("#E6E6EA", "#4A4A54", { light: "#FFFFFF", iris: ["#A6D8F0", "#2A6A8A"], nose: "#D08A9A" }),
    crni: leopard("#3A3440", "#201A24", { light: "#6A6270", muzzle: "#8A8290", inner: "#9A92A0", iris: ["#F2D35C", "#A8800F"], nose: "#2A2228" }),
    roze: leopard("#F6C2D6", "#B0457A", { iris: ["#B57AD6", "#4A1E6A"] }),
    zlatni: goldCoat({ marks: ["#B07A1E"], light: "#FFF8E0", nose: "#C9786A" }),
    dugin: leopard("#FFF6FA", "#C7AEFF", { marks: RAINBOW, iris: ["#C9A6F2", "#6A3FB0"], nose: "#F08AA0" }),
};

const tmp = new THREE.Vector3();

export const LEOPARD: AnimalSpec = {
    kind: "leopard",
    skins: MORE_SKINS.leopard,
    coats: LEOPARD_COATS,
    shape: { kind: asMore("leopard"), girth: 0.98, belly: 1.0, limb: 1.02, head: { w: 0.35, h: 0.3, d: 0.31 } },
    ...CAT_HEAD,
    tail: {
        points: [[0, 0, 0], [0.04, -0.07, -0.08], [0.12, -0.11, -0.15], [0.22, -0.06, -0.2], [0.28, 0.06, -0.18], [0.28, 0.2, -0.12]],
        radius: profile([[0, 0.034], [0.5, 0.032], [0.9, 0.03], [1, 0.012]]),
        motion: "sway",
    },
    hands: "paw",
    feet: "paw",
    belly: 0.5,
    cheeks: 0,
    paint: paintBigCat((p, head) => {
        if (head) return [dots(p, 52, 0.18, 23), 0];
        const [ring, center] = rosettes(tmp.copy(p), 17, 31);
        return [ring, center];
    }),
};

registerCompanion(companionFrom(LEOPARD));
