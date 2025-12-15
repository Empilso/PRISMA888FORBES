
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load env from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config(); // fallback to .env
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Erro: Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas.");
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function cleanZombies() {
    console.log("🧟 Iniciando caça aos Zumbis (Usuários Auth sem Campanha)...");

    // 1. Listar TODOS os usuários do Auth
    // Pagination pode ser necessária se houver muitos, mas vamos assumir < 50 para este teste
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (error) {
        console.error("Erro ao listar usuários:", error);
        return;
    }

    if (!users || users.length === 0) {
        console.log("✅ Nenhum usuário encontrado no Auth.");
        return;
    }

    console.log(`🔍 Analisando ${users.length} usuários...`);

    let deletedCount = 0;

    for (const user of users) {
        const email = user.email;
        const role = user.user_metadata?.role;
        const fullName = user.user_metadata?.full_name;

        // CRITÉRIO DE ZUMBI:
        // Se a role for 'candidate' (criado pelo sistema)
        // E sabemos que o banco foi zerado (campanhas = 0)
        // ENTÃO deve ser deletado.

        // Se quisermos ser mais específicos, poderíamos consultar o banco para ver se o ID existe na tabela profiles/campaigns.
        // Mas o comando do usuário foi "deletei todos os candidatos".

        if (role === 'candidate') {
            console.log(`💀 Zumbi detectado: ${email} (${fullName}) - ID: ${user.id}`);

            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

            if (deleteError) {
                console.error(`   ❌ Falha ao deletar: ${deleteError.message}`);
            } else {
                console.log(`   ✅ Deletado com sucesso.`);
                deletedCount++;
            }
        } else {
            console.log(`👤 Usuário ignorado (não é candidato): ${email} [${role || 'sem role'}]`);
        }
    }

    console.log("\n------------------------------------------------");
    console.log(`🏁 Varredura concluída. ${deletedCount} usuários removidos.`);
    console.log("Agora o caminho está livre para cadastrar novamente!");
}

cleanZombies();
