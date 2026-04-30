import { useState } from 'react'
import axios from 'axios'
import styles from './Devis.module.css'

export default function Devis() {
  const [form, setForm] = useState({ client_nom: '', client_email: '', client_telephone: '', localite: 'Cotonou' })
  const [resultat, setResultat] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const soumettre = async (e) => {
    e.preventDefault()
    if (!resultat) return setErreur('Veuillez d\'abord effectuer un dimensionnement.')
    setLoading(true)
    setErreur(null)
    try {
      const { data } = await axios.post('/api/devis/', { ...form, resultat })
      alert(`Devis créé ! Total : ${data.montant_total_fcfa.toLocaleString('fr-FR')} FCFA`)
    } catch (e) {
      setErreur(e.response?.data?.detail || 'Erreur lors de la création du devis')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <h1>Demande de devis</h1>
      <p className={styles.info}>
        Effectuez d'abord un <a href="/dimensionnement">dimensionnement</a>, puis remplissez ce formulaire.
      </p>
      <form onSubmit={soumettre} className={styles.form}>
        <label>Nom complet<input required value={form.client_nom} onChange={e => update('client_nom', e.target.value)} /></label>
        <label>Email<input type="email" required value={form.client_email} onChange={e => update('client_email', e.target.value)} /></label>
        <label>Téléphone<input value={form.client_telephone} onChange={e => update('client_telephone', e.target.value)} /></label>
        <label>Localité
          <select value={form.localite} onChange={e => update('localite', e.target.value)}>
            {['Cotonou','Porto-Novo','Parakou','Abomey-Calavi','Bohicon','Natitingou'].map(v =>
              <option key={v} value={v}>{v}</option>
            )}
          </select>
        </label>
        {erreur && <p className={styles.erreur}>{erreur}</p>}
        <button type="submit" disabled={loading} className={styles.btn}>
          {loading ? 'Envoi…' : 'Envoyer la demande'}
        </button>
      </form>
    </main>
  )
}
