import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // Validation
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email i lozinka su obavezni' },
                { status: 400 }
            );
        }

        const { data: rows, error } = await supabaseAdmin
            .from('users')
            .select('id, password_hash, full_name, role, parental_pin')
            .eq('email', email);

        console.log("EMAIL IZ REQUESTA:", email);
        console.log("ROW IZ BAZE:", rows);
        if (error) {
             console.error("Supabase error:", error);
        }

        if (!rows || rows.length === 0) {
            return NextResponse.json(
                { error: 'Pogrešan email ili lozinka' },
                { status: 401 }
            );
        }

        const user = rows[0];

        // Check password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return NextResponse.json(
                { error: 'Pogrešan email ili lozinka' },
                { status: 401 }
            );
        }

        // Create JWT token
        const token = jwt.sign(
            { id: user.id, email, role: user.role },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        );

        // Kreiraj response
        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                full_name: user.full_name,
                email,
                role: user.role,
                parental_pin: user.parental_pin
            }
        });

        // Postavi httpOnly cookie
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // true samo u produkciji
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7, // 7 dana
            path: '/'
        });

        return response;

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Greška pri prijavljivanju' },
            { status: 500 }
        );
    }
}