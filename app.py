import os
import sys
import json
import random
import string
from datetime import datetime, timedelta

from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_login import login_required, current_user

# Extensions partagées — évite l'import circulaire
from extensions import db, bcrypt, login_manager

# ─── APPLICATION ────────────────────────────────────────────────────
app = Flask(__name__)
app.config['SECRET_KEY']                  = os.environ.get('SECRET_KEY', 'solarguide_benin_rk_tech_2026_secret')
app.config['SQLALCHEMY_DATABASE_URI']     = 'sqlite:///solarguide.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PERMANENT_SESSION_LIFETIME']  = timedelta(hours=24)

# Init extensions avec l'app
db.init_app(app)
bcrypt.init_app(app)
login_manager.init_app(app)

# ─── MODÈLES (après init extensions) ────────────────────────────────
from auth.models import User, Dimensionnement, Paiement, JournalActivite

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ─── BLUEPRINT AUTH ──────────────────────────────────────────────────
from auth.routes import auth_bp
app.register_blueprint(auth_bp)

# ─── MODULES CALCUL ─────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from calcul.dimensionnement import dimensionner, dimensionner_par_budget, calculer_entretien_solaire
from calcul.conversion import calculer_prix_composants
from calcul.economie import comparer_economie
import pandas as pd


# ─── QCM TECHNICIEN (10 questions exactes — référentiel IRENA/IEC) ──────────
QCM_QUESTIONS = [
    {
        "id": 1,
        "question": "Un panneau solaire produit quel type de courant ?",
        "options": [
            "Courant alternatif (AC)",
            "Courant continu (DC)",
            "Les deux à la fois",
            "Ça dépend de la marque",
        ],
        "reponse": 1,
    },
    {
        "id": 2,
        "question": "Qu'est-ce qu'un onduleur fait dans une installation solaire ?",
        "options": [
            "Il stocke l'énergie solaire",
            "Il convertit le courant DC en courant alternatif AC",
            "Il protège les panneaux contre la pluie",
            "Il mesure l'irradiation solaire",
        ],
        "reponse": 1,
    },
    {
        "id": 3,
        "question": "Quelle couleur de câble utilise-t-on pour le positif en courant continu DC ?",
        "options": ["Noir", "Bleu", "Rouge", "Vert"],
        "reponse": 2,
    },
    {
        "id": 4,
        "question": "Pourquoi oriente-t-on les panneaux solaires vers le sud au Bénin ?",
        "options": [
            "Pour éviter la pluie",
            "Pour capter un maximum de rayonnement solaire toute la journée",
            "Pour faciliter le nettoyage",
            "C'est juste une habitude",
        ],
        "reponse": 1,
    },
    {
        "id": 5,
        "question": "À quoi sert un régulateur de charge dans une installation solaire ?",
        "options": [
            "À convertir le courant DC en AC",
            "À protéger les batteries contre la surcharge et la décharge excessive",
            "À mesurer la puissance des panneaux",
            "À stabiliser la tension du réseau SBEE",
        ],
        "reponse": 1,
    },
    {
        "id": 6,
        "question": "Que se passe-t-il si on surcharge une batterie solaire régulièrement ?",
        "options": [
            "Elle produit plus d'énergie",
            "Sa durée de vie diminue fortement",
            "Elle devient plus performante",
            "Rien de grave",
        ],
        "reponse": 1,
    },
    {
        "id": 7,
        "question": "Pourquoi installe-t-on un parafoudre dans une installation solaire au Bénin ?",
        "options": [
            "Pour économiser de l'énergie",
            "Pour protéger contre la foudre et les surtensions",
            "Pour réguler la charge des batteries",
            "Pour améliorer le rendement des panneaux",
        ],
        "reponse": 1,
    },
    {
        "id": 8,
        "question": "Avant de travailler sur une installation solaire, que doit-on faire en premier ?",
        "options": [
            "Couper le disjoncteur AC seulement",
            "Déconnecter les panneaux et couper toutes les sources",
            "Mettre des gants et continuer",
            "Appeler le client",
        ],
        "reponse": 1,
    },
    {
        "id": 9,
        "question": "Quel équipement permet le basculement automatique entre le réseau SBEE et le solaire ?",
        "options": [
            "Un disjoncteur différentiel",
            "Un parafoudre",
            "Un ATS (Commutateur Automatique de Sources)",
            "Un compteur d'énergie",
        ],
        "reponse": 2,
    },
    {
        "id": 10,
        "question": "Combien de temps peut durer une batterie AGM bien entretenue ?",
        "options": [
            "1 à 2 ans",
            "3 à 4 ans",
            "6 à 8 ans",
            "15 à 20 ans",
        ],
        "reponse": 2,
    },
]


