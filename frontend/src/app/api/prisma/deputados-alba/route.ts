import { NextResponse } from 'next/server'

// ─── REGRA DE OURO: NUNCA Supabase para dados PRISMA ─────────────────────────
// Fonte: PostgreSQL local (prisma_data @ localhost:5432)
// Intermediário: FastAPI api_server.py @ localhost:8003
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = process.env.PRISMA_BACKEND_URL || 'http://localhost:8003'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)

        // Filtros repassados para a API local
        const uf      = searchParams.get('uf')      || 'BA'
        const cargo   = searchParams.get('cargo')   || 'DEPUTADO ESTADUAL'
        const partido = searchParams.get('partido') || ''
        const search  = searchParams.get('search')  || ''
        const ano     = searchParams.get('ano')     || '2022'
        const limit   = searchParams.get('limit')   || '500'
        const offset  = searchParams.get('offset')  || '0'

        const params = new URLSearchParams({
            uf,
            cargo,
            limit,
            offset,
            ...(partido && { partido }),
            ...(search  && { search  }),
            ...(ano     && { ano     }),
        })

        const res = await fetch(`${API_URL}/api/politicos?${params}`, {
            headers: { 'Content-Type': 'application/json' },
            // next.js cache: sem cache — dados ao vivo
            cache: 'no-store',
        })

        if (!res.ok) {
            const errText = await res.text()
            console.error('API local erro:', res.status, errText)
            throw new Error(`API local retornou ${res.status}: ${errText}`)
        }

        const data = await res.json()

        // ── Mapear para o formato que CandidateRow espera ────────────────────
        const parlamentares = (data.parlamentares || data.items || data || []).map((p: any) => ({
            // identidade
            id:         p.prisma_id   || p.politico_id,
            slug:       p.prisma_id   || p.politico_id,
            prisma_id:  p.prisma_id   || p.politico_id,

            // exibição
            nome_urna:  p.nome_urna,
            nome_civil: p.nome_completo || p.nome_civil,

            // partido
            sigla_partido: p.sigla_partido,
            partido_nome:  p.partido_nome || p.partido,

            // localização
            uf:         p.uf,
            nm_ue:      p.nm_ue,

            // cargo
            cargo:      p.cargo,
            esfera:     p.cargo?.toLowerCase().includes('federal') ? 'federal' : 'estadual',

            // mídia
            foto_url:   p.foto_url || '',

            // contato
            email:      p.email || '',

            // eleição
            status_eleicao: p.status_eleicao || 'eleito',
            ano_eleicao:    p.ano_eleicao    || 2022,

            // dados calculados
            mandatos_count:  p.mandatos_count  ?? (p.mandatos?.length || 1),
            qualidade_score: p.qualidade_score ?? 0,

            // fiscal — todos os deputados BA têm verbas de gabinete na ALBA
            hasFiscalData: true,

            // campos extras para a página de perfil
            municipio_ibge:      p.municipio_ibge,
            data_nascimento:     p.data_nascimento,
            genero:              p.genero,
            cor_raca:            p.cor_raca,
            grau_instrucao:      p.grau_instrucao,
            ocupacao:            p.ocupacao,
            biografia_resumo:    p.biografia_resumo,
            filiacao_partidaria: p.filiacao_partidaria || [],
        }))

        return NextResponse.json({
            total:        data.total || parlamentares.length,
            parlamentares,
            fonte:        'postgresql_local',
            api_version:  '2.0',
        })

    } catch (error: any) {
        console.error('[deputados-alba] Erro:', error.message)
        return NextResponse.json(
            {
                error:   error.message,
                hint:    'Verifique se api_server.py está rodando em localhost:8003',
                fonte:   'postgresql_local',
            },
            { status: 500 }
        )
    }
}
