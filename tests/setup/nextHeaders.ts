// tests/setup/nextHeaders.ts
// Test-dvojnik za `next/headers` (zamenu radi tests/setup/register.mjs).
// Pravi `cookies()` traži zahtev u toku; ovde test sam postavlja kolačiće u `cookieJar`.

const jar = new Map<string, string>();

/** Kolačići „trenutnog zahteva” — test ih postavlja pre poziva rute. */
export const cookieJar = {
    set(name: string, value: string): void {
        jar.set(name, value);
    },
    clear(): void {
        jar.clear();
    },
};

/** Isti oblik koji koristi lib/auth.ts: `(await cookies()).get(name)?.value`. */
export async function cookies(): Promise<{ get(name: string): { name: string; value: string } | undefined }> {
    return {
        get(name) {
            const value = jar.get(name);
            return value === undefined ? undefined : { name, value };
        },
    };
}