# ─── HELPERS ────────────────────────────────────────────────────────
def _log(action, details=None, user_id=None):
    uid = user_id or (current_user.id if current_user.is_authenticated else None)
    entry = JournalActivite(user_id=uid, action=action, ip=request.remote_addr, details=details)
    db.session.add(entry)
    db.session.commit()


def _gen_ref(n=12):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=n))



# ─── ROUTES PRINCIPALES ─────────────────────────────────────────────
@app.route('/')
def index():
    if current_user.is_authenticated:
        if current_user.role == 'admin':
            return redirect(url_for('admin_dashboard'))
        elif current_user.role == 'technicien':
            return redirect(url_for('technicien_dashboard'))
        else:
            return redirect(url_for('user_dashboard'))
    return render_template('index.html')


# ─── ADMIN ─────────────────────────────────────────────────────────
@app.route('/admin/rktech2026')
def admin_secret():
    """URL secrète — seule entrée possible vers le tableau de bord admin."""
    session['admin_access'] = True
    if current_user.is_authenticated and current_user.role == 'admin':
        return redirect(url_for('admin_dashboard'))
    return redirect(url_for('auth.login', next='/admin/dashboard'))


@app.route('/admin/dashboard')
@login_required
def admin_dashboard():
    if current_user.role != 'admin' or not session.get('admin_access'):
        return redirect(url_for('index'))

    from sqlalchemy import func
    today = datetime.utcnow().date()

    stats = {
        'nb_users':          User.query.filter_by(role='user').count(),
        'nb_techniciens':    User.query.filter_by(role='technicien').count(),
        'nb_dimensionnements': Dimensionnement.query.count(),
        'revenus_jour':      db.session.query(func.sum(Paiement.montant)).filter(
            func.date(Paiement.date_paiement) == today,
            Paiement.statut == 'confirme'
        ).scalar() or 0,
        'revenus_mois':      db.session.query(func.sum(Paiement.montant)).filter(
            func.extract('month', Paiement.date_paiement) == today.month,
            func.extract('year', Paiement.date_paiement) == today.year,
            Paiement.statut == 'confirme'
        ).scalar() or 0,
        'paiements_attente': Paiement.query.filter_by(statut='en_attente').count(),
        'users_bannis':      User.query.filter_by(banni=True).count(),
    }

    users     = User.query.order_by(User.date_inscription.desc()).all()
    paiements = Paiement.query.order_by(Paiement.date_paiement.desc()).limit(100).all()
    journal   = JournalActivite.query.order_by(JournalActivite.date.desc()).limit(200).all()

    # Alertes IP partagées
    from sqlalchemy import text
    ip_alerts = db.session.execute(
        text("SELECT ip_derniere_connexion, COUNT(*) as cnt FROM users "
             "WHERE ip_derniere_connexion IS NOT NULL "
             "GROUP BY ip_derniere_connexion HAVING cnt > 1")
    ).fetchall()

    return render_template('admin/dashboard.html',
                           stats=stats, users=users,
                           paiements=paiements, journal=journal,
                           ip_alerts=ip_alerts)


