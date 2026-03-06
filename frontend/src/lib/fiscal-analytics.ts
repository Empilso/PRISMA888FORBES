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
                    forensicAnalysis: `Este registro no valor de ${formatCurrency(exp.vl_despesa)} emitido para ${exp.nm_fornecedor} apresenta variação estatística significativa em relação à média.\n\nPara referência, a média dos empenhos registrados é de ${formatCurrency(mean)}. Este lançamento representa ${zScore.toFixed(1)} desvios-padrão acima desse valor.\n\nPontos para análise complementar:\n1. Verificação de proporcionalidade: Avaliar se o valor é compatível com o objeto contratado e os preços praticados no mercado.\n2. Concentração de recursos: Observar se há recorrência de valores elevados destinados ao mesmo fornecedor.\n\nSugestão: Consultar a documentação de suporte (notas fiscais, contratos e termos de referência) para contextualização técnica do empenho.`
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
            reason: 'Registro com valor nominal negativo identificado',
            forensicAnalysis: `Foi identificado um registro financeiro com valor negativo de ${formatCurrency(exp.vl_despesa)} associado a ${exp.nm_fornecedor || 'um fornecedor'}.\n\nNa contabilidade pública, valores negativos podem decorrer de situações como estornos, anulações de empenho ou ajustes contábeis.\n\nPontos para análise complementar:\n1. Ajuste contábil: Verificar se o lançamento corresponde a uma anulação parcial ou total de empenho devidamente justificada.\n2. Estorno de pagamento: Confirmar se houve devolução de valores ou retificação de lançamento anterior.\n\nSugestão: Consultar o histórico completo deste registro junto à unidade contábil para identificar a natureza e fundamentação do ajuste.`
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
                reason: 'Registros com dados coincidentes identificados',
                forensicAnalysis: `Foram identificados dois ou mais lançamentos com dados idênticos para o fornecedor ${exp.nm_fornecedor}.\n\nOs registros compartilham a mesma data de emissão (${new Date(exp.dt_emissao).toLocaleDateString('pt-BR')}) e valor idêntico: ${formatCurrency(exp.vl_despesa)}.\n\nPontos para análise complementar:\n1. Lançamentos distintos: Verificar se os registros correspondem a fornecimentos ou serviços independentes, devidamente documentados.\n2. Duplicidade de lançamento: Confirmar se não houve repetição involuntária do mesmo registro no sistema.\n\nSugestão: Consultar os documentos comprobatórios (notas fiscais, ordens de serviço) para cada lançamento a fim de validar a independência das operações.`
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
        score += 1; // Valores redondos altos merecem atenção adicional
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
