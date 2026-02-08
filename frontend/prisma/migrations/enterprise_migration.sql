-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "backstory" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tools" JSONB NOT NULL,
    "compliance_rules" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "campaign_id" TEXT,
    "agent_id" TEXT,
    "overrides" JSONB,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_execution_logs" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "ai_execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_execution_logs_trace_id_key" ON "ai_execution_logs"("trace_id");

-- AddForeignKey
ALTER TABLE "personas" ADD CONSTRAINT "personas_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_execution_logs" ADD CONSTRAINT "ai_execution_logs_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