@app.route('/admin/utilisateurs')
@login_required
def admin_utilisateurs():
    if current_user.role != 'admin':
        return jsonify({"succes": False, "erreur": "Accès refusé."})
    users = User.query.all()
    return jsonify({"succes": True, "users": [
        {
            "id": u.id, "nom": u.nom, "prenom": u.prenom,
            "email": u.email, "whatsapp": u.whatsapp,
            "role": u.role, "actif": u.actif, "banni": u.banni,
            "a_paye": u.a_paye, "montant_paye": u.montant_paye,
            "abonnement": u.abonnement,
            "date_fin_abo": u.date_fin_abo.isoformat() if u.date_fin_abo else None,
            "date_inscription": u.date_inscription.isoformat() if u.date_inscription else None,
            "derniere_connexion": u.derniere_connexion.isoformat() if u.derniere_connexion else None,
            "ip": u.ip_derniere_connexion,
            "nb_projets": len(u.dimensionnements),
        } for u in users
    ]})


@app.route('/admin/utilisateur/<int:user_id>/dimensionnements')
@login_required
def admin_user_dimensionnements(user_id):
    if current_user.role != 'admin':
        return jsonify({"succes": False, "erreur": "Accès refusé."})
    projets = Dimensionnement.query.filter_by(user_id=user_id).all()
    return jsonify({"succes": True, "projets": [
        {
            "id": p.id, "nom": p.nom_projet, "lieu": p.nom_lieu,
            "systeme": p.type_systeme, "date": p.date_creation.isoformat(),
            "resultats": json.loads(p.resultats) if p.resultats else {},
            "prix": json.loads(p.prix) if p.prix else {},
        } for p in projets
    ]})


@app.route('/admin/paiement/<int:paiement_id>/statut', methods=['POST'])
@login_required
def admin_statut_paiement(paiement_id):
    if current_user.role != 'admin':
        return jsonify({"succes": False, "erreur": "Accès refusé."})
    data = request.get_json()
    p    = Paiement.query.get_or_404(paiement_id)
    p.statut = data.get('statut', p.statut)
    if p.statut == 'confirme':
        _activer_acces(p)
    db.session.commit()
    _log(f"Statut paiement #{paiement_id} → {p.statut}", user_id=current_user.id)
    return jsonify({"succes": True})


@app.route('/admin/technicien/<int:user_id>/valider', methods=['POST'])
@login_required
def admin_valider_technicien(user_id):
    if current_user.role != 'admin':
        return jsonify({"succes": False, "erreur": "Accès refusé."})
    user = User.query.get_or_404(user_id)
    user.actif = True
    db.session.commit()
    _log(f"Technicien validé : {user.prenom} {user.nom}", user_id=current_user.id)
    return jsonify({"succes": True})


# ─── TABLEAUX DE BORD ───────────────────────────────────────────────
@app.route('/user/dashboard')
@login_required
def user_dashboard():
    if current_user.role == 'technicien':
        return redirect(url_for('technicien_dashboard'))
    projets = Dimensionnement.query.filter_by(user_id=current_user.id)\
                .order_by(Dimensionnement.date_creation.desc()).all()
    return render_template('user/dashboard.html', projets=projets, user=current_user)


@app.route('/technicien/dashboard')
@login_required
def technicien_dashboard():
    # Admin peut visiter l'interface technicien sans restriction
    if current_user.role not in ('technicien', 'admin'):
        return redirect(url_for('index'))
    projets = Dimensionnement.query.filter_by(user_id=current_user.id)\
                .order_by(Dimensionnement.date_creation.desc()).all()
    return render_template('technicien/dashboard.html', projets=projets, user=current_user)


# ─── PAGE PAIEMENT ──────────────────────────────────────────────────
@app.route('/paiement')
@login_required
def page_paiement():
    if current_user.peut_dimensionner:
        if current_user.role == 'technicien':
            return redirect(url_for('technicien_dashboard'))
        return redirect(url_for('user_dashboard'))
    return render_template('paiement.html', user=current_user)


