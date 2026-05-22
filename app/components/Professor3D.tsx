'use client';

import { Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment, OrbitControls } from '@react-three/drei';
import { useSpeech } from '@/lib/useSpeech';
import { useAvatarAudio } from '@/lib/useAvatarAudio';
import * as THREE from 'three';

const MALE_MODEL = '/avatars/teacher-joe/source/Joe_01.glb';
const FEMALE_MODEL = '/avatars/animated-female-teacher-for-narration/source/Teacher Female Narration 01 (1).glb';

// Cached mouth morph target keys to avoid string lookup every frame
const MOUTH_KEYS = [
  'jawOpen', 'mouthOpen', 'Mouth_Open', 'mouth_open',
  'viseme_aa', 'viseme_O', 'viseme_CH', 'viseme_kk', 'viseme_PP',
  'MouthOpen', 'Jaw_Open', 'vowels_A', 'vowels_O',
];

function ProfessorModel({ mouthOpen, isSpeaking, gender }: { mouthOpen: number; isSpeaking: boolean; gender?: string }) {
  const group = useRef<THREE.Group>(null!);
  const normalizedGender = gender?.toLowerCase();
  const modelUrl = normalizedGender === 'female' ? FEMALE_MODEL : MALE_MODEL;
  const { scene, animations } = useGLTF(modelUrl);
  const { actions, names } = useAnimations(animations, group);
  const activeAnim = useRef<string | null>(null);
  // Cache morph target indices once — avoids scene.traverse every frame
  const morphCacheRef = useRef<Array<{ inf: number[]; indices: number[] }>>([]);

  const playAnim = useCallback((name: string) => {
    if (activeAnim.current === name) return;
    const prev = activeAnim.current ? actions[activeAnim.current] : null;
    prev?.fadeOut(0.4);
    const next = actions[name];
    if (!next) return;
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.4).play();
    activeAnim.current = name;
  }, [actions]);

  // Build morph cache + start idle on mount
  useEffect(() => {
    if (!names.length) return;
    console.log(`Dostupne animacije za ${gender}:`, names);

    const idle = names.find(n => /idle/i.test(n)) ?? names[0];
    if (idle) { actions[idle]?.reset().fadeIn(0.5).play(); activeAnim.current = idle; }

    // Build cache once
    const cache: Array<{ inf: number[]; indices: number[] }> = [];
    scene.traverse((obj: any) => {
      if (!obj.isMesh || !obj.morphTargetDictionary || !obj.morphTargetInfluences) return;
      const indices = MOUTH_KEYS
        .map(k => obj.morphTargetDictionary[k])
        .filter((i): i is number => i !== undefined);
      if (indices.length) cache.push({ inf: obj.morphTargetInfluences, indices });
    });
    morphCacheRef.current = cache;
  }, [actions, names, scene, gender]);

  // Switch idle ↔ talking
  useEffect(() => {
    if (isSpeaking) {
      // Proširena pretraga za bilo kakav pokret tokom govora
      const talk = names.find(n => /talk|speak|gesture|greet|hello|say|explain|body|move|action/i.test(n));
      if (talk) {
        if (actions[talk]) actions[talk]!.timeScale = 1;
        playAnim(talk);
      } else {
        const anyAction = names.find(n => !/idle/i.test(n));
        if (anyAction) {
          if (actions[anyAction]) actions[anyAction]!.timeScale = 1;
          playAnim(anyAction);
        } else {
          const idle = names.find(n => /idle/i.test(n)) ?? names[0];
          if (idle && actions[idle]) actions[idle]!.timeScale = 2.2;
        }
      }
    } else {
      const idle = names.find(n => /idle/i.test(n)) ?? names[0];
      if (idle) {
        // Kada ne priča, animacija stoji (zamrznuta)
        if (actions[idle]) actions[idle]!.timeScale = 0;
        playAnim(idle);
      }
    }
  }, [isSpeaking, names, actions, playAnim]);

  // Single useFrame — mouth morph + float combined
  useFrame(({ clock }) => {
    // Float animation — samo dok priča
    if (group.current) {
      group.current.position.y = isSpeaking
        ? Math.sin(clock.elapsedTime * 1.5) * 0.02
        : THREE.MathUtils.lerp(group.current.position.y, 0, 0.1);
    }
    // Mouth morph — uses pre-built cache, no traverse
    const val = isSpeaking ? mouthOpen * 0.9 : 0;
    for (const { inf, indices } of morphCacheRef.current) {
      for (const idx of indices) {
        inf[idx] = THREE.MathUtils.lerp(inf[idx], val, 0.25);
      }
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
        scale={normalizedGender === 'female' ? 0.9 : 2.5}
        position={[0, normalizedGender === 'female' ? -1.83 : -0.8, 0]}
        rotation={[0, 0, 0]}
      />
    </group>
  );
}

// Tip uređaja: telefon, tablet, desktop
type DeviceType = 'phone' | 'tablet' | 'desktop';

function getDeviceType(): DeviceType {
  const w = window.innerWidth;
  if (w <= 480) return 'phone';
  if (w <= 1024) return 'tablet';
  return 'desktop';
}

// Konfiguracija veličina za svaki tip uređaja
const DEVICE_CONFIG = {
  phone: {
    width: '220px', height: '280px',
    top: '-100px', right: '-30px',
    bubbleTop: '230px', bubbleRight: '85px', bubbleMaxWidth: '200px',
    bubbleFontSize: '14px', bubblePadding: '10px 14px', bubbleRadius: '14px',
    bubbleWhiteSpace: 'normal' as const,
    bubbleTailPos: 'top' as const,  // rep iznad oblačića
    cameraPos: [0, 0.3, 2.2] as [number, number, number],
    fov: 50, antialias: true, dpr: undefined,
  },
  tablet: {
    width: '200px', height: '280px',
    top: '-80px', right: '-20px',
    bubbleTop: '285px', bubbleRight: '10px', bubbleMaxWidth: '220px',
    bubbleFontSize: '13px', bubblePadding: '10px 14px', bubbleRadius: '14px',
    bubbleWhiteSpace: 'normal' as const,
    bubbleTailPos: 'top' as const,
    cameraPos: [0, 0.3, 2.6] as [number, number, number],
    fov: 39, antialias: true, dpr: 1.5,
  },
  desktop: {
    width: '320px', height: '450px',
    top: '-180px', right: '-60px',
    bubbleTop: '20px', bubbleRight: '330px', bubbleMaxWidth: undefined,
    bubbleFontSize: '15px', bubblePadding: '12px 18px', bubbleRadius: '16px',
    bubbleWhiteSpace: 'nowrap' as const,
    bubbleTailPos: 'right' as const,  // rep desno od oblačića
    cameraPos: [0, 0.3, 2.8] as [number, number, number],
    fov: 40, antialias: true, dpr: undefined,
  },
} as const;

export default function Professor3D({ childName, gender, onLogoutConfirmed }: { childName?: string, gender?: string, onLogoutConfirmed: () => void }) {
  const [visible, setVisible] = useState(false);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceType>('desktop');
  const playedRef = useRef(false);

  const { mouthOpen, isPlaying, playSound, stop } = useAvatarAudio();
  const { speak } = useSpeech();

  // Detekcija tipa uređaja: telefon / tablet / desktop
  useEffect(() => {
    const update = () => setDevice(getDeviceType());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const cfg = DEVICE_CONFIG[device];

  useEffect(() => {
    const normalizedGender = gender?.toLowerCase();
    setTimeout(() => setVisible(true), 500);
    const t = setTimeout(() => {
      if (playedRef.current) return;
      playedRef.current = true;
      const name = childName || 'drugaru';
      const welcomePhrase = normalizedGender === 'female' ? 'Dobro došla nazad!' : 'Dobro došao nazad!';

      setBubbleText(`Zdravo ${name}! 👋`);
      // Izbačene tačkice i zapeta kako bi glasovna sinteza (ElevenLabs) to izgovorila prirodnije i bez čudnih pauza
      speak(`Zdravo ${name}! ${welcomePhrase}`, () => setBubbleText(null), undefined, gender);
    }, 1500);
    return () => clearTimeout(t);
  }, [childName, speak, gender]);

  useEffect(() => {
    const handleSpeak = (e: any) => {
      e.preventDefault();
      stop();
      setBubbleText(e.detail?.text ?? null);
      playSound(e.detail?.url, () => setBubbleText(null));
    };

    const handleLogout = () => {
      const normalizedGender = gender?.toLowerCase();
      try { stop(); } catch (e) { }
      const logoutText = normalizedGender === 'female'
        ? 'Vidimo se uskoro... Bila si odlična danas!'
        : 'Vidimo se uskoro... Bio si odličan danas!';

      setBubbleText(logoutText);

      // Sigurnosni timeout: ako govor potraje predugo ili pukne, ipak uradi logout
      const logoutTimeout = setTimeout(() => {
        onLogoutConfirmed();
      }, 3500);

      speak(logoutText, () => {
        clearTimeout(logoutTimeout);
        setBubbleText(null);
        onLogoutConfirmed();
      }, undefined, gender);
    };

    window.addEventListener('avatar:speak', handleSpeak);
    window.addEventListener('avatar:logout', handleLogout);
    return () => {
      window.removeEventListener('avatar:speak', handleSpeak);
      window.removeEventListener('avatar:logout', handleLogout);
    };
  }, [playSound, stop, speak, onLogoutConfirmed]);

  // Stil za rep oblačića zavisi od pozicije
  const tailStyle: React.CSSProperties = cfg.bubbleTailPos === 'top'
    ? {
      position: 'absolute',
      top: '-7px',
      right: '20px',
      width: '10px',
      height: '10px',
      background: 'white',
      transform: 'rotate(45deg)',
      borderTop: '2.5px solid #7c3aed',
      borderLeft: '2.5px solid #7c3aed',
      borderBottom: 'none',
      borderRight: 'none',
    }
    : {
      position: 'absolute',
      right: '-8px',
      top: '16px',
      width: '12px',
      height: '12px',
      background: 'white',
      transform: 'rotate(-45deg)',
      border: '2.5px solid #7c3aed',
      borderTop: 'none',
      borderLeft: 'none',
    };

  return (
    <div style={{
      position: 'fixed',
      top: cfg.top,
      right: cfg.right,
      zIndex: 9999,
      width: cfg.width,
      height: cfg.height,
      pointerEvents: 'none',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(-20px)',
      transition: 'opacity 0.8s ease, transform 0.8s ease',
    }}>
      {/* oblačić sa tekstom - uklonjen po zahtevu */}
      <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
        <Canvas
          camera={{
            position: cfg.cameraPos,
            fov: cfg.fov,
          }}
          gl={{ antialias: cfg.antialias, alpha: true }}
          dpr={cfg.dpr}
          style={{ background: 'transparent', pointerEvents: 'none' }}
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

export function triggerAvatarLogout() {
  window.dispatchEvent(new Event('avatar:logout'));
}
