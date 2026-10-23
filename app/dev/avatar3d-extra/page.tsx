// Proba dodatnih 3D životinja (samo u razvoju): svaka vrsta × izgled spreda i iz 3/4, i
// svaka vrsta u kapi, duksu, pantalonama i patikama (pravi predmeti kad ih katalog ima).
import { notFound } from "next/navigation";
import ExtraLabLazy from "./ExtraLabLazy";

export default function DevExtraAnimalsPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return <ExtraLabLazy />;
}
