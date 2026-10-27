// Pregled crteža igara o svetu oko nas (samo u razvoju): /dev/svet?game=jobs
// Svaki crtež je krupan i sitan (kao u korpi), da se proveri da se prepoznaje.
import { notFound } from "next/navigation";
import SvetGallery from "./SvetGallery";

export default async function DevSvetPage({ searchParams }: { searchParams: Promise<{ game?: string }> }) {
    if (process.env.NODE_ENV === "production") notFound();
    const p = await searchParams;
    return <SvetGallery game={p.game ?? "opposites"} />;
}
