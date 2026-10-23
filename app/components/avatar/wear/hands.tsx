/* eslint-disable react/display-name -- crteži su čiste funkcije koje vraćaju SVG, nisu komponente */
// U ruci: samo na celom liku. Crtež je u sopstvenim koordinatama: (0, 0) je mesto gde ga
// šaka drži (desna šaka na slici, geometry.ts HOLD_X/HOLD_Y), gore je negativno y.
// Lik posle predmeta crta pesnicu preko drške, pa izgleda kao da ga zaista drži.
// Prostor: x ≈ −40 … 95, y ≈ −300 … 110 (iznad je kraj slike, desno ivica okvira).

import type { ReactNode } from "react";
import { gloss, heartPath, itemsFor, sparkle, starPath } from "./art";

function balloon(x: number, y: number, color: string, shade: string): ReactNode {
    return (
        <g key={`${x}-${y}`}>
            <ellipse cx={x} cy={y} rx="24" ry="29" fill={color} />
            <path d={`M${x + 8} ${y + 4}Q${x + 14} ${y + 18} ${x + 2} ${y + 26}`} stroke={shade} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.5" />
            <path d={`M${x - 4} ${y + 28}L${x + 4} ${y + 28}L${x} ${y + 34}Z`} fill={shade} />
            <ellipse cx={x - 9} cy={y - 11} rx="5" ry="8" fill="#fff" opacity="0.55" transform={`rotate(-20 ${x - 9} ${y - 11})`} />
        </g>
    );
}

const balloonOne = () => (
    <>
        <path d="M0 0Q-6 -50 12 -90Q22 -110 24 -122" stroke="#8C98AB" strokeWidth="2" fill="none" />
        {balloon(24, -152, "#E5484D", "#B8323A")}
    </>
);

const balloonsThree = () => (
    <>
        <path d="M0 0Q-8 -60 -6 -118M0 0Q10 -70 30 -142M0 0Q18 -50 52 -104" stroke="#8C98AB" strokeWidth="2" fill="none" />
        {balloon(-6, -148, "#3D9BE9", "#2C6BC0")}
        {balloon(52, -134, "#FFD15C", "#E9A10E")}
        {balloon(28, -174, "#F45B8D", "#D93C70")}
    </>
);

const lollipop = () => (
    <>
        <rect x="-2.5" y="-50" width="5" height="62" rx="2.5" fill="#fff" stroke="#DDE4EE" />
        <circle cy="-66" r="20" fill="#F78FB3" />
        <path d="M0 -66m-14 0a14 14 0 1 1 14 14a9 9 0 1 1 9 -9a5 5 0 1 1 -5 -5" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
        <ellipse cx="-8" cy="-76" rx="4" ry="3" fill="#fff" opacity="0.6" />
    </>
);

const iceCream = () => (
    <>
        <path d="M-14 -24L0 12L14 -24Z" fill="#E2B256" />
        <path d="M-10 -18L6 -4M-4 -24L10 -10M-12 -10L2 4M6 -24L-8 -10" stroke="#B9872F" strokeWidth="1.6" opacity="0.6" />
        <circle cy="-32" r="15" fill="#FFB8CB" />
        <circle cx="-2" cy="-52" r="13" fill="#9A6236" />
        <circle cx="-5" cy="-56" r="3" fill="#fff" opacity="0.4" />
        <circle cx="4" cy="-66" r="4" fill="#E5484D" />
        <path d="M-9 -38l3 2M5 -30l3-2M-2 -26l2 3" stroke="#FFD15C" strokeWidth="2" strokeLinecap="round" />
    </>
);

function bloom(petal: string, center: string, size = 1): ReactNode {
    return (
        <g transform={`translate(4 -58) scale(${size})`}>
            {[0, 60, 120, 180, 240, 300].map((deg) => (
                <ellipse key={deg} cy="-11" rx="7" ry="11" fill={petal} transform={`rotate(${deg})`} />
            ))}
            <circle r="7.5" fill={center} />
            <circle cx="-2" cy="-2" r="2.4" fill="#fff" opacity="0.5" />
        </g>
    );
}

