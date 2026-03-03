"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Users, UserPlus, Mail, Shield, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface SquadMember {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
}

export function SquadManager({ campaignId }: { campaignId: string }) {
    const [members, setMembers] = useState<SquadMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteName, setInviteName] = useState("");
    const [inviting, setInviting] = useState(false);
    const { toast } = useToast();
    const supabase = createClient();

    const fetchMembers = async () => {
        setLoading(true);
        try {
            // Staff members linked to this campaign
            const { data, error } = await supabase
                .from("profiles")
                .select("id, email, full_name, role")
                .eq("campaign_id", campaignId)
                .in("role", ["staff", "candidate", "super_admin"]);

            if (error) throw error;
            setMembers(data || []);
        } catch (error: any) {
            console.error("Erro ao carregar equipe:", error);
            toast({ title: "Erro", description: "Falha ao carregar equipe", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [campaignId]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;

        setInviting(true);
        try {
            // Em um sistema real, aqui chamaríamos uma edge function de convite "inviteUserByEmail"
            // Por enquanto, faremos um mock de segurança para não expor a key no frontend
            toast({
                title: "🚧 Em Desenvolvimento",
                description: "A API de convites de email será implementada no backend. Para testes, crie o usuário via Supabase Studio e altere o campaign_id dele para este.",
            });
            setInviteEmail("");
            setInviteName("");
        } catch (error: any) {
            console.error("Erro ao convidar:", error);
            toast({ title: "Erro", description: error.message || "Falha ao convidar", variant: "destructive" });
        } finally {
            setInviting(false);
        }
    };

    const handleRemove = async (memberId: string) => {
        if (!confirm("Remover este colaborador da campanha? Ele perderá acesso ao Portal SQUAD desta campanha.")) return;

        try {
            const { error } = await supabase
                .from("profiles")
                .update({ campaign_id: null })
                .eq("id", memberId);

            if (error) throw error;

            toast({ title: "Membro removido", description: "O acesso foi revogado com sucesso." });
            fetchMembers();
        } catch (error: any) {
            console.error("Erro ao remover:", error);
            toast({ title: "Erro", description: "Falha ao remover membro", variant: "destructive" });
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-100 rounded-2xl">
                    <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Gestão de Equipe (SQUAD)</h2>
                    <p className="text-sm text-slate-500">Gerencie os colaboradores táticos desta campanha.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 border border-slate-100 shadow-sm rounded-2xl h-fit">
                    <CardHeader className="bg-slate-50/50 rounded-t-2xl pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Novo Colaborador
                        </CardTitle>
                        <CardDescription>Convide um novo membro para o time tático.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase">Nome</label>
                                <Input
                                    placeholder="Nome do colaborador"
                                    value={inviteName}
                                    onChange={(e) => setInviteName(e.target.value)}
                                    className="bg-slate-50 border-slate-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase">Email</label>
                                <Input
                                    type="email"
                                    placeholder="email@exemplo.com"
                                    required
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="bg-slate-50 border-slate-200"
                                />
                            </div>
                            <Button type="submit" className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white" disabled={inviting}>
                                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                Enviar Convite SQUAD
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border border-slate-100 shadow-sm rounded-2xl">
                    <CardHeader className="bg-slate-50/50 rounded-t-2xl pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Membros com Acesso
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 p-0">
                        {loading ? (
                            <div className="flex justify-center p-12">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            </div>
                        ) : members.length === 0 ? (
                            <div className="text-center p-12 text-slate-500">
                                Nenhum colaborador encontrado.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {members.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                                                {member.full_name ? member.full_name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{member.full_name || "Membro Sem Nome"}</p>
                                                <p className="text-xs text-slate-500">{member.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${member.role === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {member.role.replace('_', ' ')}
                                            </span>
                                            {member.role === 'staff' && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleRemove(member.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
