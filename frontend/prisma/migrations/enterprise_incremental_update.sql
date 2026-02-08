-- 1. Tabela Agents: Adição Segura de Colunas
DO $$
BEGIN
    -- version
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'version') THEN
        ALTER TABLE "agents" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
    END IF;

    -- tools
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'tools') THEN
        ALTER TABLE "agents" ADD COLUMN "tools" JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    -- compliance_rules
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'compliance_rules') THEN
        ALTER TABLE "agents" ADD COLUMN "compliance_rules" JSONB;
    END IF;

    -- is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'is_active') THEN
        ALTER TABLE "agents" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
    END IF;

    -- metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'metadata') THEN
        ALTER TABLE "agents" ADD COLUMN "metadata" JSONB;
    END IF;
END $$;

-- 2. Tabela Personas: Adição Segura de Colunas e FK
DO $$
BEGIN
    -- agent_id (Permitindo Nulo inicialmente para não quebrar legados)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personas' AND column_name = 'agent_id') THEN
        ALTER TABLE "personas" ADD COLUMN "agent_id" UUID;
        -- FK Constraint (apenas se não existir)
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'personas_agent_id_fkey') THEN
           ALTER TABLE "personas" ADD CONSTRAINT "personas_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;

    -- campaign_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personas' AND column_name = 'campaign_id') THEN
        ALTER TABLE "personas" ADD COLUMN "campaign_id" TEXT;
    END IF;

    -- overrides
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personas' AND column_name = 'overrides') THEN
        ALTER TABLE "personas" ADD COLUMN "overrides" JSONB;
    END IF;

    -- status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personas' AND column_name = 'status') THEN
        ALTER TABLE "personas" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'idle';
    END IF;
END $$;

-- 3. Tabela de Logs (Nova)
CREATE TABLE IF NOT EXISTS "ai_execution_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "persona_id" TEXT NOT NULL,
    "trace_id" TEXT NOT NULL,
    "step_name" TEXT NOT NULL,
    "agent_role" TEXT NOT NULL,
    "model_used" TEXT NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "raw_input" TEXT NOT NULL,
    "raw_output" TEXT NOT NULL,
    "tool_calls" JSONB,
    "is_success" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_execution_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_execution_logs_trace_id_key" UNIQUE ("trace_id"),
    CONSTRAINT "ai_execution_logs_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Índices Recomendados
CREATE INDEX IF NOT EXISTS "idx_logs_persona_created" ON "ai_execution_logs"("persona_id", "created_at" DESC);
