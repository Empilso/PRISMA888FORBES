import os
import sys
import unittest
from unittest.mock import MagicMock, patch
from dotenv import load_dotenv

# Ensure backend is in path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

# Load env vars
load_dotenv()

from src.models.enterprise import AgentSchema, PersonaSchema
from src.crew.genesis_crew import GenesisCrew
from src.crew.tools import campaign_vector_search

class TestEnterpriseIntegrity(unittest.TestCase):
    
    def setUp(self):
        print("\n" + "="*50)
        print(f"🧪 Starting Test: {self._testMethodName}")
        # Use a real UUID to satisfy PG constraints
        import uuid
        test_uuid = str(uuid.uuid4())
        # We need to mock the supabase call in init, otherwise it will try to hit DB with a random UUID
        # and might fail if it relies on data existing.
        # HOWEVER, the init code handles empty data for campaigns query:
        # camp_res = self.supabase.table("campaigns").select...
        # So passing a random UUID is fine, as long as the format is correct.
        # Use strategy_mode_override to skip the campaign lookup (which fails for random UUID)
        # This keeps the test clean while allowing valid DB connections for other tables later.
        self.crew_ops = GenesisCrew(
            campaign_id=test_uuid, 
            persona="standard",
            strategy_mode_override="territory"
        )

        # But User asked for "DB Connectivity" check in test_03.
        # So we leave real connection, but we might encounter "Persona not found" error if we don't have "standard" persona.
        # Let's catch that in init or here.


    def test_01_tool_registry(self):
        """Testa se o registro de ferramentas resolve strings para objetos."""
        print("🛠️  Testing Tool Registry...")
        tool_names = ["web_search", "campaign_data", "non_existent_tool"]
        resolved = self.crew_ops._get_tools_from_names(tool_names)
        
        # Expectation: web_search -> campaign_vector_search (fallback), campaign_data -> campaign_stats
        # non_existent_tool -> skipped/logged warning
        
        self.assertTrue(len(resolved) >= 2, "Should resolve at least 2 valid tools")
        print(f"   ✅ Resolved {len(resolved)} tools from {tool_names}")
        
    def test_02_inheritance_logic(self):
        """Testa a lógica de herança e overrides."""
        print("🧬 Testing Inheritance Logic...")
        
        # Mock Blueprint Agent
        self.crew_ops.blueprint_agent = {
            "role": "Blueprint Role",
            "goal": "Blueprint Goal",
            "backstory": "Blueprint Backstory",
            "tools": ["web_search"]
        }
        
        # Mock Overrides in Persona
        self.crew_ops.overrides = {
            "role": "Overridden Role",
            # Goal inherits from Blueprint
            # Backstory inherits
        }
        
        # Mock Config for a specific agent key
        fallback_config = {"role": "Fallback", "goal": "Fallback"}
        
        # Execute Resolution
        # Note: logic checks if self.blueprint_agent role matches key. 
        # Let's adjust mock to match 'analyst' for the test logic to trigger
        self.crew_ops.blueprint_agent["role"] = "Campaign Analyst Blueprint" 
        
        agent = self.crew_ops._resolve_agent_config("analyst", fallback_config)
        
        print(f"   Agent Role: {agent.role}")
        print(f"   Agent Goal: {agent.goal}")
        
        # Validation
        self.assertEqual(agent.role, "Overridden Role", "Override should take precedence over Blueprint")
        self.assertEqual(agent.goal, "Blueprint Goal", "Should inherit Goal from Blueprint")
        self.assertIn("Blueprint Backstory", agent.backstory, "Should inherit Backstory from Blueprint (with PT-BR suffix)")
        print("   ✅ Inheritance & Override Successful")

    def test_03_db_connectivity_and_pydantic(self):
        """Testa conexão real com o banco e validação Pydantic."""
        print("🔌 Testing DB Connectivity & Schemas...")
        supabase = self.crew_ops.supabase
        
        try:
            # 1. Fetch Agents
            agents_res = supabase.table("agents").select("*").limit(1).execute()
            if agents_res.data:
                agent_data = agents_res.data[0]
                # Validate with Pydantic
                agent_model = AgentSchema(**agent_data)
                print(f"   ✅ Agent Fetched & Validated: {agent_model.role} (v{agent_model.version})")
            else:
                print("   ⚠️  No agents found in DB to test.")

            # 2. Fetch Personas
            personas_res = supabase.table("personas").select("*").limit(1).execute()
            if personas_res.data:
                persona_data = personas_res.data[0]
                # Validate with Pydantic
                persona_model = PersonaSchema(**persona_data)
                print(f"   ✅ Persona Fetched & Validated: {persona_model.name} (Status: {persona_model.status})")
            else:
                print("   ⚠️  No personas found in DB to test.")
                
        except Exception as e:
            self.fail(f"DB Connectivity Failed: {e}")

    def test_04_crew_instantiation(self):
        """Testa a criação da Crew (Dry Run)."""
        print("🚀 Testing Crew Instantiation...")
        try:
             # We skip actual kickoff to save tokens/time, just check initialization
             agents = self.crew_ops._create_agents()
             tasks = self.crew_ops._create_tasks(agents)
             
             print(f"   ✅ Created {len(agents)} Agents")
             print(f"   ✅ Created {len(tasks)} Tasks")
             
             # Check Task 5 for Pydantic Output
             task5 = tasks[-1]
             self.assertIsNotNone(task5.output_pydantic, "Task 5 must use Pydantic Output")
             print("   ✅ Task 5 configured with Structured Output")
             
        except Exception as e:
            self.fail(f"Crew Instantiation Failed: {e}")

    def test_05_llm_provider_factory(self):
        """Testa se a factory de LLM respeita o metadata."""
        print("🧠 Testing LLM Provider Factory...")
        
        # 1. Test OpenAI
        meta_openai = {"provider": "openai", "model": "gpt-4o", "temperature": 0.5}
        llm_openai = self.crew_ops._get_llm_provider(meta_openai)
        self.assertTrue(hasattr(llm_openai, 'model_name') or hasattr(llm_openai, 'model'))
        # Langchain ChatOpenAI stores model in 'model_name' usually
        model_val = getattr(llm_openai, 'model_name', getattr(llm_openai, 'model', ''))
        self.assertIn("gpt-4o", model_val)
        print("   ✅ OpenAI Provider Instantiated")

        # 2. Test DeepSeek (Default)
        meta_deepseek = {"provider": "deepseek", "model": "deepseek-chat"}
        llm_ds = self.crew_ops._get_llm_provider(meta_deepseek)
        # DeepSeekLLM inherits ChatOpenAI, should have model_name
        self.assertEqual(llm_ds.model_name, "deepseek-chat")
        print("   ✅ DeepSeek Provider Instantiated")
        
        # 3. Test Fallback
        meta_weird = {"provider": "alien_tech", "model": "ufo-1"}
        llm_fallback = self.crew_ops._get_llm_provider(meta_weird)
        # Should fallback to deepseek-chat (default in _get_llm_provider else clause)
        self.assertEqual(llm_fallback.model_name, "deepseek-chat")
        print("   ✅ Fallback Logic Verified")

    def test_06_pt_br_enforcement(self):
        """Testa se o prompt PT-BR é injetado no backstory."""
        print("🇧🇷 Testing PT-BR Enforcement...")
        
        # Resolve an agent
        fallback = {"role": "Test", "goal": "Test", "backstory": "Original backstory."}
        agent = self.crew_ops._resolve_agent_config("test_agent", fallback)
        
        # Verify Injection
        self.assertIn("ATENÇÃO: Você é um sistema brasileiro", agent.backstory)
        self.assertIn("EXCLUSIVAMENTE em Português do Brasil", agent.backstory)
        
        # Verify Step Callback Attachment
        self.assertIsNotNone(agent.step_callback, "Step Callback should be attached")
        print("   ✅ PT-BR Prompt Injected & Callback Attached")

if __name__ == '__main__':
    unittest.main()
