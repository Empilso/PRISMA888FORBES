import { createClient } from '@/lib/supabase/client';

// Define Interface manually since we are using Client Pattern without full Codegen in this iteration
// In a full setup this would come from @prisma/client or supabase types
export interface AIExecutionLog {
    id: string;
    persona_id: string;
    trace_id: string;
    step_name: string;
    agent_role: string;
    model_used: string;
    input_tokens: number | null;
    output_tokens: number | null;
    raw_input: string | null;
    raw_output: string | null;
    tool_calls: string | null; // Added field
    logs: any; // JSON
    is_success: boolean;
    created_at: string;
}

export const aiMonitoringService = {
    /**
     * Fetches execution logs for a specific persona
     * @param personaId - UUID of the persona
     * @param limit - Number of logs to fetch (default 50)
     */
    async getExecutionLogs(personaId: string, limit = 50): Promise<AIExecutionLog[]> {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('ai_execution_logs')
            .select('*')
            .eq('persona_id', personaId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching AI logs:', error);
            throw error;
        }

        return (data as AIExecutionLog[]) || [];
    },

    /**
     * Fetches a specific trace detail
     */
    async getTraceDetails(traceId: string): Promise<AIExecutionLog[]> {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('ai_execution_logs')
            .select('*')
            .eq('trace_id', traceId)
            .order('created_at', { ascending: true }); // Chronological order for a trace

        if (error) {
            throw error;
        }

        return (data as AIExecutionLog[]) || [];
    },

    /**
     * Fetches execution logs for a specific campaign (New for Admin Setup)
     */
    async getCampaignLogs(campaignId: string, limit = 100): Promise<AIExecutionLog[]> {
        const supabase = createClient();
        console.log("Fetching logs for campaign:", campaignId);

        const { data, error } = await supabase
            .from('ai_execution_logs')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching Campaign logs:', error);
            throw error;
        }

        return (data as AIExecutionLog[]) || [];
    }
};
