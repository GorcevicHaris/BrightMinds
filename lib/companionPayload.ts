// Drugar i novčići deteta u obliku koji vidi ekran deteta. Isti oblik šalje
// GET /api/children/[id]/companion i stranica deteta (odmah uz stranicu, da se na ekranu
// nikad ne pojavi podrazumevani drugar pre kupljenog).
import { COMPANION_CATALOG } from "@/app/components/avatar3d/manifest";
import { coinsOf, sanitizeCompanion, type CompanionState } from "./companion";
import { isRecord } from "./validation";

export interface CompanionPayload {
    companion: { kind: string; owned: string[]; wear: CompanionState["wear"]; goal: string | null; skin: NonNullable<CompanionState["skin"]>; skins: string[] };
    coins: number;
}

/** Sačuvano stanje drugara → odgovor za ekran deteta (novčići = zarađeni i dobijeni u dvoboju, minus potrošeni i dati) */
export function companionBody(state: CompanionState, experiencePoints: number | null): CompanionPayload {
    return {
        companion: { kind: state.kind, owned: state.owned, wear: state.wear, goal: state.goal ?? null, skin: state.skin ?? {}, skins: state.skins ?? [] },
        coins: coinsOf(state, experiencePoints),
    };
}

/** Drugar iz kolone `settings` deteta (nepoznato ili oštećeno → podrazumevani drugar za pol) */
export function companionPayload(settings: unknown, gender: string | null, experiencePoints: number | null): CompanionPayload {
    const stored = isRecord(settings) ? settings.companion : undefined;
    return companionBody(sanitizeCompanion(stored, gender, COMPANION_CATALOG), experiencePoints);
}
