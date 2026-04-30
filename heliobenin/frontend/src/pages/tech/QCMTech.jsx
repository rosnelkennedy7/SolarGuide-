import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, CheckCircle, XCircle } from 'lucide-react'
import vitreImg from '../../assets/images/vitre.png'
import AvatarTech from '../../components/AvatarTech'
import styles from './QCMTech.module.css'

const questions = [
  {
    id: 1,
    question: "Un panneau solaire produit quel type de courant ?",
    options: [
      "Courant alternatif (AC)",
      "Courant continu (DC)",
      "Les deux à la fois",
      "Ça dépend de l'ensoleillement",
    ],
    correct: 1,
  },
  {
    id: 2,
    question: "Quelle est la différence entre un onduleur et un régulateur de charge ?",
    options: [
      "C'est le même équipement",
      "L'onduleur convertit DC en AC, le régulateur protège les batteries contre la surcharge",
      "Le régulateur convertit DC en AC, l'onduleur stocke l'énergie",
      "L'onduleur mesure l'irradiation, le régulateur stabilise la tension",
    ],
    correct: 1,
  },
  {
    id: 3,
    question: "Quelle est la première règle de sécurité avant toute intervention sur une installation électrique solaire ?",
    options: [
      "Porter des équipements de protection et couper toutes les sources d'énergie",
      "Vérifier que le client est absent",
      "Couper uniquement le disjoncteur principal AC",
      "Tester les appareils un par un sous tension",
    ],
    correct: 0,
  },
  {
    id: 4,
    question: "Quelle mauvaise pratique réduit le plus rapidement la durée de vie d'une batterie solaire ?",
    options: [
      "La charger complètement chaque jour",
      "La décharger régulièrement en dessous de sa limite recommandée",
      "La stocker dans un endroit frais",
      "L'utiliser avec un régulateur MPPT",
    ],
    correct: 1,
  },
  {
    id: 5,
    question: "Dans une installation solaire, quelle couleur de câble utilise-t-on pour le positif DC ?",
    options: [
      "Noir",
      "Bleu",
      "Rouge",
      "Vert/jaune",
    ],
    correct: 2,
  },
  {
    id: 6,
    question: "Un client consomme 2 000 Wh par jour. Combien de panneaux de 400 Wc faut-il si l'irradiation moyenne est de 4h/j ?",
    options: [
      "1 panneau",
      "2 panneaux",
      "4 panneaux",
      "5 panneaux",
    ],
    correct: 1,
  },
]

export default function QCMTech() {
  const navigate = useNavigate()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selected,        setSelected]        = useState(null)
  const [score,           setScore]           = useState(0)
  const [done,            setDone]            = useState(false)
  const [finalScore,      setFinalScore]      = useState(0)

  const q        = questions[currentQuestion]
  const isLast   = currentQuestion === questions.length - 1
  const progress = ((currentQuestion + 1) / questions.length) * 100

  const handleSelect = (idx) => {
    if (selected !== null) return
    setSelected(idx)
  }

  const handleNext = () => {
    if (selected === null) return
    const newScore = selected === q.correct ? score + 1 : score
    if (isLast) {
      setFinalScore(newScore)
      setDone(true)
    } else {
      setScore(newScore)
      setCurrentQuestion(prev => prev + 1)
      setSelected(null)
    }
  }

  const handleRetry = () => {
    setCurrentQuestion(0)
    setScore(0)
    setSelected(null)
    setDone(false)
    setFinalScore(0)
  }

  /* ── Écran résultat ── */
  if (done) {
    const success = finalScore >= 4
    return (
      <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
        <div className={styles.overlay} />
        <AvatarTech />
        <div className={styles.content}>
          <div className={`${styles.card} ${styles.resultCard}`}>
            <div className={styles.cardLogo}>
              <Sun size={26} color="#F59E0B" strokeWidth={2} />
              <span className={styles.logoText}>
                <span className={styles.logoHelio}>Hélio</span>
                <span className={styles.logoBenin}>Bénin</span>
              </span>
            </div>
            {success
              ? <CheckCircle size={72} color="#22c55e" strokeWidth={1.5} className={styles.resultIcon} />
              : <XCircle    size={72} color="#ef4444" strokeWidth={1.5} className={styles.resultIcon} />
            }
            <h2 className={success ? styles.resultTitleSuccess : styles.resultTitleFail}>
              {success ? 'Test validé !' : 'Score insuffisant'}
            </h2>
            <p className={styles.resultScore}>
              Vous avez obtenu <strong>{finalScore}/6</strong> — Score minimum requis : 4/6
            </p>
            {!success && (
              <p className={styles.resultHint}>Vous pouvez repasser le test.</p>
            )}
            <button
              className={styles.btnNext}
              onClick={success ? () => navigate('/paiement-tech') : handleRetry}
            >
              {success ? 'Continuer vers le paiement' : 'Repasser le test'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Écran question ── */
  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />
      <AvatarTech />
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

          {/* Progression */}
          <p className={styles.progressLabel}>Question {currentQuestion + 1} / {questions.length}</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>

          {/* Question */}
          <p className={styles.questionText}>{q.question}</p>

          {/* Options */}
          <div className={styles.options}>
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                className={`${styles.option} ${selected === idx ? styles.optionSelected : ''}`}
                onClick={() => handleSelect(idx)}
              >
                <span className={`${styles.optionCircle} ${selected === idx ? styles.optionCircleSelected : ''}`} />
                <span className={styles.optionText}>{opt}</span>
              </button>
            ))}
          </div>

          {/* Bouton suivant — apparaît après sélection */}
          {selected !== null && (
            <button className={styles.btnNext} onClick={handleNext}>
              {isLast ? 'Voir le résultat' : 'Suivant →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
