from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.ingestion import router as ingestion_router
from src.api.genesis import router as genesis_router
from src.api.personas import router as personas_router
from src.api.strategies import router as strategies_router
from src.api.campaign import router as campaign_router
from src.api.tasks import router as tasks_router

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

@app.get("/")
async def root():
    return {"message": "Welcome to SheepStack Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
