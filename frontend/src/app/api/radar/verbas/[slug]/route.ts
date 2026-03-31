import { NextRequest, NextResponse } from "next/server";
import { createDadosClient } from "@/lib/supabase/dados";

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(value)
    || /^[0-9a-f]{32}$/i.test(value);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const { searchParams } = new URL(request.url);

  const ano        = searchParams.get("ano");
  const mes        = searchParams.get("mes");
  const categoria  = searchParams.get("categoria");
  const fornecedor = searchParams.get("fornecedor");
  const page       = parseInt(searchParams.get("page")     ?? "0");
  const pageSize   = parseInt(searchParams.get("pageSize") ?? "25");
  const modoKpis   = searchParams.get("modo") === "kpis";

  const supabase = createDadosClient();

  // ─── 1. Resolve parlamentar ─────────────────────────────────────────────────
  const campo = isUUID(slug) ? "prisma_id" : "slug";
  const { data: parl, error: parlError } = await supabase
    .from("parlamentares")
    .select("prisma_id, nome_urna, nome_civil, foto_url, sigla_partido, slug")
    .eq(campo, slug)
    .single();

  if (parlError || !parl) {
    return NextResponse.json(
      { error: `Deputado não encontrado: ${slug}` },
      { status: 404 }
    );
  }

  // ─── 2. Query base — TODOS os campos do banco ───────────────────────────────
  let query = supabase
    .from("despesas_gabinete")
    .select(`
      prisma_id,
      parlamentar_id,
      fonte_portal,
      esfera,
      uf,
      nome_deputado_raw,
      partido_raw,
      num_processo,
      num_nf,
      num_nf_normalizado,
      competencia_date,
      competencia_ano,
      competencia_mes,
      categoria_portal,
      categoria_slug,
      categoria_detalhe,
      tipo_documento,
      cnpj_fornecedor,
      cpf_fornecedor,
      nome_fornecedor,
      valor,
      valor_detalhe,
      valor_glosado,
      valor_liquido,
      url_documento,
      url_transparencia,
      nivel_qualidade,
      qualidade_score,
      metadados,
      coletado_em,
      criado_em,
      processado_em
    `, { count: "exact" })
    .eq("parlamentar_id", parl.prisma_id)
    .order("competencia_date", { ascending: false });

  if (ano)       query = query.eq("competencia_ano", parseInt(ano));
  if (mes)       query = query.eq("competencia_mes", parseInt(mes));
  if (categoria && categoria !== "all") query = query.eq("categoria_slug", categoria);
  if (fornecedor && fornecedor.trim()) {
    query = query.or(
      `nome_fornecedor.ilike.%${fornecedor}%,cnpj_fornecedor.ilike.%${fornecedor}%`
    );
  }

  // ─── 3. Busca todos para KPIs ───────────────────────────────────────────────
  const { data: todos, error: todosError } = await query.range(0, 9999);

  if (todosError) {
    return NextResponse.json({ error: todosError.message }, { status: 500 });
  }

  const registros     = todos || [];
  const totalFiltered = registros.length;

  // ─── 4. KPIs ────────────────────────────────────────────────────────────────
  const totalGasto        = registros.reduce((s, r) => s + (Number(r.valor)         || 0), 0);
  const totalGlosado      = registros.reduce((s, r) => s + (Number(r.valor_glosado) || 0), 0);
  const totalFornecedores = new Set(registros.map(r => r.cnpj_fornecedor).filter(Boolean)).size;

  const catMap = registros.reduce<Record<string, number>>((acc, r) => {
    const cat = r.categoria_portal?.trim() || "Outros";
    acc[cat] = (acc[cat] || 0) + (Number(r.valor) || 0);
    return acc;
  }, {});
  const categorias     = Object.entries(catMap).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));
  const categoriaMaior = categorias[0]?.name ?? "—";

  const fornMap = registros.reduce<Record<string, { valor: number; nome: string; cnpj: string }>>(
    (acc, r) => {
      const key = r.cnpj_fornecedor || "sem-cnpj";
      if (!acc[key]) acc[key] = { valor: 0, nome: r.nome_fornecedor || "—", cnpj: key };
      acc[key].valor += Number(r.valor) || 0;
      return acc;
    }, {}
  );
  const topFornecedores = Object.values(fornMap).sort((a, b) => b.valor - a.valor).slice(0, 10);

  const mesMap = registros.reduce<Record<string, number>>((acc, r) => {
    const label = r.competencia_date
      ? r.competencia_date.substring(0, 7)
      : `${r.competencia_ano}-${String(r.competencia_mes).padStart(2, "0")}`;
    acc[label] = (acc[label] || 0) + (Number(r.valor) || 0);
    return acc;
  }, {});
  const gastosMensais = Object.entries(mesMap).sort(([a], [b]) => a.localeCompare(b)).map(([mes, valor]) => ({ mes, valor }));

  const anos                  = [...new Set(registros.map(r => r.competencia_ano).filter(Boolean))].sort((a, b) => b - a);
  const categoriasDisponiveis = [...new Set(registros.map(r => r.categoria_slug).filter(Boolean))];

  // ─── 5. Modo KPIs ───────────────────────────────────────────────────────────
  if (modoKpis) {
    return NextResponse.json({
      deputado:            parl.nome_urna || parl.nome_civil,
      foto_url:            parl.foto_url,
      sigla_partido:       parl.sigla_partido,
      totalGasto,
      totalGlosado,
      totalNotas:          totalFiltered,
      totalFornecedores,
      categoriaMaior,
      categorias,
      topFornecedores,
      gastosMensais,
      anos,
      categoriasDisponiveis,
    });
  }

  // ─── 6. Tabela paginada — payload COMPLETO ──────────────────────────────────
  const paginado = registros
    .slice(page * pageSize, (page + 1) * pageSize)
    .map(r => {
      const meta = (r.metadados as Record<string, unknown>) || {};
      return {
        // identidade
        id:                   r.prisma_id,
        parlamentar_id:       r.parlamentar_id,
        // competência
        competencia:          r.competencia_date,
        competencia_label:    r.competencia_date
                                ? new Date(r.competencia_date + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
                                : null,
        ano:                  r.competencia_ano,
        mes:                  r.competencia_mes,
        // processo/NF
        num_processo:         r.num_processo,
        num_nf:               r.num_nf,
        num_nf_normalizado:   r.num_nf_normalizado,
        tipo_documento:       r.tipo_documento,
        // fornecedor
        fornecedor:           r.nome_fornecedor,
        fornecedor_limpo:     (meta.nome_fornecedor_limpo as string) || r.nome_fornecedor,
        cnpj:                 r.cnpj_fornecedor,
        cpf:                  r.cpf_fornecedor,
        cnpj_valido:          meta.cnpj_valido as boolean,
        // categoria
        categoria:            r.categoria_portal?.trim() || "Outros",
        categoria_slug:       r.categoria_slug,
        categoria_detalhe:    r.categoria_detalhe,
        // valores
        valor:                Number(r.valor)         || 0,
        valor_detalhe:        Number(r.valor_detalhe) || 0,
        valor_glosado:        Number(r.valor_glosado) || 0,
        valor_liquido:        Number(r.valor_liquido) || 0,
        // URLs
        link_pdf:             r.url_documento  || null,
        link_detalhe:         (meta.link_detalhe as string) || r.url_transparencia || null,
        link_transparencia:   r.url_transparencia || null,
        has_pdf:              !!(r.url_documento),
        // qualidade / origem
        nivel_qualidade:      r.nivel_qualidade,
        qualidade_score:      Number(r.qualidade_score) || 0,
        fonte_portal:         r.fonte_portal,
        esfera:               r.esfera,
        uf:                   r.uf,
        // flags de análise Águia
        flags:                (meta.flags as string[]) || [],
        match_score:          meta.match_score as number,
        match_metodo:         meta.match_metodo as string,
        orfao:                meta.orfao as boolean,
        nf_tipo:              meta.nf_tipo as string,
        bebeto_versao:        meta.bebeto_versao as string,
        ronaldo_versao:       meta.ronaldo_versao as string,
        // timestamps
        coletado_em:          r.coletado_em,
        criado_em:            r.criado_em,
        processado_em:        r.processado_em,
      };
    });

  return NextResponse.json({
    deputado:            parl.nome_urna || parl.nome_civil,
    foto_url:            parl.foto_url,
    sigla_partido:       parl.sigla_partido,
    totalGasto,
    totalGlosado,
    totalNotas:          totalFiltered,
    totalFornecedores,
    categoriaMaior,
    categorias,
    topFornecedores,
    gastosMensais,
    anos,
    categoriasDisponiveis,
    pagina:              page,
    pageSize,
    totalRegistros:      totalFiltered,
    totalPaginas:        Math.ceil(totalFiltered / pageSize),
    registros:           paginado,
  });
}
