import { parseISO, format, startOfMonth, endOfMonth } from 'date-fns';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface FiscalExpense {
    id?: string;
    dt_emissao: string;
    dt_empenho?: string;
    vl_empenho?: number;
    vl_despesa: number;
    nm_fornecedor: string;
    cpf_cnpj?: string;
    funcao: string;
    subfuncao?: string;
    ds_historico?: string;
    modalidade_licitacao?: string;
    orgao?: string;
    fonte_recurso?: string;
    programa?: string;
    elemento_despesa?: string;
    nr_empenho?: string;
    id_despesa?: string;
    evento?: string; // Empenhado, Liquidado, Pago, Reforço, Anulação
}

export interface AggregatedData {
    name: string;
    total: number;
    count: number;
    percentage?: number;
    cnpj?: string;
    avgTicket?: number; // Valor médio por nota/empenho
    dependencyScore?: number; // 0-10, quão dependente a prefeitura está desse credor
    lastActivity?: string; // Data da última transação
}

export interface MonthlyData {
    month: string;
    revenue: number;
    expenses: number;
    balance: number;
}

export interface Anomaly extends FiscalExpense {
    riskScore: number;
    reason: string;
    forensicAnalysis?: string; // Novo laudo técnico descritivo
}

// ============================================
// AGREGADORES
// ============================================

export function aggregateByCreditor(expenses: FiscalExpense[]): AggregatedData[] {
    const map = new Map<string, { total: number; count: number; cnpj?: string; lastDate: string }>();

    expenses.forEach(exp => {
        const key = exp.nm_fornecedor;
        const current = map.get(key) || { total: 0, count: 0, cnpj: exp.cpf_cnpj, lastDate: exp.dt_emissao };

        const newTotal = current.total + exp.vl_despesa;
        const newCount = current.count + 1;
        const newDate = exp.dt_emissao > current.lastDate ? exp.dt_emissao : current.lastDate;

        map.set(key, {
            total: newTotal,
            count: newCount,
            cnpj: exp.cpf_cnpj || current.cnpj,
            lastDate: newDate
        });
    });

    const totalBudget = expenses.reduce((sum, e) => sum + e.vl_despesa, 0);

    return Array.from(map.entries())
        .map(([name, data]) => {
            const percentage = (data.total / (totalBudget || 1)) * 100;
            return {
                name,
                total: data.total,
                count: data.count,
                cnpj: data.cnpj,
                percentage,
                avgTicket: data.total / (data.count || 1),
                lastActivity: data.lastDate,
                dependencyScore: Math.min(10, (percentage / 5) * 2) // Ex: 25% do orçamento = score 10
            };
        })
        .sort((a, b) => b.total - a.total);
}

export function aggregateByOrgan(expenses: FiscalExpense[]): AggregatedData[] {
    const map = new Map<string, { total: number; count: number }>();

    expenses.forEach(exp => {
        const key = exp.orgao || 'Não Especificado';
        const current = map.get(key) || { total: 0, count: 0 };
        map.set(key, {
            total: current.total + exp.vl_despesa,
            count: current.count + 1
        });
    });

    return Array.from(map.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total);
}

export function aggregateByProgram(expenses: FiscalExpense[]): AggregatedData[] {
    const map = new Map<string, { total: number; count: number }>();

    expenses.forEach(exp => {
        const key = exp.funcao || 'Não Especificado';
        const current = map.get(key) || { total: 0, count: 0 };
        map.set(key, {
            total: current.total + exp.vl_despesa,
            count: current.count + 1
        });
    });

    return Array.from(map.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total);
}

export function aggregateByModality(expenses: FiscalExpense[]): AggregatedData[] {
    const map = new Map<string, { total: number; count: number }>();

    expenses.forEach(exp => {
        const key = exp.modalidade_licitacao || 'Não Especificado';
        const current = map.get(key) || { total: 0, count: 0 };
        map.set(key, {
            total: current.total + exp.vl_despesa,
            count: current.count + 1
        });
    });

    return Array.from(map.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total);
}

// ============================================
// ANÁLISE TEMPORAL
// ============================================

