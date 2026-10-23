// Pregled svih slika situacija (samo u razvoju): /dev/scenes?part=emotions|social|stories|uses|kit
// Uz svaku sliku stoji ID i tekst zadatka, da se lako proveri da slika odgovara tekstu.
import Link from "next/link";
import { notFound } from "next/navigation";
import { GALLERY_PARTS, galleryPart, type GalleryPartId } from "./gallery";

export default async function DevScenesPage({ searchParams }: { searchParams: Promise<{ part?: string }> }) {
    if (process.env.NODE_ENV === "production") notFound();
    const { part } = await searchParams;
    const current: GalleryPartId = GALLERY_PARTS.some((p) => p.id === part) ? (part as GalleryPartId) : "emotions";
    const { title, note, cards } = galleryPart(current);

    return (
        <main className="min-h-dvh bg-canvas px-4 py-5 sm:px-6">
            <nav className="mb-4 flex flex-wrap gap-2">
                {GALLERY_PARTS.map((p) => (
                    <Link
                        key={p.id}
                        href={`/dev/scenes?part=${p.id}`}
                        className={`rounded-full border px-4 py-2 text-sm font-extrabold ${p.id === current ? "border-brand-500 bg-brand-50 text-brand-800" : "border-line bg-surface text-ink-soft"}`}
                    >
                        {p.label}
                    </Link>
                ))}
            </nav>
            <h1 className="font-display text-2xl font-extrabold text-ink">{title}</h1>
            {note && <p className="mt-1 max-w-3xl text-sm font-semibold text-ink-soft">{note}</p>}
            <p className="mt-1 text-sm font-semibold text-ink-soft">Slika: {cards.length}</p>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cards.map((card) => (
                    <li key={card.key} data-scene={card.key} className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
                        <div className={`grid gap-1 p-2 ${card.extra ? "grid-cols-[2fr_1fr] items-end" : ""}`}>
                            {card.picture}
                            {card.extra}
                        </div>
                        <div className="px-3 pb-3">
                            <p className="text-xs font-extrabold text-brand-700">{card.label}</p>
                            <p className="text-sm font-bold leading-snug text-ink">{card.text}</p>
                            {card.sub && <p className="mt-0.5 text-xs font-semibold text-ink-soft">{card.sub}</p>}
                        </div>
                    </li>
                ))}
            </ul>
        </main>
    );
}
