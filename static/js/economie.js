function selectCarburant(type) {
  etatCarburant.type = type;
  ["essence", "gasoil"].forEach((t) => {
    const btn = document.getElementById("fuel-" + t);
    if (btn) {
      btn.style.borderColor =
        t === type ? "var(--green-800)" : "var(--gray-200)";
      btn.style.background = t === type ? "var(--green-50)" : "#fff";
      btn.style.color = t === type ? "var(--green-800)" : "inherit";
    }
  });
}

function lancerEconomie() {
  if (!state.dimensionnement) {
    alert("Faites d'abord le dimensionnement.");
    return;
  }
  if (!document.getElementById("prix-carburant")) return;
  const prixCarburant =
    parseFloat(document.getElementById("prix-carburant").value) || 700;
  const heuresGroupe =
    parseFloat(document.getElementById("heures-groupe").value) || 8;
  showLoader("Calcul du bilan économique...");
  fetch("/economie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dimensionnement: state.dimensionnement,
      prix: state.prix,
      conso_kwh_jour: (state.consommationTotale || 0) / 1000,
      type_carburant: etatCarburant.type,
      prix_carburant: prixCarburant,
      source_carburant: "station",
      heures_groupe: heuresGroupe,
      inclut_entretien_groupe: true,
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      hideLoader();
      if (data.succes) {
        state.economie = data.economie;
        afficherEconomie(data.economie);
      } else alert("Erreur : " + data.erreur);
    })
    .catch((e) => {
      hideLoader();
      alert("Erreur : " + e);
    });
}

