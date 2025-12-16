// components/ExitButton.tsx
'use client';

import { useRouter } from 'next/navigation';

interface Props {
    target: string;
}

export default function ExitButton({ target }: Props) {
    const router = useRouter();

    return (
        <button
            onClick={() => router.push(target)}
            className="bg-red-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition"
        >
            Izađi
        </button>
    );
}
