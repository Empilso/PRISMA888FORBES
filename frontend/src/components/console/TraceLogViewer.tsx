"use client";

import { createClient } from "@/lib/supabase/client";

import React, { useEffect, useState, useRef } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Brain, Terminal, Wrench, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { aiMonitoringService, AIExecutionLog } from "@/services/ai-monitoring.service";
import { usePersonaStatus } from "@/hooks/usePersonaStatus";

interface TraceLogViewerProps {
    personaId?: string; // Optional now
    campaignId?: string; // Added for Campaign Level
    className?: string;
}

export function TraceLogViewer({ personaId, campaignId, className }: TraceLogViewerProps) {
    const [logs, setLogs] = useState<AIExecutionLog[]>([]);
    // Status hook might need update or be skipped if campaignId used. 
    // For now, if campaignId is present, we assume 'running' or just show logs.
    const { status: personaStatus } = usePersonaStatus(personaId || "");
    const status = campaignId ? 'running' : personaStatus; // Force active UI for campaign view

    const scrollRef = useRef<HTMLDivElement>(null);
    const [startTime, setStartTime] = useState<number | null>(null);

    // Auto-scroll effect
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    // Realtime Subscription
    useEffect(() => {
        if (!personaId && !campaignId) return;

        // Initial fetch
        const fetchLogs = async () => {
            try {
                let data: AIExecutionLog[] = [];
                if (campaignId) {
                    data = await aiMonitoringService.getCampaignLogs(campaignId, 100);
                } else if (personaId) {
                    data = await aiMonitoringService.getExecutionLogs(personaId, 100);
                }

                setLogs(data.reverse()); // Oldest first

                if (data.length > 0 && !startTime) {
                    setStartTime(new Date(data[0].created_at).getTime());
                }
            } catch (error) {
                console.error("Failed to fetch logs:", error);
            }
        };

        fetchLogs();

        // Subscribe to changes
        const supabase = createClient();

        let filter = "";
        if (campaignId) filter = `campaign_id=eq.${campaignId}`;
        else if (personaId) filter = `persona_id=eq.${personaId}`;

        const channel = supabase
            .channel(`ai-logs-${campaignId || personaId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ai_execution_logs',
                    filter: filter
                },
                (payload) => {
                    console.log('New Log received!', payload);
                    const newLog = payload.new as AIExecutionLog;
                    setLogs((prev) => [...prev, newLog]);

                    if (!startTime) {
                        setStartTime(new Date(newLog.created_at).getTime());
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [personaId, campaignId]);

    const formatTimeOffset = (timestamp: string) => {
        if (!startTime) return "00:00s";
        const diff = new Date(timestamp).getTime() - startTime;
        const seconds = Math.floor(diff / 1000);
        return `00:${seconds.toString().padStart(2, '0')}s`;
    };

    return (
        <Card className={`bg-slate-950 border-slate-800 text-slate-200 shadow-2xl ${className}`}>
            <CardHeader className="bg-slate-900/50 border-b border-slate-800 py-3 px-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-purple-400" />
                    <CardTitle className="text-sm font-mono uppercase tracking-wider text-slate-400">
                        Neural Trace Logs
                    </CardTitle>
                </div>
                {status === 'running' && (
                    <Badge variant="outline" className="animate-pulse border-purple-500 text-purple-400 text-[10px] uppercase">
                        Live Processing
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[400px] w-full p-4 relative">
                    <div className="space-y-4">
                        {logs.length === 0 && (
                            <div className="text-center text-slate-600 font-mono text-xs py-10">
                                Waiting for neural activity...
                            </div>
                        )}

                        {logs.map((log) => (
                            <div key={log.id} className="flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Time Column */}
                                <div className="min-w-[50px] text-[10px] font-mono text-slate-600 pt-1 text-right">
                                    {formatTimeOffset(log.created_at)}
                                </div>

                                {/* Timeline Line */}
                                <div className="relative flex flex-col items-center">
                                    <div className={`
                                        w-2 h-2 rounded-full z-10 
                                        ${log.tool_calls ? 'bg-blue-500' : 'bg-purple-500'}
                                        ${!log.is_success ? 'bg-red-500' : ''}
                                    `} />
                                    <div className="w-[1px] h-full bg-slate-800 absolute top-2 bottom-[-16px] group-last:hidden" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-2 min-w-0">
                                    {/* Header */}
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-bold ${log.tool_calls ? 'text-blue-400' : 'text-purple-400'}`}>
                                            {log.agent_role}
                                        </span>
                                        {log.tool_calls && (
                                            <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-blue-900/30 text-blue-300 border-blue-800">
                                                <Wrench className="w-2 h-2 mr-1" />
                                                {typeof log.tool_calls === 'string' ? log.tool_calls : JSON.stringify(log.tool_calls)}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Body */}
                                    <div className="text-sm text-slate-300 font-mono bg-slate-900/50 p-2 rounded border border-slate-800/50">
                                        {log.tool_calls ? (
                                            <Accordion type="single" collapsible className="w-full border-none">
                                                <AccordionItem value="item-1" className="border-none">
                                                    <AccordionTrigger className="py-0 text-xs text-slate-500 hover:text-slate-300 hover:no-underline">
                                                        Show Tool Input
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pt-2">
                                                        <pre className="text-[10px] text-green-400 bg-black/50 p-2 rounded overflow-x-auto">
                                                            {log.raw_input || "No input data"}
                                                        </pre>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        ) : (
                                            <div className="whitespace-pre-wrap break-words opacity-90 leading-relaxed">
                                                {log.raw_output || "Processing..."}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
