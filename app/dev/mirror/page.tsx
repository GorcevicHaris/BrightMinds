// Probni prikaz „Uživo” bez baze — samo u razvoju: levo dete igra, desno roditelj vidi isti ekran.
// Parametri: ?game=inset &level=6 (podrazumevano „Gde je?”, nivo 1)
import { notFound } from "next/navigation";
import { GAMES, type GameId } from "@/lib/games";
import MirrorLab from "./MirrorLab";

export default async function DevMirrorPage({ searchParams }: { searchParams: Promise<{ game?: string; level?: string }> }) {
    if (process.env.NODE_ENV === "production") notFound();
    const p = await searchParams;
    const game = GAMES.find((g) => g.id === p.game)?.id ?? ("where" as GameId);
    const level = Math.min(Math.max(Math.round(Number(p.level)) || 1, 1), 15);
    return <MirrorLab gameId={game} level={level} />;
}