# ─── API IRRADIATION ────────────────────────────────────────────────
@app.route('/get_irradiation', methods=['POST'])
def get_irradiation():
    try:
        data = request.get_json()
        lat, lon = data.get('lat'), data.get('lon')
        import requests as req
        r = req.get(
            "https://power.larc.nasa.gov/api/temporal/climatology/point",
            params={"parameters": "ALLSKY_SFC_SW_DWN", "community": "RE",
                    "longitude": lon, "latitude": lat, "format": "JSON"},
            timeout=10
        )
        monthly = r.json()["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"]
        mois_noms = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"]
        mois_keys = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]
        valeurs = {k: monthly[k] for k in mois_keys if k in monthly}
        pire_key = min(valeurs, key=valeurs.get)
        pire_val = round(valeurs[pire_key], 2)
        pire_nom = mois_noms[mois_keys.index(pire_key)]
        return jsonify({"succes": True, "irradiation": pire_val, "mois_defavorable": pire_nom})
    except Exception as e:
        return jsonify({"succes": False, "erreur": str(e)})


# ─── API CALCULER ────────────────────────────────────────────────────
@app.route('/calculer', methods=['POST'])
def calculer():
    try:
        data = request.get_json()

        distance_dc = float(data.get('distance_dc', 5))
        distance_ac = float(data.get('distance_ac', 3))

        # distance_dc = distance panneaux→régulateur (principale)
        # on répartit les tronçons intérieurs proportionnellement
        d_pan_reg  = distance_dc
        d_reg_bat  = max(1.0, round(distance_dc * 0.30, 1))
        d_bat_ond  = max(0.5, round(distance_dc * 0.20, 1))

        dim = dimensionner(
            energie_a_couvrir    = data.get('energie_a_couvrir'),
            irradiation          = data.get('irradiation'),
            type_systeme         = data.get('type_systeme'),
            liste_appareils      = data.get('liste_appareils'),
            type_batterie        = data.get('type_batterie', 'AGM'),
            jours_autonomie      = data.get('jours_autonomie', 1),
            distance_panneaux_reg= d_pan_reg,
            distance_reg_bat     = d_reg_bat,
            distance_bat_ond     = d_bat_ond,
            distance_ac          = distance_ac,
            type_installation    = data.get('type_installation', 'residentiel'),
            heures_coupure       = data.get('heures_coupure', None),
        )

        prix      = calculer_prix_composants(dim)
        entretien = calculer_entretien_solaire(
            data.get('type_batterie', 'AGM'),
            dim["panneau"]["puissance_totale"]
        )

        # Sauvegarde automatique si connecté et accès payé
        if current_user.is_authenticated and current_user.peut_dimensionner:
            proj = Dimensionnement(
                user_id          = current_user.id,
                nom_projet       = data.get('nom_projet', 'Mon projet'),
                latitude         = data.get('lat'),
                longitude        = data.get('lon'),
                nom_lieu         = data.get('nom_lieu', ''),
                irradiation      = data.get('irradiation'),
                type_systeme     = data.get('type_systeme'),
                type_installation= data.get('type_installation', 'residentiel'),
                type_batterie    = data.get('type_batterie', 'AGM'),
                jours_autonomie  = data.get('jours_autonomie', 1),
                resultats        = json.dumps(dim),
                prix             = json.dumps(prix),
            )
            db.session.add(proj)
            db.session.commit()

        return jsonify({"succes": True, "dimensionnement": dim, "prix": prix, "entretien": entretien})
    except Exception as e:
        import traceback
        return jsonify({"succes": False, "erreur": str(e), "trace": traceback.format_exc()})


# ─── API CALCULER BUDGET ─────────────────────────────────────────
@app.route('/calculer_budget', methods=['POST'])
def calculer_budget():
    try:
        data = request.get_json()
        budget_fcfa      = float(data.get('budget_fcfa', 0))
        irradiation      = float(data.get('irradiation', 4.5))
        type_systeme     = data.get('type_systeme', 'auto')
        liste_appareils  = data.get('liste_appareils', [])
        type_batterie    = data.get('type_batterie', 'AGM')
        jours_autonomie  = int(data.get('jours_autonomie', 1))

        dim = dimensionner_par_budget(
            budget_fcfa         = budget_fcfa,
            irradiation         = irradiation,
            type_systeme        = type_systeme,
            liste_appareils     = liste_appareils,
            type_batterie       = type_batterie,
            jours_autonomie     = jours_autonomie,
        )
        return jsonify({"succes": True, "budget": dim})

    except Exception as e:
        import traceback
        return jsonify({"succes": False, "erreur": str(e), "trace": traceback.format_exc()})




