import sys
import os
from unittest.mock import MagicMock

# Ensure we can import from backend
sys.path.append(os.getcwd())

# We need to patch the class inside the module BEFORE valid instantiation
import src.crew.genesis_crew as module_to_patch

# Original class for reference if needed, but we'll fully mock for the test
OriginalChat = module_to_patch.ChatOpenAI

class MockLLM:
    def __init__(self, model, **kwargs):
        self.model = model  # CrewAI uses .model attribute? Langchain uses .model_name usually?
        self.model_name = model # Langchain standard
        self.callbacks = kwargs.get('callbacks', [])
        # print(f"DEBUG: MockLLM initialized for {model}")

    def invoke(self, input_val, **kwargs):
        # Simulate formatting prompts for callback
        prompts = [str(input_val)]
        
        # Trigger on_llm_start
        for cb in self.callbacks:
            if hasattr(cb, 'on_llm_start'):
                cb.on_llm_start({}, prompts, invocation_params={"model_name": self.model_name})
        
        # Logic to fail for the primary 'deepseek-chat'
        if "deepseek-chat" in self.model_name:
             error = Exception("404 - Model not found")
             # Trigger on_llm_error
             for cb in self.callbacks:
                if hasattr(cb, 'on_llm_error'):
                    cb.on_llm_error(error)
             raise error
        
        return "Pong"

# Apply Patch
module_to_patch.ChatOpenAI = MockLLM

# Now instantiate Crew
print("--- STARTING SIMULATION ---")
try:
    crew = module_to_patch.GenesisCrew(campaign_id="test_fallback", persona="standard")
    print("\n--- SIMULATION COMPLETE ---")
    print(f"Final LLM Logic Model: {crew.llm.model_name}")
except Exception as e:
    print(f"Execution Error: {e}")
