function ouvrirModal(type, event) {
  if (event) event.stopPropagation();
  const data = MODALS[type];
  if (!data) return;
  document.getElementById("modal-title").textContent = data.titre;
  document.getElementById("modal-desc").textContent = data.desc;
  const ul = document.getElementById("modal-list");
  ul.innerHTML = data.liste
    .map(
      (item) =>
        `<li><span class="${item.type}">${item.type === "ok" ? "✓" : "!"}</span><span>${item.texte}</span></li>`,
    )
    .join("");
  document.getElementById("modal-overlay").classList.add("show");
}
function fermerModal(event) {
  if (event.target === document.getElementById("modal-overlay"))
    document.getElementById("modal-overlay").classList.remove("show");
}
function fermerModalBtn() {
  document.getElementById("modal-overlay").classList.remove("show");
}

// ============================================================
// BULLE D'AIDE FONCTIONS
// ============================================================
function ouvrirHelp(cle) {
  const data = HELPS[cle];
  if (!data) return;
  document.getElementById("help-title").textContent = data.titre;
  document.getElementById("help-content").innerHTML = data.contenu.replace(
    /\n/g,
    "<br>",
  );
  document.getElementById("help-overlay").classList.add("show");
}
function fermerHelp(event) {
  if (event.target === document.getElementById("help-overlay"))
    document.getElementById("help-overlay").classList.remove("show");
}
// Fermer au clic sur la poignée ou en swipe
document.addEventListener("DOMContentLoaded", () => {
  const handle = document.querySelector(".help-tooltip-handle");
  if (handle)
    handle.addEventListener("click", () => {
      document.getElementById("help-overlay").classList.remove("show");
    });
});

// ============================================================
// NAVIGATION
// ============================================================
const pages = [
  "accueil",
  "localisation",
  "budget",
  "budget-charges",
  "budget-resultats",
  "consommation",
  "systeme",
  "economie",
  "techniciens",
  "rapport",
  "contact",
];
function lancerDemo() {
  selectChoix("dim", "auto");
  state.localisation = {
    latitude: 6.3676,
    longitude: 2.4252,
    irradiation: 4.5,
    nom: "Cotonou, Bénin",
  };
  state.nomLieu = "Cotonou, Bénin";
  state.typeInstallation = "residentiel";
  state.appareils = [
    {
      nom: "Ampoule LED",
      puissance: 10,
      quantite: 4,
      heures: 6,
      heures_jour: 6,
      heures_nuit: 0,
    },
    {
      nom: "Télévision 32 pouces",
      puissance: 80,
      quantite: 1,
      heures: 4,
      heures_jour: 2,
      heures_nuit: 2,
    },
    {
      nom: "Ventilateur de table",
      puissance: 45,
      quantite: 2,
      heures: 8,
      heures_jour: 4,
      heures_nuit: 4,
    },
    {
      nom: "Chargeur téléphone",
      puissance: 10,
      quantite: 2,
      heures: 3,
      heures_jour: 2,
      heures_nuit: 1,
    },
    {
      nom: "Réfrigérateur 100L",
      puissance: 90,
      quantite: 1,
      heures: 24,
      heures_jour: 12,
      heures_nuit: 12,
    },
  ];
  state.energieACouvrir =
    state.appareils.reduce(
      (sum, a) => sum + a.puissance * a.quantite * a.heures,
      0,
    ) * 0.8;
  state.consommationTotale = state.energieACouvrir;
  goToPage("systeme");
  setTimeout(() => {
    selectBatterie("AGM");
    selectAutonomie(1);
    lancerCalcul();
  }, 500);
}

