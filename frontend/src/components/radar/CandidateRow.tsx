"use client";

import React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    MapPin,
    Briefcase,
    ExternalLink
} from "lucide-react";

export interface CandidateProps {
    id: string;
    slug?: string;
    prisma_id?: string;
    name: string;
    partido: string | null;
    city: string;
    office: string;
    avatarUrl?: string;
    hasFiscalData: boolean;
}

interface CandidateRowProps {
    candidate: CandidateProps;
}

export function CandidateRow({ candidate }: CandidateRowProps) {
    // FIX: usa slug primeiro, fallback prisma_id, fallback id
    const profileSlug = candidate.slug || candidate.prisma_id || candidate.id;

    const getInitials = (name: string) =>
        name.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("").toUpperCase();

    return (
        <div className="group relative bg-white border border-slate-100 hover:border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all duration-200 hover:shadow-md hover:shadow-indigo-50">

            {/* Linha de destaque hover */}
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

            {/* 1. Avatar + Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <Avatar className="h-12 w-12 border-2 border-white shadow ring-2 ring-slate-100 group-hover:ring-indigo-200 transition-all shrink-0">
                    <AvatarImage
                        src={candidate.avatarUrl}
                        alt={candidate.name}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src =
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=6366f1&color=fff&bold=true`;
                        }}
                    />
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-sm">
                        {getInitials(candidate.name)}
                    </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-[15px] leading-tight truncate group-hover:text-indigo-700 transition-colors">
                        {candidate.name}
                    </h3>
                    <div className="flex items-center flex-wrap gap-2 mt-1.5">
                        <Badge className="bg-slate-100 text-slate-600 border-0 text-[11px] font-bold px-2 py-0 h-5 hover:bg-slate-100">
                            {candidate.partido || "S/P"}
                        </Badge>
                        <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <Briefcase className="w-3 h-3" />
                            {candidate.office}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <MapPin className="w-3 h-3 text-red-400" />
                            {candidate.city}
                        </span>
                    </div>
                </div>
            </div>

            {/* 2. Status */}
            <div className="shrink-0">
                {candidate.hasFiscalData ? (
                    <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        DADOS PRONTOS
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Pendente
                    </div>
                )}
            </div>

            {/* 3. Botão Transparência - FIX: link relativo sem localhost */}
            <div className="shrink-0">
                {candidate.hasFiscalData ? (
                    <Link
                        href={`/admin/radar/${profileSlug}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-indigo-200"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Transparência
                        <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                    </Link>
                ) : (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 text-[13px] font-semibold rounded-xl cursor-not-allowed">
                        Indisponível
                    </span>
                )}
            </div>

            {/* Barra gradiente base no hover */}
            {candidate.hasFiscalData && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-2xl overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
            )}
        </div>
    );
}
