from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import dimensionnement, devis, auth
from app.routers.calcul import router as calcul_router

app = FastAPI(
    title="HélioBénin API",
    description="API de dimensionnement et devis solaires pour le Bénin",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(dimensionnement.router, prefix="/api/dimensionnement", tags=["dimensionnement"])
app.include_router(devis.router, prefix="/api/devis", tags=["devis"])
app.include_router(calcul_router)


@app.get("/")
def root():
    return {"message": "HélioBénin API v1.0", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy"}
