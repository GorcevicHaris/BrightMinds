import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
        const { data: child, error: childError } = await supabaseAdmin
            .from('children')
            .insert([{
                first_name, 
                last_name, 
                date_of_birth, 
                gender, 
                notes, 
                pin_code: pin_code || null
            }])
            .select('id')
            .single();

        if (childError) throw childError;
        const childId = child.id;

        // Onda poveži dete sa roditeljem preko user_children tabele
        const { error: ucError } = await supabaseAdmin
            .from('user_children')
            .insert([{
                user_id, 
                child_id: childId, 
                relationship: 'parent', 
                is_primary: true
            }]);

        if (ucError) throw ucError;

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
        
        const { data: ucData, error } = await supabaseAdmin
            .from('user_children')
            .select('child:children(*)')
            .eq('user_id', userId);

        if (error) throw error;
        
        const rows = (ucData || []).map(uc => Array.isArray(uc.child) ? uc.child[0] : uc.child).filter(c => c !== null);

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
        
        const { error } = await supabaseAdmin
            .from('children')
            .delete()
            .eq('id', childId);
            
        if (error) throw error;
        
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
        
        const { error } = await supabaseAdmin
            .from('children')
            .update({
                first_name, 
                last_name, 
                date_of_birth, 
                gender, 
                notes, 
                pin_code: pin_code || null
            })
            .eq('id', childId);
            
        if (error) throw error;
        
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