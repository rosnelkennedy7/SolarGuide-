import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Eye, EyeOff } from 'lucide-react'
import vitreImg from '../assets/images/vitre.png'
import styles from './Inscription.module.css'

const SPECIALITES = [
  'Technicien en solaire',
  'Électricien',
  'Ingénieur',
  'Autre',
]

/* Formatte 10 chiffres en XX XX XX XX XX */
const formatBjPhone = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ')
}

/* ─── Champ mot de passe avec toggle Eye ─── */
function PasswordInput({ id, label, value, onChange, error, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label} <span className={styles.required}>*</span>
      </label>
      <div className={styles.passwordWrap}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder || ''}
          className={error ? styles.inputError : ''}
        />
        <button
          type="button"
          className={styles.eyeBtn}
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Masquer' : 'Afficher'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}

/* ─── Champs communs aux deux onglets ─── */
function ChampsCommuns({ form, errors, onChange }) {
  return (
    <>
      {/* Prénom + Nom */}
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="prenom">
            Prénom <span className={styles.required}>*</span>
          </label>
          <input
            id="prenom"
            value={form.prenom}
            onChange={e => onChange('prenom', e.target.value)}
            className={errors.prenom ? styles.inputError : ''}
            placeholder="Jean"
          />
          {errors.prenom && <span className={styles.errorMsg}>{errors.prenom}</span>}
        </div>
        <div className={styles.field}>
          <label htmlFor="nom">
            Nom <span className={styles.required}>*</span>
          </label>
          <input
            id="nom"
            value={form.nom}
            onChange={e => onChange('nom', e.target.value)}
            className={errors.nom ? styles.inputError : ''}
            placeholder="Doe"
          />
          {errors.nom && <span className={styles.errorMsg}>{errors.nom}</span>}
        </div>
      </div>

      {/* Email */}
      <div className={styles.field}>
        <label htmlFor="email">
          Adresse email <span className={styles.required}>*</span>
        </label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={e => onChange('email', e.target.value)}
          className={errors.email ? styles.inputError : ''}
          placeholder="jean.doe@email.com"
        />
        {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
      </div>

      {/* WhatsApp — indicatif fixe +229 */}
      <div className={styles.field}>
        <label htmlFor="whatsapp">
          Numéro WhatsApp <span className={styles.required}>*</span>
        </label>
        <div className={`${styles.phoneWrap} ${errors.whatsapp ? styles.phoneError : ''}`}>
          <span className={styles.phonePrefix}>🇧🇯 +229</span>
          <input
            id="whatsapp"
            type="tel"
            value={form.whatsapp}
            onChange={e => onChange('whatsapp', formatBjPhone(e.target.value))}
            className={styles.phoneInput}
            placeholder="97 00 00 00 00"
            maxLength={14}
          />
        </div>
        {errors.whatsapp && <span className={styles.errorMsg}>{errors.whatsapp}</span>}
      </div>

      {/* Mot de passe */}
      <PasswordInput
        id="password"
        label="Mot de passe"
        value={form.password}
        onChange={e => onChange('password', e.target.value)}
        error={errors.password}
        placeholder="8 caractères minimum"
      />

      {/* Confirmation */}
      <PasswordInput
        id="confirmPassword"
        label="Confirmer le mot de passe"
        value={form.confirmPassword}
        onChange={e => onChange('confirmPassword', e.target.value)}
        error={errors.confirmPassword}
        placeholder="Répétez votre mot de passe"
      />
    </>
  )
}

/* ══════════════════════════════════════
   Composant principal
══════════════════════════════════════ */
export default function Inscription() {
  const navigate = useNavigate()
  const [onglet, setOnglet] = useState(() => localStorage.getItem('heliobenin_role') || 'particulier')

  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', whatsapp: '',
    password: '', confirmPassword: '',
    entreprise: '', ifu: '', rccm: '',
    specialite: '', specialiteAutre: '',
  })

  const [errors, setErrors] = useState({})

  const update = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  /* ─── Validation ─── */
  const validate = () => {
    const e = {}

    if (!form.prenom.trim()) e.prenom = 'Le prénom est requis.'
    if (!form.nom.trim()) e.nom = 'Le nom est requis.'

    if (!form.email.trim()) {
      e.email = "L'email est requis."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Format d'email invalide."
    }

    const phoneDigits = form.whatsapp.replace(/\D/g, '')
    if (!phoneDigits) {
      e.whatsapp = 'Le numéro WhatsApp est requis.'
    } else if (phoneDigits.length !== 10) {
      e.whatsapp = 'Le numéro doit contenir exactement 10 chiffres.'
    }

    if (!form.password) {
      e.password = 'Le mot de passe est requis.'
    } else if (form.password.length < 8) {
      e.password = 'Le mot de passe doit contenir au moins 8 caractères.'
    }

    if (!form.confirmPassword) {
      e.confirmPassword = 'Veuillez confirmer votre mot de passe.'
    } else if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'Les mots de passe ne correspondent pas.'
    }

    if (onglet === 'technicien') {
      if (!form.specialite) {
        e.specialite = 'La spécialité est requise.'
      } else if (form.specialite === 'Autre' && !form.specialiteAutre.trim()) {
        e.specialiteAutre = 'Veuillez préciser votre spécialité.'
      }
    }

    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    /* Sauvegarde utilisateur + rôle */
    localStorage.setItem('heliobenin_role', onglet)
    localStorage.setItem('helio_user', JSON.stringify({
      prenom: form.prenom,
      nom:    form.nom,
      email:  form.email,
      role:   onglet,
    }))
    if (onglet === 'technicien') navigate('/qcm-tech')
    else navigate('/paiement')
  }

  const isTech = onglet === 'technicien'

  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />

      <div className={styles.content}>
        <div className={styles.card}>
          {/* Logo */}
          <div className={styles.cardLogo}>
            <Sun size={26} color="#F59E0B" strokeWidth={2} />
            <span className={styles.logoText}>
              <span className={styles.logoHelio}>Hélio</span>
              <span className={styles.logoBenin}>Bénin</span>
            </span>
          </div>
          <p className={styles.cardSlogan}>Votre guide de dimensionnement solaire</p>

          {/* Onglets */}
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${onglet === 'particulier' ? styles.tabOrange : ''}`}
              onClick={() => { setOnglet('particulier'); localStorage.setItem('heliobenin_role', 'particulier'); setErrors({}) }}
            >
              Particulier
            </button>
            <button
              type="button"
              className={`${styles.tab} ${onglet === 'technicien' ? styles.tabBlue : ''}`}
              onClick={() => { setOnglet('technicien'); localStorage.setItem('heliobenin_role', 'technicien'); setErrors({}) }}
            >
              Technicien
            </button>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} noValidate>
            <ChampsCommuns form={form} errors={errors} onChange={update} />

            {/* Champs technicien supplémentaires */}
            {isTech && (
              <>
                <div className={styles.field}>
                  <label htmlFor="entreprise">Nom de l'entreprise</label>
                  <input
                    id="entreprise"
                    value={form.entreprise}
                    onChange={e => update('entreprise', e.target.value)}
                    placeholder="Optionnel"
                  />
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label htmlFor="ifu">IFU</label>
                    <input
                      id="ifu"
                      value={form.ifu}
                      onChange={e => update('ifu', e.target.value)}
                      placeholder="Optionnel"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="rccm">RCCM</label>
                    <input
                      id="rccm"
                      value={form.rccm}
                      onChange={e => update('rccm', e.target.value)}
                      placeholder="Optionnel"
                    />
                  </div>
                </div>

                {/* Spécialité */}
                <div className={styles.field}>
                  <label htmlFor="specialite">
                    Spécialité <span className={styles.required}>*</span>
                  </label>
                  <select
                    id="specialite"
                    value={form.specialite}
                    onChange={e => update('specialite', e.target.value)}
                    className={errors.specialite ? styles.inputError : ''}
                  >
                    <option value="">-- Choisissez votre spécialité --</option>
                    {SPECIALITES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.specialite && (
                    <span className={styles.errorMsg}>{errors.specialite}</span>
                  )}
                </div>

                {form.specialite === 'Autre' && (
                  <div className={styles.field}>
                    <label htmlFor="specialiteAutre">
                      Précisez votre spécialité <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="specialiteAutre"
                      value={form.specialiteAutre}
                      onChange={e => update('specialiteAutre', e.target.value)}
                      className={errors.specialiteAutre ? styles.inputError : ''}
                      placeholder="Ex : Électromécanicien"
                    />
                    {errors.specialiteAutre && (
                      <span className={styles.errorMsg}>{errors.specialiteAutre}</span>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Bandeau info */}
            {!isTech ? (
              <div className={styles.infoOrange}>
                Obtenez une estimation de vos équipements et contactez un technicien pour votre
                installation. Les résultats sont indicatifs.
              </div>
            ) : (
              <div className={styles.infoBlue}>
                Accédez aux outils complets : paramètres avancés, base de données équipements,
                génération de devis PDF et gestion de projets clients.
              </div>
            )}

            <button
              type="submit"
              className={isTech ? styles.btnBlue : styles.btnOrange}
            >
              Créer mon compte
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
