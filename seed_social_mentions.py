import os
import sys
import psycopg2
import uuid
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("Database URL not found in env.")
    sys.exit(1)

def seed_mentions():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # 1. Pegar uma campanha
        cur.execute("SELECT id FROM campaigns LIMIT 1")
        campaign = cur.fetchone()
        if not campaign:
            print("Nenhuma campanha encontrada.")
            return
        campaign_id = campaign[0]
        
        # 2. Apagar menções antigas dessa campanha (Reset)
        cur.execute("DELETE FROM social_mentions WHERE campaign_id = %s", (campaign_id,))
        
        # 3. Gerar dados hiper-realistas para São Paulo/SP (lat -23.55, lng -46.63) e Osasco (lat -23.53, lng -46.79)
        mock_data = [
            # Cluster 1: Problema estrutural (Rival apanhando)
            {
                "platform": "instagram",
                "text": "Absurdo! O prefeito prometeu entregar a creche da Vila Persio e até agora só tem mato e entulho. Vergonha total @riva_prefeito",
                "author_username": "joaodapilastra",
                "post_url": "https://instagram.com/p/mock1",
                "lat": -23.5505, "lng": -46.6333,
                "sentiment_label": "Negativo",
                "target_type": "rival",
                "rival_handle": "@riva_prefeito",
                "inferred_neighborhood": "Vila Persio"
            },
            {
                "platform": "tiktok",
                "text": "Fui matricular meu filho e adivinha? Fechado. Parabéns @riva_prefeito, mais uma vez a periferia esquecida. #Fora",
                "author_username": "maesdaZl",
                "post_url": "https://tiktok.com/@maesdaZl/video/mock2",
                "lat": -23.5510, "lng": -46.6340,
                "sentiment_label": "Negativo",
                "target_type": "rival",
                "rival_handle": "@riva_prefeito",
                "inferred_neighborhood": "Vila Persio"
            },
            
            # Cluster 2: Oportunidade (Buracos/Infraestrutura)
            {
                "platform": "instagram",
                "text": "Quebrou a suspensão do meu carro de novo na Av. Principal. A prefeitura não faz recapagem aqui desde 2020! Alguém me ajuda @candidato_nosso",
                "author_username": "carlos_uber",
                "post_url": "https://instagram.com/p/mock3",
                "lat": -23.5400, "lng": -46.6400,
                "sentiment_label": "Neutro",
                "target_type": "own",
                "rival_handle": None,
                "inferred_neighborhood": "Centro"
            },
            {
                "platform": "tiktok",
                "text": "Mostrando a cratera lunar no meio do bairro. Olha isso gente! @candidato_nosso vc disse que ia cobrar na camara!",
                "author_username": "jovem_reporter",
                "post_url": "https://tiktok.com/@jovem/video/mock4",
                "lat": -23.5395, "lng": -46.6390,
                "sentiment_label": "Neutro",
                "target_type": "own",
                "rival_handle": None,
                "inferred_neighborhood": "Centro"
            },
            
            # Cluster 3: Elogio a um projeto concorrente (Ameaça)
            {
                "platform": "instagram",
                "text": "Hoje a quadra foi entregue! Obrigado @rival_vereador, as crianças finalmente têm onde jogar basquete. Show!",
                "author_username": "basquete_rua",
                "post_url": "https://instagram.com/p/mock5",
                "lat": -23.5300, "lng": -46.7900,
                "sentiment_label": "Positivo",
                "target_type": "rival",
                "rival_handle": "@rival_vereador",
                "inferred_neighborhood": "Zona Oeste"
            }
        ]
        
        insert_query = """
            INSERT INTO social_mentions 
            (campaign_id, platform, text, author_username, post_url, lat, lng, sentiment_label, target_type, rival_handle, inferred_neighborhood, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        for mention in mock_data:
            created_at = datetime.now() - timedelta(hours=random.randint(1, 48))
            cur.execute(insert_query, (
                campaign_id,
                mention['platform'],
                mention['text'],
                mention['author_username'],
                mention['post_url'],
                mention['lat'],
                mention['lng'],
                mention['sentiment_label'],
                mention['target_type'],
                mention['rival_handle'],
                mention['inferred_neighborhood'],
                created_at
            ))
            
        conn.commit()
        print(f"✅ Inseridas {len(mock_data)} menções hiper-realistas para a campanha {campaign_id}.")
        
    except Exception as e:
        print(f"Erro: {e}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    seed_mentions()
