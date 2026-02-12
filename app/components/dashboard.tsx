'use client'
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import PinModal from './PinModal';
import VisualPinPicker from './VisualPinPicker';
import { VISUAL_PIN_CATEGORIES } from '@/lib/visualPinData';


interface Child {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    notes: string;
    pin_code?: string;
}

export default function Dashboard() {
    const [children, setChildren] = useState<Child[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingChildId, setEditingChildId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'male',
        notes: '',
        pin_code: '',
    });

    const [showPinModal, setShowPinModal] = useState(false);
    const [selectedChild, setSelectedChild] = useState<Child | null>(null);
    const [isParentMode, setIsParentMode] = useState(false);
    const [showParentalGate, setShowParentalGate] = useState(false);
    const [userAnswer, setUserAnswer] = useState('');
    const [gateError, setGateError] = useState(false);
    const [globalPin, setGlobalPin] = useState<string[]>([]);
    const [childPinError, setChildPinError] = useState(false);
    const [showVisualPinPicker, setShowVisualPinPicker] = useState(false);

    const [isLoaded, setIsLoaded] = useState(false);
    const router = useRouter();

    const handleToggleParentMode = () => {
        if (isParentMode) {
            setIsParentMode(false);
        } else {
            setUserAnswer('');
            setGateError(false);
            setShowParentalGate(true);
        }
    };

    const verifyParentalGate = () => {
        const PARENT_PIN = "0000";

        if (userAnswer === PARENT_PIN) {
            setIsParentMode(true);
            setShowParentalGate(false);
            setGateError(false);
        } else {
            setGateError(true);
            setUserAnswer('');
        }
    };

    useEffect(() => {
        if (globalPin.length === 4 && !isParentMode) {
            const pinString = globalPin.join(',');
            const matchedChild = children.find(c => c.pin_code === pinString);
            if (matchedChild) {
                router.push(`/dashboard/child/${matchedChild.id}`);
            } else {
                setChildPinError(true);
                setTimeout(() => {
                    setGlobalPin([]);
                    setChildPinError(false);
                }, 1500);
            }
        }
    }, [globalPin, children, isParentMode, router]);

    const getUserData = () => {
        if (typeof window !== 'undefined') {
            return JSON.parse(localStorage.getItem('user') || '{}');
        }
        return {};
    };

    const user = getUserData();
    const userId = user?.id;

    async function fetchChildren(user_id: number) {
        if (!user_id) return;
        try {
            const response = await fetch(`/api/children?user_id=${user_id}`);
            const data = await response.json();
            setChildren(data);
        } catch (error) {
            console.error('Error fetching children:', error);
        }
    }

    useEffect(() => {
        if (userId) {
            fetchChildren(userId);
        }
        setIsLoaded(true);
    }, [userId]);

    async function addChild() {
        if (!userId) return;

        const response = await fetch('/api/children', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                user_id: userId
            }),
        });

        if (response.ok) {
            const data = await response.json();
            setChildren([...children, data]);
            setFormData({ first_name: '', last_name: '', date_of_birth: '', gender: 'male', notes: '', pin_code: '' });
            setShowModal(false);
        }
    }

    async function updateChild() {
        if (!editingChildId) return;

        const response = await fetch(`/api/children?child_id=${editingChildId}`, {
            method: "PUT",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                child_id: editingChildId
            })
        });

        if (response.ok) {
            const updatedChildren = children.map(child =>
                child.id === editingChildId ? { ...child, ...formData } : child
            );
            setChildren(updatedChildren);
            closeEditModal();
        }
    }

    async function deleteChild(child_id: number) {
        if (!confirm('Da li ste sigurni da želite da obrišete ovo dete?')) return;

        const response = await fetch(`/api/children?child_id=${child_id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
            setChildren(children.filter(child => child.id !== child_id));
        }
    }

    function openEditModal(child: Child) {
        setEditingChildId(child.id);
        setFormData({
            first_name: child.first_name,
            last_name: child.last_name,
            date_of_birth: child.date_of_birth.split('T')[0], // Extract date only
            gender: child.gender,
            notes: child.notes || '',
            pin_code: child.pin_code || '',
        });
        setShowEditModal(true);
    }

    function closeEditModal() {
        setShowEditModal(false);
        setEditingChildId(null);
        setFormData({ first_name: '', last_name: '', date_of_birth: '', gender: 'male', notes: '', pin_code: '' });
    }



    async function handleLogout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            if (typeof window !== 'undefined') {
                localStorage.removeItem('user');
            }
            router.push("/login");
        } catch (err) {
            console.error("logout error", err);
        }
    }

    if (!isLoaded) return null;

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-indigo-100 selection:text-indigo-900">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-2">
                            <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden">
                                <img src="/favicon.ico" alt="Bright Minds Logo" className="w-full h-full object-cover" />
                            </div>
                            <h1 className="text-xl font-bold text-slate-900 hidden sm:block">Bright <span className="text-indigo-600">Minds</span></h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-slate-500 hidden md:block">
                                Dobrodošli, <span className="text-slate-900">{user?.first_name || 'Roditelj'}</span>
                            </span>
                            <button
                                onClick={handleToggleParentMode}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${isParentMode
                                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                {isParentMode ? (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                                        Roditeljski režim
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        Dečiji režim
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center px-4 py-2 border border-slate-200 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                            >
                                Izloguj se
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Hero / Action Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            {isParentMode ? 'Upravljanje decom' : 'Dobrodošli! 🌟'}
                        </h2>
                        <p className="mt-1 text-slate-500 text-lg">
                            {isParentMode
                                ? 'Pratite napredak i aktivnosti vaših mališana na jednom mestu.'
                                : 'Unesi svoj tajni kod da započneš avanturu!'}
                        </p>
                    </div>
                    {isParentMode && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-bold rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            Dodaj dete
                        </button>
                    )}
                </div>

                {/* Child Mode: Visual PIN Selection */}
                {!isParentMode && (
                    <div className="flex flex-col items-center justify-center py-10">
                        <div className="w-full max-w-2xl bg-white rounded-[3rem] shadow-xl p-10 border border-slate-100">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-black text-slate-800">Izaberi svoj tajni kod</h3>
                                <p className="text-slate-500 font-bold">Pritisni sličice koje si izabrao sa roditeljem</p>
                            </div>

                            {childPinError && (
                                <div className="mb-8 p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-500 font-black text-center animate-shake">
                                    Netačne sličice! Probaj ponovo ❌
                                </div>
                            )}

                            <div className="flex justify-center gap-3 mb-10 overflow-hidden">
                                {[0, 1, 2, 3].map((idx) => {
                                    const category = VISUAL_PIN_CATEGORIES[idx];
                                    const selectedId = globalPin[idx];
                                    const selectedItem = selectedId ? category.items.find(i => i.id === selectedId) : null;

                                    return (
                                        <div
                                            key={idx}
                                            className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl border-4 transition-all duration-300 flex items-center justify-center overflow-hidden
                                                ${globalPin[idx]
                                                    ? 'bg-white border-indigo-500 scale-110 shadow-lg'
                                                    : childPinError ? 'border-red-200 bg-red-50 animate-shake' : (idx === globalPin.length ? 'border-indigo-300 ring-4 ring-indigo-50 animate-pulse' : 'border-slate-100 bg-slate-50')}`}
                                        >
                                            {selectedItem ? (
                                                <img src={selectedItem.image} alt={selectedItem.name} className="w-4/5 h-4/5 object-contain" />
                                            ) : (
                                                <div className="flex flex-col items-center opacity-30">
                                                    <span className="text-xs font-black uppercase text-slate-400">{VISUAL_PIN_CATEGORIES[idx].name[0]}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {globalPin.length < 4 ? (
                                <>
                                    <div className="text-center mb-6">
                                        <div className="inline-block px-6 py-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                                            {VISUAL_PIN_CATEGORIES[globalPin.length].name}
                                        </div>
                                        <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-tight">
                                            Izaberi {VISUAL_PIN_CATEGORIES[globalPin.length].name.toLowerCase()}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200">
                                        {VISUAL_PIN_CATEGORIES[globalPin.length].items.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => setGlobalPin([...globalPin, item.id])}
                                                className="aspect-square rounded-2xl bg-slate-50 border-2 border-slate-100 overflow-hidden flex items-center justify-center hover:border-indigo-400 hover:scale-110 active:scale-95 transition-all shadow-sm group"
                                            >
                                                <img src={item.image} alt={item.name} className="w-4/5 h-4/5 object-contain transition-transform group-hover:scale-110" />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-8 flex justify-center gap-4">
                                        <button
                                            onClick={() => setGlobalPin(globalPin.slice(0, -1))}
                                            disabled={globalPin.length === 0}
                                            className="px-6 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 disabled:opacity-30 text-sm"
                                        >
                                            Nazad
                                        </button>
                                        <button
                                            onClick={() => setGlobalPin([])}
                                            disabled={globalPin.length === 0}
                                            className="px-6 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 disabled:opacity-30 text-sm"
                                        >
                                            Resetuj
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center py-10 animate-pulse text-indigo-600">
                                    <div className="text-6xl mb-4">🔄</div>
                                    <p className="text-xl font-black italic">Proveravam tvoj kod...</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Grid of Children - Only shown in Parent Mode */}
                {isParentMode && (
                    children.length === 0 ? (
                        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
                            <div className="mx-auto w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Nema dodate dece</h3>
                            <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                                Započnite dodavanjem prvog deteta kako biste mogli da pratite njihove aktivnosti.
                            </p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="text-indigo-600 font-bold hover:text-indigo-700 inline-flex items-center"
                            >
                                Dodaj prvo dete <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {children.map((child) => (
                                <div
                                    key={child.id}
                                    className="group relative bg-white border border-slate-200 rounded-[2rem] p-6 pt-8 hover:shadow-2xl hover:shadow-indigo-50 hover:border-indigo-200 transition-all duration-300"
                                >
                                    <div className="absolute top-6 right-6 flex gap-2">
                                        <button
                                            onClick={() => openEditModal(child)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                            title="Izmeni"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => deleteChild(child.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                            title="Obriši"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>

                                    <div className="flex flex-col items-center text-center">
                                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl mb-4 ${child.gender === 'female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                            {child.gender === 'female' ? '👧' : '👦'}
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            {child.first_name} {child.last_name}
                                        </h3>
                                        <p className="text-slate-500 text-sm font-medium mt-1">
                                            {new Date(child.date_of_birth).toLocaleDateString('sr-RS', {
                                                day: 'numeric', month: 'long', year: 'numeric'
                                            })}
                                        </p>

                                        {child.notes && (
                                            <div className="mt-4 px-4 py-2 bg-slate-50 rounded-2xl text-xs text-slate-600 italic line-clamp-2">
                                                "{child.notes}"
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-3 w-full mt-8">
                                            <button
                                                onClick={() => {
                                                    if (child.pin_code) {
                                                        setSelectedChild(child);
                                                        setShowPinModal(true);
                                                    } else {
                                                        router.push(`/dashboard/child/${child.id}`);
                                                    }
                                                }}
                                                className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                Uđi
                                            </button>

                                            <button
                                                onClick={() => router.push(`/dashboard/monitor/${child.id}`)}
                                                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                Monitor
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </main>

            {/* Modal Overlay / Shared Modal Logic */}
            {(showModal || showEditModal) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" onClick={() => { setShowModal(false); closeEditModal(); }}></div>

                    <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
                        <div className="bg-indigo-600 px-8 py-8 relative">
                            <h2 className="text-2xl font-bold text-white">
                                {showEditModal ? 'Izmeni podatke' : 'Dodaj novo dete'}
                            </h2>
                            <p className="text-indigo-100 text-sm mt-1">Unesite osnovne informacije o detetu ispod.</p>
                            <button
                                onClick={() => { setShowModal(false); closeEditModal(); }}
                                className="absolute top-8 right-8 text-white/80 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l18 18" /></svg>
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Ime</label>
                                    <input
                                        type="text"
                                        placeholder="npr. Marko"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none text-slate-900 font-medium placeholder:text-slate-400"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Prezime</label>
                                    <input
                                        type="text"
                                        placeholder="npr. Marković"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none text-slate-900 font-medium placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Datum rođenja</label>
                                    <input
                                        type="date"
                                        value={formData.date_of_birth}
                                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none text-slate-900 font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Pol</label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none text-slate-900 font-medium appearance-none"
                                    >
                                        <option value="male">Muško</option>
                                        <option value="female">Žensko</option>
                                        <option value="other">Drugo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Napomena (opciono)</label>
                                <textarea
                                    placeholder="Dodatne informacije o potrebama ili interesovanjima..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none text-slate-900 font-medium placeholder:text-slate-400 resize-none"
                                />
                            </div>

                            <div className="space-y-4 p-4 bg-indigo-50 rounded-3xl border-2 border-indigo-100">
                                <label className="text-xs font-bold text-indigo-600 uppercase tracking-wider ml-1">Vizuelni PIN kod (Tajni simboli)</label>

                                {formData.pin_code ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="flex gap-2 mb-2">
                                            {formData.pin_code.split(',').map((id, idx) => {
                                                const category = VISUAL_PIN_CATEGORIES[idx];
                                                const item = category.items.find(i => i.id === id);
                                                return (
                                                    <div key={idx} className="w-12 h-12 bg-white rounded-xl overflow-hidden flex items-center justify-center border-2 border-indigo-200 shadow-sm p-1">
                                                        <img src={item?.image} alt={item?.name} className="w-full h-full object-contain" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setShowVisualPinPicker(true)}
                                            className="text-sm font-bold text-indigo-600 hover:underline"
                                        >
                                            Promeni simbole
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowVisualPinPicker(true)}
                                        className="w-full py-4 bg-white border-2 border-dashed border-indigo-300 text-indigo-500 font-bold rounded-2xl hover:bg-indigo-100 hover:border-indigo-400 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span>✨</span> Postavi vizuelni PIN kod
                                    </button>
                                )}
                                <p className="text-[10px] text-indigo-400 text-center uppercase font-black tracking-widest">Dete će koristiti ove simbole za prijavu</p>
                            </div>


                            <div className="flex gap-3 pt-4">

                                <button
                                    onClick={() => { setShowModal(false); closeEditModal(); }}
                                    className="flex-1 px-6 py-4 border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    Odustani
                                </button>
                                <button
                                    onClick={showEditModal ? updateChild : addChild}
                                    className="flex-1 px-6 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                                >
                                    {showEditModal ? 'Sačuvaj izmene' : 'Završi dodavanje'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showParentalGate && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowParentalGate(false)}></div>
                    <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200 border-4 border-indigo-100">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🔐</div>
                            <h3 className="text-xl font-bold text-slate-900">Roditeljska zaštita</h3>
                            <p className="text-slate-500 text-sm mt-1">Unesite roditeljsku lozinku za pristup.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Lozinka / PIN</label>
                                <input
                                    type="password"
                                    value={userAnswer}
                                    onChange={(e) => setUserAnswer(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && verifyParentalGate()}
                                    placeholder="••••"
                                    autoFocus
                                    className={`w-full px-6 py-4 bg-slate-100 border-2 rounded-2xl text-center text-2xl font-bold focus:outline-none transition-all text-slate-900 placeholder:text-slate-300 ${gateError ? 'border-red-400 animate-shake' : 'border-transparent focus:border-indigo-500'}`}
                                />
                            </div>
                        </div>

                        {gateError && <p className="text-red-500 text-sm font-bold text-center mt-2">Netačna lozinka! ❌</p>}

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowParentalGate(false)}
                                className="flex-1 py-4 text-slate-500 font-bold hover:text-slate-700"
                            >
                                Odustani
                            </button>
                            <button
                                onClick={verifyParentalGate}
                                className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                            >
                                Potvrdi
                            </button>
                        </div>
                        <p className="text-[10px] text-center text-slate-400 mt-4 leading-tight">Savet: Default lozinka je 0000. Možete je promeniti u podešavanjima profila.</p>
                    </div>
                </div>
            )}

            {selectedChild && (
                <PinModal
                    isOpen={showPinModal}
                    onClose={() => setShowPinModal(false)}
                    child={selectedChild}
                    onSuccess={(child) => {
                        router.push(`/dashboard/child/${child.id}`);
                    }}
                />
            )}
            {showVisualPinPicker && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setShowVisualPinPicker(false)}
                >
                    <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <VisualPinPicker
                            onComplete={(pin) => {
                                setFormData({ ...formData, pin_code: pin });
                                setShowVisualPinPicker(false);
                            }}
                            onClose={() => setShowVisualPinPicker(false)}
                            title="Izaberi 4 tajna simbola"
                            confirmButtonText="Ovo su moji simboli ✨"
                        />
                    </div>
                </div>
            )}
        </div>

    );
}