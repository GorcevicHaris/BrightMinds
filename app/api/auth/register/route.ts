import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {

    try {
        const body = await req.json();
        const { email, password, full_name, role = 'parent', phone } = body;

        // LOG: Proveri šta stiže
        console.log('Received data:', { email, full_name, role, passwordLength: password?.length, phone });

        // Validacija
        if (!email || !password || !full_name) {
            return NextResponse.json(
                { error: 'missing_fields' },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const { data, error } = await supabaseAdmin
            .from('users')
            .insert([
                { 
                    email, 
                    password_hash: hashedPassword, 
                    full_name, 
                    role, 
                    phone, 
                    parental_pin: '0000' 
                }
            ])
            .select('id')
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ id: data.id });
    } catch (error: any) {
        // LOG: Detaljnija greška
        console.error('Insert error:', {
            message: error.message,
            code: error.code,
            details: error.details
        });

        // Specifične greške
        if (error.code === '23505') { // Postgres unique violation code
            return NextResponse.json(
                { error: 'email_exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'server_error', details: error.message },
            { status: 500 }
        );
    }
}