function goToPage(name) {
  pages.forEach((p) => {
    const el = document.getElementById("page-" + p);
    if (el) el.classList.remove("active");
  });
  const target = document.getElementById("page-" + name);
  if (target) {
    target.classList.add("active");
    window.scrollTo(0, 0);
  }
  const pb = document.getElementById("progress-bar");
  if (name === "accueil") {
    pb.style.display = "none";
  } else {
    pb.style.display = "flex";
    updateProgress(name);
  }
  if (name === "localisation" && !map) initMap();
  if (name === "localisation") {
    // Adapter le bouton suivant selon le parcours
    const btnNext = document.getElementById("btn-loc-next");
    if (btnNext) {
      btnNext.onclick = () =>
        goToPage(choixParcours === "budget" ? "budget" : "consommation");
    }
  }
  if (name === "consommation") initConsommation();
  if (name === "systeme") initSystemePage();
  if (name === "techniciens") chargerTechniciens();
  if (name === "budget") initPageBudget();
  if (name === "budget-charges") {
    initBudgetCharges();
    const coupSec = document.getElementById("coupures-budget-section");
    if (coupSec) coupSec.style.display = choixSysteme === "hybrid" ? "block" : "none";
  }
  if (name === "rapport" && typeof window._afficherRapportTech === "function" && state.dimensionnement) {
    window._afficherRapportTech(state.dimensionnement, state.prix || {});
  }
}

function updateProgress(page) {
  const isBudget = choixParcours === "budget";
  let order, labels;
  if (isBudget) {
    order = [
      "localisation",
      "budget",
      "budget-charges",
      "budget-resultats",
      "techniciens",
    ];
    labels = ["Localisation", "Budget", "Charges", "Résultats", "Techniciens"];
  } else {
    order = [
      "localisation",
      "consommation",
      "systeme",
      "techniciens",
    ];
    labels = [
      "Localisation",
      "Consommation",
      "Système",
      "Techniciens",
    ];
  }
  // Mettre à jour les labels
  order.forEach((p, i) => {
    const el = document.getElementById("step-" + (i + 1));
    if (!el) return;
    const label = el.querySelector(".step-label");
    if (label) label.textContent = labels[i];
  });
  const current = order.indexOf(page) + 1;
  order.forEach((p, i) => {
    const el = document.getElementById("step-" + (i + 1));
    if (!el) return;
    el.classList.remove("done", "active", "todo");
    if (i + 1 < current) el.classList.add("done");
    else if (i + 1 === current) el.classList.add("active");
    else el.classList.add("todo");
    const circle = el.querySelector(".step-circle");
    if (i + 1 < current) circle.textContent = "✓";
    else circle.textContent = i + 1;
  });
}

// ============================================================
// PAGE ACCUEIL — NOUVELLE LOGIQUE SELECTION
// ============================================================
let choixParcours = null; // 'budget' ou 'dim'
let choixSysteme = null; // 'hybrid' ou 'auto'

function selectChoix(parcours, systeme) {
  choixParcours = parcours;
  choixSysteme = systeme;
  state.typeSysteme = systeme;

  // Réinitialiser toutes les cartes
  ["budget-hybrid", "budget-auto", "dim-hybrid", "dim-auto"].forEach((id) => {
    const el = document.getElementById("card-" + id);
    if (el) el.classList.remove("selected");
  });

  // Sélectionner la carte choisie
  const sel = document.getElementById("card-" + parcours + "-" + systeme);
  if (sel) sel.classList.add("selected");

  // Activer bouton commencer
  document.getElementById("btn-start").disabled = false;
  document.getElementById("hint-text").textContent =
    (parcours === "budget"
      ? "💰 Parcours budget"
      : "📐 Parcours dimensionnement") +
    " · Système " +
    (systeme === "hybrid" ? "hybride" : "autonome") +
    " sélectionné — cliquez pour continuer";
}

function demarrer() {
  if (!choixParcours || !choixSysteme) return;
  // Les deux parcours commencent par la localisation
  goToPage("localisation");
}

// Garder compatibilité avec lancerDemo
function selectSystem(type) {
  selectChoix("dim", type);
}

// ============================================================
// PAGE LOCALISATION — RECHERCHE VILLE
// ============================================================

// Limites strictes du Bénin
const BENIN_BOUNDS = {
  minLat: 6.1,
  maxLat: 12.5,
  minLon: 0.8,
  maxLon: 3.9,
};
