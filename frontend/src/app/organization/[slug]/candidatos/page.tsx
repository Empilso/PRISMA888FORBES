
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Users,
    MagnifyingGlass,
    Plus,
    CaretRight,
    Funnel
} from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";

interface Campaign {
    id: string;
    name: string;
    ballot_name?: string;
    status: string;
    created_at: string;
}

export default function OrganizationCandidates() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/organizations/${slug}/campaigns`);
                if (res.ok) {
                    const data = await res.json();
                    setCampaigns(data);
                }
            } catch (error) {
                console.error("Erro ao buscar candidatos:", error);
            } finally {
                setLoading(false);
            }
        }

        if (slug) fetchData();
    }, [slug]);

    const filteredCampaigns = campaigns.filter(c =>
        (c.ballot_name || c.name).toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Users size={28} weight="fill" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            Gestão de Candidatos
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">Controle frotal de campanhas</p>
                    </div>
                </div>

                <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 shadow-lg shadow-primary/20 gap-2">
                    <Plus weight="bold" />
                    Adicionar Candidato
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                        placeholder="Buscar por nome ou nome de urna..."
                        className="pl-10 h-11 bg-white border-slate-200 rounded-xl focus:ring-primary/20"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="h-11 rounded-xl gap-2 text-slate-600 border-slate-200">
                    <Funnel weight="bold" />
                    Filtros
                </Button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCampaigns.map(campaign => (
                    <Card key={campaign.id} className="group hover:border-primary/50 transition-all cursor-pointer border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 bg-white p-2">
                        <CardHeader className="p-4 pb-0 items-center">
                            <div className="w-20 h-20 rounded-full bg-slate-100 border-4 border-white shadow-sm flex items-center justify-center text-3xl group-hover:scale-105 transition-transform duration-300">
                                👤
                            </div>
                            <div className="text-center mt-4">
                                <CardTitle className="text-lg font-black group-hover:text-primary transition-colors line-clamp-1">
                                    {campaign.ballot_name || campaign.name}
                                </CardTitle>
                                <CardDescription className="text-[10px] font-bold uppercase tracking-wider mt-1">
                                    {campaign.name}
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent className="p-4 pt-4">
                            <div className="bg-slate-50 rounded-2xl p-3 space-y-2 mb-4">
                                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                                    <span>Status</span>
                                    <span className="text-slate-900">{campaign.status}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                                    <span>Início</span>
                                    <span className="text-slate-900">{new Date(campaign.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <Button
                                className="w-full bg-slate-900 hover:bg-primary text-white rounded-xl h-10 gap-2 transition-all font-bold text-xs"
                                onClick={() => router.push(`/campaign/${campaign.id}`)}
                            >
                                Acessar Painel Admin <CaretRight weight="bold" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}

                {/* Empty State para New */}
                <button className="border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 p-8 group hover:border-primary/50 hover:bg-primary/5 transition-all text-slate-400 hover:text-primary min-h-[300px]">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus weight="bold" size={24} />
                    </div>
                    <span className="font-bold text-sm">Criar Nova Campanha</span>
                </button>
            </div>
        </div>
    );
}
