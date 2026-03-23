import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { pin_code, child_id } = body;

        if (!pin_code) {
            return NextResponse.json(
                { error: 'PIN kod je obavezan' },
                { status: 400 }
            );
        }

        // If child_id is provided, verify for that specific child (legacy support)
        // Otherwise, search ALL children by pin_code (child self-login)
        let rows: any[];

        if (child_id) {
            const [result]: any = await pool.query(
                'SELECT * FROM children WHERE id = ? AND pin_code = ?',
                [child_id, pin_code]
            );
            rows = result;
        } else {
            const [result]: any = await pool.query(
                'SELECT * FROM children WHERE pin_code = ?',
                [pin_code]
            );
            rows = result;
        }

        if (!rows || rows.length === 0) {
            return NextResponse.json(
                { error: 'Netačan PIN kod' },
                { status: 401 }
            );
        }

        // If multiple children have the same PIN, return the first match
        let child = rows[0];

        // ─── STREAK & POINTS LOGIC ─────────────────────────────────────
        const now = new Date();
        const lastLogin = child.last_login_at ? new Date(child.last_login_at) : null;

        let newStreak = child.streak || 0;
        let newPoints = child.experience_points || 0;
        let streakAdded = false;

        // Provera da li je novi kalendarski dan (Snapchat stil)
        const isNewDay = !lastLogin || (
            now.getFullYear() !== lastLogin.getFullYear() ||
            now.getMonth() !== lastLogin.getMonth() ||
            now.getDate() !== lastLogin.getDate()
        );

        if (isNewDay) {
            streakAdded = true;
            // Proveri da li je juče bio poslednji login (consecutive)
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);

            const wasYesterday = lastLogin && (
                yesterday.getFullYear() === lastLogin.getFullYear() &&
                yesterday.getMonth() === lastLogin.getMonth() &&
                yesterday.getDate() === lastLogin.getDate()
            );

            if (wasYesterday) {
                newStreak += 1; // Nastavi streak
            } else {
                newStreak = 1; // Resetuj na 1 (ako je prvi put ili je prošlo više dana)
            }

            // Nagrada: +10 poena za dnevni ulazak
            newPoints += 10;

            // Sačuvaj u bazi
            await pool.query(
                'UPDATE children SET streak = ?, experience_points = ?, last_login_at = NOW() WHERE id = ?',
                [newStreak, newPoints, child.id]
            );
        }

        return NextResponse.json({
            success: true,
            child: {
                id: child.id,
                first_name: child.first_name,
                last_name: child.last_name,
                gender: child.gender,
                streak: newStreak,
                experiencePoints: newPoints,
                streakAdded: streakAdded
            }
        });
    } catch (error) {
        console.error('Error verifying PIN:', error);
        return NextResponse.json(
            { error: 'Greška pri verifikaciji PIN-a' },
            { status: 500 }
        );
    }
}
