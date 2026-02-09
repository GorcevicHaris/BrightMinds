import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { first_name, last_name, date_of_birth, gender, notes, user_id, pin_code } = body;

        if (!first_name || !last_name || !date_of_birth || !gender || !notes || !user_id) {
            return NextResponse.json(
                { error: 'Svi podaci su obavezni' },
                { status: 400 }
            );
        }

        // Prvo dodaj dete u children tabelu
        const [result] = await pool.query(
            'INSERT INTO children (first_name, last_name, date_of_birth, gender, notes, pin_code) VALUES (?, ?, ?, ?, ?, ?)',
            [first_name, last_name, date_of_birth, gender, notes, pin_code || null]
        );

        // @ts-ignore
        const childId = result.insertId;

        // Onda poveži dete sa roditeljem preko user_children tabele
        await pool.query(
            'INSERT INTO user_children (user_id, child_id, relationship, is_primary) VALUES (?, ?, ?, ?)',
            [user_id, childId, 'parent', 1] // 1 umesto true
        );

        return NextResponse.json({
            id: childId,
            first_name,
            last_name,
            date_of_birth,
            gender,
            notes,
            pin_code,
        });
    } catch (error) {
        console.error('Error adding child:', error);
        return NextResponse.json(
            { error: 'Greška pri dodavanju deteta' },
            { status: 500 }
        );
    }
}
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const userId = url.searchParams.get('user_id');

        if (!userId) {
            return NextResponse.json(
                { error: "nije prosledjen id" },
                { status: 400 }
            )
        }
        const userIdNumber = parseInt(userId, 10);
        const [rows] = await pool.query(
            "SELECT c.* FROM children c INNER JOIN user_children uc ON c.id = uc.child_id WHERE uc.user_id = ?",
            [userIdNumber]
        );
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Error fetching children:', error);
        return NextResponse.json(
            { error: 'Greška pri dohvaćanju dece' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const url = new URL(req.url)
        const childId = url.searchParams.get("child_id")
        await pool.query(
            "DELETE FROM children WHERE id = ?",
            [childId]
        )
        console.log(childId, "- childId")
        return NextResponse.json({
            message: "Child deleted successfully"
        })
    } catch (error) {
        console.error('Error deleting child:', error);
        return NextResponse.json(
            { error: 'Greška pri brisanju deteta' },
            { status: 500 }
        )
    }
}

export async function PUT(req: Request) {
    try {
        const url = new URL(req.url)
        const childId = url.searchParams.get("child_id")
        console.log(childId, "childid")
        const body = await req.json()
        const { first_name, last_name, date_of_birth, gender, notes, pin_code } = body;
        await pool.query(
            "UPDATE children SET first_name = ?, last_name = ?, date_of_birth = ?, gender = ?, notes = ?, pin_code = ? WHERE id = ?",
            [first_name, last_name, date_of_birth, gender, notes, pin_code || null, childId]
        )
        return NextResponse.json({
            message: "Child updated successfully"

        })
    } catch (error) {
        console.error('Error updating child:', error);
        return NextResponse.json(
            { error: 'Greška pri ažuriranju deteta' },
            { status: 500 }
        )
    }
}