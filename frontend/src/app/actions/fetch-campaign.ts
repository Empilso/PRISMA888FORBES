"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

/**
 * Busca TODOS os dados de um candidato para edição.
 * Usa admin client (bypass RLS) para garantir acesso total.
 */
export async function fetchCampaignForEdit(campaignId: string) {
    try {
        // 1. Campaign (fonte principal dos dados)
        const { data: campaign, error: campError } = await supabaseAdmin
            .from("campaigns")
            .select("*")
            .eq("id", campaignId)
            .single();

        if (campError || !campaign) {
            console.error("❌ Campaign fetch error:", campError);
            return { success: false, error: "Campanha não encontrada." };
        }

        // 2. Profile (dados de usuário: email, cpf, phone)
        const { data: profile, error: profError } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("campaign_id", campaignId)
            .eq("role", "candidate")
            .maybeSingle(); // maybeSingle para não dar erro se não existir

        if (profError) {
            console.warn("⚠️ Profile fetch warning:", profError.message);
        }

        console.log("✅ [FETCH] Campaign loaded:", campaign.candidate_name);
        console.log("✅ [FETCH] Profile loaded:", profile ? "SIM" : "NÃO");
        console.log("✅ [FETCH] Profile fields:", profile ? { email: profile.email, cpf: profile.cpf, phone: profile.phone } : "N/A");

        return {
            success: true,
            campaign: {
                candidate_name: campaign.candidate_name || "",
                ballot_name: campaign.ballot_name || "",
                city: campaign.city || "",
                role: campaign.role || "",
                party: campaign.party || "",
                number: campaign.number?.toString() || "",
                election_date: campaign.election_date || "2026-10-04",
                social_links: campaign.social_links || {},
            },
            profile: profile ? {
                email: profile.email || "",
                cpf: profile.cpf || "",
                phone: profile.phone || "",
            } : null,
        };

    } catch (error: any) {
        console.error("❌ Fetch fatal:", error);
        return { success: false, error: error.message };
    }
}
