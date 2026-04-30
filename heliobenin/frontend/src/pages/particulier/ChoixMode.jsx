import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Wallet, Calculator } from 'lucide-react'
import vitreImg from '../../assets/images/vitre.png'
import Avatar from '../../components/Avatar'
import { saveParticulier } from '../../utils/storage'
import styles from './ChoixMode.module.css'

export default function ChoixMode() {
  const navigate = useNavigate()
  const [mode, setMode] = useState(null) // 'avec_budget' | 'sans_budget'

  const handleContinuer = () => {
    if (!mode) return
    saveParticulier({ mode })
    navigate('/qcm')
  }

  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />

      <div className={styles.content}>
        <div className={styles.card}>
          {/* Logo */}
          <div className={styles.logo}>
            <Sun size={24} color="#F59E0B" strokeWidth={2} />
            <span className={styles.logoText}>
              <span className={styles.logoHelio}>Hélio</span>
              <span className={styles.logoBenin}>Bénin</span>
            </span>
          </div>

          <h1 className={styles.title}>Comment souhaitez-vous procéder ?</h1>
          <p className={styles.subtitle}>Choisissez votre mode de dimensionnement</p>

          {/* 2 choix */}
          <div className={styles.choices}>
            <button
              type="button"
              className={`${styles.choiceCard} ${mode === 'avec_budget' ? styles.choiceOrange : ''}`}
              onClick={() => setMode('avec_budget')}
            >
              <Wallet
                size={38}
                color={mode === 'avec_budget' ? '#F59E0B' : 'rgba(255,255,255,0.45)'}
                strokeWidth={1.75}
              />
              <span className={styles.choiceTitle}>Avec budget</span>
              <span className={styles.choiceDesc}>
                Dimensionnez selon votre budget disponible
              </span>
            </button>

            <button
              type="button"
              className={`${styles.choiceCard} ${mode === 'sans_budget' ? styles.choiceBlue : ''}`}
              onClick={() => setMode('sans_budget')}
            >
              <Calculator
                size={38}
                color={mode === 'sans_budget' ? '#0EA5E9' : 'rgba(255,255,255,0.45)'}
                strokeWidth={1.75}
              />
              <span className={styles.choiceTitle}>Sans budget</span>
              <span className={styles.choiceDesc}>
                Découvrez le coût réel de votre installation
              </span>
            </button>
          </div>

          <button
            type="button"
            className={`${styles.btnContinuer} ${!mode ? styles.btnDisabled : ''}`}
            onClick={handleContinuer}
            disabled={!mode}
          >
            Continuer →
          </button>
        </div>
      </div>

      <Avatar />
    </div>
  )
}
