"use client";

import { useState } from "react";
import { BookOpenText, Database, Gamepad2, Leaf } from "lucide-react";
import { Alert } from "./ui/Card";
import { Button } from "./ui/Button";
import { Select, Switch } from "./ui/Field";
import { Modal } from "./ui/Modal";
import {
    AGE_BANDS,
    BAND_PRESETS,
    ageInYears,
    bandForAge,
    MAX_PLAN_GAMES,
    defaultSettings,
    playAgeFor,
    WEEKDAYS,
    sanitizeSettings,
    type AgeBand,
    type ChildSettings,
} from "@/lib/childSettings";
import { cn } from "@/lib/cn";
import { UNLOCK_AFTER_LEVEL } from "@/lib/gameAccess";
import { GAMES, ageLabel, sortGamesForChild, type GameId } from "@/lib/games";

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
        <section className="border-t border-line pt-4 first:border-t-0 first:pt-0 [[role=tablist]+&]:border-t-0 [[role=tablist]+&]:pt-0">
            <h3 className="text-base font-extrabold text-ink">{title}</h3>
            {hint && <p className="mt-0.5 text-sm font-medium text-ink-soft">{hint}</p>}
            <div className="mt-2">{children}</div>
        </section>
    );
}

const WEEKDAY_NAMES = ["Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota", "Nedelja"];

