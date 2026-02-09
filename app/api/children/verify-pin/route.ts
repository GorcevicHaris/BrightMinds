import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { child_id, pin_code } = body;

        if (!child_id || !pin_code) {
            return NextResponse.json(
                { error: 'Child ID i PIN kod su obavezni' },
                { status: 400 }
            );
        }

        const [rows]: any = await pool.query(
            'SELECT * FROM children WHERE id = ? AND pin_code = ?',
            [child_id, pin_code]
        );

        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'Netačan PIN kod' },
                { status: 401 }
            );
        }

        return NextResponse.json({
            success: true,
            child: rows[0]
        });
    } catch (error) {
        console.error('Error verifying PIN:', error);
        return NextResponse.json(
            { error: 'Greška pri verifikaciji PIN-a' },
            { status: 500 }
        );
    }
}