# ─── API APPAREILS ───────────────────────────────────────────────────
@app.route('/get_appareils')
def get_appareils():
    try:
        df = pd.read_excel('data/Appareils.xlsx', sheet_name='Appareils')
        df = df.rename(columns={
            'Désignation':   'nom',
            'Puissance (W)': 'puissance_watts',
            'Catégorie':     'categorie',
            'Remarque':      'remarque',
        })
        records = df.where(pd.notna(df), None).to_dict(orient='records')
        return jsonify({"succes": True, "appareils": records})
    except Exception as e:
        return jsonify({"succes": False, "erreur": str(e)})


@app.route('/get_protections')
def get_protections():
    try:
        df = pd.read_excel('data/base de données.xlsx', sheet_name='Feuil1')
        df = df.rename(columns={
            'Désignation ':    'nom',
            'Catégorie ':      'categorie',
            'Calibre/Section': 'calibre',
            'Unité ':          'unite',
            'Prix FCFA':       'prix',
        })
        records = df.where(pd.notna(df), None).to_dict(orient='records')
        return jsonify({"succes": True, "protections": records})
    except Exception as e:
        return jsonify({"succes": False, "erreur": str(e)})


# ─── API PROJETS ─────────────────────────────────────────────────────
@app.route('/projets')
@login_required
def mes_projets():
    projets = Dimensionnement.query.filter_by(user_id=current_user.id)\
                .order_by(Dimensionnement.date_creation.desc()).all()
    return jsonify({"succes": True, "projets": [
        {"id": p.id, "nom": p.nom_projet, "date": p.date_creation.isoformat(),
         "lieu": p.nom_lieu, "systeme": p.type_systeme}
        for p in projets
    ]})


@app.route('/projets/<int:projet_id>')
@login_required
def get_projet(projet_id):
    p = Dimensionnement.query.filter_by(id=projet_id, user_id=current_user.id).first_or_404()
    return jsonify({"succes": True, "projet": {
        "id": p.id, "nom": p.nom_projet,
        "date": p.date_creation.isoformat(), "lieu": p.nom_lieu,
        "resultats": json.loads(p.resultats) if p.resultats else {},
        "prix": json.loads(p.prix) if p.prix else {},
    }})


@app.route('/projets/<int:projet_id>/renommer', methods=['POST'])
@login_required
def renommer_projet(projet_id):
    p = Dimensionnement.query.filter_by(id=projet_id, user_id=current_user.id).first_or_404()
    p.nom_projet = request.get_json().get('nom', p.nom_projet)
    db.session.commit()
    return jsonify({"succes": True})


@app.route('/projets/<int:projet_id>/supprimer', methods=['DELETE'])
@login_required
def supprimer_projet(projet_id):
    p = Dimensionnement.query.filter_by(id=projet_id, user_id=current_user.id).first_or_404()
    db.session.delete(p)
    db.session.commit()
    return jsonify({"succes": True})


# ─── API PAIEMENT ────────────────────────────────────────────────────
MONTANTS = {
    'user':                    1500,
    'technicien_acte':         3000,
    'technicien_mensuel':     25000,
    'technicien_trimestriel': 60000,
    'technicien_annuel':     180000,
}

ABO_DUREES = {
    'technicien_mensuel':      ('mensuel',      30),
    'technicien_trimestriel':  ('trimestriel',  90),
    'technicien_annuel':       ('annuel',       365),
    'technicien_acte':         ('acte',           1),
}


def _activer_acces(paiement):
    """Active l'accès après confirmation du paiement."""
    user = User.query.get(paiement.user_id)
    if not user:
        return
    user.a_paye       = True
    user.date_paiement = datetime.utcnow()
    user.montant_paye  = paiement.montant

    if user.role == 'technicien' and paiement.type_paiement in ABO_DUREES:
        abo, jours = ABO_DUREES[paiement.type_paiement]
        user.abonnement      = abo
        user.date_debut_abo  = datetime.utcnow()
        user.date_fin_abo    = datetime.utcnow() + timedelta(days=jours)


