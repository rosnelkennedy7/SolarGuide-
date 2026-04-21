function initSystemePage() {
  if (!state.typeBatterie) selectBatterie("AGM");
  if (!state.typeOnduleur) selectTypeOnduleur("classique");
  updateSectionsOnduleur();
}
function selectBatterie(type) {
  state.typeBatterie = type;
  ["AGM", "Lithium-Ion", "Plomb-acide", "Gel", "LiFePO4"].forEach((t) => {
    const el = document.getElementById("bat-" + t);
    if (el) el.classList.remove("selected");
  });
  const el = document.getElementById("bat-" + type);
  if (el) el.classList.add("selected");
}
function selectAutonomie(j) {
  state.joursAutonomie = j;
  [1, 2, 3].forEach((n) => {
    const btn = document.getElementById("auto-" + n);
    if (btn) {
      btn.style.background = n === j ? "var(--green-800)" : "";
      btn.style.color = n === j ? "#fff" : "";
      btn.style.borderColor = n === j ? "var(--green-800)" : "";
    }
  });
}
function selectOptionReseau(option) {
  state.optionReseau = option;
  ["ats", "hybride"].forEach((o) => {
    const el = document.getElementById("opt-" + o);
    if (el) el.classList.remove("selected");
  });
  const el = document.getElementById("opt-" + option);
  if (el) el.classList.add("selected");
}
function selectTypeOnduleur(type) {
  state.typeOnduleur = type;
  ["classique", "hybride", "allinone"].forEach((t) => {
    const el = document.getElementById("ond-" + t);
    if (el) el.classList.remove("selected");
  });
  const el = document.getElementById("ond-" + type);
  if (el) el.classList.add("selected");
  updateSectionsOnduleur();
}
function updateSectionsOnduleur() {
  const secAts = document.getElementById("section-ats-info");
  const secOndHybride = document.getElementById("section-onduleur-hybride");
  const isHybridSBEE = state.typeSysteme === "hybrid";
  const ondType = state.typeOnduleur || "classique";
  if (secAts) {
    if (isHybridSBEE && ondType === "classique") secAts.style.display = "block";
    else secAts.style.display = "none";
  }
  if (secOndHybride) {
    if (isHybridSBEE) secOndHybride.style.display = "block";
    else secOndHybride.style.display = "none";
  }
}

function validerDistanceCable(distDC, distAC) {
  if (distDC > 50) {
    alert(`⚠️ Distance DC trop grande (${distDC}m). Distance max recommandée : 50m`);
    return false;
  }
  if (distAC > 50) {
    alert(`⚠️ Distance AC trop grande (${distAC}m). Distance max recommandée : 50m`);
    return false;
  }
  if (distDC <= 0 || distAC <= 0) {
    alert("⚠️ Les distances de câbles doivent être supérieures à 0.");
    return false;
  }
  return true;
}

