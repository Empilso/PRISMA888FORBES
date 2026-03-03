
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    User,
    CaretRight,
    MapPin,
    Pulse,
    Robot
} from "@phosphor-icons/react";

interface Campaign {
    id: string;
    name: string;
    ballot_name?: string;
    status: string;
    city?: string;
    ia_status?: "analisando" | "concluido" | "ocioso";
}

interface CandidatesGridProps {
    campaigns: Campaign[];
    onAction?: (id: string) => void;
}

export function CandidatesGrid({ campaigns, onAction }: CandidatesGridProps) {
    const router = useRouter();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {campaigns.map((campaign) => (
                <Card
                    key={campaign.id}
                    className="group border-slate-100 bg-white shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-500 overflow-hidden"
                >
                    <CardHeader className="p-0 relative h-32 bg-slate-50 flex items-center justify-center overflow-hidden">
                        {/* Background Decorativo */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />

                        {/* Avatar / Foto */}
                        <div className="relative z-10 w-24 h-24 rounded-full bg-white border-4 border-white shadow-xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-500">
                            {campaign.ballot_name?.[0] || <User weight="fill" />}
                        </div>

                        {/* IA Status Badge Overlay */}
                        <div className="absolute top-3 right-3 z-20">
                            <Badge className={`
                                flex items-center gap-1.5 px-2.5 py-1 rounded-full border-none shadow-sm text-white font-bold text-[10px] tracking-tight
                                ${campaign.ia_status === 'analisando' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}
                            `}>
                                {campaign.ia_status === 'analisando' ? <Pulse weight="bold" /> : <Robot weight="fill" />}
                                {campaign.ia_status === 'analisando' ? 'IA ANALISANDO' : 'IA CONCLUÍDA'}
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 pt-12 text-center relative">
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors">
                                {campaign.ballot_name || campaign.name}
                            </CardTitle>
                            <div className="flex items-center justify-center gap-1 text-slate-400 mt-1">
                                <MapPin size={14} weight="bold" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">
                                    {campaign.city || "Município não definido"}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-50 rounded-xl p-2.5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1 text-left">Engajamento</p>
                                    <h4 className="text-sm font-black text-slate-900 text-left">84%</h4>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-2.5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1 text-left">Votos Est.</p>
                                    <h4 className="text-sm font-black text-slate-900 text-left">1.2k</h4>
                                </div>
                            </div>

                            <Button
                                className="w-full bg-slate-900 hover:bg-primary text-white rounded-xl h-11 font-black text-xs gap-2 transition-all shadow-lg hover:shadow-primary/25 group/btn"
                                onClick={() => router.push(`/campaign/${campaign.id}`)}
                            >
                                Entrar na Sala
                                <CaretRight weight="bold" className="group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
