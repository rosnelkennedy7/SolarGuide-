let budgetTypeLocal = null;

function initPageBudget() {
  const inputBudget = document.getElementById("input-budget");
  const valExistante = parseFloat(inputBudget?.value) || 0;
  const btnNext = document.getElementById("btn-budget-next");
  const typeLocal = document.getElementById("budget-type-local");

  if (valExistante > 0) {
    // Retour en arrière — garder les données, changer le bouton
    typeLocal.style.display = "none";
    btnNext.textContent = "🔄 Recalculer";
    btnNext.disabled = false;
    verifierBudget();
    return;
  }

  // Première visite
  budgetTypeLocal = null;
  btnNext.textContent = "Suivant →";
  btnNext.disabled = true;
  typeLocal.style.display = "none";
  document.getElementById("budget-indicator").style.display = "none";
}

const BUDGET_MINIMUM = 200000;

function verifierBudget() {
  const val = parseFloat(document.getElementById("input-budget").value) || 0;
  const indic = document.getElementById("budget-indicator");
  const typeLocal = document.getElementById("budget-type-local");
  const btnNext = document.getElementById("btn-budget-next");
  const input = document.getElementById("input-budget");
  const estRetour = btnNext.textContent.includes("Recalculer");

  if (!val || val <= 0) {
    indic.style.display = "none";
    if (!estRetour) typeLocal.style.display = "none";
    btnNext.disabled = true;
    return;
  }

  if (val < BUDGET_MINIMUM) {
    indic.style.display = "block";
    indic.style.background = "#fee2e2";
    indic.style.border = "1px solid #fca5a5";
    indic.style.color = "#dc2626";
    indic.innerHTML = `<div style="font-weight:700;margin-bottom:4px;">⚠️ Budget insuffisant</div>
      <div>Une installation solaire correcte nécessite au minimum <strong>${formatNombre(BUDGET_MINIMUM)} FCFA</strong>. Veuillez augmenter votre budget.</div>`;
    input.style.borderColor = "#dc2626";
    if (!estRetour) typeLocal.style.display = "none";
    btnNext.disabled = true;
    return;
  }

  indic.style.display = "block";
  indic.style.background = "var(--green-50)";
  indic.style.border = "1px solid var(--green-200)";
  indic.style.color = "var(--green-800)";
  indic.innerHTML = `<div style="font-weight:700;margin-bottom:4px;">✅ Budget enregistré</div>
    <div>Votre budget de <strong>${formatNombre(val)} FCFA</strong> sera optimisé selon vos appareils.</div>`;
  input.style.borderColor = "var(--green-700)";

  if (estRetour) {
    typeLocal.style.display = "none";
    btnNext.disabled = false;
  } else {
    typeLocal.style.display = "block";
    if (budgetTypeLocal) {
      const el = document.getElementById("budget-type-" + budgetTypeLocal);
      if (el) el.classList.add("selected");
    }
    btnNext.disabled = !budgetTypeLocal;
  }
}

function selectBudgetTypeLocal(type) {
  budgetTypeLocal = type;
  state.typeInstallation = type;
  ["residentiel", "commercial"].forEach((t) => {
    const el = document.getElementById("budget-type-" + t);
    if (el) el.classList.remove("selected");
  });
  const el = document.getElementById("budget-type-" + type);
  if (el) el.classList.add("selected");
  const val = parseFloat(document.getElementById("input-budget").value) || 0;
  if (val > 0) document.getElementById("btn-budget-next").disabled = false;
}

function initBudgetCharges() {
  const list = document.getElementById("budget-appareils-list");
  const btnCalculer = document.querySelector(
    "#page-budget-charges .nav-buttons .btn-primary",
  );

  if (list && list.children.length > 0) {
    // Retour — garder les appareils, changer le bouton
    if (btnCalculer) btnCalculer.textContent = "🔄 Recalculer";
    mettreAJourBarreBudget();
    return;
  }

  // Première visite
  if (btnCalculer) btnCalculer.textContent = "Calculer →";
  budgetAppareilCount = 0;
  list.innerHTML = "";
  ajouterAppareilBudget();
  mettreAJourBarreBudget();
}

