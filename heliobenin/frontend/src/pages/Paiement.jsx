import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, CheckCircle, Loader } from 'lucide-react'
import vitreImg from '../assets/images/vitre.png'
import mtnImg from '../assets/images/MTN.jpg'
import moovImg from '../assets/images/MOOV.png'
import celtiisImg from '../assets/images/Celtiis.jpg'
import styles from './Paiement.module.css'

const RESEAUX = [
  { id: 'mtn',     label: 'MTN Money',    img: mtnImg,     placeholder: '06 97 12 34 56' },
  { id: 'moov',    label: 'Moov Money',   img: moovImg,    placeholder: '96 12 34 56 78' },
  { id: 'celtiis', label: 'Celtiis Cash', img: celtiisImg, placeholder: '01 97 12 34 56' },
]

/* Formatte 10 chiffres en XX XX XX XX XX */
const formatPhone10 = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ')
}

export default function Paiement() {
  const navigate = useNavigate()
  const [reseau, setReseau] = useState(null)
  const [numero, setNumero] = useState('')
  const [errNum, setErrNum] = useState('')
  const [statut, setStatut] = useState('idle') // idle | loading | success

  const selectedReseau = RESEAUX.find(r => r.id === reseau)
  const numDigits = numero.replace(/\D/g, '').length
  const canPay = !!reseau && numDigits === 10

  const handleSelectReseau = (id) => {
    if (reseau !== id) {
      setReseau(id)
      setNumero('')
      setErrNum('')
    }
  }

  const handleNumeroChange = (e) => {
    setNumero(formatPhone10(e.target.value))
    setErrNum('')
  }

  const handleNumeroBlur = () => {
    if (!numero) {
      setErrNum('Le numéro est requis.')
    } else if (numDigits < 10) {
      setErrNum('Le numéro doit contenir exactement 10 chiffres.')
    }
  }

  const handlePayer = () => {
    if (!canPay || statut === 'loading') return
    setStatut('loading')
    setTimeout(() => {
      setStatut('success')
      setTimeout(() => navigate('/choix-mode'), 2000)
    }, 3000)
  }

  /* ── Écran succès ── */
  if (statut === 'success') {
    return (
      <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
        <div className={styles.overlay} />
        <div className={styles.content}>
          <div className={`${styles.card} ${styles.successCard}`}>
            <CheckCircle size={72} color="#22c55e" strokeWidth={1.5} />
            <h2 className={styles.successTitle}>Paiement confirmé !</h2>
            <p className={styles.successMsg}>Bienvenue sur HélioBénin</p>
            <p className={styles.successRedirect}>Redirection en cours…</p>
          </div>
        </div>
      </div>
    )
  }

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

          {/* Montant */}
          <div className={styles.montantRow}>
            <span className={styles.montant}>1 500</span>
            <span className={styles.devise}>FCFA</span>
          </div>
          <p className={styles.montantLabel}>Dimensionnement unique</p>

          <hr className={styles.sep} />

          {/* Réseau */}
          <p className={styles.reseauTitle}>RÉSEAU DE PAIEMENT</p>

          <div className={styles.reseaux}>
            {RESEAUX.map(r => (
              <button
                key={r.id}
                type="button"
                className={`${styles.reseauCard} ${reseau === r.id ? styles.reseauActive : ''}`}
                onClick={() => handleSelectReseau(r.id)}
              >
                <img src={r.img} alt={r.label} className={styles.reseauImg} />
                <span className={styles.reseauLabel}>{r.label}</span>
              </button>
            ))}
          </div>

          {/* Champ numéro conditionnel */}
          {selectedReseau && (
            <div className={styles.numField}>
              <label htmlFor="numero" className={styles.numLabel}>
                Numéro {selectedReseau.label} <span className={styles.required}>*</span>
              </label>
              <input
                id="numero"
                type="tel"
                value={numero}
                onChange={handleNumeroChange}
                onBlur={handleNumeroBlur}
                placeholder={selectedReseau.placeholder}
                className={`${styles.numInput} ${errNum ? styles.numInputErr : ''}`}
                maxLength={14}
                autoFocus
              />
              {errNum && <span className={styles.errMsg}>{errNum}</span>}
            </div>
          )}

          {/* Bouton payer */}
          <button
            type="button"
            className={`${styles.btnPayer} ${!canPay ? styles.btnDisabled : ''}`}
            onClick={handlePayer}
            disabled={!canPay || statut === 'loading'}
          >
            {statut === 'loading' ? (
              <span className={styles.loadingInner}>
                <Loader size={18} className={styles.spinner} />
                Traitement en cours…
              </span>
            ) : (
              'Payer maintenant'
            )}
          </button>

          <p className={styles.secure}>Paiement sécurisé 🔒</p>
        </div>
      </div>
    </div>
  )
}
