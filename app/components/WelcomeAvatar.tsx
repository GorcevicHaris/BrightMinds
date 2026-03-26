'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Professor Mentor Avatar (v4.0 - 40+ years old) ───────────────────────────
function AvatarFace({
    mouthOpen,
    blinking,
    size = 100,
    isPlaying,
}: {
    mouthOpen: number;
    blinking: boolean;
    size?: number;
    isPlaying: boolean;
}) {
    const scale = size / 100;
    // Lip-sync logic - EXTRA REDUCED for discrete speech
    const mH = (1.5 + mouthOpen * 4.5) * scale;
    const mW = (10 + mouthOpen * 3) * scale;

    return (
        <svg
            width={size}
            height={size * 1.3}
            viewBox="0 0 100 130"
            style={{
                filter: 'drop-shadow(0 15px 40px rgba(0,0,0,0.2))',
                animation: isPlaying ? 'avatarSway 3.5s ease-in-out infinite' : 'none'
            }}
        >
            <defs>
                <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFDEBC" />
                    <stop offset="100%" stopColor="#F1B07A" />
                </linearGradient>
                <linearGradient id="suitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1E1B4B" />
                    <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>
            </defs>

            {/* Professor's Suit & Tie */}
            <path
                d="M5 125 Q5 95 50 95 Q95 95 95 125 L95 130 L5 130 Z"
                fill="url(#suitGrad)"
            />
            {/* White Shirt & Tie */}
            <path d="M42 95 L50 115 L58 95" fill="white" />
            <path d="M47 95 L50 115 L53 95 L50 125 L47 95" fill="#BE123C" /> {/* Red Tie */}

            {/* Neck */}
            <rect x="43" y="85" width="14" height="15" fill="#E8B084" />
            <path d="M43 85 Q50 91 57 85" fill="#CE966C" />

            {/* Mature Face Shape - 40 years old proportions */}
            <path
                d="M28 45 C28 15, 72 15, 72 45 L72 75 C72 95, 50 100, 28 75 Z"
                fill="url(#skinGrad)"
            />

            {/* Professor's Glasses */}
            <g stroke="#334155" strokeWidth="1.5" fill="none">
                <circle cx="41" cy="55" r="7" />
                <circle cx="59" cy="55" r="7" />
                <path d="M48 55 Q50 54 52 55" /> {/* Bridge */}
                <path d="M34 55 L28 53" /> {/* Left arm */}
                <path d="M66 55 L72 53" /> {/* Right arm */}
            </g>

            {/* Eyes */}
            {blinking ? (
                <>
                    <line x1="38" y1="55" x2="44" y2="55" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
                    <line x1="56" y1="55" x2="62" y2="55" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
                </>
            ) : (
                <>
                    <circle cx="41" cy="55" r="2.5" fill="#0F172A" />
                    <circle cx="59" cy="55" r="2.5" fill="#0F172A" />
                    {/* Laugh lines */}
                    <path d="M30 55 Q32 52 34 55" stroke="rgba(0,0,0,0.1)" fill="none" />
                    <path d="M66 55 Q68 52 70 55" stroke="rgba(0,0,0,0.1)" fill="none" />
                </>
            )}

            {/* Mature Eyebrows */}
            <path d="M35 45 Q41 42 46 45" stroke="#2D1B13" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
            <path d="M54 45 Q59 42 65 45" stroke="#2D1B13" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />

            {/* Nose */}
            <path d="M48 68 Q50 71 52 68" stroke="#CE966C" strokeWidth="1.8" fill="none" strokeLinecap="round" />

            {/* Mouth - Professional Lip-Sync */}
            <ellipse
                cx="50"
                cy="84"
                rx={mW / 2 + 1}
                ry={mH / 2}
                fill={mouthOpen > 0.1 ? '#3F1F15' : '#BD835F'}
                style={{ transition: 'ry 0.04s ease' }}
            />
            {/* Teeth */}
            {mouthOpen > 0.4 && (
                <rect x={50 - mW / 4} y={84 - mH / 2 + 1} width={mW / 2} height="1.8" fill="white" rx="0.3" />
            )}

            {/* Professor's Hat (Mortarboard) */}
            <g>
                {/* Hat Base */}
                <path d="M35 25 L65 25 L60 35 L40 35 Z" fill="#0F172A" />
                {/* Diamond Top */}
                <path d="M20 20 L50 10 L80 20 L50 30 Z" fill="#1E1B4B" stroke="#0F172A" strokeWidth="1" />
                {/* Tassel */}
                <path d="M50 20 L82 25 L82 35" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
                <rect x="80" y="34" width="4" height="6" fill="#F59E0B" rx="1" />
            </g>

            {/* Mature Skin Details */}
            <path d="M42 92 Q50 95 58 92" stroke="rgba(0,0,0,0.1)" fill="none" strokeWidth="0.8" />
        </svg>
    );
}

