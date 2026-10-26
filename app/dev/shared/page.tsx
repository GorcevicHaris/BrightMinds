// Probna zajednička tabla bez baze i bez mreže — samo u razvoju: levo domaćin (Lejla) igra pravu
// igru, desno gost (Amar) vidi istu tablu i igra na smenu. Kanal je u memoriji, sa kašnjenjem.
// Parametri: ?game=memory &level=3 &mode=together|versus &lag=300
import { notFound } from "next/navigation";
import { GAMES, type GameId } from "@/lib/games";
import SharedLab from "./SharedLab";

export default async function DevSharedPage({ searchParams }: { searchParams: Promise<{ game?: string; level?: string; mode?: string; lag?: string }> }) {
    if (process.env.NODE_ENV === "production") notFound();
    const p = await searchParams;
    const game = GAMES.find((g) => g.id === p.game)?.id ?? ("memory" as GameId);
    const level = Math.min(Math.max(Math.round(Number(p.level)) || 1, 1), 15);
    const lag = Math.min(Math.max(Math.round(Number(p.lag)) || 0, 0), 3000);
    return <SharedLab gameId={game} level={level} mode={p.mode === "versus" ? "versus" : "together"} lag={lag} />;
}
