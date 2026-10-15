// Probni prikaz statistike sa izmišljenim podacima — samo u razvoju.
import { notFound } from "next/navigation";
import DevProgress from "./DevProgress";

export default async function DevProgressPage({ searchParams }: { searchParams: Promise<{ audience?: string }> }) {
    if (process.env.NODE_ENV === "production") notFound();
    const { audience } = await searchParams;
    return <DevProgress audience={audience === "child" ? "child" : "parent"} />;
}
