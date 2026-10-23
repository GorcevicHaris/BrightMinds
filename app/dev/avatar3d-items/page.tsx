// Provera 3D kataloga (samo u razvoju): svaki predmet na devojčici, dečaku, mački i još jednoj
// životinji, sve pozadine (široko i uspravno) i svi kompleti na ljudima i životinjama.
import { notFound } from "next/navigation";
import { ItemsLabLazy } from "@/app/components/avatar3d/items/dev/ItemsLabLazy";

export default function DevAvatar3DItemsPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return <ItemsLabLazy />;
}
