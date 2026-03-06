import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "PRISMA 888 - Inteligência Política",
    description: "Sistema de Inteligência e Estratégia Política de Elite",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "PRISMA 888",
    },
    icons: {
        apple: "/icon-512.png",
    }
};

export const viewport: Viewport = {
    themeColor: "#0a0a0b",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

import Providers from "./providers";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <head>
                {/* Leaflet CSS via CDN - avoids Next.js webpack CSS plugin issues */}
                <link
                    rel="stylesheet"
                    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                    crossOrigin=""
                />
            </head>
            <body className={inter.className} suppressHydrationWarning>
                <Providers>
                    {children}
                    <Toaster />
                </Providers>
            </body>
        </html>
    );
}
