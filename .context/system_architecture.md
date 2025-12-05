# System Architecture - Prisma 888 ("Hawk Stack")

## Overview
Prisma 888 is built on the "Hawk Stack", a powerful combination of code-first orchestration, vector-enabled storage, and advanced agentic frameworks.

## Components

### 1. Orchestration Layer: Kestra
- **Role**: Central nervous system.
- **Responsibility**: Scheduling, triggering, and managing the execution of all data pipelines and agentic workflows.
- **Integration**: Connects directly to Docker containers and Python scripts.

### 2. Data Layer: Postgres + pgvector
- **Role**: Long-term memory and structured data storage.
- **Responsibility**: Storing relational business data and vector embeddings for semantic search and RAG.

### 3. Agentic Layer: LangGraph & CrewAI
- **LangGraph**: Used for stateful, multi-turn agent workflows requiring complex control flow (loops, conditionals).
- **CrewAI**: Used for role-based agent teams collaborating on specific tasks.

### 4. Application Layer
- **Core**: Python modules in `src/core`.
- **Interfaces**: APIs or UIs in `src/interface`.
