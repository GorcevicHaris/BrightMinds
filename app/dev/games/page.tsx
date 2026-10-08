// Probna stranica za igre — radi bez baze i prijave. Dostupna samo u razvoju.
import { notFound } from "next/navigation";
import DevGames from "./DevGames";

export default function DevGamesPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return <DevGames />;
}
