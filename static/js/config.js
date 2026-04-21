// ============================================================
// ÉTAT GLOBAL
// ============================================================
const state = {
  typeSysteme: null,
  localisation: null,
  coupures: { heures: [], jours: [], baisseTension: false },
  appareils: [],
  typeBatterie: "AGM",
  joursAutonomie: 1,
  typeOnduleur: "classique",
  modeInversion: "auto",
  typeInstallation: null,
  dimensionnement: null,
  prix: null,
  economie: null,
  entretien: null,
};
let map = null,
  marker = null,
  selectedLat = null,
  selectedLon = null;
let ecoChart = null,
  appareils_defaut = [];
let appareilCount = 0,
  budgetAppareilCount = 0;

function formatFCFA(n) {
  return (
    Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " FCFA"
  );
}
function formatNombre(n) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ============================================================
// DONNÉES MODALES — Page Accueil
// ============================================================
const MODALS = {
  budget: {
    titre: "💰 Parcours — J'ai un budget",
    desc: "Vous connaissez le montant que vous pouvez investir. SolarGuide calcule automatiquement le meilleur système possible avec votre budget, puis vous liste les appareils que vous pouvez alimenter.",
    liste: [
      {
        type: "ok",
        texte: "Idéal si vous avez une enveloppe budgétaire définie",
      },
      {
        type: "ok",
        texte: "Le système s'adapte automatiquement à votre budget",
      },
      {
        type: "ok",
        texte: "Vous voyez exactement ce que vous pouvez avoir",
      },
      {
        type: "warn",
        texte: "Un budget minimum est requis pour respecter les normes",
      },
    ],
  },
  dimensionnement: {
    titre: "📐 Parcours — Je veux un dimensionnement",
    desc: "Vous partez de vos besoins réels. Vous listez vos appareils, leurs heures d'utilisation, et SolarGuide calcule le système exact nécessaire avec un devis estimatif.",
    liste: [
      {
        type: "ok",
        texte: "Dimensionnement précis basé sur vos vrais besoins",
      },
      { type: "ok", texte: "Devis détaillé composant par composant" },
      {
        type: "ok",
        texte: "Analyse économique sur 10 ans vs groupe électrogène",
      },
      {
        type: "warn",
        texte: "Nécessite de connaître vos appareils et heures d'utilisation",
      },
    ],
  },
  hybrid: {
    titre: "🔵 Système hybride — Couplé au réseau SBEE",
    desc: "Le système hybride fonctionne en tandem avec le réseau électrique de la SBEE. Pendant les coupures, votre installation solaire prend automatiquement le relais. Lorsque le courant revient, le système rebascule.",
    liste: [
      {
        type: "ok",
        texte: "Investissement initial moins élevé qu'un système autonome",
      },
      {
        type: "ok",
        texte: "Idéal si vous avez des délestages fréquents (2-8h/jour)",
      },
      {
        type: "ok",
        texte: "Basculement automatique avec un ATS ou onduleur hybride",
      },
      {
        type: "ok",
        texte: "Peut couvrir vos heures de pointe (soir, matin)",
      },
      {
        type: "warn",
        texte: "Vous dépendez encore partiellement de la SBEE",
      },
      {
        type: "warn",
        texte: "Si la SBEE coupe 24h/24, vos batteries se vident",
      },
    ],
  },
  auto: {
    titre: "🟢 Système autonome — 100% indépendant",
    desc: "Le système autonome ne dépend d'aucun réseau extérieur. Vos panneaux solaires chargent vos batteries le jour, et celles-ci alimentent votre maison la nuit. Vous êtes totalement libre.",
    liste: [
      {
        type: "ok",
        texte: "Indépendance totale de la SBEE — zéro facture",
      },
      {
        type: "ok",
        texte: "Idéal pour les zones sans réseau ou avec coupures permanentes",
      },
      {
        type: "ok",
        texte: "Idéal pour les zones rurales et périphériques",
      },
      { type: "ok", texte: "Fonctionne 24h/24 grâce aux batteries" },
      {
        type: "warn",
        texte:
          "Investissement initial plus élevé (plus de panneaux et batteries)",
      },
      {
        type: "warn",
        texte: "Nécessite un bon dimensionnement pour couvrir tous vos besoins",
      },
    ],
  },
};

