def comparer_economie(dimensionnement, prix, conso_kwh_jour,
                       type_carburant, prix_carburant, source_carburant,
                       heures_groupe=8, inclut_entretien_groupe=True):
    """
    Compare le coût solaire vs groupe électrogène sur 10 ans.
    Nouvelle version avec carburant personnalisé et entretien détaillé.
    """

    # ─────────────────────────────────────────
    # DONNÉES GROUPE ÉLECTROGÈNE
    # ─────────────────────────────────────────

    # Consommation selon type carburant
    conso_litre_heure = {
        "essence": 0.8,   # litre/heure pour un groupe moyen
        "gasoil":  0.6    # gasoil plus économique
    }.get(type_carburant, 0.8)

    cout_carburant_jour    = heures_groupe * conso_litre_heure * prix_carburant
    cout_carburant_annuel  = cout_carburant_jour * 365

    # Entretien groupe électrogène détaillé
    entretien_groupe = {
        "vidange_huile":    {"freq_mois":3,  "cout":15000, "label":"Vidange huile moteur (tous les 3 mois)"},
        "filtre_air":       {"freq_mois":6,  "cout":8000,  "label":"Remplacement filtre à air (tous les 6 mois)"},
        "filtre_huile":     {"freq_mois":6,  "cout":5000,  "label":"Remplacement filtre à huile (tous les 6 mois)"},
        "bougie":           {"freq_mois":12, "cout":6000,  "label":"Remplacement bougies (essence uniquement · annuel)"},
        "revision_generale":{"freq_mois":12, "cout":35000, "label":"Révision générale annuelle"},
    }

    # Supprimer bougies si gasoil
    if type_carburant == "gasoil":
        del entretien_groupe["bougie"]

    # Calcul coût entretien annuel groupe
    cout_entretien_groupe_annuel = sum(
        round(e["cout"] * (12 / e["freq_mois"]))
        for e in entretien_groupe.values()
    )

    cout_initial_groupe  = 350000  # Prix groupe électrogène moyen
    cout_total_annuel_groupe = cout_carburant_annuel + cout_entretien_groupe_annuel

    # ─────────────────────────────────────────
    # DONNÉES SYSTÈME SOLAIRE
    # ─────────────────────────────────────────
    cout_initial_solaire = prix.get("total", 0)

    # Entretien annuel solaire (fixe)
    cout_entretien_solaire_annuel = 23000

    # Remplacement batterie
    duree_vie_bat = {"Lithium-Ion":12,"AGM":7,"Plomb-acide":5}
    type_bat      = dimensionnement["batterie"]["type"]
    duree_bat     = duree_vie_bat.get(type_bat, 7)
    prix_bat      = prix.get("batterie", 0)

    # ─────────────────────────────────────────
    # CALCUL SUR 10 ANS
    # ─────────────────────────────────────────
    total_groupe  = cout_initial_groupe
    total_solaire = cout_initial_solaire

    for annee in range(1, 11):
        total_groupe  += cout_total_annuel_groupe
        total_solaire += cout_entretien_solaire_annuel
        # Remplacement batterie
        if annee % duree_bat == 0 and annee < 10:
            total_solaire += prix_bat

    economies = total_groupe - total_solaire

    # Point de rentabilité
    cumul_groupe  = cout_initial_groupe
    cumul_solaire = cout_initial_solaire
    annee_rentabilite = None
    for annee in range(1, 11):
        cumul_groupe  += cout_total_annuel_groupe
        cumul_solaire += cout_entretien_solaire_annuel
        if annee % duree_bat == 0:
            cumul_solaire += prix_bat
        if cumul_solaire <= cumul_groupe and annee_rentabilite is None:
            annee_rentabilite = annee

    # Facture SBEE évitée (si hybride)
    # Estimation : consommation * tarif SBEE moyen (85 FCFA/kWh)
    tarif_sbee    = 85
    facture_sbee_evitee_mois = round(conso_kwh_jour * 30 * tarif_sbee)

    return {
        # Groupe
        "cout_initial_groupe":          cout_initial_groupe,
        "cout_carburant_annuel":        round(cout_carburant_annuel),
        "cout_entretien_groupe_annuel": cout_entretien_groupe_annuel,
        "cout_total_groupe_annuel":     round(cout_total_annuel_groupe),
        "cout_groupe_10ans":            round(total_groupe),
        "detail_entretien_groupe":      [
            {"label":e["label"],"cout_annuel":round(e["cout"]*(12/e["freq_mois"]))}
            for e in entretien_groupe.values()
        ],

        # Solaire
        "cout_initial_solaire":          cout_initial_solaire,
        "cout_entretien_solaire_annuel": cout_entretien_solaire_annuel,
        "cout_solaire_10ans":            round(total_solaire),
        "remplacement_batterie_an":      duree_bat,
        "cout_remplacement_batterie":    prix_bat,

        # Bilan
        "economies_10ans":       round(max(0, economies)),
        "annee_rentabilite":     annee_rentabilite or "10+",

        # SBEE
        "facture_sbee_evitee_mois": facture_sbee_evitee_mois,

        # Carburant
        "type_carburant":    type_carburant,
        "prix_carburant":    prix_carburant,
        "source_carburant":  source_carburant,
        "conso_litre_heure": conso_litre_heure,
        "cout_carburant_jour": round(cout_carburant_jour)
    }