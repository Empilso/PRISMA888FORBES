"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function FixCompetitorsTable() {
    const supabase = createClient();
    const [status, setStatus] = useState("idle");
    const [log, setLog] = useState("");

    const runFix = async () => {
        setStatus("running");
        setLog("Iniciando criação da tabela competitors via RPC/Query...");

        try {
            // Tenta criar a tabela usando SQL direto via RPC se disponível, 
            // ou apenas verifica se conseguimos inserir dados dummy para testar acesso

            // Como não temos acesso direto ao DDL via client-side (segurança),
            // a melhor aposta aqui (já que o script python falhou) é assumir que
            // talvez o script python esteja olhando para o DB errado ou PORTA errada.

            // Vamos tentar listar as tabelas visíveis para este usuário
            const { data: tables, error } = await supabase
                .from('campaigns')
                .select('id')
                .limit(1);

            if (error) {
                setLog(prev => prev + `\n❌ Erro ao acessar campaigns: ${error.message}`);
                return;
            }

            setLog(prev => prev + `\n✅ Acesso confirmado à tabela campaigns!`);

            // Se chegamos aqui, o usuário tem acesso.
            // O ideal seria ter uma function 'exec_sql' no supabase para admins,
            // mas provavelmente não tem. 

            // PLANO B: Vamos mostrar as credenciais para o usuário rodar no SQL Editor do Supabase Studio
            setLog(prev => prev + `\n⚠️ AVISO: O cliente JS não pode criar tabelas (DDL).`);
            setLog(prev => prev + `\nPor favor, copie o SQL abaixo e rode no SQL Editor do Supabase (localhost:54323):`);

        } catch (e: any) {
            setLog(prev => prev + `\n❌ Exceção: ${e.message}`);
        } finally {
            setStatus("done");
        }
    };

    return (
        <div className="p-4 bg-slate-900 text-green-400 font-mono rounded-lg m-4">
            <h2 className="text-xl font-bold mb-4">Diagnosticador de Banco</h2>
            <Button onClick={runFix} disabled={status === "running"}>
                Rodar Diagnóstico de Acesso
            </Button>
            <pre className="mt-4 p-2 bg-black rounded whitespace-pre-wrap text-xs">
                {log}
            </pre>

            <div className="mt-4 p-4 bg-slate-800 rounded">
                <p className="text-white font-bold">SQL para rodar manualmente:</p>
                <code className="block text-blue-300 text-xs mt-2 select-all">
                    {`CREATE TABLE IF NOT EXISTS public.competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    party TEXT,
    risk_level TEXT DEFAULT 'high',
    color TEXT DEFAULT '#EF4444',
    avatar_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitors_campaign ON public.competitors(campaign_id);
COMMENT ON TABLE public.competitors IS 'Lista de adversários monitorados';`}
                </code>
            </div>
        </div>
    );
}
