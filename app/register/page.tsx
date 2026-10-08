import type { Metadata } from "next";
import RegisterPage from "../components/register";

export const metadata: Metadata = { title: "Registracija" };

export default function Register() {
    return <RegisterPage />;
}
