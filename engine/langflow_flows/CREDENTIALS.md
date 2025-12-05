# 🔐 Credenciais - Forbes Campaign
# ⚠️ CONFIDENCIAL - NÃO COMPARTILHAR

Última atualização: 2025-11-27

## 🗄️ Supabase

**Projeto**: gsmmanjpsdburmntgpg
**URL**: https://gsmmanjpsdburmntgpg.supabase.co

### Chaves de Acesso

```bash
# Anon/Public Key (para leitura)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbW1hbmpwc2RiZndtbm10Z3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTcyNTMsImV4cCI6MjA3ODg3MzI1M30.3aN1W_wiMo1fin3UgYbHIisPw_-k7GRP6qIg8xvblp0

# Service Role Key (para escrita/admin)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbW1hbmpwc2RiZndtbm10Z3BnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI5NzI1MywiZXhwIjoyMDc4ODczMjUzfQ.kmXCryVGBRJ4FctN2tb0zJsTNFfI69D9uWCcndv-nDE

# URL do Projeto
SUPABASE_URL=https://gsmmanjpsdburmntgpg.supabase.co
```

### Tabelas Principais

- `candidates` - Dados dos candidatos
- `tasks` - Tarefas da campanha
- `campaigns` - Campanhas políticas
- `users` - Usuários do sistema

---

## 🤖 DeepSeek AI

**Plano**: Forbes
**Modelo**: deepseek-chat
**Endpoint**: https://api.deepseek.com

```bash
DEEPSEEK_API_KEY=sk-b4a58944452b4f239fecc60b4ba26c9f
```

**Custos**:
- Input: ~$0.00014/1K tokens
- Output: ~$0.00028/1K tokens
- Total estimado: ~50% mais barato que Gemini

---

## 🌊 Langflow

**Versão**: Latest
**Host**: http://localhost:7860
**API Endpoint**: http://localhost:7860/api/v1

```bash
LANGFLOW_API_KEY=sk-NPkae9kQtGMXFDK9qKqc_KYZdkh5kaekBuwVZTh7hHk
LANGFLOW_API_URL=http://localhost:7860/api/v1
LANGFLOW_HOST=0.0.0.0
LANGFLOW_PORT=7860
```

### Flows Disponíveis

1. **Supabase Research Crew**
   - Lê candidatos do Supabase
   - Organiza dados com DeepSeek
   - Faz pesquisas automáticas
   - Cria tarefas priorizadas
   - Salva no Supabase

---

## 📦 Variáveis de Ambiente Completas

Para configurar todo o sistema, use estas variáveis:

```bash
# Supabase
SUPABASE_URL=https://gsmmanjpsdburmntgpg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbW1hbmpwc2RiZndtbm10Z3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTcyNTMsImV4cCI6MjA3ODg3MzI1M30.3aN1W_wiMo1fin3UgYbHIisPw_-k7GRP6qIg8xvblp0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbW1hbmpwc2RiZndtbm10Z3BnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI5NzI1MywiZXhwIjoyMDc4ODczMjUzfQ.kmXCryVGBRJ4FctN2tb0zJsTNFfI69D9uWCcndv-nDE

# DeepSeek AI
DEEPSEEK_API_KEY=sk-b4a58944452b4f239fecc60b4ba26c9f
DEEPSEEK_API_URL=https://api.deepseek.com

# Langflow
LANGFLOW_API_KEY=sk-NPkae9kQtGMXFDK9qKqc_KYZdkh5kaekBuwVZTh7hHk
LANGFLOW_API_URL=http://localhost:7860/api/v1
LANGFLOW_HOST=0.0.0.0
LANGFLOW_PORT=7860

# Next.js Frontend
NEXT_PUBLIC_SUPABASE_URL=https://gsmmanjpsdburmntgpg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbW1hbmpwc2RiZndtbm10Z3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTcyNTMsImV4cCI6MjA3ODg3MzI1M30.3aN1W_wiMo1fin3UgYbHIisPw_-k7GRP6qIg8xvblp0
```

---

## 🔒 Segurança

### ⚠️ IMPORTANTE

- **NÃO** commite este arquivo no Git
- **NÃO** compartilhe as chaves publicamente
- **NÃO** use Service Role Key no frontend (apenas backend)
- **SEMPRE** use variáveis de ambiente em produção

### 🛡️ Boas Práticas

1. ✅ Use `.env` files para desenvolvimento local
2. ✅ Use secrets do servidor em produção
3. ✅ Rotacione chaves periodicamente
4. ✅ Monitore uso de API para detectar abusos
5. ✅ Implemente rate limiting

---

## 📞 Contatos

**Projeto**: PRISMA888 Forbes
**Ambiente**: Desenvolvimento
**Data de Criação**: 2025-11-27

---

**Gerado por**: Antigravity AI Assistant
**Status**: ✅ Ativo
