"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";
import { isMuted } from "@/lib/sound";
import { Feedback, GameHud, GamePrompt, GameStage, isFemale, playSfx, useGameSync } from "@/app/components/games/kit";
import type { BaseView, FeedbackKind, GameProps } from "@/app/components/games/kit";

// ── Boje ──────────────────────────────────────────────────────────────────────
// Bele nema namerno: na belom papiru se ne vidi, pa dete ne bi dobilo potvrdu.

type ColorId = "red" | "orange" | "yellow" | "green" | "lime" | "blue" | "sky" | "purple" | "pink" | "brown" | "gray" | "black";

interface PaintColor {
    id: ColorId;
    hex: string;
    /** "crvena" (boja) */
    nom: string;
    /** "Izaberi crvenu boju" */
    acc: string;
    /** "Oboji krov crvenom bojom" */
    inst: string;
    /** Svetla boja — kvačica izabrane boje je tamna */
    light?: boolean;
}

const COLORS: PaintColor[] = [
    { id: "red", hex: "#EF4444", nom: "crvena", acc: "crvenu", inst: "crvenom" },
    { id: "orange", hex: "#F97316", nom: "narandžasta", acc: "narandžastu", inst: "narandžastom" },
    { id: "yellow", hex: "#FACC15", nom: "žuta", acc: "žutu", inst: "žutom", light: true },
    { id: "green", hex: "#16A34A", nom: "zelena", acc: "zelenu", inst: "zelenom" },
    { id: "blue", hex: "#2563EB", nom: "plava", acc: "plavu", inst: "plavom" },
    { id: "purple", hex: "#9333EA", nom: "ljubičasta", acc: "ljubičastu", inst: "ljubičastom" },
    { id: "pink", hex: "#F472B6", nom: "roze", acc: "roze", inst: "roze" },
    { id: "brown", hex: "#92400E", nom: "braon", acc: "braon", inst: "braon" },
    { id: "lime", hex: "#86EFAC", nom: "svetlozelena", acc: "svetlozelenu", inst: "svetlozelenom", light: true },
    { id: "sky", hex: "#7DD3FC", nom: "svetloplava", acc: "svetloplavu", inst: "svetloplavom", light: true },
    { id: "gray", hex: "#9CA3AF", nom: "siva", acc: "sivu", inst: "sivom" },
    { id: "black", hex: "#1F2937", nom: "crna", acc: "crnu", inst: "crnom" },
];

const COLOR_BY_ID: Record<string, PaintColor | undefined> = Object.fromEntries(COLORS.map((c) => [c.id, c]));

/** Laki i srednji nivoi: 8 osnovnih boja. Teški: svih 12 (uz svetle nijanse, sivu i crnu). */
const BASIC_COLORS = 8;
const ERASER = "eraser";

const PAPER = "#FFFFFF";
const OUTLINE = "#2B2647";
const HIGHLIGHT = "#6C61F0";

// ── Slike ─────────────────────────────────────────────────────────────────────

interface Zone {
    id: string;
    /** "krov" */
    name: string;
    /** "Oboji krov" */
    acc: string;
    d: string;
    /** Širina nevidljive ivice koja malom delu daje veću površinu za dodir */
    hit?: number;
}

interface Detail {
    d: string;
    fill: string;
}

interface Picture {
    name: string;
    /** "Oboji kućicu" */
    acc: string;
    emoji: string;
    viewBox: string;
    /** Delovi za bojenje, redom kojim se crtaju (kasniji su iznad ranijih) */
    zones: Zone[];
    /** Unapred obojeni ukrasi (oči, kvaka…) — ne mogu se bojiti */
    details?: Detail[];
    /** Ukrasne linije (brkovi, osmeh…) */
    lines?: string;
    /** Zadaci "oboji deo ovom bojom" za srednje i teške nivoe: [id dela, boja] */
    tasks?: [string, ColorId][];
}

function ellipse(cx: number, cy: number, rx: number, ry: number, rotation = 0): string {
    const rad = (rotation * Math.PI) / 180;
    const dx = Math.round(rx * Math.cos(rad) * 10) / 10;
    const dy = Math.round(rx * Math.sin(rad) * 10) / 10;
    return `M${cx - dx},${cy - dy} a${rx},${ry} ${rotation} 1,0 ${2 * dx},${2 * dy} a${rx},${ry} ${rotation} 1,0 ${-2 * dx},${-2 * dy} Z`;
}

function circle(cx: number, cy: number, r: number): string {
    return ellipse(cx, cy, r, r);
}

const INK = "#1F2937";

