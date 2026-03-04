import os
import json
from typing import List, Dict, Any, Optional
from crewai import Agent, Task, Crew, Process
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from supabase import create_client

# Modelo de Saída Estruturada
class GeoSocialOutput(BaseModel):
    diagnostico: str = Field(..., description="Análise resumida do que está acontecendo no bairro.")
    estrategia_tato: str = Field(..., description="Estratégia política de como agir (Atacar, Defender, Ignorar).")
    conteudo_sugerido: str = Field(..., description="Ideia de conteúdo para redes sociais, incluindo tom de voz.")
    tarefa_delega: str = Field(..., description="Ação prática que pode ser enviada ao Kanban.")

class GeoSocialCrew:
    """
    Equipe de Agentes Táticos focados em Inteligência Georreferenciada.
    """
    
    def __init__(self, campaign_id: str):
        self.campaign_id = campaign_id
        
        # O LLM que será o motor da Crew
        self.llm = ChatOpenAI(
            model="deepseek/deepseek-chat",
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url="https://api.deepseek.com/v1",
            temperature=0.7
        )

    def generate_strategy(self, neighborhood: str, mentions_text: str, votes_context: str) -> GeoSocialOutput:
        """
        Executa os agentes para gerar uma micro-estratégia.
        """
        # Agente 1: Analista de Dados Sociais
        analyst = Agent(
            role="Analista de Sentimento Social",
            goal="Compreender a dor raiz da população a partir de mensagens brutas.",
            backstory="Você é um especialista em ler entrelinhas de redes sociais e identificar o verdadeiro motivo da raiva ou alegria dos eleitores em um bairro específico.",
            verbose=False,
            allow_delegation=False,
            llm=self.llm
        )

        # Agente 2: Estrategista Político (O Cérebro)
        strategist = Agent(
            role="Estrategista Político Baseado em Dados",
            goal="Definir a manobra política perfeita conectando as dores locais com o histórico de votos.",
            backstory="QI 190. Você é o coordenador de guerra. Avalia se vale a pena atacar o rival, prometer melhorias ou blindar o candidato, baseando-se no histórico de votos da região.",
            verbose=False,
            allow_delegation=False,
            llm=self.llm
        )

        # Agente 3: Copywriter Tático
        copywriter = Agent(
            role="Redator de Guerrilha Política",
            goal="Converter a manobra estratégica em um plano de conteúdo digerível e impactante.",
            backstory="Você escreve roteiros velozes e viscerais. Sabe exatamente o tom de voz para indignação, empatia ou deboche.",
            verbose=False,
            allow_delegation=False,
            llm=self.llm
        )

        # Tarefas
        task_diagnose = Task(
            description=f"Leia atentamente as menções do bairro {neighborhood}: {mentions_text}. Converta o caos em um diagnóstico claro de 1 parágrafo sobre qual a maior vulnerabilidade/força atual.",
            expected_output="Diagnóstico claro da dor ou do cenário político do bairro.",
            agent=analyst
        )
        
        task_strategy = Task(
            description=f"Baseado no diagnóstico e no cenário eleitoral do bairro ({votes_context}), defina a estratégia tática. Devemos atacar? Nos calar? Ir pra rua?",
            expected_output="Uma diretriz clara de manobra política.",
            agent=strategist
        )
        
        task_copy = Task(
            description="Receba a estratégia tática e escreva o roteiro do vídeo/post sugerido (conteudo_sugerido) e a tarefa prática para a equipe (tarefa_delega). Imprima TUDO em formato JSON válido estruturado de acordo com o modelo Pydantic configurado na sua Task.",
            expected_output="Um JSON com as chaves: diagnostico, estrategia_tato, conteudo_sugerido, tarefa_delega.",
            agent=copywriter,
            output_json=GeoSocialOutput
        )

        crew = Crew(
            agents=[analyst, strategist, copywriter],
            tasks=[task_diagnose, task_strategy, task_copy],
            process=Process.sequential,
            verbose=False
        )

        # Executar a Crew
        try:
            result = crew.kickoff()
            # Pydantic Output Output formatado
            if task_copy.output.json_dict:
                return GeoSocialOutput(**task_copy.output.json_dict)
                
            # Fallback se vier string crua
            import json
            raw_text = task_copy.output.raw
            raw_text = raw_text.strip().removeprefix('```json').removesuffix('```')
            parsed = json.loads(raw_text)
            return GeoSocialOutput(**parsed)
            
        except Exception as e:
            print(f"[GeoSocialCrew] Erro na geração: {e}")
            # Em caso de pane da IA, retornar fallback
            return GeoSocialOutput(
                diagnostico="Não foi possível analisar as mensagens: " + str(e),
                estrategia_tato="Analisar manualmente.",
                conteudo_sugerido="N/D",
                tarefa_delega="Ajustar o prompt da LLM."
            )
