import ExitButton from "@/app/components/ExitButton";
export default async function ChildPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;
    return (
        <div style={{ padding: 20 }}>
            <h1>Stranica deteta</h1>
            <p>ID: {id}</p>
            <ExitButton target="/dashboard" />
        </div>
    );
}
