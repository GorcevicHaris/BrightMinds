'use client';

import { Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment, OrbitControls } from '@react-three/drei';
import { useSpeech } from '@/lib/useSpeech';
import * as THREE from 'three';

const MODEL_URL = '/avatars/teacher-joe/source/Joe_01.glb';

function ProfessorModel({ mouthOpen, isSpeaking }: { mouthOpen: number; isSpeaking: boolean }) {
  const group = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    // Michelle.glb has 'Idle'
    const action = actions['Idle'] || actions['idle'] || actions[names[0]];
    if (action) action.reset().fadeIn(0.5).play();
  }, [actions, names]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    // Pomeranje gore-dole (lebdenje)
    group.current.position.y = Math.sin(t * 0.8) * 0.05;
    if (isSpeaking) {
      group.current.position.y += Math.sin(t * 12) * 0.01 * mouthOpen;
    }
  });

  useEffect(() => {
    if (scene) {
      scene.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.material.side = THREE.DoubleSide;
          obj.material.needsUpdate = true;
        }
      });
    }
  }, [scene]);

  return (
    <group ref={group}>
      <primitive 
        object={scene} 
        scale={8.5} // Džinovski Joe
        position={[0, -4.5, 0]} // Nogama na dno
        rotation={[0, 0, 0]}
      />
    </group>
  );
}

export default function Professor3D({ childName, onLogoutConfirmed }: { childName?: string, onLogoutConfirmed: () => void }) {
  const [visible, setVisible] = useState(false);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const playedRef = useRef(false);

  const { mouthOpen, isPlaying, playSound, stop } = useAvatarAudio();
  const { speak } = useSpeech();

  useEffect(() => {
    setTimeout(() => setVisible(true), 500);
    const t = setTimeout(() => {
      if (playedRef.current) return;
      playedRef.current = true;
      const name = childName || 'drugaru';
      setBubbleText(`Zdravo ${name}! 👋`);
      speak(`Zdravo ${name}! Dobrodošao nazad!`, () => setBubbleText(null));
    }, 1500);
    return () => clearTimeout(t);
  }, [childName, speak]);

  useEffect(() => {
    const handleSpeak = (e: any) => {
      stop();
      setBubbleText(e.detail?.text ?? null);
      playSound(e.detail?.url, () => setBubbleText(null));
    };
    window.addEventListener('avatar:speak', handleSpeak);
    return () => window.removeEventListener('avatar:speak', handleSpeak);
  }, [playSound, stop]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '0',
      right: '0',
      zIndex: 1000,
      width: '400px',
      height: '500px',
      pointerEvents: 'none',
      opacity: visible ? 1 : 0,
      transition: 'opacity 1s'
    }}>
      {bubbleText && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '40px',
          background: 'white',
          padding: '15px 25px',
          borderRadius: '20px',
          border: '3px solid #7c3aed',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#4c1d95',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          zIndex: 1001
        }}>
          {bubbleText}
        </div>
      )}
      <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
        <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }} gl={{ alpha: true }}>
          <ambientLight intensity={1.5} />
          <pointLight position={[5, 10, 5]} intensity={3} color="#ffffff" />
          <spotLight position={[0, 5, 10]} angle={0.3} penumbra={1} intensity={4} castShadow />
          <directionalLight position={[0, 0, -5]} intensity={1.5} color="#ffffff" />
          
          <Suspense fallback={null}>
            <ProfessorModel mouthOpen={mouthOpen} isSpeaking={isPlaying} />
            <Environment preset="apartment" />
          </Suspense>
          <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
      </div>
    </div>
  );
}

// Audio hook (kopija postojećeg koji radi)
function useAvatarAudio() {
  const [mouthOpen, setMouthOpen] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const analyse = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const avg = data.slice(2, 50).reduce((a, b) => a + b, 0) / 48;
    setMouthOpen(Math.min(1, avg / 60));
    rafRef.current = requestAnimationFrame(analyse);
  }, []);

  const playSound = useCallback(async (url: string, onEnded?: () => void) => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      ctxRef.current?.close();
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);
      const src = ctx.createBufferSource();
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
      src.buffer = decoded;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      src.start(0);
      setIsPlaying(true);
      analyse();
      src.onended = () => {
        setIsPlaying(false);
        setMouthOpen(0);
        cancelAnimationFrame(rafRef.current!);
        onEnded?.();
      };
    } catch (e) { onEnded?.(); }
  }, [analyse]);

  const stop = useCallback(() => {
    ctxRef.current?.close();
    setIsPlaying(false);
    setMouthOpen(0);
  }, []);

  return { mouthOpen, isPlaying, playSound, stop };
}

export function triggerAvatarLogout() {
  window.dispatchEvent(new Event('avatar:logout'));
}
