import type { ReactNode } from "react";

// Crteži za zvuke koji nemaju fotografiju u /public/soundImage (sova, vetar).
// Crtaju se kao SVG u kodu, u duhu postojećih slika: mirna pastelna podloga, travnato ostrvce
// sa nekoliko žutih cvetova i jedan krupan motiv u sredini. Bez teksta.
// Okvir je kvadrat 640×640 (kao fotografije); `slice` ga iseca kao `object-cover` kod slika.

interface SoundPictureProps {
    className?: string;
}

/** Crtež koji stoji na mestu fotografije; ukrasan je (naziv zvuka piše ispod), pa ga čitači ekrana preskaču. */
export type SoundPicture = (props: SoundPictureProps) => ReactNode;

function Scene({ className, children }: SoundPictureProps & { children: ReactNode }) {
    return (
        <svg viewBox="0 0 640 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" className={className}>
            {/* Podloga i ostrvce — isto u svim crtežima */}
            <rect width="640" height="640" fill="#c9ebe6" />
            <ellipse cx="320" cy="640" rx="470" ry="150" fill="#d8f2ee" />
            <ellipse cx="320" cy="588" rx="262" ry="46" fill="#a9d6cf" opacity="0.55" />
            <ellipse cx="320" cy="556" rx="246" ry="60" fill="#4f9a3c" />
            <ellipse cx="320" cy="546" rx="242" ry="52" fill="#6dba4b" />
            <path d="M96 540 l8 -22 l7 20 l9 -24 l8 24 M508 536 l8 -22 l7 21 l9 -25 l8 25 M214 508 l7 -18 l7 17 l8 -20 l7 20 M400 506 l7 -18 l7 17 l8 -20 l7 20" fill="none" stroke="#4f9a3c" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <g stroke="#4f9a3c" strokeWidth="4" strokeLinecap="round">
                <path d="M150 532 v-26 M176 548 v-22 M478 528 v-28 M506 546 v-22" />
            </g>
            <g fill="#f6c93b">
                <circle cx="150" cy="502" r="9" />
                <circle cx="176" cy="523" r="8" />
                <circle cx="478" cy="496" r="9" />
                <circle cx="506" cy="521" r="8" />
            </g>
            <g fill="#e09a1a">
                <circle cx="150" cy="502" r="3.5" />
                <circle cx="176" cy="523" r="3" />
                <circle cx="478" cy="496" r="3.5" />
                <circle cx="506" cy="521" r="3" />
            </g>
            {children}
        </svg>
    );
}

