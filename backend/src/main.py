from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.ingestion import router as ingestion_router
from src.api.genesis import router as genesis_router
from src.api.personas import router as personas_router
from src.api.strategies import router as strategies_router
from src.api.campaign import router as campaign_router
from src.api.tasks import router as tasks_router
from src.api.agents import router as agents_router
from src.api.crew_logs import router as crew_logs_router
from src.api.map_notes import router as map_notes_router
from src.api.radar_promises import router as radar_promises_router
from src.api.tcesp_debug import router as tcesp_debug_router
from src.api.cities_politicians import router as cities_politicians_router
from src.api.radar_premium import router as radar_premium_router

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ingestion_router)
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

@app.get("/")
async def root():
    return {"message": "Welcome to SheepStack Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
