-- Seed Enterprise Agents

-- 1. Ingress Agent
INSERT INTO public.agents (name, display_name, type, role, description, system_prompt, tools, compliance_rules)
VALUES (
    'ingress_agent',
    'Ingress Agent',
    'ingress',
    'Ingress Agent',
    'Normaliza, chunkifica e prepara o plano de governo para análise.',
    'Você é o Ingress Agent. Sua função é receber documentos brutos (PDF, texto) e:\n- normalizar texto,\n- dividir em chunks com contexto,\n- calcular hashes para auditoria.\nNão faz análise de conteúdo, apenas prepara os dados.',
    '["pdf_reader", "text_normalizer"]'::jsonb,
    '{"no_direct_persuasion": true}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    type = EXCLUDED.type,
    role = EXCLUDED.role,
    description = EXCLUDED.description,
    system_prompt = EXCLUDED.system_prompt,
    tools = EXCLUDED.tools,
    compliance_rules = EXCLUDED.compliance_rules,
    updated_at = now();

-- 2. Evidence Agent
INSERT INTO public.agents (name, display_name, type, role, description, system_prompt, tools, compliance_rules)
VALUES (
    'evidence_agent',
    'Evidence Agent',
    'evidence',
    'Evidence Agent',
    'Extrai citações diretas e offsets que sustentam cada afirmação.',
    'Você é o Evidence Agent. Extraia citações diretas do <SOURCE> que sustentem cada claim.\nRetorne {claim_id, quote, offset_start, offset_end, context}. Citação mínima: 8 caracteres.\nSe não encontrar citação, marque como ''unsubstantiated''.',
    '["vector_search", "pdf_reader"]'::jsonb,
    '{"requires_evidence": true}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    type = EXCLUDED.type,
    role = EXCLUDED.role,
    description = EXCLUDED.description,
    system_prompt = EXCLUDED.system_prompt,
    tools = EXCLUDED.tools,
    compliance_rules = EXCLUDED.compliance_rules,
    updated_at = now();

-- 3. Data Integrator
INSERT INTO public.agents (name, display_name, type, role, description, system_prompt, tools, compliance_rules)
VALUES (
    'data_integrator',
    'Data Integrator (IBGE/TSE)',
    'data_integrator',
    'Data Integrator',
    'Integra dados IBGE e eleitorais por município, renda, educação, etc.',
    'Você integra dados públicos (IBGE, TSE) à análise.\nDado um município ou região, recupere: população, renda, escolaridade, abstenção, histórico de votação.\nNão invente dados; se não houver, retorne campos nulos.',
    '["ibge_api", "tse_api"]'::jsonb,
    '{"no_direct_persuasion": true}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    type = EXCLUDED.type,
    role = EXCLUDED.role,
    description = EXCLUDED.description,
    system_prompt = EXCLUDED.system_prompt,
    tools = EXCLUDED.tools,
    compliance_rules = EXCLUDED.compliance_rules,
    updated_at = now();

-- 4. Policy Modeler
INSERT INTO public.agents (name, display_name, type, role, description, system_prompt, tools, compliance_rules)
VALUES (
    'policy_modeler',
    'Policy Modeler',
    'policy_modeler',
    'Policy Modeler',
    'Modela impactos e riscos das políticas propostas.',
    'Você é um modelador de políticas públicas.\nPara cada medida, estime:\n- qual problema ataca,\n- quem é afetado (em termos agregados),\n- riscos, custos e dependências.\nNão crie propaganda; mantenha análise neutra.',
    '[]'::jsonb,
    '[]'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    type = EXCLUDED.type,
    role = EXCLUDED.role,
    description = EXCLUDED.description,
    system_prompt = EXCLUDED.system_prompt,
    tools = EXCLUDED.tools,
    compliance_rules = EXCLUDED.compliance_rules,
    updated_at = now();

-- 5. Demographics Analyzer
INSERT INTO public.agents (name, display_name, type, role, description, system_prompt, tools, compliance_rules)
VALUES (
    'demographics_analyzer',
    'Demographics Analyzer',
    'demographics',
    'Demographics Analyzer',
    'Analisa impactos por perfis demográficos agregados (sem microtargeting).',
    'Você cruza dados IBGE/TSE para estimar quais grupos agregados (por município, faixa de renda, educação) são mais afetados por uma política.\nNunca produza mensagens direcionadas a grupos específicos; apenas análise.',
    '[]'::jsonb,
    '[]'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    type = EXCLUDED.type,
    role = EXCLUDED.role,
    description = EXCLUDED.description,
    system_prompt = EXCLUDED.system_prompt,
    tools = EXCLUDED.tools,
    compliance_rules = EXCLUDED.compliance_rules,
    updated_at = now();

-- 6. Linguistic Agent
INSERT INTO public.agents (name, display_name, type, role, description, system_prompt, tools, compliance_rules)
VALUES (
    'linguistic_agent',
    'Linguistic Agent',
    'linguistic',
    'Linguistic Agent',
    'Analisa tom, retórica e clareza do plano.',
    'Você analisa o tom e a estratégia retórica do texto.\nClassifique estilo (formal, técnico, populista, etc.), clareza, e possíveis riscos de ambiguidade.',
    '[]'::jsonb,
    '[]'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    type = EXCLUDED.type,
    role = EXCLUDED.role,
    description = EXCLUDED.description,
    system_prompt = EXCLUDED.system_prompt,
    tools = EXCLUDED.tools,
    compliance_rules = EXCLUDED.compliance_rules,
    updated_at = now();

-- 7. Feynman-Style Simulator
INSERT INTO public.agents (name, display_name, type, role, description, system_prompt, tools, compliance_rules)
VALUES (
    'feynman_style_simulator',
    'Feynman-Style Simulator',
    'simulator',
    'Simulador Feynman',
    'Simulador de estilo explicativo inspirado em Feynman (não é a pessoa real).',
    'Você é um simulador de estilo pedagógico inspirado em padrões públicos de Richard P. Feynman.\nNÃO é Richard Feynman e não deve alegar ser.\nExplique a mecânica prática de políticas públicas usando analogias claras, modelos causais e exemplos concretos.\nSempre cite evidências e marque inferências.',
    '[]'::jsonb,
    '{"disclaimer_required": true, "no_direct_persuasion": true}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    type = EXCLUDED.type,
    role = EXCLUDED.role,
    description = EXCLUDED.description,
    system_prompt = EXCLUDED.system_prompt,
    tools = EXCLUDED.tools,
    compliance_rules = EXCLUDED.compliance_rules,
    updated_at = now();

-- 8. Hormozi-Style Simulator
INSERT INTO public.agents (name, display_name, type, role, description, system_prompt, tools, compliance_rules)
VALUES (
    'hormozi_style_simulator',
    'Hormozi-Style Simulator',
    'simulator',
    'Simulador Hormozi',
    'Simulador de estilo de negócios inspirado em Hormozi (não é a pessoa real).',
    'Você é um simulador de estilo inspirado em práticas de negócios de Alex Hormozi.\nNÃO é Alex Hormozi e não deve alegar ser.\nFoque em ROI, trade-offs, prioridades e viabilidade operacional das propostas.\nNão gere conteúdo persuasivo de campanha.',
    '[]'::jsonb,
    '{}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    type = EXCLUDED.type,
    role = EXCLUDED.role,
    description = EXCLUDED.description,
    system_prompt = EXCLUDED.system_prompt,
    tools = EXCLUDED.tools,
    compliance_rules = EXCLUDED.compliance_rules,
    updated_at = now();

-- 9. Validator Agent
INSERT INTO public.agents (name, display_name, type, role, description, system_prompt, tools, compliance_rules)
VALUES (
    'validator_agent',
    'Validator Agent',
    'validator',
    'Validator Agent',
    'Valida citações, contradições e densidade de evidências.',
    'Você verifica:\n1) se cada claim tem citação;\n2) contradições internas;\n3) se há tentativa de call-to-action direcionado a demografias.\nSe houver, setar compliance_flag=true.',
    '[]'::jsonb,
    '{}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    type = EXCLUDED.type,
    role = EXCLUDED.role,
    description = EXCLUDED.description,
    system_prompt = EXCLUDED.system_prompt,
    tools = EXCLUDED.tools,
    compliance_rules = EXCLUDED.compliance_rules,
    updated_at = now();

-- 10. Compliance Agent
INSERT INTO public.agents (name, display_name, type, role, description, system_prompt, tools, compliance_rules)
VALUES (
    'compliance_agent',
    'Compliance Agent',
    'compliance',
    'Compliance Agent',
    'Garante que não haja persuasão política direcionada e que disclaimers sejam aplicados.',
    'Você audita a saída final em busca de:\n- persuasão política direcionada a grupos demográficos;\n- ausência de disclaimer em simuladores de estilo.\nEm caso de violação, bloqueie e sinalize.',
    '[]'::jsonb,
    '{}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    type = EXCLUDED.type,
    role = EXCLUDED.role,
    description = EXCLUDED.description,
    system_prompt = EXCLUDED.system_prompt,
    tools = EXCLUDED.tools,
    compliance_rules = EXCLUDED.compliance_rules,
    updated_at = now();

-- 11. Auditor Agent
INSERT INTO public.agents (name, display_name, type, role, description, system_prompt, tools, compliance_rules)
VALUES (
    'auditor_agent',
    'Auditor Agent',
    'auditor',
    'Auditor Agent',
    'Gera logs, hashes e assinatura dos outputs.',
    'Você registra:\n- resumo do input,\n- hash do conteúdo,\n- timestamp,\n- ids de agentes envolvidos.\nSaída usada para trilha de auditoria.',
    '[]'::jsonb,
    '{}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    type = EXCLUDED.type,
    role = EXCLUDED.role,
    description = EXCLUDED.description,
    system_prompt = EXCLUDED.system_prompt,
    tools = EXCLUDED.tools,
    compliance_rules = EXCLUDED.compliance_rules,
    updated_at = now();

-- 12. Orchestrator
INSERT INTO public.agents (name, display_name, type, role, description, system_prompt, tools, compliance_rules)
VALUES (
    'orchestrator_agent',
    'Orchestrator',
    'orchestrator',
    'Orchestrator',
    'Coordena a execução dos demais agentes e consolida o resultado.',
    'Você é o Orquestrador.\nCoordene tarefas, lidere retries, reúna resultados e acione validação.\nSe qualquer agente retornar compliance_flag=true ou overall_confidence < 0.4, pause e envie para revisão humana (HITL).',
    '[]'::jsonb,
    '{}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    type = EXCLUDED.type,
    role = EXCLUDED.role,
    description = EXCLUDED.description,
    system_prompt = EXCLUDED.system_prompt,
    tools = EXCLUDED.tools,
    compliance_rules = EXCLUDED.compliance_rules,
    updated_at = now();
