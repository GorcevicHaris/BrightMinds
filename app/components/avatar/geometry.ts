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
//
// Ceo lik (variant="full") ima istu glavu, vrat i ramena, a ispod njih:
//   trup     y 204–324, x ≈ 58–182 (FULL_TORSO_PATH);  ruke od ramena do šaka (42, 304) i (198, 304)
//   noge     y ≈ 312–398, sredine x 101 i 139;  obuća oko (97, 398) i (143, 398);  tlo y = 410
//   u ruci   predmet se drži u desnoj šaci na slici (HOLD_X, HOLD_Y)
//   ljubimac stoji na tlu levo od drugara (PET_X);  pozadina pokriva ceo okvir (FULL_BOX)

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

// ── Ceo lik (variant="full") ─────────────────────────────────────────────────

/** Okvir celog lika: mesta za kape gore, ljubimca levo i predmet u ruci desno */
export const FULL_BOX = { x: -60, y: -24, w: 360, h: 450 } as const;
/** Trup celog lika (uži od ramena na poprsju, sa porubom iznad nogu) */
export const FULL_TORSO_PATH = "M64 222Q70 204 120 204Q170 204 176 222L182 306Q184 324 166 324H74Q56 324 58 306Z";
/** Ruke: od ramena do zgloba (leva i desna na slici) */
export const ARM_L = { x1: 70, y1: 220, x2: 45, y2: 294 } as const;
export const ARM_R = { x1: 170, y1: 220, x2: 195, y2: 294 } as const;
/** Šake celog lika */
export const FIST_LX = 42;
export const FIST_RX = 198;
export const FIST_Y = 304;
/** Tačka u desnoj šaci (na slici) gde se drži predmet */
export const HOLD_X = FIST_RX;
export const HOLD_Y = FIST_Y;
/** Noge: sredine i visina */
export const LEG_LX = 101;
export const LEG_RX = 139;
export const LEG_TOP = 312;
/** Obuća: sredina stopala (leva i desna) i visina đona */
export const FOOT_LX = 97;
export const FOOT_RX = 143;
export const FOOT_Y = 398;
export const GROUND_Y = 410;
/** Ljubimac: sredina na tlu levo od drugara */
export const PET_X = -10;

export const VIEWBOX = {
    bust: "0 0 240 280",
    face: "36 14 168 178",
    full: `${FULL_BOX.x} ${FULL_BOX.y} ${FULL_BOX.w} ${FULL_BOX.h}`,
} as const;
