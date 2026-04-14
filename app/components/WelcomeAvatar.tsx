'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Shared SVG Avatar face ───────────────────────────────────────────────────
function AvatarFace({
    mouthOpen,
    blinking,
    size = 96,
    isPlaying,
}: {
    mouthOpen: number;
    blinking: boolean;
    size?: number;
    isPlaying: boolean;
}) {
    const scale = size / 96;
    const mouthH = (4 + mouthOpen * 20) * scale;
    const mouthW = (20 + mouthOpen * 14) * scale;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 96 96"
            style={{ filter: 'drop-shadow(0 6px 18px rgba(109,40,217,0.4))' }}
        >
            <defs>
                <radialGradient id="bodyGradAv" cx="38%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="#c4b5fd" />
                    <stop offset="55%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#4c1d95" />
                </radialGradient>
                <radialGradient id="earGradAv" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#ddd6fe" />
                    <stop offset="100%" stopColor="#7c3aed" />
                </radialGradient>
            </defs>

            {/* Head */}
            <circle cx="48" cy="48" r="42" fill="url(#bodyGradAv)" />

            {/* Highlight */}
            <ellipse cx="34" cy="28" rx="13" ry="8" fill="rgba(255,255,255,0.18)" />

            {/* Ears */}
            <ellipse cx="9" cy="50" rx="8" ry="10" fill="url(#earGradAv)" />
            <ellipse cx="87" cy="50" rx="8" ry="10" fill="url(#earGradAv)" />
            <ellipse cx="9" cy="50" rx="5" ry="6" fill="#f9a8d4" opacity="0.55" />
            <ellipse cx="87" cy="50" rx="5" ry="6" fill="#f9a8d4" opacity="0.55" />

            {/* Eyes */}
            {blinking ? (
                <>
                    <rect x="27" y="40" width="14" height="3" rx="1.5" fill="#1e1b4b" />
                    <rect x="55" y="40" width="14" height="3" rx="1.5" fill="#1e1b4b" />
                </>
            ) : (
                <>
                    <ellipse cx="34" cy="41" rx="8" ry="9" fill="white" />
                    <ellipse cx="62" cy="41" rx="8" ry="9" fill="white" />
                    <ellipse cx="35" cy="42" rx="5" ry="6" fill="#4f46e5" />
                    <ellipse cx="63" cy="42" rx="5" ry="6" fill="#4f46e5" />
                    <circle cx="36" cy="40" r="2.2" fill="#1e1b4b" />
                    <circle cx="64" cy="40" r="2.2" fill="#1e1b4b" />
                    <circle cx="39" cy="37.5" r="1.5" fill="white" opacity="0.9" />
                    <circle cx="67" cy="37.5" r="1.5" fill="white" opacity="0.9" />
                    {/* Happy little squint when speaking */}
                    {isPlaying && (
                        <>
                            <path d="M27 35 Q34 31 41 35" stroke="#3730a3" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                            <path d="M55 35 Q62 31 69 35" stroke="#3730a3" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                        </>
                    )}
                </>
            )}

            {/* Eyebrows */}
            {!isPlaying && (
                <>
                    <path d="M26 31 Q34 27 42 31" stroke="#3730a3" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <path d="M54 31 Q62 27 70 31" stroke="#3730a3" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </>
            )}

            {/* Nose */}
            <ellipse cx="48" cy="54" rx="3" ry="2" fill="rgba(99,102,241,0.28)" />

            {/* Mouth */}
            <ellipse
                cx="48"
                cy="65"
                rx={mouthW / 2}
                ry={mouthH / 2}
                fill={mouthOpen > 0.08 ? '#1e1b4b' : '#c4b5fd'}
                style={{ transition: 'rx 0.04s ease, ry 0.04s ease' }}
            />
            {/* Teeth */}
            {mouthOpen > 0.22 && (
                <rect
                    x={48 - mouthW / 2 + 2}
                    y={65 - mouthH / 2 + 1}
                    width={mouthW - 4}
                    height={Math.min(mouthH * 0.4, 8)}
                    rx="2"
                    fill="white"
                    opacity={Math.min(1, (mouthOpen - 0.22) * 5)}
                />
            )}
            {/* Tongue */}
            {mouthOpen > 0.55 && (
                <ellipse
                    cx="48"
                    cy={65 + mouthH / 4}
                    rx={mouthW / 3}
                    ry={mouthH / 4}
                    fill="#f43f5e"
                    opacity={Math.min(1, (mouthOpen - 0.55) * 4)}
                />
            )}

            {/* Cheeks */}
            <ellipse cx="22" cy="58" rx="9" ry="5.5" fill="#f9a8d4" opacity="0.32" />
            <ellipse cx="74" cy="58" rx="9" ry="5.5" fill="#f9a8d4" opacity="0.32" />
        </svg>
    );
}

