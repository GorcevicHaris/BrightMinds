import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticate, createAuthResponse } from '@/lib/middleware';
import { CreateChildDTO, ChildWithRelationship } from '@/types';

// GET /api/children - Dobavi svu decu
export async function GET(request: NextRequest) {
    try {
        const user = await authenticate(request);

        if (!user) {
            return createAuthResponse('Neautorizovan pristup');
        }

        const { data: ucData, error } = await supabaseAdmin
            .from('user_children')
            .select(`
                relationship, 
                is_primary,
                child:children (
                    id, first_name, last_name, date_of_birth, gender, profile_image, notes, created_at
                )
            `)
            .eq('user_id', user.id);

        if (error) {
            throw error;
        }

        // Mapiramo podatke da odgovaraju starom formatu
        const children = (ucData || []).map(uc => {
            // Zbog potencijalno različitog tipiziranja relacija u Supabase
            const childData = Array.isArray(uc.child) ? uc.child[0] : uc.child;
            return {
                ...childData,
                relationship: uc.relationship,
                is_primary: uc.is_primary
            };
        }).sort((a: any, b: any) => {
            if (a.is_primary !== b.is_primary) return b.is_primary ? 1 : -1;
            return a.first_name.localeCompare(b.first_name);
        });

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
        const { data: child, error: childError } = await supabaseAdmin
            .from('children')
            .insert([{
                first_name,
                last_name,
                date_of_birth,
                gender: gender || null,
                notes: notes || null,
                profile_image: profile_image || null
            }])
            .select('id')
            .single();

        if (childError) throw childError;
        const childId = child.id;

        // 2. Poveži sa userom
        const { error: linkError } = await supabaseAdmin
            .from('user_children')
            .insert([{
                user_id: user.id,
                child_id: childId,
                relationship: 'parent',
                is_primary: true
            }]);

        if (linkError) throw linkError;

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