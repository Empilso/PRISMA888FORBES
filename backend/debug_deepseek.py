import os
import requests
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("DEEPSEEK_API_KEY")
if not key:
    print("❌ Key not found")
    exit(1)

print(f"Key loaded: {key[:5]}... ({len(key)} chars)")

url = "https://api.deepseek.com/chat/completions"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {key}"
}
data = {
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Ping"}],
    "max_tokens": 10
}

try:
    print("Sending request...")
    resp = requests.post(url, headers=headers, json=data, timeout=10)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Error: {e}")
