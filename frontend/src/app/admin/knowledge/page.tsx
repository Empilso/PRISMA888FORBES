
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
    CloudArrowUp,
    FilePdf,
    FileText,
    Trash,
    CheckCircle,
    WarningCircle,
    ArrowsClockwise,
    File
} from "@phosphor-icons/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// --- Types ---
interface KnowledgeFile {
    id: string;
    filename: string;
    size: number;
    type: string;
    status: 'indexed' | 'processing' | 'error';
    uploaded_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function KnowledgePage() {
    const [files, setFiles] = useState<KnowledgeFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    // --- Mock Data Loader (Replace with API Call) ---
    const fetchFiles = async () => {
        setIsLoading(true);
        try {
            // TODO: Replace with actual GET /api/knowledge/list when ready
            // const res = await fetch(`${API_URL}/api/knowledge/list`);
            // const data = await res.json();

            // Simulating API response for UI dev
            setTimeout(() => {
                setFiles([
                    { id: '1', filename: 'Plano_Governo_2026.pdf', size: 1024 * 1024 * 2.5, type: 'application/pdf', status: 'indexed', uploaded_at: new Date().toISOString() },
                    { id: '2', filename: 'Notas_Estrategicas.txt', size: 1024 * 15, type: 'text/plain', status: 'processing', uploaded_at: new Date().toISOString() },
                    { id: '3', filename: 'Analise_Concorrente_A.pdf', size: 1024 * 500, type: 'application/pdf', status: 'error', uploaded_at: new Date().toISOString() },
                ]);
                setIsLoading(false);
            }, 800);
        } catch (error) {
            console.error("Failed to fetch files:", error);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    // --- File Upload Logic ---
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        setIsUploading(true);

        for (const file of acceptedFiles) {
            const formData = new FormData();
            formData.append('file', file);
            // Default campaign ID for now - should come from context
            formData.append('campaign_id', 'default-campaign');

            try {
                // Determine API endpoint based on file type
                const endpoint = file.type === 'application/pdf' ? '/api/ingest/pdf' : '/api/knowledge/upload';

                // Real upload simulation
                // const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', body: formData });

                await new Promise(resolve => setTimeout(resolve, 1500)); // Fake upload delay

                toast({
                    title: "Arquivo enviado com sucesso",
                    description: `${file.name} foi adicionado à fila de processamento.`,
                    variant: "default", // or success if available
                });

                // Optimistic update
                setFiles(prev => [{
                    id: Math.random().toString(36).substr(2, 9),
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                    status: 'processing',
                    uploaded_at: new Date().toISOString()
                }, ...prev]);

            } catch (error) {
                toast({
                    title: "Erro no upload",
                    description: `Falha ao enviar ${file.name}.`,
                    variant: "destructive",
                });
            }
        }
        setIsUploading(false);
    }, [toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt', '.md'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        },
        maxSize: 10 * 1024 * 1024 // 10MB
    });

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const getFileIcon = (type: string) => {
        if (type.includes('pdf')) return <FilePdf className="w-8 h-8 text-red-500" weight="duotone" />;
        if (type.includes('text')) return <FileText className="w-8 h-8 text-blue-500" weight="duotone" />;
        return <File className="w-8 h-8 text-slate-500" weight="duotone" />;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'indexed':
                return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 gap-1"><CheckCircle weight="fill" className="w-3 h-3" /> Indexado</Badge>;
            case 'processing':
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200 gap-1"><ArrowsClockwise weight="bold" className="w-3 h-3 animate-spin" /> Processando</Badge>;
            case 'error':
                return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 gap-1"><WarningCircle weight="fill" className="w-3 h-3" /> Falha</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Base de Conhecimento</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-lg">
                        Centralize os documentos oficiais que alimentam a inteligência da sua IA.
                    </p>
                </div>
                <Button onClick={fetchFiles} variant="outline" disabled={isLoading} className="gap-2">
                    <ArrowsClockwise className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    Atualizar Lista
                </Button>
            </div>

            {/* Upload Area */}
            <Card className="border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800/50 group cursor-pointer relative overflow-hidden">
                {isUploading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 z-10 flex items-center justify-center backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-3">
                            <CloudArrowUp className="w-12 h-12 text-blue-500 animate-bounce" weight="duotone" />
                            <p className="font-medium text-slate-600 dark:text-slate-300">Enviando arquivos...</p>
                        </div>
                    </div>
                )}
                <div {...getRootProps()} className="p-12 text-center">
                    <input {...getInputProps()} />
                    <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <CloudArrowUp className="w-8 h-8 text-blue-600 dark:text-blue-400" weight="fill" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {isDragActive ? "Solte os arquivos aqui..." : "Arraste e solte seus documentos ou clique para selecionar"}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                        Suporta PDF, TXT, MD e DOCX (Máx 10MB). Arquivos serão automaticamente processados e indexados na memória vetorial.
                    </p>
                    <div className="mt-6 flex justify-center gap-4">
                        <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest font-semibold">
                            <CheckCircle weight="fill" className="text-green-500" />
                            Criptografado
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest font-semibold">
                            <CheckCircle weight="fill" className="text-green-500" />
                            Indexação Automática
                        </div>
                    </div>
                </div>
            </Card>

            {/* Files List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Documentos Indexados</CardTitle>
                    <CardDescription>
                        {files.length} arquivos disponíveis para consulta dos agentes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {files.length === 0 && !isLoading ? (
                        <div className="text-center py-12 text-slate-500">
                            <File className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Nenhum documento encontrado.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {files.map((file) => (
                                <div key={file.id} className="flex items-center justify-between p-4 rounded-lg border border-transparent hover:border-slate-100 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
                                            {getFileIcon(file.type)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[300px] md:max-w-md">
                                                {file.filename}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-slate-500 font-mono">{formatBytes(file.size)}</span>
                                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(file.uploaded_at).toLocaleDateString('pt-BR', {
                                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {getStatusBadge(file.status)}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Remover arquivo"
                                        >
                                            <Trash weight="duotone" className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