function ajouterAppareilBudget() {
  if (appareils_defaut.length === 0) {
    fetch("/get_appareils")
      .then(r => r.json())
      .then(data => {
        if (data.succes) appareils_defaut = data.appareils;
        _creerLigneAppareilGenerique("budget-appareils-list", "bapp", budgetAppareilCount++, true);
        mettreAJourBarreBudget();
      })
      .catch(() => {
        _creerLigneAppareilGenerique("budget-appareils-list", "bapp", budgetAppareilCount++, true);
        mettreAJourBarreBudget();
      });
  } else {
    _creerLigneAppareilGenerique("budget-appareils-list", "bapp", budgetAppareilCount++, true);
    mettreAJourBarreBudget();
  }
}

function mettreAJourBarreBudget() {
  const budget =
    parseFloat(document.getElementById("input-budget")?.value) || 0;
  if (!budget) return;

  const rows = document.querySelectorAll(
    "#budget-appareils-list .appareil-row",
  );
  let energieTotale = 0;
  rows.forEach((row) => {
    const id = row.id.replace("app-row-bapp", "");
    const p = parseFloat(document.getElementById("p-bapp" + id)?.value) || 0;
    const q = parseFloat(document.getElementById("q-bapp" + id)?.value) || 1;
    const hj = parseFloat(document.getElementById("hj-bapp" + id)?.value) || 0;
    const hn = parseFloat(document.getElementById("hn-bapp" + id)?.value) || 0;
    energieTotale += p * q * (hj + hn);
  });

  const irr = state.localisation?.irradiation || 4.5;
  const PR = 0.8;
  const E_prod = (energieTotale * 0.8 * 1.25) / PR;
  const P_panneaux = E_prod / irr;
  const taux = 610;
  const coutEstime = Math.round(
    P_panneaux * IRENA.panneau_mono_wc * taux * 1.1 +
      (E_prod / irr / 4.5) * 100 * IRENA.batterie_agm_ah * taux * 1.08 +
      500 * IRENA.onduleur_w * taux * 1.1,
  );

  const pct = Math.min((coutEstime / budget) * 100, 100);
  const bar = document.getElementById("budget-progress-bar");
  const txt = document.getElementById("budget-usage-text");
  const reste = document.getElementById("budget-reste-text");

  if (bar) {
    bar.style.width = pct + "%";
    bar.style.background =
      pct > 90 ? "#dc2626" : pct > 70 ? "#f59e0b" : "var(--green-700)";
  }
  if (txt)
    txt.textContent =
      formatNombre(Math.min(coutEstime, budget)) +
      " / " +
      formatNombre(budget) +
      " FCFA";
  if (reste) {
    const r = budget - coutEstime;
    reste.textContent =
      r >= 0
        ? "Budget restant : " + formatNombre(r) + " FCFA"
        : "Dépassement : " + formatNombre(-r) + " FCFA";
    reste.style.color = r >= 0 ? "var(--green-800)" : "#dc2626";
  }
}

