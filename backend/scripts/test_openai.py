
import os
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()

def test_openai():
    api_key = os.getenv("OPENAI_API_KEY")
    model = "gpt-4o-mini" # Teste barato
    
    print(f"Testing OpenAI with model: {model}")
    print(f"API Key present: {bool(api_key)}")
    
    try:
        llm = ChatOpenAI(
            model=model,
            api_key=api_key
        )
        response = llm.invoke("Olá, quem é você?")
        print(f"Response: {response.content}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_openai()
