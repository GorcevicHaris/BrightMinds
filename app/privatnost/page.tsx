import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";

export const metadata: Metadata = { title: "Podaci i privatnost" };

// Kontakt rukovaoca podacima unosi onaj ko postavlja aplikaciju (.env: NEXT_PUBLIC_CONTACT_EMAIL)
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

function Block({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-card border border-line bg-surface p-5 shadow-soft sm:p-7">
            <h2 className="text-xl font-extrabold text-ink">{title}</h2>
            <div className="mt-3 space-y-3 text-base font-medium leading-relaxed text-ink-soft">{children}</div>
        </section>
    );
}

/** Jasno i kratko: šta aplikacija čuva o detetu i odraslom, ko to vidi i kako se briše. */
export default function PrivacyPage() {
    return (
        <div className="min-h-dvh bg-canvas">
            <header className="border-b border-line bg-surface">
                <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
                    <Logo size="sm" />
                    <Link href="/login" className={buttonClasses({ variant: "secondary", size: "sm" })}>
                        Nazad
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6 sm:py-12">
                <div>
                    <h1 className="text-3xl font-extrabold text-ink sm:text-4xl">Podaci i privatnost</h1>
                    <p className="mt-2 text-lg font-semibold text-ink-soft">
                        Šta Bright Minds čuva, zašto, ko to vidi i kako se briše.
                    </p>
                </div>

                <Block title="Šta čuvamo">
                    <ul className="list-disc space-y-2 pl-5">
                        <li>
                            <strong className="text-ink">Nalog odraslog:</strong> ime i prezime, email, telefon (ako ga unesete) i lozinku u
                            zaštićenom obliku koji se ne može pročitati.
                        </li>
                        <li>
                            <strong className="text-ink">Profil deteta:</strong> ime, prezime, datum rođenja, pol, vašu napomenu, tajni kod od
                            četiri sličice i podešavanja igre.
                        </li>
                        <li>
                            <strong className="text-ink">Rezultate igara:</strong> koja igra i nivo, koliko zadataka je rešeno samostalno a
                            koliko uz pomoć, trajanje, vreme igranja i — ako je uključeno — lice koje je dete izabralo na pitanje „Kako si?”.
                        </li>
                        <li>
                            <strong className="text-ink">Priče koje sami napišete</strong> za dete.
                        </li>
                    </ul>
                    <p>Ne tražimo dijagnozu deteta i nemojte je upisivati u napomenu ako ne želite da bude sačuvana.</p>
                </Block>

                <Block title="Šta ne radimo">
                    <ul className="list-disc space-y-2 pl-5">
                        <li>Nema reklama, praćenja ni analitike trećih strana.</li>
                        <li>Ne koristimo kameru ni mikrofon i ništa ne snimamo.</li>
                        <li>Podatke ne prodajemo i ne delimo radi oglašavanja.</li>
                    </ul>
                </Block>

                <Block title="Ko vidi podatke">
                    <p>
                        Podatke o detetu vidi samo odrasla osoba čiji je nalog povezan sa detetom. Dete prijavljeno svojim kodom vidi samo
                        svoje igre i svoj napredak — nema pristup nalogu odraslog ni drugoj deci.
                    </p>
                    <p>
                        <strong className="text-ink">Praćenje uživo:</strong> dok odrasli gleda igru, prenosi se samo trenutno stanje igre na
                        ekranu. Prenos se ne čuva, a dete na svom ekranu vidi znak da ga odrasli gleda.
                    </p>
                </Block>

                <Block title="Gde su podaci">
                    <p>
                        Podaci se čuvaju u bazi kod pružaoca Supabase. Ako je uključen glas učitelja, tekst uputstva koje se izgovara šalje
                        se servisu za govor (ElevenLabs ili Microsoft Azure) radi pretvaranja u govor. Pri ulasku učitelj pozdravlja dete imenom, pa se servisu šalje i ime deteta (samo ime, bez prezimena); u tekstu
                        igara imena nema. Priče koje sami napišete šalju se onako kako ste ih napisali. Gotovi snimci rečenica čuvaju se u Supabase
                        skladištu i na samom uređaju, da se ista rečenica ne bi ponovo slala; pozdrav sa imenom deteta se ne čuva.
                    </p>
                    <p>
                        Na uređaju se čuvaju samo tehnički podaci: kolačić prijave, da li je zvuk isključen, današnje vreme igre i današnji
                        plan igre.
                    </p>
                </Block>

                <Block title="Vaša prava">
                    <ul className="list-disc space-y-2 pl-5">
                        <li>
                            <strong className="text-ink">Uvid:</strong> sve rezultate deteta vidite u „Statistici” na kartici deteta.
                        </li>
                        <li>
                            <strong className="text-ink">Brisanje rezultata:</strong> u podešavanjima deteta izaberite „Obriši sve rezultate”.
                        </li>
                        <li>
                            <strong className="text-ink">Brisanje profila:</strong> na kartici deteta izaberite korpu. Brišu se profil, rezultati i
                            priče.
                        </li>
                    </ul>
                    {CONTACT_EMAIL && (
                        <p>
                            Za sva pitanja o podacima pišite na{" "}
                            <a href={`mailto:${CONTACT_EMAIL}`} className="font-extrabold text-brand-700 underline-offset-4 hover:underline">
                                {CONTACT_EMAIL}
                            </a>
                            .
                        </p>
                    )}
                </Block>

                <Block title="Važna napomena">
                    <p>
                        Bright Minds je vežbanka uz podršku odraslih. Nije terapija ni dijagnostički alat i ne zamenjuje logopeda,
                        defektologa ili psihologa.
                    </p>
                </Block>
            </main>
        </div>
    );
}
