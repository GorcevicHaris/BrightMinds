// Prototip 3D drugara sa odećom po mestima (samo u razvoju): telo, koža, oči, kosa,
// hidžab, gornji i donji deo, haljine i kaputi, obuća, kape, naočare, ranac i mačka.
import { notFound } from "next/navigation";
import { Avatar3DEditorLazy } from "@/app/components/avatar3d/Avatar3D";

export default function DevAvatar3DPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return <Avatar3DEditorLazy />;
}