const flowerStem = (petal: string, center: string, size = 1) => () => (
    <>
        <path d="M0 10Q-2 -24 4 -54" stroke="#4FAE5E" strokeWidth="4" strokeLinecap="round" fill="none" />
        <ellipse cx="-8" cy="-24" rx="9" ry="4.5" fill="#6CC46F" transform="rotate(-30 -8 -24)" />
        <ellipse cx="9" cy="-34" rx="9" ry="4.5" fill="#6CC46F" transform="rotate(30 9 -34)" />
        {bloom(petal, center, size)}
    </>
);

const beachBall = () => (
    <>
        <circle cx="16" cy="-14" r="26" fill="#fff" />
        <path d="M16 -40Q0 -14 16 12Q-10 -14 16 -40Z" fill="#E5484D" />
        <path d="M16 -40Q32 -14 16 12Q42 -14 16 -40Z" fill="#3D9BE9" />
        <path d="M-10 -14Q16 -24 42 -14Q16 -4 -10 -14Z" fill="#FFD15C" opacity="0.9" />
        <circle cx="16" cy="-14" r="26" fill="none" stroke="#DDE4EE" strokeWidth="2" />
        <ellipse cx="6" cy="-28" rx="6" ry="4" fill="#fff" opacity="0.6" />
    </>
);

const teddy = () => (
    <g transform="translate(6 30)">
        <circle cx="-14" cy="-30" r="7" fill="#A8703F" />
        <circle cx="14" cy="-30" r="7" fill="#A8703F" />
        <ellipse cy="10" rx="18" ry="20" fill="#BC8656" />
        <circle cy="-20" r="16" fill="#BC8656" />
        <ellipse cy="-15" rx="7" ry="5.5" fill="#F1CBA4" />
        <circle cy="-17" r="2.4" fill="#4A2E1E" />
        <circle cx="-6" cy="-23" r="2" fill="#2A1D18" />
        <circle cx="6" cy="-23" r="2" fill="#2A1D18" />
        <ellipse cy="12" rx="9" ry="10" fill="#F1CBA4" />
        <ellipse cx="-10" cy="28" rx="7" ry="5" fill="#A8703F" />
        <ellipse cx="10" cy="28" rx="7" ry="5" fill="#A8703F" />
        <path d="M-8 -6L0 -2L8 -6V2L0 -2L-8 2Z" fill="#E5484D" />
    </g>
);

const kite = () => (
    <>
        <path d="M0 0Q30 -60 26 -120Q24 -150 44 -176" stroke="#8C98AB" strokeWidth="1.8" fill="none" />
        <g transform="translate(56 -206) rotate(18)">
            <path d="M0 -34L24 0L0 40L-24 0Z" fill="#FFD15C" />
            <path d="M0 -34L24 0L0 0Z" fill="#E5484D" />
            <path d="M0 0L-24 0L0 40Z" fill="#3D9BE9" />
            <path d="M0 -34V40M-24 0H24" stroke="#fff" strokeWidth="2" opacity="0.7" />
            <path d="M0 40Q-10 56 4 70Q14 84 0 98" stroke="#8C98AB" strokeWidth="1.8" fill="none" />
            <path d="M-6 56L6 52L4 60ZM-4 80L8 76L6 84Z" fill="#F45B8D" />
        </g>
    </>
);

