import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Dashboard from "../components/dashboard";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Moja deca" };

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) redirect("/login");
    // Dečja sesija nema pristup roditeljskom panelu — vraćamo dete na njegove igre
    if (session.childId) redirect(`/dashboard/child/${session.childId}`);

    return <Dashboard />;
}
