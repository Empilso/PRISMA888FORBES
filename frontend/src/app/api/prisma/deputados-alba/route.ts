import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_DADOS_PRISMA_URL || 'https://hrrzwhkosgzungqxlcps.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_DADOS_PRISMA_KEY as string

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('politicos_alba')
            .select('*')
            .order('nome', { ascending: true })

        if (error) throw error

        const generateSlug = (nome: string) => {
            return nome
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^\w\s-]/g, "")
                .replace(/\s+/g, "-")
                .trim();
        };

        // Ordenação manual para priorizar Senhor do Bonfim e Itabuna
        const sortedData = [...(data || [])].map(d => ({
            ...d,
            slug: `${generateSlug(d.nome)}-deputado-ba`
        })).sort((a, b) => {
            const priority = (municipio: string) => {
                if (municipio === 'Senhor do Bonfim') return 1
                if (municipio === 'Itabuna') return 2
                return 3
            }
            return priority(a.municipio_base) - priority(b.municipio_base)
        })

        return NextResponse.json(sortedData)
    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
