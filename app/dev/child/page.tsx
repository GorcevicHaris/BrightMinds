// Probni prikaz dečjeg ekrana sa izmišljenim profilom — samo u razvoju.
// Parametri: ?gender=male|female &viewer=parent &age=4 &script=cyrillic &caps=0|1 &motion=reduced &avatar=0 &limit=10
import { notFound } from "next/navigation";
import ChildPageClient from "@/app/dashboard/child/[id]/ChildPageClient";
import { resolveSettings } from "@/lib/childSettings";

type Params = Partial<Record<"gender" | "viewer" | "age" | "script" | "caps" | "motion" | "avatar" | "limit", string>>;

export default async function DevChildPage({ searchParams }: { searchParams: Promise<Params> }) {
    if (process.env.NODE_ENV === "production") notFound();
    const p = await searchParams;

    const age = Number(p.age) || 6;
    const birth = new Date();
    birth.setFullYear(birth.getFullYear() - age);
    const settings = resolveSettings(
        {
            ...(p.script ? { script: p.script } : {}),
            ...(p.caps ? { uppercase: p.caps === "1" } : {}),
            ...(p.motion ? { reduceMotion: p.motion === "reduced" } : {}),
            ...(p.avatar ? { avatar: p.avatar !== "0" } : {}),
            ...(p.limit ? { sessionMinutes: Number(p.limit) } : {}),
        },
        birth.toISOString().slice(0, 10)
    );

    return (
        <ChildPageClient
            child={{ id: 0, first_name: "Mila", last_name: "Test", gender: p.gender === "male" ? "male" : "female", experience_points: 120 }}
            viewer={p.viewer === "parent" ? "parent" : "child"}
            settings={settings}
            preview
        />
    );
}
