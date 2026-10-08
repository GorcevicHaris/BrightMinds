"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, LogOut, Pencil, Play, Plus, Radio, Trash2 } from "lucide-react";
import VisualPinPad from "./VisualPinPad";
import { Alert, Card } from "./ui/Card";
import { Button, buttonClasses } from "./ui/Button";
import { Input, Select, Textarea } from "./ui/Field";
import { Logo } from "./ui/Logo";
import { Modal } from "./ui/Modal";
import { cn } from "@/lib/cn";
import { PIN_LENGTH, pinToItems } from "@/lib/visualPinData";

interface Child {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: "male" | "female" | "other" | null;
    notes: string | null;
    pin_code: string | null;
    streak: number | null;
    experience_points: number | null;
}

interface CurrentUser {
    id: number;
    full_name: string;
    email: string;
    role: string;
}

interface ChildForm {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: "male" | "female" | "other";
    notes: string;
    pin: string[];
}

const EMPTY_FORM: ChildForm = { first_name: "", last_name: "", date_of_birth: "", gender: "male", notes: "", pin: [] };

const ROLE_LABELS: Record<string, string> = {
    parent: "Roditelj",
    teacher: "Učitelj",
    therapist: "Terapeut",
    admin: "Administrator",
};

function ageLabel(dateOfBirth: string): string {
    const birth = new Date(dateOfBirth);
    if (Number.isNaN(birth.getTime())) return "";
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const hadBirthday =
        now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
    if (!hadBirthday) years -= 1;
    if (years < 0) return "";
    const lastDigit = years % 10;
    const lastTwo = years % 100;
    const word = lastDigit === 1 && lastTwo !== 11 ? "godina" : lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? "godine" : "godina";
    return `${years} ${word}`;
}

async function readError(res: Response, fallback: string): Promise<string> {
    try {
        const data = await res.json();
        return typeof data?.error === "string" ? data.error : fallback;
    } catch {
        return fallback;
    }
}

type DashboardResult =
    | { kind: "ok"; user: CurrentUser; children: Child[] }
    | { kind: "unauthorized" }
    | { kind: "error"; message: string };

