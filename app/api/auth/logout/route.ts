import { NextResponse } from "next/server";

export async function POST() {
    const response = NextResponse.json({
        success: true,
        message: 'Uspešno ste se odjavili'
    });

    // Obriši cookie sa eksplicitnom putanjom
    response.cookies.set('token', '', {
        path: '/',
        expires: new Date(0),
        httpOnly: true,
    });

    return response;
}