"use client";

import React from "react";
import TasksContent from "../tasks/TasksContent";

export default function SquadPortalPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    // No Portal SQUAD, o componente TasksContent deve operar em modo isolado.
    // O backend e o frontend usarão o contexto do usuário logado para filtrar apenas suas tarefas.
    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="px-4 sm:px-8 py-8 pb-0">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Portal SQUAD</h1>
                    <p className="text-slate-500 mt-1">Gerencie suas tarefas e colabore com o time de forma isolada e segura.</p>
                </div>
            </div>

            <div className="flex-1 px-4 sm:px-8 pb-8">
                <TasksContent campaignId={id} simpleMode={true} />
            </div>
        </div>
    );
}
