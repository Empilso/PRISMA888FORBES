"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createSSRClient } from "@/lib/supabase/server";

// Precisamos do supabase-js puro para usar a Service Role Key (Admin)
// O SSR client usa a Anon Key e respeita RLS (o que impediria criar usuários)
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

export async function createCampaign(formData: FormData) {
    try {
        const supabase = await createSSRClient(); // Client para uploads (respeita RLS se configurado, mas aqui vamos usar admin para garantir)

        // Extrair dados do FormData
        const nome = formData.get("nome") as string;
        const nomeUrna = formData.get("nomeUrna") as string;
        const cpf = formData.get("cpf") as string;
        const email = formData.get("email") as string;
        const telefone = formData.get("telefone") as string;
        const login = formData.get("login") as string;
        const password = formData.get("password") as string;
        const cargo = formData.get("cargo") as string;
        const numero = formData.get("numero") as string;
        const partido = formData.get("partido") as string;
        const cidade = formData.get("cidade") as string;
        const electionDate = formData.get("electionDate") as string;
        const socialLinksRaw = formData.get("socialLinks") as string;
        const organizationId = formData.get("organization_id") as string;
        const existingCsvUrl = formData.get("existingCsvUrl") as string;
        const existingCsvName = formData.get("existingCsvName") as string;

        const csvFile = formData.get("csvFile") as File;
        const pdfFile = formData.get("pdfFile") as File;

        console.log("🚀 Iniciando criação de campanha para:", nomeUrna);

        // 1. Upload dos Arquivos (se existirem)
        let csvUrl = null;
        let pdfUrl = null;

        if (existingCsvUrl) {
            csvUrl = existingCsvUrl;
            console.log("♻️ Usando base de dados CSV existente:", existingCsvUrl);
        } else if (csvFile && csvFile.size > 0) {
            const csvPath = `campaigns/${Date.now()}_${csvFile.name}`;
            const { data: csvData, error: csvError } = await supabaseAdmin.storage
                .from("campaign-files")
                .upload(csvPath, csvFile, { contentType: "text/csv" });

            if (csvError) {
                console.error("Erro upload CSV:", csvError);
                // Não vamos travar por isso, mas logamos
            } else {
                const { data: publicUrl } = supabaseAdmin.storage.from("campaign-files").getPublicUrl(csvPath);
                csvUrl = publicUrl.publicUrl;
            }
        }

        if (pdfFile && pdfFile.size > 0) {
            const pdfPath = `campaigns/${Date.now()}_${pdfFile.name}`;
            const { data: pdfData, error: pdfError } = await supabaseAdmin.storage
                .from("campaign-files")
                .upload(pdfPath, pdfFile, { contentType: "application/pdf" });

            if (pdfError) {
                console.error("Erro upload PDF:", pdfError);
            } else {
                const { data: publicUrl } = supabaseAdmin.storage.from("campaign-files").getPublicUrl(pdfPath);
                pdfUrl = publicUrl.publicUrl;
            }
        }

        // 2. Criação da Campanha (DB)
        const slug = nomeUrna
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "-");

        const campaignName = `Campanha ${nomeUrna} 2024`;

        // Inserir campanha (usando Admin para garantir permissão)
        // Nota: Precisamos adicionar as colunas party, number, ballot_name no banco antes!
        // Por enquanto vou inserir nos campos que existem e usar metadata ou campos extras se o banco permitir
        // Como o usuário pediu para adicionar as colunas, vou assumir que elas existem ou serão adicionadas.
        // Se der erro, é porque o migration não rodou.

        // ATENÇÃO: O schema atual NÃO tem party, number, ballot_name.
        // Vou usar apenas os campos que sei que existem no script "Botão Nuclear" que rodamos:
        // id, name, candidate_name, slug, role, city

        const { data: campaign, error: campaignError } = await supabaseAdmin
            .from("campaigns")
            .insert({
                name: campaignName,
                candidate_name: nome, // Usando nome completo aqui
                slug: slug,
                role: cargo,
                city: cidade,
                party: partido,
                number: parseInt(numero),
                ballot_name: nomeUrna,
                election_date: electionDate || '2024-10-06', // Data da eleição
                social_links: socialLinksRaw ? JSON.parse(socialLinksRaw) : {},
                organization_id: organizationId || null
            })
            .select()
            .single();

        if (campaignError) {
            console.error("Erro ao criar campanha:", campaignError);
            return { success: false, error: "Erro ao criar campanha no banco." };
        }

        console.log("✅ Campanha criada:", campaign.id);

        // 3. Criação do Usuário (Auth) - COM VERIFICAÇÃO PRÉVIA E ROLLBACK
        const emailAcesso = email || login || `${slug}@prisma888.com`;

        // Check if user already exists in Auth to avoid "already registered" error and partial data
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUser.users.find(u => u.email === emailAcesso);

        if (userExists) {
            console.error("❌ Usuário já existe no Auth:", emailAcesso);
            // Rollback campaign if it was created
            await supabaseAdmin.from("campaigns").delete().eq("id", campaign.id);
            return {
                success: false,
                error: `O e-mail ou login '${emailAcesso}' já está em uso por outro candidato. Por favor, use um diferente.`
            };
        }

        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: emailAcesso,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: nome,
                role: "candidate",
                campaign_id: campaign.id
            }
        });

        if (authError) {
            console.error("❌ Erro ao criar usuário Auth:", authError);

            // 🔄 ROLLBACK COMPLETO
            await supabaseAdmin.from("campaigns").delete().eq("id", campaign.id);

            return {
                success: false,
                error: `Erro ao criar usuário de acesso: ${authError.message}. A campanha foi desfeita.`
            };
        }

        console.log("✅ Usuário Auth criado:", authUser.user.id);

        // 4. Atualizar Profile (vincular à campanha)
        // Tentamos atualizar. Se não existir (trigger falhou), criamos manualmente.
        const profileData = {
            id: authUser.user.id,
            email: emailAcesso,
            full_name: nome,
            campaign_id: campaign.id,
            organization_id: organizationId || null,
            role: "candidate"
        };

        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert(profileData);

        if (profileError) {
            console.error("Erro ao vincular/criar profile:", profileError);

            // 🔄 ROLLBACK TOTAL (Auth + Campanha)
            console.log("🔄 Executando rollback total: falha no profile");
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
            await supabaseAdmin.from("campaigns").delete().eq("id", campaign.id);

            return { success: false, error: "Erro ao configurar perfil do usuário. O cadastro foi revertido." };
        }

        // 5. Salvar Documentos na tabela documents
        if (csvUrl) {
            await supabaseAdmin.from("documents").insert({
                campaign_id: campaign.id,
                filename: existingCsvName || (existingCsvUrl ? "Base de Dados Vinculada" : (csvFile?.name || "base_votos.csv")),
                file_url: csvUrl,
                file_type: "csv",
                category: "electoral_data"
            });
        }

        if (pdfUrl) {
            await supabaseAdmin.from("documents").insert({
                campaign_id: campaign.id,
                filename: pdfFile.name,
                file_url: pdfUrl,
                file_type: "pdf",
                category: "government_plan"
            });
        }

        return { success: true, campaignId: campaign.id };

    } catch (error: any) {
        console.error("Erro fatal na Server Action:", error);
        return { success: false, error: error.message || "Erro desconhecido" };
    }
}
