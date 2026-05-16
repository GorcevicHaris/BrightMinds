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

export default function Professor3D({ childName, gender, onLogoutConfirmed }: { childName?: string, gender?: string, onLogoutConfirmed: () => void }) {
  const [visible, setVisible] = useState(false);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const playedRef = useRef(false);

  const { mouthOpen, isPlaying, playSound, stop } = useAvatarAudio();
  const { speak } = useSpeech();

  useEffect(() => {
    const normalizedGender = gender?.toLowerCase();
    setTimeout(() => setVisible(true), 500);
    const t = setTimeout(() => {
      if (playedRef.current) return;
      playedRef.current = true;
      const name = childName || 'drugaru';
      const welcomePhrase = normalizedGender === 'female' ? 'Dobro došla nazad!' : 'Dobro došao nazad!';
      
      setBubbleText(`Zdravo ${name}! 👋`);
      speak(`Zdravo, ${name}... ${welcomePhrase}`, () => setBubbleText(null), undefined, gender);
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

  return (
    <div style={{
      position: 'fixed',
      top: '-180px',
      right: '-60px',      /* DONJI DESNI ugao */
      zIndex: 500,  /* Topmost element */
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
      <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
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

export function triggerAvatarLogout() {
  window.dispatchEvent(new Event('avatar:logout'));
}
