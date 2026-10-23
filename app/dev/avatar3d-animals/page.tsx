// Proba 3D životinja i ljubimaca (samo u razvoju): sve vrste × izgledi, izrazi, odeća.
import { notFound } from "next/navigation";
import AnimalsLab from "./AnimalsLab";

export default function DevAvatar3DAnimalsPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return <AnimalsLab />;
}
