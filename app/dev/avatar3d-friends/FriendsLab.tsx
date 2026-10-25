"use client";

// Proba novih drugara (animals/friends, samo u razvoju): ista studija i galerija kao za „još
// životinja” (avatar3d-more). `window.__more` služi skriptama za snimke ekrana.

import { FRIEND_KINDS } from "@/app/components/avatar3d/data";
import { FRIEND_SKINS } from "@/app/components/avatar3d/animals/friends/skins.data";
import { GroupLab } from "../avatar3d-more/MoreLab";

export default function FriendsLab() {
    return <GroupLab title="Novi 3D drugari (proba)" kinds={FRIEND_KINDS} skins={FRIEND_SKINS} />;
}
