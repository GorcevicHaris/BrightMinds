// Proba „još 3D životinja” (animals/more) (samo u razvoju): svaka vrsta × izgled spreda i iz 3/4, i
// svaka vrsta u kapi, duksu, pantalonama i patikama (pravi predmeti kad ih katalog ima).
import { notFound } from "next/navigation";
import MoreLabLazy from "./MoreLabLazy";

export default function DevMoreAnimalsPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return <MoreLabLazy />;
}
