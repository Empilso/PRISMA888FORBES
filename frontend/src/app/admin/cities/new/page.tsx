"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, Loader2, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function NewCityPage() {
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        state: ""
    });
    const [files, setFiles] = useState<{
        plano_governo: File | null;
        despesas: File | null;
        receitas: File | null;
    }>({
        plano_governo: null,
        despesas: null,
        receitas: null
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updates = { ...prev, [name]: value };
            if (name === "name" && !prev.slug) {
                updates.slug = value.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");
            }
            return updates;
        });
    };

    const handleFileChange = (key: keyof typeof files) => (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [key]: e.target.files![0] }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess(false);

        try {
            const slug = formData.slug || formData.name.toLowerCase().replace(/ /g, "-");
            const data = new FormData();
            data.append("name", formData.name);
            data.append("state", formData.state);

            if (files.plano_governo) data.append("plano_governo", files.plano_governo);
            if (files.despesas) data.append("despesas", files.despesas);
            if (files.receitas) data.append("receitas", files.receitas);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/cities/${slug}/onboarding`, {
                method: 'POST',
                body: data
            });

            const responseData = await res.json();

            if (!res.ok) {
                const errorMessage = responseData.detail || responseData.message || "Falha desconhecida no servidor.";
                throw new Error(errorMessage);
            }

            setSuccess(true);
        } catch (err: any) {
            console.error("Upload Error:", err);
            setError(err.message || "Erro de conexão com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="container mx-auto py-10 max-w-2xl text-center space-y-6">
                <div className="flex justify-center">
                    <CheckCircle className="w-24 h-24 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800">Cidade Inicializada!</h1>
                <p className="text-slate-600">
                    Os dados da cidade <strong>{formData.name}</strong> foram processados com sucesso.
                    O sistema agora está pronto para auditoria.
                </p>
                <Button onClick={() => window.location.href = "/admin/cidades"} className="bg-slate-900 text-white">
                    Voltar para Lista de Cidades
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 max-w-3xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Onboarding de Cidade</h1>
                <p className="text-slate-500">Cadastre um novo município e importe seus dados fiscais e documentos.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Dados do Município</CardTitle>
                        <CardDescription>Informações básicas para registro no sistema.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome da Cidade</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Ex: Sorocaba"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="state">Estado (UF)</Label>
                            <Input
                                id="state"
                                name="state"
                                placeholder="Ex: SP"
                                maxLength={2}
                                value={formData.state}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label htmlFor="slug">Slug (URL)</Label>
                            <Input
                                id="slug"
                                name="slug"
                                placeholder="sorocaba-sp"
                                value={formData.slug}
                                onChange={handleInputChange}
                                required
                            />
                            <p className="text-xs text-slate-400">Identificador único usado na URL.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* File Uploads */}
                <Card>
                    <CardHeader>
                        <CardTitle>Importação de Dados (TCE-SP)</CardTitle>
                        <CardDescription>Faça upload dos arquivos para popular a base de dados.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Plano de Governo */}
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <Label className="text-base font-semibold">Plano de Governo (PDF)</Label>
                                    <p className="text-xs text-slate-500 mb-2">Documento oficial registrado no TSE.</p>
                                    <Input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange('plano_governo')}
                                        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Despesas */}
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <Label className="text-base font-semibold">Despesas Municipais (CSV)</Label>
                                    <p className="text-xs text-slate-500 mb-2">Exportação do Portal da Transparência/TCE.</p>
                                    <Input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange('despesas')}
                                        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Receitas */}
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <Label className="text-base font-semibold">Receitas Municipais (CSV)</Label>
                                    <p className="text-xs text-slate-500 mb-2">Dados de arrecadação (Opcional).</p>
                                    <Input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange('receitas')}
                                        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                                    />
                                </div>
                            </div>
                        </div>

                    </CardContent>
                </Card>

                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Erro</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="flex justify-end pt-4">
                    <Button type="submit" size="lg" disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white shadow-xl w-full md:w-auto">
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando Dados...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" /> Inicializar Cidade
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
