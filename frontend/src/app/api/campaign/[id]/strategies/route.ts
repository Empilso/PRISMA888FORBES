import { createClient as createAuthClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: campaignId } = await context.params;

    try {
        // 1. AUTH CHECK (Best Effort)
        const authClient = await createAuthClient();
        const { data: { user }, error: authError } = await authClient.auth.getUser();

        let isAuthorized = !!user;

        if (!isAuthorized) {
            // FALLBACK PARA DESENVOLVIMENTO
            if (process.env.NODE_ENV === 'development') {
                console.warn(`[Proxy Security] BYPASS: Auth failed for campaign ${campaignId}, allowing in DEV. Cause: ${authError?.message || 'No Session'}`);
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            console.error(`[Proxy Security] Unauthorized access attempt to campaign ${campaignId}`);
            return NextResponse.json({ error: "Unauthorized", details: "Session required" }, { status: 401 });
        }

        // 2. DATA FETCH (Service Role - Bypass RLS/Network Issues)
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error("Missing Server Configuration (SUPABASE_SERVICE_ROLE_KEY)");
        }

        const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });

        const { data, error } = await serviceClient
            .from("strategies")
            .select("*")
            .eq("campaign_id", campaignId)
            .in("status", ["published"])
            .order("created_at", { ascending: false });

        if (error) {
            console.error(`[Proxy DB] Fetch Error: ${error.message} (${error.code})`);
            return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
        }

        return NextResponse.json({ data });

    } catch (err: any) {
        console.error("[Proxy Internal] Crash:", err);
        return NextResponse.json({ error: "Internal Server Error", details: String(err) }, { status: 500 });
    }
}
