// 3D crteži predmeta za mesto „outfit” (podaci: outfit.data.ts). Vlasnik: #3 (katalog).
// Majice, duksevi, džemperi, haljine, kombinezoni, jakne, sport, pidžame, svečano i kostimi.
// Boje i šare su iz 2D crteža (app/components/avatar/wear/outfits.tsx); kroj je po telu
// (dete, odrasli, životinja), rep izlazi kroz porubljen otvor.

import { registerItems, type ItemBuild, type ItemBuilder, type ItemContext } from "../contract";
import { torsoLayer } from "./lib/common";
import * as C from "./lib/costumes";
import { abaya, cape, coat, dress, overalls, pajamas, shirtFront, suit, swimwear, tracksuit } from "./lib/dresses";
import { checkTexture, dotsTexture, MOTIFS, motifTexture, patternTexture, printNumber, sceneTexture, stripeTexture, type Draw } from "./lib/prints";
import { LAYER, Tailor } from "./lib/tailor";
import { cardigan, hoodie, jersey, polo, puffer, pufferJacket, pufferVest, raincoat, shirt, sweater, tee, vest } from "./lib/tops";

type Build = (t: Tailor, ctx: ItemContext) => ItemBuild | void;

/** `budget` < 1: manje podela za kostime od više slojeva (košulja + kaput + pantalone) */
const builds = new Map<string, Build>();

const item = (id: string, build: Build, extra: Partial<ItemBuilder> = {}, budget = 1): ItemBuilder => (builds.set(id, build), {
    id,
    build: (ctx) => build(new Tailor(ctx, budget), ctx) ?? undefined,
    thumb: { focus: "upper", alone: false },
    ...extra,
});

/** Dugačko (haljina, kostim do članaka): sličica celog lika */
const full = (id: string, build: Build, extra: Partial<ItemBuilder> = {}, budget = 1) => item(id, build, { thumb: { focus: "full", alone: false }, ...extra }, budget);

const print = (key: string, draw: Draw, size = 1) => ({ map: motifTexture(key, draw), size });

const T = MOTIFS;