const umbrella = () => (
    <g transform="rotate(18) scale(0.8)">
        <path d="M0 6V-96" stroke="#5B6475" strokeWidth="4" strokeLinecap="round" />
        <path d="M0 6Q0 16 -8 16Q-14 16 -14 10" stroke="#5B6475" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M-58 -92Q-56 -152 0 -154Q56 -152 58 -92Q48 -100 39 -92Q29 -100 19 -92Q10 -100 0 -92Q-10 -100 -19 -92Q-29 -100 -39 -92Q-48 -100 -58 -92Z" fill="#8E77E6" />
        <path d="M-19 -92Q-22 -130 0 -154Q22 -130 19 -92Q10 -100 0 -92Q-10 -100 -19 -92Z" fill="#B9A2F2" />
        <path d="M0 -154V-162" stroke="#5B6475" strokeWidth="4" strokeLinecap="round" />
        {gloss("M-44 -110Q-40 -136 -18 -146", 4, 0.4)}
    </g>
);

const book = () => (
    <g transform="rotate(-8)">
        <rect x="-8" y="-34" width="44" height="56" rx="4" fill="#3BB2A0" />
        <rect x="-8" y="-34" width="8" height="56" rx="3" fill="#2C8F80" />
        <rect x="34" y="-30" width="4" height="48" fill="#fff" />
        <path d={starPath(17, -12, 10, 4.4)} fill="#FFD15C" />
        <path d="M6 8H30" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    </g>
);

const microphone = () => (
    <>
        <path d="M-5 14L-4 -30H4L5 14Q0 18 -5 14Z" fill="#3A3546" />
        <rect x="-7" y="-34" width="14" height="8" rx="2" fill="#AEB9C9" />
        <circle cy="-46" r="14" fill="#C7D0DD" />
        <path d="M-12 -50H12M-13 -44H13M-8 -57H8M-4 -36L-4 -58M4 -36L4 -58" stroke="#8C98AB" strokeWidth="1.4" />
        <ellipse cx="-5" cy="-52" rx="4" ry="3" fill="#fff" opacity="0.6" />
    </>
);

const paintBrush = () => (
    <g transform="rotate(20)">
        <rect x="-3.5" y="-20" width="7" height="44" rx="3" fill="#E2B256" />
        <rect x="-4.5" y="-34" width="9" height="16" rx="1.5" fill="#AEB9C9" />
        <path d="M-5 -34Q-6 -50 0 -60Q6 -50 5 -34Z" fill="#8A5A30" />
        <path d="M-5 -42Q-5 -52 0 -60Q5 -52 5 -42Z" fill="#3D9BE9" />
        <circle cx="10" cy="-64" r="3" fill="#F45B8D" />
        <circle cx="-8" cy="-70" r="2.4" fill="#FFD15C" />
    </g>
);

const flashlight = () => (
    <g transform="rotate(35)">
        <path d="M-8 -40L-30 -110H30L8 -40Z" fill="#FFE08A" opacity="0.45" />
        <rect x="-6" y="-12" width="12" height="28" rx="4" fill="#3D7BE0" />
        <path d="M-9 -30H9L6 -12H-6Z" fill="#2C5DB0" />
        <rect x="-10" y="-38" width="20" height="9" rx="3" fill="#C7D0DD" />
        <ellipse cy="-39" rx="9" ry="3" fill="#FFF6CC" />
    </g>
);

const guitar = () => (
    <g transform="rotate(-24)">
        <rect x="-4" y="-34" width="8" height="58" rx="2" fill="#7A4A28" />
        <rect x="-6" y="-46" width="12" height="14" rx="3" fill="#5C3A25" />
        <path d="M0 22Q-26 22 -26 44Q-26 58 -18 62Q-30 72 -24 88Q-16 104 0 104Q16 104 24 88Q30 72 18 62Q26 58 26 44Q26 22 0 22Z" fill="#FF8A3D" />
        <path d="M0 26Q-18 28 -20 44" stroke="#fff" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" fill="none" />
        <circle cy="58" r="8" fill="#5C3A25" />
        <rect x="-10" y="80" width="20" height="5" rx="2" fill="#5C3A25" />
        <path d="M-2 -40V82M2 -40V82" stroke="#F2F5FA" strokeWidth="0.9" />
    </g>
);

