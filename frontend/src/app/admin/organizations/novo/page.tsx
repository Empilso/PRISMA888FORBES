
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Building2, UserCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function NewOrganizationPage() {
    const router = useRouter();
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        defaultValues: {
            name: "",
            type: "party",
            primaryColor: "#3b82f6",
            owner_email: ""
        }
    });
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Auto-generate slug preview
    const name = watch("name");
    const slugPreview = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : "";

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data: session } = await supabase.auth.getSession();
            const token = session.session?.access_token;

            // Usar o endpoint que criamos em organizations.py
            const res = await fetch("/api/organizations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: data.name,
                    type: data.type,
                    owner_email: data.owner_email,
                    settings: {
                        colors: {
                            primary: data.primaryColor || "#3b82f6",
                            accent: "#10b981"
                        }
                    }
                })
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Backend Error Details:", err);
                const errorMessage = Array.isArray(err.detail)
                    ? err.detail.map((e: any) => `${e.loc.join('.')} - ${e.msg}`).join('\n')
                    : (err.detail || "Erro ao criar organização");
                throw new Error(errorMessage);
            }

            toast({
                title: "Organização Criada!",
                description: "O ambiente foi configurado e o gestor vinculado.",
            });

            router.push("/admin/organizations");

        } catch (error: any) {
            console.error("Erro:", error);
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Nova Organização</h1>
                    <p className="text-gray-500">Configure um novo ambiente (Tenant) para Partido ou Agência.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* 1. Detalhes da Organização */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            Dados Institucionais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome da Organização</Label>
                            <Input
                                placeholder="Ex: Partido do Futuro (PF)"
                                {...register("name", { required: true })}
                            />
                            {slugPreview && (
                                <p className="text-xs text-gray-400 font-mono">
                                    URL: /organization/{slugPreview}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select onValueChange={(v) => setValue("type", v)} defaultValue="party">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="party">Partido Político</SelectItem>
                                        <SelectItem value="agency">Agência de Marketing</SelectItem>
                                        <SelectItem value="coalition">Coligação</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Cor Primária (Hex)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        className="w-12 h-10 p-1 cursor-pointer"
                                        {...register("primaryColor")}
                                        defaultValue="#3b82f6"
                                    />
                                    <Input
                                        placeholder="#3b82f6"
                                        {...register("primaryColor")}
                                        defaultValue="#3b82f6"
                                        className="font-mono uppercase"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Gestor / Owner */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <UserCircle2 className="w-4 h-4 text-blue-600" />
                            Gestor Principal (Owner)
                        </CardTitle>
                        <CardDescription>
                            O usuário abaixo terá acesso total ao painel da organização.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>E-mail do Gestor</Label>
                            <Input
                                type="email"
                                placeholder="gestor@partido.com.br"
                                {...register("owner_email", { required: true })}
                            />
                            <p className="text-xs text-gray-500">
                                Certifique-se que este usuário já possua cadastro na plataforma (Auth).
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px]">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Criar Organização
                    </Button>
                </div>

            </form>
        </div>
    );
}
