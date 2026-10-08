"use client";

import { Component, Suspense, useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useAvatarAudio } from "@/lib/useAvatarAudio";
import { cn } from "@/lib/cn";

const MALE_MODEL = "/avatars/teacher-joe/source/Joe_01.glb";
const FEMALE_MODEL = "/avatars/animated-female-teacher-for-narration/source/Teacher Female Narration 01 (1).glb";

// Nazivi morph ciljeva za usta koje različiti modeli koriste
const MOUTH_KEYS = [
    "jawOpen", "mouthOpen", "Mouth_Open", "mouth_open",
    "viseme_aa", "viseme_O", "viseme_CH", "viseme_kk", "viseme_PP",
    "MouthOpen", "Jaw_Open", "vowels_A", "vowels_O",
];

/** Trenutak animacije (s) u kome model stoji prirodno, sa spuštenim rukama */
const REST_POSE_TIME = 8.8;

interface MorphTarget {
    influences: number[];
    indices: number[];
}

interface ModelProps {
    /** Ref umesto state-a: usta se pomeraju u svakom frejmu bez React renderovanja */
    mouthRef: React.RefObject<number>;
    isSpeaking: boolean;
    female: boolean;
}

function TeacherModel({ mouthRef, isSpeaking, female }: ModelProps) {
    const group = useRef<THREE.Group>(null);
    const { scene, animations } = useGLTF(female ? FEMALE_MODEL : MALE_MODEL);
    const { actions, names, mixer } = useAnimations(animations, group);
    const morphTargets = useRef<MorphTarget[]>([]);

    // Jednom po modelu: materijali + keš morph ciljeva (bez prolaska kroz scenu u svakom frejmu)
    useEffect(() => {
        const found: MorphTarget[] = [];
        scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((m) => {
                m.side = THREE.DoubleSide;
                m.needsUpdate = true;
            });
            if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
            const dictionary = mesh.morphTargetDictionary;
            const indices = MOUTH_KEYS.map((k) => dictionary[k]).filter((i): i is number => i !== undefined);
            if (indices.length) found.push({ influences: mesh.morphTargetInfluences, indices });
        });
        morphTargets.current = found;
    }, [scene]);

    // Model ima najviše jednu animaciju (gestikulacija). Dok učitelj ćuti, ona stoji
    // zamrznuta u prirodnoj pozi; dok govori, teče. Prvi frejm je T-poza, pa ga preskačemo.
    useEffect(() => {
        const name = names.find((n) => /talk|speak|gesture|narrat/i.test(n)) ?? names[0];
        const action = name ? actions[name] : null;
        if (!action) return;
        // isScheduled() je false i posle ponovnog montiranja (mixer tada zaustavi sve akcije)
        if (!action.isScheduled()) {
            action.reset().setLoop(THREE.LoopRepeat, Infinity).setEffectiveTimeScale(1).play();
            mixer.update(Math.min(REST_POSE_TIME, action.getClip().duration / 2));
        }
        action.setEffectiveTimeScale(isSpeaking ? 1 : 0);
    }, [isSpeaking, names, actions, mixer]);

    useFrame(() => {
        const target = isSpeaking ? (mouthRef.current ?? 0) * 0.9 : 0;
        for (const { influences, indices } of morphTargets.current) {
            for (const idx of indices) {
                // three.js objekti se po dizajnu menjaju u mestu, u svakom frejmu
                // eslint-disable-next-line react-hooks/immutability
                influences[idx] = THREE.MathUtils.lerp(influences[idx], target, 0.25);
            }
        }
    });

    return (
        <group ref={group}>
            <primitive object={scene} scale={female ? 0.9 : 2.5} position={[0, female ? -1.83 : -0.8, 0]} />
        </group>
    );
}

/** Ako WebGL ili model ne mogu da se učitaju, aplikacija radi dalje bez avatara. */
class AvatarBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    render() {
        return this.state.failed ? null : this.props.children;
    }
}

// Kadar: glava i ramena
const CAMERA_POSITION: [number, number, number] = [0, -0.2, 1.5];
const CAMERA_TARGET: [number, number, number] = [0, -0.28, 0];

interface SpeakDetail {
    url: string | null;
    onEnd?: () => void;
}

interface Professor3DProps {
    gender?: string;
    className?: string;
}

/**
 * 3D učitelj. Popunjava svoj kontejner (veličinu određuje roditelj preko `className`).
 * Sluša događaje iz lib/speech.ts: `avatar:speak` (preuzima zvuk i pomera usta) i `avatar:stop`.
 */
export default function Professor3D({ gender, className }: Professor3DProps) {
    const female = gender?.toLowerCase() === "female";
    const { mouthRef, isPlaying, playSound, stop } = useAvatarAudio();

    useEffect(() => {
        const handleSpeak = (event: Event) => {
            const detail = (event as CustomEvent<SpeakDetail>).detail;
            event.preventDefault(); // javljamo da avatar pušta zvuk
            stop();
            void playSound(detail?.url ?? null, detail?.onEnd);
        };
        const handleStop = () => stop();

        window.addEventListener("avatar:speak", handleSpeak);
        window.addEventListener("avatar:stop", handleStop);
        return () => {
            window.removeEventListener("avatar:speak", handleSpeak);
            window.removeEventListener("avatar:stop", handleStop);
            stop();
        };
    }, [playSound, stop]);

    return (
        <div className={cn("pointer-events-none select-none", className)} aria-hidden="true">
            <AvatarBoundary>
                <Canvas
                    camera={{ position: CAMERA_POSITION, fov: 30 }}
                    onCreated={({ camera }) => camera.lookAt(...CAMERA_TARGET)}
                    gl={{ antialias: true, alpha: true }}
                    dpr={[1, 1.5]}
                    style={{ background: "transparent" }}
                >
                    <ambientLight intensity={1.5} />
                    <pointLight position={[3, 5, 3]} intensity={2} />
                    <pointLight position={[-3, 3, 2]} intensity={0.8} color="#c4b5fd" />
                    <Suspense fallback={null}>
                        <TeacherModel mouthRef={mouthRef} isSpeaking={isPlaying} female={female} />
                        <Environment preset="apartment" />
                    </Suspense>
                </Canvas>
            </AvatarBoundary>
        </div>
    );
}
