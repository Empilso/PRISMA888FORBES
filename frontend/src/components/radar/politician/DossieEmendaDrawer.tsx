"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ShieldCheck,
    AlertTriangle,
    Ghost,
    FileText,
    Building2,
    DollarSign,
    CalendarDays,
    ExternalLink,
    Loader2,
    Receipt,
} from "lucide-react";

interface DossieEmendaDrawerProps {
    amendmentId: string | null;
    open: boolean;
    onClose: () => void;
}

function formatCurrency(v: number): string {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function DossieEmendaDrawer({ amendmentId, open, onClose }: DossieEmendaDrawerProps) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const { data, isLoading, error } = useQuery({
        queryKey: ["dossieEmenda", amendmentId],
        queryFn: async () => {
            if (!amendmentId) return null;
            const res = await fetch(`${API_URL}/api/emendas/${amendmentId}/dossie_detalhe`);
            if (!res.ok) throw new Error("Erro ao carregar dossiê");
            return res.json();
        },
        enabled: !!amendmentId && open,
        staleTime: 1000 * 60 * 5,
    });

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto bg-white border-l border-slate-200 shadow-2xl p-0">
                <SheetHeader className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-white text-lg font-bold">Dossiê da Emenda</SheetTitle>
                            <SheetDescription className="text-indigo-100 text-xs font-medium mt-0.5">
                                Análise forense completa QI220
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                {isLoading && (
                    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-medium">Carregando dossiê...</span>
                    </div>
                )}

                {error && (
                    <div className="p-6 text-center text-red-500 font-medium">
                        Erro ao carregar dossiê da emenda.
                    </div>
                )}

                {data && !isLoading && (
                    <div className="px-6 py-5 space-y-6">
                        {/* ── Alertas ── */}
                        {(data.emenda_fantasma || data.divergencia_loa_pago || (data.alertas_entidades && data.alertas_entidades.length > 0)) && (
                            <div className="space-y-2">
                                {data.emenda_fantasma && (
                                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                        <Ghost className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-amber-800">Emenda Fantasma</p>
                                            <p className="text-xs text-amber-700 mt-0.5">
                                                Município oficial difere do destino real detectado no texto.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {data.divergencia_loa_pago && (
                                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-red-800">Divergência LOA ↔ Pago</p>
                                            <p className="text-xs text-red-700 mt-0.5">
                                                {data.observacoes_forenses || "Valor orçado e pago inconsistentes."}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {data.alertas_entidades?.map((alerta: any, idx: number) => (
                                    <div key={`alerta-ent-${idx}`} className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                                        <ShieldCheck className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-rose-800">{alerta.tipo.replace(/_/g, " ")}</p>
                                            <p className="text-xs text-rose-700 mt-0.5">{alerta.descricao}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── Bloco LOA ── */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-indigo-500" />
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Informações LOA</h3>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 font-bold py-0.5 h-5">
                                        {data.ano_exercicio}
                                    </Badge>
                                    {data.area_tematica && (
                                        <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200 font-bold py-0.5 h-5">
                                            {data.area_tematica}
                                        </Badge>
                                    )}
                                    {data.has_sei && (
                                        <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-0 font-bold py-0.5 h-5">
                                            <ShieldCheck className="w-3 h-3 mr-1" /> SEI RASTREADO
                                        </Badge>
                                    )}
                                </div>

                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Órgão</p>
                                    <p className="text-sm text-slate-700 font-medium">{data.orgao || "-"}</p>
                                </div>

                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Município Destino</p>
                                    <p className="text-sm text-slate-700 font-medium">{data.municipio_destino}</p>
                                </div>

                                {data.politician_name && (
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Parlamentar</p>
                                        <p className="text-sm text-slate-700 font-medium">{data.politician_name}</p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Descrição LOA</p>
                                    <p className="text-xs text-slate-600 leading-relaxed bg-white rounded-lg p-3 border border-slate-100 max-h-32 overflow-y-auto">
                                        {data.descricao_loa || "Sem descrição disponível."}
                                    </p>
                                </div>

                                {data.sei_numeros?.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Números SEI</p>
                                        <div className="flex flex-wrap gap-1">
                                            {data.sei_numeros.map((sei: string, i: number) => (
                                                <Badge
                                                    key={`sei-${i}`}
                                                    variant="outline"
                                                    className="text-[9px] font-mono bg-slate-100 text-slate-600 border-slate-200 py-0"
                                                >
                                                    {sei}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Bloco Financeiro ── */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-emerald-500" />
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Valores</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "Orçado Atual", value: data.valor_orcado_atual, color: "bg-blue-50 text-blue-900" },
                                    { label: "Empenhado", value: data.valor_empenhado, color: "bg-amber-50 text-amber-900" },
                                    { label: "Liquidado", value: data.valor_liquidado, color: "bg-purple-50 text-purple-900" },
                                    { label: "Pago Total", value: data.valor_pago_total, color: "bg-emerald-50 text-emerald-900" },
                                ].map((item, i) => (
                                    <div key={`val-${i}`} className={`${item.color} rounded-xl p-3 border border-slate-100`}>
                                        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{item.label}</p>
                                        <p className="text-base font-black mt-1">{formatCurrency(item.value)}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Progress bar */}
                            <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
                                    style={{ width: `${Math.min(data.percent_executado * 100, 100)}%` }}
                                />
                            </div>
                            <p className="text-center text-xs font-bold text-slate-500">
                                {(data.percent_executado * 100).toFixed(1)}% executado
                            </p>
                        </div>

                        {/* ── Bloco Referências Encontradas (QI220) ── */}
                        {data.entidades_extraidas && data.entidades_extraidas.total_entidades > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Referências Encontradas</h3>
                                </div>
                                <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100/50 grid grid-cols-1 gap-4">
                                    {data.entidades_extraidas.municipios_ba?.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                <Building2 className="w-3 h-3" /> Municípios na Bahia
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {data.entidades_extraidas.municipios_ba.map((m: string, i: number) => (
                                                    <Badge key={`mun-ext-${i}`} className="bg-indigo-600 border-0 text-[10px] font-bold px-2 py-0.5">
                                                        {m}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {data.entidades_extraidas.processos?.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Processos SEI / Administrativos</p>
                                            <div className="flex flex-wrap gap-1">
                                                {data.entidades_extraidas.processos.map((p: string, i: number) => (
                                                    <Badge key={`proc-ext-${i}`} variant="outline" className="text-[9px] font-mono bg-white border-slate-200 text-slate-700">
                                                        {p}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        {data.entidades_extraidas.contratos?.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Contratos</p>
                                                <div className="space-y-1">
                                                    {data.entidades_extraidas.contratos.map((c: string, i: number) => (
                                                        <div key={`ct-ext-${i}`} className="text-[12px] font-bold text-slate-700 flex items-center gap-1">
                                                            <div className="w-1 h-1 bg-indigo-400 rounded-full" /> {c}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {data.entidades_extraidas.notas_fiscais?.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">NFs</p>
                                                <div className="space-y-1">
                                                    {data.entidades_extraidas.notas_fiscais.map((nf: string, i: number) => (
                                                        <div key={`nf-ext-${i}`} className="text-[12px] font-bold text-slate-700 flex items-center gap-1">
                                                            <div className="w-1 h-1 bg-emerald-400 rounded-full" /> NF {nf}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {data.entidades_extraidas.obras_eventos?.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Obras e Eventos (Detectados)</p>
                                            <div className="bg-white rounded-lg p-3 border border-slate-100 flex flex-col gap-2">
                                                {data.entidades_extraidas.obras_eventos.map((e: string, i: number) => (
                                                    <div key={`ev-ext-${i}`} className="text-[11px] font-bold text-indigo-700 leading-tight">
                                                        {e}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {data.entidades_extraidas.datas_citadas?.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Datas Mencionadas</p>
                                            <div className="flex flex-wrap gap-1 text-[11px] font-medium text-slate-600">
                                                {data.entidades_extraidas.datas_citadas.join(" • ")}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <Separator />

                        {/* ── Bloco Pagamentos ── */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-violet-500" />
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Pagamentos</h3>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-bold text-slate-500 border-slate-200">
                                    {data.payments?.length || 0} registros
                                </Badge>
                            </div>

                            {data.payments?.length === 0 ? (
                                <div className="text-center py-6 text-slate-400 text-sm italic">
                                    Nenhum pagamento registrado para esta emenda.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                    {data.payments?.map((p: any) => (
                                        <div
                                            key={p.id}
                                            className="bg-white border border-slate-100 rounded-xl p-3 hover:border-indigo-200 hover:shadow-sm transition-all duration-200"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-sm font-bold text-slate-800 max-w-[280px] truncate" title={p.credor}>
                                                    {p.credor || "Credor não informado"}
                                                </p>
                                                <p className="text-sm font-black text-emerald-700 whitespace-nowrap ml-2">
                                                    {formatCurrency(p.valor_pago)}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                                                {p.data_pagamento && (
                                                    <span className="flex items-center gap-1">
                                                        <CalendarDays className="w-3 h-3" />
                                                        {p.data_pagamento.slice(0, 10)}
                                                    </span>
                                                )}
                                                {p.num_empenho && (
                                                    <span className="font-mono">
                                                        EMP: {p.num_empenho}
                                                    </span>
                                                )}
                                                {p.contrato_numero && (
                                                    <span className="font-mono">
                                                        CT: {p.contrato_numero}
                                                    </span>
                                                )}
                                            </div>
                                            {p.sei_numero && (
                                                <div className="mt-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[9px] font-mono bg-emerald-50 text-emerald-700 border-emerald-200 py-0 cursor-pointer hover:bg-emerald-100"
                                                    >
                                                        <ShieldCheck className="w-3 h-3 mr-1" />
                                                        SEI {p.sei_numero}
                                                    </Badge>
                                                </div>
                                            )}
                                            {p.objeto_pagamento && (
                                                <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2" title={p.objeto_pagamento}>
                                                    {p.objeto_pagamento}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