export function groupByMonth(expenses: FiscalExpense[], revenueTotal: number = 0): MonthlyData[] {
    const monthMap = new Map<string, number>();

    expenses.forEach(exp => {
        try {
            const date = parseISO(exp.dt_emissao);
            const monthKey = format(date, 'yyyy-MM');
            const current = monthMap.get(monthKey) || 0;
            monthMap.set(monthKey, current + exp.vl_despesa);
        } catch (error) {
            // Ignorar datas inválidas
        }
    });

    // Distribuir receita proporcionalmente (simplificação)
    const totalMonths = monthMap.size || 12;
    const monthlyRevenue = revenueTotal / totalMonths;

    return Array.from(monthMap.entries())
        .map(([month, expenses]) => ({
            month: format(parseISO(month + '-01'), 'MMM'),
            revenue: monthlyRevenue,
            expenses,
            balance: monthlyRevenue - expenses
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
}

// ============================================
// DETECÇÃO DE ANOMALIAS
// ============================================

export function calculateStatistics(values: number[]) {
    const n = values.length;
    if (n === 0) return { mean: 0, stdDev: 0, median: 0 };

    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const sorted = [...values].sort((a, b) => a - b);
    const median = n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];

    return { mean, stdDev, median };
}

export function detectOutliers(expenses: FiscalExpense[], zScoreThreshold: number = 3): Anomaly[] {
    const values = expenses.map(e => e.vl_despesa);
    const { mean, stdDev } = calculateStatistics(values);

    if (stdDev === 0) return [];

    return expenses
        .map((exp) => {
            const zScore = Math.abs((exp.vl_despesa - mean) / stdDev);
            if (zScore > zScoreThreshold) {
                return {
                    ...exp,
                    riskScore: Math.min(10, Math.floor(zScore)),
                    reason: `Valor ${zScore.toFixed(1)}x acima da média (Z-Score: ${zScore.toFixed(2)})`,
                    forensicAnalysis: `Esta nota específica no valor de ${formatCurrency(exp.vl_despesa)} paga à empresa ${exp.nm_fornecedor} está assustadoramente alta.\n\nPara ter uma ideia, a média de gastos (padrão normal) da prefeitura é de apenas ${formatCurrency(mean)}. Esse pagamento foi ${zScore.toFixed(1)} VEZES MAIOR que a média.\n\nO que investigar neste caso:\n1. Superfaturamento óbvio: O produto ou serviço que a empresa ${exp.nm_fornecedor} forneceu realmente vale as cifras de ${formatCurrency(exp.vl_despesa)}?\n2. Favorecimento: Concentração altamente suspeita de muito dinheiro público em um único contrato desta empresa.\n\nAção recomendada: Exija imediatamente a cópia das notas fiscais e o PDF do contrato para abrir a caixa preta desse empenho.`
                } as Anomaly;
            }
            return null;
        })
        .filter((exp): exp is Anomaly => exp !== null)
        .sort((a, b) => b.riskScore - a.riskScore);
}

export function detectNegativeValues(expenses: FiscalExpense[]): Anomaly[] {
    return expenses
        .filter(exp => exp.vl_despesa < 0)
        .map(exp => ({
            ...exp,
            riskScore: 8,
            reason: 'Valor nominal negativo lançado na contabilidade',
            forensicAnalysis: `O sistema encontrou um registro financeiro com valor negativo de ${formatCurrency(exp.vl_despesa)} associado a ${exp.nm_fornecedor || 'uma empresa'}. Na contabilidade transparente do governo, despesas não rodam abaixo de zero.\n\nO que investigar neste caso:\n1. Maquiagem Contábil ("Pedalada"): Estão tentando esconder esse buraco de ${formatCurrency(exp.vl_despesa)} para fingir artificialmente que a prefeitura gastou menos perante o Tribunal.\n2. Estorno Rápido Irregular: Alguém desfez esse pagamento para a ${exp.nm_fornecedor || 'empresa'} de forma completamente desorganizada.\n\nAção recomendada: O Tribunal reprova essas mágicas nos números. Peça o histórico detalhado deste registro e pressione a secretaria da fazenda sobre qual foi a justificativa para este rombo negativo.`
        }));
}

export function detectDuplicates(expenses: FiscalExpense[]): Anomaly[] {
    const seen = new Map<string, FiscalExpense>();
    const duplicates: Anomaly[] = [];

    expenses.forEach(exp => {
        const key = `${exp.dt_emissao}-${exp.nm_fornecedor}-${exp.vl_despesa}`;
        if (seen.has(key)) {
            duplicates.push({
                ...exp,
                riskScore: 6,
                reason: 'Alerta de Fracionamento / Duplicidade Perfeita',
                forensicAnalysis: `A inteligência do Prisma pegou no flagra DOIS ou mais pagamentos absolutamente idênticos (mesinhas clonadas) para a empresa ${exp.nm_fornecedor}.\n\nAmbos foram emitidos no mesmo dia (${new Date(exp.dt_emissao).toLocaleDateString('pt-BR')}) e com o exato mesmo valor, centavo por centavo: ${formatCurrency(exp.vl_despesa)}.\n\nO que investigar neste caso:\n1. Fuga de Licitação (Fatiamento de Notas): Ao invés de abrir uma licitação normal, a prefeitura picou os pagamentos para a ${exp.nm_fornecedor} em várias notinhas de ${formatCurrency(exp.vl_despesa)} emitidas de uma vez só para burlar a lei.\n2. Erro de Repetição: A prefeitura simplesmente pagou a mesma conta duas vezes.\n\nAção recomendada: Peça os comprovantes físicos de entrega do dia ${new Date(exp.dt_emissao).toLocaleDateString('pt-BR')} dessa empresa para provar que entregaram coisas independentes, e não um esquema proposital de fatiamento.`
            });
        } else {
            seen.set(key, exp);
        }
    });

    return duplicates;
}

export function calculateRiskScore(expense: FiscalExpense, allExpenses: FiscalExpense[]): number {
    let score = 0;
    const values = allExpenses.map(e => e.vl_despesa);
    const { mean } = calculateStatistics(values);

    // Valor muito alto (> 3x média)
    if (expense.vl_despesa > mean * 3) score += 3;

    // Valor negativo
    if (expense.vl_despesa < 0) score += 4;

    // Dispensa sem licitação
    if (expense.modalidade_licitacao === 'DISPENSA' || expense.modalidade_licitacao === 'INEXIGIBILIDADE') {
        score += 2;
    }

    // CNPJ desconhecido
    if (!expense.cpf_cnpj) score += 1;

    // Valor muito específico (pode ser fracionamento)
    const decimalPart = expense.vl_despesa % 1;
    if (decimalPart === 0 && expense.vl_despesa > 10000) {
        score += 1; // Valores redondos altos são suspeitos
    }

    return Math.min(10, score);
}

// ============================================
// CÁLCULOS PERCENTUAIS
// ============================================

export function addPercentages(data: AggregatedData[], total?: number): AggregatedData[] {
    const totalValue = total || data.reduce((sum, item) => sum + item.total, 0);

    return data.map(item => ({
        ...item,
        percentage: (item.total / totalValue) * 100
    }));
}

// ============================================
// FORMATAÇÃO
// ============================================

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(value);
}

export function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
}

export function formatCompactCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(value);
}
