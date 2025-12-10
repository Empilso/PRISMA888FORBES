"use client";

import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FlowsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const LANGFLOW_URL = "https://langflow-production-9787.up.railway.app";

    useEffect(() => {
        // Simple check to see if Langflow might be reachable (optional optimization)
        // For now, we just handle the iframe loading state
        const timer = setTimeout(() => setIsLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex flex-col h-full w-full bg-white relative">
            {/* Header (Optional - can be removed for full immersion) */}
            {/* <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
                <h1 className="font-semibold text-gray-900">Editor de Fluxos (Langflow)</h1>
                <a href={LANGFLOW_URL} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Abrir em Nova Aba
                    </Button>
                </a>
            </div> */}

            {/* Loading State */}
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
                    <p className="text-gray-600 font-medium">Carregando Langflow...</p>
                    <p className="text-xs text-gray-400 mt-2">Conectando ao servidor de IA...</p>
                </div>
            )}

            {/* Iframe Wrapper */}
            <div className="flex-1 w-full h-full relative">
                <iframe
                    src={LANGFLOW_URL}
                    className="w-full h-full border-0"
                    title="Langflow Editor"
                    onLoad={() => setIsLoading(false)}
                    onError={() => setHasError(true)}
                    allow="clipboard-read; clipboard-write; microphone; camera"
                />

                {/* Error Overlay (if iframe fails to load - hard to detect cross-origin but good to have fallback) */}
                {hasError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20">
                        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900">Não foi possível conectar ao Langflow</h3>
                        <p className="text-gray-500 mb-6">Verifique se o container/serviço do Langflow está rodando.</p>
                        <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