@app.route('/paiement/initier', methods=['POST'])
@login_required
def initier_paiement():
    data          = request.get_json()
    operateur     = data.get('operateur', 'MTN')
    type_paiement = data.get('type_paiement', 'user' if current_user.role == 'user' else 'technicien_acte')
    montant       = MONTANTS.get(type_paiement, 2500)
    reference     = _gen_ref()

    p = Paiement(
        user_id      = current_user.id,
        montant      = montant,
        operateur    = operateur,
        statut       = 'en_attente',
        reference    = reference,
        type_paiement= type_paiement,
    )
    db.session.add(p)
    db.session.commit()
    _log(f"Paiement initié — {montant} FCFA via {operateur}", reference)

    numero = '+22961000000' if operateur == 'MTN' else '+22996000000'
    return jsonify({
        "succes":    True,
        "reference": reference,
        "montant":   montant,
        "operateur": operateur,
        "numero":    numero,
        "message":   f"Envoyez {montant:,} FCFA au {numero} ({operateur}). Référence : {reference}",
    })


@app.route('/paiement/confirmer', methods=['POST'])
@login_required
def confirmer_paiement():
    data      = request.get_json()
    reference = data.get('reference')
    p         = Paiement.query.filter_by(reference=reference).first()

    if not p:
        return jsonify({"succes": False, "erreur": "Référence introuvable."})
    if current_user.role != 'admin' and current_user.id != p.user_id:
        return jsonify({"succes": False, "erreur": "Accès refusé."})

    p.statut = 'confirme'
    _activer_acces(p)
    db.session.commit()
    _log(f"Paiement confirmé — {p.montant} FCFA", reference, p.user_id)
    return jsonify({"succes": True, "message": "Paiement confirmé. Accès accordé."})


# ─── QCM ─────────────────────────────────────────────────────────────
@app.route('/qcm')
@login_required
def qcm():
    if current_user.role != 'technicien':
        return redirect(url_for('index'))
    if current_user.qcm_valide:
        return redirect(url_for('page_paiement'))
    return render_template('technicien/qcm.html', questions=QCM_QUESTIONS)


@app.route('/qcm/soumettre', methods=['POST'])
@login_required
def qcm_soumettre():
    if current_user.role != 'technicien':
        return jsonify({"succes": False, "erreur": "Accès refusé."})

    reponses = request.get_json().get('reponses', {})
    score = sum(
        1 for q in QCM_QUESTIONS
        if str(q["id"]) in reponses and int(reponses[str(q["id"])]) == q["reponse"]
    )

    current_user.qcm_score = score
    current_user.qcm_valide = score >= 7
    db.session.commit()
    _log(f"QCM technicien — score {score}/10")

    if score >= 7:
        return jsonify({
            "succes": True, "score": score, "valide": True,
            "redirect": "/paiement",
            "message": f"Félicitations ! Score {score}/10. Procédez au paiement pour activer votre compte.",
        })
    return jsonify({
        "succes": False, "score": score, "valide": False,
        "message": "Vos réponses ne sont pas dignes d'un technicien en solaire. Révisez et réessayez.",
    })


# ─── ADMIN STATS JSON ─────────────────────────────────────────────
@app.route('/admin/stats')
@login_required
def admin_stats():
    if current_user.role != 'admin':
        return jsonify({"succes": False, "erreur": "Accès refusé."})
    from sqlalchemy import func
    today = datetime.utcnow().date()
    return jsonify({"succes": True, "stats": {
        'nb_users':            User.query.filter_by(role='user').count(),
        'nb_techniciens':      User.query.filter_by(role='technicien').count(),
        'nb_dimensionnements': Dimensionnement.query.count(),
        'revenus_jour':        db.session.query(func.sum(Paiement.montant)).filter(
            func.date(Paiement.date_paiement) == today, Paiement.statut == 'confirme'
        ).scalar() or 0,
        'revenus_mois':        db.session.query(func.sum(Paiement.montant)).filter(
            func.extract('month', Paiement.date_paiement) == today.month,
            func.extract('year', Paiement.date_paiement) == today.year,
            Paiement.statut == 'confirme'
        ).scalar() or 0,
        'paiements_attente':   Paiement.query.filter_by(statut='en_attente').count(),
        'users_bannis':        User.query.filter_by(banni=True).count(),
        'nb_total':            User.query.count(),
    }})


