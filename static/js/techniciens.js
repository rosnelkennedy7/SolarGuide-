function chargerTechniciens() {
  fetch("/techniciens")
    .then(r => r.json())
    .then(data => {
      const list = document.getElementById("techniciens-list");
      if (!list) return;
      if (!data.succes || !data.techniciens || data.techniciens.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,.5);">Aucun technicien trouvé</div>';
        return;
      }
      list.innerHTML = data.techniciens.map(t => {
        const initiales = ((t.prenom || "?")[0] + (t.nom || "?")[0]).toUpperCase();
        const waMsg = encodeURIComponent(
          "Bonjour Mr Kennedy, moi c'est [prénom nom], j'ai dimensionné mon système et j'ai besoin de votre expertise pour mon installation."
        );
        return `
        <div style="background:rgba(255,255,255,0.08);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:20px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">
            <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#F5A623,#D47C0A);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;flex-shrink:0;">
              ${initiales}
            </div>
            <div>
              <div style="font-size:16px;font-weight:700;color:#fff;">${t.prenom || ""} ${t.nom || ""}</div>
              <div style="font-size:13px;color:#F5A623;margin-top:2px;">${t.poste || ""}</div>
              ${t.badge ? `<span style="background:#F5A623;color:#000;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;display:inline-block;margin-top:4px;">${t.badge}</span>` : ""}
            </div>
          </div>
          <div style="font-size:13px;color:#E2E8F0;margin-bottom:12px;line-height:1.6;">
            📍 ${t.ville || "Bénin"}<br>
            🔧 ${t.specialite || ""}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <a href="https://wa.me/${(t.whatsapp||"").replace(/\D/g,"")}?text=${waMsg}"
               target="_blank"
               style="background:#25D366;color:#fff;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
              💬 WhatsApp
            </a>
            <a href="mailto:${t.email || ""}"
               style="background:rgba(255,255,255,0.12);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
              ✉️ Email
            </a>
          </div>
        </div>`;
      }).join("");
    })
    .catch(() => {
      const list = document.getElementById("techniciens-list");
      if (list) list.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,.5);">Erreur de chargement</div>';
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
fetch("/get_appareils")
  .then(r => r.json())
  .then(data => { if (data.succes) appareils_defaut = data.appareils; })
  .catch(() => {});

// ============================================================
// PARCOURS BUDGET — LOGIQUE
// ============================================================
const BUDGET_BASE = {
  panneau_wc: 200,
  batterie_ah: 100,
  tension: 12,
  onduleur_w: 500,
  regulateur_a: 20,
};

const IRENA = {
  panneau_mono_wc: 0.25,
  batterie_agm_ah: 0.95,
  onduleur_w: 0.18,
  pwm_ampere: 0.8,
};