function lancerCalcul(recalcul = false) {
  if (!state.localisation) {
    alert("Retournez à l'étape localisation.");
    return;
  }
  if (!state.appareils || state.appareils.length === 0) {
    alert("Retournez à l'étape consommation.");
    return;
  }

  // Distances câbles — fixes pour non-initié (SG_CONFIG.cables_fixes)
  const cfg = window.SG_CONFIG || {};
  let distDC, distAC;
  if (cfg.cables_fixes) {
    distDC = cfg.distance_dc_defaut || 5;
    distAC = cfg.distance_ac_defaut || 3;
  } else {
    distDC = parseFloat(document.getElementById("distance-dc")?.value) || 5;
    distAC = parseFloat(document.getElementById("distance-ac")?.value) || 3;
    if (!validerDistanceCable(distDC, distAC)) return;
  }

  // Paramètres personnalisés technicien
  const params_technicien = {};
  if (cfg.params) {
    if (cfg.params.PR)                  params_technicien.PR                  = cfg.params.PR;
    if (cfg.params.rendement_systeme)   params_technicien.rendement_systeme   = cfg.params.rendement_systeme;
    if (cfg.params.coeff_simultaneite)  params_technicien.coeff_simultaneite  = cfg.params.coeff_simultaneite;
    if (cfg.params.coeff_securite)      params_technicien.coeff_securite      = cfg.params.coeff_securite;
  }
  if (cfg.panneau_custom) params_technicien.panneau_custom = cfg.panneau_custom;
  if (cfg.batterie_custom) params_technicien.batterie_custom = cfg.batterie_custom;
  if (cfg.regulateur_custom) params_technicien.regulateur_custom = cfg.regulateur_custom;
  if (cfg.onduleur_custom) params_technicien.onduleur_custom = cfg.onduleur_custom;

  showLoader("Calcul du dimensionnement en cours...");
  fetch("/calculer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      energie_a_couvrir: state.energieACouvrir,
      irradiation:       state.localisation.irradiation,
      type_systeme:      state.typeSysteme,
      liste_appareils:   state.appareils,
      type_batterie:     state.typeBatterie || "AGM",
      jours_autonomie:   state.joursAutonomie || 1,
      distance_dc:       distDC,
      distance_ac:       distAC,
      type_installation: state.typeInstallation || "residentiel",
      heures_coupure:    state.heuresCoupure || null,
      params_technicien: Object.keys(params_technicien).length ? params_technicien : null,
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      hideLoader();
      if (data.succes) {
        state.dimensionnement = data.dimensionnement;
        state.prix = data.prix;
        state.entretien = data.entretien;
        afficherResultats(data.dimensionnement, data.prix);
      } else alert("Erreur de calcul : " + data.erreur);
    })
    .catch((e) => {
      hideLoader();
      alert("Erreur de connexion : " + e);
    });
}

