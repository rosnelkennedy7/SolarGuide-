import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sun, Mail, Lock, Eye, EyeOff, Fingerprint } from 'lucide-react'
import vitreImg from '../assets/images/vitre.png'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [biometric, setBiometric] = useState(false)

  /* Détection WebAuthn */
  useEffect(() => {
    if (window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(ok => setBiometric(ok))
        .catch(() => {})
    }
  }, [])

  const redirectByRole = () => {
    const role = localStorage.getItem('heliobenin_role')
    if (role === 'technicien') navigate('/qcm-tech')
    else navigate('/paiement')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) { setError('Veuillez saisir votre email.'); return }
    if (!password)     { setError('Veuillez saisir votre mot de passe.'); return }

    setLoading(true)
    try {
      /* Simulation — remplacer par appel API réel */
      await new Promise(r => setTimeout(r, 900))
      const stored = localStorage.getItem('helio_user')
      const user   = stored ? JSON.parse(stored) : null

      if (user && user.email === email) {
        /* Synchro : le rôle stocké dans helio_user prime si présent */
        if (user.role) localStorage.setItem('heliobenin_role', user.role)
        redirectByRole()
      } else {
        /* Fallback demo : conserve le rôle choisi sur l'accueil */
        const role = localStorage.getItem('heliobenin_role') || 'particulier'
        const demo = { prenom: email.split('@')[0], nom: '', email, role }
        localStorage.setItem('helio_user', JSON.stringify(demo))
        redirectByRole()
      }
    } catch {
      setError('Identifiants incorrects. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const handleBiometric = async () => {
    setError('')
    setLoading(true)
    try {
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)
      await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
        }
      })
      /* Succès biométrique — charger l'utilisateur stocké */
      const stored = localStorage.getItem('helio_user')
      const user   = stored ? JSON.parse(stored) : null
      if (user?.role) localStorage.setItem('heliobenin_role', user.role)
      redirectByRole()
    } catch {
      setError('Authentification biométrique annulée ou non disponible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />

      <div className={styles.center}>
        <div className={styles.card}>
          {/* Logo */}
          <div className={styles.logo}>
            <div className={styles.logoIcon}><Sun size={22} color="#F59E0B" /></div>
            <span className={styles.logoText}>Hélio<span className={styles.logoAccent}>Bénin</span></span>
          </div>

          <h1 className={styles.title}>Bon retour !</h1>
          <p className={styles.subtitle}>Connectez-vous à votre espace solaire</p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {/* Email */}
            <div className={styles.field}>
              <div className={styles.inputWrap}>
                <Mail size={17} className={styles.inputIcon} color="rgba(255,255,255,0.38)" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Adresse email"
                  className={styles.input}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className={styles.field}>
              <div className={styles.inputWrap}>
                <Lock size={17} className={styles.inputIcon} color="rgba(255,255,255,0.38)" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className={styles.input}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Masquer' : 'Afficher'}
                >
                  {showPass
                    ? <EyeOff size={17} color="rgba(255,255,255,0.38)" />
                    : <Eye    size={17} color="rgba(255,255,255,0.38)" />}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {error && <p className={styles.error}>{error}</p>}

            {/* Bouton connexion */}
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : 'Se connecter'}
            </button>

            {/* Biométrie */}
            {biometric && (
              <button
                type="button"
                className={styles.btnBiometric}
                onClick={handleBiometric}
                disabled={loading}
              >
                <Fingerprint size={18} />
                Connexion biométrique
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
