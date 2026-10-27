"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

// Prevlačenje komada do mesta (umetaljke, sat): komad se uhvati prstom, prati prst i, kad se
// pusti blizu otvorenog mesta, „legne” u njega. Mesta su elementi sa `data-slot="<id>"`
// (otvorena imaju i `data-open`), unutar korena (`root`). Domet je velikodušan: računa se
// najbliže otvoreno mesto, ne samo ono tačno ispod prsta — mala ruka ne mora da pogodi ivicu.
// Isti komad se može i dodirnuti (izbor), pa dodirnuti mesto: za decu kojoj je prevlačenje
// teško i za tastaturu. Komad koji nije pao na svoje mesto mirno se vrati u korpu.

/** Pomeranje (px) posle kog dodir postaje prevlačenje */
const DRAG_START_PX = 8;
/** Koliko traje povratak komada u korpu */
export const RETURN_MS = 280;
/** Koliko se komad ljulja na pogrešnom mestu pre povratka */
export const WOBBLE_MS = 420;
/** Domet mesta: deo veće stranice mesta, mereno od njegove sredine */
const SNAP_REACH = 0.7;
/**
 * Najmanji domet (px): i sitna rupa (sat na položenom telefonu) prima komad pušten otprilike
 * jedan prst od sredine. Bira se najbliže mesto, pa veći domet ne „krade” komad susednoj rupi.
 */
const MIN_REACH_PX = 40;
/** Klik koji pregledač pošalje odmah posle puštenog komada (ne bira komad ponovo) */
const SKIP_CLICK_MS = 400;

interface Options {
    enabled: boolean;
    /** Bez klizanja nazad (Manje animacija) */
    calm: boolean;
    /** Komad je pušten iznad mesta (ili nijednog). Vraća true kad je komad prihvaćen. */
    onDrop: (piece: string, slot: string | null) => boolean;
    /** Dodir komada bez prevlačenja (izbor) */
    onTap: (piece: string) => void;
    /** Komad je uhvaćen (npr. postaje izabran, da dugme „okreni” deluje na njega) */
    onGrab?: (piece: string) => void;
}

interface DragState {
    piece: string;
    pointerId: number;
    startX: number;
    startY: number;
    /** Sredina komada u korpi (odatle je uzet i tu se vraća) */
    originX: number;
    originY: number;
    /** Gde je prst uhvatio komad, u odnosu na njegovu sredinu */
    offX: number;
    offY: number;
    moved: boolean;
}

export interface DragSnap {
    /** Koren u kome se traže mesta */
    rootRef: (el: HTMLElement | null) => void;
    /** Ref za „duh” komada koji prati prst (crta ga igra, fiksno pozicioniran) */
    ghostRef: (el: HTMLElement | null) => void;
    /** Komad koji se upravo prevlači ili vraća */
    active: string | null;
    dragging: boolean;
    /** Komad se ljulja na mestu u koje ne ulazi (pre povratka u korpu) */
    wobble: boolean;
    /** Otvoreno mesto u čijem je dometu komad */
    over: string | null;
    /** Rukovaoci za dugme komada */
    pieceProps: (piece: string) => {
        onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
        onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
        onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
        onPointerCancel: () => void;
        onClick: () => void;
    };
}

/** Najbliže otvoreno mesto u dometu tačke (x, y) */
export function nearestSlot(root: ParentNode | null, x: number, y: number): string | null {
    if (!root) return null;
    let best: { id: string; dist: number } | null = null;
    root.querySelectorAll<HTMLElement>("[data-slot][data-open]").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const dist = Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2));
        const reach = Math.max(Math.max(rect.width, rect.height) * SNAP_REACH, MIN_REACH_PX);
        const id = el.dataset.slot;
        if (id && dist <= reach && (!best || dist < best.dist)) best = { id, dist };
    });
    return (best as { id: string } | null)?.id ?? null;
}