const pinwheel = () => (
    <>
        <rect x="-2.5" y="-60" width="5" height="72" rx="2.5" fill="#E2B256" />
        <g transform="translate(0 -66)">
            {["#F45B8D", "#FFD15C", "#3D9BE9", "#3BB273"].map((color, i) => (
                <path key={color} d="M0 0L0 -26Q18 -22 0 0Z" fill={color} transform={`rotate(${i * 90})`} />
            ))}
            <circle r="4" fill="#fff" />
        </g>
    </>
);

const starWand = () => (
    <g transform="rotate(14)">
        <rect x="-3" y="-60" width="6" height="72" rx="3" fill="#B9A2F2" />
        <path d={starPath(0, -76, 20, 9)} fill="#FFD15C" stroke="#F2A516" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="-5" cy="-80" r="3" fill="#fff" opacity="0.8" />
        {sparkle(26, -96, 5)}
        {sparkle(-22, -100, 4, "#FFE08A")}
        {sparkle(18, -60, 3.5)}
    </g>
);

const apple = () => (
    <>
        <path d="M8 -38Q-14 -46 -16 -22Q-16 4 2 10Q8 8 10 8Q14 10 18 10Q34 4 34 -22Q32 -46 8 -38Z" fill="#E5484D" />
        <path d="M10 -38Q10 -48 16 -54" stroke="#7A4A28" strokeWidth="3" strokeLinecap="round" fill="none" />
        <ellipse cx="20" cy="-48" rx="8" ry="4" fill="#3BB273" transform="rotate(-20 20 -48)" />
        <ellipse cx="-4" cy="-26" rx="4" ry="7" fill="#fff" opacity="0.45" />
    </>
);

const racket = () => (
    <g transform="rotate(20)">
        <rect x="-4" y="-34" width="8" height="46" rx="3" fill="#3A3546" />
        <ellipse cy="-70" rx="26" ry="32" fill="#F2F5FA" fillOpacity="0.4" stroke="#3D7BE0" strokeWidth="6" />
        <path d="M-18 -90H18M-24 -78H24M-25 -66H25M-24 -54H24M-16 -44H16M-12 -98V-42M0 -102V-38M12 -98V-42" stroke="#8C98AB" strokeWidth="1.2" />
        <circle cx="34" cy="-112" r="9" fill="#C8E64C" />
        <path d="M27 -116Q34 -112 41 -116" stroke="#fff" strokeWidth="1.6" fill="none" />
    </g>
);

const bucket = () => (
    <>
        <path d="M-4 -14Q12 -40 28 -14" stroke="#3D7BE0" strokeWidth="3" fill="none" />
        <path d="M-10 -14H34L28 22H-4Z" fill="#3D9BE9" />
        <rect x="-12" y="-18" width="48" height="8" rx="3" fill="#2C6BC0" />
        <path d={starPath(12, 6, 7, 3)} fill="#FFD15C" />
        <path d="M32 -22L54 -66" stroke="#FFD15C" strokeWidth="4" strokeLinecap="round" />
        <path d="M50 -60L66 -68L60 -86L46 -76Z" fill="#FFD15C" />
    </>
);

const ladle = () => (
    <g transform="rotate(-16)">
        <rect x="-4" y="-80" width="8" height="92" rx="4" fill="#C98A55" />
        <ellipse cy="-92" rx="12" ry="16" fill="#B5743E" />
        <ellipse cx="-3" cy="-98" rx="3" ry="5" fill="#fff" opacity="0.35" />
    </g>
);

const treasureMap = () => (
    <g transform="rotate(-6)">
        <rect x="-6" y="-46" width="52" height="40" rx="3" fill="#F6D58A" />
        <rect x="-10" y="-50" width="8" height="48" rx="4" fill="#E2B256" />
        <rect x="44" y="-50" width="8" height="48" rx="4" fill="#E2B256" />
        <path d="M4 -16Q14 -36 24 -24Q32 -14 36 -34" stroke="#9A6236" strokeWidth="2" strokeDasharray="3 3" fill="none" />
        <path d="M32 -38L40 -30M40 -38L32 -30" stroke="#E5484D" strokeWidth="3" strokeLinecap="round" />
        <circle cx="6" cy="-14" r="3" fill="#3BB273" />
    </g>
);

