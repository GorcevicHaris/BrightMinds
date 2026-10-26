// Probni prikaz ekrana poziva za igru sa drugom na drugom uređaju — samo u razvoju.
// Parametar: ?scene=pick|who|code|card|card-together|asking|accepted|declined|missed
import { notFound } from "next/navigation";
import { RemoteScenePreview, type RemoteScene } from "@/app/dashboard/child/[id]/playRemote";
import { GAMES } from "@/lib/games";

const SCENES: readonly RemoteScene[] = ["pick", "who", "code", "card", "card-together", "asking", "accepted", "declined", "missed"];

export default async function DevInvitePage({ searchParams }: { searchParams: Promise<{ scene?: string }> }) {
    if (process.env.NODE_ENV === "production") notFound();
    const { scene } = await searchParams;
    const chosen = SCENES.find((s) => s === scene) ?? "card";
    return (
        <main className="min-h-dvh w-full bg-canvas px-4 py-5 sm:px-6 sm:py-8 lg:px-10">
            <RemoteScenePreview scene={chosen} games={GAMES} />
        </main>
    );
}
