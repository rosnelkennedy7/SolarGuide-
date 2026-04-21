function ajouterAppareil() {
  if (appareils_defaut.length === 0) {
    fetch("/get_appareils")
      .then((r) => r.json())
      .then((data) => {
        if (data.succes) appareils_defaut = data.appareils;
        _creerLigneAppareil();
      })
      .catch(() => _creerLigneAppareil());
  } else {
    _creerLigneAppareil();
  }
}

function _creerLigneAppareilGenerique(
  containerId,
  prefix,
  id,
  withBudgetUpdate,
) {
  const list = document.getElementById(containerId);
  if (!list) return;
  const row = document.createElement("div");
  row.className = "appareil-row";
  row.id = "app-row-" + prefix + id;
  const categoriesCommerciales = ["Commerce", "Industrie"];
  let appareils_filtres = appareils_defaut;
  if (state.typeInstallation !== "commercial")
    appareils_filtres = appareils_defaut.filter(
      (a) => !categoriesCommerciales.includes(a.categorie),
    );
  const options = appareils_filtres
    .map(
      (a) =>
        `<option value="${a.nom}" data-puissance="${a.puissance_watts}">${a.nom} (${a.puissance_watts}W)</option>`,
    )
    .join("");
  const updateFn = withBudgetUpdate
    ? `onAppareilChange(this,'${prefix}',${id}); mettreAJourBarreBudget()`
    : `onAppareilChange(this,'${prefix}',${id})`;
  const inputUpdate = withBudgetUpdate
    ? `oninput="mettreAJourBarreBudget()"`
    : "";
  row.innerHTML = `
          <select id="sel-${prefix}${id}" onchange="${updateFn}"
            style="width:100%;border:1px solid var(--gray-200);border-radius:6px;padding:6px 8px;font-size:12px;font-family:'Inter',sans-serif;color:var(--gray-900);background:#fff;outline:none;">
            <option value="">— Choisir un appareil —</option>${options}
            <option value="custom">✏️ Saisir un appareil personnalisé</option>
          </select>
          <input type="number" id="p-${prefix}${id}" value="100" min="1" placeholder="W" ${inputUpdate}>
          <input type="number" id="q-${prefix}${id}" value="1" min="1" placeholder="qté" ${inputUpdate}>
          <input type="number" id="hj-${prefix}${id}" value="4" min="0" max="24" step="0.5" placeholder="☀️h" ${inputUpdate}>
          <input type="number" id="hn-${prefix}${id}" value="0" min="0" max="24" step="0.5" placeholder="🌙h" ${inputUpdate}>
          <button class="btn-delete" onclick="supprimerAppareilGenerique('${prefix}',${id}${withBudgetUpdate ? ",true" : ""})">🗑️</button>`;
  list.appendChild(row);
}

function _creerLigneAppareil() {
  _creerLigneAppareilGenerique("appareils-list", "app", appareilCount++, false);
}

function onAppareilChange(sel, prefix, id) {
  if (sel.value === "custom") {
    const input = document.createElement("input");
    input.type = "text";
    input.id = "sel-" + prefix + id;
    input.placeholder = "Nom de l'appareil personnalisé...";
    input.style.cssText =
      "width:100%;border:1px solid var(--green-200);border-radius:6px;padding:6px 8px;font-size:12px;font-family:'Inter',sans-serif;color:var(--gray-900);background:#fff;outline:none;";
    sel.parentNode.replaceChild(input, sel);
    input.focus();
    document.getElementById("p-" + prefix + id).value = "";
  } else {
    const opt = sel.options[sel.selectedIndex];
    const puissance = opt.dataset.puissance;
    if (puissance)
      document.getElementById("p-" + prefix + id).value = puissance;
  }
}

function supprimerAppareilGenerique(prefix, id, updateBudget) {
  const row = document.getElementById("app-row-" + prefix + id);
  if (row) row.remove();
  if (updateBudget) mettreAJourBarreBudget();
}

function supprimerAppareil(id) {
  supprimerAppareilGenerique("app", id, false);
}

function validerConsommation() {
  const rows = document.querySelectorAll("#appareils-list .appareil-row");
  if (rows.length === 0) {
    alert("Ajoutez au moins un appareil.");
    return;
  }
  const appareils = [];
  let energie = 0;
  rows.forEach((row) => {
    const id = row.id.replace("app-row-app", "");
    const selEl = document.getElementById("sel-app" + id);
    let nom = "Appareil personnalisé";
    if (selEl) {
      nom =
        selEl.tagName === "INPUT"
          ? selEl.value || "Appareil personnalisé"
          : selEl.value || "Appareil personnalisé";
    }
    const p = parseFloat(document.getElementById("p-app" + id).value) || 0;
    const q = parseFloat(document.getElementById("q-app" + id).value) || 1;
    const hj = parseFloat(document.getElementById("hj-app" + id)?.value) || 0;
    const hn = parseFloat(document.getElementById("hn-app" + id)?.value) || 0;
    const h = hj + hn;
    appareils.push({
      nom,
      puissance: p,
      quantite: q,
      heures: h,
      heures_jour: hj,
      heures_nuit: hn,
    });
    energie += p * q * h;
  });
  const conso_reelle = energie * 0.8;
  if (state.typeSysteme === "hybrid") {
    let heures_coupure = 0;
    const tranches = [
      {
        id: "coupure-pointe-matin",
        debut: "pointe-matin-debut",
        fin: "pointe-matin-fin",
      },
      { id: "coupure-creuse", debut: "creuse-debut", fin: "creuse-fin" },
      {
        id: "coupure-pointe-soir",
        debut: "pointe-soir-debut",
        fin: "pointe-soir-fin",
      },
      { id: "coupure-nuit", debut: "nuit-debut", fin: "nuit-fin" },
    ];
    tranches.forEach((t) => {
      const cb = document.getElementById(t.id);
      if (cb && cb.checked) {
        const d = parseInt(document.getElementById(t.debut)?.value || 0);
        const f = parseInt(document.getElementById(t.fin)?.value || 0);
        let duree = f > d ? f - d : 24 - d + f;
        heures_coupure += duree;
      }
    });
    if (heures_coupure === 0) heures_coupure = 8;
    heures_coupure = Math.min(heures_coupure, 24);
    state.heuresCoupure = heures_coupure;
    state.energieACouvrir = conso_reelle * (heures_coupure / 24) * 1.2;
  } else {
    state.heuresCoupure = null;
    state.energieACouvrir = conso_reelle;
  }
  state.appareils = appareils;
  state.consommationTotale = conso_reelle;
  goToPage("systeme");
}

// ============================================================
// PAGE SYSTÈME
// ============================================================
