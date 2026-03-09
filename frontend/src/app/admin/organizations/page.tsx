
"use client";

import React, { useState, useEffect } from "react";
import {
    Search,
    Download,
    ChevronDown,
    Building2,
    Plus,
    Loader2,
    Trash2,
    MoreHorizontal,
    LayoutDashboard
} from "lucide-react";
import { MapTrifold } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface Organization {
    id: string;
    name: string;
    slug: string;
    type: string;
    created_at: string;
    settings?: any;
}

export default function OrganizationsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);

    const supabase = createClient();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        try {
            const { data: session } = await supabase.auth.getSession();
            const token = session.session?.access_token;

            const res = await fetch("/api/organizations", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error("Falha ao buscar organizações");

            const data = await res.json();
            // Ordenar por created_at descendente (backend retorna ordem de inserção padrão ou sem ordem garantida)
            const sortedData = (data || []).sort((a: Organization, b: Organization) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setOrganizations(sortedData);
        } catch (error) {
            console.error("Erro ao buscar organizações:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!orgToDelete) return;

        setIsDeleting(true);
        try {
            const { data: session } = await supabase.auth.getSession();
            const token = session.session?.access_token;

            const res = await fetch(`/api/organizations?id=${orgToDelete.id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Erro ao excluir organização");
            }

            toast({
                title: "Sucesso!",
                description: `A organização ${orgToDelete.name} e todos os seus dados vinculados foram removidos.`,
            });

            // Atualizar lista local
            setOrganizations(prev => prev.filter(o => o.id !== orgToDelete.id));
            setOrgToDelete(null);
        } catch (error: any) {
            console.error("Erro ao excluir:", error);
            toast({
                title: "Erro na Exclusão",
                description: error.message || "Não foi possível excluir a organização.",
                variant: "destructive"
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredOrgs = organizations.filter(org =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Partidos & Agências (Tenants)</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Gerencie as organizações que utilizam a plataforma.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        className="gap-2 bg-slate-900 hover:bg-slate-800 text-white"
                        onClick={() => router.push("/admin/organizations/novo")}
                    >
                        <Plus className="h-4 w-4" />
                        Nova Organização
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por nome ou slug..."
                        className="pl-10 h-10 border-gray-300"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug (URL)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Criado em</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                                    </div>
                                </td>
                            </tr>
                        ) : filteredOrgs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma organização encontrada.</td>
                            </tr>
                        ) : (
                            filteredOrgs.map((org) => (
                                <tr key={org.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                                <Building2 size={16} />
                                            </div>
                                            <span className="font-medium text-gray-900">{org.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="outline" className="font-mono text-xs text-slate-500">
                                            {org.slug}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge className={
                                            org.type === 'party' ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border-none" :
                                                org.type === 'agency' ? "bg-purple-100 text-purple-700 hover:bg-purple-200 border-none" :
                                                    "bg-gray-100 text-gray-700 border-none"
                                        }>
                                            {org.type === 'party' ? 'Partido Político' : org.type === 'agency' ? 'Agência' : org.type}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(org.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="hidden md:flex gap-2 text-xs font-bold text-slate-600 hover:text-primary hover:border-primary/50"
                                                onClick={() => window.open(`/organization/${org.slug}`, '_blank')}
                                            >
                                                <MapTrifold size={14} weight="fill" />
                                                Acessar War Room
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => window.open(`/organization/${org.slug}`, '_blank')}>
                                                        Abrir em Nova Aba
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600 cursor-pointer"
                                                        onClick={() => setOrgToDelete(org)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <Dialog open={!!orgToDelete} onOpenChange={(open) => !open && setOrgToDelete(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="h-5 w-5" />
                            Confirmar Exclusão Enterprise
                        </DialogTitle>
                        <DialogDescription asChild className="py-2">
                            <div>
                                Você está prestes a excluir permanentemente a organização <strong>{orgToDelete?.name}</strong>.
                                <br /><br />
                                <span className="text-amber-700 font-semibold underline">Esta ação é irreversível e removerá:</span>
                                <ul className="list-disc list-inside mt-2 text-xs space-y-1">
                                    <li>Todas as Campanhas vinculadas</li>
                                    <li>Estratégias de IA e Mapas</li>
                                    <li>Logs de execução e Tarefas</li>
                                    <li>Documentos e Arquivos PDF/CSV</li>
                                </ul>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setOrgToDelete(null)}
                            disabled={isDeleting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="gap-2"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Confirmar Exclusão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
