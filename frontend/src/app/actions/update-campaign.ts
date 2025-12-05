"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createSSRClient } from "@/lib/supabase/server";

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
        const supabase = await createSSRClient();

        // Extrair dados
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

        const csvFile = formData.get("csvFile") as File;
        const pdfFile = formData.get("pdfFile") as File;

        console.log("🚀 Atualizando campanha:", campaignId);

        // 1. Upload de novos arquivos (se houver)
        let csvUrl = null;
        let pdfUrl = null;

        if (csvFile && csvFile.size > 0) {
            const csvPath = `campaigns/${Date.now()}_${csvFile.name}`;
            const { error: csvError } = await supabaseAdmin.storage
                .from("campaign-files")
                .upload(csvPath, csvFile, { contentType: "text/csv" });

            if (!csvError) {
                const { data: publicUrl } = supabaseAdmin.storage.from("campaign-files").getPublicUrl(csvPath);
                csvUrl = publicUrl.publicUrl;

                // Salvar na tabela documents
                await supabaseAdmin.from("documents").insert({
                    campaign_id: campaignId,
                    filename: csvFile.name,
                    file_url: csvUrl,
                    file_type: "csv",
                    category: "electoral_data"
                });
            }
        }

        if (pdfFile && pdfFile.size > 0) {
            const pdfPath = `campaigns/${Date.now()}_${pdfFile.name}`;
            const { error: pdfError } = await supabaseAdmin.storage
                .from("campaign-files")
                .upload(pdfPath, pdfFile, { contentType: "application/pdf" });

            if (!pdfError) {
                const { data: publicUrl } = supabaseAdmin.storage.from("campaign-files").getPublicUrl(pdfPath);
                pdfUrl = publicUrl.publicUrl;

                // Salvar na tabela documents
                await supabaseAdmin.from("documents").insert({
                    campaign_id: campaignId,
                    filename: pdfFile.name,
                    file_url: pdfUrl,
                    file_type: "pdf",
                    category: "government_plan"
                });
            }
        }

        // 2. Atualizar Campanha
        const { error: campaignError } = await supabaseAdmin
            .from("campaigns")
            .update({
                candidate_name: nome,
                ballot_name: nomeUrna,
                role: cargo,
                city: cidade,
                party: partido,
                number: parseInt(numero),
                election_date: electionDate || undefined // Só atualiza se veio valor
            })
            .eq("id", campaignId);

        if (campaignError) {
            console.error("Erro ao atualizar campanha:", campaignError);
            return { success: false, error: "Erro ao atualizar dados da campanha." };
        }

        // 3. Atualizar Profile (se necessário)
        // Precisamos achar o profile vinculado a esta campanha
        // Se houver múltiplos (staff), talvez devêssemos atualizar apenas o candidato?
        // Por simplificação, vamos assumir que o profile do candidato é o que tem role='candidate'

        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({
                full_name: nome,
                email: email
                // cpf: cpf, phone: telefone (se existissem no banco)
            })
            .eq("campaign_id", campaignId)
            .eq("role", "candidate");

        if (profileError) {
            console.warn("Erro ao atualizar profile (não crítico):", profileError);
        }

        return { success: true };

    } catch (error: any) {
        console.error("Erro na atualização:", error);
        return { success: false, error: error.message };
    }
}
