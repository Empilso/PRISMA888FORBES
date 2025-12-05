"""
🚀 Langflow API Client - Forbes Campaign

Este script demonstra como interagir com o Langflow via API
para executar flows de forma programática.

Autor: Antigravity AI
Data: 2025-11-27
"""

import os
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Carrega as configurações do Langflow
load_dotenv('.env.langflow')

class LangflowClient:
    """Cliente para interagir com a API do Langflow"""
    
    def __init__(self):
        self.api_key = os.getenv('LANGFLOW_API_KEY', 'sk-NPkae9kQtGMXFDK9qKqc_KYZdkh5kaekBuwVZTh7hHk')
        self.base_url = os.getenv('LANGFLOW_API_URL', 'http://localhost:7860/api/v1')
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
    
    def list_flows(self) -> Dict[str, Any]:
        """Lista todos os flows disponíveis"""
        url = f"{self.base_url}/flows"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def get_flow(self, flow_id: str) -> Dict[str, Any]:
        """Obtém detalhes de um flow específico"""
        url = f"{self.base_url}/flows/{flow_id}"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def run_flow(
        self, 
        flow_id: str, 
        input_data: str,
        tweaks: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Executa um flow com input específico
        
        Args:
            flow_id: ID do flow a ser executado
            input_data: Dados de entrada (texto)
            tweaks: Ajustes opcionais nos parâmetros do flow
            
        Returns:
            Resposta da execução do flow
        """
        url = f"{self.base_url}/run/{flow_id}"
        
        payload = {
            "input_value": input_data,
            "output_type": "chat",
            "input_type": "chat",
        }
        
        if tweaks:
            payload["tweaks"] = tweaks
        
        response = requests.post(url, json=payload, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def run_research_crew(self, command: str) -> Dict[str, Any]:
        """
        Executa o flow da Research Crew com um comando específico
        
        Args:
            command: Comando para a crew (ex: "Analise os candidatos")
            
        Returns:
            Resultado da execução
        """
        # Você precisará descobrir o flow_id após importar o flow
        # Pode usar list_flows() para encontrar o ID
        flows = self.list_flows()
        
        # Procura pelo flow "Supabase Research Crew"
        research_crew_flow = None
        for flow in flows.get('flows', []):
            if 'Supabase Research Crew' in flow.get('name', ''):
                research_crew_flow = flow['id']
                break
        
        if not research_crew_flow:
            raise ValueError("Flow 'Supabase Research Crew' não encontrado. Importe o flow primeiro!")
        
        return self.run_flow(research_crew_flow, command)


def main():
    """Exemplos de uso do cliente Langflow"""
    
    client = LangflowClient()
    
    # Exemplo 1: Listar todos os flows
    print("📋 Listando flows disponíveis...")
    flows = client.list_flows()
    print(f"Total de flows: {len(flows.get('flows', []))}")
    for flow in flows.get('flows', []):
        print(f"  - {flow.get('name')} (ID: {flow.get('id')})")
    
    # Exemplo 2: Executar a Research Crew
    print("\n🚀 Executando Research Crew...")
    try:
        result = client.run_research_crew(
            "Analise os candidatos e crie 3 tarefas prioritárias"
        )
        print("✅ Execução concluída!")
        print(f"Resultado: {result}")
    except ValueError as e:
        print(f"⚠️  {e}")
    except Exception as e:
        print(f"❌ Erro: {e}")


if __name__ == "__main__":
    main()
