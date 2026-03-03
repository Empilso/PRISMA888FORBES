-- Create table for Enterprise Agents
create table if not exists public.agents (
    id uuid default gen_random_uuid() primary key,
    name text not null unique, -- Slug identifier (e.g., 'auditor-lvl1')
    display_name text not null,
    role text not null, -- e.g., 'Senior Auditor'
    type text not null default 'generic', -- e.g., 'evidence', 'policy', 'simulator'
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

-- Create policies (permissive for now, similar to personas)
create policy "Allow read access for all users"
    on public.agents for select
    using (true);

create policy "Allow insert access for all users"
    on public.agents for insert
    with check (true);

create policy "Allow update access for all users"
    on public.agents for update
    using (true);

create policy "Allow delete access for all users"
    on public.agents for delete
    using (true);

-- Enable Realtime
alter publication supabase_realtime add table public.agents;

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger handle_agents_updated_at
    before update on public.agents
    for each row
    execute procedure public.handle_updated_at();
