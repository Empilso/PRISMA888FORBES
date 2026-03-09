# SUPER PROMPT PARA IDE: ISOLAMENTO DE TENANT (FIX)

**Ação:** Corrigir vazamento de dados de outras cidades (Votorantim) no Dashboard do candidato.

---

### 🚨 O PROBLEMA:
O widget `election-results-widget.tsx` está buscando TODOS os registros da tabela `location_results` sem filtrar pelas localizações que pertencem à campanha ativa. Isso faz com que dados de Votorantim apareçam no dashboard de Senhor do Bonfim.

### 🛠️ TAREFA PARA A IDE IA:

#### No arquivo `frontend/src/components/dashboard/election-results-widget.tsx`:

1. **Refatore o fetch de dados** para garantir o isolamento por `campaignId`:
   - Atualmente, a consulta na linha ~38 está assim: `.from('location_results').select('candidate_name, votes')`.
   - **MUDE PARA**: Realizar um *Join* ou um filtro baseado nos `locations` da campanha.

2. **Código Sugerido (Lógica técnica):**
```typescript
// 1. Primeiro, buscar os IDs das localizações da campanha atual
const { data: campaignLocations } = await supabase
    .from('locations')
    .select('id')
    .eq('campaign_id', campaignId);

const locationIds = campaignLocations?.map(l => l.id) || [];

// 2. Agora, buscar resultados APENAS dessas localizações
const { data: rawData, error } = await supabase
    .from('location_results')
    .select('candidate_name, votes')
    .in('location_id', locationIds); // ISOLAMENTO UNITÁRIO POR TENANT
```

3. **Validação**: Certifique-se de que se `locationIds` estiver vazio, o widget exiba a mensagem amigável "Nenhum dado eleitoral encontrado para esta cidade".

---
**Critério de Sucesso:** No dashboard do Laércio (Senhor do Bonfim), NÃO deve aparecer nenhum dado de Weber Maganhato ou Votorantim. Apenas os dados importados para a campanha dele.
