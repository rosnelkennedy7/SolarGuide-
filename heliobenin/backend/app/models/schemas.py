from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class TypeInstallation(str, Enum):
    AUTONOME = "autonome"
    HYBRIDE = "hybride"
    RESEAU = "reseau"


class Appareil(BaseModel):
    nom: str
    puissance_w: float = Field(gt=0, description="Puissance en watts")
    heures_par_jour: float = Field(gt=0, le=24)
    quantite: int = Field(default=1, ge=1)


class DimensionnementRequest(BaseModel):
    appareils: List[Appareil]
    type_installation: TypeInstallation = TypeInstallation.AUTONOME
    autonomie_jours: int = Field(default=2, ge=1, le=7, description="Jours d'autonomie sans soleil")
    tension_systeme: int = Field(default=12, description="Tension système en volts (12, 24, 48)")
    localite: Optional[str] = "Cotonou"


class ResultatDimensionnement(BaseModel):
    consommation_journaliere_wh: float
    puissance_crete_panneaux_w: float
    nombre_panneaux: int
    capacite_batterie_ah: float
    nombre_batteries: int
    puissance_onduleur_w: float
    details: dict


class DevisRequest(BaseModel):
    resultat: ResultatDimensionnement
    client_nom: str
    client_email: str
    client_telephone: Optional[str] = None
    localite: str = "Cotonou"


class DevisResponse(BaseModel):
    id: Optional[str] = None
    montant_total_fcfa: float
    details_prix: dict
    client_nom: str
    client_email: str
    statut: str = "en_attente"
