// Pregled zajedničkog kompleta slika (samo u razvoju): /dev/pictures
// Svaka slika je krupna i sitna (kao u korpi igre „Razvrstaj”), da se proveri da se prepoznaje.
import { notFound } from "next/navigation";
import { Picture, PICTURE_IDS } from "@/app/components/games/pictures";

export default function DevPicturesPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return (
        <main className="min-h-dvh bg-canvas p-2">
            <h1 className="font-display text-xl font-extrabold text-ink">Slike ({PICTURE_IDS.length})</h1>
            <ul className="mt-2 grid grid-cols-8 gap-1.5">
                {PICTURE_IDS.map((id) => (
                    <li key={id} className="flex flex-col items-center rounded-lg bg-white p-1 ring-1 ring-line">
                        <div className="flex items-end gap-1">
                            <Picture id={id} className="h-24 w-24" />
                            <Picture id={id} className="h-7 w-7" />
                        </div>
                        <span className="text-[11px] font-bold">{id}</span>
                    </li>
                ))}
            </ul>
        </main>
    );
}
