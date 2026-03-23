from src.utils.text_extractor import extract_entities_from_text
import json

test_text = "Ref patrocínio III ECOFESTIVAL DO CAFÉ DA SERRA DOS MORGADOS nos dias 18 a 20 de julho de 2025 em Jaguarari-Ba conf Contrato nº 633/2025. NF nº 17, Processo nº 032.1313.2025.0005698-23."

print("--- TESTE FORENSE QI220 ---")
print(f"Texto: {test_text}")
print("-" * 30)

result = extract_entities_from_text(test_text)

# Formatação limpa para conferência
important_keys = ["municipios_ba", "contratos", "notas_fiscais", "processos", "datas_citadas", "obras_eventos"]
output = {k: result.get(k) for k in important_keys}

print(json.dumps(output, indent=2, ensure_ascii=False))

# Verificação de acerto
expected = {
    "municipios_ba": ["Jaguarari"],
    "contratos": ["633/2025"],
    "notas_fiscais": ["17"],
    "processos": ["032.1313.2025.0005698-23"],
    "datas_citadas": ["18 a 20 de julho de 2025"]
}

correct = True
for k, v in expected.items():
    if v != output.get(k):
        print(f"ERRO em {k}: esperado {v}, obtido {output.get(k)}")
        correct = False

if correct:
    print("\n✅ SUCESSO: O extrator forense capturou todos os detalhes críticos!")
else:
    print("\n❌ FALHA: Alguns detalhes não foram capturados conforme o plano.")
