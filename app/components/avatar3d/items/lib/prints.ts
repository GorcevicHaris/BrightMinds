// Šare nacrtane u kodu (bez slika): motivi za grudi majica i dukseva (zvezda, srce, duga,
// sunce, autić, mače, dinosaurus, pahulja, jelka…) i ponavljajuće šare za celu tkaninu
// (tufne, zvezdice, srca, oblačići, cvetići, kocke). Mekane konture kao sito-štampa.
// Sve ide kroz printTexture (keš po ključu, ≤ 512 px).

import * as THREE from "three";
import { shade } from "../../contract";
import { printTexture } from "../../engine/textures";

export type Draw = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => void;

const dk = (hex: string, k = 0.22) => shade(hex, -k);

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, inner = 0.46, points = 5) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const rr = i % 2 === 0 ? r : r * inner;
        const a = -Math.PI / 2 + (i * Math.PI) / points;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.85);
    ctx.bezierCurveTo(x - r * 1.25, y + r * 0.05, x - r * 0.85, y - r * 0.95, x, y - r * 0.38);
    ctx.bezierCurveTo(x + r * 0.85, y - r * 0.95, x + r * 1.25, y + r * 0.05, x, y + r * 0.85);
    ctx.closePath();
}

function fillStroke(ctx: CanvasRenderingContext2D, fill: string, stroke: string, width: number) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.fillStyle = fill;
    ctx.fill();
}

