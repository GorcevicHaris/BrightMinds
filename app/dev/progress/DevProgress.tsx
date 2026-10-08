"use client";

import ProgressDashboard from "@/app/components/ProgressDashboard";

// Poziv statistike preusmeravamo na izmišljene podatke, pa prava komponenta radi bez baze.
// (Na nivou modula, da bude spremno pre prvog učitavanja komponente.)
if (typeof window !== "undefined") {
    const original = window.fetch.bind(window);
    window.fetch = (input, init) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        return /\/api\/children\/\d+\/progress/.test(url) ? original("/dev/progress-data", init) : original(input, init);
    };
}

export default function DevProgress({ audience }: { audience: "parent" | "child" }) {
    return (
        <main className="mx-auto min-h-dvh max-w-6xl bg-canvas px-4 py-6 sm:px-6 lg:px-8">
            <ProgressDashboard childId={0} childName="Mila" audience={audience} />
        </main>
    );
}
