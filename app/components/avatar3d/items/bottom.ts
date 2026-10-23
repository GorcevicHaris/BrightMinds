// 3D crteži predmeta za mesto „bottom” (podaci: bottom.data.ts). Vlasnik: #3 (katalog).
// Pantalone, šorcevi i suknje — kroje se po telu (dete, odrasli, životinja), rep izlazi kroz
// porubljen otvor. Haljine i kostimi do članaka sakrivaju ovo mesto (hides: ["bottom"]).

import { registerItems, type ItemBuilder, type ItemContext } from "../contract";
import { fabric, torsoLayer } from "./lib/common";
import { pants, skirt, suspenders, type PantsOptions, type SkirtOptions } from "./lib/bottoms";
import { checkTexture, dotsTexture, MOTIFS, patternTexture } from "./lib/prints";
import { Tailor } from "./lib/tailor";

type Build = (t: Tailor, ctx: ItemContext) => void;

const item = (id: string, build: Build, extra: Partial<ItemBuilder> = {}): ItemBuilder => ({
    id,
    build: (ctx) => build(new Tailor(ctx), ctx),
    covers: [],
    thumb: { focus: "lower", alone: false },
    ...extra,
});

const trousers = (id: string, o: PantsOptions) => item(id, (t) => pants(t, o));
const skirtItem = (id: string, o: SkirtOptions) => item(id, (t) => skirt(t, o));

/** Teksas boje (svetla, srednja, tamna) */
const DENIM = { light: "#8FB4DE", mid: "#4A6FB5", dark: "#2E3F6E", pink: "#F29BBE" };

