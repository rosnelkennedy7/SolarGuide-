import requests

# ─────────────────────────────────────────────────────────────────────
# PRIX IRENA 2024
# Source : IRENA Renewable Power Generation Costs 2023
# ─────────────────────────────────────────────────────────────────────
IRENA_2024 = {
    "panneau_mono_wc":   0.25,    # USD/Wc — monocristallin
    "panneau_poly_wc":   0.20,    # USD/Wc — polycristallin
    "batterie_li_kwh":   150.0,   # USD/kWh — Lithium-Ion / LiFePO4
    "batterie_agm_ah":   0.95,    # USD/Ah  — AGM
    "batterie_gel_ah":   1.05,    # USD/Ah  — Gel
    "batterie_plomb_ah": 0.45,    # USD/Ah  — Plomb-acide
    "onduleur_w":        0.18,    # USD/W
    "mppt_ampere":       2.50,    # USD/A
    "pwm_ampere":        0.80,    # USD/A
}

# Coefficients import (transport + douanes)
COEFF_IMPORT_COMPOSANTS = 1.30   # panneaux, onduleurs, régulateurs
COEFF_IMPORT_BATTERIES  = 1.40   # batteries (matières dangereuses)

# ─────────────────────────────────────────────────────────────────────
# PRIX MARCHÉ AFRICAIN — COMPOSANTS ÉLECTRIQUES (FCFA)
# Source : data/base de données.xlsx (prix réels Bénin 2024)
# ─────────────────────────────────────────────────────────────────────
PRIX_ELEC_FCFA = {
    # Câble solaire H1Z2Z2K (extérieur — UV résistant)
    "cable_h1z2z2k_par_metre": {
        1.5: 1376,  2.5: 1730,  4: 2376,  6: 3200,
        10:  5230,  16:  8000,  25: 11500, 35: 16000, 50: 22000,
    },
    # Câble souple rouge/noir DC (intérieur)
    "cable_souple_dc_par_metre": {
        1.5: 600,  2.5: 900,  4: 1300,  6: 1800,
        10: 2723,  16: 3800,  25: 5748, 35: 8000, 50: 11000,
    },
    # Câble H07RN-F AC souple (onduleur → tableau)
    "cable_h07rnf_par_metre": {
        1.5: 700,   2.5: 1050,  4: 1400,  6: 1936,
        10: 2800,  16:  4100,  25: 6200, 35: 8500, 50: 12000,
    },
    # Câble générique (fallback)
    "cable_par_metre": {
        1.5: 700,   2.5: 1050,  4: 1400,  6: 1936,
        10: 2800,  16:  4100,  25: 6200, 35: 8500, 50: 12000,
    },
    # Disjoncteurs DC (1000V DC obligatoire — norme IEC 60947-2)
    "disjoncteur_dc": {
        6: 14859, 10: 14859, 16: 16000, 20: 16000,
        25: 17000, 32: 18000, 40: 18500, 63: 19000,
    },
    # Disjoncteurs AC différentiel 30mA (norme NF C 15-100)
    "disjoncteur_ac": {
        6: 2500, 10: 3000, 16: 3800, 20: 4500,
        25: 5500, 32: 7000, 40: 8500, 63: 12000,
    },
    # Parafoudres (obligatoires au Bénin — orages tropicaux)
    "parafoudre_dc_type2_600v":   17970,
    "parafoudre_dc_type2_1000v":  22500,
    "parafoudre_dc_type12_1000v": 29500,
    "parafoudre_ac_type2_230v":   15500,
    "parafoudre_ac_type12_230v":  25000,
    # ATS (commutateur automatique de sources)
    "ats_1000w":   35000,
    "ats_2000w":   55000,
    "ats_3000w":   75000,
    "ats_5000w":  110000,
    "ats_8000w":  160000,
    "ats_10000w": 200000,
}

# Cache pour éviter plusieurs requêtes API lors d'un calcul
_taux_cache = None


def get_taux_change():
    global _taux_cache
    if _taux_cache:
        return _taux_cache
    try:
        r = requests.get("https://api.exchangerate-api.com/v4/latest/USD", timeout=5)
        _taux_cache = r.json()["rates"]
        return _taux_cache
    except Exception:
        return {"USD": 1, "EUR": 0.92, "XOF": 610}


