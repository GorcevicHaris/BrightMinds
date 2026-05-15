'use client';

import { Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment, OrbitControls } from '@react-three/drei';
import { useSpeech } from '@/lib/useSpeech';
import * as THREE from 'three';

const MALE_MODEL = '/avatars/teacher-joe/source/Joe_01.glb';
const FEMALE_MODEL = '/avatars/animated-female-teacher-for-narration/source/Teacher Female Narration 01 (1).glb';

function ProfessorModel({ mouthOpen, isSpeaking, gender }: { mouthOpen: number; isSpeaking: boolean; gender?: string }) {
  const group = useRef<THREE.Group>(null!);
  const modelUrl = gender === 'Female' ? FEMALE_MODEL : MALE_MODEL;
  const { scene, animations } = useGLTF(modelUrl);
  const { actions, names } = useAnimations(animations, group);
  const activeAnim = useRef<string | null>(null);

  const playAnim = useCallback((name: string) => {
    if (activeAnim.current === name) return;
    const prev = activeAnim.current ? actions[activeAnim.current] : null;
    prev?.fadeOut(0.4);
    const next = actions[name];
    if (!next) return;
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.4).play();
    activeAnim.current = name;
  }, [actions]);

  // Start idle on mount
  useEffect(() => {
    if (!names.length) return;
    console.log('[Joe animations]', names);
    const idle = names.find(n => /idle/i.test(n)) ?? names[0];
    if (idle) { actions[idle]?.reset().fadeIn(0.5).play(); activeAnim.current = idle; }
  }, [actions, names]);

  // Switch idle ↔ talking
  useEffect(() => {
    if (isSpeaking) {
      // Find animation that looks like talking or gesticulating
      const talk = names.find(n => /talk|speak|gesture|greet|hello|say|explain/i.test(n));
      if (talk) {
        playAnim(talk);
      } else {
        // Fallback: search for anything that isn't idle
        const anyAction = names.find(n => !/idle/i.test(n));
        if (anyAction) playAnim(anyAction);
        else {
          const idle = names.find(n => /idle/i.test(n)) ?? names[0];
          if (idle && actions[idle]) actions[idle]!.timeScale = 2.2;
        }
      }
    } else {
      const idle = names.find(n => /idle/i.test(n)) ?? names[0];
      if (idle) {
        if (actions[idle]) actions[idle]!.timeScale = 1;
        playAnim(idle);
      }
    }
  }, [isSpeaking, names, actions, playAnim]);

  // Mouth morph targets driven by audio
  useFrame(() => {
    scene.traverse((obj: any) => {
      if (!obj.isMesh || !obj.morphTargetDictionary || !obj.morphTargetInfluences) return;
      const dict = obj.morphTargetDictionary;
      const inf  = obj.morphTargetInfluences;
      const val  = isSpeaking ? mouthOpen * 0.9 : 0;
      // List of common mouth morph targets
      const mouthTargets = [
        'jawOpen', 'mouthOpen', 'Mouth_Open', 'mouth_open',
        'viseme_aa', 'viseme_O', 'viseme_CH', 'viseme_kk', 'viseme_PP',
        'MouthOpen', 'Jaw_Open', 'vowels_A', 'vowels_O'
      ];
      mouthTargets.forEach(k => {
        if (dict[k] !== undefined) inf[dict[k]] = THREE.MathUtils.lerp(inf[dict[k]], val, 0.25);
      });
    });
  });

  // Float only when idle — still when speaking
  useFrame(({ clock }) => {
    if (!group.current) return;
    if (isSpeaking) {
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, 0, 0.08);
    } else {
      group.current.position.y = Math.sin(clock.elapsedTime * 0.5) * 0.012;
    }
  });

  useEffect(() => {
    scene.traverse((obj: any) => {
      if (obj.isMesh) { obj.material.side = THREE.DoubleSide; obj.material.needsUpdate = true; }
    });
  }, [scene]);

  return (
    <group ref={group}>
      <primitive
        object={scene}
        scale={gender === 'Female' ? 2.8 : 2.5}
        position={[0, gender === 'Female' ? -1.0 : -0.8, 0]}
        rotation={[0, 0, 0]}
      />
    </group>
  );
}

