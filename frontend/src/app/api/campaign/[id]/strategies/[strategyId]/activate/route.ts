import { NextRequest, NextResponse } from 'next/server';

/**
 * Route Handler: Ativar Estratégia
 * 
 * Proxy para o endpoint FastAPI que transforma uma estratégia em tarefa.
 * Evita problemas de CORS e expõe URL interna do backend.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; strategyId: string }> }
) {
    const { id: campaignId, strategyId } = await params;

    try {
        // URL do backend FastAPI
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const endpoint = `${backendUrl}/api/campaign/${campaignId}/strategies/${strategyId}/activate`;

        // Fazer requisição ao backend
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json(
                { error: error.detail || 'Erro ao ativar estratégia' },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro ao ativar estratégia:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

/**
 * GET: Verificar status da estratégia
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; strategyId: string }> }
) {
    const { id: campaignId, strategyId } = await params;

    try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const endpoint = `${backendUrl}/api/campaign/${campaignId}/strategies/${strategyId}/status`;

        const response = await fetch(endpoint);

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json(
                { error: error.detail || 'Estratégia não encontrada' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro ao buscar status:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
