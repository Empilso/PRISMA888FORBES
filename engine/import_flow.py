#!/usr/bin/env python3
"""
Script para importar flow diretamente no banco de dados do Langflow
"""

import json
import sqlite3
import os
import uuid
from datetime import datetime

# Caminho do flow JSON
FLOW_JSON = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/engine/langflow_flows/supabase_research_crew.json"

# Banco de dados do Langflow
DB_PATH = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/engine/.venv/lib/python3.12/site-packages/langflow/langflow.db"

def import_flow_to_db(db_path, flow_json_path):
    """Importa o flow diretamente no banco"""
    
    # Carregar JSON do flow
    with open(flow_json_path, 'r') as f:
        flow_data = json.load(f)
    
    # Conectar ao banco
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Gerar ID único (32 caracteres hex sem hífens)
    flow_id = uuid.uuid4().hex
    
    # Pegar primeiro user_id ou criar default
    cursor.execute("SELECT id FROM user LIMIT 1")
    user_result = cursor.fetchone()
    user_id = user_result[0] if user_result else None
    
    print(f"📝 User ID: {user_id}")
    print(f"🆔 Flow ID: {flow_id}")
    
    # Preparar dados
    name = flow_data.get("name", "Supabase Research Crew - Forbes")
    description = flow_data.get("description", "Crew de agentes para análise de candidatos")
    data_json = json.dumps(flow_data.get("data", flow_data))
    is_component = flow_data.get("is_component", False)
    updated_at = datetime.now().isoformat()
    
    try:
        # Inserir flow com todos os campos necessários
        cursor.execute("""
            INSERT INTO flow (
                id,
                name,
                description,
                data,
                user_id,
                is_component,
                updated_at,
                webhook,
                mcp_enabled,
                access_type,
                locked
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            flow_id,
            name,
            description,
            data_json,
            user_id,
            is_component,
            updated_at,
            False,  # webhook
            False,  # mcp_enabled
            'PRIVATE',  # access_type
            False   # locked
        ))
        
        conn.commit()
        print("\n✅ Flow importado com sucesso!")
        print(f"🎯 Nome: {name}")
        print(f"📋 Descrição: {description}")
        print(f"\n🌐 Acesse: http://localhost:7860/flow/{flow_id}")
        
        return True
        
    except sqlite3.Error as e:
        print(f"\n❌ Erro ao inserir: {e}")
        conn.rollback()
        return False
    
    finally:
        conn.close()

if __name__ == "__main__":
    print("🚀 Importador de Flow para Langflow\n")
    
    # Verificar se arquivo existe
    if not os.path.exists(FLOW_JSON):
        print(f"❌ Arquivo JSON não encontrado: {FLOW_JSON}")
        exit(1)
    
    # Verificar se banco existe
    if not os.path.exists(DB_PATH):
        print(f"❌ Banco de dados não encontrado: {DB_PATH}")
        exit(1)
    
    # Importar flow
    success = import_flow_to_db(DB_PATH, FLOW_JSON)
    
    if success:
        print("\n🎉 Pronto! Recarregue o Langflow para ver o novo flow!")
        print("   Pressione F5 no navegador em http://localhost:7860")
    else:
        print("\n😞 Falha ao importar. Verifique os erros acima.")
        exit(1)
