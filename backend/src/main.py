# ==============================================================================
# MONKEY PATCH: DeepSeek Direct Override
# ==============================================================================
# O CrewAI/LiteLLM ignora instâncias customizadas e recria clients.
# A única forma de garantir o uso do nosso client HTTP é interceptar a chamada
# no nível do módulo litellm ANTES de qualquer outro import.
# ==============================================================================
import os
import httpx
try:
    import litellm
    from litellm.utils import ModelResponse, Choices, Message

    _original_completion = litellm.completion

    def deepseek_completion_patch(*args, **kwargs):
        model = kwargs.get("model", "")
        
        # Se for DeepSeek ou nosso 'custom-proxy-chat', intercepta!
        if "deepseek" in model or "custom-proxy-chat" in model:
            print(f"[DeepSeek Patch] 🕵️ Intercepted call for {model}")
            
            try:
                # Extrai mensagens e parâmetros
                messages = kwargs.get("messages", [])
                temperature = kwargs.get("temperature", 0.7)
                api_key = os.getenv("DEEPSEEK_API_KEY")
                
                if not api_key:
                    print(f"[DeepSeek Patch] ⚠️ Missing API Key in env!")
                
                url = "https://api.deepseek.com/chat/completions"
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                }
                
                formatted_messages = []
                for msg in messages:
                    if isinstance(msg, dict):
                        formatted_messages.append(msg)
                    elif hasattr(msg, 'role') and hasattr(msg, 'content'):
                        formatted_messages.append({"role": msg.role, "content": msg.content})
                    else:
                        formatted_messages.append({"role": "user", "content": str(msg)})
                
                payload = {
                    "model": "deepseek-chat", 
                    "messages": formatted_messages,
                    "temperature": temperature,
                    "stream": False
                }
                
                # print(f"[DeepSeek Patch] 📡 Sending HTTP request to DeepSeek...")
                with httpx.Client(timeout=120.0) as client:
                    response = client.post(url, headers=headers, json=payload)
                    response.raise_for_status()
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                
                # Cria resposta Mock compatível com LiteLLM/OpenAI
                msg_obj = Message(content=content, role="assistant")
                choice_obj = Choices(finish_reason="stop", index=0, message=msg_obj)
                response = ModelResponse(choices=[choice_obj], model=model)
                
                print(f"[DeepSeek Patch] ✅ Serving patched response via HTTP Direct")
                return response
                
            except Exception as e:
                print(f"[DeepSeek Patch] ❌ Patch Failed: {e}")
                # Em caso de falha no patch, podemos tentar o original ou dar raise
                raise e

        # Se não for DeepSeek, segue o fluxo normal (OpenAI, Groq, etc)
        return _original_completion(*args, **kwargs)

    # Aplica o Patch Implacável
    litellm.completion = deepseek_completion_patch
    
    # Tenta patchar acompletion tb apenas por segurança (embora CrewAI use sync)
    _original_acompletion = litellm.acompletion
    async def deepseek_acompletion_patch(*args, **kwargs):
        # Para async, teríamos que implementar http async.
        # Por enquanto apenas redirecionamos para o sync patch se for deepseek
        # (CrewAI agents não costumam usar async stream por default)
        model = kwargs.get("model", "")
        if "deepseek" in model or "custom-proxy-chat" in model:
             # Chama a versão sync (bloqueante, mas resolve)
             return deepseek_completion_patch(*args, **kwargs)
        return await _original_acompletion(*args, **kwargs)
    
    litellm.acompletion = deepseek_acompletion_patch

    print("[DeepSeek Patch] 💉 Monkey Patch applied to litellm.completion (GLOBAL MAIN)")

    # --- OPENAI SDK PATCH (NUCLEAR OPTION) ---
    import openai
    from openai.resources.chat.completions import Completions

    _original_openai_create = Completions.create

    def deepseek_openai_create_patch(self, *args, **kwargs):
        # Verifica se o modelo no kwargs é deepseek
        model = kwargs.get("model", "")
        if "deepseek" in model or "custom-proxy-chat" in model:
             print(f"[DeepSeek Patch] ☢️ Intercepted OPENAI SDK call for {model}")
             # Reutiliza a lógica do patch do litellm (convertendo args se necessário)
             # litellm e openai create têm assinaturas parecidas
             try:
                 # Chama nossa função de patch do litellm (que já faz o trabalho sujo)
                 # Precisamos adaptar o retorno. O patch do litellm retorna objeto.
                 # O OpenAI SDK espera um objeto similar. O objeto do litellm (ModelResponse) tenta ser compatível.
                 return deepseek_completion_patch(*args, **kwargs)
             except Exception as e:
                 print(f"[DeepSeek Patch] ❌ OpenAI Patch Failed: {e}")
                 raise e
        return _original_openai_create(self, *args, **kwargs)

    Completions.create = deepseek_openai_create_patch
    print("[DeepSeek Patch] ☢️ Monkey Patch applied to openai.resources.chat.completions.Completions.create")

except ImportError as e:
    print(f"[DeepSeek Patch] ⚠️ Dependency not found: {e}")
except Exception as e:
    print(f"[DeepSeek Patch] ⚠️ Error applying patch: {e}")

# ==============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.core.ingestion import router as ingestion_router
from src.api.core.genesis import router as genesis_router
from src.api.core.personas import router as personas_router
from src.api.core.strategies import router as strategies_router
from src.api.core.campaign import router as campaign_router
from src.api.core.tasks import router as tasks_router
from src.api.core.agents import router as agents_router
from src.api.core.crew_logs import router as crew_logs_router
from src.api.core.map_notes import router as map_notes_router
from src.api.social.radar_promises import router as radar_promises_router
from src.api.financial.tcesp_debug import router as tcesp_debug_router
from src.api.core.cities_politicians import router as cities_politicians_router
from src.api.social.radar_premium import router as radar_premium_router
from src.api.financial.tse import router as tse_router
from src.api.core.knowledge import router as knowledge_router
from src.api.core.organizations import router as organizations_router
from src.api.social.social_radar import router as social_radar_router

app = FastAPI()

# CORS configuration - allow all origins for Vercel + ngrok tunneling
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ingestion_router)
app.include_router(knowledge_router)
app.include_router(genesis_router)
app.include_router(personas_router)
app.include_router(strategies_router)
app.include_router(campaign_router)
app.include_router(tasks_router)
app.include_router(agents_router)
app.include_router(crew_logs_router)
app.include_router(map_notes_router)
app.include_router(radar_promises_router)
app.include_router(tcesp_debug_router)
app.include_router(cities_politicians_router)
app.include_router(radar_premium_router)
app.include_router(tse_router)
app.include_router(organizations_router)
app.include_router(social_radar_router)
from src.api.core.admin import router as admin_router
app.include_router(admin_router)

@app.get("/")
async def root():
    return {"message": "Welcome to SheepStack Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
