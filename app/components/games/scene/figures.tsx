// Likovi na slikama situacija: deca i odrasli u istom, jednostavnom stilu.
// Velika glava i jasno lice (isti crtež osećanja kao na karticama igre „Emocije”),
// telo od nekoliko oblih oblika, bez sitnih detalja. Lik se crta oko stopala (0, 0).

import type { ReactNode } from "react";
import { EmotionFeatures, Medal } from "../EmotionFace";
import { Cheeks, INK, LINE, MOUTH } from "../faceParts";
import type { EmotionId } from "../data/emotionScenarios";
import type { AdultId, Face, LookId, PoseId, WearId } from "./types";

// ── Izgled ────────────────────────────────────────────────────────────────────

type HairStyle = "short" | "curly" | "spiky" | "long" | "pony" | "braids" | "bob" | "bun" | "bald" | "baby";

interface Look {
    female: boolean;
    hair: HairStyle;
    hairColor: string;
    skin: string;
    shirt: string;
    pants: string;
}

const HAIR = {
    black: "#2f2522",
    dark: "#4a2f1f",
    brown: "#7a4a28",
    auburn: "#9c4a22",
    light: "#b8834a",
    grey: "#b9b3ab",
};

const SKIN = { light: "#fbdcc2", mid: "#f4c7a1", tan: "#dea77d" };

export const LOOKS: Record<LookId, Look> = {
    lejla: { female: true, hair: "long", hairColor: HAIR.dark, skin: SKIN.light, shirt: "#f07aa0", pants: "#6c61f0" },
    amina: { female: true, hair: "braids", hairColor: HAIR.brown, skin: SKIN.mid, shirt: "#9b7ef0", pants: "#3f8fd8" },
    selma: { female: true, hair: "pony", hairColor: HAIR.auburn, skin: SKIN.light, shirt: "#3fbf8a", pants: "#4a5bc4" },
    haris: { female: false, hair: "short", hairColor: HAIR.black, skin: SKIN.mid, shirt: "#3f8fd8", pants: "#3b4a6b" },
    amar: { female: false, hair: "curly", hairColor: HAIR.brown, skin: SKIN.light, shirt: "#f59e3b", pants: "#3b4a6b" },
    tarik: { female: false, hair: "spiky", hairColor: HAIR.light, skin: SKIN.light, shirt: "#e0574f", pants: "#2f6f8f" },
    emir: { female: false, hair: "short", hairColor: HAIR.brown, skin: SKIN.light, shirt: "#2fae9c", pants: "#3b4a6b" },
    merjem: { female: true, hair: "bob", hairColor: HAIR.black, skin: SKIN.mid, shirt: "#f4b73f", pants: "#e0574f" },
    ajla: { female: true, hair: "long", hairColor: HAIR.brown, skin: SKIN.mid, shirt: "#2fae9c", pants: "#6c61f0" },
    nejla: { female: true, hair: "pony", hairColor: HAIR.black, skin: SKIN.tan, shirt: "#f2786a", pants: "#3f8fd8" },
    adnan: { female: false, hair: "curly", hairColor: HAIR.black, skin: SKIN.tan, shirt: "#8a6ee8", pants: "#3b4a6b" },
    ilma: { female: true, hair: "braids", hairColor: HAIR.auburn, skin: SKIN.light, shirt: "#4d9be8", pants: "#f07aa0" },
    kenan: { female: false, hair: "short", hairColor: HAIR.auburn, skin: SKIN.light, shirt: "#f4b73f", pants: "#2f6f8f" },
    lamija: { female: true, hair: "bob", hairColor: HAIR.brown, skin: SKIN.light, shirt: "#e0574f", pants: "#4a5bc4" },
    faris: { female: false, hair: "spiky", hairColor: HAIR.black, skin: SKIN.mid, shirt: "#5bbf5a", pants: "#3b4a6b" },
    // Sporedna deca: brat, sestra, drug, drugarica
    boy: { female: false, hair: "short", hairColor: HAIR.light, skin: SKIN.light, shirt: "#7fb83f", pants: "#55607a" },
    boy2: { female: false, hair: "curly", hairColor: HAIR.dark, skin: SKIN.mid, shirt: "#e9a23b", pants: "#55607a" },
    girl: { female: true, hair: "bob", hairColor: HAIR.light, skin: SKIN.light, shirt: "#b57ee8", pants: "#55607a" },
    girl2: { female: true, hair: "pony", hairColor: HAIR.dark, skin: SKIN.mid, shirt: "#f2a0b8", pants: "#55607a" },
    baby: { female: false, hair: "baby", hairColor: HAIR.light, skin: SKIN.light, shirt: "#ffd36b", pants: "#ffd36b" },
    // Dete koje igra (priče su u prvom licu)
    meBoy: { female: false, hair: "short", hairColor: HAIR.dark, skin: SKIN.mid, shirt: "#6c61f0", pants: "#3b4a6b" },
    meGirl: { female: true, hair: "long", hairColor: HAIR.brown, skin: SKIN.light, shirt: "#6c61f0", pants: "#e86aa0" },
};

interface AdultLook extends Look {
    /** Beli mantil (doktor), kecelja (prodavac, konobar), šlem (vatrogasac)… */
    coat?: "white" | "apron";
    hat?: "helmet" | "topHat" | "cap" | "chef";
    beard?: boolean;
    glasses?: boolean;
}

