# SUPER PROMPT PARA IDE: MALHA IBGE, POSTGIS E LEAFLET (Enterprise)

**Ação:** Implementar o rendering otimizado de polígonos (bairros do IBGE - BA) sem travar o mapa do cliente, utilizando Supabase/PostGIS.

---

### 🚨 CONTEXTO (PARA A IA DA IDE):
O mestre do projeto deseja servir a malha de bairros da Bahia (shapefile/GeoJSON do IBGE `BA_bairros_CD2022`) no mapa do Prisma. 
**Regra Ouro:** Carregar tudo no frontend vai "congelar" a UI. O sistema deve ser Enterprise.
Nossa Stack: **Supabase (Postgres + PostGIS) + Next.js (Edge Routes) + Leaflet (React Leaflet)**.

### 🛠️ TAREFAS:

#### 1. [BANCO DE DADOS] Schema Dinâmico (PostGIS) no Supabase
Você deve criar um script SQL (ex: `migrations/202603XX_create_ibge_bairros.sql`) contendo:
- Tabela `ibge_bairros` com as colunas: `id` (uuid), `codigo_ibge_municipio` (text), `nome_bairro` (text), e `geom` (GEOMETRY(MultiPolygon, 4326)).
- **Índice Espacial (CRÍTICO):** Criar um índice GIST na coluna `geom` para que as buscas geográficas sejam ultrarrápidas.

#### 2. [BACKEND] Função RPC de GeoJSON Automático
Ao invés do Next.js montar os polígonos, vamos forçar o Postgres a fazer o trabalho duro.
- No mesmo script SQL, crie uma **Function (RPC)** chamada `get_bairros_geojson(municipio_codigo text)`.
- A função deve utilizar `ST_AsGeoJSON(geom)` e `jsonb_build_object` para retornar um FeatureCollection pronto.
- Dessa forma, o banco entrega o dado "mastigado" e leve.

#### 3. [FRONTEND] API Route (Proxy com Cache)
Criar o endpoint no Next.js (ex: `src/app/api/maps/bairros/[ibgeCode]/route.ts`):
- Ele deve chamar a RPC do Supabase: `supabase.rpc('get_bairros_geojson', { municipio_codigo: ibgeCode })`.
- Aplique Server-Side Cache (`Cache-Control: s-maxage=86400, stale-while-revalidate`) porque polígonos de bairros nunca mudam.

#### 4. [FRONTEND] Integração Leve e Controle UI no Leaflet
No componente onde o Mapa Eleitoral/Radar Social está implementado (`ElectoralMapFull.tsx` ou equivalente):
- Adicione o carregamento APENAS do município da campanha atual usando o novo endpoint recém-criado.
- Utilize a camada padrão dinâmica (como `GeoJSON` do react-leaflet ou `L.geoJSON`).
- Configure estilos com base na estética Apple/Premium (bordas finas `weight: 1`, opacidade baixa, e efeito translúcido sem travar CPU).
- **[NOVO REQUISITO UI]: OBRIGATÓRIO criar um botão/controle na interface do mapa (junto aos controles flutuantes já existentes) permitindo que o usuário ATIVE ou DESATIVE a visualização da malha IBGE.** A malha não deve atrapalhar a visão principal caso o usuário queira ver apenas os pins. Apenas carregue/renderize os polígonos quando essa opção estiver ativada (State Management).

---
**Critério de Sucesso:** A malha de todos os bairros do estado (Bahia) pode existir no banco, mas a IDE deve garantir que o mapa peça via API apenas o GeoJSON da cidade atual (ex: Senhor do Bonfim), protegendo a memória do browser e permitindo super agilidade no zoom.
