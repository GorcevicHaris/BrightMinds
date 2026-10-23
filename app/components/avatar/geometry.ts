// Zajednička geometrija svih likova (učitelj, učiteljica, životinje). Crtež je 240 × 280.
// Svi likovi imaju oči, usta, vrat i ramena na istim mestima, pa im odgovaraju isti
// predmeti iz prodavnice (wearables.tsx). Namerno bez React-a i bez "use client":
// uvozi ga i serverski kod (provera kupovine).
//
//   glava    centar (120, 110), poluprečnik ≈ 66, vrh ≈ y 44 (kod učitelja kosa do y 24)
//   oči      (92, 114) i (148, 114)
//   usta     (120, 156)
//   vrat     od y ≈ 164 do 214, vrh vrata (120, 170); glava se naginje oko (120, 186)
//   telo     od y ≈ 204 naniže, između x ≈ 24 i 216 (TORSO_PATH)
//   kape     y ≈ 4–75, centrirane na x = 120;  naočare preko y ≈ 114;  oko vrata y ≈ 186–240

export const HEAD_CX = 120;
export const HEAD_CY = 110;
export const HEAD_R = 66;
export const EYE_Y = 114;
export const EYE_LX = 92;
export const EYE_RX = 148;
export const BROW_Y = EYE_Y - 29;
/** Koliko je donji kapak ispod oka dok lice miruje */
export const LID_REST = 30;
export const MOUTH_X = 120;
export const MOUTH_Y = 156;
/** Tačka oko koje se glava naginje (vrat) */
export const NECK = "120 186";
/** Ruka je spuštena ispod ivice slike, pa podignuta pored glave */
export const HAND_DOWN_Y = 306;
export const HAND_UP_Y = 150;
export const HAND_LX = 26;
export const HAND_RX = 214;
/** Telo (ramena): isti obris kod svih likova, da odeća iz prodavnice svima pristaje */
export const TORSO_PATH = "M24 284c0-56 38-80 96-80s96 24 96 80z";

export const VIEWBOX = { bust: "0 0 240 280", face: "36 14 168 178" } as const;
