import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, User, LogOut } from 'lucide-react'
import styles from './Avatar.module.css'

export default function Avatar() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const raw  = localStorage.getItem('helio_user')
  const user = raw ? JSON.parse(raw) : { prenom: 'Jean', nom: 'Doe', email: 'jean@exemple.bj', role: 'particulier' }
  const nomInitial = (user.nom?.[0] || 'U').toUpperCase()
  const fullName   = [user.prenom, user.nom].filter(Boolean).join(' ')
  const email      = user.email || ''
  const role       = user.role  || 'particulier'

  const roleLabel = role === 'admin'      ? 'Administrateur'
                  : role === 'technicien' ? 'Technicien'
                  : 'Particulier'

  const go = (path) => { setOpen(false); navigate(path) }

  return (
    <div className={styles.wrap}>
      <button
        className={styles.avatarBtn}
        onClick={() => setOpen(o => !o)}
        title="Mon compte"
        aria-label="Menu utilisateur"
      >
        <div className={styles.circle}>{nomInitial}</div>
        <span className={styles.fullName}>{fullName}</span>
        <ChevronDown
          size={15}
          className={`${styles.arrow} ${open ? styles.arrowOpen : ''}`}
          color="rgba(255,255,255,0.75)"
        />
      </button>

      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.menu}>
            {/* En-tête riche */}
            <div className={styles.menuHeader}>
              <div className={styles.headerCircle}>{nomInitial}</div>
              <div className={styles.headerInfo}>
                <span className={styles.headerName}>{fullName}</span>
                <span className={styles.headerEmail}>{email}</span>
                <span className={styles.badge}>{roleLabel}</span>
              </div>
            </div>
            <div className={styles.divider} />
            <button className={styles.menuItem} onClick={() => go('/profil')}>
              <User size={15} /> Mon profil
            </button>
            <div className={styles.divider} />
            <button className={`${styles.menuItem} ${styles.logout}`} onClick={() => go('/')}>
              <LogOut size={15} /> Se déconnecter
            </button>
          </div>
        </>
      )}
    </div>
  )
}
