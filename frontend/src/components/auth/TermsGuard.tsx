"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { hasAcceptedTerms } from "@/lib/profiles";
import { TermsAcceptance } from "./TermsAcceptance";

/**
 * Wrapper que verifica se o usuário aceitou os termos
 * Se não aceitou, exibe o modal de termos bloqueando o acesso
 */
export function TermsGuard({ children }: { children: React.ReactNode }) {
    const [checking, setChecking] = React.useState(true);
    const [needsAcceptance, setNeedsAcceptance] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        async function checkTerms() {
            try {
                // Pequeno delay para garantir que o Supabase Client esteja pronto no browser
                const accepted = await hasAcceptedTerms();
                setNeedsAcceptance(!accepted);
            } catch (error) {
                console.error("[TermsGuard] Erro ao verificar termos:", error);
                setNeedsAcceptance(false);
            } finally {
                setChecking(false);
            }
        }

        checkTerms();
    }, []);

    // Evita erros de hidratação e garante que React hooks só rodem no client
    if (!mounted) return null;

    // Loading state
    if (checking) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="flex flex-col items-center gap-3 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-slate-500">Verificando autorização de acesso...</p>
                </div>
            </div>
        );
    }

    // Precisa aceitar termos
    if (needsAcceptance) {
        return <TermsAcceptance />;
    }

    return <>{children}</>;
}
