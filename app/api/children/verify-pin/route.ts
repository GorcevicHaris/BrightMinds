import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

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

        let childData;

        if (child_id) {
            const { data, error } = await supabaseAdmin
                .from('children')
                .select('*')
                .eq('id', child_id)
                .eq('pin_code', pin_code)
                .maybeSingle();
            childData = data;
        } else {
            const { data, error } = await supabaseAdmin
                .from('children')
                .select('*')
                .eq('pin_code', pin_code)
                .limit(1)
                .maybeSingle();
            childData = data;
        }

        if (!childData) {
            return NextResponse.json(
                { error: 'Netačan PIN kod' },
                { status: 401 }
            );
        }

        let child = childData;

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
            await supabaseAdmin
                .from('children')
                .update({ 
                    streak: newStreak, 
                    experience_points: newPoints, 
                    last_login_at: new Date().toISOString() 
                })
                .eq('id', child.id);
        }

        // ─── JWT & SESSION LOGIC ──────────────────────────────────────
        // Find the parent (user) associated with this child
        const { data: parentRows } = await supabaseAdmin
            .from('user_children')
            .select('user:users(id, email, role)')
            .eq('child_id', child.id)
            .limit(1)
            .maybeSingle();

        let response: NextResponse;
        
        let parent: any = parentRows?.user;
        if (Array.isArray(parent)) parent = parent[0];

        if (parent) {
            // Create JWT token for the parent session
            const token = jwt.sign(
                { id: parent.id, email: parent.email, role: parent.role },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '7d' }
            );

            response = NextResponse.json({
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

            // Set httpOnly cookie so verifyToken() works in progress-logs
            response.cookies.set('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                path: '/'
            });
        } else {
            // Fallback for children without explicit user links
            response = NextResponse.json({
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
        }

        return response;

    } catch (error) {
        console.error('Error verifying PIN:', error);
        return NextResponse.json(
            { error: 'Greška pri verifikaciji PIN-a' },
            { status: 500 }
        );
    }
}
