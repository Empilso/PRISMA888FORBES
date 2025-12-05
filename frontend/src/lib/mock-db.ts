// Banco de Dados Mockado Centralizado
// Objetivo: Facilitar a substituição futura por hooks do Orval/Supabase

export interface Task {
    id: string;
    title: string;
    description: string;
    status: "pending" | "in_progress" | "review" | "completed";
    priority: "low" | "medium" | "high" | "urgent";
    assignee?: {
        name: string;
        avatar?: string;
    };
    dueDate?: string;
    tags: string[];
    aiSuggestion?: string;
    comments: number;
    attachments: number;
    createdAt: string;
}

export const MOCK_TASKS: Task[] = [
    {
        id: "1",
        title: "Definir identidade visual da campanha",
        description: "Criar paleta de cores, tipografia e logo para materiais impressos e digitais.",
        status: "completed",
        priority: "high",
        assignee: { name: "Ana Silva" },
        dueDate: "2024-08-15T00:00:00.000Z",
        tags: ["Design", "Branding"],
        comments: 3,
        attachments: 2,
        createdAt: "2024-08-01T10:00:00.000Z"
    },
    {
        id: "2",
        title: "Mapeamento de lideranças locais",
        description: "Identificar e cadastrar líderes comunitários nos bairros prioritários.",
        status: "in_progress",
        priority: "urgent",
        assignee: { name: "Carlos Souza" },
        dueDate: "2024-08-20T00:00:00.000Z",
        tags: ["Campo", "Articulação"],
        aiSuggestion: "Focar no bairro Centro, onde a rejeição é maior.",
        comments: 5,
        attachments: 0,
        createdAt: "2024-08-02T14:30:00.000Z"
    },
    {
        id: "3",
        title: "Redação do manifesto de campanha",
        description: "Escrever o texto base para o site e redes sociais.",
        status: "review",
        priority: "high",
        assignee: { name: "Mariana Costa" },
        dueDate: "2024-08-18T00:00:00.000Z",
        tags: ["Conteúdo", "Estratégia"],
        comments: 1,
        attachments: 1,
        createdAt: "2024-08-03T09:15:00.000Z"
    },
    {
        id: "4",
        title: "Configurar impulsionamento no Facebook",
        description: "Criar contas de anúncios e definir públicos-alvo.",
        status: "pending",
        priority: "medium",
        tags: ["Marketing", "Ads"],
        comments: 0,
        attachments: 0,
        createdAt: "2024-08-05T11:00:00.000Z"
    },
    {
        id: "5",
        title: "Organizar evento de lançamento",
        description: "Reservar local, contratar som e convidar imprensa.",
        status: "in_progress",
        priority: "urgent",
        assignee: { name: "Pedro Santos" },
        dueDate: "2024-08-25T00:00:00.000Z",
        tags: ["Eventos", "Logística"],
        aiSuggestion: "Verificar previsão do tempo para data do evento.",
        comments: 8,
        attachments: 4,
        createdAt: "2024-08-06T16:45:00.000Z"
    }
];

export const MOCK_LOCATIONS = [
    { id: 1, name: "EE. PROF. DANIEL VERANO", address: "Rua Carlos Luvison, 180 - Parque Bela Vista", position: [-23.550520, -46.633308], color: "green", votes: 4539, meta: 908 },
    { id: 2, name: "EM. DR. JOSÉ FERRAZ", address: "Av. Brasil, 500 - Centro", position: [-23.555520, -46.638308], color: "red", votes: 1200, meta: 240 },
    { id: 3, name: "COLÉGIO OBJETIVO", address: "Rua XV de Novembro, 100", position: [-23.545520, -46.628308], color: "yellow", votes: 3100, meta: 620 },
    { id: 4, name: "ESCOLA ESTADUAL VILA NOVA", address: "Rua das Flores, 200", position: [-23.560520, -46.643308], color: "green", votes: 5000, meta: 1000 },
    { id: 5, name: "CENTRO COMUNITÁRIO", address: "Praça Central, 1", position: [-23.540520, -46.623308], color: "blue", votes: 200, meta: 40 },
];

export const MOCK_CAMPAIGN = {
    id: "camp_123",
    name: "Campanha 2024",
    candidate: "João da Silva",
    role: "Prefeito",
    city: "São Paulo - SP"
};
