from fastapi import APIRouter
from app.models.schemas import DimensionnementRequest, ResultatDimensionnement
from app.engine.solaire import calculer_dimensionnement

router = APIRouter()


@router.post("/", response_model=ResultatDimensionnement)
def dimensionner(data: DimensionnementRequest):
    return calculer_dimensionnement(data)
