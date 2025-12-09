import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; strategyId: string }> }
) {
    const { id: campaignId, strategyId } = await params;

    try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const url = `${backendUrl}/api/campaign/${campaignId}/strategies/${strategyId}/reject`;

        console.log(`[Reject Strategy Proxy] Forwarding request to: ${url}`);

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
        console.error("[Reject Strategy Proxy] Error:", error);
        return NextResponse.json(
            { error: "Failed to reject strategy", detail: error.message },
            { status: 500 }
        );
    }
}
