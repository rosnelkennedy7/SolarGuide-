import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun } from 'lucide-react'
import vitreImg from '../../assets/images/vitre.png'
import Avatar from '../../components/Avatar'
import { saveParticulier } from '../../utils/storage'
import styles from './QCM.module.css'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function QCM() {
  const navigate = useNavigate()
  const [q1, setQ1] = useState(null)   // 'oui' | 'non'
  const [q2, setQ2] = useState(null)   // 'sbee' | 'solaire'
  const [heures, setHeures] = useState(new Set())

  const saveAndNavigate = (hasSBEE, source, heuresList) => {
    if (!hasSBEE || source === 'solaire') {
      saveParticulier({ cas: 'B', grille_coupure: null })
    } else {
      saveParticulier({
        cas: 'A',
        grille_coupure: {
          total_heures: heuresList.length,
          heures: heuresList,
        },
      })
    }
    navigate('/localisation')
  }

  const handleQ1 = (val) => {
    setQ1(val)
    setQ2(null)
    setHeures(new Set())
    if (val === 'non') saveAndNavigate(false, null, [])
  }

  const handleQ2 = (val) => {
    setQ2(val)
    if (val === 'solaire') saveAndNavigate(true, 'solaire', [])
  }

  const toggleHeure = (h) => {
    setHeures(prev => {
      const next = new Set(prev)
      if (next.has(h)) next.delete(h)
      else next.add(h)
      return next
    })
  }

  const handleValider = () => {
    const sorted = [...heures].sort((a, b) => a - b)
    saveAndNavigate(true, 'sbee', sorted)
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

          {/* Q1 */}
          <div className={styles.question}>
            <p className={styles.qLabel}>Question 1 / {q1 === 'oui' ? (q2 === 'sbee' ? '3' : '2') : '1'}</p>
            <p className={styles.qText}>Avez-vous la SBEE chez vous ?</p>
            <div className={styles.btnGroup}>
              <button
                className={`${styles.qBtn} ${q1 === 'oui' ? styles.qBtnActive : ''}`}
                onClick={() => handleQ1('oui')}
              >
                Oui
              </button>
              <button
                className={`${styles.qBtn} ${q1 === 'non' ? styles.qBtnActive : ''}`}
                onClick={() => handleQ1('non')}
              >
                Non
              </button>
            </div>
          </div>

          {/* Q2 */}
          {q1 === 'oui' && (
            <div className={styles.question}>
              <p className={styles.qLabel}>Question 2</p>
              <p className={styles.qText}>Quelle source voulez-vous en priorité ?</p>
              <div className={styles.btnGroup}>
                <button
                  className={`${styles.qBtn} ${q2 === 'sbee' ? styles.qBtnActive : ''}`}
                  onClick={() => handleQ2('sbee')}
                >
                  SBEE principale
                </button>
                <button
                  className={`${styles.qBtn} ${q2 === 'solaire' ? styles.qBtnActive : ''}`}
                  onClick={() => handleQ2('solaire')}
                >
                  Solaire principale
                </button>
              </div>
            </div>
          )}

          {/* Grille 24h */}
          {q1 === 'oui' && q2 === 'sbee' && (
            <div className={styles.grille}>
              <p className={styles.qLabel}>Question 3</p>
              <p className={styles.grilleTitle}>
                Sélectionnez les heures où la SBEE coupe souvent
              </p>
              <div className={styles.hourGrid}>
                {HOURS.map(h => (
                  <button
                    key={h}
                    type="button"
                    className={`${styles.hourCell} ${heures.has(h) ? styles.hourActive : ''}`}
                    onClick={() => toggleHeure(h)}
                  >
                    {String(h).padStart(2, '0')}h
                  </button>
                ))}
              </div>
              {heures.size > 0 && (
                <p className={styles.heuresCount}>
                  {heures.size} heure{heures.size > 1 ? 's' : ''} sélectionnée{heures.size > 1 ? 's' : ''}
                </p>
              )}
              <button className={styles.btnValider} onClick={handleValider}>
                Valider →
              </button>
            </div>
          )}
        </div>
      </div>

      <Avatar />
    </div>
  )
}
