
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { COMPLIANCE_RULES } from "@/types/agent";
import { UseFormReturn } from "react-hook-form";
import { AgentCreate } from "@/types/agent";

interface ComplianceConfigProps {
    form: UseFormReturn<AgentCreate>;
}

export function ComplianceConfig({ form }: ComplianceConfigProps) {
    const { setValue, watch } = form;
    const rawRules = watch("compliance_rules");
    // Ensure currentRules is always an array (handles null, undefined, or object)
    const currentRules = Array.isArray(rawRules) ? rawRules : [];

    const handleToggle = (ruleId: string) => {
        if (currentRules.includes(ruleId)) {
            setValue("compliance_rules", currentRules.filter(id => id !== ruleId));
        } else {
            setValue("compliance_rules", [...currentRules, ruleId]);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label>Regras de Compliance & Guardrails</Label>
                <p className="text-sm text-muted-foreground">
                    Defina as restrições éticas e de segurança que o agente deve obedecer rigorosamente.
                </p>
            </div>

            <div className="space-y-4">
                {COMPLIANCE_RULES.map((rule) => (
                    <div
                        key={rule.value}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                        <div className="space-y-0.5">
                            <Label htmlFor={`rule-${rule.value}`} className="text-base font-medium">
                                {rule.label}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                {rule.description}
                            </p>
                        </div>
                        <Switch
                            id={`rule-${rule.value}`}
                            checked={currentRules.includes(rule.value)}
                            onCheckedChange={() => handleToggle(rule.value)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
