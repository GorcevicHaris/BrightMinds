// app/dashboard/_shared/childPage.tsx
// Zajednički deo roditeljskih stranica o jednom detetu ("Statistika" i "Uživo"):
// provera pristupa + učitavanje deteta i isto zaglavlje sa prelazom između prikaza.
// (Fascikla počinje sa "_" pa je Next.js ne tretira kao rutu.)
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BarChart3, Radio } from "lucide-react";
import { buttonClasses } from "@/app/components/ui/Button";
import { Logo } from "@/app/components/ui/Logo";
import { AuthError, requireChildOwner } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { supabaseAdmin } from "@/lib/supabase";

/** Samo ime: prezime se na ovim stranicama ne prikazuje, pa se i ne učitava. */
export interface OwnedChild {
    id: number;
    firstName: string;
}

/**
 * Dete iz parametra putanje, samo ako pripada prijavljenom roditelju/terapeutu.
 * Neprijavljen korisnik ide na /login; neispravan ID, tuđe dete, dečja sesija
 * ili nepostojeće dete vraćaju na /dashboard.
 */
export async function loadOwnedChild(idParam: string): Promise<OwnedChild> {
    const childId = /^[1-9]\d{0,14}$/.test(idParam) ? Number(idParam) : Number.NaN;
    if (Number.isNaN(childId)) redirect("/dashboard");

    try {
        await requireChildOwner(childId);
    } catch (error) {
        if (error instanceof AuthError) redirect(error.status === 401 ? "/login" : "/dashboard");
        throw error;
    }

    const { data } = await supabaseAdmin.from("children").select("first_name").eq("id", childId).maybeSingle();
    const firstName = typeof data?.first_name === "string" ? data.first_name.trim() : "";
    if (!firstName) redirect("/dashboard");

    return { id: childId, firstName };
}

type ChildView = "progress" | "monitor";

const VIEWS = [
    { id: "progress", label: "Statistika", path: "progress", Icon: BarChart3 },
    { id: "monitor", label: "Uživo", path: "monitor", Icon: Radio },
] as const satisfies readonly { id: ChildView; label: string; path: string; Icon: typeof BarChart3 }[];

interface ChildPageShellProps {
    child: OwnedChild;
    /** Koji od dva prikaza je trenutno otvoren */
    view: ChildView;
    /** Naziv stranice iznad imena deteta */
    title: string;
    description: string;
    children: ReactNode;
}

export function ChildPageShell({ child, view, title, description, children }: ChildPageShellProps) {
    return (
        <div className="min-h-dvh bg-canvas">
            <header className="border-b border-line bg-surface">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                    <Link
                        href="/dashboard"
                        aria-label="Nazad na spisak dece"
                        className={buttonClasses({ variant: "secondary", size: "sm", className: "shrink-0 whitespace-nowrap" })}
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Nazad
                    </Link>
                    <Logo size="sm" className="shrink-0 whitespace-nowrap" />
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="break-words text-2xl font-extrabold text-ink sm:text-3xl">
                            <span className="mb-1 block font-sans text-sm font-bold tracking-normal text-brand-700">{title}</span>
                            {child.firstName}
                        </h1>
                        <p className="mt-1 text-sm text-ink-soft">{description}</p>
                    </div>

                    <nav aria-label="Prikazi za ovo dete" className="inline-flex shrink-0 self-start rounded-xl border border-line bg-surface p-1 sm:self-auto">
                        {VIEWS.map(({ id, label, path, Icon }) => (
                            <Link
                                key={id}
                                href={`/dashboard/${path}/${child.id}`}
                                aria-current={id === view ? "page" : undefined}
                                className={cn(
                                    "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-extrabold transition-colors",
                                    id === view ? "bg-brand-600 text-white" : "text-ink-soft hover:bg-brand-50 hover:text-ink"
                                )}
                            >
                                <Icon className="h-4 w-4" aria-hidden="true" />
                                {label}
                            </Link>
                        ))}
                    </nav>
                </div>

                {children}
            </main>
        </div>
    );
}
