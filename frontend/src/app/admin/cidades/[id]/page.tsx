
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    MapPin,
    ArrowLeft,
    UsersThree,
    Plus,
    Download,
    FileText,
    UploadSimple,
    Trash
} from "@phosphor-icons/react";
import { TSEImportModal } from "@/components/admin/politicos/TSEImportModal";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast"; // Assuming useToast exists

interface City {
    id: string;
    name: string;
    state: string;
    ibge_code: string | null;
    slug: string;
}

interface Politician {
    id: string;
    name: string;
    tipo: string;
    partido: string | null;
    slug: string;
    created_at: string;
}

interface KnowledgeFile {
    id: string;
    filename: string;
    size: number;
    category: string;
    status: string;
    created_at: string;
}

export default function CityDetailPage() {
    const params = useParams();
    const router = useRouter();
    const cityId = params.id as string;
    const { toast } = useToast();

    const [city, setCity] = useState<City | null>(null);
    const [politicians, setPoliticians] = useState<Politician[]>([]);
    const [documents, setDocuments] = useState<KnowledgeFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadCategory, setUploadCategory] = useState("plano_governo");
    const [uploadProvider, setUploadProvider] = useState("openai");

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch City
            const cityRes = await fetch(`${API_URL}/api/cities/${cityId}`);
            if (!cityRes.ok) throw new Error("City not found");
            const cityData = await cityRes.json();
            setCity(cityData);

            // Fetch Politicians
            const polRes = await fetch(`${API_URL}/api/politicians?city_id=${cityId}&limit=100`);
            if (polRes.ok) {
                const polData = await polRes.json();
                setPoliticians(polData);
            }

            // Fetch Documents
            const docRes = await fetch(`${API_URL}/api/knowledge/list?city_id=${cityId}`);
            if (docRes.ok) {
                const docData = await docRes.json();
                setDocuments(docData);
            }

        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (cityId) fetchData();
    }, [cityId]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", uploadCategory);
        formData.append("city_id", cityId);
        formData.append("provider", uploadProvider);

        try {
            const res = await fetch(`${API_URL}/api/knowledge/upload`, {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                toast({ title: "Sucesso", description: `Documento enviado para análise (${uploadProvider.toUpperCase()}).` });
                fetchData(); // Refresh list
            } else {
                const err = await res.json();
                toast({ title: "Erro", description: err.detail || "Falha no upload", variant: "destructive" });
            }
        } catch (error) {
            console.error("Upload error", error);
            toast({ title: "Erro", description: "Erro de conexão", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const getTypeLabel = (tipo: string) => {
        const types: Record<string, string> = {
            prefeito: "Prefeito",
            vereador: "Vereador",
            vice_prefeito: "Vice-Prefeito"
        };
        return types[tipo] || tipo;
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Carregando detalhes da cidade...</div>;
    if (!city) return <div className="p-8 text-center text-red-500">Cidade não encontrada.</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/admin/cidades")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{city.name} - {city.state}</h1>
                    <div className="flex items-center gap-3 text-sm text-slate-500 font-mono">
                        <span>IBGE: {city.ibge_code || "N/A"}</span>
                        <span>•</span>
                        <span>{politicians.length} Políticos</span>
                        <span>•</span>
                        <span>{documents.length} Documentos</span>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="politicos" className="w-full">
                <TabsList className="bg-slate-100">
                    <TabsTrigger value="politicos" className="gap-2">
                        <UsersThree className="w-4 h-4" /> Políticos
                    </TabsTrigger>
                    <TabsTrigger value="documentos" className="gap-2">
                        <FileText className="w-4 h-4" /> Base de Conhecimento
                    </TabsTrigger>
                </TabsList>

                {/* TAB: POLÍTICOS */}
                <TabsContent value="politicos" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <UsersThree className="w-5 h-5 text-violet-600" />
                                Base Política
                            </CardTitle>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                    onClick={() => setIsImportModalOpen(true)}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Importar do TSE
                                </Button>
                                <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Novo Político
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {politicians.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    Nenhum político cadastrado nesta cidade.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Cargo</TableHead>
                                            <TableHead>Partido</TableHead>
                                            <TableHead>Slug</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {politicians.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium">{p.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-slate-100">
                                                        {getTypeLabel(p.tipo)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-bold text-slate-700">
                                                    {p.partido || "-"}
                                                </TableCell>
                                                <TableCell className="text-xs font-mono text-slate-400">
                                                    {p.slug}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: DOCUMENTOS */}
                <TabsContent value="documentos" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-orange-600" />
                                    Documentos da Cidade
                                </div>

                                <div className="flex items-center gap-2">
                                    <Select value={uploadProvider} onValueChange={setUploadProvider}>
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue placeholder="Provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="openai">OpenAI</SelectItem>
                                            <SelectItem value="deepseek">DeepSeek</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={uploadCategory} onValueChange={setUploadCategory}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Categoria" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="plano_governo">Plano de Governo</SelectItem>
                                            <SelectItem value="dossie">Dossiê</SelectItem>
                                            <SelectItem value="contrato">Contrato</SelectItem>
                                            <SelectItem value="geral">Geral</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="relative">
                                        <Button size="sm" variant="outline" className="gap-2" disabled={isUploading}>
                                            {isUploading ? "Enviando..." : (
                                                <>
                                                    <UploadSimple className="w-4 h-4" />
                                                    Upload
                                                </>
                                            )}
                                        </Button>
                                        <Input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handleFileUpload}
                                            disabled={isUploading}
                                        />
                                    </div>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {documents.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    Nenhum documento vinculado a esta cidade.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Arquivo</TableHead>
                                            <TableHead>Categoria</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Data</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {documents.map((doc) => (
                                            <TableRow key={doc.id}>
                                                <TableCell className="font-medium">{doc.filename}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="capitalize">
                                                        {doc.category?.replace("_", " ") || "Geral"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={doc.status === 'indexed' ? 'default' : 'outline'}>
                                                        {doc.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">
                                                    {new Date(doc.created_at).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                    <p className="text-sm text-slate-500 mt-4 px-1">
                        * Documentos adicionados aqui serão automaticamente acessíveis pelo <strong>Agente Radar</strong> ao analisar políticos desta cidade.
                    </p>
                </TabsContent>
            </Tabs>

            {/* Import Modal */}
            <TSEImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    fetchData();
                    setIsImportModalOpen(false);
                }}
                cities={[city]}
            />
        </div>
    );
}
