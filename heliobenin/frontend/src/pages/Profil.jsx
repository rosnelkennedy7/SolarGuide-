import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Eye, EyeOff, Check, ChevronLeft } from 'lucide-react'
import vitreImg from '../assets/images/vitre.png'
import styles from './Profil.module.css'

export default function Profil() {
  const navigate = useNavigate()

  const raw  = localStorage.getItem('helio_user')
  const user = raw ? JSON.parse(raw) : { prenom: '', nom: '', email: '', whatsapp: '', role: 'particulier' }

  const [whatsapp,   setWhatsapp]   = useState(user.whatsapp || '')
  const [editWa,     setEditWa]     = useState(false)
  const [oldPass,    setOldPass]    = useState('')
  const [newPass,    setNewPass]    = useState('')
  const [confPass,   setConfPass]   = useState('')
  const [showOld,    setShowOld]    = useState(false)
  const [showNew,    setShowNew]    = useState(false)
  const [showConf,   setShowConf]   = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [passError,  setPassError]  = useState('')

  const nomInitial = (user.nom?.[0] || 'U').toUpperCase()
  const fullName   = [user.prenom, user.nom].filter(Boolean).join(' ')
  const roleLabel  = user.role === 'admin'      ? 'Administrateur'
                   : user.role === 'technicien' ? 'Technicien'
                   : 'Particulier'

  const formatWa = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 10)
    return digits.replace(/(\d{2})(?=\d)/g, '$1 ')
  }

  const handleSave = () => {
    setPassError('')
    if (newPass || confPass || oldPass) {
      if (!oldPass)              { setPassError('Saisissez l\'ancien mot de passe.'); return }
      if (newPass.length < 6)   { setPassError('Le nouveau mot de passe doit faire au moins 6 caractères.'); return }
      if (newPass !== confPass)  { setPassError('Les mots de passe ne correspondent pas.'); return }
    }
    const updated = { ...user, whatsapp, ...(newPass ? { password: newPass } : {}) }
    localStorage.setItem('helio_user', JSON.stringify(updated))
    setOldPass(''); setNewPass(''); setConfPass('')
    setEditWa(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />

      <div className={styles.inner}>
        {/* Retour */}
        <button className={styles.btnRetour} onClick={() => navigate(-1)}>
          <ChevronLeft size={18} /> Retour
        </button>

        {/* Grand avatar + nom + badge */}
        <div className={styles.avatarBlock}>
          <div className={styles.bigCircle}>{nomInitial}</div>
          <h2 className={styles.userName}>{fullName || 'Utilisateur'}</h2>
          <span className={styles.badge}>{roleLabel}</span>
        </div>

        {/* Infos de base (lecture seule) */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Informations personnelles</h3>

          <div className={styles.fieldRow}>
            <label className={styles.label}>Prénom</label>
            <div className={styles.readBox}>{user.prenom || '–'}</div>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.label}>Nom</label>
            <div className={styles.readBox}>{user.nom || '–'}</div>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.label}>Email</label>
            <div className={styles.readBox}>{user.email || '–'}</div>
          </div>

          {/* WhatsApp modifiable */}
          <div className={styles.fieldRow}>
            <label className={styles.label}>WhatsApp</label>
            <div className={styles.waRow}>
              {editWa ? (
                <div className={styles.inputWrap}>
                  <span className={styles.prefix}>🇧🇯 +229</span>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={e => setWhatsapp(formatWa(e.target.value))}
                    placeholder="XX XX XX XX XX"
                    className={styles.input}
                    maxLength={14}
                    autoFocus
                  />
                </div>
              ) : (
                <div className={`${styles.readBox} ${styles.readBoxFlex}`}>
                  <span>{whatsapp ? `+229 ${whatsapp}` : '–'}</span>
                </div>
              )}
              <button
                className={styles.btnModif}
                onClick={() => setEditWa(v => !v)}
              >
                {editWa ? 'Annuler' : 'Modifier'}
              </button>
            </div>
          </div>
        </section>

        {/* Sécurité */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Sécurité — Changer le mot de passe</h3>

          <div className={styles.fieldRow}>
            <label className={styles.label}>Ancien mot de passe</label>
            <div className={styles.inputWrap}>
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPass}
                onChange={e => setOldPass(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowOld(v => !v)}>
                {showOld ? <EyeOff size={16} color="rgba(255,255,255,0.38)" /> : <Eye size={16} color="rgba(255,255,255,0.38)" />}
              </button>
            </div>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.label}>Nouveau mot de passe</label>
            <div className={styles.inputWrap}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowNew(v => !v)}>
                {showNew ? <EyeOff size={16} color="rgba(255,255,255,0.38)" /> : <Eye size={16} color="rgba(255,255,255,0.38)" />}
              </button>
            </div>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.label}>Confirmer</label>
            <div className={styles.inputWrap}>
              <input
                type={showConf ? 'text' : 'password'}
                value={confPass}
                onChange={e => setConfPass(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowConf(v => !v)}>
                {showConf ? <EyeOff size={16} color="rgba(255,255,255,0.38)" /> : <Eye size={16} color="rgba(255,255,255,0.38)" />}
              </button>
            </div>
          </div>

          {passError && <p className={styles.error}>{passError}</p>}
        </section>

        {/* Enregistrer */}
        <button className={styles.btnSave} onClick={handleSave}>
          {saved
            ? <><Check size={18} /> Modifications enregistrées</>
            : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  )
}
