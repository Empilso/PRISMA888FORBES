-- Migration: Add examples column to tasks table
-- Run this in Supabase SQL Editor or via psql

-- Add examples column (array of text) with empty array default
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS examples TEXT[] DEFAULT '{}';

-- Verify column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'examples';