def get_prix_irena():
    return IRENA_2024


def convertir_en_fcfa(prix_usd, taux):
    return round(prix_usd * taux.get("XOF", 610))


def calculer_marge(prix_fcfa):
    """Marge technicien dégressive."""
    if prix_fcfa < 50000:    taux = 0.10
    elif prix_fcfa < 150000: taux = 0.08
    elif prix_fcfa < 300000: taux = 0.06
    else:                    taux = 0.04
    return round(prix_fcfa * (1 + taux))


def _prix_cable(section, metrage, type_cable="h1z2z2k"):
    """Retourne le prix total d'un câble selon sa section et son métrage."""
    if type_cable == "h1z2z2k":
        tarif = PRIX_ELEC_FCFA["cable_h1z2z2k_par_metre"]
    elif type_cable == "souple_dc":
        tarif = PRIX_ELEC_FCFA["cable_souple_dc_par_metre"]
    elif type_cable == "h07rnf":
        tarif = PRIX_ELEC_FCFA["cable_h07rnf_par_metre"]
    else:
        tarif = PRIX_ELEC_FCFA["cable_par_metre"]

    prix_m = tarif.get(section)
    if not prix_m:
        # Trouver la section normalisée supérieure la plus proche
        sections_dispo = sorted(tarif.keys())
        s = next((s for s in sections_dispo if s >= section), sections_dispo[-1])
        prix_m = tarif[s]
    return round(prix_m * metrage)


