
import os
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()

def test_deepseek():
    api_key = os.getenv("DEEPSEEK_API_KEY")
    base_url = "https://api.deepseek.com/v1"
    model = "deepseek-chat"
    
    print(f"Testing DeepSeek with model: {model}")
    print(f"Base URL: {base_url}")
    print(f"API Key present: {bool(api_key)}")
    
    try:
        llm = ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=base_url,
            temperature=0.3
        )
        response = llm.invoke("Olá, quem é você?")
        print(f"Response: {response.content}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_deepseek()
