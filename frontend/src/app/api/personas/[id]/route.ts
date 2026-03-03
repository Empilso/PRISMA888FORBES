import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const response = await fetch(`${BACKEND_URL}/api/personas/${id}`, {
            headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await response.json();

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("[Personas API] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch persona" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const response = await fetch(`${BACKEND_URL}/api/personas/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("[Personas API] Error:", error);
        return NextResponse.json(
            { error: "Failed to update persona" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const response = await fetch(`${BACKEND_URL}/api/personas/${id}`, {
            method: "DELETE",
            headers: { "ngrok-skip-browser-warning": "true" }
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("[Personas API] Error:", error);
        return NextResponse.json(
            { error: "Failed to delete persona" },
            { status: 500 }
        );
    }
}
