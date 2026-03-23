import { createClient } from "@supabase/supabase-js";

export function createDadosClient() {
    return createClient(
        process.env.NEXT_PUBLIC_DADOS_PRISMA_URL!,
        process.env.NEXT_PUBLIC_DADOS_PRISMA_KEY!
    )
}
