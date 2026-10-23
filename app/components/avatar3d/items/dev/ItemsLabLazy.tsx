"use client";

// Lenjo učitavanje probnog studija kataloga (three.js tek na ovoj stranici).
import dynamic from "next/dynamic";

export const ItemsLabLazy = dynamic(() => import("./ItemsLab"), { ssr: false, loading: () => <p className="p-4 text-slate-500">Učitavam katalog…</p> });
