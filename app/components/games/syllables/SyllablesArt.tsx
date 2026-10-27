// Crteži igre „Koliko slogova?”: udarci u bubanj kao krupne tačke (jedan slog — jedan udarac),
// za kutije i brojeve. Bubanj je u world/WorldGame (isti za sve reči); slike reči su postojeće
// slike iz drugih igara (world/basePics).

const SPOTS: Record<number, readonly [number, number][]> = {
    1: [[50, 50]],
    2: [
        [30, 50],
        [70, 50],
    ],
    3: [
        [22, 50],
        [50, 50],
        [78, 50],
    ],
    4: [
        [30, 30],
        [70, 30],
        [30, 70],
        [70, 70],
    ],
};

/** Tačke udaraca: kao bubnjić posle svakog sloga */
export function BeatDots({ count, className }: { count: number; className?: string }) {
    const spots = SPOTS[count] ?? SPOTS[1];
    const r = count >= 3 ? 12.5 : 15;
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {spots.map(([x, y], i) => (
                <g key={i}>
                    <circle cx={x} cy={y + 2} r={r} fill="#b9700d" opacity={0.25} />
                    <circle cx={x} cy={y} r={r} fill="#f0b023" stroke="#b9700d" strokeWidth={2.4} />
                    <circle cx={x - r * 0.35} cy={y - r * 0.38} r={r * 0.28} fill="#ffffff" opacity={0.6} />
                </g>
            ))}
        </svg>
    );
}