export function useDragSnap({ enabled, calm, onDrop, onTap, onGrab }: Options): DragSnap {
    const root = useRef<HTMLElement | null>(null);
    const ghost = useRef<HTMLElement | null>(null);
    const drag = useRef<DragState | null>(null);
    const point = useRef({ x: 0, y: 0 });
    /**
     * Do kada se klik posle puštenog komada zanemaruje. Vreme, a ne zastavica: kad komad legne na
     * mesto i nestane iz korpe, pregledač mu klik ni ne pošalje, pa bi zastavica ostala uključena i
     * „progutala” sledeći dodir deteta.
     */
    const skipClickUntil = useRef(0);
    const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [active, setActive] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [over, setOver] = useState<string | null>(null);
    const [wobble, setWobble] = useState(false);
    const handlers = useRef({ onDrop, onTap, onGrab });
    useEffect(() => {
        handlers.current = { onDrop, onTap, onGrab };
    });
    useEffect(
        () => () => {
            if (returnTimer.current !== null) clearTimeout(returnTimer.current);
        },
        []
    );

    const place = useCallback((el: HTMLElement | null) => {
        if (!el) return;
        el.style.transition = "none";
        el.style.transform = `translate(${point.current.x}px, ${point.current.y}px) translate(-50%, -50%)`;
    }, []);

    const ghostRef = useCallback(
        (el: HTMLElement | null) => {
            ghost.current = el;
            place(el);
        },
        [place]
    );

    const rootRef = useCallback((el: HTMLElement | null) => {
        root.current = el;
    }, []);

    const clear = useCallback(() => {
        drag.current = null;
        setActive(null);
        setDragging(false);
        setOver(null);
    }, []);

    /**
     * Komad nije prihvaćen: kratko se zaljulja (ne ulazi), pa klizne nazad do korpe.
     * `rejected` = pao je na mesto koje nije njegovo; pušten u prazno samo se vrati.
     * Uz mirne pokrete odmah nestane (i stoji u korpi kao pre).
     */
    const sendBack = useCallback(
        (current: DragState, rejected: boolean) => {
            drag.current = null;
            setDragging(false);
            setOver(null);
            const el = ghost.current;
            if (calm || !el) {
                setActive(null);
                return;
            }
            if (returnTimer.current !== null) clearTimeout(returnTimer.current);
            const glide = () => {
                setWobble(false);
                el.style.transition = `transform ${RETURN_MS}ms cubic-bezier(0.3, 0.7, 0.4, 1)`;
                el.style.transform = `translate(${current.originX}px, ${current.originY}px) translate(-50%, -50%)`;
                returnTimer.current = setTimeout(() => {
                    returnTimer.current = null;
                    setActive(null);
                }, RETURN_MS);
            };
            if (!rejected) {
                glide();
                return;
            }
            setWobble(true);
            returnTimer.current = setTimeout(glide, WOBBLE_MS);
        },
        [calm]
    );

    const pieceProps = useCallback(
        (piece: string) => ({
            onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
                if (!enabled || drag.current || (event.pointerType === "mouse" && event.button !== 0)) return;
                // Prst „drži” komad i kad izađe iz korpe (bez hvatanja događaji stižu dok je prst nad komadom)
                try {
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                } catch {
                    /* bez hvatanja */
                }
                const rect = event.currentTarget.getBoundingClientRect();
                const originX = rect.left + rect.width / 2;
                const originY = rect.top + rect.height / 2;
                drag.current = {
                    piece,
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    originX,
                    originY,
                    offX: event.clientX - originX,
                    offY: event.clientY - originY,
                    moved: false,
                };
                point.current = { x: originX, y: originY };
            },
            onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
                const current = drag.current;
                if (!current || current.pointerId !== event.pointerId) return;
                if (!current.moved) {
                    if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < DRAG_START_PX) return;
                    current.moved = true;
                    if (returnTimer.current !== null) clearTimeout(returnTimer.current);
                    setWobble(false);
                    setActive(current.piece);
                    setDragging(true);
                    handlers.current.onGrab?.(current.piece);
                }
                // Sredina komada prati prst (komad ostaje uhvaćen tamo gde ga je prst uzeo)
                point.current = { x: event.clientX - current.offX, y: event.clientY - current.offY };
                place(ghost.current);
                const target = nearestSlot(root.current, point.current.x, point.current.y);
                setOver((previous) => (previous === target ? previous : target));
            },
            onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
                const current = drag.current;
                if (!current || current.pointerId !== event.pointerId) return;
                if (!current.moved) {
                    drag.current = null;
                    return;
                }
                // Pušten komad: klik koji sledi ne bira ga ponovo
                skipClickUntil.current = Date.now() + SKIP_CLICK_MS;
                const slot = nearestSlot(root.current, point.current.x, point.current.y);
                const accepted = handlers.current.onDrop(current.piece, slot);
                if (accepted) clear();
                else sendBack(current, slot !== null);
            },
            onPointerCancel: () => {
                const current = drag.current;
                if (current?.moved) sendBack(current, false);
                else drag.current = null;
            },
            onClick: () => {
                if (Date.now() < skipClickUntil.current) {
                    skipClickUntil.current = 0;
                    return;
                }
                if (enabled) handlers.current.onTap(piece);
            },
        }),
        [enabled, place, clear, sendBack]
    );

    return { rootRef, ghostRef, active, dragging, wobble, over, pieceProps };
}
