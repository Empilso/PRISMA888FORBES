"use client";

import React, { useState, useEffect } from "react";
import {
    Activity,
    Search,
    ShieldAlert,
    LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CandidateRow, CandidateProps } from "@/components/radar/CandidateRow";
import Link from "next/link";

// Mock Data simulating fetching from 'politicians' table
// In real app, fetch from Supabase
const MOCK_POLITICIANS: CandidateProps[] = [
    {
        id: "f079648a-a722-4f35-aa37-1b466005d5d1", // Real ID for Weber Manga
        name: "Weber Manga", // Updated Name to verify
        partido: "REPUBLICANOS",
        city: "Votorantim - SP",
        office: "Preeito", // Typo intended? Assuming "Prefeito"
        hasFiscalData: true, // Votorantim rule
        avatarUrl: ""
    },
    {
        id: "mock-1",
        name: "Carlos Pivetta",
        partido: "PL",
        city: "Votorantim - SP",
        office: "Candidato",
        hasFiscalData: true, // Also Votorantim
        avatarUrl: ""
    },
    {
        id: "mock-2",
        name: "Rodrigo Manga",
        partido: "REPUBLICANOS",
        city: "Sorocaba - SP",
        office: "Prefeito",
        hasFiscalData: false, // Not Votorantim yet
        avatarUrl: ""
    }
];

export default function RadarIndexPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [politicians, setPoliticians] = useState<CandidateProps[]>([]);

    useEffect(() => {
        // Stimulate API delay
        setTimeout(() => {
            // Apply logic: check if city is Votorantim-SP or has flag
            const data = MOCK_POLITICIANS.map(p => ({
                ...p,
                office: p.office === "Preeito" ? "Prefeito" : p.office, //Fix typo
                // Hardcoded logic for demo: ONLY Votorantim has data
                hasFiscalData: p.city.toLowerCase().includes("votorantim")
            }));
            setPoliticians(data);
            setIsLoading(false);
        }, 800);
    }, []);

    const filtered = politicians.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-12">
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
                    <div className="flex items-center gap-5">
                        <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 transform rotate-3">
                            <LayoutGrid className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                Central de Inteligência
                            </h1>
                            <p className="text-slate-500 font-medium text-lg">
                                Selecione um alvo para iniciar a <span className="text-indigo-600 font-bold">Auditoria 3D</span>.
                            </p>
                        </div>
                    </div>

                    <div className="w-full md:w-72 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar político ou cidade..."
                            className="pl-10 bg-white border-slate-200 h-11 text-base shadow-sm focus-visible:ring-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="space-y-4">
                    {isLoading ? (
                        // Skeletons
                        [1, 2, 3].map(i => (
                            <div key={i} className="h-24 w-full rounded-xl bg-slate-200 animate-pulse" />
                        ))
                    ) : filtered.length > 0 ? (
                        <>
                            <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                                <span>Candidato / Mandato</span>
                                <span className="hidden md:block pr-64">Status Fiscal & Auditoria</span>
                            </div>
                            <div className="space-y-4">
                                {filtered.map((pol) => (
                                    <CandidateRow key={pol.id} candidate={pol} />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 mb-4">
                                <ShieldAlert className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Nenhum Político Encontrado</h3>
                            <p className="text-slate-500 mt-2 max-w-sm mx-auto mb-6">
                                Não encontramos resultados para sua busca. Tente outro termo.
                            </p>
                            <Button variant="outline" onClick={() => setSearchTerm("")}>
                                Limpar Filtros
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="text-center pt-8 border-t border-slate-200">
                    <p className="text-sm text-slate-400">
                        Dados fiscais sincronizados com o <strong>TCE-SP (Tribunal de Contas)</strong>. Atualização diária.
                    </p>
                </div>
            </div>
        </div>
    );
}