registerItems("bottom", [
    trousers("farmerke", { cloth: { color: DENIM.mid }, denim: true }),
    trousers("svetle-farmerke", { cloth: { color: DENIM.light }, denim: true, cuff: true }),
    trousers("tamne-farmerke", { cloth: { color: DENIM.dark }, denim: true, fit: "skinny" }),
    trousers("roze-farmerke", { cloth: { color: DENIM.pink }, denim: true, stitch: "#FFFFFF", cuff: true }),
    trousers("farmerke-zakrpe", { cloth: { color: DENIM.mid }, denim: true, knee: "#F45B8D" }),
    trousers("sive-trenerke", { cloth: { color: "#A7ADB8", kind: "fleece" }, fit: "jogger", baggy: true }),
    trousers("plave-trenerke", { cloth: { color: "#3D7BE0", kind: "fleece" }, fit: "jogger", stripe: "#FFFFFF" }),
    trousers("roze-trenerke", { cloth: { color: "#F78FB3", kind: "fleece" }, fit: "jogger", stripe: "#FFFFFF" }),
    trousers("crne-trenerke", { cloth: { color: "#33343C", kind: "fleece" }, fit: "jogger", stripe: "#3BB273" }),
    trousers("bez-pantalone", { cloth: { color: "#D8BE94", kind: "cotton" }, stitch: "#B89A6E" }),
    trousers("teget-pantalone", { cloth: { color: "#2E3A66", kind: "cotton" } }),
    trousers("karirane-pantalone", { cloth: { color: "#C53035", map: checkTexture("#B8323A", "#2A2224", 0.06, "#FFD15C") } }),
    trousers("pantalone-dzepovi", { cloth: { color: "#7A8B5A", kind: "cotton" }, fit: "cargo", stitch: "#5E6E42" }),
    trousers("siroke-pantalone", { cloth: { color: "#6D8FC9", kind: "cotton" }, fit: "wide", pockets: false, elastic: true }),
    trousers("roze-helanke", { cloth: { color: "#F78FB3", kind: "rib" }, fit: "legging" }),
    trousers("helanke-tufne", { cloth: { color: "#8E77E6", kind: "rib", map: dotsTexture("#8E77E6", "#FFFFFF", 0.035, 0.12) }, fit: "legging" }),
    trousers("ljubicaste-helanke", { cloth: { color: "#8E77E6", kind: "rib" }, fit: "legging" }),
    trousers("siroke-farmerke", { cloth: { color: "#5B7DB8" }, denim: true, fit: "baggy", stacked: true }),
    trousers("sive-siroke-farmerke", { cloth: { color: "#8E939C" }, denim: true, fit: "baggy", stacked: true, stitch: "#C9CCD3" }),
    trousers("svetle-siroke-farmerke", { cloth: { color: "#A9C3E2" }, denim: true, fit: "baggy", stacked: true }),
    trousers("zelene-trenerke", { cloth: { color: "#7FA88A", kind: "fleece" }, fit: "jogger", baggy: true }),
    trousers("crne-zvonaste-helanke", { cloth: { color: "#2A2A30", kind: "rib" }, fit: "flare", elastic: true, pockets: false }),
    trousers("roze-zvonaste-helanke", { cloth: { color: "#F2B8C8", kind: "rib" }, fit: "flare", elastic: true, pockets: false }),
    item("pantalone-tregeri", (t, ctx) => {
        pants(t, { cloth: { color: "#C9473F", kind: "cotton" }, cuff: true });
        suspenders(t, torsoLayer(ctx), fabric("#C9473F", "cotton"), "#FFD15C");
    }, { dependsOn: ["outfit"] }),
    trousers("teksas-sorc", { cloth: { color: DENIM.light }, denim: true, length: 0.34, cuff: true }),
    trousers("crveni-sorc", { cloth: { color: "#E5484D", kind: "cotton" }, length: 0.34 }),
    trousers("sportski-sorc", { cloth: { color: "#2C5DB0", kind: "mesh" }, length: 0.36, elastic: true, stripe: "#FFFFFF", pockets: false }),
    trousers("bermude", { cloth: { color: "#C8B28A", kind: "cotton" }, length: 0.52, fit: "cargo" }),
    trousers("zeleni-sorc", { cloth: { color: "#3BB273", kind: "cotton" }, length: 0.34, cuff: true }),
    trousers("crni-sorc", { cloth: { color: "#2A2A30", kind: "mesh" }, length: 0.4, elastic: true, pockets: false, stripe: "#FFFFFF" }),
    trousers("beli-sorc", { cloth: { color: "#F4F4F2", kind: "cotton" }, length: 0.4, elastic: true, pockets: false }),
    skirtItem("plisirana-suknja", { cloth: { color: "#3D5AA8" }, style: "pleated" }),
    skirtItem("teksas-suknja", { cloth: { color: DENIM.mid }, style: "denim", length: "mini" }),
    skirtItem("tutu-suknja", { cloth: { color: "#FFB8CB" }, style: "tutu", trim: "#F78FB3" }),
    skirtItem("suknja-tufne", { cloth: { color: "#E5484D", map: dotsTexture("#E5484D", "#FFFFFF", 0.05, 0.13) }, style: "circle", length: "knee" }),
    skirtItem("karirana-suknja", { cloth: { color: "#C53035", kind: "felt", map: checkTexture("#3E6E4E", "#1F3D2A", 0.07, "#FFD15C") }, style: "pleated" }),
    skirtItem("zuta-suknja", { cloth: { color: "#FFD15C" }, style: "circle", length: "knee", bow: "#F2A516" }),
    skirtItem("duga-suknja", { cloth: { color: "#5A7FB8", kind: "satin" }, style: "maxi" }),
    skirtItem("duga-cvetna-suknja", { cloth: { color: "#F2A7C0", map: patternTexture("cvet-roze", "#F2A7C0", MOTIFS.flower("#FFFFFF", "#F2A516"), { tile: 0.075, scale: 0.2 }) }, style: "maxi" }),
    skirtItem("ljubicasta-duga-suknja", { cloth: { color: "#8E77E6", kind: "satin" }, style: "maxi", trim: "#E3B754" }),
    skirtItem("suknja-na-volane", { cloth: { color: "#7ED6F2", map: patternTexture("cvet-plavi", "#7ED6F2", MOTIFS.flower("#FFFFFF", "#FFD15C"), { tile: 0.07, scale: 0.2 }) }, style: "tiered", length: "midi" }),
]);
