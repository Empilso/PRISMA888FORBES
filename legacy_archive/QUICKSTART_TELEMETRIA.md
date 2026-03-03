# 🚀 QUICK START - TELEMETRIA

## 📝 PASSO A PASSO PARA ATIVAR

### 1. Execute os SQLs no Supabase (EM ORDEM!)

#### 1.1 - Adicione coluna 'status' em analysis_runs
```bash
# Abra o arquivo:
cat add_status_to_analysis_runs.sql

# Copie TODO o conteúdo
# Cole no Supabase Dashboard > SQL Editor
# Execute ✅
```

#### 1.2 - Crie a tabela de logs
```bash
# Abra o arquivo:
cat create_agent_logs_table.sql

# Copie TODO o conteúdo
# Cole no Supabase Dashboard > SQL Editor
# Execute ✅
```

### 2. Habilite Realtime (Supabase Dashboard)
- Vá em: **Database > Replication**
- Encontre a tabela: `agent_logs`
- Clique em **"Enable Realtime"** (ou adicione à publicação `supabase_realtime`)

**OU execute este SQL:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_logs;
```

### 3. Configure OpenRouter API Key (Backend) - OPCIONAL
```bash
# Edite o arquivo .env no backend
nano /home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/backend/.env

# Adicione a linha:
OPENROUTER_API_KEY=sk-or-v1-SUA_CHAVE_AQUI
```

**Onde conseguir a chave:**
- Acesse: https://openrouter.ai/keys
- Crie uma nova API Key
- Copie e cole no `.env`

**OBS:** Se não adicionar, o sistema vai usar o modelo padrão `gpt-4o-mini` que precisa de `OPENAI_API_KEY`

### 4. O Backend já está rodando! ✅
```bash
# Verifique se está rodando:
curl http://localhost:8000/docs

# Se estiver, verá o HTML do Swagger UI
# Não precisa reiniciar, o --reload detecta mudanças automaticamente
```

### 5. Teste no Frontend
1. Acesse: http://localhost:3000/admin/campaign/ALGUM_ID/setup
2. Clique em **"Gerar Nova Análise"**
3. Selecione qualquer **Persona** (ex: Maquiavel)
4. Clique em **"Iniciar Geração"**
5. **Veja os logs aparecendo em tempo real!** 🎉

---

## 🐛 TROUBLESHOOTING

### ❌ Erro: "Could not find the 'status' column"
**Solução:** Execute `add_status_to_analysis_runs.sql` no Supabase

### ❌ Erro: "Table 'agent_logs' does not exist"
**Solução:** Execute `create_agent_logs_table.sql` no Supabase

### Logs não aparecem?
**Checklist:**
- [ ] SQL 1 (`add_status_to_analysis_runs.sql`) executado?
- [ ] SQL 2 (`create_agent_logs_table.sql`) executado?
- [ ] Realtime habilitado? (Database > Replication)
- [ ] Backend rodando? (http://localhost:8000/docs deve abrir)
- [ ] Frontend rodando? (http://localhost:3000 deve abrir)

### Vejo "Aguardando logs..." mas nada acontece?
**Possível causa:** Backend teve erro ao iniciar a crew.

**Como verificar:**
```bash
# Veja os logs do terminal do backend
# Procure por erros como:
# - "OPENROUTER_API_KEY não configurada"
# - "OPENAI_API_KEY não configurada"
# - "No module named 'langchain'"
```

### Como testar se o Realtime está funcionando?
**Teste manual:**
```sql
-- No Supabase SQL Editor, insira um log de teste:
INSERT INTO public.agent_logs (campaign_id, agent_name, message, status)
VALUES ('69397999-075a-473a-8904-a156e9749916', 'System', '🧪 TESTE REALTIME', 'info');

-- Abra o console no frontend
-- Se aparecer "🧪 TESTE REALTIME", está funcionando! ✅
```

---

## 📊 ARQUIVOS CRIADOS/MODIFICADOS

### Migrations SQL (EXECUTE PRIMEIRO!)
- 🆕 `add_status_to_analysis_runs.sql` - **EXECUTE PRIMEIRO!**
- 🆕 `create_agent_logs_table.sql` - **EXECUTE DEPOIS!**

### Backend
- ✅ `backend/src/crew/genesis_crew.py` - Logger + Fallback de persona
- ✅ `backend/src/api/genesis.py` - Criação de run_id + Retorno para frontend

### Frontend
- ✅ `frontend/src/components/admin/ExecutionConsole.tsx` - **NOVO**
- ✅ `frontend/src/components/ui/scroll-area.tsx` - **NOVO**
- ✅ `frontend/src/components/campaign/GeneratorDialog.tsx` - Integração do console

---

## ⚡ RESUMO ULTRA-RÁPIDO

```bash
# 1. Execute os 2 SQLs no Supabase (em ordem!)
# 2. Habilite Realtime para agent_logs
# 3. Teste no frontend
# 4. Lucro! 💰
```

**👉 PRÓXIMO PASSO:** Execute os SQLs e veja a mágica acontecer!