/** Učitava nalog i decu. Vraća null ako je zahtev prekinut. */
async function fetchDashboard(signal?: AbortSignal): Promise<DashboardResult | null> {
    try {
        const [meRes, childrenRes] = await Promise.all([
            fetch("/api/auth/me", { signal, cache: "no-store" }),
            fetch("/api/children", { signal, cache: "no-store" }),
        ]);
        if ([meRes.status, childrenRes.status].some((status) => status === 401 || status === 403)) {
            return { kind: "unauthorized" };
        }
        if (!meRes.ok || !childrenRes.ok) {
            const failed = !meRes.ok ? meRes : childrenRes;
            return { kind: "error", message: await readError(failed, "Podaci trenutno nisu dostupni.") };
        }
        const me = await meRes.json();
        const list = await childrenRes.json();
        return { kind: "ok", user: me.user, children: Array.isArray(list.children) ? list.children : [] };
    } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return null;
        return { kind: "error", message: "Mrežna greška. Proverite vezu i pokušajte ponovo." };
    }
}

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [children, setChildren] = useState<Child[]>([]);
    const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
    const [loadError, setLoadError] = useState("");

    const [editing, setEditing] = useState<Child | "new" | null>(null);
    const [deleting, setDeleting] = useState<Child | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const applyResult = useCallback(
        (result: DashboardResult | null) => {
            if (!result) return; // zahtev je prekinut
            if (result.kind === "unauthorized") {
                router.replace("/login");
            } else if (result.kind === "error") {
                setLoadError(result.message);
                setLoadState("error");
            } else {
                setUser(result.user);
                setChildren(result.children);
                setLoadState("ready");
            }
        },
        [router]
    );

    useEffect(() => {
        const controller = new AbortController();
        void fetchDashboard(controller.signal).then(applyResult);
        return () => controller.abort();
    }, [applyResult]);

    const retry = () => {
        setLoadState("loading");
        setLoadError("");
        void fetchDashboard().then(applyResult);
    };

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } finally {
            router.replace("/login");
        }
    };

    const handleSaved = (saved: Child) => {
        setChildren((prev) => {
            const exists = prev.some((c) => c.id === saved.id);
            const next = exists ? prev.map((c) => (c.id === saved.id ? { ...c, ...saved } : c)) : [...prev, saved];
            return next.sort((a, b) => a.first_name.localeCompare(b.first_name, "sr"));
        });
        setEditing(null);
    };

    const confirmDelete = async () => {
        if (!deleting || isDeleting) return;
        setIsDeleting(true);
        setDeleteError("");
        try {
            const res = await fetch(`/api/children/${deleting.id}`, { method: "DELETE" });
            if (res.ok) {
                setChildren((prev) => prev.filter((c) => c.id !== deleting.id));
                setDeleting(null);
            } else {
                setDeleteError(await readError(res, "Brisanje nije uspelo. Pokušajte ponovo."));
            }
        } catch {
            setDeleteError("Mrežna greška. Pokušajte ponovo.");
        }
        setIsDeleting(false);
    };

    return (
        <div className="min-h-dvh bg-canvas">
            <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-18 sm:px-6 lg:px-8">
                    <Logo size="sm" />
                    <div className="flex items-center gap-2 sm:gap-4">
                        {user && (
                            <div className="hidden text-right leading-tight sm:block">
                                <p className="text-sm font-extrabold text-ink">{user.full_name}</p>
                                <p className="text-xs font-semibold text-ink-faint">{ROLE_LABELS[user.role] ?? "Nalog"}</p>
                            </div>
                        )}
                        <Button variant="secondary" size="sm" onClick={handleLogout}>
                            <LogOut className="h-4 w-4" aria-hidden="true" />
                            <span className="hidden sm:inline">Odjavi se</span>
                            <span className="sm:hidden">Odjava</span>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
                <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
                            {user ? `Zdravo, ${user.full_name.split(" ")[0]}` : "Moja deca"}
                        </h1>
                        <p className="mt-1 text-base font-semibold text-ink-soft">
                            Pokrenite igru, pratite napredak ili gledajte igru uživo.
                        </p>
                    </div>
                    {loadState === "ready" && children.length > 0 && (
                        <Button size="lg" onClick={() => setEditing("new")}>
                            <Plus className="h-5 w-5" aria-hidden="true" />
                            Dodaj dete
                        </Button>
                    )}
                </div>

                {loadState === "loading" && <ChildrenSkeleton />}

                {loadState === "error" && (
                    <Card className="mx-auto max-w-lg text-center">
                        <p className="text-4xl" aria-hidden="true">🔌</p>
                        <h2 className="mt-3 text-xl font-extrabold text-ink">Ne mogu da učitam podatke</h2>
                        <p className="mt-1 text-sm font-semibold text-ink-soft">{loadError}</p>
                        <Button className="mt-5" onClick={retry}>
                            Pokušaj ponovo
                        </Button>
                    </Card>
                )}

                {loadState === "ready" && children.length === 0 && (
                    <Card className="mx-auto max-w-lg border-2 border-dashed text-center sm:p-10">
                        <p className="text-5xl" aria-hidden="true">🧒</p>
                        <h2 className="mt-4 text-xl font-extrabold text-ink sm:text-2xl">Dodajte prvo dete</h2>
                        <p className="mx-auto mt-2 max-w-sm text-base font-semibold text-ink-soft">
                            Napravite profil i izaberite četiri sličice — to je tajni kod kojim se dete samo prijavljuje.
                        </p>
                        <Button size="lg" className="mt-6" onClick={() => setEditing("new")}>
                            <Plus className="h-5 w-5" aria-hidden="true" />
                            Dodaj dete
                        </Button>
                    </Card>
                )}

                {loadState === "ready" && children.length > 0 && (
                    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {children.map((child) => (
                            <li key={child.id}>
                                <ChildCard child={child} onEdit={() => setEditing(child)} onDelete={() => { setDeleteError(""); setDeleting(child); }} />
                            </li>
                        ))}
                    </ul>
                )}
            </main>

            {editing && (
                <ChildFormModal
                    child={editing === "new" ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={handleSaved}
                />
            )}

            <Modal
                open={deleting !== null}
                onClose={() => !isDeleting && setDeleting(null)}
                size="sm"
                title="Obrisati profil?"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleting(null)} disabled={isDeleting}>
                            Odustani
                        </Button>
                        <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting}>
                            Obriši profil
                        </Button>
                    </>
                }
            >
                <p className="text-base font-semibold text-ink-soft">
                    Profil <strong className="text-ink">{deleting?.first_name} {deleting?.last_name}</strong> i sav zabeleženi
                    napredak biće trajno obrisani. Ovo se ne može poništiti.
                </p>
                {deleteError && <Alert className="mt-4">{deleteError}</Alert>}
            </Modal>
        </div>
    );
}

