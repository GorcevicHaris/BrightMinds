// Probni prikaz „Mojih priča” (polica, čitač i prozor za odrasle) sa podacima u memoriji — samo u razvoju.
// Parametri: ?script=cyrillic &caps=0|1 &motion=reduced &gender=male|female &empty=1 &manager=1
import { notFound } from "next/navigation";
import { resolveSettings } from "@/lib/childSettings";
import DevStories from "./DevStories";

type Params = Partial<Record<"script" | "caps" | "motion" | "gender" | "empty" | "manager", string>>;

export default async function DevStoriesPage({ searchParams }: { searchParams: Promise<Params> }) {
    if (process.env.NODE_ENV === "production") notFound();
    const p = await searchParams;

    const settings = resolveSettings(
        {
            ...(p.script ? { script: p.script } : {}),
            ...(p.caps ? { uppercase: p.caps === "1" } : {}),
            ...(p.motion ? { reduceMotion: p.motion === "reduced" } : {}),
        },
        null
    );

    return (
        <DevStories
            settings={settings}
            gender={p.gender === "male" ? "male" : "female"}
            empty={p.empty === "1"}
            managerOpen={p.manager === "1"}
        />
    );
}
