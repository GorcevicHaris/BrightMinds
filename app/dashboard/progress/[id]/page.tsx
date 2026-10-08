// app/dashboard/progress/[id]/page.tsx
import type { Metadata } from "next";
import ProgressDashboard from "@/app/components/ProgressDashboard";
import { ChildPageShell, loadOwnedChild } from "../../_shared/childPage";

export const metadata: Metadata = { title: "Statistika" };

export default async function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
    // Preusmerava na /login (bez sesije) ili /dashboard (neispravan ID, tuđe dete)
    const child = await loadOwnedChild((await params).id);

    return (
        <ChildPageShell
            child={child}
            view="progress"
            title="Statistika"
            description="Aktivnost po danima, samostalnost i savladanost po igrama i predlozi za vežbu van ekrana."
        >
            <ProgressDashboard childId={child.id} childName={child.firstName} />
        </ChildPageShell>
    );
}
