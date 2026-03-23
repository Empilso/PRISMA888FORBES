"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createDadosClient } from "@/lib/supabase/dados";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Building2,
    CalendarCheck
} from "lucide-react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    Legend
} from "recharts";

interface FrequenciaComissoesTabProps {
    parlamentar_id: number;
}

const COLORS = ["#10B981", "#EF4444", "#F59E0B"];

export default function FrequenciaComissoesTab({ parlamentar_id }: FrequenciaComissoesTabProps) {

    // 1. Fetch Frequência
    const { data: frequencia, isLoading: loadingFreq } = useQuery({
        queryKey: ["frequenciaPlenario", parlamentar_id],
        queryFn: async () => {
            const supabase = createDadosClient();
            const { data, error } = await supabase
                .from("alba_frequencia_plenario")
                .select("*")
                .eq("parlamentar_id", parlamentar_id)
                .order("data_sessao", { ascending: false });

            if (error) throw error;
            return data || [];
        },
    });

    // 2. Fetch Comissões
    const { data: comissoes, isLoading: loadingCom } = useQuery({
        queryKey: ["comissoesParlamentar", parlamentar_id],
        queryFn: async () => {
            const supabase = createDadosClient();
            const { data, error } = await supabase
                .from("alba_comissoes")
                .select("*")
                .eq("parlamentar_id", parlamentar_id);

            if (error) throw error;
            return data || [];
        },
    });

    const freqStats = useMemo(() => {
        if (!frequencia || frequencia.length === 0) return null;
        const total = frequencia.length;
        const presentes = frequencia.filter(f => f.status === 'Presente').length;
        const ausentes = frequencia.filter(f => f.status === 'Ausência').length;
        const justificadas = total - presentes - ausentes;

        return {
            total,
            presentes,
            ausentes,
            justificadas,
            taxa: ((presentes / total) * 100).toFixed(1),
            chartData: [
                { name: "Presenças", value: presentes },
                { name: "Ausências", value: ausentes },
                { name: "Justificadas", value: justificadas }
            ]
        };
    }, [frequencia]);

    if (loadingFreq || loadingCom) {
        return <div className="p-20 text-center text-slate-400 animate-pulse">Carregando Dados de Atividade (DADOS-PRISMA)...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Seção Frequência */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <CalendarCheck className="w-5 h-5 text-indigo-500" />
                            Presença em Plenário
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={freqStats?.chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {freqStats?.chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-4xl font-black text-slate-900">{freqStats?.taxa}%</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Taxa de Assiduidade</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white lg:col-span-2 overflow-hidden flex flex-col">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-tight">Últimas Sessões</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto max-h-[400px]">
                        <div className="divide-y divide-slate-50">
                            {frequencia?.slice(0, 10).map((sess, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${sess.status === 'Presente' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                            {sess.status === 'Presente' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-700">{sess.tipo_sessao}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">{new Date(sess.data_sessao).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className={`text-[9px] font-black uppercase ${sess.status === 'Presente' ? 'border-green-200 text-green-700 bg-green-50' : 'border-red-200 text-red-700 bg-red-50'}`}>
                                        {sess.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Seção Comissões */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-amber-500" />
                        Participação em Comissões
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(comissoes || []).length > 0 ? comissoes?.map((com, idx) => (
                            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between group hover:border-amber-200 transition-all">
                                <div>
                                    <Badge className="bg-slate-900 text-white border-0 text-[8px] font-black mb-2 px-2">
                                        {com.tipo_comissao || "Comissão Local"}
                                    </Badge>
                                    <h4 className="text-xs font-black text-slate-800 leading-tight line-clamp-2">
                                        {com.comissao}
                                    </h4>
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Users className="w-3 h-3 text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{com.cargo || "Membro"}</span>
                                    </div>
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[8px] font-black border-0">
                                        ATIVO
                                    </Badge>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-10 text-center text-slate-300">
                                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p className="font-bold text-sm">Nenhuma comissão registrada.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