// Jedna slika po nivou: 1–5 slobodno bojenje, 6–15 bojenje po uputstvu.
const PICTURES: Picture[] = [
    {
        name: "Lopta",
        acc: "loptu",
        emoji: "⚽",
        viewBox: "42 67 316 316",
        zones: [
            { id: "p1", name: "prvo polje", acc: "prvo polje", d: "M200,225 L200,75 A150,150 0 0,1 329.9,150 Z" },
            { id: "p2", name: "drugo polje", acc: "drugo polje", d: "M200,225 L329.9,150 A150,150 0 0,1 329.9,300 Z" },
            { id: "p3", name: "treće polje", acc: "treće polje", d: "M200,225 L329.9,300 A150,150 0 0,1 200,375 Z" },
            { id: "p4", name: "četvrto polje", acc: "četvrto polje", d: "M200,225 L200,375 A150,150 0 0,1 70.1,300 Z" },
            { id: "p5", name: "peto polje", acc: "peto polje", d: "M200,225 L70.1,300 A150,150 0 0,1 70.1,150 Z" },
            { id: "p6", name: "šesto polje", acc: "šesto polje", d: "M200,225 L70.1,150 A150,150 0 0,1 200,75 Z" },
            { id: "sredina", name: "sredina lopte", acc: "sredinu lopte", d: circle(200, 225, 38) },
        ],
    },
    {
        name: "Drvo",
        acc: "drvo",
        emoji: "🌳",
        viewBox: "80 95 240 340",
        zones: [
            { id: "trava", name: "trava", acc: "travu", d: "M88,402 Q200,380 312,402 L312,428 L88,428 Z" },
            { id: "stablo", name: "stablo", acc: "stablo", d: "M176,412 L224,412 L214,285 L186,285 Z", hit: 14 },
            {
                id: "krosnja",
                name: "krošnja",
                acc: "krošnju",
                d: "M200,300 C150,305 118,270 135,232 C105,205 122,150 165,150 C172,110 228,110 235,150 C278,150 295,205 265,232 C282,270 250,305 200,300 Z",
            },
            { id: "j1", name: "leva jabuka", acc: "levu jabuku", d: circle(162, 232, 16), hit: 14 },
            { id: "j2", name: "desna jabuka", acc: "desnu jabuku", d: circle(238, 232, 16), hit: 14 },
            { id: "j3", name: "gornja jabuka", acc: "gornju jabuku", d: circle(200, 172, 16), hit: 14 },
        ],
    },
    {
        name: "Sladoled",
        acc: "sladoled",
        emoji: "🍦",
        viewBox: "108 52 184 382",
        zones: [
            { id: "gornja", name: "gornja kugla", acc: "gornju kuglu", d: circle(200, 180, 62) },
            { id: "donja", name: "donja kugla", acc: "donju kuglu", d: "M122,270 A78,78 0 0,1 278,270 Z" },
            { id: "kornet", name: "kornet", acc: "kornet", d: "M130,270 L270,270 L200,425 Z" },
            { id: "tresnja", name: "trešnja", acc: "trešnju", d: circle(200, 108, 20), hit: 14 },
        ],
        lines: "M200,90 Q212,66 228,64 M165,270 L217.5,386 M200,270 L235,347.5 M235,270 L252.5,309 M235,270 L182.5,386 M200,270 L165,347.5 M165,270 L147.5,309",
    },
    {
        name: "Brod",
        acc: "brod",
        emoji: "⛵",
        viewBox: "30 55 345 365",
        zones: [
            { id: "sunce", name: "sunce", acc: "sunce", d: circle(322, 112, 34) },
            { id: "jedro1", name: "levo jedro", acc: "levo jedro", d: "M192,100 L100,262 L192,262 Z" },
            { id: "jedro2", name: "desno jedro", acc: "desno jedro", d: "M208,125 L280,262 L208,262 Z" },
            { id: "zastava", name: "zastava", acc: "zastavu", d: "M205,62 L265,84 L205,106 Z", hit: 12 },
            { id: "trup", name: "trup broda", acc: "trup broda", d: "M92,280 L308,280 L275,352 L125,352 Z" },
            { id: "more", name: "more", acc: "more", d: "M36,345 Q82,322 128,345 T220,345 T312,345 T368,340 L368,412 L36,412 Z" },
        ],
        details: [{ d: "M195,62 L205,62 L205,280 L195,280 Z", fill: "#7C4A21" }],
    },
    {
        name: "Raketa",
        acc: "raketu",
        emoji: "🚀",
        viewBox: "80 40 240 362",
        zones: [
            { id: "plamen", name: "plamen", acc: "plamen", d: "M178,283 L222,283 Q226,335 200,392 Q174,335 178,283 Z" },
            { id: "krilo1", name: "levo krilo", acc: "levo krilo", d: "M152,195 L92,305 L152,255 Z" },
            { id: "krilo2", name: "desno krilo", acc: "desno krilo", d: "M248,195 L308,305 L248,255 Z" },
            { id: "motor", name: "motor", acc: "motor", d: "M168,250 L232,250 L218,286 L182,286 Z" },
            { id: "telo", name: "telo rakete", acc: "telo rakete", d: "M200,50 Q250,150 250,250 L150,250 Q150,150 200,50 Z" },
            { id: "vrh", name: "vrh rakete", acc: "vrh rakete", d: "M200,50 Q217.5,85 228.9,120 L171.1,120 Q182.5,85 200,50 Z" },
            { id: "prozor", name: "prozor", acc: "prozor", d: circle(200, 180, 26) },
        ],
    },
    {
        name: "Kruna",
        acc: "krunu",
        emoji: "👑",
        viewBox: "55 85 290 280",
        zones: [
            { id: "kruna", name: "kruna", acc: "krunu", d: "M120,300 L80,150 L160,250 L200,120 L240,250 L320,150 L280,300 Z" },
            { id: "traka", name: "traka", acc: "traku", d: "M112,298 L288,298 L296,356 L104,356 Z" },
            { id: "kuglice", name: "kuglice", acc: "kuglice", d: `${circle(200, 110, 18)} ${circle(80, 140, 15)} ${circle(320, 140, 15)}`, hit: 16 },
            { id: "dragulj", name: "veliki dragulj", acc: "veliki dragulj", d: circle(200, 327, 18), hit: 10 },
            { id: "dragulji", name: "mali dragulji", acc: "male dragulje", d: `${circle(148, 327, 12)} ${circle(252, 327, 12)}`, hit: 18 },
        ],
        tasks: [
            ["kruna", "yellow"],
            ["traka", "orange"],
            ["kuglice", "red"],
            ["dragulj", "blue"],
            ["dragulji", "green"],
        ],
    },
    {
        name: "Sunce",
        acc: "sunce",
        emoji: "☀️",
        viewBox: "50 20 300 382",
        zones: [
            { id: "livada", name: "livada", acc: "livadu", d: "M52,345 Q200,300 348,345 L348,396 L52,396 Z" },
            {
                id: "duge",
                name: "duge zrake",
                acc: "duge zrake",
                d: "M220,96 L200,30 L180,96 Z M274,190 L340,170 L274,150 Z M180,244 L200,310 L220,244 Z M126,150 L60,170 L126,190 Z",
                hit: 10,
            },
            {
                id: "kratke",
                name: "kratke zrake",
                acc: "kratke zrake",
                d: "M265.1,130.4 L283.4,86.6 L239.6,104.9 Z M239.6,235.1 L283.4,253.4 L265.1,209.6 Z M134.9,209.6 L116.6,253.4 L160.4,235.1 Z M160.4,104.9 L116.6,86.6 L134.9,130.4 Z",
                hit: 12,
            },
            { id: "sunce", name: "sunce", acc: "sunce", d: circle(200, 170, 66) },
            {
                id: "oblak",
                name: "oblak",
                acc: "oblak",
                d: "M262,292 C240,292 232,268 250,258 C250,236 282,230 292,248 C306,236 334,244 330,264 C348,268 346,292 326,292 Z",
            },
        ],
        details: [
            { d: circle(178, 160, 5), fill: INK },
            { d: circle(222, 160, 5), fill: INK },
        ],
        lines: "M176,186 Q200,208 224,186",
        tasks: [
            ["sunce", "yellow"],
            ["duge", "orange"],
            ["kratke", "red"],
            ["oblak", "blue"],
            ["livada", "green"],
        ],
    },
    {
        name: "Cvet",
        acc: "cvet",
        emoji: "🌸",
        viewBox: "70 25 320 405",
        zones: [
            {
                id: "oblak",
                name: "oblak",
                acc: "oblak",
                d: "M300,92 C280,92 272,70 288,60 C288,40 318,34 328,50 C342,40 366,48 362,66 C380,70 378,92 358,92 Z",
            },
            { id: "stabljika", name: "stabljika", acc: "stabljiku", d: "M180,250 L200,250 L200,345 L180,345 Z", hit: 16 },
            {
                id: "listovi",
                name: "listovi",
                acc: "listove",
                d: "M182,315 Q140,285 112,312 Q146,340 182,326 Z M198,315 Q240,285 268,312 Q234,340 198,326 Z",
                hit: 8,
            },
            { id: "saksija", name: "saksija", acc: "saksiju", d: "M128,340 L252,340 L252,362 L240,362 L228,424 L152,424 L140,362 L128,362 Z" },
            {
                id: "latice",
                name: "latice",
                acc: "latice",
                d: "M190,144 A48,30 -90 1,0 190,48 A48,30 -90 1,0 190,144 Z M203.9,152 A48,30 -30 1,0 287,104 A48,30 -30 1,0 203.9,152 Z M203.9,168 A48,30 30 1,0 287,216 A48,30 30 1,0 203.9,168 Z M190,176 A48,30 90 1,0 190,272 A48,30 90 1,0 190,176 Z M176.1,168 A48,30 150 1,0 93,216 A48,30 150 1,0 176.1,168 Z M176.1,152 A48,30 210 1,0 93,104 A48,30 210 1,0 176.1,152 Z",
            },
            { id: "sredina", name: "sredina cveta", acc: "sredinu cveta", d: circle(190, 160, 34) },
        ],
        tasks: [
            ["latice", "pink"],
            ["sredina", "yellow"],
            ["stabljika", "green"],
            ["listovi", "green"],
            ["saksija", "orange"],
            ["oblak", "blue"],
        ],
    },
    {
        name: "Kućica",
        acc: "kućicu",
        emoji: "🏠",
        viewBox: "40 15 320 372",
        zones: [
            { id: "dimnjak", name: "dimnjak", acc: "dimnjak", d: "M245,85 L285,85 L285,180 L245,180 Z", hit: 10 },
            { id: "zid", name: "zid", acc: "zid", d: "M75,224 L75,362 L325,362 L325,224 Z" },
            { id: "krov", name: "krov", acc: "krov", d: "M50,235 L200,95 L350,235 Z" },
            { id: "vrata", name: "vrata", acc: "vrata", d: "M168,284 L168,362 L232,362 L232,284 Q200,265 168,284 Z" },
            { id: "prozori", name: "prozori", acc: "prozore", d: "M95,242 L155,242 L155,306 L95,306 Z M245,242 L305,242 L305,306 L245,306 Z" },
            { id: "trava", name: "trava", acc: "travu", d: "M45,352 Q130,338 200,352 Q270,338 355,352 L355,380 L45,380 Z" },
        ],
        details: [
            { d: `${ellipse(262, 60, 14, 18)} ${ellipse(282, 36, 11, 14)}`, fill: "#E5E7EB" },
            {
                d: "M95,271 L155,271 L155,277 L95,277 Z M122,242 L128,242 L128,306 L122,306 Z M245,271 L305,271 L305,277 L245,277 Z M272,242 L278,242 L278,306 L272,306 Z",
                fill: PAPER,
            },
            { d: circle(220, 325, 5), fill: "#FACC15" },
        ],
        tasks: [
            ["krov", "red"],
            ["zid", "yellow"],
            ["vrata", "brown"],
            ["prozori", "blue"],
            ["dimnjak", "orange"],
            ["trava", "green"],
        ],
    },
    {
        name: "Leptir",
        acc: "leptira",
        emoji: "🦋",
        viewBox: "45 105 310 340",
        zones: [
            {
                id: "donja",
                name: "donja krila",
                acc: "donja krila",
                d: "M195,290 C140,300 90,350 120,410 C150,470 195,410 195,380 Z M205,290 C260,300 310,350 280,410 C250,470 205,410 205,380 Z",
            },
            {
                id: "gornja",
                name: "gornja krila",
                acc: "gornja krila",
                d: "M195,210 C140,130 40,150 70,250 C100,350 190,290 195,280 Z M205,210 C260,130 360,150 330,250 C300,350 210,290 205,280 Z",
            },
            { id: "velike", name: "velike tačke", acc: "velike tačke", d: `${circle(118, 238, 22)} ${circle(282, 238, 22)}`, hit: 10 },
            { id: "male", name: "male tačke", acc: "male tačke", d: `${circle(150, 372, 15)} ${circle(250, 372, 15)}`, hit: 14 },
            { id: "telo", name: "telo", acc: "telo", d: "M200,182 Q174,282 200,388 Q226,282 200,182 Z", hit: 12 },
            { id: "glava", name: "glava", acc: "glavu", d: circle(200, 166, 22), hit: 10 },
        ],
        lines: "M190,148 Q168,118 152,124 M210,148 Q232,118 248,124",
        tasks: [
            ["gornja", "purple"],
            ["donja", "pink"],
            ["velike", "yellow"],
            ["male", "blue"],
            ["telo", "brown"],
            ["glava", "orange"],
        ],
    },
    {
        name: "Meda",
        acc: "medu",
        emoji: "🧸",
        viewBox: "82 78 236 390",
        zones: [
            {
                id: "sape",
                name: "šape",
                acc: "šape",
                d: `${ellipse(122, 305, 25, 40, -20)} ${ellipse(278, 305, 25, 40, 20)} ${ellipse(148, 418, 30, 36, -10)} ${ellipse(252, 418, 30, 36, 10)}`,
            },
            { id: "telo", name: "telo", acc: "telo", d: ellipse(200, 345, 72, 88) },
            { id: "stomak", name: "stomak", acc: "stomak", d: ellipse(200, 362, 42, 54) },
            { id: "usi", name: "uši", acc: "uši", d: `${circle(148, 122, 34)} ${circle(252, 122, 34)}` },
            { id: "glava", name: "glava", acc: "glavu", d: circle(200, 200, 80) },
            { id: "njuska", name: "njuška", acc: "njušku", d: ellipse(200, 234, 42, 32) },
            { id: "nos", name: "nos", acc: "nos", d: ellipse(200, 218, 16, 11), hit: 18 },
            { id: "masna", name: "mašna", acc: "mašnu", d: `M200,280 L166,258 L166,302 Z M200,280 L234,258 L234,302 Z ${circle(200, 280, 10)}`, hit: 10 },
        ],
        details: [
            { d: `${circle(148, 122, 12)} ${circle(252, 122, 12)}`, fill: "#FBCFE8" },
            { d: `${circle(170, 174, 7)} ${circle(230, 174, 7)}`, fill: INK },
        ],
        lines: "M200,229 L200,242 M186,246 Q200,256 214,246",
        tasks: [
            ["glava", "brown"],
            ["usi", "orange"],
            ["njuska", "yellow"],
            ["nos", "black"],
            ["telo", "brown"],
            ["stomak", "yellow"],
            ["sape", "orange"],
            ["masna", "red"],
        ],
    },
    {
        name: "Automobil",
        acc: "automobil",
        emoji: "🚗",
        viewBox: "12 150 376 248",
        zones: [
            { id: "trava", name: "trava", acc: "travu", d: "M20,340 L380,340 L380,388 L20,388 Z" },
            { id: "branici", name: "branici", acc: "branike", d: "M26,284 L62,284 L62,314 L26,314 Z M338,284 L374,284 L374,314 L338,314 Z", hit: 14 },
            {
                id: "karoserija",
                name: "karoserija",
                acc: "karoseriju",
                d: "M50,250 Q50,235 65,235 L110,235 L135,170 L265,170 L290,235 L335,235 Q350,235 350,250 L350,312 L50,312 Z",
            },
            { id: "prozori", name: "prozori", acc: "prozore", d: "M124,232 L143,180 L195,180 L195,232 Z M205,232 L205,180 L257,180 L276,232 Z" },
            { id: "far", name: "far", acc: "far", d: "M50,246 L82,246 L82,276 L50,276 Z", hit: 14 },
            { id: "svetlo", name: "zadnje svetlo", acc: "zadnje svetlo", d: "M318,246 L350,246 L350,276 L318,276 Z", hit: 14 },
            { id: "gume", name: "gume", acc: "gume", d: `${circle(115, 312, 38)} ${circle(285, 312, 38)}` },
            { id: "felne", name: "felne", acc: "felne", d: `${circle(115, 312, 21)} ${circle(285, 312, 21)}`, hit: 6 },
        ],
        details: [{ d: "M160,256 L182,256 L182,264 L160,264 Z M222,256 L244,256 L244,264 L222,264 Z", fill: "#D1D5DB" }],
        lines: "M200,235 L200,300",
        tasks: [
            ["karoserija", "blue"],
            ["prozori", "sky"],
            ["gume", "black"],
            ["felne", "gray"],
            ["far", "yellow"],
            ["svetlo", "red"],
            ["branici", "gray"],
            ["trava", "lime"],
        ],
    },
    {
        name: "Riba",
        acc: "ribu",
        emoji: "🐟",
        viewBox: "15 70 380 300",
        zones: [
            {
                id: "alge",
                name: "alge",
                acc: "alge",
                d: "M58,335 Q40,295 58,262 Q72,232 56,200 Q90,230 82,266 Q72,298 86,335 Z M350,335 Q338,305 352,282 Q360,268 350,252 Q378,270 372,292 Q366,310 376,335 Z",
                hit: 12,
            },
            { id: "pesak", name: "pesak", acc: "pesak", d: "M20,326 Q200,306 380,326 L380,364 L20,364 Z" },
            { id: "kamen", name: "kamen", acc: "kamen", d: "M258,330 Q262,290 296,288 Q332,290 338,330 Z" },
            { id: "rep", name: "rep", acc: "rep", d: "M300,190 L372,142 L388,203 L372,262 L300,222 Z" },
            {
                id: "peraja",
                name: "peraja",
                acc: "peraja",
                d: "M170,142 Q185,95 220,88 Q255,95 272,140 Q240,126 200,127 Z M188,262 Q205,300 250,304 Q240,280 228,260 Z",
                hit: 8,
            },
            {
                id: "telo",
                name: "telo ribe",
                acc: "telo ribe",
                d: "M95,210 Q110,155 185,140 Q260,128 305,185 Q330,205 305,225 Q260,272 185,270 Q110,258 95,210 Z",
            },
            {
                id: "pruge",
                name: "pruge",
                acc: "pruge",
                d: "M212,143 Q226,205 212,263 L240,261 Q254,205 240,141 Z M266,156 Q276,205 266,247 L288,236 Q296,205 288,172 Z",
                hit: 8,
            },
            { id: "mehurici", name: "mehurići", acc: "mehuriće", d: `${circle(70, 150, 14)} ${circle(50, 112, 11)} ${circle(82, 92, 9)}`, hit: 16 },
        ],
        details: [
            { d: circle(148, 180, 18), fill: PAPER },
            { d: circle(151, 180, 9), fill: INK },
        ],
        lines: "M99,214 Q112,226 124,216 M178,152 Q170,190 178,232",
        tasks: [
            ["telo", "orange"],
            ["pruge", "yellow"],
            ["rep", "red"],
            ["peraja", "purple"],
            ["mehurici", "sky"],
            ["alge", "green"],
            ["pesak", "brown"],
            ["kamen", "gray"],
        ],
    },
    {
        name: "Slon",
        acc: "slona",
        emoji: "🐘",
        viewBox: "15 20 385 420",
        zones: [
            { id: "trava", name: "trava", acc: "travu", d: "M20,402 Q200,386 395,402 L395,434 L20,434 Z" },
            { id: "sunce", name: "sunce", acc: "sunce", d: circle(62, 64, 30) },
            {
                id: "usi",
                name: "uši",
                acc: "uši",
                d: "M115,160 Q60,110 45,190 Q35,260 110,250 Q115,230 115,200 Z M285,160 Q340,110 355,190 Q365,260 290,250 Q285,230 285,200 Z",
            },
            {
                id: "telo",
                name: "telo",
                acc: "telo",
                d: "M110,240 Q92,330 104,418 L168,418 L168,392 L232,392 L232,418 L296,418 Q308,330 290,240 Q250,215 200,215 Q150,215 110,240 Z",
            },
            { id: "glava", name: "glava", acc: "glavu", d: "M115,190 Q110,120 200,110 Q290,120 285,190 Q285,260 200,265 Q115,260 115,190 Z" },
            {
                id: "kljove",
                name: "kljove",
                acc: "kljove",
                d: "M165,245 Q145,255 135,275 Q145,285 160,275 Q170,260 175,245 Z M235,245 Q255,255 265,275 Q255,285 240,275 Q230,260 225,245 Z",
                hit: 12,
            },
            {
                id: "surla",
                name: "surla",
                acc: "surlu",
                d: "M178,215 C176,270 168,315 172,345 Q178,372 200,372 Q222,372 228,345 C232,315 224,270 222,215 Q200,205 178,215 Z",
            },
            { id: "sesir", name: "šešir", acc: "šešir", d: "M164,120 L200,44 L236,120 Q200,106 164,120 Z" },
            { id: "lopta", name: "lopta", acc: "loptu", d: circle(346, 388, 28) },
        ],
        details: [
            { d: `${circle(155, 178, 9)} ${circle(245, 178, 9)}`, fill: INK },
            { d: `${ellipse(138, 218, 12, 7)} ${ellipse(262, 218, 12, 7)}`, fill: "#FDA4AF" },
            { d: circle(200, 42, 9), fill: PAPER },
        ],
        lines: "M180,290 Q200,284 220,290 M177,322 Q200,316 223,322 M322,378 Q346,392 370,376",
        tasks: [
            ["glava", "gray"],
            ["usi", "pink"],
            ["surla", "gray"],
            ["kljove", "yellow"],
            ["telo", "gray"],
            ["sesir", "red"],
            ["lopta", "blue"],
            ["trava", "lime"],
            ["sunce", "orange"],
        ],
    },
    {
        name: "Mačka",
        acc: "mačku",
        emoji: "🐱",
        viewBox: "25 105 350 332",
        zones: [
            { id: "tepih", name: "tepih", acc: "tepih", d: ellipse(200, 410, 165, 22) },
            {
                id: "rep",
                name: "rep",
                acc: "rep",
                d: "M262,338 Q325,330 342,298 Q354,268 334,254 Q316,250 314,268 Q326,282 318,300 Q306,322 258,362 Z",
                hit: 12,
            },
            {
                id: "telo",
                name: "telo",
                acc: "telo",
                d: "M128,244 Q118,314 133,374 L134,408 L172,408 L172,378 L228,378 L228,408 L266,408 L267,374 Q282,314 272,244 Q200,224 128,244 Z",
            },
            { id: "usi", name: "uši", acc: "uši", d: "M113,188 L98,120 L155,162 Z M287,188 L302,120 L245,162 Z" },
            {
                id: "glava",
                name: "glava",
                acc: "glavu",
                d: "M108,178 Q103,234 138,252 Q200,270 262,252 Q297,234 292,178 Q252,132 200,130 Q148,132 108,178 Z",
            },
            { id: "ogrlica", name: "ogrlica", acc: "ogrlicu", d: "M140,250 Q200,272 260,250 L263,266 Q200,292 137,266 Z", hit: 12 },
            { id: "oci", name: "oči", acc: "oči", d: `${ellipse(163, 190, 17, 15)} ${ellipse(237, 190, 17, 15)}`, hit: 10 },
            { id: "nos", name: "nos", acc: "nos", d: "M200,230 L184,212 L216,212 Z", hit: 16 },
            { id: "klupko", name: "klupko", acc: "klupko", d: circle(72, 388, 30) },
        ],
        details: [
            { d: "M109,160 L104,133 L129,150 Z M291,160 L296,133 L271,150 Z", fill: "#FBCFE8" },
            { d: `${ellipse(163, 190, 5, 11)} ${ellipse(237, 190, 5, 11)}`, fill: INK },
            { d: circle(200, 288, 9), fill: "#FACC15" },
        ],
        lines: "M200,230 Q186,244 174,238 M200,230 Q214,244 226,238 M178,222 L126,212 M178,230 L126,236 M222,222 L274,212 M222,230 L274,236 M50,378 Q72,366 96,380 M48,394 Q72,404 96,392",
        tasks: [
            ["glava", "orange"],
            ["usi", "brown"],
            ["telo", "orange"],
            ["rep", "brown"],
            ["oci", "green"],
            ["nos", "pink"],
            ["ogrlica", "red"],
            ["klupko", "blue"],
            ["tepih", "purple"],
        ],
    },
];