/** Teme podešavanja: odjednom se vidi samo jedna, da prozor ne bude dugačak spisak. */
const TABS = [
    { id: "games", label: "Igre", icon: Gamepad2 },
    { id: "senses", label: "Čitanje i zvuk", icon: BookOpenText },
    { id: "calm", label: "Mir i vreme", icon: Leaf },
    { id: "data", label: "Podaci", icon: Database },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Podešavanja jednog deteta: složenost, čitanje, zvuk, mir i tempo. */
export default function ChildSettingsModal({ childId, childName, dateOfBirth, stored, onClose, onSaved }: Props) {
    const ageBand = bandForAge(ageInYears(dateOfBirth));
    const [settings, setSettings] = useState<ChildSettings>(() => sanitizeSettings(stored, ageBand));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [confirmErase, setConfirmErase] = useState(false);
    const [eraseState, setEraseState] = useState<"idle" | "working" | "done" | "failed">("idle");
    const [tab, setTab] = useState<TabId>("games");

    const togglePlanGame = (id: GameId) =>
        setSettings((prev) => {
            if (prev.plan.includes(id)) return { ...prev, plan: prev.plan.filter((g) => g !== id) };
            if (prev.plan.length >= MAX_PLAN_GAMES) return prev;
            return { ...prev, plan: [...prev.plan, id] };
        });

    // Igre redom kojim ih dete vidi (uzrast i težina); isključena igra izlazi i iz plana
    const sortedGames = sortGamesForChild(GAMES, playAgeFor(ageInYears(dateOfBirth), settings.band));
    const toggleGame = (id: GameId) =>
        setSettings((prev) => {
            if (prev.disabledGames.includes(id)) return { ...prev, disabledGames: prev.disabledGames.filter((g) => g !== id) };
            // Bar jedna igra ostaje uključena
            if (prev.disabledGames.length >= GAMES.length - 1) return prev;
            return { ...prev, disabledGames: [...prev.disabledGames, id], plan: prev.plan.filter((g) => g !== id) };
        });
    const enabledInOrder = sortedGames.filter((game) => !settings.disabledGames.includes(game.id));

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

                <div role="tablist" aria-label="Teme podešavanja" className="grid grid-cols-2 gap-1 rounded-2xl bg-canvas p-1 sm:grid-cols-4">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={tab === id}
                            onClick={() => setTab(id)}
                            className={cn(
                                "flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-extrabold transition-colors",
                                tab === id ? "bg-surface text-brand-700 shadow-soft" : "text-ink-soft hover:text-ink"
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            {label}
                        </button>
                    ))}
                </div>

                {tab === "games" && (
                    <>
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
                            <div className="mt-2">
                                <Switch
                                    label="Pomoć kad dete dugo ne odgovara"
                                    description="Posle 8 sekundi bez dodira tačan odgovor blago zasvetli — pre greške, ne posle nje. Preporučeno za najmlađe."
                                    checked={settings.waitHint}
                                    onChange={(v) => set("waitHint", v)}
                                />
                            </div>
                        </Section>

                        <Section
                            title="Koje igre dete vidi"
                            hint="Poređane su kako ih dete vidi: prvo igre za njegov uzrast, od najlakše. Isključenu igru dete ne vidi."
                        >
                            <ul className="grid gap-2 sm:grid-cols-2">
                                {sortedGames.map((game) => {
                                    const enabled = !settings.disabledGames.includes(game.id);
                                    const position = enabledInOrder.indexOf(game);
                                    const last = enabled && enabledInOrder.length === 1;
                                    return (
                                        <li key={game.id}>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={enabled}
                                                disabled={last}
                                                title={last ? "Bar jedna igra ostaje uključena" : undefined}
                                                onClick={() => toggleGame(game.id)}
                                                className={cn(
                                                    "flex min-h-12 w-full items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm font-extrabold transition-colors disabled:cursor-not-allowed",
                                                    enabled ? "border-brand-200 bg-surface text-ink hover:border-brand-400" : "border-line bg-canvas text-ink-faint hover:border-brand-200"
                                                )}
                                            >
                                                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base", enabled ? "bg-brand-50" : "bg-surface grayscale")} aria-hidden="true">
                                                    {settings.unlockInOrder && enabled ? <span className="text-sm text-brand-700">{position + 1}.</span> : game.icon}
                                                </span>
                                                <span className="min-w-0 flex-1 truncate">{game.title}</span>
                                                <span className="shrink-0 text-xs font-bold text-ink-faint">{ageLabel(game)}</span>
                                                <span
                                                    className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", enabled ? "bg-brand-600" : "bg-line")}
                                                    aria-hidden="true"
                                                >
                                                    <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left]", enabled ? "left-[1.125rem]" : "left-0.5")} />
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                            <div className="mt-2">
                                <Switch
                                    label="Otključavanje redom"
                                    description={`Igre se otvaraju jedna za drugom, redom sa spiska iznad: sledeća kad dete završi ${UNLOCK_AFTER_LEVEL}. nivo prethodne. Igre koje je dete već igralo ostaju otvorene, kao i igre iz plana.`}
                                    checked={settings.unlockInOrder}
                                    onChange={(v) => set("unlockInOrder", v)}
                                />
                            </div>
                        </Section>

                        <Section
                            title="Plan igre „prvo–zatim”"
                            hint={`Izaberite do ${MAX_PLAN_GAMES} igre redom kojim će ih dete igrati. Dete vidi raspored i zna šta je sada, šta posle i kada je kraj. Bez plana dete bira samo.`}
                        >
                            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {enabledInOrder.map((game) => {
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
                    </>
                )}

                {tab === "senses" && (
                    <>
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
                    </>
                )}

                {tab === "calm" && (
                    <>
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
                        <Section
                            title="Podsetnik"
                            hint="Blag podsetnik u aplikaciji: posle izabranog vremena, ako dete tog dana još nije igralo, početni ekran kaže „Vreme je za igru sa drugarom!”, a vaš panel da dete danas još nije vežbalo. Bez obaveštenja na telefonu i bez mejlova."
                        >
                            <Switch
                                label="Dnevni podsetnik"
                                checked={settings.reminder.enabled}
                                onChange={(v) => set("reminder", { ...settings.reminder, enabled: v })}
                            />
                            <div className={cn("mt-2 grid gap-4 sm:grid-cols-2", !settings.reminder.enabled && "opacity-50")}>
                                <div>
                                    <label htmlFor="settings-reminder-time" className="block text-sm font-extrabold text-ink">
                                        Posle koliko sati
                                    </label>
                                    <input
                                        id="settings-reminder-time"
                                        type="time"
                                        step={300}
                                        value={settings.reminder.time}
                                        disabled={!settings.reminder.enabled}
                                        onChange={(e) => e.target.value && set("reminder", { ...settings.reminder, time: e.target.value.slice(0, 5) })}
                                        className="mt-1.5 min-h-11 w-full rounded-xl border-2 border-line bg-surface px-3 text-base font-bold text-ink focus:border-brand-500 focus:outline-none"
                                    />
                                </div>
                                <fieldset disabled={!settings.reminder.enabled}>
                                    <legend className="text-sm font-extrabold text-ink">Dani</legend>
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {WEEKDAYS.map((day) => {
                                            const on = settings.reminder.days.includes(day);
                                            const only = on && settings.reminder.days.length === 1;
                                            return (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    aria-pressed={on}
                                                    aria-label={WEEKDAY_NAMES[day - 1]}
                                                    title={only ? "Bar jedan dan ostaje izabran" : WEEKDAY_NAMES[day - 1]}
                                                    disabled={only}
                                                    onClick={() =>
                                                        set("reminder", {
                                                            ...settings.reminder,
                                                            days: on ? settings.reminder.days.filter((d) => d !== day) : WEEKDAYS.filter((d) => d === day || settings.reminder.days.includes(d)),
                                                        })
                                                    }
                                                    className={cn(
                                                        "grid h-11 w-11 place-items-center rounded-xl border-2 text-sm font-extrabold transition-colors disabled:cursor-not-allowed",
                                                        on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink-soft hover:border-brand-200"
                                                    )}
                                                >
                                                    {WEEKDAY_NAMES[day - 1].slice(0, 3)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                            </div>
                        </Section>
                    </>
                )}

                {tab === "data" && (
                    <Section title="Podaci" hint="Rezultati igara pripadaju vama i detetu: možete ih trajno obrisati.">
                        <div className="flex flex-wrap items-center gap-2">
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
                )}
            </div>
        </Modal>
    );
}
