import { NextRequest, NextResponse } from 'next/server';

/**
 * Route Handler: Atualizar/Deletar Tarefa
 * 
 * Proxy para os endpoints FastAPI de update e delete.
 */
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string; taskId: string }> }
) {
    const { id: campaignId, taskId } = await context.params;

    try {
        const body = await request.json();
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const endpoint = `${backendUrl}/api/campaign/${campaignId}/tasks/${taskId}`;

        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json(
                { error: error.detail || 'Erro ao atualizar tarefa' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro ao atualizar tarefa:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string; taskId: string }> }
) {
    const { id: campaignId, taskId } = await context.params;

    try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const endpoint = `${backendUrl}/api/campaign/${campaignId}/tasks/${taskId}`;

        const response = await fetch(endpoint, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json(
                { error: error.detail || 'Erro ao deletar tarefa' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro ao deletar tarefa:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