// Mačka (nivo 15) se sama javi kad je dete boji bojom koju zadatak ne traži.
const CAT_LEVEL = 15;
/** Delovi slike koji nisu mačka — za njih se ona ne javlja */
const CAT_SCENERY = new Set(["tepih", "klupko"]);
const CAT_CLIPS: Record<string, string | undefined> = {
    red: "/sounds/coloring/redCat.mp3",
    blue: "/sounds/coloring/blueCat.mp3",
    sky: "/sounds/coloring/blueCat.mp3",
    green: "/sounds/coloring/greenCat.mp3",
};

// ── Nivoi ─────────────────────────────────────────────────────────────────────

interface LevelPlan {
    picture: Picture;
    /** Bojenje po uputstvu (nivoi 6–15); inače slobodno bojenje */
    guided: boolean;
    tasks: [string, ColorId][];
    palette: PaintColor[];
    /** Traženi deo je od početka označen (srednji nivoi) */
    showZone: boolean;
    /** Tražena boja je prikazana uz uputstvo (do 13. nivoa) */
    showChip: boolean;
}

function planFor(level: number): LevelPlan {
    const safe = Number.isFinite(level) ? Math.min(Math.max(Math.round(level), 1), PICTURES.length) : 1;
    const picture = PICTURES[safe - 1];
    const tasks = safe > 5 ? (picture.tasks ?? []) : [];
    return {
        picture,
        guided: tasks.length > 0,
        tasks,
        palette: safe > 10 ? COLORS : COLORS.slice(0, BASIC_COLORS),
        showZone: safe <= 10,
        showChip: safe <= 13,
    };
}

