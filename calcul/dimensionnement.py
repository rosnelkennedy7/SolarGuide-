# ── Constantes physiques et normes ──
RHO_CUIVRE   = 0.0178   # Résistivité cuivre Ω·mm²/m
PR           = 0.75     # Ratio de performance (contexte béninois)
COEFF_SIMULT = 0.80     # Coefficient de simultanéité
ETA_SYS      = 0.80     # Rendement système
COEFF_SEC    = 1.25     # Coefficient de sécurité standard (autonome)
COEFF_BAT_HYBRIDE = 1.40  # Coefficient sécurité batteries hybride — imprévisibilité SBEE

# ── Paramètres panneau par défaut (300 Wc standard Bénin) ──
PAN_VOC_DEFAUT  = 45.0   # V — tension circuit ouvert
PAN_ISC_DEFAUT  = 9.0    # A — courant court-circuit
PAN_VMP_DEFAUT  = 37.0   # V — tension puissance max
PAN_IMP_DEFAUT  = 8.5    # A — courant puissance max
PAN_WC_DEFAUT   = 300    # Wc
V_MAX_REG_DEFAUT = 150   # V — tension max entrée régulateur MPPT standard

# ── DoD par technologie batterie ──
DOD_TABLE = {
    "Plomb-acide": 0.40,
    "AGM":         0.50,
    "Gel":         0.70,
    "LiFePO4":     0.80,
    "Lithium-Ion": 0.95,
}

# ── Rendement par technologie batterie ──
RENDEMENT_BAT = {
    "Plomb-acide": 0.80,
    "AGM":         0.85,
    "Gel":         0.85,
    "LiFePO4":     0.95,
    "Lithium-Ion": 0.95,
}

# ── Durée de vie batteries ──
DUREE_VIE_BAT = {
    "Plomb-acide": 5,
    "AGM":         7,
    "Gel":         8,
    "LiFePO4":     12,
    "Lithium-Ion": 12,
}

# ── Sections câbles normalisées (mm²) ──
SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50]

# ── Calibres disjoncteurs normalisés (A) ──
CALIBRES_DISJ = [6, 10, 16, 20, 25, 32, 40, 63]

# ── Calibres régulateurs normalisés (A) ──
CALIBRES_REG = [10, 20, 30, 40, 60, 80, 100]

# ── Puissances panneaux disponibles (Wc) ──
PUISSANCES_PAN = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700]

# ── Capacités batteries disponibles (Ah) ──
CAPACITES_BAT = [20, 40, 60, 80, 100, 120, 150, 200, 250, 300, 400, 500]

# ── Puissances onduleurs disponibles (W) ──
PUISSANCES_OND = [300, 500, 700, 1000, 1500, 2000, 3000, 5000, 8000, 10000]


# ============================================================
# FONCTIONS UTILITAIRES
# ============================================================

