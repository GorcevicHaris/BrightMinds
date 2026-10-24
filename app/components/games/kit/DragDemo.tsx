"use client";

import { useEffect, useState, type CSSProperties } from "react";

// Ruka koja pokazuje prevlačenje: uhvati komad u korpi, odnese ga do njegovog mesta i pusti,
// pa ponovo (mirno, bez skakanja). Deca od 3–6 godina najbolje prate ono što im se POKAŽE
// pokretom, pa prvi komad prvog nivoa pokazuje ruka. Uz „Manje animacija” ruka samo stoji
// na komadu (a mesto svetli mirnom ivicom). Ruka se ne može dodirnuti.

interface Props {
    /** Element u kome stoje i komad i mesto (mora imati `position: relative`) */
    root: HTMLElement | null;
    /** CSS selektori komada i mesta unutar korena */
    from: string;
    to: string;
    calm: boolean;
}

interface Points {
    fx: number;
    fy: number;
    tx: number;
    ty: number;
}

const STYLE = `
@keyframes drag-demo {
  0% { transform: translate(var(--fx), var(--fy)) scale(1); opacity: 0; }
  10% { transform: translate(var(--fx), var(--fy)) scale(1); opacity: 1; }
  20% { transform: translate(var(--fx), var(--fy)) scale(0.86); opacity: 1; }
  66% { transform: translate(var(--tx), var(--ty)) scale(0.86); opacity: 1; }
  76% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 1; }
  92% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
  100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
}
.drag-demo { animation: drag-demo 2.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .drag-demo { animation: none; transform: translate(var(--fx), var(--fy)); } }
`;

function centerIn(root: HTMLElement, selector: string): { x: number; y: number } | null {
    const el = root.querySelector(selector);
    if (!el) return null;
    const box = root.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return null;
    return { x: rect.left - box.left + rect.width / 2, y: rect.top - box.top + rect.height / 2 };
}

export function DragDemo({ root, from, to, calm }: Props) {
    const [points, setPoints] = useState<Points | null>(null);

    useEffect(() => {
        if (!root) return;
        const measure = () => {
            const a = centerIn(root, from);
            const b = centerIn(root, to);
            setPoints(a && b ? { fx: a.x, fy: a.y, tx: b.x, ty: b.y } : null);
        };
        measure();
        const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
        observer?.observe(root);
        window.addEventListener("resize", measure);
        return () => {
            observer?.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [root, from, to]);

    if (!points) return null;
    const vars = { "--fx": `${points.fx}px`, "--fy": `${points.fy}px`, "--tx": `${points.tx}px`, "--ty": `${points.ty}px` } as CSSProperties;
    return (
        <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-30">
            <style>{STYLE}</style>
            <span
                className={calm ? "absolute left-0 top-0" : "drag-demo absolute left-0 top-0"}
                style={{ ...vars, transform: calm ? `translate(${points.fx}px, ${points.fy}px)` : undefined }}
            >
                {/* Vrh kažiprsta je u tački (prst „drži” komad) */}
                <svg viewBox="0 0 24 24" className="-ml-4 -mt-1 h-14 w-14 drop-shadow-lg" fill="#ffffff" stroke="#1f1b3a" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 14a8 8 0 0 1-8 8" />
                    <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
                    <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
                    <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
                    <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                </svg>
            </span>
        </span>
    );
}