const wateringCan = () => (
    <g transform="translate(10 -6)">
        <path d="M-14 -30H18L22 18H-18Z" fill="#3BB273" />
        <path d="M18 -14L46 -36L50 -30L22 0Z" fill="#2A8E57" />
        <ellipse cx="50" cy="-35" rx="6" ry="8" fill="#2A8E57" transform="rotate(-50 50 -35)" />
        <path d="M-14 -24Q-36 -24 -30 2Q-26 14 -16 10" stroke="#2A8E57" strokeWidth="5" fill="none" />
        {flowerSmall(2, -6)}
        <circle cx="60" cy="-26" r="2" fill="#7ED6F2" />
        <circle cx="64" cy="-18" r="2" fill="#7ED6F2" />
    </g>
);

function flowerSmall(x: number, y: number): ReactNode {
    return (
        <g transform={`translate(${x} ${y})`}>
            {[0, 72, 144, 216, 288].map((deg) => (
                <circle key={deg} cy="-5" r="4" fill="#FFD15C" transform={`rotate(${deg})`} />
            ))}
            <circle r="3" fill="#fff" />
        </g>
    );
}

const bubbles = () => (
    <>
        <rect x="-2.5" y="-36" width="5" height="48" rx="2.5" fill="#F45B8D" />
        <circle cy="-46" r="11" fill="none" stroke="#F45B8D" strokeWidth="4" />
        {[
            [24, -76, 12],
            [8, -104, 8],
            [42, -110, 15],
            [30, -150, 9],
            [60, -78, 7],
        ].map(([x, y, r]) => (
            <g key={`${x}-${y}`}>
                <circle cx={x} cy={y} r={r} fill="#BDEBFF" fillOpacity="0.3" stroke="#7ED6F2" strokeWidth="2" />
                <circle cx={x - r / 3} cy={y - r / 3} r={r / 4} fill="#fff" opacity="0.8" />
            </g>
        ))}
    </>
);

const popcorn = () => (
    <>
        {[
            [-6, -36],
            [6, -40],
            [18, -36],
            [0, -46],
            [12, -50],
            [24, -44],
        ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="8" fill="#FFF6CC" stroke="#F6D58A" strokeWidth="1.5" />
        ))}
        <path d="M-14 -32H30L24 14H-8Z" fill="#fff" />
        <path d="M-6 -32L-2 14M8 -32V14M22 -32L18 14" stroke="#E5484D" strokeWidth="6" />
    </>
);

const cupcake = () => (
    <>
        <path d="M-12 -14H24L18 12H-6Z" fill="#7ED6F2" />
        <path d="M-6 -14L-2 12M6 -14V12M18 -14L14 12" stroke="#4FB7DD" strokeWidth="2" />
        <path d="M-14 -14Q-16 -30 -2 -32Q2 -44 14 -38Q28 -36 26 -14Z" fill="#FFB8CB" />
        <circle cx="6" cy="-44" r="5" fill="#E5484D" />
        <path d="M-4 -24l3 2M12 -26l3-2M4 -20l1 3" stroke="#FFD15C" strokeWidth="2" strokeLinecap="round" />
    </>
);

const carrot = () => (
    <g transform="rotate(30)">
        <path d="M-9 -30Q0 -34 9 -30L2 30Q0 34 -2 30Z" fill="#FF8A3D" />
        <path d="M-6 -14L0 -12M-4 4L2 6M-3 18L1 19" stroke="#E5732A" strokeWidth="2" strokeLinecap="round" />
        <path d="M0 -32Q-10 -50 -6 -56M0 -32Q2 -54 8 -58M0 -32Q12 -46 18 -48" stroke="#3BB273" strokeWidth="4" strokeLinecap="round" fill="none" />
    </g>
);

