
import os
import sys
from unittest.mock import MagicMock, patch

# Mock environment variables
os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "mock-key"
os.environ["OPENAI_API_KEY"] = "mock-key"

# Mock supabase client
mock_supabase = MagicMock()
mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [] 

# Add backend/src to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Mock Agent and Task classes to capture arguments without validation
class MockAgent:
    def __init__(self, role, goal, backstory, **kwargs):
        self.role = role
        self.goal = goal
        self.backstory = backstory
        self.kwargs = kwargs

class MockTask:
    def __init__(self, description, expected_output, agent=None, context=None, **kwargs):
        self.description = description
        self.expected_output = expected_output
        self.agent = agent
        self.context = context
        self.kwargs = kwargs

# Patch imports in genesis_crew
with patch('src.crew.genesis_crew.get_supabase_client', return_value=mock_supabase), \
     patch('src.crew.genesis_crew.GenesisCrew._create_llm', return_value=MagicMock()), \
     patch('src.crew.genesis_crew.Agent', side_effect=MockAgent), \
     patch('src.crew.genesis_crew.Task', side_effect=MockTask):
    
    from src.crew.genesis_crew import GenesisCrew, LANGUAGE_RULE_PTBR

    print("✅ LANGUAGE_RULE_PTBR defined.")

    # Mock persona data
    mock_persona_response = MagicMock()
    mock_persona_response.data = [{
        "name": "standard",
        "config": {
            "agents": {
                "analyst": {"role": "Analista", "goal": "Analisar", "backstory": "Sou analista"},
                "strategist": {"role": "Estrategista", "goal": "Estratégia", "backstory": "Sou estrategista"}
            },
            "process_type": "hierarchical",
            "manager_model": "gpt-4o"
        },
        "llm_model": "gpt-4o-mini"
    }]
    
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_persona_response
    
    # Instantiate crew
    crew = GenesisCrew(campaign_id="test-campaign", persona="standard")
    
    # Test 1: Verify Agents have language rule
    print("\n🔍 Checking Agents for Language Rule...")
    agents = crew._create_agents()
    for name, agent in agents.items():
        if LANGUAGE_RULE_PTBR in agent.backstory:
            print(f"  ✅ Agent '{name}' has language rule in backstory.")
        else:
            print(f"  ❌ Agent '{name}' MISSING language rule in backstory!")
        
        if LANGUAGE_RULE_PTBR in agent.goal:
            print(f"  ✅ Agent '{name}' has language rule in goal.")
        else:
            print(f"  ❌ Agent '{name}' MISSING language rule in goal!")

    # Test 2: Verify Tasks have language rule
    print("\n🔍 Checking Tasks for Language Rule...")
    tasks = crew._create_tasks(agents)
    for i, task in enumerate(tasks):
        if LANGUAGE_RULE_PTBR in task.description:
            print(f"  ✅ Task {i+1} has language rule in description.")
        else:
            print(f"  ❌ Task {i+1} MISSING language rule in description!")

    print("\nScript completed.")
