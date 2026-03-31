"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink, FileText, Building2, Calendar, Hash,
  Banknote, AlertTriangle, CheckCircle2, Info, Layers,
  Clock, Shield, Tag,
} from "lucide-react";

// ─── Tipo do registro completo vindo da API ────────────────────────────────────
export interface DespesaCompleta {
  id:                 string;
  parlamentar_id?:    string;
  competencia:        string | null;
  competencia_label?: string | null;
  ano:                number | null;
  mes:                number | null;
  num_processo:       string | null;
  num_nf:             string | null;
  num_nf_normalizado?:string | null;
  tipo_documento?:    string | null;
  fornecedor:         string | null;
  fornecedor_limpo?:  string | null;
  cnpj:               string | null;
  cpf?:               string | null;
  cnpj_valido?:       boolean | null;
  categoria:          string;
  categoria_slug?:    string;
  categoria_detalhe?: string | null;
  valor:              number;
  valor_detalhe?:     number;
  valor_glosado:      number;
  valor_liquido?:     number;
  link_pdf?:          string | null;
  link_detalhe?:      string | null;
  link_transparencia?:string | null;
  has_pdf?:           boolean;
  nivel_qualidade?:   string | null;
  qualidade_score?:   number | null;
  fonte_portal?:      string | null;
  esfera?:            string | null;
  uf?:                string | null;
  flags?:             string[];
  match_score?:       number | null;
  match_metodo?:      string | null;
  orfao?:             boolean | null;
  nf_tipo?:           string | null;
  bebeto_versao?:     string | null;
  ronaldo_versao?:    string | null;
  coletado_em?:       string | null;
  criado_em?:         string | null;
  processado_em?:     string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtCNPJ(cnpj: string) {
  const d = cnpj.replace(/\D/g, "");
  if (d.length === 14)
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return cnpj;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtMesAno(date: string | null | undefined) {
  if (!date) return "—";
  try {
    return new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
      month: "long", year: "numeric",
    });
  } catch {
    return date;
  }
}

const QUALIDADE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  OURO:   { label: "Ouro",   color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  icon: "🥇" },
  PRATA:  { label: "Prata",  color: "text-slate-600",  bg: "bg-slate-50 border-slate-200",  icon: "🥈" },
  BRONZE: { label: "Bronze", color: "text-orange-700", bg: "bg-orange-50 border-orange-200",icon: "🥉" },
  BASICO: { label: "Básico", color: "text-slate-500",  bg: "bg-slate-50 border-slate-100",  icon: "📄" },
};

const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  nf_longa:                   { label: "NF número longo",            color: "bg-blue-100 text-blue-700" },
  pdf_url_relativa_corrigida: { label: "URL PDF corrigida",           color: "bg-green-100 text-green-700" },
  cnpj_invalido:              { label: "CNPJ inválido",               color: "bg-red-100 text-red-700" },
  orfao:                      { label: "Sem parlamentar vinculado",   color: "bg-orange-100 text-orange-700" },
  valor_divergente:           { label: "Valor divergente",            color: "bg-red-100 text-red-700" },
  match_parcial:              { label: "Match parcial",               color: "bg-yellow-100 text-yellow-700" },
  match_exato:                { label: "Match exato",                 color: "bg-green-100 text-green-700" },
};

