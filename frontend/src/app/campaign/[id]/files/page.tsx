"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FolderOpen, Upload, FileText, Users, Eye, Trash2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Document {
    id: string;
    filename: string;
    file_type: string;
    file_url: string;
    author_name: string;
    doc_type: string;
    created_at: string;
}

export default function FilesPage() {
    const params = useParams();
    const campaignId = params?.id as string;
    const supabase = createClient();
    const { toast } = useToast();

    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form state para upload
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [authorName, setAuthorName] = useState("me");
    const [docType, setDocType] = useState("government_plan");
    const [isRival, setIsRival] = useState(false);
    const [rivalName, setRivalName] = useState("");

    // Buscar documentos
    useEffect(() => {
        if (campaignId) {
            fetchDocuments();
        }
    }, [campaignId]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("documents")
                .select("*")
                .eq("campaign_id", campaignId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setDocuments(data || []);
        } catch (error) {
            console.error("Erro ao buscar documentos:", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar os documentos.",
                variant: "destructive"
            });
        }
        setLoading(false);
    };

    const handleUpload = async () => {
        if (!uploadFile) {
            toast({ title: "Selecione um arquivo", variant: "destructive" });
            return;
        }

        setUploading(true);
        try {
            // 1. Upload para o Storage
            const fileExt = uploadFile.name.split('.').pop();
            const fileName = `${campaignId}/${Date.now()}.${fileExt}`;

            const { data: storageData, error: storageError } = await supabase.storage
                .from("campaign-files")
                .upload(fileName, uploadFile);

            if (storageError) throw storageError;

            // 2. Obter URL pública
            const { data: urlData } = supabase.storage
                .from("campaign-files")
                .getPublicUrl(fileName);

            // 3. Salvar metadata no banco
            const { error: dbError } = await supabase
                .from("documents")
                .insert({
                    campaign_id: campaignId,
                    filename: uploadFile.name,
                    file_type: fileExt === "pdf" ? "pdf" : "other",
                    file_url: urlData.publicUrl,
                    author_name: isRival ? rivalName : "me",
                    doc_type: docType
                });

            if (dbError) throw dbError;

            // 4. Se for PDF, disparar ingestão vetorial
            if (fileExt === "pdf") {
                toast({
                    title: "📄 PDF enviado!",
                    description: "Iniciando processamento de IA...",
                });

                // Chama a API de ingestão
                fetch(`/api/ingest/pdf`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        campaign_id: campaignId,
                        file_url: urlData.publicUrl,
                        author_name: isRival ? rivalName : "me"
                    })
                }).catch(err => console.error("Erro na ingestão:", err));
            }

            toast({
                title: "✅ Upload concluído!",
                description: isRival
                    ? `Documento do rival "${rivalName}" adicionado.`
                    : "Documento da campanha adicionado."
            });

            // Resetar form e fechar dialog
            setUploadFile(null);
            setAuthorName("me");
            setDocType("government_plan");
            setIsRival(false);
            setRivalName("");
            setIsDialogOpen(false);

            // Atualizar lista
            fetchDocuments();

        } catch (error) {
            console.error("Erro no upload:", error);
            toast({
                title: "Erro no upload",
                description: "Não foi possível enviar o arquivo.",
                variant: "destructive"
            });
        }
        setUploading(false);
    };

    const handleDelete = async (docId: string) => {
        try {
            const { error } = await supabase
                .from("documents")
                .delete()
                .eq("id", docId);

            if (error) throw error;

            toast({ title: "Documento removido" });
            fetchDocuments();
        } catch (error) {
            toast({
                title: "Erro ao remover",
                description: "Não foi possível remover o documento.",
                variant: "destructive"
            });
        }
    };

    // Separar documentos
    const myDocuments = documents.filter(d => d.author_name === "me");
    const rivalDocuments = documents.filter(d => d.author_name !== "me");

    // Agrupar rivais
    const rivalsByAuthor = rivalDocuments.reduce((acc, doc) => {
        if (!acc[doc.author_name]) acc[doc.author_name] = [];
        acc[doc.author_name].push(doc);
        return acc;
    }, {} as Record<string, Document[]>);

    const DocTypeLabels: Record<string, string> = {
        government_plan: "Plano de Governo",
        campaign_material: "Material de Campanha",
        research: "Pesquisa",
        intelligence: "Inteligência",
        other: "Outro"
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 px-4 sm:px-8 py-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Repositório de Arquivos</h1>
                    <p className="text-sm text-muted-foreground">
                        Central de documentos da campanha e inteligência de rivais.
                    </p>
                </div>

                {/* Dialog de Upload */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Upload className="h-4 w-4" />
                            Upload de Arquivo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>📤 Upload de Documento</DialogTitle>
                            <DialogDescription>
                                Adicione documentos da sua campanha ou de rivais para análise pela IA.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Arquivo */}
                            <div className="space-y-2">
                                <Label>Arquivo</Label>
                                <Input
                                    type="file"
                                    accept=".pdf,.csv,.xlsx,.doc,.docx"
                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                />
                                {uploadFile && (
                                    <p className="text-xs text-muted-foreground">
                                        Selecionado: {uploadFile.name}
                                    </p>
                                )}
                            </div>

                            {/* Tipo de Documento */}
                            <div className="space-y-2">
                                <Label>Tipo de Documento</Label>
                                <Select value={docType} onValueChange={setDocType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="government_plan">📜 Plano de Governo</SelectItem>
                                        <SelectItem value="campaign_material">📢 Material de Campanha</SelectItem>
                                        <SelectItem value="research">📊 Pesquisa</SelectItem>
                                        <SelectItem value="intelligence">🕵️ Inteligência</SelectItem>
                                        <SelectItem value="other">📁 Outro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Toggle Rival */}
                            <div className="space-y-2">
                                <Label>Este documento pertence a:</Label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsRival(false)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${!isRival
                                            ? 'border-green-500 bg-green-50 text-green-700'
                                            : 'border-border bg-muted/30 text-muted-foreground'
                                            }`}
                                    >
                                        <div className="text-lg mb-1">👤</div>
                                        <div className="text-xs font-medium">Minha Campanha</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsRival(true)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${isRival
                                            ? 'border-red-500 bg-red-50 text-red-700'
                                            : 'border-border bg-muted/30 text-muted-foreground'
                                            }`}
                                    >
                                        <div className="text-lg mb-1">🎭</div>
                                        <div className="text-xs font-medium">Documento de Rival</div>
                                    </button>
                                </div>
                            </div>

                            {/* Nome do Rival (se selecionado) */}
                            {isRival && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <Label>Nome do Candidato Rival</Label>
                                    <Input
                                        placeholder="Ex: João da Silva"
                                        value={rivalName}
                                        onChange={(e) => setRivalName(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        ⚠️ A IA poderá comparar os planos de governo e identificar pontos de ataque.
                                    </p>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                onClick={handleUpload}
                                disabled={uploading || !uploadFile || (isRival && !rivalName)}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Enviar Documento
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Seção: Documentos da Campanha */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-green-600" />
                    <h2 className="text-lg font-semibold">📂 Documentos da Campanha</h2>
                    <Badge variant="secondary">{myDocuments.length}</Badge>
                </div>

                {myDocuments.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-8">
                            <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Nenhum documento da campanha</p>
                            <p className="text-xs text-muted-foreground">Faça upload do Plano de Governo</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myDocuments.map((doc) => (
                            <Card key={doc.id} className="group hover:shadow-md transition-shadow">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-blue-500" />
                                            <div>
                                                <CardTitle className="text-sm line-clamp-1">
                                                    {doc.filename}
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    {DocTypeLabels[doc.doc_type] || doc.doc_type}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" asChild>
                                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                                    <Eye className="h-4 w-4" />
                                                </a>
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-red-500">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Remover documento?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta ação não pode ser desfeita.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(doc.id)}>
                                                            Remover
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Seção: Inteligência de Rivais */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-red-600" />
                    <h2 className="text-lg font-semibold">🎭 Inteligência de Rivais</h2>
                    <Badge variant="destructive">{rivalDocuments.length}</Badge>
                </div>

                {Object.keys(rivalsByAuthor).length === 0 ? (
                    <Card className="border-dashed border-red-200">
                        <CardContent className="flex flex-col items-center justify-center py-8">
                            <Users className="h-10 w-10 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Nenhum documento de rival</p>
                            <p className="text-xs text-muted-foreground">
                                Faça upload de Planos de Governo de adversários
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(rivalsByAuthor).map(([rivalName, docs]) => (
                            <Card key={rivalName} className="border-red-200 bg-red-50/30">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">
                                                {rivalName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">{rivalName}</CardTitle>
                                                <CardDescription className="text-xs">
                                                    {docs.length} documento(s)
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="border-red-300 text-red-600">
                                            Rival
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {docs.map((doc) => (
                                            <div
                                                key={doc.id}
                                                className="flex items-center justify-between p-2 rounded-lg bg-white border"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-red-500" />
                                                    <span className="text-sm">{doc.filename}</span>
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        {DocTypeLabels[doc.doc_type] || doc.doc_type}
                                                    </Badge>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                                            <Eye className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-red-500">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Remover documento?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta ação não pode ser desfeita.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(doc.id)}>
                                                                    Remover
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
