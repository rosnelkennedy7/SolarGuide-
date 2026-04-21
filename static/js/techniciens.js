function chargerTechniciens() {
  const ville = document.getElementById("search-ville").value;
  fetch("/get_techniciens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ville }),
  })
    .then((r) => r.json())
    .then((data) => {
      const list = document.getElementById("techniciens-list");
      if (!data.succes || data.techniciens.length === 0) {
        list.innerHTML =
          '<div style="text-align:center;padding:20px;color:var(--gray-400);">Aucun technicien trouvé</div>';
        return;
      }
      list.innerHTML = data.techniciens
        .map((t) => {
          const initiales = (t.nom[0] || "?") + (t.prenom ? t.prenom[0] : "");
          return `<div class="tech-card"><div class="tech-avatar">${initiales.toUpperCase()}</div><div style="flex:1;"><div class="tech-name">${t.prenom || ""} ${t.nom || ""}</div><div class="tech-ville">📍 ${t.ville || ""} · ${t.zone_intervention || ""}</div><div class="tech-skills">🔧 ${t.competences || ""} · ${t.experience_ans || 0} ans d'expérience</div><div class="tech-btns">${t.whatsapp ? `<a href="https://wa.me/${t.whatsapp.replace(/\D/g, "")}" target="_blank" class="btn-contact btn-whatsapp">💬 WhatsApp</a>` : ""} ${t.telephone ? `<a href="tel:${t.telephone}" class="btn-contact btn-phone">📞 Appeler</a>` : ""} ${t.email ? `<a href="mailto:${t.email}" class="btn-contact btn-email">✉️ Email</a>` : ""}</div></div></div>`;
        })
        .join("");
    });
}
function filtrerTechniciens() {
  chargerTechniciens();
}

// ============================================================
// LOADER
// ============================================================
function showLoader(msg) {
  document.getElementById("loader-text").textContent = msg || "Chargement...";
  document.getElementById("loader").classList.add("show");
}
function hideLoader() {
  document.getElementById("loader").classList.remove("show");
}

// ============================================================
// INIT
// ============================================================
selectBatterie("AGM");
selectAutonomie(1);
selectCarburant("essence");
fetch("/get_appareils")
  .then((r) => r.json())
  .then((data) => {
    if (data.succes) appareils_defaut = data.appareils;
  })
  .catch(() => {});

// ============================================================
// PARCOURS BUDGET — LOGIQUE
// ============================================================

// Budget minimum basé sur config de base : 1x200Wc + 1x100Ah AGM + PWM + 500W onduleur + câblage
// Calculé dynamiquement via taux de change IRENA
const BUDGET_BASE = {
  panneau_wc: 200, // 1 panneau 200Wc
  batterie_ah: 100, // 1 batterie AGM 100Ah
  tension: 12,
  onduleur_w: 500,
  regulateur_a: 20,
};

// Prix IRENA 2024 (USD) × taux change
const IRENA = {
  panneau_mono_wc: 0.25,
  batterie_agm_ah: 0.95,
  onduleur_w: 0.18,
  pwm_ampere: 0.8,
};
