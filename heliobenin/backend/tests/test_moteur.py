import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.moteur.moteur_technicien import (
    calculer_ej,
    calculer_pond,
    calculer_pc,
    calculer_puissance_pointe,
    choisir_onduleur_aio,
    calculer_panneaux_aio,
    calculer_batteries,
    calculer_troncon_panneau_onduleur,
    calculer_troncon_batterie_onduleur,
    calculer_etape1,
    calculer_etape2,
    calculer_etape3,
    get_pr,
)

# ── Panneau de référence pour les tests ──
PANNEAU_REF = {"puissance": 400, "voc": 48.5, "vmp": 40.2, "isc": 10.2}

# ────────────────────────────────────────────────────────────────
# CAS 1 — Installation simple 12V (3 appareils)
# ────────────────────────────────────────────────────────────────

APPAREILS_12V = [
    {"puissance": 60,  "quantite": 4, "h_jour": 6,  "h_nuit": 0, "facteur_pointe": 1.0},
    {"puissance": 100, "quantite": 1, "h_jour": 3,  "h_nuit": 2, "facteur_pointe": 1.0},
    {"puissance": 50,  "quantite": 2, "h_jour": 0,  "h_nuit": 5, "facteur_pointe": 1.0},
]

def test_cas1_ej_coherent():
    # Σ(Pi×qi×t) = 60×4×6 + 100×1×5 + 50×2×5 = 1440+500+500 = 2440 Wh brut
    # Ej = 2440 × 0.95 / 0.80 = 2897.5
    ej = calculer_ej(APPAREILS_12V, cs=0.95, eta=0.80)
    assert ej == 2897.5, f"Ej attendu 2897.5, obtenu {ej}"

def test_cas1_pond():
    # Σ(Pi×qi) = 60×4+100×1+50×2 = 240+100+100 = 440W → ×1.15 = 506
    pond = calculer_pond(APPAREILS_12V, k=1.15)
    assert pond == 506.0, f"Pond attendu 506.0, obtenu {pond}"

def test_cas1_pc():
    ej = calculer_ej(APPAREILS_12V, cs=0.95)
    pc = calculer_pc(ej, irradiation=5.0, pr=0.70)
    assert pc > 0, "Pc doit être positif"
    assert 400 < pc < 600, f"Pc hors plage raisonnable : {pc}"

def test_cas1_onduleur_12v():
    pond = 506.0
    result = choisir_onduleur_aio(pond)
    assert result is not None
    assert result["nb_onduleurs"] == 1
    assert result["onduleur"]["usys"] == 12
    assert result["onduleur"]["puissance"] >= pond


# ────────────────────────────────────────────────────────────────
# CAS 2 — Installation 48V monophasé (Pond < 12kW)
# ────────────────────────────────────────────────────────────────

APPAREILS_48V = [
    {"puissance": 200, "quantite": 5, "h_jour": 8, "h_nuit": 0, "facteur_pointe": 1.0},
    {"puissance": 150, "quantite": 3, "h_jour": 4, "h_nuit": 2, "facteur_pointe": 1.5},
    {"puissance": 100, "quantite": 2, "h_jour": 6, "h_nuit": 3, "facteur_pointe": 1.0},
    {"puissance": 60,  "quantite": 4, "h_jour": 5, "h_nuit": 3, "facteur_pointe": 1.0},
    {"puissance": 300, "quantite": 2, "h_jour": 2, "h_nuit": 0, "facteur_pointe": 2.0},
    {"puissance": 80,  "quantite": 3, "h_jour": 3, "h_nuit": 2, "facteur_pointe": 1.0},
    {"puissance": 120, "quantite": 2, "h_jour": 4, "h_nuit": 1, "facteur_pointe": 1.0},
    {"puissance": 500, "quantite": 1, "h_jour": 1, "h_nuit": 0, "facteur_pointe": 3.0},
    {"puissance": 250, "quantite": 2, "h_jour": 2, "h_nuit": 0, "facteur_pointe": 1.5},
    {"puissance": 75,  "quantite": 4, "h_jour": 3, "h_nuit": 2, "facteur_pointe": 1.0},
]

def test_cas2_onduleur_5kw():
    pond = calculer_pond(APPAREILS_48V, k=1.15)
    assert pond < 12000, f"Pond doit être < 12kW pour ce cas : {pond}"
    result = choisir_onduleur_aio(pond)
    assert result is not None
    assert result["nb_onduleurs"] == 1
    assert result["phase"] == "monophasé"
    assert result["onduleur"]["puissance"] >= pond

def test_cas2_usys_48():
    pond = calculer_pond(APPAREILS_48V, k=1.15)
    result = choisir_onduleur_aio(pond)
    # Pour pond > 3500W, l'onduleur doit être en 48V
    if pond > 3500:
        assert result["onduleur"]["usys"] == 48


# ────────────────────────────────────────────────────────────────
# CAS 3 — Installation 48V triphasé (Pond > 12kW)
# ────────────────────────────────────────────────────────────────

APPAREILS_TRIPHASÉ = [
    {"puissance": 1500, "quantite": 4, "h_jour": 8, "h_nuit": 0, "facteur_pointe": 2.0},
    {"puissance": 500,  "quantite": 5, "h_jour": 6, "h_nuit": 2, "facteur_pointe": 1.5},
    {"puissance": 300,  "quantite": 8, "h_jour": 4, "h_nuit": 0, "facteur_pointe": 1.0},
    {"puissance": 200,  "quantite": 4, "h_jour": 5, "h_nuit": 3, "facteur_pointe": 1.0},
]

