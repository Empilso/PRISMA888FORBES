
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, FileText, Link as LinkIcon } from "lucide-react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { AgentCreate } from "@/types/agent";

interface KnowledgeBaseProps {
    form: UseFormReturn<AgentCreate>;
}

export function KnowledgeBase({ form }: KnowledgeBaseProps) {
    const { register, control } = form;
    const { fields, append, remove } = useFieldArray({
        control,
        name: "knowledge_base" as any, // Cast to any to avoid strict typing issues with deeply nested JSON array for now
    });

    const addResource = () => {
        append({ type: "url", title: "", url: "" });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <Label>Base de Conhecimento</Label>
                    <p className="text-sm text-muted-foreground">
                        Adicione documentos e links que servirão de contexto para o agente.
                    </p>
                </div>
                <Button onClick={addResource} variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar Recurso
                </Button>
            </div>

            <div className="space-y-3">
                {fields.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                        Nenhum recurso adicionado ainda.
                        <br />
                        Clique em "Adicionar Recurso" para começar.
                    </div>
                )}

                {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-3 items-start p-3 border rounded-md bg-card">
                        <div className="mt-2">
                            <FileText className="w-5 h-5 text-blue-500" />
                        </div>

                        <div className="flex-1 grid gap-3">
                            <Input
                                placeholder="Título do Documento"
                                {...register(`knowledge_base.${index}.title` as any, { required: true })}
                            />
                            <div className="flex gap-2">
                                <Input
                                    placeholder="URL ou Caminho do Arquivo"
                                    className="flex-1 font-mono text-xs"
                                    {...register(`knowledge_base.${index}.url` as any, { required: true })}
                                />
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => remove(index)}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
