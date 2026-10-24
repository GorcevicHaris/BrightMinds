// Pregled slika igre „Šta je prvo?” (samo u razvoju): /dev/steps?gender=male&from=0&to=40
// Uz svaku sliku stoji rečenica koraka, da se lako proveri da slika pokazuje baš to.
import { notFound } from "next/navigation";
import { SEQUENCES } from "@/app/components/games/data/sequences";
import { StepArt } from "@/app/components/games/sequence/StepArt";

export default async function DevStepsPage({ searchParams }: { searchParams: Promise<{ gender?: string; from?: string; to?: string }> }) {
    if (process.env.NODE_ENV === "production") notFound();
    const { gender, from, to } = await searchParams;
    const female = gender !== "male";
    const list = SEQUENCES.slice(Number(from) || 0, Number(to) || SEQUENCES.length);
    return (
        <main className="min-h-dvh bg-canvas px-4 py-4">
            <h1 className="font-display text-2xl font-extrabold text-ink">Šta je prvo? — slike koraka ({SEQUENCES.reduce((sum, sequence) => sum + sequence.steps.length, 0)})</h1>
            <ul className="mt-3 flex flex-col gap-3">
                {list.map((sequence) => (
                    <li key={sequence.id} className="rounded-card border border-line bg-surface p-2">
                        <p className="text-sm font-extrabold text-brand-700">
                            {sequence.id} · {sequence.title}
                        </p>
                        <div className="mt-1 grid grid-cols-5 gap-2">
                            {sequence.steps.map((step, i) => (
                                <div key={i}>
                                    <StepArt spec={step.art} female={female} className="w-full rounded-xl ring-1 ring-line" />
                                    <p className="mt-0.5 text-xs font-bold leading-tight text-ink">
                                        {i + 1}. {step.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </li>
                ))}
            </ul>
        </main>
    );
}
