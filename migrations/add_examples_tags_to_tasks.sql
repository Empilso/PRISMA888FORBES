-- Migration: Add examples, tags, pillar, phase columns to tasks table
-- Run this in Supabase SQL Editor if columns don't exist

-- Add examples column (JSONB array of strings)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS examples JSONB DEFAULT '[]'::jsonb;

-- Add tags column (JSONB array of strings)  
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Add pillar column (text, optional)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS pillar TEXT;

-- Add phase column (text, optional)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS phase TEXT;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
AND column_name IN ('examples', 'tags', 'pillar', 'phase');
