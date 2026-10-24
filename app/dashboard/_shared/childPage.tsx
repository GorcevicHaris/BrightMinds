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
import { cn } from "@/lib/cn";
import { supabaseAdmin } from "@/lib/supabase";
import { ownerPageAccess } from "./access";

/** Ime i pol (zbog oblika reči u igrama); prezime se na ovim stranicama ne prikazuje, pa se i ne učitava. */
export interface OwnedChild {
    id: number;
    firstName: string;
    gender?: string;
}

/**
 * Dete iz parametra putanje, samo ako pripada prijavljenom roditelju/terapeutu.
 * Neprijavljen korisnik ide na /login; neispravan ID, tuđe dete, dečja sesija
 * ili nepostojeće dete vraćaju na /dashboard.
 */
export async function loadOwnedChild(idParam: string): Promise<OwnedChild> {
    const access = await ownerPageAccess(idParam);
    if (access.kind === "login") redirect("/login");
    if (access.kind === "unavailable") throw new Error("Podaci o detetu trenutno nisu dostupni");
    if (access.kind !== "ok") redirect("/dashboard");
    const childId = access.childId;

    const { data } = await supabaseAdmin.from("children").select("first_name, gender").eq("id", childId).maybeSingle();
    const firstName = typeof data?.first_name === "string" ? data.first_name.trim() : "";
    if (!firstName) redirect("/dashboard");

    // Ime uvek velikim početnim slovom („dina” → „Dina”), u naslovu i u tekstovima stranice
    return { id: childId, firstName: displayName(firstName), gender: typeof data?.gender === "string" ? data.gender : undefined };
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

/** Ime kako je upisano, ali uvek velikim početnim slovom („dina” → „Dina”) */
function displayName(name: string): string {
    return name.charAt(0).toLocaleUpperCase("sr") + name.slice(1);
}

function ViewSwitch({ child, view, className }: { child: OwnedChild; view: ChildView; className?: string }) {
    return (
        <nav aria-label="Prikazi za ovo dete" className={cn("grid grid-cols-2 gap-1 rounded-2xl bg-canvas p-1 ring-1 ring-line", className)}>
            {VIEWS.map(({ id, label, path, Icon }) => (
                <Link
                    key={id}
                    href={`/dashboard/${path}/${child.id}`}
                    aria-current={id === view ? "page" : undefined}
                    className={cn(
                        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition-colors",
                        id === view ? "bg-surface text-brand-700 shadow-soft" : "text-ink-soft hover:text-ink"
                    )}
                >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                </Link>
            ))}
        </nav>
    );
}

export function ChildPageShell({ child, view, title, description, children }: ChildPageShellProps) {
    const name = child.firstName;
    const isGirl = child.gender === "female";
    return (
        <div className="min-h-dvh bg-canvas">
            <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-10">
                    <Link
                        href="/dashboard"
                        aria-label="Nazad na spisak dece"
                        className={buttonClasses({ variant: "ghost", size: "sm", className: "-ml-2 shrink-0 whitespace-nowrap" })}
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Moja deca
                    </Link>
                    <span className="h-6 w-px bg-line" aria-hidden="true" />
                    <Logo size="sm" className="shrink-0 whitespace-nowrap" />
                    <ViewSwitch child={child} view={view} className="ml-auto hidden w-64 md:grid" />
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
                <div className="mb-6 flex items-center gap-4 sm:mb-8">
                    <span
                        className={cn(
                            "grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl sm:h-16 sm:w-16 sm:text-4xl",
                            isGirl ? "bg-pink-50" : child.gender === "male" ? "bg-sky-50" : "bg-brand-50"
                        )}
                        aria-hidden="true"
                    >
                        {isGirl ? "👧" : child.gender === "male" ? "👦" : "🧒"}
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-extrabold text-brand-700">{title}</p>
                        <h1 className="break-words text-2xl font-extrabold leading-tight text-ink sm:text-3xl">{name}</h1>
                        <p className="mt-0.5 hidden text-sm font-medium text-ink-soft sm:block">{description}</p>
                    </div>
                </div>
                <ViewSwitch child={child} view={view} className="mb-6 md:hidden" />

                {children}
            </main>
        </div>
    );
}
