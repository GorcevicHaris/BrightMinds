// Pregled učitelja i učiteljice u svim izrazima (samo u razvoju).
// /dev/avatar — statični izrazi; dugmad puštaju govor sa tom emocijom.
import { notFound } from "next/navigation";
import AvatarPreview from "./AvatarPreview";

export default function DevAvatarPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return <AvatarPreview />;
}
