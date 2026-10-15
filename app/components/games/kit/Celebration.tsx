"use client";

import { useEffect, useState } from "react";

// Zvezdice koje polete iz mesta gde je dete dodirnulo tačan odgovor. Kratko (manje od sekunde),
// bez zvuka, i ne pokrivaju ekran — da obraduju, a ne preplave. Pokreće ih `celebrate()`;
// `playSfx("correct")` ga zove sam, pa sve igre dobijaju zvezdice bez posebnog koda.

const EVENT = "bm:celebrate";
const STARS = 10;
const BURST_MS = 1000;

let lastTap: { x: number; y: number } | null = null;
if (typeof window !== "undefined") {
    window.addEventListener("pointerdown", (event) => {
        lastTap = { x: event.clientX, y: event.clientY };
    }, { passive: true, capture: true });
}

export function celebrate() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(EVENT, { detail: lastTap }));
}

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

function makeStars(): Star[] {
    return Array.from({ length: STARS }, (_, i) => {
        const angle = (Math.PI * 2 * i) / STARS + (Math.random() - 0.5) * 0.5;
        const distance = 70 + Math.random() * 70;
        return {
            dx: Math.cos(angle) * distance,
            dy: Math.sin(angle) * distance - 30,
            size: 16 + Math.random() * 14,
            turn: (Math.random() - 0.5) * 120,
            delay: Math.random() * 80,
        };
    });
}

/** Sloj za zvezdice; postavlja se jednom preko igre. `disabled` = manje animacija. */
export function CelebrationLayer({ disabled = false }: { disabled?: boolean }) {
    const [bursts, setBursts] = useState<Burst[]>([]);

    useEffect(() => {
        if (disabled) return;
        let next = 0;
        const timers = new Set<ReturnType<typeof setTimeout>>();
        const onCelebrate = (event: Event) => {
            const at = (event as CustomEvent<{ x: number; y: number } | null>).detail;
            const id = (next += 1);
            const x = at?.x ?? window.innerWidth / 2;
            const y = at?.y ?? window.innerHeight / 2;
            setBursts((list) => [...list.slice(-2), { id, x, y, stars: makeStars() }]);
            const timer = setTimeout(() => {
                timers.delete(timer);
                setBursts((list) => list.filter((burst) => burst.id !== id));
            }, BURST_MS + 200);
            timers.add(timer);
        };
        window.addEventListener(EVENT, onCelebrate);
        return () => {
            window.removeEventListener(EVENT, onCelebrate);
            timers.forEach(clearTimeout);
        };
    }, [disabled]);

    if (disabled || bursts.length === 0) return null;
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
                        <path
                            d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"
                            fill="#ffc83d"
                            stroke="#fff"
                            strokeWidth="1.4"
                            strokeLinejoin="round"
                        />
                    </svg>
                ))
            )}
        </div>
    );
}
