// proxy.ts (Next.js 16: nekadašnji middleware)
// Samo za API rute: zahtev koji menja podatke sa tuđeg sajta se odbija pre nego što stigne
// do rute (videti lib/requestOrigin.ts). Pristup detetu se i dalje proverava u svakoj ruti
// i na svakoj stranici — ovo je samo dodatna brava.
import { NextResponse, type NextRequest } from "next/server";
import { isCrossSiteMutation } from "@/lib/requestOrigin";

export function proxy(request: NextRequest) {
    if (isCrossSiteMutation(request.method, request.headers)) {
        return NextResponse.json({ error: "Zahtev nije dozvoljen" }, { status: 403 });
    }
    return NextResponse.next();
}

export const config = {
    matcher: "/api/:path*",
};
