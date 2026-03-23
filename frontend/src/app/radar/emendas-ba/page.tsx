"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createDadosClient } from "@/lib/supabase/dados";
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EmendasBADashboard({ filterName }: { filterName?: string }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const isBobo = filterName?.toLowerCase().includes("bobo");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const supabase = createDadosClient();
        let query = supabase.from("alba_emendas_master").select("*");
        
        if (filterName) {
          if (isBobo) {
             query = query.or("parlamentar_nome.ilike.%Bob%,parlamentar_nome.ilike.%Bira%,parlamentar_nome.ilike.%Coroa%");
          } else {
             query = query.ilike("parlamentar_nome", `%${filterName}%`);
          }
        }

        const { data, error } = await query.order("valor_pago", { ascending: false });
        if (error) throw error;
        setItems(data || []);
      } catch (err: any) {
        console.error("Erro Dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [filterName]);

  const totalOrcado = items.reduce((acc, curr) => acc + (Number(curr.valor_orcado_atual) || 0), 0);
  const totalEmpenhado = items.reduce((acc, curr) => acc + (Number(curr.valor_empenhado) || 0), 0);
  const totalPago = items.reduce((acc, curr) => acc + (Number(curr.valor_pago) || 0), 0);

  const funnelData = [
    { name: "Projetos", value: items.length, fill: "#8884d8" },
    { name: "Empenhadas", value: items.filter(e => (Number(e.valor_empenhado) > 0)).length, fill: "#83a6ed" },
    { name: "Pagas", value: items.filter(e => (Number(e.valor_pago) > 0)).length, fill: "#8dd1e1" },
  ];

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      <span className="text-muted-foreground animate-pulse font-medium text-lg">Sincronizando Portais...</span>
    </div>
  );

  return (
    <div className="w-full p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-[600px]">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Radar: Emendas Estaduais {filterName ? `- ${filterName}` : "BA"}
          </h1>
          <p className="text-muted-foreground text-lg">Registros: {items.length.toLocaleString()} | Dados-Prisma Verified</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary px-4 py-1 uppercase font-bold text-[10px]">Portal Transparência BA</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6 bg-white border-0 shadow-sm ring-1 ring-slate-100">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Investimento Total</div>
          <div className="text-3xl font-extrabold mt-1 text-slate-800">R$ {(totalOrcado / 1e6).toFixed(1)} Mi</div>
        </Card>
        <Card className="p-6 bg-white border-0 shadow-sm ring-1 ring-slate-100">
          <div className="text-xs font-bold text-blue-400 uppercase tracking-widest">Empenhado</div>
          <div className="text-3xl font-extrabold mt-1 text-blue-600">R$ {(totalEmpenhado / 1e6).toFixed(1)} Mi</div>
        </Card>
        <Card className="p-6 bg-white border-0 shadow-sm ring-1 ring-slate-100">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Total Pago</div>
          <div className="text-3xl font-extrabold mt-1 text-emerald-600">R$ {(totalPago / 1e6).toFixed(1)} Mi</div>
        </Card>
      </div>

      <Tabs defaultValue="painel" className="w-full">
        <TabsList className="mb-8 bg-slate-100/50 p-1 rounded-xl">
          <TabsTrigger value="painel" className="font-bold px-8">Gráficos</TabsTrigger>
          <TabsTrigger value="tabela" className="font-bold px-8">Listagem</TabsTrigger>
        </TabsList>

        <TabsContent value="painel" className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6 shadow-sm border-0 ring-1 ring-slate-100 h-[400px]">
              <h2 className="text-lg font-bold text-slate-800 mb-6">Execução Orçamentária</h2>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%" aspect={1.5}>
                  <FunnelChart>
                    <Tooltip />
                    <Funnel dataKey="value" data={funnelData} isAnimationActive>
                      {/* REMOVIDO CONTENT CUSTOMIZADO QUE CAUSAVA O ERRO NaN NO ATRIBUTO X */}
                      <LabelList position="right" fill="#64748b" stroke="none" dataKey="name" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 shadow-sm border-0 ring-1 ring-slate-100 h-[400px] overflow-auto">
              <h2 className="text-lg font-bold text-slate-800 mb-6">Top Áreas</h2>
              <Table>
                <TableBody>
                  {Object.entries(
                    items.reduce((acc: any, curr) => {
                      const org = curr.orgao || "Outros";
                      acc[org] = (acc[org] || 0) + (Number(curr.valor_empenhado) || 0);
                      return acc;
                    }, {})
                  )
                  .sort((a: any, b: any) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([org, val]: any) => (
                    <TableRow key={org}>
                      <TableCell className="text-[11px] py-3 font-bold text-slate-600 truncate max-w-[200px] uppercase">{org}</TableCell>
                      <TableCell className="text-right font-mono text-[11px] font-extrabold text-slate-900">
                        R$ {(val / 1e6).toFixed(1)} Mi
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tabela">
          <Card className="shadow-sm border-0 ring-1 ring-slate-100 h-[600px] flex flex-col overflow-hidden">
            <div className="overflow-auto bg-white">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-500">Ano</TableHead>
                    <TableHead className="font-bold text-slate-500">Órgão / Função</TableHead>
                    <TableHead className="font-bold text-slate-500 text-right">Pago (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.slice(0, 200).map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-bold text-slate-400">{e.ano}</TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-700 text-xs truncate max-w-[300px]">{e.orgao}</div>
                        <div className="text-[10px] text-slate-400 italic truncate max-w-[250px]">{e.funcao}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] font-extrabold text-emerald-600">
                        {(Number(e.valor_pago) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
