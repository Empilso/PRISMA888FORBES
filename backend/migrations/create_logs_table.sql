-- Create Table
CREATE TABLE IF NOT EXISTS "public"."ai_execution_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "persona_id" UUID NOT NULL,
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

-- Create Index
CREATE UNIQUE INDEX IF NOT EXISTS "ai_execution_logs_trace_id_key" ON "public"."ai_execution_logs"("trace_id");

-- Add ForeignKey with CASCADE (Applying the fix directly here)
DO $$ BEGIN
    ALTER TABLE "public"."ai_execution_logs" ADD CONSTRAINT "ai_execution_logs_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enable RLS
ALTER TABLE "public"."ai_execution_logs" ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ai_execution_logs' AND policyname = 'Enable all for service role'
    ) THEN
        CREATE POLICY "Enable all for service role" ON "ai_execution_logs" TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ai_execution_logs' AND policyname = 'Enable read for anon'
    ) THEN
        CREATE POLICY "Enable read for anon" ON "ai_execution_logs" FOR SELECT TO anon USING (true);
    END IF;
END $$;
