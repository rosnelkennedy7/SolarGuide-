from flask_login import UserMixin
from datetime import datetime
from extensions import db


class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id                    = db.Column(db.Integer, primary_key=True)
    nom                   = db.Column(db.String(100), nullable=False)
    prenom                = db.Column(db.String(100), nullable=False)
    email                 = db.Column(db.String(150), unique=True, nullable=False)
    whatsapp              = db.Column(db.String(20), nullable=False)
    password              = db.Column(db.String(200), nullable=False)
    role                  = db.Column(db.String(20), default='user')   # user / technicien / admin

    # Statut compte
    actif                 = db.Column(db.Boolean, default=True)
    banni                 = db.Column(db.Boolean, default=False)
    motif_ban             = db.Column(db.String(300), nullable=True)
    date_inscription      = db.Column(db.DateTime, default=datetime.utcnow)
    derniere_connexion    = db.Column(db.DateTime, nullable=True)

    # Paiement
    a_paye                = db.Column(db.Boolean, default=False)
    date_paiement         = db.Column(db.DateTime, nullable=True)
    montant_paye          = db.Column(db.Integer, default=0)

    # Abonnement (technicien) : acte / mensuel / trimestriel / annuel
    abonnement            = db.Column(db.String(20), nullable=True)
    date_debut_abo        = db.Column(db.DateTime, nullable=True)
    date_fin_abo          = db.Column(db.DateTime, nullable=True)

    # QCM technicien
    qcm_score             = db.Column(db.Integer, default=0)
    qcm_valide            = db.Column(db.Boolean, default=False)

    # Sécurité
    tentatives_connexion  = db.Column(db.Integer, default=0)
    ip_derniere_connexion = db.Column(db.String(50), nullable=True)

    # Annuaire techniciens
    disponible_sous_traitance = db.Column(db.Boolean, default=False)
    specialite            = db.Column(db.String(200), nullable=True)
    ville                 = db.Column(db.String(100), nullable=True)

    # Relations
    dimensionnements = db.relationship('Dimensionnement', backref='user', lazy=True,
                                       cascade='all, delete-orphan')
    paiements        = db.relationship('Paiement', backref='user', lazy=True,
                                       cascade='all, delete-orphan')

    def __repr__(self):
        return f'<User {self.email} — {self.role}>'

    @property
    def abonnement_actif(self):
        if not self.date_fin_abo:
            return self.abonnement == 'acte' and self.a_paye
        return self.date_fin_abo > datetime.utcnow()

    @property
    def peut_dimensionner(self):
        if self.role == 'admin':
            return True
        if not self.a_paye:
            return False
        if self.role == 'technicien':
            if self.abonnement == 'acte':
                return True
            if self.date_fin_abo and self.date_fin_abo > datetime.utcnow():
                return True
            return False
        return True


class Dimensionnement(db.Model):
    __tablename__ = 'dimensionnements'

    id                = db.Column(db.Integer, primary_key=True)
    user_id           = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    nom_projet        = db.Column(db.String(200), default='Mon projet')
    date_creation     = db.Column(db.DateTime, default=datetime.utcnow)

    # Localisation
    latitude          = db.Column(db.Float, nullable=True)
    longitude         = db.Column(db.Float, nullable=True)
    nom_lieu          = db.Column(db.String(200), nullable=True)
    irradiation       = db.Column(db.Float, nullable=True)

    # Paramètres système
    type_systeme      = db.Column(db.String(20), nullable=True)
    type_installation = db.Column(db.String(20), nullable=True)
    type_batterie     = db.Column(db.String(30), nullable=True)
    jours_autonomie   = db.Column(db.Integer, nullable=True)

    # Résultats sérialisés en JSON
    resultats         = db.Column(db.Text, nullable=True)
    prix              = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<Dimensionnement {self.nom_projet} — user {self.user_id}>'


class Paiement(db.Model):
    __tablename__ = 'paiements'

    id            = db.Column(db.Integer, primary_key=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    montant       = db.Column(db.Integer, nullable=False)
    operateur     = db.Column(db.String(20), nullable=True)   # MTN / Moov
    statut        = db.Column(db.String(20), default='en_attente')  # en_attente / confirme / echoue
    date_paiement = db.Column(db.DateTime, default=datetime.utcnow)
    reference     = db.Column(db.String(100), nullable=True)
    type_paiement = db.Column(db.String(30), nullable=True)   # user / technicien_acte / technicien_mensuel …

    def __repr__(self):
        return f'<Paiement {self.montant} FCFA — {self.statut}>'


class JournalActivite(db.Model):
    __tablename__ = 'journal'

    id      = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    action  = db.Column(db.String(200), nullable=False)
    ip      = db.Column(db.String(50), nullable=True)
    date    = db.Column(db.DateTime, default=datetime.utcnow)
    details = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<Journal {self.action} — {self.date}>'
