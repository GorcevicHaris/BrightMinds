// Likovi na slikama situacija: deca i odrasli u istom, jednostavnom stilu.
// Velika glava i jasno lice (isti crtež osećanja kao na karticama igre „Emocije”),
// telo od nekoliko oblih oblika, bez sitnih detalja. Lik se crta oko stopala (0, 0).

import type { ReactNode } from "react";
import { EmotionFeatures, Medal } from "../EmotionFace";
import { Cheeks, INK, LINE, MOUTH } from "../faceParts";
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
const CALM_FACES: Record<"calm" | "talk" | "sleep", ReactNode> = {
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
};

/** Lice iz koordinata 100 × 100 smešteno u glavu poluprečnika 17 */
const FACE_SCALE = 17 / 43;
const FACE_TRANSFORM = `translate(${-50 * FACE_SCALE} ${-52 * FACE_SCALE}) scale(${FACE_SCALE})`;

function FaceFeatures({ face }: { face: Face }) {
    const node = face === "calm" || face === "talk" || face === "sleep" ? CALM_FACES[face] : <EmotionFeatures emotion={face} />;
    return <g transform={FACE_TRANSFORM}>{node}</g>;
}

interface HeadProps {
    look: Look;
    face: Face;
    back: boolean;
    glasses?: boolean;
    beard?: boolean;
}

