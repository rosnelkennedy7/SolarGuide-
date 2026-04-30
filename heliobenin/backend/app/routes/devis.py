from fastapi import APIRouter, HTTPException
from app.models.schemas import DevisRequest, DevisResponse
from app.engine.solaire import calculer_dimensionnement, calculer_devis
from app.services.supabase_client import get_supabase

router = APIRouter()


@router.post("/", response_model=DevisResponse)
async def creer_devis(data: DevisRequest):
    prix = calculer_devis(data.resultat)

    devis_data = {
        "client_nom": data.client_nom,
        "client_email": data.client_email,
        "client_telephone": data.client_telephone,
        "localite": data.localite,
        "montant_total_fcfa": prix["montant_total_fcfa"],
        "details_prix": prix["details_prix"],
        "details_dimensionnement": data.resultat.model_dump(),
        "statut": "en_attente",
    }

    try:
        supabase = get_supabase()
        response = supabase.table("devis").insert(devis_data).execute()
        devis_id = response.data[0]["id"] if response.data else None
    except Exception:
        devis_id = None

    return DevisResponse(
        id=devis_id,
        montant_total_fcfa=prix["montant_total_fcfa"],
        details_prix=prix["details_prix"],
        client_nom=data.client_nom,
        client_email=data.client_email,
        statut="en_attente",
    )


@router.get("/{devis_id}")
async def get_devis(devis_id: str):
    supabase = get_supabase()
    response = supabase.table("devis").select("*").eq("id", devis_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Devis introuvable")
    return response.data
