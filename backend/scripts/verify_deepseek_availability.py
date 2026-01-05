
import os
import sys
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

# Load env from backend dir
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
load_dotenv()

def verify_models():
    print("--- 🩺 DEEPSEEK AVAILABILITY CHECK ---")
    
    api_key = os.getenv("DEEPSEEK_API_KEY")
    base_url = "https://api.deepseek.com/v1"
    
    if not api_key:
        print("❌ DEEPSEEK_API_KEY missed.")
        return

    models = ["deepseek-chat", "deepseek-reasoner"]
    
    for model in models:
        print(f"\n>> Testing: {model}")
        try:
            llm = ChatOpenAI(
                model=model,
                api_key=api_key,
                base_url=base_url,
                temperature=0.7,
                max_retries=1
            )
            res = llm.invoke("Ping")
            print(f"   ✅ SUCCESS! Response: {res.content}")
        except Exception as e:
            print(f"   ❌ FAILED! Error: {e}")

if __name__ == "__main__":
    verify_models()
