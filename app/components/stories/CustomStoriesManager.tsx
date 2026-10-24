// app/components/stories/CustomStoriesManager.tsx
// Strana za odrasle: spisak, pisanje, izmena i brisanje priča jednog deteta
// („Moje priče”). Dete ih posle čita u CustomStoryShelf.
"use client";

import { useEffect, useId, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Spinner } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Card";
import { Input, Textarea } from "@/app/components/ui/Field";
import { Modal } from "@/app/components/ui/Modal";
import {
    MAX_STORIES_PER_CHILD,
    STORY_EMOJI_MAX_UNITS,
    STORY_FALLBACK_EMOJI,
    STORY_LIMIT_REACHED,
    STORY_MAX_STEPS,
    STORY_MIN_STEPS,
    STORY_STEP_TEXT_MAX,
    STORY_TEMPLATES,
    STORY_TITLE_MAX,
    parseStory,
    parseStoryList,
    stepCountLabel,
    validateStoryInput,
    type CustomStory,
    type CustomStoryInput,
    type CustomStoryStep,
} from "@/lib/customStories";
import { isRecord } from "@/lib/validation";
import { StoryStepIndicator, StoryStepView } from "./CustomStoryShelf";

interface Props {
    childId: number;
    childName: string;
    onClose: () => void;
    initialStories?: CustomStory[];
    /** Bez mreže: radi samo u memoriji, polazeći od `initialStories` (probni prikaz) */
    offline?: boolean;
}

// ── Nacrt priče u formi ───────────────────────────────────────────────────────

interface DraftStep {
    /** Stabilan ključ za React dok se koraci premeštaju */
    key: number;
    text: string;
    emoji: string;
}

interface Draft {
    title: string;
    emoji: string;
    steps: DraftStep[];
    nextKey: number;
}

const BLANK_STORY: CustomStoryInput = {
    title: "",
    emoji: null,
    steps: Array.from({ length: STORY_MIN_STEPS }, () => ({ text: "", emoji: null })),
};

function toDraft(story: CustomStoryInput): Draft {
    return {
        title: story.title,
        emoji: story.emoji ?? "",
        steps: story.steps.map((step, key) => ({ key, text: step.text, emoji: step.emoji ?? "" })),
        nextKey: story.steps.length,
    };
}

/** Sadržaj nacrta bez ključeva — za proveru, slanje i poređenje sa početnim stanjem. */
function draftContent(draft: Draft) {
    return {
        title: draft.title,
        emoji: draft.emoji,
        steps: draft.steps.map((step) => ({ text: step.text, emoji: step.emoji })),
    };
}

function snapshot(draft: Draft): string {
    return JSON.stringify(draftContent(draft));
}

type View =
    | { mode: "list" }
    | { mode: "templates" }
    /** `storyId` je `null` za novu priču; `baseline` je nacrt kakav je bio na početku */
    | { mode: "edit"; storyId: number | null; baseline: string };

type LoadStatus = "loading" | "ready" | "error";

const LOAD_FAILED = "Priče nisu učitane. Pokušajte ponovo.";
const SAVE_FAILED = "Čuvanje nije uspelo. Pokušajte ponovo.";
const DELETE_FAILED = "Brisanje nije uspelo. Pokušajte ponovo.";
const NETWORK_ERROR = "Mrežna greška. Pokušajte ponovo.";

/** Poruka `{ error }` iz odgovora API-ja ili rezervna poruka. */
async function errorMessage(res: Response, fallback: string): Promise<string> {
    const data: unknown = await res.json().catch(() => null);
    return isRecord(data) && typeof data.error === "string" ? data.error : fallback;
}

/** Fokus na početak novog prikaza (naslov), da čitač ekrana i tastatura krenu odatle. */
function useFocusOnMount<T extends HTMLElement>(enabled: boolean) {
    const ref = useRef<T>(null);
    useEffect(() => {
        if (enabled) ref.current?.focus();
    }, [enabled]);
    return ref;
}

