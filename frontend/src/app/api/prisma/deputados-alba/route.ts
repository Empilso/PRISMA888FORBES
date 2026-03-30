import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ─── PRISMA DADOS (Service Role para tabela 'parlamentares') ─────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_DADOS_PRISMA_URL || 'https://hrrzwhkosgzungqxlcps.supabase.co'
const supabaseKey = process.env.DADOS_PRISMA_SERVICE_ROLE_KEY as string

const supabase = createClient(supabaseUrl, supabaseKey)

const generateSlug = (nome: string) => {
    return nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim();
};

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('parlamentares')
            .select('prisma_id, id_alba, nome_urna, nome_civil, sigla_partido, foto_url, uf, esfera, status, mandatos_count, qualidade_score, email')
            .order('nome_urna', { ascending: true })

        if (error) throw error

        const enriched = (data || []).map(d => ({
            ...d,
            slug: `${generateSlug(d.nome_urna)}-deputado-ba`
        }))

        return NextResponse.json({
            total: enriched.length,
            parlamentares: enriched,
        })
    } catch (error: any) {
        console.error('API Parlamentares Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