/** Mali sjaj (bela tačkica) — utisak „štampe” koja se presijava */
function shine(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.7, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ── Motivi (crtaju se oko (x, y) poluprečnika r) ───────────────────────────

export const MOTIFS = {
    star: (color: string): Draw => (ctx, x, y, r) => {
        star(ctx, x, y, r);
        fillStroke(ctx, color, dk(color), r * 0.12);
        shine(ctx, x - r * 0.2, y - r * 0.2, r * 0.1);
    },
    heart: (color: string): Draw => (ctx, x, y, r) => {
        heart(ctx, x, y, r);
        fillStroke(ctx, color, dk(color), r * 0.1);
        shine(ctx, x - r * 0.45, y - r * 0.3, r * 0.12);
    },
    rainbow: (): Draw => (ctx, x, y, r) => {
        const colors = ["#E5484D", "#FF9A3D", "#FFD15C", "#4FBF6A", "#3D86E0", "#8E77E6"];
        ctx.lineCap = "round";
        const band = r * 0.13;
        colors.forEach((c, i) => {
            ctx.beginPath();
            ctx.strokeStyle = c;
            ctx.lineWidth = band;
            ctx.arc(x, y + r * 0.35, r - i * band, Math.PI, 0);
            ctx.stroke();
        });
        // Oblačići na krajevima
        for (const sx of [-1, 1]) {
            const cx = x + sx * (r - band * 2.5);
            ctx.fillStyle = "#FFFFFF";
            for (const [dx, dy, rr] of [[-0.18, 0.02, 0.17], [0.02, -0.06, 0.2], [0.2, 0.03, 0.15]]) {
                ctx.beginPath();
                ctx.arc(cx + dx * r, y + r * 0.42 + dy * r, rr * r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },
    sun: (color = "#FFC83D"): Draw => (ctx, x, y, r) => {
        ctx.strokeStyle = color;
        ctx.lineCap = "round";
        ctx.lineWidth = r * 0.12;
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62);
            ctx.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(x, y, r * 0.48, 0, Math.PI * 2);
        fillStroke(ctx, color, dk(color, 0.15), r * 0.06);
        // Nasmejano lice
        ctx.fillStyle = "#8A5A20";
        for (const sx of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(x + sx * r * 0.16, y - r * 0.08, r * 0.055, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.beginPath();
        ctx.strokeStyle = "#8A5A20";
        ctx.lineWidth = r * 0.05;
        ctx.arc(x, y + r * 0.04, r * 0.18, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
    },
    car: (color = "#E5484D"): Draw => (ctx, x, y, r) => {
        ctx.beginPath();
        ctx.roundRect(x - r * 0.95, y - r * 0.1, r * 1.9, r * 0.55, r * 0.18);
        fillStroke(ctx, color, dk(color), r * 0.06);
        ctx.beginPath();
        ctx.moveTo(x - r * 0.55, y - r * 0.1);
        ctx.quadraticCurveTo(x - r * 0.4, y - r * 0.55, x, y - r * 0.55);
        ctx.quadraticCurveTo(x + r * 0.4, y - r * 0.55, x + r * 0.6, y - r * 0.1);
        ctx.closePath();
        fillStroke(ctx, color, dk(color), r * 0.06);
        ctx.fillStyle = "#BFE6FF";
        ctx.beginPath();
        ctx.roundRect(x - r * 0.42, y - r * 0.45, r * 0.36, r * 0.3, r * 0.06);
        ctx.roundRect(x + r * 0.04, y - r * 0.45, r * 0.36, r * 0.3, r * 0.06);
        ctx.fill();
        for (const sx of [-0.52, 0.52]) {
            ctx.beginPath();
            ctx.arc(x + sx * r, y + r * 0.45, r * 0.22, 0, Math.PI * 2);
            fillStroke(ctx, "#3A3546", "#22202A", r * 0.04);
            ctx.beginPath();
            ctx.arc(x + sx * r, y + r * 0.45, r * 0.09, 0, Math.PI * 2);
            ctx.fillStyle = "#DDE4EE";
            ctx.fill();
        }
        ctx.fillStyle = "#FFE08A";
        ctx.beginPath();
        ctx.arc(x + r * 0.86, y + r * 0.08, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
    },
    cat: (color = "#FF9A3D"): Draw => (ctx, x, y, r) => {
        ctx.beginPath();
        ctx.moveTo(x - r * 0.62, y - r * 0.2);
        ctx.lineTo(x - r * 0.55, y - r * 0.85);
        ctx.lineTo(x - r * 0.18, y - r * 0.5);
        ctx.lineTo(x + r * 0.18, y - r * 0.5);
        ctx.lineTo(x + r * 0.55, y - r * 0.85);
        ctx.lineTo(x + r * 0.62, y - r * 0.2);
        ctx.closePath();
        fillStroke(ctx, color, dk(color), r * 0.08);
        ctx.beginPath();
        ctx.ellipse(x, y + r * 0.05, r * 0.72, r * 0.58, 0, 0, Math.PI * 2);
        fillStroke(ctx, color, dk(color), r * 0.08);
        ctx.fillStyle = "#FFB3C1";
        for (const sx of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(x + sx * r * 0.52, y - r * 0.3);
            ctx.lineTo(x + sx * r * 0.48, y - r * 0.68);
            ctx.lineTo(x + sx * r * 0.26, y - r * 0.44);
            ctx.fill();
        }
        ctx.fillStyle = "#3A3546";
        for (const sx of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(x + sx * r * 0.26, y - r * 0.02, r * 0.075, r * 0.11, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = "#F45B8D";
        ctx.beginPath();
        ctx.moveTo(x - r * 0.07, y + r * 0.14);
        ctx.lineTo(x + r * 0.07, y + r * 0.14);
        ctx.lineTo(x, y + r * 0.22);
        ctx.fill();
        ctx.strokeStyle = "#3A3546";
        ctx.lineWidth = r * 0.035;
        for (const sx of [-1, 1]) {
            for (const dy of [0.16, 0.26]) {
                ctx.beginPath();
                ctx.moveTo(x + sx * r * 0.3, y + r * dy);
                ctx.lineTo(x + sx * r * 0.62, y + r * (dy - 0.05 + (dy - 0.2)));
                ctx.stroke();
            }
        }
    },
    dino: (color = "#4FBF6A"): Draw => (ctx, x, y, r) => {
        // Bodlje
        ctx.fillStyle = "#FF9A3D";
        for (let i = 0; i < 5; i++) {
            const a = Math.PI * (1.05 + i * 0.16);
            const px = x - r * 0.1 + Math.cos(a) * r * 0.6;
            const py = y + r * 0.05 + Math.sin(a) * r * 0.5;
            ctx.beginPath();
            ctx.moveTo(px - r * 0.09, py + r * 0.03);
            ctx.lineTo(px + Math.cos(a) * r * 0.16, py + Math.sin(a) * r * 0.16);
            ctx.lineTo(px + r * 0.09, py + r * 0.05);
            ctx.fill();
        }
        // Telo, glava, rep
        ctx.beginPath();
        ctx.ellipse(x - r * 0.1, y + r * 0.15, r * 0.6, r * 0.42, 0, 0, Math.PI * 2);
        ctx.moveTo(x + r * 0.35, y);
        ctx.ellipse(x + r * 0.55, y - r * 0.32, r * 0.3, r * 0.24, -0.2, 0, Math.PI * 2);
        fillStroke(ctx, color, dk(color), r * 0.07);
        ctx.beginPath();
        ctx.moveTo(x - r * 0.6, y + r * 0.1);
        ctx.quadraticCurveTo(x - r * 0.95, y + r * 0.2, x - r * 1.0, y + r * 0.5);
        ctx.quadraticCurveTo(x - r * 0.75, y + r * 0.4, x - r * 0.55, y + r * 0.38);
        fillStroke(ctx, color, dk(color), r * 0.07);
        ctx.fillStyle = shade(color, 0.45);
        ctx.beginPath();
        ctx.ellipse(x - r * 0.05, y + r * 0.27, r * 0.34, r * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = dk(color, 0.1);
        for (const sx of [-0.4, 0.15]) {
            ctx.beginPath();
            ctx.roundRect(x + sx * r, y + r * 0.45, r * 0.18, r * 0.25, r * 0.06);
            ctx.fill();
        }
        ctx.fillStyle = "#3A3546";
        ctx.beginPath();
        ctx.arc(x + r * 0.62, y - r * 0.38, r * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#3A3546";
        ctx.lineWidth = r * 0.035;
        ctx.beginPath();
        ctx.arc(x + r * 0.62, y - r * 0.28, r * 0.12, 0.3, 1.4);
        ctx.stroke();
    },
    snowflake: (color = "#FFFFFF"): Draw => (ctx, x, y, r) => {
        ctx.strokeStyle = color;
        ctx.lineCap = "round";
        ctx.lineWidth = r * 0.11;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const ex = x + Math.cos(a) * r;
            const ey = y + Math.sin(a) * r;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(ex, ey);
            for (const k of [0.45, 0.72]) {
                const bx = x + Math.cos(a) * r * k;
                const by = y + Math.sin(a) * r * k;
                for (const s of [-1, 1]) {
                    ctx.moveTo(bx, by);
                    ctx.lineTo(bx + Math.cos(a + s * 0.8) * r * 0.24, by + Math.sin(a + s * 0.8) * r * 0.24);
                }
            }
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(x, y, r * 0.13, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    },
    tree: (color = "#3BB273"): Draw => (ctx, x, y, r) => {
        ctx.fillStyle = "#9A6236";
        ctx.fillRect(x - r * 0.1, y + r * 0.62, r * 0.2, r * 0.26);
        for (let i = 0; i < 3; i++) {
            const top = y - r * 0.9 + i * r * 0.42;
            const half = r * (0.38 + i * 0.17);
            ctx.beginPath();
            ctx.moveTo(x, top);
            ctx.lineTo(x + half, top + r * 0.62);
            ctx.lineTo(x - half, top + r * 0.62);
            ctx.closePath();
            fillStroke(ctx, color, dk(color), r * 0.06);
        }
        star(ctx, x, y - r * 0.92, r * 0.17);
        fillStroke(ctx, "#FFD15C", "#E9A10E", r * 0.03);
        const balls = [[-0.22, -0.2, "#E5484D"], [0.18, 0.02, "#FFD15C"], [-0.3, 0.38, "#3D86E0"], [0.3, 0.42, "#F45B8D"], [0, 0.24, "#FFFFFF"]] as const;
        for (const [bx, by, c] of balls) {
            ctx.beginPath();
            ctx.arc(x + bx * r, y + by * r, r * 0.07, 0, Math.PI * 2);
            ctx.fillStyle = c;
            ctx.fill();
        }
    },
    flower: (petal = "#FFFFFF", middle = "#FFD15C"): Draw => (ctx, x, y, r) => {
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            ctx.beginPath();
            ctx.ellipse(x + Math.cos(a) * r * 0.48, y + Math.sin(a) * r * 0.48, r * 0.36, r * 0.3, a, 0, Math.PI * 2);
            ctx.fillStyle = petal;
            ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(x, y, r * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = middle;
        ctx.fill();
    },
    fish: (color = "#FF8A3D"): Draw => (ctx, x, y, r) => {
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.6, r * 0.38, 0, 0, Math.PI * 2);
        ctx.moveTo(x - r * 0.5, y);
        ctx.lineTo(x - r * 0.95, y - r * 0.35);
        ctx.lineTo(x - r * 0.95, y + r * 0.35);
        ctx.closePath();
        fillStroke(ctx, color, dk(color), r * 0.07);
        ctx.fillStyle = "#3A3546";
        ctx.beginPath();
        ctx.arc(x + r * 0.32, y - r * 0.06, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = dk(color, 0.3);
        ctx.lineWidth = r * 0.05;
        ctx.beginPath();
        ctx.arc(x + r * 0.05, y, r * 0.2, -1.1, 1.1);
        ctx.stroke();
    },
    cloud: (color = "#FFFFFF"): Draw => (ctx, x, y, r) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x - r * 0.4, y + r * 0.1, r * 0.35, 0, Math.PI * 2);
        ctx.arc(x + r * 0.05, y - r * 0.12, r * 0.45, 0, Math.PI * 2);
        ctx.arc(x + r * 0.5, y + r * 0.12, r * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - r * 0.4, y + r * 0.1, r * 0.9, r * 0.32);
    },
    moon: (color = "#FFD15C"): Draw => (ctx, x, y, r) => {
        ctx.beginPath();
        ctx.arc(x, y, r * 0.8, 0.5 * Math.PI - 1.2, 1.5 * Math.PI + 1.2, true);
        ctx.arc(x + r * 0.32, y - r * 0.1, r * 0.62, 1.5 * Math.PI + 1.0, 0.5 * Math.PI - 1.0, false);
        ctx.closePath();
        fillStroke(ctx, color, dk(color), r * 0.06);
    },
    bolt: (color = "#FFD15C"): Draw => (ctx, x, y, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r * 0.15, y - r);
        ctx.lineTo(x - r * 0.5, y + r * 0.1);
        ctx.lineTo(x - r * 0.02, y + r * 0.1);
        ctx.lineTo(x - r * 0.2, y + r);
        ctx.lineTo(x + r * 0.5, y - r * 0.15);
        ctx.lineTo(x + r * 0.04, y - r * 0.15);
        ctx.closePath();
        fillStroke(ctx, color, dk(color), r * 0.07);
    },
    paw: (color = "#8A5A30"): Draw => (ctx, x, y, r) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, y + r * 0.25, r * 0.42, r * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
        for (const [dx, dy] of [[-0.5, -0.2], [-0.18, -0.5], [0.18, -0.5], [0.5, -0.2]]) {
            ctx.beginPath();
            ctx.ellipse(x + dx * r, y + dy * r, r * 0.16, r * 0.2, dx * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    soccer: (): Draw => (ctx, x, y, r) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        fillStroke(ctx, "#FFFFFF", "#3A3546", r * 0.07);
        const pent = (cx: number, cy: number, rr: number, rot: number) => {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = rot + (i / 5) * Math.PI * 2;
                ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
            }
            ctx.closePath();
            ctx.fillStyle = "#3A3546";
            ctx.fill();
        };
        pent(x, y, r * 0.32, -Math.PI / 2);
        for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
            pent(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85, r * 0.22, a + Math.PI / 5);
        }
    },
    basketball: (): Draw => (ctx, x, y, r) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        fillStroke(ctx, "#FF8A3D", "#B85A1E", r * 0.07);
        ctx.strokeStyle = "#5A2E10";
        ctx.lineWidth = r * 0.07;
        ctx.beginPath();
        ctx.moveTo(x - r, y);
        ctx.lineTo(x + r, y);
        ctx.moveTo(x, y - r);
        ctx.lineTo(x, y + r);
        ctx.stroke();
        for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(x + s * r * 1.15, y, r * 0.8, Math.PI / 2 + s * Math.PI / 2 - 0.95, Math.PI / 2 + s * Math.PI / 2 + 0.95);
            ctx.stroke();
        }
    },
    number: (text: string, color: string, outline: string): Draw => (ctx, x, y, r) => {
        ctx.font = `900 ${Math.round(r * 1.7)}px "Arial Black", Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.lineWidth = r * 0.16;
        ctx.strokeStyle = outline;
        ctx.strokeText(text, x, y + r * 0.08);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y + r * 0.08);
    },
} as const;

/** Jedan motiv na providnoj pozadini (nalepnica za grudi) */
export function motifTexture(key: string, draw: Draw, size = 256): THREE.Texture {
    return printTexture(`motif-${key}`, (ctx, w, h) => draw(ctx, w / 2, h / 2, Math.min(w, h) * 0.42), size, size);
}

/** Više motiva na jednoj nalepnici (ribice na kupaćem) */
export function sceneTexture(key: string, draws: [Draw, number, number, number][], size = 256): THREE.Texture {
    return printTexture(`scene-${key}`, (ctx, w) => {
        for (const [draw, x, y, r] of draws) draw(ctx, x * w, y * w, r * w);
    }, size, size);
}

/**
 * Ponavljajuća šara po celoj tkanini: osnova + motiv u mreži (svaki drugi red pomeren).
 * `tile` = veličina ponavljanja u metrima (UV odeće su u metrima).
 */
export function patternTexture(key: string, base: string, draw: Draw | null, options: { tile?: number; scale?: number; size?: number; rotate?: boolean } = {}): THREE.Texture {
    const size = options.size ?? 128;
    const tex = printTexture(`pattern-${key}`, (ctx, w, h) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);
        if (!draw) return;
        const r = (options.scale ?? 0.18) * w;
        const spots: [number, number][] = [[0.25, 0.25], [0.75, 0.75], [0.25 + 1, 0.25], [0.75 - 1, 0.75], [0.25, 0.25 + 1], [0.75, 0.75 - 1]];
        for (const [sx, sy] of spots) {
            ctx.save();
            ctx.translate(sx * w, sy * h);
            if (options.rotate) ctx.rotate(sx > 0.5 ? 0.35 : -0.3);
            draw(ctx, 0, 0, r);
            ctx.restore();
        }
    }, size, size);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const repeat = 1 / (options.tile ?? 0.06);
    tex.repeat.set(repeat, repeat);
    return tex;
}

/** Tufne (krug) kao ponavljajuća šara */
export function dotsTexture(base: string, dot: string, tile = 0.045, scale = 0.14): THREE.Texture {
    return patternTexture(`dots-${base}-${dot}-${tile}-${scale}`, base, (ctx, x, y, r) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = dot;
        ctx.fill();
    }, { tile, scale });
}

/** Pruge: širina pruge `ratio` od ponavljanja `tile` (m); `vertical` za uspravne */
export function stripeTexture(base: string, stripe: string, tile = 0.04, ratio = 0.4, vertical = false): THREE.Texture {
    const tex = printTexture(`stripe-${base}-${stripe}-${ratio}-${vertical}`, (ctx, w, h) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = stripe;
        if (vertical) ctx.fillRect(w * (0.5 - ratio / 2), 0, w * ratio, h);
        else ctx.fillRect(0, h * (0.5 - ratio / 2), w, h * ratio);
        // Meki prelaz (tkana pruga, ne oštra ivica)
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = shade(stripe, -0.15);
        if (vertical) {
            ctx.fillRect(w * (0.5 - ratio / 2), 0, w * 0.02, h);
            ctx.fillRect(w * (0.5 + ratio / 2) - w * 0.02, 0, w * 0.02, h);
        } else {
            ctx.fillRect(0, h * (0.5 - ratio / 2), w, h * 0.02);
            ctx.fillRect(0, h * (0.5 + ratio / 2) - h * 0.02, w, h * 0.02);
        }
        ctx.globalAlpha = 1;
    }, 64, 64);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1 / tile, 1 / tile);
    return tex;
}

/** Kocke (karirano): osnova, široke trake i tanke linije */
export function checkTexture(base: string, line: string, tile = 0.05, fine = "#FFFFFF"): THREE.Texture {
    const tex = printTexture(`check-${base}-${line}-${fine}`, (ctx, w, h) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = line;
        ctx.fillRect(0, h * 0.3, w, h * 0.3);
        ctx.fillRect(w * 0.3, 0, w * 0.3, h);
        ctx.globalAlpha = 0.3;
        ctx.fillRect(0, h * 0.8, w, h * 0.06);
        ctx.fillRect(w * 0.8, 0, w * 0.06, h);
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = fine;
        ctx.fillRect(0, h * 0.1, w, h * 0.03);
        ctx.fillRect(w * 0.1, 0, w * 0.03, h);
        ctx.globalAlpha = 1;
    }, 128, 128);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1 / tile, 1 / tile);
    return tex;
}

/** Šahovnica (kuvarske pantalone, zastavica) */
export function checkerTexture(a: string, b: string, tile = 0.03): THREE.Texture {
    const tex = printTexture(`checker-${a}-${b}`, (ctx, w, h) => {
        ctx.fillStyle = a;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = b;
        ctx.fillRect(0, 0, w / 2, h / 2);
        ctx.fillRect(w / 2, h / 2, w / 2, h / 2);
    }, 32, 32);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1 / tile, 1 / tile);
    return tex;
}
