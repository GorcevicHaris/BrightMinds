// app/dashboard/monitor/[id]/page.tsx
import type { Metadata } from "next";
import LiveMonitor from "@/app/components/LiveMonitor";
import { ChildPageShell, loadOwnedChild } from "../../_shared/childPage";

export const metadata: Metadata = { title: "Praćenje uživo" };

export default async function MonitorPage({ params }: { params: Promise<{ id: string }> }) {
    // Preusmerava na /login (bez sesije) ili /dashboard (neispravan ID, tuđe dete)
    const child = await loadOwnedChild((await params).id);

    return (
        <ChildPageShell
            child={child}
            view="monitor"
            title="Praćenje uživo"
            description="Gledajte igru zajedno sa detetom: isti ekran, u istom trenutku."
        >
            <LiveMonitor childId={child.id} childName={child.firstName} />
        </ChildPageShell>
    );
}
