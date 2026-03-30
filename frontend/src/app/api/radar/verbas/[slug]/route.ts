import { NextRequest, NextResponse } from "next/server";
import { createDadosClient } from "@/lib/supabase/dados";

// Detecta se a string é um UUID (prisma_id) ou slug
function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(value)
    || /^[0-9a-f]{32}$/i.test(value); // UUID sem hífens (formato que vem do frontend)
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

  // ─── 1. Resolve parlamentar — aceita UUID (prisma_id) ou slug ──────────────
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

  // ─── 2. Query base de despesas por parlamentar_id ───────────────────────
  let query = supabase
    .from("despesas_gabinete")
    .select(`
      prisma_id, num_processo, num_nf, competencia_date,
      competencia_ano, competencia_mes,
      categoria_portal, categoria_slug, categoria_detalhe,
      nome_fornecedor, cnpj_fornecedor, tipo_documento,
      valor, valor_detalhe, valor_glosado, valor_liquido,
      url_documento, url_transparencia,
      coletado_em
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

  // ─── 3. Busca todos os registros para cálculo de KPIs ──────────────────
  const { data: todos, error: todosError } = await query.range(0, 9999);

  if (todosError) {
    return NextResponse.json({ error: todosError.message }, { status: 500 });
  }

  const registros     = todos || [];
  const totalFiltered = registros.length;

  // ─── 4. KPIs ─────────────────────────────────────────────────────
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

  const anos                = [...new Set(registros.map(r => r.competencia_ano).filter(Boolean))].sort((a, b) => b - a);
  const categoriasDisponiveis = [...new Set(registros.map(r => r.categoria_slug).filter(Boolean))];

  // ─── 5. Modo KPIs ──────────────────────────────────────────────────
  if (modoKpis) {
    return NextResponse.json({
      deputado:             parl.nome_urna || parl.nome_civil,
      foto_url:             parl.foto_url,
      sigla_partido:        parl.sigla_partido,
      totalGasto,
      totalGlosado,
      totalNotas:           totalFiltered,
      totalFornecedores,
      categoriaMaior,
      categorias,
      topFornecedores,
      gastosMensais,
      anos,
      categoriasDisponiveis,
    });
  }

  // ─── 6. Tabela paginada ────────────────────────────────────────────
  const paginado = registros
    .slice(page * pageSize, (page + 1) * pageSize)
    .map(r => ({
      id:             r.prisma_id,
      num_processo:   r.num_processo,
      competencia:    r.competencia_date,
      ano:            r.competencia_ano,
      mes:            r.competencia_mes,
      categoria:      r.categoria_portal?.trim() || "Outros",
      categoria_slug: r.categoria_slug,
      valor:          Number(r.valor)         || 0,
      valor_glosado:  Number(r.valor_glosado) || 0,
      valor_liquido:  Number(r.valor_liquido) || 0,
      fornecedor:     r.nome_fornecedor,
      cnpj:           r.cnpj_fornecedor,
      tipo_documento: r.tipo_documento,
      nf:             r.num_nf,
      link_pdf:       r.url_documento,
      link_detalhe:   r.url_transparencia,
    }));

  return NextResponse.json({
    deputado:       parl.nome_urna || parl.nome_civil,
    foto_url:       parl.foto_url,
    sigla_partido:  parl.sigla_partido,
    totalGasto,
    totalGlosado,
    totalNotas:     totalFiltered,
    totalFornecedores,
    categoriaMaior,
    categorias,
    topFornecedores,
    gastosMensais,
    anos,
    categoriasDisponiveis,
    pagina:         page,
    pageSize,
    totalRegistros: totalFiltered,
    totalPaginas:   Math.ceil(totalFiltered / pageSize),
    registros:      paginado,
  });
}
