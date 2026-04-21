function selectTypeInstallation(type) {
  state.typeInstallation = type;
  ["residentiel", "commercial"].forEach((t) => {
    const el = document.getElementById("type-" + t);
    if (el) el.classList.remove("selected");
  });
  const el = document.getElementById("type-" + type);
  if (el) el.classList.add("selected");
  const cfg = TRANCHES[type];
  const lpm = document.getElementById("label-pointe-matin");
  const lc = document.getElementById("label-creuse");
  const lps = document.getElementById("label-pointe-soir");
  if (lpm)
    lpm.innerHTML =
      cfg.pointe_matin.labelPointe +
      ' <span style="font-size:10px;font-weight:400;">' +
      (type === "residentiel" ? "(réveil, cuisine)" : "(boutique fermée)") +
      "</span>";
  if (lc)
    lc.innerHTML =
      cfg.pointe_matin.labelCreuse +
      ' <span style="font-size:10px;font-weight:400;">' +
      (type === "residentiel"
        ? "(tout le monde au travail)"
        : "(pleine activité commerciale)") +
      "</span>";
  if (lps)
    lps.innerHTML =
      cfg.pointe_matin.labelSoir +
      ' <span style="font-size:10px;font-weight:400;">' +
      (type === "residentiel" ? "(retour maison)" : "(fermeture progressive)") +
      "</span>";
  remplirSelect(
    "pointe-matin-debut",
    cfg.pointe_matin.debut,
    cfg.pointe_matin.defDebut,
  );
  remplirSelect(
    "pointe-matin-fin",
    cfg.pointe_matin.fin,
    cfg.pointe_matin.defFin,
  );
  remplirSelect("creuse-debut", cfg.creuse.debut, cfg.creuse.defDebut);
  remplirSelect("creuse-fin", cfg.creuse.fin, cfg.creuse.defFin);
  remplirSelect(
    "pointe-soir-debut",
    cfg.pointe_soir.debut,
    cfg.pointe_soir.defDebut,
  );
  remplirSelect("pointe-soir-fin", cfg.pointe_soir.fin, cfg.pointe_soir.defFin);
  remplirSelect("nuit-debut", cfg.nuit.debut, cfg.nuit.defDebut);
  remplirSelect("nuit-fin", cfg.nuit.fin, cfg.nuit.defFin);
}

function remplirSelect(selectId, heures, defaut) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = "";
  heures.forEach((h) => {
    const opt = document.createElement("option");
    opt.value = h;
    opt.textContent = String(h).padStart(2, "0") + "h00";
    if (h === defaut) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", updateCoupureResume);
}

function initConsommation() {
  const secCoupures = document.getElementById("section-coupures");
  if (secCoupures) {
    if (state.typeSysteme === "hybrid") secCoupures.style.display = "block";
    else secCoupures.style.display = "none";
  }
  if (!state.typeInstallation) selectTypeInstallation("residentiel");
  [
    "coupure-pointe-matin",
    "coupure-creuse",
    "coupure-pointe-soir",
    "coupure-nuit",
    "baisse-tension",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.removeEventListener("change", updateCoupureResume);
      el.addEventListener("change", updateCoupureResume);
    }
  });
  const dGrid = document.getElementById("days-grid");
  if (dGrid && dGrid.children.length === 0) {
    ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].forEach((j, i) => {
      const btn = document.createElement("button");
      btn.className = "day-btn";
      btn.textContent = j;
      btn.dataset.day = i;
      btn.onclick = function () {
        this.classList.toggle("selected");
        updateCoupureResume();
      };
      dGrid.appendChild(btn);
    });
  }
  // Toujours recharger la liste appareils si vide
  const list = document.getElementById("appareils-list");
  if (list && list.children.length === 0) {
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
}

function updateCoupureResume() {
  const resume = document.getElementById("coupure-resume");
  if (!resume) return;
  const jours = document.querySelectorAll(".day-btn.selected").length;
  const baisse = document.getElementById("baisse-tension")?.checked;
  let txt = [];
  const tranches = [
    {
      id: "coupure-pointe-matin",
      label: "Pointe matin",
      debut: "pointe-matin-debut",
      fin: "pointe-matin-fin",
    },
    {
      id: "coupure-creuse",
      label: "Creuse journée",
      debut: "creuse-debut",
      fin: "creuse-fin",
    },
    {
      id: "coupure-pointe-soir",
      label: "Pointe soir",
      debut: "pointe-soir-debut",
      fin: "pointe-soir-fin",
    },
    {
      id: "coupure-nuit",
      label: "Nuit",
      debut: "nuit-debut",
      fin: "nuit-fin",
    },
  ];
  tranches.forEach((t) => {
    const cb = document.getElementById(t.id);
    if (cb && cb.checked) {
      const d = document.getElementById(t.debut)?.value;
      const f = document.getElementById(t.fin)?.value;
      txt.push(
        t.label +
          " (" +
          String(d).padStart(2, "0") +
          "h→" +
          String(f).padStart(2, "0") +
          "h)",
      );
    }
  });
  if (jours > 0) txt.push(jours + " jour(s) sans courant/semaine");
  if (baisse) txt.push("baisses de tension fréquentes");
  if (txt.length > 0) {
    resume.textContent = "⚡ Coupures : " + txt.join(" · ");
    resume.style.display = "block";
  } else resume.style.display = "none";
}
