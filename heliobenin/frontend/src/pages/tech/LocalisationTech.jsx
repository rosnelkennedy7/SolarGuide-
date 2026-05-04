import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin } from 'lucide-react'
import Navbar from '../../components/Navbar'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import vitreImg from '../../assets/images/vitre.png'
import AvatarTech from '../../components/AvatarTech'
import styles from '../particulier/Localisation.module.css'

/* ── Limites strictes du Bénin ── */
const BENIN_CENTER = [9.3077, 2.3158]
const BENIN_BOUNDS = [[6.2, 0.8], [12.4, 3.8]]
const isInBenin = (lat, lng) => lat >= 6.2 && lat <= 12.4 && lng >= 0.8 && lng <= 3.8

/* ── Noms des mois NASA ── */
const MONTH_NAMES = {
  JAN: 'Janvier',  FEB: 'Février',   MAR: 'Mars',     APR: 'Avril',
  MAY: 'Mai',      JUN: 'Juin',      JUL: 'Juillet',  AUG: 'Août',
  SEP: 'Septembre',OCT: 'Octobre',   NOV: 'Novembre', DEC: 'Décembre',
}

/* ── Marqueur Google Maps style (orange + anneau blanc) ── */
const MARKER_ICON = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:24px;height:32px">
      <div style="
        position:absolute;top:4px;left:0;
        width:24px;height:24px;
        background:#F59E0B;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 3px 10px rgba(0,0,0,0.45);
      ">
        <div style="
          position:absolute;top:50%;left:50%;
          width:9px;height:9px;
          background:#fff;border-radius:50%;
          transform:translate(-50%,-50%) rotate(45deg);
        "></div>
      </div>
    </div>`,
  iconSize: [24, 32],
  iconAnchor: [12, 32],
})

/* ── Double-clic sur la carte ── */
function MapDblClickHandler({ onDblClick }) {
  useMapEvents({ dblclick: (e) => onDblClick(e.latlng) })
  return null
}

/* ── Vol vers une position ── */
function MapFlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target.latlng, target.zoom ?? 12)
  }, [target, map])
  return null
}

/* ── Stepper 5 étapes ── */
function Stepper({ active }) {
  const steps = ['Localisation', 'Appareils', 'Étude', 'Devis', 'Rapport']
  return (
    <div className={styles.stepper}>
      {steps.map((step, i) => (
        <div key={step} className={styles.stepWrap}>
          {i > 0 && (
            <div className={`${styles.stepLine} ${i <= active ? styles.stepLineDone : ''}`} />
          )}
          <div className={styles.stepItem}>
            <div className={`
              ${styles.stepDot}
              ${i === active ? styles.stepDotActive : ''}
              ${i < active  ? styles.stepDotDone   : ''}
            `}>
              {i < active ? '✓' : i + 1}
            </div>
            <span className={`${styles.stepLabel} ${i === active ? styles.stepLabelActive : ''}`}>
              {step}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Sauvegarde technicien ── */
const saveTechnicien = (newData) => {
  const existing = JSON.parse(localStorage.getItem('heliobenin_technicien') || '{}')
  localStorage.setItem('heliobenin_technicien', JSON.stringify({ ...existing, ...newData }))
}

/* ══════════════════════════════════════
   Page principale
══════════════════════════════════════ */
export default function LocalisationTech() {
  const navigate = useNavigate()

  const [position,     setPosition]     = useState(null)
  const [locality,     setLocality]     = useState(null)
  const [irradiation,  setIrradiation]  = useState(null)
  const [loadingIrr,   setLoadingIrr]   = useState(false)
  const [outOfBounds,  setOutOfBounds]  = useState(false)
  const [search,       setSearch]       = useState('')
  const [searchResults,setSearchResults]= useState([])
  const [showResults,  setShowResults]  = useState(false)
  const [flyTarget,    setFlyTarget]    = useState(null)

  /* ── NASA POWER — climatologie mensuelle ── */
  const fetchIrradiation = useCallback(async (lat, lng) => {
    setLoadingIrr(true)
    setIrradiation(null)
    try {
      const url =
        `https://power.larc.nasa.gov/api/temporal/climatology/point` +
        `?parameters=ALLSKY_SFC_SW_DWN&community=RE` +
        `&longitude=${lng.toFixed(4)}&latitude=${lat.toFixed(4)}&format=JSON`
      const res  = await fetch(url)
      const data = await res.json()
      const monthly = data.properties.parameter.ALLSKY_SFC_SW_DWN

      let minKey = null, minVal = Infinity
      Object.entries(monthly).forEach(([k, v]) => {
        if (k !== 'ANN' && typeof v === 'number' && v > 0 && v < minVal) {
          minVal = v; minKey = k
        }
      })
      setIrradiation({ value: minVal.toFixed(2), month: MONTH_NAMES[minKey] ?? minKey })
    } catch {
      setIrradiation({ value: '–', month: '' })
    } finally {
      setLoadingIrr(false)
    }
  }, [])

  /* ── Nominatim reverse geocode → nom de la localité ── */
  const fetchLocality = useCallback(async (lat, lng) => {
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json` +
        `&lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&zoom=16&addressdetails=1`,
        { headers: { 'Accept-Language': 'fr' } }
      )
      const data = await res.json()
      const addr = data.address ?? {}
      const parts = [
        addr.suburb ?? addr.neighbourhood ?? addr.village ?? addr.hamlet ?? addr.quarter,
        addr.city   ?? addr.town         ?? addr.municipality ?? addr.county,
      ].filter(Boolean)
      setLocality(
        parts.length > 0
          ? parts.join(', ')
          : data.display_name?.split(',').slice(0, 2).join(',').trim() ?? '–'
      )
    } catch {
      setLocality('–')
    }
  }, [])

  /* ── Double-clic sur la carte ── */
  const handleMapDblClick = useCallback(({ lat, lng }) => {
    if (!isInBenin(lat, lng)) { setOutOfBounds(true); return }
    setOutOfBounds(false)
    setPosition({ lat, lng })
    fetchIrradiation(lat, lng)
    fetchLocality(lat, lng)
  }, [fetchIrradiation, fetchLocality])

  /* ── Recherche Nominatim (limité au Bénin) ── */
  const handleSearch = async () => {
    if (!search.trim()) return
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=bj` +
        `&q=${encodeURIComponent(search)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'fr' } }
      )
      const data = await res.json()
      setSearchResults(data)
      setShowResults(true)
    } catch { /* silencieux */ }
  }

  const handleSelectResult = (item) => {
    const latlng = { lat: parseFloat(item.lat), lng: parseFloat(item.lon) }
    const addr   = item.address ?? {}
    const parts  = [
      addr.suburb ?? addr.neighbourhood ?? addr.village ?? addr.quarter,
      addr.city   ?? addr.town          ?? addr.municipality ?? addr.county,
    ].filter(Boolean)
    const name = parts.length > 0
      ? parts.join(', ')
      : item.display_name.split(',').slice(0, 2).join(',').trim()

    setSearch(item.display_name.split(',')[0])
    setShowResults(false)
    setSearchResults([])
    setOutOfBounds(false)
    setPosition(latlng)
    setLocality(name)
    fetchIrradiation(latlng.lat, latlng.lng)
    setFlyTarget({ latlng: [latlng.lat, latlng.lng], zoom: 12 })
  }

  /* ── Réinitialiser ── */
  const handleReset = () => {
    setPosition(null); setLocality(null); setIrradiation(null)
    setOutOfBounds(false); setSearch(''); setSearchResults([])
    setShowResults(false); setFlyTarget(null)
  }

  /* ── Suivant ── */
  const handleSuivant = () => {
    if (!position) return
    saveTechnicien({
      localisation: {
        latitude:    position.lat,
        longitude:   position.lng,
        irradiation: irradiation ? parseFloat(irradiation.value) : null,
        moisMin:     irradiation ? irradiation.month : null,
      },
    })
    navigate('/appareils-tech')
  }

  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />

      <Navbar stepper={<Stepper active={0} />} avatar={<AvatarTech />} />

      <div className={styles.inner}>

        {/* Barre de recherche */}
        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <Search size={17} color="#F59E0B" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Rechercher une ville au Bénin…"
              className={styles.searchInput}
            />
          </div>
          <button className={styles.searchBtn} onClick={handleSearch} title="Rechercher">
            <Search size={17} />
          </button>
        </div>

        {/* Dropdown résultats */}
        {showResults && searchResults.length > 0 && (
          <div className={styles.dropdown}>
            {searchResults.map(r => (
              <button
                key={r.place_id}
                className={styles.dropdownItem}
                onClick={() => handleSelectResult(r)}
              >
                <MapPin size={13} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{r.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Carte Leaflet — double-clic pour sélectionner */}
        <div className={styles.mapWrap}>
          <MapContainer
            center={BENIN_CENTER}
            zoom={10}
            minZoom={6}
            maxZoom={18}
            maxBounds={BENIN_BOUNDS}
            maxBoundsViscosity={1.0}
            doubleClickZoom={false}
            scrollWheelZoom
            className={styles.map}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapDblClickHandler onDblClick={handleMapDblClick} />
            {flyTarget && <MapFlyTo target={flyTarget} />}
            {position && (
              <Marker position={[position.lat, position.lng]} icon={MARKER_ICON} />
            )}
          </MapContainer>
        </div>

        {/* Messages sous la carte */}
        {outOfBounds && (
          <div className={styles.outOfBounds}>
            ⚠️ Veuillez sélectionner un point au Bénin
          </div>
        )}
        {!position && !outOfBounds && (
          <p className={styles.hint}>
            Double-cliquez sur la carte pour sélectionner votre emplacement
          </p>
        )}

        {/* ── 4 cartes info ── */}
        <div className={styles.infoSection}>
          <div className={styles.localityCard}>
            <MapPin size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
            <span className={`${styles.localityText} ${!locality ? styles.localityEmpty : ''}`}>
              {locality ?? 'Aucune localité sélectionnée'}
            </span>
          </div>

          <div className={styles.infoRow}>
            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>Latitude</span>
              <span className={`${styles.infoValue} ${position ? styles.infoOrange : styles.infoDash}`}>
                {position ? position.lat.toFixed(4) : '–'}
              </span>
            </div>
            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>Longitude</span>
              <span className={`${styles.infoValue} ${position ? styles.infoBlue : styles.infoDash}`}>
                {position ? position.lng.toFixed(4) : '–'}
              </span>
            </div>
            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>Irradiation</span>
              {loadingIrr ? (
                <span className={styles.spinner} />
              ) : irradiation ? (
                <>
                  <span className={`${styles.infoValue} ${styles.infoOrange}`}>
                    {irradiation.value} kWh/m²/j
                  </span>
                  {irradiation.month && (
                    <span className={styles.infoMonth}>{irradiation.month}</span>
                  )}
                </>
              ) : (
                <span className={`${styles.infoValue} ${styles.infoDash}`}>–</span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation bas */}
        <div className={styles.bottomNav}>
          <button className={styles.btnRetour} onClick={() => navigate('/paiement-tech')}>
            ‹ Retour
          </button>
          <button className={styles.btnReset} onClick={handleReset}>
            Réinitialiser
          </button>
          <button
            className={`${styles.btnSuivant} ${!position ? styles.btnDisabled : ''}`}
            onClick={handleSuivant}
            disabled={!position}
          >
            Suivant ›
          </button>
        </div>
      </div>
    </div>
  )
}