const lasso = () => (
    <>
        <path d="M0 0Q-10 30 6 50Q20 60 30 40" stroke="#C98A55" strokeWidth="4" fill="none" strokeLinecap="round" />
        <ellipse cx="34" cy="-60" rx="34" ry="16" fill="none" stroke="#C98A55" strokeWidth="4" transform="rotate(-12 34 -60)" />
        <path d="M0 0Q4 -30 10 -48" stroke="#C98A55" strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
);

const binoculars = () => (
    <g transform="translate(8 -18) rotate(-10)">
        <rect x="-18" y="-16" width="16" height="32" rx="6" fill="#3A3546" />
        <rect x="4" y="-16" width="16" height="32" rx="6" fill="#3A3546" />
        <rect x="-4" y="-8" width="10" height="12" rx="2" fill="#5B6475" />
        <circle cx="-10" cy="-16" r="7" fill="#7ED6F2" stroke="#5B6475" strokeWidth="2" />
        <circle cx="12" cy="-16" r="7" fill="#7ED6F2" stroke="#5B6475" strokeWidth="2" />
        <circle cx="-12" cy="-18" r="2" fill="#fff" />
        <circle cx="10" cy="-18" r="2" fill="#fff" />
    </g>
);

const heartBalloon = () => (
    <>
        <path d="M0 0Q12 -50 2 -96" stroke="#8C98AB" strokeWidth="2" fill="none" />
        <path d={heartPath(4, -128, 30)} fill="#F45B8D" />
        <ellipse cx="-8" cy="-142" rx="5" ry="7" fill="#fff" opacity="0.5" transform="rotate(-30 -8 -142)" />
    </>
);

const hand = itemsFor("hand");

export const HANDS = [
    hand("lizalica", "Lizalica", 3, lollipop),
    hand("cvet", "Cvet", 3, flowerStem("#F78FB3", "#FFD15C")),
    hand("jabuka", "Jabuka", 3, apple),
    hand("sargarepa", "Šargarepa", 3, carrot),
    hand("balon", "Balon", 4, balloonOne, { motion: "float" }),
    hand("sladoled", "Sladoled", 4, iceCream),
    hand("kolacic", "Kolačić", 4, cupcake),
    hand("varjaca", "Varjača", 4, ladle),
    hand("suncokret", "Suncokret", 5, flowerStem("#FFD15C", "#8A5A30", 1.25)),
    hand("lopta", "Lopta", 5, beachBall),
    hand("cetkica", "Četkica za slikanje", 5, paintBrush),
    hand("kokice", "Kokice", 5, popcorn),
    hand("knjiga", "Knjiga", 6, book),
    hand("vetrenjaca", "Vetrenjača", 6, pinwheel),
    hand("kofica", "Kofica i lopatica", 6, bucket),
    hand("mehurici", "Duvaljka za mehuriće", 6, bubbles),
    hand("lampa", "Baterijska lampa", 7, flashlight),
    hand("kantica", "Kantica za zalivanje", 7, wateringCan),
    hand("kisobran", "Kišobran", 8, umbrella),
    hand("teniski-reket", "Teniski reket", 8, racket),
    hand("laso", "Laso", 8, lasso),
    hand("mikrofon", "Mikrofon", 9, microphone),
    hand("mapa", "Mapa blaga", 9, treasureMap),
    hand("stapic-zvezda", "Štapić sa zvezdom", 10, starWand),
    hand("dvogled", "Dvogled", 10, binoculars),
    hand("balon-srce", "Balon srce", 10, heartBalloon, { motion: "float" }),
    hand("medvedic", "Medvedić", 12, teddy),
    hand("zmaj-od-papira", "Zmaj od papira", 14, kite, { motion: "float" }),
    hand("tri-balona", "Tri balona", 15, balloonsThree, { motion: "float" }),
    hand("gitara", "Gitara", 25, guitar),
];
