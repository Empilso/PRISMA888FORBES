import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "SheepStack v3.0 - Inteligência Eleitoral",
    description: "Plataforma de gestão de campanhas políticas com IA avançada",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <body className={inter.className}>
                {children}
                <Toaster />
            </body>
        </html>
    );
}
