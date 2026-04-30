# HélioBénin — Plateforme de dimensionnement solaire

Application full-stack de dimensionnement et devis solaire adaptée aux conditions du Bénin.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | FastAPI (Python 3.11+) |
| Frontend | React 18 + Vite |
| Base de données | Supabase (PostgreSQL) |
| Authentification | Supabase Auth |
| Paiement | KKiaPay |

## Démarrage rapide

### Backend

```bash
cd backend

# Créer un environnement virtuel
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Configurer l'environnement
cp .env.example .env
# → Remplir SUPABASE_URL et SUPABASE_KEY dans .env

# Lancer le serveur
uvicorn app.main:app --reload --port 8000
```

API disponible sur http://localhost:8000  
Documentation interactive : http://localhost:8000/docs

### Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

Frontend disponible sur http://localhost:5173

## Architecture

```
heliobenin/
├── backend/
│   ├── app/
│   │   ├── main.py          # Point d'entrée FastAPI + CORS
│   │   ├── config.py        # Paramètres (Supabase, solaire, KKiaPay)
│   │   ├── models/
│   │   │   └── schemas.py   # Modèles Pydantic (requêtes/réponses)
│   │   ├── routes/
│   │   │   ├── auth.py      # /api/auth/login, /api/auth/register
│   │   │   ├── dimensionnement.py  # /api/dimensionnement/
│   │   │   └── devis.py     # /api/devis/
│   │   ├── engine/
│   │   │   └── solaire.py   # Moteur de calcul solaire + tarification
│   │   └── services/
│   │       └── supabase_client.py  # Client Supabase singleton
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── pages/
        │   ├── Accueil.jsx
        │   ├── Dimensionnement.jsx  # Formulaire + appel API calcul
        │   ├── Devis.jsx            # Formulaire client
        │   └── Login.jsx            # Connexion/Inscription
        ├── components/
        │   └── Navbar.jsx
        └── App.jsx                  # Routeur React
```

## Paramètres solaires utilisés

| Paramètre | Valeur | Source |
|-----------|--------|--------|
| Irradiation moyenne Bénin | 5.5 kWh/m²/j | PROMES/CNRS |
| Rendement panneaux (incl. pertes) | 80% | Standard |
| Rendement onduleur | 95% | Standard |
| DOD batteries plomb-acide | 50% | Fabricants |

## Variables d'environnement requises

```env
SUPABASE_URL=...
SUPABASE_KEY=...
```

## Endpoints API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/dimensionnement/` | Calcul du système solaire |
| POST | `/api/devis/` | Création d'un devis |
| GET | `/api/devis/{id}` | Récupération d'un devis |
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/register` | Inscription |
