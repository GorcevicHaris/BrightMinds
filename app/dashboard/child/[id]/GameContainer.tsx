// app/dashboard/child/[id]/GameContainer.tsx
"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useGameEmitter } from "@/lib/useSocket";
import { useSpeech } from "@/lib/useSpeech";

// Lazy-load each game — only the selected game is downloaded
const ShapeMatchingGame = dynamic(() => import("@/app/components/games/ShapeMatchingGame"), { ssr: false });
const MemoryGame = dynamic(() => import("@/app/components/games/MemoryGame"), { ssr: false });
const ColoringGame = dynamic(() => import("@/app/components/games/ColoringGame"), { ssr: false });
const SoundToImageGame = dynamic(() => import("@/app/components/games/SoundToImageGame"), { ssr: false });
const SocialCommunicationGame = dynamic(() => import("@/app/components/games/SocialCommunicationGame"), { ssr: false });
const SocialStoryGame = dynamic(() => import("@/app/components/games/SocialStoryGame"), { ssr: false });
const EmotionsGame = dynamic(() => import("@/app/components/games/EmotionsGame"), { ssr: false });

type GameId = "shapes" | "memory" | "coloring" | "sound-to-image" | "social" | "social-story" | "emotions";
type Difficulty = "easy" | "medium" | "hard";
type Screen = "picker" | "difficulty-select" | "playing" | "tier-finished" | "all-finished";

interface GameContainerProps {
  childId: number;
  childName: string;
}

// ── Igre ───────────────────────────────────────────────────────────────────────
const GAMES = [
  { id: "shapes" as GameId, title: "Pogodi oblik", description: "Prepoznavanje oblika i boja", icon: "🔷", gradient: "from-emerald-400 to-teal-500", cardBg: "bg-emerald-50", border: "border-emerald-200", bgImage: "/images/pogodioblik.png" },
  { id: "memory" as GameId, title: "Spoji parove", description: "Vežbanje memorije i pažnje", icon: "🧠", gradient: "from-purple-400 to-indigo-500", cardBg: "bg-purple-50", border: "border-purple-200", bgImage: "/images/spojiparove.png" },
  { id: "coloring" as GameId, title: "Bojanka", description: "Kreativnost i fina motorika", icon: "🎨", gradient: "from-orange-400 to-pink-500", cardBg: "bg-orange-50", border: "border-orange-200", bgImage: "/images/oboji.png" },
  { id: "sound-to-image" as GameId, title: "Zvuk → Slika", description: "Slušna pažnja i povezivanje", icon: "🔊", gradient: "from-cyan-400 to-blue-500", cardBg: "bg-cyan-50", border: "border-cyan-200", bgImage: "/images/slusajispoji.png" },
  { id: "social" as GameId, title: "Šta da kažeš?", description: "Socijalna komunikacija i govor", icon: "💬", gradient: "from-violet-400 to-purple-600", cardBg: "bg-violet-50", border: "border-violet-200", bgImage: "/images/stareci.png" },
  { id: "social-story" as GameId, title: "Socijalne Priče", description: "Uči o školi, doktoru, parku i još mnogo!", icon: "📖", gradient: "from-teal-500 to-emerald-600", cardBg: "bg-teal-50", border: "border-teal-200", bgImage: "/images/socijalneprice.png" },
  { id: "emotions" as GameId, title: "Emocije", description: "Kako se osećaš u različitim situacijama?", icon: "😊", gradient: "from-pink-400 to-rose-500", cardBg: "bg-pink-50", border: "border-pink-200", bgImage: "/images/emocije.png" },
];

