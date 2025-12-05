-- Initialize pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create schema for LangGraph checkpoints
CREATE SCHEMA IF NOT EXISTS langgraph;

-- Grant permissions
GRANT ALL ON SCHEMA langgraph TO sheepstack_user;
GRANT ALL ON SCHEMA public TO sheepstack_user;

-- Create checkpoints table for LangGraph
CREATE TABLE IF NOT EXISTS langgraph.checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    parent_checkpoint_id TEXT,
    checkpoint JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (thread_id, checkpoint_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_checkpoints_thread_id ON langgraph.checkpoints(thread_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_created_at ON langgraph.checkpoints(created_at);

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'SheepStack Database initialized successfully';
    RAISE NOTICE 'Extensions: vector';
    RAISE NOTICE 'Schemas: public, langgraph';
END $$;
