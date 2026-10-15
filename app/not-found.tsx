import Link from "next/link";
import { buttonClasses } from "./components/ui/Button";

export default function NotFound() {
    return (
        <main className="grid min-h-dvh place-items-center bg-canvas p-4">
            <div className="w-full max-w-md rounded-card border border-line bg-surface p-8 text-center shadow-soft">
                <p className="text-6xl" aria-hidden="true">🧭</p>
                <h1 className="mt-4 text-2xl font-extrabold text-ink sm:text-3xl">Stranica nije pronađena</h1>
                <p className="mt-2 text-base font-semibold text-ink-soft">Izgleda da ovde nema ničega. Vratimo se na početak.</p>
                <Link href="/" className={buttonClasses({ size: "lg", className: "mt-6" })}>
                    Na početnu
                </Link>
            </div>
        </main>
    );
}