// ── Stanje ────────────────────────────────────────────────────────────────────

type Fills = Record<string, string>;
type ColoringFeedback = "correct" | "zone" | "color" | "pick" | null;

export interface ColoringView extends BaseView {
    /** id dela → id boje */
    fills: Fills;
    /** Izabrana boja (id), "eraser" ili null dok dete još nije izabralo */
    color: string | null;
    /** Pogrešni pokušaji u tekućem zadatku (posle 2 stiže pomoć) */
    wrong: number;
    feedback: ColoringFeedback;
    done: boolean;
}

function initialView(plan: LevelPlan): ColoringView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        round: 1,
        totalRounds: plan.guided ? plan.tasks.length : plan.picture.zones.length,
        fills: {},
        color: plan.guided ? null : plan.palette[0].id,
        wrong: 0,
        feedback: null,
        done: false,
    };
}

function countColored(picture: Picture, fills: Fills): number {
    return picture.zones.filter((zone) => fills[zone.id]).length;
}

/** Slobodno bojenje: brojači se uvek računaju iz obojenih delova. */
function withFills(view: ColoringView, picture: Picture, fills: Fills): ColoringView {
    const colored = countColored(picture, fills);
    return {
        ...view,
        fills,
        correctCount: colored,
        score: colored * 10,
        round: Math.min(colored + 1, picture.zones.length),
    };
}

