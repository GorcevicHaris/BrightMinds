import ExitButton from "@/app/components/ExitButton";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
export interface Child {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
}

export default async function ChildPage({
    params
}: {
    params: { id: string }
}) {
    const user = await verifyToken();
    const { id } = await params;
    const [rows] = await pool.query<Child & RowDataPacket[]>
        ("SELECT c.* FROM children c JOIN user_children uc ON uc.child_id = c.id WHERE uc.user_id = ? AND c.id = ?"
            , [user.id, id])
    const child = rows[0]
    console.log(child, "dete")
    if (!child) {
        return (
            <div style={{ padding: 20 }}>
                <h1>Dete nije pronađeno ili nemate pristup</h1>
                <ExitButton target="/dashboard" />
            </div>
        );
    }

    return (
        <div style={{ padding: 20 }}>
            <h1>Stranica deteta</h1>
            <p>ID: {id}</p>
            <p>ime: {child.first_name}</p>
            <p>napomena: {child?.notes}</p>
            <ExitButton target="/dashboard" />
        </div>
    );
}
