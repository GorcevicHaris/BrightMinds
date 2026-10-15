// Probni prikaz praćenja uživo (bez baze) — samo u razvoju.
import { notFound } from "next/navigation";
import LiveMonitor from "@/app/components/LiveMonitor";

export default function DevMonitorPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return (
        <main className="mx-auto min-h-dvh max-w-6xl bg-canvas px-4 py-6 sm:px-6 lg:px-8">
            <LiveMonitor childId={0} childName="Lejla Test" topic={null} />
        </main>
    );
}
