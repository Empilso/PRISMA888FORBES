"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

import { createClient } from "@/lib/supabase/client";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Sparkles,
  CheckCircle,
  Send,
  GripVertical,
  LayoutList,
  Clock,
  Bot,
  RefreshCcw,
  AlertTriangle,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Edit,
  ChevronDown,
  Terminal,
  Radar,
  Map as MapIcon,
  Plus,
  Instagram,
  Save,
  Hash,
  Globe,
  Users,
  Settings,
  Eye,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useParams, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StrategyEditorSheet } from "@/components/campaign/StrategyEditorSheet";
import { ExamplesRenderer } from "@/components/tasks/ExamplesRenderer";
import { CampaignManifesto } from "@/components/campaign/CampaignManifesto";
import { GeneratorDialog } from "@/components/campaign/GeneratorDialog";
import { SquadManager } from "@/components/campaign/SquadManager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CollapsibleConsole } from "@/components/console/CollapsibleConsole";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// --- NOVOS COMPONENTES ENTERPRISE ---
// --- NOVOS COMPONENTES ENTERPRISE ---
interface RadarBreakdownItem {
  target: string;
  total_posts: number;
  platforms: string[];
  last_post: string | null;
  unique_authors?: number;
  locations_count?: number;
  sentiment_stats?: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

interface EngineStatus {
  status: "online" | "offline" | "checking" | "error";
  latency_ms?: number;
  reason?: string;
  last_check?: Date;
}

function SocialTargetCard({
  type,
  target,
  platform,
  onChange,
  onDelete,
  breakdown,
  density,
  onDensityChange,
  campaignId,
}: {
  type: "profile" | "keyword" | "hashtag";
  target: string;
  platform?: "instagram" | "tiktok";
  onChange: (val: string) => void;
  onDelete: () => void;
  breakdown?: RadarBreakdownItem;
  density: number;
  onDensityChange: (val: number) => void;
  campaignId: string;
}) {
  const isProfile = type === "profile";
  const isHashtag = type === "hashtag";
  const isKeyword = type === "keyword";
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const getIcon = () => {
    if (isKeyword) return <Sparkles className="h-5 w-5 text-amber-500" />;
    if (isHashtag) return <Hash className="h-5 w-5 text-blue-500" />;
    if (platform === "instagram")
      return <Instagram className="h-5 w-5 text-pink-500" />;
    return <span className="text-lg">🎵</span>;
  };

  const getLabel = () => {
    if (isKeyword) return "Tema Estratégico";
    if (isHashtag) return "Hashtag Global";
    return `${platform === "instagram" ? "Instagram" : "TikTok"} Target`;
  };

  const fetchDetails = async () => {
    if (!target.trim()) return;
    setLoadingDetails(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const handle = target.replace("@", "").replace("#", "").trim();
      const res = await fetch(
        `/api/campaign/${campaignId}/social/target/${handle}/details`,
        { headers: { underdog_skip_browser_warning: "true" } }
      );
      if (res.ok) {
        const data = await res.json();
        setDetails(data);
      }
    } catch (e) {
      console.error("[Details] Error:", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleToggleDetails = () => {
    if (!showDetails && !details) fetchDetails();
    setShowDetails(!showDetails);
  };

  return (
    <div className="relative group/card animate-in fade-in zoom-in duration-300">
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-slate-200 to-slate-300 opacity-20 group-hover/card:opacity-40 transition duration-500 blur" />
      <Card className="relative bg-white border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl">
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-100 shadow-sm`}
              >
                {getIcon()}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                  {getLabel()}
                </p>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1 h-1 rounded-full ${breakdown?.total_posts !== undefined && breakdown.total_posts > 0 ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                  <span className={`text-[10px] font-bold uppercase ${breakdown?.total_posts !== undefined && breakdown.total_posts > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                    {breakdown?.total_posts !== undefined && breakdown.total_posts > 0 ? `${breakdown.total_posts} posts sincronizados` : 'Aguardando Sinc'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Select value={density.toString()} onValueChange={(v) => onDensityChange(parseInt(v))}>
                <SelectTrigger className="h-7 w-20 text-[10px] bg-slate-50 border-none font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5" className="text-[10px] font-bold">5 (TEST)</SelectItem>
                  <SelectItem value="20" className="text-[10px] font-bold">20 (NORMAL)</SelectItem>
                  <SelectItem value="100" className="text-[10px] font-bold">100 (ELITE)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none">
              {isProfile ? "@" : isHashtag ? "#" : "T:"}
            </div>
            <Input
              placeholder={
                isProfile ? "usuario" : isHashtag ? "assunto" : "termo de busca"
              }
              className="h-10 bg-slate-50 border-slate-100 focus:border-slate-300 focus:ring-0 font-bold text-sm pl-8 rounded-xl"
              value={target}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>

          {/* 📡 Métricas de Breakdown */}
          {breakdown && breakdown.total_posts !== undefined && (
            <div className="grid grid-cols-3 gap-2 mt-1 pt-3 border-t border-slate-100">
              <div className="flex flex-col items-center p-2 rounded-lg bg-slate-50">
                <span className="text-xs font-bold text-slate-700">{breakdown.unique_authors || 0}</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-400">Autores</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-blue-50/50">
                <span className="text-xs font-bold text-blue-700">{breakdown.locations_count || 0}</span>
                <span className="text-[9px] uppercase tracking-wider text-blue-500">Locais</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-emerald-50/50">
                <span className="text-xs font-bold text-emerald-700">{breakdown.sentiment_stats?.positive || 0}</span>
                <span className="text-[9px] uppercase tracking-wider text-emerald-600">Positivos</span>
              </div>
            </div>
          )}

          {/* 🔍 Botão Ver Detalhes */}
          {breakdown && breakdown.total_posts > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleDetails}
              className="w-full h-7 text-[10px] font-bold text-purple-600 bg-purple-50/50 hover:bg-purple-100 rounded-lg"
            >
              {loadingDetails ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Eye className="h-3 w-3 mr-1" />
              )}
              {showDetails ? "Fechar Detalhes" : "Ver Detalhes Completos"}
            </Button>
          )}

          {/* 📋 Painel de Detalhes Expandido */}
          {showDetails && details && (
            <div className="mt-2 pt-3 border-t border-purple-100 space-y-3 animate-in slide-in-from-top-2 duration-300">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-purple-50 rounded-lg">
                  <p className="text-lg font-black text-purple-700">{details.total_mentions || 0}</p>
                  <p className="text-[9px] uppercase text-purple-500 font-bold">Menções</p>
                </div>
                <div className="text-center p-2 bg-cyan-50 rounded-lg">
                  <p className="text-lg font-black text-cyan-700">{details.total_posts || 0}</p>
                  <p className="text-[9px] uppercase text-cyan-500 font-bold">Posts</p>
                </div>
                <div className="text-center p-2 bg-amber-50 rounded-lg">
                  <p className="text-lg font-black text-amber-700">{details.total_commenters || 0}</p>
                  <p className="text-[9px] uppercase text-amber-500 font-bold">Autores</p>
                </div>
              </div>

              {/* Sentimento */}
              {details.sentiment && (
                <div className="flex gap-1">
                  <div className="flex-1 h-2 rounded-full bg-emerald-400" style={{ flex: details.sentiment.positive || 1 }} title={`${details.sentiment.positive} positivos`} />
                  <div className="flex-1 h-2 rounded-full bg-slate-300" style={{ flex: details.sentiment.neutral || 1 }} title={`${details.sentiment.neutral} neutros`} />
                  <div className="flex-1 h-2 rounded-full bg-red-400" style={{ flex: details.sentiment.negative || 1 }} title={`${details.sentiment.negative} negativos`} />
                </div>
              )}

              {/* Posts */}
              {details.posts && details.posts.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 mb-1.5">📍 Posts Encontrados</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {details.posts.slice(0, 10).map((post: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg text-[10px]">
                        <span className="font-bold text-slate-500 w-5">#{i + 1}</span>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate flex-1 font-medium"
                        >
                          {post.url !== "sem_url" ? post.url.replace("https://www.instagram.com/", "").slice(0, 40) : "Post sem URL"}
                        </a>
                        <span className="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded">{post.comments_count} msgs</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comentaristas */}
              {details.commenters && details.commenters.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 mb-1.5">👥 Top Comentaristas</p>
                  <div className="flex flex-wrap gap-1">
                    {details.commenters.slice(0, 15).map((c: any, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full text-[9px] font-bold text-slate-600">
                        @{c.username}
                        <span className="text-purple-500">({c.comments_count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function GridStatusHeader({ total }: { total: number }) {
  return (
    <div className="flex items-center justify-between px-2 mb-6 animate-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-purple-100 rounded-2xl">
          <Radar className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Geo-Inteligência de Rivais
          </h2>
          <p className="text-[13px] text-slate-500">
            Monitorando{" "}
            <span className="font-bold text-purple-600">{total} canais</span> em
            tempo real
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-slate-600">
            IA de Sentimento: 100% On
          </span>
        </div>
      </div>
    </div>
  );
}

interface Strategy {
  id: string;
  title: string;
  description: string;
  pillar: string;
  phase: string;
  status: "suggested" | "approved" | "published" | "executed";
  campaign_id: string;
  run_id?: string;
  examples?: string[];
}

interface AnalysisRun {
  id: string;
  campaign_id: string;
  persona_name: string;
  llm_model: string;
  strategic_plan_text: string;
  created_at: string;
}

interface Campaign {
  id: string;
  candidate_name: string;
  role: string;
}

const pillarColors: Record<string, string> = {
  Credibilidade: "bg-blue-100 text-blue-800 border-blue-300",
  Proximidade: "bg-green-100 text-green-800 border-green-300",
  Transformação: "bg-purple-100 text-purple-800 border-purple-300",
  Segurança: "bg-orange-100 text-orange-800 border-orange-300",
  Competência: "bg-indigo-100 text-indigo-800 border-indigo-300",
};

const phaseIcons: Record<string, string> = {
  "Pré-Campanha": "🔍",
  "1ª Fase": "🚀",
  "2ª Fase": "⚡",
  Final: "🎯",
};

function DraggableStrategyCard({
  strategy,
  onClick,
  onMove,
}: {
  strategy: Strategy;
  onClick?: () => void;
  onMove?: (strategyId: string, newStatus: "suggested" | "approved") => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: strategy.id,
    });

  const colorClass =
    pillarColors[strategy.pillar] || "bg-gray-100 text-gray-800";

  // Removing borders from color class if they exist in pillarColors map
  const badgeClass = colorClass.replace(/border-[a-z]+-[0-9]+/, "");

  const style = transform
    ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      opacity: isDragging ? 0.8 : 1,
      zIndex: isDragging ? 50 : 0,
    }
    : undefined;

  const handleQuickMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMove) {
      const newStatus =
        strategy.status === "suggested" ? "approved" : "suggested";
      onMove(strategy.id, newStatus);
    }
  };

  const handleEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onClick) {
      onClick();
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <Card
        className={`
                    cursor-grab active:cursor-grabbing border border-slate-100
                    bg-white rounded-xl shadow-sm hover:shadow-md 
                    transition-all duration-200 hover:border-slate-200
                    ${isDragging ? "shadow-xl rotate-2 ring-2 ring-primary/20" : ""}
                `}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start gap-2 mb-2">
            <div
              className="flex items-center gap-2"
              {...listeners}
              {...attributes}
            >
              <Badge
                variant="secondary"
                className={`${badgeClass} border-none rounded-full px-2 py-0.5 font-normal`}
              >
                {strategy.pillar}
              </Badge>
              {strategy.status === "executed" && (
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700 border-none rounded-full px-2 py-0.5 font-medium flex items-center gap-1"
                  title="O candidato aprovou esta estratégia"
                >
                  <CheckCircle className="w-3 h-3" />
                  Aprovado
                </Badge>
              )}
            </div>
            <span
              className="text-sm bg-slate-50 p-1 rounded-full"
              title={strategy.phase}
            >
              {phaseIcons[strategy.phase] || "📌"}
            </span>
          </div>
          <CardTitle className="text-base font-semibold leading-tight text-slate-800">
            {strategy.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1 flex flex-col h-full">
          <p className="text-sm text-slate-500 line-clamp-3 mb-4 leading-relaxed flex-1">
            {strategy.description}
          </p>

          {/* Examples Section */}
          <div className="mt-auto">
            <ExamplesRenderer
              examples={strategy.examples}
              mode="card"
              onViewAll={handleEdit}
            />
          </div>

          {/* Botões de Ação Rápida - Invisíveis até hover (exceto em mobile/touch) */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-8 text-xs flex-1 rounded-full hover:bg-slate-100 text-slate-600"
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>

            {strategy.status === "suggested" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleQuickMove}
                className="h-8 text-xs text-green-700 hover:text-green-800 hover:bg-green-50 rounded-full"
              >
                <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                Aprovar
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleQuickMove}
                className="h-8 text-xs text-orange-700 hover:text-orange-800 hover:bg-orange-50 rounded-full"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Voltar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DroppableColumn({
  id,
  title,
  icon,
  children,
  count,
  actionButton,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  count: number;
  actionButton?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`
                h-full flex flex-col p-4 rounded-3xl transition-all duration-300
                ${isOver
          ? "bg-slate-100/80 ring-2 ring-primary/20 scale-[1.01]"
          : "bg-slate-50/40 border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
        }
            `}
    >
      <div className="flex items-center justify-between mb-4 pl-1 pr-1">
        <div className="flex items-center gap-3 opacity-80">
          {icon}
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            {title} <span className="text-slate-400 ml-1">({count})</span>
          </h3>
        </div>
        {actionButton}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
        {count === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 rounded-2xl bg-white/50">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400 font-medium">
              {id === "approved" ? "Arraste para aprovar" : "Lista vazia"}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default function CampaignSetupPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "radar" | "squad">(
    "kanban",
  );
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(
    null,
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<
    "suggested" | "approved"
  >("suggested");
  // 🔍 Estados para verificação de saúde dos dados
  const [locationsCount, setLocationsCount] = useState<number | null>(null);
  const [chunksCount, setChunksCount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [documents, setDocuments] = useState<
    { file_url: string; file_type: string }[]
  >([]);

  // 📡 Social Radar Stats
  const [socialStats, setSocialStats] = useState<{
    total_mentions: number;
    is_active: boolean;
  } | null>(null);

  // 📡 Social Links (Monitor de Rivais)
  const [igHandles, setIgHandles] = useState<string[]>([""]);
  const [tkHandles, setTkHandles] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [savingSocial, setSavingSocial] = useState(false);
  const [socialLoaded, setSocialLoaded] = useState(false);

  // Enterprise Status States
  const [radarBreakdown, setRadarBreakdown] = useState<Record<string, RadarBreakdownItem>>({});
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({ status: 'checking' });

  // ⚙️ Radar Advanced Settings
  const [radarConfig, setRadarConfig] = useState<{
    fetch_interval: string;
    posts_limit: number;
    last_sync: string | null;
  }>({
    fetch_interval: "12h",
    posts_limit: 5,
    last_sync: null,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // 🖥️ Console de Execução Global
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  // 🛡️ Prevenção de Loops Infinitos (Guarda de Inicialização Única por ID)
  const initializedRef = useRef<string | null>(null);

  const handleRunStarted = (runId: string) => {
    console.log("🎧 Console listening to:", runId); // DEBUG
    setCurrentRunId(runId);
    setIsConsoleOpen(true);
    // Marcamos que a execução começou para podermos notificar o fim
    setIsProcessing(true);
    toast({
      title: "IA Iniciada",
      description:
        "Acompanhe o progresso no console abaixo e as estratégias em tempo real.",
    });
  };

  // 🔔 Função para detectar fim da execução e avisar o usuário
  const handleNewLog = (log: any) => {
    try {
      if (!log) return;
      const rawOutput = typeof log.raw_output === 'string' ? log.raw_output :
        (typeof log.message === 'string' ? log.message : "");
      const isSuccess = log.is_success === true || log.status === 'success';

      if (isSuccess || rawOutput.includes("finalizada com sucesso") || rawOutput.includes("Resultados salvos")) {
        // Só dispara o toast se estávamos processando
        if (isProcessing) {
          setIsProcessing(false);
          toast({
            title: "Estratégia Concluída! 🏁",
            description: "O plano estratégico foi gerado com sucesso para este candidato.",
            duration: 10000,
          });
          // Recarregar estratégias para mostrar as novas
          fetchStrategies();
        }
      }

      if (log.is_success === false || log.status === 'error') {
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("Erro no handleNewLog:", err);
    }
  };

  const supabase = React.useMemo(() => createClient(), []);
  const { toast } = useToast();

  // --- HELPER FUNCTIONS FOR SOCIAL TARGETS ---
  const addIgHandle = () => setIgHandles([...igHandles, ""]);
  const addTkHandle = () => setTkHandles([...tkHandles, ""]);
  const addKeyword = () => setKeywords([...keywords, ""]);
  const addHashtag = () => setHashtags([...hashtags, ""]);

  const removeIgHandle = (index: number) =>
    setIgHandles(igHandles.filter((_, i) => i !== index));
  const removeTkHandle = (index: number) =>
    setTkHandles(tkHandles.filter((_, i) => i !== index));
  const removeKeyword = (index: number) =>
    setKeywords(keywords.filter((_, i) => i !== index));
  const removeHashtag = (index: number) =>
    setHashtags(hashtags.filter((_, i) => i !== index));

  const updateIgHandle = (index: number, val: string) => {
    const newArr = [...igHandles];
    newArr[index] = val;
    setIgHandles(newArr);
  };
  const updateTkHandle = (index: number, val: string) => {
    const newArr = [...tkHandles];
    newArr[index] = val;
    setTkHandles(newArr);
  };
  const updateKeyword = (index: number, val: string) => {
    const newArr = [...keywords];
    newArr[index] = val;
    setKeywords(newArr);
  };
  const updateHashtag = (index: number, val: string) => {
    const newArr = [...hashtags];
    newArr[index] = val;
    setHashtags(newArr);
  };


  console.log("🚀 [INIT] Campaign ID from params:", campaignId);
  console.log("🚀 [INIT] Supabase client created:", !!supabase);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const fetchCampaign = async () => {
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, candidate_name, role")
      .eq("id", campaignId)
      .single();

    if (error) {
      console.error("❌ [ERROR] Erro ao buscar campanha:", error);
    } else {
      console.log("✅ [SUCCESS] Campanha carregada:", data);
      setCampaign(data);
    }
  };

  const fetchRuns = async () => {
    console.log("📦 [RUNS] Fetching analysis runs for campaign:", campaignId);

    const { data, error } = await supabase
      .from("analysis_runs")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ [ERROR] Erro ao buscar runs:", error);
    } else {
      console.log("✅ [SUCCESS] Runs carregadas:", data?.length || 0);
      setRuns(data || []);

      // Auto-seleciona a run mais recente
      if (data && data.length > 0 && !selectedRunId) {
        setSelectedRunId(data[0].id);
        console.log(
          "📌 [AUTO-SELECT] Run mais recente selecionada:",
          data[0].id,
        );
      }
    }
  };

  const fetchStrategies = async () => {
    setLoading(true);
    console.log("🔍 [DEBUG] ========== FETCH STRATEGIES ==========");
    console.log("🔍 [DEBUG] Campaign ID:", campaignId);
    console.log("🔍 [DEBUG] Selected Run ID:", selectedRunId);

    try {
      const { data, error, count } = await supabase
        .from("strategies")
        .select("*", { count: "exact" })
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      console.log("📡 [RESPONSE] Supabase response:", {
        dataLength: data?.length,
        error: error?.message,
        count,
      });

      if (error) {
        console.error("❌ [ERROR] Erro ao buscar estratégias:", error);
        toast({
          title: "Erro",
          description: `Não foi possível carregar as estratégias: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log("✅ [SUCCESS] Estratégias carregadas:", data?.length || 0);
        if (data && data.length > 0) {
          console.log("📊 [DATA] Primeira estratégia:", data[0].title);
          console.log("📊 [DATA] Run IDs das estratégias:", [
            ...new Set(data.map((s) => s.run_id)),
          ]);
        }
        setStrategies(data || []);
      }
    } catch (err) {
      console.error("❌ [EXCEPTION] Erro inesperado:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 🛡️ Guard: Executa apenas uma vez se o campaignId for o mesmo
    if (initializedRef.current === campaignId) return;
    initializedRef.current = campaignId;

    console.log("🛠️ [INIT] Estabilizando Página de Setup para ID:", campaignId);

    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchCampaign(),
        fetchRuns(),
        fetchStrategies(),
        fetchDataHealth(),
        fetchSocialStats(),
        fetchSocialLinks(),
        fetchEnterpriseRadarHealth()
      ]);
      setLoading(false);
    }
    init();
  }, [campaignId]);

  // 📡 Fetch Social Radar Stats
  const fetchSocialStats = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(
        `/api/campaign/${campaignId}/social/stats`,
        { headers: { "ngrok-skip-browser-warning": "true" } }
      );
      if (res.ok) {
        const data = await res.json();
        setSocialStats(data);
      }
    } catch (e) {
      console.log("[SocialRadar] Stats not available yet");
    }
  };

  const fetchEnterpriseRadarHealth = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // 1. Fetch Engine Status Ping
      setEngineStatus({ status: 'checking' });
      const engineRes = await fetch(`/api/admin/services/engine/test`, {
        headers: { underdog_skip_browser_warning: "true" }
      }).catch(() => null);

      if (engineRes && engineRes.ok) {
        const engineData = await engineRes.json();
        setEngineStatus({
          status: engineData.status,
          latency_ms: engineData.latency_ms,
          reason: engineData.reason,
          last_check: new Date()
        });
      } else {
        setEngineStatus({ status: 'error', reason: 'Failed to reach backend connection test', last_check: new Date() });
      }

      // 2. Fetch Radar Breakdown
      const breakdownRes = await fetch(`/api/campaign/${campaignId}/social/stats/breakdown`, {
        headers: { underdog_skip_browser_warning: "true" }
      }).catch(() => null);

      if (breakdownRes && breakdownRes.ok) {
        const breakdownData = await breakdownRes.json();
        if (breakdownData.breakdown && Array.isArray(breakdownData.breakdown)) {
          const mappedBreakdown: Record<string, RadarBreakdownItem> = {};
          breakdownData.breakdown.forEach((item: RadarBreakdownItem) => {
            mappedBreakdown[item.target] = item;
          });
          setRadarBreakdown(mappedBreakdown);
        }
      }

    } catch (e) {
      console.error("[EnterpriseHealth] Failed to load deep stats", e);
    }
  };

  // 📡 Fetch Social Links from campaign
  const fetchSocialLinks = async () => {
    try {
      const { data } = await supabase
        .from("campaigns")
        .select("social_links")
        .eq("id", campaignId)
        .single();

      if (data?.social_links) {
        const sl = data.social_links as any;
        // Normalize fetched handles: ensure they start with @ and remove empty/null
        const ig = (sl.instagram || [])
          .filter((h: any) => h)
          .map((h: string) => (h.startsWith("@") ? h : `@${h}`));
        const tk = (sl.tiktok || [])
          .filter((h: any) => h)
          .map((h: string) => (h.startsWith("@") ? h : `@${h}`));

        if (ig.length > 0) setIgHandles(ig);
        if (tk.length > 0) setTkHandles(tk);
        if (sl.keywords?.length > 0) setKeywords(sl.keywords);
        if (sl.hashtags?.length > 0) setHashtags(sl.hashtags);
        if (sl.radar_config) {
          setRadarConfig({
            fetch_interval: sl.radar_config.fetch_interval || "12h",
            posts_limit: sl.radar_config.posts_limit || 100,
            last_sync: sl.radar_config.last_sync || null,
          });
        }
      }
      setSocialLoaded(true);
    } catch (e) {
      console.log("[SocialLinks] Not loaded:", e);
      setSocialLoaded(true);
    }
  };

  // 📡 Save Social Links directly to campaigns
  const saveSocialLinks = async () => {
    setSavingSocial(true);
    try {
      const normalize = (h: string) => {
        const clean = h.trim().replace(/^@/, "");
        return clean ? `@${clean}` : "";
      };

      const socialLinks = {
        instagram: igHandles.map(normalize).filter((h) => h),
        tiktok: tkHandles.map(normalize).filter((h) => h),
        keywords: keywords.filter((k) => k.trim()),
        hashtags: hashtags
          .map((h) => h.trim().replace(/^#/, ""))
          .filter((h) => h)
          .map((h) => `#${h}`),
        radar_config: radarConfig,
      };

      const { error } = await supabase
        .from("campaigns")
        .update({ social_links: socialLinks })
        .eq("id", campaignId);

      if (error) throw error;

      toast({
        title: "📡 Radar Atualizado!",
        description: `${socialLinks.instagram.length} Instagram + ${socialLinks.tiktok.length} TikTok handles salvos.`,
      });
      fetchSocialStats();
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e.message || "Falha ao salvar.",
        variant: "destructive",
      });
    } finally {
      setSavingSocial(false);
    }
  };

  // 🔍 Verificar saúde dos dados (locations e chunks)
  const fetchDataHealth = async () => {
    console.log(
      "🔍 [DATA HEALTH] Verificando dados processados para campanha:",
      campaignId,
    );

    // Buscar documentos da campanha
    const { data: docs } = await supabase
      .from("documents")
      .select("file_url, file_type")
      .eq("campaign_id", campaignId);

    setDocuments(docs || []);
    console.log("📄 [DATA HEALTH] Documentos encontrados:", docs?.length || 0);

    // Contar locations
    const { count: locCount } = await supabase
      .from("locations")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    setLocationsCount(locCount || 0);
    console.log("📍 [DATA HEALTH] Locations:", locCount);

    // Contar chunks (document_chunks)
    const { count: chunkCount } = await supabase
      .from("document_chunks")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    setChunksCount(chunkCount || 0);
    console.log("📝 [DATA HEALTH] Chunks:", chunkCount);

    console.log("DEBUG DADOS:", {
      locationsCount: locCount,
      chunksCount: chunkCount,
    });
  };

  // 🔄 Processar arquivos pendentes
  const handleProcessFiles = async () => {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    console.log("🔌 Tentando conectar ao Backend em:", backendUrl);

    setIsProcessing(true);
    toast({
      title: "🔄 Processando arquivos...",
      description: "Isso pode levar alguns segundos.",
    });

    try {
      // Processar CSV (locations)
      const csvDoc = documents.find((d) => d.file_type === "csv");
      if (csvDoc && locationsCount === 0) {
        console.log("📊 [PROCESS] Processando CSV:", csvDoc.file_url);
        const csvResponse = await fetch(`/api/ingest/locations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify({
            campaign_id: campaignId,
            file_url: csvDoc.file_url,
          }),
        });
        if (!csvResponse.ok) {
          const errorData = await csvResponse.json().catch(() => ({}));
          throw new Error(
            `CSV Error: ${csvResponse.status} - ${errorData.detail || "Unknown"}`,
          );
        }
      }

      // Processar PDF (chunks)
      const pdfDoc = documents.find((d) => d.file_type === "pdf");
      if (pdfDoc && chunksCount === 0) {
        console.log("📄 [PROCESS] Processando PDF:", pdfDoc.file_url);
        const pdfResponse = await fetch(`/api/ingest/pdf`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify({
            campaign_id: campaignId,
            file_url: pdfDoc.file_url,
          }),
        });
        if (!pdfResponse.ok) {
          const errorData = await pdfResponse.json().catch(() => ({}));
          throw new Error(
            `PDF Error: ${pdfResponse.status} - ${errorData.detail || "Unknown"}`,
          );
        }
      }

      toast({
        title: "✅ Processamento concluído!",
        description:
          "Os dados foram processados. Mapa pronto para visualização!",
        action: (
          <ToastAction
            altText="Ver Mapa"
            onClick={() => router.push(`/campaign/${campaignId}/map`)}
          >
            🗺️ Ver Mapa
          </ToastAction>
        ),
      });

      // Recarregar contagens
      await fetchDataHealth();
    } catch (error) {
      console.error("❌ Erro CRÍTICO de Conexão:", error);
      toast({
        title: "Erro de Conexão",
        description:
          "Não foi possível contatar o servidor Python. Verifique se ele está rodando na porta 8000.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // 🔄 Forçar sincronização do Radar
  const handleSyncSocialData = async () => {
    setIsSyncing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      // Usar o limite definido no radarConfig (ou 10 como default)
      const max_posts = radarConfig.posts_limit || 10;

      const res = await fetch(
        `/api/campaign/${campaignId}/social/scrape?max_posts=${max_posts}`,
        {
          method: "POST",
          headers: { underdog_skip_browser_warning: "true" }
        }
      );

      if (!res.ok) {
        throw new Error("Erro ao acionar motor");
      }

      const result = await res.json();

      const newSyncDate = new Date().toISOString();
      setRadarConfig(prev => ({ ...prev, last_sync: newSyncDate }));

      toast({
        title: "📡 Sincronização Concluída!",
        description: `${result.mentions_count || 0} menções detectadas e mapeadas. Atualizando painéis...`,
      });
      fetchEnterpriseRadarHealth();
      // Salva o config atualizado p/ manter o last_sync persistente e recarregar stats
      setTimeout(saveSocialLinks, 500);
    } catch (e: any) {
      toast({
        title: "Erro de Sincronização",
        description: "Não foi possível conectar ao motor AIOS ou executar scraper.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const strategyId = active.id as string;
    const newStatus = over.id as "suggested" | "approved";

    const strategy = strategies.find((s) => s.id === strategyId);
    if (!strategy || strategy.status === newStatus) return;

    let updatePayload: any = { status: newStatus };
    // Se está voltando para sugestões e a versão atual não é a da estratégia,
    // trazemos ela para a versão atual visível para não sumir da tela.
    if (
      newStatus === "suggested" &&
      selectedRunId &&
      strategy.run_id !== selectedRunId
    ) {
      updatePayload.run_id = selectedRunId;
    }

    // Optimistic UI Update
    setStrategies((prev) =>
      prev.map((s) => (s.id === strategyId ? { ...s, ...updatePayload } : s)),
    );

    // Persist to Database
    const { error } = await supabase
      .from("strategies")
      .update(updatePayload)
      .eq("id", strategyId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a estratégia.",
        variant: "destructive",
      });
      // Rollback
      fetchStrategies();
    } else {
      toast({
        title:
          newStatus === "approved"
            ? "✅ Aprovado!"
            : "↩️ Movido para Sugestões",
        description: `A estratégia foi ${newStatus === "approved" ? "aprovada" : "retornada para sugestões"}.`,
      });
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    toast({
      title: "📤 Publicando Campanha",
      description: "Enviando estratégias aprovadas para o candidato...",
    });

    try {
      const response = await fetch(
        `/api/campaign/${campaignId}/publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify({ strategy_ids: null }), // Publish all approved
        },
      );

      if (!response.ok) throw new Error("Falha ao publicar");

      const result = await response.json();

      toast({
        title: "✅ Campanha Publicada!",
        description: result.message,
      });

      // Opcional: Recarregar estratégias para atualizar status
      // fetchStrategies();
    } catch (error) {
      console.error("Erro ao publicar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível publicar a campanha.",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleGenerationSuccess = async () => {
    console.log(
      "🎉 [GENERATION] Nova análise concluída! Recarregando dados...",
    );

    // Espera um pouco mais para garantir que o backend persistiu tudo
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Recarrega as runs
    const { data: newRuns, error: runsError } = await supabase
      .from("analysis_runs")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    if (runsError) {
      console.error("❌ [ERROR] Erro ao buscar runs:", runsError);
    }

    if (newRuns && newRuns.length > 0) {
      setRuns(newRuns);
      // FORÇA a seleção da run mais recente
      const latestRunId = newRuns[0].id;
      setSelectedRunId(latestRunId);
      console.log("🆕 [AUTO-SELECT] Nova run selecionada:", latestRunId);

      // Busca estratégias diretamente com o run_id correto
      const { data: newStrategies, error: stratError } = await supabase
        .from("strategies")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (stratError) {
        console.error("❌ [ERROR] Erro ao buscar estratégias:", stratError);
      } else {
        console.log(
          "✅ [SUCCESS] Estratégias recarregadas:",
          newStrategies?.length || 0,
        );
        setStrategies(newStrategies || []);
      }
    }

    // Força mais uma atualização após 3 segundos (safety net)
    setTimeout(() => {
      console.log("🔄 [SAFETY] Recarregando estratégias (safety net)...");
      fetchStrategies();
    }, 3000);
  };

  const handleMove = async (
    strategyId: string,
    newStatus: "suggested" | "approved",
  ) => {
    const strategy = strategies.find((s) => s.id === strategyId);
    if (!strategy) return;

    let updatePayload: any = { status: newStatus };
    if (
      newStatus === "suggested" &&
      selectedRunId &&
      strategy.run_id !== selectedRunId
    ) {
      updatePayload.run_id = selectedRunId;
    }

    // Optimistic UI Update
    setStrategies((prev) =>
      prev.map((s) => (s.id === strategyId ? { ...s, ...updatePayload } : s)),
    );

    // Persist to Database
    const { error } = await supabase
      .from("strategies")
      .update(updatePayload)
      .eq("id", strategyId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a estratégia.",
        variant: "destructive",
      });
      // Rollback
      fetchStrategies();
    } else {
      toast({
        title:
          newStatus === "approved"
            ? "✅ Aprovado!"
            : "↩️ Movido para Sugestões",
        description: `Estratégia atualizada.`,
      });
    }
  };

  const handleApproveAll = async () => {
    if (suggestedStrategies.length === 0) return;

    const confirmApprove = confirm(
      `✅ Aprovar ${suggestedStrategies.length} estratégias?\n\nTodas as sugestões visíveis serão aprovadas.`,
    );

    if (!confirmApprove) return;

    setApprovingAll(true);

    try {
      // Atualizar todas as estratégias sugeridas para aprovadas
      const updates = suggestedStrategies.map((s) =>
        supabase
          .from("strategies")
          .update({ status: "approved" })
          .eq("id", s.id),
      );

      await Promise.all(updates);

      toast({
        title: "✅ Sucesso!",
        description: `${suggestedStrategies.length} estratégias aprovadas.`,
      });

      // Recarregar estratégias
      fetchStrategies();
    } catch (error) {
      console.error("Erro ao aprovar todas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível aprovar todas as estratégias.",
        variant: "destructive",
      });
    } finally {
      setApprovingAll(false);
    }
  };

  const handleDeleteRun = async () => {
    if (!selectedRunId) return;

    const confirmDelete = confirm(
      "⚠️ Tem certeza que deseja apagar esta análise?\n\nIsso vai remover permanentemente todas as estratégias e logs associados.",
    );

    if (!confirmDelete) return;

    setDeleting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const backendUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `/api/campaign/${campaignId}/run/${selectedRunId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Falha ao deletar run: ${errorData.detail || response.statusText}`,
        );
      }

      toast({
        title: "🗑️ Análise Deletada",
        description: "A versão foi removida com sucesso.",
      });

      // Recarregar runs
      await fetchRuns();

      // Selecionar próxima run disponível
      const { data: remainingRuns } = await supabase
        .from("analysis_runs")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (remainingRuns && remainingRuns.length > 0) {
        setSelectedRunId(remainingRuns[0].id);
      } else {
        setSelectedRunId(null);
      }

      // Recarregar estratégias
      fetchStrategies();
    } catch (error) {
      console.error("Erro ao deletar run:", error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a análise.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // 🔧 FIX: Filtros com versão correta (Memorizados para evitar LOOPS)
  const suggestedStrategies = React.useMemo(() => strategies.filter(
    (s) => s.status === "suggested" && s.run_id === selectedRunId,
  ), [strategies, selectedRunId]);

  const approvedStrategies = React.useMemo(() => strategies.filter(
    (s) =>
      s.status === "approved" ||
      s.status === "published" ||
      s.status === "executed",
  ), [strategies]);

  // 🔧 DEBUG: Log quando versão muda
  // 🔧 SYNC: Sincroniza console com a versão selecionada sem disparar re-render em loop
  useEffect(() => {
    if (selectedRunId && selectedRunId !== currentRunId) {
      setCurrentRunId(selectedRunId);
    }
  }, [selectedRunId, currentRunId]);

  const handleStrategyClick = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setIsEditorOpen(true);
  };

  const handleStrategySave = (updatedStrategy: Strategy) => {
    setStrategies((prev) =>
      prev.map((s) => (s.id === updatedStrategy.id ? updatedStrategy : s)),
    );
  };

  // Buscar run selecionada para exibir o manifesto
  const selectedRun = runs.find((r) => r.id === selectedRunId);
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Compacto (App Layout) */}
        <header className="h-16 sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold truncate flex items-center gap-2">
                🎯 Simulador
                {campaign && (
                  <>
                    <span className="text-muted-foreground font-normal text-base border-l pl-2 ml-2">
                      {campaign.candidate_name.split(" ")[0]}{" "}
                      <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                        {campaign.role}
                      </span>
                    </span>
                    <a
                      href={`/campaign/${campaignId}/map`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase transition-all hover:bg-blue-100"
                    >
                      <MapIcon className="h-3 w-3" />
                      Abrir Mapa Tático
                    </a>
                  </>
                )}
              </h1>
            </div>

            {/* 📡 Badge Radar Social */}
            {socialStats && socialStats.total_mentions > 0 && (
              <div className="flex items-center gap-1.5 border-l pl-4 ml-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-50 to-purple-50 border border-purple-200/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <Radar className="h-3 w-3 text-purple-500" />
                  <span className="text-[11px] font-semibold text-purple-700">
                    Radar Ativo: {socialStats.total_mentions} menções
                  </span>
                </div>
              </div>
            )}

            {/* Seletor de Versão Compacto */}
            {runs.length > 0 && (
              <div className="flex items-center gap-1 border-l pl-4 ml-2">
                <Select
                  value={selectedRunId || ""}
                  onValueChange={setSelectedRunId}
                >
                  <SelectTrigger className="h-8 w-[220px] text-xs flex justify-between items-center group">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <SelectValue placeholder="Versão" />
                    </div>
                    <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                      {/* Chevron visual indicator handled by Select primitive or added here */}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="z-[60] min-w-[240px]">
                    {runs.map((run, index) => {
                      const count = strategies.filter(
                        (s) => s.run_id === run.id,
                      ).length;
                      return (
                        <SelectItem
                          key={run.id}
                          value={run.id}
                          className="text-xs cursor-pointer focus:bg-slate-50"
                        >
                          <span className="font-semibold text-slate-700">
                            v{runs.length - index}
                          </span>{" "}
                          <span className="text-slate-500">
                            ({count} {count === 1 ? "tarefa" : "tarefas"})
                          </span>{" "}
                          <span className="text-slate-300 mx-1">•</span>{" "}
                          {new Date(run.created_at).toLocaleDateString()}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      fetchRuns();
                      fetchStrategies();
                    }}
                    title="Recarregar"
                  >
                    <RefreshCcw className="h-3.5 w-3.5 text-slate-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:text-red-600"
                    onClick={handleDeleteRun}
                    disabled={!selectedRunId || deleting}
                    title="Deletar Versão"
                  >
                    {deleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* View Toggle Compacto */}
            <div className="flex bg-slate-100/50 rounded-lg p-1 gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("kanban")}
                className={`h-8 px-3 text-xs ${viewMode === "kanban" ? "bg-white shadow-sm" : "text-muted-foreground"}`}
              >
                <LayoutList className="h-3.5 w-3.5 mr-2" />
                Kanban
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("radar")}
                className={`h-8 px-3 text-xs ${viewMode === "radar" ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-sm" : "text-muted-foreground"}`}
              >
                <Radar className="h-3.5 w-3.5 mr-2" />
                Radar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("squad")}
                className={`h-8 px-3 text-xs ${viewMode === "squad" ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground"}`}
              >
                <Users className="h-3.5 w-3.5 mr-2" />
                Equipe
              </Button>
            </div>

            <div className="h-6 w-px bg-border mx-1" />

            {/* Actions */}
            <GeneratorDialog
              campaignId={campaignId}
              onSuccess={handleGenerationSuccess}
              onRunStarted={handleRunStarted}
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <Sparkles className="h-4 w-4" />
                  Gerar Novo
                </Button>
              }
            />

            <Button
              onClick={handlePublish}
              disabled={approvedStrategies.length === 0 || publishing}
              size="sm"
              className="h-9 bg-green-600 hover:bg-green-700 text-white shadow-sm gap-2"
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publicar
            </Button>
          </div>
        </header>

        {/* 🔴 Alert de Documentos Não Encontrados */}
        {documents.length === 0 && locationsCount !== null && (
          <div className="px-4 sm:px-8 pt-4">
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">
                ❌ Nenhum arquivo encontrado
              </AlertTitle>
              <AlertDescription className="text-red-700 flex justify-between items-center">
                <span>
                  Esta campanha não possui CSV ou PDF cadastrados. Vá em "Editar
                  Candidato" e faça upload dos arquivos.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white border-red-300 hover:bg-red-100 text-red-900 ml-4"
                  onClick={() =>
                    (window.location.href = `/admin/candidatos/novo?id=${campaignId}`)
                  }
                >
                  📂 Ir para Upload
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* 🟡 Alert de Dados Não Processados */}
        {locationsCount !== null &&
          chunksCount !== null &&
          (locationsCount === 0 || chunksCount === 0) &&
          documents.length > 0 && (
            <div className="px-4 sm:px-8 pt-4">
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">
                  ⚠️ Dados não processados
                </AlertTitle>
                <AlertDescription className="text-yellow-700 flex justify-between items-center">
                  <span>
                    {locationsCount === 0 && chunksCount === 0
                      ? "O CSV do mapa e o PDF não foram processados. O mapa estará vazio e a IA não terá contexto."
                      : locationsCount === 0
                        ? "O CSV do mapa não foi processado. O mapa estará vazio."
                        : "O PDF não foi processado. A IA não terá contexto do plano de governo."}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white border-yellow-300 hover:bg-yellow-100 text-yellow-900 ml-4"
                    onClick={handleProcessFiles}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                        Processando...
                      </>
                    ) : (
                      "🔄 Processar Agora"
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}

        {/* ✅ Data Context Dashboard - Dados Sincronizados */}
        {locationsCount !== null &&
          chunksCount !== null &&
          locationsCount > 0 &&
          chunksCount > 0 && (
            <div className="px-4 sm:px-8 pt-4">
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <div>
                      <span className="text-xs text-blue-600 font-medium">
                        Mapa Tático
                      </span>
                      <p className="text-sm font-bold text-blue-900">
                        {locationsCount.toLocaleString()}{" "}
                        <span className="font-normal text-blue-700">
                          locais
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-blue-200" />
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📚</span>
                    <div>
                      <span className="text-xs text-blue-600 font-medium">
                        Memória Vetorial
                      </span>
                      <p className="text-sm font-bold text-blue-900">
                        {chunksCount.toLocaleString()}{" "}
                        <span className="font-normal text-blue-700">
                          fragmentos
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Base de Dados Sincronizada
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      fetchDataHealth();
                    }}
                    className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                    title="Recarregar contagens"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

        {/* Content Area - Full Height no Kanban, Auto no resto */}
        <div className="flex-1 flex flex-col overflow-hidden relative pb-12">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {viewMode === "radar" && (
              /* 📡 Social Radar — Monitor de Rivais Digitais */
              <div className="px-4 sm:px-8 py-6">
                <Card className="border-2 border-transparent bg-gradient-to-r from-cyan-50 via-purple-50 to-pink-50 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 opacity-10" />
                  <CardHeader className="pb-3 flex flex-row items-center gap-3 relative z-10">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                      <Radar className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base font-bold bg-gradient-to-r from-cyan-700 to-purple-700 bg-clip-text text-transparent">
                        📡 Monitor de Rivais Digitais
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Configure os perfis dos adversários para monitoramento
                        automático de menções e sentimentos
                      </p>
                    </div>
                    <Button
                      className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white gap-2 relative z-10"
                      onClick={saveSocialLinks}
                      disabled={savingSocial}
                    >
                      {savingSocial ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Salvar Handles
                    </Button>
                  </CardHeader>
                  <CardContent className="p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                      <Radar className="h-64 w-64" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                      {/* Coluna Instagram */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                          <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                            <Instagram className="h-4 w-4 text-pink-500" />
                            Instagram
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-pink-50 text-pink-600"
                            onClick={addIgHandle}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {igHandles.map((handle, idx) => (
                            <SocialTargetCard
                              key={`ig-${idx}`}
                              type="profile"
                              platform="instagram"
                              target={handle}
                              onChange={(val) => updateIgHandle(idx, val)}
                              onDelete={() => removeIgHandle(idx)}
                              breakdown={radarBreakdown[handle]}
                              density={radarConfig.posts_limit}
                              onDensityChange={(v) => {
                                setRadarConfig(prev => ({ ...prev, posts_limit: v }));
                                setTimeout(saveSocialLinks, 100);
                              }}
                              campaignId={campaignId}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Coluna TikTok */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                          <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                            <span className="text-base">🎵</span>
                            TikTok
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-600"
                            onClick={addTkHandle}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {tkHandles.map((handle, idx) => (
                            <SocialTargetCard
                              key={`tk-${idx}`}
                              type="profile"
                              platform="tiktok"
                              target={handle}
                              onChange={(val) => updateTkHandle(idx, val)}
                              onDelete={() => removeTkHandle(idx)}
                              breakdown={radarBreakdown[handle]}
                              density={radarConfig.posts_limit}
                              onDensityChange={(v) => {
                                setRadarConfig(prev => ({ ...prev, posts_limit: v }));
                                setTimeout(saveSocialLinks, 100);
                              }}
                              campaignId={campaignId}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Coluna Temas */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                          <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            Temas Estratégicos
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-amber-50 text-amber-600"
                            onClick={addKeyword}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {keywords.map((kw, idx) => (
                            <SocialTargetCard
                              key={`kw-${idx}`}
                              type="keyword"
                              target={kw}
                              onChange={(val) => updateKeyword(idx, val)}
                              onDelete={() => removeKeyword(idx)}
                              breakdown={radarBreakdown[kw]}
                              density={radarConfig.posts_limit}
                              onDensityChange={(v) => {
                                setRadarConfig(prev => ({ ...prev, posts_limit: v }));
                                setTimeout(saveSocialLinks, 100);
                              }}
                              campaignId={campaignId}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Coluna Hashtags */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                          <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                            <Hash className="h-4 w-4 text-blue-500" />
                            Hashtags Globais
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-blue-50 text-blue-600"
                            onClick={addHashtag}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {hashtags.map((ht, idx) => (
                            <SocialTargetCard
                              key={`ht-${idx}`}
                              type="hashtag"
                              target={ht}
                              onChange={(val) => updateHashtag(idx, val)}
                              onDelete={() => removeHashtag(idx)}
                              breakdown={radarBreakdown[ht]}
                              density={radarConfig.posts_limit}
                              onDensityChange={(v) => {
                                setRadarConfig(prev => ({ ...prev, posts_limit: v }));
                                setTimeout(saveSocialLinks, 100);
                              }}
                              campaignId={campaignId}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 🚀 PAINEL AVANÇADO: Saúde e Configuração do Motor */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                  {/* Card de Saúde do Radar */}
                  <Card className="col-span-1 border-slate-200 shadow-sm relative overflow-hidden bg-white/50 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        Saúde do Radar
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Menções Rastreadas</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-900">{socialStats?.total_mentions || 0}</span>
                          <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Ativo</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Última Sincronização</span>
                          <span className="text-xs font-bold text-slate-700">
                            {radarConfig.last_sync ? new Date(radarConfig.last_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pendente'}
                          </span>
                        </div>
                        <Button
                          onClick={handleSyncSocialData}
                          disabled={isSyncing}
                          className="w-full h-8 text-xs bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 mt-2"
                        >
                          {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <RefreshCcw className="h-3.5 w-3.5 mr-2" />}
                          {isSyncing ? "Sincronizando..." : "Sincronizar Agora"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* NOVO: Card de Saúde da Conexão Externa (Tavily/AIOS) */}
                  <Card className="col-span-1 border-slate-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-slate-50 to-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-blue-500" />
                          Conexão AIOS
                        </div>
                        {engineStatus.status === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-slate-300" />}
                        {engineStatus.status === 'online' && <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />}
                        {engineStatus.status === 'offline' && <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />}
                        {engineStatus.status === 'error' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Status da Rede (Tavily)</span>
                        <div className="flex items-baseline gap-2">
                          <span className={cn(
                            "text-2xl font-black uppercase tracking-tight",
                            engineStatus.status === 'online' ? "text-emerald-600" :
                              engineStatus.status === 'offline' ? "text-red-600" :
                                engineStatus.status === 'error' ? "text-amber-600" : "text-slate-400"
                          )}>
                            {engineStatus.status === 'checking' ? 'Testando...' : engineStatus.status}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2 relative">
                        <Terminal className="h-16 w-16 absolute -top-4 -right-2 text-slate-900 opacity-[0.02]" />
                        <div className="flex justify-between items-center z-10 relative">
                          <span className="text-xs text-slate-500">Latência do Motor</span>
                          <span className="text-xs font-bold text-slate-700 font-mono">
                            {engineStatus.latency_ms ? `${engineStatus.latency_ms}ms` : '--'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center z-10 relative">
                          <span className="text-[10px] text-slate-400">Último Teste:</span>
                          <span className="text-[10px] text-slate-500">
                            {engineStatus.last_check ? new Date(engineStatus.last_check).toLocaleTimeString() : '--:--'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card de Configuração do Motor */}
                  <Card className="col-span-1 lg:col-span-1 border-slate-200 shadow-sm relative overflow-hidden bg-white/50 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="h-4 w-4 text-purple-500" />
                        Configurações do Motor AIOS
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Frequência */}
                        <div className="space-y-3">
                          <Label className="text-xs font-bold text-slate-500 uppercase">Frequência de Varredura</Label>
                          <Select
                            value={radarConfig.fetch_interval}
                            onValueChange={(val) => {
                              setRadarConfig(prev => ({ ...prev, fetch_interval: val }));
                              setTimeout(saveSocialLinks, 100);
                            }}
                          >
                            <SelectTrigger className="h-10 bg-slate-50 font-medium border-slate-100 rounded-xl">
                              <SelectValue placeholder="Selecione o intervalo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="6h">A cada 6 horas</SelectItem>
                              <SelectItem value="12h">A cada 12 horas</SelectItem>
                              <SelectItem value="24h">Uma vez ao dia (24h)</SelectItem>
                              <SelectItem value="manual">Manual (Apenas no botão)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[11px] text-slate-400">Determina de quanto em quanto tempo o robô vasculha a rede em busca de novidades.</p>
                        </div>

                        {/* Limites de Posts */}
                        <div className="space-y-3">
                          <Label className="text-xs font-bold text-slate-500 uppercase">Volume Histórico (Posts por Conta)</Label>
                          <Select
                            value={radarConfig.posts_limit.toString()}
                            onValueChange={(val) => {
                              setRadarConfig(prev => ({ ...prev, posts_limit: parseInt(val) }));
                              setTimeout(saveSocialLinks, 100);
                            }}
                          >
                            <SelectTrigger className="h-10 bg-slate-50 font-medium border-slate-100 rounded-xl">
                              <SelectValue placeholder="Selecione o limite" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">🧪 5 posts — Teste (economia máxima)</SelectItem>
                              <SelectItem value="20">📊 20 posts — Normal (monitoramento)</SelectItem>
                              <SelectItem value="100">🚀 100 posts — Elite (análise profunda)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[11px] text-slate-400">⚠️ Cada post consome créditos de API. Use <strong>5 (Teste)</strong> para validar perfis antes de escalar.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </div>
            )}

            {viewMode === "squad" && <SquadManager campaignId={campaignId} />}

            {viewMode === "kanban" && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Dossiê Fixo no Topo */}
                {strategies.length > 0 && (
                  <div className="px-4 sm:px-8 pt-4 pb-2 shrink-0">
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <div className="bg-purple-100 p-1 rounded-lg">
                        <Bot className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Agente Estrategista</span>
                        <h2 className="text-sm font-black text-slate-800 uppercase">
                          {selectedRun?.persona_name || "Genesis Alpha"}
                        </h2>
                      </div>
                    </div>
                    <CampaignManifesto
                      campaignId={campaignId}
                      planContent={selectedRun?.strategic_plan_text}
                    />
                  </div>
                )}

                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  </div>
                ) : strategies.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 text-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full" />
                      <Bot className="h-24 w-24 text-purple-600 relative z-10" />
                    </div>
                    <div className="max-w-md space-y-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        Nenhuma estratégia gerada
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        A IA ainda não analisou o perfil deste candidato.
                        Escolha um estrategista para começar.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Mobile Tab Selector */}
                    <div className="md:hidden px-4 sm:px-8 py-3 bg-background border-b flex justify-center sticky top-0 z-20">
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full max-w-sm">
                        <button
                          onClick={() => setActiveMobileTab("suggested")}
                          className={cn(
                            "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                            activeMobileTab === "suggested"
                              ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                              : "text-slate-500",
                          )}
                        >
                          Sugestões ({suggestedStrategies.length})
                        </button>
                        <button
                          onClick={() => setActiveMobileTab("approved")}
                          className={cn(
                            "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                            activeMobileTab === "approved"
                              ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                              : "text-slate-500",
                          )}
                        >
                          Aprovados ({approvedStrategies.length})
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-20 md:pb-8">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                          {/* Sugestões da IA */}
                          <div
                            className={cn(
                              "h-full",
                              activeMobileTab !== "suggested" &&
                              "hidden md:block",
                            )}
                          >
                            <DroppableColumn
                              id="suggested"
                              title="💡 Sugestões da IA"
                              icon={<Bot className="w-5 h-5 text-purple-600" />}
                              count={suggestedStrategies.length}
                              actionButton={
                                suggestedStrategies.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleApproveAll}
                                    disabled={approvingAll}
                                    className="text-[10px] font-black uppercase text-green-600 hover:bg-green-50 rounded-full h-7 px-3 border border-green-100"
                                  >
                                    {approvingAll ? (
                                      <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                                    ) : (
                                      <CheckCircle className="w-3 h-3 mr-1.5" />
                                    )}
                                    Aprovar Tudo
                                  </Button>
                                )
                              }
                            >
                              <div className="space-y-3">
                                {suggestedStrategies.map((strategy) => (
                                  <DraggableStrategyCard
                                    key={strategy.id}
                                    strategy={strategy}
                                    onClick={() =>
                                      handleStrategyClick(strategy)
                                    }
                                    onMove={handleMove}
                                  />
                                ))}
                              </div>
                            </DroppableColumn>
                          </div>

                          {/* Aprovado para Publicação */}
                          <div
                            className={cn(
                              "h-full",
                              activeMobileTab !== "approved" &&
                              "hidden md:block",
                            )}
                          >
                            <DroppableColumn
                              id="approved"
                              title="✅ Plano Aprovado"
                              icon={
                                <LayoutList className="w-5 h-5 text-emerald-600" />
                              }
                              count={approvedStrategies.length}
                            >
                              <div className="space-y-3">
                                {approvedStrategies.map((strategy) => (
                                  <DraggableStrategyCard
                                    key={strategy.id}
                                    strategy={strategy}
                                    onClick={() =>
                                      handleStrategyClick(strategy)
                                    }
                                    onMove={handleMove}
                                  />
                                ))}
                              </div>
                            </DroppableColumn>
                          </div>
                        </div>

                        <DragOverlay>
                          {activeId ? (
                            <div className="opacity-90 scale-105 rotate-2">
                              <DraggableStrategyCard
                                strategy={
                                  strategies.find((s) => s.id === activeId)!
                                }
                              />
                            </div>
                          ) : null}
                        </DragOverlay>
                      </DndContext>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <CollapsibleConsole
            campaignId={campaignId}
            isRunning={!!currentRunId}
            runId={currentRunId}
            onNewLog={handleNewLog}
            logsCount={strategies.length}
          />

          <StrategyEditorSheet
            strategy={selectedStrategy}
            isOpen={isEditorOpen}
            onClose={() => setIsEditorOpen(false)}
            onSave={handleStrategySave}
          />
        </div>
      </div>
    </div>
  );
}
