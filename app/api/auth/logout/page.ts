import { NextResponse } from "next/server";

export async function POST() {
    const response = NextResponse.json({
        success: true,
        message: 'Uspešno ste se odjavili'
    });

    // Obriši cookie
    response.cookies.delete('token');

    return response;
}