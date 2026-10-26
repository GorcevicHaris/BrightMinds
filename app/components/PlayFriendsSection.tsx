"use client";

// „Drugovi za igru” u podešavanjima deteta (lib/playFriends.ts): deca sa kojom je dete već igralo
// na dva uređaja, povezana kodom od sličica. Samo njih dete može da pozove bez koda (poziv
// iskoči na stranici druga). Roditelj ovde vidi spisak (ime i drugar) i briše druga — posle toga
// se deca povezuju samo novim kodom.

import { useCallback, useEffect, useState } from "react";
import CompanionPicture from "@/app/components/avatar3d/CompanionPicture";
import type { Wear } from "@/app/components/avatar3d/data";
import { Button } from "./ui/Button";

interface Friend {
    key: string;
    firstName: string;
    companion: { kind: string; skin: string | null; wear: Record<string, string> };
}

export default function PlayFriendsSection({ childId, childName }: { childId: number; childName: string }) {
    const [friends, setFriends] = useState<Friend[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [removing, setRemoving] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch(`/api/children/${childId}/play-friends`, { cache: "no-store" });
            const data = res.ok ? await res.json() : null;
            if (!data || !Array.isArray(data.friends)) throw new Error("friends");
            setFriends(data.friends as Friend[]);
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, [childId]);

    useEffect(() => {
        queueMicrotask(() => void load());
    }, [load]);

    const remove = async (key: string) => {
        setRemoving(key);
        try {
            const res = await fetch(`/api/children/${childId}/play-friends`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key }),
            });
            if (res.ok) setFriends((prev) => (prev ?? []).filter((f) => f.key !== key));
            else setFailed(true);
        } catch {
            setFailed(true);
        } finally {
            setRemoving(null);
        }
    };

    return (
        <div className="space-y-2">
            {friends === null && !failed && <p className="text-sm font-bold text-ink-faint">Učitavam…</p>}
            {friends !== null && friends.length === 0 && (
                <p className="text-sm font-semibold text-ink-soft">Spisak je prazan. Drug se dodaje sam, kad deca jednom igraju zajedno preko koda od sličica.</p>
            )}
            {friends !== null && friends.length > 0 && (
                <ul className="divide-y divide-line rounded-xl border border-line">
                    {friends.map((friend) => (
                        <li key={friend.key} className="flex items-center gap-3 px-3 py-2">
                            <span className="block h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-orange-50 ring-2 ring-orange-200">
                                <CompanionPicture kind={friend.companion.kind} skin={friend.companion.skin ?? undefined} wear={friend.companion.wear as Wear} variant="bust" className="h-full w-full" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-base font-extrabold text-ink">{friend.firstName}</span>
                            <Button variant="ghost" size="sm" onClick={() => void remove(friend.key)} isLoading={removing === friend.key} aria-label={`Ukloni: ${friend.firstName}`}>
                                Ukloni
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
            {failed && <p className="text-sm font-bold text-rose-700">Spisak nije učitan. Pokušajte ponovo.</p>}
            <p className="text-xs font-semibold text-ink-faint">
                Čuva se samo ime i drugar. {childName} može da pozove bez koda samo decu sa ovog spiska; spisak se ne pretražuje.
            </p>
        </div>
    );
}