def calculer_prix_composants(dimensionnement):
    """
    Calcule les prix de tous les composants en FCFA.
    Attend la structure retournée par calcul/dimensionnement.py::dimensionner().
    """
    taux      = get_taux_change()
    irena     = get_prix_irena()
    taux_fcfa = taux.get("XOF", 610)
    res       = {}

    # ── PANNEAUX ──────────────────────────────────────────────────────
    prix_pan_usd  = dimensionnement["panneau"]["puissance_totale"] * irena["panneau_mono_wc"]
    prix_pan_fcfa = convertir_en_fcfa(prix_pan_usd * COEFF_IMPORT_COMPOSANTS, taux)
    res["panneau"]     = calculer_marge(prix_pan_fcfa)
    res["panneau_usd"] = round(prix_pan_usd, 2)

    # ── BATTERIES ─────────────────────────────────────────────────────
    bat      = dimensionnement["batterie"]
    type_bat = bat["type"]
    if type_bat in ("Lithium-Ion", "LiFePO4"):
        capacite_kwh = bat["capacite_unitaire"] * bat["nombre"] * bat["tension"] / 1000
        prix_bat_usd = capacite_kwh * irena["batterie_li_kwh"]
    elif type_bat == "AGM":
        prix_bat_usd = bat["capacite_unitaire"] * bat["nombre"] * irena["batterie_agm_ah"]
    elif type_bat == "Gel":
        prix_bat_usd = bat["capacite_unitaire"] * bat["nombre"] * irena["batterie_gel_ah"]
    else:  # Plomb-acide
        prix_bat_usd = bat["capacite_unitaire"] * bat["nombre"] * irena["batterie_plomb_ah"]

    prix_bat_fcfa  = convertir_en_fcfa(prix_bat_usd * COEFF_IMPORT_BATTERIES, taux)
    res["batterie"]     = calculer_marge(prix_bat_fcfa)
    res["batterie_usd"] = round(prix_bat_usd, 2)

    # ── RÉGULATEUR ────────────────────────────────────────────────────
    reg          = dimensionnement.get("regulateur", dimensionnement.get("mppt", {}))
    type_reg     = reg.get("type", "MPPT")
    if type_reg == "Integre":
        prix_reg_fcfa = 0  # Intégré dans l'onduleur all-in-one
    else:
        prix_reg_usd  = reg.get("courant", 20) * (
            irena["mppt_ampere"] if type_reg == "MPPT" else irena["pwm_ampere"]
        )
        prix_reg_fcfa = convertir_en_fcfa(prix_reg_usd * COEFF_IMPORT_COMPOSANTS, taux)

    res["regulateur"]     = calculer_marge(prix_reg_fcfa)
    res["regulateur_usd"] = round(prix_reg_fcfa / taux_fcfa, 2)

    # ── ONDULEUR ──────────────────────────────────────────────────────
    prix_ond_usd       = dimensionnement["onduleur"]["puissance"] * irena["onduleur_w"]
    prix_ond_fcfa      = convertir_en_fcfa(prix_ond_usd * COEFF_IMPORT_COMPOSANTS, taux)
    res["onduleur"]     = calculer_marge(prix_ond_fcfa)
    res["onduleur_usd"] = round(prix_ond_usd, 2)

    # ── CÂBLES ────────────────────────────────────────────────────────
    cables = dimensionnement.get("cables", {})

    pan_reg = cables.get("pan_reg", {})
    reg_bat = cables.get("reg_bat", {})
    bat_ond = cables.get("bat_ond", {})
    ac_cable = cables.get("ac", {})

    p_pan_reg = _prix_cable(pan_reg.get("section", 4), pan_reg.get("metrage", 10), "h1z2z2k")
    p_reg_bat = _prix_cable(reg_bat.get("section", 6), reg_bat.get("metrage", 4), "souple_dc")
    p_bat_ond = _prix_cable(bat_ond.get("section", 16), bat_ond.get("metrage", 2), "souple_dc")
    p_ac      = _prix_cable(ac_cable.get("section", 4), ac_cable.get("metrage", 6), "h07rnf")

    # Terres
    s_terre_dc = cables.get("terre_DC", pan_reg.get("section", 4))
    s_terre_ac = cables.get("terre_AC", ac_cable.get("section", 4))
    p_terre = (
        _prix_cable(s_terre_dc, pan_reg.get("metrage", 10), "souple_dc") +
        _prix_cable(s_terre_ac, ac_cable.get("metrage", 6), "souple_dc")
    )

    res["cable_dc"]    = calculer_marge(p_pan_reg + p_reg_bat + p_bat_ond)
    res["cable_ac"]    = calculer_marge(p_ac)
    res["cable_terre"] = calculer_marge(p_terre)

    # ── DISJONCTEURS ──────────────────────────────────────────────────
    disj = dimensionnement.get("disjoncteurs", {})
    res["disjoncteur_dc"] = calculer_marge(
        PRIX_ELEC_FCFA["disjoncteur_dc"].get(disj.get("DC", 20), 16000)
    )
    res["disjoncteur_ac"] = calculer_marge(
        PRIX_ELEC_FCFA["disjoncteur_ac"].get(disj.get("AC", 16), 3800)
    )

    # ── PARAFOUDRES (DC + AC obligatoires au Bénin) ───────────────────
    # DC Type 2 1000V + AC Type 2 230V
    res["parafoudre_dc"] = calculer_marge(PRIX_ELEC_FCFA["parafoudre_dc_type2_1000v"])
    res["parafoudre_ac"] = calculer_marge(PRIX_ELEC_FCFA["parafoudre_ac_type2_230v"])
    res["parafoudre"]    = res["parafoudre_dc"] + res["parafoudre_ac"]

    # ── ATS (hybride) ─────────────────────────────────────────────────
    if dimensionnement.get("ats"):
        p_ats_w = dimensionnement["ats"]
        paliers  = [1000, 2000, 3000, 5000, 8000, 10000]
        palier   = min(paliers, key=lambda x: abs(x - p_ats_w))
        cle_ats  = f"ats_{palier}w"
        res["ats"] = calculer_marge(PRIX_ELEC_FCFA.get(cle_ats, 55000))
    else:
        res["ats"] = 0

    # ── TOTAL ─────────────────────────────────────────────────────────
    res["total"] = sum([
        res.get("panneau",        0),
        res.get("batterie",       0),
        res.get("regulateur",     0),
        res.get("onduleur",       0),
        res.get("cable_dc",       0),
        res.get("cable_ac",       0),
        res.get("cable_terre",    0),
        res.get("disjoncteur_dc", 0),
        res.get("disjoncteur_ac", 0),
        res.get("parafoudre",     0),
        res.get("ats",            0),
    ])

    res["taux_fcfa_usd"] = taux_fcfa
    res["source"]        = "IRENA Renewable Power Generation Costs 2023"
    res["date_taux"]     = "Temps réel via ExchangeRate-API"

    return res
