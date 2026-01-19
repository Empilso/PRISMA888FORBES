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
    Loader2
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

// 🗓️ MATRIZ ELEITORAL - Mapeamento Cargo → Data da Eleição
const ELECTION_RULES: Record<string, { date: string; type: 'municipal' | 'geral' }> = {
    // Eleições Municipais (1º domingo de outubro de 2028)
    'Prefeito': { date: '2028-10-01', type: 'municipal' },
    'Vice-Prefeito': { date: '2028-10-01', type: 'municipal' },
    'Vereador': { date: '2028-10-01', type: 'municipal' },
    // Eleições Gerais (1º domingo de outubro de 2026)
    'Presidente': { date: '2026-10-04', type: 'geral' },
    'Governador': { date: '2026-10-04', type: 'geral' },
    'Senador': { date: '2026-10-04', type: 'geral' },
    'Deputado Federal': { date: '2026-10-04', type: 'geral' },
    'Deputado Estadual': { date: '2026-10-04', type: 'geral' },
    'Deputado Distrital': { date: '2026-10-04', type: 'geral' },
};

function CandidateForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const campaignId = searchParams.get("id");
    const isEditing = !!campaignId;

    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    const { register, handleSubmit, setValue, watch, reset } = useForm({
        defaultValues: {
            nome: "",
            nomeUrna: "",
            cpf: "",
            email: "",
            telefone: "",
            login: `candidato.${Math.random().toString(36).substring(7)}`,
            password: Math.random().toString(36).substring(2, 10),
            cargo: "",
            numero: "",
            partido: "",
            cidade: "",
            electionDate: "2026-10-04" // Próxima eleição geral (Padrão)
        }
    });

    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    // Watch cargo para atualizar data automaticamente
    const cargoAtual = watch("cargo");

    // 🎯 Atualiza automaticamente a data da eleição quando o cargo muda
    useEffect(() => {
        if (cargoAtual && ELECTION_RULES[cargoAtual] && !isEditing) {
            const rule = ELECTION_RULES[cargoAtual];
            setValue("electionDate", rule.date);
        }
    }, [cargoAtual, setValue, isEditing]);

    // Fetch data if editing
    useEffect(() => {
        if (isEditing) {
            const fetchData = async () => {
                setIsFetching(true);
                const supabase = createClient();

                try {
                    // 1. Fetch Campaign
                    const { data: campaign, error: campError } = await supabase
                        .from("campaigns")
                        .select("*")
                        .eq("id", campaignId)
                        .single();

                    if (campError) throw campError;

                    // 2. Fetch Profile (Candidate)
                    const { data: profile, error: profError } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("campaign_id", campaignId)
                        .eq("role", "candidate")
                        .single();

                    // Populate Form
                    setValue("nome", campaign.candidate_name || "");
                    setValue("nomeUrna", campaign.ballot_name || "");
                    setValue("cidade", campaign.city || "");
                    setValue("cargo", campaign.role || "");
                    setValue("partido", campaign.party || "");
                    setValue("numero", campaign.number?.toString() || "");
                    setValue("electionDate", campaign.election_date || "2026-10-04");

                    if (profile) {
                        setValue("email", profile.email || "");
                        // CPF e Telefone não estão no banco ainda, mas se estivessem:
                        // setValue("cpf", profile.cpf);
                        // setValue("telefone", profile.phone);
                    }

                    // Login/Senha não recuperamos por segurança (e hash)
                    setValue("login", "********");
                    setValue("password", "********");

                } catch (error) {
                    console.error("Erro ao carregar dados:", error);
                    toast({
                        title: "Erro",
                        description: "Falha ao carregar dados do candidato.",
                        variant: "destructive"
                    });
                } finally {
                    setIsFetching(false);
                }
            };
            fetchData();
        }
    }, [campaignId, isEditing, setValue, toast]);

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            const formData = new FormData();

            // Adicionar campos de texto
            Object.keys(data).forEach(key => {
                formData.append(key, data[key]);
            });

            // Adicionar arquivos
            if (csvFile) formData.append("csvFile", csvFile);
            if (pdfFile) formData.append("pdfFile", pdfFile);

            let result;

            if (isEditing) {
                toast({ title: "Atualizando...", description: "Salvando alterações." });
                result = await updateCampaign(campaignId!, formData);
            } else {
                toast({ title: "Criando...", description: "Configurando infraestrutura." });
                result = await createCampaign(formData);
            }

            if (result.success) {
                toast({
                    title: "Sucesso!",
                    description: isEditing ? "Dados atualizados." : "Candidato criado com sucesso.",
                    variant: "default",
                });
                setTimeout(() => {
                    router.push("/admin/candidatos");
                }, 1000);
            } else {
                toast({
                    title: "Erro",
                    description: result.error || "Falha na operação.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro Inesperado",
                description: "Ocorreu um erro ao processar sua solicitação.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'csv' | 'pdf') => {
        if (e.target.files && e.target.files[0]) {
            if (type === 'csv') setCsvFile(e.target.files[0]);
            else setPdfFile(e.target.files[0]);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copiado!",
            description: "Texto copiado para a área de transferência.",
        });
    };

    if (isFetching) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-6">
            {/* HEADER */}
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">
                    {isEditing ? "Editar Candidato" : "Adicionar Candidato"}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    {isEditing ? "Atualize os dados da campanha e do candidato" : "Complete o cadastro e carregue os dados eleitorais"}
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* CARD 1: ARQUIVOS */}
                <Card className="border border-gray-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
                            ARQUIVOS {isEditing && "(Envie apenas se quiser substituir)"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* CSV */}
                            <div className="space-y-2">
                                <label className="text-xs text-gray-600">Dados Eleitorais (CSV)</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={(e) => handleFileChange(e, 'csv')}
                                    />
                                    <Button
                                        type="button"
                                        className={`w-full h-12 font-medium gap-2 ${csvFile ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                                    >
                                        <Upload className="h-5 w-5" />
                                        {csvFile ? `CSV Selecionado: ${csvFile.name}` : "Adicionar CSV"}
                                    </Button>
                                </div>
                            </div>

                            {/* PDF */}
                            <div className="space-y-2">
                                <label className="text-xs text-gray-600">Plano de Governo (PDF)</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={(e) => handleFileChange(e, 'pdf')}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={`w-full h-12 border-gray-300 font-medium gap-2 ${pdfFile ? 'bg-green-50 text-green-700 border-green-200' : 'text-gray-700'}`}
                                    >
                                        <FileText className="h-5 w-5" />
                                        {pdfFile ? `PDF Selecionado: ${pdfFile.name}` : "Adicionar PDF"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* CARD 2: INFORMAÇÕES PESSOAIS */}
                <Card className="border border-gray-200">
                    <CardHeader className="pb-3 flex flex-row items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <CardTitle className="text-sm font-semibold text-gray-700">
                            Informações Pessoais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-600">Nome Completo *</Label>
                                <Input
                                    placeholder="Ex: João Silva"
                                    className="h-10 border-gray-300"
                                    {...register("nome", { required: true })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-600">Nome Oficial na Urna (Igual TSE) *</Label>
                                <Input
                                    placeholder="Ex: JOÃO DA SILVA JUNIOR"
                                    className="h-10 border-gray-300"
                                    {...register("nomeUrna", { required: true })}
                                />
                                <p className="text-[10px] text-gray-400">
                                    Importante: Deve ser IDÊNTICO ao registro do TSE para que o mapa de calor funcione.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-600">CPF</Label>
                                <Input
                                    placeholder="000.000.000-00"
                                    className="h-10 border-gray-300"
                                    {...register("cpf")}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-600">Email</Label>
                                <Input
                                    type="email"
                                    placeholder="email@example.com"
                                    className="h-10 border-gray-300"
                                    {...register("email", { required: true })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-600">Telefone</Label>
                                <Input
                                    placeholder="(00) 00000-0000"
                                    className="h-10 border-gray-300"
                                    {...register("telefone")}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* CARD 3: CREDENCIAIS DE ACESSO */}
                {!isEditing && (
                    <Card className="border border-gray-200">
                        <CardHeader className="pb-3 flex flex-row items-center gap-2">
                            <Key className="h-4 w-4 text-purple-600" />
                            <CardTitle className="text-sm font-semibold text-gray-700">
                                Credenciais de Acesso do Candidato
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-gray-600">Login (gerado automaticamente)</Label>
                                    <div className="relative">
                                        <Input
                                            className="h-10 border-gray-300 pr-10 bg-gray-50 font-mono text-sm"
                                            readOnly
                                            {...register("login")}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(watch("login"))}
                                            className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-gray-600">Senha (gerado automaticamente)</Label>
                                    <div className="relative">
                                        <Input
                                            className="h-10 border-gray-300 pr-10 bg-gray-50 font-mono text-sm"
                                            readOnly
                                            {...register("password")}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(watch("password"))}
                                            className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <Alert className="bg-purple-50 border-purple-200">
                                <AlertCircle className="h-4 w-4 text-purple-600" />
                                <AlertDescription className="text-xs text-purple-900 ml-2">
                                    <span className="font-semibold">Importante:</span> Essas credenciais serão as usadas pelo candidato para acessar o sistema.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                )}

                {/* CARD 4: INFORMAÇÕES ELEITORAIS */}
                <Card className="border border-gray-200">
                    <CardHeader className="pb-3 flex flex-row items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <CardTitle className="text-sm font-semibold text-gray-700">
                            Informações Eleitorais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-600">Cargo *</Label>
                                <Select onValueChange={(v) => setValue("cargo", v)} value={watch("cargo")}>
                                    <SelectTrigger className="h-10 border-gray-300">
                                        <SelectValue placeholder="Selecione o cargo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel className="text-xs font-semibold text-blue-600">🏘️ Municipais (2028)</SelectLabel>
                                            <SelectItem value="Prefeito">Prefeito</SelectItem>
                                            <SelectItem value="Vice-Prefeito">Vice-Prefeito</SelectItem>
                                            <SelectItem value="Vereador">Vereador</SelectItem>
                                        </SelectGroup>
                                        <SelectGroup>
                                            <SelectLabel className="text-xs font-semibold text-green-600">🇧🇷 Gerais (2026)</SelectLabel>
                                            <SelectItem value="Presidente">Presidente</SelectItem>
                                            <SelectItem value="Governador">Governador</SelectItem>
                                            <SelectItem value="Senador">Senador</SelectItem>
                                            <SelectItem value="Deputado Federal">Deputado Federal</SelectItem>
                                            <SelectItem value="Deputado Estadual">Deputado Estadual</SelectItem>
                                            <SelectItem value="Deputado Distrital">Deputado Distrital</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-600">Número *</Label>
                                <Input
                                    type="number"
                                    placeholder="Ex: 15"
                                    className="h-10 border-gray-300"
                                    {...register("numero")}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-600">Partido *</Label>
                                <Input
                                    placeholder="Ex: PL"
                                    className="h-10 border-gray-300"
                                    {...register("partido")}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-600">Cidade *</Label>
                                <Input
                                    placeholder="Ex: Itupiranga"
                                    className="h-10 border-gray-300"
                                    {...register("cidade", { required: true })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-600 flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Data da Eleição *
                                </Label>
                                <Input
                                    type="date"
                                    className="h-10 border-gray-300"
                                    {...register("electionDate", { required: true })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* FOOTER */}
                <div className="flex items-center gap-3 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        className="border-gray-300 text-gray-700 h-11 px-6"
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11 font-medium gap-2"
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isLoading ? (isEditing ? "Atualizando..." : "Criando Campanha...") : (isEditing ? "Salvar Alterações" : "Salvar Candidato")}
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default function NovoCandidatoPage() {
    return (
        <Suspense fallback={<div className="p-8">Carregando formulário...</div>}>
            <CandidateForm />
        </Suspense>
    );
}
