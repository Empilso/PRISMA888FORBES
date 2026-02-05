import sys
import os
import json
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.utils.json_cleaner import extract_json_from_text

# Simulated failure input (based on logs)
# DeepSeek often adds introductory text and sometimes the JSON is HUGE.
raw_output = """
Com certeza! Aqui está o Dossiê Estratégico Unificado em formato JSON conforme solicitado:

```json
{
  "strategic_plan": "# PLANO ESTRATÉGICO DA CAMPANHA 045a77c6\\n\\n**Headline da Campanha:** Da Retórica à Rua\\n\\n...",
  "strategies": [
    {
      "title": "Operação 'Adjetivo Virou Ação' - A Caça às Métricas Vazias",
      "description": "Criar uma força-tarefa de guerra para traduzir cada conceito abstrato...",
      "pillar": "Concretude Radical",
      "phase": "campaign",
      "examples": [
         "Ex: Transformar 'Melhorar a saúde' em 'Zerar fila 30 dias'"
      ]
    },
    {
      "title": "Tática 2",
      "description": "Descrição...",
      "pillar": "Pilar Y",
      "phase": "pre_campaign"
    }
  ]
}
```

Espero que isso ajude na campanha!
"""

def test_parser():
    print("🔍 Testing extract_json_from_text...")
    parsed, cleaned, error = extract_json_from_text(raw_output)
    
    if parsed:
        print("✅ SUCCESS!")
        print(f"Keys: {parsed.keys()}")
        if "strategies" in parsed:
            print(f"Strategy Count: {len(parsed['strategies'])}")
    else:
        print("❌ FAILED!")
        print(f"Error: {error}")
        print("--- Cleaned Text ---")
        print(cleaned)

if __name__ == "__main__":
    test_parser()