const ADULTS: Record<AdultId, AdultLook> = {
    mama: { female: true, hair: "long", hairColor: HAIR.dark, skin: SKIN.light, shirt: "#e86a8a", pants: "#4a5bc4" },
    tata: { female: false, hair: "short", hairColor: HAIR.dark, skin: SKIN.mid, shirt: "#3f7fc8", pants: "#3b4a6b", beard: true },
    baka: { female: true, hair: "bun", hairColor: HAIR.grey, skin: SKIN.light, shirt: "#9b7ec8", pants: "#7a6aa0", glasses: true },
    deka: { female: false, hair: "bald", hairColor: HAIR.grey, skin: SKIN.light, shirt: "#7a9a5a", pants: "#5a5a6a", glasses: true },
    teacher: { female: true, hair: "bun", hairColor: HAIR.brown, skin: SKIN.mid, shirt: "#2fae9c", pants: "#3b4a6b" },
    teacher2: { female: true, hair: "bob", hairColor: HAIR.auburn, skin: SKIN.light, shirt: "#f4a03f", pants: "#3b4a6b" },
    doctor: { female: false, hair: "short", hairColor: HAIR.brown, skin: SKIN.light, shirt: "#8fd0e8", pants: "#3b6a8a", coat: "white" },
    nurse: { female: true, hair: "bun", hairColor: HAIR.dark, skin: SKIN.mid, shirt: "#8fd0e8", pants: "#3b6a8a", coat: "white" },
    dentist: { female: true, hair: "bob", hairColor: HAIR.dark, skin: SKIN.light, shirt: "#8fe0c8", pants: "#3b6a8a", coat: "white" },
    seller: { female: true, hair: "pony", hairColor: HAIR.auburn, skin: SKIN.light, shirt: "#e86a6a", pants: "#3b4a6b", coat: "apron" },
    waiter: { female: false, hair: "short", hairColor: HAIR.black, skin: SKIN.mid, shirt: "#ffffff", pants: "#2f3448", coat: "apron" },
    cook: { female: false, hair: "short", hairColor: HAIR.brown, skin: SKIN.light, shirt: "#ffffff", pants: "#55607a", hat: "chef" },
    firefighter: { female: false, hair: "short", hairColor: HAIR.dark, skin: SKIN.mid, shirt: "#d9a62a", pants: "#3b3b3b", hat: "helmet" },
    magician: { female: false, hair: "short", hairColor: HAIR.black, skin: SKIN.light, shirt: "#5a3a9a", pants: "#2f2448", hat: "topHat" },
    aunt: { female: true, hair: "bob", hairColor: HAIR.black, skin: SKIN.tan, shirt: "#3fbf8a", pants: "#3b4a6b" },
    lifeguard: { female: false, hair: "short", hairColor: HAIR.light, skin: SKIN.tan, shirt: "#e8463f", pants: "#e8463f" },
    conductor: { female: false, hair: "short", hairColor: HAIR.grey, skin: SKIN.light, shirt: "#3b5a8a", pants: "#2f3448", hat: "cap" },
    man: { female: false, hair: "short", hairColor: HAIR.brown, skin: SKIN.light, shirt: "#8a9ab8", pants: "#4a4f63" },
    woman: { female: true, hair: "bun", hairColor: HAIR.black, skin: SKIN.mid, shirt: "#c88ad8", pants: "#4a4f63" },
};

export function isAdult(id: string): id is AdultId {
    return Object.hasOwn(ADULTS, id);
}

// ── Kosa ──────────────────────────────────────────────────────────────────────
// Koordinate glave: središte (0, 0), poluprečnik 17. Šiške ostaju iznad obrva.

const CAP = "M-17.8 0 C-20 -25 20 -25 17.8 0 C16.5 -7 13 -11.5 7 -12 C2 -13 -4 -13 -9 -12 C-14 -10.5 -17 -6 -17.8 0Z";

function hairBack(look: Look, back: boolean): ReactNode {
    const c = look.hairColor;
    switch (look.hair) {
        case "long":
            return <path d="M-19.5 -4 C-21 -26 21 -26 19.5 -4 L21 22 Q0 27 -21 22 Z" fill={c} />;
        case "bob":
            return <path d="M-20 -4 C-22 -26 22 -26 20 -4 L20.5 11 Q0 15 -20.5 11 Z" fill={c} />;
        case "pony":
            return back ? (
                <path d="M-4 6 C-8 18 -2 28 4 30 C6 22 8 14 4 6Z" fill={c} />
            ) : (
                <>
                    <path d="M14 -12 C26 -14 30 2 24 16 C22 6 18 -2 12 -4Z" fill={c} />
                    <circle cx={15} cy={-11} r={3} fill="#f2786a" />
                </>
            );
        case "braids":
            return (
                <g fill={c}>
                    {[-1, 1].map((side) => (
                        <g key={side}>
                            <ellipse cx={side * 17} cy={8} rx={4.5} ry={6} />
                            <ellipse cx={side * 18} cy={17} rx={4} ry={5.5} />
                            <ellipse cx={side * 18.5} cy={25} rx={3.4} ry={4.5} />
                            <circle cx={side * 18.5} cy={30} r={2.4} fill="#f2786a" />
                        </g>
                    ))}
                </g>
            );
        case "bun":
            return <circle cx={0} cy={-20} r={7.5} fill={c} />;
        default:
            return null;
    }
}

function hairFront(look: Look): ReactNode {
    const c = look.hairColor;
    switch (look.hair) {
        case "short":
            return <path d="M-17.6 -2 C-19 -24 19 -24 17.6 -2 C15 -9 11 -11.5 5 -11 C0 -13.5 -8 -12.5 -12 -10 C-15 -8 -17 -5 -17.6 -2Z" fill={c} />;
        case "curly":
            return (
                <g fill={c}>
                    <path d="M-17.6 -2 C-19 -22 19 -22 17.6 -2 C15 -9 11 -11.5 5 -11.5 L-5 -11.5 C-11 -11.5 -15 -9 -17.6 -2Z" />
                    {[
                        [-15, -8],
                        [-12, -14],
                        [-6, -17.5],
                        [1, -18.5],
                        [8, -17],
                        [13.5, -13],
                        [16, -7],
                    ].map(([x, y]) => (
                        <circle key={`${x}`} cx={x} cy={y} r={5.4} />
                    ))}
                </g>
            );
        case "spiky":
            return (
                <path
                    d="M-17.6 -1 L-18 -11 L-14 -14 L-13 -20 L-7 -17 L-3 -23 L1 -17.5 L7 -22 L8.5 -16 L14 -18 L14 -12 L18 -10 L17.6 -1 C15 -8 10 -11 4 -11 C-2 -12.5 -10 -12 -17.6 -1Z"
                    fill={c}
                    strokeLinejoin="round"
                />
            );
        case "bald":
            return (
                <g fill={c}>
                    <path d="M-17.6 2 C-19 -8 -16 -12 -12 -12 C-14 -6 -15 -2 -15.5 3Z" />
                    <path d="M17.6 2 C19 -8 16 -12 12 -12 C14 -6 15 -2 15.5 3Z" />
                </g>
            );
        case "baby":
            return <path d="M-3 -16 C-1 -21 4 -20 3 -16" fill="none" stroke={c} strokeWidth={2.5} strokeLinecap="round" />;
        default:
            return <path d={CAP} fill={c} />;
    }
}

