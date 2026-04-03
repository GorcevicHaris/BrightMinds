"use client";

import { useState, useEffect } from "react";
import { useGameEmitter } from '@/lib/useSocket';

interface GameProps {
  childId: number;
  level: number;
  onComplete: (score: number, duration: number, moodBefore?: string | null, moodAfter?: string | null) => void;
  autoStart?: boolean;
  isMonitor?: boolean;
  monitorState?: any;
}

interface ColorZone {
  id: number;
  path: string;
  color: string | null;
  targetColor: string;
  stroke?: boolean;
}

const COLORS = [
  { name: "Crvena", value: "#EF4444" },
  { name: "Plava", value: "#3B82F6" },
  { name: "Zelena", value: "#10B981" },
  { name: "Žuta", value: "#FBBF24" },
  { name: "Narandžasta", value: "#F97316" },
  { name: "Ljubičasta", value: "#A855F7" },
  { name: "Roze", value: "#EC4899" },
  { name: "Braon", value: "#92400E" },
  { name: "Siva", value: "#6B7280" },
  { name: "Crna", value: "#1F2937" },
  { name: "Bela", value: "#F3F4F6" },
  { name: "Svetlo plava", value: "#60A5FA" },
];

const TEMPLATES = {
  // ─── NIVO 1: SUNCE ───────────────────────────────────────────────────────────
  1: [
    { id: 1, path: "M200,200 m-70,0 a70,70 0 1,0 140,0 a70,70 0 1,0 -140,0", targetColor: "#FBBF24" },
    { id: 2, path: "M193,108 L200,58 L207,108 Z", targetColor: "#F59E0B" },
    { id: 3, path: "M248,125 L285,78 L274,125 Z", targetColor: "#F59E0B" },
    { id: 4, path: "M278,193 L335,200 L278,207 Z", targetColor: "#F59E0B" },
    { id: 5, path: "M248,275 L285,322 L248,310 Z", targetColor: "#F59E0B" },
    { id: 6, path: "M193,292 L200,342 L207,292 Z", targetColor: "#F59E0B" },
    { id: 7, path: "M152,275 L115,322 L152,310 Z", targetColor: "#F59E0B" },
    { id: 8, path: "M122,193 L65,200 L122,207 Z", targetColor: "#F59E0B" },
    { id: 9, path: "M152,125 L115,78 L152,112 Z", targetColor: "#F59E0B" },
  ],

  // ─── NIVO 2: KUĆICA ──────────────────────────────────────────────────────────
  2: [
    { id: 1, path: "M75,224 L75,365 L325,365 L325,224 Z", targetColor: "#EF4444" },
    { id: 2, path: "M50,235 L200,95 L350,235 Z", targetColor: "#92400E" },
    { id: 3, path: "M168,284 L168,365 L232,365 L232,284 Q200,265 168,284 Z", targetColor: "#8B4513" },
    { id: 4, path: "M95,242 L95,306 L155,306 L155,242 Z", targetColor: "#60A5FA" },
    { id: 5, path: "M245,242 L245,306 L305,306 L305,242 Z", targetColor: "#60A5FA" },
    { id: 6, path: "M95,271 L155,271 L155,276 L95,276 Z", targetColor: "#FFFFFF" },
    { id: 7, path: "M122,242 L128,242 L128,306 L122,306 Z", targetColor: "#FFFFFF" },
    { id: 8, path: "M245,271 L305,271 L305,276 L245,276 Z", targetColor: "#FFFFFF" },
    { id: 9, path: "M272,242 L278,242 L278,306 L272,306 Z", targetColor: "#FFFFFF" },
    { id: 10, path: "M248,97 L248,170 L278,170 L278,118 Z", targetColor: "#6B7280" },
    { id: 11, path: "M252,80 m-13,0 a13,20 0 1,0 26,0 a13,20 0 1,0 -26,0", targetColor: "#9CA3AF" },
    { id: 12, path: "M270,62 m-10,0 a10,16 0 1,0 20,0 a10,16 0 1,0 -20,0", targetColor: "#D1D5DB" },
    { id: 13, path: "M220,322 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0", targetColor: "#FBBF24" },
    { id: 14, path: "M55,358 Q130,342 200,358 Q270,342 345,358 L345,378 L55,378 Z", targetColor: "#10B981" },
  ],

  // ─── NIVO 3: CVIJET ──────────────────────────────────────────────────────────
  3: [
    { id: 1, path: "M194,300 L206,300 L210,405 L190,405 Z", targetColor: "#10B981" },
    { id: 2, path: "M195,340 Q148,318 125,348 Q162,366 195,352 Z", targetColor: "#34D399" },
    { id: 3, path: "M205,340 Q252,318 275,348 Q238,366 205,352 Z", targetColor: "#34D399" },
    { id: 4, path: "M200,180 m-30,0 a30,45 0 1,0 60,0 a30,45 0 1,0 -60,0", targetColor: "#EC4899" },
    { id: 5, path: "M240,196 m-30,0 a30,45 30 1,0 60,0 a30,45 30 1,0 -60,0", targetColor: "#F9A8D4" },
    { id: 6, path: "M258,232 m-30,0 a30,45 60 1,0 60,0 a30,45 60 1,0 -60,0", targetColor: "#EC4899" },
    { id: 7, path: "M240,268 m-30,0 a30,45 120 1,0 60,0 a30,45 120 1,0 -60,0", targetColor: "#F9A8D4" },
    { id: 8, path: "M160,268 m-30,0 a30,45 240 1,0 60,0 a30,45 240 1,0 -60,0", targetColor: "#EC4899" },
    { id: 9, path: "M142,232 m-30,0 a30,45 300 1,0 60,0 a30,45 300 1,0 -60,0", targetColor: "#F9A8D4" },
    { id: 10, path: "M160,196 m-30,0 a30,45 330 1,0 60,0 a30,45 330 1,0 -60,0", targetColor: "#EC4899" },
    { id: 11, path: "M200,232 m-40,0 a40,40 0 1,0 80,0 a40,40 0 1,0 -80,0", targetColor: "#FBBF24" },
    { id: 12, path: "M200,232 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0", targetColor: "#F97316" },
  ],

  // ─── NIVO 4: LEPTIR ──────────────────────────────────────────────────────────
  4: [
    { id: 1, path: "M196,155 L204,155 L208,320 L192,320 Z", targetColor: "#1F2937" },
    { id: 2, path: "M200,142 m-16,0 a16,16 0 1,0 32,0 a16,16 0 1,0 -32,0", targetColor: "#1F2937" },
    { id: 3, path: "M193,128 Q168,90 150,70 L154,67 Q173,88 196,126 Z", targetColor: "#4B5563" },
    { id: 4, path: "M207,128 Q232,90 250,70 L246,67 Q227,88 204,126 Z", targetColor: "#4B5563" },
    { id: 5, path: "M150,67 m-7,0 a7,7 0 1,0 14,0 a7,7 0 1,0 -14,0", targetColor: "#A855F7" },
    { id: 6, path: "M250,67 m-7,0 a7,7 0 1,0 14,0 a7,7 0 1,0 -14,0", targetColor: "#A855F7" },
    { id: 7, path: "M192,185 Q138,138 70,148 Q44,190 80,242 Q118,275 192,245 Z", targetColor: "#7C3AED" },
    { id: 8, path: "M208,185 Q262,138 330,148 Q356,190 320,242 Q282,275 208,245 Z", targetColor: "#7C3AED" },
    { id: 9, path: "M192,255 Q138,260 95,285 Q100,338 155,318 Q182,298 192,272 Z", targetColor: "#A855F7" },
    { id: 10, path: "M208,255 Q262,260 305,285 Q300,338 245,318 Q218,298 208,272 Z", targetColor: "#A855F7" },
    { id: 11, path: "M128,198 m-22,0 a22,22 0 1,0 44,0 a22,22 0 1,0 -44,0", targetColor: "#FBBF24" },
    { id: 12, path: "M272,198 m-22,0 a22,22 0 1,0 44,0 a22,22 0 1,0 -44,0", targetColor: "#FBBF24" },
    { id: 13, path: "M148,275 m-14,0 a14,14 0 1,0 28,0 a14,14 0 1,0 -28,0", targetColor: "#FDE68A" },
    { id: 14, path: "M252,275 m-14,0 a14,14 0 1,0 28,0 a14,14 0 1,0 -28,0", targetColor: "#FDE68A" },
  ],

  // ─── NIVO 5: SLON ────────────────────────────────────────────────────────────
  5: [
    // --- Tijelo ---
    { id: 1, path: "M118,245 Q100,340 105,390 L295,390 Q300,340 282,245 Q240,220 200,218 Q160,220 118,245 Z", targetColor: "#94A3B8" },

    // --- Trbuh (svjetliji) ---
    { id: 2, path: "M140,310 Q140,375 200,378 Q260,375 260,310 Q240,295 200,292 Q160,295 140,310 Z", targetColor: "#CBD5E1" },

    // --- Glava ---
    { id: 3, path: "M112,195 Q108,130 200,118 Q292,130 288,195 Q288,265 200,272 Q112,265 112,195 Z", targetColor: "#94A3B8" },

    // --- Leva uška (vanjska) ---
    { id: 4, path: "M115,165 Q65,130 55,195 Q48,255 108,258 Q112,240 112,215 Z", targetColor: "#94A3B8" },
    // --- Leva uška (unutrašnjost) ---
    { id: 5, path: "M112,178 Q75,155 68,200 Q63,240 108,245 Q110,230 112,210 Z", targetColor: "#FDA4AF" },

    // --- Desna uška (vanjska) ---
    { id: 6, path: "M285,165 Q335,130 345,195 Q352,255 292,258 Q288,240 288,215 Z", targetColor: "#94A3B8" },
    // --- Desna uška (unutrašnjost) ---
    { id: 7, path: "M288,178 Q325,155 332,200 Q337,240 292,245 Q290,230 288,210 Z", targetColor: "#FDA4AF" },

    // --- Surla (tanka, blago uvijena) ---
    { id: 8, path: "M193,267 C188,300 183,340 185,373 Q188,390 197,396 Q207,398 213,388 Q214,374 210,355 C208,324 208,295 209,268 Q202,258 193,267 Z", targetColor: "#7F8EA3" },
    // --- Nozdrve (mali vrh) ---
    { id: 9, path: "M194,388 Q192,398 200,400 Q209,398 213,389 Q211,382 203,381 Q194,382 194,388 Z", targetColor: "#FDA4AF" },
    // --- Surla bora 1 ---
    { id: 10, path: "M190,300 Q201,297 210,300", targetColor: "#64748B", stroke: true },
    // --- Surla bora 2 ---
    { id: 11, path: "M188,335 Q200,331 210,336", targetColor: "#64748B", stroke: true },

    // --- Kljove ---
    { id: 13, path: "M168,248 Q150,255 140,275 Q148,285 162,278 Q172,262 178,250 Z", targetColor: "#FEF3C7" },
    { id: 14, path: "M232,248 Q250,255 260,275 Q252,285 238,278 Q228,262 222,250 Z", targetColor: "#FEF3C7" },

    // --- Oko levo (bijelo) ---
    { id: 15, path: "M155,178 m-16,0 a16,14 0 1,0 32,0 a16,14 0 1,0 -32,0", targetColor: "#FFFFFF" },
    // --- Oko levo (zjenica) ---
    { id: 16, path: "M157,178 m-8,0 a8,9 0 1,0 16,0 a8,9 0 1,0 -16,0", targetColor: "#1F2937" },

    // --- Oko desno (bijelo) ---
    { id: 18, path: "M245,178 m-16,0 a16,14 0 1,0 32,0 a16,14 0 1,0 -32,0", targetColor: "#FFFFFF" },
    // --- Oko desno (zjenica) ---
    { id: 19, path: "M243,178 m-8,0 a8,9 0 1,0 16,0 a8,9 0 1,0 -16,0", targetColor: "#1F2937" },

    // --- Rumenilo levo ---
    { id: 21, path: "M133,222 m-16,0 a16,9 0 1,0 32,0 a16,9 0 1,0 -32,0", targetColor: "#FDA4AF" },
    // --- Rumenilo desno ---
    { id: 22, path: "M267,222 m-16,0 a16,9 0 1,0 32,0 a16,9 0 1,0 -32,0", targetColor: "#FDA4AF" },

    // --- Noga prednja leva ---
    { id: 23, path: "M125,358 Q118,388 122,405 L170,405 Q174,388 167,358 Z", targetColor: "#64748B" },
    // --- Noga prednja desna ---
    { id: 24, path: "M233,358 Q226,388 230,405 L278,405 Q282,388 275,358 Z", targetColor: "#64748B" },
    // --- Noga zadnja leva ---
    { id: 25, path: "M108,362 Q102,390 106,406 L148,406 Q152,390 146,362 Z", targetColor: "#475569" },
    // --- Noga zadnja desna ---
    { id: 26, path: "M252,362 Q246,390 250,406 L292,406 Q296,390 290,362 Z", targetColor: "#475569" },

    // --- Prsti noge prednje leve ---
    { id: 27, path: "M122,404 Q120,412 128,414 Q136,412 138,404 Z M138,404 Q138,412 146,414 Q154,412 154,404 Z M154,404 Q154,412 162,414 Q170,412 170,404 Z", targetColor: "#475569" },
    // --- Prsti noge prednje desne ---
    { id: 28, path: "M230,404 Q228,412 236,414 Q244,412 246,404 Z M246,404 Q246,412 254,414 Q262,412 262,404 Z M262,404 Q262,412 270,414 Q278,412 278,404 Z", targetColor: "#475569" },

    // --- Rep ---
    { id: 29, path: "M288,255 Q328,248 338,275 Q345,295 330,298 Q318,292 316,285 Q328,284 330,276 Q320,255 290,262 Z", targetColor: "#7F8EA3" },
    // --- Čuperak repa ---
    { id: 30, path: "M326,294 Q320,305 322,318 Q330,315 336,305 Q340,296 330,298 Z", targetColor: "#475569" },
  ],

  // ─── NIVO 6: RIBA ────────────────────────────────────────────────────────────
  6: [
    // --- Tijelo (osnova) ---
    { id: 1, path: "M95,210 Q110,155 185,140 Q260,128 305,185 Q330,205 305,225 Q260,272 185,270 Q110,258 95,210 Z", targetColor: "#F97316" },

    // --- Trbuh (svjetliji dio) ---
    { id: 2, path: "M110,210 Q125,235 185,245 Q240,254 285,222 Q265,250 185,260 Q115,255 105,225 Z", targetColor: "#FED7AA" },

    // --- Rep (veliki, lepezast) ---
    { id: 3, path: "M305,185 L370,145 L390,200 L370,255 L305,225 Z", targetColor: "#EA580C" },
    // --- Rep unutrašnjost gornja ---
    { id: 4, path: "M308,187 L360,155 L375,198 L340,198 Z", targetColor: "#FBBF24" },
    // --- Rep unutrašnjost donja ---
    { id: 5, path: "M308,223 L340,212 L375,203 L360,248 Z", targetColor: "#FBBF24" },

    // --- Leđna peraja (gore) ---
    { id: 6, path: "M170,141 Q185,95 220,88 Q255,95 270,138 Q240,125 200,125 Z", targetColor: "#EF4444" },

    // --- Prsna peraja (bočna) ---
    { id: 7, path: "M200,195 Q220,215 240,240 Q215,238 195,218 Z", targetColor: "#FB923C" },

    // --- Anal peraja (donja) ---
    { id: 8, path: "M195,258 Q215,285 240,295 Q220,275 205,265 Z", targetColor: "#EF4444" },

    // --- Oko (bijelo) ---
    { id: 9, path: "M148,178 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0", targetColor: "#FFFFFF" },
    // --- Oko (zjenica) ---
    { id: 10, path: "M150,178 m-11,0 a11,11 0 1,0 22,0 a11,11 0 1,0 -22,0", targetColor: "#1F2937" },
    // --- Oko (odsjaj) ---
    { id: 11, path: "M143,172 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0", targetColor: "#FFFFFF", stroke: true },

    // --- Usta ---
    { id: 12, path: "M100,202 Q106,218 118,212 Q108,204 100,202 Z", targetColor: "#DC2626" },

    // --- Škrge (luk) ---
    { id: 13, path: "M175,148 Q170,178 174,210", targetColor: "#C2410C", stroke: true },

    // --- Ljuske – gornji red ---
    { id: 14, path: "M195,155 Q208,148 221,155 Q208,165 195,155 Z", targetColor: "#FB923C" },
    { id: 15, path: "M225,148 Q238,141 251,148 Q238,158 225,148 Z", targetColor: "#FB923C" },
    { id: 16, path: "M255,148 Q267,142 278,148 Q267,157 255,148 Z", targetColor: "#FB923C" },

    // --- Ljuske – srednji red ---
    { id: 17, path: "M188,178 Q200,171 212,178 Q200,188 188,178 Z", targetColor: "#FB923C" },
    { id: 18, path: "M216,170 Q228,163 240,170 Q228,180 216,170 Z", targetColor: "#FB923C" },
    { id: 19, path: "M244,165 Q256,158 268,165 Q256,175 244,165 Z", targetColor: "#FB923C" },
    { id: 20, path: "M270,168 Q280,162 290,168 Q280,178 270,168 Z", targetColor: "#FB923C" },

    // --- Ljuske – donji red ---
    { id: 21, path: "M195,208 Q207,201 219,208 Q207,218 195,208 Z", targetColor: "#FB923C" },
    { id: 22, path: "M222,200 Q234,193 246,200 Q234,210 222,200 Z", targetColor: "#FB923C" },
    { id: 23, path: "M248,196 Q260,189 272,196 Q260,206 248,196 Z", targetColor: "#FB923C" },

    // --- Mjehurići ---
    { id: 24, path: "M78,175 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0", targetColor: "#BAE6FD" },
    { id: 25, path: "M58,148 m-7,0 a7,7 0 1,0 14,0 a7,7 0 1,0 -14,0", targetColor: "#BAE6FD" },
    { id: 26, path: "M42,130 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0", targetColor: "#BAE6FD" },
  ],

  // ─── NIVO 7: AUTOMOBIL ───────────────────────────────────────────────────────
  7: [
    { id: 1, path: "M58,252 L58,312 L342,312 L342,252 Z", targetColor: "#EF4444" },
    { id: 2, path: "M108,252 L128,178 L272,178 L292,252 Z", targetColor: "#DC2626" },
    { id: 3, path: "M116,250 L133,186 L196,186 L196,250 Z", targetColor: "#BAE6FD" },
    { id: 4, path: "M204,250 L204,186 L267,186 L284,250 Z", targetColor: "#BAE6FD" },
    { id: 5, path: "M196,186 L204,186 L204,250 L196,250 Z", targetColor: "#DC2626" },
    { id: 6, path: "M52,298 L52,318 L114,318 L114,298 Z", targetColor: "#6B7280" },
    { id: 7, path: "M286,298 L286,318 L348,318 L348,298 Z", targetColor: "#6B7280" },
    { id: 8, path: "M100,312 m-40,0 a40,40 0 1,0 80,0 a40,40 0 1,0 -80,0", targetColor: "#1F2937" },
    { id: 9, path: "M100,312 m-26,0 a26,26 0 1,0 52,0 a26,26 0 1,0 -52,0", targetColor: "#9CA3AF" },
    { id: 10, path: "M100,312 m-11,0 a11,11 0 1,0 22,0 a11,11 0 1,0 -22,0", targetColor: "#374151" },
    { id: 11, path: "M300,312 m-40,0 a40,40 0 1,0 80,0 a40,40 0 1,0 -80,0", targetColor: "#1F2937" },
    { id: 12, path: "M300,312 m-26,0 a26,26 0 1,0 52,0 a26,26 0 1,0 -52,0", targetColor: "#9CA3AF" },
    { id: 13, path: "M300,312 m-11,0 a11,11 0 1,0 22,0 a11,11 0 1,0 -22,0", targetColor: "#374151" },
    { id: 14, path: "M62,256 L62,280 L88,280 L88,256 Z", targetColor: "#FDE68A" },
    { id: 15, path: "M312,256 L312,280 L338,280 L338,256 Z", targetColor: "#FCA5A5" },
    { id: 16, path: "M200,210 m-14,0 a14,14 0 1,0 28,0 a14,14 0 1,0 -28,0", targetColor: "#374151" },
    { id: 17, path: "M152,268 L152,280 L174,280 L174,268 Z", targetColor: "#9CA3AF" },
    { id: 18, path: "M226,268 L226,280 L248,280 L248,268 Z", targetColor: "#9CA3AF" },
  ],

  // ─── NIVO 8: MAČKA ───────────────────────────────────────────────────────────
  8: [
    { id: 1, path: "M128,244 Q118,314 133,374 L267,374 Q282,314 272,244 Q200,224 128,244 Z", targetColor: "#F97316" },
    { id: 2, path: "M108,178 Q103,234 138,252 Q200,270 262,252 Q297,234 292,178 Q252,132 200,130 Q148,132 108,178 Z", targetColor: "#FB923C" },
    { id: 3, path: "M113,188 L98,120 L155,162 Z", targetColor: "#F97316" },
    { id: 4, path: "M116,184 L106,134 L148,164 Z", targetColor: "#FCA5A5" },
    { id: 5, path: "M287,188 L302,120 L245,162 Z", targetColor: "#F97316" },
    { id: 6, path: "M284,184 L294,134 L252,164 Z", targetColor: "#FCA5A5" },
    { id: 7, path: "M163,188 m-20,0 a20,16 0 1,0 40,0 a20,16 0 1,0 -40,0", targetColor: "#FFFFFF" },
    { id: 8, path: "M163,188 m-10,0 a10,14 0 1,0 20,0 a10,14 0 1,0 -20,0", targetColor: "#10B981" },
    { id: 9, path: "M163,188 m-5,0 a5,10 0 1,0 10,0 a5,10 0 1,0 -10,0", targetColor: "#1F2937" },
    { id: 10, path: "M237,188 m-20,0 a20,16 0 1,0 40,0 a20,16 0 1,0 -40,0", targetColor: "#FFFFFF" },
    { id: 11, path: "M237,188 m-10,0 a10,14 0 1,0 20,0 a10,14 0 1,0 -20,0", targetColor: "#10B981" },
    { id: 12, path: "M237,188 m-5,0 a5,10 0 1,0 10,0 a5,10 0 1,0 -10,0", targetColor: "#1F2937" },
    { id: 13, path: "M200,222 L188,210 L212,210 Z", targetColor: "#EC4899" },
    { id: 14, path: "M200,224 Q185,237 174,232", targetColor: "#1F2937", stroke: true },
    { id: 15, path: "M200,224 Q215,237 226,232", targetColor: "#1F2937", stroke: true },
    { id: 16, path: "M185,213 L132,202", targetColor: "#1F2937", stroke: true },
    { id: 17, path: "M185,220 L132,226", targetColor: "#1F2937", stroke: true },
    { id: 18, path: "M215,213 L268,202", targetColor: "#1F2937", stroke: true },
    { id: 19, path: "M215,220 L268,226", targetColor: "#1F2937", stroke: true },
    { id: 20, path: "M264,345 Q322,334 338,302 Q348,276 332,262 Q322,260 320,270 Q330,280 324,300 Q312,325 260,358 Z", targetColor: "#F97316" },
    { id: 21, path: "M143,366 L138,404 L163,404 L160,366 Z", targetColor: "#F97316" },
    { id: 22, path: "M238,366 L235,404 L260,404 L257,366 Z", targetColor: "#F97316" },
  ],
};

