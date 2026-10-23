// Krzna životinja za 3D crtež (boje i šare) — po id-ju izgleda iz skins.data.ts.
// Boje mačke, psa, zeke i mede su prenete iz 2D izgleda (app/components/avatar/skins.ts),
// da dete prepozna svog drugara. Bez three.js (čisti podaci).

import type { AnimalKind } from "../data";

/** Šare preko krzna (crtaju se bojama temena, meki prelazi) */
export type Pattern =
    | "none" | "tuxedo" | "calico" | "tiger" | "points" | "spots" | "husky" | "blaze" | "dutch" | "panda"
    | "koala" | "gold" | "rainbow" | "fox" | "silver" | "penguin" | "emperor" | "stars";

export interface Coat {
    /** Osnovna boja krzna */
    fur: string;
    /** Svetliji stomak, grudi i obrazi */
    light: string;
    /** Njuška (oko nosa i usta) */
    muzzle: string;
    /** Unutrašnjost uha i jastučići šapa */
    inner: string;
    nose: string;
    /** Obrve (krzno iznad očiju) */
    brow: string;
    /** Dužica: svetlo i tamno */
    iris: [string, string];
    /** Uši, šape i rep u svojoj boji (inače krzno) */
    ears?: string;
    earTips?: string;
    paws?: string;
    tail?: string;
    tailTip?: string;
    /** Linija usta */
    mouth?: string;
    /** Griva (lav, jednorog) i rog; više boja = dugina griva */
    mane?: string[];
    horn?: string;
    hoof?: string;
    beak?: string;
    pattern?: Pattern;
    marks?: string[];
    /** Oblik ušiju kad odstupa od vrste */
    earShape?: "pointy" | "curly" | "fluffy";
    topknot?: boolean;
    bigNose?: boolean;
    /** Svetlucavo krzno (zlatna, zvezdana) */
    shimmer?: boolean;
}

const PASTEL = ["#FFB3C7", "#FFD0A6", "#FFF1A6", "#BFF0C8", "#B5DEFF", "#D6C2FF"];

function gold(extra: Partial<Coat> = {}): Coat {
    return {
        fur: "#F2C443",
        light: "#FFF0B8",
        muzzle: "#FFF4CC",
        inner: "#F7A9B6",
        nose: "#B5672A",
        brow: "#C08A1E",
        iris: ["#7ED6F2", "#1F7FA8"],
        pattern: "gold",
        marks: ["#FFFFFF"],
        shimmer: true,
        ...extra,
    };
}

function rainbow(extra: Partial<Coat> = {}): Coat {
    return {
        fur: "#FFF6FA",
        light: "#FFFFFF",
        muzzle: "#FFFFFF",
        inner: "#F9B9C9",
        nose: "#F08AA0",
        brow: "#B59AD0",
        iris: ["#C9A6F2", "#6A3FB0"],
        pattern: "rainbow",
        marks: PASTEL,
        mane: PASTEL,
        ...extra,
    };
}