// ── Konfiguracija težina ───────────────────────────────────────────────────────
const DIFF_CONFIG = {
  easy: {
    label: "Lako",
    sublabel: "Za početnike",
    emoji: "🌱",
    range: "Nivoi 1 – 5",
    min: 1, max: 5,
    gradient: "from-emerald-400 via-green-500 to-teal-500",
    gradientHover: "from-emerald-500 via-green-600 to-teal-600",
    glow: "rgba(16,185,129,0.35)",
    badge: "bg-emerald-500",
    lockMsg: null,
  },
  medium: {
    label: "Srednje",
    sublabel: "Za napredne",
    emoji: "⚡",
    range: "Nivoi 6 – 10",
    min: 6, max: 10,
    gradient: "from-amber-400 via-yellow-500 to-orange-500",
    gradientHover: "from-amber-500 via-yellow-600 to-orange-600",
    glow: "rgba(245,158,11,0.35)",
    badge: "bg-amber-500",
    lockMsg: "Završi sve LAKO nivoe da otključaš",
  },
  hard: {
    label: "Teško",
    sublabel: "Za eksperte",
    emoji: "🔥",
    range: "Nivoi 11 – 15",
    min: 11, max: 15,
    gradient: "from-rose-500 via-red-500 to-orange-600",
    gradientHover: "from-rose-600 via-red-600 to-orange-700",
    glow: "rgba(244,63,94,0.35)",
    badge: "bg-rose-500",
    lockMsg: "Završi sve SREDNJE nivoe da otključaš",
  },
} as const;

const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard"];

// ── Helper funkcije ────────────────────────────────────────────────────────────
function isDiffUnlocked(diff: Difficulty, maxUnlocked: number): boolean {
  if (diff === "easy") return true;
  if (diff === "medium") return maxUnlocked > 5;
  return maxUnlocked > 10;
}

function completedInTier(diff: Difficulty, maxUnlocked: number): number {
  const done = maxUnlocked - 1;
  const offset = DIFF_CONFIG[diff].min - 1;
  return Math.min(Math.max(done - offset, 0), 5);
}

function getStartLevelForDiff(diff: Difficulty, maxUnlocked: number): number {
  const comp = completedInTier(diff, maxUnlocked);
  const { min } = DIFF_CONFIG[diff];
  return comp < 5 ? min + comp : min;
}

function getActivityId(gameId: GameId | null): number {
  return gameId === "shapes" ? 1 : gameId === "memory" ? 3 : gameId === "sound-to-image" ? 5 : gameId === "social" ? 6 : gameId === "social-story" ? 7 : gameId === "emotions" ? 8 : 4;
}

interface GameProps {
  childId: number;
  level: number;
  minLevel?: number;
  maxLevel?: number;
  onComplete: (score: number, duration: number, moodBefore?: string | null, moodAfter?: string | null, stats?: { correct: number, total: number }) => void;
  onClose?: () => void;
  autoStart?: boolean;
  isMonitor?: boolean;
  monitorState?: any;
}

