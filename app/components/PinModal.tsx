'use client'
import { useState, useEffect } from 'react';

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

    const handleNumberClick = (num: string) => {
        if (pin.length < 4) {
            setPin([...pin, num]);
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
                    pin_code: pin.join('')
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

                {/* PIN Dots */}
                <div className="flex justify-center gap-4 mb-8">
                    {[0, 1, 2, 3].map((idx) => (
                        <div
                            key={idx}
                            className={`w-12 h-12 rounded-2xl border-4 transition-all duration-200 flex items-center justify-center text-3xl
                                ${pin[idx]
                                    ? 'bg-indigo-600 border-indigo-200 scale-110 shadow-lg'
                                    : error ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50'}`}
                        >
                            {pin[idx] && <div className="w-4 h-4 rounded-full bg-white animate-pulse"></div>}
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="text-red-500 font-black text-center mb-6 animate-bounce">
                        {error} ❌
                    </div>
                )}

                {/* Number Pad */}
                <div className="grid grid-cols-3 gap-4">
                    {numbers.map((num, idx) => {
                        if (num === '') return <div key={idx}></div>;

                        const isDelete = num === '⌫';
                        return (
                            <button
                                key={idx}
                                onClick={isDelete ? handleDelete : () => handleNumberClick(num)}
                                disabled={isVerifying}
                                className={`h-20 rounded-3xl text-3xl font-black text-white shadow-lg active:scale-90 transition-all duration-100 flex items-center justify-center
                                    ${colors[idx]} hover:brightness-110 active:brightness-90
                                    ${isDelete ? 'bg-slate-400' : ''}`}
                            >
                                {num}
                            </button>
                        );
                    })}
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