function afficherResultats(dim, prix) {
  // ── Badge tension ──
  const badge = document.getElementById("badge-tension");
  if (badge) {
    const colors = {
      12: "background:#dcfce7;color:#166534;",
      24: "background:#dbeafe;color:#1d4ed8;",
      48: "background:#fef3c7;color:#92400e;",
    };
    badge.style.cssText =
      (colors[dim.tension] || colors[24]) +
      "display:inline-flex;align-items:center;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:700;";
    badge.innerHTML = `Système ${dim.tension}V <button class="help-btn" onclick="ouvrirHelp('tension')">En savoir plus</button>`;
  }

  // ── Panneaux ──
  const resPan = document.getElementById("res-panneau");
  if (resPan) resPan.textContent = dim.panneau.puissance_totale + " Wc";
  const resPanNb = document.getElementById("res-panneau-nb");
  if (resPanNb) resPanNb.textContent = dim.panneau.nombre + " × " + dim.panneau.puissance_unitaire + " Wc";

  // ── Batteries ──
  const resBat = document.getElementById("res-batterie");
  if (resBat) resBat.textContent = dim.batterie.capacite_unitaire + " Ah";
  const resBatInfo = document.getElementById("res-batterie-info");
  if (resBatInfo) resBatInfo.textContent = dim.batterie.tension + "V · " + dim.batterie.type + " · " + dim.batterie.nombre + " unité(s)";

  // ── Régulateur (clé : "regulateur", ancien bug "mppt") ──
  const reg = dim.regulateur || dim.mppt || {};
  const typeOnd = state.typeOnduleur || dim.onduleur?.type || "classique";
  const resMppt = document.getElementById("res-mppt");
  if (resMppt) resMppt.textContent = typeOnd === "allinone" ? "Intégré" : (reg.courant || 0) + " A";
  const resMpptType = document.getElementById("res-mppt-type");
  if (resMpptType) resMpptType.textContent = typeOnd === "allinone" ? "MPPT intégré dans l'onduleur" : (reg.type || "MPPT");

  // ── Onduleur ──
  const resOnd = document.getElementById("res-onduleur");
  if (resOnd) resOnd.textContent = dim.onduleur.puissance + " W";
  const resOndType = document.getElementById("res-onduleur-type");
  if (resOndType) resOndType.textContent =
    typeOnd === "allinone" ? "All-in-One + MPPT intégré" :
    typeOnd === "hybride"  ? "Onduleur hybride" :
                             "Onde pure · Classique";

  // ── ATS ──
  const atsCard = document.getElementById("res-ats-card");
  if (atsCard) {
    if (dim.ats && state.typeSysteme === "hybrid" && state.optionReseau === "ats") {
      atsCard.style.display = "flex";
      const resAts = document.getElementById("res-ats");
      if (resAts) resAts.textContent = dim.ats + " W";
    } else atsCard.style.display = "none";
  }

  // ── Câbles — structure correcte : dim.cables.pan_reg.section ──
  const cables = dim.cables || {};
  const panReg = cables.pan_reg || {};
  const batOnd = cables.bat_ond || {};
  const acCable = cables.ac || {};

  const resCableDC = document.getElementById("res-cable-dc");
  if (resCableDC) resCableDC.textContent = (panReg.section || "—") + " mm²";

  const resDCType = document.getElementById("res-cable-dc-type");
  if (resDCType) resDCType.textContent = panReg.type || "H1Z2Z2K";

  const resDisjDC = document.getElementById("res-disj-dc");
  if (resDisjDC) resDisjDC.textContent = (dim.disjoncteurs?.DC || 0) + " A";

  const resTerre = document.getElementById("res-terre-dc");
  if (resTerre) resTerre.textContent = (cables.terre_DC || panReg.section || "—") + " mm²";

  const resCableAC = document.getElementById("res-cable-ac");
  if (resCableAC) resCableAC.textContent = (acCable.section || "—") + " mm²";

  const resCableACSub = document.getElementById("res-cable-ac-sub");
  if (resCableACSub) resCableACSub.textContent = "220V · distance " + ((acCable.metrage || 0) / 2) + "m";

  const resDisjAC = document.getElementById("res-disj-ac");
  if (resDisjAC) resDisjAC.textContent = (dim.disjoncteurs?.AC || 0) + " A";

  const resTerreAC = document.getElementById("res-terre-ac");
  if (resTerreAC) resTerreAC.textContent = (cables.terre_AC || acCable.section || "—") + " mm²";

  // Note câble
  const noteCable = document.getElementById("note-cable");
  if (noteCable && dim.note_cable) noteCable.textContent = "📐 " + dim.note_cable;

  // ── Section Série/Parallèle (technicien) ──
  const sp = dim.serie_parallele;
  const spSection = document.getElementById("sp-section");
  if (sp && spSection) {
    spSection.style.display = "block";
    const elNs = document.getElementById("sp-serie");
    const elNp = document.getElementById("sp-parallele");
    const elVoc = document.getElementById("sp-voc-champ");
    const elIsc = document.getElementById("sp-isc-champ");
    const elAlert = document.getElementById("sp-alert");
    if (elNs) elNs.textContent = sp.Ns;
    if (elNp) elNp.textContent = sp.Np;
    if (elVoc) elVoc.textContent = sp.Voc_champ + " V";
    if (elIsc) elIsc.textContent = sp.Isc_champ + " A";
    if (elAlert) {
      if (sp.alerte_tension) {
        elAlert.style.display = "block";
        elAlert.style.background = "#fee2e2";
        elAlert.style.border = "1px solid #fca5a5";
        elAlert.style.color = "#dc2626";
        elAlert.textContent = sp.message_alerte;
      } else {
        elAlert.style.display = "block";
        elAlert.style.background = "#dcfce7";
        elAlert.style.border = "1px solid #bbf7d0";
        elAlert.style.color = "#166534";
        elAlert.textContent = `✅ Compatible — Voc champ ${sp.Voc_champ}V < ${sp.V_max_reg}V (tension max régulateur)`;
      }
    }
    // Remplir aussi l'ancien sp-card si présent (dashboard technicien)
    const spCard = document.getElementById("sp-card");
    if (spCard) {
      spCard.style.display = "block";
      const spSerie = document.getElementById("sp-serie");
      const spParallele = document.getElementById("sp-parallele");
      const spTotal = document.getElementById("sp-total");
      const spCompat = document.getElementById("sp-compat-msg");
      if (spSerie) spSerie.textContent = sp.Ns;
      if (spParallele) spParallele.textContent = sp.Np;
      if (spTotal) spTotal.textContent = sp.Ns * sp.Np;
      if (spCompat) {
        spCompat.className = "sp-compat " + (sp.alerte_tension ? "sp-warn" : "sp-ok");
        spCompat.textContent = sp.alerte_tension ? sp.message_alerte :
          `✅ Compatible : V=${sp.Voc_champ}V (max ${sp.V_max_reg}V), I=${sp.Isc_champ}A`;
      }
    }
  }

  // ── Devis ──
  const tbody = document.getElementById("devis-body");
  if (tbody) {
    tbody.innerHTML = "";
    let total = 0;
    const distDC = panReg.metrage ? panReg.metrage / 2 : 5;
    const distAC  = acCable.metrage ? acCable.metrage / 2 : 3;
    const lignes = [
      {
        designation: "Panneau solaire " + dim.panneau.puissance_unitaire + " Wc (Monocristallin)",
        qte: dim.panneau.nombre,
        pu: Math.round((prix?.panneau || 0) / Math.max(dim.panneau.nombre, 1)),
      },
      {
        designation: "Batterie " + dim.batterie.type + " " + dim.batterie.capacite_unitaire + "Ah " + dim.batterie.tension + "V",
        qte: dim.batterie.nombre,
        pu: Math.round((prix?.batterie || 0) / Math.max(dim.batterie.nombre, 1)),
      },
    ];
    if (typeOnd !== "allinone")
      lignes.push({
        designation: "Régulateur " + (reg.type || "MPPT") + " " + (reg.courant || 0) + "A",
        qte: 1,
        pu: prix?.regulateur || 0,
      });
    const labelsOnd = {
      classique: "Onduleur classique",
      hybride:   "Onduleur hybride",
      allinone:  "Onduleur All-in-One (MPPT intégré)",
    };
    lignes.push({
      designation: (labelsOnd[typeOnd] || "Onduleur") + " " + dim.onduleur.puissance + "W · Onde pure",
      qte: 1,
      pu: prix?.onduleur || 0,
    });
    if (dim.ats && state.typeSysteme === "hybrid" && typeOnd !== "hybride")
      lignes.push({ designation: "ATS automatique " + dim.ats + "W", qte: 1, pu: prix?.ats || 35000 });

    lignes.push({ designation: `Câble DC ${panReg.section || "—"}mm² H1Z2Z2K — ${panReg.metrage || distDC*2}m`, qte: 1, pu: prix?.cable_dc || 8500 });
    lignes.push({ designation: `Disjoncteur DC ${dim.disjoncteurs?.DC || 0}A — 1000V DC`, qte: 1, pu: prix?.disjoncteur_dc || 5000 });
    lignes.push({ designation: `Câble AC ${acCable.section || "—"}mm² H07RN-F — ${acCable.metrage || distAC*2}m`, qte: 1, pu: prix?.cable_ac || 5000 });
    lignes.push({ designation: `Disjoncteur AC diff. 30mA ${dim.disjoncteurs?.AC || 0}A`, qte: 1, pu: prix?.disjoncteur_ac || 3000 });
    lignes.push({ designation: "Parafoudre DC Type 2 600V/40kA", qte: 1, pu: 17970 });
    lignes.push({ designation: "Parafoudre AC Type 2 230V/40kA", qte: 1, pu: 15500 });
    lignes.push({ designation: `Câble de terre ${cables.terre_DC || panReg.section || "—"}mm² — ${panReg.metrage || distDC*2}m`, qte: 1, pu: prix?.cable_terre || 4500 });

    lignes.forEach((l, i) => {
      const t = l.qte * l.pu;
      total += t;
      const tr = document.createElement("tr");
      tr.style.background = i % 2 === 0 ? "#f8fafc" : "#fff";
      tr.innerHTML = `<td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;">${l.designation}</td>
                      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">${l.qte}</td>
                      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;">${formatNombre(l.pu)}</td>
                      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;">${formatNombre(t)}</td>`;
      tbody.appendChild(tr);
    });
    const devisTotal = document.getElementById("devis-total");
    if (devisTotal) devisTotal.textContent = formatNombre(total) + " FCFA";

    // Mettre à jour prix dans state pour compatibilité
    if (!prix) prix = {};
    prix._total_calcule = total;
  }

  // ── Afficher section résultats ──
  const resultsSection = document.getElementById("results-section");
  if (resultsSection) {
    resultsSection.style.display = "block";
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const btnSysNext = document.getElementById("btn-sys-next");
  if (btnSysNext) btnSysNext.disabled = false;
  const btnCalc = document.getElementById("btn-calculer");
  const btnRecalc = document.getElementById("btn-recalculer");
  if (btnCalc)   btnCalc.style.display = "none";
  if (btnRecalc) btnRecalc.style.display = "flex";

  // ── Autonomie réelle ──
  const autoBox = document.getElementById("autonomie-box");
  if (autoBox && dim.autonomie_heures) {
    autoBox.style.display = "block";
    autoBox.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
      <div style="font-size:24px;">⏱️</div>
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--green-800);">Autonomie réelle : <strong>${dim.autonomie_heures}h</strong> sans soleil</div>
        <div style="font-size:11px;color:var(--gray-500);">${dim.batterie.capacite_unitaire * dim.batterie.nombre} Ah · DoD ${Math.round((dim.batterie.DoD||0.5)*100)}%</div>
      </div></div>`;
  }

  // ── Alertes ──
  const alertBox = document.getElementById("alerte-box");
  if (alertBox) {
    if (dim.alerte) { alertBox.style.display = "block"; alertBox.textContent = "⚠️ " + dim.alerte; }
    else alertBox.style.display = "none";
  }

  // ── Chute de tension ──
  const chuteBox = document.getElementById("chute-box");
  if (chuteBox) {
    const msgs = [];
    const checkChute = (segment) => {
      if (cables[segment]?.chute && !cables[segment].chute.ok)
        msgs.push("🔵 " + segment.toUpperCase() + " : " + cables[segment].chute.message);
    };
    checkChute("pan_reg");
    checkChute("reg_bat");
    checkChute("bat_ond");
    if (cables.ac?.chute && !cables.ac.chute.ok)
      msgs.push("🟠 AC : " + cables.ac.chute.message);
    if (msgs.length > 0) {
      chuteBox.style.display = "block";
      chuteBox.innerHTML =
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><span style="font-weight:700;">⚠️ Chute de tension</span><button class="help-btn" onclick="ouvrirHelp(\'chute_tension\')">En savoir plus</button></div>' +
        msgs.map((m) => `<div style="margin-bottom:6px;">${m}</div>`).join("");
    } else chuteBox.style.display = "none";
  }

  // ── Groupe équivalent ──
  const groupeBox = document.getElementById("groupe-box");
  if (groupeBox && dim.groupe_kva) {
    groupeBox.style.display = "block";
    groupeBox.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
      <div style="font-size:20px;">🔧</div>
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--gray-700);">Équivalent groupe électrogène : <strong>${dim.groupe_kva} kVA</strong></div>
        <div style="font-size:11px;color:var(--gray-500);">Pour vos ${Math.round(dim.puissance_installee || 0)}W de charges simultanées</div>
      </div></div>`;
  }

  // ── Callback page suivante selon profil ──
  if (typeof window._afficherRapportTech === "function") {
    window._afficherRapportTech(dim, prix);
  } else if (typeof window._afficherContactKennedy === "function") {
    window._afficherContactKennedy(dim, prix);
  } else {
    lancerEconomie();
  }
}

// ── Sauvegarder depuis page systeme/contact ──
async function sauvegarderProjet() {
  const nom = prompt("Nom du projet :", "Mon installation solaire");
  if (!nom) return;
  if (!state.dimensionnement) { alert("Effectuez d'abord un calcul."); return; }
  try {
    const res = await fetch("/projets/sauvegarder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom,
        lat:             state.localisation?.lat,
        lon:             state.localisation?.lon,
        nom_lieu:        state.localisation?.nom,
        irradiation:     state.localisation?.irradiation,
        type_systeme:    state.typeSysteme,
        type_installation: state.typeInstallation || "residentiel",
        type_batterie:   state.typeBatterie || "AGM",
        jours_autonomie: state.joursAutonomie || 1,
        resultats:       state.dimensionnement,
        prix:            state.prix || {},
      }),
    });
    const data = await res.json();
    if (data.succes) alert("✅ " + data.message);
    else alert("Erreur : " + data.erreur);
  } catch { alert("Erreur réseau."); }
}

// ============================================================
// PAGE ÉCONOMIE (si profil index/user sans technicien)
// ============================================================
let etatCarburant = { type: "essence" };