/** Potiljak: kad je lik okrenut leđima, kosa prekriva celu glavu */
function hairOnBackOfHead(look: Look): ReactNode {
    const c = look.hairColor;
    if (look.hair === "bald") return <path d="M-17 4 C-18 -6 -15 -10 -10 -10 L10 -10 C15 -10 18 -6 17 4 C10 10 -10 10 -17 4Z" fill={c} />;
    if (look.hair === "baby") return hairFront(look);
    // Duga kosa i „paž” se od pozadi vide celi, preko glave
    if (look.hair === "long" || look.hair === "bob") return hairBack(look, true);
    return <path d="M-17.8 0 C-20 -25 20 -25 17.8 0 C12 10 -12 10 -17.8 0Z" fill={c} />;
}

// ── Lice ──────────────────────────────────────────────────────────────────────

/** Mirni izrazi u koordinatama lica 100 × 100 (kao EmotionFace) */
type OtherFace = Exclude<Face, EmotionId>;

const CALM_FACES: Record<OtherFace, ReactNode> = {
    // Bez osmeha: mirne oči i ravna usta
    neutral: (
        <>
            <path d="M27 36 Q34 34 41 36 M59 36 Q66 34 73 36" {...LINE} strokeWidth={3} />
            <ellipse cx={35} cy={47} rx={4.5} ry={5.5} fill={INK} />
            <ellipse cx={65} cy={47} rx={4.5} ry={5.5} fill={INK} />
            <path d="M41 68 H59" {...LINE} />
        </>
    ),
    // Zabrinuto, nelagodno: unutrašnji krajevi obrva podignuti, usta blago nadole (bez suze)
    worried: (
        <>
            <path d="M27 38 L41 33 M59 33 L73 38" {...LINE} strokeWidth={3.5} />
            <ellipse cx={35} cy={48} rx={4.5} ry={5.5} fill={INK} />
            <ellipse cx={65} cy={48} rx={4.5} ry={5.5} fill={INK} />
            <path d="M39 71 Q50 64 61 71" {...LINE} />
        </>
    ),
    // Ozbiljno i odlučno (ne ljuto): ravne obrve, ravna usta
    firm: (
        <>
            <path d="M27 37 H42 M58 37 H73" {...LINE} strokeWidth={4} />
            <ellipse cx={35} cy={48} rx={4.5} ry={5} fill={INK} />
            <ellipse cx={65} cy={48} rx={4.5} ry={5} fill={INK} />
            <path d="M39 69 H61" {...LINE} strokeWidth={4.5} />
        </>
    ),
    // Umorno: oči napola zatvorene, mala ravna usta
    tired: (
        <>
            <path d="M27 38 Q34 37 41 39 M59 39 Q66 37 73 38" {...LINE} strokeWidth={3} />
            <path d="M29 47 H41 Q40 53 35 53 Q30 53 29 47Z M59 47 H71 Q70 53 65 53 Q60 53 59 47Z" fill={INK} />
            <path d="M28 46 H42 M58 46 H72" {...LINE} strokeWidth={3} />
            <path d="M44 69 Q50 67 56 69" {...LINE} />
        </>
    ),
    calm: (
        <>
            <Cheeks />
            <ellipse cx={35} cy={47} rx={4.5} ry={5.5} fill={INK} />
            <ellipse cx={65} cy={47} rx={4.5} ry={5.5} fill={INK} />
            <path d="M38 66 Q50 74 62 66" {...LINE} />
        </>
    ),
    talk: (
        <>
            <Cheeks />
            <ellipse cx={35} cy={47} rx={4.5} ry={5.5} fill={INK} />
            <ellipse cx={65} cy={47} rx={4.5} ry={5.5} fill={INK} />
            <path d="M40 64 Q50 63 60 64 Q58 77 50 77 Q42 77 40 64Z" fill={MOUTH} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
    ),
    sleep: (
        <>
            <Cheeks />
            <path d="M28 48 Q35 54 42 48 M58 48 Q65 54 72 48" {...LINE} />
            <path d="M44 68 Q50 71 56 68" {...LINE} />
        </>
    ),
    // ── Izrazi uz radnju ──
    // Liže: blag osmeh i jezik koji viri iz usta
    lick: (
        <>
            <Cheeks />
            <ellipse cx={35} cy={47} rx={4.5} ry={5.5} fill={INK} />
            <ellipse cx={65} cy={47} rx={4.5} ry={5.5} fill={INK} />
            <path d="M38 64 Q50 72 62 64" {...LINE} />
            <path d="M45 68 Q45 82 52 82 Q59 82 58 68 Z" fill="#f2788c" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
        </>
    ),
    // Žvaće: zadovoljne zatvorene oči, puni obrazi, talasasta zatvorena usta
    chew: (
        <>
            <g fill="#ff9e80" opacity={0.7}>
                <circle cx={23} cy={63} r={8} />
                <circle cx={77} cy={63} r={8} />
            </g>
            <path d="M28 48 Q35 41 42 48 M58 48 Q65 41 72 48" {...LINE} />
            <path d="M40 69 Q45 65 50 69 T60 69" {...LINE} />
        </>
    ),
    // Glasno se smeje: oči zatvorene u lukove, široko otvorena usta
    laugh: (
        <>
            <Cheeks />
            <path d="M27 49 Q35 39 43 49 M57 49 Q65 39 73 49" {...LINE} />
            <path d="M28 59 Q50 92 72 59 Z" fill={MOUTH} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
            <path d="M40 72 Q50 66 60 72 Q50 80 40 72 Z" fill="#f2788c" />
        </>
    ),
    // Plače: stisnute oči, suze teku niz oba obraza, usta otvorena nadole
    cry: (
        <>
            <path d="M26 38 L42 31 M58 31 L74 38" {...LINE} />
            <path d="M28 49 Q35 44 42 49 M58 49 Q65 44 72 49" {...LINE} />
            <path d="M31 53 Q27 64 31 76 M69 53 Q73 64 69 76" fill="none" stroke="#5bb8f5" strokeWidth={6} strokeLinecap="round" />
            <path d="M31 72 Q26 80 31 83 Q36 80 31 72 Z M69 72 Q64 80 69 83 Q74 80 69 72 Z" fill="#5bb8f5" stroke="#2e86c9" strokeWidth={1.5} />
            <path d="M38 78 Q50 60 62 78 Q50 72 38 78 Z" fill={MOUTH} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
    ),
    // Zeva: zatvorene oči, velika okrugla usta
    yawn: (
        <>
            <path d="M28 47 Q35 52 42 47 M58 47 Q65 52 72 47" {...LINE} />
            <ellipse cx={50} cy={71} rx={9} ry={12} fill={MOUTH} stroke={INK} strokeWidth={3} />
        </>
    ),
    // Otvara usta kod doktora („A”): mirne oči, široko otvorena usta sa jezikom
    open: (
        <>
            <ellipse cx={35} cy={46} rx={4.5} ry={5.5} fill={INK} />
            <ellipse cx={65} cy={46} rx={4.5} ry={5.5} fill={INK} />
            <ellipse cx={50} cy={70} rx={12} ry={10} fill={MOUTH} stroke={INK} strokeWidth={3} />
            <path d="M42 75 Q50 70 58 75 Q50 80 42 75 Z" fill="#f2788c" />
        </>
    ),
    // Duva: naduvani obrazi, mala okrugla usta i dah
    blow: (
        <>
            <g fill="#ff9e80" opacity={0.7}>
                <circle cx={24} cy={62} r={9} />
                <circle cx={76} cy={62} r={9} />
            </g>
            <ellipse cx={35} cy={46} rx={4.5} ry={5.5} fill={INK} />
            <ellipse cx={65} cy={46} rx={4.5} ry={5.5} fill={INK} />
            <circle cx={52} cy={69} r={4.5} fill={MOUTH} stroke={INK} strokeWidth={2.5} />
            <path d="M62 66 L76 62 M63 70 H79 M62 74 L76 78" fill="none" stroke="#7fb8dc" strokeWidth={2.6} strokeLinecap="round" />
        </>
    ),
    // Boli: zabrinute obrve, stisnute oči, iskrivljena usta
    pain: (
        <>
            <path d="M26 37 L42 33 M58 33 L74 37" {...LINE} strokeWidth={3.5} />
            <path d="M28 43 L40 48 L28 53 M72 43 L60 48 L72 53" {...LINE} />
            <path d="M37 71 Q43 65 50 70 T63 70" {...LINE} />
        </>
    ),
};