def test_cas3_triphasé():
    pond = calculer_pond(APPAREILS_TRIPHASÉ, k=1.15)
    assert pond > 12000, f"Pond doit être > 12kW pour le triphasé : {pond}"
    result = choisir_onduleur_aio(pond)
    assert result is not None
    assert result["nb_onduleurs"] in [2, 3]
    assert result["phase"] == "triphasé"

def test_cas3_triphasé_puissance_unitaire_ok():
    pond = calculer_pond(APPAREILS_TRIPHASÉ, k=1.15)
    result = choisir_onduleur_aio(pond)
    pond_unit = pond / result["nb_onduleurs"]
    assert result["onduleur"]["puissance"] >= pond_unit


# ────────────────────────────────────────────────────────────────
# CAS 4 — Protection câble PV selon N//
# ────────────────────────────────────────────────────────────────

def test_cas4_n_par_1_disjoncteur_seul():
    t = calculer_troncon_panneau_onduleur(
        isc=10.2, n_parallele=1, vmp_string=40.2, longueur=10
    )
    assert t["fusible_gpv"] is False
    assert t["protection"] == "Disjoncteur DC"
    assert t["qt_fusible_gpv"] == 0

def test_cas4_n_par_3_fusible_gpv():
    t = calculer_troncon_panneau_onduleur(
        isc=10.2, n_parallele=3, vmp_string=40.2, longueur=10
    )
    assert t["fusible_gpv"] is True
    assert "Fusible gPV" in t["protection"]
    assert t["qt_fusible_gpv"] == 3


# ────────────────────────────────────────────────────────────────
# CAS 5 — Protection batterie→onduleur selon courant
# ────────────────────────────────────────────────────────────────

def test_cas5_courant_faible_disjoncteur():
    # Pond=2000W, Usys=48V → I = (2000/48)*1.10 ≈ 45.8A ≤ 63A → Disj DC
    troncons = calculer_troncon_batterie_onduleur(
        pond=2000, usys=48, longueur=2, nb_onduleurs=1
    )
    assert troncons[0]["protection"] == "Disjoncteur DC"
    assert troncons[0]["fusible_nh"] is None

def test_cas5_courant_fort_fusible_nh():
    # Pond=10000W, Usys=48V → I = (10000/48)*1.10 ≈ 229A > 63A → Fusible NH
    troncons = calculer_troncon_batterie_onduleur(
        pond=10000, usys=48, longueur=2, nb_onduleurs=1
    )
    assert "Fusible" in troncons[0]["protection"]
    assert troncons[0]["fusible_nh"] is not None


# ────────────────────────────────────────────────────────────────
# CAS 6 — Sécurité Voc_string < MPPT_max (toutes config 48V)
# ────────────────────────────────────────────────────────────────

def test_cas6_voc_string_inferieur_mppt_max():
    from app.moteur.tables import ONDULEURS_AIO
    panneau = PANNEAU_REF
    erreurs = []
    for ond in ONDULEURS_AIO:
        if ond["usys"] != 48:
            continue
        # Simuler un Pc qui nécessite plusieurs panneaux
        pc_test = ond["puissance"] * 0.8
        result = calculer_panneaux_aio(pc_test, ond, panneau)
        voc_string = result["voc_string"]
        mppt_max = ond["mppt_max"]
        if voc_string >= mppt_max:
            erreurs.append(
                f"Onduleur {ond['puissance']}W : Voc_string={voc_string}V >= MPPT_max={mppt_max}V"
            )
    assert not erreurs, "\n".join(erreurs)


# ────────────────────────────────────────────────────────────────
# CAS 7 — Pipeline complet étape1 → étape2 → étape3
# ────────────────────────────────────────────────────────────────

PARAMS_COMPLET = {
    "appareils": [
        {"puissance": 100, "quantite": 4, "h_jour": 5, "h_nuit": 2, "facteur_pointe": 1.0},
        {"puissance": 200, "quantite": 2, "h_jour": 3, "h_nuit": 0, "facteur_pointe": 1.5},
        {"puissance": 60,  "quantite": 6, "h_jour": 4, "h_nuit": 4, "facteur_pointe": 1.0},
    ],
    "cs": 0.95,
    "k": 1.15,
    "eta": 0.80,
    "n_jours": 2,
    "dod": 0.90,
    "eta_bat": 0.95,
    "irradiation": 5.5,
    "latitude": 6.4,
    "longueur_panneau_ond": 10.0,
    "longueur_reg_bat": 2.0,
    "longueur_bat_ond": 2.0,
    "longueur_ond_tableau": 10.0,
    "type_regulateur": "AIO",
}

def test_pipeline_complet():
    # Étape 1
    e1 = calculer_etape1(PARAMS_COMPLET)
    assert e1["ej"] > 0
    assert e1["pond"] > 0
    assert e1["pc"] > 0
    assert e1["onduleur_suggere"] is not None

    # Étape 2
    onduleur = e1["onduleur_suggere"]["onduleur"]
    equipements = {
        "panneau": PANNEAU_REF,
        "onduleur": onduleur,
        "type_regulateur": "AIO",
    }
    e2 = calculer_etape2(e1, PARAMS_COMPLET, equipements)
    assert e2["panneaux"]["np_final"] >= 1
    assert e2["batteries"]["nb_batteries"] >= 1
    assert e2["usys"] in [12, 24, 48]

    # Vérification sécurité Voc
    voc_string = e2["panneaux"]["voc_string"]
    mppt_max = onduleur["mppt_max"]
    assert voc_string < mppt_max, f"Voc_string={voc_string} >= MPPT_max={mppt_max}"

    # Étape 3
    e3 = calculer_etape3(e1, e2, PARAMS_COMPLET, equipements)
    assert len(e3["troncons"]) >= 2
    assert len(e3["parafoudres"]) == 2
    for t in e3["troncons"]:
        assert t["section"] > 0
        assert t["calibre"] > 0