export const COATS: Record<AnimalKind, Record<string, Coat>> = {
    cat: {
        narandzasta: { fur: "#F2A65A", light: "#FFE9CF", muzzle: "#FFF4E3", inner: "#F7A9B6", nose: "#F08AA0", brow: "#C4743A", iris: ["#B9DA6A", "#4F7A18"], pattern: "tiger", marks: ["#D9843E"], tailTip: "#FFE9CF" },
        siva: { fur: "#B4BAC6", light: "#EEF0F4", muzzle: "#F7F8FA", inner: "#F4B2BF", nose: "#E98AA0", brow: "#7D8392", iris: ["#F2D35C", "#A8800F"] },
        crna: { fur: "#34303C", light: "#4A4552", muzzle: "#4A4552", inner: "#E79AAC", nose: "#E07D96", brow: "#5A5464", iris: ["#EDE76E", "#8FA019"], mouth: "#16131A" },
        bela: { fur: "#F6F4F8", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#F9B9C9", nose: "#F08AA0", brow: "#D2CCDA", iris: ["#9CCBF5", "#2F6DB0"] },
        "crno-bela": { fur: "#2F2B36", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#F2A0B2", nose: "#F08AA0", brow: "#47424F", iris: ["#EDE76E", "#8FA019"], pattern: "tuxedo", marks: ["#FFFFFF"] },
        tigrasta: { fur: "#F2A93B", light: "#FFE7BE", muzzle: "#FFF4E3", inner: "#F7A9B6", nose: "#E98AA0", brow: "#7A3E10", iris: ["#B9DA6A", "#4F7A18"], pattern: "tiger", marks: ["#7E4212"], tailTip: "#7E4212" },
        trobojna: { fur: "#FFFFFF", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#F2A0B2", nose: "#F08AA0", brow: "#C9905A", iris: ["#B9DA6A", "#4F7A18"], pattern: "calico", marks: ["#F2A65A", "#3D3946"] },
        sijamska: { fur: "#F4E8D4", light: "#FFF9EF", muzzle: "#6E5444", inner: "#C7A08E", nose: "#3A2A24", brow: "#8A6A58", iris: ["#A9DBFF", "#2F74C0"], ears: "#5E4436", paws: "#6E5444", tail: "#5E4436", pattern: "points", marks: ["#5E4436"], mouth: "#2A1810" },
        zlatna: gold({ nose: "#F08AA0" }),
        duga: rainbow(),
    },
    dog: {
        bez: { fur: "#EDCB9C", light: "#FFF5E6", muzzle: "#FFF9EF", inner: "#F3C9A6", nose: "#3A2A2A", brow: "#B07C4C", iris: ["#C98A4E", "#5A3216"], ears: "#C08A58" },
        braon: { fur: "#AC7446", light: "#E8C9A6", muzzle: "#F2D9BC", inner: "#E8B996", nose: "#2E1E18", brow: "#6A4020", iris: ["#C8904F", "#5A3212"], ears: "#7A4A26" },
        crna: { fur: "#35303A", light: "#4E4852", muzzle: "#5E5660", inner: "#C9A08E", nose: "#141014", brow: "#58515E", iris: ["#D29A58", "#6A3C16"], ears: "#262229", mouth: "#120E12" },
        bela: { fur: "#F7F4EF", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#F6CBB8", nose: "#3A2A2A", brow: "#DCD2C4", iris: ["#C98A4E", "#5A3216"], ears: "#EADFD0" },
        retriver: { fur: "#E8AE5C", light: "#FFE3B0", muzzle: "#FFEBC8", inner: "#F3C9A6", nose: "#3A2A2A", brow: "#A86C2C", iris: ["#C98A4E", "#5A3216"], ears: "#D69444" },
        bigl: { fur: "#D99A50", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#F3C9A6", nose: "#2E1E18", brow: "#8A5226", iris: ["#C98A4E", "#5A3216"], ears: "#8A5226", tailTip: "#FFFFFF", pattern: "blaze", marks: ["#FFFFFF", "#3A302C"] },
        dalmatinac: { fur: "#FAFAFB", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#F6CBB8", nose: "#2A2A30", brow: "#3A3A40", iris: ["#C98A4E", "#5A3216"], ears: "#2A2A30", pattern: "spots", marks: ["#2A2A30"] },
        pudla: { fur: "#F4D2B6", light: "#FFF3E8", muzzle: "#FFF8F0", inner: "#F3C9A6", nose: "#3A2A2A", brow: "#C89A74", iris: ["#C98A4E", "#5A3216"], ears: "#EDC4A2", earShape: "curly", topknot: true },
        haski: { fur: "#8A94A4", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#F4C7CF", nose: "#2A2A30", brow: "#FFFFFF", iris: ["#A9DBFF", "#2F74C0"], ears: "#7C8696", tailTip: "#FFFFFF", pattern: "husky", marks: ["#FFFFFF"], earShape: "pointy" },
        zlatna: gold({ nose: "#3A2A2A", ears: "#E0A830" }),
        duga: rainbow({ nose: "#3A2A2A" }),
    },
    bunny: {
        bela: { fur: "#F8F6FB", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#F9B9C9", nose: "#F08AA0", brow: "#DCD4E6", iris: ["#8E78C8", "#33255E"], tail: "#FFFFFF" },
        siva: { fur: "#BCC1CC", light: "#EEF0F4", muzzle: "#F7F8FA", inner: "#F4B9C6", nose: "#E98AA0", brow: "#868D9C", iris: ["#C98A4E", "#5A3216"], tail: "#FFFFFF" },
        braon: { fur: "#C79B70", light: "#F2DEC6", muzzle: "#F7E6D2", inner: "#F2B6B6", nose: "#D9788C", brow: "#8A603A", iris: ["#C98A4E", "#5A3216"], tail: "#FFFFFF" },
        "crno-bela": { fur: "#FFFFFF", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#F9B9C9", nose: "#F08AA0", brow: "#E2DCE8", iris: ["#8E78C8", "#33255E"], ears: "#34303C", tail: "#FFFFFF", pattern: "dutch", marks: ["#34303C"] },
        roze: { fur: "#F9C9DC", light: "#FFF0F6", muzzle: "#FFF6FA", inner: "#F58FB0", nose: "#E9708F", brow: "#D88AAA", iris: ["#8E78C8", "#33255E"], tail: "#FFFFFF" },
        zlatna: gold({ nose: "#F08AA0", tail: "#FFF6C2" }),
        duga: rainbow({ tail: "#FFFFFF" }),
    },
    bear: {
        braon: { fur: "#B07A4A", light: "#E8C39A", muzzle: "#F2D8B8", inner: "#E8C09A", nose: "#3A2418", brow: "#6E4424", iris: ["#C08850", "#4E2C12"] },
        "svetlo-braon": { fur: "#E0B07C", light: "#FAE4C4", muzzle: "#FFF3E2", inner: "#F6D7B8", nose: "#5A3A26", brow: "#9A6A40", iris: ["#C08850", "#4E2C12"] },
        polarni: { fur: "#F6F3EA", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#E9DFD0", nose: "#2A2228", brow: "#D6CFBF", iris: ["#7A6A5A", "#2A2018"] },
        koala: { fur: "#A9AEB8", light: "#ECEEF2", muzzle: "#D9DCE2", inner: "#FFFFFF", nose: "#34303A", brow: "#6A707C", iris: ["#7A5A3A", "#2A180C"], pattern: "koala", earShape: "fluffy", bigNose: true },
        panda: { fur: "#FAFAF7", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#4A4A50", nose: "#2A2A2E", brow: "#2A2A2E", iris: ["#7A5A3A", "#2A180C"], ears: "#2A2A2E", paws: "#2A2A2E", pattern: "panda", marks: ["#2A2A2E"] },
        zlatna: gold({ nose: "#6E4424", inner: "#FFE7A0" }),
        duga: rainbow({ nose: "#6E4424", inner: "#FFE0EC" }),
    },
    fox: {
        narandzasta: { fur: "#EE7E32", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#FFE6D6", nose: "#2A2228", brow: "#B85A1E", iris: ["#E8B24A", "#8A4E10"], earTips: "#3A2A2A", paws: "#3A2A2A", tailTip: "#FFFFFF", pattern: "fox", marks: ["#3A2A2A"] },
        crvena: { fur: "#D9542A", light: "#FFF4EC", muzzle: "#FFF4EC", inner: "#FFD9C8", nose: "#2A2228", brow: "#9A3814", iris: ["#E8B24A", "#8A4E10"], earTips: "#2E2226", paws: "#2E2226", tailTip: "#FFFFFF", pattern: "fox", marks: ["#2E2226"] },
        polarna: { fur: "#F7F7FA", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#F6D6DE", nose: "#2A2A30", brow: "#D8DAE2", iris: ["#7FB8E6", "#2A5A8E"], earTips: "#C9CDD6", paws: "#E6E8EE", tailTip: "#FFFFFF", pattern: "fox", marks: ["#D2D6DE"] },
        pustinjska: { fur: "#E8C690", light: "#FFF8EC", muzzle: "#FFF8EC", inner: "#FFD9C8", nose: "#3A2A24", brow: "#B08A54", iris: ["#C89A4A", "#6A4410"], earTips: "#C9A06A", paws: "#D6B07A", tailTip: "#7A5A3A", pattern: "fox", marks: ["#C9A06A"] },
        srebrna: { fur: "#4A4852", light: "#E8E8EE", muzzle: "#D8D8E0", inner: "#C9B8C2", nose: "#1E1C22", brow: "#8A8894", iris: ["#E8C25A", "#8A6A10"], earTips: "#22202A", paws: "#22202A", tailTip: "#FFFFFF", pattern: "silver", marks: ["#C8C8D2"] },
        zlatna: gold({ nose: "#3A2A2A", earTips: "#C9921C", tailTip: "#FFFFFF" }),
        duga: rainbow({ nose: "#3A2A2A", tailTip: "#FFFFFF" }),
    },
    lion: {
        "zlatna-griva": { fur: "#E9B56A", light: "#FFF0D6", muzzle: "#FFF4E2", inner: "#F2C9A0", nose: "#B0645A", brow: "#B07A34", iris: ["#E8B24A", "#7A4A10"], mane: ["#C8742E", "#A65A22"], tailTip: "#A65A22" },
        "smedja-griva": { fur: "#DDA868", light: "#FBE8CC", muzzle: "#FFF2DE", inner: "#F0C49C", nose: "#8A4E48", brow: "#8A5A2A", iris: ["#D8A04A", "#6A3E0C"], mane: ["#7A4424", "#5E3218"], tailTip: "#5E3218" },
        rida: { fur: "#EFB774", light: "#FFF0D8", muzzle: "#FFF4E2", inner: "#F6C8A6", nose: "#C0645A", brow: "#C0642A", iris: ["#E8B24A", "#7A4A10"], mane: ["#E0622A", "#C24A1C"], tailTip: "#C24A1C" },
        beli: { fur: "#F8F2E6", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#F6D6CC", nose: "#D08A8A", brow: "#E2D2B8", iris: ["#8CC8F0", "#2A6AA8"], mane: ["#FFF6E4", "#EADCC2"], tailTip: "#EADCC2" },
        zlatna: gold({ nose: "#B0645A", mane: ["#FFE07A", "#E0A82A"], tailTip: "#E0A82A" }),
        duga: rainbow({ nose: "#C07A8A", mane: PASTEL, tailTip: "#D6C2FF" }),
    },
    penguin: {
        "crno-beli": { fur: "#2E3440", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#3A4050", nose: "#F29A2E", brow: "#1E222A", iris: ["#6A5A4A", "#1E160E"], beak: "#F29A2E", paws: "#F29A2E", pattern: "penguin" },
        carski: { fur: "#2A3040", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#3A4050", nose: "#F2A23A", brow: "#1A1E28", iris: ["#6A5A4A", "#1E160E"], beak: "#2A2A30", paws: "#3A3A42", pattern: "emperor", marks: ["#FFC23A", "#FFE9A6"] },
        "mali-plavi": { fur: "#5E86B8", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#6A8EC0", nose: "#3A3A44", brow: "#3E5E8E", iris: ["#7A6A5A", "#2A2018"], beak: "#3A3A44", paws: "#F2B8C4", pattern: "penguin" },
        cupavi: { fur: "#2E3440", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#3A4050", nose: "#E8503A", brow: "#FFD23A", iris: ["#E84A3A", "#8A1A10"], beak: "#E8503A", paws: "#F2A0A8", pattern: "penguin", topknot: true, marks: ["#FFD23A"] },
        roze: { fur: "#E98AB0", light: "#FFFFFF", muzzle: "#FFFFFF", inner: "#F2A6C4", nose: "#F29A2E", brow: "#C86A92", iris: ["#7A5A8A", "#2A1A3A"], beak: "#F29A2E", paws: "#F29A2E", pattern: "penguin" },
        zlatna: gold({ beak: "#F29A2E", nose: "#F29A2E", paws: "#F29A2E", pattern: "gold" }),
        duga: rainbow({ beak: "#F29A2E", nose: "#F29A2E", paws: "#F29A2E" }),
    },
    unicorn: {
        beli: { fur: "#FBF8FC", light: "#FFFFFF", muzzle: "#FCE6EE", inner: "#F9C6D6", nose: "#E2A6B8", brow: "#D9C9E6", iris: ["#B59AF0", "#4A2E9A"], mane: ["#FFB3D1", "#D6B8FF", "#B5DEFF"], horn: "#FFE7A8", hoof: "#E8C27A" },
        roze: { fur: "#FAD2E2", light: "#FFF0F6", muzzle: "#FFE4EE", inner: "#F7A6C2", nose: "#E08AA6", brow: "#E2A2C0", iris: ["#B59AF0", "#4A2E9A"], mane: ["#FFFFFF", "#FF9CC8", "#D6B8FF"], horn: "#FFF2C8", hoof: "#F2C6D6" },
        ljubicasti: { fur: "#D8C6F4", light: "#F4ECFF", muzzle: "#F2E8FF", inner: "#F4B8D8", nose: "#C29AD8", brow: "#A88ACF", iris: ["#F2A6D0", "#8A2E6A"], mane: ["#FFFFFF", "#F7A6D6", "#9C7CE6"], horn: "#FFE7A8", hoof: "#B9A2E0" },
        plavi: { fur: "#CDE6FA", light: "#F0F8FF", muzzle: "#EAF4FF", inner: "#F6C2D6", nose: "#9CB6D6", brow: "#8EB2D6", iris: ["#8A9CF0", "#2A3A9A"], mane: ["#FFFFFF", "#A6E2F7", "#B8B8FF"], horn: "#FFF2C8", hoof: "#A6C6E6" },
        dugin: { fur: "#FFFFFF", light: "#FFFFFF", muzzle: "#FFEEF4", inner: "#F9C6D6", nose: "#E2A6B8", brow: "#D9C9E6", iris: ["#B59AF0", "#4A2E9A"], mane: ["#FF8FA8", "#FFB870", "#FFE36A", "#8EE0A0", "#7CC4FF", "#B79CFF"], horn: "#FFE7A8", hoof: "#E8C27A" },
        zlatni: gold({ nose: "#D0A050", muzzle: "#FFF0C8", mane: ["#FFFFFF", "#FFE7A0", "#F2C443"], horn: "#FFF6D8", hoof: "#C9921C", pattern: "gold" }),
        zvezdani: { fur: "#3A3F7A", light: "#5A5F9A", muzzle: "#4E5392", inner: "#B8A2E6", nose: "#8A86C6", brow: "#8E92D6", iris: ["#FFE48A", "#C08A1A"], mane: ["#B8A2FF", "#7CC4FF", "#FFFFFF"], horn: "#FFE48A", hoof: "#C9B26A", pattern: "stars", marks: ["#FFF6C8"], shimmer: true },
    },
};

/** Krzno za izgled; nepoznat id → prvi (podrazumevani) izgled vrste */
export function coatFor(kind: AnimalKind, skin: string, firstId: string): Coat {
    const list = COATS[kind];
    return list[skin] ?? list[firstId];
}
