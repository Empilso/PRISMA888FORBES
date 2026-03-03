import { NextRequest, NextResponse } from 'next/server';

/**
 * Route Handler: Listar Tarefas
 * 
 * Proxy para o endpoint FastAPI que lista as tarefas.
 * Necessário para evitar calls diretos do cliente Supabase que falham por RLS.
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: campaignId } = await context.params;

    try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const endpoint = `${backendUrl}/api/campaign/${campaignId}/tasks`;

        const response = await fetch(endpoint, {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Erro ao buscar tarefas' }));
            return NextResponse.json(
                { error: error.detail || 'Erro ao buscar tarefas' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro ao buscar tarefas:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
