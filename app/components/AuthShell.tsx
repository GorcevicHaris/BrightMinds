import React from "react";
import Link from "next/link";
import { Logo } from "./ui/Logo";
import TeacherAvatar from "./avatar/TeacherAvatar";

const HIGHLIGHTS = [
    { icon: "🎮", title: "Sedam igara", text: "Oblici, pamćenje, zvuci, emocije i socijalne priče." },
    { icon: "📈", title: "Jasan napredak", text: "Zvezdice, nivoi i raspoloženje — sve na jednom mestu." },
    { icon: "👀", title: "Praćenje uživo", text: "Gledajte kako dete igra, bez prekidanja igre." },
];

/** Zajednički okvir za prijavu i registraciju. */
export default function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            {/* Leva strana — samo na velikim ekranima */}
            <aside className="relative hidden overflow-hidden bg-brand-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
                <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-500" aria-hidden="true" />
                <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-brand-700" aria-hidden="true" />
                {/* Učiteljica koja maše (isti lik koji dete posle sreće u igrama) stoji u redu sa nazivom,
                    pa je naslov ispod nikad ne dodiruje, ni na nižem ekranu */}
                <div className="relative flex items-start justify-between gap-6">
                    <div>
                        <p className="font-display text-3xl font-extrabold">Bright Minds</p>
                        <p className="mt-1 text-sm font-bold text-brand-100">Učimo kroz igru</p>
                    </div>
                    <div className="h-40 w-36 shrink-0 overflow-hidden rounded-[2rem] bg-white/10 ring-1 ring-white/20 xl:h-48 xl:w-44" aria-hidden="true">
                        <TeacherAvatar gender="female" emotion="hello" className="h-full w-full translate-y-2" />
                    </div>
                </div>

                <div className="relative max-w-md">
                    <h2 className="text-4xl font-extrabold leading-tight xl:text-5xl">
                        Mirno mesto za igru i učenje.
                    </h2>
                    <ul className="mt-10 space-y-5">
                        {HIGHLIGHTS.map((h) => (
                            <li key={h.title} className="flex items-start gap-4">
                                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 text-2xl" aria-hidden="true">
                                    {h.icon}
                                </span>
                                <span>
                                    <span className="block text-lg font-extrabold">{h.title}</span>
                                    <span className="block text-sm font-semibold text-brand-100">{h.text}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-xs font-semibold text-brand-100">© {new Date().getFullYear()} Bright Minds</p>
            </aside>

            {/* Desna strana — sadržaj */}
            <main className="flex min-h-dvh flex-col items-center px-4 py-6 sm:px-6 sm:py-10">
                <Logo size="md" tagline className="mb-6 lg:hidden" />
                <div className="flex w-full max-w-xl flex-1 flex-col justify-center">{children}</div>
                <Link href="/privatnost" className="mt-6 text-sm font-bold text-ink-soft underline-offset-4 hover:text-ink hover:underline">
                    Podaci i privatnost
                </Link>
            </main>
        </div>
    );
}
