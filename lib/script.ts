// lib/script.ts
// Preslovljavanje srpske latinice u ćirilicu (jedan smer, za prikaz detetu).

const DIGRAPHS: Record<string, string> = {
    lj: "љ", Lj: "Љ", LJ: "Љ",
    nj: "њ", Nj: "Њ", NJ: "Њ",
    dž: "џ", Dž: "Џ", DŽ: "Џ",
};

const LETTERS: Record<string, string> = {
    a: "а", b: "б", c: "ц", č: "ч", ć: "ћ", d: "д", đ: "ђ", e: "е", f: "ф", g: "г", h: "х", i: "и", j: "ј", k: "к",
    l: "л", m: "м", n: "н", o: "о", p: "п", r: "р", s: "с", š: "ш", t: "т", u: "у", v: "в", z: "з", ž: "ж",
    A: "А", B: "Б", C: "Ц", Č: "Ч", Ć: "Ћ", D: "Д", Đ: "Ђ", E: "Е", F: "Ф", G: "Г", H: "Х", I: "И", J: "Ј", K: "К",
    L: "Л", M: "М", N: "Н", O: "О", P: "П", R: "Р", S: "С", Š: "Ш", T: "Т", U: "У", V: "В", Z: "З", Ž: "Ж",
};

// Reči u kojima su „nj” i „dž” dva glasa, a ne jedno slovo (n+j, d+ž)
const SPLIT_PREFIXES = /(?<![a-zčćđšž])(injek|injunk|konjug|konjunk|tanjug|vanjezi|nadži|nadžnj|odžal|odživ|podžanr|predživ)/gi;
const SPLIT_MARK = "‌";

const PATTERN = /lj|Lj|LJ|nj|Nj|NJ|dž|Dž|DŽ|[a-zčćđšžA-ZČĆĐŠŽ]/g;

/** Preslovljava latinicu u ćirilicu. Ćirilični tekst, brojevi i emodžiji ostaju isti. */
export function toCyrillic(text: string): string {
    if (!/[a-zčćđšžA-ZČĆĐŠŽ]/.test(text)) return text;
    // U izuzecima razdvajamo digraf nevidljivim znakom, pa ga posle uklanjamo
    const marked = text.replace(SPLIT_PREFIXES, (match) => match.replace(/([nd])([jž])/i, `$1${SPLIT_MARK}$2`));
    return marked
        .replace(PATTERN, (match) => DIGRAPHS[match] ?? LETTERS[match] ?? match)
        .replaceAll(SPLIT_MARK, "");
}
