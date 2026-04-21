// rapport.js — Génération PDF (jsPDF) + HTML print fallback

function _jsPDFDisponible() {
  return (
    (typeof window.jspdf !== "undefined" && window.jspdf.jsPDF) ||
    (typeof window.jsPDF !== "undefined")
  );
}

function _getJsPDF() {
  if (typeof window.jspdf !== "undefined" && window.jspdf.jsPDF)
    return window.jspdf.jsPDF;
  if (typeof window.jsPDF !== "undefined") return window.jsPDF;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RAPPORT TECHNIQUE PDF — 6 sections (technicien)
// ─────────────────────────────────────────────────────────────────────────────
function genererRapportPDF() {
  const JsPDF = _getJsPDF();
  if (!JsPDF) { genererRapportHTML(); return; }

  const dim   = state.dimensionnement || {};
  const prix  = state.prix || {};
  const eco   = state.economie || {};
  const loc   = state.localisation || {};
  const reg   = dim.regulateur || dim.mppt || {};
  const cables = dim.cables || {};
  const panReg = cables.pan_reg || {};
  const regBat = cables.reg_bat || {};
  const batOnd = cables.bat_ond || {};
  const acCable = cables.ac || {};
  const disj   = dim.disjoncteurs || {};
  const sp     = dim.serie_parallele || {};

  const typeOnd  = state.typeOnduleur   || "classique";
  const typeSys  = state.typeSysteme    || "auto";
  const typeInst = state.typeInstallation || "residentiel";
  const now      = new Date();
  const dateStr  = now.toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit", year:"numeric" });
  const refStr   = "SGR-" + now.getFullYear() + "-" + String(Math.floor(Math.random() * 90000) + 10000);

  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const W = 210, ML = 18, MR = 18, TW = W - ML - MR;
  let y = 0;

  const GREEN  = [22, 101, 52];
  const LGREEN = [232, 245, 233];
  const BLUE   = [21, 101, 192];
  const LBLUE  = [227, 242, 253];
  const GRAY   = [100, 100, 100];
  const LGRAY  = [245, 245, 245];

  function header(title, page) {
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("☀ HélioBénin", ML, 10);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text("Réf. " + refStr + "  ·  " + dateStr, W - MR, 10, { align: "right" });
    doc.setTextColor(0, 0, 0);
    y = 24;
    if (title) {
      doc.setFontSize(13); doc.setFont("helvetica", "bold");
      doc.setTextColor(...GREEN);
      doc.text(title, ML, y);
      doc.setDrawColor(...GREEN); doc.setLineWidth(0.5);
      doc.line(ML, y + 1.5, ML + TW, y + 1.5);
      doc.setTextColor(0, 0, 0);
      y += 8;
    }
  }

  function footer(page) {
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(ML, 287, ML + TW, 287);
    doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("☀ HélioBénin · solarguide.bj", ML, 292);
    doc.text("Page " + page, W - MR, 292, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  function sectionTitre(txt) {
    if (y > 260) { footer(doc.getNumberOfPages()); doc.addPage(); header(null, doc.getNumberOfPages()); }
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.setTextColor(...GREEN);
    doc.text(txt, ML, y);
    doc.setDrawColor(...GREEN); doc.setLineWidth(0.4);
    doc.line(ML, y + 1.5, ML + TW, y + 1.5);
    doc.setTextColor(0, 0, 0);
    y += 7;
  }

  function ligneInfo(label, val, col2offset) {
    if (y > 270) { footer(doc.getNumberOfPages()); doc.addPage(); header(null, doc.getNumberOfPages()); }
    const off = col2offset || TW / 2;
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY); doc.text(label, ML, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
    doc.text(String(val), ML + off, y);
    y += 5.5;
  }

  function tableSimple(headers, rows, colWidths) {
    if (y > 265) { footer(doc.getNumberOfPages()); doc.addPage(); header(null, doc.getNumberOfPages()); }
    const cellH = 6.5;
    // Header row
    doc.setFillColor(...GREEN);
    doc.rect(ML, y, TW, cellH, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
    let cx = ML + 2;
    headers.forEach((h, i) => {
      doc.text(h, cx, y + 4.5);
      cx += colWidths[i];
    });
    y += cellH;
    doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
    rows.forEach((row, ri) => {
      if (y > 272) { footer(doc.getNumberOfPages()); doc.addPage(); header(null, doc.getNumberOfPages()); }
      if (ri % 2 === 0) { doc.setFillColor(248, 250, 248); doc.rect(ML, y, TW, cellH, "F"); }
      doc.setDrawColor(224, 224, 224); doc.setLineWidth(0.2);
      doc.rect(ML, y, TW, cellH);
      cx = ML + 2;
      row.forEach((cell, ci) => {
        const txt = String(cell == null ? "" : cell);
        const align = (typeof cell === "number" || /^[\d\s.]+$/.test(txt)) && ci > 0 ? "right" : "left";
        const xPos = align === "right" ? cx + colWidths[ci] - 4 : cx;
        doc.text(txt, xPos, y + 4.5, { align });
        cx += colWidths[ci];
      });
      y += cellH;
    });
    y += 3;
  }

  // ── PAGE 1 — Informations site & bilan ───────────────────────────────────
  header("Rapport de Dimensionnement Solaire", 1);

  // Titre principal
  doc.setFontSize(15); doc.setFont("helvetica", "bold"); doc.setTextColor(...GREEN);
  doc.text("Rapport Technique", W / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
  doc.text("Résultats indicatifs · Normes CEI/IEC · IRENA 2024", W / 2, y, { align: "center" });
  y += 10; doc.setTextColor(0, 0, 0);

  // Section 1 — Informations site
  sectionTitre("1. Informations du site");
  ligneInfo("Type de système",    typeSys === "hybrid" ? "Hybride SBEE" : "Autonome 100%");
  ligneInfo("Type d'installation", typeInst === "commercial" ? "Commercial" : "Résidentiel");
  ligneInfo("Localisation",        loc.nom || "Bénin");
  if (loc.latitude) ligneInfo("Coordonnées GPS", loc.latitude + "°N · " + loc.longitude + "°E");
  ligneInfo("Irradiation NASA",    (loc.irradiation || "—") + " kWh/m²/j");
  ligneInfo("Jours d'autonomie",   (state.joursAutonomie || 1) + " jour(s)");
  ligneInfo("Taux de change",      formatNombre(prix.taux_fcfa_usd || 610) + " XOF/USD");
  y += 3;

  // Section 2 — Bilan de consommation
  sectionTitre("2. Bilan de consommation");
  const appareils = state.appareils || [];
  const rowsApp = appareils.map(a => [
    a.nom,
    a.puissance + " W",
    a.quantite,
    (a.heures_jour || 0) + "h",
    (a.heures_nuit || 0) + "h",
    formatNombre(a.puissance * a.quantite * ((a.heures_jour || 0) + (a.heures_nuit || 0))) + " Wh"
  ]);
  rowsApp.push(["", "", "", "", "Énergie brute (CS 0,8)", formatNombre(state.consommationTotale || 0) + " Wh/j"]);
  rowsApp.push(["", "", "", "", "Énergie à couvrir", formatNombre(state.energieACouvrir || 0) + " Wh/j"]);
  tableSimple(
    ["Appareil", "Puissance", "Qté", "H. jour", "H. nuit", "Total Wh"],
    rowsApp,
    [48, 22, 12, 16, 16, 60]
  );

  footer(1);

  // ── PAGE 2 — Résultats dimensionnement ───────────────────────────────────
  doc.addPage();
  header(null, 2);

  sectionTitre("3. Résultats du dimensionnement");

  // Indicateurs 3 colonnes
  const indics = [
    { label: "Puissance crête", val: (dim.panneau?.puissance_totale || "—") + " Wc", bg: LGREEN },
    { label: "Tension système", val: (dim.tension || "—") + " V", bg: LBLUE },
    { label: "Autonomie réelle", val: (dim.autonomie_heures || "—") + " h", bg: [255, 243, 224] },
  ];
  const iw = (TW - 4) / 3;
  indics.forEach((ind, i) => {
    const ix = ML + i * (iw + 2);
    doc.setFillColor(...ind.bg); doc.roundedRect(ix, y, iw, 16, 2, 2, "F");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
    doc.text(ind.label, ix + iw / 2, y + 5, { align: "center" });
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
    doc.text(String(ind.val), ix + iw / 2, y + 13, { align: "center" });
  });
  y += 22;

  // Composants principaux
  const comps = [
    ["Panneau solaire", (dim.panneau?.nombre || "—") + " × " + (dim.panneau?.puissance_unitaire || "—") + " Wc", "Total: " + (dim.panneau?.puissance_totale || "—") + " Wc"],
    ["Batterie " + (dim.batterie?.type || ""), (dim.batterie?.capacite_unitaire || "—") + " Ah · " + (dim.batterie?.nombre || 1) + " unité(s)", (dim.tension || "—") + "V"],
    ["Régulateur " + (reg.type || "MPPT"), (reg.courant || "—") + " A", (dim.tension || "—") + "V"],
    ["Onduleur", (dim.onduleur?.puissance || "—") + " W", "Onde pure 220V AC"],
  ];
  const cw2 = TW / 2;
  comps.forEach((c, i) => {
    const cx2 = i % 2 === 0 ? ML : ML + cw2 + 2;
    if (i % 2 === 0 && y > 260) { footer(doc.getNumberOfPages()); doc.addPage(); header(null, doc.getNumberOfPages()); }
    const cy2 = i < 2 ? y : y;
    if (i === 2) {} // continue row
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3);
    doc.roundedRect(cx2, i < 2 ? y : y + 20, cw2 - 2, 18, 2, 2);
    const ry = i < 2 ? y + 5 : y + 25;
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
    doc.text(c[0], cx2 + 4, ry);
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
    doc.text(c[1], cx2 + 4, ry + 6);
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
    doc.text(c[2], cx2 + 4, ry + 11);
  });
  y += 42;

  // Section 4 — Série/Parallèle
  sectionTitre("4. Configuration série/parallèle champ PV");
  if (sp && sp.Ns) {
    ligneInfo("Panneaux en série (Ns)",    sp.Ns + " panneaux");
    ligneInfo("Branches en parallèle (Np)", sp.Np + " branches");
    ligneInfo("Voc champ total",           (sp.Voc_champ || "—") + " V");
    ligneInfo("Isc champ total",           (sp.Isc_champ || "—") + " A");
    if (sp.alerte_tension) {
      doc.setFillColor(255, 235, 238);
      doc.roundedRect(ML, y, TW, 10, 2, 2, "F");
      doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(200, 0, 0);
      doc.text("⚠ " + (sp.message_alerte || "Voc dépasse la tension max du régulateur !"), ML + 3, y + 6.5);
      doc.setTextColor(0, 0, 0);
      y += 13;
    }
  } else {
    doc.setFontSize(9); doc.setFont("helvetica", "italic"); doc.setTextColor(...GRAY);
    doc.text("Données série/parallèle non disponibles.", ML, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
  }

  footer(2);

  // ── PAGE 3 — Câblage & Protections ───────────────────────────────────────
  doc.addPage();
  header(null, 3);

  sectionTitre("5. Dimensionnement câblage (CEI 62446)");
  tableSimple(
    ["Tronçon", "Section (mm²)", "Longueur (m)", "Type câble", "Chute tension"],
    [
      ["Panneaux → Régulateur", (panReg.section || "—") + " mm²", (panReg.metrage || "—") + " m", "H1Z2Z2K (UV)", (panReg.chute_tension ? panReg.chute_tension + "%" : "≤ 3%")],
      ["Régulateur → Batterie", (regBat.section || "—") + " mm²", (regBat.metrage || "—") + " m", "Souple DC",    "≤ 1%"],
      ["Batterie → Onduleur",   (batOnd.section || "—") + " mm²", (batOnd.metrage || "—") + " m", "Souple DC",    "≤ 1%"],
      ["Onduleur → Tableau AC", (acCable.section || "—") + " mm²", (acCable.metrage || "—") + " m", "H07RN-F",    (acCable.chute_tension ? acCable.chute_tension + "%" : "≤ 5%")],
      ["Câble de terre DC",     (cables.terre_DC || panReg.section || "—") + " mm²", (panReg.metrage || "—") + " m", "Souple DC",  "—"],
      ["Câble de terre AC",     (cables.terre_AC || acCable.section || "—") + " mm²", (acCable.metrage || "—") + " m", "Souple DC", "—"],
    ],
    [52, 30, 28, 34, 30]
  );

  sectionTitre("6. Protections électriques (NF C 15-100 / IEC 60947-2)");
  tableSimple(
    ["Protection", "Calibre / Type", "Norme", "Tension"],
    [
      ["Disjoncteur DC",        (disj.DC || "—") + " A · magnétothermique", "IEC 60947-2", "1000V DC"],
      ["Disjoncteur AC diff.",  (disj.AC || "—") + " A · 30mA type A",     "NF C 15-100", "230V AC"],
      ["Parafoudre DC",         "Type 2 · Imax 40kA",                       "IEC 61643-11", "1000V DC"],
      ["Parafoudre AC",         "Type 2 · Imax 40kA",                       "IEC 61643-11", "230V AC"],
      ...(dim.ats ? [["ATS (commutateur)",   (dim.ats || "—") + " W · auto",    "CEI 60947", "230V AC"]] : []),
    ],
    [52, 56, 36, 30]
  );

  // Mentions
  y += 4;
  doc.setFillColor(...LGRAY);
  doc.roundedRect(ML, y, TW, 26, 2, 2, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
  doc.text("Normes de référence :", ML + 3, y + 5);
  doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
  doc.text("CEI 62446 (chute de tension DC ≤ 3% · AC ≤ 5%) · CEI 61730 · NF C 15-100 · IEC 60947-2", ML + 3, y + 10);
  doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
  doc.text("Sources :", ML + 3, y + 16);
  doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
  doc.text("NASA POWER (irradiation) · IRENA 2024 (prix) · ExchangeRate-API (taux) · PR = 0,75 adapté Bénin", ML + 3, y + 21);
  y += 30;

  doc.setFontSize(7.5); doc.setFont("helvetica", "italic"); doc.setTextColor(160, 160, 160);
  doc.text("Les résultats de ce rapport sont des estimations indicatives. Faites appel à un technicien qualifié pour l'installation.", ML, y, { maxWidth: TW });

  footer(3);

  doc.save("rapport_solarguide_" + refStr + ".pdf");
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVIS PDF — colonnes prix vides, TVA 18%
// ─────────────────────────────────────────────────────────────────────────────
function genererDevisPDF() {
  const JsPDF = _getJsPDF();
  if (!JsPDF) { alert("jsPDF non disponible. Vérifiez la connexion."); return; }

  const dim  = state.dimensionnement || {};
  const reg  = dim.regulateur || dim.mppt || {};
  const now  = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit", year:"numeric" });
  const refStr  = "DEV-" + now.getFullYear() + "-" + String(Math.floor(Math.random() * 90000) + 10000);
  const typeOnd = state.typeOnduleur || "classique";

  const GREEN = [22, 101, 52];
  const LGRAY = [245, 245, 245];

  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const W = 210, ML = 18, MR = 18, TW = W - ML - MR;
  let y = 0;

  // En-tête
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("☀ HélioBénin", ML, 10);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text("Réf. " + refStr + "  ·  " + dateStr, W - MR, 10, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y = 26;

  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(...GREEN);
  doc.text("DEVIS ESTIMATIF", W / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120);
  doc.text("Système solaire · Prix indicatifs IRENA 2024 · TVA 18%", W / 2, y, { align: "center" });
  y += 12; doc.setTextColor(0, 0, 0);

  // Récupérer lignes du tableau devis modal technicien
  let lignes = [];
  const tbody = document.getElementById("devis-tbody");
  if (tbody) {
    const rows = tbody.querySelectorAll("tr");
    rows.forEach(row => {
      const inputs = row.querySelectorAll("input");
      if (inputs.length >= 3) {
        const designation = inputs[0]?.value?.trim() || "";
        const qte = parseFloat(inputs[1]?.value) || 1;
        const pu  = parseFloat(inputs[2]?.value) || 0;
        if (designation) lignes.push({ designation, qte, pu });
      }
    });
  }

  // Fallback: construire lignes depuis state
  if (lignes.length === 0) {
    lignes = [
      { designation: "Panneau solaire " + (dim.panneau?.puissance_unitaire || 200) + " Wc", qte: dim.panneau?.nombre || 1, pu: 0 },
      { designation: "Batterie " + (dim.batterie?.type || "AGM") + " " + (dim.batterie?.capacite_unitaire || 100) + "Ah", qte: dim.batterie?.nombre || 1, pu: 0 },
    ];
    if (typeOnd !== "allinone") {
      lignes.push({ designation: "Régulateur " + (reg.type || "MPPT") + " " + (reg.courant || 20) + "A", qte: 1, pu: 0 });
    }
    lignes.push({ designation: "Onduleur " + (dim.onduleur?.puissance || 500) + "W", qte: 1, pu: 0 });
    lignes.push({ designation: "Câblage DC + AC + terre", qte: 1, pu: 0 });
    lignes.push({ designation: "Disjoncteurs DC + AC", qte: 1, pu: 0 });
    lignes.push({ designation: "Parafoudres DC + AC", qte: 2, pu: 0 });
    if (dim.ats) lignes.push({ designation: "ATS commutateur automatique", qte: 1, pu: 0 });
    lignes.push({ designation: "Main d'œuvre & mise en service", qte: 1, pu: 0 });
  }

  // En-tête tableau
  const colW = [82, 20, 32, 32, 8];
  const cellH = 7;
  doc.setFillColor(...GREEN);
  doc.rect(ML, y, TW, cellH, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
  const heads = ["Désignation", "Qté", "P.U. (FCFA)", "Total (FCFA)"];
  let cx = ML + 2;
  heads.forEach((h, i) => { doc.text(h, cx, y + 5); cx += colW[i]; });
  y += cellH;

  let sousTotal = 0;
  doc.setTextColor(0, 0, 0);
  lignes.forEach((l, ri) => {
    if (y > 265) {
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
      doc.line(ML, 287, ML + TW, 287);
      doc.setFontSize(7); doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text("Suite page suivante…", W - MR, 292, { align: "right" });
      doc.addPage();
      y = 20; doc.setTextColor(0, 0, 0);
    }
    if (ri % 2 === 0) { doc.setFillColor(248, 250, 248); doc.rect(ML, y, TW, cellH, "F"); }
    doc.setDrawColor(224, 224, 224); doc.setLineWidth(0.2);
    doc.rect(ML, y, TW, cellH);
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
    const total = parseFloat(l.qte) * parseFloat(l.pu);
    sousTotal += total;
    cx = ML + 2;
    const vals = [
      l.designation,
      String(l.qte),
      l.pu ? formatNombre(l.pu) : "____________",
      total ? formatNombre(total) : "____________",
    ];
    vals.forEach((v, vi) => {
      const align = vi > 0 ? "right" : "left";
      const xp = align === "right" ? cx + colW[vi] - 4 : cx;
      doc.text(v, xp, y + 5, { align });
      cx += colW[vi];
    });
    y += cellH;
  });

  // Totaux
  y += 3;
  const TVA = 0.18;
  const montantTVA = Math.round(sousTotal * TVA);
  const totalTTC = sousTotal + montantTVA;

  const totaux = [
    ["Sous-total HT", sousTotal ? formatNombre(sousTotal) + " FCFA" : "____________ FCFA"],
    ["TVA 18%",       montantTVA ? formatNombre(montantTVA) + " FCFA" : "____________ FCFA"],
    ["TOTAL TTC",     totalTTC ? formatNombre(totalTTC) + " FCFA" : "____________ FCFA"],
  ];
  totaux.forEach((t, i) => {
    const isTot = i === 2;
    if (isTot) { doc.setFillColor(...LGRAY); doc.rect(ML + TW/2, y, TW/2, 8, "F"); }
    doc.setFontSize(isTot ? 10 : 9); doc.setFont("helvetica", isTot ? "bold" : "normal");
    doc.setTextColor(isTot ? 22 : 80, isTot ? 101 : 80, isTot ? 52 : 80);
    doc.text(t[0], ML + TW - 68, y + (isTot ? 5.5 : 5));
    doc.setTextColor(0, 0, 0);
    doc.text(t[1], ML + TW - 2, y + (isTot ? 5.5 : 5), { align: "right" });
    y += isTot ? 10 : 7;
  });

  // Notes
  y += 8;
  doc.setFillColor(232, 245, 233); doc.roundedRect(ML, y, TW, 20, 2, 2, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...GREEN);
  doc.text("Conditions & Notes :", ML + 3, y + 5);
  doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
  doc.text("• Prix indicatifs basés sur IRENA 2024 — à confirmer avec votre revendeur local.", ML + 3, y + 10);
  doc.text("• Validité du devis : 30 jours à compter de la date d'émission.", ML + 3, y + 15);

  // Pied de page
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
  doc.line(ML, 287, ML + TW, 287);
  doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(150, 150, 150);
  doc.text("☀ HélioBénin · solarguide.bj", ML, 292);
  doc.text("Page 1", W - MR, 292, { align: "right" });

  doc.save("devis_solarguide_" + refStr + ".pdf");
}

// ─────────────────────────────────────────────────────────────────────────────
// RAPPORT HTML — fallback (utilisateurs non-techniciens)
// ─────────────────────────────────────────────────────────────────────────────
function genererRapportHTML() {
  if (!state.dimensionnement) {
    alert("Veuillez d'abord effectuer un dimensionnement.");
    return;
  }
  const dim   = state.dimensionnement;
  const prix  = state.prix || {};
  const eco   = state.economie || {};
  const loc   = state.localisation || {};
  const reg   = dim.regulateur || dim.mppt || {};
  const typeOnd  = state.typeOnduleur   || "classique";
  const typeSys  = state.typeSysteme    || "auto";
  const typeInst = state.typeInstallation || "residentiel";
  const now   = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit", year:"numeric" });
  const heureStr = now.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
  const refStr = "SGR-" + now.getFullYear() + "-" + String(Math.floor(Math.random() * 90000) + 10000);

  function getLignesDevis() {
    const lignes = [
      { d: "Panneau solaire " + (dim.panneau?.puissance_unitaire || 200) + " Wc", q: dim.panneau?.nombre || 1, pu: Math.round((prix.panneau || 0) / (dim.panneau?.nombre || 1)) },
      { d: "Batterie " + (dim.batterie?.type || "AGM") + " " + (dim.batterie?.capacite_unitaire || 100) + "Ah", q: dim.batterie?.nombre || 1, pu: Math.round((prix.batterie || 0) / (dim.batterie?.nombre || 1)) },
    ];
    if (typeOnd !== "allinone")
      lignes.push({ d: "Régulateur " + (reg.type || "MPPT") + " " + (reg.courant || 20) + "A", q: 1, pu: prix.regulateur || 0 });
    lignes.push({ d: "Onduleur " + (dim.onduleur?.puissance || 500) + "W", q: 1, pu: prix.onduleur || 0 });
    lignes.push({ d: "Câblage DC + AC + terre", q: 1, pu: (prix.cable_dc || 0) + (prix.cable_ac || 0) + (prix.cable_terre || 0) });
    lignes.push({ d: "Disjoncteurs DC + AC", q: 1, pu: (prix.disjoncteur_dc || 0) + (prix.disjoncteur_ac || 0) });
    lignes.push({ d: "Parafoudres DC + AC", q: 1, pu: prix.parafoudre || 24000 });
    if (dim.ats) lignes.push({ d: "ATS " + dim.ats + "W", q: 1, pu: prix.ats || 35000 });
    return lignes;
  }

  const lignesDevis = getLignesDevis();
  const totalDevis  = lignesDevis.reduce((s, l) => s + l.q * l.pu, 0);
  const lignesApp   = (state.appareils || []).map(a => {
    const hj = a.heures_jour || 0, hn = a.heures_nuit || 0;
    return `<tr><td>${a.nom}</td><td>${a.puissance}</td><td>${a.quantite}</td><td>${hj}h</td><td>${hn}h</td><td style="text-align:right;">${formatNombre(a.puissance * a.quantite * (hj+hn))}</td></tr>`;
  }).join("");

  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>HélioBénin — Dimensionnement solaire PV</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:11pt;color:#1a1a1a;}
.page{width:210mm;min-height:297mm;margin:0 auto;padding:15mm 18mm;page-break-after:always;position:relative;}
.page:last-child{page-break-after:auto;}
.entete{background:#166534;color:#fff;padding:10px 16px;margin:-15mm -18mm 12mm;display:flex;justify-content:space-between;align-items:center;}
.entete-logo{font-size:16pt;font-weight:bold;}.entete-ref{font-size:9pt;opacity:0.8;text-align:right;}
.pied{position:absolute;bottom:8mm;left:18mm;right:18mm;border-top:1px solid #ccc;padding-top:4px;display:flex;justify-content:space-between;font-size:8pt;color:#888;}
.sec{font-size:13pt;font-weight:bold;color:#166534;border-bottom:2px solid #166534;padding-bottom:4px;margin:14px 0 8px;}
table{width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:10px;}
th{background:#166534;color:#fff;padding:6px 8px;text-align:left;}
td{padding:5px 8px;border-bottom:0.5px solid #e0e0e0;}
tr:nth-child(even) td{background:#f5faf5;}
.tot td{background:#e8f5e9;font-weight:bold;color:#166534;}
.no-print{display:none;}
@media screen{.no-print{display:flex;background:#166534;color:#fff;padding:10px 20px;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100;}}
@media print{.no-print{display:none!important;}}
</style></head><body>
<div class="no-print"><span style="font-weight:bold;">☀ HélioBénin — ${refStr}</span>
<button onclick="window.print()" style="background:#fff;color:#166534;border:none;padding:8px 20px;border-radius:6px;font-weight:bold;cursor:pointer;">Imprimer / PDF</button></div>
<div class="page">
<div class="entete"><div class="entete-logo">☀ HélioBénin</div><div class="entete-ref">Réf. ${refStr}<br>${dateStr} à ${heureStr}</div></div>
<div style="text-align:center;margin-bottom:14px;"><div style="font-size:18pt;font-weight:bold;color:#166534;">Rapport de Dimensionnement Solaire</div><div style="font-size:9pt;color:#888;margin-top:4px;">Résultats indicatifs · IRENA 2024</div></div>
<div class="sec">Informations générales</div>
<table><tr><th>Paramètre</th><th>Valeur</th></tr>
<tr><td>Système</td><td>${typeSys === "hybrid" ? "Hybride SBEE" : "Autonome"}</td></tr>
<tr><td>Installation</td><td>${typeInst === "commercial" ? "Commercial" : "Résidentiel"}</td></tr>
<tr><td>Localisation</td><td>${loc.nom || "Bénin"}</td></tr>
<tr><td>Irradiation NASA</td><td>${loc.irradiation || "—"} kWh/m²/j</td></tr>
<tr><td>Autonomie</td><td>${state.joursAutonomie || 1} jour(s)</td></tr></table>
<div class="sec">Consommation déclarée</div>
<table><tr><th>Appareil</th><th>W</th><th>Qté</th><th>H. jour</th><th>H. nuit</th><th style="text-align:right;">Wh/j</th></tr>
${lignesApp}
<tr class="tot"><td colspan="5">Énergie totale</td><td style="text-align:right;">${formatNombre(state.consommationTotale || 0)} Wh/j</td></tr></table>
<div class="sec">Résultats dimensionnement</div>
<table><tr><th>Composant</th><th>Valeur</th></tr>
<tr><td>Panneaux solaires</td><td>${dim.panneau?.nombre || "—"} × ${dim.panneau?.puissance_unitaire || "—"} Wc = ${dim.panneau?.puissance_totale || "—"} Wc</td></tr>
<tr><td>Batterie ${dim.batterie?.type || ""}</td><td>${dim.batterie?.capacite_unitaire || "—"} Ah · ${dim.batterie?.nombre || 1} unité(s) · ${dim.tension || "—"}V</td></tr>
<tr><td>Régulateur ${reg.type || ""}</td><td>${reg.courant || "—"} A · ${dim.tension || "—"}V</td></tr>
<tr><td>Onduleur</td><td>${dim.onduleur?.puissance || "—"} W · onde pure 220V AC</td></tr></table>
<div class="pied"><span>☀ HélioBénin · solarguide.bj</span><span>Page 1</span></div></div>
<div class="page">
<div class="entete"><div class="entete-logo">☀ HélioBénin</div><div class="entete-ref">Réf. ${refStr}</div></div>
<div class="sec">Devis estimatif</div>
<table><tr><th>Désignation</th><th style="text-align:center;">Qté</th><th style="text-align:right;">Prix unitaire</th><th style="text-align:right;">Total (FCFA)</th></tr>
${lignesDevis.map(l => `<tr><td>${l.d}</td><td style="text-align:center;">${l.q}</td><td style="text-align:right;">${formatNombre(l.pu)}</td><td style="text-align:right;font-weight:bold;">${formatNombre(l.q * l.pu)}</td></tr>`).join("")}
<tr class="tot"><td colspan="3">TOTAL ESTIMÉ (HT)</td><td style="text-align:right;">${formatNombre(totalDevis)} FCFA</td></tr></table>
<div style="font-size:9pt;color:#888;margin-top:6px;">⚠ Main d'œuvre non incluse · Prix indicatifs IRENA 2024</div>
<div class="pied"><span>☀ HélioBénin · solarguide.bj</span><span>Page 2</span></div></div>
</body></html>`);
  w.document.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// Point d'entrée principal
// ─────────────────────────────────────────────────────────────────────────────
function genererRapport() {
  if (!state.dimensionnement) {
    alert("Veuillez d'abord effectuer un dimensionnement.");
    return;
  }
  const cfg = window.SG_CONFIG || {};
  if (cfg.role === "technicien" && _jsPDFDisponible()) {
    genererRapportPDF();
  } else {
    genererRapportHTML();
  }
}

window.genererRapportPDF = genererRapportPDF;
window.genererDevisPDF   = genererDevisPDF;
window.genererRapport    = genererRapport;