export default function Professor3D({ childName, gender, onLogoutConfirmed }: { childName?: string, gender?: string, onLogoutConfirmed: () => void }) {
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
      e.preventDefault();
      stop();
      setBubbleText(e.detail?.text ?? null);
      playSound(e.detail?.url, () => setBubbleText(null));
    };

    const handleLogout = () => {
      try { stop(); } catch (e) { }
      setBubbleText('Vidimo se! 👋');

      // Sigurnosni timeout: ako govor potraje predugo ili pukne, ipak uradi logout
      const logoutTimeout = setTimeout(() => {
        onLogoutConfirmed();
      }, 3500);

      speak('Vidimo se uskoro! Bio si odličan danas!', () => {
        clearTimeout(logoutTimeout);
        setBubbleText(null);
        onLogoutConfirmed();
      });
    };

    window.addEventListener('avatar:speak', handleSpeak);
    window.addEventListener('avatar:logout', handleLogout);
    return () => {
      window.removeEventListener('avatar:speak', handleSpeak);
      window.removeEventListener('avatar:logout', handleLogout);
    };
  }, [playSound, stop, speak, onLogoutConfirmed]);

  return (
    <div style={{
      position: 'fixed',
      top: '-180px',
      right: '-50px',      /* GORNJI DESNI ugao */
      zIndex: 45,  /* ispod headera (z-50 = 50) ali iznad ostatka stranice */
      width: '320px',
      height: '450px',
      pointerEvents: 'none',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(-20px)',
      transition: 'opacity 0.8s ease, transform 0.8s ease',
    }}>
      {/* oblačić sa tekstom */}
      {bubbleText && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '330px',   /* lijevo od Joea, pošto je on desno */
          background: 'white',
          padding: '12px 18px',
          borderRadius: '16px',
          border: '2.5px solid #7c3aed',
          fontSize: '15px',
          fontWeight: 'bold',
          color: '#4c1d95',
          boxShadow: '0 8px 24px rgba(109,40,217,0.15)',
          whiteSpace: 'nowrap',
          zIndex: 1001,
          animation: 'bubblePop 0.3s ease',
        }}>
          {bubbleText}
          {/* rep oblačića */}
          <div style={{
            position: 'absolute',
            right: '-8px',
            top: '16px',
            width: '12px',
            height: '12px',
            background: 'white',
            border: '2.5px solid #7c3aed',
            borderTop: 'none',
            borderLeft: 'none',
            transform: 'rotate(-45deg)',
          }} />
        </div>
      )}
      <div style={{ width: '100%', height: '100%', pointerEvents: 'auto', cursor: 'grab' }}>
        <Canvas
          camera={{ position: [0, 0.3, 2.8], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={1.5} />
          <pointLight position={[3, 5, 3]} intensity={2} />
          <pointLight position={[-3, 3, 2]} intensity={0.8} color="#c4b5fd" />
          <Suspense fallback={null}>
            <ProfessorModel mouthOpen={mouthOpen} isSpeaking={isPlaying} gender={gender} />
            <Environment preset="apartment" />
          </Suspense>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            // Apsolutni minimum pokreta (skoro fiksirano)
            minPolarAngle={Math.PI / 2.005}
            maxPolarAngle={Math.PI / 1.995}
            minAzimuthAngle={-Math.PI / 100}
            maxAzimuthAngle={Math.PI / 100}
          />
        </Canvas>
      </div>
      <style>{`
        @keyframes bubblePop {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
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
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        await ctxRef.current.close().catch(() => { });
      }
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
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      ctxRef.current.close().catch(() => { });
    }
    setIsPlaying(false);
    setMouthOpen(0);
  }, []);

  return { mouthOpen, isPlaying, playSound, stop };
}

export function triggerAvatarLogout() {
  window.dispatchEvent(new Event('avatar:logout'));
}
