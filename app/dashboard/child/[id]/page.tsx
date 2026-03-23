// app/dashboard/child/[id]/page.tsx
import ExitButton from "@/app/components/ExitButton";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
import ChildPageClient from "./ChildPageClient";

export interface Child {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    notes?: string;
    streak: number;
    experience_points: number;
}

export default async function ChildPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const childId = Number(id);

    let child: Child | null = null;

    // Try 1: Parent/teacher access via JWT — verify ownership
    try {
        const user = await verifyToken();
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT c.* FROM children c 
             JOIN user_children uc ON uc.child_id = c.id 
             WHERE uc.user_id = ? AND c.id = ?`,
            [user.id, childId]
        );
        if (rows.length > 0) {
            child = rows[0] as Child;
        }
    } catch {
        // No valid JWT — this might be a child self-login via PIN
    }

    // Try 2: Child self-login — just fetch the child directly
    // (The child authenticated via PIN on /login and was redirected here)
    if (!child) {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT * FROM children WHERE id = ?`,
            [childId]
        );
        if (rows.length > 0) {
            child = rows[0] as Child;
        }
    }

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
                    <ExitButton target="/login" />
                </div>
            </div>
        );
    }

    return <ChildPageClient child={child} childId={childId} />;
}