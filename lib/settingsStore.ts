// lib/settingsStore.ts
// Trenutna podešavanja deteta na ovom uređaju, za module van React-a (zvuk, govor).
// Postavlja ih <ChildSettingsProvider>; React komponente koriste useChildSettings().
import { FALLBACK_SETTINGS, type ResolvedSettings } from "./childSettings";

let current: ResolvedSettings = FALLBACK_SETTINGS;

export function getChildSettings(): ResolvedSettings {
    return current;
}

export function setChildSettings(next: ResolvedSettings): void {
    current = next;
}
