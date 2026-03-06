
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AGENT_TYPES } from "@/types/agent";
import { UseFormReturn } from "react-hook-form";
import { AgentCreate } from "@/types/agent";

interface BasicInfoProps {
    form: UseFormReturn<AgentCreate>;
}

export function BasicInfo({ form }: BasicInfoProps) {
    const { register, setValue, watch, formState: { errors } } = form;
    const typeValue = watch("type");

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="display_name">Nome de Exibição</Label>
                    <Input
                        id="display_name"
                        placeholder="Ex: Auditor Senior"
                        {...register("display_name", { required: "Nome é obrigatório" })}
                    />
                    {errors.display_name && <p className="text-red-500 text-xs">{errors.display_name.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="name">Identificador (Slug)</Label>
                    <Input
                        id="name"
                        placeholder="Ex: auditor-senior-v1"
                        {...register("name", {
                            required: "Slug é obrigatório",
                            pattern: {
                                value: /^[a-z0-9-_]+$/,
                                message: "Apenas letras minúsculas, números, hífens e underlines"
                            }
                        })}
                    />
                    {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="role">Cargo / Função</Label>
                    <Input
                        id="role"
                        placeholder="Ex: Especialista em Análises"
                        {...register("role", { required: "Cargo é obrigatório" })}
                    />
                    {errors.role && <p className="text-red-500 text-xs">{errors.role.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label>Tipo de Agente</Label>
                    <Select
                        value={typeValue}
                        onValueChange={(value) => setValue("type", value as any)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            {AGENT_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    <div className="flex items-center gap-2">
                                        {/* Icon could go here */}
                                        {type.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                    id="description"
                    placeholder="Descreva o propósito e capacidades deste agente..."
                    {...register("description")}
                />
            </div>
        </div>
    );
}