registerItems("outfit", withBudgets([
    // ── Majice ──
    item("majica-pruge", (t) => tee(t, { body: { color: "#FFFFFF", map: stripeTexture("#FFFFFF", "#3D7BE0", 0.036, 0.45) }, trim: "#3D7BE0" })),
    item("majica-crvene-pruge", (t) => tee(t, { body: { color: "#FFFFFF", map: stripeTexture("#FFFFFF", "#E5484D", 0.03, 0.4) }, trim: "#E5484D" })),
    item("majica-zvezda", (t) => tee(t, { body: { color: "#8E77E6" }, print: print("zvezda-zuta", T.star("#FFD15C")) })),
    item("majica-duga", (t) => tee(t, { body: { color: "#7CC6F2" }, print: print("duga", T.rainbow(), 1.05) })),
    item("majica-srce", (t) => tee(t, { body: { color: "#FFB8CB" }, print: print("srce-crveno", T.heart("#E5484D"), 0.9) })),
    item("majica-sunce", (t) => tee(t, { body: { color: "#3BB2A0" }, print: print("sunce", T.sun()) })),
    item("majica-tufne", (t) => tee(t, { body: { color: "#FFD15C", map: dotsTexture("#FFD15C", "#FFFFFF") } })),
    item("majica-auto", (t) => tee(t, { body: { color: "#DDE4EE" }, print: print("auto", T.car("#E5484D")) })),
    item("majica-mace", (t) => tee(t, { body: { color: "#B9A2F2" }, print: print("mace", T.cat("#FF9A3D")) })),
    item("majica-dino", (t) => tee(t, { body: { color: "#FFB866" }, print: print("dino", T.dino("#4FBF6A")) })),
    // ── Duksevi i džemperi ──
    item("plavi-duks", (t) => hoodie(t, { body: { color: "#3D86E0" } })),
    item("roze-duks", (t) => hoodie(t, { body: { color: "#F78FB3" }, print: print("srce-belo", T.heart("#FFFFFF"), 0.7) })),
    item("zeleni-duks", (t) => hoodie(t, { body: { color: "#3BB273" }, print: print("zvezda-zuta", T.star("#FFD15C"), 0.8) })),
    item("sivi-duks", (t) => hoodie(t, { body: { color: "#AEB9C9" }, print: print("duga", T.rainbow(), 0.9) })),
    item("dzemper-srce", (t) => sweater(t, { body: { color: "#5DB98D" }, rib: "#3E9970", print: print("srce-dzemper", T.heart("#F2557A"), 0.7) })),
    item("dzemper-pruge", (t) => sweater(t, { body: { color: "#FFB866", map: stripeTexture("#FFB866", "#E5484D", 0.05, 0.42) }, rib: "#E5484D" })),
    item("dzemper-pahulja", (t) => sweater(t, { body: { color: "#E5484D" }, rib: "#C53035", print: print("pahulja", T.snowflake("#FFFFFF"), 0.8) })),
    item("dzemper-jelka", (t) => sweater(t, { body: { color: "#2E3A66" }, rib: "#1F2850", print: print("jelka", T.tree("#3BB273"), 0.85) })),
    // ── Haljine i kombinezoni ──
    full("haljina-tufne", (t) => dress(t, { body: { color: "#F78FB3", map: dotsTexture("#F78FB3", "#FFFFFF", 0.05, 0.13) }, accent: "#FFFFFF", collar: "#FFFFFF" })),
    full("haljina-cvece", (t) => dress(t, { body: { color: "#7ED6F2", map: patternTexture("cvet-beli-plavo", "#7ED6F2", T.flower("#FFFFFF", "#FFD15C"), { tile: 0.065, scale: 0.18 }) }, accent: "#FFFFFF", sleeve: "short" })),
    full("letnja-haljina", (t) => dress(t, { body: { color: "#FFD15C", map: patternTexture("srca-zuto", "#FFD15C", T.heart("#F45B8D"), { tile: 0.07, scale: 0.14, rotate: true }) }, accent: "#F45B8D", sleeve: "straps" })),
    full("haljina-zvezde", (t) => dress(t, { body: { color: "#8E77E6", map: patternTexture("zvezde-ljubicasto", "#8E77E6", T.star("#FFD15C"), { tile: 0.07, scale: 0.15, rotate: true }) }, accent: "#FFD15C", petticoat: "#B9A2F2" })),
    full("kombinezon", (t) => overalls(t, { tee: { color: "#FFD15C" }, denim: "#4A6FB5", heart: "#F45B8D" })),
    full("roze-kombinezon", (t) => overalls(t, { tee: { color: "#BFE9FF" }, denim: "#F29BBE", heart: "#FFFFFF" })),
    // ── Trenerke, pidžame, jakne ──
    full("crvena-trenerka", (t) => tracksuit(t, { color: "#E5484D", stripe: "#FFFFFF" })),
    full("plava-trenerka", (t) => tracksuit(t, { color: "#3D7BE0", stripe: "#FFFFFF" })),
    full("ljubicasta-trenerka", (t) => tracksuit(t, { color: "#8E77E6", stripe: "#FFFFFF" })),
    full("pidzama", (t) => pajamas(t, { body: { color: "#A8D8F0", map: patternTexture("zvezde-pidzama", "#A8D8F0", T.star("#FFD15C"), { tile: 0.07, scale: 0.13, rotate: true }) }, piping: "#FFFFFF" })),
    full("pidzama-oblaci", (t) => pajamas(t, { body: { color: "#B9A2F2", map: patternTexture("oblaci-pidzama", "#B9A2F2", T.cloud("#FFFFFF"), { tile: 0.08, scale: 0.16 }) }, piping: "#FFFFFF" })),
    full("pidzama-srca", (t) => pajamas(t, { body: { color: "#FFB8CB", map: patternTexture("srca-pidzama", "#FFB8CB", T.heart("#FFFFFF"), { tile: 0.07, scale: 0.13, rotate: true }) }, piping: "#E9708F" })),
    item("zuta-kabanica", (t) => raincoat(t, { body: { color: "#FFD15C" }, trim: "#E9A10E" }), { thumb: { focus: "full", alone: false } }),
    item("crvena-kabanica", (t) => raincoat(t, { body: { color: "#E5484D" }, trim: "#C53035" }), { thumb: { focus: "full", alone: false } }),
    item("zimska-jakna", (t) => puffer(t, { body: { color: "#3D86E0" } })),
    item("roze-jakna", (t) => puffer(t, { body: { color: "#F78FB3" } })),
    item("zelena-jakna", (t) => puffer(t, { body: { color: "#3BB273" } })),
    // ── Leto i sport ──
    full("kupaci-pruge", (t) => swimwear(t, { top: { color: "#FFFFFF", map: stripeTexture("#FFFFFF", "#3BB2A0", 0.03, 0.42) }, shorts: { color: "#3BB2A0" } })),
    full("kupaci-ribice", (t) => swimwear(t, { top: { color: "#7ED6F2" }, shorts: { color: "#FF8A3D" }, print: { map: sceneTexture("ribice", [[T.fish("#FF8A3D"), 0.32, 0.32, 0.2], [T.fish("#FFD15C"), 0.68, 0.48, 0.18], [T.fish("#F45B8D"), 0.4, 0.72, 0.17]]), size: 1 } })),
    full("kupaci-cvetovi", (t) => swimwear(t, { top: { color: "#F45B8D", map: patternTexture("cvet-zuti-roze", "#F45B8D", T.flower("#FFD15C", "#FFFFFF"), { tile: 0.06, scale: 0.17 }) }, shorts: { color: "#FFD15C" } })),
    item("fudbalski-dres", (t) => jersey(t, { body: { color: "#3BB273", map: stripeTexture("#3BB273", "#FFFFFF", 0.06, 0.2, true) }, trim: "#FFFFFF", number: printNumber("10", "#FFFFFF", "#2A8E57"), front: motifTexture("lopta", T.soccer()) })),
    item("kosarkaski-dres", (t) => jersey(t, { body: { color: "#FF8A3D" }, trim: "#FFFFFF", sleeve: "none", neck: "crew", number: printNumber("23", "#FFFFFF", "#B85A1E"), front: motifTexture("kosarka", T.basketball()) })),
    item("dres-zvezda", (t) => jersey(t, { body: { color: "#2C5DB0" }, trim: "#FFD15C", number: printNumber("7", "#FFFFFF", "#1F4A94"), front: motifTexture("zvezda-bela", T.star("#FFFFFF")) })),
    item("kosulja-kocke", (t) => shirt(t, { body: { color: "#E5484D", map: checkTexture("#E5484D", "#8E2A2E", 0.05) } })),
    item("kosulja-prsluk", (t) => {
        shirt(t, { body: { color: "#FFFFFF" }, pocket: false });
        vest(t, { body: { color: "#3BB273" }, buttons: "#2A8E57", open: 0.12, trim: "#2A8E57" });
    }),
    full("odelo", (t) => suit(t, { color: "#33427A", tie: "#E5484D", pocket: "#FFFFFF" })),
    item("super-ogrtac", (t, ctx) => {
        tee(t, { body: { color: "#C93A3F" }, sleeve: "long", print: { map: motifTexture("grb-ogrtac", T.bolt("#FFD15C")), size: 0.8 } });
        return cape(t, { color: "#E5484D", lining: "#B8323A", length: 0.78, clasp: "#FFC83D" }, torsoLayer(ctx));
    }, { motion: "cape", thumb: { focus: "full", alone: false, yaw: 0.9 } }),
    // ── Kostimi ──
    full("kostim-balerine", (t) => C.ballerina(t)),
    full("kostim-kuvara", (t) => C.chef(t)),
    full("kostim-bubamare", (t) => C.ladybug(t)),
    full("kostim-pcelice", (t) => C.bee(t)),
    full("kostim-doktora", (t) => C.doctor(t)),
    full("kostim-mede", (t) => C.bear(t), { covers: ["tail"] }),
    full("kostim-ronioca", (t) => C.diver(t)),
    full("kostim-kauboja", (t) => C.cowboy(t)),
    full("kostim-pilota", (t) => C.pilot(t)),
    full("kostim-pirata", (t) => C.pirate(t)),
    full("kostim-vatrogasca", (t) => C.firefighter(t)),
    full("kostim-superheroja", (t) => C.superhero(t)),
    full("kostim-carobnjaka", (t) => C.wizard(t)),
    full("kostim-viteza", (t) => C.knight(t)),
    full("haljina-princeze", (t) => C.princess(t)),
    full("kostim-princa", (t) => C.prince(t)),
    full("kostim-dinosaurusa", (t) => C.dino(t), { covers: ["tail"], thumb: { focus: "full", alone: false, yaw: 1.1 } }),
    full("kostim-astronauta", (t) => C.astronaut(t)),
    // ── Novo: moderna garderoba ──
    item("bela-majica", (t) => tee(t, { body: { color: "#F6F4EF" }, oversized: true, print: print("zvezdica-mala", T.star("#E9A10E"), 0.35) })),
    item("crna-majica", (t) => tee(t, { body: { color: "#2C2C32" }, oversized: true, print: print("munja-mala", T.bolt("#FFFFFF"), 0.4) })),
    item("polo-majica", (t) => polo(t, { body: { color: "#8E2F3A" }, buttons: "#E8D8C8" })),
    item("plava-polo-majica", (t) => polo(t, { body: { color: "#4F86C6" }, collar: "#FFFFFF" })),
    item("bordo-majica-dugi-rukav", (t) => tee(t, { body: { color: "#8E2F3A", kind: "rib" }, sleeve: "long", neck: "scoop" })),
    item("majica-dugi-rukav-pruge", (t) => tee(t, { body: { color: "#FFFFFF", map: stripeTexture("#FFFFFF", "#2E3A66", 0.026, 0.38) }, sleeve: "long", trim: "#2E3A66" })),
    item("tamnozeleni-duks", (t) => hoodie(t, { body: { color: "#3F5A52" }, strings: "#E8E4DC" })),
    item("plavosivi-duks", (t) => hoodie(t, { body: { color: "#6E8FB0" }, strings: "#FFFFFF" })),
    item("sivi-duks-rajsferslus", (t) => hoodie(t, { body: { color: "#9AA0AA" }, zip: true })),
    item("beli-kardigan", (t) => cardigan(t, { body: { color: "#F4F1EA" }, under: { color: "#F7B8C8" } })),
    item("zuti-kardigan", (t) => cardigan(t, { body: { color: "#E8B84A" }, under: { color: "#FFFFFF" }, buttons: "#8A5A20" })),
    full("duga-haljina", (t) => dress(t, { body: { color: "#5A86C8" }, accent: "#FFFFFF", sleeve: "long", length: "maxi", bow: false })),
    full("duga-cvetna-haljina", (t) => dress(t, { body: { color: "#F2A7C0", map: patternTexture("cvet-duga-haljina", "#F2A7C0", T.flower("#FFFFFF", "#F2A516"), { tile: 0.075, scale: 0.2 }) }, accent: "#F2A516", sleeve: "long", length: "maxi" })),
    full("abaja", (t) => abaya(t, { body: { color: "#2E3A55" }, accent: "#C9A55A" })),
    full("roze-abaja", (t) => abaya(t, { body: { color: "#D98BA8" }, accent: "#F2E2B0" })),
    full("teksas-kombinezon", (t) => overalls(t, { tee: { color: "#FFFFFF", map: stripeTexture("#FFFFFF", "#E5484D", 0.03, 0.4) }, denim: "#6E92C8", shorts: true })),
    item("beli-pernati-prsluk", (t) => pufferVest(t, { body: { color: "#F2F2F0" }, under: { color: "#2C2C32" } })),
    item("sivi-pernati-prsluk", (t) => pufferVest(t, { body: { color: "#8E939C" }, under: { color: "#2C2C32" }, longSleeve: true })),
    item("crna-pernata-jakna", (t) => pufferJacket(t, { body: { color: "#2A2A30" } })),
    item("teksas-jakna", (t) => C.denimJacket(t)),
    item("dugi-kaput", (t) => coat(t, { body: { color: "#C8A774" }, length: "calf", belt: true }), { thumb: { focus: "full", alone: false } }),
    item("dugi-teget-kaput", (t) => coat(t, { body: { color: "#2E3A66" }, length: "ankle", buttons: "single", accent: "#C9A661" }), { thumb: { focus: "full", alone: false } }),
    item("zelena-sportska-jakna", (t) => C.trackJacket(t, "#3E7D5A", "#FFFFFF")),
    full("kupaci-dugi", (t) => C.modestSwim(t)),
    full("pidzama-meseci", (t) => pajamas(t, { body: { color: "#2E3A66", map: patternTexture("meseci-pidzama", "#2E3A66", T.moon("#FFD15C"), { tile: 0.07, scale: 0.14, rotate: true }) }, piping: "#FFD15C" })),
    full("spavacica", (t) => dress(t, { body: { color: "#CDE6F7", map: patternTexture("zvezdice-spavacica", "#CDE6F7", T.star("#FFFFFF"), { tile: 0.06, scale: 0.12, rotate: true }) }, accent: "#FFFFFF", sleeve: "long", length: "maxi", bow: false, flare: 0.9 })),
    item("svecana-kosulja", (t) => shirt(t, { body: { color: "#FFFFFF" }, pocket: false, buttons: "#E8E8EC" })),
    item("teget-sako", (t) => {
        shirtFront(t, "#FFFFFF", LAYER.top - 0.002);
        C.blazer(t, "#2E3A66");
    }),
    full("kostim-detektiva", (t) => C.detective(t)),
    full("kostim-naucnika", (t) => C.scientist(t)),
    full("kostim-bastovana", (t) => C.gardener(t)),
]));

