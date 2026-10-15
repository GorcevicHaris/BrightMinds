// app/dashboard/child/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError, requireChildAccess } from "@/lib/auth";
import { resolveSettings, type ResolvedSettings } from "@/lib/childSettings";
import { realtimeTopicFor } from "@/lib/realtimeTopic";
import { supabaseAdmin } from "@/lib/supabase";
import { buttonClasses } from "@/app/components/ui/Button";
import ChildPageClient from "./ChildPageClient";

export const metadata: Metadata = { title: "Igre" };

export interface ChildProfile {
    id: number;
    first_name: string;
    last_name: string;
    gender: string | null;
    experience_points: number | null;
}

/** Red iz baze; `settings` postoji tek posle migracije 0002. */
interface ChildRow extends ChildProfile {
    date_of_birth?: string | null;
    settings?: unknown;
}

function Problem({ title, text }: { title: string; text: string }) {
    return (
        <main className="grid min-h-dvh place-items-center bg-canvas p-4">
            <div className="w-full max-w-md rounded-card border border-line bg-surface p-8 text-center shadow-soft">
                <p className="text-5xl" aria-hidden="true">🧭</p>
                <h1 className="mt-4 text-2xl font-extrabold text-ink">{title}</h1>
                <p className="mt-2 text-base font-semibold text-ink-soft">{text}</p>
                <Link href="/login" className={buttonClasses({ size: "lg", className: "mt-6" })}>
                    Nazad na prijavu
                </Link>
            </div>
        </main>
    );
}

export default async function ChildPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const childId = Number(id);

    // Pristup ima samo roditelj ovog deteta ili dete prijavljeno svojim kodom
    let viewer: "child" | "parent";
    try {
        const session = await requireChildAccess(childId);
        viewer = session.childId ? "child" : "parent";
    } catch (error) {
        if (error instanceof AuthError && error.status === 401) redirect("/login");
        if (error instanceof AuthError) {
            return <Problem title="Nemaš pristup" text="Ovaj profil ne postoji ili ne pripada tvom nalogu." />;
        }
        return <Problem title="Nešto nije u redu" text="Podaci trenutno nisu dostupni. Pokušaj ponovo malo kasnije." />;
    }

    let child: ChildProfile | null = null;
    let settings: ResolvedSettings = resolveSettings(null, null);
    try {
        // select("*") da upit radi i pre migracije koja dodaje kolonu `settings`
        const { data } = await supabaseAdmin.from("children").select("*").eq("id", childId).maybeSingle();
        const row = data as ChildRow | null;
        if (row) {
            child = {
                id: row.id,
                first_name: row.first_name,
                last_name: row.last_name,
                gender: row.gender ?? null,
                experience_points: row.experience_points ?? null,
            };
            settings = resolveSettings(row.settings, row.date_of_birth);
        }
    } catch {
        child = null;
    }

    if (!child) {
        return <Problem title="Profil nije pronađen" text="Ovaj profil ne postoji ili je obrisan." />;
    }

    return <ChildPageClient child={child} viewer={viewer} settings={settings} realtimeTopic={realtimeTopicFor(child.id)} />;
}