# ─── ANNUAIRE TECHNICIENS ───────────────────────────────────────────
KENNEDY_FICHE = {
    "id": 0,
    "nom": "DOSSA", "prenom": "Rosnel Kennedy",
    "whatsapp": "+22901944389",
    "email": "rosnelkennedy7@gmail.com",
    "ville": "Bénin — toutes zones",
    "specialite": "Dimensionnement PV · Installation solaire · Audit énergétique",
    "disponible": True,
    "abonnement": "annuel",
    "prioritaire": True,
    "fondateur": True,
    "badge": "⭐ Fondateur SolarGuide",
    "poste": "Directeur — R.K Tech",
}

@app.route('/techniciens')
def annuaire_techniciens():
    techniciens = User.query.filter_by(role='technicien', actif=True, banni=False).all()
    techniciens.sort(key=lambda t: (t.abonnement != 'annuel', t.abonnement != 'trimestriel'))
    liste = [KENNEDY_FICHE] + [
        {
            "id": t.id, "nom": t.nom, "prenom": t.prenom,
            "whatsapp": t.whatsapp, "ville": t.ville,
            "specialite": t.specialite,
            "disponible": t.disponible_sous_traitance,
            "abonnement": t.abonnement,
            "prioritaire": t.abonnement == 'annuel',
            "fondateur": False,
            "badge": None,
        } for t in techniciens
    ]
    return jsonify({"succes": True, "techniciens": liste})


# ─── PROFIL ──────────────────────────────────────────────────────────
@app.route('/profil')
@login_required
def profil():
    return jsonify({"succes": True, "user": {
        "id":           current_user.id,
        "nom":          current_user.nom,
        "prenom":       current_user.prenom,
        "email":        current_user.email,
        "whatsapp":     current_user.whatsapp,
        "role":         current_user.role,
        "a_paye":       current_user.a_paye,
        "abonnement":   current_user.abonnement,
        "date_fin_abo": current_user.date_fin_abo.isoformat() if current_user.date_fin_abo else None,
        "qcm_score":    current_user.qcm_score,
        "qcm_valide":   current_user.qcm_valide,
        "peut_dimensionner": current_user.peut_dimensionner,
    }})


@app.route('/profil/technicien', methods=['POST'])
@login_required
def update_profil_technicien():
    if current_user.role != 'technicien':
        return jsonify({"succes": False, "erreur": "Accès refusé."})
    data = request.get_json()
    if 'disponible' in data:
        current_user.disponible_sous_traitance = data['disponible']
    if 'specialite' in data:
        current_user.specialite = data['specialite']
    if 'ville' in data:
        current_user.ville = data['ville']
    db.session.commit()
    return jsonify({"succes": True})


# ─── API SAUVEGARDER PROJET ──────────────────────────────────────────
@app.route('/projets/sauvegarder', methods=['POST'])
@login_required
def sauvegarder_projet():
    try:
        data = request.get_json()
        nom  = data.get('nom', 'Mon projet')
        proj = Dimensionnement(
            user_id          = current_user.id,
            nom_projet       = nom,
            latitude         = data.get('lat'),
            longitude        = data.get('lon'),
            nom_lieu         = data.get('nom_lieu', ''),
            irradiation      = data.get('irradiation'),
            type_systeme     = data.get('type_systeme', 'auto'),
            type_installation= data.get('type_installation', 'residentiel'),
            type_batterie    = data.get('type_batterie', 'AGM'),
            jours_autonomie  = data.get('jours_autonomie', 1),
            resultats        = json.dumps(data.get('resultats', {})),
            prix             = json.dumps(data.get('prix', {})),
        )
        db.session.add(proj)
        db.session.commit()
        _log(f"Projet sauvegardé : {nom}")
        return jsonify({"succes": True, "id": proj.id, "message": f"Projet « {nom} » sauvegardé."})
    except Exception as e:
        return jsonify({"succes": False, "erreur": str(e)})


