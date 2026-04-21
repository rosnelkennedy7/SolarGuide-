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
  // Page économie supprimée — stub vide
}

// ============================================================
// PAGE TECHNICIENS
// ============================================================
