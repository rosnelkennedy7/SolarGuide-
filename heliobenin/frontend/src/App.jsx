import { Routes, Route } from 'react-router-dom'
import Accueil from './pages/Accueil'
import Inscription from './pages/Inscription'
import Login from './pages/Login'
import Profil from './pages/Profil'
import Paiement from './pages/Paiement'
import ChoixMode from './pages/particulier/ChoixMode'
import QCM from './pages/particulier/QCM'
import Localisation from './pages/particulier/Localisation'
import Appareils from './pages/particulier/Appareils'
import Dimensionnement from './pages/Dimensionnement'
import Devis from './pages/Devis'
import QCMTech from './pages/tech/QCMTech'
import PaiementTech from './pages/tech/PaiementTech'
import LocalisationTech from './pages/tech/LocalisationTech'
import AppareilsTech from './pages/tech/AppareilsTech'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Accueil />} />
      <Route path="/inscription" element={<Inscription />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profil" element={<Profil />} />
      <Route path="/paiement" element={<Paiement />} />
      <Route path="/choix-mode" element={<ChoixMode />} />
      <Route path="/qcm" element={<QCM />} />
      <Route path="/localisation" element={<Localisation />} />
      <Route path="/appareils" element={<Appareils />} />
      <Route path="/dimensionnement" element={<Dimensionnement />} />
      <Route path="/devis" element={<Devis />} />
      <Route path="/qcm-tech" element={<QCMTech />} />
      <Route path="/paiement-tech" element={<PaiementTech />} />
      <Route path="/localisation-tech" element={<LocalisationTech />} />
      <Route path="/appareils-tech" element={<AppareilsTech />} />
    </Routes>
  )
}
