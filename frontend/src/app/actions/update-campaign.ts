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

export async function updateCampaign(campaignId: string, formData: FormData) {
    try {
        // Extrair dados do FormData (todos podem vir vazios/null)
        const nome = formData.get("nome") as string;
        const nomeUrna = formData.get("nomeUrna") as string;
        const cpf = formData.get("cpf") as string;
        const email = formData.get("email") as string;
        const telefone = formData.get("telefone") as string;
        const cargo = formData.get("cargo") as string;
        const numero = formData.get("numero") as string;
        const partido = formData.get("partido") as string;
        const cidade = formData.get("cidade") as string;
        const electionDate = formData.get("electionDate") as string;
        const socialLinksRaw = formData.get("socialLinks") as string;
        const organizationId = formData.get("organization_id") as string;

        const csvFile = formData.get("csvFile") as File;
        const pdfFile = formData.get("pdfFile") as File;

        console.log("🚀 [UPDATE] Atualizando campanha:", campaignId);
        console.log("🚀 [UPDATE] Campos recebidos:", { nome, nomeUrna, cargo, numero, partido, cidade, electionDate, hasSocialLinks: !!socialLinksRaw });

        // ===================================================================
        // 1. FETCH DADOS ATUAIS (para não sobrescrever com vazio)
        // ===================================================================
        const { data: currentCampaign, error: fetchError } = await supabaseAdmin
            .from("campaigns")
            .select("*")
            .eq("id", campaignId)
            .single();

        if (fetchError || !currentCampaign) {
            console.error("❌ Campanha não encontrada:", fetchError);
            return { success: false, error: "Campanha não encontrada." };
        }

        // ===================================================================
        // 2. UPLOADS (se houver novos arquivos)
        // ===================================================================
        if (csvFile && csvFile.size > 0) {
            const csvPath = `campaigns/${Date.now()}_${csvFile.name}`;
            const { error: csvError } = await supabaseAdmin.storage
                .from("campaign-files")
                .upload(csvPath, csvFile, { contentType: "text/csv" });

            if (!csvError) {
                const { data: publicUrl } = supabaseAdmin.storage.from("campaign-files").getPublicUrl(csvPath);
                await supabaseAdmin.from("documents").insert({
                    campaign_id: campaignId,
                    filename: csvFile.name,
                    file_url: publicUrl.publicUrl,
                    file_type: "csv",
                    category: "electoral_data"
                });
                console.log("✅ CSV atualizado");
            }
        }

        if (pdfFile && pdfFile.size > 0) {
            const pdfPath = `campaigns/${Date.now()}_${pdfFile.name}`;
            const { error: pdfError } = await supabaseAdmin.storage
                .from("campaign-files")
                .upload(pdfPath, pdfFile, { contentType: "application/pdf" });

            if (!pdfError) {
                const { data: publicUrl } = supabaseAdmin.storage.from("campaign-files").getPublicUrl(pdfPath);
                await supabaseAdmin.from("documents").insert({
                    campaign_id: campaignId,
                    filename: pdfFile.name,
                    file_url: publicUrl.publicUrl,
                    file_type: "pdf",
                    category: "government_plan"
                });
                console.log("✅ PDF atualizado");
            }
        }

        // ===================================================================
        // 3. MERGE DEFENSIVO: só atualiza o que mudou, mantém o resto
        // ===================================================================
        const safeInt = (val: string | null | undefined): number | undefined => {
            if (!val || val.trim() === "") return undefined;
            const parsed = parseInt(val, 10);
            return isNaN(parsed) ? undefined : parsed;
        };

        // Construir objeto de update com merge: campo novo OU valor existente
        const campaignUpdate: Record<string, any> = {
            candidate_name: nome?.trim() || currentCampaign.candidate_name,
            ballot_name: nomeUrna?.trim() || currentCampaign.ballot_name,
            role: cargo?.trim() || currentCampaign.role,
            city: cidade?.trim() || currentCampaign.city,
            party: partido?.trim() || currentCampaign.party,
            number: safeInt(numero) ?? currentCampaign.number,
            election_date: electionDate?.trim() || currentCampaign.election_date,
            organization_id: organizationId || currentCampaign.organization_id,
        };

        // Social Links: merge inteligente
        if (socialLinksRaw) {
            try {
                const parsed = JSON.parse(socialLinksRaw);
                const hasIg = parsed.instagram?.some((h: string) => h.trim());
                const hasTk = parsed.tiktok?.some((h: string) => h.trim());
                if (hasIg || hasTk) {
                    campaignUpdate.social_links = parsed;
                }
            } catch (e) {
                console.warn("⚠️ social_links parse error, mantendo existente");
            }
        }

        console.log("📝 [UPDATE] Dados a persistir:", campaignUpdate);

        const { error: campaignError } = await supabaseAdmin
            .from("campaigns")
            .update(campaignUpdate)
            .eq("id", campaignId);

        if (campaignError) {
            console.error("❌ Erro ao atualizar campanha:", campaignError);
            return { success: false, error: `Erro ao atualizar: ${campaignError.message}` };
        }

        console.log("✅ Campanha atualizada com sucesso");

        // ===================================================================
        // 4. PROFILE: atualizar apenas se tem dados novos
        // ===================================================================
        const profileUpdate: Record<string, any> = {};
        if (nome?.trim()) profileUpdate.full_name = nome.trim();
        if (email?.trim()) profileUpdate.email = email.trim();
        if (cpf?.trim()) profileUpdate.cpf = cpf.trim();
        if (telefone?.trim()) profileUpdate.phone = telefone.trim();

        if (Object.keys(profileUpdate).length > 0) {
            const { error: profileError } = await supabaseAdmin
                .from("profiles")
                .update(profileUpdate)
                .eq("campaign_id", campaignId)
                .eq("role", "candidate");

            if (profileError) {
                console.warn("⚠️ Profile update (não crítico):", profileError.message);
            } else {
                console.log("✅ Profile atualizado:", Object.keys(profileUpdate));
            }
        }

        return { success: true };

    } catch (error: any) {
        console.error("❌ Erro fatal na atualização:", error);
        return { success: false, error: error.message || "Erro desconhecido" };
    }
}
