// lib/types.ts
import type { GameType } from "./games";

export interface UserPayload {
    id: number;
    email: string;
    role: string;
}

/** Poruka koju igra šalje live monitoru preko Supabase Realtime kanala. */
export interface GameUpdate {
    childId: number;
    activityId: number;
    gameType: GameType;
    event: "started" | "progress" | "completed";
    /** Stanje igre (view) + opis događaja u `log` za prikaz roditelju */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>;
    timestamp: string;
    /** Postavljeno kada je poruka odgovor na zahtev monitora za sinhronizaciju */
    isSync?: boolean;
}