def calculer_serie_parallele(nb_panneaux, tension_sys, params_pan=None):
    """
    Calcule le câblage série/parallèle du champ PV.
    Ns = arrondi(V_sys / Vmp)
    Np = arrondi_sup(nb_panneaux / Ns)
    """
    p = params_pan or {}
    Vmp = p.get('vmp', PAN_VMP_DEFAUT)
    Voc = p.get('voc', PAN_VOC_DEFAUT)
    Isc = p.get('isc', PAN_ISC_DEFAUT)
    V_max_reg = p.get('v_max_reg', V_MAX_REG_DEFAUT)

    Ns = max(1, round(tension_sys / Vmp))
    Np = max(1, -(-nb_panneaux // Ns))   # arrondi supérieur

    Voc_champ = Ns * Voc
    Isc_champ = Np * Isc
    alerte_tension = Voc_champ > V_max_reg

    return {
        "Ns":             Ns,
        "Np":             Np,
        "Voc_champ":      round(Voc_champ, 1),
        "Isc_champ":      round(Isc_champ, 1),
        "Vmp_utilise":    Vmp,
        "Voc_utilise":    Voc,
        "Isc_unitaire":   Isc,
        "V_max_reg":      V_max_reg,
        "alerte_tension": alerte_tension,
        "message_alerte": (
            f"⚠️ Voc champ ({Voc_champ:.0f}V) dépasse la tension max du régulateur ({V_max_reg}V). "
            f"Réduire Ns à {max(1, round((V_max_reg * 0.9) / Voc))} panneaux en série."
        ) if alerte_tension else None,
    }


def calculer_section_cable(I, L, delta_u):
    """
    Calcule la section minimale du câble.
    S = (2 × ρ × L × I) / ΔU
    """
    S_theorique = (2 * RHO_CUIVRE * L * I) / delta_u
    return next((s for s in SECTIONS if s >= S_theorique), 50)


def verifier_chute_tension(I, L, S, tension, type_circuit):
    """
    Vérifie la chute de tension et propose corrections.
    type_circuit: 'DC' (max 3%) ou 'AC' (max 5%)
    """
    seuil_pct = 3.0 if type_circuit == 'DC' else 5.0
    delta_u   = tension * (seuil_pct / 100)

    # Chute réelle
    chute_v   = (2 * RHO_CUIVRE * L * I) / S
    chute_pct = (chute_v / tension) * 100

    if chute_pct <= seuil_pct:
        return {"ok": True, "chute": round(chute_pct, 2), "message": None}

    # Distance max admissible avec section actuelle
    L_max = round((S * delta_u) / (2 * RHO_CUIVRE * I), 1)

    # Section recommandée pour respecter la norme
    S_min     = (2 * RHO_CUIVRE * L * I) / delta_u
    S_recomm  = next((s for s in SECTIONS if s >= S_min), 50)

    return {
        "ok":            False,
        "chute":         round(chute_pct, 2),
        "seuil":         seuil_pct,
        "L_max":         L_max,
        "S_recommandee": S_recomm,
        "message": (
            f"⚠️ Chute de tension {type_circuit} : {round(chute_pct, 2)}% "
            f"(max autorisé : {seuil_pct}%). "
            f"Distance max recommandée : {L_max}m. "
            f"Ou augmenter la section à {S_recomm}mm²."
        )
    }


def calculer_section_terre(section_phase):
    """
    Section câble de terre — Norme CEI 62446 :
    ≤ 16mm² → même section | > 16mm² → 16mm² max
    """
    return section_phase if section_phase <= 16 else 16


def determiner_tension(P_total_wc):
    """Tension système selon puissance champ PV."""
    if P_total_wc <= 800:   return 12
    elif P_total_wc <= 3000: return 24
    else:                    return 48


def determiner_gamme(E_journaliere, P_installee):
    """
    Gamme attribuée AUTOMATIQUEMENT selon énergie et puissance.
    L'utilisateur ne choisit pas sa gamme.
    """
    if E_journaliere > 5000 or P_installee > 3000:
        return "Premium"
    elif E_journaliere > 2000 or P_installee > 1000:
        return "Standard"
    else:
        return "Economique"


def determiner_type_regulateur(gamme, type_onduleur, P_total_wc=0):
    """
    MPPT si > 400Wc, PWM si ≤ 400Wc.
    All-in-One → régulateur intégré (pas de régulateur séparé).
    """
    if type_onduleur == "allinone":
        return "Integre"
    elif P_total_wc > 400:
        return "MPPT"
    else:
        return "PWM"


def determiner_type_onduleur(gamme, type_systeme):
    """
    Type onduleur selon gamme et système.
    """
    if gamme == "Premium":
        return "allinone"
    elif gamme == "Standard":
        return "hybride" if "hybrid" in type_systeme.lower() else "classique"
    else:
        return "classique"


def calculer_entretien_annuel(P_total_wc):
    """Coût entretien annuel solaire selon puissance installée."""
    if P_total_wc < 500:    return 10000
    elif P_total_wc < 1500: return 15000
    elif P_total_wc < 3000: return 20000
    else:                   return 30000


def calculer_entretien_groupe(groupe_kva):
    """Coût entretien annuel groupe électrogène selon puissance."""
    if groupe_kva < 2:    return {"pieces": 38000, "main_oeuvre": 14000, "total": 52000}
    elif groupe_kva < 5:  return {"pieces": 54000, "main_oeuvre": 18000, "total": 72000}
    elif groupe_kva < 10: return {"pieces": 78000, "main_oeuvre": 24000, "total": 102000}
    else:                 return {"pieces": 108000, "main_oeuvre": 32000, "total": 140000}


# ============================================================
# MOTEUR PRINCIPAL — DIMENSIONNEMENT NORMAL
# ============================================================

def dimensionner(energie_a_couvrir, irradiation, type_systeme,
                 liste_appareils, type_batterie="AGM",
                 jours_autonomie=1, distance_panneaux_reg=5,
                 distance_reg_bat=2, distance_bat_ond=1,
                 distance_ac=3, type_installation="residentiel",
                 heures_coupure=None, type_onduleur_force=None):

    is_hybrid = "hybrid" in str(type_systeme).lower() or "hybride" in str(type_systeme).lower()

    # ── ETAPE 1 : Bilan énergétique ──
    # E_journaliere = énergie réelle après coeff simultanéité
    E_journaliere = energie_a_couvrir  # déjà calculée côté frontend avec × 0.80

    # ── ETAPE 2 : Énergie effective selon type système ──
    if is_hybrid and heures_coupure is not None:
        # Hybride : on couvre uniquement les heures de coupure
        # k = 1.40 pour panneaux ET batteries en hybride
        E_panneaux   = E_journaliere * (heures_coupure / 24) * COEFF_BAT_HYBRIDE
        E_batteries  = E_journaliere * (heures_coupure / 24) * COEFF_BAT_HYBRIDE
    else:
        # Off-grid : on couvre 24h avec k=1.25
        E_panneaux   = E_journaliere * COEFF_SEC
        E_batteries  = E_journaliere * COEFF_SEC

    # ── ETAPE 3 : Puissance crête panneaux ──
    # Pc = E / (PR × Irradiation) × 1.25
    Pc_theorique = E_panneaux / (PR * irradiation)
    P_unitaire   = next((p for p in PUISSANCES_PAN if p >= Pc_theorique), PUISSANCES_PAN[-1])
    nb_panneaux  = max(1, -(-int(Pc_theorique) // P_unitaire))  # arrondi supérieur
    P_total      = P_unitaire * nb_panneaux

    # ── ETAPE 4 : Tension système ──
    tension = determiner_tension(P_total)

    # ── ETAPE 5 : Capacité batteries ──
    # C = (E × Autonomie) / (Tension × DoD × Rendement)
    DoD        = DOD_TABLE.get(type_batterie, 0.50)
    rendement  = RENDEMENT_BAT.get(type_batterie, 0.85)
    C_theorique = (E_batteries * jours_autonomie) / (tension * DoD * rendement)
    C_unitaire  = next((c for c in CAPACITES_BAT if c >= C_theorique), CAPACITES_BAT[-1])
    nb_batteries = max(1, -(-int(C_theorique) // C_unitaire))

    # ── ETAPE 6 : Puissance installée et gamme ──
    puissance_totale_w = sum(a["puissance"] * a.get("quantite", 1) for a in liste_appareils) * COEFF_SIMULT
    gamme = determiner_gamme(E_journaliere, puissance_totale_w)

    # ── ETAPE 7 : Type onduleur et régulateur ──
    type_ond = type_onduleur_force if type_onduleur_force else determiner_type_onduleur(gamme, type_systeme)
    type_reg = determiner_type_regulateur(gamme, type_ond, P_total)

    # ── ETAPE 8 : Régulateur ──
    # I_reg = (Pc / Tension) × 1.25
    I_reg_th = (P_total / tension) * COEFF_SEC
    I_reg    = next((c for c in CALIBRES_REG if c >= I_reg_th), CALIBRES_REG[-1])

    # ── ETAPE 9 : Onduleur ──
    # P_ond = Bilan puissance × 1.25
    P_ond_th   = puissance_totale_w * COEFF_SEC
    P_onduleur = next((p for p in PUISSANCES_OND if p >= P_ond_th), PUISSANCES_OND[-1])

    # ── ETAPE 10 : ATS si hybride + onduleur classique ──
    ats = None
    if is_hybrid and type_ond == "classique":
        p_ats_list = [1000, 2000, 3000, 5000, 8000, 10000]
        ats = next((p for p in p_ats_list if p >= P_onduleur * COEFF_SEC), 10000)

    # ── ETAPE 11 : Câbles DC — 3 tronçons ──
    # Tronçon 1 : Panneaux → Régulateur (H1Z2Z2K — extérieur)
    I_pan_reg  = P_total / tension
    dU_DC      = tension * 0.03
    S_pan_reg  = calculer_section_cable(I_pan_reg, distance_panneaux_reg, dU_DC)
    chute_pan_reg = verifier_chute_tension(I_pan_reg, distance_panneaux_reg, S_pan_reg, tension, 'DC')

    # Tronçon 2 : Régulateur → Batteries (souple rouge/noir — intérieur)
    I_reg_bat  = P_total / tension
    S_reg_bat  = calculer_section_cable(I_reg_bat, distance_reg_bat, dU_DC)
    chute_reg_bat = verifier_chute_tension(I_reg_bat, distance_reg_bat, S_reg_bat, tension, 'DC')

    # Tronçon 3 : Batteries → Onduleur (souple rouge/noir — intérieur)
    I_bat_ond  = P_onduleur / tension
    S_bat_ond  = calculer_section_cable(I_bat_ond, distance_bat_ond, dU_DC)
    chute_bat_ond = verifier_chute_tension(I_bat_ond, distance_bat_ond, S_bat_ond, tension, 'DC')

    # ── ETAPE 12 : Câble AC (H07RN-F) ──
    I_AC   = P_onduleur / 220
    dU_AC  = 220 * 0.05
    S_AC   = calculer_section_cable(I_AC, distance_ac, dU_AC)
    chute_ac = verifier_chute_tension(I_AC, distance_ac, S_AC, 220, 'AC')

    # ── ETAPE 13 : Câbles de terre ──
    S_terre_DC = calculer_section_terre(S_pan_reg)
    S_terre_AC = calculer_section_terre(S_AC)

    # ── ETAPE 14 : Disjoncteurs ──
    disj_DC = next((c for c in CALIBRES_DISJ if c >= I_pan_reg * COEFF_SEC), 63)
    disj_AC = next((c for c in CALIBRES_DISJ if c >= I_AC * COEFF_SEC), 63)

    # ── ETAPE 15 : Groupe électrogène équivalent ──
    puissance_groupe_kva = round((puissance_totale_w / 0.8) * COEFF_SEC / 1000, 1)
    groupes_kva = [0.65, 1.0, 1.5, 2.0, 2.5, 3.0, 4.5, 6.0, 7.5, 10.0]
    groupe_kva  = next((g for g in groupes_kva if g >= puissance_groupe_kva), 10.0)

    # ── ETAPE 16 : Autonomie réelle ──
    capacite_utile_wh = C_unitaire * nb_batteries * tension * DoD * rendement
    autonomie_h = round(capacite_utile_wh / puissance_totale_w, 1) if puissance_totale_w > 0 else 0

    # ── ETAPE 17 : Qualité site ──
    if irradiation >= 5.5:
        qualite_site = {"label": "Site exceptionnel", "etoiles": 4, "couleur": "#166534"}
    elif irradiation >= 5.0:
        qualite_site = {"label": "Site excellent",    "etoiles": 3, "couleur": "#16a34a"}
    elif irradiation >= 4.5:
        qualite_site = {"label": "Site très bon",     "etoiles": 2, "couleur": "#ca8a04"}
    else:
        qualite_site = {"label": "Site correct",      "etoiles": 1, "couleur": "#ea580c"}

    # ── ETAPE 18 : Production mensuelle estimée ──
    irr_mensuelle = {
        "Jan": 5.2, "Fév": 5.6, "Mar": 5.8, "Avr": 5.4,
        "Mai": 5.0, "Jun": 4.4, "Jul": 4.1, "Aoû": 4.2,
        "Sep": 4.5, "Oct": 4.8, "Nov": 4.9, "Déc": 5.0
    }
    production_mensuelle = {
        mois: round(P_total * irr * PR * 30 / 1000, 1)
        for mois, irr in irr_mensuelle.items()
    }

    # ── ETAPE 19 : Entretien ──
    entretien_solaire  = calculer_entretien_annuel(P_total)
    entretien_groupe   = calculer_entretien_groupe(groupe_kva)

    # ── ETAPE 20 : Alertes ──
    alerte = None
    if P_total > 3000:
        alerte = "Système très puissant (>3kWc) — vérifiez si tous vos appareils sont nécessaires."
    elif P_total > 1500:
        alerte = "Système de puissance élevée — pensez à réduire les appareils énergivores."

    note_cable = (
        f"Sections calculées selon distances déclarées : "
        f"{distance_panneaux_reg}m (panneaux→régulateur), "
        f"{distance_reg_bat}m (régulateur→batteries), "
        f"{distance_bat_ond}m (batteries→onduleur), "
        f"{distance_ac}m (onduleur→tableau). "
        f"À confirmer avec le technicien selon disponibilité marché."
    )

    # ── ETAPE SERIE/PARALLELE ──
    serie_parallele = calculer_serie_parallele(nb_panneaux, tension)

    # ── Tension mpp par système pour calcul Isc_champ classique ──
    U_mpp_map = {12: 18, 24: 30, 48: 36}
    U_mpp = U_mpp_map.get(tension, 30)
    Isc_champ_old = round((P_total / U_mpp) * 1.10, 2)

    return {
        "PR":             PR,
        "tension":        tension,
        "gamme":          gamme,
        "E_journaliere":  round(E_journaliere, 1),
        "E_panneaux":     round(E_panneaux, 1),
        "E_batteries":    round(E_batteries, 1),

        "panneau": {
            "puissance_unitaire": P_unitaire,
            "nombre":             nb_panneaux,
            "puissance_totale":   P_total,
        },
        "batterie": {
            "type":             type_batterie,
            "capacite_unitaire": C_unitaire,
            "nombre":           nb_batteries,
            "tension":          tension,
            "DoD":              DoD,
            "rendement":        rendement,
        },
        "regulateur": {
            "courant": I_reg,
            "type":    type_reg,
        },
        "onduleur": {
            "puissance": P_onduleur,
            "type":      type_ond,
        },
        "ats": ats,

        "cables": {
            # Tronçon 1 : Panneaux → Régulateur (H1Z2Z2K extérieur)
            "pan_reg": {
                "type":    "H1Z2Z2K",
                "usage":   "Extérieur — résistant UV",
                "section": S_pan_reg,
                "metrage": distance_panneaux_reg * 2,
                "courant": round(I_pan_reg, 2),
                "chute":   chute_pan_reg,
            },
            # Tronçon 2 : Régulateur → Batteries (souple intérieur)
            "reg_bat": {
                "type":    "Souple rouge/noir",
                "usage":   "Intérieur — local technique",
                "section": S_reg_bat,
                "metrage": distance_reg_bat * 2,
                "courant": round(I_reg_bat, 2),
                "chute":   chute_reg_bat,
            },
            # Tronçon 3 : Batteries → Onduleur (souple intérieur)
            "bat_ond": {
                "type":    "Souple rouge/noir",
                "usage":   "Intérieur — local technique",
                "section": S_bat_ond,
                "metrage": distance_bat_ond * 2,
                "courant": round(I_bat_ond, 2),
                "chute":   chute_bat_ond,
            },
            # Tronçon AC : Onduleur → Tableau (H07RN-F)
            "ac": {
                "type":    "H07RN-F",
                "usage":   "Câble AC souple",
                "section": S_AC,
                "metrage": distance_ac * 2,
                "courant": round(I_AC, 2),
                "chute":   chute_ac,
            },
            # Câbles de terre
            "terre_DC": S_terre_DC,
            "terre_AC": S_terre_AC,
        },

        "disjoncteurs": {
            "DC": disj_DC,
            "AC": disj_AC,
        },

        "puissance_installee":  round(puissance_totale_w, 1),
        "autonomie_heures":     autonomie_h,
        "groupe_kva":           groupe_kva,
        "qualite_site":         qualite_site,
        "production_mensuelle": production_mensuelle,
        "entretien_solaire":    entretien_solaire,
        "entretien_groupe":     entretien_groupe,
        "alerte":               alerte,
        "note_cable":           note_cable,
        "heures_coupure":       heures_coupure,
        "is_hybrid":            is_hybrid,
        "coeff_bat":            COEFF_BAT_HYBRIDE if is_hybrid else COEFF_SEC,
        "serie_parallele":      serie_parallele,
        "Isc_champ":            Isc_champ_old,
    }


# ============================================================
# MOTEUR BUDGET — DIMENSIONNEMENT PAR BUDGET
# ============================================================

def dimensionner_par_budget(budget_fcfa, irradiation, type_systeme,
                             liste_appareils, type_batterie="AGM",
                             jours_autonomie=1, heures_coupure=None,
                             distance_panneaux_reg=5, distance_reg_bat=2,
                             distance_bat_ond=1, distance_ac=3):

    # ── Validation budget minimum ──
    BUDGET_MIN = 150000
    if budget_fcfa < BUDGET_MIN:
        return {
            "compatible": False,
            "erreur_budget": True,
            "message": f"Budget insuffisant. Minimum requis : {BUDGET_MIN:,} FCFA pour une installation aux normes.",
        }

    is_hybrid = "hybrid" in str(type_systeme).lower()

    # ── Répartition budget composants ──
    # 40% panneaux / 40% batteries / 15% onduleur+reg / 5% câblage
    budget_pan  = budget_fcfa * 0.40
    budget_bat  = budget_fcfa * 0.40
    budget_ond  = budget_fcfa * 0.15

    # ── Prix IRENA 2024 × taux change × import ──
    taux_fcfa = 571  # Taux temps réel — sera remplacé par API
    coeff_import_pan = 1.30
    coeff_import_bat = 1.40

    prix_wc = 0.25 * taux_fcfa * coeff_import_pan
    prix_ah = {
        "AGM":         0.95 * taux_fcfa * coeff_import_bat,
        "Lithium-Ion": (150 / 1000 * 48) * taux_fcfa * coeff_import_bat,  # 150 USD/kWh → Ah à 48V
        "Plomb-acide": 0.45 * taux_fcfa * coeff_import_bat,
    }.get(type_batterie, 0.95 * taux_fcfa * coeff_import_bat)

    # ── Dimensionner selon budget alloué ──
    P_possible  = budget_pan / prix_wc
    P_unitaire  = next((p for p in reversed(PUISSANCES_PAN) if p <= P_possible), PUISSANCES_PAN[0])
    P_total     = P_unitaire

    C_possible  = budget_bat / prix_ah
    DoD         = DOD_TABLE.get(type_batterie, 0.50)
    rendement   = RENDEMENT_BAT.get(type_batterie, 0.85)
    C_unitaire  = next((c for c in reversed(CAPACITES_BAT) if c <= C_possible), CAPACITES_BAT[0])

    tension     = determiner_tension(P_total)

    # ── Gamme automatique ──
    puissance_totale_w = sum(a["puissance"] * a.get("quantite", 1) for a in liste_appareils) * COEFF_SIMULT
    E_journaliere = sum(a["puissance"] * a.get("quantite", 1) * a.get("heures", 4) for a in liste_appareils) * COEFF_SIMULT
    gamme = determiner_gamme(E_journaliere, puissance_totale_w)

    # ── Types onduleur et régulateur ──
    type_ond = determiner_type_onduleur(gamme, type_systeme)
    type_reg = determiner_type_regulateur(gamme, type_ond, P_total)

    # ── Régulateur ──
    I_reg_th = (P_total / tension) * COEFF_SEC
    I_reg    = next((c for c in CALIBRES_REG if c >= I_reg_th), CALIBRES_REG[-1])

    # ── Onduleur ──
    P_ond_th   = max(puissance_totale_w * COEFF_SEC, 300)
    P_onduleur = next((p for p in PUISSANCES_OND if p >= P_ond_th), PUISSANCES_OND[-1])

    # ── ATS si hybride + classique ──
    ats = None
    if is_hybrid and type_ond == "classique":
        p_ats_list = [1000, 2000, 3000, 5000]
        ats = next((p for p in p_ats_list if p >= P_onduleur * COEFF_SEC), 5000)

    # ── Énergie possible avec ce système ──
    if is_hybrid and heures_coupure:
        E_possible = P_total * irradiation * PR * (heures_coupure / 24) * COEFF_SEC
    else:
        E_possible = P_total * irradiation * PR

    # ── Appareils couverts / à retirer ──
    conso_reelle = E_journaliere
    appareils_a_retirer = []
    conso_cumul = 0
    for a in sorted(liste_appareils, key=lambda x: x["puissance"] * x.get("quantite", 1) * x.get("heures", 4), reverse=True):
        contrib = a["puissance"] * a.get("quantite", 1) * a.get("heures", 4) * COEFF_SIMULT
        if conso_cumul + contrib > E_possible:
            appareils_a_retirer.append({"nom": a["nom"], "puissance": a["puissance"], "contrib": round(contrib)})
        else:
            conso_cumul += contrib

    # ── Câbles ──
    dU_DC = tension * 0.03
    dU_AC = 220 * 0.05

    I_pan_reg = P_total / tension
    S_pan_reg = calculer_section_cable(I_pan_reg, distance_panneaux_reg, dU_DC)
    chute_pan_reg = verifier_chute_tension(I_pan_reg, distance_panneaux_reg, S_pan_reg, tension, 'DC')

    I_reg_bat = P_total / tension
    S_reg_bat = calculer_section_cable(I_reg_bat, distance_reg_bat, dU_DC)
    chute_reg_bat = verifier_chute_tension(I_reg_bat, distance_reg_bat, S_reg_bat, tension, 'DC')

    I_bat_ond = P_onduleur / tension
    S_bat_ond = calculer_section_cable(I_bat_ond, distance_bat_ond, dU_DC)
    chute_bat_ond = verifier_chute_tension(I_bat_ond, distance_bat_ond, S_bat_ond, tension, 'DC')

    I_AC  = P_onduleur / 220
    S_AC  = calculer_section_cable(I_AC, distance_ac, dU_AC)
    chute_ac = verifier_chute_tension(I_AC, distance_ac, S_AC, 220, 'AC')

    S_terre_DC = calculer_section_terre(S_pan_reg)
    S_terre_AC = calculer_section_terre(S_AC)

    disj_DC = next((c for c in CALIBRES_DISJ if c >= I_pan_reg * COEFF_SEC), 63)
    disj_AC = next((c for c in CALIBRES_DISJ if c >= I_AC * COEFF_SEC), 63)

    # ── Entretien ──
    entretien_solaire = calculer_entretien_annuel(P_total)

    return {
        "compatible":          len(appareils_a_retirer) == 0,
        "budget_initial":      budget_fcfa,
        "gamme":               gamme,
        "tension":             tension,
        "E_possible":          round(E_possible, 1),
        "conso_reelle":        round(conso_reelle, 1),
        "appareils_a_retirer": appareils_a_retirer,

        "panneau": {
            "puissance_unitaire": P_unitaire,
            "nombre":             1,
            "puissance_totale":   P_total,
        },
        "batterie": {
            "type":              type_batterie,
            "capacite_unitaire": C_unitaire,
            "nombre":            1,
            "tension":           tension,
            "DoD":               DoD,
            "rendement":         rendement,
        },
        "regulateur": {
            "courant": I_reg,
            "type":    type_reg,
        },
        "onduleur": {
            "puissance": P_onduleur,
            "type":      type_ond,
        },
        "ats": ats,

        "cables": {
            "pan_reg": {
                "type": "H1Z2Z2K", "section": S_pan_reg,
                "metrage": distance_panneaux_reg * 2, "chute": chute_pan_reg,
            },
            "reg_bat": {
                "type": "Souple rouge/noir", "section": S_reg_bat,
                "metrage": distance_reg_bat * 2, "chute": chute_reg_bat,
            },
            "bat_ond": {
                "type": "Souple rouge/noir", "section": S_bat_ond,
                "metrage": distance_bat_ond * 2, "chute": chute_bat_ond,
            },
            "ac": {
                "type": "H07RN-F", "section": S_AC,
                "metrage": distance_ac * 2, "chute": chute_ac,
            },
            "terre_DC": S_terre_DC,
            "terre_AC": S_terre_AC,
        },

        "disjoncteurs":     {"DC": disj_DC, "AC": disj_AC},
        "puissance_installee": round(puissance_totale_w, 1),
        "entretien_solaire":   entretien_solaire,
        "is_hybrid":           is_hybrid,
    }


# ============================================================
# ENTRETIEN SOLAIRE DÉTAILLÉ
# ============================================================

def calculer_entretien_solaire(type_batterie, P_total_wc):
    duree_vie = DUREE_VIE_BAT.get(type_batterie, 7)
    cout_annuel = calculer_entretien_annuel(P_total_wc)

    entretiens = [
        {
            "tache":     "Nettoyage panneaux solaires",
            "frequence": "Hebdomadaire (harmattan) · Mensuel (saison des pluies)",
            "cout_fcfa": 0,
            "priorite":  "Haute",
        },
        {
            "tache":     "Nettoyage + serrage connexions batteries",
            "frequence": "Trimestrielle",
            "cout_fcfa": 0,
            "priorite":  "Moyenne",
        },
        {
            "tache":     "Vérification régulateur (voyants, tension)",
            "frequence": "Trimestrielle",
            "cout_fcfa": 0,
            "priorite":  "Moyenne",
        },
        {
            "tache":     "Nettoyage + serrage connexions onduleur",
            "frequence": "Trimestrielle",
            "cout_fcfa": 0,
            "priorite":  "Moyenne",
        },
        {
            "tache":     "Vérification visuelle câbles",
            "frequence": "Annuelle",
            "cout_fcfa": 0,
            "priorite":  "Basse",
        },
        {
            "tache":     "Vérification technique générale",
            "frequence": "Annuelle",
            "cout_fcfa": cout_annuel,
            "priorite":  "Haute",
        },
        {
            "tache":     f"Remplacement batterie {type_batterie}",
            "frequence": f"Tous les {duree_vie} ans",
            "cout_fcfa": 0,
            "priorite":  "Planifiée",
        },
    ]

    return {
        "entretiens":      entretiens,
        "cout_annuel":     cout_annuel,
        "duree_vie_bat":   duree_vie,
    }