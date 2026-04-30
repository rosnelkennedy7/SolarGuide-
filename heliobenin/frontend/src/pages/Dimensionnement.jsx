import { useState } from 'react'
import axios from 'axios'
import styles from './Dimensionnement.module.css'

const APPAREILS_DEFAUT = [
  { nom: 'Ampoule LED', puissance_w: 10, heures_par_jour: 6, quantite: 4 },
  { nom: 'Téléviseur', puissance_w: 60, heures_par_jour: 4, quantite: 1 },
  { nom: 'Chargeur téléphone', puissance_w: 10, heures_par_jour: 2, quantite: 2 },
]

export default function Dimensionnement() {
  const [appareils, setAppareils] = useState(APPAREILS_DEFAUT)
  const [autonomie, setAutonomie] = useState(2)
  const [tension, setTension] = useState(12)
  const [resultat, setResultat] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)

  const updateAppareil = (i, field, value) => {
    setAppareils(prev => prev.map((a, idx) =>
      idx === i ? { ...a, [field]: field === 'nom' ? value : Number(value) } : a
    ))
  }

  const ajouterAppareil = () => {
    setAppareils(prev => [...prev, { nom: '', puissance_w: 0, heures_par_jour: 1, quantite: 1 }])
  }

  const supprimerAppareil = (i) => {
    setAppareils(prev => prev.filter((_, idx) => idx !== i))
  }

  const calculer = async () => {
    setLoading(true)
    setErreur(null)
    try {
      const { data } = await axios.post('/api/dimensionnement/', {
        appareils,
        autonomie_jours: autonomie,
        tension_systeme: tension,
        type_installation: 'autonome',
      })
      setResultat(data)
    } catch (e) {
      setErreur(e.response?.data?.detail || 'Erreur lors du calcul')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <h1>Dimensionnement solaire</h1>
      <p className={styles.subtitle}>Renseignez vos appareils pour calculer votre système.</p>

      <section className={styles.form}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Appareil</th>
              <th>Puissance (W)</th>
              <th>Heures/jour</th>
              <th>Quantité</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {appareils.map((a, i) => (
              <tr key={i}>
                <td><input value={a.nom} onChange={e => updateAppareil(i, 'nom', e.target.value)} /></td>
                <td><input type="number" value={a.puissance_w} min="0" onChange={e => updateAppareil(i, 'puissance_w', e.target.value)} /></td>
                <td><input type="number" value={a.heures_par_jour} min="0" max="24" onChange={e => updateAppareil(i, 'heures_par_jour', e.target.value)} /></td>
                <td><input type="number" value={a.quantite} min="1" onChange={e => updateAppareil(i, 'quantite', e.target.value)} /></td>
                <td><button onClick={() => supprimerAppareil(i)} className={styles.del}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={ajouterAppareil} className={styles.addBtn}>+ Ajouter un appareil</button>

        <div className={styles.options}>
          <label>
            Autonomie (jours sans soleil)
            <select value={autonomie} onChange={e => setAutonomie(Number(e.target.value))}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} jour{n > 1 ? 's' : ''}</option>)}
            </select>
          </label>
          <label>
            Tension système
            <select value={tension} onChange={e => setTension(Number(e.target.value))}>
              <option value={12}>12V</option>
              <option value={24}>24V</option>
              <option value={48}>48V</option>
            </select>
          </label>
        </div>

        <button onClick={calculer} disabled={loading} className={styles.calcBtn}>
          {loading ? 'Calcul en cours…' : 'Calculer ☀️'}
        </button>
        {erreur && <p className={styles.erreur}>{erreur}</p>}
      </section>

      {resultat && (
        <section className={styles.result}>
          <h2>Résultats</h2>
          <div className={styles.cards}>
            <div className={styles.card}><span>{resultat.consommation_journaliere_wh.toFixed(0)} Wh</span><label>Consommation/jour</label></div>
            <div className={styles.card}><span>{resultat.nombre_panneaux} panneaux</span><label>{resultat.puissance_crete_panneaux_w} Wc installés</label></div>
            <div className={styles.card}><span>{resultat.nombre_batteries} batteries</span><label>{resultat.capacite_batterie_ah.toFixed(0)} Ah nécessaires</label></div>
            <div className={styles.card}><span>{resultat.puissance_onduleur_w.toFixed(0)} W</span><label>Onduleur requis</label></div>
          </div>
        </section>
      )}
    </main>
  )
}
