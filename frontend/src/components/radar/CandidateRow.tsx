"use client";

import React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Building2,
    Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CandidateProps {
    id: string;
    name: string;
    partido: string | null;
    city: string;
    office: string;
    avatarUrl?: string; // Optional
    hasFiscalData: boolean; // The key flag
}

interface CandidateRowProps {
    candidate: CandidateProps;
}

export function CandidateRow({ candidate }: CandidateRowProps) {
    return (
        <Card className="group overflow-hidden border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-300 bg-white">
            <div className="p-4 flex flex-col md:flex-row md:items-center gap-4">

                {/* 1. Avatar & Name */}
                <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-14 w-14 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                        <AvatarImage src={candidate.avatarUrl} alt={candidate.name} />
                        <AvatarFallback className="bg-slate-100 text-slate-400 font-bold">
                            {candidate.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-indigo-700 transition-colors">
                            {candidate.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                            <Badge variant="secondary" className="px-1.5 py-0 h-5 font-normal bg-slate-100 text-slate-600 border-slate-200">
                                {candidate.partido || "S/P"}
                            </Badge>
                            <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {candidate.office}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. City & Status */}
                <div className="flex flex-col md:items-end gap-1 md:w-64">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {candidate.city}
                    </div>

                    {candidate.hasFiscalData ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            DADOS FISCAIS PRONTOS
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Aguardando Importação
                        </div>
                    )}
                </div>

                {/* 3. Action */}
                <div className="md:border-l md:border-slate-100 md:pl-4">
                    <Button
                        asChild={candidate.hasFiscalData}
                        disabled={!candidate.hasFiscalData}
                        size="sm"
                        className={cn(
                            "w-full md:w-auto font-medium transition-all shadow-sm",
                            candidate.hasFiscalData
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-200"
                                : "bg-slate-100 text-slate-400 border border-slate-200"
                        )}
                    >
                        {candidate.hasFiscalData ? (
                            <Link href={`/admin/radar/${candidate.id}`}>
                                Ver Detalhes
                                <ChevronRight className="w-4 h-4 ml-2 opacity-80" />
                            </Link>
                        ) : (
                            <span className="cursor-not-allowed">
                                Indisponível
                            </span>
                        )}
                    </Button>
                </div>

            </div>

            {/* Progress Bar (Visual Flair) */}
            {candidate.hasFiscalData && (
                <div className="h-1 w-full bg-slate-100">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 w-full animate-in slide-in-from-left duration-1000" />
                </div>
            )}
        </Card>
    );
}
