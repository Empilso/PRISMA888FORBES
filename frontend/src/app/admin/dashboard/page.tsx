"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Activity, Plus, UserPlus, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Campaign {
    id: string;
    candidate_name: string;
    role: string;
    city: string;
    created_at: string;
}

export default function AdminDashboardPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const { data, error } = await supabase
                    .from("campaigns")
                    .select("*")
                    .order("created_at", { ascending: false });

                if (error) throw error;
                setCampaigns(data || []);
            } catch (error) {
                console.error("Erro ao buscar campanhas:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCampaigns();
    }, []);

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Visão de Deus (Super Admin)</h1>
                    <p className="text-muted-foreground">Monitoramento global de todas as campanhas ativas.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline">Configurações Globais</Button>
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 gap-2">
                        <Link href="/admin/candidatos/novo">
                            <UserPlus className="h-4 w-4" />
                            Adicionar Candidato
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{campaigns.length}</div>
                        <p className="text-xs text-muted-foreground">Total de campanhas na plataforma</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuários Totais</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">Em breve</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Recorrente</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">R$ --</div>
                        <p className="text-xs text-muted-foreground">Em breve</p>
                    </CardContent>
                </Card>
            </div>

            {/* Lista de Candidatos / Campanhas */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Gestão de Candidatos</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {isLoading ? (
                        <div className="col-span-full flex items-center justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : (
                        <>
                            {campaigns.map((campaign) => (
                                <Card key={campaign.id} className="hover:border-blue-500 cursor-pointer transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                                                    {campaign.candidate_name}
                                                </CardTitle>
                                                <p className="text-sm text-muted-foreground">
                                                    {campaign.role} - {campaign.city}
                                                </p>
                                            </div>
                                            <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase">Ativo</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Progresso</span>
                                                <span className="font-bold">0%</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-500 w-[0%]" />
                                            </div>
                                            <Button asChild variant="secondary" className="w-full mt-2 group-hover:bg-blue-50 group-hover:text-blue-700">
                                                <Link href={`/campaign/${campaign.id}/dashboard`}>
                                                    Acessar Painel
                                                </Link>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {/* Card de Adicionar Novo */}
                            <Link href="/admin/candidatos/novo" className="block h-full">
                                <Card className="h-full border-dashed border-2 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer transition-all flex flex-col items-center justify-center p-6 text-muted-foreground hover:text-blue-600 min-h-[200px]">
                                    <div className="h-12 w-12 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center mb-4">
                                        <Plus className="h-6 w-6" />
                                    </div>
                                    <p className="font-medium">Cadastrar Novo Candidato</p>
                                </Card>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
