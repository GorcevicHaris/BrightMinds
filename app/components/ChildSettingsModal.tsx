"use client";

import { useState } from "react";
import { Alert } from "./ui/Card";
import { Button, buttonClasses } from "./ui/Button";
import { Select, Switch } from "./ui/Field";
import { Modal } from "./ui/Modal";
import {
    AGE_BANDS,
    BAND_PRESETS,
    ageInYears,
    bandForAge,
    MAX_PLAN_GAMES,
    defaultSettings,
    sanitizeSettings,
    type AgeBand,
    type ChildSettings,
} from "@/lib/childSettings";
import { cn } from "@/lib/cn";
import { GAMES, type GameId } from "@/lib/games";

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
    const [confirmErase, setConfirmErase] = useState(false);
    const [eraseState, setEraseState] = useState<"idle" | "working" | "done" | "failed">("idle");

    const togglePlanGame = (id: GameId) =>
        setSettings((prev) => {
            if (prev.plan.includes(id)) return { ...prev, plan: prev.plan.filter((g) => g !== id) };
            if (prev.plan.length >= MAX_PLAN_GAMES) return prev;
            return { ...prev, plan: [...prev.plan, id] };
        });

    const eraseResults = async () => {
        setEraseState("working");
        try {
            const res = await fetch(`/api/children/${childId}/progress`, { method: "DELETE" });
            setEraseState(res.ok ? "done" : "failed");
        } catch {
            setEraseState("failed");
        }
        setConfirmErase(false);
    };

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

                <Section
                    title="Plan igre „prvo–zatim”"
                    hint={`Izaberite do ${MAX_PLAN_GAMES} igre redom kojim će ih dete igrati. Dete vidi raspored i zna šta je sada, šta posle i kada je kraj. Bez plana dete bira samo.`}
                >
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {GAMES.map((game) => {
                            const position = settings.plan.indexOf(game.id);
                            const selected = position >= 0;
                            const full = !selected && settings.plan.length >= MAX_PLAN_GAMES;
                            return (
                                <li key={game.id}>
                                    <button
                                        type="button"
                                        aria-pressed={selected}
                                        disabled={full}
                                        onClick={() => togglePlanGame(game.id)}
                                        className={cn(
                                            "flex min-h-12 w-full items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm font-extrabold transition-colors disabled:opacity-50",
                                            selected ? "border-brand-500 bg-brand-50 text-ink" : "border-line bg-surface text-ink-soft hover:border-brand-200"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm",
                                                selected ? "bg-brand-600 text-white" : "bg-canvas"
                                            )}
                                            aria-hidden="true"
                                        >
                                            {selected ? position + 1 : game.icon}
                                        </span>
                                        <span className="min-w-0 truncate">{game.title}</span>
                                        {selected && <span className="sr-only">, {position + 1}. u planu</span>}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {settings.plan.length > 0 && (
                        <button type="button" onClick={() => set("plan", [])} className="mt-2 min-h-9 rounded-lg px-2 text-sm font-extrabold text-brand-700 hover:bg-brand-50">
                            Ukloni plan
                        </button>
                    )}
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
                        description="Gasi kretanje na ekranu. Učitelj ostaje, ali miruje."
                        checked={settings.reduceMotion}
                        onChange={(v) => set("reduceMotion", v)}
                    />
                    <Switch
                        label="Učitelj na ekranu"
                        description="Lik koji čita zadatke: izraz lica prati ton rečenice."
                        checked={settings.avatar}
                        onChange={(v) => set("avatar", v)}
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

                <Section title="Podaci" hint="Rezultati igara pripadaju vama i detetu: možete ih preuzeti ili trajno obrisati.">
                    <div className="flex flex-wrap items-center gap-2">
                        <a href={`/api/children/${childId}/export`} download className={buttonClasses({ variant: "secondary", size: "sm" })}>
                            Preuzmi rezultate (CSV)
                        </a>
                        {!confirmErase ? (
                            <Button variant="ghost" size="sm" onClick={() => setConfirmErase(true)} disabled={eraseState === "working"}>
                                Obriši sve rezultate
                            </Button>
                        ) : (
                            <span className="flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 px-3 py-2">
                                <span className="text-sm font-bold text-rose-700">Trajno obrisati sve rezultate?</span>
                                <Button variant="danger" size="sm" onClick={eraseResults} isLoading={eraseState === "working"}>
                                    Obriši
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => setConfirmErase(false)}>
                                    Odustani
                                </Button>
                            </span>
                        )}
                    </div>
                    <p className="mt-2 min-h-5 text-sm font-bold" aria-live="polite">
                        {eraseState === "done" && <span className="text-emerald-700">Rezultati su obrisani.</span>}
                        {eraseState === "failed" && <span className="text-rose-700">Brisanje nije uspelo. Pokušajte ponovo.</span>}
                    </p>
                </Section>
            </div>
        </Modal>
    );
}
