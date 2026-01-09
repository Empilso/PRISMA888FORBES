"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    Crosshair,
    User,
    MagnifyingGlass,
    CaretRight,
    ChartLineUp,
    CheckCircle,
    Warning
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MonitoredPolitician {
    id: string;
    name: string;
    partido: string | null;
    city: string;
    office: string;
    campaign_id: string; // Needed for routing
    status: number; // 0-100% completion or similar
}

// Mock Data for now - waiting for backend integration
const MOCK_MONITORED: MonitoredPolitician[] = [
    {
        id: "candidate", // Using the slug/id we know exists
        name: "Carlos Pivetta",
        partido: "PL",
        city: "Votorantim - SP",
        office: "Prefeito",
        campaign_id: "candidate", // Mock
        status: 65
    }
];

export default function RadarIndexPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [politicians, setPoliticians] = useState<MonitoredPolitician[]>([]);

    // In a real scenario, we would fetch this from /api/mandates or similar
    // For now, let's simulate a fetch
    useEffect(() => {
        // Simulate fetch
        setTimeout(() => {
            setPoliticians(MOCK_MONITORED);
            setIsLoading(false);
        }, 500);
    }, []);

    const filtered = politicians.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
                        <Crosshair className="h-8 w-8 text-white" weight="duotone" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Comando</h1>
                        <p className="text-slate-500 font-medium pt-1">Monitoramento Estratégico de Mandatos e Promessas</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-64">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar político ou cidade..."
                            className="pl-10 bg-white border-slate-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    // Skeletons
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
                    ))
                ) : filtered.length > 0 ? (
                    filtered.map((pol) => (
                        <Link key={pol.id} href={`/admin/radar/${pol.id}`} className="group">
                            <Card className="h-full border-slate-200 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-indigo-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />

                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm group-hover:bg-violet-50 transition-colors">
                                            <User className="h-7 w-7 text-slate-400 group-hover:text-violet-600" weight="duotone" />
                                        </div>
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Ativo
                                        </Badge>
                                    </div>

                                    <div className="space-y-1 mb-6">
                                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-violet-700 transition-colors">
                                            {pol.name}
                                        </h3>
                                        <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                            {pol.office} {pol.partido && `• ${pol.partido}`}
                                        </p>
                                        <p className="text-xs text-slate-400 pt-1">
                                            {pol.city}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completo</span>
                                            <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                                                <ChartLineUp className="h-4 w-4" />
                                                {pol.status}% Rastreamento
                                            </div>
                                        </div>

                                        <Button size="icon" variant="ghost" className="rounded-full hover:bg-violet-50 text-slate-300 group-hover:text-violet-600 transition-colors">
                                            <CaretRight weight="bold" className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 mb-4">
                            <Warning className="h-8 w-8 text-slate-400" weight="duotone" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Nenhum Político Monitorado</h3>
                        <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                            Cadastre um mandato e inicie o radar para ver os dados aqui.
                        </p>
                        <Button className="mt-6 bg-slate-900 text-white hover:bg-slate-800" asChild>
                            <Link href="/admin/candidatos/novo">
                                Cadastrar Novo
                            </Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
