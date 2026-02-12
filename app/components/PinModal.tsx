'use client';

import { useState, useEffect } from 'react';
import { VISUAL_PIN_CATEGORIES } from '../../lib/visualPinData';

interface PinModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (child: any) => void;
    child: any;
}

export default function PinModal({ isOpen, onClose, onSuccess, child }: PinModalProps) {
    const [pin, setPin] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        if (pin.length === 4) {
            handleVerify();
        }
    }, [pin]);

    const handleItemClick = (itemId: string) => {
        if (pin.length < 4) {
            setPin([...pin, itemId]);
            setError(null);
        }
    };

    const handleDelete = () => {
        setPin(pin.slice(0, -1));
        setError(null);
    };

    const handleVerify = async () => {
        setIsVerifying(true);
        try {
            const response = await fetch('/api/children/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    child_id: child.id,
                    pin_code: pin.join(',')
                }),
            });

            const data = await response.json();

            if (response.ok) {
                onSuccess(data.child);
            } else {
                setError(data.error || 'Netačan kod');
                setPin([]);
                if (window.navigator && window.navigator.vibrate) {
                    window.navigator.vibrate(200);
                }
            }
        } catch (err) {
            setError('Greška pri proveri');
            setPin([]);
        } finally {
            setIsVerifying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose}></div>

            <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200 border-4 border-indigo-50">
                <div className="text-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-4xl mx-auto mb-4 border-4 border-slate-50 shadow-inner">
                        {child?.gender === 'female' ? '👧' : '👦'}
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Zdravo, {child?.first_name || 'drugaru'}!</h2>
                    <p className="text-slate-500 font-bold mt-1">Izaberi svoje tajne slike</p>
                </div>

                {/* Progress Indicators */}
                <div className="flex justify-center gap-3 mb-8">
                    {[0, 1, 2, 3].map((idx) => {
                        const itemId = pin[idx];
                        // Find item in its corresponding category
                        const item = itemId ? VISUAL_PIN_CATEGORIES[idx].items.find(i => i.id === itemId) : null;

                        return (
                            <div
                                key={idx}
                                className={`w-14 h-14 rounded-2xl border-4 transition-all duration-300 flex items-center justify-center overflow-hidden
                                    ${pin[idx]
                                        ? 'border-indigo-500 shadow-lg scale-110 item-bg'
                                        : error ? 'border-red-200 bg-red-50' : (idx === pin.length ? 'border-indigo-300 ring-4 ring-indigo-50 animate-pulse' : 'border-slate-100 bg-slate-50')}`}
                            >
                                {item ? (
                                    <img src={item.image} alt={item.name} className="w-4/5 h-4/5 object-contain" />
                                ) : (
                                    <div className="flex flex-col items-center opacity-30">
                                        <span className="text-[10px] font-black uppercase text-slate-400">{VISUAL_PIN_CATEGORIES[idx].name[0]}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {error && (
                    <div className="text-red-500 font-black text-center mb-6 animate-bounce flex items-center justify-center gap-2">
                        <span className="text-xl">❌</span> {error}
                    </div>
                )}

                {/* Visual PIN Selection */}
                <div className="flex flex-col items-center">
                    {pin.length < 4 ? (
                        <>
                            <div className="text-center mb-4">
                                <div className="inline-block px-6 py-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                                    {VISUAL_PIN_CATEGORIES[pin.length].name}
                                </div>
                                <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-tight">
                                    Izaberi {VISUAL_PIN_CATEGORIES[pin.length].name.toLowerCase()}
                                </p>
                            </div>

                            <div className="grid grid-cols-4 gap-3 h-[280px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200 w-full">
                                {VISUAL_PIN_CATEGORIES[pin.length].items.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleItemClick(item.id)}
                                        className="aspect-square rounded-2xl bg-slate-50 border-2 border-slate-100 overflow-hidden flex items-center justify-center hover:border-indigo-400 hover:scale-110 active:scale-95 transition-all shadow-sm group"
                                    >
                                        <img src={item.image} alt={item.name} className="w-4/5 h-4/5 object-contain transition-transform group-hover:scale-110" />
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleDelete}
                                disabled={pin.length === 0}
                                className="mt-6 w-full py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-xs uppercase tracking-widest border-b-4 border-slate-200 active:border-b-0 active:translate-y-1"
                            >
                                Obriši poslednju
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center py-10 animate-pulse text-indigo-600">
                            <div className="text-6xl mb-4">🔄</div>
                            <p className="text-xl font-black italic">Proveravam...</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm"
                >
                    Zatvori
                </button>
            </div>
        </div>
    );
}