// ─── Audio hook ───────────────────────────────────────────────────────────────
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
        const slice = data.slice(2, 55);
        const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
        setMouthOpen(Math.min(1, avg / 75));
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
            analyser.smoothingTimeConstant = 0.65;
            analyserRef.current = analyser;

            src.buffer = decoded;
            src.connect(analyser);
            analyser.connect(ctx.destination);
            src.start(0);
            setIsPlaying(true);
            analyse();

            src.onended = () => {
                stopAnalysis();
                onEnded?.();
            };
        } catch (e) {
            console.error('Avatar audio error', e);
            onEnded?.();
        }
    }, [analyse, stopAnalysis]);

    const stop = useCallback(() => {
        stopAnalysis();
        ctxRef.current?.close();
    }, [stopAnalysis]);

    return { mouthOpen, isPlaying, playSound, stop };
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface WelcomeAvatarProps {
    childName?: string;
    onLogoutConfirmed: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WelcomeAvatar({ childName, onLogoutConfirmed }: WelcomeAvatarProps) {
    const [visible, setVisible] = useState(false);
    const [blinking, setBlinking] = useState(false);
    const [showOutModal, setShowOutModal] = useState(false);
    const [outDone, setOutDone] = useState(false);
    const playedRef = useRef(false);

    const { mouthOpen, isPlaying, playSound, stop } = useAvatarAudio();
    const [bubbleText, setBubbleText] = useState<string | null>(null);

    // ── Entrance animation and auto-greeting
    useEffect(() => {
        const tVisible = setTimeout(() => setVisible(true), 600);

        // Auto-greeting logic
        const tGreet = setTimeout(() => {
            if (!playedRef.current) {
                playedRef.current = true;
                const greeting = childName ? `Zdravo, ${childName}! 👋` : 'Zdravo! 👋';
                setBubbleText(greeting);
                playSound('/sounds/avatar/in/avatarIn1.mp3', () => {
                    setBubbleText(null);
                });
            }
        }, 1500);

        return () => {
            clearTimeout(tVisible);
            clearTimeout(tGreet);
        };
    }, [playSound, childName]);

    // ── Random blinking
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        const scheduleBlink = () => {
            timeout = setTimeout(() => {
                setBlinking(true);
                setTimeout(() => setBlinking(false), 140);
                scheduleBlink();
            }, 2000 + Math.random() * 3500);
        };
        scheduleBlink();
        return () => clearTimeout(timeout);
    }, []);

    // ── Trigger OUT sound when modal opens
    useEffect(() => {
        if (!showOutModal) return;
        stop();
        setOutDone(false);
        setBubbleText(null); // Clear bubble when modal is active
        playSound('/sounds/avatar/out/avatarOut1.mp3', () => {
            setOutDone(true);
            setTimeout(() => {
                onLogoutConfirmed();
            }, 1000);
        });
    }, [showOutModal, stop, playSound, onLogoutConfirmed]);

    // ── Listen for external "Speak" events (e.g. from ColoringGame)
    useEffect(() => {
        const handleSpeak = (e: any) => {
            const audioUrl = e.detail?.url;
            const customText = e.detail?.text; // Optional custom text for games
            if (audioUrl) {
                stop();
                setBubbleText(customText || null); // Only show bubble if text is provided
                playSound(audioUrl, () => {
                    setBubbleText(null);
                });
            }
        };
        window.addEventListener('avatar:speak', handleSpeak);
        return () => window.removeEventListener('avatar:speak', handleSpeak);
    }, [playSound, stop]);

    // Check if on mobile (safe SSR check)
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    return (
        <>
            <div
                className="welcome-avatar-container"
                style={{
                    position: 'fixed',
                    bottom: isMobile ? '20px' : 'auto',
                    top: isMobile ? 'auto' : '90px',
                    right: isMobile ? '16px' : '25px',
                    zIndex: 150,
                    display: 'flex',
                    flexDirection: isMobile ? 'column-reverse' : 'column',
                    alignItems: 'center',
                    gap: isMobile ? '4px' : '8px',
                    transform: visible 
                        ? `translateY(0) scale(${isMobile ? 0.8 : 1})` 
                        : `translateY(${isMobile ? '30px' : '-30px'}) scale(0.6)`,
                    opacity: visible ? 1 : 0,
                    transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease',
                    pointerEvents: showOutModal ? 'none' : 'auto',
                    animation: 'avatarFloat 3s ease-in-out infinite',
                }}
            >
                {/* Speech bubble - on mobile it should be ABOVE (column-reverse handles this) */}
                {bubbleText && (
                    <div
                        className="avatar-bubble"
                        style={{
                            background: 'white',
                            borderRadius: isMobile ? '16px' : '18px',
                            padding: isMobile ? '10px 14px' : '10px 16px',
                            boxShadow: '0 8px 30px rgba(109,40,217,0.25)',
                            border: '2.5px solid #ede9fe',
                            fontSize: isMobile ? '12px' : '14px',
                            fontWeight: 800,
                            color: '#4c1d95',
                            whiteSpace: 'nowrap',
                            position: 'relative',
                            animation: isMobile ? 'avatarSlideDownSmall 0.3s ease' : 'avatarSlideUpSmall 0.3s ease',
                        }}
                    >
                        {bubbleText}
                        {/* tail */}
                        <div style={{
                            position: 'absolute',
                            bottom: isMobile ? 'auto' : '-8px',
                            top: isMobile ? '-8px' : 'auto',
                            left: '50%',
                            transform: `translateX(-50%) rotate(${isMobile ? '-135deg' : '45deg'})`,
                            width: '12px',
                            height: '12px',
                            background: 'white',
                            border: '2px solid #ede9fe',
                            borderTop: 'none',
                            borderLeft: 'none',
                            borderRadius: '0 0 3px 0',
                        }} />
                    </div>
                )}

                <div style={{ position: 'relative', cursor: 'pointer' }}>
                    {isPlaying && (
                        <div style={{
                            position: 'absolute',
                            inset: isMobile ? '-8px' : '-10px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 75%)',
                            animation: 'avatarPulse 1s ease-in-out infinite',
                            pointerEvents: 'none',
                        }} />
                    )}
                    <AvatarFace 
                        mouthOpen={mouthOpen} 
                        blinking={blinking} 
                        size={isMobile ? 70 : 80} 
                        isPlaying={isPlaying} 
                    />
                </div>
            </div>

            {/* ── Goodbye modal ── */}
            {showOutModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(15, 10, 40, 0.82)',
                        backdropFilter: 'blur(12px)',
                        animation: 'avatarFadeIn 0.4s ease',
                    }}
                >
                    <div
                        style={{
                            background: 'linear-gradient(145deg, #ffffff, #f5f3ff)',
                            borderRadius: isMobile ? '32px' : '42px',
                            padding: isMobile ? '40px 30px' : '60px 50px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: isMobile ? '20px' : '30px',
                            boxShadow: '0 40px 100px rgba(0, 0, 0, 0.5), 0 0 30px rgba(139, 92, 246, 0.3)',
                            border: '2px solid rgba(167, 139, 250, 0.5)',
                            minWidth: isMobile ? '280px' : '350px',
                            maxWidth: '450px',
                            textAlign: 'center',
                            animation: 'avatarSlideUpLarge 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                    >
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                position: 'absolute',
                                inset: '-25px',
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
                                animation: isPlaying ? 'avatarPulse 0.8s ease-in-out infinite' : 'none',
                            }} />
                            <AvatarFace mouthOpen={mouthOpen} blinking={blinking} size={isMobile ? 120 : 150} isPlaying={isPlaying} />
                        </div>

                        <div>
                            <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 900, color: '#3b0764', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
                                {outDone ? 'Doviđenja! 👋' : 'Doviđenja, drugu! 💖'}
                            </h2>
                            <p style={{ fontSize: isMobile ? '16px' : '18px', color: '#6d28d9', fontWeight: 600, margin: 0 }}>
                                {outDone ? 'Vidimo se uskoro!' : `Vratite nam se opet!`}
                            </p>
                        </div>

                        {isPlaying && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '32px' }}>
                                {[0, 1, 2, 3, 4, 5].map(i => (
                                    <div
                                        key={i}
                                        style={{
                                            width: '7px',
                                            borderRadius: '4px',
                                            background: 'linear-gradient(to top, #7c3aed, #c4b5fd)',
                                            height: `${Math.max(10, mouthOpen * 32 * (0.6 + Math.abs(2.5 - i) * 0.15))}px`,
                                            transition: 'height 0.04s ease',
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Trigger component to bridge logout button to avatar popup */}
            <LogoutTrigger onTrigger={() => setShowOutModal(true)} />

            <style>{`
        @keyframes avatarFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes avatarFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes avatarSlideUpSmall {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes avatarSlideUpLarge {
          from { opacity: 0; transform: translateY(50px) scale(0.8); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes avatarPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.15); }
        }
      `}</style>
        </>
    );
}

function LogoutTrigger({ onTrigger }: { onTrigger: () => void }) {
    useEffect(() => {
        const handler = () => onTrigger();
        window.addEventListener('avatar:logout', handler);
        return () => window.removeEventListener('avatar:logout', handler);
    }, [onTrigger]);
    return null;
}

export function triggerAvatarLogout() {
    window.dispatchEvent(new Event('avatar:logout'));
}
