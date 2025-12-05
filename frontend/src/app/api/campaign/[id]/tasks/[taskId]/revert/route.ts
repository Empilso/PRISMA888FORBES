import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string; taskId: string } }
) {
    const { id: campaignId, taskId } = params;

    try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const url = `${backendUrl}/api/campaign/${campaignId}/tasks/${taskId}/revert`;

        console.log(`[Revert Task Proxy] Forwarding request to: ${url}`);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[Revert Task Proxy] Error:", error);
        return NextResponse.json(
            { error: "Failed to revert task", detail: error.message },
            { status: 500 }
        );
    }
}