// ─── Linha de detalhe ─────────────────────────────────────────────────────────
function InfoRow({
  icon, label, value, mono = false, accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        <div className={`text-[13px] font-semibold break-words ${
          accent ? "text-indigo-700" : "text-slate-800"
        } ${mono ? "font-mono" : ""}`}>
          {value ?? <span className="text-slate-300 italic text-[12px]">não informado</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Seção com título ─────────────────────────────────────────────────────────
function Section({
  title, icon, children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
        <span className="text-slate-500">{icon}</span>
        <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">{title}</span>
      </div>
      <div className="px-4 divide-y divide-slate-50">{children}</div>
    </div>
  );
}

// ─── Botão de link externo ────────────────────────────────────────────────────
function LinkButton({
  href, label, icon, variant = "default",
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "primary" | "danger";
}) {
  const colors = {
    default: "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200",
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm",
    danger:  "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200",
  };
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
        colors[variant]
      }`}
    >
      {icon}
      {label}
      <ExternalLink className="w-3.5 h-3.5 opacity-60" />
    </a>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
interface DespesaDrawerProps {
  despesa: DespesaCompleta | null;
  open: boolean;
  onClose: () => void;
}

export function DespesaDrawer({ despesa, open, onClose }: DespesaDrawerProps) {
  if (!despesa) return null;

  const qualidade   = QUALIDADE_CONFIG[despesa.nivel_qualidade || ""];
  const scoreLabel  = despesa.qualidade_score != null
    ? `${Math.round(despesa.qualidade_score * 100)}%`
    : null;
  const flags       = despesa.flags || [];
  const hasPdf      = !!(despesa.link_pdf);
  const hasDetalhe  = !!(despesa.link_detalhe);
  const hasTranpar  = !!(despesa.link_transparencia);
  const glosado     = despesa.valor_glosado > 0;
  const nomeFornec  = despesa.fornecedor_limpo || despesa.fornecedor;
  const docId       = despesa.cnpj
    ? fmtCNPJ(despesa.cnpj)
    : despesa.cpf || null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[520px] overflow-y-auto p-0 gap-0 border-l border-slate-200"
      >
        {/* ── HEADER ── */}
        <SheetHeader className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            {/* ícone do doc */}
            <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl border ${
              qualidade ? qualidade.bg : "bg-slate-50 border-slate-200"
            }`}>
              {qualidade?.icon ?? "📄"}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-[15px] font-black text-slate-900 leading-tight">
                {nomeFornec || "Fornecedor não identificado"}
              </SheetTitle>
              <p className="text-[12px] text-slate-500 mt-0.5">
                {despesa.categoria} · {despesa.competencia_label || fmtMesAno(despesa.competencia)}
              </p>
            </div>
            {/* valor líquido destaque */}
            <div className="shrink-0 text-right">
              <p className="text-[20px] font-black text-slate-900">{fmtBRL(despesa.valor)}</p>
              {glosado && (
                <p className="text-[10px] text-red-500 font-bold">
                  Glosado: {fmtBRL(despesa.valor_glosado)}
                </p>
              )}
            </div>
          </div>

          {/* badges de status rápido */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {qualidade && (
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                qualidade.bg
              } ${qualidade.color}`}>
                {qualidade.icon} Qualidade {qualidade.label}
                {scoreLabel && ` · ${scoreLabel}`}
              </span>
            )}
            {hasPdf && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                ✅ PDF disponível
              </span>
            )}
            {glosado && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-600">
                ⚠️ Glosa detectada
              </span>
            )}
            {despesa.orfao && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700">
                🔍 Órfão
              </span>
            )}
          </div>
        </SheetHeader>

        {/* ── CORPO ── */}
        <div className="p-4 space-y-3">

          {/* LINKS DE ACESSO — primeira posição, mais importante */}
          {(hasPdf || hasDetalhe || hasTranpar) && (
            <Section title="Documentos & Links" icon={<FileText className="w-4 h-4" />}>
              <div className="py-3 flex flex-col gap-2">
                {hasPdf && (
                  <LinkButton
                    href={despesa.link_pdf!}
                    label="Abrir PDF da Nota Fiscal"
                    icon={<FileText className="w-4 h-4" />}
                    variant="primary"
                  />
                )}
                {hasDetalhe && (
                  <LinkButton
                    href={despesa.link_detalhe!}
                    label="Ver detalhe no portal ALBA"
                    icon={<ExternalLink className="w-4 h-4" />}
                  />
                )}
                {hasTranpar && despesa.link_transparencia !== despesa.link_detalhe && (
                  <LinkButton
                    href={despesa.link_transparencia!}
                    label="Portal de Transparência"
                    icon={<Shield className="w-4 h-4" />}
                  />
                )}
              </div>
            </Section>
          )}

          {/* VALORES */}
          <Section title="Valores" icon={<Banknote className="w-4 h-4" />}>
            <InfoRow
              icon={<span className="text-base">💰</span>}
              label="Valor da nota"
              value={<span className="text-[15px] font-black text-slate-900">{fmtBRL(despesa.valor)}</span>}
            />
            {(despesa.valor_detalhe ?? 0) > 0 && despesa.valor_detalhe !== despesa.valor && (
              <InfoRow
                icon={<span className="text-base">📋</span>}
                label="Valor detalhado"
                value={fmtBRL(despesa.valor_detalhe!)}
              />
            )}
            <InfoRow
              icon={<span className="text-base">{glosado ? "🔴" : "🟢"}</span>}
              label="Valor glosado"
              value={
                <span className={glosado ? "text-red-600 font-black" : "text-slate-400"}>
                  {glosado ? fmtBRL(despesa.valor_glosado) : "R$ 0,00"}
                </span>
              }
            />
            {(despesa.valor_liquido ?? 0) > 0 && (
              <InfoRow
                icon={<span className="text-base">✅</span>}
                label="Valor líquido pago"
                value={
                  <span className="text-emerald-700 font-black text-[14px]">
                    {fmtBRL(despesa.valor_liquido!)}
                  </span>
                }
              />
            )}
          </Section>

          {/* FORNECEDOR */}
          <Section title="Fornecedor" icon={<Building2 className="w-4 h-4" />}>
            <InfoRow
              icon={<Building2 className="w-3.5 h-3.5" />}
              label="Nome do fornecedor"
              value={nomeFornec}
            />
            {despesa.tipo_documento && (
              <InfoRow
                icon={<Tag className="w-3.5 h-3.5" />}
                label="Tipo de documento"
                value={
                  <Badge variant="outline" className="text-[11px] font-bold">
                    {despesa.tipo_documento}
                  </Badge>
                }
              />
            )}
            {docId && (
              <InfoRow
                icon={
                  despesa.cnpj_valido
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                }
                label={despesa.cnpj ? "CNPJ" : "CPF"}
                value={
                  <span className={`font-mono ${
                    despesa.cnpj_valido === false ? "text-red-600" : "text-slate-800"
                  }`}>
                    {docId}
                    {despesa.cnpj_valido === false && (
                      <span className="ml-2 text-[10px] font-bold text-red-500">⚠️ inválido</span>
                    )}
                  </span>
                }
              />
            )}
          </Section>

          {/* DESPESA / CATEGORIZAÇÃO */}
          <Section title="Despesa" icon={<Tag className="w-4 h-4" />}>
            <InfoRow
              icon={<Calendar className="w-3.5 h-3.5" />}
              label="Competência"
              value={despesa.competencia_label || fmtMesAno(despesa.competencia)}
            />
            <InfoRow
              icon={<Tag className="w-3.5 h-3.5" />}
              label="Categoria"
              value={
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[12px] font-bold px-2.5 py-0.5 rounded-full">
                  {despesa.categoria}
                </span>
              }
            />
            {despesa.categoria_detalhe && despesa.categoria_detalhe !== despesa.categoria && (
              <InfoRow
                icon={<Info className="w-3.5 h-3.5" />}
                label="Detalhe da categoria"
                value={despesa.categoria_detalhe}
              />
            )}
            {despesa.num_processo && (
              <InfoRow
                icon={<Hash className="w-3.5 h-3.5" />}
                label="Nº do Processo"
                value={despesa.num_processo}
                mono
              />
            )}
            {despesa.num_nf && (
              <InfoRow
                icon={<FileText className="w-3.5 h-3.5" />}
                label="Nº da Nota Fiscal"
                value={despesa.num_nf_normalizado || despesa.num_nf}
                mono
              />
            )}
          </Section>

          {/* QUALIDADE / ORIGEM — para usuários avançados */}
          <Section title="Qualidade & Origem" icon={<Shield className="w-4 h-4" />}>
            {despesa.nivel_qualidade && (
              <InfoRow
                icon={<span className="text-sm">{qualidade?.icon ?? "📊"}</span>}
                label="Nível de qualidade"
                value={
                  <span className={qualidade ? `font-black ${qualidade.color}` : ""}>
                    {qualidade?.label || despesa.nivel_qualidade}
                    {scoreLabel && ` (${scoreLabel})`}
                  </span>
                }
              />
            )}
            {despesa.match_metodo && (
              <InfoRow
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                label="Método de match"
                value={despesa.match_metodo}
                mono
              />
            )}
            {despesa.fonte_portal && (
              <InfoRow
                icon={<Layers className="w-3.5 h-3.5" />}
                label="Portal de origem"
                value={despesa.fonte_portal}
                mono
              />
            )}
            {despesa.esfera && (
              <InfoRow
                icon={<Shield className="w-3.5 h-3.5" />}
                label="Esfera"
                value={`${despesa.esfera?.toUpperCase()} · ${despesa.uf || ""}`}
              />
            )}
            {(despesa.bebeto_versao || despesa.ronaldo_versao) && (
              <InfoRow
                icon={<Info className="w-3.5 h-3.5" />}
                label="Versão dos agentes"
                value={
                  <span className="text-[11px] text-slate-500 font-mono">
                    {[despesa.bebeto_versao, despesa.ronaldo_versao].filter(Boolean).join(" · ")}
                  </span>
                }
              />
            )}
          </Section>

          {/* FLAGS DE ANÁLISE */}
          {flags.length > 0 && (
            <Section title="Flags de Análise" icon={<AlertTriangle className="w-4 h-4" />}>
              <div className="py-3 flex flex-wrap gap-1.5">
                {flags.map((flag) => {
                  const cfg = FLAG_LABELS[flag];
                  return (
                    <span
                      key={flag}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        cfg ? cfg.color : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {cfg?.label || flag}
                    </span>
                  );
                })}
              </div>
            </Section>
          )}

          {/* TIMESTAMPS */}
          <Section title="Rastreabilidade" icon={<Clock className="w-4 h-4" />}>
            {despesa.coletado_em && (
              <InfoRow
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Coletado em"
                value={fmtDate(despesa.coletado_em)}
              />
            )}
            {despesa.processado_em && (
              <InfoRow
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Processado em"
                value={fmtDate(despesa.processado_em)}
              />
            )}
            {despesa.criado_em && (
              <InfoRow
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Inserido no banco em"
                value={fmtDate(despesa.criado_em)}
              />
            )}
            <InfoRow
              icon={<Hash className="w-3.5 h-3.5" />}
              label="ID Prisma"
              value={
                <span className="text-[10px] font-mono text-slate-300 select-all">
                  {despesa.id}
                </span>
              }
            />
          </Section>

        </div>
      </SheetContent>
    </Sheet>
  );
}