function Head({ look, face, back, glasses, beard }: HeadProps) {
    const skinLine = shade(look.skin);
    return (
        <g>
            {hairBack(look, back)}
            <circle cx={-16.5} cy={2} r={4} fill={look.skin} stroke={skinLine} strokeWidth={1.2} />
            <circle cx={16.5} cy={2} r={4} fill={look.skin} stroke={skinLine} strokeWidth={1.2} />
            <circle r={17} fill={look.skin} stroke={skinLine} strokeWidth={1.4} />
            {back ? (
                hairOnBackOfHead(look)
            ) : (
                <>
                    {beard && <path d="M-15 2 C-14 18 14 18 15 2 C10 10 -10 10 -15 2Z" fill={look.hairColor} opacity={0.9} />}
                    {hairFront(look)}
                    <FaceFeatures face={face} />
                    {glasses && (
                        <g fill="none" stroke="#4a4a5a" strokeWidth={1.3}>
                            <circle cx={-6} cy={-1} r={5} />
                            <circle cx={6} cy={-1} r={5} />
                            <path d="M-1 -1 H1" />
                        </g>
                    )}
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
}

const SIT_POSES: readonly PoseId[] = ["sit", "sitHold", "sitReach", "ride"];

/** Ruka od ramena do šake: rukav u boji odeće i šaka u boji kože */
function Arm({ from, to, sleeve, skin, width }: { from: Point; to: Point; sleeve: string; skin: string; width: number }) {
    return (
        <g>
            <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={sleeve} strokeWidth={width} strokeLinecap="round" />
            <circle cx={to[0]} cy={to[1]} r={width * 0.62} fill={skin} stroke={shade(skin)} strokeWidth={1} />
        </g>
    );
}

export function Figure({ id, pose = "stand", face = "calm", back = false, wear = [], held }: FigureProps) {
    return isAdult(id) ? (
        <AdultFigure look={ADULTS[id]} pose={pose} face={face} back={back} wear={wear} held={held} />
    ) : (
        <ChildFigure look={LOOKS[id]} small={id === "baby"} pose={pose} face={face} back={back} wear={wear} held={held} />
    );
}

interface BodyProps {
    pose: PoseId;
    face: Face;
    back: boolean;
    wear: readonly WearId[];
    held?: ReactNode;
}

function ChildFigure({ look, small, pose, face, back, wear, held }: BodyProps & { look: Look; small: boolean }) {
    const has = (item: WearId) => wear.includes(item);
    const top = has("jacket") ? "#2f8f6f" : look.shirt;
    const swim = has("swim");
    const [l, r] = CHILD_HANDS[pose];
    const sitting = SIT_POSES.includes(pose);
    const drop = sitting ? 9 : 0;
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
    const armsOverHead = pose === "ears" || pose === "mouth";

    if (pose === "lie") {
        return (
            <g>
                <g transform="translate(0 -12) rotate(-8)">
                    <Head look={look} face={face} back={back} glasses={has("glasses")} />
                </g>
                <path d="M12 -20 Q40 -26 66 -20 L68 2 L12 2 Z" fill="#8ab8f0" stroke="#5f8fcf" strokeWidth={1.5} />
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
                    <Head look={look} face={face} back={back} />
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
                <Head look={look} face={face} back={back} glasses={has("glasses")} />
                {has("partyHat") && <path d="M-8 -15 L0 -36 L8 -15 Z" fill="#f4b73f" stroke="#d97f06" strokeWidth={1.2} />}
                {has("beanie") && <path d="M-18 -4 C-19 -26 19 -26 18 -4 Z M-3 -24 a4 4 0 1 0 6 0" fill="#e0574f" />}
            </g>
            {armsOverHead && arms}
        </g>
    );

    const legs = sitting ? (
        <g>
            <rect x={-10} y={-8} width={8} height={7} rx={3} fill={legColor} />
            <rect x={2} y={-8} width={8} height={7} rx={3} fill={legColor} />
            <ellipse cx={-6} cy={-1.5} rx={5.5} ry={3.2} fill="#4a4f63" />
            <ellipse cx={6} cy={-1.5} rx={5.5} ry={3.2} fill="#4a4f63" />
        </g>
    ) : (
        <g>
            <rect x={-8} y={-17} width={6} height={15.5} rx={2.5} fill={legColor} />
            <rect x={pose === "walk" ? 3 : 2} y={-17} width={6} height={15.5} rx={2.5} fill={legColor} transform={pose === "walk" ? "rotate(-10 5 -17)" : undefined} />
            {has("plaster") && <rect x={-8.5} y={-10} width={7} height={3.6} rx={1.2} fill="#f6c89a" stroke="#d99870" strokeWidth={0.8} />}
            <ellipse cx={-5} cy={-1.8} rx={4.8} ry={2.8} fill={swim ? look.skin : "#4a4f63"} />
            <ellipse cx={pose === "walk" ? 8 : 5} cy={-1.8} rx={4.8} ry={2.8} fill={swim ? look.skin : "#4a4f63"} />
        </g>
    );

    return (
        <g transform={small ? "scale(0.62)" : undefined}>
            {/* Okrenut leđima: predmet u rukama je ispred lika, pa ga telo zaklanja */}
            {held && back && <g transform={`translate(0 ${drop})`}>{held}</g>}
            {legs}
            {body}
            {held && !back && <g transform={`translate(0 ${drop})`}>{held}</g>}
        </g>
    );
}

function AdultFigure({ look, pose, face, back, wear, held }: BodyProps & { look: AdultLook }) {
    const [l, r] = ADULT_HANDS[pose];
    const sitting = SIT_POSES.includes(pose);
    const drop = sitting ? 30 : 0;
    const coatWhite = look.coat === "white";
    const sleeve = coatWhite ? "#f2f5f8" : shade(look.shirt, 0.86);
    const armsOverHead = pose === "ears" || pose === "mouth";
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
                <g transform="translate(0 -12) rotate(-8)">
                    <Head look={look} face={face} back={back} glasses={look.glasses} beard={look.beard && !has("shaved")} />
                </g>
                <path d="M12 -22 Q50 -28 86 -22 L88 2 L12 2 Z" fill="#8ab8f0" stroke="#5f8fcf" strokeWidth={1.5} />
            </g>
        );
    }

    const legs = sitting ? (
        <g>
            <rect x={-12} y={-12} width={10} height={11} rx={4} fill={look.pants} />
            <rect x={2} y={-12} width={10} height={11} rx={4} fill={look.pants} />
            <ellipse cx={-7} cy={-2} rx={6.5} ry={3.4} fill="#3a3a48" />
            <ellipse cx={7} cy={-2} rx={6.5} ry={3.4} fill="#3a3a48" />
        </g>
    ) : (
        <g>
            <rect x={-10} y={-42} width={8} height={40} rx={3} fill={dressed ? look.skin : look.pants} />
            <rect x={2} y={-42} width={8} height={40} rx={3} fill={dressed ? look.skin : look.pants} />
            <ellipse cx={-6.5} cy={-2.2} rx={6} ry={3.2} fill="#3a3a48" />
            <ellipse cx={6.5} cy={-2.2} rx={6} ry={3.2} fill="#3a3a48" />
        </g>
    );

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
                        {!sitting && <path d="M-15 -44 H15 L15.5 -38 H-15.5 Z" fill={look.pants} />}
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
                    <Head look={look} face={face} back={back} glasses={look.glasses} beard={look.beard && !has("shaved")} />
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
