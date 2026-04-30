from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "HélioBénin"
    DEBUG: bool = False

    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # KKiaPay
    KKIAPAY_PUBLIC_KEY: str = ""
    KKIAPAY_PRIVATE_KEY: str = ""
    KKIAPAY_SECRET: str = ""

    # Données solaires Bénin (irradiation moyenne annuelle kWh/m²/j)
    IRRADIATION_BENIN: float = 5.5
    RENDEMENT_PANNEAU: float = 0.80
    RENDEMENT_ONDULEUR: float = 0.95
    RENDEMENT_BATTERIE: float = 0.85

    class Config:
        env_file = ".env"


settings = Settings()
