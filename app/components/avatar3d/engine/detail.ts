// Gustina mreže tela pri pravljenju lika: 1 za živi prikaz, manje za sličice (snimke) — isti
// oblik, manje trouglova (brže pravljenje, manje memorije). Važi samo dok se lik pravi.

let current = 1;

export function detail(n: number, min = 6): number {
    return Math.max(min, Math.round(n * current));
}

export function withDetail<T>(k: number, build: () => T): T {
    const previous = current;
    current = k;
    try {
        return build();
    } finally {
        current = previous;
    }
}
