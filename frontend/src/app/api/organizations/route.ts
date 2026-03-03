import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("Authorization");

        const response = await fetch(`${BACKEND_URL}/api/organizations`, {
            headers: authHeader ? { "Authorization": authHeader } : {},
            // Next.js caching might interfere, ensure fresh data
            cache: 'no-store'
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: "Backend error" },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error("[Organizations GET] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch organizations" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get("Authorization");
        const body = await request.json();

        const response = await fetch(`${BACKEND_URL}/api/organizations`, {
            method: "POST",
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
        console.error("[Organizations POST] Error:", error);
        return NextResponse.json(
            { error: "Failed to create organization" },
            { status: 500 }
        );
    }
}
