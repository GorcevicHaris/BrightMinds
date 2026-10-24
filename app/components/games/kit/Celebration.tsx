"use client";

import { useEffect, useState } from "react";
import { centerOf, FLY_EVENT, FLY_MS, hypeTarget, PRAISE_EVENT, useSystemReduced, type FlyDetail, type PraiseDetail } from "./hype";

// Zvezdice za tačan odgovor. Kad je drugar na ekranu, nekoliko zvezdica odleti od odgovora do
// njega (on ih „uhvati” i skoči); bez drugara se kratko rasprše oko dodira. Kratko (manje od
// sekunde), bez zvuka i bez bljeskanja — da obraduju, a ne preplave. Pokreće ih `celebrate()`;
// `playSfx("correct")` ga zove sam, pa sve igre dobijaju zvezdice bez posebnog koda.

export const CELEBRATE_EVENT = "bm:celebrate";
const EVENT = CELEBRATE_EVENT;
const STARS = 10;
const BURST_MS = 1000;
/** Koliko zvezdica odleti do drugara posle tačnog odgovora */
const FLYING_STARS = 4;
/** Najviše novčića u vazduhu odjednom (ostali se samo dodaju brojaču) */
const MAX_FLYING = 8;

let lastTap: { x: number; y: number; at: number } | null = null;
if (typeof window !== "undefined") {
    window.addEventListener("pointerdown", (event) => {
        lastTap = { x: event.clientX, y: event.clientY, at: Date.now() };
    }, { passive: true, capture: true });
}

/** Odakle zvezdice kreću: skorašnji dodir, inače element u fokusu (tastatura, prekidač) */
function startPoint(): { x: number; y: number } | null {
    if (lastTap && Date.now() - lastTap.at < 4000) return { x: lastTap.x, y: lastTap.y };
    const active = typeof document !== "undefined" ? document.activeElement : null;
    if (active && active !== document.body && active.getBoundingClientRect().width > 0) return centerOf(active);
    return lastTap ? { x: lastTap.x, y: lastTap.y } : null;
}

export function celebrate() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(EVENT, { detail: startPoint() }));
}

/**
 * Slavlje na kraju nivoa: nekoliko većih roj-eva zvezdica jedan za drugim, po celom ekranu.
 * I dalje kratko (oko sekunde i po) i bez bljeskanja — radost, a ne vatromet.
 */
export function celebrateBig() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { big: true } }));
}

/** Mesta velikog slavlja, u delovima širine i visine ekrana */
const BIG_SPOTS = [
    [0.3, 0.35],
    [0.7, 0.3],
    [0.5, 0.55],
    [0.22, 0.6],
    [0.78, 0.58],
] as const;
const BIG_STEP_MS = 220;

interface Star {
    dx: number;
    dy: number;
    size: number;
    turn: number;
    delay: number;
}

interface Burst {
    id: number;
    x: number;
    y: number;
    stars: Star[];
}

interface Flyer {
    size: number;
    delay: number;
    /** Luk putanje: koliko se predmet izdigne i skrene na pola puta (px) */
    lift: number;
    swing: number;
    turn: number;
}

interface Flight {
    id: number;
    from: { x: number; y: number };
    to: { x: number; y: number };
    item: FlyDetail["item"];
    flyers: Flyer[];
}

function makeStars(count = STARS, scale = 1): Star[] {
    return Array.from({ length: count }, (_, i) => {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const distance = (70 + Math.random() * 70) * scale;
        return {
            dx: Math.cos(angle) * distance,
            dy: Math.sin(angle) * distance - 30,
            size: (16 + Math.random() * 14) * Math.min(scale, 1.3),
            turn: (Math.random() - 0.5) * 120,
            delay: Math.random() * 80,
        };
    });
}

function makeFlyers(count: number, item: FlyDetail["item"]): Flyer[] {
    const step = item === "coin" ? 110 : 70;
    return Array.from({ length: count }, (_, i) => ({
        size: item === "coin" ? 30 : 22 + Math.random() * 10,
        delay: i * step,
        lift: 50 + Math.random() * 50,
        swing: (Math.random() - 0.5) * 80,
        turn: (Math.random() - 0.5) * 160,
    }));
}

/** Pokreće let jednog predmeta (Web Animations: po luku do cilja, pa se smanji i nestane) */
function launch(element: SVGSVGElement | null, flight: Flight, flyer: Flyer) {
    if (!element || element.dataset.flying) return;
    element.dataset.flying = "1";
    const dx = flight.to.x - flight.from.x;
    const dy = flight.to.y - flight.from.y;
    const mid = `translate(${dx * 0.5 + flyer.swing}px, ${dy * 0.5 - flyer.lift}px) scale(1.15) rotate(${flyer.turn / 2}deg)`;
    element.animate(
        [
            { transform: "translate(0, 0) scale(0.4)", opacity: 0 },
            { transform: "translate(0, 0) scale(1.1)", opacity: 1, offset: 0.12 },
            { transform: mid, opacity: 1, offset: 0.55 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.6) rotate(${flyer.turn}deg)`, opacity: 0.9, offset: 0.92 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.3) rotate(${flyer.turn}deg)`, opacity: 0 },
        ],
        { duration: FLY_MS, delay: flyer.delay, easing: "cubic-bezier(0.45, 0, 0.35, 1)", fill: "both" }
    );
}