// ============================================================
// RAPPORT PDF
// ============================================================
function genererRapport() {
  if (!state.dimensionnement) {
    alert(
      "Veuillez d'abord effectuer un dimensionnement avant de générer le rapport.",
    );
    return;
  }
  const dim = state.dimensionnement,
    prix = state.prix || {},
    eco = state.economie || {},
    loc = state.localisation || {};
  const typeOnd = state.typeOnduleur || "classique",
    typeSys = state.typeSysteme || "auto",
    typeInst = state.typeInstallation || "residentiel";
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const heureStr = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const refStr =
    "SGR-" +
    now.getFullYear() +
    "-" +
    String(Math.floor(Math.random() * 90000) + 10000);

  function getSynoptique() {
    if (typeSys === "auto")
      return `<div class="syno-row"><div class="syno-box green">&#9728; Panneaux solaires<br><small>${dim.panneau.puissance_totale} Wc</small></div></div><div class="syno-arrow">↓ DC</div><div class="syno-row"><div class="syno-box blue">Régulateur ${dim.mppt.type}<br><small>${dim.mppt.courant}A · ${dim.tension}V</small></div><div class="syno-line">→</div><div class="syno-box blue">Batterie ${dim.batterie.type}<br><small>${dim.batterie.capacite_unitaire}Ah · ${dim.tension}V</small></div></div><div class="syno-arrow">↓ DC</div><div class="syno-row"><div class="syno-box gray">Onduleur ${typeOnd === "allinone" ? "All-in-One" : typeOnd}<br><small>${dim.onduleur.puissance}W</small></div></div><div class="syno-arrow">↓ AC 220V</div><div class="syno-row"><div class="syno-box orange">Tableau électrique</div><div class="syno-line">→</div><div class="syno-box orange">Charges<br><small>Appareils</small></div></div>`;
    return `<div class="syno-row"><div class="syno-box green">&#9728; Panneaux<br><small>${dim.panneau.puissance_totale} Wc</small></div><div class="syno-line" style="width:40px;"></div><div class="syno-box orange">Réseau SBEE</div></div><div class="syno-arrow">↓</div><div class="syno-row"><div class="syno-box blue" style="min-width:200px;">Onduleur ${typeOnd === "hybride" ? "Hybride" : "All-in-One"} + MPPT<br><small>${dim.onduleur.puissance}W · ${dim.tension}V</small></div></div><div class="syno-arrow">↕ DC</div><div class="syno-row"><div class="syno-box blue">Batterie ${dim.batterie.type}<br><small>${dim.batterie.capacite_unitaire}Ah</small></div></div><div class="syno-arrow">↓ AC 220V</div><div class="syno-row"><div class="syno-box orange">Tableau</div><div class="syno-line">→</div><div class="syno-box orange">Charges</div></div>`;
  }

  function getLignesDevis() {
    const lignes = [
      {
        d: `Panneau solaire ${dim.panneau.puissance_unitaire} Wc`,
        q: dim.panneau.nombre,
        pu: Math.round((prix.panneau || 0) / dim.panneau.nombre),
      },
      {
        d: `Batterie ${dim.batterie.type} ${dim.batterie.capacite_unitaire}Ah`,
        q: dim.batterie.nombre,
        pu: Math.round((prix.batterie || 0) / dim.batterie.nombre),
      },
    ];
    if (typeOnd !== "allinone")
      lignes.push({
        d: `Régulateur ${dim.mppt.type} ${dim.mppt.courant}A`,
        q: 1,
        pu: prix.regulateur || 0,
      });
    const lblOnd = {
      classique: "Onduleur classique",
      hybride: "Onduleur hybride",
      allinone: "Onduleur All-in-One",
    };
    lignes.push({
      d: `${lblOnd[typeOnd] || "Onduleur"} ${dim.onduleur.puissance}W`,
      q: 1,
      pu: prix.onduleur || 0,
    });
    if (dim.ats && typeSys === "hybrid" && typeOnd !== "hybride")
      lignes.push({
        d: `ATS automatique ${dim.ats}W`,
        q: 1,
        pu: prix.ats || 35000,
      });
    lignes.push({
      d: `Câble DC ${dim.cables.section_DC}mm²`,
      q: 1,
      pu: prix.cable_dc || 8500,
    });
    lignes.push({
      d: `Disjoncteur DC ${dim.disjoncteurs.DC}A`,
      q: 1,
      pu: prix.disjoncteur_dc || 5000,
    });
    lignes.push({
      d: `Câble AC ${dim.cables.section_AC}mm²`,
      q: 1,
      pu: prix.cable_ac || 5000,
    });
    lignes.push({
      d: `Disjoncteur AC ${dim.disjoncteurs.AC}A`,
      q: 1,
      pu: prix.disjoncteur_ac || 3000,
    });
    lignes.push({ d: "Parafoudre DC + AC Classe II", q: 2, pu: 12000 });
    lignes.push({
      d: `Câble de terre ${dim.cables.section_DC}mm²`,
      q: 1,
      pu: prix.cable_terre || 4500,
    });
    return lignes;
  }

  const lignesDevis = getLignesDevis();
  const totalDevis = lignesDevis.reduce((s, l) => s + l.q * l.pu, 0);
  const lignesAppareils = (state.appareils || [])
    .map((a) => {
      const hj = a.heures_jour || 0,
        hn = a.heures_nuit || 0;
      return `<tr><td>${a.nom}</td><td style="text-align:center;">${a.puissance}</td><td style="text-align:center;">${a.quantite}</td><td style="text-align:center;">${hj}h</td><td style="text-align:center;">${hn}h</td><td style="text-align:right;">${formatNombre(a.puissance * a.quantite * (hj + hn))}</td></tr>`;
    })
    .join("");

  const rapport = window.open("", "_blank");
  rapport.document
    .write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport SolarGuide Bénin — ${refStr}</title>
        <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:11pt;color:#1a1a1a;background:#fff;}.page{width:210mm;min-height:297mm;margin:0 auto;padding:15mm 18mm;page-break-after:always;position:relative;}.page:last-child{page-break-after:auto;}.entete{background:#166534;color:#fff;padding:10px 16px;margin:-15mm -18mm 12mm;display:flex;justify-content:space-between;align-items:center;}.entete-logo{font-size:16pt;font-weight:bold;}.entete-ref{font-size:9pt;opacity:0.8;text-align:right;}.pied{position:absolute;bottom:8mm;left:18mm;right:18mm;border-top:1px solid #ccc;padding-top:4px;display:flex;justify-content:space-between;font-size:8pt;color:#888;}.section-titre{font-size:13pt;font-weight:bold;color:#166534;border-bottom:2px solid #166534;padding-bottom:4px;margin-bottom:10px;margin-top:16px;}.section-titre:first-child{margin-top:0;}table{width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:10px;}th{background:#166534;color:#fff;padding:6px 8px;text-align:left;font-weight:normal;}td{padding:5px 8px;border-bottom:0.5px solid #e0e0e0;}tr:nth-child(even) td{background:#f5faf5;}tr.total td{background:#e8f5e9;font-weight:bold;color:#166534;}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}.info-bloc{border:0.5px solid #e0e0e0;border-radius:6px;padding:8px 12px;}.info-ligne{display:flex;justify-content:space-between;font-size:10pt;padding:3px 0;border-bottom:0.5px solid #f0f0f0;}.info-label{color:#666;}.info-val{font-weight:bold;}.comp-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;}.comp-card{border:1px solid #e0e0e0;border-radius:6px;padding:8px 12px;}.comp-label{font-size:9pt;color:#666;}.comp-val{font-size:16pt;font-weight:bold;color:#1a1a1a;}.comp-sub{font-size:9pt;color:#888;}.indicateurs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;}.indic{border-radius:6px;padding:8px 12px;text-align:center;}.indic-vert{background:#e8f5e9;}.indic-bleu{background:#e3f2fd;}.indic-orange{background:#fff3e0;}.indic-label{font-size:9pt;margin-bottom:2px;}.indic-val{font-size:16pt;font-weight:bold;}.synoptique{background:#f9fafb;border:1px solid #e0e0e0;border-radius:8px;padding:16px;text-align:center;}.syno-row{display:flex;align-items:center;justify-content:center;gap:8px;margin:4px 0;}.syno-box{border:1.5px solid #166534;border-radius:6px;padding:6px 12px;font-size:9.5pt;font-weight:bold;color:#166534;min-width:100px;text-align:center;background:#fff;}.syno-box.blue{border-color:#1565c0;color:#1565c0;}.syno-box.orange{border-color:#e65100;color:#e65100;}.syno-box.gray{border-color:#555;color:#555;}.syno-box small{display:block;font-weight:normal;font-size:8.5pt;color:#888;}.syno-arrow{font-size:13pt;color:#888;margin:2px 0;}.syno-line{font-size:13pt;color:#888;}.eco-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}.eco-groupe{background:#fff3e0;border-radius:6px;padding:10px 12px;}.eco-solaire{background:#e8f5e9;border-radius:6px;padding:10px 12px;}.eco-titre{font-weight:bold;font-size:10pt;margin-bottom:6px;}.eco-titre.orange{color:#e65100;}.eco-titre.green{color:#166534;}.eco-ligne{display:flex;justify-content:space-between;font-size:9.5pt;padding:2px 0;border-bottom:0.5px solid rgba(0,0,0,0.08);}.eco-total-ligne{display:flex;justify-content:space-between;font-weight:bold;font-size:10pt;padding-top:6px;margin-top:4px;}.rentabilite{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;}.rent-card{border-radius:6px;padding:8px 12px;text-align:center;}.rent-label{font-size:9pt;color:#666;}.rent-val{font-size:18pt;font-weight:bold;}.disclaimer{background:#f5f5f5;border-left:3px solid #166534;padding:8px 12px;font-size:9pt;color:#555;border-radius:0 4px 4px 0;margin-top:10px;}@media print{body{background:#fff;}.page{margin:0;padding:15mm 18mm;}.no-print{display:none !important;}}</style></head><body>
        <div class="no-print" style="background:#166534;color:#fff;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100;"><span style="font-weight:bold;">☀️ SolarGuide Bénin — Rapport ${refStr}</span><button onclick="window.print()" style="background:#fff;color:#166534;border:none;padding:8px 20px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:11pt;">🖨️ Imprimer / Sauvegarder PDF</button></div>
        <div class="page"><div class="entete"><div class="entete-logo">☀️ SolarGuide Bénin</div><div class="entete-ref">Réf. ${refStr}<br>${dateStr} à ${heureStr}</div></div>
        <div style="text-align:center;margin-bottom:16px;"><div style="font-size:18pt;font-weight:bold;color:#166534;">Rapport de Dimensionnement Solaire</div><div style="font-size:10pt;color:#888;margin-top:4px;">Résultats indicatifs · Normes CEI/IEC · Source : IRENA 2024</div></div>
        <div class="section-titre">&#9432; Informations générales</div>
        <div class="info-grid"><div class="info-bloc"><div class="info-ligne"><span class="info-label">Type de système</span><span class="info-val">${typeSys === "hybrid" ? "Hybride SBEE" : "Autonome 100%"}</span></div><div class="info-ligne"><span class="info-label">Type d'installation</span><span class="info-val">${typeInst === "commercial" ? "Commercial" : "Résidentiel"}</span></div><div class="info-ligne"><span class="info-label">Localisation</span><span class="info-val">${loc.nom || "Bénin"}</span></div><div class="info-ligne"><span class="info-label">Coordonnées</span><span class="info-val">${loc.latitude ? loc.latitude + "°N · " + loc.longitude + "°E" : "—"}</span></div></div>
        <div class="info-bloc"><div class="info-ligne"><span class="info-label">Irradiation NASA</span><span class="info-val">${loc.irradiation || "—"} kWh/m²/j</span></div><div class="info-ligne"><span class="info-label">Autonomie choisie</span><span class="info-val">${state.joursAutonomie || 1} jour(s)</span></div><div class="info-ligne"><span class="info-label">Taux de change</span><span class="info-val">${formatNombre(prix.taux_fcfa_usd || 610)} XOF/USD</span></div></div></div>
        <div class="section-titre">&#9889; Consommation déclarée</div>
        <table><tr><th>Appareil</th><th style="text-align:center;">W</th><th style="text-align:center;">Qté</th><th style="text-align:center;">Heures jour</th><th style="text-align:center;">Heures nuit</th><th style="text-align:right;">Total Wh</th></tr>${lignesAppareils}<tr class="total"><td colspan="5">Énergie journalière (CS 0,8)</td><td style="text-align:right;">${formatNombre(state.consommationTotale || 0)} Wh/j</td></tr><tr class="total"><td colspan="5">Énergie à couvrir</td><td style="text-align:right;">${formatNombre(state.energieACouvrir || 0)} Wh/j</td></tr></table>
        <div class="pied"><span>☀️ SolarGuide Bénin · solarguide.bj</span><span>Page 1</span></div></div>
        <div class="page"><div class="entete"><div class="entete-logo">☀️ SolarGuide Bénin</div><div class="entete-ref">Réf. ${refStr}</div></div>
        <div class="section-titre">&#9881; Dimensionnement technique</div>
        <div class="indicateurs"><div class="indic indic-vert"><div class="indic-label" style="color:#166534;">Autonomie réelle</div><div class="indic-val" style="color:#166534;">${dim.autonomie_heures}h</div><div style="font-size:8pt;color:#888;">sans soleil</div></div><div class="indic indic-bleu"><div class="indic-label" style="color:#1565c0;">Tension système</div><div class="indic-val" style="color:#1565c0;">${dim.tension}V</div></div><div class="indic indic-orange"><div class="indic-label" style="color:#e65100;">Groupe équiv.</div><div class="indic-val" style="color:#e65100;">${dim.groupe_recommande_kva} kVA</div></div></div>
        <div class="comp-grid"><div class="comp-card"><div class="comp-label">Batterie ${dim.batterie.type}</div><div class="comp-val">${dim.batterie.capacite_unitaire} Ah</div><div class="comp-sub">${dim.tension}V · ${dim.batterie.nombre} unité(s)</div></div><div class="comp-card"><div class="comp-label">Onduleur</div><div class="comp-val">${dim.onduleur.puissance} W</div><div class="comp-sub">Onde pure · 220V AC</div></div><div class="comp-card"><div class="comp-label">Régulateur</div><div class="comp-val">${typeOnd === "allinone" ? "Intégré" : dim.mppt.courant + " A"}</div><div class="comp-sub">${dim.tension}V</div></div><div class="comp-card"><div class="comp-label">Panneau</div><div class="comp-val">${dim.panneau.puissance_totale} Wc</div><div class="comp-sub">${dim.panneau.nombre} × ${dim.panneau.puissance_unitaire} Wc</div></div></div>
        <div class="section-titre">&#128207; Schéma synoptique</div><div class="synoptique">${getSynoptique()}</div>
        <div class="pied"><span>☀️ SolarGuide Bénin · solarguide.bj</span><span>Page 2</span></div></div>
        <div class="page"><div class="entete"><div class="entete-logo">☀️ SolarGuide Bénin</div><div class="entete-ref">Réf. ${refStr}</div></div>
        <div class="section-titre">&#128176; Devis estimatif</div>
        <table><tr><th>Désignation</th><th style="text-align:center;">Qté</th><th style="text-align:right;">Prix unitaire (FCFA)</th><th style="text-align:right;">Total (FCFA)</th></tr>${lignesDevis.map((l, i) => `<tr><td>${l.d}</td><td style="text-align:center;">${l.q}</td><td style="text-align:right;">${formatNombre(l.pu)}</td><td style="text-align:right;font-weight:bold;">${formatNombre(l.q * l.pu)}</td></tr>`).join("")}<tr class="total"><td colspan="3">TOTAL ESTIMÉ</td><td style="text-align:right;">${formatFCFA(totalDevis)}</td></tr></table>
        <div style="font-size:9pt;color:#888;margin-top:6px;">⚠️ Main d'œuvre non incluse · Prix indicatifs IRENA 2024 · À confirmer avec votre revendeur</div>
        <div class="pied"><span>☀️ SolarGuide Bénin · solarguide.bj</span><span>Page 3</span></div></div>
        <div class="page"><div class="entete"><div class="entete-logo">☀️ SolarGuide Bénin</div><div class="entete-ref">Réf. ${refStr}</div></div>
        <div class="section-titre">&#128200; Analyse économique sur 10 ans</div>
        <div class="eco-grid"><div class="eco-groupe"><div class="eco-titre orange">Groupe électrogène / an</div><div class="eco-ligne"><span>Carburant</span><span>${formatNombre(eco.cout_carburant_annuel || 0)} FCFA</span></div><div class="eco-ligne"><span>Entretien</span><span>${formatNombre(eco.cout_entretien_groupe_annuel || 0)} FCFA</span></div><div class="eco-total-ligne" style="color:#e65100;"><span>Total / an</span><span>${formatFCFA(eco.cout_total_groupe_annuel || 0)}</span></div></div><div class="eco-solaire"><div class="eco-titre green">Système solaire / an</div><div class="eco-ligne"><span>Entretien annuel</span><span>23.000 FCFA</span></div><div class="eco-total-ligne" style="color:#166534;"><span>Total / an</span><span>${formatFCFA(eco.cout_entretien_solaire_annuel || 23000)}</span></div></div></div>
        <table><tr><th>Poste</th><th style="text-align:right;">Groupe élec.</th><th style="text-align:right;">Solaire</th></tr><tr><td>Investissement initial</td><td style="text-align:right;">350.000 FCFA</td><td style="text-align:right;">${formatFCFA(eco.cout_initial_solaire || 0)}</td></tr><tr><td>Charges × 10</td><td style="text-align:right;">${formatFCFA((eco.cout_total_groupe_annuel || 0) * 10)}</td><td style="text-align:right;">${formatFCFA((eco.cout_entretien_solaire_annuel || 23000) * 10)}</td></tr><tr><td>Remplacement batterie</td><td style="text-align:right;">—</td><td style="text-align:right;">${formatFCFA(eco.cout_remplacement_batterie || 0)}</td></tr><tr class="total"><td>TOTAL 10 ANS</td><td style="text-align:right;">${formatFCFA(eco.cout_groupe_10ans || 0)}</td><td style="text-align:right;">${formatFCFA(eco.cout_solaire_10ans || 0)}</td></tr></table>
        <div class="rentabilite"><div class="rent-card" style="background:#e8f5e9;"><div class="rent-label">Économies sur 10 ans</div><div class="rent-val" style="color:#166534;">${formatFCFA(eco.economies_10ans || 0)}</div></div><div class="rent-card" style="background:#e3f2fd;"><div class="rent-label">Rentabilité en</div><div class="rent-val" style="color:#1565c0;">${eco.annee_rentabilite || "?"} ans</div></div></div>
        <div class="pied"><span>☀️ SolarGuide Bénin · solarguide.bj</span><span>Page 4</span></div></div>
        <div class="page"><div class="entete"><div class="entete-logo">☀️ SolarGuide Bénin</div><div class="entete-ref">Réf. ${refStr}</div></div>
        <div class="section-titre">&#128203; Mentions légales & Sources</div>
        <div style="font-size:9.5pt;line-height:1.8;color:#444;"><div style="margin-bottom:6px;"><strong>Normes :</strong> CEI 62446 (chute de tension max 3% DC · 5% AC) · CEI 61730 · NFC 15-100</div><div style="margin-bottom:6px;"><strong>Sources :</strong> NASA POWER (irradiation) · IRENA 2024 (prix) · ExchangeRate-API (taux) · OpenStreetMap (géolocalisation)</div><div style="margin-bottom:6px;"><strong>Performance Ratio :</strong> PR ≈ 0,80 (adapté au contexte climatique du Bénin)</div></div>
        <div class="disclaimer">Les résultats de ce rapport sont des estimations indicatives. Faites toujours appel à un technicien qualifié pour l'installation.</div>
        <div style="text-align:center;margin-top:20px;padding-top:12px;border-top:1px solid #e0e0e0;"><div style="font-size:14pt;font-weight:bold;color:#166534;">☀️ SolarGuide Bénin</div><div style="font-size:9pt;color:#888;margin-top:4px;">© ${now.getFullYear()} SolarGuide Bénin — Tous droits réservés</div></div>
        <div class="pied"><span>☀️ SolarGuide Bénin · solarguide.bj</span><span>Page 5</span></div></div>
        </body></html>`);
  rapport.document.close();
}
