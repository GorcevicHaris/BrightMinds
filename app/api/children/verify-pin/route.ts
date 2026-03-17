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
        const child = rows[0];

        return NextResponse.json({
            success: true,
            child: {
                id: child.id,
                first_name: child.first_name,
                last_name: child.last_name,
                gender: child.gender,
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
