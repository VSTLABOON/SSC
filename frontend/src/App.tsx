import { useState } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Schedule from './pages/Schedule';
import History from './pages/History';
import InicioMaestro from './pages/maestros/InicioMaestro';
import Clasespantalla from './pages/maestros/Clasespantalla';
import Asignacionestatus from './pages/maestros/Asignacionestatus';
import GenerarReporteM from './pages/maestros/GenerarReporteM';
import HistorialReportesM from './pages/maestros/HistorialReportesM';
import InicioDA from './pages/DirectivosYAsesores/InicioDA';
import GenerarReporteDA from './pages/DirectivosYAsesores/GenerarReporteDA';
import Historialreporteda from './pages/DirectivosYAsesores/Historialreporteda';




import './App.css';

// ---------------------------------------------------------------------------
// Interfaces de extensión para cumplir estrictamente con ESLint y TypeScript
// ---------------------------------------------------------------------------
interface ExtendedLoginProps {
  onLoginSuccess: () => void;
}

interface ExtendedHomeProps {
  activeNavId?: string;
  onLogout: () => void;
  onNavigate: (screen: Screen) => void;
  onDownloadReport?: () => void;
}

interface ExtendedScreenProps {
  activeNavId?: string;
  onLogout: () => void;
  onNavigate: (screen: Screen) => void;
}

// Forzamos el tipado correcto de los componentes importados de forma segura
const TypedLogin = Login as React.ComponentType<ExtendedLoginProps>;
const TypedHome = Home as React.ComponentType<ExtendedHomeProps>;
const TypedProfile = Profile as React.ComponentType<ExtendedScreenProps>;
const TypedSchedule = Schedule as React.ComponentType<ExtendedScreenProps>;
const TypedHistory = History as React.ComponentType<ExtendedScreenProps>;

// ---------------------------------------------------------------------------
// Definimos los nombres de las pantallas válidas.
//
// IMPORTANTE: estos valores deben coincidir EXACTAMENTE con los `id` que
// usa cada pantalla en su propio `navItems` (Home/Profile/Schedule/History
// ya usan 'inicio' | 'perfil' | 'horario' | 'historial' en español).
// Antes este tipo usaba valores en inglés ('home', 'profile', etc.), lo
// que rompía la navegación: cada pantalla llamaba a
// onNavigate?.(item.id) con el id en español, pero App.tsx solo sabía
// comparar contra los valores en inglés, así que ninguna coincidía.
// ---------------------------------------------------------------------------
type Screen =
  | 'login'
  | 'home'
  | 'profile'
  | 'schedule'
  | 'history'
  | 'inicio'
  | 'perfil'
  | 'horario'
  | 'historial'
  | 'InicioMaestro'
  | 'Clasespantalla'
  | 'Asignacionestatus'
  | 'GenerarReporteM'
  | 'HistorialReportesM'
  | 'InicioDA'
  | 'GenerarReporteDA'
  | 'Historialreporteda';
  

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');

  const handleLoginSuccess = () => {
    setCurrentScreen('InicioMaestro'); // Cambia a la pantalla de inicio después del login
  };

  const handleLogout = () => {
    setCurrentScreen('login');
  };

  return (
    <div className="app-container">
      {/* Renderizado condicional basado en tipos estrictos */}
      {currentScreen === 'login' && (
        <TypedLogin onLoginSuccess={handleLoginSuccess} />
      )}

      {currentScreen === 'home' && (
        <TypedHome
          activeNavId="home"
          onLogout={handleLogout}
          onNavigate={setCurrentScreen}
        />
      )}

      {currentScreen === 'schedule' && (
        <TypedSchedule
          activeNavId="schedule"
          onLogout={handleLogout}
          onNavigate={setCurrentScreen}
        />
      )}

      {currentScreen === 'profile' && (
        <TypedProfile
          activeNavId="profile"
          onLogout={handleLogout}
          onNavigate={setCurrentScreen}
        />
      )}

      {currentScreen === 'history' && (
        <TypedHistory
          activeNavId="history"
          onLogout={handleLogout}
          onNavigate={setCurrentScreen}
        />
      )}
          // ---------------------------------------------------------------------------
          // Interfaces de Maestro chavalin
          // ---------------------------------------------------------------------------
        {currentScreen === 'InicioMaestro' && (
  <InicioMaestro 
  onNavigate={setCurrentScreen}
  />
)}

{currentScreen === 'Clasespantalla' && (
  <Clasespantalla
  onNavigate={setCurrentScreen}
  />
)}

{currentScreen === 'Asignacionestatus' && (
  <Asignacionestatus 
  onNavigate={setCurrentScreen}
  
  />
)}


{currentScreen === 'GenerarReporteM' && (
  <GenerarReporteM
  onNavigate={setCurrentScreen}
  />
)}

{currentScreen === 'HistorialReportesM' && (
  <HistorialReportesM 
  onNavigate={setCurrentScreen}
  />
)}

// ---------------------------------------------------------------------------
// Interfaces de Directivos y Asesores chavito chaval chavalin tilin
// ---------------------------------------------------------------------------  

{currentScreen === 'InicioDA' && (
  <InicioDA
    onNavigate={setCurrentScreen}
  />
)}

{currentScreen === 'GenerarReporteDA' && (
  <GenerarReporteDA 
  onNavigate={setCurrentScreen}
  />
)}

{currentScreen === 'Historialreporteda' && (
  <Historialreporteda 
  onNavigate={setCurrentScreen}
  />
)}


    </div>
  );
}

export default App;