"use client";

// Lenjo učitavanje 3D dela: three.js i ceo „motor” lika preuzimaju se tek na stranici
// koja ih prikazuje (poseban paket), nikad uz ostatak aplikacije.

import dynamic from "next/dynamic";

function Loading() {
    return (
        <div className="flex min-h-dvh items-center justify-center bg-[#ECEDF0] text-lg font-semibold text-slate-500" role="status">
            Učitavam drugara…
        </div>
    );
}

export const Avatar3DEditorLazy = dynamic(() => import("./Avatar3DEditor"), { ssr: false, loading: Loading });

export const Avatar3DViewLazy = dynamic(() => import("./Avatar3DView"), { ssr: false });
