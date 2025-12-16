import jwt from 'jsonwebtoken';

export function verifyToken(authHeader?: string) {
    if (!authHeader) throw new Error('no_auth');
    const parts = authHeader.split(' ');
    if (parts.length !== 2) throw new Error('bad_auth');
    const token = parts[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    return payload;
}
