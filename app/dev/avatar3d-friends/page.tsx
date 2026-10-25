// Proba novih 3D drugara (animals/friends) (samo u razvoju): svaki drugar × izgled spreda i iz 3/4,
// i svaki drugar u kapi, duksu, pantalonama i patikama (pravi predmeti iz kataloga).
import { notFound } from "next/navigation";
import FriendsLabLazy from "./FriendsLabLazy";

export default function DevFriendsPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return <FriendsLabLazy />;
}
