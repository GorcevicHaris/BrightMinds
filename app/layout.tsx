import type { Metadata, Viewport } from "next";
import { Nunito, Baloo_2 } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Bright Minds",
    template: "%s · Bright Minds",
  },
  description:
    "Bright Minds — edukativne igre za decu, sa praćenjem napretka za roditelje, učitelje i terapeute.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f5fc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr-Latn">
      <body className={`${nunito.variable} ${baloo.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
