import { Link, NavLink } from 'react-router-dom'
import styles from './Navbar.module.css'

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        ☀️ HélioBénin
      </Link>
      <ul className={styles.links}>
        <li><NavLink to="/" end className={({ isActive }) => isActive ? styles.active : ''}>Accueil</NavLink></li>
        <li><NavLink to="/dimensionnement" className={({ isActive }) => isActive ? styles.active : ''}>Dimensionnement</NavLink></li>
        <li><NavLink to="/devis" className={({ isActive }) => isActive ? styles.active : ''}>Devis</NavLink></li>
        <li><NavLink to="/login" className={({ isActive }) => isActive ? styles.active : ''}>Connexion</NavLink></li>
      </ul>
    </nav>
  )
}