/** Sova: krupne oči, uši-čuperci i kljun — sedi na travi, okrenuta ka detetu. */
export function OwlPicture({ className }: SoundPictureProps) {
    return (
        <Scene className={className}>
            <g fill="#f59e0b" stroke="#c97a06" strokeWidth="4" strokeLinejoin="round">
                <path d="M262 512 q-22 6 -26 26 q10 8 20 -2 q4 12 16 6 q10 8 20 -4 q-2 -20 -30 -26 Z" />
                <path d="M378 512 q22 6 26 26 q-10 8 -20 -2 q-4 12 -16 6 q-10 8 -20 -4 q2 -20 30 -26 Z" />
            </g>
            <path d="M214 232 L190 112 L292 176 Z M426 232 L450 112 L348 176 Z" fill="#8a5a33" stroke="#8a5a33" strokeWidth="18" strokeLinejoin="round" />
            <path d="M320 150 C420 150 478 232 478 346 C478 452 412 524 320 524 C228 524 162 452 162 346 C162 232 220 150 320 150 Z" fill="#b07a48" />
            <path d="M176 300 C132 356 140 452 204 500 C214 430 206 360 176 300 Z M464 300 C508 356 500 452 436 500 C426 430 434 360 464 300 Z" fill="#8a5a33" />
            <ellipse cx="320" cy="424" rx="98" ry="96" fill="#f3e2c4" />
            <path d="M276 392 q12 14 24 0 M340 392 q12 14 24 0 M308 432 q12 14 24 0 M266 446 q12 14 24 0 M350 446 q12 14 24 0 M308 480 q12 14 24 0" fill="none" stroke="#d2ab78" strokeWidth="6" strokeLinecap="round" />
            <circle cx="256" cy="282" r="74" fill="#f8ecd6" />
            <circle cx="384" cy="282" r="74" fill="#f8ecd6" />
            <circle cx="258" cy="284" r="48" fill="#f2a12b" />
            <circle cx="382" cy="284" r="48" fill="#f2a12b" />
            <circle cx="260" cy="286" r="32" fill="#2b1d14" />
            <circle cx="380" cy="286" r="32" fill="#2b1d14" />
            <circle cx="248" cy="272" r="11" fill="#ffffff" />
            <circle cx="368" cy="272" r="11" fill="#ffffff" />
            <circle cx="270" cy="298" r="5" fill="#ffffff" opacity="0.8" />
            <circle cx="390" cy="298" r="5" fill="#ffffff" opacity="0.8" />
            <path d="M320 306 L344 334 Q320 372 296 334 Z" fill="#f59e0b" stroke="#c97a06" strokeWidth="4" strokeLinejoin="round" />
            <path d="M236 196 Q270 172 304 196 M336 196 Q370 172 404 196" fill="none" stroke="#8a5a33" strokeWidth="10" strokeLinecap="round" />
        </Scene>
    );
}

/** Vetar: povijeno drvo, lišće koje leti i tri vazdušna vrtloga. */
export function WindPicture({ className }: SoundPictureProps) {
    return (
        <Scene className={className}>
            <path d="M236 548 C236 474 250 408 318 338" fill="none" stroke="#8a5a33" strokeWidth="30" strokeLinecap="round" />
            <path d="M270 430 C300 420 318 404 336 380" fill="none" stroke="#8a5a33" strokeWidth="14" strokeLinecap="round" />
            <g fill="#4f9a3c">
                <ellipse cx="372" cy="300" rx="112" ry="70" transform="rotate(-18 372 300)" />
                <ellipse cx="300" cy="300" rx="62" ry="54" />
            </g>
            <g fill="#6dba4b">
                <ellipse cx="384" cy="284" rx="92" ry="52" transform="rotate(-18 384 284)" />
                <ellipse cx="304" cy="290" rx="46" ry="40" />
            </g>
            <g fill="#6dba4b" stroke="#4f9a3c" strokeWidth="4" strokeLinejoin="round">
                <path d="M0 0 C14 -18 40 -18 54 0 C40 18 14 18 0 0 Z" transform="translate(506 232) rotate(-24)" />
                <path d="M0 0 C12 -15 34 -15 46 0 C34 15 12 15 0 0 Z" transform="translate(540 318) rotate(14)" />
                <path d="M0 0 C10 -13 30 -13 40 0 C30 13 10 13 0 0 Z" transform="translate(474 388) rotate(-8)" />
            </g>
            <path d="M0 0 C12 -15 34 -15 46 0 C34 15 12 15 0 0 Z" transform="translate(556 176) rotate(-40)" fill="#f2a12b" stroke="#c97a06" strokeWidth="4" strokeLinejoin="round" />
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <g stroke="#4b93b5" strokeWidth="26">
                    <path d="M70 150 H344 a50 50 0 1 0 -50 -50" />
                    <path d="M48 250 H214 a42 42 0 1 1 -42 42" />
                    <path d="M96 424 H388 a38 38 0 1 1 -38 38" />
                </g>
                <g stroke="#ffffff" strokeWidth="14">
                    <path d="M70 150 H344 a50 50 0 1 0 -50 -50" />
                    <path d="M48 250 H214 a42 42 0 1 1 -42 42" />
                    <path d="M96 424 H388 a38 38 0 1 1 -38 38" />
                </g>
            </g>
        </Scene>
    );
}
