import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Configuração do Singleton para o banco PRISMA DADOS
// Evita erro "Multiple GoTrueClient instances" no console
const globalForSupabase = global as unknown as { dadosClient: SupabaseClient };

const url = process.env.NEXT_PUBLIC_DADOS_PRISMA_URL || "";
const key = process.env.NEXT_PUBLIC_DADOS_PRISMA_ANON_KEY || process.env.NEXT_PUBLIC_DADOS_PRISMA_KEY || "";

console.log("[DEBUG SUPABASE DADOS] URL:", url, "Key length:", key.length);

export const dadosClient = globalForSupabase.dadosClient || createClient(
    url,
    key,
    {
        global: {
            headers: {
                Authorization: `Bearer ${key}`,
                apikey: key
            }
        }
    }
);

if (process.env.NODE_ENV !== "production") {
    globalForSupabase.dadosClient = dadosClient;
}

export function createDadosClient() {
    return dadosClient;
}
