// Lažno platno za testove 3D kataloga: teksture se u kodu crtaju na <canvas>, a u Node-u ga
// nema. Ovo je dovoljno da se geometrija predmeta sagradi i izmeri (trouglovi, granice),
// bez crtanja piksela. Uvozi se samo iz testova kojima treba (pre uvoza predmeta).

const noop = () => undefined;

function fakeContext(): CanvasRenderingContext2D {
    const target: Record<string, unknown> = {
        createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        getImageData: (_x: number, _y: number, w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        createLinearGradient: () => ({ addColorStop: noop }),
        createRadialGradient: () => ({ addColorStop: noop }),
        createPattern: () => ({}),
        measureText: () => ({ width: 0 }),
    };
    return new Proxy(target, {
        get: (t, key: string) => (key in t ? t[key] : noop),
        set: () => true,
    }) as unknown as CanvasRenderingContext2D;
}

export function installFakeCanvas() {
    const g = globalThis as unknown as { document?: unknown };
    if (g.document) return;
    g.document = {
        createElement: (tag: string) => {
            if (tag !== "canvas") return {};
            return { width: 0, height: 0, style: {}, getContext: () => fakeContext() };
        },
        createElementNS: () => ({ style: {} }),
    };
}
