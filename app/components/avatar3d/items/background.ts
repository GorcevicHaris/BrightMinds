// 3D pozadine (okruženja) za mesto „background” (podaci: background.data.ts). Vlasnik: #3 (katalog).
// Svako okruženje je u lib/envScenes.ts; rekviziti u lib/envProps.ts, alat u lib/env.ts.
// Bez pozadine motor crta svoj mirni svetlosivi „svet” (engine/stage.ts).

import { registerBackgrounds, type BackgroundBuilder } from "../contract";
import { ITEMS } from "./background.data";
import { SCENES } from "./lib/envScenes";

registerBackgrounds(
    ITEMS.filter((item) => SCENES[item.id]).map((item): BackgroundBuilder => ({
        id: item.id,
        build: SCENES[item.id],
        thumb: { focus: "scene" },
    })),
);
