"use client";

import React, { useEffect, useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, Position, MarkerType, Node, Edge, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import {
    MagnifyingGlass,
    Brain,
    Lightning,
    PenNib,
    Gavel,
    Flask,
    Robot,
    Smiley
} from "@phosphor-icons/react";

// Types
interface AgentConfig {
    id?: string;
    role: string;
    goal: string;
    backstory: string;
    icon?: string;
    color?: string;
}

interface PersonaConfig {
    // Configuração dinâmica de agentes (novo formato)
    agents?: Record<string, AgentConfig>;
    template_id?: string;
    template_name?: string;
    process_type?: 'sequential' | 'hierarchical';

    // Legacy support (formato antigo com 3 agentes fixos)
    analyst?: AgentConfig;
    strategist?: AgentConfig;
    planner?: AgentConfig;
}

interface Persona {
    id: string;
    name: string;
    display_name: string;
    description: string;
    icon: string;
    config: PersonaConfig;
    is_active: boolean;
}

interface CrewVisualizerProps {
    persona: Persona | null;
    selectedNodeId: string | null;
    activeExecutionAgent?: string | null;
    onNodeClick: (nodeId: string | null) => void;
}

// Mapeamento de cores e ícones para agentes
const AGENT_STYLES: Record<string, { icon: React.ElementType; fromColor: string; toColor: string; textColor: string; bgLight: string }> = {
    analyst: { icon: MagnifyingGlass, fromColor: 'from-blue-400', toColor: 'to-blue-700', textColor: 'text-blue-900', bgLight: 'bg-blue-100' },
    strategist: { icon: Brain, fromColor: 'from-purple-400', toColor: 'to-purple-700', textColor: 'text-purple-900', bgLight: 'bg-purple-100' },
    planner: { icon: Lightning, fromColor: 'from-emerald-400', toColor: 'to-emerald-700', textColor: 'text-emerald-900', bgLight: 'bg-emerald-100' },
    writer: { icon: PenNib, fromColor: 'from-orange-400', toColor: 'to-orange-700', textColor: 'text-orange-900', bgLight: 'bg-orange-100' },
    psychologist: { icon: Smiley, fromColor: 'from-pink-400', toColor: 'to-pink-700', textColor: 'text-pink-900', bgLight: 'bg-pink-100' },
    critic: { icon: Gavel, fromColor: 'from-red-400', toColor: 'to-red-700', textColor: 'text-red-900', bgLight: 'bg-red-100' },
    researcher: { icon: Flask, fromColor: 'from-teal-400', toColor: 'to-teal-700', textColor: 'text-teal-900', bgLight: 'bg-teal-100' },
    default: { icon: Robot, fromColor: 'from-gray-400', toColor: 'to-gray-700', textColor: 'text-gray-900', bgLight: 'bg-gray-100' },
};

// Extrai os agentes do config (suporta novo formato dinâmico E legado)
function extractAgents(config: PersonaConfig): { id: string; agent: AgentConfig }[] {
    // Novo formato: config.agents é um objeto
    if (config.agents && typeof config.agents === 'object') {
        return Object.entries(config.agents).map(([id, agent]) => ({
            id,
            agent: agent as AgentConfig
        }));
    }

    // Fallback: formato legado (3 agentes fixos)
    const legacyAgents: { id: string; agent: AgentConfig }[] = [];
    if (config.analyst) legacyAgents.push({ id: 'analyst', agent: config.analyst });
    if (config.strategist) legacyAgents.push({ id: 'strategist', agent: config.strategist });
    if (config.planner) legacyAgents.push({ id: 'planner', agent: config.planner });
    return legacyAgents;
}

const CrewVisualizerContent: React.FC<CrewVisualizerProps> = ({ persona, selectedNodeId, activeExecutionAgent, onNodeClick }) => {
    const { fitView } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Gera nós dinamicamente baseado nos agentes
    const generatedNodes = useMemo(() => {
        if (!persona) return [];

        const agents = extractAgents(persona.config);
        const nodeWidth = 220;
        const nodeHeight = 280;
        const nodeSpacing = 280; // Espaço horizontal entre nós

        // Se muitos agentes, organiza em grid
        const maxPerRow = agents.length <= 4 ? agents.length : Math.ceil(agents.length / 2);

        return agents.map((entry, index) => {
            const { id, agent } = entry;
            const style = AGENT_STYLES[id] || AGENT_STYLES.default;

            // Calcula posição (grid ou linha)
            const row = Math.floor(index / maxPerRow);
            const col = index % maxPerRow;
            const x = col * nodeSpacing;
            const y = row * (nodeHeight + 80);

            const isExecuting = activeExecutionAgent === id;
            const isSelected = selectedNodeId === id;
            const isAnySelected = !!selectedNodeId;

            // Nome do agente para exibição
            const displayName = id.charAt(0).toUpperCase() + id.slice(1);
            const AgentIcon = style.icon;

            return {
                id,
                position: { x, y },
                data: {
                    label: (
                        <div className={`relative w-full h-full overflow-hidden rounded-2xl transition-all duration-300 ${isExecuting
                            ? 'ring-4 ring-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.8)] scale-110 z-50'
                            : isSelected
                                ? `ring-4 ring-${agent.color || 'blue'}-400 shadow-2xl scale-105`
                                : isAnySelected
                                    ? 'opacity-50'
                                    : 'shadow-xl hover:shadow-2xl'
                            }`}>
                            {/* Background Gradient */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${style.fromColor} via-${id === 'analyst' ? 'blue' : id}-500 ${style.toColor}`}></div>

                            {/* Character Container */}
                            <div className="relative h-full flex flex-col items-center justify-between p-4">
                                {/* Character "Portrait" Area */}
                                <div className="flex-1 flex items-center justify-center">
                                    <div className={`transform transition-transform duration-300 text-white ${isSelected ? 'scale-110 rotate-6' : 'hover:scale-105'
                                        }`}>
                                        <AgentIcon size={80} weight="duotone" />
                                    </div>
                                </div>

                                {/* Info Panel */}
                                <div className="w-full bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                                    <h3 className={`font-black text-base ${style.textColor} text-center mb-1 truncate`}>
                                        {displayName.toUpperCase()}
                                    </h3>
                                    <div className={`text-[10px] font-semibold ${style.textColor.replace('900', '700')} text-center ${style.bgLight} rounded px-2 py-1 truncate`}>
                                        {agent.role}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                },
                style: { width: nodeWidth, height: nodeHeight },
                type: 'default',
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
            };
        });
    }, [persona, selectedNodeId, activeExecutionAgent]);

    // Gera edges dinamicamente (conecta sequencialmente)
    const generatedEdges = useMemo(() => {
        if (!persona) return [];

        const agents = extractAgents(persona.config);
        const processType = persona.config.process_type || 'sequential';

        if (processType === 'hierarchical' && agents.length > 1) {
            // No modo hierárquico, primeiro agente (manager) conecta a todos
            const managerId = agents[0].id;
            return agents.slice(1).map((entry, index) => ({
                id: `e-${managerId}-${entry.id}`,
                source: managerId,
                target: entry.id,
                animated: true,
                style: { stroke: '#fbbf24', strokeWidth: 3, strokeDasharray: '8, 4' },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#fbbf24',
                },
            }));
        }

        // Modo sequencial: conecta em cadeia
        const edges: Edge[] = [];
        for (let i = 0; i < agents.length - 1; i++) {
            edges.push({
                id: `e${i}-${i + 1}`,
                source: agents[i].id,
                target: agents[i + 1].id,
                animated: true,
                style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5, 5' },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#94a3b8',
                },
            });
        }
        return edges;
    }, [persona]);

    // Effect para atualizar nodes e edges
    useEffect(() => {
        console.log("CrewVisualizer: Updating nodes dynamically, count:", generatedNodes.length);
        setNodes(generatedNodes);
        setEdges(generatedEdges);
    }, [generatedNodes, generatedEdges, setNodes, setEdges]);

    // Effect para fitView
    useEffect(() => {
        if (persona) {
            console.log("CrewVisualizer: Triggering FitView for", extractAgents(persona.config).length, "agents");
            const timer1 = setTimeout(() => fitView({ padding: 0.15, duration: 800 }), 100);
            const timer2 = setTimeout(() => fitView({ padding: 0.15, duration: 800 }), 500);
            const timer3 = setTimeout(() => fitView({ padding: 0.15, duration: 800 }), 1000);

            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
            };
        }
    }, [persona?.id, fitView]);

    if (!persona) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-muted/10">
                <div className="text-center text-muted-foreground">
                    <p>Selecione uma persona para visualizar a equipe.</p>
                </div>
            </div>
        );
    }

    const agentCount = extractAgents(persona.config).length;
    const processType = persona.config.process_type || 'sequential';

    return (
        <div className="h-full w-full relative" style={{ minHeight: '500px' }}>
            {/* Badge com info da equipe */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span className="text-xs bg-white/90 backdrop-blur px-2 py-1 rounded-full shadow border">
                    {agentCount} agentes
                </span>
                <span className={`text-xs px-2 py-1 rounded-full shadow border ${processType === 'hierarchical'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                    }`}>
                    {processType === 'hierarchical' ? '🎩 Hierárquico' : '🔗 Sequencial'}
                </span>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => onNodeClick(node.id)}
                onPaneClick={() => onNodeClick(null)}
                minZoom={0.1}
                maxZoom={1.5}
                fitView
                fitViewOptions={{ padding: 0.15, includeHiddenNodes: true }}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                attributionPosition="bottom-right"
                style={{ width: '100%', height: '100%' }}
            >
                <Background color="#e2e8f0" gap={20} size={1} />
                <Controls position="bottom-left" />
                <MiniMap
                    nodeColor={(node) => {
                        const id = node.id;
                        if (id === 'analyst') return '#3b82f6';
                        if (id === 'strategist') return '#8b5cf6';
                        if (id === 'planner') return '#10b981';
                        if (id === 'writer') return '#f97316';
                        if (id === 'psychologist') return '#ec4899';
                        if (id === 'critic') return '#ef4444';
                        if (id === 'researcher') return '#14b8a6';
                        return '#6b7280';
                    }}
                    maskColor="rgba(0, 0, 0, 0.08)"
                    position="bottom-right"
                    pannable
                    zoomable
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0'
                    }}
                />
            </ReactFlow>
        </div>
    );
};

const CrewVisualizer: React.FC<CrewVisualizerProps> = (props) => {
    return (
        <ReactFlowProvider>
            <CrewVisualizerContent {...props} />
        </ReactFlowProvider>
    );
};

export default CrewVisualizer;
