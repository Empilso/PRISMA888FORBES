import re
import json
import os
from datetime import datetime
from typing import Dict, List, Any

try:
    import spacy
    nlp = spacy.load("pt_core_news_sm")
    SPACY_AVAILABLE = True
except (ImportError, OSError):
    SPACY_AVAILABLE = False
    print("Warning: spaCy or pt_core_news_sm not found. NER layer will be disabled.")

# Caminho para os dados de municípios
MUNICIPIOS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "municipios_ba.json")

def load_municipios() -> List[str]:
    try:
        if os.path.exists(MUNICIPIOS_FILE):
            with open(MUNICIPIOS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return []

MUNICIPIOS_BA = load_municipios()

PATTERNS = {
    "contratos": [
        r"(?i)contrato\s+n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
        r"(?i)cont\.\s*n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
    ],
    "notas_fiscais": [
        r"(?i)NF\s+n[oºª°\.]+\s*([\d]+)",
        r"(?i)nota\s+fiscal\s+n[oºª°\.]+\s*([\d]+)",
        r"(?i)NF\s*n°\s*([\d]+)",
    ],
    "processos": [
        r"\d{3}\.\d{4}\.\d{4}\.\d{7}-\d{2}",  # SEI Bahia
        r"\d{3}\.\d{4}\.\d{4}\.\d{6,7}-\d{2}",
        r"(?i)processo\s+n[oºª°\.]+\s*([\d\.\/\-]+)",
    ],
    "empenhos": [
        r"(?i)EMP\s+n[oºª°\.]+\s*([\w\d\/\-]+)",
        r"(?i)AFM\s+([\w\d]+)",
        r"(?i)empenho\s+n[oºª°\.]+\s*([\w\d\/\-]+)",
    ],
    "cnpjs": [
        r"\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}",
    ],
    "cpfs": [
        r"\d{3}\.\d{3}\.\d{3}-\d{2}",
    ],
    "licitacoes": [
        r"(?i)pregão\s+n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
        r"(?i)licitação\s+n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
        r"(?i)tomada\s+de\s+preços\s+n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
        r"(?i)concorrência\s+n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
        r"(?i)dispensa\s+n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
        r"(?i)inexigibilidade\s+n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
    ],
    "convenios": [
        r"(?i)convênio\s+n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
        r"(?i)termo\s+de\s+fomento\s+n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
        r"(?i)termo\s+de\s+colaboração\s+n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
        r"(?i)termo\s+aditivo\s+n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
    ],
    "atos_oficiais": [
        r"(?i)resolução\s+n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
        r"(?i)decreto\s+n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
        r"(?i)portaria\s+n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
        r"(?i)lei\s+n[oºª°\.]+\s*([\d]+[\/\-][\d]{4})",
    ],
    "datas_citadas": [
        r"\d{2}\/\d{2}\/\d{4}",
        r"\d{1,2}\s+de\s+\w+\s+de\s+\d{4}",
        r"\d{1,2}\s+a\s+\d{1,2}\s+de\s+\w+\s+de\s+\d{4}",
    ],
    "valores_citados": [
        r"R\$\s*[\d\.]+,\d{2}",
        r"R\$\s*[\d\.]+",
    ],
}

def extract_regex_entities(texto: str) -> Dict[str, List[str]]:
    results = {}
    for key, patterns in PATTERNS.items():
        found = []
        for p in patterns:
            matches = re.findall(p, texto)
            for m in matches:
                if isinstance(m, tuple):
                    found.append(m[0])
                else:
                    found.append(m)
        # Deduplicar mantendo ordem
        results[key] = list(dict.fromkeys(found))
    return results

def extract_ner(texto: str) -> Dict[str, List[str]]:
    if not SPACY_AVAILABLE:
        return {"pessoas": [], "organizacoes": [], "locais_ner": []}
    
    doc = nlp(texto)
    return {
        "pessoas": list(dict.fromkeys([ent.text for ent in doc.ents if ent.label_ == "PER"])),
        "organizacoes": list(dict.fromkeys([ent.text for ent in doc.ents if ent.label_ == "ORG"])),
        "locais_ner": list(dict.fromkeys([ent.text for ent in doc.ents if ent.label_ == "LOC"])),
    }

def extract_municipios(texto: str) -> List[str]:
    found = []
    texto_lower = texto.lower()
    for mun in MUNICIPIOS_BA:
        # Busca por palavra inteira para evitar falsos positivos (ex: "Barra" em "Barra do Choça")
        pattern = r'\b' + re.escape(mun.lower()) + r'\b'
        if re.search(pattern, texto_lower):
            found.append(mun)
    return found

def extract_uppercase_phrases(texto: str) -> List[str]:
    # Captura sequências em MAIÚSCULAS com 3 ou mais palavras (mínimo 10 caracteres)
    pattern = r'\b([A-ZÁÀÂÃÉÊÍÓÔÕÚÇÜÑ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇÜÑ\s]{8,}[A-ZÁÀÂÃÉÊÍÓÔÕÚÇÜÑ])\b'
    matches = re.findall(pattern, texto)
    return [m.strip() for m in matches if len(m.split()) >= 3]

def extract_entities_from_text(texto: str) -> Dict[str, Any]:
    if not texto:
        return {}

    # Camada 1: Regex
    regex_data = extract_regex_entities(texto)
    
    # Camada 2: NER
    ner_data = extract_ner(texto)
    
    # Camada 3: Específicos
    municipios = extract_municipios(texto)
    obras_eventos = extract_uppercase_phrases(texto)
    
    # Merge all
    entities = {**regex_data, **ner_data}
    entities["municipios_ba"] = municipios
    entities["obras_eventos"] = obras_eventos
    
    # Meta
    total = sum(len(v) if isinstance(v, list) else 0 for v in entities.values())
    
    return {
        **entities,
        "texto_original": texto,
        "total_entidades": total,
        "extraido_em": datetime.now().isoformat()
    }

# TODO FASE 2: PDF scraping integrado para extrair dados de anexos SEI
