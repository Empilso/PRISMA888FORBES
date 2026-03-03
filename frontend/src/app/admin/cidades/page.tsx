"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { AlertCircle, Trash2, RefreshCcw, MapPin, TrendingUp, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface CityStat {
    id: string;
    name: string;
    state: string;
    slug: string;
    expense_count?: number;
    total_budget?: number;
    last_audit?: string;
}

export default function CitiesDashboard() {
    const [cities, setCities] = useState<CityStat[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchCities();
    }, []);

    const fetchCities = async () => {
        try {
            setLoading(true);
            const { data: citiesData, error } = await supabase.from("cities").select("*");

            if (error) throw error;

            // Enrich with stats (Could be a joined query or separate count query)
            // For now, let's just show the cities, robust Implementation would join municipal_expenses count
            setCities(citiesData || []);
        } catch (error) {
            console.error("Error loading cities:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (slug: string) => {
        if (!confirm(`TEM CERTEZA? Isso apagará TODO o histórico de auditoria de ${slug}.`)) return;

        try {
            // Call the cleanup endpoint
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/reset-city/${slug}`, {
                method: 'POST'
            });

            if (res.ok) {
                // Remove city record too (the endpoint might only clean data, let's verify)
                // If endpoint doesn't delete the city row, we do it here
                await supabase.from("cities").delete().eq("slug", slug);
                fetchCities();
            } else {
                alert("Erro ao limpar cidade.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro de conexão.");
        }
    };

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Gestão de Municípios</h1>
                    <p className="text-slate-500">Administre as cidades monitoradas pelo Radar 2.0.</p>
                </div>
                <Link href="/admin/cities/new">
                    <Button className="bg-slate-900 text-white shadow-lg">
                        + Nova Cidade
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cities.map((city) => (
                        <Card key={city.id} className="hover:shadow-lg transition-shadow border-slate-200">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold">
                                            {city.state}
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{city.name}</CardTitle>
                                            <CardDescription className="text-xs font-mono">{city.slug}</CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                        Ativo
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="py-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <TrendingUp className="w-4 h-4 text-slate-400" />
                                    <span>Auditoria Fiscal Habilitada</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Coins className="w-4 h-4 text-slate-400" />
                                    <span>Gestão de Promessas Ativa</span>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-2 border-t bg-slate-50 flex justify-between">
                                <Link href={`/admin/cities/${city.slug}/onboarding`}>
                                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                        <RefreshCcw className="w-4 h-4 mr-2" /> Sincronizar
                                    </Button>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDelete(city.slug)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}

                    {cities.length === 0 && (
                        <div className="col-span-full py-20 text-center text-slate-400">
                            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p>Nenhuma cidade cadastrada.</p>
                            <p className="text-sm">Clique em "+ Nova Cidade" para começar.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
