import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get("active_only") !== "false";

        const response = await fetch(
            `${BACKEND_URL}/api/personas?active_only=${activeOnly}`
        );

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("[Personas API] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch personas" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const response = await fetch(`${BACKEND_URL}/api/personas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("[Personas API] Error:", error);
        return NextResponse.json(
            { error: "Failed to create persona" },
            { status: 500 }
        );
    }
}
