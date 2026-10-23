"use client";

// Stanje pratioca na ekranu deteta: koji je lik izabran, šta nosi, šta je kupljeno i koliko
// je novčića. Učitava se sa servera (GET /api/children/[id]/companion), a svaka radnja ide na
// server, koji proverava cenu i novčiće. U probnom prikazu (bez baze) sve radi lokalno.
// Tu je i cilj deteta: predmet za koji skuplja novčiće (vidi se u sobi, na početnoj i posle nivoa).

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getWearItem } from "@/app/components/avatar/wearables";
import {
    applyCompanionAction,
    coinsAvailable,
    defaultCompanion,
    isCompanionKindId,
    POINTS_PER_STAR,
    type CompanionAction,
    type CompanionCatalog,
    type CompanionState,
} from "@/lib/companion";

export interface CompanionView {
    kind: string;
    owned: string[];
    wear: CompanionState["wear"];
    /** Predmet za koji dete skuplja novčiće (id iz kataloga), ili undefined */
    goal?: string;
    coins: number;
    /** Stanje je stiglo sa servera (do tada se crta podrazumevani pratilac) */
    loaded: boolean;
}

interface CompanionContextValue extends CompanionView {
    /** Izvršava radnju; vraća poruku greške za dete ili null kad je uspelo */
    act: (action: CompanionAction) => Promise<string | null>;
    /** Ponovo čita novčiće (posle završenog nivoa) */
    refresh: () => void;
}

const CompanionContext = createContext<CompanionContextValue | null>(null);

const LOCAL_CATALOG: CompanionCatalog = {
    isKind: isCompanionKindId,
    item: (id) => {
        const item = getWearItem(id);
        return item ? { slot: item.slot, price: item.price } : undefined;
    },
};

/** Odgovor servera → izmena stanja (server šalje `goal: null` kad cilja nema) */
function fromServer(companion: Record<string, unknown>): Partial<CompanionState> {
    const next: Partial<CompanionState> = {};
    if (typeof companion.kind === "string") next.kind = companion.kind;
    if (Array.isArray(companion.owned)) next.owned = companion.owned.filter((id): id is string => typeof id === "string");
    if (typeof companion.wear === "object" && companion.wear !== null) next.wear = companion.wear as CompanionState["wear"];
    next.goal = typeof companion.goal === "string" ? companion.goal : undefined;
    return next;
}

interface ProviderProps {
    childId: number;
    gender?: string;
    /** Probni prikaz bez baze: novčići iz zadatih poena, izmene samo u memoriji */
    preview?: boolean;
    previewPoints?: number;
    children: ReactNode;
}

export function CompanionProvider({ childId, gender, preview = false, previewPoints = 0, children }: ProviderProps) {
    const [state, setState] = useState<CompanionState>(() => defaultCompanion(gender));
    const [coins, setCoins] = useState(() => (preview ? coinsAvailable(previewPoints, 0) : 0));
    const [loaded, setLoaded] = useState(preview);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (preview) return;
        const controller = new AbortController();
        fetch(`/api/children/${childId}/companion`, { signal: controller.signal, cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!data?.companion) return;
                setState((current) => ({ ...current, ...fromServer(data.companion) }));
                setCoins(typeof data.coins === "number" ? data.coins : 0);
                setLoaded(true);
            })
            .catch(() => {});
        return () => controller.abort();
    }, [childId, preview, tick]);

    const act = useCallback(
        async (action: CompanionAction): Promise<string | null> => {
            if (preview) {
                const result = applyCompanionAction(state, action, (coins + state.spent) * POINTS_PER_STAR, LOCAL_CATALOG);
                if (!result.ok) return result.reason === "coins" ? "Nema dovoljno novčića" : "Ne može";
                setCoins(coins - (result.state.spent - state.spent));
                setState(result.state);
                return null;
            }
            try {
                const res = await fetch(`/api/children/${childId}/companion`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(action),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok) return typeof data?.error === "string" ? data.error : "Nije uspelo. Probaj ponovo.";
                if (data?.companion) setState((current) => ({ ...current, ...fromServer(data.companion) }));
                if (typeof data?.coins === "number") setCoins(data.coins);
                return null;
            } catch {
                return "Nema interneta. Probaj ponovo.";
            }
        },
        [childId, preview, state, coins]
    );

    const refresh = useCallback(() => setTick((value) => value + 1), []);

    const value = useMemo<CompanionContextValue>(
        () => ({ kind: state.kind, owned: state.owned, wear: state.wear, goal: state.goal, coins, loaded, act, refresh }),
        [state.kind, state.owned, state.wear, state.goal, coins, loaded, act, refresh]
    );
    return <CompanionContext value={value}>{children}</CompanionContext>;
}

/** Stanje pratioca; izvan ekrana deteta (npr. prijava) vraća null */
export function useCompanion(): CompanionContextValue | null {
    return useContext(CompanionContext);
}
