-- Drop existing ForeignKey
ALTER TABLE "public"."ai_execution_logs" DROP CONSTRAINT "ai_execution_logs_persona_id_fkey";

-- Add new ForeignKey with CASCADE
ALTER TABLE "public"."ai_execution_logs" ADD CONSTRAINT "ai_execution_logs_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
