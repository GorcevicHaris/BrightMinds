// app/dashboard/child/[id]/page.tsx
import ExitButton from "@/app/components/ExitButton";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
import GameContainer from "./GameContainer";

export interface Child {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    notes?: string;
}

export default async function ChildPage({ params }: { params: { id: string } }) {
    const user = await verifyToken();
    const { id } = await params;

    // Dobavi podatke o detetu
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT c.* FROM children c 
     JOIN user_children uc ON uc.child_id = c.id 
     WHERE uc.user_id = ? AND c.id = ?`,
        [user.id, id]
    );

    const child = rows[0] as Child;

    if (!child) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold text-red-600 mb-4">
                        Dete nije pronađeno
                    </h1>
                    <p className="text-gray-600 mb-6">
                        Nemate pristup ovom detetu ili ono ne postoji.
                    </p>
                    <ExitButton target="/dashboard" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold text-purple-700 mb-2">
                                🎮 {child.first_name} {child.last_name}
                            </h1>
                            {child.notes && (
                                <p className="text-gray-600 italic">💭 {child.notes}</p>
                            )}
                        </div>
                        <ExitButton target="/dashboard" />
                    </div>
                </div>

                {/* Game Section */}
                <GameContainer childId={Number(id)} childName={child.first_name} />
            </div>
        </div>
    );
}