// ─── Shared Logic (Same system) ───────────────────────────────────────────────
function useAvatarAudio() {
    const [mouthOpen, setMouthOpen] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const ctxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number | null>(null);

    const stopAnalysis = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        setIsPlaying(false);
        setMouthOpen(0);
    }, []);

    const analyse = useCallback(() => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const slice = data.slice(5, 55);
        const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
        setMouthOpen(Math.min(1, avg / 95));
        rafRef.current = requestAnimationFrame(analyse);
    }, []);

    const playSound = useCallback(async (url: string, onEnded?: () => void) => {
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            if (ctxRef.current) { ctxRef.current.close(); }
            const ctx = new Ctx() as AudioContext;
            ctxRef.current = ctx;
            const res = await fetch(url);
            const buf = await res.arrayBuffer();
            const decoded = await ctx.decodeAudioData(buf);
            const src = ctx.createBufferSource();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.6;
            analyserRef.current = analyser;
            src.buffer = decoded;
            src.connect(analyser);
            analyser.connect(ctx.destination);
            src.start(0);
            setIsPlaying(true);
            analyse();
            src.onended = () => { stopAnalysis(); onEnded?.(); };
        } catch (e) { console.error('Audio err', e); onEnded?.(); }
    }, [analyse, stopAnalysis]);

    const stop = useCallback(() => {
        stopAnalysis();
        ctxRef.current?.close();
    }, [stopAnalysis]);

    return { mouthOpen, isPlaying, playSound, stop };
}

