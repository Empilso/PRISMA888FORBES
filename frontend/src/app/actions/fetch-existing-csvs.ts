"use server";

import { createClient } from "@supabase/supabase-js";

// Usando o admin client para garantir a leitura cruzada entre tenants da mesma organização
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

export async function fetchExistingCsvs(organizationId: string) {
    try {
        if (!organizationId) {
            return { success: false, data: [] };
        }

        // Buscar todas as campanhas da organização para mapear city/role
        const { data: campaigns, error: campaignsError } = await supabaseAdmin
            .from("campaigns")
            .select("id, city, role")
            .eq("organization_id", organizationId);

        if (campaignsError || !campaigns || campaigns.length === 0) {
            return { success: true, data: [] };
        }

        const campaignMap = new Map();
        campaigns.forEach(c => campaignMap.set(c.id, { city: c.city, role: c.role }));

        const campaignIds = campaigns.map((c) => c.id);

        // Buscar documentos (CSVs eleitorais) atrelados a essas campanhas
        const { data: documents, error: docsError } = await supabaseAdmin
            .from("documents")
            .select("file_url, filename, campaign_id")
            .in("campaign_id", campaignIds)
            .eq("file_type", "csv")
            .eq("category", "electoral_data");

        if (docsError) {
            console.error("Erro ao buscar documentos existentes:", docsError);
            return { success: false, error: docsError.message };
        }

        // Criar lista de opções amigáveis com Cidade e Cargo
        const uniqueDocs = [];
        const seenUrls = new Set();

        for (const doc of documents || []) {
            if (!seenUrls.has(doc.file_url)) {
                seenUrls.add(doc.file_url);
                const campInfo = campaignMap.get(doc.campaign_id);
                uniqueDocs.push({
                    file_url: doc.file_url,
                    filename: doc.filename,
                    label: `${campInfo?.city || 'Cidade Desconhecida'} - ${campInfo?.role || 'Cargo'}`
                });
            }
        }

        return { success: true, data: uniqueDocs };
    } catch (error: any) {
        console.error("Erro fatal na busca de CSVs existentes:", error);
        return { success: false, error: error.message };
    }
}
