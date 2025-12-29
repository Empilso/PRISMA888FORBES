/**
 * Radar de Promessas API Client
 * Functions for fetching radar data from the backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============ TYPES ============

export interface RadarSummary {
    cumprida: number;
    parcial: number;
    nao_iniciada: number;
    desviada: number;
    score_medio: number;
}

export interface PromiseData {
    id: string;
    campaign_id: string;
    politico_id: string;
    resumo_promessa: string;
    categoria: string;
    origem: string;
    confiabilidade: string;
    trecho_original: string | null;
    data_promessa: string | null;
    created_at: string;
    updated_at: string;
    // Verification data
    status_atual: string | null;
    score_similaridade: number | null;
    justificativa_ia: string | null;
    fontes: Array<{
        tipo: string;
        url?: string;
        descricao?: string;
        valor_pago?: number;
    }>;
    data_primeira_emenda: string | null;
    data_licitacao: string | null;
    data_ultima_noticia: string | null;
    last_updated_at: string | null;
}

export interface PromiseFilters {
    status?: string;
    categoria?: string;
    origem?: string;
    limit?: number;
    offset?: number;
}

// ============ API FUNCTIONS ============

/**
 * Fetch radar summary (KPI counts)
 */
export async function fetchRadarSummary(
    campaignId: string,
    politicoId: string
): Promise<RadarSummary> {
    try {
        const res = await fetch(
            `${API_URL}/campaigns/${campaignId}/radar/${politicoId}/summary`
        );
        if (!res.ok) throw new Error(`Failed to fetch summary: ${res.status}`);
        return res.json();
    } catch (error) {
        console.error('[RadarAPI] fetchRadarSummary error:', error);
        // Return default values on error
        return {
            cumprida: 0,
            parcial: 0,
            nao_iniciada: 0,
            desviada: 0,
            score_medio: 0
        };
    }
}

/**
 * Fetch list of promises with verifications
 */
export async function fetchPromises(
    campaignId: string,
    politicoId: string,
    filters?: PromiseFilters
): Promise<PromiseData[]> {
    try {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.categoria) params.append('categoria', filters.categoria);
        if (filters?.origem) params.append('origem', filters.origem);
        if (filters?.limit) params.append('limit', String(filters.limit));
        if (filters?.offset) params.append('offset', String(filters.offset));

        const queryString = params.toString();
        const url = `${API_URL}/campaigns/${campaignId}/radar/${politicoId}/promises${queryString ? `?${queryString}` : ''}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch promises: ${res.status}`);
        return res.json();
    } catch (error) {
        console.error('[RadarAPI] fetchPromises error:', error);
        return [];
    }
}

/**
 * Fetch single promise detail
 */
export async function fetchPromiseDetail(
    campaignId: string,
    politicoId: string,
    promiseId: string
): Promise<PromiseData | null> {
    try {
        const res = await fetch(
            `${API_URL}/campaigns/${campaignId}/radar/${politicoId}/promises/${promiseId}`
        );
        if (!res.ok) throw new Error(`Failed to fetch promise: ${res.status}`);
        return res.json();
    } catch (error) {
        console.error('[RadarAPI] fetchPromiseDetail error:', error);
        return null;
    }
}

/**
 * Trigger radar refresh
 */
export async function triggerRadarRefresh(
    campaignId: string,
    politicoId: string
): Promise<{ status: string; message: string }> {
    try {
        const res = await fetch(
            `${API_URL}/campaigns/${campaignId}/radar/${politicoId}/refresh`,
            { method: 'POST' }
        );
        if (!res.ok) throw new Error(`Failed to trigger refresh: ${res.status}`);
        return res.json();
    } catch (error) {
        console.error('[RadarAPI] triggerRadarRefresh error:', error);
        return {
            status: 'error',
            message: String(error)
        };
    }
}