export default function ColoringGame({ childId, level, onComplete, autoStart, isMonitor, monitorState }: GameProps) {
  const [zones, setZones] = useState<ColorZone[]>(monitorState?.zones || []);
  const [selectedColor, setSelectedColor] = useState<string>(monitorState?.selectedColor || COLORS[0].value);
  const [isPlaying, setIsPlaying] = useState(isMonitor ? true : (monitorState?.isPlaying || false));
  const [startTime, setStartTime] = useState<number | null>(null);
  const [moodBefore, setMoodBefore] = useState<string | null>(null);
  const [showMoodBefore, setShowMoodBefore] = useState(false);
  const [showMoodAfter, setShowMoodAfter] = useState(false);
  const [completedZones, setCompletedZones] = useState(monitorState?.completedZones || 0);
  const [timeLeft, setTimeLeft] = useState(monitorState?.timeLeft || 300);
  const [score, setScore] = useState(monitorState?.score || 0);

  // Sync with monitor state if in monitor mode
  useEffect(() => {
    if (isMonitor && monitorState) {
      if (monitorState.zones) setZones(monitorState.zones);
      if (monitorState.selectedColor) setSelectedColor(monitorState.selectedColor);
      if (monitorState.score !== undefined) setScore(monitorState.score);
      if (monitorState.timeLeft !== undefined) setTimeLeft(monitorState.timeLeft);
      if (monitorState.completedZones !== undefined) setCompletedZones(monitorState.completedZones);
      if (monitorState.correctCount !== undefined) setCompletedZones(monitorState.correctCount);
      if (monitorState.isPlaying !== undefined) setIsPlaying(monitorState.isPlaying);
    }
  }, [isMonitor, monitorState]);

  // Auto-start logic
  useEffect(() => {
    if (autoStart && !isMonitor && !isPlaying && completedZones === 0) {
      handleMoodBeforeSelect("neutral"); // Default mood for auto-start
    }
  }, [autoStart, isMonitor, isPlaying, completedZones]);

  const { emitGameStart, emitGameProgress, emitGameComplete, isConnected } = useGameEmitter();
  const template = TEMPLATES[level as keyof typeof TEMPLATES] || TEMPLATES[1];

  const initializeGame = () => {
    // Stroke-only zones (whiskers, mouth lines etc.) are too thin to click.
    // Pre-fill them with their target color so the user only has to color fillable areas.
    const initialZones = (template as any[]).map(t => ({
      ...t,
      color: t.stroke ? t.targetColor : null,
    }));
    setZones(initialZones);

    // Count pre-filled stroke zones so completion check works correctly
    const preFilledCount = (template as any[]).filter(t => t.stroke).length;
    setCompletedZones(preFilledCount);
  };

  const startGame = () => {
    setShowMoodBefore(true);
  };

  const handleMoodBeforeSelect = (mood: string) => {
    setMoodBefore(mood);
    setShowMoodBefore(false);
    setIsPlaying(true);
    setStartTime(Date.now());
    setTimeLeft(300);
    initializeGame();

    emitGameStart(childId, 4, 'coloring', {
      level,
      zones: zones,
      selectedColor: selectedColor,
      timeLeft: 300,
      isPlaying: true
    });
  };

  useEffect(() => {
    if (!isPlaying || timeLeft <= 0 || isMonitor) return;

    const timer = setInterval(() => {
      setTimeLeft((prev: number) => {
        const newTime = prev - 1;

        if (newTime > 0 && newTime % 10 === 0) {
          emitGameProgress({
            childId,
            activityId: 4,
            gameType: 'coloring',
            event: 'progress',
            data: { timeLeft: newTime, score, level, completedZones },
            timestamp: new Date().toISOString(),
          });
        }

        if (newTime <= 0) {
          setIsPlaying(false);
          handleGameEnded(false);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, isMonitor, childId, score, level, completedZones, emitGameProgress]);

  const handleGameEnded = (completed: boolean) => {
    setIsPlaying(false);
    const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const baseScore = completed ? 300 : Math.floor((completedZones / template.length) * 300);
    const timeBonus = completed ? Math.max(0, timeLeft * 2) : 0;
    const finalScore = baseScore + timeBonus;
    setScore(finalScore);

    emitGameComplete({
      childId,
      activityId: 4,
      gameType: 'coloring',
      event: 'completed',
      data: { finalScore, segmentsColored: completedZones, completed, timeSpent },
      timestamp: new Date().toISOString(),
    });

    if (autoStart) {
      handleMoodAfterSelect("neutral"); // Default mood for auto-transition
    } else {
      setTimeout(() => setShowMoodAfter(true), 1000);
    }
  };

  const handleZoneClick = (zoneId: number) => {
    if (!isPlaying || isMonitor) return;

    // --- COLOR RESTRICTION FOR CAT (Level 8) ---
    if (level === 8) {
      const zone = zones.find(z => z.id === zoneId);
      if (zone) {
        let audioUrl = "";
        const color = selectedColor.toUpperCase();

        // Block these colors ONLY if they are NOT the target color for this zone
        if (color !== zone.targetColor.toUpperCase()) {
          if (color === "#EF4444") { // Crvena
            audioUrl = '/sounds/coloring/redCat.mp3';
          } else if (color === "#3B82F6" || color === "#60A5FA") { // Plava / Svetlo plava
            audioUrl = '/sounds/coloring/blueCat.mp3';
          } else if (color === "#10B981") { // Zelena
            audioUrl = '/sounds/coloring/greenCat.mp3';
          }
        }

        if (audioUrl) {
          window.dispatchEvent(new CustomEvent('avatar:speak', { detail: { url: audioUrl } }));
          return;
        }
      }
    }

    setZones(prev => prev.map(zone => {
      if (zone.id === zoneId) {
        const wasColored = zone.color !== null;
        const newColor = selectedColor;

        if (!wasColored) {
          const newCompletedZones = completedZones + 1;
          setCompletedZones(newCompletedZones);

          const currentScore = Math.floor((newCompletedZones / template.length) * 300);
          setScore(currentScore);

          emitGameProgress({
            childId,
            activityId: 4,
            gameType: 'coloring',
            event: 'color_applied',
            data: {
              zoneId,
              color: selectedColor,
              totalColored: newCompletedZones,
              score: currentScore,
              correct: true,
              correctCount: newCompletedZones,
              incorrectCount: 0,
              zones: zones.map(z => z.id === zoneId ? { ...z, color: newColor } : z),
              selectedColor,
              timeLeft,
              completedZones: newCompletedZones,
            },
            timestamp: new Date().toISOString(),
          });
          if (newCompletedZones === template.length) {
            handleGameEnded(true);
          }
        }

        return { ...zone, color: newColor };
      }
      return zone;
    }));
  };

  const handleMoodAfterSelect = (mood: string) => {
    setShowMoodAfter(false);
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    onComplete(score, duration, moodBefore, mood);
  };

  const getLevelName = (lvl: number) => {
    const names = ["", "Sunce ☀️", "Kućica 🏠", "Cvijet 🌸", "Leptir 🦋", "Slon 🐘", "Riba 🐟", "Automobil 🚗", "Mačka 🐱"];
    return names[lvl] || "Slika";
  };

  // ─── Mood Before ──────────────────────────────────────────────────────────────
  if (!isMonitor && showMoodBefore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl animate-in fade-in duration-500">
        <div className="text-center mb-10 md:mb-16">
          <span className="px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 md:mb-4 inline-block">Moja Bojanka</span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Kako se osećaš sada? ✨</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-8 w-full max-w-5xl px-4">
          {[
            { emoji: "😢", label: "Tužno", color: "from-blue-400 to-indigo-500", value: "very_upset" },
            { emoji: "😕", label: "Umorno", color: "from-slate-400 to-slate-500", value: "upset" },
            { emoji: "😐", label: "Okej", color: "from-emerald-400 to-teal-500", value: "neutral" },
            { emoji: "😊", label: "Dobro", color: "from-amber-400 to-orange-500", value: "happy" },
            { emoji: "😄", label: "Super!", color: "from-pink-400 to-rose-500", value: "very_happy" },
          ].map((mood) => (
            <button
              key={mood.value}
              onClick={() => handleMoodBeforeSelect(mood.value)}
              className="group relative flex flex-col items-center bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl border border-slate-100"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-0 group-hover:opacity-10 rounded-[1.5rem] md:rounded-[2.5rem] transition-opacity`}></div>
              <span className="text-5xl md:text-7xl mb-2 md:mb-4 transform group-hover:scale-110 transition-transform duration-300 select-none">{mood.emoji}</span>
              <span className="text-sm md:text-lg font-black text-slate-700">{mood.label}</span>
            </button>
          ))}
        </div>

        {isConnected && (
          <div className="mt-10 md:mt-16 flex items-center gap-3 px-4 py-2 md:px-6 md:py-3 bg-white/50 backdrop-blur-sm rounded-2xl border border-green-100 shadow-sm">
            <span className="relative flex h-2 w-2 md:h-3 md:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-full w-full bg-green-500"></span>
            </span>
            <span className="text-[10px] md:text-sm font-bold text-green-700 tracking-wide uppercase">Spremni za praćenje</span>
          </div>
        )}
      </div>
    );
  }

  if (!isMonitor && showMoodAfter) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] w-full bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl animate-in fade-in duration-500">
        <div className="text-center mb-10 md:mb-16">
          <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 md:mb-4 inline-block">Igra je završena!</span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-3 md:mb-4">Bravo! Kako si sada? 🌟</h2>
          <p className="text-lg md:text-xl text-slate-500 font-medium tracking-wide">
            Tvoja slika izgleda prelepo! Rezultat: <span className="font-bold text-emerald-600 underline decoration-2 underline-offset-4">{score} poena</span>.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-8 w-full max-w-5xl px-4">
          {[
            { emoji: "😢", label: "Tužno", color: "from-blue-400 to-indigo-500", value: "very_upset" },
            { emoji: "😕", label: "Umorno", color: "from-slate-400 to-slate-500", value: "upset" },
            { emoji: "😐", label: "Okej", color: "from-emerald-400 to-teal-500", value: "neutral" },
            { emoji: "😊", label: "Dobro", color: "from-amber-400 to-orange-500", value: "happy" },
            { emoji: "😄", label: "Super!", color: "from-pink-400 to-rose-500", value: "very_happy" },
          ].map((mood) => (
            <button
              key={mood.value}
              onClick={() => handleMoodAfterSelect(mood.value)}
              className="group relative flex flex-col items-center bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl border border-slate-100"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-0 group-hover:opacity-10 rounded-[1.5rem] md:rounded-[2.5rem] transition-opacity`}></div>
              <span className="text-5xl md:text-7xl mb-2 md:mb-4 transform group-hover:scale-110 transition-transform duration-300 select-none">{mood.emoji}</span>
              <span className="text-sm md:text-lg font-black text-slate-700">{mood.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Start Screen ─────────────────────────────────────────────────────────────
  if (!isPlaying && completedZones === 0) {
    return (
      <div className="relative min-h-[500px] w-full flex items-center justify-center overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-rose-50 via-orange-50 to-rose-100 shadow-lg">
        <div className="absolute top-12 left-12 text-6xl opacity-10 animate-pulse rotate-12">🎨</div>
        <div className="absolute bottom-16 right-12 text-7xl opacity-10 animate-bounce -rotate-12">🖌️</div>
        <div className="absolute top-24 right-20 text-5xl opacity-10 animate-pulse rotate-45">✏️</div>
        <div className="absolute bottom-24 left-24 text-6xl opacity-10 animate-bounce -rotate-6">🌈</div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-200/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl -ml-32 -mb-32"></div>

        <div className="relative z-10 w-full max-w-md mx-auto p-6 flex flex-col items-center text-center">
          <div className="mb-8 animate-in slide-in-from-top-4 duration-700">
            <span className="px-6 py-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-rose-100 text-rose-600 text-sm font-black uppercase tracking-widest shadow-sm">
              Nivo {level} • {getLevelName(level)}
            </span>
          </div>
          <div className="mb-10 relative group cursor-default">
            <div className="absolute inset-0 bg-rose-400 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            <div className="relative w-40 h-40 bg-gradient-to-b from-white to-rose-50 rounded-[2.5rem] shadow-xl border-4 border-white flex items-center justify-center transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
              <span className="text-8xl drop-shadow-md">🎨</span>
            </div>
            <div className="absolute -top-4 -right-4 text-3xl animate-bounce delay-100">🖌️</div>
            <div className="absolute -bottom-4 -left-4 text-3xl animate-bounce delay-300">✨</div>
          </div>
          <h2 className="text-5xl font-black text-slate-800 mb-4 tracking-tight drop-shadow-sm">Bojenje</h2>
          <p className="text-slate-600 text-xl font-medium leading-relaxed mb-12 max-w-sm mx-auto">
            <span className="text-rose-500 font-bold">Oboji sliku</span> bojama koje želiš! Pusti mašti na volju!
          </p>
          <button onClick={startGame}
            className="w-full max-w-sm group bg-rose-500 hover:bg-rose-600 text-white rounded-2xl p-1.5 transition-all duration-300 shadow-xl shadow-rose-200 hover:shadow-rose-300 hover:-translate-y-1">
            <div className="bg-white/10 border border-white/20 rounded-xl px-8 py-5 flex items-center justify-center gap-4 h-full">
              <span className="text-2xl font-bold tracking-wide">ZAPOČNI IGRU</span>
              <div className="w-12 h-12 bg-white text-rose-600 rounded-xl flex items-center justify-center font-bold text-2xl group-hover:scale-110 transition-transform shadow-inner">▶</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ─── Game Screen ──────────────────────────────────────────────────────────────
  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl md:rounded-[3.5rem] p-4 pt-6 md:p-10 shadow-2xl border border-white/50 w-full max-w-7xl mx-auto flex-1 flex flex-col animate-in fade-in duration-700 relative">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-rose-500/5 pointer-events-none"></div>

      {/* Compact Header Area */}
      <div className="flex justify-between items-center mb-6 md:mb-10 bg-gradient-to-r from-indigo-50/50 to-white rounded-2xl md:rounded-[2.5rem] px-4 py-3 md:px-10 md:py-6 shadow-xl relative overflow-hidden ring-1 ring-indigo-100/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>

        <div className="flex items-center gap-3 md:gap-8 relative z-10">
          <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl bg-white shadow-md flex items-center justify-center text-xl md:text-3xl ring-4 ring-indigo-50 border border-indigo-100 transform -rotate-3 transition-transform">
            🎨
          </div>
          <div>
            <h3 className="text-lg md:text-2xl font-black text-slate-800 tracking-wide uppercase leading-tight">Studio</h3>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6 relative z-10">
          <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl md:rounded-3xl px-4 py-2 md:px-8 md:py-3 border border-indigo-100/50 text-center min-w-[70px] md:min-w-[120px]">
            <span className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Napredak</span>
            <span className="text-xl md:text-3xl font-black text-emerald-500">{Math.round((completedZones / zones.length) * 100)}%</span>
          </div>

          <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl md:rounded-3xl px-4 py-2 md:px-8 md:py-3 border border-indigo-100/50 text-center min-w-[70px] md:min-w-[100px]">
            <span className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Vreme</span>
            <span className={`text-xl md:text-3xl font-black ${timeLeft <= 30 ? 'text-rose-500 animate-pulse' : 'text-indigo-400'}`}>{timeLeft}s</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-8 min-h-0 relative z-10">
        {/* Color Palette */}
        <div className="md:w-32 bg-slate-900 rounded-2xl md:rounded-[2.5rem] p-3 md:p-6 shadow-2xl flex md:flex-col items-center justify-start gap-3 md:gap-4 overflow-x-auto md:overflow-y-auto scrollbar-hide py-4 md:py-10 ring-1 ring-white/10 flex-shrink-0">
          <div className="hidden md:block w-full text-center pb-6 border-b border-white/10 mb-4 font-black text-[10px] text-slate-500 uppercase tracking-[0.2em]">
            Boje
          </div>
          <div className="flex md:flex-col gap-3 md:gap-4 flex-nowrap">
            {COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className={`w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex-shrink-0 transition-all duration-300 transform border-2 md:border-4 ${selectedColor === color.value
                  ? "border-white scale-110 shadow-xl shadow-white/20 ring-4 ring-white/10"
                  : "border-transparent hover:scale-110 hover:border-white/30"
                  }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* Drawing Area */}
        <div className="flex-1 bg-white rounded-2xl md:rounded-[3.5rem] shadow-2xl border border-slate-100 relative group overflow-hidden flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(#f1f5f9_1px,transparent_1px)] [background-size:24px_24px] opacity-50"></div>

          <svg className="w-full h-full max-h-[400px] md:max-h-[600px] drop-shadow-2xl relative z-10" viewBox="0 0 400 450">
            {zones.map((zone) => (
              <path
                key={zone.id}
                d={zone.path}
                fill={zone.color || "#F8FAFC"}
                stroke={zone.stroke ? zone.targetColor : "#CBD5E1"}
                strokeWidth={zone.stroke ? "3" : "1.5"}
                className={`transition-all duration-500 cursor-pointer hover:opacity-80 ${isMonitor ? "pointer-events-none" : ""}`}
                onClick={() => handleZoneClick(zone.id)}
              />
            ))}
          </svg>
        </div>
      </div>

      <div className="mt-6 text-center text-[10px] md:text-sm font-black text-slate-400 uppercase tracking-widest opacity-60 px-4 pb-4">
        💡 Izaberi boju i klikni na deo crteža.
      </div>
    </div>
  );
}