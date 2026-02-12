'use client';

import { useState } from 'react';
import { VISUAL_PIN_CATEGORIES, VisualPinItem } from '../../lib/visualPinData';

interface VisualPinPickerProps {
    onComplete: (pin: string) => void;
    onClose?: () => void;
    title?: string;
    confirmButtonText?: string;
}

export default function VisualPinPicker({ onComplete, onClose, title, confirmButtonText }: VisualPinPickerProps) {
    const [selectedItems, setSelectedItems] = useState<VisualPinItem[]>([]);
    const [currentStep, setCurrentStep] = useState(0);

    const handleItemClick = (item: VisualPinItem) => {
        const newSelected = [...selectedItems, item];
        setSelectedItems(newSelected);

        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleReset = () => {
        setSelectedItems([]);
        setCurrentStep(0);
    };

    const handleRemoveLast = () => {
        if (selectedItems.length > 0) {
            const newSelected = selectedItems.slice(0, -1);
            setSelectedItems(newSelected);
            setCurrentStep(newSelected.length);
        }
    };

    const isComplete = selectedItems.length === 4;

    const currentCategory = VISUAL_PIN_CATEGORIES[currentStep] || VISUAL_PIN_CATEGORIES[0];

    return (
        <div className="relative flex flex-col items-center w-full max-w-lg mx-auto bg-white rounded-[3rem] p-6 sm:p-10 shadow-2xl overflow-hidden max-h-[95vh] border-8 border-indigo-50/50">
            <style jsx>{`
                @keyframes float {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-10px) rotate(2deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }
                .floating-icon {
                    animation: float 4s ease-in-out infinite;
                }
                .item-bg {
                    background: radial-gradient(circle at center, #e0f2fe 0%, #bae6fd 100%);
                }
            `}</style>

            {onClose && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="absolute top-6 right-6 p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all z-[70] bg-white/80 backdrop-blur-sm shadow-sm"
                    aria-label="Zatvori"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            {/* Header info */}
            <div className="text-center w-full mb-8">
                {title && <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2 tracking-wide">{title}</h3>}
                <div className="flex justify-center items-center gap-2">
                    {[0, 1, 2, 3].map((step) => (
                        <div
                            key={step}
                            className={`h-2 rounded-full transition-all duration-500 ${step === currentStep ? 'w-10 bg-indigo-600' : (step < currentStep ? 'w-3 bg-indigo-200' : 'w-3 bg-slate-200')}`}
                        />
                    ))}
                </div>
            </div>

            {/* Selected Images Display */}
            <div className="flex justify-center gap-3 mb-8 w-full">
                {[0, 1, 2, 3].map((idx) => {
                    const item = selectedItems[idx];
                    return (
                        <div
                            key={idx}
                            className={`w-16 h-16 sm:w-24 sm:h-24 rounded-3xl border-4 transition-all duration-300 flex items-center justify-center overflow-hidden item-bg
                ${item
                                    ? 'border-indigo-500 shadow-xl scale-105 z-10'
                                    : idx === currentStep ? 'border-indigo-400 ring-8 ring-indigo-50 animate-pulse' : 'border-slate-100 opacity-40'}`}
                        >
                            {item ? (
                                <img src={item.image} alt={item.name} className="w-4/5 h-4/5 object-contain floating-icon" />
                            ) : (
                                <div className="flex flex-col items-center">
                                    <span className="text-xl font-black text-indigo-300 opacity-40 uppercase mb-1">{VISUAL_PIN_CATEGORIES[idx].name[0]}</span>
                                    <span className="text-xs font-black text-indigo-300 opacity-40 uppercase tracking-tighter whitespace-nowrap">{VISUAL_PIN_CATEGORIES[idx].name}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {!isComplete ? (
                <>
                    <div className="text-center mb-6">
                        <div className="inline-block px-10 py-3 bg-indigo-600 text-white rounded-[2rem] text-lg font-black uppercase tracking-widest shadow-xl shadow-indigo-200 transform -rotate-1">
                            {currentCategory.name}
                        </div>
                        <p className="text-slate-400 font-extrabold text-sm mt-4 uppercase tracking-wider">Korak {currentStep + 1} od 4: Izaberi {currentCategory.name.toLowerCase()}</p>
                    </div>

                    {/* Grid of Options - 4 columns for LARGER images */}
                    <div className="grid grid-cols-4 gap-4 w-full overflow-y-auto p-2 min-h-[350px] max-h-[450px] pr-2 pb-6">
                        {currentCategory.items.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleItemClick(item)}
                                className="group relative aspect-square rounded-[2rem] item-bg border-4 border-white shadow-md hover:border-indigo-400 hover:scale-110 active:scale-90 transition-all z-10"
                            >
                                <div className="w-full h-full flex items-center justify-center p-2">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-4/5 h-4/5 object-contain transition-all group-hover:drop-shadow-2xl"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="absolute inset-x-0 -bottom-1 bg-indigo-600 py-1 opacity-0 group-hover:opacity-100 transition-all rounded-b-[1.8rem] transform translate-y-2 group-hover:translate-y-0">
                                    <span className="text-[10px] text-white font-black uppercase truncate px-1 block text-center tracking-tighter">{item.name}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 flex gap-4 w-full">
                        <button
                            onClick={handleRemoveLast}
                            disabled={selectedItems.length === 0}
                            className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all text-sm uppercase tracking-widest disabled:opacity-50 border-b-4 border-slate-200 active:border-b-0 active:translate-y-1"
                        >
                            Nazad
                        </button>
                        <button
                            onClick={handleReset}
                            className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all text-sm uppercase tracking-widest border-b-4 border-slate-200 active:border-b-0 active:translate-y-1"
                        >
                            Resetuj
                        </button>
                    </div>
                </>
            ) : (
                <div className="w-full animate-in zoom-in-95 fade-in duration-500">
                    <div className="text-center mb-8 py-12 bg-indigo-50/50 rounded-[3rem] border-8 border-indigo-100 relative overflow-hidden shadow-inner">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-gradient-x" />
                        <div className="text-7xl mb-6 animate-bounce">🎨</div>
                        <h4 className="text-3xl font-black text-indigo-900 leading-tight">Bravo!<br /><span className="text-indigo-600">To je tvoj tajni kod</span></h4>
                    </div>

                    <button
                        onClick={() => onComplete(selectedItems.map(i => i.id).join(','))}
                        className="w-full py-7 bg-indigo-600 text-white font-black text-2xl rounded-[2.5rem] hover:bg-indigo-700 shadow-xl shadow-indigo-200 active:scale-95 transition-all uppercase tracking-widest border-b-8 border-indigo-800"
                    >
                        {confirmButtonText || 'Sačuvaj Kod'}
                    </button>

                    <button
                        onClick={handleReset}
                        className="w-full mt-8 py-2 text-slate-400 font-black hover:text-indigo-500 transition-all text-sm uppercase tracking-widest"
                    >
                        Promeni slike
                    </button>
                </div>
            )}
        </div>
    );
}
