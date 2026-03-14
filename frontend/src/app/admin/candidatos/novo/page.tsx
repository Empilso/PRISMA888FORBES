"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Upload,
    FileText,
    Cloud,
    User,
    Key,
    Copy,
    AlertCircle,
    MapPin,
    Calendar,
    X,
    Loader2,
    Search,
    Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { createCampaign } from "@/app/actions/create-campaign";
import { updateCampaign } from "@/app/actions/update-campaign";
import { createClient } from "@/lib/supabase/client";
import { fetchExistingCsvs } from "@/app/actions/fetch-existing-csvs";

// 🗓️ MATRIZ ELEITORAL - Mapeamento Cargo → Data da Eleição
const ELECTION_RULES: Record<string, { date: string; type: 'municipal' | 'geral' }> = {
    'Prefeito': { date: '2028-10-01', type: 'municipal' },
    'Vice-Prefeito': { date: '2028-10-01', type: 'municipal' },
    'Vereador': { date: '2028-10-01', type: 'municipal' },
    'Presidente': { date: '2026-10-04', type: 'geral' },
    'Governador': { date: '2026-10-04', type: 'geral' },
    'Senador': { date: '2026-10-04', type: 'geral' },
    'Deputado Federal': { date: '2026-10-04', type: 'geral' },
    'Deputado Estadual': { date: '2026-10-04', type: 'geral' },
    'Deputado Distrital': { date: '2026-10-04', type: 'geral' },
};

interface Organization {
    id: string;
    name: string;
    slug: string;
}

function CandidateForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const campaignId = searchParams.get("id");
    const isEditing = !!campaignId;

    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const supabase = createClient();

    const { register, handleSubmit, setValue, watch, reset } = useForm({
        defaultValues: {
            nome: "",
            nomeUrna: "",
            cpf: "",
            email: "",
            telefone: "",
            login: `candidato.${Math.random().toString(36).substring(7)}@prisma888.com`,
            password: Math.random().toString(36).substring(2, 10),
            cargo: "",
            numero: "",
            partido: "",
            organization_id: "",
            cidade: "",
            electionDate: "2026-10-04"
        }
    });

    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [existingCsvs, setExistingCsvs] = useState<{ id: string, name: string, url: string, city: string }[]>([]);
    const [selectedExistingCsv, setSelectedExistingCsv] = useState<string | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
    const [isLoadingCsvs, setIsLoadingCsvs] = useState(false);

    const cargoAtual = watch("cargo");
    const cidadeAtual = watch("cidade");
    const orgAtual = watch("organization_id");

    // 🎯 Efeito 1: Data da Eleição
    useEffect(() => {
        if (cargoAtual && ELECTION_RULES[cargoAtual] && !isEditing) {
            const rule = ELECTION_RULES[cargoAtual];
            setValue("electionDate", rule.date);
        }
    }, [cargoAtual, setValue, isEditing]);

    // 🎯 Efeito 2: Pre-fill City from URL
    useEffect(() => {
        const cityParam = searchParams.get("city");
        if (cityParam && !isEditing) {
            setValue("cidade", cityParam);
        }
    }, [searchParams, isEditing, setValue]);

    // 🎯 Efeito 3: Buscar Organizações
    useEffect(() => {
        const fetchOrgs = async () => {
            setIsLoadingOrgs(true);
            try {
                const { data: session } = await supabase.auth.getSession();
                const token = session.session?.access_token;
                const res = await fetch("/api/organizations", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setOrganizations(data || []);
                }
            } catch (e) {
                console.error("Erro ao buscar orgs:", e);
            } finally {
                setIsLoadingOrgs(false);
            }
        };
        fetchOrgs();
    }, [supabase]);

    // 🎯 Efeito 4: Buscar TODOS os CSVs da Organização (Drop Down Global)
    useEffect(() => {
        const loadExistingCsvs = async () => {
            if (!orgAtual || isEditing) {
                setExistingCsvs([]);
                return;
            }

            setIsLoadingCsvs(true);
            try {
                const result = await fetchExistingCsvs(orgAtual);
                if (result.success && result.data) {
                    setExistingCsvs(result.data as any);
                } else {
                    setExistingCsvs([]);
                }
            } catch (error) {
                console.error("Erro ao carregar CSVs existentes", error);
                setExistingCsvs([]);
            } finally {
                setIsLoadingCsvs(false);
            }
        };

        loadExistingCsvs();
    }, [orgAtual, isEditing]);

    // 🎯 Efeito 5: Carregar dados para edição
    useEffect(() => {
        if (isEditing && campaignId) {
            const fetchData = async () => {
                setIsFetching(true);
                try {
                    const { fetchCampaignForEdit } = await import("@/app/actions/fetch-campaign");
                    const result = await fetchCampaignForEdit(campaignId);

                    if (!result.success) throw new Error(result.error);

                    const { campaign, profile } = result;
                    setValue("nome", campaign!.candidate_name);
                    setValue("nomeUrna", campaign!.ballot_name);
                    setValue("cidade", campaign!.city);
                    setValue("cargo", campaign!.role);
                    setValue("partido", campaign!.party);
                    if ((campaign as any).organization_id) {
                        setValue("organization_id", (campaign as any).organization_id);
                    }
                    setValue("numero", campaign!.number);
                    setValue("electionDate", campaign!.election_date);

                    if (profile) {
                        if (profile.email) setValue("email", profile.email);
                        if (profile.cpf) setValue("cpf", profile.cpf);
                        if (profile.phone) setValue("telefone", profile.phone);
                    }
                } catch (error) {
                    console.error("Erro ao carregar dados:", error);
                    toast({
                        title: "Erro",
                        description: "Falha ao carregar dados.",
                        variant: "destructive"
                    });
                } finally {
                    setIsFetching(false);
                }
            };
            fetchData();
        }
    }, [campaignId, isEditing, setValue, toast]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'csv' | 'pdf') => {
        if (e.target.files && e.target.files[0]) {
            if (type === 'csv') {
                setCsvFile(e.target.files[0]);
                setSelectedExistingCsv(null);
            } else {
                setPdfFile(e.target.files[0]);
            }
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copiado!", description: "Informação copiada." });
    };

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            const excludeOnEdit = ['login', 'password'];

            Object.keys(data).forEach(key => {
                if (isEditing && excludeOnEdit.includes(key)) return;
                formData.append(key, data[key]);
            });

            if (selectedExistingCsv) {
                formData.append("existingCsvUrl", selectedExistingCsv);
                const existingFile = existingCsvs.find(f => f.url === selectedExistingCsv);
                if (existingFile) formData.append("existingCsvName", existingFile.name);
            } else if (csvFile) {
                formData.append("csvFile", csvFile);
            }

            if (pdfFile) formData.append("pdfFile", pdfFile);

            let result;
            if (isEditing) {
                result = await updateCampaign(campaignId!, formData);
            } else {
                result = await createCampaign(formData);
            }

            if (result.success) {
                toast({
                    title: "Sucesso!",
                    description: isEditing ? "Dados atualizados." : "Candidato registrado com sucesso.",
                });
                const targetId = isEditing ? campaignId : (result as any).campaignId;
                router.push(`/admin/campaign/${targetId}/setup`);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Erro ao salvar:", error);
            toast({
                title: "Erro",
                description: error.message || "Falha ao salvar.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditing ? "✏️ Editar Candidato" : "Adicionar Candidato"}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Complete os dados e carregue as bases necessárias
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* 1. DADOS DE IDENTIFICAÇÃO */}
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="pb-3 border-b bg-gray-50/50">
                        <CardTitle className="text-xs font-bold uppercase text-gray-500 tracking-widest flex items-center gap-2">
                            <User className="h-4 w-4" /> Identificação
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-700">Nome Completo</Label>
                            <Input {...register("nome")} placeholder="Nome do Candidato" className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-700">Nome na Urna *</Label>
                            <Input {...register("nomeUrna")} placeholder="Ex: JOÃO DA FARMÁCIA" className="h-11 rounded-xl border-amber-200 bg-amber-50/30" />
                            <p className="text-[10px] text-amber-600">Essencial para o cruzamento de dados no mapa.</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-700">E-mail</Label>
                            <Input {...register("email")} placeholder="contato@prisma888.com" className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-700">CPF</Label>
                            <Input {...register("cpf")} placeholder="000.000.000-00" className="h-11 rounded-xl" />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. GESTÃO DE ARQUIVOS (DROPDOWN DE BASES EXISTENTES) */}
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="pb-3 border-b bg-gray-50/50">
                        <CardTitle className="text-xs font-bold uppercase text-gray-500 tracking-widest flex items-center gap-2">
                            <Upload className="h-4 w-4" /> Gestão de Arquivos Eleitorais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-2 gap-8">
                            {/* CSV */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold">Base de Votação (CSV)</Label>
                                    {isLoadingCsvs && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                                </div>

                                {existingCsvs.length > 0 && !isEditing && (
                                    <div className="space-y-2 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                        <Label className="text-[10px] uppercase font-black text-blue-700 flex items-center gap-1">
                                            <Cloud className="h-3.5 w-3.5" /> Reutilizar Base Existente
                                        </Label>
                                        <Select
                                            value={selectedExistingCsv || "none"}
                                            onValueChange={(val) => {
                                                if (val === "none") {
                                                    setSelectedExistingCsv(null);
                                                } else {
                                                    setSelectedExistingCsv(val);
                                                    setCsvFile(null);
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="h-11 border-blue-300 bg-white text-blue-700 font-bold shadow-sm">
                                                <SelectValue placeholder="Selecione uma base pronta..." />
                                            </SelectTrigger>
                                            <SelectContent className="z-[100]">
                                                <SelectItem value="none">-- Fazer novo upload manual --</SelectItem>
                                                {existingCsvs.map((file: any, idx) => (
                                                    <SelectItem key={idx} value={file.file_url}>
                                                        {file.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[9px] text-blue-500 italic">* Reutilize bases de outras campanhas para economizar tempo.</p>
                                    </div>
                                )}

                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        onChange={(e) => handleFileChange(e, 'csv')}
                                    />
                                    <div className={`w-full h-14 border-2 border-dashed rounded-xl flex items-center justify-center gap-3 transition-colors ${csvFile || selectedExistingCsv
                                        ? 'bg-green-50 border-green-200 text-green-700'
                                        : 'bg-gray-50 border-gray-200 text-gray-500 group-hover:bg-gray-100 group-hover:border-gray-300'
                                        }`}>
                                        <Upload className="h-5 w-5" />
                                        <span className="text-sm font-medium">
                                            {csvFile ? `Arquivo: ${csvFile.name}` :
                                                selectedExistingCsv ? "Base Selecionada ✓" :
                                                    "Sincronizar Novo CSV"}
                                        </span>
                                    </div>
                                    {(csvFile || selectedExistingCsv) && (
                                        <button
                                            type="button"
                                            onClick={() => { setCsvFile(null); setSelectedExistingCsv(null); }}
                                            className="absolute -right-2 -top-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg z-30 hover:bg-red-600"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* PDF */}
                            <div className="space-y-4">
                                <Label className="text-sm font-semibold">Plano de Governo (PDF)</Label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        onChange={(e) => handleFileChange(e, 'pdf')}
                                    />
                                    <div className={`w-full h-14 border-2 border-dashed rounded-xl flex items-center justify-center gap-3 transition-colors ${pdfFile
                                        ? 'bg-green-50 border-green-200 text-green-700'
                                        : 'bg-gray-50 border-gray-200 text-gray-500 group-hover:bg-gray-100 group-hover:border-gray-300'
                                        }`}>
                                        <FileText className="h-5 w-5" />
                                        <span className="text-sm font-medium">
                                            {pdfFile ? `PDF: ${pdfFile.name}` : "Carregar Plano (.pdf)"}
                                        </span>
                                    </div>
                                    {pdfFile && (
                                        <button
                                            type="button"
                                            onClick={() => setPdfFile(null)}
                                            className="absolute -right-2 -top-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg z-30 hover:bg-red-600"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. CAMPANHA */}
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="pb-3 border-b bg-gray-50/50">
                        <CardTitle className="text-xs font-bold uppercase text-gray-500 tracking-widest flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> Localidade e Cargos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-700">Cidade *</Label>
                                <Input {...register("cidade")} placeholder="Ex: Sorocaba" className="h-11 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-700">Cargo *</Label>
                                <Select onValueChange={(v) => setValue("cargo", v)} value={watch("cargo")}>
                                    <SelectTrigger className="h-11 rounded-xl">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(ELECTION_RULES).map(cargo => (
                                            <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-700">Número *</Label>
                                <Input {...register("numero")} placeholder="Ex: 45000" className="h-11 rounded-xl" />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-700">Partido / Organização</Label>
                                <Select onValueChange={(v) => setValue("organization_id", v)} value={watch("organization_id")}>
                                    <SelectTrigger className="h-11 rounded-xl">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {organizations.map(org => (
                                            <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-700">Data da Eleição</Label>
                                <Input {...register("electionDate")} type="date" className="h-11 rounded-xl" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. CREDENCIAIS */}
                {!isEditing && (
                    <Card className="border-gray-200 border-dashed bg-gray-50/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold uppercase text-gray-400 tracking-tighter flex items-center gap-1">
                                <Key className="h-3 w-3" /> Acesso do Candidato (Sugestão)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-6 pb-4">
                            <div className="flex gap-2 items-end">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[10px] text-gray-500">Login</Label>
                                    <Input {...register("login")} readOnly className="h-9 text-xs bg-white font-mono" />
                                </div>
                                <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => copyToClipboard(watch("login"))}>
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <div className="flex gap-2 items-end">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[10px] text-gray-500">Senha</Label>
                                    <Input {...register("password")} readOnly className="h-9 text-xs bg-white font-mono" />
                                </div>
                                <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => copyToClipboard(watch("password"))}>
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* BOTÕES DE AÇÃO */}
                <div className="flex justify-end items-center gap-4 pt-4 border-t">
                    <Button type="button" variant="ghost" className="text-gray-500" onClick={() => router.back()} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px] h-12 rounded-xl shadow-lg font-bold" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                        {isEditing ? "Salvar Alterações" : "Criar Candidato & Iniciar Setup"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default function NewCandidatePage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-gray-500 font-medium">Carregando interface premium...</div>}>
            <CandidateForm />
        </Suspense>
    );
}