const STAR_PATH = "M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z";

/**
 * Sloj za zvezdice i novčiće; postavlja se jednom preko igre. `disabled` = „Manje animacija”
 * (isto važi i za sistemsko „smanji pokrete”): tada ništa ne leti — drugar samo pokaže „+1”.
 */
export function CelebrationLayer({ disabled = false }: { disabled?: boolean }) {
    const [bursts, setBursts] = useState<Burst[]>([]);
    const [flights, setFlights] = useState<Flight[]>([]);
    const systemReduced = useSystemReduced();
    const off = disabled || systemReduced;

    useEffect(() => {
        if (off) return;
        let next = 0;
        const timers = new Set<ReturnType<typeof setTimeout>>();
        const later = (ms: number, run: () => void) => {
            const timer = setTimeout(() => {
                timers.delete(timer);
                run();
            }, ms);
            timers.add(timer);
        };
        const addBurst = (x: number, y: number, stars: Star[], keep: number) => {
            const id = (next += 1);
            setBursts((list) => [...list.slice(-keep), { id, x, y, stars }]);
            later(BURST_MS + 200, () => setBursts((list) => list.filter((burst) => burst.id !== id)));
        };
        const addFlight = (from: Flight["from"], to: Flight["to"], count: number, item: Flight["item"]) => {
            const id = (next += 1);
            const flyers = makeFlyers(Math.min(count, MAX_FLYING), item);
            setFlights((list) => [...list.slice(-3), { id, from, to, item, flyers }]);
            const longest = flyers.reduce((max, flyer) => Math.max(max, flyer.delay), 0);
            later(FLY_MS + longest + 150, () => setFlights((list) => list.filter((flight) => flight.id !== id)));
        };
        const onCelebrate = (event: Event) => {
            const at = (event as CustomEvent<{ x: number; y: number } | { big: true } | null>).detail;
            if (at && "big" in at) {
                BIG_SPOTS.forEach(([fx, fy], i) => {
                    later(i * BIG_STEP_MS, () => addBurst(window.innerWidth * fx, window.innerHeight * fy, makeStars(14, 1.5), BIG_SPOTS.length));
                });
                return;
            }
            const from = at ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            const target = hypeTarget();
            if (target) {
                // Zvezdice lete do drugara (on skoči kad stignu)
                addFlight(from, centerOf(target), FLYING_STARS, "star");
                return;
            }
            addBurst(from.x, from.y, makeStars(), 2);
        };
        // Niz tačnih odgovora: kad zvezdice stignu, kratak roj zvezdica oko drugara
        const onPraise = (event: Event) => {
            const praise = (event as CustomEvent<PraiseDetail>).detail;
            if (!praise?.big) return;
            later(FLY_MS, () => {
                const target = hypeTarget();
                if (!target) return;
                const center = centerOf(target);
                addBurst(center.x, center.y, makeStars(12, 1.1), 2);
            });
        };
        const onFly = (event: Event) => {
            const fly = (event as CustomEvent<FlyDetail>).detail;
            if (fly) addFlight(fly.from, fly.to, fly.count, fly.item);
        };
        window.addEventListener(EVENT, onCelebrate);
        window.addEventListener(PRAISE_EVENT, onPraise);
        window.addEventListener(FLY_EVENT, onFly);
        return () => {
            window.removeEventListener(EVENT, onCelebrate);
            window.removeEventListener(PRAISE_EVENT, onPraise);
            window.removeEventListener(FLY_EVENT, onFly);
            timers.forEach(clearTimeout);
        };
    }, [off]);

    if (off || (bursts.length === 0 && flights.length === 0)) return null;
    return (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[7000] overflow-hidden">
            {bursts.map((burst) =>
                burst.stars.map((star, i) => (
                    <svg
                        key={`${burst.id}-${i}`}
                        viewBox="0 0 24 24"
                        className="absolute animate-star-burst drop-shadow"
                        style={
                            {
                                left: burst.x - star.size / 2,
                                top: burst.y - star.size / 2,
                                width: star.size,
                                height: star.size,
                                animationDelay: `${star.delay}ms`,
                                "--dx": `${star.dx}px`,
                                "--dy": `${star.dy}px`,
                                "--turn": `${star.turn}deg`,
                            } as React.CSSProperties
                        }
                    >
                        <path d={STAR_PATH} fill="#ffc83d" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                ))
            )}
            {flights.map((flight) =>
                flight.flyers.map((flyer, i) => (
                    <svg
                        key={`${flight.id}-${i}`}
                        ref={(element) => launch(element, flight, flyer)}
                        viewBox="0 0 24 24"
                        className="absolute opacity-0 drop-shadow"
                        style={{ left: flight.from.x - flyer.size / 2, top: flight.from.y - flyer.size / 2, width: flyer.size, height: flyer.size }}
                    >
                        {flight.item === "coin" ? (
                            <>
                                <circle cx="12" cy="12" r="11" fill="#e8a317" />
                                <circle cx="12" cy="12" r="8.6" fill="#fcc934" stroke="#f7e08a" strokeWidth="1" />
                                <path d="M12 6.6l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#e8a317" />
                            </>
                        ) : (
                            <path d={STAR_PATH} fill="#ffc83d" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
                        )}
                    </svg>
                ))
            )}
        </div>
    );
}
