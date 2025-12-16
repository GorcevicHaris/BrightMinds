'use client'
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Child {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    notes: string;
}

export default function Dashboard() {
    const [children, setChildren] = useState<Child[]>([]);
    const [activeChildId, setActiveChildId] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingChildId, setEditingChildId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'male',
        notes: '',
    });
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id;
    const router = useRouter();
    console.log(userId, "id usera")

    async function addChild() {
        const response = await fetch('/api/children', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                user_id: userId
            }),
        });
        console.log(response, "response");
        if (!response.ok) {
            const error = await response.json();
            console.error('Error:', error);
            return;
        }
        const data = await response.json();
        console.log(data, "data");
        setChildren([...children, data]);
        setFormData({ first_name: '', last_name: '', date_of_birth: '', gender: 'male', notes: '' });
        setShowModal(false);
    }

    async function fetchChildren(user_id: number) {
        const response = await fetch(`/api/children?user_id=${user_id}`);
        const data = await response.json();
        console.log(data, "data");
        setChildren(data);
    }

    useEffect(() => {
        fetchChildren(userId);
    }, [userId]);

    async function deleteChild(child_id: number) {
        const response = await fetch(`/api/children?child_id=${child_id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        })
        if (response.ok) {
            const filteredChildren = children.filter(child => child.id !== child_id)
            setChildren(filteredChildren)
        } else {
            alert("greska")
        }
    }

    function openEditModal(child: Child) {
        setEditingChildId(child.id);
        setFormData({
            first_name: child.first_name,
            last_name: child.last_name,
            date_of_birth: child.date_of_birth,
            gender: child.gender,
            notes: child.notes,
        });
        setShowEditModal(true);
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
        })
        if (response.ok) {
            const updatedChildren = children.map(child => child.id == editingChildId ? { ...child, ...formData } : child)
            setChildren(updatedChildren)
            setShowEditModal(false)
            setEditingChildId(null);
            setFormData({ first_name: '', last_name: '', date_of_birth: '', gender: 'male', notes: '' });
        } else {
            console.log("Greska")
        }
    }

    function closeEditModal() {
        setShowEditModal(false);
        setEditingChildId(null);
        setFormData({ first_name: '', last_name: '', date_of_birth: '', gender: 'male', notes: '' });
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Dashboard roditelja</h1>

                {/* Dugme Dodaj dete */}
                <div className="flex justify-end mb-6">
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition"
                    >
                        Dodaj dete
                    </button>
                </div>

                {/* Lista dece */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {children.map((child) => (
                        <div
                            key={child.id}
                            className="bg-white shadow-md rounded p-4 flex flex-col justify-between hover:shadow-lg transition"
                        >
                            <div>
                                <h2 className="text-xl font-semibold">
                                    {child.first_name} {child.last_name}
                                </h2>
                                <p className="text-gray-500 text-sm">
                                    Datum rođenja: {child.date_of_birth}
                                </p>
                                <p className="text-gray-500 text-sm">
                                    Napomena: {child.notes}
                                </p>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    onClick={() => router.push(`/dashboard/child/${child.id}`)}
                                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition"
                                >
                                    Uđi
                                </button>
                                <button
                                    onClick={() => openEditModal(child)}
                                    className="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500 transition"
                                >
                                    Izmeni
                                </button>
                                <button
                                    onClick={() => deleteChild(child.id)}
                                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                                >
                                    Obriši
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Modal za dodavanje deteta */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
                            <h2 className="text-2xl font-bold mb-4 text-gray-800">Dodaj novo dete</h2>
                            <input
                                type="text"
                                placeholder="Ime"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full mb-3 p-2 border rounded placeholder-gray-400 text-black"
                            />
                            <input
                                type="text"
                                placeholder="Prezime"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full mb-3 p-2 border rounded placeholder-gray-400 text-black"
                            />
                            <input
                                type="date"
                                value={formData.date_of_birth}
                                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                className="w-full mb-3 p-2 border rounded placeholder-gray-400 text-black"
                            />
                            <textarea
                                placeholder='Napomena'
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full mb-3 p-2 border rounded placeholder-gray-400 text-black"
                            />
                            <select
                                value={formData.gender}
                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                className="w-full mb-4 p-2 border rounded placeholder-gray-400 text-black"
                            >
                                <option value="male">Muško</option>
                                <option value="female">Žensko</option>
                                <option value="other">Ostalo</option>
                            </select>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 transition"
                                >
                                    Odustani
                                </button>
                                <button
                                    onClick={addChild}
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                                >
                                    Potvrdi
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal za izmenu deteta */}
                {showEditModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
                            <h2 className="text-2xl font-bold mb-4 text-gray-800">Izmeni podatke deteta</h2>
                            <input
                                type="text"
                                placeholder="Ime"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full mb-3 p-2 border rounded placeholder-gray-400 text-black"
                            />
                            <input
                                type="text"
                                placeholder="Prezime"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full mb-3 p-2 border rounded placeholder-gray-400 text-black"
                            />
                            <input
                                type="date"
                                value={formData.date_of_birth}
                                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                className="w-full mb-3 p-2 border rounded placeholder-gray-400 text-black"
                            />
                            <textarea
                                placeholder='Napomena'
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full mb-3 p-2 border rounded placeholder-gray-400 text-black"
                            />
                            <select
                                value={formData.gender}
                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                className="w-full mb-4 p-2 border rounded placeholder-gray-400 text-black"
                            >
                                <option value="male">Muško</option>
                                <option value="female">Žensko</option>
                                <option value="other">Ostalo</option>
                            </select>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={closeEditModal}
                                    className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 transition"
                                >
                                    Odustani
                                </button>
                                <button
                                    onClick={updateChild}
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                                >
                                    Sačuvaj izmene
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Ekran aktivnog deteta */}
                {activeChildId && (
                    <div className="mt-8 p-4 bg-white rounded shadow-md">
                        <h2 className="text-2xl font-bold mb-2">
                            Aktivno dete: {children.find((c) => c.id === activeChildId)?.first_name}
                        </h2>
                        <p className="text-gray-600">Ovde ide ekran sa detaljima / aktivnostima deteta.</p>
                        <button
                            onClick={() => setActiveChildId(null)}
                            className="mt-4 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 transition"
                        >
                            Nazad
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}