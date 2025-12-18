import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticate, createAuthResponse } from '@/lib/middleware';
import { CreateChildDTO, ChildWithRelationship } from '@/types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET /api/children - Dobavi svu decu
export async function GET(request: NextRequest) {
    try {
        const user = await authenticate(request);

        if (!user) {
            return createAuthResponse('Neautorizovan pristup');
        }

        const [children] = await db.query<RowDataPacket[]>(`
      SELECT 
        c.id, c.first_name, c.last_name, c.date_of_birth, 
        c.gender, c.profile_image, c.notes, c.created_at,
        uc.relationship, uc.is_primary
      FROM children c
      INNER JOIN user_children uc ON c.id = uc.child_id
      WHERE uc.user_id = ?
      ORDER BY uc.is_primary DESC, c.first_name ASC
    `, [user.id]);

        return NextResponse.json({
            success: true,
            data: children as ChildWithRelationship[]
        });
    } catch (error) {
        console.error('Error fetching children:', error);
        return NextResponse.json(
            { success: false, message: 'Greška pri učitavanju dece' },
            { status: 500 }
        );
    }
}

// POST /api/children - Dodaj novo dete
export async function POST(request: NextRequest) {
    try {
        const user = await authenticate(request);

        if (!user) {
            return createAuthResponse('Neautorizovan pristup');
        }

        const body: CreateChildDTO = await request.json();
        const { first_name, last_name, date_of_birth, gender, notes, profile_image } = body;

        // Validacija
        if (!first_name || !last_name || !date_of_birth) {
            return NextResponse.json(
                { success: false, message: 'Ime, prezime i datum rođenja su obavezni' },
                { status: 400 }
            );
        }

        // Validacija datuma
        const birthDate = new Date(date_of_birth);
        if (isNaN(birthDate.getTime())) {
            return NextResponse.json(
                { success: false, message: 'Nevažeći format datuma' },
                { status: 400 }
            );
        }

        // 1. Dodaj dete
        const [result] = await db.query<ResultSetHeader>(`
      INSERT INTO children (first_name, last_name, date_of_birth, gender, notes, profile_image)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [first_name, last_name, date_of_birth, gender || null, notes || null, profile_image || null]);

        const childId = result.insertId;

        // 2. Poveži sa userom
        await db.query(`
      INSERT INTO user_children (user_id, child_id, relationship, is_primary)
      VALUES (?, ?, 'parent', TRUE)
    `, [user.id, childId]);

        return NextResponse.json({
            success: true,
            message: 'Dete uspešno dodato',
            data: {
                id: childId,
                first_name,
                last_name,
                date_of_birth,
                gender,
                notes,
                profile_image
            }
        }, { status: 201 });
    } catch (error) {
        console.error('Error adding child:', error);
        return NextResponse.json(
            { success: false, message: 'Greška pri dodavanju deteta' },
            { status: 500 }
        );
    }
}