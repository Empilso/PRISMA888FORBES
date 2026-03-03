
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, FileText, Link as LinkIcon, Database, Check } from "lucide-react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { AgentCreate } from "@/types/agent";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface KnowledgeBaseProps {
    form: UseFormReturn<AgentCreate>;
}

// Type from API
interface KnowledgeFile {
    id: string;
    filename: string;
    file_path: string;
    status: string;
    created_at: string;
}

export function KnowledgeBase({ form }: KnowledgeBaseProps) {
    const { register, control, watch, setValue } = form;
    const { fields, append, remove } = useFieldArray({
        control,
        name: "knowledge_base" as any,
    });

    const [availableFiles, setAvailableFiles] = useState<KnowledgeFile[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Fetch repository files
    const fetchRepoFiles = async () => {
        setIsLoadingFiles(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/api/knowledge/list`);
            if (res.ok) {
                const data = await res.json();
                setAvailableFiles(data);
            }
        } catch (error) {
            console.error("Failed to fetch repo files", error);
        } finally {
            setIsLoadingFiles(false);
        }
    };

    // Helper to check if file is already added
    const isFileSelected = (path: string) => {
        return fields.some((f: any) => f.url === path);
    };

    const toggleFileSelection = (file: KnowledgeFile) => {
        const exists = fields.findIndex((f: any) => f.url === file.file_path);
        if (exists >= 0) {
            remove(exists);
        } else {
            append({
                type: 'file',
                title: file.filename,
                url: file.file_path
            });
        }
    };

    const addUrlResource = () => {
        append({ type: "url", title: "", url: "" });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <Label className="text-base">Base de Conhecimento</Label>
                    <p className="text-sm text-muted-foreground">
                        Defina o contexto que o agente deve acessar.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={fetchRepoFiles} className="gap-2">
                                <Database className="w-4 h-4" />
                                Repositório Central
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Selecionar Arquivos do Repositório</DialogTitle>
                                <DialogDescription>
                                    Escolha os arquivos que este agente deve ler.
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[400px] mt-4 p-1 border rounded-md">
                                {isLoadingFiles && <div className="p-4 text-center">Carregando...</div>}
                                {!isLoadingFiles && availableFiles.length === 0 && (
                                    <div className="p-4 text-center text-muted-foreground">Nenhum arquivo encontrado no repositório central.</div>
                                )}
                                <div className="space-y-2">
                                    {availableFiles.map((file) => (
                                        <div key={file.id}
                                            className="flex items-center space-x-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                                            onClick={() => toggleFileSelection(file)}
                                        >
                                            <Checkbox
                                                id={`file-${file.id}`}
                                                checked={isFileSelected(file.file_path)}
                                                onCheckedChange={() => toggleFileSelection(file)}
                                            />
                                            <div className="grid gap-1.5 leading-none">
                                                <label
                                                    htmlFor={`file-${file.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                >
                                                    {file.filename}
                                                </label>
                                                <p className="text-xs text-muted-foreground">
                                                    {file.status} • {new Date(file.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {isFileSelected(file.file_path) && <Badge variant="secondary" className="ml-auto">Selecionado</Badge>}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>

                    <Button onClick={addUrlResource} variant="outline" size="sm" className="gap-2">
                        <LinkIcon className="w-4 h-4" />
                        Add Link
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                {fields.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground bg-slate-50 dark:bg-slate-900/50">
                        Nenhum recurso vinculado.
                        <br />
                        Use os botões acima para conectar conhecimento.
                    </div>
                )}

                {fields.map((field, index) => {
                    const type = form.watch(`knowledge_base.${index}.type` as any) || 'url';
                    const isFile = type === 'file';

                    return (
                        <div key={field.id} className="flex gap-3 items-center p-3 border rounded-md bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <div className="mt-1">
                                {isFile ? (
                                    <Database className="w-5 h-5 text-purple-500" />
                                ) : (
                                    <LinkIcon className="w-5 h-5 text-blue-500" />
                                )}
                            </div>

                            <div className="flex-1 grid gap-2">
                                {/* Validations are loose here for hybrid support */}
                                <Input
                                    placeholder="Título / Identificador"
                                    className="font-medium h-8"
                                    {...register(`knowledge_base.${index}.title` as any)}
                                />
                                <div className="flex gap-2">
                                    <Input
                                        placeholder={isFile ? "Caminho do Arquivo (Automático)" : "https://..."}
                                        className="flex-1 font-mono text-xs h-8 bg-slate-50 dark:bg-slate-950"
                                        readOnly={isFile} // Files should be managed via Repo Dialog to avoid broken paths
                                        {...register(`knowledge_base.${index}.url` as any, { required: true })}
                                    />
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-red-500"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