/** Lice iz koordinata 100 × 100 smešteno u glavu poluprečnika 17 */
const FACE_SCALE = 17 / 43;
const FACE_TRANSFORM = `translate(${-50 * FACE_SCALE} ${-52 * FACE_SCALE}) scale(${FACE_SCALE})`;

function FaceFeatures({ face, gaze }: { face: Face; gaze?: GazeDir }) {
    if (gaze) {
        return (
            <g transform={FACE_TRANSFORM}>
                <GazeEyes dx={gaze.dx} dy={gaze.dy} />
                {Object.hasOwn(GAZE_FACES, face) ? GAZE_FACES[face as keyof typeof GAZE_FACES] : GAZE_FACES.calm}
            </g>
        );
    }
    const node = Object.hasOwn(CALM_FACES, face) ? CALM_FACES[face as OtherFace] : <EmotionFeatures emotion={face as EmotionId} />;
    return <g transform={FACE_TRANSFORM}>{node}</g>;
}

// ── Pogled ────────────────────────────────────────────────────────────────────
// Lik koji gleda u nešto: oči imaju beonjaču i zenicu okrenutu ka tom mestu, a glava se
// okreće (crte lica se pomere u tu stranu, uši na suprotnu). Bez pogleda lik gleda pravo.

/** Smer pogleda u koordinatama lika (jedinični vektor) i koliko se okreće glava (0–1) */
export interface GazeDir {
    dx: number;
    dy: number;
    head: number;
}

/** Najveći pomak crta lica pri okretu glave (u jedinicama glave, poluprečnik 17) */
const TURN_X = 5;
const TURN_Y = 3.5;
/** Najveći pomak zenice u beonjači (koordinate lica 100 × 100) */
const PUPIL_X = 3.6;
const PUPIL_Y = 3.8;

function GazeEyes({ dx, dy }: { dx: number; dy: number }) {
    return (
        <>
            {[35, 65].map((x) => (
                <g key={x}>
                    <ellipse cx={x} cy={47} rx={8} ry={9} fill="#ffffff" stroke={INK} strokeWidth={2.6} />
                    <circle cx={x + dx * PUPIL_X} cy={47 + dy * PUPIL_Y} r={4.6} fill={INK} />
                    <circle cx={x + dx * PUPIL_X - 1.6} cy={47 + dy * PUPIL_Y - 1.8} r={1.3} fill="#ffffff" />
                </g>
            ))}
        </>
    );
}

/** Obrve i usta uz oči koje gledaju; ostali izrazi se uz pogled crtaju kao „calm” */
const GAZE_FACES = {
    calm: (
        <>
            <Cheeks />
            <path d="M39 67 Q50 74 61 67" {...LINE} />
        </>
    ),
    happy: (
        <>
            <Cheeks />
            <path d="M26 33 Q34 28 42 32 M58 32 Q66 28 74 33" {...LINE} strokeWidth={3.5} />
            <path d="M32 62 Q50 82 68 62 Z" fill={MOUTH} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
    ),
    neutral: <path d="M41 68 H59" {...LINE} />,
    talk: (
        <>
            <Cheeks />
            <path d="M40 64 Q50 63 60 64 Q58 77 50 77 Q42 77 40 64Z" fill={MOUTH} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>
    ),
} satisfies Partial<Record<Face, ReactNode>>;

/** Pomak crta lica za dati pogled (u jedinicama glave) */
function faceShift(gaze: GazeDir | undefined): Point {
    if (!gaze) return [0, 0];
    return [gaze.dx * gaze.head * TURN_X, gaze.dy * gaze.head * TURN_Y];
}

interface HeadProps {
    look: Look;
    face: Face;
    back: boolean;
    glasses?: boolean;
    beard?: boolean;
    gaze?: GazeDir;
}

function Head({ look, face, back, glasses, beard, gaze }: HeadProps) {
    const skinLine = shade(look.skin);
    // Okrenut leđima: pogled se ne vidi
    const looking = back ? undefined : gaze;
    const [fx, fy] = faceShift(looking);
    // Pri okretu glave obe uši klize na suprotnu stranu: dalje uvo se više vidi, bliže se sakrije
    const ear = looking ? -looking.dx * looking.head * 3 : 0;
    const shifted = fx !== 0 || fy !== 0 ? `translate(${fx} ${fy})` : undefined;
    return (
        <g>
            {hairBack(look, back)}
            <circle cx={-16.5 + ear} cy={2} r={4} fill={look.skin} stroke={skinLine} strokeWidth={1.2} />
            <circle cx={16.5 + ear} cy={2} r={4} fill={look.skin} stroke={skinLine} strokeWidth={1.2} />
            <circle r={17} fill={look.skin} stroke={skinLine} strokeWidth={1.4} />
            {back ? (
                hairOnBackOfHead(look)
            ) : (
                <>
                    <g transform={shifted}>{beard && <path d="M-15 2 C-14 18 14 18 15 2 C10 10 -10 10 -15 2Z" fill={look.hairColor} opacity={0.9} />}</g>
                    <g transform={fx !== 0 ? `translate(${fx * 0.3} 0)` : undefined}>{hairFront(look)}</g>
                    <g transform={shifted}>
                        <FaceFeatures face={face} gaze={looking} />
                        {glasses && (
                            <g fill="none" stroke="#4a4a5a" strokeWidth={1.3}>
                                <circle cx={-6} cy={-1} r={5} />
                                <circle cx={6} cy={-1} r={5} />
                                <path d="M-1 -1 H1" />
                            </g>
                        )}
                    </g>
                </>
            )}
        </g>
    );
}

