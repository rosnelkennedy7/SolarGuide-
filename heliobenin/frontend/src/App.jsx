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
import Resultats from './pages/Resultats'
import Contacts from './pages/Contacts'
import QCMTech from './pages/tech/QCMTech'
import PaiementTech from './pages/tech/PaiementTech'
import LocalisationTech from './pages/tech/LocalisationTech'
import AppareilsTech from './pages/tech/AppareilsTech'
import Etude from './pages/tech/Etude'
import DevisTech from './pages/tech/DevisTech'
import RapportTech from './pages/tech/RapportTech'

export default function App() {
  return (
    <Routes>
      {/* Commun */}
      <Route path="/" element={<Accueil />} />
      <Route path="/inscription" element={<Inscription />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profil" element={<Profil />} />

      {/* Particulier */}
      <Route path="/paiement" element={<Paiement />} />
      <Route path="/qcm" element={<QCM />} />
      <Route path="/choix-mode" element={<ChoixMode />} />
      <Route path="/localisation" element={<Localisation />} />
      <Route path="/appareils" element={<Appareils />} />
      <Route path="/resultats" element={<Resultats />} />
      <Route path="/contacts" element={<Contacts />} />

      {/* Technicien */}
      <Route path="/qcm-tech" element={<QCMTech />} />
      <Route path="/paiement-tech" element={<PaiementTech />} />
      <Route path="/localisation-tech" element={<LocalisationTech />} />
      <Route path="/appareils-tech" element={<AppareilsTech />} />
      <Route path="/etude-tech" element={<Etude />} />
      <Route path="/devis-tech" element={<DevisTech />} />
      <Route path="/rapport-tech" element={<RapportTech />} />
    </Routes>
  )
}