// ── Komponenta ─────────────────────────────────────────────────────────────────
export default function GameContainer({ childId, childName, gender }: GameContainerProps & { gender?: string }) {
  const [screen, setScreen] = useState<Screen>("picker");
  const isFemale = gender?.toLowerCase() === 'female';
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [autoStart, setAutoStart] = useState(false);
  const [unlockedLevels, setUnlockedLevels] = useState<Record<string, number>>({});
  const [levelsLoading, setLevelsLoading] = useState(true);
  const [showNextLevel, setShowNextLevel] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [lastStars, setLastStars] = useState(0);

  const isSavingRef = useRef(false);
  const lastSaveTimeRef = useRef(0);
  const { emitGameComplete } = useGameEmitter();
  const { speak } = useSpeech();

  const refreshUnlocked = () => {
    fetch(`/api/children/${childId}/unlocked-levels?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => { if (data.unlockedLevels) setUnlockedLevels(data.unlockedLevels); })
      .catch(() => { });
  };

  useEffect(() => {
    setLevelsLoading(true);
    fetch(`/api/children/${childId}/unlocked-levels?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => { if (data.unlockedLevels) setUnlockedLevels(data.unlockedLevels); })
      .catch(() => { })
      .finally(() => setLevelsLoading(false));
  }, [childId]);

  const getMaxUnlocked = (gameId: string) => unlockedLevels[gameId] ?? 1;
  const activeGame = GAMES.find(g => g.id === selectedGame);
  const tierMax = selectedDifficulty ? DIFF_CONFIG[selectedDifficulty].max : 15;

  const handleGameSelect = (gameId: GameId) => {
    setSelectedGame(gameId);
    setSelectedDifficulty(null);
    setMessage("");
    setAutoStart(false);
    setScreen("difficulty-select");
  };

  const handleDifficultySelect = (diff: Difficulty) => {
    const maxUnlocked = getMaxUnlocked(selectedGame!);
    if (!isDiffUnlocked(diff, maxUnlocked)) return;
    setSelectedDifficulty(diff);
    setCurrentLevel(getStartLevelForDiff(diff, maxUnlocked));
    setMessage("");
    setAutoStart(false);
    setShowNextLevel(false);
    setLastScore(0);
    setScreen("playing");
  };

  const handleExit = () => {
    if (screen === "playing" && selectedGame) {
      emitGameComplete({
        childId,
        activityId: getActivityId(selectedGame),
        gameType: selectedGame,
        event: "completed",
        data: { finalScore: 0, reason: "manual_exit" },
        timestamp: new Date().toISOString(),
      } as any);
    }
    setScreen("picker");
    setSelectedGame(null);
    setSelectedDifficulty(null);
    setAutoStart(false);
    setMessage("");
    setShowNextLevel(false);
    setLastScore(0);
  };

  const handleGameComplete = async (score: number, duration: number, moodBefore?: string | null, moodAfter?: string | null, stats?: { correct: number, total: number }) => {
    const now = Date.now();
    if (isSavingRef.current || now - lastSaveTimeRef.current < 2000) return;
    isSavingRef.current = true;
    lastSaveTimeRef.current = now;
    setIsLoading(true);

    try {
      let stars = 0;
      if (stats) {
        const ratio = stats.correct / stats.total;
        if (ratio >= 0.8) stars = 3;
        else if (ratio >= 0.5) stars = 2;
        else if (ratio >= 0.2) stars = 1;
        else stars = 0;
      } else {
        // Fallback for games without stats
        if (score >= 400) stars = 3;
        else if (score >= 200) stars = 2;
        else if (score >= 50) stars = 1;
        else stars = 0;
      }
      setLastStars(stars);

      let successLevel: "struggled" | "partial" | "successful" | "excellent" = "struggled";
      if (stars === 3) successLevel = "excellent";
      else if (stars === 2) successLevel = "successful";
      else if (stars === 1) successLevel = "partial";

      if (stars > 0) {
        const response = await fetch("/api/activities/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId,
            activityId: getActivityId(selectedGame),
            successLevel,
            durationMinutes: Math.ceil(duration / 60) || 1,
            notes: `Nivo ${currentLevel}, Zvezdice: ${stars}, Rezultat: ${score}`,
            moodBefore: moodBefore || null,
            moodAfter: moodAfter || null,
          }),
        });
        if (response.ok) refreshUnlocked();
      }

      if (currentLevel < tierMax) {
        setIsLoading(false);
        setLastScore(score);
        setShowNextLevel(true);
        if (stars > 0) {
          const starText = stars === 1 ? "jednu zvezdicu" : stars === 2 ? "dve zvezdice" : "tri zvezdice";
          speak(`Sjajno ${childName}! Nivo je završen! ${isFemale ? 'Osvojila si' : 'Osvojio si'} ${starText}.`, undefined, undefined, gender);
        } else {
          speak(`Skoro si ${isFemale ? 'uspela' : 'uspeo'}! Probaj ponovo, možeš ti to!`, undefined, undefined, gender);
        }
      } else if (stars > 0) {
        setIsLoading(false);
        if (selectedDifficulty === "hard") {
          setScreen("all-finished");
          speak(`Bravo ${childName}! ${isFemale ? 'Završila si' : 'Završio si'} apsolutno sve nivoe u ovoj igri! Ti si pravi šampion!`, undefined, undefined, gender);
        } else {
          setScreen("tier-finished");
          speak(`Odlično ${childName}! ${isFemale ? 'Završila si' : 'Završio si'} sve nivoe na ovoj težini! ${isFemale ? 'Spremna si' : 'Spreman si'} za sledeći izazov?`, undefined, undefined, gender);
        }
      } else {
        setIsLoading(false);
        setLastScore(score);
        setShowNextLevel(true);
        speak(`Skoro si ${isFemale ? 'uspela' : 'uspeo'}! Probaj još jednom, siguran sam da možeš!`, undefined, undefined, gender);
      }
    } catch (err) {
      console.error(err);
      setMessage("⚠️ Greška");
    } finally {
      setTimeout(() => { isSavingRef.current = false; }, 2000);
    }
  };

  if (screen === "picker") {
    return (
      <div className="pb-6 sm:pb-10">
        <p className="text-center text-slate-400 text-xs sm:text-sm font-black uppercase tracking-widest mb-4 sm:mb-6">
          Izaberi igru koju želiš da igraš 👇
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-none mx-auto px-0">
          {GAMES.map(game => (
            <button
              key={game.id}
              onClick={() => handleGameSelect(game.id)}
              className="group relative aspect-video rounded-xl md:rounded-2xl overflow-hidden transition-all duration-700 hover:scale-[1.02] active:scale-[0.99] shadow-xl hover:shadow-2xl bg-white select-none border-[6px] border-white"
            >
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[2s] group-hover:scale-105" style={{ backgroundImage: `url(${game.bgImage})` }} />
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-50 group-hover:scale-100">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/30 backdrop-blur-md rounded-full border-2 border-white/80 flex items-center justify-center shadow-xl">
                  <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-1" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (screen === "difficulty-select" && activeGame) {
    const maxUnlocked = getMaxUnlocked(selectedGame!);
    return (
      <div className="fixed inset-0 z-[6000] flex flex-col overflow-hidden bg-slate-50">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-30" style={{ backgroundImage: `url(${activeGame.bgImage})` }} />
          <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/80 to-white/90 backdrop-blur-3xl" />
        </div>
        <div className="relative z-10 flex items-center justify-between px-6 py-4 sm:py-6 border-b border-white/50 bg-white/20 backdrop-blur-sm shadow-sm">
          <button onClick={handleExit} className="group flex items-center gap-3 text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white active:scale-95 px-5 py-3 rounded-2xl font-black text-sm transition-all shadow-md hover:shadow-lg border border-slate-100">
            Nazad
          </button>
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white shadow-xl flex items-center justify-center text-3xl mb-1 border-2 border-white/80">{activeGame.icon}</div>
            <h2 className="text-sm sm:text-lg font-black text-slate-800 tracking-tight">{activeGame.title}</h2>
          </div>
          <div className="w-24 hidden sm:block" />
        </div>
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-8 md:py-12 flex flex-col items-center">
          <div className="text-center mb-10 md:mb-16">
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-4">Spreman za igru? 🚀</h1>
            <p className="text-slate-500 text-lg md:text-xl font-bold">Odaberi nivo težine i pokaži koliko si vešt!</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 w-full max-w-6xl pb-10">
            {DIFFICULTY_ORDER.map(diff => {
              const cfg = DIFF_CONFIG[diff];
              const unlocked = isDiffUnlocked(diff, maxUnlocked);
              const done = completedInTier(diff, maxUnlocked);
              const allDone = done === 5;
              const theme = { easy: "emerald", medium: "amber", hard: "rose" }[diff];
              const emoji = { easy: "🌱", medium: "⚡", hard: "🔥" }[diff];
              return (
                <button key={diff} onClick={() => unlocked && handleDifficultySelect(diff)} disabled={!unlocked} className={`group relative flex flex-col rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 text-center transition-all duration-500 border-4 ${unlocked ? "bg-white hover:scale-[1.05] hover:-translate-y-2 active:scale-95 shadow-2xl border-white cursor-pointer" : "bg-slate-50/50 border-slate-200 opacity-60 cursor-not-allowed"}`}>
                  <div className={`w-28 h-28 md:w-36 md:h-36 mx-auto rounded-full flex items-center justify-center text-6xl md:text-8xl mb-8 ${unlocked ? "bg-slate-50" : "bg-slate-100"}`}>{unlocked ? emoji : "🔒"}</div>
                  <h3 className={`text-2xl md:text-3xl font-black mb-2 ${unlocked ? "text-slate-800" : "text-slate-400"}`}>{cfg.label}</h3>
                  <p className="text-slate-500 font-bold text-sm mb-8">{unlocked ? cfg.sublabel : cfg.lockMsg}</p>
                  <div className="mt-auto">
                    <div className="flex gap-2 justify-center mb-4">
                      {[1, 2, 3, 4, 5].map(i => <div key={i} className={`h-3 w-3 md:h-4 md:w-4 rounded-full border-2 ${i <= done ? `bg-${theme}-500 border-${theme}-200` : "bg-slate-100 border-slate-200"}`} />)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "playing" && activeGame && selectedDifficulty) {
    const cfg = DIFF_CONFIG[selectedDifficulty];
    const levelInTier = currentLevel - cfg.min + 1;
    return (
      <div className="fixed inset-0 z-[6000] bg-slate-50 flex flex-col animate-in fade-in duration-300 overflow-hidden">
        <div className="bg-white/90 backdrop-blur-md px-6 py-3 border-b border-slate-100 flex items-center justify-between shadow-sm relative z-10">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setScreen("difficulty-select")} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${activeGame.gradient} flex items-center justify-center text-xl shadow-md`}>{activeGame.icon}</div>
            <div>
              <h3 className="text-sm font-black text-slate-900 truncate">{activeGame.title}</h3>
              <div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black text-white ${cfg.badge}`}>{cfg.label}</span><span className="text-[10px] font-bold text-slate-400">{levelInTier}/5</span></div>
            </div>
          </div>
          <button
            onClick={handleExit}
            className="fixed top-4 right-6 z-[500] px-4 py-2 rounded-xl bg-rose-50 text-rose-600 font-black text-sm border-2 border-rose-100 shadow-sm hover:bg-rose-100 transition-colors"
          >
            Zatvori ✕
          </button>
        </div>
        <div className="flex-1 relative overflow-y-auto p-4 flex flex-col">
          {showNextLevel && (
            <div className="absolute inset-0 z-[120] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
              <div className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 animate-in zoom-in-95 duration-500 border-4 border-white/20 text-center">
                <div className="flex justify-center gap-4 mb-8">
                  {[1, 2, 3].map(s => <div key={s} className={`text-5xl md:text-7xl transition-all duration-700 ${s <= lastStars ? "text-yellow-400 animate-bounce" : "text-slate-200 grayscale scale-90"}`}>⭐</div>)}
                </div>
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 ${lastStars > 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>{lastStars > 0 ? "✨ Sjajno urađeno!" : "💪 Probaj ponovo!"}</div>
                <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mb-2">{lastStars > 0 ? "Nivo Završen!" : "Skoro si uspeo!"}</h2>
                <p className="text-slate-500 text-lg md:text-xl font-bold mb-8">
                  {lastStars > 0
                    ? `${isFemale ? 'Osvojila si' : 'Osvojio si'} ${lastScore} poena i ${lastStars === 1 ? 'jednu zvezdicu' : lastStars === 2 ? 'dve zvezdice' : 'tri zvezdice'}!`
                    : "Treba ti barem jedna zvezdica da pređeš na sledeći nivo."
                  }
                </p>
                <div className="flex flex-col gap-4">
                  {lastStars > 0 ? (
                    <button onClick={() => { setShowNextLevel(false); setCurrentLevel(prev => prev + 1); }} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-[2rem] p-5 font-black text-xl shadow-xl">Sledeći nivo ➜</button>
                  ) : (
                    <button onClick={() => setShowNextLevel(false)} className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-[2rem] p-5 font-black text-xl shadow-xl">Pokušaj ponovo 🔄</button>
                  )}
                  <button onClick={handleExit} className="text-slate-400 font-black text-xs uppercase tracking-widest py-2">Izlaz iz igre</button>
                </div>
              </div>
            </div>
          )}
          <div className="relative w-full flex-1 flex flex-col" key={`${selectedGame}-${selectedDifficulty}-level-${currentLevel}`}>
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
              </div>
            }>
              {selectedGame === "shapes" ? <ShapeMatchingGame childId={childId} level={currentLevel} onComplete={handleGameComplete} onClose={handleExit} autoStart={autoStart} gender={gender} /> :
                selectedGame === "memory" ? <MemoryGame childId={childId} level={currentLevel} onComplete={handleGameComplete} onClose={handleExit} autoStart={autoStart} gender={gender} /> :
                  selectedGame === "sound-to-image" ? <SoundToImageGame childId={childId} level={currentLevel} onComplete={handleGameComplete} onClose={handleExit} autoStart={autoStart} gender={gender} /> :
                    selectedGame === "social" ? <SocialCommunicationGame childId={childId} level={currentLevel} onComplete={handleGameComplete} onClose={handleExit} autoStart={autoStart} gender={gender} /> :
                      selectedGame === "social-story" ? <SocialStoryGame childId={childId} level={currentLevel} onComplete={handleGameComplete} onClose={handleExit} autoStart={autoStart} gender={gender} /> :
                        selectedGame === "emotions" ? <EmotionsGame childId={childId} level={currentLevel} onComplete={handleGameComplete} onClose={handleExit} autoStart={autoStart} gender={gender} /> :
                          <ColoringGame childId={childId} level={currentLevel} minLevel={cfg.min} maxLevel={cfg.max} onComplete={handleGameComplete} onClose={handleExit} autoStart={autoStart} gender={gender} />}
            </Suspense>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "tier-finished" && activeGame && selectedDifficulty) {
    const currentCfg = DIFF_CONFIG[selectedDifficulty];
    const nextDiff = selectedDifficulty === "easy" ? "medium" : selectedDifficulty === "medium" ? "hard" : null;
    const nextCfg = nextDiff ? DIFF_CONFIG[nextDiff] : null;
    return (
      <div className="fixed inset-0 z-[6000] flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-slate-50">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${activeGame.bgImage})` }} />
          <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/80 to-white/90 backdrop-blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-xl flex flex-col items-center animate-in zoom-in duration-500">
          <div className="relative mb-10"><div className="w-44 h-44 md:w-56 md:h-56 rounded-full bg-white shadow-2xl flex items-center justify-center text-8xl md:text-9xl border-8 border-white">{currentCfg.emoji}</div></div>
          <div className="mb-8">
            <h1 className="text-4xl md:text-7xl font-black text-slate-900 mb-4">Sjajno! ✨</h1>
            <p className="text-slate-500 text-lg md:text-xl font-bold">{isFemale ? 'Pobedila si' : 'Pobedio si'} svih 5 {currentCfg.label.toLowerCase()} nivoa u igri {activeGame.title}!</p>
          </div>
          <div className="w-full flex flex-col gap-4 max-w-md">
            {nextCfg && (
              <button onClick={() => { setSelectedDifficulty(nextDiff!); setCurrentLevel(getStartLevelForDiff(nextDiff!, getMaxUnlocked(selectedGame!))); setScreen("playing"); }} className="w-full bg-emerald-500 text-white rounded-3xl p-5 font-black text-xl shadow-xl">Igraj {nextCfg.label} ▶</button>
            )}
            <button onClick={() => setScreen("difficulty-select")} className="w-full px-8 py-5 rounded-3xl bg-white border-2 border-slate-100 text-slate-500 font-black">Nazad na težine</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "all-finished" && activeGame) {
    return (
      <div className="fixed inset-0 z-[6000] flex flex-col items-center justify-center p-4 sm:p-6 text-center overflow-hidden bg-slate-950">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-center opacity-20 blur-2xl" style={{ backgroundImage: `url(${activeGame.bgImage})` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/80 to-slate-950/95 backdrop-blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-3xl flex flex-col items-center animate-in zoom-in duration-1000">
          <div className="relative mb-6 group"><div className="text-6xl sm:text-9xl animate-bounce">🏆</div></div>
          <div className="mb-8 px-4 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 px-6 py-2 rounded-full shadow-2xl mb-6 border-2 border-white/20"><span className="text-white font-black text-xs sm:text-base uppercase tracking-widest">NAJBOLJI SI! 👑</span></div>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-white italic uppercase mb-2">BRAVO {childName}!</h1>
            <p className="text-white/60 text-sm sm:text-lg font-black uppercase tracking-widest">{isFemale ? 'Završila si' : 'Završio si'} SVE NIVOE u igri {activeGame.title}</p>
          </div>
          <button onClick={handleExit} className="bg-gradient-to-r from-yellow-400 to-amber-600 text-white rounded-3xl px-8 py-4 sm:px-12 sm:py-5 font-black text-xl sm:text-2xl shadow-xl shadow-yellow-500/20">Nazad na igre 🏠</button>
        </div>
      </div>
    );
  }

  return null;
}