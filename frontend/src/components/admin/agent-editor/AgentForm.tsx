
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Agent, AgentCreate } from "@/types/agent";
import { BasicInfo } from "./BasicInfo";
import { PromptEditor } from "./PromptEditor";
import { ToolsSelector } from "./ToolsSelector";
import { KnowledgeBase } from "./KnowledgeBase";
import { ComplianceConfig } from "./ComplianceConfig";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AgentFormProps {
    initialData?: Agent;
    onSubmit: (data: AgentCreate) => Promise<void>;
    onCancel: () => void;
}

export function AgentForm({ initialData, onSubmit, onCancel }: AgentFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState("basic");
    const { toast } = useToast();

    const form = useForm<AgentCreate>({
        defaultValues: initialData || {
            name: "",
            display_name: "",
            role: "",
            type: "generic",
            description: "",
            system_prompt: "",
            tools: [],
            knowledge_base: [],
            compliance_rules: ["fact_check", "impartiality"], // Defaults enterprise safe
            is_active: true,
        },
    });

    const handleSubmit = async (data: AgentCreate) => {
        setIsSubmitting(true);
        try {
            await onSubmit(data);
            toast({
                title: "Sucesso",
                description: "Agente salvo com sucesso!",
                variant: "default",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro",
                description: "Erro ao salvar agente.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-1">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
                    <div className="border-b px-4 bg-background z-10 sticky top-0">
                        <TabsList className="w-full justify-start h-12 bg-transparent p-0 space-x-6">
                            <TabsTrigger
                                value="basic"
                                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 bg-transparent"
                            >
                                Visão Geral
                            </TabsTrigger>
                            <TabsTrigger
                                value="prompt"
                                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 bg-transparent"
                            >
                                System Prompt
                            </TabsTrigger>
                            <TabsTrigger
                                value="tools"
                                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 bg-transparent"
                            >
                                Ferramentas
                            </TabsTrigger>
                            <TabsTrigger
                                value="knowledge"
                                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 bg-transparent"
                            >
                                Knowledge Base
                            </TabsTrigger>
                            <TabsTrigger
                                value="compliance"
                                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 bg-transparent"
                            >
                                Compliance
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-6 flex-1">
                        <TabsContent value="basic" className="m-0 h-full">
                            <BasicInfo form={form} />
                        </TabsContent>

                        <TabsContent value="prompt" className="m-0 h-full">
                            <PromptEditor form={form} />
                        </TabsContent>

                        <TabsContent value="tools" className="m-0 h-full">
                            <ToolsSelector form={form} />
                        </TabsContent>

                        <TabsContent value="knowledge" className="m-0 h-full">
                            <KnowledgeBase form={form} />
                        </TabsContent>

                        <TabsContent value="compliance" className="m-0 h-full">
                            <ComplianceConfig form={form} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            <div className="border-t p-4 flex justify-end gap-3 bg-background">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Save className="w-4 h-4" />
                    Salvar Agente
                </Button>
            </div>
        </form>
    );
}
