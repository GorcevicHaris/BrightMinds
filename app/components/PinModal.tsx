'use client';

import { useState, useEffect } from 'react';
import { VISUAL_PIN_CATEGORIES } from '@/lib/visualPinData';

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
                setError(data.error || 'Netačan PIN kod');
                setPin([]);
                // Vibrate if supported
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

    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    const colors = [
        'bg-red-400', 'bg-blue-400', 'bg-green-400',
        'bg-yellow-400', 'bg-purple-400', 'bg-pink-400',
        'bg-orange-400', 'bg-teal-400', 'bg-indigo-400',
        '', 'bg-cyan-400', 'bg-rose-400'
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose}></div>

            <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
                <div className="text-center mb-8">
                    <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-5xl mx-auto mb-4 border-4 border-slate-50 shadow-inner">
                        {child.gender === 'female' ? '👧' : '👦'}
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Zdravo, {child.first_name}!</h2>
                    <p className="text-slate-500 font-bold mt-2 text-lg">Unesi svoj tajni kod</p>
                </div>

                {/* Visual PIN Selection */}
                <div className="flex flex-col items-center">
                    {pin.length < 4 ? (
                        <>
                            <div className="text-center mb-6">
                                <span className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-black uppercase tracking-widest">
                                    Korak {pin.length + 1} od 4
                                </span>
                                <h4 className="text-xl font-black text-slate-800 mt-2">
                                    {VISUAL_PIN_CATEGORIES[pin.length].name}
                                </h4>
                            </div>

                            <div className="grid grid-cols-5 gap-3 h-[300px] overflow-y-auto p-2 w-full">
                                {VISUAL_PIN_CATEGORIES[pin.length].items.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleItemClick(item.id)}
                                        className="aspect-square rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-3xl hover:bg-white hover:border-indigo-400 hover:scale-110 active:scale-95 transition-all shadow-sm"
                                    >
                                        {item.emoji}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleDelete}
                                disabled={pin.length === 0}
                                className="mt-6 w-full py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Obriši poslednje
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
                    className="w-full mt-8 py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                    Zatvori
                </button>
            </div>
        </div>
    );
}
