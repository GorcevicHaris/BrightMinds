"use client";

// Prevlačenje komada na mesto (bebe do mame, predmeti u ranac), uz isti „dodir, pa dodir” put za
// decu kojoj je prevlačenje teško (i za tastaturu). Mesto za spuštanje je bilo koji element sa
// `data-drop="<id>"`; komad koji se prevlači prati prst kao „duh” (crta ga igra).

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

/** Pomeranje (px) posle kog dodir postaje prevlačenje */
export const DRAG_START_PX = 8;

interface DragState {
    piece: string;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
}

interface Options {
    disabled: boolean;
    /** Komad je spušten na mesto `target` */
    onDrop: (piece: string, target: string) => void;
    /** Komad je samo dodirnut (bez prevlačenja) */
    onTap: (piece: string) => void;
}

export function dropTargetAt(x: number, y: number): string | null {
    if (typeof document === "undefined") return null;
    return document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop]")?.dataset.drop ?? null;
}

/**
 *   const dnd = useDragDrop({ disabled, onDrop: place, onTap: select });
 *   <button data-piece={id} {...dnd.bind(id)} className="touch-none" />
 *   <button data-drop={target} />
 *   {dnd.dragging && <div ref={dnd.ghostRef} className="pointer-events-none fixed left-0 top-0 z-50">…</div>}
 */
export function useDragDrop({ disabled, onDrop, onTap }: Options) {
    const drag = useRef<DragState | null>(null);
    const point = useRef({ x: 0, y: 0 });
    const ghost = useRef<HTMLElement | null>(null);
    const skipClick = useRef(false);
    const [dragging, setDragging] = useState<string | null>(null);
    const [over, setOver] = useState<string | null>(null);

    const ghostRef = (el: HTMLElement | null) => {
        ghost.current = el;
        if (el) el.style.transform = `translate(${point.current.x}px, ${point.current.y}px) translate(-50%, -60%)`;
    };

    const reset = () => {
        drag.current = null;
        setDragging(null);
        setOver(null);
    };

    const bind = (piece: string) => ({
        onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
            if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
            // Prst „drži” komad i kad izađe iz kartice (gde hvatanje nije moguće — bez njega)
            try {
                event.currentTarget.setPointerCapture?.(event.pointerId);
            } catch {
                /* bez hvatanja: događaji i dalje stižu dok je prst nad karticom */
            }
            drag.current = { piece, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
            point.current = { x: event.clientX, y: event.clientY };
        },
        onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
            const current = drag.current;
            if (!current || current.pointerId !== event.pointerId) return;
            point.current = { x: event.clientX, y: event.clientY };
            if (!current.moved) {
                if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < DRAG_START_PX) return;
                current.moved = true;
                setDragging(current.piece);
            }
            ghostRef(ghost.current);
            const target = dropTargetAt(event.clientX, event.clientY);
            setOver((previous) => (previous === target ? previous : target));
        },
        onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
            const current = drag.current;
            if (!current || current.pointerId !== event.pointerId) return;
            if (current.moved) {
                // Spušten komad: dodir koji sledi (click) ga ne bira ponovo
                skipClick.current = true;
                const target = dropTargetAt(event.clientX, event.clientY);
                if (target) onDrop(current.piece, target);
            }
            reset();
        },
        onPointerCancel: reset,
        onClick: () => {
            if (skipClick.current) {
                skipClick.current = false;
                return;
            }
            if (!disabled) onTap(piece);
        },
    });

    return { dragging, over, bind, ghostRef };
}

// ── Pokazivanje prevlačenja ───────────────────────────────────────────────────

/**
 * Ruka mirno „odnese” komad do mesta (pokazni zadatak prvog nivoa): tri puta, pa stoji na
 * komadu. Komad i mesto se nalaze po `data-piece` i `data-drop`. Uz „Manje animacija” ruka
 * samo stoji na komadu (bez kretanja).
 */
export function DragDemo({ piece, target, calm }: { piece: string; target: string; calm: boolean }) {
    const hand = useRef<HTMLDivElement | null>(null);
    const [spots, setSpots] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);

    useEffect(() => {
        const measure = () => {
            const a = document.querySelector<HTMLElement>(`[data-piece="${CSS.escape(piece)}"]`);
            const b = document.querySelector<HTMLElement>(`[data-drop="${CSS.escape(target)}"]`);
            if (!a || !b) return;
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            setSpots({ from: { x: ra.left + ra.width / 2, y: ra.top + ra.height / 2 }, to: { x: rb.left + rb.width / 2, y: rb.top + rb.height / 2 } });
        };
        // Posle prvog crtanja (kartice se pojavljuju uz kratku animaciju)
        const timer = window.setTimeout(measure, 450);
        window.addEventListener("resize", measure);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("resize", measure);
        };
    }, [piece, target]);

    useEffect(() => {
        const el = hand.current;
        if (!el || !spots || calm || typeof el.animate !== "function") return;
        const dx = spots.to.x - spots.from.x;
        const dy = spots.to.y - spots.from.y;
        const animation = el.animate(
            [
                { transform: "translate(0, 0) scale(1)", opacity: 0 },
                { transform: "translate(0, 0) scale(0.9)", opacity: 1, offset: 0.15 },
                { transform: `translate(${dx}px, ${dy}px) scale(0.9)`, opacity: 1, offset: 0.7 },
                { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 0 },
            ],
            { duration: 2200, iterations: 3, easing: "ease-in-out", delay: 300 }
        );
        return () => animation.cancel();
    }, [spots, calm]);

    if (!spots) return null;
    const style: CSSProperties = { left: spots.from.x - 14, top: spots.from.y - 6 };
    return (
        <div ref={hand} aria-hidden="true" className="pointer-events-none fixed z-40" style={style}>
            <svg viewBox="0 0 24 24" className="h-12 w-12 drop-shadow-lg sm:h-14 sm:w-14" fill="#ffffff" stroke="#1f1b3a" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 14a8 8 0 0 1-8 8" />
                <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
                <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
                <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
                <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
            </svg>
        </div>
    );
}

/** Duh komada koji prati prst */
export function DragGhost({ ghostRef, children }: { ghostRef: (el: HTMLElement | null) => void; children: ReactNode }) {
    return (
        <div ref={ghostRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-50 drop-shadow-xl">
            {children}
        </div>
    );
}
