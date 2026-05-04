import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Plus, ChevronDown, Search, Check } from 'lucide-react'
import Navbar from '../../components/Navbar'
import vitreImg from '../../assets/images/vitre.png'
import Avatar from '../../components/Avatar'
import { saveParticulier, getParticulier } from '../../utils/storage'
import { APPAREILS } from '../../data/appareils'
import styles from './Appareils.module.css'

/* ── Catégories ─────────────────────────────────────── */
const CATEGORIES = ['Eclairage','Climatisation','Audiovisuel','Cuisine','Informatique','Electroménager','Autre']
const CAT_ICONS  = { Eclairage:'🔆', Climatisation:'❄️', Audiovisuel:'📺', Cuisine:'🍳', Informatique:'💻', Electroménager:'🏠', Autre:'⚡' }

/* ── Heures par défaut ───────────────────────────────── */
function defaultHours(nom, categorie) {
  const n = (nom || '').toLowerCase()
  const c = (categorie || '').toLowerCase()
  if (n.includes('réfrigér') || n.includes('congél'))                              return { hJour: 12, hNuit: 12 }
  if (c === 'eclairage')                                                            return { hJour: 2,  hNuit: 6  }
  if (n.includes('ventil') || n.includes('climatiseur') || c === 'climatisation')  return { hJour: 6,  hNuit: 4  }
  if (c === 'audiovisuel' || n.includes('télév'))                                  return { hJour: 3,  hNuit: 2  }
  if (c === 'informatique' || n.includes('ordinat') || n.includes('laptop'))       return { hJour: 8,  hNuit: 0  }
  if (n.includes('chargeur') || n.includes('téléphone'))                           return { hJour: 2,  hNuit: 2  }
  if (n.includes('fer ') || c === 'cuisine')                                       return { hJour: 1,  hNuit: 0  }
  return { hJour: 4, hNuit: 0 }
}

/* ── Formatage budget (séparateur milliers espace) ─── */
function fmtBudget(raw) {
  const digits = (raw || '').toString().replace(/\D/g, '')
  if (!digits) return ''
  return parseInt(digits, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/* ── Stepper ─────────────────────────────────────────── */
const STEPS = ['Localisation', 'Appareils', 'Résultats', 'Contacts']

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
export default function Appareils() {
  const navigate = useNavigate()
  const stored = getParticulier()
  const mode   = stored.mode || 'sans_budget'

  const [rows,         setRows]         = useState([])
  const [budgetDisplay,setBudgetDisplay] = useState('')

  /* Dropdown global : un seul ouvert à la fois */
  const [openDdId, setOpenDdId] = useState(null)
  const [ddPos,    setDdPos]    = useState({ top: 0, left: 0 })
  const [ddSearch, setDdSearch] = useState('')

  /* ── Dérivés ── */
  const budgetNum   = parseInt(budgetDisplay.replace(/\s/g, ''), 10) || 0
  const hasOverflow = rows.some(r => (r.hJour || 0) + (r.hNuit || 0) > 24)
  const budgetOk    = mode !== 'avec_budget' || budgetNum >= 200000
  const canProceed  = rows.length > 0 && !hasOverflow && budgetOk

  /* ── Lignes ── */
  const updateRow = (id, key, val) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))
  const deleteRow = (id) =>
    setRows(prev => prev.filter(r => r.id !== id))

  const addLigne = () => {
    if (rows.length >= 50) return
    setRows(prev => [...prev, { id: Date.now() + Math.random(), nom: '', puissance: 0, quantite: 1, hJour: 4, hNuit: 0, typeCharge: 'Résistif', facteurPointe: 1.0, isManual: false }])
  }

  const addManual = () => {
    if (rows.length >= 50) return
    setRows(prev => [...prev, { id: Date.now() + Math.random(), nom: '', puissance: 0, quantite: 1, hJour: 4, hNuit: 0, typeCharge: 'Manuel', facteurPointe: 1.0, isManual: true }])
  }

  /* ── Dropdown ── */
  const openDd = (rowId, e) => {
    const rect  = e.currentTarget.getBoundingClientRect()
    const left  = Math.min(rect.left, window.innerWidth - 324)
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

  /* ── Budget ── */
  const handleBudgetChange = (e) => setBudgetDisplay(fmtBudget(e.target.value))

  /* ── Suivant ── */
  const handleSuivant = () => {
    if (!canProceed) return
    saveParticulier({
      budget: mode === 'avec_budget' ? budgetNum : null,
      appareils: rows.map(r => ({
        nom:           r.nom,
        puissance:     r.puissance,
        quantite:      r.quantite,
        hJour:         r.hJour,
        hNuit:         r.hNuit,
        wh_j:          r.puissance * r.quantite * ((r.hJour || 0) + (r.hNuit || 0)),
        typeCharge:    r.typeCharge,
        facteurPointe: r.facteurPointe,
      })),
    })
    navigate('/resultats')
  }

  /* ── Filtre dropdown ── */
  const ddFiltered = APPAREILS.filter(a =>
    !ddSearch.trim() || a.nom.toLowerCase().includes(ddSearch.toLowerCase())
  )

  /* ════════════════════════════════════════════════════ */
  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />

      <Navbar stepper={<Stepper active={1} />} avatar={<Avatar />} />

      <div className={styles.inner}>

        {/* Budget conditionnel */}
        {mode === 'avec_budget' && (
          <div className={styles.budgetSection}>
            <label className={styles.budgetLabel}>Votre budget disponible</label>
            <div className={`${styles.budgetInputWrap} ${budgetDisplay && budgetNum < 200000 ? styles.budgetError : ''}`}>
              <input
                type="text"
                inputMode="numeric"
                value={budgetDisplay}
                onChange={handleBudgetChange}
                placeholder="200 000"
                className={styles.budgetInput}
              />
              <span className={styles.budgetCurrency}>FCFA</span>
            </div>
            <p className={`${styles.budgetHint} ${budgetDisplay && budgetNum < 200000 ? styles.budgetHintError : ''}`}>
              Budget minimum requis : 200 000 FCFA
            </p>
          </div>
        )}

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
                <th className={styles.th}>W</th>
                <th className={styles.th}>Qté</th>
                <th className={styles.th}>
                  <span>Jour ☀️</span>
                  <span className={styles.thSub}>06h - 18h</span>
                </th>
                <th className={styles.th}>
                  <span>Nuit 🌙</span>
                  <span className={styles.thSub}>18h - 06h</span>
                </th>
                <th className={styles.th} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.emptyMsg}>
                    Ajoutez des appareils avec les boutons ci-dessus
                  </td>
                </tr>
              )}
              {rows.map(row => {
                const overflow = (row.hJour || 0) + (row.hNuit || 0) > 24
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
          <button className={styles.btnRetour} onClick={() => navigate('/localisation')}>
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
            {/* Recherche */}
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

            {/* Liste groupée */}
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
