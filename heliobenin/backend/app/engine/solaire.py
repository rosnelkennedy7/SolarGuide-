from app.config import settings
from app.models.schemas import DimensionnementRequest, ResultatDimensionnement
import math


# Prix unitaires moyens FCFA (marché béninois 2024)
PRIX_PANNEAU_PAR_WC = 350        # FCFA/Wc
PRIX_BATTERIE_PAR_AH = 1200      # FCFA/Ah (12V)
PRIX_ONDULEUR_PAR_W = 200        # FCFA/W
PRIX_REGULATEUR_PAR_A = 800      # FCFA/A
PRIX_CABLAGE_FORFAIT = 35_000    # FCFA
PRIX_POSE_FORFAIT = 50_000       # FCFA
MARGE_INSTALLATEUR = 0.15        # 15%


def calculer_dimensionnement(data: DimensionnementRequest) -> ResultatDimensionnement:
    # 1. Consommation journalière totale
    consommation_wh = sum(
        a.puissance_w * a.heures_par_jour * a.quantite
        for a in data.appareils
    )

    # 2. Puissance crête des panneaux
    irradiation = settings.IRRADIATION_BENIN
    rendement_global = settings.RENDEMENT_PANNEAU * settings.RENDEMENT_ONDULEUR
    puissance_crete_w = consommation_wh / (irradiation * rendement_global)

    # Panneaux de 300 Wc standard
    puissance_panneau_wc = 300
    nombre_panneaux = math.ceil(puissance_crete_w / puissance_panneau_wc)
    puissance_installee_w = nombre_panneaux * puissance_panneau_wc

    # 3. Capacité batterie
    profondeur_decharge = 0.50  # DOD 50% pour batteries plomb-acide
    capacite_wh = (consommation_wh * data.autonomie_jours) / (
        profondeur_decharge * settings.RENDEMENT_BATTERIE
    )
    capacite_ah = capacite_wh / data.tension_systeme

    # Batteries de 200 Ah / 12V standard
    capacite_batterie_ah = 200
    nombre_batteries = math.ceil(capacite_ah / capacite_batterie_ah)

    # 4. Onduleur (puissance de pointe × 1.25)
    puissance_pointe_w = sum(
        a.puissance_w * a.quantite for a in data.appareils
    )
    puissance_onduleur_w = puissance_pointe_w * 1.25

    details = {
        "consommation_par_appareil": [
            {
                "nom": a.nom,
                "wh_jour": a.puissance_w * a.heures_par_jour * a.quantite,
            }
            for a in data.appareils
        ],
        "irradiation_utilisee": irradiation,
        "tension_systeme_v": data.tension_systeme,
        "autonomie_jours": data.autonomie_jours,
        "puissance_installee_w": puissance_installee_w,
        "capacite_batterie_totale_ah": capacite_ah,
    }

    return ResultatDimensionnement(
        consommation_journaliere_wh=round(consommation_wh, 2),
        puissance_crete_panneaux_w=round(puissance_installee_w, 2),
        nombre_panneaux=nombre_panneaux,
        capacite_batterie_ah=round(capacite_ah, 2),
        nombre_batteries=nombre_batteries,
        puissance_onduleur_w=round(puissance_onduleur_w, 2),
        details=details,
    )


def calculer_devis(resultat: ResultatDimensionnement) -> dict:
    prix_panneaux = resultat.nombre_panneaux * 300 * PRIX_PANNEAU_PAR_WC
    prix_batteries = resultat.nombre_batteries * 200 * PRIX_BATTERIE_PAR_AH
    prix_onduleur = resultat.puissance_onduleur_w * PRIX_ONDULEUR_PAR_W
    courant_court_circuit = resultat.puissance_crete_panneaux_w / 17.5  # Voc typique
    prix_regulateur = math.ceil(courant_court_circuit / 10) * 10 * PRIX_REGULATEUR_PAR_A

    sous_total = (
        prix_panneaux + prix_batteries + prix_onduleur
        + prix_regulateur + PRIX_CABLAGE_FORFAIT + PRIX_POSE_FORFAIT
    )
    marge = sous_total * MARGE_INSTALLATEUR
    total = sous_total + marge

    return {
        "montant_total_fcfa": round(total),
        "details_prix": {
            "panneaux_solaires": round(prix_panneaux),
            "batteries": round(prix_batteries),
            "onduleur_regulateur": round(prix_onduleur + prix_regulateur),
            "cablage": PRIX_CABLAGE_FORFAIT,
            "pose_installation": PRIX_POSE_FORFAIT,
            "marge_installateur": round(marge),
        },
    }