function validerChargesBudget() {
  if (!state.localisation) {
    alert("Veuillez d'abord sélectionner votre localisation sur la carte.");
    goToPage('localisation');
    return;
  }
  const budget =
    parseFloat(document.getElementById("input-budget")?.value) || 0;
  const rows = document.querySelectorAll(
    "#budget-appareils-list .appareil-row",
  );
  const appareils = [];

  rows.forEach((row) => {
    const id = row.id.replace("app-row-bapp", "");
    const selEl = document.getElementById("sel-bapp" + id);
    const nom = selEl
      ? (selEl.tagName === "INPUT" ? selEl.value : selEl.value) || "Appareil"
      : "Appareil";
    const p = parseFloat(document.getElementById("p-bapp" + id)?.value) || 0;
    const q = parseFloat(document.getElementById("q-bapp" + id)?.value) || 1;
    const hj = parseFloat(document.getElementById("hj-bapp" + id)?.value) || 0;
    const hn = parseFloat(document.getElementById("hn-bapp" + id)?.value) || 0;
    appareils.push({
      nom,
      puissance: p,
      quantite: q,
      heures: hj + hn,
      heures_jour: hj,
      heures_nuit: hn,
    });
  });

  if (appareils.length === 0) {
    alert("Ajoutez au moins un appareil.");
    return;
  }

  showLoader("Calcul du dimensionnement en cours...");

  const heuresCoupure = (function() {
    let total = 0;
    [['b-coupure-pointe-matin','b-pointe-matin-debut','b-pointe-matin-fin'],
     ['b-coupure-creuse','b-creuse-debut','b-creuse-fin'],
     ['b-coupure-pointe-soir','b-pointe-soir-debut','b-pointe-soir-fin'],
     ['b-coupure-nuit','b-nuit-debut','b-nuit-fin']
    ].forEach(([cbId, dId, fId]) => {
      const cb = document.getElementById(cbId);
      if (cb && cb.checked) {
        const d = parseFloat(document.getElementById(dId)?.value) || 0;
        const f = parseFloat(document.getElementById(fId)?.value) || 0;
        total += f > d ? f - d : (24 - d + f);
      }
    });
    return total || 8;
  })();

  fetch("/calculer_budget", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      budget_fcfa: budget,
      inclut_main_oeuvre: false,
      irradiation: state.localisation?.irradiation || 4.5,
      type_systeme: state.typeSysteme || "auto",
      heures_coupure: heuresCoupure,
      liste_appareils: appareils,
      type_batterie: "AGM",
      jours_autonomie: 1,
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      hideLoader();
      if (data.succes) {
        afficherResultatsBudget(data.budget, appareils, budget);
      } else {
        alert("Erreur : " + data.erreur);
      }
    })
    .catch((e) => {
      hideLoader();
      alert("Erreur : " + e);
    });
}

