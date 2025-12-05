import json

# JSON manual simples e válido
flow_data = {
    "nodes": [
        {
            "id": "chat_input",
            "type": "ChatInput",
            "data": {
                "node": {
                    "display_name": "Input Inicial",
                    "description": "Recebe o comando",
                    "template": {
                        "input_value": { "value": "Analise os candidatos", "type": "str" },
                        "sender": { "value": "User", "type": "str" },
                        "sender_name": { "value": "User", "type": "str" },
                        "session_id": { "value": "", "type": "str" },
                        "files": { "value": "", "type": "file" },
                        "background_color": { "value": "", "type": "str" },
                        "chat_icon": { "value": "", "type": "str" },
                        "text_color": { "value": "", "type": "str" }
                    }
                },
                "type": "ChatInput"
            },
            "position": { "x": 0, "y": 0 }
        },
        {
            "id": "chat_output",
            "type": "ChatOutput",
            "data": {
                "node": {
                    "display_name": "Output Final",
                    "description": "Resultado",
                    "template": {
                        "input_value": { "value": "", "type": "str" },
                        "sender": { "value": "Machine", "type": "str" },
                        "sender_name": { "value": "AI", "type": "str" },
                        "session_id": { "value": "", "type": "str" },
                        "files": { "value": "", "type": "file" },
                        "background_color": { "value": "", "type": "str" },
                        "chat_icon": { "value": "", "type": "str" },
                        "text_color": { "value": "", "type": "str" }
                    }
                },
                "type": "ChatOutput"
            },
            "position": { "x": 500, "y": 0 }
        }
    ],
    "edges": [
        {
            "source": "chat_input",
            "target": "chat_output",
            "sourceHandle": "message",
            "targetHandle": "text"
        }
    ]
}

# Salvar
with open("/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/engine/langflow_flows/simple_valid_flow.json", "w") as f:
    json.dump(flow_data, f, indent=2)

print("✅ JSON simples e válido gerado!")
