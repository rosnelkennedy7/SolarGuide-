function estDansBenin(lat, lon) {
  return (
    lat >= BENIN_BOUNDS.minLat &&
    lat <= BENIN_BOUNDS.maxLat &&
    lon >= BENIN_BOUNDS.minLon &&
    lon <= BENIN_BOUNDS.maxLon
  );
}

let searchTimeout = null;
function onVilleInput() {
  clearTimeout(searchTimeout);
  const val = document.getElementById("input-ville-search").value.trim();
  if (val.length < 2) {
    document.getElementById("search-suggestions").style.display = "none";
    return;
  }
  searchTimeout = setTimeout(() => obtenirSuggestions(val), 350);
}

function obtenirSuggestions(query) {
  // Nominatim avec restriction Bénin
  fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ", Bénin")}&format=json&limit=5&countrycodes=bj&accept-language=fr`,
  )
    .then((r) => r.json())
    .then((data) => {
      const box = document.getElementById("search-suggestions");
      if (!data || data.length === 0) {
        box.style.display = "none";
        return;
      }
      box.innerHTML = data
        .map((item) => {
          const nom = item.display_name
            .replace(", Bénin", "")
            .replace(", Benin", "");
          return `<div class="search-suggestion-item" onclick="selectionnerSuggestion(${item.lat}, ${item.lon}, '${nom.replace(/'/g, "\\'")}')">
                📍 ${nom}
              </div>`;
        })
        .join("");
      box.style.display = "block";
    })
    .catch(() => {
      document.getElementById("search-suggestions").style.display = "none";
    });
}

function rechercherVille() {
  const val = document.getElementById("input-ville-search").value.trim();
  if (!val) return;
  showLoader("Recherche en cours...");
  fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val + ", Bénin")}&format=json&limit=1&countrycodes=bj&accept-language=fr`,
  )
    .then((r) => r.json())
    .then((data) => {
      hideLoader();
      if (!data || data.length === 0) {
        alert(
          "⚠️ Ville non trouvée au Bénin. Essayez un nom différent ou cliquez directement sur la carte.",
        );
        return;
      }
      const lat = parseFloat(parseFloat(data[0].lat).toFixed(4));
      const lon = parseFloat(parseFloat(data[0].lon).toFixed(4));
      selectionnerSuggestion(lat, lon, data[0].display_name);
    })
    .catch(() => {
      hideLoader();
      alert("Erreur de connexion. Cliquez directement sur la carte.");
    });
}

function selectionnerSuggestion(lat, lon, nom) {
  lat = parseFloat(parseFloat(lat).toFixed(4));
  lon = parseFloat(parseFloat(lon).toFixed(4));
  document.getElementById("search-suggestions").style.display = "none";
  document.getElementById("input-ville-search").value = nom.split(",")[0];

  if (!estDansBenin(lat, lon)) {
    alert(
      "⚠️ Cette localisation est hors du Bénin. SolarGuide est une application béninoise — veuillez sélectionner un lieu au Bénin.",
    );
    return;
  }
  // Centrer la carte et placer le marqueur
  if (map) {
    map.setView([lat, lon], 13);
  }
  placerMarqueur(lat, lon, nom);
}

