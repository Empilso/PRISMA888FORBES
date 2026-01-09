"""
AI Service for Promise Extraction using DeepSeek.
Enterprise-grade implementation with token economy and JSON output.
"""

import os
import re
import json
import requests
from typing import List, Dict, Optional
from dataclasses import dataclass

@dataclass
class Promise:
    titulo: str
    area: str
    descricao: str
    prazo: str  # Curto/Médio/Longo

class AIService:
    """
    Service for AI-powered text analysis using DeepSeek.
    """
    
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.base_url = "https://api.deepseek.com/v1/chat/completions"
        self.model = "deepseek-chat"
        self.max_tokens = 4096
        
        if not self.api_key:
            raise ValueError("DEEPSEEK_API_KEY not found in environment")
    
    def clean_text(self, text: str) -> str:
        """
        Clean PDF text to reduce token consumption by 30-40%.
        Removes headers, footers, excessive whitespace, and invalid characters.
        """
        # CRITICAL: Remove NULL bytes that PostgreSQL cannot store
        text = text.replace('\x00', '')
        text = text.replace('\u0000', '')
        
        # Remove other problematic Unicode characters
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
        
        # Remove page numbers and common headers/footers
        patterns = [
            r'Página\s*\d+\s*(de\s*\d+)?',
            r'Plano de Governo\s*\d{4}',
            r'www\.[^\s]+',
            r'http[^\s]+',
            r'\d{2}/\d{2}/\d{4}',  # Dates in dd/mm/yyyy
            r'-{3,}',  # Long dashes
            r'_{3,}',  # Long underscores
            r'\n{3,}',  # Multiple newlines -> double
        ]
        
        cleaned = text
        for pattern in patterns:
            cleaned = re.sub(pattern, ' ', cleaned, flags=re.IGNORECASE)
        
        # Normalize whitespace
        cleaned = re.sub(r'[ \t]+', ' ', cleaned)
        cleaned = re.sub(r'\n{2,}', '\n\n', cleaned)
        cleaned = cleaned.strip()
        
        return cleaned
    
    def chunk_text(self, text: str, max_chars: int = 8000) -> List[str]:
        """
        Split text into manageable chunks for API calls.
        Uses smaller chunks (8k) for faster processing.
        """
        if len(text) <= max_chars:
            return [text]
        
        chunks = []
        
        # Try splitting by double newlines first
        paragraphs = text.split('\n\n')
        current_chunk = ""
        
        for para in paragraphs:
            # If a single paragraph is too large, split it by sentences
            if len(para) > max_chars:
                # Save current chunk first
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                    current_chunk = ""
                
                # Split large paragraph by sentences
                sentences = re.split(r'(?<=[.!?])\s+', para)
                for sentence in sentences:
                    if len(current_chunk) + len(sentence) < max_chars:
                        current_chunk += sentence + " "
                    else:
                        if current_chunk.strip():
                            chunks.append(current_chunk.strip())
                        current_chunk = sentence + " "
            elif len(current_chunk) + len(para) < max_chars:
                current_chunk += para + "\n\n"
            else:
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                current_chunk = para + "\n\n"
        
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        # Fallback: if still only 1 chunk and too big, force split by character count
        if len(chunks) == 1 and len(chunks[0]) > max_chars:
            text = chunks[0]
            chunks = []
            for i in range(0, len(text), max_chars):
                chunks.append(text[i:i+max_chars])
        
        return chunks
    
    def extract_promises_from_text(self, text: str) -> List[Dict]:
        """
        Use DeepSeek to extract campaign promises from government plan text.
        Returns a list of promises in structured format.
        """
        # 1. Clean text
        cleaned = self.clean_text(text)
        print(f"📊 Text cleaned: {len(text)} -> {len(cleaned)} chars ({100-int(len(cleaned)/len(text)*100)}% reduction)")
        
        # 2. Chunk if needed
        chunks = self.chunk_text(cleaned)
        print(f"📦 Processing {len(chunks)} chunk(s)")
        
        all_promises = []
        
        for i, chunk in enumerate(chunks):
            print(f"🔄 Processing chunk {i+1}/{len(chunks)}...")
            
            prompt = self._build_extraction_prompt(chunk)
            
            try:
                response = self._call_deepseek(prompt)
                promises = self._parse_promises_response(response)
                all_promises.extend(promises)
                print(f"   ✅ Extracted {len(promises)} promises from chunk {i+1}")
            except Exception as e:
                print(f"   ❌ Error in chunk {i+1}: {e}")
        
        # Remove duplicates based on titulo
        unique_promises = []
        seen_titles = set()
        for p in all_promises:
            title_lower = p.get("titulo", "").lower().strip()
            if title_lower and title_lower not in seen_titles:
                seen_titles.add(title_lower)
                unique_promises.append(p)
        
        print(f"✅ Total unique promises: {len(unique_promises)}")
        return unique_promises
    
    def _build_extraction_prompt(self, text: str) -> str:
        """Build the system + user prompt for promise extraction."""
        system = """Você é um Analista Político Sênior especializado em planos de governo brasileiros.
Sua tarefa é identificar e catalogar TODAS as promessas de campanha presentes no texto.

REGRAS IMPORTANTES:
1. Extraia APENAS promessas concretas (ações, projetos, metas).
2. NÃO inclua declarações genéricas ("vamos melhorar a cidade").
3. Classifique cada promessa em uma ÁREA temática.
4. Defina o PRAZO estimado: Curto (1 ano), Médio (2-3 anos), Longo (4+ anos).
5. Responda SOMENTE com JSON válido, sem texto adicional.

FORMATO DE SAÍDA (JSON Array):
[
  {
    "titulo": "Nome curto da promessa",
    "area": "Saúde|Educação|Infraestrutura|Segurança|Economia|Social|Meio Ambiente|Cultura|Esporte|Administração",
    "descricao": "Descrição detalhada da promessa",
    "prazo": "Curto|Médio|Longo"
  }
]"""
        
        user = f"""Analise o seguinte trecho de Plano de Governo e extraia todas as promessas:

---
{text}
---

Responda APENAS com o JSON das promessas encontradas."""
        
        return json.dumps([
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ])
    
    def _call_deepseek(self, messages_json: str) -> str:
        """Make API call to DeepSeek."""
        messages = json.loads(messages_json)
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,  # Low for structured output
            "max_tokens": self.max_tokens
        }
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(self.base_url, headers=headers, json=payload, timeout=90)
        
        if response.status_code != 200:
            raise ValueError(f"DeepSeek API Error: {response.status_code} - {response.text}")
        
        data = response.json()
        return data["choices"][0]["message"]["content"]
    
    def _parse_promises_response(self, response: str) -> List[Dict]:
        """Parse JSON response from DeepSeek."""
        # Try to extract JSON from response
        response = response.strip()
        
        # Handle markdown code blocks
        if response.startswith("```"):
            response = re.sub(r'^```json?\n?', '', response)
            response = re.sub(r'\n?```$', '', response)
        
        try:
            promises = json.loads(response)
            if isinstance(promises, list):
                return promises
            elif isinstance(promises, dict) and "promessas" in promises:
                return promises["promessas"]
            else:
                return []
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parse error: {e}")
            print(f"Raw response: {response[:500]}...")
            return []
