"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import {
    Upload,
    FileText,
    Cloud,
    User,
    Key,
    RefreshCw,
    AlertCircle,
    MapPin,
    Save,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function NovoCandidatoPage() {
    const { register, handleSubmit, setValue } = useForm();
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    // Simulação de geração de credenciais
    const generateCredentials = () => {
        const randomPass = Math.random().toString(36).slice(-8);
        setValue("password", randomPass);
        setValue("login", "candidato." + Math.floor(Math.random() * 1000));
    };

    // Gera credenciais ao carregar (ou poderia ser num useEffect)
    React.useEffect(() => {
        generateCredentials();
    }, [setValue]);

    const onSubmit = (data: any) => {
        console.log("Dados do formulário:", { ...data, csvFile, pdfFile });
        alert("Candidato salvo (simulação)!");
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'csv' | 'pdf') => {
        if (e.target.files && e.target.files[0]) {
            if (type === 'csv') setCsvFile(e.target.files[0]);
            else setPdfFile(e.target.files[0]);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8 pb-20">
            {/* 1. HEADER DA PÁGINA */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Adicionar Candidato</h1>
                <p className="text-muted-foreground mt-1">
                    Complete o cadastro e carregue os dados eleitorais para iniciar a campanha.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                {/* 2. CARD 1: ARQUIVOS */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Cloud className="h-4 w-4" /> Arquivos da Campanha
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Botão CSV */}
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={(e) => handleFileChange(e, 'csv')}
                                />
                                <Button
                                    type="button"
                                    className={`w-full h-16 text-lg font-medium gap-3 ${csvFile ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    <Upload className="h-6 w-6" />
                                    {csvFile ? "CSV Selecionado" : "Adicionar CSV (Dados Eleitorais)"}
                                </Button>
                            </div>

                            {/* Botão PDF */}
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
                                    className={`w-full h-16 text-lg font-medium gap-3 border-2 border-dashed ${pdfFile ? 'border-green-500 text-green-600 bg-green-50' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <FileText className="h-6 w-6" />
                                    {pdfFile ? "PDF Selecionado" : "Adicionar PDF (Plano de Governo)"}
                                </Button>
                            </div>
                        </div>

                        {/* Dropzone Area */}
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center text-center bg-slate-50/50">
                            {csvFile ? (
                                <div className="flex flex-col items-center text-green-600 animate-in fade-in zoom-in">
                                    <Cloud className="h-12 w-12 mb-3" />
                                    <p className="font-medium text-lg">{csvFile.name}</p>
                                    <p className="text-sm text-muted-foreground">{(csvFile.size / 1024).toFixed(2)} KB - Pronto para upload</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-muted-foreground">
                                    <Cloud className="h-12 w-12 mb-3 text-slate-300" />
                                    <p className="font-medium">Nenhum arquivo CSV selecionado para prévia</p>
                                    <p className="text-sm text-slate-400">Os dados serão processados automaticamente após salvar.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 3. CARD 2: INFORMAÇÕES PESSOAIS */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-4 border-b bg-slate-50/50">
                        <CardTitle className="text-base font-bold text-blue-700 flex items-center gap-2">
                            <User className="h-5 w-5" /> Informações Pessoais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="nome">Nome Completo</Label>
                                <Input id="nome" placeholder="Ex: João da Silva Santos" {...register("nome")} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nomeUrna">Nome de Urna</Label>
                                <Input id="nomeUrna" placeholder="Ex: João do Povo" {...register("nomeUrna")} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="cpf">CPF</Label>
                                <Input id="cpf" placeholder="000.000.000-00" {...register("cpf")} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="joao@campanha.com" {...register("email")} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="telefone">Telefone</Label>
                                <Input id="telefone" placeholder="(00) 00000-0000" {...register("telefone")} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. CARD 3: CREDENCIAIS DE ACESSO */}
                <Card className="border-purple-100 shadow-sm overflow-hidden">
                    <CardHeader className="pb-4 border-b bg-purple-50/50">
                        <CardTitle className="text-base font-bold text-purple-700 flex items-center gap-2">
                            <Key className="h-5 w-5" /> Credenciais de Acesso
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="login" className="text-purple-900">Login (Gerado Automático)</Label>
                                <Input
                                    id="login"
                                    className="bg-purple-50 border-purple-200 text-purple-700 font-mono"
                                    readOnly
                                    {...register("login")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="senha" className="text-purple-900">Senha Provisória</Label>
                                <div className="relative">
                                    <Input
                                        id="senha"
                                        className="bg-purple-50 border-purple-200 text-purple-700 font-mono pr-10"
                                        readOnly
                                        {...register("password")}
                                    />
                                    <button
                                        type="button"
                                        onClick={generateCredentials}
                                        className="absolute right-2 top-2.5 text-purple-400 hover:text-purple-700 transition-colors"
                                        title="Gerar nova senha"
                                    >
                                        <RefreshCw className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Alert className="bg-purple-50 border-purple-200 text-purple-800">
                            <AlertCircle className="h-4 w-4 text-purple-600" />
                            <AlertTitle className="text-purple-900 font-bold ml-2">Importante</AlertTitle>
                            <AlertDescription className="ml-2 text-purple-800/80">
                                Estas credenciais serão usadas pelo candidato para o primeiro acesso ao painel.
                                Envie-as de forma segura. O candidato será solicitado a trocar a senha no primeiro login.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>

                {/* 5. CARD 4: INFORMAÇÕES ELEITORAIS */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-4 border-b bg-slate-50/50">
                        <CardTitle className="text-base font-bold text-green-700 flex items-center gap-2">
                            <MapPin className="h-5 w-5" /> Informações Eleitorais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Cargo Disputado</Label>
                                <Select onValueChange={(v) => setValue("cargo", v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o cargo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="prefeito">Prefeito</SelectItem>
                                        <SelectItem value="vereador">Vereador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="numero">Número na Urna</Label>
                                <Input id="numero" type="number" placeholder="Ex: 15" {...register("numero")} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="partido">Partido / Coligação</Label>
                                <Input id="partido" placeholder="Ex: MDB - Movimento Democrático Brasileiro" {...register("partido")} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cidade">Cidade / Estado</Label>
                                <Input id="cidade" placeholder="Ex: São Paulo - SP" {...register("cidade")} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 6. FOOTER DE AÇÃO */}
                <div className="flex items-center justify-end gap-4 pt-4 border-t">
                    <Button type="button" variant="ghost" className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4 mr-2" /> Cancelar
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 px-8 h-12 text-base shadow-lg shadow-blue-600/20">
                        <Save className="h-5 w-5 mr-2" /> Salvar Candidato
                    </Button>
                </div>
            </form>
        </div>
    );
}
