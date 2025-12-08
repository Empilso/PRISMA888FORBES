"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { hasAcceptedTerms } from "@/lib/profiles";
import { TermsAcceptance } from "./TermsAcceptance";

/**
 * Wrapper que verifica se o usuário aceitou os termos
 * Se não aceitou, exibe o modal de termos bloqueando o acesso
 */
export function TermsGuard({ children }: { children: React.ReactNode }) {
    const [checking, setChecking] = useState(true);
    const [needsAcceptance, setNeedsAcceptance] = useState(false);

    useEffect(() => {
        async function checkTerms() {
            try {
                const accepted = await hasAcceptedTerms();
                setNeedsAcceptance(!accepted);
            } catch (error) {
                console.error("Erro ao verificar termos:", error);
                setNeedsAcceptance(false); // Em caso de erro, deixa passar
            } finally {
                setChecking(false);
            }
        }
        checkTerms();
    }, []);

    // Loading state
    if (checking) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Verificando acesso...</p>
                </div>
            </div>
        );
    }

    // Precisa aceitar termos - exibe modal bloqueante
    if (needsAcceptance) {
        return <TermsAcceptance />;
    }

    // Termos aceitos - exibe conteúdo normal
    return <>{children}</>;
}
