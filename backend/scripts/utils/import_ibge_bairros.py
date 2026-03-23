import os
import sys
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

# Requer: pip install geopandas psycopg2-binary
try:
    import geopandas as gpd
except ImportError:
    print("A biblioteca 'geopandas' nao esta instalada. Execute: pip install geopandas")
    sys.exit(1)

# Carrega variveis de ambiente
load_dotenv()
db_url = os.environ.get("DATABASE_URL")

if not db_url:
    print("ERRO: DATABASE_URL nao encontrado no arquivo .env")
    sys.exit(1)

# Caminho para o shapefile
shp_path = os.path.join(os.path.dirname(__file__), "..", "IBGE", "BA_bairros_CD2022", "BA_bairros_CD2022.shp")

if not os.path.exists(shp_path):
    print(f"ERRO: Arquivo shapefile nao encontrado em: {shp_path}")
    sys.exit(1)

def main():
    print("1. Lendo Shapefile com GeoPandas...")
    # Lemos os dados geoespaciais
    gdf = gpd.read_file(shp_path)
    
    # Garantimos que está em EPSG:4326 (WGS 84, Lat/Lng padrao usado na Web e no mapa do Prisma)
    if gdf.crs != "EPSG:4326":
        print(f"Convertendo CRS de {gdf.crs} para EPSG:4326...")
        gdf = gdf.to_crs("EPSG:4326")
    else:
        print("CRS já é EPSG:4326. OK.")

    total_registros = len(gdf)
    print(f"2. Shapefile lido com sucesso. Total de bairros: {total_registros}")

    # No IBGE 2022, as colunas padrão de bairro para a Bahia costumam ser CD_MUN, NM_BAIRRO, CD_BAIRRO, etc.
    # Vamos inspecionar as colunas para mapear corretamente:
    print(f"Colunas disponiveis: {gdf.columns.tolist()}")
    
    # Mapeamento dinâmico (comum do censo IBGE)
    if 'CD_MUN' in gdf.columns:
        col_mun = 'CD_MUN'
        col_nome = 'NM_BAIRRO'
        col_codigo = 'CD_BAIRRO'
    else:
        # Fallback genérico caso mudem
        col_mun = gdf.columns[0]
        col_nome = gdf.columns[1]
        col_codigo = gdf.columns[2]

    # Prepara os dados para insercao
    # Converter as geometrias para WKT (Well-Known Text) que o PostGIS entende nativamente
    print("Preparando lote de insercao...")
    registros = []
    
    # Percorrer o GeoDataFrame iterando rapidamente
    # O PostGIS converte silenciosamente Polygons WKT para MultiPolygons se a coluna exigir MultiPolygon,
    # porem ideal e passar direto com ST_Multi
    for idx, row in gdf.iterrows():
        cod_mun = str(row[col_mun])
        nome = str(row[col_nome])
        cod_bairro = str(row.get(col_codigo, ""))
        geom_wkt = row.geometry.wkt
        
        # A instrução SQL envelopará isso em ST_GeomFromText(geom_wkt, 4326)
        registros.append((cod_mun, nome, cod_bairro, geom_wkt))

    print(f"3. Conectando ao banco de dados: {db_url.split('@')[-1]}")
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Opcional: Esvazia a tabela antes de popular (ou podemos so pular dependendo)
        print("Trancando tabela antiga (se houver)...")
        cursor.execute("TRUNCATE TABLE public.ibge_bairros;")
        
        # Query de Inserção Batch - PostGIS ST_Multi força qualquer Polygon a virar MultiPolygon (Evita erro type mismatch)
        sql_insert = """
            INSERT INTO public.ibge_bairros (codigo_ibge_municipio, nome_bairro, codigo_bairro, geom)
            VALUES (%s, %s, %s, ST_Multi(ST_GeomFromText(%s, 4326)))
        """
        
        print(f"4. Executando insercao em lote via psycopg2_execute_batch ({total_registros} linhas)...")
        execute_batch(cursor, sql_insert, registros, page_size=1000)
        
        conn.commit()
        print("✅ Dados importados com SUCESSO e indexados no PostGIS!")
        
    except Exception as e:
        print(f"❌ Erro fatal durante injecao no banco de dados: {e}")
        if 'conn' in locals() and conn:
            conn.rollback()
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    main()
