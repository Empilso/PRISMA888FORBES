
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AVAILABLE_TOOLS } from "@/types/agent";
import { UseFormReturn } from "react-hook-form";
import { AgentCreate } from "@/types/agent";

interface ToolsSelectorProps {
    form: UseFormReturn<AgentCreate>;
}

export function ToolsSelector({ form }: ToolsSelectorProps) {
    const { setValue, watch } = form;
    const currentTools = watch("tools") || [];

    const handleToggle = (toolId: string) => {
        if (currentTools.includes(toolId)) {
            setValue("tools", currentTools.filter(id => id !== toolId));
        } else {
            setValue("tools", [...currentTools, toolId]);
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Ferramentas Habilitadas</Label>
                <p className="text-sm text-muted-foreground">
                    Selecione as ferramentas e capacidades que este agente poderá utilizar.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AVAILABLE_TOOLS.map((tool) => (
                    <div
                        key={tool.value}
                        className={`flex items-start space-x-3 border p-4 rounded-lg transition-colors ${currentTools.includes(tool.value) ? 'bg-accent/50 border-accent' : 'hover:bg-muted/50'
                            }`}
                    >
                        <Checkbox
                            id={`tool-${tool.value}`}
                            checked={currentTools.includes(tool.value)}
                            onCheckedChange={() => handleToggle(tool.value)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label
                                htmlFor={`tool-${tool.value}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                {tool.label}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                {tool.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