/** Manja gustina za kostime od više slojeva (da ostanu ≤ 24k trouglova) */
function withBudgets(list: ItemBuilder[]): ItemBuilder[] {
    const budget: Record<string, number> = {
        "kosulja-prsluk": 0.85, odelo: 0.88, "super-ogrtac": 0.86, "kostim-bubamare": 0.9, "kostim-doktora": 0.74,
        "kostim-kauboja": 0.8, "kostim-pilota": 0.7, "kostim-pirata": 0.84, "kostim-vatrogasca": 0.75, "haljina-princeze": 0.84,
        "kostim-princa": 0.9, "kostim-astronauta": 0.95, "kostim-detektiva": 0.78, "kostim-naucnika": 0.8, "kostim-bastovana": 0.9,
        "teget-sako": 0.92, "beli-kardigan": 0.8, "zuti-kardigan": 0.8, "beli-pernati-prsluk": 0.8, "sivi-pernati-prsluk": 0.8,
        "teksas-jakna": 0.92, "dugi-kaput": 0.92, "dugi-teget-kaput": 0.92,
    };
    return list.map((b) => {
        const k = budget[b.id];
        if (!k) return b;
        const inner = builds.get(b.id);
        return inner ? { ...b, build: (ctx) => inner(new Tailor(ctx, k), ctx) ?? undefined } : b;
    });
}
