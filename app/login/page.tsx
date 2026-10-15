import type { Metadata } from "next";
import LoginPage from "../components/login";

export const metadata: Metadata = { title: "Prijava" };

export default function Login() {
    return <LoginPage />;
}