# ─── ADMIN : routes JSON supplémentaires ─────────────────────────────
@app.route('/admin/users')
@login_required
def admin_users_json():
    """Alias JSON pour /admin/utilisateurs (compatibilité front)."""
    return admin_utilisateurs()


@app.route('/admin/journal')
@login_required
def admin_journal_json():
    if current_user.role != 'admin':
        return jsonify({"succes": False, "erreur": "Accès refusé."})
    journal = JournalActivite.query.order_by(JournalActivite.date.desc()).limit(50).all()
    return jsonify({"succes": True, "journal": [
        {
            "id": e.id, "action": e.action, "ip": e.ip,
            "date": e.date.isoformat() if e.date else None,
            "details": e.details, "user_id": e.user_id,
        } for e in journal
    ]})


@app.route('/admin/user/<int:user_id>/data')
@login_required
def admin_user_data(user_id):
    if current_user.role != 'admin':
        return jsonify({"succes": False, "erreur": "Accès refusé."})
    u = User.query.get_or_404(user_id)
    projets = Dimensionnement.query.filter_by(user_id=user_id).all()
    paiements = Paiement.query.filter_by(user_id=user_id).all()
    return jsonify({"succes": True, "user": {
        "id": u.id, "nom": u.nom, "prenom": u.prenom,
        "email": u.email, "whatsapp": u.whatsapp,
        "role": u.role, "actif": u.actif, "banni": u.banni,
        "motif_ban": u.motif_ban,
        "a_paye": u.a_paye, "abonnement": u.abonnement,
        "date_fin_abo": u.date_fin_abo.isoformat() if u.date_fin_abo else None,
        "qcm_score": u.qcm_score, "qcm_valide": u.qcm_valide,
        "date_inscription": u.date_inscription.isoformat() if u.date_inscription else None,
        "derniere_connexion": u.derniere_connexion.isoformat() if u.derniere_connexion else None,
        "ip": u.ip_derniere_connexion,
        "nb_projets": len(projets),
    }, "projets": [
        {"id": p.id, "nom": p.nom_projet, "lieu": p.nom_lieu,
         "date": p.date_creation.isoformat(),
         "resultats": json.loads(p.resultats) if p.resultats else {},
         "prix": json.loads(p.prix) if p.prix else {}} for p in projets
    ], "paiements": [
        {"id": p.id, "montant": p.montant, "statut": p.statut,
         "date": p.date_paiement.isoformat() if p.date_paiement else None,
         "operateur": p.operateur} for p in paiements
    ]})


# ─── INITIALISATION ─────────────────────────────────────────────────
if __name__ == '__main__':
    with app.app_context():
        db.create_all()

        # Créer le compte admin par défaut s'il n'existe pas
        admin = User.query.filter_by(role='admin').first()
        if not admin:
            admin = User(
                nom='DOSSA', prenom='Rosnel Kennedy',
                email='rosnelkennedy7@gmail.com',
                whatsapp='+22901944389',
                password=bcrypt.generate_password_hash('Kennedy2026').decode('utf-8'),
                role='admin',
                a_paye=True,
                actif=True,
            )
            db.session.add(admin)
            db.session.commit()
            print("Admin créé — email : rosnelkennedy7@gmail.com  |  mdp : Kennedy2026")
        else:
            changed = False
            if admin.tentatives_connexion > 0:
                admin.tentatives_connexion = 0
                changed = True
            if admin.banni:
                admin.banni = False
                changed = True
            if not admin.a_paye:
                admin.a_paye = True
                changed = True
            if changed:
                db.session.commit()

    app.run(debug=True, port=5000)
