// Pregled drugara (samo u razvoju): ceo lik sa kompletima, sličice prodavnice, svaki predmet
// na svakom drugaru, i učitelj u svim izrazima. Dugmad puštaju govor sa tom emocijom.
import { notFound } from "next/navigation";
import AvatarPreview from "./AvatarPreview";

export default function DevAvatarPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return <AvatarPreview />;
}
