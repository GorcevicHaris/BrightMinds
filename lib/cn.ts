type ClassValue = string | number | false | null | undefined;

/** Spaja klase i preskače prazne vrednosti. */
export function cn(...values: ClassValue[]): string {
    return values.filter(Boolean).join(" ");
}
