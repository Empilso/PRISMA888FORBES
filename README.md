# PRISMA 888 - Sistema de Gestão de Campanhas Políticas

Sistema enterprise de inteligência artificial multi-agente para análise, estratégia e gestão de campanhas eleitorais.

## 🏗️ Arquitetura (Enterprise Stack)
- **Frontend**: Next.js 14/15, React 19, TailwindCSS, Radix UI (shadcn).
- **Backend**: FastAPI (Python), CrewAI (IA Conversacional), DeepSeek (LLM Principal).
- **Banco de Dados**: Supabase (PostgreSQL + RLS + Auth + Storage).
- **Automação**: Kestra para monitoramento e fluxos agendados.

## 🚀 Estrutura de Documentação
Para manter o padrão **Enterprise**, utilizamos uma estrutura de arquivos `.md` distribuída:
- `README.md`: Visão geral e stack.
- `ATRIBUTOS.md`: Definição técnica de banco, API e IA.
- `ROADMAP.md`: Histórico de progresso e visão futura.
- `AGENTES.md`: Blueprint dos especialistas.
- `docs/IA_WORKFLOW.md`: Protocolo obrigatório para agentes editores.
- `STATUS.md`: Arquivos locais em cada módulo com instruções ativas.

## ⚙️ Configuração Rápida
1. **Backend**:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn src.main:app --reload --env-file .env
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 🔐 Segurança
- RLS habilitado em todas as tabelas críticas.
- Autenticação via Supabase Auth + JWT Metadata.
- Proteção de rotas via Middleware global no Next.js.