/** Tamnija nijansa boje (za obrise): jednostavno množenje kanala */
export function shade(hex: string, amount = 0.8): string {
    const n = parseInt(hex.slice(1), 16);
    const channel = (shift: number) => Math.round(((n >> shift) & 255) * amount);
    return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`;
}

// ── Položaji ruku ─────────────────────────────────────────────────────────────

type Point = readonly [number, number];

/** Šake deteta [leva, desna]; „desno” je smer u kome lik gleda kad nije preokrenut */
const CHILD_HANDS: Record<PoseId, readonly [Point, Point]> = {
    stand: [[-13, -21], [13, -21]],
    walk: [[-14, -23], [13, -20]],
    wave: [[-13, -21], [26, -68]],
    up: [[-26, -70], [26, -70]],
    hold: [[-7, -29], [7, -29]],
    give: [[-13, -21], [23, -33]],
    point: [[-13, -21], [24, -41]],
    reach: [[-13, -21], [24, -78]],
    pet: [[-13, -21], [21, -9]],
    ears: [[-17, -58], [17, -58]],
    stop: [[-13, -21], [21, -47]],
    mouth: [[-13, -21], [6, -47]],
    hug: [[-24, -37], [24, -37]],
    push: [[17, -35], [23, -31]],
    belly: [[-13, -21], [3, -27]],
    shrug: [[-20, -43], [20, -43]],
    sit: [[-13, -14], [13, -14]],
    sitHold: [[-7, -22], [7, -22]],
    sitReach: [[-13, -14], [26, -70]],
    lie: [[-6, -6], [10, -6]],
    swim: [[-22, -10], [22, -10]],
    ride: [[16, -38], [22, -38]],
    // Šaka kod usta: predmet (sladoled, kolač, čaša, četkica) je na ustima
    eat: [[-13, -21], [5, -43]],
    drink: [[-13, -21], [5, -46]],
    brush: [[-13, -21], [10, -47]],
    wash: [[14, -27], [22, -27]],
    draw: [[-13, -21], [22, -27]],
    take: [[15, -31], [22, -31]],
    throw: [[-18, -30], [-10, -73]],
    embrace: [[16, -36], [27, -40]],
    holdHand: [[-13, -21], [20, -24]],
    run: [[-21, -27], [17, -45]],
    kick: [[-22, -42], [21, -40]],
    sitEat: [[-13, -14], [5, -43]],
    sitDraw: [[-4, -25], [22, -26]],
    // Na podu (telo je spušteno do zemlje, noge napred): šake uz stopala, na podu, na kolenu
    sitTie: [[18, -17], [25, -17]],
    floor: [[-15, -14], [15, -14]],
    knee: [[6, -28], [14, -30]],
};

const ADULT_HANDS: Record<PoseId, readonly [Point, Point]> = {
    stand: [[-17, -48], [17, -48]],
    walk: [[-18, -50], [17, -46]],
    wave: [[-17, -48], [30, -118]],
    up: [[-30, -118], [30, -118]],
    hold: [[-9, -62], [9, -62]],
    give: [[-17, -48], [30, -64]],
    point: [[-17, -48], [32, -78]],
    reach: [[-17, -48], [26, -128]],
    pet: [[-17, -48], [28, -30]],
    ears: [[-19, -103], [19, -103]],
    stop: [[-17, -48], [28, -84]],
    mouth: [[-17, -48], [8, -92]],
    hug: [[-32, -72], [32, -72]],
    push: [[24, -66], [30, -60]],
    belly: [[-17, -48], [4, -58]],
    shrug: [[-26, -80], [26, -80]],
    sit: [[-17, -34], [17, -34]],
    sitHold: [[-9, -46], [9, -46]],
    sitReach: [[-17, -34], [30, -118]],
    lie: [[-8, -6], [12, -6]],
    swim: [[-28, -12], [28, -12]],
    ride: [[20, -70], [28, -70]],
    eat: [[-17, -48], [6, -82]],
    drink: [[-17, -48], [6, -86]],
    brush: [[-17, -48], [12, -90]],
    wash: [[20, -56], [28, -56]],
    draw: [[-17, -48], [30, -56]],
    take: [[20, -62], [28, -62]],
    throw: [[-22, -60], [-12, -126]],
    embrace: [[20, -68], [34, -66]],
    holdHand: [[-17, -48], [26, -48]],
    run: [[-26, -56], [22, -82]],
    kick: [[-28, -80], [26, -78]],
    sitEat: [[-17, -34], [6, -82]],
    sitDraw: [[-6, -50], [30, -52]],
    sitTie: [[26, -40], [34, -40]],
    floor: [[-20, -38], [20, -38]],
    knee: [[6, -52], [14, -54]],
};

/** Mesto predmeta u ruci za dati položaj */
export function heldPoint(adult: boolean, pose: PoseId, hand: "l" | "r" | "both"): Point {
    const [l, r] = (adult ? ADULT_HANDS : CHILD_HANDS)[pose];
    if (hand === "l") return l;
    if (hand === "r") return r;
    return [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2];
}

// ── Telo ──────────────────────────────────────────────────────────────────────

interface FigureProps {
    id: LookId | AdultId;
    pose?: PoseId;
    face?: Face;
    back?: boolean;
    wear?: readonly WearId[];
    /** Predmet u ruci (već nacrtan, u koordinatama lika) */
    held?: ReactNode;
    /** Kuda lik gleda, u koordinatama lika (vidi `gazeToward`) */
    gaze?: GazeDir;
}

const SIT_POSES: readonly PoseId[] = ["sit", "sitHold", "sitReach", "ride", "sitEat", "sitDraw"];
/** Sedi na podu (ili na zemlji), noge su ispružene napred */
const GROUND_POSES: readonly PoseId[] = ["floor", "knee", "sitTie"];
/** Ruke idu preko glave (šake na ušima, kod usta) */
const OVER_HEAD_POSES: readonly PoseId[] = ["ears", "mouth", "eat", "drink", "brush", "sitEat"];

/** Koliko se telo spušta: na stolici, na podu */
function bodyDrop(adult: boolean, pose: PoseId): number {
    if (SIT_POSES.includes(pose)) return adult ? 30 : 9;
    if (GROUND_POSES.includes(pose)) return adult ? 38 : 13;
    return 0;
}

/** Ruka od ramena do šake: rukav u boji odeće i šaka u boji kože */
function Arm({ from, to, sleeve, skin, width }: { from: Point; to: Point; sleeve: string; skin: string; width: number }) {
    return (
        <g>
            <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={sleeve} strokeWidth={width} strokeLinecap="round" />
            <circle cx={to[0]} cy={to[1]} r={width * 0.62} fill={skin} stroke={shade(skin)} strokeWidth={1} />
        </g>
    );
}

export function Figure({ id, pose = "stand", face = "calm", back = false, wear = [], held, gaze }: FigureProps) {
    return isAdult(id) ? (
        <AdultFigure look={ADULTS[id]} pose={pose} face={face} back={back} wear={wear} held={held} gaze={gaze} />
    ) : (
        <ChildFigure look={LOOKS[id]} small={id === "baby"} pose={pose} face={face} back={back} wear={wear} held={held} gaze={gaze} />
    );
}

/** Središte glave u koordinatama lika (stopala su u 0, 0), za dati položaj */
export function headCenter(id: LookId | AdultId, pose: PoseId = "stand"): Point {
    if (isAdult(id)) {
        if (pose === "lie") return [0, -10];
        return [0, -104 + bodyDrop(true, pose)];
    }
    const k = id === "baby" ? 0.62 : 1;
    if (pose === "lie") return [0, -10 * k];
    if (pose === "swim") return [0, -20 * k];
    return [0, (-60 + bodyDrop(false, pose)) * k];
}

/** Koliko je glava uvećana u odnosu na osnovnu (poluprečnik 17) */
function headScale(id: LookId | AdultId, pose: PoseId): number {
    const k = isAdult(id) ? 0.95 : id === "baby" ? 0.62 : 1;
    return pose === "lie" ? 0.74 * (id === "baby" ? 0.62 : 1) : k;
}

/**
 * Smer pogleda ka tački (tx, ty) u koordinatama lika. `head` = koliko se okreće i glava (0–1).
 * Tačka u samoj glavi daje pogled pravo napred.
 */
export function gazeToward(id: LookId | AdultId, pose: PoseId, tx: number, ty: number, head = 1): GazeDir {
    const [hx, hy] = headCenter(id, pose);
    const vx = tx - hx;
    const vy = ty - hy;
    const length = Math.hypot(vx, vy);
    const turn = Math.min(Math.max(Number.isFinite(head) ? head : 1, 0), 1);
    if (!Number.isFinite(length) || length < 1) return { dx: 0, dy: 0, head: turn };
    return { dx: vx / length, dy: vy / length, head: turn };
}

/** Tačka između očiju (odakle kreću tačkice pogleda), u koordinatama lika */
export function eyesPoint(id: LookId | AdultId, pose: PoseId, gaze?: GazeDir): Point {
    const [hx, hy] = headCenter(id, pose);
    const [fx, fy] = faceShift(gaze);
    const k = headScale(id, pose);
    return [hx + fx * k, hy + (fy - 2) * k];
}

interface BodyProps {
    pose: PoseId;
    face: Face;
    back: boolean;
    wear: readonly WearId[];
    held?: ReactNode;
    gaze?: GazeDir;
}

function ChildFigure({ look, small, pose, face, back, wear, held, gaze }: BodyProps & { look: Look; small: boolean }) {
    const has = (item: WearId) => wear.includes(item);
    const top = has("jacket") ? "#2f8f6f" : look.shirt;
    const swim = has("swim");
    const [l, r] = CHILD_HANDS[pose];
    const sitting = SIT_POSES.includes(pose);
    const ground = GROUND_POSES.includes(pose);
    const drop = bodyDrop(false, pose);
    const legColor = swim ? look.skin : look.female ? look.skin : look.pants;
    // Rukav je za nijansu tamniji od odeće, da se ruka vidi i preko tela
    const sleeve = swim ? look.skin : shade(top, 0.86);
    const arms = (
        <>
            <Arm from={[-9, -37]} to={l} sleeve={sleeve} skin={look.skin} width={6} />
            <Arm from={[9, -37]} to={r} sleeve={sleeve} skin={look.skin} width={6} />
        </>
    );
    // Šake na ušima ili kod usta idu preko glave
    const armsOverHead = OVER_HEAD_POSES.includes(pose);

    if (pose === "lie") {
        return (
            <g>
                <g transform="translate(0 -10) rotate(-8) scale(0.74)">
                    <Head look={look} face={face} back={back} glasses={has("glasses")} gaze={gaze} />
                </g>
                <path d="M14 -18 Q42 -24 70 -18 L70 6 L14 6 Z" fill="#8ab8f0" stroke="#5f8fcf" strokeWidth={1.5} />
                <path d="M12 -20 Q40 -26 66 -20" fill="none" stroke="#ffffff" strokeWidth={3} opacity={0.7} />
            </g>
        );
    }

    if (pose === "swim") {
        return (
            <g>
                <Arm from={[-9, -6]} to={l} sleeve={look.skin} skin={look.skin} width={6} />
                <Arm from={[9, -6]} to={r} sleeve={look.skin} skin={look.skin} width={6} />
                <g transform="translate(0 -20)">
                    <Head look={look} face={face} back={back} gaze={gaze} />
                </g>
                <path d="M-34 -4 Q-25 -9 -17 -4 T0 -4 T17 -4 T34 -4 V4 H-34Z" fill="#5fb8e8" opacity={0.9} />
            </g>
        );
    }

    const body = (
        <g transform={`translate(0 ${drop})`}>
            {has("backpack") && back && <rect x={-11} y={-40} width={22} height={22} rx={6} fill="#f4b73f" stroke="#c98a12" strokeWidth={1.5} />}
            {look.female && !swim ? (
                <path d="M-10 -40 Q0 -43 10 -40 L15 -14 Q0 -10 -15 -14 Z" fill={top} stroke={shade(top)} strokeWidth={1.2} />
            ) : (
                <>
                    <path d="M-11 -40 Q0 -43 11 -40 L12 -17 Q0 -15 -12 -17 Z" fill={swim ? look.skin : top} stroke={shade(swim ? look.skin : top)} strokeWidth={1.2} />
                    <path d="M-12 -19 H12 L12.5 -12 H-12.5 Z" fill={swim ? "#3f8fd8" : look.pants} />
                </>
            )}
            {swim && look.female && <path d="M-10 -38 Q0 -40 10 -38 L12 -14 Q0 -11 -12 -14 Z" fill="#e86aa0" />}
            {has("jacket") && <path d="M0 -41 V-15" stroke={shade(top, 0.6)} strokeWidth={1.4} />}
            {has("scarf") && <path d="M-9 -41 Q0 -36 9 -41 L9 -37 Q0 -32 -9 -37Z M4 -37 L7 -26 L2 -26Z" fill="#3fbf8a" />}
            {has("backpack") && !back && (
                <g stroke="#c98a12" strokeWidth={2.2} strokeLinecap="round">
                    <path d="M-7 -40 L-8 -24 M7 -40 L8 -24" />
                </g>
            )}
            {has("medal") && (
                <g transform="translate(-26 -60) scale(0.34)">
                    <Medal />
                </g>
            )}
            <rect x={-3} y={-44} width={6} height={5} fill={look.skin} />
            {!armsOverHead && arms}
            <g transform="translate(0 -60)">
                <Head look={look} face={face} back={back} glasses={has("glasses")} gaze={gaze} />
                {has("partyHat") && <path d="M-8 -15 L0 -36 L8 -15 Z" fill="#f4b73f" stroke="#d97f06" strokeWidth={1.2} />}
                {has("beanie") && <path d="M-18.5 -9 C-19 -29 19 -29 18.5 -9 Q0 -12 -18.5 -9Z M-3.5 -25 a4 4 0 1 1 7 0" fill="#e0574f" />}
                {/* Slušalice koje stišavaju zvuk: luk preko glave i dve velike školjke na ušima */}
                {has("headphones") && (
                    <g>
                        <path d="M-19 0 C-21 -30 21 -30 19 0" fill="none" stroke="#3b4a6b" strokeWidth={4} strokeLinecap="round" />
                        <rect x={-24} y={-6} width={9} height={15} rx={4} fill="#4d9be8" stroke="#2f6fb8" strokeWidth={1.4} />
                        <rect x={15} y={-6} width={9} height={15} rx={4} fill="#4d9be8" stroke="#2f6fb8" strokeWidth={1.4} />
                    </g>
                )}
            </g>
            {armsOverHead && arms}
        </g>
    );

    const shoe = swim ? look.skin : "#4a4f63";
    const plaster = (x: number, y: number) => <rect x={x - 3.5} y={y - 1.8} width={7} height={3.6} rx={1.2} fill="#f6c89a" stroke="#d99870" strokeWidth={0.8} />;
    let legs: ReactNode;
    if (sitting) {
        legs = (
            <g>
                <rect x={-10} y={-8} width={8} height={7} rx={3} fill={legColor} />
                <rect x={2} y={-8} width={8} height={7} rx={3} fill={legColor} />
                <ellipse cx={-6} cy={-1.5} rx={5.5} ry={3.2} fill={shoe} />
                <ellipse cx={6} cy={-1.5} rx={5.5} ry={3.2} fill={shoe} />
            </g>
        );
    } else if (ground) {
        // Sedi na podu: noge su ispružene napred; kod „knee” je jedna savijena (drži se za koleno)
        legs = (
            <g strokeLinecap="round" strokeLinejoin="round" fill="none">
                <path d="M-4 -4 H20" stroke={legColor} strokeWidth={6.5} />
                {pose === "knee" ? <path d="M2 -5 L11 -17 L19 -4" stroke={legColor} strokeWidth={6.5} /> : <path d="M2 -6 H20" stroke={legColor} strokeWidth={6.5} />}
                <ellipse cx={23} cy={-5} rx={2.8} ry={4.6} fill={shoe} />
                {pose === "knee" && <ellipse cx={21} cy={-3} rx={4.6} ry={2.6} fill={shoe} />}
                {has("plaster") && (pose === "knee" ? plaster(11, -16) : plaster(10, -5))}
            </g>
        );
    } else if (pose === "run" || pose === "kick") {
        // Trči: noge raširene u koraku; šutira: desna noga je visoko napred
        const behind = pose === "run" ? 28 : 6;
        const ahead = pose === "run" ? -34 : -72;
        legs = (
            <g>
                <g transform={`rotate(${behind} -5 -17)`}>
                    <rect x={-8} y={-17} width={6} height={15.5} rx={2.5} fill={legColor} />
                    <ellipse cx={-5} cy={-1.8} rx={4.8} ry={2.8} fill={shoe} />
                </g>
                <g transform={`rotate(${ahead} 5 -17)`}>
                    <rect x={2} y={-17} width={6} height={15.5} rx={2.5} fill={legColor} />
                    {has("plaster") && plaster(5, -9)}
                    <ellipse cx={6} cy={-1.8} rx={4.8} ry={2.8} fill={shoe} />
                </g>
            </g>
        );
    } else {
        legs = (
            <g>
                <rect x={-8} y={-17} width={6} height={15.5} rx={2.5} fill={legColor} />
                <rect x={pose === "walk" ? 3 : 2} y={-17} width={6} height={15.5} rx={2.5} fill={legColor} transform={pose === "walk" ? "rotate(-10 5 -17)" : undefined} />
                {has("plaster") && plaster(-5, -8.2)}
                <ellipse cx={-5} cy={-1.8} rx={4.8} ry={2.8} fill={shoe} />
                <ellipse cx={pose === "walk" ? 8 : 5} cy={-1.8} rx={4.8} ry={2.8} fill={shoe} />
            </g>
        );
    }

    return (
        <g transform={small ? "scale(0.62)" : undefined}>
            {/* Okrenut leđima: predmet u rukama je ispred lika, pa ga telo zaklanja */}
            {held && back && <g transform={`translate(0 ${drop})`}>{held}</g>}
            {/* Na podu su noge ispružene ispred tela (i ispred suknje), a šake su na njima */}
            {!ground && legs}
            {body}
            {ground && legs}
            {ground && !back && <g transform={`translate(0 ${drop})`}>{arms}</g>}
            {held && !back && <g transform={`translate(0 ${drop})`}>{held}</g>}
        </g>
    );
}

function AdultFigure({ look, pose, face, back, wear, held, gaze }: BodyProps & { look: AdultLook }) {
    const [l, r] = ADULT_HANDS[pose];
    const sitting = SIT_POSES.includes(pose);
    const ground = GROUND_POSES.includes(pose);
    const drop = bodyDrop(true, pose);
    const coatWhite = look.coat === "white";
    const sleeve = coatWhite ? "#f2f5f8" : shade(look.shirt, 0.86);
    const armsOverHead = OVER_HEAD_POSES.includes(pose);
    const arms = (
        <>
            <Arm from={[-12, -82]} to={l} sleeve={sleeve} skin={look.skin} width={7.5} />
            <Arm from={[12, -82]} to={r} sleeve={sleeve} skin={look.skin} width={7.5} />
        </>
    );
    const has = (item: WearId) => wear.includes(item);
    const dressed = look.female && !coatWhite;

    if (pose === "lie") {
        return (
            <g>
                {/* Glava na jastuku (ne preko uzglavlja), ćebe do kraja kreveta (inBed: dušek je od -13 do 71) */}
                <g transform="translate(0 -10) rotate(-8) scale(0.74)">
                    <Head look={look} face={face} back={back} glasses={look.glasses} beard={look.beard && !has("shaved")} gaze={gaze} />
                </g>
                <path d="M14 -18 Q42 -24 70 -18 L70 6 L14 6 Z" fill="#8ab8f0" stroke="#5f8fcf" strokeWidth={1.5} />
            </g>
        );
    }

    const legColor = dressed ? look.skin : look.pants;
    let legs: ReactNode;
    if (sitting) {
        legs = (
            <g>
                <rect x={-12} y={-12} width={10} height={11} rx={4} fill={look.pants} />
                <rect x={2} y={-12} width={10} height={11} rx={4} fill={look.pants} />
                <ellipse cx={-7} cy={-2} rx={6.5} ry={3.4} fill="#3a3a48" />
                <ellipse cx={7} cy={-2} rx={6.5} ry={3.4} fill="#3a3a48" />
            </g>
        );
    } else if (ground) {
        legs = (
            <g strokeLinecap="round">
                <path d="M-6 -6 H40 M2 -10 H40" stroke={legColor} strokeWidth={8} />
                <ellipse cx={44} cy={-8} rx={3.4} ry={6.5} fill="#3a3a48" />
            </g>
        );
    } else if (pose === "run" || pose === "kick") {
        const behind = pose === "run" ? 24 : 6;
        const ahead = pose === "run" ? -30 : -70;
        legs = (
            <g>
                <g transform={`rotate(${behind} -6 -42)`}>
                    <rect x={-10} y={-42} width={8} height={40} rx={3} fill={legColor} />
                    <ellipse cx={-6.5} cy={-2.2} rx={6} ry={3.2} fill="#3a3a48" />
                </g>
                <g transform={`rotate(${ahead} 6 -42)`}>
                    <rect x={2} y={-42} width={8} height={40} rx={3} fill={legColor} />
                    <ellipse cx={6.5} cy={-2.2} rx={6} ry={3.2} fill="#3a3a48" />
                </g>
            </g>
        );
    } else {
        legs = (
            <g>
                <rect x={-10} y={-42} width={8} height={40} rx={3} fill={legColor} />
                <rect x={2} y={-42} width={8} height={40} rx={3} fill={legColor} />
                <ellipse cx={-6.5} cy={-2.2} rx={6} ry={3.2} fill="#3a3a48" />
                <ellipse cx={6.5} cy={-2.2} rx={6} ry={3.2} fill="#3a3a48" />
            </g>
        );
    }

    return (
        <g>
            {held && back && <g transform={`translate(0 ${drop})`}>{held}</g>}
            {legs}
            <g transform={`translate(0 ${drop})`}>
                {dressed ? (
                    <path d="M-13 -86 Q0 -90 13 -86 L20 -26 Q0 -21 -20 -26 Z" fill={look.shirt} stroke={shade(look.shirt)} strokeWidth={1.2} />
                ) : (
                    <>
                        <path d="M-14 -86 Q0 -90 14 -86 L15 -40 Q0 -37 -15 -40 Z" fill={look.shirt} stroke={shade(look.shirt)} strokeWidth={1.2} />
                        {!sitting && !ground && <path d="M-15 -44 H15 L15.5 -38 H-15.5 Z" fill={look.pants} />}
                    </>
                )}
                {coatWhite && (
                    <>
                        <path d="M-15 -86 Q0 -90 15 -86 L18 -30 H-18 Z" fill="#ffffff" stroke="#c9d4e0" strokeWidth={1.4} />
                        <path d="M-5 -88 L0 -70 L5 -88 Z" fill={look.shirt} />
                        <path d="M0 -70 V-30" stroke="#c9d4e0" strokeWidth={1.2} />
                        <path d="M-7 -84 Q-9 -66 0 -64 Q9 -66 7 -84" fill="none" stroke="#4a5a6a" strokeWidth={1.8} />
                        <circle cx={0} cy={-63} r={2.6} fill="#8a9ab0" />
                    </>
                )}
                {look.coat === "apron" && <path d="M-10 -72 H10 L12 -34 H-12 Z" fill="#f4f0e6" stroke="#d9d0bc" strokeWidth={1.2} />}
                <rect x={-4} y={-92} width={8} height={7} fill={look.skin} />
                {!armsOverHead && arms}
                <g transform="translate(0 -104) scale(0.95)">
                    <Head look={look} face={face} back={back} glasses={look.glasses} beard={look.beard && !has("shaved")} gaze={gaze} />
                    {look.hat === "helmet" && <path d="M-20 -4 C-20 -28 20 -28 20 -4 H25 V0 H-25 V-4Z" fill="#e8463f" stroke="#a82a24" strokeWidth={1.4} />}
                    {look.hat === "topHat" && (
                        <g>
                            <rect x={-13} y={-42} width={26} height={26} rx={2} fill="#2f2448" />
                            <rect x={-20} y={-18} width={40} height={5} rx={2} fill="#2f2448" />
                            <rect x={-13} y={-24} width={26} height={4} fill="#e0574f" />
                        </g>
                    )}
                    {look.hat === "cap" && <path d="M-17 -8 C-17 -24 17 -24 17 -8 Z M10 -10 H26 V-7 H10Z" fill="#3b5a8a" />}
                    {look.hat === "chef" && <path d="M-14 -10 V-20 C-22 -24 -16 -36 -8 -32 C-6 -40 6 -40 8 -32 C16 -36 22 -24 14 -20 V-10 Z" fill="#ffffff" stroke="#c9d4e0" strokeWidth={1.4} />}
                </g>
                {armsOverHead && arms}
                {!back && held}
            </g>
        </g>
    );
}
