from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session
from flask_login import login_user, logout_user, login_required, current_user
from datetime import datetime

from extensions import db, bcrypt
from auth.models import User, JournalActivite

auth_bp = Blueprint('auth', __name__)


# ─── INSCRIPTION ────────────────────────────────────────────────────
@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data     = request.get_json()
        nom      = data.get('nom', '').strip()
        prenom   = data.get('prenom', '').strip()
        email    = data.get('email', '').strip().lower()
        whatsapp = data.get('whatsapp', '').strip()
        password = data.get('password', '')
        role     = data.get('role', 'user')  # user ou technicien

        if not all([nom, prenom, email, whatsapp, password]):
            return jsonify({"succes": False, "erreur": "Tous les champs sont obligatoires."})

        if User.query.filter_by(email=email).first():
            return jsonify({"succes": False, "erreur": "Cet email est déjà utilisé."})

        if len(password) < 6:
            return jsonify({"succes": False, "erreur": "Mot de passe trop court (6 caractères minimum)."})

        if role not in ('user', 'technicien'):
            role = 'user'

        hash_pw = bcrypt.generate_password_hash(password).decode('utf-8')
        user = User(
            nom=nom, prenom=prenom, email=email,
            whatsapp=whatsapp, password=hash_pw, role=role
        )
        db.session.add(user)

        log = JournalActivite(
            action=f"Inscription — {role}",
            ip=request.remote_addr,
            details=f"{prenom} {nom} — {email}"
        )
        db.session.add(log)
        db.session.commit()

        # Redirection différente selon le rôle
        if role == 'technicien':
            return jsonify({"succes": True, "message": "Compte créé ! Passez le QCM de qualification.",
                            "redirect": "/qcm"})
        return jsonify({"succes": True, "message": "Compte créé ! Procédez au paiement pour accéder au dimensionnement.",
                        "redirect": "/paiement"})

    return render_template('register.html')


# ─── CONNEXION ──────────────────────────────────────────────────────
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data     = request.get_json()
        email    = data.get('email', '').strip().lower()
        password = data.get('password', '')
        ip       = request.remote_addr

        user = User.query.filter_by(email=email).first()

        if not user:
            return jsonify({"succes": False, "erreur": "Email ou mot de passe incorrect."})

        if user.banni:
            return jsonify({"succes": False, "erreur": f"Compte suspendu. Motif : {user.motif_ban}"})

        if user.tentatives_connexion >= 5:
            return jsonify({"succes": False,
                            "erreur": "Compte bloqué après 5 tentatives. Contactez l'administrateur."})

        if not bcrypt.check_password_hash(user.password, password):
            user.tentatives_connexion += 1
            db.session.commit()
            restantes = 5 - user.tentatives_connexion
            return jsonify({"succes": False,
                            "erreur": f"Mot de passe incorrect. {restantes} tentative(s) restante(s)."})

        # Connexion réussie
        user.tentatives_connexion  = 0
        user.derniere_connexion    = datetime.utcnow()
        user.ip_derniere_connexion = ip
        db.session.commit()

        login_user(user, remember=True)

        log = JournalActivite(
            user_id=user.id,
            action="Connexion",
            ip=ip,
            details=f"{user.prenom} {user.nom} — {user.role}"
        )
        db.session.add(log)
        db.session.commit()

        # Redirection selon rôle
        next_url = request.args.get('next')
        if next_url:
            return jsonify({"succes": True, "redirect": next_url})
        if user.role == 'admin':
            return jsonify({"succes": True, "redirect": "/admin/rktech2026"})
        elif user.role == 'technicien':
            if not user.qcm_valide:
                return jsonify({"succes": True, "redirect": "/qcm"})
            elif not user.a_paye:
                return jsonify({"succes": True, "redirect": "/paiement"})
            else:
                return jsonify({"succes": True, "redirect": "/technicien/dashboard"})
        else:
            if user.a_paye:
                return jsonify({"succes": True, "redirect": "/user/dashboard"})
            else:
                return jsonify({"succes": True, "redirect": "/paiement"})

    return render_template('login.html')


# ─── DÉCONNEXION ────────────────────────────────────────────────────
@auth_bp.route('/logout')
@login_required
def logout():
    log = JournalActivite(
        user_id=current_user.id,
        action="Déconnexion",
        ip=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    logout_user()
    return redirect(url_for('auth.login'))


# ─── BANNIR ─────────────────────────────────────────────────────────
@auth_bp.route('/admin/bannir/<int:user_id>', methods=['POST'])
@login_required
def bannir(user_id):
    if current_user.role != 'admin':
        return jsonify({"succes": False, "erreur": "Accès refusé."})
    data  = request.get_json()
    motif = data.get('motif', 'Comportement suspect')
    user  = User.query.get(user_id)
    if not user:
        return jsonify({"succes": False, "erreur": "Utilisateur introuvable."})
    user.banni     = True
    user.motif_ban = motif
    db.session.commit()
    log = JournalActivite(
        user_id=current_user.id,
        action=f"Bannissement de {user.prenom} {user.nom}",
        ip=request.remote_addr,
        details=f"Motif : {motif}"
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({"succes": True, "message": f"{user.prenom} {user.nom} banni."})


# ─── DÉBLOQUER ──────────────────────────────────────────────────────
@auth_bp.route('/admin/debloquer/<int:user_id>', methods=['POST'])
@login_required
def debloquer(user_id):
    if current_user.role != 'admin':
        return jsonify({"succes": False, "erreur": "Accès refusé."})
    user = User.query.get(user_id)
    if not user:
        return jsonify({"succes": False, "erreur": "Utilisateur introuvable."})
    user.banni                = False
    user.motif_ban            = None
    user.tentatives_connexion = 0
    db.session.commit()
    log = JournalActivite(
        user_id=current_user.id,
        action=f"Déblocage de {user.prenom} {user.nom}",
        ip=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({"succes": True, "message": f"{user.prenom} {user.nom} débloqué."})


# ─── CHANGER MOT DE PASSE ───────────────────────────────────────────
@auth_bp.route('/changer-mdp', methods=['POST'])
@login_required
def changer_mdp():
    data        = request.get_json()
    ancien      = data.get('ancien_mdp', '')
    nouveau     = data.get('nouveau_mdp', '')

    if not bcrypt.check_password_hash(current_user.password, ancien):
        return jsonify({"succes": False, "erreur": "Ancien mot de passe incorrect."})
    if len(nouveau) < 6:
        return jsonify({"succes": False, "erreur": "Nouveau mot de passe trop court."})

    current_user.password = bcrypt.generate_password_hash(nouveau).decode('utf-8')
    db.session.commit()
    return jsonify({"succes": True, "message": "Mot de passe modifié avec succès."})