function num(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Monitor dobija delimično (ili prazno) stanje — sve što fali ili je pogrešnog tipa menja podrazumevana vrednost. */
function mergeMonitor(base: ColoringView, incoming: Partial<ColoringView> | null | undefined): ColoringView {
    if (!incoming) return base;
    const fills: Fills = {};
    if (incoming.fills && typeof incoming.fills === "object") {
        for (const [zone, color] of Object.entries(incoming.fills)) {
            if (typeof color === "string") fills[zone] = color;
        }
    }
    const feedback = incoming.feedback;
    return {
        score: num(incoming.score, base.score),
        correctCount: num(incoming.correctCount, base.correctCount),
        incorrectCount: num(incoming.incorrectCount, base.incorrectCount),
        round: num(incoming.round, base.round),
        totalRounds: num(incoming.totalRounds, base.totalRounds),
        fills,
        color: typeof incoming.color === "string" ? incoming.color : base.color,
        wrong: num(incoming.wrong, 0),
        feedback: feedback === "correct" || feedback === "zone" || feedback === "color" || feedback === "pick" ? feedback : null,
        done: incoming.done === true,
    };
}

const WRONG_TEXT: Record<"zone" | "color" | "pick", string> = {
    zone: "Probaj drugi deo slike",
    color: "Probaj drugu boju",
    pick: "Prvo izaberi boju",
};

type Timer = ReturnType<typeof setTimeout>;

// ── Igra ──────────────────────────────────────────────────────────────────────

/*
 * Zvezdice (correct / total):
 *  • Slobodno bojenje (nivoi 1–5): correct = obojeni delovi, total = svi delovi slike.
 *    "Gotovo" se otključava kad je obojena bar polovina, pa je najmanje 2★; cela slika = 3★.
 *  • Bojenje po uputstvu (nivoi 6–15): total = broj zadataka, correct = zadaci rešeni
 *    samostalno (najviše jedna greška, pre nego što se pojavi pomoć). Nivo se ne može
 *    "pasti" — dete uvek stigne do kraja — pa se za završenu sliku priznaje najmanje
 *    petina zadataka (1★), čak i kada je pomoć bila potrebna svaki put.
 */
export default function ColoringGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<ColoringView>) {
    const plan = useMemo(() => planFor(level), [level]);
    const { picture, guided, tasks, palette } = plan;
    const accent = getGame("coloring").accent;
    const female = isFemale(gender);

    const { say, stop } = useSpeech(gender);
    const sync = useGameSync<ColoringView>({ childId, gameId: "coloring", level, isMonitor });

    const [view, setView] = useState<ColoringView>(() => initialView(plan));
    const [history, setHistory] = useState<Fills[]>([]);

    const viewRef = useRef(view);
    const startedRef = useRef(false);
    const finishedRef = useRef(false);
    const lockedRef = useRef(false);
    const announcedRef = useRef(false);
    const timersRef = useRef<Set<Timer>>(new Set());
    const feedbackTimerRef = useRef<Timer | null>(null);
    const clipRef = useRef<HTMLAudioElement | null>(null);

    const shown = isMonitor ? mergeMonitor(initialView(plan), monitorState) : view;

    const zoneById = useMemo(() => new Map(picture.zones.map((zone) => [zone.id, zone])), [picture]);
    const task = guided ? tasks[Math.min(Math.max(shown.round, 1), tasks.length) - 1] : undefined;
    const targetZone = task ? zoneById.get(task[0]) : undefined;
    const targetColor = task ? COLOR_BY_ID[task[1]] : undefined;
    const instruction = targetZone && targetColor ? `Oboji ${targetZone.acc} ${targetColor.inst} bojom` : "";
    /** Ono što se izgovara: zadatak ili poziv na slobodno bojenje */
    const prompt = guided ? `${instruction}.` : `Oboji ${picture.acc} kako želiš. Izaberi boju i dodirni sliku.`;

    const colored = countColored(picture, shown.fills);
    const allColored = colored === picture.zones.length;
    const neededForDone = Math.ceil(picture.zones.length / 2);
    const hinting = guided && !shown.done && shown.wrong >= 2;
    const interactive = !isMonitor && !shown.done;

    // ── Pomoćne funkcije ──────────────────────────────────────────────────────

    const later = (fn: () => void, ms: number): Timer => {
        const id = setTimeout(() => {
            timersRef.current.delete(id);
            fn();
        }, ms);
        timersRef.current.add(id);
        return id;
    };

    const commit = (next: ColoringView, log?: string) => {
        viewRef.current = next;
        setView(next);
        sync.update(next, log);
    };

    const cancelFeedbackTimer = () => {
        if (!feedbackTimerRef.current) return;
        clearTimeout(feedbackTimerRef.current);
        timersRef.current.delete(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
    };

    const clearFeedbackSoon = () => {
        cancelFeedbackTimer();
        feedbackTimerRef.current = later(() => {
            feedbackTimerRef.current = null;
            const current = viewRef.current;
            if (current.done || !current.feedback) return;
            commit({ ...current, feedback: null });
        }, 1600);
    };

    const stopClip = () => {
        clipRef.current?.pause();
        clipRef.current = null;
    };

    /** Mačka ima snimljen glas za crvenu, plavu i zelenu; ako snimak ne krene, uputstvo se izgovara. */
    const playClip = (src: string, fallbackText: string) => {
        stop();
        stopClip();
        const audio = new Audio(src);
        audio.muted = isMuted();
        clipRef.current = audio;
        audio.play().catch(() => {
            if (clipRef.current !== audio) return;
            clipRef.current = null;
            say(fallbackText);
        });
    };

    const speak = (text: string) => {
        stopClip();
        say(text);
    };

    // ── Početak i čišćenje ────────────────────────────────────────────────────

    useEffect(() => {
        if (isMonitor || startedRef.current) return;
        startedRef.current = true;
        sync.start(viewRef.current);
    }, [isMonitor, sync]);

    // Uputstvo se izgovara na početku nivoa i svaki put kada stigne novi zadatak.
    useEffect(() => {
        if (isMonitor) return;
        const id = setTimeout(() => {
            clipRef.current?.pause();
            clipRef.current = null;
            say(prompt);
        }, 600);
        return () => clearTimeout(id);
    }, [isMonitor, say, prompt]);

    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            timers.forEach(clearTimeout);
            timers.clear();
            clipRef.current?.pause();
            clipRef.current = null;
        };
    }, []);

    // ── Potezi ────────────────────────────────────────────────────────────────

    const finish = (current: ColoringView) => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        lockedRef.current = true;
        cancelFeedbackTimer();

        const final: ColoringView = { ...current, feedback: "correct", done: true };
        commit(final, `Slika je gotova: ${picture.name.toLowerCase()} 🎉`);
        playSfx("win");

        const total = guided ? tasks.length : picture.zones.length;
        const correct = guided ? Math.max(final.correctCount, Math.ceil(total / 5)) : countColored(picture, final.fills);
        later(() => {
            sync.complete(final);
            onComplete({ score: final.score, durationSec: sync.elapsedSec(), correct, total });
        }, 1100);
    };

    const pickColor = (id: string) => {
        if (!interactive) return;
        const current = viewRef.current;
        if (current.color === id) return;
        playSfx("tap");
        const color = COLOR_BY_ID[id];
        const next: ColoringView = { ...current, color: id, feedback: current.feedback === "pick" ? null : current.feedback };
        commit(next, color ? `Izabrana boja: ${color.nom}` : "Izabrana gumica");
        if (!guided && color) speak(color.nom);
    };

    const paintFree = (zone: Zone) => {
        const current = viewRef.current;
        const selected = current.color;
        if (!selected) return;

        if (selected === ERASER) {
            if (!current.fills[zone.id]) return;
            const fills = { ...current.fills };
            delete fills[zone.id];
            setHistory((prev) => [...prev.slice(-29), current.fills]);
            playSfx("tap");
            commit(withFills(current, picture, fills), `Obrisano: ${zone.name}`);
            return;
        }

        const color = COLOR_BY_ID[selected];
        if (!color || current.fills[zone.id] === selected) return;
        const next = withFills(current, picture, { ...current.fills, [zone.id]: selected });
        setHistory((prev) => [...prev.slice(-29), current.fills]);
        playSfx("flip");
        commit(next, `Obojeno: ${zone.name} – ${color.nom}`);

        if (next.correctCount === picture.zones.length && !announcedRef.current) {
            announcedRef.current = true;
            speak(`Bravo! Sve si ${female ? "obojila" : "obojio"}. Pritisni Gotovo.`);
        }
    };

    const paintGuided = (zone: Zone) => {
        if (lockedRef.current || !task || !targetZone || !targetColor) return;
        const current = viewRef.current;
        const picked = current.color ? COLOR_BY_ID[current.color] : undefined;

        if (!picked) {
            commit({ ...current, feedback: "pick" });
            clearFeedbackSoon();
            speak("Prvo izaberi boju.");
            return;
        }

        const rightZone = zone.id === targetZone.id;
        const rightColor = picked.id === targetColor.id;

        if (rightZone && rightColor) {
            lockedRef.current = true;
            cancelFeedbackTimer();
            const independent = current.wrong <= 1;
            const solved: ColoringView = {
                ...current,
                fills: { ...current.fills, [zone.id]: picked.id },
                correctCount: current.correctCount + (independent ? 1 : 0),
                score: current.score + (current.wrong === 0 ? 10 : 5),
                feedback: "correct",
            };
            const log = `Tačno: ${zone.name} – ${picked.nom}${independent ? "" : " (uz pomoć)"}`;

            if (current.round >= tasks.length) {
                viewRef.current = solved;
                sync.update(solved, log);
                finish(solved);
                return;
            }

            commit(solved, log);
            playSfx("correct");
            later(() => {
                commit({ ...viewRef.current, round: current.round + 1, wrong: 0, feedback: null });
                lockedRef.current = false;
            }, 1000);
            return;
        }

        const reason = rightZone ? "color" : "zone";
        const next: ColoringView = {
            ...current,
            wrong: current.wrong + 1,
            incorrectCount: current.incorrectCount + 1,
            feedback: reason,
        };
        playSfx("wrong");
        commit(
            next,
            reason === "color"
                ? `Pogrešna boja (${picked.nom}) — traži se ${targetColor.nom}`
                : `Pogrešan deo (${zone.name}) — traži se ${targetZone.name}`
        );
        clearFeedbackSoon();

        const colorHelp = `To je ${picked.nom} boja. Izaberi ${targetColor.acc} boju.`;
        const clip = level === CAT_LEVEL && !rightColor && !CAT_SCENERY.has(zone.id) ? CAT_CLIPS[picked.id] : undefined;
        if (clip) playClip(clip, colorHelp);
        else speak(reason === "color" ? colorHelp : `Pronađi ${targetZone.acc}.`);
    };

    const tapZone = (zone: Zone) => {
        if (!interactive) return;
        if (guided) paintGuided(zone);
        else paintFree(zone);
    };

    const undo = () => {
        if (!interactive || history.length === 0) return;
        const previous = history[history.length - 1];
        setHistory(history.slice(0, -1));
        playSfx("tap");
        commit(withFills(viewRef.current, picture, previous), "Vraćen poslednji potez");
    };

    const repeatInstruction = () => speak(prompt);

    // ── Prikaz ────────────────────────────────────────────────────────────────

    const zoneProps = (zone: Zone) =>
        interactive
            ? {
                  role: "button",
                  tabIndex: 0,
                  onClick: () => tapZone(zone),
                  onKeyDown: (event: KeyboardEvent<SVGPathElement>) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      tapZone(zone);
                  },
              }
            : {};

    const highlighted = guided && !shown.done && (plan.showZone || hinting) ? targetZone : undefined;
    const showChip = plan.showChip || hinting;
    const feedbackKind: FeedbackKind = shown.feedback === null ? null : shown.feedback === "correct" ? "correct" : "wrong";
    const wrongText = shown.feedback && shown.feedback !== "correct" ? WRONG_TEXT[shown.feedback] : undefined;

    return (
        <GameStage width="wide">
            <GameHud
                round={shown.round}
                totalRounds={shown.totalRounds}
                score={shown.score}
                unit={guided ? "Zadatak" : "Deo"}
                onSpeak={isMonitor ? undefined : repeatInstruction}
            />

            {guided ? (
                <GamePrompt
                    title={instruction}
                    subtitle={hinting ? "Pogledaj šta svetli na slici i među bojama" : "Izaberi boju, pa dodirni taj deo slike"}
                    visual={
                        showChip && targetColor ? (
                            <span
                                role="img"
                                aria-label={`${targetColor.nom} boja`}
                                className="block h-12 w-12 rounded-full border-4 border-white shadow-soft ring-1 ring-line sm:h-16 sm:w-16"
                                style={{ background: targetColor.hex }}
                            />
                        ) : (
                            <span aria-hidden="true">🎨</span>
                        )
                    }
                />
            ) : (
                <GamePrompt
                    title={`Oboji ${picture.acc} kako želiš`}
                    subtitle="Izaberi boju, pa dodirni deo slike"
                    visual={<span aria-hidden="true">{picture.emoji}</span>}
                />
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                {/* Slika */}
                <div className={cn("relative min-w-0 flex-1 rounded-card border-2 bg-surface p-3 shadow-soft sm:p-5", accent.border)}>
                    <svg
                        viewBox={picture.viewBox}
                        role="group"
                        aria-label={`Bojanka: ${picture.name}`}
                        className={cn(
                            "mx-auto block h-auto max-h-[min(42vh,26rem)] w-full touch-manipulation select-none sm:max-h-[min(52vh,36rem)]",
                            shown.done && "animate-wiggle"
                        )}
                    >
                        {picture.zones.map((zone) => {
                            const paint = COLOR_BY_ID[shown.fills[zone.id]];
                            return (
                                <Fragment key={zone.id}>
                                    <path
                                        d={zone.d}
                                        fill={paint?.hex ?? PAPER}
                                        stroke={OUTLINE}
                                        strokeWidth={3}
                                        strokeLinejoin="round"
                                        aria-label={`${zone.name}: ${paint ? paint.nom : "nije obojeno"}`}
                                        className={cn("transition-[fill] duration-200", interactive && "cursor-pointer")}
                                        {...zoneProps(zone)}
                                    />
                                    {/* Oznaka traženog dela i nevidljiva šira ivica (mali deo se lakše pogađa prstom)
                                        crtaju se odmah iznad svog dela, pa ih delovi koji ga prekrivaju i dalje prekrivaju. */}
                                    {highlighted?.id === zone.id && (
                                        <path
                                            d={zone.d}
                                            fill="none"
                                            stroke={HIGHLIGHT}
                                            strokeWidth={7}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeDasharray="1 13"
                                            pointerEvents="none"
                                            className="animate-pulse"
                                        />
                                    )}
                                    {interactive && zone.hit && (
                                        <path
                                            d={zone.d}
                                            fill="none"
                                            stroke="transparent"
                                            strokeWidth={zone.hit * 2}
                                            pointerEvents="stroke"
                                            aria-hidden="true"
                                            className="cursor-pointer"
                                            onClick={() => tapZone(zone)}
                                        />
                                    )}
                                </Fragment>
                            );
                        })}

                        {picture.details?.map((detail, index) => (
                            <path key={index} d={detail.d} fill={detail.fill} stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
                        ))}
                        {picture.lines && (
                            <path d={picture.lines} fill="none" stroke={OUTLINE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
                        )}

                    </svg>

                    <Feedback
                        kind={feedbackKind}
                        correctText={shown.done ? "Bravo! Slika je gotova!" : "Bravo!"}
                        wrongText={wrongText}
                        className="absolute inset-x-2 top-2"
                    />
                </div>

                {/* Boje i alat */}
                <div className="flex shrink-0 flex-col gap-3 rounded-card border border-line bg-surface p-3 shadow-soft sm:w-52 lg:w-64">
                    <p className={cn("hidden px-1 font-display text-base font-extrabold sm:block", accent.text)}>Boje</p>
                    <div className="grid grid-cols-4 gap-2 min-[480px]:grid-cols-6 sm:grid-cols-3">
                        {palette.map((color) => {
                            const selected = shown.color === color.id;
                            const hinted = hinting && targetColor?.id === color.id && !selected;
                            return (
                                <button
                                    key={color.id}
                                    type="button"
                                    disabled={!interactive}
                                    onClick={() => pickColor(color.id)}
                                    aria-label={`${color.nom} boja`}
                                    aria-pressed={selected}
                                    title={color.nom}
                                    className={cn(
                                        "relative grid h-14 w-full place-items-center rounded-2xl border-2 border-black/15 transition-transform duration-150 disabled:cursor-default sm:aspect-square sm:h-auto sm:min-h-14",
                                        selected ? "z-[1] scale-105 ring-4 ring-ink ring-offset-2 ring-offset-surface" : interactive && "hover:scale-105 active:scale-95",
                                        hinted && "animate-soft-pulse ring-4 ring-brand-400 ring-offset-2 ring-offset-surface"
                                    )}
                                    style={{ background: color.hex }}
                                >
                                    {selected && (
                                        <svg
                                            viewBox="0 0 24 24"
                                            className={cn("h-7 w-7 animate-pop", color.light ? "text-ink" : "text-white")}
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth={3.5}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden="true"
                                        >
                                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {!guided && (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <ToolButton
                                    label="Gumica"
                                    selected={shown.color === ERASER}
                                    disabled={!interactive}
                                    onClick={() => pickColor(ERASER)}
                                    icon={<path d="M4 15.5 13.5 6a2 2 0 0 1 2.8 0l2.7 2.7a2 2 0 0 1 0 2.8L12.5 18H7.5L4 15.5zM9 10.5l5 5M12.5 18H20" />}
                                />
                                <ToolButton
                                    label="Vrati"
                                    disabled={!interactive || history.length === 0}
                                    onClick={undo}
                                    icon={<path d="M8 5 4 9l4 4M4 9h10a5 5 0 0 1 0 10h-3" />}
                                />
                            </div>

                            <button
                                type="button"
                                disabled={!interactive || colored < neededForDone}
                                onClick={() => finish(viewRef.current)}
                                className={cn(
                                    "min-h-16 w-full rounded-2xl border-2 border-b-[5px] border-emerald-700 bg-emerald-500 px-4 text-lg font-extrabold text-white transition-[transform,background-color,border-width,opacity] hover:bg-emerald-600 active:translate-y-[3px] active:border-b-2 disabled:cursor-default disabled:opacity-45 disabled:hover:bg-emerald-500 sm:text-xl",
                                    interactive && allColored && "animate-soft-pulse"
                                )}
                            >
                                Gotovo ✓
                            </button>
                            {!shown.done && colored < neededForDone && (
                                <p className="text-center text-base font-bold text-ink-soft">
                                    Oboji još {neededForDone - colored} {plural(neededForDone - colored)}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </GameStage>
    );
}

/** "još 1 deo", "još 2 dela", "još 5 delova" */
function plural(count: number): string {
    const lastTwo = count % 100;
    const last = count % 10;
    if (last === 1 && lastTwo !== 11) return "deo";
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "dela";
    return "delova";
}

// ── Dugme alata (gumica, vrati) — nema ga u zajedničkom kitu ───────────────────

interface ToolButtonProps {
    label: string;
    icon: ReactNode;
    onClick: () => void;
    selected?: boolean;
    disabled?: boolean;
}

function ToolButton({ label, icon, onClick, selected = false, disabled = false }: ToolButtonProps) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            aria-pressed={selected}
            className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-b-4 px-2 py-1.5 text-base font-extrabold transition-[transform,background-color,border-color,opacity] disabled:cursor-default disabled:opacity-45",
                selected ? "border-ink bg-brand-50 text-ink" : "border-line bg-surface text-ink-soft",
                !disabled && !selected && "hover:border-brand-300 hover:bg-brand-50 active:translate-y-[2px]"
            )}
        >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {icon}
            </svg>
            {label}
        </button>
    );
}
