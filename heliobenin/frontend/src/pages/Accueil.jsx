import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, UserPlus, Wrench } from 'lucide-react'
import vitreImg from '../assets/images/vitre.png'
import flaagImg from '../assets/images/flaag.jpg'
import styles from './Accueil.module.css'

export default function Accueil() {
  const [role, setRole] = useState(() => localStorage.getItem('heliobenin_role'))

  const selectRole = (r) => {
    setRole(r)
    localStorage.setItem('heliobenin_role', r)
  }

  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />

      <div className={styles.content}>
        {/* Navbar — drapeau en coin gauche uniquement */}
        <nav className={styles.navbar}>
          <img src={flaagImg} alt="Drapeau du Bénin" className={styles.navFlag} />
        </nav>

        {/* Hero */}
        <main className={styles.hero}>
          {/* Logo centré */}
          <div className={styles.heroLogo}>
            <span className={styles.logoHelio}>Hélio</span>
            <span className={styles.logoBenin}>Bénin</span>
          </div>
          <p className={styles.slogan}>Votre guide de dimensionnement solaire</p>

          <div className={styles.badge}>Made in Bénin </div>

          <h1 className={styles.title}>
            Dimensionnez votre installation{' '}
            <span className={styles.titleOrange}>solaire photovoltaïque</span>
          </h1>

          <p className={styles.subtitle}>
            Un outil simple, pour vous accompagner dans le dimensionnement de votre système solaire.
          </p>

          {/* Sélection du rôle */}
          <div className={styles.roleSection}>
            <p className={styles.roleLabel}>Je suis…</p>
            <div className={styles.roleRow}>
              <button
                className={`${styles.roleBtn} ${role === 'particulier' ? styles.roleBtnActive : ''}`}
                onClick={() => selectRole('particulier')}
              >
                <User size={20} />
                Particulier
              </button>
              <button
                className={`${styles.roleBtn} ${role === 'technicien' ? styles.roleBtnActiveTech : ''}`}
                onClick={() => selectRole('technicien')}
              >
                <Wrench size={20} />
                Technicien
              </button>
            </div>
          </div>

          {/* Cartes */}
          <div className={styles.cards}>
            <div className={styles.card}>
              <div className={styles.cardIcon}>
                <User size={38} color="#fff" />
              </div>
              <h2 className={styles.cardTitle}>J'ai déjà un compte</h2>
              <p className={styles.cardDesc}>
                Connectez-vous et accédez à votre espace de travail.
              </p>
              <Link to="/login" className={styles.btnDark}>
                Se connecter ›
              </Link>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIcon}>
                <UserPlus size={38} color="#F59E0B" />
              </div>
              <h2 className={styles.cardTitle}>Nouveau sur HélioBénin ?</h2>
              <p className={styles.cardDesc}>
                Créez un compte et commencez votre dimensionnement.
              </p>
              <Link to="/inscription" className={styles.btnOrange}>
                Créer un compte ›
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
