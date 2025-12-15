"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Admin client para operações privilegiadas
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

export async function deleteCampaign(campaignId: string) {
    try {
        console.log(`🗑️ Iniciando exclusão da campanha: ${campaignId}`);

        // 1. Buscar usuários associados à campanha (Candidato/Staff)
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("campaign_id", campaignId);

        if (profileError) {
            console.error("Erro ao buscar profiles:", profileError);
            throw new Error("Falha ao identificar usuários da campanha.");
        }

        // 2. Deletar usuários do Auth (Isso deve deletar os profiles em cascade)
        if (profiles && profiles.length > 0) {
            console.log(`Encontrados ${profiles.length} usuários para remover.`);
            for (const profile of profiles) {
                const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(profile.id);
                if (deleteUserError) {
                    console.error(`Erro ao deletar usuário ${profile.id}:`, deleteUserError);
                    // Não vamos travar, mas é um problema.
                } else {
                    console.log(`Usuário ${profile.id} removido.`);
                }
            }
        }

        // 3. Limpar Storage (Opcional, mas recomendado)
        // Listar arquivos na pasta da campanha
        const { data: files } = await supabaseAdmin.storage
            .from("campaign-files")
            .list(`campaigns`);

        // Filtrar arquivos que pertencem a esta campanha (se tivermos um padrão de nome ou metadados)
        // Como não temos uma pasta por campanha (estamos jogando tudo em campaigns/), 
        // teríamos que consultar a tabela documents para saber quais arquivos deletar.

        const { data: documents } = await supabaseAdmin
            .from("documents")
            .select("file_url, filename")
            .eq("campaign_id", campaignId);

        if (documents && documents.length > 0) {
            const filesToRemove = documents.map(doc => `campaigns/${doc.filename}`); // Assumindo que o filename no banco bate com o path
            // Nota: No create-campaign.ts salvamos como `campaigns/${Date.now()}_${file.name}`
            // Mas no banco salvamos apenas `file.name` na coluna filename?
            // Vamos verificar o create-campaign.ts:
            // const csvPath = `campaigns/${Date.now()}_${csvFile.name}`;
            // await supabaseAdmin.from("documents").insert({ filename: csvFile.name ... })
            // Ops, salvamos o nome original no banco, mas o path no storage tem timestamp.
            // O file_url tem o path completo. Podemos extrair de lá.

            const pathsToRemove = documents.map(doc => {
                const url = doc.file_url;
                // Extrair parte depois de /campaign-files/
                const match = url.split("/campaign-files/")[1];
                return match;
            }).filter(Boolean);

            if (pathsToRemove.length > 0) {
                await supabaseAdmin.storage.from("campaign-files").remove(pathsToRemove);
                console.log("Arquivos removidos do storage.");
            }
        }

        // 4. Deletar a Campanha
        // As tabelas tasks, documents, locations devem ter ON DELETE CASCADE na FK campaign_id?
        // Se não tiverem, precisaremos deletar manualmente.
        // Vamos tentar deletar a campanha. Se der erro de FK, deletamos os filhos antes.

        const { error: deleteCampaignError } = await supabaseAdmin
            .from("campaigns")
            .delete()
            .eq("id", campaignId);

        if (deleteCampaignError) {
            // Se falhar, provavelmente é FK. Vamos tentar limpar os filhos.
            console.warn("Erro ao deletar campanha (provável FK constraint). Tentando limpar dependências...");

            // Limpar TODAS as tabelas relacionadas à campanha
            await supabaseAdmin.from("agent_logs").delete().eq("campaign_id", campaignId);
            await supabaseAdmin.from("crew_run_logs").delete().eq("campaign_id", campaignId); // [NEW]
            await supabaseAdmin.from("ai_analysis_results").delete().eq("candidate_id", campaignId); // [NEW] Note column is candidate_id
            await supabaseAdmin.from("electoral_data_raw").delete().eq("candidate_id", campaignId); // [NEW] Note column is candidate_id
            await supabaseAdmin.from("strategies").delete().eq("campaign_id", campaignId);
            await supabaseAdmin.from("analysis_runs").delete().eq("campaign_id", campaignId);
            await supabaseAdmin.from("location_results").delete().eq("campaign_id", campaignId);
            await supabaseAdmin.from("document_chunks").delete().eq("campaign_id", campaignId);
            await supabaseAdmin.from("tasks").delete().eq("campaign_id", campaignId);
            await supabaseAdmin.from("documents").delete().eq("campaign_id", campaignId);
            await supabaseAdmin.from("locations").delete().eq("campaign_id", campaignId);

            // Tentar deletar campanha novamente
            const { error: retryError } = await supabaseAdmin
                .from("campaigns")
                .delete()
                .eq("id", campaignId);

            if (retryError) throw retryError;
        }

        console.log("✅ Campanha removida com sucesso.");
        revalidatePath("/admin/candidatos");
        return { success: true };

    } catch (error: any) {
        console.error("Erro fatal ao deletar campanha:", error);
        return { success: false, error: error.message };
    }
}
