import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

// ─── Tipo base do registro ─────────────────────────────────────────────────────
interface VerbaRecord {
    num_processo: string;
    num_nf: string;
    competencia: string;
    deputado: string;
    categoria: string;
    valor: number;
    link_detalhe: string;
    ano: number;
    coletado_em: string;
    cnpj_fornecedor: string;
    nome_fornecedor: string;
    valor_glosado: number;
    valor_detalhe: number;
    link_pdf_nf: string;
    tipo_documento: string;
    categoria_detalhe: string;
    numero_nf_recibo: string;
    hash_id: string;
    processado_em: string;
    score_risco: number;
    motivos_risco: string[];
    risco_nivel: string;
    comentario_aguia: string;
}

// ─── Normalização de slug ──────────────────────────────────────────────────────
function normalize(str: string): string {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s-]/g, "")
        .trim();
}

function nameToSlug(name: string): string {
    return normalize(name).replace(/\s+/g, "-");
}

// ─── Cache em memória (evitar re-leitura a cada request) ──────────────────────
let cachedData: VerbaRecord[] | null = null;
let cacheFile = "";

function loadData(): VerbaRecord[] {
    // Tenta todos os arquivos disponíveis no diretório /dados
    const dadosDir = path.join(process.cwd(), "..", "dados");

    if (cachedData && cacheFile) return cachedData;

    const files = fs.existsSync(dadosDir)
        ? fs.readdirSync(dadosDir).filter(f => f.startsWith("alba_") && f.endsWith(".json"))
        : [];

    if (files.length === 0) return [];

    let allData: VerbaRecord[] = [];
    for (const file of files) {
        try {
            const raw = fs.readFileSync(path.join(dadosDir, file), "utf-8");
            const parsed = JSON.parse(raw) as VerbaRecord[];
            allData = allData.concat(parsed);
        } catch {
            // skip file
        }
    }

    cachedData = allData;
    cacheFile = files.join(",");
    return cachedData;
}

