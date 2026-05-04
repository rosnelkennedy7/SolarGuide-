import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Plus, ChevronDown, Search, Check } from 'lucide-react'
import Navbar from '../../components/Navbar'
import vitreImg from '../../assets/images/vitre.png'
import AvatarTech from '../../components/AvatarTech'
import { APPAREILS } from '../../data/appareils'
import styles from './AppareilsTech.module.css'

/* ── Catégories ──────────────────────────────────────── */
const CATEGORIES = ['Eclairage','Climatisation','Audiovisuel','Cuisine','Informatique','Electroménager','Autre']
const CAT_ICONS  = { Eclairage:'🔆', Climatisation:'❄️', Audiovisuel:'📺', Cuisine:'🍳', Informatique:'💻', Electroménager:'🏠', Autre:'⚡' }

/* ── Heures par défaut ───────────────────────────────── */
function defaultHours(nom, categorie) {
  const n = (nom || '').toLowerCase()
  const c = (categorie || '').toLowerCase()
  if (n.includes('réfrigér') || n.includes('congél'))                             return { hJour: 12, hNuit: 12 }
  if (c === 'eclairage')                                                           return { hJour: 2,  hNuit: 6  }
  if (n.includes('ventil') || n.includes('climatiseur') || c === 'climatisation') return { hJour: 6,  hNuit: 4  }
  if (c === 'audiovisuel' || n.includes('télév'))                                 return { hJour: 3,  hNuit: 2  }
  if (c === 'informatique' || n.includes('ordinat') || n.includes('laptop'))      return { hJour: 8,  hNuit: 0  }
  if (n.includes('chargeur') || n.includes('téléphone'))                          return { hJour: 2,  hNuit: 2  }
  if (n.includes('fer ') || c === 'cuisine')                                      return { hJour: 1,  hNuit: 0  }
  return { hJour: 4, hNuit: 0 }
}

/* ── Sauvegarde technicien ───────────────────────────── */
const saveTechnicien = (newData) => {
  const existing = JSON.parse(localStorage.getItem('heliobenin_technicien') || '{}')
  localStorage.setItem('heliobenin_technicien', JSON.stringify({ ...existing, ...newData }))
}

/* ── Stepper 5 étapes ────────────────────────────────── */
const STEPS = ['Localisation', 'Appareils', 'Étude', 'Devis', 'Rapport']

