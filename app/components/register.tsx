"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import AuthShell from "./AuthShell";
import { Alert, Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Input, Select } from "./ui/Field";

interface FormState {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    role: "parent" | "teacher" | "therapist";
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

const MIN_PASSWORD = 8;

function validate(form: FormState): FieldErrors {
    const errors: FieldErrors = {};
    if (form.fullName.trim().length < 2) errors.fullName = "Unesite ime i prezime";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Unesite ispravan email";
    if (form.password.length < MIN_PASSWORD) errors.password = `Lozinka mora imati najmanje ${MIN_PASSWORD} znakova`;
    return errors;
}

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState<FormState>({ fullName: "", email: "", password: "", phone: "", role: "parent" });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [serverError, setServerError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        const found = validate(form);
        setErrors(found);
        setServerError("");
        if (Object.keys(found).length > 0) return;

        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: form.email.trim(),
                    password: form.password,
                    full_name: form.fullName.trim(),
                    phone: form.phone.trim() || undefined,
                    role: form.role,
                }),
            });
            if (res.ok) {
                // Registracija odmah prijavljuje korisnika (kolačić sesije)
                router.push("/dashboard");
                return;
            }
            const data = await res.json().catch(() => null);
            setServerError(typeof data?.error === "string" ? data.error : "Registracija nije uspela. Pokušajte ponovo.");
        } catch {
            setServerError("Mrežna greška. Pokušajte ponovo.");
        }
        setIsLoading(false);
    };

    return (
        <AuthShell>
            <Card className="animate-fade-up p-5 sm:p-8">
                <form onSubmit={handleSubmit} noValidate>
                    <div className="mb-6 text-center">
                        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">Napravite nalog</h1>
                        <p className="mt-1 text-base font-semibold text-ink-soft">Za roditelje, učitelje i terapeute</p>
                    </div>

                    {serverError && <Alert className="mb-5">{serverError}</Alert>}

                    <div className="space-y-4">
                        <Input
                            label="Ime i prezime"
                            name="fullName"
                            autoComplete="name"
                            placeholder="npr. Ana Petrović"
                            value={form.fullName}
                            onChange={(e) => update("fullName", e.target.value)}
                            error={errors.fullName}
                            disabled={isLoading}
                            icon={<User className="h-5 w-5" aria-hidden="true" />}
                        />
                        <Input
                            label="Email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            inputMode="email"
                            placeholder="vas@email.com"
                            value={form.email}
                            onChange={(e) => update("email", e.target.value)}
                            error={errors.email}
                            disabled={isLoading}
                            icon={<Mail className="h-5 w-5" aria-hidden="true" />}
                        />
                        <Input
                            label="Lozinka"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            autoComplete="new-password"
                            placeholder={`Najmanje ${MIN_PASSWORD} znakova`}
                            value={form.password}
                            onChange={(e) => update("password", e.target.value)}
                            error={errors.password}
                            disabled={isLoading}
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
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                                label="Telefon"
                                optional
                                type="tel"
                                name="phone"
                                autoComplete="tel"
                                inputMode="tel"
                                placeholder="+381 60 123 4567"
                                value={form.phone}
                                onChange={(e) => update("phone", e.target.value)}
                                disabled={isLoading}
                                icon={<Phone className="h-5 w-5" aria-hidden="true" />}
                            />
                            <Select
                                label="Uloga"
                                name="role"
                                value={form.role}
                                onChange={(e) => update("role", e.target.value as FormState["role"])}
                                disabled={isLoading}
                            >
                                <option value="parent">Roditelj</option>
                                <option value="teacher">Učitelj / nastavnik</option>
                                <option value="therapist">Terapeut</option>
                            </Select>
                        </div>
                    </div>

                    <Button type="submit" size="lg" block className="mt-6" isLoading={isLoading}>
                        {isLoading ? "Pravim nalog…" : "Registruj se"}
                    </Button>

                    <p className="mt-6 text-center text-sm font-semibold text-ink-soft">
                        Već imate nalog?{" "}
                        <Link href="/login" className="-my-3 inline-block py-3 font-extrabold text-brand-600 underline-offset-4 hover:underline">
                            Prijavite se
                        </Link>
                    </p>
                </form>
            </Card>
        </AuthShell>
    );
}
