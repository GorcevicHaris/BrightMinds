'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { VISUAL_PIN_CATEGORIES } from '@/lib/visualPinData';

type LoginMode = 'child' | 'parent';

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<LoginMode>('child');

    // ── Parent login state ──
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [parentError, setParentError] = useState('');

    // ── Child login state ──
    const [childPin, setChildPin] = useState<string[]>([]);
    const [childPinError, setChildPinError] = useState(false);
    const [childLoading, setChildLoading] = useState(false);

    // ── Child PIN verification ──
    useEffect(() => {
        if (childPin.length === 4) {
            verifyChildPin();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [childPin]);

    const verifyChildPin = async () => {
        setChildLoading(true);
        const pinString = childPin.join(',');

        try {
            const res = await fetch('/api/children/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin_code: pinString }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                // Store child info for the session
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('childLogin', JSON.stringify(data.child));
                    // Unlock audio for the next page by creating a context now during user gesture
                    try {
                        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                        const ctx = new AudioCtx();
                        if (ctx.state === 'suspended') ctx.resume();
                        // Just a tiny "unlock" flag
                        sessionStorage.setItem('avatarAudioUnlocked', '1');
                    } catch (e) {
                        console.warn('Audio unlock failed', e);
                    }
                }
                router.push(`/dashboard/child/${data.child.id}`);
            } else {
                setChildPinError(true);
                setTimeout(() => {
                    setChildPin([]);
                    setChildPinError(false);
                }, 1500);
            }
        } catch {
            setChildPinError(true);
            setTimeout(() => {
                setChildPin([]);
                setChildPinError(false);
            }, 1500);
        } finally {
            setChildLoading(false);
        }
    };

    // ── Parent login ──
    const handleParentLogin = async () => {
        setIsLoading(true);
        setParentError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                }),
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('user', JSON.stringify(data.user));
                router.push('/dashboard');
            } else {
                setParentError(data.error || 'Pogrešan email ili lozinka');
                setIsLoading(false);
            }
        } catch {
            setParentError('Mrežna greška. Pokušajte ponovo.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col relative overflow-hidden selection:bg-indigo-100">

            {/* Decorative blobs */}
            <div className="absolute top-[-120px] left-[-120px] w-[400px] h-[400px] bg-indigo-200/30 rounded-full blur-[80px]" />
            <div className="absolute bottom-[-100px] right-[-100px] w-[350px] h-[350px] bg-purple-200/30 rounded-full blur-[80px]" />

            {/* Top branding bar */}
            <div className="relative z-10 flex items-center justify-center py-6 md:py-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg bg-white flex items-center justify-center">
                        <img src="/favicon.ico" alt="Logo" className="w-10 h-10 object-contain" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Bright <span className="text-indigo-600">Minds</span></h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Učimo kroz igru</p>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="relative z-10 flex-1 flex items-start md:items-center justify-center px-4 pb-10">
                <div className="w-full max-w-xl">

                    {/* Mode toggle tabs */}
                    <div className="flex bg-white rounded-2xl shadow-lg border border-slate-100 p-1.5 mb-6">
                        <button
                            onClick={() => { setMode('child'); setParentError(''); }}
                            className={`flex-1 py-4 rounded-xl font-black text-base transition-all duration-300 flex items-center justify-center gap-2
                                ${mode === 'child'
                                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <span className="text-2xl">🧒</span>
                            Ja sam dete
                        </button>
                        <button
                            onClick={() => { setMode('parent'); setChildPinError(false); setChildPin([]); }}
                            className={`flex-1 py-4 rounded-xl font-black text-base transition-all duration-300 flex items-center justify-center gap-2
                                ${mode === 'parent'
                                    ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-200'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <span className="text-2xl">👨‍🏫</span>
                            Roditelj / Učitelj
                        </button>
                    </div>

                    {/* ───────────────────────────────────── */}
                    {/* CHILD MODE: Visual emoji PIN login   */}
                    {/* ───────────────────────────────────── */}
                    {mode === 'child' && (
                        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="text-center mb-6">
                                <div className="text-5xl mb-3">🎮</div>
                                <h2 className="text-2xl font-black text-slate-900 mb-1">Unesi svoj tajni kod</h2>
                                <p className="text-slate-500 text-sm font-medium">Pritisni sličice koje si izabrao sa roditeljem</p>
                            </div>

                            {/* Error message */}
                            {childPinError && (
                                <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-500 font-black text-center text-sm">
                                    Netačan kod! Probaj ponovo ❌
                                </div>
                            )}

                            {/* PIN display slots */}
                            <div className="flex justify-center gap-3 mb-8">
                                {[0, 1, 2, 3].map((idx) => {
                                    const category = VISUAL_PIN_CATEGORIES[idx];
                                    const selectedId = childPin[idx];
                                    const selectedItem = selectedId ? category.items.find(i => i.id === selectedId) : null;

                                    return (
                                        <div
                                            key={idx}
                                            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-4 transition-all duration-300 flex items-center justify-center overflow-hidden
                                                ${childPin[idx]
                                                    ? 'bg-white border-indigo-500 scale-110 shadow-lg'
                                                    : childPinError
                                                        ? 'border-red-200 bg-red-50'
                                                        : idx === childPin.length
                                                            ? 'border-indigo-300 ring-4 ring-indigo-50 animate-pulse bg-indigo-50/30'
                                                            : 'border-slate-100 bg-slate-50'
                                                }`}
                                        >
                                            {selectedItem ? (
                                                <img src={selectedItem.image} alt={selectedItem.name} className="w-4/5 h-4/5 object-contain" />
                                            ) : (
                                                <div className="flex flex-col items-center opacity-30">
                                                    <span className="text-xs font-black uppercase text-slate-400">
                                                        {VISUAL_PIN_CATEGORIES[idx].name[0]}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Loading state when verifying */}
                            {childLoading ? (
                                <div className="flex flex-col items-center py-10 text-indigo-600">
                                    <div className="text-6xl mb-4 animate-bounce">🔄</div>
                                    <p className="text-xl font-black animate-pulse">Proveravam tvoj kod...</p>
                                </div>
                            ) : childPin.length < 4 ? (
                                <>
                                    {/* Category label */}
                                    <div className="text-center mb-4">
                                        <div className="inline-block px-5 py-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                                            {VISUAL_PIN_CATEGORIES[childPin.length].name}
                                        </div>
                                        <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-tight">
                                            Izaberi {VISUAL_PIN_CATEGORIES[childPin.length].name.toLowerCase()}
                                        </p>
                                    </div>

                                    {/* Item grid */}
                                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 h-[280px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200">
                                        {VISUAL_PIN_CATEGORIES[childPin.length].items.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => setChildPin([...childPin, item.id])}
                                                className="aspect-square rounded-2xl bg-slate-50 border-2 border-slate-100 overflow-hidden flex items-center justify-center hover:border-indigo-400 hover:scale-110 active:scale-95 transition-all shadow-sm group"
                                            >
                                                <img src={item.image} alt={item.name} className="w-4/5 h-4/5 object-contain transition-transform group-hover:scale-110" />
                                            </button>
                                        ))}
                                    </div>

                                    {/* Back / Reset buttons */}
                                    <div className="mt-6 flex justify-center gap-4">
                                        <button
                                            onClick={() => setChildPin(childPin.slice(0, -1))}
                                            disabled={childPin.length === 0}
                                            className="px-6 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 disabled:opacity-30 text-sm transition-all"
                                        >
                                            ← Nazad
                                        </button>
                                        <button
                                            onClick={() => setChildPin([])}
                                            disabled={childPin.length === 0}
                                            className="px-6 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 disabled:opacity-30 text-sm transition-all"
                                        >
                                            Resetuj
                                        </button>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    )}

                    {/* ───────────────────────────────────── */}
                    {/* PARENT MODE: Email & password login  */}
                    {/* ───────────────────────────────────── */}
                    {mode === 'parent' && (
                        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300 relative">

                            {/* Loading overlay */}
                            {isLoading && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-[2.5rem]">
                                    <div className="w-20 h-20 bg-white rounded-3xl shadow-2xl flex items-center justify-center p-4 animate-bounce mb-6">
                                        <img src="/favicon.ico" alt="Logo" className="w-full h-full object-contain animate-pulse" />
                                    </div>
                                    <p className="text-xl font-black text-slate-800 animate-pulse">Prijavljivanje...</p>
                                    <p className="text-slate-400 text-sm mt-1">Molimo sačekajte</p>
                                </div>
                            )}

                            <div className="text-center mb-8">
                                <div className="text-5xl mb-3">🔐</div>
                                <h2 className="text-2xl font-black text-slate-900 mb-1">Prijava za roditelje</h2>
                                <p className="text-slate-500 text-sm font-medium">Unesite vaš email i lozinku</p>
                            </div>

                            {/* Error banner */}
                            {parentError && (
                                <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-600 font-bold text-sm text-center">
                                    {parentError}
                                </div>
                            )}

                            <div className="space-y-5">
                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            disabled={isLoading}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none text-slate-900 font-medium placeholder:text-slate-300 disabled:opacity-50"
                                            placeholder="vas@email.com"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Lozinka</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && handleParentLogin()}
                                            disabled={isLoading}
                                            className="w-full pl-12 pr-14 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none text-slate-900 font-medium placeholder:text-slate-300 disabled:opacity-50"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Submit */}
                                <button
                                    onClick={handleParentLogin}
                                    disabled={isLoading || !formData.email || !formData.password}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {isLoading ? 'Prijavljivanje...' : 'Prijavi se'}
                                </button>
                            </div>

                            {/* Register link */}
                            <p className="text-center text-sm text-slate-500 mt-6">
                                Nemate nalog?{' '}
                                <a href="/register" className="text-indigo-600 hover:text-indigo-700 font-bold">
                                    Registrujte se
                                </a>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom branding */}
            <div className="relative z-10 text-center pb-6">
                <p className="text-slate-400 text-xs font-medium">© 2026 Bright Minds • Napravljeno sa ❤️</p>
            </div>
        </div>
    );
}