// ─── Main Component UI ────────────────────────────────────────────────────────
export default function WelcomeAvatar({ childName, onLogoutConfirmed }: WelcomeAvatarProps) {
    const [visible, setVisible] = useState(false);
    const [blinking, setBlinking] = useState(false);
    const [showOutModal, setShowOutModal] = useState(false);
    const [outDone, setOutDone] = useState(false);
    const [isRemoved, setIsRemoved] = useState(false); // Novi state za sakrivanje
    const playedRef = useRef(false);

    const { mouthOpen, isPlaying, playSound, stop } = useAvatarAudio();

    const handleClose = () => {
        stop();
        setIsRemoved(true);
    };

    useEffect(() => {
        if (isRemoved) return;
        const tVisible = setTimeout(() => setVisible(true), 600);
        // Auto-greeting logic
        const tGreet = setTimeout(() => {
            // PROVERA: Ako je korisnik već pritisnuo Izlaz, nemoj puštati In-zvuk
            if (!playedRef.current && !showOutModal) {
                playedRef.current = true;
                playSound('/sounds/avatar/in/avatarIn1.mp3');
            }
        }, 1800);
        return () => { clearTimeout(tVisible); clearTimeout(tGreet); };
    }, [playSound, showOutModal]);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        const scheduleBlink = () => {
            timeout = setTimeout(() => {
                setBlinking(true);
                setTimeout(() => setBlinking(false), 140);
                scheduleBlink();
            }, 3500 + Math.random() * 5000);
        };
        scheduleBlink();
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (!showOutModal) return;
        stop();
        setOutDone(false);
        playSound('/sounds/avatar/out/avatarOut1.mp3', () => {
            setOutDone(true);
            setTimeout(() => onLogoutConfirmed(), 1200);
        });
    }, [showOutModal, stop, playSound, onLogoutConfirmed]);

    if (isRemoved) return null;

    return (
        <>
            <div
                className="welcome-avatar-container"
                style={{
                    position: 'fixed',
                    top: '90px',
                    right: '30px',
                    zIndex: 150,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    transform: visible ? 'translateY(0) scale(1)' : 'translateY(-30px) scale(0.85)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease',
                    pointerEvents: showOutModal ? 'none' : 'auto',
                    animation: 'avatarFloat 5s ease-in-out infinite',
                }}
            >
                {/* Close button (X) */}
                {!showOutModal && (
                    <button
                        onClick={handleClose}
                        style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '-10px',
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: 'white',
                            border: '2px solid #E0E7FF',
                            color: '#64748B',
                            fontSize: '14px',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 11,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.color = 'white'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#64748B'; }}
                    >
                        ✕
                    </button>
                )}
                {isPlaying && (
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '12px 22px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                        border: '2px solid #E0E7FF',
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#1E1B4B',
                        whiteSpace: 'nowrap',
                        position: 'relative',
                        animation: 'avatarPopIn 0.4s ease',
                    }}>
                        {childName ? `Zdravo, ${childName}! 👋` : 'Zdravo! 👋'}
                        <div style={{
                            position: 'absolute',
                            bottom: '-8px',
                            left: '50%',
                            transform: 'translateX(-50%) rotate(45deg)',
                            width: '12px',
                            height: '12px',
                            background: 'white',
                            border: '2px solid #E0E7FF',
                            borderTop: 'none',
                            borderLeft: 'none',
                        }} />
                    </div>
                )}

                <div style={{ position: 'relative' }}>
                    {isPlaying && (
                        <div style={{
                            position: 'absolute',
                            inset: '-10px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)',
                            animation: 'avatarPulse 1.5s ease-in-out infinite',
                        }} />
                    )}
                    <AvatarFace mouthOpen={mouthOpen} blinking={blinking} size={110} isPlaying={isPlaying} />
                </div>
            </div>

            {showOutModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(7, 10, 30, 0.94)',
                    backdropFilter: 'blur(18px)',
                }}>
                    <div style={{
                        background: 'linear-gradient(145deg, #ffffff, #F8FAFC)',
                        borderRadius: '50px',
                        padding: '70px 60px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '40px',
                        boxShadow: '0 60px 150px rgba(0,0,0,0.6)',
                        border: '2px solid rgba(255,255,255,0.9)',
                        minWidth: '420px',
                        textAlign: 'center',
                        animation: 'avatarHeroIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}>
                        <div style={{ position: 'relative' }}>
                            <AvatarFace mouthOpen={mouthOpen} blinking={blinking} size={220} isPlaying={isPlaying} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '42px', fontWeight: 950, color: '#1E1B4B', margin: '0 0 12px', letterSpacing: '-0.03em' }}>
                                {outDone ? 'Bravo! 👋' : 'Doviđenja! 👋'}
                            </h2>
                            <p style={{ fontSize: '24px', color: '#4F46E5', fontWeight: 800 }}>
                                {outDone ? 'Sjajno učenje danas!' : `Vratite se po još poena, ${childName}!`}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <LogoutTrigger onTrigger={() => setShowOutModal(true)} />

            <style>{`
        @keyframes avatarFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes avatarSway {
          0%, 100% { transform: rotate(-1.5deg); }
          50% { transform: rotate(1.5deg); }
        }
        @keyframes avatarPulse {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.15); }
        }
        @keyframes avatarPopIn {
          from { opacity: 0; transform: scale(0.6) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes avatarHeroIn {
          from { opacity: 0; transform: scale(0.8) translateY(120px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
        </>
    );
}

function LogoutTrigger({ onTrigger }: { onTrigger: () => void }) {
    useEffect(() => {
        const h = () => onTrigger();
        window.addEventListener('avatar:logout', h);
        return () => window.removeEventListener('avatar:logout', h);
    }, [onTrigger]); return null;
}

export function triggerAvatarLogout() { window.dispatchEvent(new Event('avatar:logout')); }

interface WelcomeAvatarProps { childName?: string; onLogoutConfirmed: () => void; }
