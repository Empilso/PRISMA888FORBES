
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface OrgTheme {
    primaryColor: string;
    accentColor: string;
}

const ThemeContext = createContext<{ theme: OrgTheme | null } | null>(null);

export function OrganizationThemeProvider({ slug, children }: { slug: string, children: React.ReactNode }) {
    const [theme, setTheme] = useState<OrgTheme | null>(null);

    useEffect(() => {
        async function fetchTheme() {
            try {
                const res = await fetch(`/api/organizations/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    const colors = data.settings?.colors || {
                        primary: data.settings?.primaryColor || "#3b82f6",
                        accent: "#6366f1"
                    };

                    setTheme({
                        primaryColor: colors.primary,
                        accentColor: colors.accent
                    });

                    // Injeta variáveis CSS no root do contexto da organização
                    const root = document.documentElement;
                    root.style.setProperty("--primary", colors.primary);
                    root.style.setProperty("--primary-foreground", "#ffffff");
                    // Ajuste de opacidade para rings e backgrounds suaves
                    root.style.setProperty("--primary-muted", `${colors.primary}20`);
                }
            } catch (error) {
                console.error("Erro ao carregar tema da organização:", error);
            }
        }

        if (slug) fetchTheme();

        // Cleanup para resetar cores ao sair do contexto da org? 
        // Normalmente Next.js gerencia isso por página, mas por garantia:
        return () => {
            const root = document.documentElement;
            root.style.removeProperty("--primary");
            root.style.removeProperty("--primary-muted");
        };
    }, [slug]);

    return (
        <ThemeContext.Provider value={{ theme }}>
            <div className="org-theme-context min-h-screen bg-[#f8fafc]">
                {children}
            </div>
        </ThemeContext.Provider>
    );
}

export const useOrgTheme = () => useContext(ThemeContext);
