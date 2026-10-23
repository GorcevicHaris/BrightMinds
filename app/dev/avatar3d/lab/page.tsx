// Probna stranica 3D motora (samo u razvoju): drugari u studiju, za proveru izgleda i snimke.
import { notFound } from "next/navigation";
import EngineLabLazy from "./EngineLabLazy";

export default function DevEngineLabPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return <EngineLabLazy />;
}
