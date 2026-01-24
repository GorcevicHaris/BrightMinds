"use client";

import { useState } from "react";

interface GameProps {
  childId: number;
  level: number;
  onComplete: (score: number, duration: number, moodBefore?: string | null, moodAfter?: string | null) => void;
}

interface ColorZone {
  id: number;
  path: string;
  color: string | null;
  targetColor: string;
  stroke?: boolean;
}

const COLORS = [
  { name: "Crvena", value: "#EF4444" },
  { name: "Plava", value: "#3B82F6" },
  { name: "Zelena", value: "#10B981" },
  { name: "Žuta", value: "#FBBF24" },
  { name: "Narandžasta", value: "#F97316" },
  { name: "Ljubičasta", value: "#A855F7" },
  { name: "Roze", value: "#EC4899" },
  { name: "Braon", value: "#92400E" },
  { name: "Siva", value: "#6B7280" },
  { name: "Crna", value: "#1F2937" },
  { name: "Bela", value: "#F3F4F6" },
  { name: "Svetlo plava", value: "#60A5FA" },
];

const TEMPLATES = {
  1: [
    { id: 1, path: "M200,150 m-40,0 a40,40 0 1,0 80,0 a40,40 0 1,0 -80,0", targetColor: "#FBBF24" },
    { id: 2, path: "M200,90 L200,110 L210,110 L210,90 Z", targetColor: "#F97316" },
    { id: 3, path: "M260,150 L280,150 L280,160 L260,160 Z", targetColor: "#F97316" },
    { id: 4, path: "M200,190 L200,210 L210,210 L210,190 Z", targetColor: "#F97316" },
    { id: 5, path: "M120,150 L140,150 L140,160 L120,160 Z", targetColor: "#F97316" },
    { id: 6, path: "M235,115 L255,95 L260,105 L240,125 Z", targetColor: "#F97316" },
  ],
  2: [
    { id: 1, path: "M100,200 L100,320 L300,320 L300,200 Z", targetColor: "#EF4444" },
    { id: 2, path: "M80,200 L200,120 L320,200 Z", targetColor: "#92400E" },
    { id: 3, path: "M160,240 L160,320 L200,320 L200,240 Z", targetColor: "#3B82F6" },
    { id: 4, path: "M120,220 L120,260 L160,260 L160,220 Z", targetColor: "#60A5FA" },
    { id: 5, path: "M240,220 L240,260 L280,260 L280,220 Z", targetColor: "#60A5FA" },
    { id: 6, path: "M175,280 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0", targetColor: "#FBBF24" },
    { id: 7, path: "M140,240 L140,220 L180,220 L180,240 Z", targetColor: "#60A5FA" },
    { id: 8, path: "M190,140 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0", targetColor: "#6B7280" },
  ],
  3: [
    { id: 1, path: "M200,200 m-25,0 a25,25 0 1,0 50,0 a25,25 0 1,0 -50,0", targetColor: "#FBBF24" },
    { id: 2, path: "M200,145 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0", targetColor: "#EC4899" },
    { id: 3, path: "M238,167 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0", targetColor: "#EC4899" },
    { id: 4, path: "M238,233 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0", targetColor: "#EC4899" },
    { id: 5, path: "M200,255 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0", targetColor: "#EC4899" },
    { id: 6, path: "M162,233 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0", targetColor: "#EC4899" },
    { id: 7, path: "M162,167 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0", targetColor: "#EC4899" },
    { id: 8, path: "M195,260 L205,260 L205,350 L195,350 Z", targetColor: "#10B981" },
    { id: 9, path: "M195,280 Q160,290 140,310 L145,315 Q165,295 195,285 Z", targetColor: "#10B981" },
    { id: 10, path: "M205,300 Q240,310 260,330 L255,335 Q235,315 205,305 Z", targetColor: "#10B981" },
  ],
  4: [
    { id: 1, path: "M195,180 L205,180 L205,250 L195,250 Z", targetColor: "#1F2937" },
    { id: 2, path: "M198,170 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0", targetColor: "#1F2937" },
    { id: 3, path: "M150,150 Q120,180 140,220 Q160,200 170,180 Z", targetColor: "#A855F7" },
    { id: 4, path: "M155,160 Q135,180 145,210 Q160,195 165,185 Z", targetColor: "#EC4899" },
    { id: 5, path: "M250,150 Q280,180 260,220 Q240,200 230,180 Z", targetColor: "#A855F7" },
    { id: 6, path: "M245,160 Q265,180 255,210 Q240,195 235,185 Z", targetColor: "#EC4899" },
    { id: 7, path: "M150,240 Q130,270 155,300 Q175,280 180,260 Z", targetColor: "#3B82F6" },
    { id: 8, path: "M158,250 Q145,270 160,290 Q172,275 175,265 Z", targetColor: "#60A5FA" },
    { id: 9, path: "M250,240 Q270,270 245,300 Q225,280 220,260 Z", targetColor: "#3B82F6" },
    { id: 10, path: "M242,250 Q255,270 240,290 Q228,275 225,265 Z", targetColor: "#60A5FA" },
    { id: 11, path: "M190,165 L180,150 L185,148 L195,163 Z", targetColor: "#1F2937" },
    { id: 12, path: "M210,165 L220,150 L215,148 L205,163 Z", targetColor: "#1F2937" },
  ],
  5: [
    { id: 1, path: "M120,180 Q100,200 110,240 L150,240 Q140,200 120,180 Z", targetColor: "#6B7280" },
    { id: 2, path: "M280,180 Q300,200 290,240 L250,240 Q260,200 280,180 Z", targetColor: "#6B7280" },
    { id: 3, path: "M140,200 Q200,180 260,200 Q270,260 200,270 Q130,260 140,200 Z", targetColor: "#9CA3AF" },
    { id: 4, path: "M190,250 L195,250 Q195,320 190,340 L185,340 Q185,320 190,250 Z", targetColor: "#6B7280" },
    { id: 5, path: "M175,215 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0", targetColor: "#1F2937" },
    { id: 6, path: "M225,215 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0", targetColor: "#1F2937" },
    { id: 7, path: "M165,215 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0", targetColor: "#F3F4F6" },
    { id: 8, path: "M215,215 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0", targetColor: "#F3F4F6" },
    { id: 9, path: "M150,265 Q120,280 140,340 L160,340 Q150,300 150,265 Z", targetColor: "#9CA3AF" },
    { id: 10, path: "M250,265 Q280,280 260,340 L240,340 Q250,300 250,265 Z", targetColor: "#9CA3AF" },
    { id: 11, path: "M145,330 L145,370 L165,370 L165,330 Z", targetColor: "#6B7280" },
    { id: 12, path: "M175,330 L175,370 L195,370 L195,330 Z", targetColor: "#6B7280" },
    { id: 13, path: "M205,330 L205,370 L225,370 L225,330 Z", targetColor: "#6B7280" },
    { id: 14, path: "M235,330 L235,370 L255,370 L255,330 Z", targetColor: "#6B7280" },
    { id: 15, path: "M185,335 L190,350 L195,350 L192,340 Z", targetColor: "#F3F4F6" },
  ],

6: [
    { id: 1, path: "M100,200 Q120,160 180,160 Q240,160 260,200 Q240,240 180,240 Q120,240 100,200 Z", targetColor: "#F97316" }, // Telo
    { id: 2, path: "M260,180 L320,160 L300,200 L320,240 L260,220 Z", targetColor: "#FBBF24" }, // Rep
    { id: 3, path: "M180,140 L200,120 L220,140 L200,160 Z", targetColor: "#EF4444" }, // Peraja gornja
    { id: 4, path: "M180,260 L200,280 L220,260 L200,240 Z", targetColor: "#EF4444" }, // Peraja donja
    { id: 5, path: "M125,185 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0", targetColor: "#F3F4F6" }, // Oko belo
    { id: 6, path: "M125,185 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0", targetColor: "#1F2937" }, // Oko crno
    { id: 7, path: "M150,175 Q170,170 190,175", targetColor: "#FBBF24", stroke: true }, // Šara 1
    { id: 8, path: "M150,190 Q170,185 190,190", targetColor: "#FBBF24", stroke: true }, // Šara 2
    { id: 9, path: "M150,205 Q170,200 190,205", targetColor: "#FBBF24", stroke: true }, // Šara 3
    { id: 10, path: "M150,220 Q170,215 190,220", targetColor: "#FBBF24", stroke: true }, // Šara 4
    { id: 11, path: "M200,175 Q220,170 240,175", targetColor: "#FBBF24", stroke: true }, // Šara 5
    { id: 12, path: "M200,190 Q220,185 240,190", targetColor: "#FBBF24", stroke: true }, // Šara 6
    { id: 13, path: "M200,205 Q220,200 240,205", targetColor: "#FBBF24", stroke: true }, // Šara 7
    { id: 14, path: "M200,220 Q220,215 240,220", targetColor: "#FBBF24", stroke: true }, // Šara 8
    { id: 15, path: "M265,190 Q285,180 305,190", targetColor: "#F97316", stroke: true }, // Rep šara 1
    { id: 16, path: "M265,210 Q285,220 305,210", targetColor: "#F97316", stroke: true }, // Rep šara 2
  ],

  // NIVO 7 - Automobil (18 delova)
  7: [
    { id: 1, path: "M80,250 L80,280 L320,280 L320,250 L280,250 L280,220 L220,220 L200,200 L150,200 L130,220 L100,220 L100,250 Z", targetColor: "#EF4444" }, // Karoserija
    { id: 2, path: "M130,220 L150,200 L200,200 L220,220 Z", targetColor: "#60A5FA" }, // Vetrobran
    { id: 3, path: "M105,225 L105,250 L145,250 L145,225 Z", targetColor: "#60A5FA" }, // Prozor levi
    { id: 4, path: "M235,225 L235,250 L275,250 L275,225 Z", targetColor: "#60A5FA" }, // Prozor desni
    { id: 5, path: "M120,280 m-25,0 a25,25 0 1,0 50,0 a25,25 0 1,0 -50,0", targetColor: "#1F2937" }, // Točak levi spoljna
    { id: 6, path: "M120,280 m-15,0 a15,15 0 1,0 30,0 a15,15 0 1,0 -30,0", targetColor: "#6B7280" }, // Točak levi felna
    { id: 7, path: "M280,280 m-25,0 a25,25 0 1,0 50,0 a25,25 0 1,0 -50,0", targetColor: "#1F2937" }, // Točak desni spoljna
    { id: 8, path: "M280,280 m-15,0 a15,15 0 1,0 30,0 a15,15 0 1,0 -30,0", targetColor: "#6B7280" }, // Točak desni felna
    { id: 9, path: "M85,255 L95,255 L95,265 L85,265 Z", targetColor: "#FBBF24" }, // Far levi
    { id: 10, path: "M305,255 L315,255 L315,265 L305,265 Z", targetColor: "#FBBF24" }, // Far desni
    { id: 11, path: "M100,285 L110,285 L110,275 L100,275 Z", targetColor: "#EF4444" }, // Stop levi
    { id: 12, path: "M290,285 L300,285 L300,275 L290,275 Z", targetColor: "#EF4444" }, // Stop desni
    { id: 13, path: "M150,230 L160,230 L160,240 L150,240 Z", targetColor: "#1F2937" }, // Vrata kvaka leva
    { id: 14, path: "M240,230 L250,230 L250,240 L240,240 Z", targetColor: "#1F2937" }, // Vrata kvaka desna
    { id: 15, path: "M180,190 L200,170 L220,190 Z", targetColor: "#3B82F6" }, // Krov svetlo
    { id: 16, path: "M130,255 L140,255 L140,265 L130,265 Z", targetColor: "#6B7280" }, // Detalj 1
    { id: 17, path: "M260,255 L270,255 L270,265 L260,265 Z", targetColor: "#6B7280" }, // Detalj 2
    { id: 18, path: "M195,275 L205,275 L205,280 L195,280 Z", targetColor: "#1F2937" }, // Detalj 3
  ],

  // NIVO 8 - Mačka (20 delova)
  8: [
    { id: 1, path: "M150,120 L140,90 L165,100 Z", targetColor: "#F97316" }, // Uvo levo spoljna
    { id: 2, path: "M152,115 L148,95 L160,102 Z", targetColor: "#EC4899" }, // Uvo levo unutrašnja
    { id: 3, path: "M250,120 L260,90 L235,100 Z", targetColor: "#F97316" }, // Uvo desno spoljna
    { id: 4, path: "M248,115 L252,95 L240,102 Z", targetColor: "#EC4899" }, // Uvo desno unutrašnja
    { id: 5, path: "M140,140 Q200,120 260,140 Q270,190 200,200 Q130,190 140,140 Z", targetColor: "#F97316" }, // Glava
    { id: 6, path: "M170,160 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0", targetColor: "#10B981" }, // Oko levo
    { id: 7, path: "M230,160 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0", targetColor: "#10B981" }, // Oko desno
    { id: 8, path: "M165,160 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0", targetColor: "#1F2937" }, // Zenica leva
    { id: 9, path: "M225,160 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0", targetColor: "#1F2937" }, // Zenica desna
    { id: 10, path: "M190,175 L200,180 L210,175 Q205,185 200,187 Q195,185 190,175 Z", targetColor: "#EC4899" }, // Nos
    { id: 11, path: "M150,210 Q120,240 140,320 L170,320 Q160,270 150,210 Z", targetColor: "#F97316" }, // Telo levo
    { id: 12, path: "M250,210 Q280,240 260,320 L230,320 Q240,270 250,210 Z", targetColor: "#F97316" }, // Telo desno
    { id: 13, path: "M200,180 Q200,200 190,210", targetColor: "#1F2937", stroke: true }, // Brkovi levo 1
    { id: 14, path: "M200,185 Q185,195 175,200", targetColor: "#1F2937", stroke: true }, // Brkovi levo 2
    { id: 15, path: "M200,180 Q200,200 210,210", targetColor: "#1F2937", stroke: true }, // Brkovi desno 1
    { id: 16, path: "M200,185 Q215,195 225,200", targetColor: "#1F2937", stroke: true }, // Brkovi desno 2
    { id: 17, path: "M145,310 L150,360 L165,360 L165,315 Z", targetColor: "#F97316" }, // Noga leva prednja
    { id: 18, path: "M175,315 L175,360 L190,360 L185,320 Z", targetColor: "#F97316" }, // Noga leva zadnja
    { id: 19, path: "M210,320 L215,360 L230,360 L225,315 Z", targetColor: "#F97316" }, // Noga desna zadnja
    { id: 20, path: "M235,315 L235,360 L250,360 L255,310 Z", targetColor: "#F97316" }, // Noga desna prednja
  ],
};

