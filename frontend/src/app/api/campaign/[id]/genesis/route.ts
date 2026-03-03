import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // URL do backend Python
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const endpoint = `${backendUrl}/api/campaign/${id}/genesis`;

        console.log(`[Genesis Proxy] Forwarding request to: ${endpoint}`);

        // Faz o fetch para o backend Python
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify(body),
        });

        // Pega a resposta do Python
        let data;
        const responseText = await response.text();

        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("[Genesis Proxy] Failed to parse backend JSON:", responseText);
            throw new Error(`Backend returned non-JSON: ${responseText}`);
        }

        if (!response.ok) {
            console.error(`[Genesis Proxy] Backend Error (${response.status}):`, data);
        }

        // Retorna a resposta para o frontend
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("[Genesis Proxy] Catch Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to trigger Genesis Crew" },
            { status: 500 }
        );
    }
}