// ============================================================
// DONNÉES BULLES D'AIDE — Toutes pages
// ============================================================
const HELPS = {
  irradiation: {
    titre: "☀️ Irradiation solaire (kWh/m²/jour)",
    contenu:
      "C'est la quantité d'énergie solaire reçue chaque jour par mètre carré à votre emplacement. Plus ce chiffre est élevé, plus vos panneaux produiront d'électricité. Au Bénin, ce chiffre varie généralement entre 4,0 et 5,8 kWh/m²/jour selon la région et la saison.",
  },
  coupures: {
    titre: "⚡ Tranches horaires de coupure SBEE",
    contenu:
      "Ces tranches représentent les périodes de la journée où votre consommation électrique est forte ou faible. En cochant 'SBEE coupe', vous indiquez que la SBEE est souvent absente pendant cette période. Cela permet au système de calculer combien d'énergie votre installation solaire doit couvrir.",
  },
  heures_jour: {
    titre: "☀️ Heures d'utilisation pendant la journée",
    contenu:
      "Indiquez combien d'heures par jour vous utilisez cet appareil pendant la période ensoleillée (généralement 6h à 18h). Par exemple, un ventilateur allumé toute la journée = 12 heures. Un fer à repasser utilisé le matin = 1 heure.",
  },
  heures_nuit: {
    titre: "🌙 Heures d'utilisation pendant la nuit",
    contenu:
      "Indiquez combien d'heures par nuit vous utilisez cet appareil (généralement 18h à 6h). Par exemple, un réfrigérateur qui tourne toute la nuit = 12 heures. Une lampe du salon allumée le soir = 4 heures.",
  },
  batterie: {
    titre: "🔋 Types de batterie solaire",
    contenu:
      "La batterie stocke l'énergie produite par vos panneaux pour l'utiliser la nuit ou par temps nuageux.\n\n🔋 AGM : La plus utilisée au Bénin. Sans entretien, résistante à la chaleur, dure 6 à 8 ans.\n\n⚡ Lithium-Ion : La plus moderne. Légère, longue durée (10-15 ans), mais plus chère.\n\n🪫 Plomb-acide : La moins chère. Nécessite un ajout régulier d'eau distillée, dure 4 à 5 ans.",
  },
  dod: {
    titre: "📊 DoD — Profondeur de décharge",
    contenu:
      "Le DoD (Depth of Discharge) indique jusqu'à quel niveau vous pouvez vider votre batterie sans l'abîmer.\n\nDoD 50% = vous pouvez utiliser seulement la moitié de la capacité. Une batterie de 200Ah n'en donnera que 100Ah utilisables.\n\nDoD 80% (Lithium) = vous pouvez utiliser 80% de la capacité. Plus économique sur le long terme.",
  },
  onduleur: {
    titre: "🔌 Types d'onduleur",
    contenu:
      "L'onduleur transforme le courant continu (DC) de vos batteries en courant alternatif (AC) utilisable par vos appareils.\n\n🔌 Classique : Le moins cher. Nécessite un régulateur séparé. Bon pour les petites installations.\n\n🌐 Hybride : Gère seul le réseau SBEE et votre installation solaire. Pas besoin d'ATS. Recommandé pour le système hybride.\n\n🏆 All-in-One : Tout intégré dans un seul boîtier. Le plus pratique et le plus recommandé.",
  },
  ats: {
    titre: "🔄 ATS — Commutateur Automatique de Sources",
    contenu:
      "L'ATS (Automatic Transfer Switch) est un interrupteur automatique qui bascule instantanément entre le courant SBEE et votre onduleur solaire en cas de coupure. Vous ne remarquez presque rien — vos appareils continuent de fonctionner sans interruption visible.",
  },
  autonomie: {
    titre: "⏱️ Jours d'autonomie",
    contenu:
      "C'est le nombre de jours pendant lesquels votre système peut fonctionner sans aucun ensoleillement (temps très nuageux ou pluie continue).\n\n1 jour : Adapté aux zones avec soleil presque quotidien\n2 jours : Recommandé pour la plupart des zones du Bénin\n3 jours : Idéal pour les zones souvent nuageuses ou très importantes",
  },
  distance_dc: {
    titre: "🔵 Distance DC — Côté panneaux",
    contenu:
      "C'est la distance en mètres entre vos panneaux solaires et votre régulateur (ou onduleur All-in-One). Plus cette distance est grande, plus vous avez besoin d'un câble épais pour éviter les pertes d'énergie. Idéalement, gardez cette distance en dessous de 10 mètres.",
  },
  distance_ac: {
    titre: "🟠 Distance AC — Côté tableau électrique",
    contenu:
      "C'est la distance en mètres entre votre onduleur et votre tableau électrique principal. Cette distance doit être aussi courte que possible pour réduire les pertes. En général, 3 à 5 mètres suffisent si vous placez l'onduleur près du tableau.",
  },
  mppt: {
    titre: "⚡ Régulateur MPPT vs PWM",
    contenu:
      "Le régulateur contrôle la charge de vos batteries depuis les panneaux.\n\nMPPT (Maximum Power Point Tracking) : Optimise en permanence la puissance extraite des panneaux. Efficacité de 93-97%. Recommandé pour toutes les installations.\n\nPWM (Pulse Width Modulation) : Plus simple et moins cher. Efficacité de 70-80%. Pour les très petites installations.",
  },
  tension: {
    titre: "🔋 Tension système (12V / 24V / 48V)",
    contenu:
      "La tension système est calculée automatiquement selon la puissance de votre installation.\n\n12V : Petites installations (< 800Wc)\n24V : Installations moyennes (800 - 3000Wc)\n48V : Grandes installations (> 3000Wc)\n\nUne tension plus élevée permet d'utiliser des câbles plus fins et réduit les pertes.",
  },
  chute_tension: {
    titre: "⚠️ Chute de tension",
    contenu:
      "La chute de tension est la perte d'énergie dans les câbles électriques. Elle est provoquée par la résistance du câble.\n\nNormes autorisées : max 3% côté DC (panneaux), max 5% côté AC (tableau).\n\nSi la chute est trop élevée, vous perdez de l'énergie et vos appareils peuvent mal fonctionner. La solution : augmenter la section du câble ou réduire la distance.",
  },
  rentabilite: {
    titre: "📊 Point de rentabilité",
    contenu:
      "C'est l'année à partir de laquelle votre installation solaire vous a 'remboursé' son coût d'achat grâce aux économies réalisées sur le carburant et l'entretien de votre groupe électrogène.\n\nExemple : Si la rentabilité est atteinte en 4 ans, cela signifie qu'à partir de la 4ème année, chaque FCFA économisé est un gain pur pour vous.",
  },
};

// ============================================================
// MODAL FONCTIONS — Page Accueil
// ============================================================
