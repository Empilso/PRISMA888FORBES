
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv("/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/backend/.env")

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("❌ DATABASE_URL not found")
    exit(1)

import sys

if len(sys.argv) > 1:
    sql_file = sys.argv[1]
    print(f"📄 Reading SQL from {sql_file}...")
    with open(sql_file, "r") as f:
        sql = f.read()
else:
    print("⚠️ No SQL file specified. Running default migration...")
    sql = """
-- Create table for Enterprise Agents
create table if not exists public.agents (
    id uuid default gen_random_uuid() primary key,
    name text not null unique, -- Slug identifier
    display_name text not null,
    role text not null, -- e.g., 'Senior Auditor'
    type text not null default 'generic', -- e.g., 'evidence', 'policy'
    description text,
    system_prompt text not null, -- The core persona instructions
    tools jsonb default '[]'::jsonb, -- Array of tool names enabled
    knowledge_base jsonb default '[]'::jsonb, -- Array of doc references
    compliance_rules jsonb default '[]'::jsonb, -- Array of guardrails
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.agents enable row level security;

-- Create policies
do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'agents' and policyname = 'Allow read access for all users') then
        create policy "Allow read access for all users" on public.agents for select using (true);
    end if;
    
    if not exists (select 1 from pg_policies where tablename = 'agents' and policyname = 'Allow insert access for all users') then
        create policy "Allow insert access for all users" on public.agents for insert with check (true);
    end if;

    if not exists (select 1 from pg_policies where tablename = 'agents' and policyname = 'Allow update access for all users') then
        create policy "Allow update access for all users" on public.agents for update using (true);
    end if;

    if not exists (select 1 from pg_policies where tablename = 'agents' and policyname = 'Allow delete access for all users') then
        create policy "Allow delete access for all users" on public.agents for delete using (true);
    end if;
end $$;

-- Enable Realtime (optional, check if publication exists)
do $$
begin
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'agents') then
        alter publication supabase_realtime add table public.agents;
    end if;
exception when others then
    raise notice 'Publication supabase_realtime may not exist, skipping addition';
end $$;

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists handle_agents_updated_at on public.agents;
create trigger handle_agents_updated_at
    before update on public.agents
    for each row
    execute procedure public.handle_updated_at();
"""

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    cursor.execute(sql)
    conn.commit()
    print("✅ Migration applied successfully!")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"❌ Error applying migration: {e}")
    exit(1)
