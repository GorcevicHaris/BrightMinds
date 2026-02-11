'use client';

import { useState } from 'react';
import { VISUAL_PIN_CATEGORIES, VisualPinItem } from '@/lib/visualPinData';

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

    const currentCategory = VISUAL_PIN_CATEGORIES[currentStep];

    return (
        <div className="relative flex flex-col items-center w-full max-w-lg mx-auto bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-2xl overflow-hidden max-h-[90vh]">
            {onClose && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="absolute top-4 right-4 p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-[70] bg-white/80 backdrop-blur-sm shadow-sm"
                    aria-label="Zatvori"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
            {title && <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight pr-8 text-center">{title}</h3>}

            {/* Selected Emojis Display */}
            <div className="flex justify-center gap-3 mb-8 w-full">
                {[0, 1, 2, 3].map((idx) => {
                    const item = selectedItems[idx];
                    return (
                        <div
                            key={idx}
                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-4 transition-all duration-300 flex items-center justify-center text-3xl
                ${item
                                    ? 'bg-indigo-600 border-indigo-200 scale-105 shadow-lg'
                                    : idx === currentStep ? 'border-indigo-400 bg-indigo-50 animate-pulse' : 'border-slate-100 bg-slate-50 opacity-50'}`}
                        >
                            {item ? item.emoji : ''}
                        </div>
                    );
                })}
            </div>

            {!isComplete ? (
                <>
                    <div className="text-center mb-6">
                        <span className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-black uppercase tracking-widest">
                            Korak {currentStep + 1} od 4
                        </span>
                        <h4 className="text-2xl font-black text-slate-800 mt-2">{currentCategory.name}</h4>
                        <p className="text-slate-500 font-bold text-sm">Izaberi svoju omiljenu sličicu</p>
                    </div>

                    {/* Grid of Options */}
                    <div className="grid grid-cols-5 gap-3 w-full overflow-y-auto p-2 min-h-[200px] max-h-[300px] scrollbar-thin scrollbar-thumb-slate-200">
                        {currentCategory.items.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleItemClick(item)}
                                className="aspect-square rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-3xl hover:bg-white hover:border-indigo-400 hover:scale-110 active:scale-95 transition-all shadow-sm"
                            >
                                {item.emoji}
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 flex gap-4 w-full">
                        <button
                            onClick={handleRemoveLast}
                            disabled={selectedItems.length === 0}
                            className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                        >
                            Obriši
                        </button>
                        <button
                            onClick={handleReset}
                            className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all text-sm"
                        >
                            Resetuj
                        </button>
                    </div>
                </>
            ) : (
                <div className="w-full animate-in zoom-in-95 duration-300">
                    <div className="text-center mb-6 py-6 bg-green-50 rounded-[2rem] border-4 border-green-100">
                        <div className="text-5xl mb-2">✨</div>
                        <h4 className="text-xl font-black text-green-700">Sve je spremno!</h4>
                    </div>

                    <button
                        onClick={() => onComplete(selectedItems.map(i => i.id).join(','))}
                        className="w-full py-5 bg-indigo-600 text-white font-black text-lg rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-95 transition-all uppercase tracking-widest"
                    >
                        {confirmButtonText || 'Sačuvaj'}
                    </button>

                    <button
                        onClick={handleReset}
                        className="w-full mt-4 py-2 text-slate-400 font-bold hover:text-slate-600 transition-all text-sm"
                    >
                        Promeni sličice
                    </button>
                </div>
            )}
        </div>
    );
}
