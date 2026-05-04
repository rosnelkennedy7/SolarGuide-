from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from ..moteur.moteur_technicien import (
    calculer_etape1,
    calculer_etape2,
    calculer_etape3,
)

router = APIRouter(prefix="/api/calcul", tags=["calcul"])


class Appareil(BaseModel):
    nom: str
    puissance: float
    quantite: int
    h_jour: float
    h_nuit: float
    facteur_pointe: float = 1.0


class Panneau(BaseModel):
    puissance: float
    voc: float
    vmp: float
    isc: float


class Onduleur(BaseModel):
    puissance: int
    usys: int
    mppt_min: float
    mppt_max: float
    pv_max: float


class Batterie(BaseModel):
    capacite: float
    tension: int


class ParamsEtape1(BaseModel):
    appareils: List[Appareil]
    cs: float
    k: float
    eta: float = 0.80
    n_jours: float = 2.0
    dod: float = 0.90
    eta_bat: float = 0.95
    irradiation: float
    latitude: float
    pr: Optional[float] = None
    longueur_panneau_ond: float = 10.0
    longueur_reg_bat: float = 2.0
    longueur_bat_ond: float = 2.0
    longueur_ond_tableau: float = 10.0
    type_regulateur: str = "AIO"


class ParamsEtape2(BaseModel):
    etape1: dict
    params: ParamsEtape1
    panneau: Panneau
    onduleur: Optional[Onduleur] = None
    type_regulateur: str = "AIO"
    usys: Optional[int] = None
    vmax_mppt: Optional[float] = None


class ParamsEtape3(BaseModel):
    etape1: dict
    etape2: dict
    params: ParamsEtape1
    panneau: Panneau
    type_regulateur: str = "AIO"


@router.post("/etape1")
def calcul_etape1(params: ParamsEtape1):
    appareils_dict = [a.model_dump() for a in params.appareils]
    params_dict = params.model_dump()
    params_dict["appareils"] = appareils_dict
    return calculer_etape1(params_dict)


@router.post("/etape2")
def calcul_etape2(params: ParamsEtape2):
    equipements = {
        "panneau": params.panneau.model_dump(),
        "type_regulateur": params.type_regulateur,
    }
    if params.onduleur:
        equipements["onduleur"] = params.onduleur.model_dump()
    if params.usys:
        equipements["usys"] = params.usys
    if params.vmax_mppt:
        equipements["vmax_mppt"] = params.vmax_mppt

    return calculer_etape2(
        params.etape1,
        params.params.model_dump(),
        equipements,
    )


@router.post("/etape3")
def calcul_etape3(params: ParamsEtape3):
    equipements = {
        "panneau": params.panneau.model_dump(),
        "type_regulateur": params.type_regulateur,
    }
    return calculer_etape3(
        params.etape1,
        params.etape2,
        params.params.model_dump(),
        equipements,
    )