function afficherResultatsBudget(res, appareils, budget) {
  state.dimensionnement = res;
  state.prix = { total: budget };
  window._dernierDim  = res;
  window._dernierPrix = { total: budget };
  goToPage("budget-resultats");

  const alerte = document.getElementById("budget-alerte");
  const ok = document.getElementById("budget-resultats-ok");

  if (!res.compatible) {
    alerte.style.display = "block";
    ok.style.display = "none";
    document.getElementById("budget-alerte-msg").innerHTML =
      `Votre budget de <strong>${formatNombre(budget)} FCFA</strong> ne peut pas couvrir toutes vos charges.<br>
      Appareils à réduire ou supprimer : <strong>${(res.appareils_a_retirer || []).map((a) => a.nom).join(", ") || "charges trop importantes"}</strong>`;
    return;
  }

  alerte.style.display = "none";
  ok.style.display = "block";

  const dim = res;
  const tension = dim.tension || 12;

  // Badge tension
  const badge = document.getElementById("budget-badge-tension");
  const colors = {
    12: "background:#dcfce7;color:#166534;",
    24: "background:#dbeafe;color:#1d4ed8;",
    48: "background:#fef3c7;color:#92400e;",
  };
  badge.style.cssText =
    (colors[tension] || colors[12]) +
    "display:inline-flex;align-items:center;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:700;";
  badge.textContent = "Système " + tension + "V";

  // Cacher le badge gamme
  const gammeBadge = document.getElementById("budget-gamme-badge");
  if (gammeBadge) gammeBadge.style.display = "none";

  const typeBat = dim.batterie?.type || "AGM";
  document.getElementById("br-panneau").textContent =
    (dim.panneau?.puissance_totale || 0) + " Wc";
  document.getElementById("br-panneau-nb").textContent =
    (dim.panneau?.nombre || 1) +
    " × " +
    (dim.panneau?.puissance_unitaire || 200) +
    " Wc";
  document.getElementById("br-batterie").textContent =
    (dim.batterie?.capacite_unitaire || 0) + " Ah";
  document.getElementById("br-batterie-info").textContent =
    tension +
    "V · " +
    typeBat +
    " · " +
    (dim.batterie?.nombre || 1) +
    " unité(s)";
  document.getElementById("br-mppt").textContent =
    (dim.mppt?.courant || 20) + " A";
  document.getElementById("br-mppt-type").textContent =
    (dim.mppt?.type || "PWM") + " · " + tension + "V";
  document.getElementById("br-onduleur").textContent =
    (dim.onduleur?.puissance || 500) + " W";

  // Devis
  const tbody = document.getElementById("budget-devis-body");
  tbody.innerHTML = "";
  const taux = 610;
  const lignes = [
    {
      d: "Panneaux solaires " + (dim.panneau?.puissance_unitaire || 200) + "Wc",
      m: Math.round(
        (dim.panneau?.puissance_totale || 200) *
          IRENA.panneau_mono_wc *
          taux *
          1.1,
      ),
    },
    {
      d:
        "Batterie " +
        typeBat +
        " " +
        (dim.batterie?.capacite_unitaire || 100) +
        "Ah",
      m: Math.round(
        (dim.batterie?.capacite_unitaire || 100) *
          (dim.batterie?.nombre || 1) *
          IRENA.batterie_agm_ah *
          taux *
          1.08,
      ),
    },
    {
      d:
        "Régulateur " +
        (dim.mppt?.type || "PWM") +
        " " +
        (dim.mppt?.courant || 20) +
        "A",
      m: Math.round((dim.mppt?.courant || 20) * IRENA.pwm_ampere * taux * 1.08),
    },
    {
      d: "Onduleur " + (dim.onduleur?.puissance || 500) + "W",
      m: Math.round(
        (dim.onduleur?.puissance || 500) * IRENA.onduleur_w * taux * 1.1,
      ),
    },
    { d: "Câblage + protections", m: 25000 },
  ];
  let total = 0;
  lignes.forEach((l, i) => {
    total += l.m;
    const tr = document.createElement("tr");
    tr.style.background = i % 2 === 0 ? "#f8fafc" : "#fff";
    tr.innerHTML = `<td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;">${l.d}</td>
                    <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;">${formatNombre(l.m)} FCFA</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById("budget-devis-total").textContent =
    formatNombre(total) + " FCFA";

  // Charges couvertes — tableau glassmorphism
  const liste = document.getElementById("budget-charges-liste");
  let totalEnergie = 0;
  const rows = appareils.map((a, i) => {
    const energie = a.puissance * a.quantite * (a.heures_jour + a.heures_nuit);
    totalEnergie += energie;
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.06);background:${i%2===0?'rgba(255,255,255,0.03)':'transparent'}">
      <td style="padding:10px 12px;color:#E2E8F0;font-size:12px">${a.nom}</td>
      <td style="padding:10px 12px;text-align:center;color:#94A3B8;font-size:12px">${a.puissance}W</td>
      <td style="padding:10px 12px;text-align:center;color:#94A3B8;font-size:12px">${a.quantite}</td>
      <td style="padding:10px 12px;text-align:center;color:#94A3B8;font-size:12px">${a.heures_jour+a.heures_nuit}h</td>
      <td style="padding:10px 12px;text-align:right;color:#fff;font-size:12px;font-weight:600">${energie} Wh</td>
    </tr>`;
  }).join('');
  liste.innerHTML = `<div style="background:rgba(255,255,255,0.06);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.12);border-radius:14px;overflow:hidden;margin-top:8px">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:rgba(245,166,35,0.2);border-bottom:1px solid rgba(255,255,255,0.1)">
        <th style="padding:12px;text-align:left;color:#F5A623;font-size:12px">Appareil</th>
        <th style="padding:12px;text-align:center;color:#F5A623;font-size:12px">Puissance</th>
        <th style="padding:12px;text-align:center;color:#F5A623;font-size:12px">Qté</th>
        <th style="padding:12px;text-align:center;color:#F5A623;font-size:12px">H/jour</th>
        <th style="padding:12px;text-align:right;color:#F5A623;font-size:12px">Énergie</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr style="background:rgba(245,166,35,0.15);border-top:1px solid rgba(255,255,255,0.1)">
        <td colspan="4" style="padding:12px;color:#F5A623;font-weight:700;font-size:13px">TOTAL</td>
        <td style="padding:12px;text-align:right;color:#F5A623;font-weight:700;font-size:13px">${totalEnergie} Wh</td>
      </tr></tfoot>
    </table>
  </div>`;
}