// ── Kartica deteta ────────────────────────────────────────────────────────────

function ChildCard({ child, onEdit, onDelete }: { child: Child; onEdit: () => void; onDelete: () => void }) {
    const pinItems = pinToItems(child.pin_code);
    const hasPin = pinItems.length === PIN_LENGTH && pinItems.every(Boolean);
    const age = ageLabel(child.date_of_birth);
    const isGirl = child.gender === "female";

    return (
        <Card className="flex h-full flex-col transition-shadow hover:shadow-lift">
            <div className="flex items-start gap-4">
                <span
                    className={cn(
                        "grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl",
                        isGirl ? "bg-pink-100" : child.gender === "male" ? "bg-sky-100" : "bg-brand-100"
                    )}
                    aria-hidden="true"
                >
                    {isGirl ? "👧" : child.gender === "male" ? "👦" : "🧒"}
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-extrabold text-ink sm:text-xl">
                        {child.first_name} {child.last_name}
                    </h2>
                    <p className="text-sm font-semibold text-ink-soft">{age || "—"}</p>
                </div>
                <div className="-mr-2 -mt-1 flex shrink-0">
                    <button
                        type="button"
                        onClick={onEdit}
                        aria-label={`Izmeni profil: ${child.first_name}`}
                        className="grid h-10 w-10 place-items-center rounded-xl text-ink-faint transition-colors hover:bg-brand-50 hover:text-brand-700"
                    >
                        <Pencil className="h-[18px] w-[18px]" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        aria-label={`Obriši profil: ${child.first_name}`}
                        className="grid h-10 w-10 place-items-center rounded-xl text-ink-faint transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                        <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-sun-50 px-3 py-2.5">
                    <dt className="text-xs font-bold text-sun-700">Poeni</dt>
                    <dd className="text-lg font-extrabold text-ink">⭐ {child.experience_points ?? 0}</dd>
                </div>
                <div className="rounded-xl bg-orange-50 px-3 py-2.5">
                    <dt className="text-xs font-bold text-orange-700">Dana zaredom</dt>
                    <dd className="text-lg font-extrabold text-ink">🔥 {child.streak ?? 0}</dd>
                </div>
            </dl>

            <div className="mt-3 flex min-h-14 items-center gap-2 rounded-xl border border-line px-3 py-2">
                <span className="text-xs font-bold text-ink-soft">Tajni kod</span>
                {hasPin ? (
                    <span className="ml-auto flex gap-1.5">
                        {pinItems.map((item, idx) =>
                            item ? (
                                <Image
                                    key={idx}
                                    src={item.image}
                                    alt={item.name}
                                    title={item.name}
                                    width={36}
                                    height={36}
                                    sizes="36px"
                                    className="h-9 w-9 rounded-lg object-cover ring-1 ring-line"
                                />
                            ) : null
                        )}
                    </span>
                ) : (
                    <button
                        type="button"
                        onClick={onEdit}
                        className="ml-auto rounded-lg bg-sun-100 px-2.5 py-1.5 text-xs font-extrabold text-sun-700 hover:bg-sun-200"
                    >
                        Nije postavljen — dodaj
                    </button>
                )}
            </div>

            {child.notes && <p className="mt-3 line-clamp-2 text-sm font-medium text-ink-soft">{child.notes}</p>}

            <div className="mt-auto pt-5">
                <Link href={`/dashboard/child/${child.id}`} className={buttonClasses({ size: "lg", block: true })}>
                    <Play className="h-5 w-5" aria-hidden="true" />
                    Pokreni igre
                </Link>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                    <Link href={`/dashboard/progress/${child.id}`} className={buttonClasses({ variant: "secondary" })}>
                        <BarChart3 className="h-4 w-4" aria-hidden="true" />
                        Statistika
                    </Link>
                    <Link href={`/dashboard/monitor/${child.id}`} className={buttonClasses({ variant: "secondary" })}>
                        <Radio className="h-4 w-4" aria-hidden="true" />
                        Uživo
                    </Link>
                </div>
            </div>
        </Card>
    );
}