function Stepper({ active }) {
  return (
    <div className={styles.stepper}>
      {STEPS.map((step, i) => (
        <div key={step} className={styles.stepWrap}>
          <div className={styles.stepItem}>
            <div className={`${styles.stepDot} ${i === active ? styles.stepDotActive : ''} ${i < active ? styles.stepDotDone : ''}`}>
              {i < active ? <Check size={20} strokeWidth={3} /> : i + 1}
            </div>
            <span className={`${styles.stepLabel} ${i === active ? styles.stepLabelActive : ''}`}>{step}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════ */
export default function AppareilsTech() {
  const navigate = useNavigate()

  const [rows,     setRows]     = useState([])
  const [openDdId, setOpenDdId] = useState(null)
  const [ddPos,    setDdPos]    = useState({ top: 0, left: 0 })
  const [ddSearch, setDdSearch] = useState('')

  /* ── Dérivés ── */
  const hasOverflow = rows.some(r => (r.hJour || 0) + (r.hNuit || 0) > 24)
  const canProceed  = rows.length > 0 && !hasOverflow

  /* ── Lignes ── */
  const updateRow = (id, key, val) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))
  const deleteRow = (id) =>
    setRows(prev => prev.filter(r => r.id !== id))

  const addLigne = () => {
    if (rows.length >= 50) return
    setRows(prev => [...prev, {
      id: Date.now() + Math.random(),
      nom: '', puissance: 0, quantite: 1,
      hJour: 4, hNuit: 0,
      typeCharge: 'Résistif', facteurPointe: 1.0,
      isManual: false,
    }])
  }

  const addManual = () => {
    if (rows.length >= 50) return
    setRows(prev => [...prev, {
      id: Date.now() + Math.random(),
      nom: '', puissance: 0, quantite: 1,
      hJour: 4, hNuit: 0,
      typeCharge: 'Manuel', facteurPointe: 1.0,
      isManual: true,
    }])
  }

  /* ── Dropdown ── */
  const openDd = (rowId, e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const left = Math.min(rect.left, window.innerWidth - 324)
    setOpenDdId(rowId)
    setDdPos({ top: rect.bottom + 4, left: Math.max(8, left) })
    setDdSearch('')
  }

  const closeDd = () => { setOpenDdId(null); setDdSearch('') }

  const selectApp = (app) => {
    const { hJour, hNuit } = defaultHours(app.nom, app.categorie)
    setRows(prev => prev.map(r =>
      r.id === openDdId
        ? { ...r, nom: app.nom, puissance: app.puissance, hJour, hNuit, typeCharge: app.typeCharge, facteurPointe: app.facteurPointe }
        : r
    ))
    closeDd()
  }

  /* ── Suivant ── */
  const handleSuivant = () => {
    if (!canProceed) return
    saveTechnicien({
      appareils: rows.map(r => ({
        nom:             r.nom,
        puissance:       r.puissance,
        quantite:        r.quantite,
        hJour:           r.hJour,
        hNuit:           r.hNuit,
        typeCharge:      r.typeCharge,
        facteurPointe:   r.facteurPointe,
        puissancePointe: Math.round(r.puissance * r.quantite * r.facteurPointe),
        wh_j:            r.puissance * r.quantite * ((r.hJour || 0) + (r.hNuit || 0)),
      })),
    })
    navigate('/etude-tech')
  }

  /* ── Filtre dropdown ── */
  const ddFiltered = APPAREILS.filter(a =>
    !ddSearch.trim() || a.nom.toLowerCase().includes(ddSearch.toLowerCase())
  )

  /* ════════════════════════════════════════════════════ */
  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />

      <Navbar stepper={<Stepper active={1} />} avatar={<AvatarTech />} />

      <div className={styles.inner}>

        {/* Boutons d'ajout — alignés à droite */}
        <div className={styles.actionsRow}>
          <button className={styles.btnAddLigne} onClick={addLigne}>
            <Plus size={16} /> Ajouter une ligne
          </button>
          <button className={styles.btnAddManual} onClick={addManual}>
            <Plus size={16} /> Ajouter manuellement
          </button>
        </div>

        {/* Tableau */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.th} ${styles.thApp}`}>Appareil</th>
                <th className={styles.th}>
                  <span>Puissance</span>
                  <span className={styles.thSub}>(W)</span>
                </th>
                <th className={styles.th}>Qté</th>
                <th className={styles.th}>
                  <span>Jour ☀️</span>
                  <span className={styles.thSub}>06h - 18h</span>
                </th>
                <th className={styles.th}>
                  <span>Nuit 🌙</span>
                  <span className={styles.thSub}>18h - 06h</span>
                </th>
                <th className={styles.th}>
                  <span>Coeff ⚡</span>
                  <span className={styles.thSub}>pointe</span>
                </th>
                <th className={styles.th}>
                  <span>P. Pointe</span>
                  <span className={styles.thSub}>(W) — calc.</span>
                </th>
                <th className={styles.th} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className={styles.emptyMsg}>
                    Ajoutez des appareils avec les boutons ci-dessus
                  </td>
                </tr>
              )}
              {rows.map(row => {
                const overflow        = (row.hJour || 0) + (row.hNuit || 0) > 24
                const puissancePointe = Math.round(row.puissance * row.quantite * row.facteurPointe)
                return (
                  <tr key={row.id} className={overflow ? styles.rowError : ''}>

                    {/* APPAREIL */}
                    <td className={`${styles.td} ${styles.tdApp}`}>
                      {row.isManual
                        ? <input
                            type="text"
                            value={row.nom}
                            onChange={e => updateRow(row.id, 'nom', e.target.value)}
                            placeholder="Nom de l'appareil"
                            className={styles.cellInput}
                          />
                        : <button
                            className={`${styles.ddTrigger} ${openDdId === row.id ? styles.ddTriggerOpen : ''}`}
                            onClick={e => openDd(row.id, e)}
                          >
                            {row.nom
                              ? <span className={styles.ddValue}>{row.nom}</span>
                              : <span className={styles.ddPlaceholder}>Choisir un appareil…</span>}
                            <ChevronDown
                              size={13}
                              className={`${styles.ddChevron} ${openDdId === row.id ? styles.ddChevronOpen : ''}`}
                            />
                          </button>
                      }
                    </td>

                    {/* PUISSANCE */}
                    <td className={styles.td}>
                      <input
                        type="number"
                        min={0}
                        value={row.puissance}
                        onChange={e => updateRow(row.id, 'puissance', +e.target.value)}
                        className={`${styles.cellInput} ${styles.cellNum}`}
                      />
                    </td>

                    {/* QTÉ */}
                    <td className={styles.td}>
                      <input
                        type="number"
                        min={1}
                        value={row.quantite}
                        onChange={e => updateRow(row.id, 'quantite', Math.max(1, +e.target.value))}
                        className={`${styles.cellInput} ${styles.cellNum}`}
                      />
                    </td>

                    {/* JOUR */}
                    <td className={styles.td}>
                      <input
                        type="number"
                        min={0.1}
                        max={24}
                        step={0.5}
                        placeholder="0.5"
                        value={row.hJour}
                        onChange={e => updateRow(row.id, 'hJour', +e.target.value)}
                        className={`${styles.cellInput} ${styles.cellNum} ${overflow ? styles.cellInputError : ''}`}
                      />
                    </td>

                    {/* NUIT */}
                    <td className={styles.td}>
                      <div className={styles.cellNuitWrap}>
                        <input
                          type="number"
                          min={0.1}
                          max={24}
                          step={0.5}
                          placeholder="0.5"
                          value={row.hNuit}
                          onChange={e => updateRow(row.id, 'hNuit', +e.target.value)}
                          className={`${styles.cellInput} ${styles.cellNum} ${overflow ? styles.cellInputError : ''}`}
                        />
                        {overflow && <span className={styles.overflowMsg}>Total &gt; 24h</span>}
                      </div>
                    </td>

                    {/* COEFF POINTE */}
                    <td className={styles.td}>
                      <input
                        type="number"
                        min={1}
                        step={0.05}
                        value={row.facteurPointe}
                        onChange={e => updateRow(row.id, 'facteurPointe', Math.max(1, +e.target.value))}
                        className={`${styles.cellInput} ${styles.cellCoeff}`}
                      />
                    </td>

                    {/* PUISSANCE POINTE — lecture seule */}
                    <td className={styles.td}>
                      <div className={styles.cellReadonly}>
                        {puissancePointe > 0 ? puissancePointe : '—'}
                      </div>
                    </td>

                    {/* ACTION */}
                    <td className={styles.td}>
                      <button className={styles.trashBtn} onClick={() => deleteRow(row.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Navigation */}
        <div className={styles.bottomNav}>
          <button className={styles.btnRetour} onClick={() => navigate('/localisation-tech')}>
            ‹ Retour
          </button>
          <button
            className={`${styles.btnSuivant} ${!canProceed ? styles.btnDisabled : ''}`}
            onClick={handleSuivant}
            disabled={!canProceed}
          >
            Suivant ›
          </button>
        </div>
      </div>

      {/* ── Dropdown global (position: fixed) ── */}
      {openDdId && (
        <>
          <div className={styles.ddBackdrop} onClick={closeDd} />
          <div className={styles.ddPanel} style={{ top: ddPos.top, left: ddPos.left }}>
            <div className={styles.ddSearchRow}>
              <Search size={14} color="rgba(255,255,255,0.4)" />
              <input
                type="text"
                value={ddSearch}
                onChange={e => setDdSearch(e.target.value)}
                placeholder="Rechercher un appareil…"
                className={styles.ddSearchInput}
                autoFocus
              />
            </div>
            <div className={styles.ddList}>
              {CATEGORIES.map(cat => {
                const items = ddFiltered.filter(a => a.categorie === cat)
                if (!items.length) return null
                return (
                  <div key={cat}>
                    <div className={styles.catHeader}>{CAT_ICONS[cat]} {cat}</div>
                    {items.map(a => (
                      <button key={a.id} className={styles.catItem} onClick={() => selectApp(a)}>
                        <span className={styles.catName}>{a.nom}</span>
                        <span className={styles.catPower}>{a.puissance} W</span>
                      </button>
                    ))}
                  </div>
                )
              })}
              {ddFiltered.length === 0 && (
                <p className={styles.noResult}>Aucun résultat pour « {ddSearch} »</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
