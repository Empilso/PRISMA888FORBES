
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from "react-hook-form";
import { AgentCreate } from "@/types/agent";

interface PromptEditorProps {
    form: UseFormReturn<AgentCreate>;
}

export function PromptEditor({ form }: PromptEditorProps) {
    const { register, formState: { errors } } = form;

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <Label htmlFor="system_prompt">System Prompt (Instruções Base)</Label>
                <span className="text-xs text-muted-foreground">
                    Variáveis disponíveis: {'{campaign_name}'}, {'{context}'}
                </span>
            </div>

            <Textarea
                id="system_prompt"
                className="flex-1 min-h-[300px] font-mono text-sm leading-relaxed"
                placeholder="Você é um assistente especializado em..."
                {...register("system_prompt", { required: "O prompt do sistema é obrigatório" })}
            />
            {errors.system_prompt && <p className="text-red-500 text-xs">{errors.system_prompt.message}</p>}

            <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground">
                <p className="font-semibold mb-1">Dicas de Engenharia de Prompt:</p>
                <ul className="list-disc pl-4 space-y-1">
                    <li>Defina claramente o papel (Role) e o objetivo (Goal).</li>
                    <li>Use delimitadores como ### para separar seções.</li>
                    <li>Forneça exemplos de output (Few-Shot) para melhorar a consistência.</li>
                    <li>Especifique o tom de voz e o formato de resposta desejado.</li>
                </ul>
            </div>
        </div>
    );
}
