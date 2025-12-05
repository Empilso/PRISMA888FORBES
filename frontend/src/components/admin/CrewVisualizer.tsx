"use client";

import React, { useEffect, useMemo } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, Position, MarkerType, Node, Edge, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Types (mirrored from page.tsx for now)
interface AgentConfig {
    role: string;
    goal: string;
    backstory: string;
}

interface PersonaConfig {
    analyst: AgentConfig;
    strategist: AgentConfig;
    planner: AgentConfig;
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
    activeExecutionAgent?: string | null; // ⭐ NOVO
    onNodeClick: (nodeId: string | null) => void;
}

const CrewVisualizerContent: React.FC<CrewVisualizerProps> = ({ persona, selectedNodeId, activeExecutionAgent, onNodeClick }) => {
    const { fitView } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // 🔧 FIX: Memoize nodes generation to prevent recreation on every render
    const generatedNodes = useMemo(() => {
        if (!persona) return [];

        const { config } = persona;
        const isAnySelected = !!selectedNodeId;

        // Helper para verificar se está ativo na execução
        const isExecuting = (id: string) => id === activeExecutionAgent;

        const getNodeStyle = (id: string, baseColor: string, shadowColor: string) => {
            const isSelected = id === selectedNodeId;
            const opacity = isAnySelected && !isSelected ? 0.5 : 1;
            const scale = isSelected ? 1.1 : 1;
            const zIndex = isSelected ? 10 : 1;

            return {
                background: 'transparent', // Let the inner div handle background
                border: 'none',
                width: 240,
                opacity: opacity,
                transform: `scale(${scale})`,
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Bouncy effect
                zIndex: zIndex,
            };
        };

        return [
            {
                id: 'analyst',
                position: { x: 0, y: 0 },
                data: {
                    label: (
                        <div className={`relative w-full h-full overflow-hidden rounded-2xl transition-all duration-300 ${activeExecutionAgent === 'analyst'
                            ? 'ring-4 ring-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.8)] scale-110 z-50' // ⭐ EFEITO GLOW
                            : selectedNodeId === 'analyst'
                                ? 'ring-4 ring-blue-400 shadow-2xl shadow-blue-500/50 scale-105'
                                : 'shadow-xl hover:shadow-2xl'
                            }`}>
                            {/* Background Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700"></div>

                            {/* Character Container */}
                            <div className="relative h-full flex flex-col items-center justify-between p-4">
                                {/* Character "Portrait" Area */}
                                <div className="flex-1 flex items-center justify-center">
                                    <div className={`text-8xl transform transition-transform duration-300 ${selectedNodeId === 'analyst' ? 'scale-110 rotate-6' : 'hover:scale-105'
                                        }`}>
                                        🕵️‍♂️
                                    </div>
                                </div>

                                {/* Info Panel */}
                                <div className="w-full bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                                    <h3 className="font-black text-lg text-blue-900 text-center mb-1">ANALISTA</h3>
                                    <div className="text-xs font-semibold text-blue-700 text-center bg-blue-100 rounded px-2 py-1">
                                        {config.analyst.role}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                },
                style: { width: 250, height: 300 },
                type: 'default',
                sourcePosition: Position.Right,
            },
            {
                id: 'strategist',
                position: { x: 400, y: 0 },
                data: {
                    label: (
                        <div className={`relative w-full h-full overflow-hidden rounded-2xl transition-all duration-300 ${activeExecutionAgent === 'strategist'
                            ? 'ring-4 ring-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.8)] scale-110 z-50' // ⭐ EFEITO GLOW
                            : selectedNodeId === 'strategist'
                                ? 'ring-4 ring-purple-400 shadow-2xl shadow-purple-500/50 scale-105'
                                : 'shadow-xl hover:shadow-2xl'
                            }`}>
                            {/* Background Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-purple-500 to-purple-700"></div>

                            {/* Character Container */}
                            <div className="relative h-full flex flex-col items-center justify-between p-4">
                                {/* Character "Portrait" Area */}
                                <div className="flex-1 flex items-center justify-center">
                                    <div className={`text-8xl transform transition-transform duration-300 ${selectedNodeId === 'strategist' ? 'scale-110 rotate-6' : 'hover:scale-105'
                                        }`}>
                                        🧠
                                    </div>
                                </div>

                                {/* Info Panel */}
                                <div className="w-full bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                                    <h3 className="font-black text-lg text-purple-900 text-center mb-1">ESTRATEGISTA</h3>
                                    <div className="text-xs font-semibold text-purple-700 text-center bg-purple-100 rounded px-2 py-1">
                                        {config.strategist.role}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                },
                style: { width: 250, height: 300 },
                type: 'default',
                targetPosition: Position.Left,
                sourcePosition: Position.Right,
            },
            {
                id: 'planner',
                position: { x: 800, y: 0 },
                data: {
                    label: (
                        <div className={`relative w-full h-full overflow-hidden rounded-2xl transition-all duration-300 ${activeExecutionAgent === 'planner'
                            ? 'ring-4 ring-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.8)] scale-110 z-50' // ⭐ EFEITO GLOW
                            : selectedNodeId === 'planner'
                                ? 'ring-4 ring-emerald-400 shadow-2xl shadow-emerald-500/50 scale-105'
                                : 'shadow-xl hover:shadow-2xl'
                            }`}>
                            {/* Background Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700"></div>

                            {/* Character Container */}
                            <div className="relative h-full flex flex-col items-center justify-between p-4">
                                {/* Character "Portrait" Area */}
                                <div className="flex-1 flex items-center justify-center">
                                    <div className={`text-8xl transform transition-transform duration-300 ${selectedNodeId === 'planner' ? 'scale-110 rotate-6' : 'hover:scale-105'
                                        }`}>
                                        ⚡
                                    </div>
                                </div>

                                {/* Info Panel */}
                                <div className="w-full bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                                    <h3 className="font-black text-lg text-emerald-900 text-center mb-1">PLANEJADOR</h3>
                                    <div className="text-xs font-semibold text-emerald-700 text-center bg-emerald-100 rounded px-2 py-1">
                                        {config.planner.role}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                },
                style: { width: 250, height: 300 },
                type: 'default',
                targetPosition: Position.Left,
            },
        ];
    }, [persona, selectedNodeId, activeExecutionAgent]); // ⭐ Adicionada dependência activeExecutionAgent

    // 🔧 FIX: Memoize edges generation
    const generatedEdges = useMemo(() => {
        if (!persona) return [];

        return [
            {
                id: 'e1-2',
                source: 'analyst',
                target: 'strategist',
                animated: true,
                style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5, 5' },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#94a3b8',
                },
            },
            {
                id: 'e2-3',
                source: 'strategist',
                target: 'planner',
                animated: true,
                style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5, 5' },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#94a3b8',
                },
            },
        ];
    }, [persona]); // Só recria quando persona muda

    // 1. Effect to update Nodes and Edges (Now using memoized values)
    useEffect(() => {
        console.log("CrewVisualizer: Updating nodes from memoized values");
        setNodes(generatedNodes);
        setEdges(generatedEdges);
    }, [generatedNodes, generatedEdges, setNodes, setEdges]);

    // 2. Effect to handle FitView (Only when persona changes, not on selection)
    useEffect(() => {
        if (persona) {
            console.log("CrewVisualizer: Triggering FitView");
            // Force fit view multiple times to ensure it catches the rendered nodes
            const timer1 = setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
            const timer2 = setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 500);
            const timer3 = setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 1000); // Extra safe

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
                    <p>Selecione uma persona para visualizar a hierarquia da Crew.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full" style={{ minHeight: '500px' }}>
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
                fitViewOptions={{ padding: 0.2, includeHiddenNodes: true }}
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                attributionPosition="bottom-right"
                style={{ width: '100%', height: '100%' }}
            >
                <Background color="#aaa" gap={16} size={1} />
                <Controls position="bottom-left" />
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
