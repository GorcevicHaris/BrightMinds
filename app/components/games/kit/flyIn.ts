// Let do mesta: izabrani deo (ili slovo, slog, predmet) doleti iz kartice izbora tačno na svoje
// mesto na slici. Crta se samo element na odredištu; on kreće iz pravougaonika kartice
// (pomeren i uvećan) i mirno klizne na svoje mesto. Uz „Manje animacija” nema leta.

/** Koliko traje let */
export const FLY_IN_MS = 560;

export interface Box {
    left: number;
    top: number;
    width: number;
    height: number;
}

export function boxOf(element: Element | null | undefined): Box | null {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

/**
 * `element` (već na svom mestu) doleti iz pravougaonika `from`. `target` je deo elementa koji
 * treba da se poklopi sa `from` (npr. sam deo unutar slike veličine cele slike); bez njega
 * ceo element. Vraća false kad leta nema (nema mere ili pregledač ne zna za animacije).
 */
export function flyIn(element: Element | null | undefined, from: Box | null, target?: Box | null): boolean {
    const own = boxOf(element);
    if (!element || !own || !from || typeof (element as HTMLElement).animate !== "function") return false;
    const goal = target ?? own;
    if (goal.width === 0) return false;
    const k = from.width / goal.width;
    const dx = from.left - own.left - (goal.left - own.left) * k;
    const dy = from.top - own.top - (goal.top - own.top) * k;
    (element as HTMLElement).animate(
        [
            { transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${k})`, opacity: 0.9 },
            { transformOrigin: "0 0", transform: "translate(0, 0) scale(1)", opacity: 1 },
        ],
        { duration: FLY_IN_MS, easing: "cubic-bezier(0.3, 0.7, 0.35, 1)" }
    );
    return true;
}
