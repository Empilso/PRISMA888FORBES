
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    PaintBrush,
    FloppyDisk,
    Image,
    Palette
} from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

import { createClient } from "@/lib/supabase/client";

export default function OrganizationConfig() {
    const params = useParams();
    const { toast } = useToast();
    const slug = params.slug as string;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        primaryColor: "#3b82f6",
        logoUrl: "",
        orgName: ""
    });

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/organizations/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    setSettings({
                        primaryColor: data.settings?.primaryColor || "#3b82f6",
                        logoUrl: data.settings?.logoUrl || "",
                        orgName: data.name
                    });
                }
            } catch (error) {
                console.error("Erro ao buscar config:", error);
            } finally {
                setLoading(false);
            }
        }

        if (slug) fetchData();
    }, [slug]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`/api/organizations/${slug}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: settings.orgName,
                    settings: {
                        primaryColor: settings.primaryColor,
                        logoUrl: settings.logoUrl
                    }
                })
            });

            if (!res.ok) throw new Error("Falha ao salvar");

            toast({
                title: "Configurações Salvas",
                description: "O branding da organização foi atualizado com sucesso."
            });

            // Opcional: Recarregar a página para aplicar tema se necessário, ou usar um contexto de tema
            window.location.reload();

        } catch (error) {
            console.error(error);
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível atualizar as configurações.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <PaintBrush weight="fill" className="text-primary" />
                    Branding e Identidade
                </h1>
                <p className="text-slate-500 font-medium">Personalize a experiência macro da sua organização</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Visual Config */}
                <Card className="border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b p-6">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Palette size={20} weight="bold" />
                            Cores e Tema
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Cor Principal</Label>
                            <div className="flex gap-4 items-center">
                                <div
                                    className="w-12 h-12 rounded-xl border-4 border-white shadow-sm"
                                    style={{ backgroundColor: settings.primaryColor }}
                                />
                                <Input
                                    type="text"
                                    value={settings.primaryColor}
                                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                                    className="max-w-[200px] h-11 font-mono uppercase"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Logotipo da Organização (URL)</Label>
                            <div className="flex gap-4 items-start">
                                <div className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                                    <Image size={32} />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Input
                                        placeholder="https://exemplo.com/logo.png"
                                        className="h-11"
                                        value={settings.logoUrl}
                                        onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                                    />
                                    <p className="text-[10px] text-slate-400 font-medium italic">Recomendado: PNG transparente, 512x512px</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Info Config */}
                <Card className="border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-slate-500">Nome de Exibição</Label>
                                <Input
                                    value={settings.orgName}
                                    onChange={(e) => setSettings({ ...settings, orgName: e.target.value })}
                                    className="h-11"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end pt-4">
                    <Button
                        onClick={handleSave}
                        className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 h-12 shadow-lg shadow-primary/20 gap-2 font-bold"
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FloppyDisk weight="bold" />}
                        Salvar Alterações
                    </Button>
                </div>
            </div>
        </div>
    );
}
