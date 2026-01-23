"use client";

import { useState, useEffect } from "react";

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
  stroke?:boolean;
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
];

const TEMPLATES = {
  1: [ // Jednostavno drvo
    { id: 1, path: "M150,200 L150,300 L180,300 L180,200 Z", targetColor: "#92400E" }, // Stablo
    { id: 2, path: "M80,100 Q165,50 250,100 L250,220 Q165,170 80,220 Z", targetColor: "#10B981" }, // Krošnja
  ],
  2: [ // Kuća
    { id: 1, path: "M100,200 L100,350 L300,350 L300,200 Z", targetColor: "#EF4444" }, // Zid
    { id: 2, path: "M50,200 L200,100 L350,200 Z", targetColor: "#92400E" }, // Krov
    { id: 3, path: "M170,250 L170,350 L230,350 L230,250 Z", targetColor: "#3B82F6" }, // Vrata
  ],
  3: [ // Cvijet
    { id: 1, path: "M200,200 m-30,0 a30,30 0 1,0 60,0 a30,30 0 1,0 -60,0", targetColor: "#EC4899" }, // Centar
    { id: 2, path: "M200,170 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0", targetColor: "#FBBF24" }, // Latica 1
    { id: 3, path: "M230,200 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0", targetColor: "#FBBF24" }, // Latica 2
    { id: 4, path: "M200,230 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0", targetColor: "#FBBF24" }, // Latica 3
    { id: 5, path: "M170,200 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0", targetColor: "#FBBF24" }, // Latica 4
    { id: 6, path: "M200,240 L200,350", targetColor: "#10B981", stroke: true }, // Stabljika
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
      if (zone.id === zoneId && zone.color === null) {
        const newCompletedZones = completedZones + 1;
        setCompletedZones(newCompletedZones);
        
        // Proveri da li je završeno
        if (newCompletedZones === template.length) {
          setIsPlaying(false);
          setTimeout(() => setShowMoodAfter(true), 1000);
        }
        
        return { ...zone, color: selectedColor };
      }
      return zone;
    }));
  };

  const handleMoodAfterSelect = (mood: string) => {
    setShowMoodAfter(false);
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    
    // Bodovanje: brže = više poena
    const baseScore = 500;
    const timeBonus = Math.max(0, 300 - duration);
    const score = baseScore + timeBonus;
    
    onComplete(score, duration, moodBefore, mood);
  };

  const isCompleted = completedZones === template.length && isPlaying;

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
          Uspešno si obojio/la celu sliku! 🎨
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
          <p className="text-xl text-gray-700">Nivo {level}</p>
          <p className="text-lg text-gray-600 max-w-md">
            Izaberi boju i klikni na deo slike da ga obojiš!
          </p>
          <div className="text-6xl mb-4">🖌️</div>
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
      {/* Header */}
      <div className="flex justify-between items-center mb-8 bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg">
        <div className="text-2xl font-bold text-purple-700">
          Obojeno: {completedZones}/{template.length}
        </div>
        {isCompleted && (
          <div className="text-2xl font-bold text-green-600 animate-bounce">
            🎉 Završeno!
          </div>
        )}
      </div>

      {/* Color Palette */}
      <div className="mb-8 bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🎨 Izaberi boju:</h3>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
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
      </div>

      {/* Canvas */}
      <div className="bg-white rounded-3xl p-8 shadow-xl">
        <svg
          viewBox="0 0 400 400"
          className="w-full h-auto max-w-2xl mx-auto"
          style={{ maxHeight: "500px" }}
        >
          {/* Background */}
          <rect width="400" height="400" fill="#F9FAFB" />
          
          {/* Coloring zones */}
          {zones.map((zone) => (
            <path
              key={zone.id}
              d={zone.path}
              fill={zone.color || "#E5E7EB"}
              stroke="#1F2937"
              strokeWidth={zone.stroke ? 4 : 2}
              onClick={() => handleZoneClick(zone.id)}
              className={`transition-all cursor-pointer ${
                zone.color ? "" : "hover:opacity-80"
              }`}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}