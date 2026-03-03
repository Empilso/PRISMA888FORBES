import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: campaignId } = await params;
        const authHeader = request.headers.get("Authorization");
        const body = await request.json();

        const response = await fetch(`${BACKEND_URL}/api/campaign/${campaignId}/organization`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...(authHeader ? { "Authorization": authHeader } : {})
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return NextResponse.json(
                errData,
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 200 });

    } catch (error) {
        console.error("[Campaign Organization PUT] Error:", error);
        return NextResponse.json(
            { error: "Failed to update campaign organization" },
            { status: 500 }
        );
    }
}