function afficherEconomie(eco) {
  const ecoResults = document.getElementById("eco-results");
  if (!ecoResults) return;
  ecoResults.style.display = "block";
  const detGroupe = document.getElementById("eco-detail-groupe");
  if (!detGroupe) return;

  // Entretien groupe avec prix approximatifs
  const estEssence = etatCarburant.type === "essence";
  detGroupe.innerHTML = `
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span style="color:#92400e;">Carburant (${eco.type_carburant})</span><span style="font-weight:600;color:#92400e;">${formatNombre(eco.cout_carburant_annuel || 0)} FCFA</span></div>
          <div style="border-top:1px dashed #fed7aa;margin:6px 0;padding-top:6px;">
            <div style="font-size:10px;color:#b45309;font-style:italic;margin-bottom:4px;">Entretien estimatif :</div>
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;color:#92400e;"><span>· Huile moteur (~1,5L · mensuel)</span><span>~3 000 FCFA/mois</span></div>
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;color:#92400e;"><span>· Filtre à air (tous les 3 mois)</span><span>~2 500 FCFA</span></div>
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;color:#92400e;"><span>· Filtre carburant (annuel)</span><span>~2 000 FCFA</span></div>
            ${estEssence ? `<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;color:#92400e;"><span>· Bougies (annuel)</span><span>~3 000 FCFA</span></div>` : ""}
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;color:#92400e;"><span>· Révision générale (annuel)</span><span>~15 000 FCFA</span></div>
            <div style="font-size:9px;color:#b45309;font-style:italic;margin-top:4px;">* Prix approximatifs — peuvent varier selon technicien et ville</div>
          </div>`;

  // Calendrier solaire avec échelle panneaux
  const nbPanneaux = state.dimensionnement
    ? state.dimensionnement.panneau.nombre
    : 1;
  let prixNettoyage, labelNettoyage;
  if (nbPanneaux <= 3) {
    prixNettoyage = "Gratuit / 1 000 FCFA si technicien sollicité";
    labelNettoyage = "1 à 3 panneaux";
  } else if (nbPanneaux <= 8) {
    prixNettoyage = "3 000 FCFA";
    labelNettoyage = "4 à 8 panneaux";
  } else if (nbPanneaux <= 15) {
    prixNettoyage = "5 000 FCFA";
    labelNettoyage = "9 à 15 panneaux";
  } else {
    prixNettoyage = "10 000 FCFA";
    labelNettoyage = "15+ panneaux";
  }

  document.getElementById("eco-detail-solaire").innerHTML = `
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
            <span style="color:var(--green-800);">Nettoyage panneaux <span style="font-size:10px;color:var(--gray-400);">(${labelNettoyage})</span></span>
            <span style="font-weight:600;color:var(--green-800);">${prixNettoyage}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
            <span style="color:var(--green-800);">Vérification technique (annuel)</span>
            <span style="font-weight:600;color:var(--green-800);">À partir de 2 000 FCFA</span>
          </div>`;

  document.getElementById("eco-total-groupe-an").textContent =
    formatNombre(eco.cout_total_groupe_annuel || 0) + " FCFA";
  document.getElementById("eco-total-solaire-an").textContent =
    formatNombre(eco.cout_entretien_solaire_annuel || 0) + " FCFA";

  if (state.entretien) {
    const cal = document.getElementById("calendrier-entretien");
    const prixBat = state.prix ? state.prix.batterie || 0 : 0;
    const nbPan = state.dimensionnement
      ? state.dimensionnement.panneau.nombre
      : 1;
    let prixNett;
    if (nbPan <= 3) prixNett = "Gratuit / 1 000 FCFA si technicien sollicité";
    else if (nbPan <= 8) prixNett = "3 000 FCFA";
    else if (nbPan <= 15) prixNett = "5 000 FCFA";
    else prixNett = "10 000 FCFA";

    const typeBat = state.dimensionnement.batterie.type;
    const dureeVie = typeBat === "Lithium-Ion" ? 12 : typeBat === "AGM" ? 7 : 5;

    cal.innerHTML = `
            <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;border-bottom:1px solid var(--gray-100);">
              <div style="width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0;background:#166534;"></div>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:600;color:var(--gray-900);">Nettoyage des panneaux solaires</div>
                <div style="font-size:11px;color:var(--gray-500);">Hebdomadaire (harmattan) · Mensuel (saison des pluies)</div>
              </div>
              <div style="font-size:12px;font-weight:600;color:var(--green-800);">${prixNett}</div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;border-bottom:1px solid var(--gray-100);">
              <div style="width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0;background:#f59e0b;"></div>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:600;color:var(--gray-900);">Vérification technique</div>
                <div style="font-size:11px;color:var(--gray-500);">Annuel · Connexions, câbles, régulateur</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:12px;font-weight:600;color:var(--green-800);">À partir de 2 000 FCFA</div>
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;">
              <div style="width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0;background:#dc2626;"></div>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:600;color:var(--gray-900);">Remplacement batterie ${typeBat}</div>
                <div style="font-size:11px;color:var(--gray-500);">Tous les ${dureeVie} ans</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:12px;font-weight:600;color:var(--orange-600);">${formatNombre(prixBat)} FCFA</div>
                <div style="font-size:10px;color:var(--gray-400);">+ main d'œuvre technicien</div>
              </div>
            </div>`;
  }

  document.getElementById("eco-init-groupe").textContent = "350.000 FCFA";
  document.getElementById("eco-init-solaire").textContent =
    formatNombre(eco.cout_initial_solaire || 0) + " FCFA";
  document.getElementById("eco-charges-groupe").textContent =
    formatNombre((eco.cout_total_groupe_annuel || 0) * 10) + " FCFA";
  document.getElementById("eco-charges-solaire").textContent = formatFCFA(
    (eco.cout_entretien_solaire_annuel || 0) * 10,
  );
  document.getElementById("eco-bat-replace").textContent =
    formatNombre(eco.cout_remplacement_batterie || 0) + " FCFA";
  document.getElementById("eco-total10-groupe").textContent =
    formatNombre(eco.cout_groupe_10ans || 0) + " FCFA";
  document.getElementById("eco-total10-solaire").textContent =
    formatNombre(eco.cout_solaire_10ans || 0) + " FCFA";
  document.getElementById("eco-economies").textContent =
    formatNombre(eco.economies_10ans || 0) + " FCFA";
  document.getElementById("eco-rentabilite").textContent =
    (eco.annee_rentabilite || "?") + " ans";
  if (state.typeSysteme === "hybrid" && eco.facture_sbee_evitee_mois) {
    document.getElementById("eco-sbee-box").style.display = "block";
    document.getElementById("eco-sbee").textContent =
      formatFCFA(eco.facture_sbee_evitee_mois) + " FCFA";
  }
  document.getElementById("eco-results").scrollIntoView({ behavior: "smooth" });
}

// ============================================================
// PAGE TECHNICIENS
// ============================================================
