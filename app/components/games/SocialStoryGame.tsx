"use client";

import { useState, useEffect } from "react";
import { useGameEmitter } from "@/lib/useSocket";

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────
interface GameProps {
  childId: number;
  level: number;
  onComplete: (
    score: number,
    duration: number,
    moodBefore?: string | null,
    moodAfter?: string | null
  ) => void;
  onClose?: () => void;
  autoStart?: boolean;
  isMonitor?: boolean;
  monitorState?: any;
}

interface StoryStep {
  scene: string;        // big emoji(s) showing the situation
  question: string;     // short, simple question
  options: {
    emoji: string;
    label: string;
    correct: boolean;
    feedback: string;   // what to show after tapping
  }[];
}

interface StoryLevel {
  title: string;
  place: string;       // sub-title
  icon: string;
  color: string;       // tailwind gradient
  bg: string;          // background color class
  steps: StoryStep[];
}

// ─────────────────────────────────────────────────────
// LEVELS  (8 themed social stories)
// Each step: big scene emoji + 1-line question + 2-3 choices
// ─────────────────────────────────────────────────────
const LEVELS: StoryLevel[] = [
  {
    title: "Jutro",
    place: "Jutarnja rutina",
    icon: "🌅",
    color: "from-orange-400 to-amber-500",
    bg: "bg-orange-50",
    steps: [
      {
        scene: "😴 🛏️",
        question: "Probudilo si se! Šta radiš prvo?",
        options: [
          { emoji: "🚿", label: "Perem se", correct: true, feedback: "Tačno!" },
          { emoji: "📱", label: "Gledam telefon", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🍽️ 🥛",
        question: "Šta jedeš ujutru?",
        options: [
          { emoji: "🥣", label: "Kaša i mleko", correct: true, feedback: "Tačno!" },
          { emoji: "🍰", label: "Torta", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🎒 👟",
        question: "Šta pakuješ za školu?",
        options: [
          { emoji: "📓", label: "Svesku", correct: true, feedback: "Tačno!" },
          { emoji: "🧸", label: "Igračku", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
    ],
  },
  {
    title: "Škola",
    place: "Učionica",
    icon: "🏫",
    color: "from-blue-400 to-indigo-500",
    bg: "bg-blue-50",
    steps: [
      {
        scene: "🏫 🚌",
        question: "Stigao si u školu! Šta radiš?",
        options: [
          { emoji: "💺", label: "Sjednem za klupu", correct: true, feedback: "Tačno!" },
          { emoji: "🏃", label: "Trčim po hodniku", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "👩‍🏫 📋",
        question: "Učiteljica govori. Šta radiš?",
        options: [
          { emoji: "👂", label: "Slušam", correct: true, feedback: "Tačno!" },
          { emoji: "🗣️", label: "Pričam", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🤚 ❓",
        question: "Znaš odgovor! Šta radiš?",
        options: [
          { emoji: "✋", label: "Dižem ruku", correct: true, feedback: "Tačno!" },
          { emoji: "📣", label: "Vičem", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
    ],
  },
  {
    title: "Stomatolog",
    place: "Ordinacija",
    icon: "🦷",
    color: "from-cyan-400 to-teal-500",
    bg: "bg-cyan-50",
    steps: [
      {
        scene: "🦷 🪥",
        question: "Kada peremo zube?",
        options: [
          { emoji: "☀️🌙", label: "Jutro i veče", correct: true, feedback: "Tačno!" },
          { emoji: "🎂", label: "Samo na rođendan", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🏥 😨",
        question: "Kada idemo kod stomatologa?",
        options: [
          { emoji: "📆", label: "Redovno", correct: true, feedback: "Tačno!" },
          { emoji: "😣", label: "Samo kad boli", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🪥 ⏱️",
        question: "Koliko dugo peremo zube?",
        options: [
          { emoji: "2️⃣", label: "2 minute", correct: true, feedback: "Tačno!" },
          { emoji: "⚡", label: "5 sekundi", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
    ],
  },
  {
    title: "Prodavnica",
    place: "Kupovina",
    icon: "🛒",
    color: "from-green-400 to-emerald-500",
    bg: "bg-green-50",
    steps: [
      {
        scene: "🛒 📝",
        question: "Šta nam pomaže u kupovini?",
        options: [
          { emoji: "📋", label: "Lista", correct: true, feedback: "Tačno!" },
          { emoji: "🎮", label: "Konzola igram", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🧀 🥦 🍎",
        question: "Gde stoji sir?",
        options: [
          { emoji: "🧀", label: "Mlečni proizvodi", correct: true, feedback: "Tačno!" },
          { emoji: "🍭", label: "Slatkiši", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "💳 💵",
        question: "Na kasi smo. Šta radimo?",
        options: [
          { emoji: "💰", label: "Platimo", correct: true, feedback: "Tačno!" },
          { emoji: "🏃", label: "Odemo bez plaćanja", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
    ],
  },
  {
    title: "Park",
    place: "Igra napolju",
    icon: "🌳",
    color: "from-lime-400 to-green-500",
    bg: "bg-lime-50",
    steps: [
      {
        scene: "🌳 ☀️",
        question: "Leti napolju nosimo...?",
        options: [
          { emoji: "🧴", label: "Kremu za sunce", correct: true, feedback: "Tačno!" },
          { emoji: "🧥", label: "Zimski kaput", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "💧 🥤",
        question: "Znojiš se. Šta radiš?",
        options: [
          { emoji: "💧", label: "Pijem vodu", correct: true, feedback: "Tačno!" },
          { emoji: "🍔", label: "Jedem hamburger", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🌆 🏠",
        question: "Smrkava se. Mama zove.",
        options: [
          { emoji: "🏠", label: "Idem kući", correct: true, feedback: "Tačno!" },
          { emoji: "🌙", label: "Ostanem napolju", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
    ],
  },
  {
    title: "Kod doktora",
    place: "Pedijatar",
    icon: "🏥",
    color: "from-rose-400 to-red-500",
    bg: "bg-rose-50",
    steps: [
      {
        scene: "🤒 🌡️",
        question: "Osećaš se loše. Šta radiš?",
        options: [
          { emoji: "👨‍👩‍👦", label: "Kažem mami", correct: true, feedback: "Tačno!" },
          { emoji: "🤫", label: "Ćutim", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🏥 👨‍⚕️",
        question: "Doktor te pregleda.",
        options: [
          { emoji: "😌", label: "Miram sarađujem", correct: true, feedback: "Tačno!" },
          { emoji: "😭", label: "Vrištim", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "💊 💉",
        question: "Doktor daje lek.",
        options: [
          { emoji: "✅", label: "Popijem", correct: true, feedback: "Tačno!" },
          { emoji: "🚮", label: "Bacim", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
    ],
  },
  {
    title: "Restoran",
    place: "Jelo napolju",
    icon: "🍽️",
    color: "from-amber-400 to-orange-500",
    bg: "bg-amber-50",
    steps: [
      {
        scene: "🍽️ 🪑",
        question: "U restoranu...",
        options: [
          { emoji: "��", label: "Sjedem za sto", correct: true, feedback: "Tačno!" },
          { emoji: "🏃", label: "Trčim naokolo", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "👨‍🍳 📋",
        question: "Konobar dolazi.",
        options: [
          { emoji: "🗣️", label: "Naručujem pristojno", correct: true, feedback: "Tačno!" },
          { emoji: "😤", label: "Vičem", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🧻 🤲",
        question: "Završio si jelo.",
        options: [
          { emoji: "🤲", label: "Brišem ruke", correct: true, feedback: "Tačno!" },
          { emoji: "🏃", label: "Ustanem odmah", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
    ],
  },
  {
    title: "Vatrogasna bezbednost",
    place: "Šta raditi u hitnim situacijama",
    icon: "🚒",
    color: "from-red-500 to-rose-600",
    bg: "bg-red-50",
    steps: [
      {
        scene: "🔥 😨",
        question: "Ima dima u kući!",
        options: [
          { emoji: "🏃", label: "Izlazim napolje", correct: true, feedback: "Tačno!" },
          { emoji: "🛒", label: "Uzimam igračke", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "📞 🚒",
        question: "Koga zovemo za požar?",
        options: [
          { emoji: "🚒", label: "Vatrogasce (193)", correct: true, feedback: "Tačno!" },
          { emoji: "🍕", label: "Pizzu", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🔌 💡",
        question: "Nisi siguran da li je toplo.",
        options: [
          { emoji: "��‍👩‍👦", label: "Pitam odrasle", correct: true, feedback: "Tačno!" },
          { emoji: "🤚", label: "Diram", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
    ],
  },
  {
    title: "Rođendan",
    place: "Proslava",
    icon: "🥳",
    color: "from-purple-400 to-fuchsia-500",
    bg: "bg-purple-50",
    steps: [
      {
        scene: "🎂 🎁",
        question: "Dobio si poklon! Šta radiš?",
        options: [
          { emoji: "🙏", label: "Zahvalim se", correct: true, feedback: "Tačno!" },
          { emoji: "🗑️", label: "Bacim ga", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🕯️  thổi",
        question: "Vreme je za svećice!",
        options: [
          { emoji: "💨", label: "Duvam svećice", correct: true, feedback: "Tačno!" },
          { emoji: "😭", label: "Plačem", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🍰 🍽️",
        question: "Seče se torta. Šta radiš?",
        options: [
          { emoji: "⏳", label: "Čekam svoj red", correct: true, feedback: "Tačno!" },
          { emoji: "👊", label: "Otmem tortu", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
    ],
  },
  {
    title: "Kućni ljubimac",
    place: "Briga o psu",
    icon: "🐶",
    color: "from-teal-400 to-emerald-500",
    bg: "bg-teal-50",
    steps: [
      {
        scene: "🐶 🍖",
        question: "Pas je gladan. Šta mu daješ?",
        options: [
          { emoji: "🦴", label: "Hranu za pse", correct: true, feedback: "Tačno!" },
          { emoji: "🍫", label: "Čokoladu", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🐕 🚶",
        question: "Pas želi napolje.",
        options: [
          { emoji: "🦮", label: "Idemo u šetnju", correct: true, feedback: "Tačno!" },
          { emoji: "😡", label: "Viknem na njega", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "💤 🐶",
        question: "Pas spava.",
        options: [
          { emoji: "🤫", label: "Pustim ga", correct: true, feedback: "Tačno!" },
          { emoji: "🔊", label: "Budim ga", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
    ],
  },
  {
    title: "Putovanje",
    place: "Voz",
    icon: "🚆",
    color: "from-yellow-400 to-orange-500",
    bg: "bg-yellow-50",
    steps: [
      {
        scene: "🚆 🎫",
        question: "Ulaziš u voz.",
        options: [
          { emoji: "🎟️", label: "Pokažem kartu", correct: true, feedback: "Tačno!" },
          { emoji: "🏃", label: "Trčim unutra", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "💺 ��",
        question: "Voz kreće.",
        options: [
          { emoji: "🪑", label: "Sednem na mesto", correct: true, feedback: "Tačno!" },
          { emoji: "🤸", label: "Skačem", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🤫 👥",
        question: "Ljudima se spava u vozu.",
        options: [
          { emoji: "🤐", label: "Budem tih", correct: true, feedback: "Tačno!" },
          { emoji: "🗣️", label: "Vičem", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
    ],
  },
  {
    title: "Lekar",
    place: "Pregled",
    icon: "👨‍⚕️",
    color: "from-pink-400 to-rose-500",
    bg: "bg-pink-50",
    steps: [
      {
        scene: "🌡️ 🤒",
        question: "Imaš temperaturu.",
        options: [
          { emoji: "🗣️", label: "Kažem mami", correct: true, feedback: "Tačno!" },
          { emoji: "��", label: "Krijem to", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🩺 👨‍⚕️",
        question: "Doktor te sluša.",
        options: [
          { emoji: "🫁", label: "Dišem duboko", correct: true, feedback: "Tačno!" },
          { emoji: "😭", label: "Vrištim", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "💊 🥤",
        question: "Moraš da popiješ lek.",
        options: [
          { emoji: "✅", label: "Popijem ga", correct: true, feedback: "Tačno!" },
          { emoji: "🤮", label: "Pljunem", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
    ],
  },
  {
    title: "Radionica",
    place: "Crtanje",
    icon: "🎨",
    color: "from-indigo-400 to-blue-500",
    bg: "bg-indigo-50",
    steps: [
      {
        scene: "🎨 🖌️",
        question: "Crtamo. Šta uzimaš?",
        options: [
          { emoji: "🖍️", label: "Bojice", correct: true, feedback: "Tačno!" },
          { emoji: "👞", label: "Cipele", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "✂️ 📄",
        question: "Secemo papir.",
        options: [
          { emoji: "👁️", label: "Pazim na prste", correct: true, feedback: "Tačno!" },
          { emoji: "🙈", label: "Sečem bez gledanja", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🧹 🗑️",
        question: "Završili smo rad.",
        options: [
          { emoji: "🧹", label: "Pospremim za sobom", correct: true, feedback: "Tačno!" },
          { emoji: "🏃", label: "Samo odem", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
    ],
  },
  {
    title: "Bazen",
    place: "Plivanje",
    icon: "🏊",
    color: "from-emerald-400 to-teal-500",
    bg: "bg-emerald-50",
    steps: [
      {
        scene: "🏊 🩱",
        question: "Ulaziš na bazen.",
        options: [
          { emoji: "👙", label: "Obučem kupaći", correct: true, feedback: "Tačno!" },
          { emoji: "👞", label: "Uđem u cipelama", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🏃 ⚠️",
        question: "Dal smeš da trčiš pored bazena?",
        options: [
          { emoji: "🚶", label: "Ne, klizavo je", correct: true, feedback: "Tačno!" },
          { emoji: "🏃", label: "Da, uvek", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "🚿 🧴",
        question: "Posle bazena ideš pod...?",
        options: [
          { emoji: "🚿", label: "Tuš", correct: true, feedback: "Tačno!" },
          { emoji: "🌳", label: "Drvo", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
    ],
  },
  {
    title: "Zima",
    place: "Sneg",
    icon: "❄️",
    color: "from-sky-400 to-blue-500",
    bg: "bg-sky-50",
    steps: [
      {
        scene: "❄️ 🧥",
        question: "Hladno je. Šta nosiš?",
        options: [
          { emoji: "🧤", label: "Jaknu i kapu", correct: true, feedback: "Tačno!" },
          { emoji: "🩱", label: "Kupaći", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "⛄",
        question: "Pravimo Sneška Belića!",
        options: [
          { emoji: "🤝", label: "Pomažem", correct: true, feedback: "Tačno!" },
          { emoji: "💥", label: "Rušim ga", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
      {
        scene: "☕ 🛋️",
        question: "Ulazimo u toplu kuću.",
        options: [
          { emoji: "🍵", label: "Pijemo čaj", correct: true, feedback: "Tačno!" },
          { emoji: "🧊", label: "Jedemo sneg", correct: false, feedback: "Pokušaj ponovo!" }
        ],
      },
    ],
  },
];


// ─────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────
export default function SocialStoryGame({
  childId,
  level,
  onComplete,
  onClose,
  autoStart,
  isMonitor,
  monitorState,
}: GameProps) {
  const lvl = LEVELS[Math.min(level - 1, LEVELS.length - 1)];
  const totalSteps = lvl.steps.length;

  const [phase, setPhase] = useState<"intro" | "playing" | "win">(
    isMonitor ? "playing" : "playing" // No intro anymore
  );
  const [showMoodBefore, setShowMoodBefore] = useState(!isMonitor && !autoStart);
  const [showMoodAfter, setShowMoodAfter] = useState(false);
  const [moodBefore, setMoodBefore] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(monitorState?.stepIdx ?? 0);
  const [score, setScore] = useState(monitorState?.score ?? 0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [startTime] = useState(Date.now());

  const { emitGameStart, emitGameProgress, emitGameComplete } = useGameEmitter();

  // Reset on level change
  useEffect(() => {
    setPhase(isMonitor ? "playing" : "intro");
    setStepIdx(0);
    setScore(0);
    setFeedback(null);
    setIsLocked(false);
  }, [level, isMonitor]);

  // Auto-start
  useEffect(() => {
    if (autoStart && !isMonitor && (showMoodBefore || phase === "intro")) {
      handleMoodBeforeSelect("neutral");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, isMonitor, phase]);

  // Monitor sync
  useEffect(() => {
    if (isMonitor && monitorState) {
      if (monitorState.phase) setPhase(monitorState.phase);
      if (monitorState.stepIdx !== undefined) setStepIdx(monitorState.stepIdx);
      if (monitorState.score !== undefined) setScore(monitorState.score);
    }
  }, [isMonitor, monitorState]);

  const handleMoodBeforeSelect = (mood: string) => {
    setMoodBefore(mood);
    setShowMoodBefore(false);
    setPhase("playing");
    emitGameStart(childId, 7, "social-story" as any, { level, stepIdx: 0, score: 0, phase: "playing" });
  };

  const handleMoodAfterSelect = (mood: string) => {
    setShowMoodAfter(false);
    onComplete(score, 0, moodBefore, mood);
  };

  const handleAnswer = (correct: boolean, feedbackText: string) => {
    if (isLocked) return;
    setIsLocked(true);
    setFeedback(feedbackText);
    setFeedbackCorrect(correct);

    const newScore = correct ? score + 100 : score;
    if (correct) setScore(newScore);

    emitGameProgress({
      childId,
      activityId: 7,
      gameType: "social-story" as any,
      event: "progress",
      data: { stepIdx, correct, score: newScore, phase: "playing" },
      timestamp: new Date().toISOString(),
    });

    setTimeout(() => {
      setFeedback(null);
      setIsLocked(false);

      if (!correct) return; // wait for correct answer

      const nextStep = stepIdx + 1;
      if (nextStep >= totalSteps) {
        // All steps done → win
        const finalScore = newScore + 200;
        setScore(finalScore);
        emitGameComplete({
          childId,
          activityId: 7,
          gameType: "social-story" as any,
          event: "completed",
          data: { finalScore, phase: "win" },
          timestamp: new Date().toISOString(),
        });
        setPhase("win");
        setTimeout(() => {
          const dur = Math.floor((Date.now() - startTime) / 1000);
          onComplete(finalScore, dur, null, null);
        }, 2200);
      } else {
        setStepIdx(nextStep);
      }
    }, 1600);
  };

  const currentStep = lvl.steps[Math.min(stepIdx, totalSteps - 1)];

  // ── Mood Before — Premium Immersive Design ────────────────
  if (!isMonitor && showMoodBefore) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-10 overflow-hidden text-center">
        {/* Background Decor */}
        <div className="absolute inset-0 bg-slate-50">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl scale-110"
            style={{ backgroundImage: "url('/images/socijalneprice.png')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-white/80 to-purple-500/10 backdrop-blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
            {onClose && (
                <button 
                  onClick={onClose}
                  className="absolute -top-12 left-0 flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-500 hover:text-indigo-600 font-black text-xs uppercase tracking-widest shadow-md border border-slate-100 transition-all hover:-translate-x-1 active:scale-95 z-20"
                >
                  <span>⬅</span> Nazad
                </button>
            )}
            <div className="text-center mb-6 sm:mb-10 animate-in fade-in slide-in-from-top-10 duration-700">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white shadow-sm border border-slate-100 text-indigo-600 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-4">
                  ✨ Raspoloženje
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-2">
                  Kako si danas?
                </h2>
                <p className="text-slate-500 text-base sm:text-xl font-bold italic">Izaberi sličicu koja te opisuje</p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 sm:gap-6 w-full max-w-4xl px-4">
                {[
                  { emoji: "😢", label: "Tužno", color: "from-blue-400 to-indigo-500", value: "very_upset" },
                  { emoji: "😕", label: "Umorno", color: "from-slate-400 to-slate-500", value: "upset" },
                  { emoji: "😐", label: "Okej", color: "from-emerald-400 to-teal-500", value: "neutral" },
                  { emoji: "😊", label: "Dobro", color: "from-amber-400 to-orange-500", value: "happy" },
                  { emoji: "😄", label: "Super!", color: "from-pink-400 to-rose-500", value: "very_happy" },
                ].map((mood, idx) => (
                  <button
                    key={mood.value}
                    onClick={() => handleMoodBeforeSelect(mood.value)}
                    className="group relative flex flex-col items-center bg-white rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer shadow-lg border border-slate-100 hover:border-indigo-100 animate-in zoom-in-95 duration-500"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
                    <div className="w-16 h-16 sm:w-24 sm:h-24 mb-3 sm:mb-4 flex items-center justify-center text-5xl sm:text-7xl transform group-hover:scale-110 transition-transform duration-500">
                      {mood.emoji}
                    </div>
                    <span className="text-sm sm:text-lg font-black text-slate-800 tracking-tight uppercase group-hover:text-indigo-600 transition-colors">{mood.label}</span>
                  </button>
                ))}
            </div>
        </div>
      </div>
    );
  }

  // ── WIN ─────────────────────────────────────────
  if (phase === "win" && !showMoodAfter) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center rounded-[3rem] bg-white/80 backdrop-blur-xl shadow-2xl animate-in zoom-in duration-500">
        <div className="relative">
          <div
            className={`w-36 h-36 md:w-52 md:h-52 rounded-full bg-gradient-to-br ${lvl.color} flex items-center justify-center shadow-2xl`}
            style={{ fontSize: 90 }}
          >
            {lvl.icon}
          </div>
          <span className="absolute -top-4 -right-4 text-5xl animate-bounce">🌟</span>
          <span className="absolute -bottom-4 -left-4 text-4xl animate-bounce">🎉</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight">Bravo! 🏆</h2>
        <p className="text-xl md:text-2xl text-slate-500 font-semibold mb-8">
          Sjajno si završio/la priču! <br/>
          <span className="font-black text-slate-800 tracking-tight">{lvl.title}</span>
        </p>
        
        <button
          onClick={() => setShowMoodAfter(true)}
          className={`px-12 py-5 bg-gradient-to-br ${lvl.color} text-white text-2xl font-black rounded-3xl shadow-xl hover:scale-105 transition-transform`}
        >
          Završi 🏁
        </button>
      </div>
    );
  }

  if (!isMonitor && showMoodAfter) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[500px] w-full bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-[3rem] p-12 shadow-2xl animate-in fade-in duration-500">
            <div className="text-center mb-16">
                <span className="px-6 py-2 rounded-full bg-emerald-100 text-emerald-600 text-sm font-black uppercase tracking-widest mb-4 inline-block">Sjajno urađeno!</span>
                <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-4 text-center">Kako se osećaš sada? 🌟</h2>
                <p className="text-2xl text-slate-500 font-medium tracking-wide">Rezultat: <span className="font-bold text-emerald-600 underline decoration-2 underline-offset-4">{score} poena</span></p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 w-full max-w-5xl">
                {[
                    { emoji: "😢", label: "Tužno", color: "from-blue-400 to-indigo-500", value: "very_upset" },
                    { emoji: "😕", label: "Umorno", color: "from-slate-400 to-slate-500", value: "upset" },
                    { emoji: "😐", label: "Okej", color: "from-emerald-400 to-teal-500", value: "neutral" },
                    { emoji: "😊", label: "Dobro", color: "from-amber-400 to-orange-500", value: "happy" },
                    { emoji: "😄", label: "Super!", color: "from-pink-400 to-rose-500", value: "very_happy" },
                ].map((mood) => (
                    <button
                        key={mood.value}
                        onClick={() => handleMoodAfterSelect(mood.value)}
                        className="group relative flex flex-col items-center bg-white rounded-[2.5rem] p-10 transition-all duration-300 hover:scale-105 hover:shadow-xl border border-slate-100"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-0 group-hover:opacity-10 rounded-[2.5rem] transition-opacity`} />
                        <span className="text-7xl mb-4 transform group-hover:scale-110 transition-transform duration-300 select-none">{mood.emoji}</span>
                        <span className="text-lg font-black text-slate-700 uppercase tracking-wide">{mood.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
  }

  // ── PLAYING ─────────────────────────────────────
  const progressPct = Math.round(((stepIdx) / totalSteps) * 100);

  return (
    <div className={`w-full flex-1 flex flex-col gap-4 md:gap-6 max-w-3xl mx-auto`}>

      {/* ── Progress bar & HUD ── */}
      <div className="flex items-center gap-4 bg-white rounded-2xl md:rounded-3xl px-5 py-4 shadow-lg border border-slate-100">
        <div
          className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${lvl.color} flex items-center justify-center shrink-0 shadow-md`}
          style={{ fontSize: 28 }}
        >
          {lvl.icon}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm font-black text-slate-700 uppercase tracking-wide">{lvl.title}</span>
            <span className="text-xs font-black text-slate-400">
              Korak {stepIdx + 1} / {totalSteps}
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full bg-gradient-to-r ${lvl.color} transition-all duration-700 ease-out rounded-full`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-black text-amber-500 uppercase">Poeni</p>
          <p className="text-2xl font-black text-slate-800">{score}</p>
        </div>
      </div>

      {/* ── Scene card ── */}
      <div className={`${lvl.bg} rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 flex flex-col items-center gap-4 text-center shadow-inner border-2 border-white`}>
        {/* Big scene emoji */}
        <div className="text-7xl md:text-9xl leading-none animate-in zoom-in duration-400">
          {currentStep.scene}
        </div>
        {/* Question */}
        <p className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 leading-tight max-w-lg">
          {currentStep.question}
        </p>
      </div>

      {/* ── Feedback banner ── */}
      {feedback && (
        <div
          className={`rounded-2xl px-6 py-4 text-center text-lg md:text-xl font-black border-4 animate-in slide-in-from-top-2 duration-300
            ${feedbackCorrect
              ? "bg-green-50 border-green-300 text-green-700"
              : "bg-red-50 border-red-300 text-red-700"
            }`}
        >
          {feedbackCorrect ? "✅ " : "❌ "}{feedback}
        </div>
      )}

      {/* ── Answer options ── */}
      <div className={`grid gap-3 md:gap-4 ${currentStep.options.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
        {currentStep.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(opt.correct, opt.feedback)}
            disabled={isLocked}
            className={`flex items-center sm:flex-col justify-start sm:justify-center gap-4 sm:gap-2 p-4 md:p-6 rounded-2xl md:rounded-3xl border-4 font-black transition-all duration-200
              ${isLocked
                ? "opacity-60 cursor-not-allowed border-slate-100 bg-white"
                : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 active:scale-95 cursor-pointer shadow-md"
              }`}
          >
            <span className="text-4xl sm:text-6xl leading-none shrink-0">{opt.emoji}</span>
            <span className="text-sm md:text-base text-slate-700 text-left sm:text-center leading-tight font-black">
              {opt.label}
            </span>
          </button>
        ))}
      </div>

      {/* Step dot indicators */}
      <div className="flex justify-center gap-2 pb-2">
        {lvl.steps.map((_, i) => (
          <div
            key={i}
            className={`h-2.5 rounded-full transition-all duration-500
              ${i < stepIdx
                ? `bg-gradient-to-r ${lvl.color} w-6`
                : i === stepIdx
                  ? `bg-gradient-to-r ${lvl.color} w-8`
                  : "bg-slate-200 w-2.5"
              }`}
          />
        ))}
      </div>
    </div>
  );
}
