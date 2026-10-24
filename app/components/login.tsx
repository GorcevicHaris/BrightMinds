"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import AuthShell from "./AuthShell";
import VisualPinPad from "./VisualPinPad";
import { Alert, Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Input } from "./ui/Field";
import { cn } from "@/lib/cn";
import { PIN_LENGTH, VISUAL_PIN_CATEGORIES } from "@/lib/visualPinData";
import { SpeakButton } from "@/app/components/games/kit";
import { speak } from "@/lib/speech";

type LoginMode = "child" | "parent";

const MODES: { id: LoginMode; label: string; icon: string }[] = [
    { id: "child", label: "Ja sam dete", icon: "🧒" },
    { id: "parent", label: "Roditelj / Učitelj", icon: "👩‍🏫" },
];

async function readError(res: Response, fallback: string): Promise<string> {
    try {
        const data = await res.json();
        return typeof data?.error === "string" ? data.error : fallback;
    } catch {
        return fallback;
    }
}

export default function LoginPage() {
    const [mode, setMode] = useState<LoginMode>("child");

    return (
        <AuthShell>
            {/* Izbor: dete ili odrasli */}
            <div role="tablist" aria-label="Ko se prijavljuje" className="mb-5 grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-surface p-1.5 shadow-soft">
                {MODES.map((m) => (
                    <button
                        key={m.id}
                        role="tab"
                        type="button"
                        id={`tab-${m.id}`}
                        aria-selected={mode === m.id}
                        aria-controls={`panel-${m.id}`}
                        onClick={() => setMode(m.id)}
                        className={cn(
                            // Na uskom ekranu ikonica stoji iznad naziva, pa se „Roditelj / Učitelj” ne lomi u dva reda
                            "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-sm font-extrabold leading-tight transition-colors min-[400px]:flex-row min-[400px]:gap-2 sm:text-base",
                            mode === m.id
                                ? m.id === "child"
                                    ? "bg-sun-400 text-ink"
                                    : "bg-brand-600 text-white"
                                : "text-ink-soft hover:bg-brand-50"
                        )}
                    >
                        <span className="text-xl sm:text-2xl" aria-hidden="true">{m.icon}</span>
                        {m.label}
                    </button>
                ))}
            </div>

            <Card className="animate-fade-up p-5 sm:p-8" role="tabpanel" id={`panel-${mode}`} aria-labelledby={`tab-${mode}`} key={mode}>
                {mode === "child" ? <ChildLogin /> : <ParentLogin />}
            </Card>
        </AuthShell>
    );
}

// ── Dete: vizuelni PIN ────────────────────────────────────────────────────────

function ChildLogin() {
    const router = useRouter();
    const [pin, setPin] = useState<string[]>([]);
    const [status, setStatus] = useState<"idle" | "checking" | "error" | "success">("idle");
    const [message, setMessage] = useState("");
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (resetTimer.current) clearTimeout(resetTimer.current);
    }, []);

    const cancelReset = () => {
        if (resetTimer.current) clearTimeout(resetTimer.current);
        resetTimer.current = null;
    };

    const verify = useCallback(
        async (code: string[]) => {
            setStatus("checking");
            setMessage("");
            try {
                const res = await fetch("/api/children/verify-pin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pin_code: code.join(",") }),
                });
                if (res.ok) {
                    const data = await res.json();
                    setStatus("success");
                    router.push(`/dashboard/child/${data.child.id}`);
                    return;
                }
                setMessage(await readError(res, "Kod nije tačan. Probaj ponovo."));
            } catch {
                setMessage("Nema veze sa internetom. Probaj ponovo.");
            }
            setStatus("error");
            if (resetTimer.current) clearTimeout(resetTimer.current);
            resetTimer.current = setTimeout(() => {
                resetTimer.current = null;
                setPin([]);
                setStatus("idle");
            }, 1600);
        },
        [router]
    );

    const handleChange = (next: string[]) => {
        if (status === "checking" || status === "success") return;
        cancelReset();
        // Posle pogrešnog koda novi dodir počinje novi kod (stari se ne dopunjava)
        if (status === "error" && next.length > pin.length) next = next.slice(-1);
        setPin(next);
        setStatus("idle");
        setMessage("");
        if (next.length === PIN_LENGTH) {
            void verify(next);
            return;
        }
        // Glas kaže samo šta je sledeće — nikad koja je sličica izabrana (kod je tajna)
        if (next.length > pin.length) void speak(`Sada izaberi ${VISUAL_PIN_CATEGORIES[next.length].prompt}.`);
    };

    // Dete koje ne čita čuje uputstvo kad dodirne zvučnik (pregledač ne pušta glas pre prvog dodira)
    const sayInstructions = () =>
        void speak(`${pin.length === 0 ? "Prvo" : "Sada"} izaberi ${VISUAL_PIN_CATEGORIES[Math.min(pin.length, PIN_LENGTH - 1)].prompt}.`);

    return (
        <div>
            <div className="mb-5 flex items-center justify-center gap-3 text-center">
                <div>
                    <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">Tvoj tajni kod</h1>
                    <p className="mt-1 text-base font-semibold text-ink-soft">Dodirni svoje četiri sličice</p>
                </div>
                <SpeakButton onClick={sayInstructions} label="Slušaj" />
            </div>

            <VisualPinPad value={pin} onChange={handleChange} status={status === "success" ? "checking" : status} />

            <div className="mt-1 flex min-h-12 items-center justify-center" aria-live="polite">
                {status === "checking" && (
                    <p className="text-base font-extrabold text-brand-600">Proveravam kod…</p>
                )}
                {status === "success" && <p className="text-base font-extrabold text-emerald-600">Bravo! Ulazimo… 🎉</p>}
                {status === "error" && message && (
                    <p className="rounded-xl bg-sun-100 px-4 py-2 text-base font-extrabold text-sun-700">{message}</p>
                )}
            </div>
        </div>
    );
}

// ── Roditelj / učitelj: email i lozinka ───────────────────────────────────────

function ParentLogin() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        setError("");
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            if (res.ok) {
                router.push("/dashboard");
                return;
            }
            setError(await readError(res, "Pogrešan email ili lozinka"));
        } catch {
            setError("Mrežna greška. Pokušajte ponovo.");
        }
        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} noValidate>
            <div className="mb-6 text-center">
                <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">Dobro došli nazad</h1>
                <p className="mt-1 text-base font-semibold text-ink-soft">Prijavite se da vidite napredak deteta</p>
            </div>

            {error && <Alert className="mb-5">{error}</Alert>}

            <div className="space-y-4">
                <Input
                    label="Email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="vas@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    icon={<Mail className="h-5 w-5" aria-hidden="true" />}
                />
                <Input
                    label="Lozinka"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Vaša lozinka"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    icon={<Lock className="h-5 w-5" aria-hidden="true" />}
                    trailing={
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
                            aria-pressed={showPassword}
                            className="-mr-1.5 grid h-11 w-11 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-brand-50 hover:text-ink"
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    }
                />
            </div>

            <Button type="submit" size="lg" block className="mt-6" isLoading={isLoading} disabled={!email || !password}>
                {isLoading ? "Prijavljivanje…" : "Prijavi se"}
            </Button>

            <p className="mt-6 text-center text-sm font-semibold text-ink-soft">
                Nemate nalog?{" "}
                <Link href="/register" className="-my-3 inline-block py-3 font-extrabold text-brand-600 underline-offset-4 hover:underline">
                    Registrujte se
                </Link>
            </p>
        </form>
    );
}
