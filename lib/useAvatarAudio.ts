// lib/useAvatarAudio.ts
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export function useAvatarAudio() {
  const [mouthOpen, setMouthOpen] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef(false);

  // Initialize context on mount and attempt to resume on first interaction
  useEffect(() => {
    const initCtx = () => {
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        ctxRef.current = new Ctx();
      }
    };

    const resumeCtx = async () => {
      initCtx();
      if (ctxRef.current && ctxRef.current.state === 'suspended') {
        await ctxRef.current.resume().catch(() => {});
      }
      // Remove listener once resumed
      window.removeEventListener('click', resumeCtx);
      window.removeEventListener('touchstart', resumeCtx);
    };

    initCtx();
    window.addEventListener('click', resumeCtx);
    window.addEventListener('touchstart', resumeCtx);

    return () => {
      window.removeEventListener('click', resumeCtx);
      window.removeEventListener('touchstart', resumeCtx);
    };
  }, []);

  const stopAnalysis = useCallback(() => {
    isPlayingRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlaying(false);
    setMouthOpen(0);
  }, []);

  const analyse = useCallback(() => {
    if (!analyserRef.current || !isPlayingRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);

    // Low-pass filter equivalent by picking specific frequency bins (voice range)
    const slice = data.slice(2, 50);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;

    // Normalize and scale for morph targets
    setMouthOpen(Math.min(1, avg / 65));
    rafRef.current = requestAnimationFrame(analyse);
  }, []);

  const playSound = useCallback(async (url: string | null, onEnded?: () => void) => {
    try {
      if (!url) {
        // Simulated mouth movement for browser fallback
        setIsPlaying(true);
        isPlayingRef.current = true;
        let start = Date.now();
        
        const simAnimate = () => {
          if (!isPlayingRef.current) return;
          const elapsed = Date.now() - start;
          setMouthOpen(0.3 + Math.sin(elapsed * 0.01) * 0.3);
          rafRef.current = requestAnimationFrame(simAnimate);
        };
        simAnimate();
        return;
      }

      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;

      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new Ctx() as AudioContext;
      }
      const ctx = ctxRef.current;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`);

      const buf = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);

      // Stop previous if any
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch (e) { }
      }

      const src = ctx.createBufferSource();
      sourceNodeRef.current = src;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyserRef.current = analyser;

      src.buffer = decoded;
      src.connect(analyser);
      analyser.connect(ctx.destination);

      src.start(0);
      setIsPlaying(true);
      isPlayingRef.current = true;
      analyse();

      src.onended = () => {
        if (sourceNodeRef.current === src) {
          stopAnalysis();
          onEnded?.();
        }
      };
    } catch (e) {
      console.warn('Avatar audio playback error:', e);
      stopAnalysis();
      onEnded?.();
    }
  }, [analyse, stopAnalysis]);

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) { }
      sourceNodeRef.current = null;
    }
    stopAnalysis();
  }, [stopAnalysis]);

  return { mouthOpen, isPlaying, playSound, stop };
}