/** Priče jednog deteta: spisak, nova priča (prazna ili od primera), izmena i brisanje. */
export default function CustomStoriesManager({ childId, childName, onClose, initialStories, offline = false }: Props) {
    const [stories, setStories] = useState<CustomStory[]>(() => initialStories ?? []);
    const [status, setStatus] = useState<LoadStatus>(offline ? "ready" : "loading");
    const [loadError, setLoadError] = useState("");
    const [loadAttempt, setLoadAttempt] = useState(0);

    const [view, setView] = useState<View>({ mode: "list" });
    /** Prvi prikaz fokus dobija od prozora; svaki sledeći ga postavlja na svoj naslov */
    const [viewChanged, setViewChanged] = useState(false);
    const [draft, setDraft] = useState<Draft>(() => toDraft(BLANK_STORY));
    const [previewing, setPreviewing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    /** Kuda vodi odustajanje od nesačuvanih izmena, dok čeka potvrdu */
    const [pendingLeave, setPendingLeave] = useState<"list" | "close" | null>(null);

    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [listError, setListError] = useState("");
    const [notice, setNotice] = useState("");

    // Zahtev za čuvanje/brisanje se prekida ako se prozor ukloni
    const mutation = useRef<AbortController | null>(null);
    useEffect(() => () => mutation.current?.abort(), []);

    useEffect(() => {
        if (offline) return;
        const controller = new AbortController();
        (async () => {
            try {
                const res = await fetch(`/api/children/${childId}/stories`, { cache: "no-store", signal: controller.signal });
                if (!res.ok) {
                    const message = await errorMessage(res, LOAD_FAILED);
                    if (controller.signal.aborted) return;
                    setLoadError(message);
                    setStatus("error");
                    return;
                }
                const data: unknown = await res.json();
                if (controller.signal.aborted) return;
                setStories(parseStoryList(data));
                setStatus("ready");
            } catch {
                if (controller.signal.aborted) return;
                setLoadError(NETWORK_ERROR);
                setStatus("error");
            }
        })();
        return () => controller.abort();
    }, [childId, offline, loadAttempt]);

    const busy = saving || deletingId !== null;
    const atLimit = stories.length >= MAX_STORIES_PER_CHILD;
    const dirty = view.mode === "edit" && snapshot(draft) !== view.baseline;

    // ── Navigacija ─────────────────────────────────────────────────────────────

    const go = (next: View) => {
        setView(next);
        setViewChanged(true);
        setPreviewing(false);
        setPendingLeave(null);
        setFormError("");
        setListError("");
    };

    const startEditing = (story: CustomStoryInput, storyId: number | null) => {
        const next = toDraft(story);
        setDraft(next);
        setNotice("");
        go({ mode: "edit", storyId, baseline: snapshot(next) });
    };

    /** Izmena nacrta; poruka o grešci iz prethodnog pokušaja čuvanja više ne važi. */
    const editDraft: Dispatch<SetStateAction<Draft>> = (action) => {
        setDraft(action);
        setFormError("");
    };

    const leave = (target: "list" | "close") => {
        if (target === "close") onClose();
        else go({ mode: "list" });
    };

    /** Izlaz iz forme: nesačuvane izmene se ne odbacuju bez potvrde. */
    const requestLeave = (target: "list" | "close") => {
        if (busy) return;
        if (dirty) setPendingLeave(target);
        else leave(target);
    };

    const retryLoad = () => {
        setStatus("loading");
        setLoadAttempt((attempt) => attempt + 1);
    };

    // ── Čuvanje i brisanje ─────────────────────────────────────────────────────

    const finishSave = (story: CustomStory) => {
        setStories((prev) => [story, ...prev.filter((s) => s.id !== story.id)]);
        setNotice("Priča je sačuvana.");
        go({ mode: "list" });
    };

    const save = async () => {
        if (busy || view.mode !== "edit") return;
        const { storyId } = view;
        const checked = validateStoryInput(draftContent(draft));
        if (!checked.ok) {
            setFormError(checked.error);
            return;
        }
        if (storyId === null && atLimit) {
            setFormError(STORY_LIMIT_REACHED);
            return;
        }
        setFormError("");

        if (offline) {
            const id = storyId ?? stories.reduce((max, s) => Math.max(max, s.id), 0) + 1;
            finishSave({ id, ...checked.value, updatedAt: new Date().toISOString() });
            return;
        }

        const controller = new AbortController();
        mutation.current = controller;
        setSaving(true);
        try {
            const res = await fetch(
                storyId === null ? `/api/children/${childId}/stories` : `/api/children/${childId}/stories/${storyId}`,
                {
                    method: storyId === null ? "POST" : "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(checked.value),
                    signal: controller.signal,
                }
            );
            if (!res.ok) {
                const message = await errorMessage(res, SAVE_FAILED);
                if (!controller.signal.aborted) setFormError(message);
                return;
            }
            const data: unknown = await res.json();
            if (controller.signal.aborted) return;
            const story = isRecord(data) ? parseStory(data.story) : null;
            if (story) finishSave(story);
            else setFormError(SAVE_FAILED);
        } catch {
            if (!controller.signal.aborted) setFormError(NETWORK_ERROR);
        } finally {
            if (!controller.signal.aborted) setSaving(false);
        }
    };

    const remove = async (story: CustomStory) => {
        if (busy) return;
        setListError("");
        setNotice("");
        const removed = () => {
            setStories((prev) => prev.filter((s) => s.id !== story.id));
            setNotice("Priča je obrisana.");
        };

        if (offline) {
            removed();
            return;
        }

        const controller = new AbortController();
        mutation.current = controller;
        setDeletingId(story.id);
        try {
            const res = await fetch(`/api/children/${childId}/stories/${story.id}`, { method: "DELETE", signal: controller.signal });
            // 404 znači da je priča već obrisana (npr. sa drugog uređaja)
            if (res.ok || res.status === 404) {
                if (!controller.signal.aborted) removed();
                return;
            }
            const message = await errorMessage(res, DELETE_FAILED);
            if (!controller.signal.aborted) setListError(message);
        } catch {
            if (!controller.signal.aborted) setListError(NETWORK_ERROR);
        } finally {
            if (!controller.signal.aborted) setDeletingId(null);
        }
    };

    // ── Prikaz ─────────────────────────────────────────────────────────────────

    let footer: ReactNode;
    if (view.mode === "edit") {
        footer = (
            <div className="flex w-full flex-col gap-3">
                {formError && <Alert>{formError}</Alert>}
                {pendingLeave ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                        <p className="text-sm font-bold text-ink sm:mr-auto">Izmene nisu sačuvane. Odbaciti ih?</p>
                        <div className="grid grid-cols-2 gap-3 sm:flex">
                            <Button autoFocus variant="secondary" onClick={() => setPendingLeave(null)}>
                                Nastavi pisanje
                            </Button>
                            <Button variant="danger" onClick={() => leave(pendingLeave)}>
                                Odbaci izmene
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
                        <Button variant="ghost" onClick={() => requestLeave("list")} disabled={saving}>
                            Odustani
                        </Button>
                        <Button onClick={save} isLoading={saving}>
                            Sačuvaj
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <Modal
            open
            onClose={() => requestLeave("close")}
            size="lg"
            title={`Priče za: ${childName}`}
            description="Kratke priče koje dete čita ili sluša korak po korak, pre stvarnog događaja."
            footer={footer}
        >
            {view.mode === "list" && (
                <StoryList
                    stories={stories}
                    status={status}
                    loadError={loadError}
                    listError={listError}
                    notice={notice}
                    atLimit={atLimit}
                    deletingId={deletingId}
                    focusOnMount={viewChanged}
                    onRetry={retryLoad}
                    onNew={() => startEditing(BLANK_STORY, null)}
                    onTemplates={() => go({ mode: "templates" })}
                    onEdit={(story) => startEditing(story, story.id)}
                    onDelete={remove}
                />
            )}

            {view.mode === "templates" && (
                <TemplateList onPick={(template) => startEditing(template, null)} onBack={() => go({ mode: "list" })} />
            )}

            {view.mode === "edit" && (
                <StoryEditor
                    isNew={view.storyId === null}
                    draft={draft}
                    setDraft={editDraft}
                    previewing={previewing}
                    onTogglePreview={() => setPreviewing((on) => !on)}
                    disabled={saving}
                />
            )}
        </Modal>
    );
}

// ── Spisak priča ──────────────────────────────────────────────────────────────

function EmojiTile({ emoji }: { emoji: string | null }) {
    return (
        <span
            aria-hidden="true"
            className="grid h-11 min-w-11 shrink-0 place-items-center whitespace-nowrap rounded-xl bg-sun-50 px-1.5 text-2xl leading-none ring-1 ring-sun-200"
        >
            {emoji ?? STORY_FALLBACK_EMOJI}
        </span>
    );
}

interface StoryListProps {
    stories: CustomStory[];
    status: LoadStatus;
    loadError: string;
    listError: string;
    notice: string;
    atLimit: boolean;
    deletingId: number | null;
    focusOnMount: boolean;
    onRetry: () => void;
    onNew: () => void;
    onTemplates: () => void;
    onEdit: (story: CustomStory) => void;
    onDelete: (story: CustomStory) => void;
}

function StoryList({
    stories,
    status,
    loadError,
    listError,
    notice,
    atLimit,
    deletingId,
    focusOnMount,
    onRetry,
    onNew,
    onTemplates,
    onEdit,
    onDelete,
}: StoryListProps) {
    const headingRef = useFocusOnMount<HTMLHeadingElement>(focusOnMount);

    if (status === "error") {
        return (
            <div className="space-y-4">
                <Alert>{loadError}</Alert>
                <Button variant="secondary" onClick={onRetry}>
                    Pokušaj ponovo
                </Button>
            </div>
        );
    }

    if (status === "loading" && stories.length === 0) {
        return (
            <div role="status" className="flex items-center justify-center gap-3 py-10 text-sm font-bold text-ink-soft">
                <Spinner />
                Učitavanje priča…
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <h3 ref={headingRef} tabIndex={-1} className="mr-auto text-base font-extrabold text-ink">
                    Sačuvane priče ({stories.length})
                </h3>
                <Button onClick={onNew} disabled={atLimit}>
                    <Plus className="h-5 w-5" aria-hidden="true" />
                    Nova priča
                </Button>
                <Button variant="secondary" onClick={onTemplates} disabled={atLimit}>
                    Počni od primera
                </Button>
            </div>

            {atLimit && <p className="text-sm font-semibold text-ink-soft">{STORY_LIMIT_REACHED}</p>}
            {notice && <Alert tone="success">{notice}</Alert>}
            {listError && <Alert>{listError}</Alert>}

            {stories.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line bg-canvas px-4 py-8 text-center text-sm font-semibold text-ink-soft">
                    Još nema priča. Napišite prvu ili počnite od gotovog primera.
                </p>
            ) : (
                <ul className="divide-y divide-line rounded-2xl border border-line">
                    {stories.map((story) => (
                        <StoryRow
                            key={story.id}
                            story={story}
                            deleting={deletingId === story.id}
                            disabled={deletingId !== null}
                            onEdit={() => onEdit(story)}
                            onDelete={() => onDelete(story)}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

interface StoryRowProps {
    story: CustomStory;
    deleting: boolean;
    disabled: boolean;
    onEdit: () => void;
    onDelete: () => void;
}

function StoryRow({ story, deleting, disabled, onEdit, onDelete }: StoryRowProps) {
    const [confirming, setConfirming] = useState(false);
    const deleteRef = useRef<HTMLButtonElement>(null);
    const title = story.title || "Priča bez naslova";

    const cancel = () => {
        setConfirming(false);
        deleteRef.current?.focus();
    };

    return (
        <li className="p-3">
            <div className="flex flex-wrap items-center gap-3">
                <EmojiTile emoji={story.emoji} />
                <div className="min-w-0 flex-1 basis-40">
                    <p className="break-words text-base font-extrabold leading-snug text-ink">{title}</p>
                    <p className="text-sm font-semibold text-ink-soft">{stepCountLabel(story.steps.length)}</p>
                </div>
                <div className="ml-auto flex gap-2">
                    <Button variant="secondary" onClick={onEdit} disabled={disabled} aria-label={`Izmeni priču „${title}”`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Izmeni
                    </Button>
                    <Button
                        ref={deleteRef}
                        variant="ghost"
                        onClick={() => setConfirming((on) => !on)}
                        disabled={disabled}
                        aria-expanded={confirming}
                        aria-label={`Obriši priču „${title}”`}
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Obriši
                    </Button>
                </div>
            </div>

            {confirming && (
                <div className="mt-3 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 sm:flex-row sm:items-center">
                    <p className="text-sm font-bold text-rose-700 sm:mr-auto">Obrisati ovu priču? Brisanje ne može da se poništi.</p>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                        <Button autoFocus variant="secondary" onClick={cancel} disabled={deleting}>
                            Odustani
                        </Button>
                        <Button variant="danger" onClick={onDelete} isLoading={deleting}>
                            Da, obriši
                        </Button>
                    </div>
                </div>
            )}
        </li>
    );
}

// ── Gotovi primeri ────────────────────────────────────────────────────────────

function TemplateList({ onPick, onBack }: { onPick: (template: CustomStoryInput) => void; onBack: () => void }) {
    const headingRef = useFocusOnMount<HTMLHeadingElement>(true);
    return (
        <div className="space-y-4">
            <div>
                <h3 ref={headingRef} tabIndex={-1} className="text-base font-extrabold text-ink">
                    Počni od primera
                </h3>
                <p className="mt-0.5 text-sm font-medium text-ink-soft">
                    Izaberite primer, pa ga prilagodite detetu: imena, mesta i redosled kakav će zaista biti.
                </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
                {STORY_TEMPLATES.map((template) => (
                    <li key={template.title}>
                        <button
                            type="button"
                            onClick={() => onPick(template)}
                            className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50"
                        >
                            <EmojiTile emoji={template.emoji} />
                            <span className="min-w-0 flex-1">
                                <span className="block break-words text-base font-extrabold leading-snug text-ink">{template.title}</span>
                                <span className="block text-sm font-semibold text-ink-soft">{stepCountLabel(template.steps.length)}</span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
            <Button variant="secondary" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                Nazad na priče
            </Button>
        </div>
    );
}

// ── Pisanje i izmena ──────────────────────────────────────────────────────────

interface StoryEditorProps {
    isNew: boolean;
    draft: Draft;
    setDraft: Dispatch<SetStateAction<Draft>>;
    previewing: boolean;
    onTogglePreview: () => void;
    disabled: boolean;
}

function StoryEditor({ isNew, draft, setDraft, previewing, onTogglePreview, disabled }: StoryEditorProps) {
    const headingRef = useFocusOnMount<HTMLHeadingElement>(true);
    /** Poruka za čitače ekrana posle premeštanja, dodavanja ili uklanjanja koraka */
    const [announcement, setAnnouncement] = useState("");
    const count = draft.steps.length;

    const updateStep = (index: number, patch: Partial<Pick<DraftStep, "text" | "emoji">>) =>
        setDraft((prev) => ({ ...prev, steps: prev.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)) }));

    const moveStep = (index: number, offset: -1 | 1) => {
        const target = index + offset;
        if (target < 0 || target >= count) return;
        setDraft((prev) => {
            const steps = [...prev.steps];
            [steps[index], steps[target]] = [steps[target], steps[index]];
            return { ...prev, steps };
        });
        setAnnouncement(`Korak ${index + 1} je sada korak ${target + 1}.`);
    };

    const removeStep = (index: number) => {
        if (count <= STORY_MIN_STEPS) return;
        setDraft((prev) => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));
        setAnnouncement(`Korak ${index + 1} je uklonjen.`);
    };

    const addStep = () => {
        if (count >= STORY_MAX_STEPS) return;
        setDraft((prev) => ({
            ...prev,
            steps: [...prev.steps, { key: prev.nextKey, text: "", emoji: "" }],
            nextKey: prev.nextKey + 1,
        }));
        setAnnouncement(`Dodat je korak ${count + 1}.`);
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
                <h3 ref={headingRef} tabIndex={-1} className="mr-auto text-base font-extrabold text-ink">
                    {isNew ? "Nova priča" : "Izmena priče"}
                </h3>
                <Button variant="secondary" onClick={onTogglePreview}>
                    {previewing ? <Pencil className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                    {previewing ? "Nazad na pisanje" : "Pregled"}
                </Button>
            </div>

            {previewing ? (
                <StoryPreview draft={draft} />
            ) : (
                <>
                    <aside aria-label="Saveti za pisanje" className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold leading-relaxed text-brand-800">
                        <span className="font-extrabold">Saveti: </span>
                        Pišite kratko i doslovno, u prvom licu i u sadašnjem vremenu („Sedam na stolicu.”). Opišite šta će se desiti, kako to
                        zvuči i izgleda, ko pomaže i da se završava. Najviše jedna rečenica neka bude savet („Ako je preglasno, mogu da pokrijem
                        uši.”). Bez prenesenih značenja i bez „moraš”. Priču pročitajte zajedno malo pre samog događaja.
                    </aside>

                    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-start gap-3">
                        <Input
                            label="Naslov priče"
                            value={draft.title}
                            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                            maxLength={STORY_TITLE_MAX}
                            placeholder="npr. Idemo kod zubara"
                            autoComplete="off"
                            disabled={disabled}
                        />
                        <Input
                            label="Sličica"
                            value={draft.emoji}
                            onChange={(e) => setDraft((prev) => ({ ...prev, emoji: e.target.value }))}
                            maxLength={STORY_EMOJI_MAX_UNITS}
                            placeholder={STORY_FALLBACK_EMOJI}
                            autoComplete="off"
                            disabled={disabled}
                            className="text-center text-xl"
                        />
                    </div>

                    <section aria-label="Koraci priče">
                        <div className="mb-2 flex items-baseline justify-between gap-3">
                            <h4 className="text-sm font-extrabold text-ink">Koraci</h4>
                            <p className="text-xs font-semibold text-ink-faint">
                                {count} od najviše {STORY_MAX_STEPS}
                            </p>
                        </div>
                        <ol className="space-y-3">
                            {draft.steps.map((step, index) => (
                                <StepFields
                                    key={step.key}
                                    step={step}
                                    index={index}
                                    count={count}
                                    disabled={disabled}
                                    onChange={(patch) => updateStep(index, patch)}
                                    onMove={(offset) => moveStep(index, offset)}
                                    onRemove={() => removeStep(index)}
                                />
                            ))}
                        </ol>
                        <Button variant="secondary" block className="mt-3" onClick={addStep} disabled={disabled || count >= STORY_MAX_STEPS}>
                            <Plus className="h-5 w-5" aria-hidden="true" />
                            Dodaj korak
                        </Button>
                        <p aria-live="polite" className="sr-only">
                            {announcement}
                        </p>
                    </section>
                </>
            )}
        </div>
    );
}

const ICON_BUTTON =
    "grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-soft transition-colors hover:bg-brand-50 hover:text-ink disabled:pointer-events-none disabled:opacity-40";

interface StepFieldsProps {
    step: DraftStep;
    index: number;
    count: number;
    disabled: boolean;
    onChange: (patch: Partial<Pick<DraftStep, "text" | "emoji">>) => void;
    onMove: (offset: -1 | 1) => void;
    onRemove: () => void;
}

function StepFields({ step, index, count, disabled, onChange, onMove, onRemove }: StepFieldsProps) {
    const id = useId();
    const number = index + 1;
    return (
        <li className="rounded-2xl border border-line bg-canvas p-3">
            <div className="flex items-center justify-between gap-2">
                <label htmlFor={`${id}-text`} className="text-sm font-extrabold text-ink">
                    Korak {number}
                </label>
                <div className="flex gap-1.5">
                    <button
                        type="button"
                        onClick={() => onMove(-1)}
                        disabled={disabled || index === 0}
                        aria-label={`Pomeri korak ${number} nagore`}
                        title="Pomeri nagore"
                        className={ICON_BUTTON}
                    >
                        <ArrowUp className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onMove(1)}
                        disabled={disabled || index === count - 1}
                        aria-label={`Pomeri korak ${number} nadole`}
                        title="Pomeri nadole"
                        className={ICON_BUTTON}
                    >
                        <ArrowDown className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={disabled || count <= STORY_MIN_STEPS}
                        aria-label={`Ukloni korak ${number}`}
                        title={count <= STORY_MIN_STEPS ? `Priča ima najmanje ${STORY_MIN_STEPS} koraka` : "Ukloni korak"}
                        className={ICON_BUTTON}
                    >
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <Textarea
                id={`${id}-text`}
                value={step.text}
                onChange={(e) => onChange({ text: e.target.value })}
                maxLength={STORY_STEP_TEXT_MAX}
                rows={3}
                placeholder="Jedna ili dve kratke rečenice."
                aria-describedby={`${id}-count`}
                disabled={disabled}
                className="mt-2"
            />

            <div className="mt-2 flex items-center gap-2">
                <label htmlFor={`${id}-emoji`} className="text-sm font-bold text-ink-soft">
                    Sličica
                </label>
                <div className="w-20 shrink-0">
                    <Input
                        id={`${id}-emoji`}
                        aria-label={`Sličica za korak ${number}`}
                        value={step.emoji}
                        onChange={(e) => onChange({ emoji: e.target.value })}
                        maxLength={STORY_EMOJI_MAX_UNITS}
                        placeholder={STORY_FALLBACK_EMOJI}
                        autoComplete="off"
                        disabled={disabled}
                        className="text-center text-xl"
                    />
                </div>
                <p id={`${id}-count`} className="ml-auto text-xs font-semibold text-ink-faint">
                    <span aria-hidden="true">
                        {step.text.length}/{STORY_STEP_TEXT_MAX}
                    </span>
                    <span className="sr-only">
                        {step.text.length} od najviše {STORY_STEP_TEXT_MAX} karaktera
                    </span>
                </p>
            </div>
        </li>
    );
}

// ── Pregled ───────────────────────────────────────────────────────────────────
// Isti prikaz koraka koji vidi dete, sa tekstom kakav je trenutno u formi.

function StoryPreview({ draft }: { draft: Draft }) {
    const [position, setPosition] = useState(0);
    const steps: CustomStoryStep[] = draft.steps
        .map((step) => ({ text: step.text.trim(), emoji: step.emoji.trim() || null }))
        .filter((step) => step.text !== "");

    if (steps.length === 0) {
        return (
            <p className="rounded-2xl border border-dashed border-line bg-canvas px-4 py-8 text-center text-sm font-semibold text-ink-soft">
                Upišite tekst bar jednog koraka da biste videli pregled.
            </p>
        );
    }

    const index = Math.min(position, steps.length - 1);
    return (
        <div className="space-y-3">
            <p className="text-sm font-medium text-ink-soft">
                Ovako dete vidi priču „{draft.title.trim() || "bez naslova"}”: jedan korak na ekranu, uz glas koji ga čita.
            </p>
            <StoryStepView key={index} step={steps[index]} />
            <StoryStepIndicator current={index + 1} total={steps.length} />
            <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => setPosition(index - 1)} disabled={index === 0}>
                    <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                    Nazad
                </Button>
                <Button variant="secondary" onClick={() => setPosition(index + 1)} disabled={index === steps.length - 1}>
                    Dalje
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
}
