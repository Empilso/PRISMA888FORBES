"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Wrench } from "lucide-react";

export default function AdminSettingsPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-xl">
                        <Settings className="w-7 h-7 text-slate-600" />
                    </div>
                    Configurações
                </h1>
                <p className="text-slate-500 mt-2">Gerencie as configurações da sua conta e organização.</p>
            </div>

            <Card className="border-0 shadow-sm ring-1 ring-slate-200">
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-xl">
                        <Wrench className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <CardTitle>Em construção</CardTitle>
                        <CardDescription>Esta seção estará disponível em breve.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-500 text-sm">
                        As configurações avançadas da plataforma estão sendo desenvolvidas.
                        Em breve você poderá gerenciar usuários, permissões, integrações e muito mais.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
