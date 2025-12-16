import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
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

        const [result] = await pool.query(
            'INSERT INTO users (email, password_hash, full_name, role, phone) VALUES (?, ?, ?, ?, ?)',
            [email, hashedPassword, full_name, role, phone]
        );

        // @ts-ignore
        const insertId = result.insertId;
        return NextResponse.json({ id: insertId });
    } catch (error: any) {
        // LOG: Detaljnija greška
        console.error('Insert error:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sql: error.sql
        });

        // Specifične greške
        if (error.code === 'ER_DUP_ENTRY') {
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