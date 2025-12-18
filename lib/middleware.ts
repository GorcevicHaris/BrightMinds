import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthUser {
    id: number;
    email: string;
    role: 'parent' | 'therapist' | 'teacher' | 'admin';
}

export async function authenticate(request: NextRequest): Promise<AuthUser | null> {
    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            return null;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;

        // Backward compatibility for old tokens
        if (decoded.userId && !decoded.id) {
            decoded.id = decoded.userId;
        }

        return decoded as AuthUser;
    } catch (error) {
        return null;
    }
}

export function createAuthResponse(message: string, status: number = 401) {
    return NextResponse.json(
        { success: false, message },
        { status }
    );
}