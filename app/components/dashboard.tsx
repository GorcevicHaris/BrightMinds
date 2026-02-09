'use client'
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createFingerprintCredential } from '@/lib/webauthn';

interface Child {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    notes: string;
    fingerprint_id?: string;
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
        fingerprint_id: '',
    });
    const [fingerprintStatus, setFingerprintStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const [fingerprintError, setFingerprintError] = useState<string>('');


    const [isLoaded, setIsLoaded] = useState(false);
    const router = useRouter();

    // Safely get user data
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

        // Validacija fingerprinta
        if (!formData.fingerprint_id) {
            setFingerprintError('Molimo skenirajte prst deteta pre nego što nastavite');
            setFingerprintStatus('error');
            return;
        }

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
            setFormData({ first_name: '', last_name: '', date_of_birth: '', gender: 'male', notes: '', fingerprint_id: '' });
            setFingerprintStatus('idle');
            setFingerprintError('');
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
            fingerprint_id: child.fingerprint_id || '',
        });
        setShowEditModal(true);
    }

    function closeEditModal() {
        setShowEditModal(false);
        setEditingChildId(null);
        setFormData({ first_name: '', last_name: '', date_of_birth: '', gender: 'male', notes: '', fingerprint_id: '' });
        setFingerprintStatus('idle');
        setFingerprintError('');
    }

    async function handleFingerprintScan() {
        if (!formData.first_name || !formData.last_name) {
            setFingerprintError('Molimo unesite ime i prezime pre skeniranja fingerprinta');
            return;
        }

        setFingerprintStatus('scanning');
        setFingerprintError('');

        try {
            const childFullName = `${formData.first_name} ${formData.last_name}`;
            const fingerprintId = await createFingerprintCredential(childFullName);

            setFormData({ ...formData, fingerprint_id: fingerprintId });
            setFingerprintStatus('success');
        } catch (error: any) {
            console.error('Fingerprint scan error:', error);
            setFingerprintStatus('error');
            setFingerprintError(error.message || 'Greška pri skeniranju fingerprinta');
        }
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
                                <img src="/logo.ico" alt="Bright Minds Logo" className="w-full h-full object-cover" />
                            </div>
                            <h1 className="text-xl font-bold text-slate-900 hidden sm:block">Bright <span className="text-indigo-600">Minds</span></h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-slate-500 hidden md:block">
                                Dobrodošli, <span className="text-slate-900">{user?.first_name || 'Roditelj'}</span>
                            </span>
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
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Upravljanje decom</h2>
                        <p className="mt-1 text-slate-500 text-lg">Pratite napredak i aktivnosti vaših mališana na jednom mestu.</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-bold rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        Dodaj dete
                    </button>
                </div>

                {/* Grid of Children */}
                {children.length === 0 ? (
                    <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
                        <div className="mx-auto w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Nema dodate dece</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Započnite dodavanjem prvog deteta kako biste mogli da pratite njihove aktivnosti.</p>
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
                                            onClick={() => router.push(`/dashboard/child/${child.id}`)}
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

                            {/* Fingerprint Skeniranje - Samo za novo dete */}
                            {!showEditModal && (
                                <div className="space-y-3 pt-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                                        Fingerprint ID (obavezno)
                                    </label>

                                    <button
                                        type="button"
                                        onClick={handleFingerprintScan}
                                        disabled={fingerprintStatus === 'scanning' || fingerprintStatus === 'success'}
                                        className={`w-full px-6 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-3 ${fingerprintStatus === 'success'
                                            ? 'bg-green-50 text-green-700 border-2 border-green-200'
                                            : fingerprintStatus === 'scanning'
                                                ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-200 animate-pulse'
                                                : 'bg-slate-50 text-slate-700 border-2 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                            }`}
                                    >
                                        {fingerprintStatus === 'scanning' && (
                                            <>
                                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Skenirajte prst...
                                            </>
                                        )}
                                        {fingerprintStatus === 'success' && (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                                </svg>
                                                Fingerprint uspešno skeniran
                                            </>
                                        )}
                                        {fingerprintStatus === 'idle' && (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                                                </svg>
                                                Skeniraj prst deteta
                                            </>
                                        )}
                                        {fingerprintStatus === 'error' && (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                                                </svg>
                                                Pokušaj ponovo
                                            </>
                                        )}
                                    </button>

                                    {fingerprintError && (
                                        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>{fingerprintError}</span>
                                        </div>
                                    )}
                                </div>
                            )}

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
        </div>
    );
}