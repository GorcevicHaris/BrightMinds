"use client";

import { useState } from "react";
import { Alert } from "./ui/Card";
import { Button } from "./ui/Button";
import { Select, Switch } from "./ui/Field";
import { Modal } from "./ui/Modal";
import {
    AGE_BANDS,
    BAND_PRESETS,
    ageInYears,
    bandForAge,
    defaultSettings,
    sanitizeSettings,
    type AgeBand,
    type ChildSettings,
} from "@/lib/childSettings";

interface Props {
    childId: number;
    childName: string;
    dateOfBirth: string | null;
    /** Sirova podešavanja iz baze (ili {} ako još nisu menjana) */
    stored: unknown;
    onClose: () => void;
    onSaved: (settings: ChildSettings) => void;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
    return (
        <section className="border-t border-line pt-4 first:border-t-0 first:pt-0">
            <h3 className="text-base font-extrabold text-ink">{title}</h3>
            {hint && <p className="mt-0.5 text-sm font-medium text-ink-soft">{hint}</p>}
            <div className="mt-2">{children}</div>
        </section>
    );
}

/** Podešavanja jednog deteta: složenost, čitanje, zvuk, mir i tempo. */
export default function ChildSettingsModal({ childId, childName, dateOfBirth, stored, onClose, onSaved }: Props) {
    const ageBand = bandForAge(ageInYears(dateOfBirth));
    const [settings, setSettings] = useState<ChildSettings>(() => sanitizeSettings(stored, ageBand));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    const activeBand = settings.band ?? ageBand;
    const preset = BAND_PRESETS[activeBand];
    const set = <K extends keyof ChildSettings>(key: K, value: ChildSettings[K]) => setSettings((prev) => ({ ...prev, [key]: value }));

    const save = async () => {
        if (isSaving) return;
        setIsSaving(true);
        setError("");
        try {
            const res = await fetch(`/api/children/${childId}/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settings }),
            });
            if (res.ok) {
                const data = await res.json();
                onSaved(sanitizeSettings(data.settings, ageBand));
                return;
            }
            const data = await res.json().catch(() => null);
            setError(typeof data?.error === "string" ? data.error : "Čuvanje nije uspelo. Pokušajte ponovo.");
        } catch {
            setError("Mrežna greška. Pokušajte ponovo.");
        }
        setIsSaving(false);
    };

    return (
        <Modal
            open
            onClose={() => !isSaving && onClose()}
            size="lg"
            title={`Podešavanja: ${childName}`}
            description="Prilagodite igru detetu. Preporuke su prema uzrastu; sve možete promeniti."
            footer={
                <>
                    <Button variant="ghost" onClick={() => setSettings(defaultSettings(ageBand))} disabled={isSaving}>
                        Vrati preporučeno
                    </Button>
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>
                        Odustani
                    </Button>
                    <Button onClick={save} isLoading={isSaving}>
                        Sačuvaj
                    </Button>
                </>
            }
        >
            <div className="space-y-5">
                {error && <Alert>{error}</Alert>}

                <Section title="Složenost zadataka" hint={`Sada: ${preset.label.toLowerCase()} uzrast (${preset.ages}) — do ${settings.maxChoices || preset.maxChoices} ponuđenih odgovora.`}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                            label="Uzrasna grupa"
                            value={settings.band ?? "auto"}
                            onChange={(e) => set("band", e.target.value === "auto" ? null : (e.target.value as AgeBand))}
                        >
                            <option value="auto">Prema datumu rođenja ({BAND_PRESETS[ageBand].ages})</option>
                            {AGE_BANDS.map((band) => (
                                <option key={band} value={band}>
                                    {BAND_PRESETS[band].label} ({BAND_PRESETS[band].ages})
                                </option>
                            ))}
                        </Select>
                        <Select
                            label="Najviše ponuđenih odgovora"
                            value={settings.maxChoices}
                            onChange={(e) => set("maxChoices", Number(e.target.value) as ChildSettings["maxChoices"])}
                        >
                            <option value={0}>Prema uzrastu ({preset.maxChoices})</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                            <option value={6}>6</option>
                        </Select>
                    </div>
                    <div className="mt-4">
                        <Select
                            label="Pomoć posle greške"
                            hint="Tačan odgovor blago zasvetli. Ranija pomoć znači manje grešaka i manje frustracije."
                            value={settings.hintAfter}
                            onChange={(e) => set("hintAfter", Number(e.target.value) as ChildSettings["hintAfter"])}
                        >
                            <option value={1}>Posle prve greške</option>
                            <option value={2}>Posle druge greške</option>
                            <option value={0}>Bez isticanja odgovora</option>
                        </Select>
                    </div>
                </Section>

                <Section title="Čitanje" hint="Sve igre mogu da se igraju i bez čitanja: uputstva se izgovaraju.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                            label="Pismo"
                            hint="U školama u Srbiji prvo se uči ćirilica."
                            value={settings.script}
                            onChange={(e) => set("script", e.target.value as ChildSettings["script"])}
                        >
                            <option value="latin">Latinica</option>
                            <option value="cyrillic">Ćirilica</option>
                        </Select>
                    </div>
                    <Switch
                        label="Velika štampana slova"
                        description="Lakše za decu koja tek uče slova."
                        checked={settings.uppercase}
                        onChange={(v) => set("uppercase", v)}
                    />
                </Section>

                <Section title="Zvuk" hint="Mnoga deca su osetljiva na zvuk. Počnite tiše i bez naglih zvukova.">
                    <Switch label="Glas koji čita uputstva" checked={settings.voice} onChange={(v) => set("voice", v)} />
                    <Switch label="Kratki zvučni efekti" description="Tihi tonovi za dodir i tačan odgovor." checked={settings.effects} onChange={(v) => set("effects", v)} />
                    <Switch
                        label="Zvuci u igri „Slušaj i spoji”"
                        description="Bez njih ta igra ne može da se igra."
                        checked={settings.gameSounds}
                        onChange={(v) => set("gameSounds", v)}
                    />
                    <Switch
                        label="Nagli i glasni zvuci"
                        description="Sirena, grmljavina, lavež, zvono. Isključeno je preporuka za decu osetljivu na zvuk."
                        checked={settings.loudSounds}
                        onChange={(v) => set("loudSounds", v)}
                        disabled={!settings.gameSounds}
                    />
                    <div className="py-2.5">
                        <label htmlFor="settings-volume" className="flex items-baseline justify-between text-sm font-extrabold text-ink">
                            <span>Jačina zvuka</span>
                            <span className="font-bold text-ink-soft">{Math.round(settings.volume * 100)}%</span>
                        </label>
                        <input
                            id="settings-volume"
                            type="range"
                            min={0.2}
                            max={1}
                            step={0.1}
                            value={settings.volume}
                            onChange={(e) => set("volume", Number(e.target.value))}
                            className="mt-2 h-2 w-full cursor-pointer accent-brand-600"
                        />
                    </div>
                </Section>

                <Section title="Mir i tempo">
                    <Switch
                        label="Manje animacija"
                        description="Gasi kretanje na ekranu i 3D učitelja."
                        checked={settings.reduceMotion}
                        onChange={(v) => set("reduceMotion", v)}
                    />
                    <Switch
                        label="3D učitelj na početnom ekranu"
                        checked={settings.avatar && !settings.reduceMotion}
                        onChange={(v) => set("avatar", v)}
                        disabled={settings.reduceMotion}
                    />
                    <div className="mt-2 grid gap-4 sm:grid-cols-2">
                        <Select
                            label="Dnevno vreme igre"
                            hint="Igra se završava mirno, na kraju nivoa."
                            value={settings.sessionMinutes}
                            onChange={(e) => set("sessionMinutes", Number(e.target.value) as ChildSettings["sessionMinutes"])}
                        >
                            <option value={10}>10 minuta</option>
                            <option value={15}>15 minuta</option>
                            <option value={20}>20 minuta</option>
                            <option value={30}>30 minuta</option>
                            <option value={0}>Bez ograničenja</option>
                        </Select>
                        <Select
                            label="Pitanje „Kako si?”"
                            hint="Detetov izbor lica, ne merenje. Kod dece mlađe od 6 godina nije pouzdano."
                            value={settings.moodCheck}
                            onChange={(e) => set("moodCheck", e.target.value as ChildSettings["moodCheck"])}
                        >
                            <option value="off">Isključeno</option>
                            <option value="three">Tri lica, može da se preskoči</option>
                        </Select>
                    </div>
                </Section>
            </div>
        </Modal>
    );
}
