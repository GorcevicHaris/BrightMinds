// lib/auth.ts
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { UserPayload } from './types';

export async function verifyToken() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        throw new Error('no_auth');
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;
        return payload;
    } catch (error) {
        throw new Error('invalid_token');
    }
}