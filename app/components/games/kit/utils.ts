// Sitne pomoćne funkcije koje dele sve igre.

/** Nepristrasno mešanje (Fisher–Yates). Vraća novi niz; original ostaje netaknut. */
export function shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

const GENDER_PAIR = /\{([^{}|]*)\|([^{}|]*)\}/g;

/**
 * Razrešava parove `{muški|ženski}` u tekstu:
 * genderText("Dobi{o|la} si poklon", true) → "Dobila si poklon".
 * Bilo koja strana para sme da bude prazna, npr. `{|a}`.
 */
export function genderText(text: string, female: boolean): string {
    return text.replace(GENDER_PAIR, (_pair, male: string, femaleForm: string) => (female ? femaleForm : male));
}

/** Da li se detetu obraćamo u ženskom rodu (`gender` iz profila deteta). */
export function isFemale(gender?: string): boolean {
    return gender?.toLowerCase() === "female";
}