// ─── Handler GET ───────────────────────────────────────────────────────────────
export async function GET(
    request: NextRequest,
    { params }: { params: { slug: string } }
) {
    const { slug } = params;
    const { searchParams } = new URL(request.url);

    // Query params opcionais
    const ano = searchParams.get("ano");
    const mes = searchParams.get("mes");
    const categoria = searchParams.get("categoria");
    const risco = searchParams.get("risco");
    const fornecedor = searchParams.get("fornecedor");
    const page = parseInt(searchParams.get("page") ?? "0");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "25");
    const modoKpis = searchParams.get("modo") === "kpis"; // só KPIs, sem tabela

    // Carrega todos os dados
    const allData = loadData();

    if (allData.length === 0) {
        return NextResponse.json({ error: "Dados não encontrados" }, { status: 404 });
    }

    // Identifica o deputado pelo slug
    // Ex: "bobo-deputado-ba" → busca "Bobô"
    const slugBase = slug.replace(/-deputado-ba$/, "");

    const deputy = allData.find(r => nameToSlug(r.deputado) === slugBase);
    if (!deputy) {
        return NextResponse.json(
            { error: `Deputado não encontrado para slug: ${slug}`, slug, slugBase },
            { status: 404 }
        );
    }

    const deputadoName = deputy.deputado;

    // Filtra por deputado
    let registros = allData.filter(r => r.deputado === deputadoName);

    // Aplica filtros
    if (ano) registros = registros.filter(r => String(r.ano) === ano);
    if (mes) {
        registros = registros.filter(r => {
            const [m] = r.competencia.split("/");
            return m === mes.padStart(2, "0");
        });
    }
    if (categoria && categoria !== "all") {
        registros = registros.filter(r =>
            r.categoria.toLowerCase().includes(categoria.toLowerCase())
        );
    }
    if (risco && risco !== "all") {
        registros = registros.filter(r => r.risco_nivel === risco);
    }
    if (fornecedor && fornecedor.trim()) {
        const q = fornecedor.toLowerCase();
        registros = registros.filter(r =>
            r.nome_fornecedor.toLowerCase().includes(q) ||
            r.cnpj_fornecedor.includes(q)
        );
    }

    const totalFiltered = registros.length;

    // ─── Calcula KPIs ────────────────────────────────────────────────────────
    const totalGasto = registros.reduce((s, r) => s + r.valor, 0);
    const totalGlosado = registros.reduce((s, r) => s + r.valor_glosado, 0);
    const totalNotas = registros.length;
    const totalFornecedores = new Set(registros.map(r => r.cnpj_fornecedor)).size;

    const porRisco = registros.reduce<Record<string, number>>((acc, r) => {
        acc[r.risco_nivel] = (acc[r.risco_nivel] || 0) + 1;
        return acc;
    }, {});

    const altoRiscoCount = (porRisco["MÁXIMO"] || 0) + (porRisco["ALTO"] || 0);
    const altoRiscoPct = totalNotas > 0 ? Math.round((altoRiscoCount / totalNotas) * 100) : 0;

    // Distribuição por categoria
    const catMap = registros.reduce<Record<string, number>>((acc, r) => {
        const cat = r.categoria.trim();
        acc[cat] = (acc[cat] || 0) + r.valor;
        return acc;
    }, {});
    const categorias = Object.entries(catMap)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({ name, value }));

    const categoriaMaior = categorias[0]?.name ?? "—";

    // Top fornecedores
    const fornMap = registros.reduce<Record<string, { valor: number; nome: string; cnpj: string }>>((acc, r) => {
        const key = r.cnpj_fornecedor;
        if (!acc[key]) acc[key] = { valor: 0, nome: r.nome_fornecedor, cnpj: r.cnpj_fornecedor };
        acc[key].valor += r.valor;
        return acc;
    }, {});
    const topFornecedores = Object.values(fornMap)
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10);

    // Gastos mensais (competência → soma)
    const mesMap = registros.reduce<Record<string, number>>((acc, r) => {
        acc[r.competencia] = (acc[r.competencia] || 0) + r.valor;
        return acc;
    }, {});
    const gastosMensais = Object.entries(mesMap)
        .sort(([a], [b]) => {
            const [ma, ya] = a.split("/").map(Number);
            const [mb, yb] = b.split("/").map(Number);
            return ya !== yb ? ya - yb : ma - mb;
        })
        .map(([mes, valor]) => ({ mes, valor }));

    // Motivos de risco para os alertas forenses
    const motivosMap = registros.reduce<Record<string, { count: number; total: number }>>((acc, r) => {
        for (const motivo of r.motivos_risco) {
            if (!acc[motivo]) acc[motivo] = { count: 0, total: 0 };
            acc[motivo].count++;
            acc[motivo].total += r.valor;
        }
        return acc;
    }, {});
    const alertasForenses = Object.entries(motivosMap)
        .sort(([, a], [, b]) => b.count - a.count)
        .map(([tipo, { count, total }]) => ({ tipo, count, total }));

    // Anos disponíveis para filtro
    const anos = [...new Set(registros.map(r => r.ano))].sort((a, b) => b - a);

    // Categorias disponíveis para filtro (nomes curtos)
    const categoriasDisponiveis = [...new Set(registros.map(r => r.categoria.trim()))];

    const totalScore = registros.reduce((s, r) => s + (r.score_risco || 0), 0);
    const scoreMedio = totalNotas > 0 ? Number((totalScore / totalNotas).toFixed(1)) : 0;

    if (modoKpis) {
        return NextResponse.json({
            deputado: deputadoName,
            totalGasto,
            totalGlosado,
            totalNotas,
            totalFornecedores,
            altoRiscoPct,
            scoreMedio,
            categoriaMaior,
            categorias,
            topFornecedores,
            gastosMensais,
            alertasForenses,
            porRisco,
            anos,
            categoriasDisponiveis,
        });
    }

    // ─── Tabela paginada ─────────────────────────────────────────────────────
    const paginado = registros
        .slice(page * pageSize, (page + 1) * pageSize)
        .map(r => ({
            id: r.hash_id,
            num_processo: r.num_processo,
            competencia: r.competencia,
            ano: r.ano,
            categoria: r.categoria.trim(),
            valor: r.valor,
            valor_glosado: r.valor_glosado,
            fornecedor: r.nome_fornecedor,
            cnpj: r.cnpj_fornecedor,
            tipo_documento: r.tipo_documento,
            nf: r.num_nf,
            hasPdf: !!r.link_pdf_nf,
            link_pdf: r.link_pdf_nf,
            link_detalhe: r.link_detalhe,
            score: r.score_risco,
            risco: r.risco_nivel,
            motivos_risco: r.motivos_risco,
            comentario_aguia: r.comentario_aguia,
        }));

    return NextResponse.json({
        deputado: deputadoName,
        // KPIs
        totalGasto,
        totalGlosado,
        totalNotas: totalFiltered,
        totalFornecedores,
        altoRiscoPct,
        categoriaMaior,
        categorias,
        topFornecedores,
        gastosMensais,
        alertasForenses,
        porRisco,
        anos,
        categoriasDisponiveis,
        // Tabela
        pagina: page,
        pageSize,
        totalRegistros: totalFiltered,
        totalPaginas: Math.ceil(totalFiltered / pageSize),
        registros: paginado,
    });
}