function ChildrenSkeleton() {
    return (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Učitavanje">
            {[0, 1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-brand-100" />
                        <div className="flex-1 space-y-2">
                            <div className="h-5 w-2/3 rounded bg-brand-100" />
                            <div className="h-4 w-1/3 rounded bg-brand-50" />
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="h-16 rounded-xl bg-brand-50" />
                        <div className="h-16 rounded-xl bg-brand-50" />
                    </div>
                    <div className="mt-5 h-13 rounded-2xl bg-brand-100" />
                </Card>
            ))}
        </div>
    );
}

// ── Forma: dodaj / izmeni dete ────────────────────────────────────────────────

interface ChildFormModalProps {
    child: Child | null;
    onClose: () => void;
    onSaved: (child: Child) => void;
}

type FormErrors = Partial<Record<"first_name" | "last_name" | "date_of_birth", string>>;

function ChildFormModal({ child, onClose, onSaved }: ChildFormModalProps) {
    const [form, setForm] = useState<ChildForm>(() =>
        child
            ? {
                  first_name: child.first_name,
                  last_name: child.last_name,
                  date_of_birth: child.date_of_birth?.split("T")[0] ?? "",
                  gender: child.gender ?? "other",
                  notes: child.notes ?? "",
                  pin: child.pin_code ? child.pin_code.split(",") : [],
              }
            : EMPTY_FORM
    );
    const [errors, setErrors] = useState<FormErrors>({});
    const [serverError, setServerError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [pickingPin, setPickingPin] = useState(false);
    const [draftPin, setDraftPin] = useState<string[]>([]);

    const today = new Date().toISOString().split("T")[0];
    const pinItems = pinToItems(form.pin.join(","));
    const hasPin = form.pin.length === PIN_LENGTH;

    const update = <K extends keyof ChildForm>(key: K, value: ChildForm[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    const validate = (): FormErrors => {
        const found: FormErrors = {};
        if (!form.first_name.trim()) found.first_name = "Unesite ime";
        if (!form.last_name.trim()) found.last_name = "Unesite prezime";
        if (!form.date_of_birth) found.date_of_birth = "Izaberite datum rođenja";
        else if (form.date_of_birth > today) found.date_of_birth = "Datum ne može biti u budućnosti";
        return found;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        const found = validate();
        setErrors(found);
        setServerError("");
        if (Object.keys(found).length > 0) return;

        setIsSaving(true);
        try {
            const res = await fetch(child ? `/api/children/${child.id}` : "/api/children", {
                method: child ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    first_name: form.first_name.trim(),
                    last_name: form.last_name.trim(),
                    date_of_birth: form.date_of_birth,
                    gender: form.gender,
                    notes: form.notes.trim() || null,
                    pin_code: hasPin ? form.pin.join(",") : null,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                onSaved(data.child);
                return;
            }
            setServerError(await readError(res, "Čuvanje nije uspelo. Pokušajte ponovo."));
        } catch {
            setServerError("Mrežna greška. Pokušajte ponovo.");
        }
        setIsSaving(false);
    };

    // Drugi korak u istom prozoru: izbor sličica za PIN
    if (pickingPin) {
        const draftComplete = draftPin.length === PIN_LENGTH;
        return (
            <Modal
                open
                onClose={() => setPickingPin(false)}
                title="Tajni kod deteta"
                description="Izaberite po jednu sličicu iz svake grupe. Dete ih bira istim redom pri prijavi."
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setPickingPin(false)}>
                            Nazad
                        </Button>
                        <Button
                            disabled={!draftComplete}
                            onClick={() => {
                                update("pin", draftPin);
                                setPickingPin(false);
                            }}
                        >
                            Sačuvaj kod
                        </Button>
                    </>
                }
            >
                <VisualPinPad value={draftPin} onChange={setDraftPin} />
                {draftComplete && (
                    <p className="mt-2 text-center text-base font-extrabold text-emerald-600">Kod je spreman ✓</p>
                )}
            </Modal>
        );
    }

    return (
        <Modal
            open
            onClose={() => !isSaving && onClose()}
            title={child ? "Izmena profila" : "Novo dete"}
            description="Osnovni podaci i tajni kod za prijavu."
        >
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {serverError && <Alert>{serverError}</Alert>}

                <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                        label="Ime"
                        placeholder="npr. Marko"
                        value={form.first_name}
                        onChange={(e) => update("first_name", e.target.value)}
                        error={errors.first_name}
                        maxLength={60}
                        autoComplete="off"
                    />
                    <Input
                        label="Prezime"
                        placeholder="npr. Marković"
                        value={form.last_name}
                        onChange={(e) => update("last_name", e.target.value)}
                        error={errors.last_name}
                        maxLength={60}
                        autoComplete="off"
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                        label="Datum rođenja"
                        type="date"
                        max={today}
                        value={form.date_of_birth}
                        onChange={(e) => update("date_of_birth", e.target.value)}
                        error={errors.date_of_birth}
                    />
                    <Select
                        label="Pol"
                        hint="Određuje glas i obraćanje u igrama."
                        value={form.gender}
                        onChange={(e) => update("gender", e.target.value as ChildForm["gender"])}
                    >
                        <option value="male">Dečak</option>
                        <option value="female">Devojčica</option>
                        <option value="other">Ne želim da navedem</option>
                    </Select>
                </div>

                <Textarea
                    label="Napomena"
                    optional
                    rows={3}
                    maxLength={500}
                    placeholder="Interesovanja, osetljivosti, šta dete voli…"
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                />

                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-ink">Tajni kod (4 sličice)</p>
                            <p className="text-sm font-medium text-ink-soft">Dete se ovim kodom samo prijavljuje.</p>
                        </div>
                        {hasPin && (
                            <div className="flex gap-1.5">
                                {pinItems.map((item, idx) =>
                                    item ? (
                                        <Image
                                            key={idx}
                                            src={item.image}
                                            alt={item.name}
                                            title={item.name}
                                            width={44}
                                            height={44}
                                            sizes="44px"
                                            className="h-11 w-11 rounded-xl object-cover ring-2 ring-white"
                                        />
                                    ) : null
                                )}
                            </div>
                        )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                            variant={hasPin ? "secondary" : "primary"}
                            size="sm"
                            onClick={() => {
                                setDraftPin([]);
                                setPickingPin(true);
                            }}
                        >
                            {hasPin ? "Promeni kod" : "Izaberi sličice"}
                        </Button>
                        {hasPin && (
                            <Button variant="ghost" size="sm" onClick={() => update("pin", [])}>
                                Ukloni kod
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>
                        Odustani
                    </Button>
                    <Button type="submit" isLoading={isSaving}>
                        {child ? "Sačuvaj izmene" : "Dodaj dete"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