function placerMarqueur(lat, lon, nomLieu) {
  selectedLat = lat;
  selectedLon = lon;
  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon], {
    icon: L.divIcon({
      html: '<div style="width:16px;height:16px;background:#166534;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
      iconAnchor: [8, 8],
    }),
  }).addTo(map);

  document.getElementById("coord-lat").textContent = lat + "°N";
  document.getElementById("coord-lon").textContent = lon + "°E";
  document.getElementById("coord-irr").textContent = "Calcul...";
  document.getElementById("coord-lieu").textContent =
    nomLieu || "Identification...";
  document.getElementById("confirm-box").classList.add("show");

  // Si le nom n'est pas encore fourni, faire géocodage inversé
  if (!nomLieu) {
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`,
    )
      .then((r) => r.json())
      .then((data) => {
        const addr = data.address || {};
        const lieu =
          addr.village ||
          addr.town ||
          addr.city ||
          addr.suburb ||
          addr.neighbourhood ||
          addr.municipality ||
          addr.county ||
          "Lieu inconnu";
        const commune = addr.city || addr.town || addr.municipality || "";
        const dept = addr.state || "";
        let nom = lieu;
        if (commune && commune !== lieu) nom += ", " + commune;
        if (dept) nom += ", " + dept;
        document.getElementById("coord-lieu").textContent = nom;
        state.nomLieu = nom;
      })
      .catch(() => {
        document.getElementById("coord-lieu").textContent =
          "Nom non disponible";
      });
  } else {
    state.nomLieu = nomLieu;
  }

  // Appel NASA POWER
  showLoader("Récupération données solaires NASA...");
  fetch("/get_irradiation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon }),
  })
    .then((r) => r.json())
    .then((data) => {
      hideLoader();
      if (data.succes) {
        const moisDef = data.mois_defavorable || "";
        document.getElementById("coord-irr").textContent =
          data.irradiation + " kWh/m²/j" + (moisDef ? " (" + moisDef + ")" : "");
        let qualite, etoiles, couleur;
        const irr = data.irradiation;
        if (irr >= 5.5) {
          qualite = "Site exceptionnel";
          etoiles = "⭐⭐⭐⭐";
          couleur = "#166534";
        } else if (irr >= 5.0) {
          qualite = "Site excellent";
          etoiles = "⭐⭐⭐";
          couleur = "#16a34a";
        } else if (irr >= 4.5) {
          qualite = "Site très bon";
          etoiles = "⭐⭐";
          couleur = "#ca8a04";
        } else {
          qualite = "Site correct";
          etoiles = "⭐";
          couleur = "#ea580c";
        }
        const qBox = document.getElementById("qualite-site-box");
        if (qBox) {
          qBox.style.display = "flex";
          qBox.innerHTML = `<div style="font-size:20px;">${etoiles}</div><div><div style="font-size:13px;font-weight:700;color:${couleur};">${qualite}</div><div style="font-size:11px;color:var(--gray-500);">Irradiation défavorable ${irr} kWh/m²/j${moisDef ? " · " + moisDef : ""}</div></div>`;
        }
        state.localisation = {
          latitude: lat,
          longitude: lon,
          irradiation: data.irradiation,
          mois_defavorable: moisDef,
          nom: state.nomLieu || "",
        };
      } else {
        document.getElementById("coord-irr").textContent = "Erreur NASA";
      }
    })
    .catch(() => {
      hideLoader();
      document.getElementById("coord-irr").textContent = "Pas de connexion";
    });
}

// ============================================================
// PAGE LOCALISATION — CARTE
// ============================================================
function initMap() {
  map = L.map("map", {
    center: [9.3077, 2.3158],
    zoom: 7,
    minZoom: 6,
    maxZoom: 18,
    maxBounds: [
      [5.5, 0.5],
      [13.0, 4.2],
    ],
    maxBoundsViscosity: 1.0,
  });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
    maxZoom: 18,
  }).addTo(map);

  // Villes repères
  const villes = [
    { nom: "Cotonou", lat: 6.3676, lon: 2.4252 },
    { nom: "Porto-Novo", lat: 6.4969, lon: 2.6289 },
    { nom: "Parakou", lat: 9.337, lon: 2.6283 },
    { nom: "Natitingou", lat: 10.307, lon: 1.38 },
    { nom: "Kandi", lat: 11.134, lon: 2.9388 },
    { nom: "Abomey", lat: 7.1827, lon: 1.9913 },
    { nom: "Djougou", lat: 9.7085, lon: 1.666 },
    { nom: "Lokossa", lat: 6.6361, lon: 1.7169 },
  ];
  villes.forEach((v) => {
    L.circleMarker([v.lat, v.lon], {
      radius: 5,
      color: "#166534",
      fillColor: "#166534",
      fillOpacity: 0.8,
      weight: 2,
    })
      .addTo(map)
      .bindTooltip(v.nom, { permanent: false });
  });

  // Double-clic — STRICTEMENT BÉNIN
  map.on("dblclick", function (e) {
    const lat = parseFloat(e.latlng.lat.toFixed(4));
    const lon = parseFloat(e.latlng.lng.toFixed(4));
    if (!estDansBenin(lat, lon)) {
      alert(
        "⚠️ Cette position est hors du Bénin 🇧🇯\nSolarGuide est une application béninoise. Veuillez sélectionner un point à l'intérieur du Bénin.",
      );
      return;
    }
    placerMarqueur(lat, lon, null);
  });
}

function confirmerPosition() {
  if (!state.localisation) {
    alert("Attendez la récupération des données NASA.");
    return;
  }
  document.getElementById("btn-loc-next").disabled = false;
  document.getElementById("confirm-box").classList.remove("show");
  alert(
    "✅ Position confirmée ! Irradiation : " +
      state.localisation.irradiation +
      " kWh/m²/j",
  );
}
function recommencerPosition() {
  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }
  state.localisation = null;
  selectedLat = null;
  selectedLon = null;
  document.getElementById("confirm-box").classList.remove("show");
  document.getElementById("btn-loc-next").disabled = true;
  document.getElementById("input-ville-search").value = "";
  const qBox = document.getElementById("qualite-site-box");
  if (qBox) qBox.style.display = "none";
}

// ============================================================
// PAGE CONSOMMATION
// ============================================================
const TRANCHES = {
  residentiel: {
    pointe_matin: {
      debut: [3, 4, 5, 6, 7],
      fin: [7, 8, 9, 10],
      defDebut: 5,
      defFin: 8,
      labelPointe: "☀️ Pointe matin",
      labelCreuse: "🌿 Creuse journée",
      labelSoir: "🌇 Pointe soir",
      labelNuit: "🌙 Creuse nuit",
    },
    creuse: {
      debut: [7, 8, 9, 10],
      fin: [14, 15, 16, 17, 18, 19],
      defDebut: 8,
      defFin: 17,
    },
    pointe_soir: {
      debut: [15, 16, 17, 18, 19],
      fin: [19, 20, 21, 22, 23],
      defDebut: 17,
      defFin: 21,
    },
    nuit: {
      debut: [20, 21, 22, 23],
      fin: [3, 4, 5, 6, 7],
      defDebut: 21,
      defFin: 5,
    },
  },
  commercial: {
    pointe_matin: {
      debut: [3, 4, 5, 6, 7],
      fin: [7, 8, 9, 10],
      defDebut: 5,
      defFin: 8,
      labelPointe: "🌙 Creuse matin",
      labelCreuse: "☀️ Pointe journée",
      labelSoir: "🌿 Creuse soir",
      labelNuit: "🌙 Creuse nuit",
    },
    creuse: {
      debut: [7, 8, 9, 10],
      fin: [14, 15, 16, 17, 18, 19],
      defDebut: 8,
      defFin: 17,
    },
    pointe_soir: {
      debut: [15, 16, 17, 18, 19],
      fin: [19, 20, 21, 22, 23],
      defDebut: 17,
      defFin: 21,
    },
    nuit: {
      debut: [20, 21, 22, 23],
      fin: [3, 4, 5, 6, 7],
      defDebut: 21,
      defFin: 5,
    },
  },
};
