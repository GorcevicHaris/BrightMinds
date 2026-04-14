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
  // ── L1: Jutarnja rutina ──────────────────────────
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
          { emoji: "🚿", label: "Perem se", correct: true, feedback: "Sjajno! Jutarnje pranje je važno! 🚿" },
          { emoji: "📱", label: "Gledam telefon", correct: false, feedback: "Prvo se operemo, pa onda telefon 😊" },
          { emoji: "🍕", label: "Jedem pizzu", correct: false, feedback: "Pizza nije jutarnji obrok 😄" },
        ],
      },
      {
        scene: "🍽️ 🥛",
        question: "Dođeš u kuhinju. Šta jedeš ujutru?",
        options: [
          { emoji: "🥣", label: "Kaša i mleko", correct: true, feedback: "Odlično! Doručak daje energiju! ⚡" },
          { emoji: "🍰", label: "Torta", correct: false, feedback: "Torta nije za doručak, slatkiši za posebne prilike 😊" },
          { emoji: "🍟", label: "Pomfrit", correct: false, feedback: "Pomfrit nije za jutro 😄" },
        ],
      },
      {
        scene: "🎒 👟",
        question: "Ideš u školu! Šta pakuješ?",
        options: [
          { emoji: "📓", label: "Sveska i olovke", correct: true, feedback: "Bravo! Sveska i olovke su nam potrebni! 🌟" },
          { emoji: "🧸", label: "Igračku", correct: false, feedback: "Igračke ostaju kod kuće tokom škole 😊" },
          { emoji: "🎮", label: "Gamepad", correct: false, feedback: "Gamepad ne ide u ranac za školu 😊" },
        ],
      },
    ],
  },

  // ── L2: Škola ────────────────────────────────────
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
          { emoji: "💺", label: "Sjednem za klupu", correct: true, feedback: "Tačno! Sedamo na naše mesto 🌟" },
          { emoji: "🏃", label: "Trčim po hodniku", correct: false, feedback: "U školi ne trčimo po hodniku 😊" },
        ],
      },
      {
        scene: "👩‍🏫 📋",
        question: "Učiteljica govori. Šta radiš?",
        options: [
          { emoji: "👂", label: "Slušam pažljivo", correct: true, feedback: "Odlično! Slušamo učiteljicu 🌟" },
          { emoji: "🗣️", label: "Pričam sa drugarom", correct: false, feedback: "Dok govori učiteljica, tiho smo 😊" },
          { emoji: "😴", label: "Spavam", correct: false, feedback: "Ne spavamo u učionici 😄" },
        ],
      },
      {
        scene: "🤚 ❓",
        question: "Znaš odgovor! Šta radiš?",
        options: [
          { emoji: "✋", label: "Dižem ruku", correct: true, feedback: "Bravo! Ruku dizamo kad znamo odgovor 🌟" },
          { emoji: "📣", label: "Vikim odgovor", correct: false, feedback: "Ne vičemo, dižemo ruku 😊" },
        ],
      },
      {
        scene: "🔔 🎒",
        question: "Zazvonilo je! Šta radiš sa stvarima?",
        options: [
          { emoji: "🗂️", label: "Pospremam sve u ranac", correct: true, feedback: "Super! Pospremamo pre odlaska 🌟" },
          { emoji: "🏃", label: "Bežim odmah", correct: false, feedback: "Prvo pospremimo, pa onda izlazimo 😊" },
        ],
      },
    ],
  },

  // ── L3: Stomatolog ────────────────────────────────
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
          { emoji: "☀️🌙", label: "Jutro i veče", correct: true, feedback: "Sjajno! Zube peremo 2 puta dnevno 🌟" },
          { emoji: "🎂", label: "Samo na rođendan", correct: false, feedback: "Zube peremo svaki dan, ne samo jednom godišnje 😊" },
          { emoji: "❌", label: "Nikad", correct: false, feedback: "Zube moramo uvek prati 😊" },
        ],
      },
      {
        scene: "🏥 😨",
        question: "Idemo kod stomatologa. Kako je kod stomatologa?",
        options: [
          { emoji: "😊", label: "Nije strašno, lekar pomaže", correct: true, feedback: "Tačno! Stomatolog nam pomaže da imamo zdravo zube 🌟" },
          { emoji: "👹", label: "Strašno je", correct: false, feedback: "Stomatolog je prijatni lekar koji čuva naše zube 😊" },
        ],
      },
      {
        scene: "📅 ❓",
        question: "Kada idemo kod stomatologa?",
        options: [
          { emoji: "📆", label: "Redovno, preventivno", correct: true, feedback: "Odlično! Idemo redovno, ne samo kad boli 🌟" },
          { emoji: "😣", label: "Samo kad boli zub", correct: false, feedback: "Bolje je ići redovnocreating nego čekati da zaboli 😊" },
        ],
      },
      {
        scene: "🪥 ⏱️",
        question: "Koliko dugo peremo zube?",
        options: [
          { emoji: "2️⃣", label: "2 minute", correct: true, feedback: "Bravo! 2 minute su potrebne za čiste zube 🌟" },
          { emoji: "⚡", label: "5 sekundi", correct: false, feedback: "5 sekundi nije dovoljno, treba nam 2 minuta 😊" },
          { emoji: "🕐", label: "Sat vremena", correct: false, feedback: "Sat vremena je previše, 2 minute su dovoljne 😄" },
        ],
      },
    ],
  },

  // ── L4: Prodavnica ───────────────────────────────
  {
    title: "Prodavnica",
    place: "Kupovina",
    icon: "🛒",
    color: "from-green-400 to-emerald-500",
    bg: "bg-green-50",
    steps: [
      {
        scene: "🛒 📝",
        question: "Idemo po namirnice. Šta nam pomaže?",
        options: [
          { emoji: "📋", label: "Lista za kupovinu", correct: true, feedback: "Odlično! Lista nam pomaže da ne zaboravimo ništa 🌟" },
          { emoji: "🎮", label: "Konzola za igre", correct: false, feedback: "Konzola nam ne pomaže pri kupovini 😊" },
        ],
      },
      {
        scene: "🧀 🥦 🍎",
        question: "Mama kaže: 'Uzmi sir.' Gde idemo?",
        options: [
          { emoji: "🧀", label: "Mlečni proizvodi", correct: true, feedback: "Bravo! Sir je u mlečnim proizvodima 🌟" },
          { emoji: "🍞", label: "Pekarnica", correct: false, feedback: "Hleb je u pekarnici, ali sir je drugde 😊" },
          { emoji: "🍭", label: "Slatkiši", correct: false, feedback: "Sir nije u delу sa slatkišima 😊" },
        ],
      },
      {
        scene: "💳 💵",
        question: "Stigli smo do kase. Šta radimo?",
        options: [
          { emoji: "💰", label: "Platimo", correct: true, feedback: "Tačno! Na kasi plaćamo što smo uzeli 🌟" },
          { emoji: "🏃", label: "Odemo bez plaćanja", correct: false, feedback: "Moramo platiti ono što uzimamo 😊" },
        ],
      },
    ],
  },

  // ── L5: Park ─────────────────────────────────────
  {
    title: "Park",
    place: "Igra napolju",
    icon: "🌳",
    color: "from-lime-400 to-green-500",
    bg: "bg-lime-50",
    steps: [
      {
        scene: "🌳 ☀️",
        question: "Igramo se napolju. Šta nosimo leti?",
        options: [
          { emoji: "🧴", label: "Kremu za sunce", correct: true, feedback: "Sjajno! Krema nas štiti od sunca 🌟" },
          { emoji: "🧥", label: "Zimski kaput", correct: false, feedback: "Leti ne nosimo zimski kaput 😊" },
          { emoji: "☂️", label: "Suncobran za kišu", correct: false, feedback: "Suncobran za kišu nije za vreo dan 😊" },
        ],
      },
      {
        scene: "💧 🥤",
        question: "Igraš se i oznojio si se. Šta radiš?",
        options: [
          { emoji: "💧", label: "Pijem vodu", correct: true, feedback: "Bravo! Voda nam vraća snagu 🌟" },
          { emoji: "🍔", label: "Jedem hamburger", correct: false, feedback: "Prvo se napijem vode, hrana može i nakon toga 😊" },
        ],
      },
      {
        scene: "🛝 👫",
        question: "Drug želi da se igra tobogan. Šta radiš?",
        options: [
          { emoji: "🤝", label: "Prihvatam i igramo zajedno", correct: true, feedback: "Odlično! Igraanje zajedno je super 🌟" },
          { emoji: "🚫", label: "Ne dam mu tobogan", correct: false, feedback: "Tobogan je za sve, delimo ga 😊" },
        ],
      },
      {
        scene: "🌆 🏠",
        question: "Smrkava se. Mama te zove. Šta radiš?",
        options: [
          { emoji: "🏠", label: "Idem kući", correct: true, feedback: "Bravo! Kad mama zove, idemo kući 🌟" },
          { emoji: "🌙", label: "Ostanem da se igram", correct: false, feedback: "Kada mama zove, vreme je za kuću 😊" },
        ],
      },
    ],
  },

  // ── L6: Bolnica ──────────────────────────────────
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
          { emoji: "👨‍👩‍👦", label: "Kažem mami/tati", correct: true, feedback: "Odlično! Uvek kažemo roditeljima kad nam nije dobro 🌟" },
          { emoji: "🤫", label: "Ćutim", correct: false, feedback: "Ne ćutimo kad smo bolesni, kažemo roditeljima 😊" },
        ],
      },
      {
        scene: "🏥 👨‍⚕️",
        question: "Doktor te pregleda. Kako se ponašaš?",
        options: [
          { emoji: "😌", label: "Tiho sedim i sarađujem", correct: true, feedback: "Bravo! Doktor nam pomaže kad sarađujemo 🌟" },
          { emoji: "😭", label: "Vrištim i ne dam se pregledati", correct: false, feedback: "Doktor želi samo da nam pomogne 😊" },
        ],
      },
      {
        scene: "💊 💉",
        question: "Doktor ti da lek. Šta radiš?",
        options: [
          { emoji: "✅", label: "Pijem lek kako je rečeno", correct: true, feedback: "Tačno! Lekovi nam pomažu da ozdravimo 🌟" },
          { emoji: "🚮", label: "Bacim lek", correct: false, feedback: "Lekove pijemo po uputstvu doktora 😊" },
        ],
      },
    ],
  },

  // ── L7: Restoran ─────────────────────────────────
  {
    title: "Restoran",
    place: "Jelo napolju",
    icon: "🍽️",
    color: "from-amber-400 to-orange-500",
    bg: "bg-amber-50",
    steps: [
      {
        scene: "🍽️ 🪑",
        question: "Uđeš u restoran. Šta radiš?",
        options: [
          { emoji: "💺", label: "Sjedem za sto", correct: true, feedback: "Odlično! U restoranu sedimo za sto 🌟" },
          { emoji: "🏃", label: "Trčim po restoranu", correct: false, feedback: "U restoranu ne trčimo 😊" },
        ],
      },
      {
        scene: "👨‍🍳 📋",
        question: "Konobar dolazi. Šta radimo?",
        options: [
          { emoji: "🗣️", label: "Naručujemo ljubazno", correct: true, feedback: "Bravo! Naručujemo pristojno 🌟" },
          { emoji: "😤", label: "Vičemo na konobara", correct: false, feedback: "Na konobara ne vičemo, pristojno tražimo 😊" },
        ],
      },
      {
        scene: "🍝 😋",
        question: "Doneli su hranu. Šta radiš?",
        options: [
          { emoji: "🙏", label: "Zahvalim se i jedem", correct: true, feedback: "Sjajno! Zahvalnost je važna 🌟" },
          { emoji: "😒", label: "Žalim se što mi se ne sviđa", correct: false, feedback: "Prema hrani smo zahvalni 😊" },
        ],
      },
      {
        scene: "🧻 🤲",
        question: "Završio si jelo. Šta radiš pre ustajanja?",
        options: [
          { emoji: "🤲", label: "Brišem usta i ruke", correct: true, feedback: "Perfektno! Brisanje ruku i usta je higijena 🌟" },
          { emoji: "🏃", label: "Odmah ustanem", correct: false, feedback: "Pre ustajanja, brišemo usta i ruke 😊" },
        ],
      },
    ],
  },

  // ── L8: Vatrogasna bezbednost ─────────────────────
  {
    title: "Vatrogasna bezbednost",
    place: "Šta raditi u hitnim situacijama",
    icon: "🚒",
    color: "from-red-500 to-rose-600",
    bg: "bg-red-50",
    steps: [
      {
        scene: "🔥 😨",
        question: "Vidiš dim u kući! Šta radiš?",
        options: [
          { emoji: "🏃", label: "Idem van brzo", correct: true, feedback: "Tačno! Kod dima odmah izlazimo napolje 🌟" },
          { emoji: "🛒", label: "Uzimam igračke pa idem", correct: false, feedback: "Kod dima, odmah napolje bez zadržavanja 😊" },
        ],
      },
      {
        scene: "📞 🚒",
        question: "Ko nam pomaže kad ima požar?",
        options: [
          { emoji: "🚒", label: "Vatrogasci — zovemo 193", correct: true, feedback: "Bravo! Vatrogasci gase požar, broj je 193 🌟" },
          { emoji: "🍕", label: "Dostavljač pizze", correct: false, feedback: "Vatrogasci nam pomažu kod požara 😊" },
        ],
      },
      {
        scene: "🔌 💡",
        question: "Nisi siguran je li nešto bezbedno. Šta radiš?",
        options: [
          { emoji: "👨‍👩‍👦", label: "Pitam odraslu osobu", correct: true, feedback: "Odlično! Uvek pitamo odrasle kad nismo sigurni 🌟" },
          { emoji: "🤚", label: "Sam/a to diram", correct: false, feedback: "Kad nismo sigurni, pitamo odrasle 😊" },
        ],
      },
      {
        scene: "✅ 🙂",
        question: "Zapamtio/la si pravila! Znaš šta da radiš?",
        options: [
          { emoji: "💪", label: "Da! Siguran/na sam!", correct: true, feedback: "BRAVO, šampione! 🏆 Znaš sva bezbednosna pravila!" },
          { emoji: "🤔", label: "Ne znam", correct: false, feedback: "Možeš ponovo! Učimo zajedno 😊" },
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
  autoStart,
  isMonitor,
  monitorState,
}: GameProps) {
  const lvl = LEVELS[Math.min(level - 1, LEVELS.length - 1)];
  const totalSteps = lvl.steps.length;

  const [phase, setPhase] = useState<"intro" | "playing" | "win">(
    isMonitor ? "playing" : "intro"
  );
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
    if (autoStart && !isMonitor && phase === "intro") {
      handleStart();
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

  const handleStart = () => {
    setPhase("playing");
    emitGameStart(childId, 7, "social-story" as any, { level, stepIdx: 0, score: 0, phase: "playing" });
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

  // ── INTRO ───────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center gap-6 p-6 md:p-12 text-center">
        {/* Icon */}
        <div
          className={`w-36 h-36 md:w-48 md:h-48 rounded-[3rem] bg-gradient-to-br ${lvl.color} flex items-center justify-center shadow-2xl`}
          style={{ fontSize: 88 }}
        >
          {lvl.icon}
        </div>

        {/* Title */}
        <div>
          <span className="inline-block px-4 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-black uppercase tracking-widest mb-3">
            Priča {level} od 8
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-2 tracking-tight">
            {lvl.title}
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-semibold italic">{lvl.place}</p>
        </div>

        {/* Step preview dots */}
        <div className="flex items-center gap-2 mt-2">
          {lvl.steps.map((_, i) => (
            <div key={i} className={`h-3 w-3 rounded-full bg-gradient-to-br ${lvl.color} opacity-30`} />
          ))}
          <span className="ml-2 text-sm font-bold text-slate-400">{totalSteps} koraka</span>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          className={`mt-4 px-14 py-6 bg-gradient-to-br ${lvl.color} text-white text-2xl font-black rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all`}
        >
          Počnimo! {lvl.icon}
        </button>
      </div>
    );
  }

  // ── WIN ─────────────────────────────────────────
  if (phase === "win") {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
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
        <h2 className="text-4xl md:text-6xl font-black text-slate-900">Bravo! 🏆</h2>
        <p className="text-xl md:text-2xl text-slate-500 font-semibold">
          Završio/la si priču: <span className="font-black text-slate-800">{lvl.title}</span>
        </p>
        <div className="flex items-center gap-3 bg-amber-50 border-4 border-amber-200 px-10 py-5 rounded-3xl">
          <span className="text-4xl">⭐</span>
          <span className="text-4xl font-black text-slate-800">{score} poena</span>
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
