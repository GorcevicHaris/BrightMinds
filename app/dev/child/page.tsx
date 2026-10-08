// Probni prikaz dečjeg ekrana sa izmišljenim profilom — samo u razvoju.
import { notFound } from "next/navigation";
import ChildPageClient from "@/app/dashboard/child/[id]/ChildPageClient";

export default async function DevChildPage({ searchParams }: { searchParams: Promise<{ gender?: string; viewer?: string }> }) {
    if (process.env.NODE_ENV === "production") notFound();
    const { gender, viewer } = await searchParams;
    return (
        <ChildPageClient
            child={{ id: 0, first_name: "Mila", last_name: "Test", gender: gender === "male" ? "male" : "female", streak: 4, experience_points: 120 }}
            viewer={viewer === "parent" ? "parent" : "child"}
        />
    );
}
