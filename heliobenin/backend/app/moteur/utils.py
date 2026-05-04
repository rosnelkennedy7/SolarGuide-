import math
from .tables import SECTIONS_DC, SECTIONS_AC, CALIBRES_DC, CALIBRES_AC, FUSIBLES_NH

RHO = 0.02150  # résistivité cuivre corrigée (Ω.mm²/m)


def section_normalisee_dc(s_calculee: float) -> float:
    for s in SECTIONS_DC:
        if s >= s_calculee:
            return s
    return SECTIONS_DC[-1]


def section_normalisee_ac(s_calculee: float) -> float:
    for s in SECTIONS_AC:
        if s >= s_calculee:
            return s
    return SECTIONS_AC[-1]


def calibre_normalise_dc(ip_min: float) -> float:
    for c in CALIBRES_DC:
        if c >= ip_min:
            return c
    return CALIBRES_DC[-1]


def calibre_normalise_ac(ip_min: float) -> float:
    for c in CALIBRES_AC:
        if c >= ip_min:
            return c
    return CALIBRES_AC[-1]


def arrondi_math(x: float) -> int:
    return math.floor(x + 0.5)


def arrondi_sup(x: float) -> int:
    return math.ceil(x)


def get_fusible_nh(courant: float) -> dict:
    ip_min = courant * 1.25
    for f in FUSIBLES_NH:
        if f["calibre_max"] >= ip_min:
            return {
                "type": f["type"],
                "calibre": f["calibre_max"],
                "porte_fusible": f["porte_fusible"],
            }
    return {"type": "HORS_LIMITE", "calibre": None, "porte_fusible": None}


def calculer_section(rho: float, L: float, I: float, delta_u: float, U: float) -> float:
    return (2 * rho * L * I) / (delta_u * U)