export default function ColoringGame({ childId, level, onComplete }: GameProps) {
  const [zones, setZones] = useState<ColorZone[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0].value);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [moodBefore, setMoodBefore] = useState<string | null>(null);
  const [showMoodBefore, setShowMoodBefore] = useState(false);
  const [showMoodAfter, setShowMoodAfter] = useState(false);
  const [completedZones, setCompletedZones] = useState(0);

  const template = TEMPLATES[level as keyof typeof TEMPLATES] || TEMPLATES[1];

  const initializeGame = () => {
    const initialZones = template.map(t => ({
      ...t,
      color: null,
    }));
    setZones(initialZones);
    setCompletedZones(0);
  };

  const startGame = () => {
    setShowMoodBefore(true);
  };

  const handleMoodBeforeSelect = (mood: string) => {
    setMoodBefore(mood);
    setShowMoodBefore(false);
    setIsPlaying(true);
    setStartTime(Date.now());
    initializeGame();
  };

  const handleZoneClick = (zoneId: number) => {
    if (!isPlaying) return;

    setZones(prev => prev.map(zone => {
      if (zone.id === zoneId) {
        const wasColored = zone.color !== null;
        const newColor = selectedColor;
        
        if (!wasColored) {
          const newCompletedZones = completedZones + 1;
          setCompletedZones(newCompletedZones);
          
          if (newCompletedZones === template.length) {
            setIsPlaying(false);
            setTimeout(() => setShowMoodAfter(true), 1000);
          }
        }
        
        return { ...zone, color: newColor };
      }
      return zone;
    }));
  };

  const handleMoodAfterSelect = (mood: string) => {
    setShowMoodAfter(false);
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000 / 60) : 0;
    
    const baseScore = 300 + (template.length * 50);
    const timeBonus = Math.max(0, 500 - (duration * 10));
    const score = baseScore + timeBonus;
    
    onComplete(score, duration, moodBefore, mood);
  };

  const getLevelName = (lvl: number) => {
    const names = ["", "Sunce", "Kuća", "Cvijet", "Leptir", "Slon"];
    return names[lvl] || "Slika";
  };

  if (showMoodBefore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-3xl p-8 shadow-xl">
        <h2 className="text-3xl font-bold text-purple-700 mb-8">
          Kako se osećaš PRE igre?
        </h2>
        <div className="grid grid-cols-5 gap-6">
          {[
            { emoji: "😢", label: "Loše", value: "very_upset" },
            { emoji: "😕", label: "Nisu sjajno", value: "upset" },
            { emoji: "😐", label: "Okej", value: "neutral" },
            { emoji: "😊", label: "Dobro", value: "happy" },
            { emoji: "😄", label: "Super", value: "very_happy" },
          ].map((mood) => (
            <button
              key={mood.value}
              onClick={() => handleMoodBeforeSelect(mood.value)}
              className="flex flex-col items-center bg-white rounded-3xl p-6 hover:scale-110 transition-transform shadow-lg hover:shadow-2xl"
            >
              <span className="text-6xl mb-2">{mood.emoji}</span>
              <span className="text-lg font-semibold text-gray-700">{mood.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (showMoodAfter) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-green-100 via-yellow-100 to-orange-100 rounded-3xl p-8 shadow-xl">
        <h2 className="text-3xl font-bold text-green-700 mb-4">
          Kako se osećaš POSLE igre?
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Uspešno si obojio/la {getLevelName(level)}! 🎨
        </p>
        <div className="grid grid-cols-5 gap-6">
          {[
            { emoji: "😢", label: "Loše", value: "very_upset" },
            { emoji: "😕", label: "Nisu sjajno", value: "upset" },
            { emoji: "😐", label: "Okej", value: "neutral" },
            { emoji: "😊", label: "Dobro", value: "happy" },
            { emoji: "😄", label: "Super", value: "very_happy" },
          ].map((mood) => (
            <button
              key={mood.value}
              onClick={() => handleMoodAfterSelect(mood.value)}
              className="flex flex-col items-center bg-white rounded-3xl p-6 hover:scale-110 transition-transform shadow-lg hover:shadow-2xl"
            >
              <span className="text-6xl mb-2">{mood.emoji}</span>
              <span className="text-lg font-semibold text-gray-700">{mood.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!isPlaying && completedZones === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 rounded-3xl p-8 shadow-xl">
        <div className="text-center space-y-6">
          <h2 className="text-4xl font-bold text-purple-700">🎨 Bojenje</h2>
          <p className="text-3xl font-bold text-gray-800">{getLevelName(level)}</p>
          <p className="text-xl text-gray-700">Nivo {level} - {template.length} delova</p>
          <p className="text-lg text-gray-600 max-w-md">
            Izaberi boju i klikni na deo slike da ga obojiš! Možeš promeniti boju i posle ako želiš!
          </p>
          <div className="text-8xl mb-4">🖌️</div>
          <button
            onClick={startGame}
            className="px-12 py-4 text-2xl font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full hover:scale-110 transition-transform shadow-xl"
          >
            ▶️ Počni igru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-3xl p-8 shadow-2xl">
      <div className="flex justify-between items-center mb-8 bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold text-purple-700">
            {getLevelName(level)}
          </div>
          <div className="text-lg text-gray-600">
            Obojeno: {completedZones}/{template.length}
          </div>
        </div>
        {completedZones === template.length && !showMoodAfter && (
          <div className="text-2xl font-bold text-green-600 animate-bounce">
            🎉 Završeno!
          </div>
        )}
      </div>

      <div className="mb-8 bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🎨 Izaberi boju:</h3>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3">
          {COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              className={`aspect-square rounded-xl transition-all ${
                selectedColor === color.value
                  ? "scale-125 ring-4 ring-purple-500 shadow-xl"
                  : "hover:scale-110 shadow-md"
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-4 text-center">
          💡 Možeš kliknuti ponovo na već obojenu oblast da promeniš boju!
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-xl">
        <svg
          viewBox="0 0 400 400"
          className="w-full h-auto max-w-2xl mx-auto"
          style={{ maxHeight: "600px" }}
        >
          <rect width="400" height="400" fill="#F9FAFB" />
          
          {zones.map((zone) => (
            <path
              key={zone.id}
              d={zone.path}
              fill={zone.color || "#E5E7EB"}
              stroke="#1F2937"
              strokeWidth={zone.stroke ? 4 : 2}
              onClick={() => handleZoneClick(zone.id)}
              className="transition-all cursor-pointer hover:opacity-80 hover:stroke-purple-500"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}