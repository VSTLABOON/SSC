import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import StudentLayout from './layouts/StudentLayout';
import TeacherLayout from './layouts/TeacherLayout';
import DirectorLayout from './layouts/DirectorLayout';

import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Schedule from './pages/Schedule';
import History from './pages/History';
import PendienteActivacion from './pages/PendienteActivacion';

import InicioMaestro from './pages/maestros/InicioMaestro';
import Clasespantalla from './pages/maestros/Clasespantalla';
import Asignacionestatus from './pages/maestros/Asignacionestatus';
import GenerarReporteM from './pages/maestros/GenerarReporteM';
import HistorialReportesM from './pages/maestros/HistorialReportesM';

import InicioDA from './pages/DirectivosYAsesores/InicioDA';
import GenerarReporteDA from './pages/DirectivosYAsesores/GenerarReporteDA';
import Historialreporteda from './pages/DirectivosYAsesores/Historialreporteda';
import GestionUsuarios from './pages/DirectivosYAsesores/GestionUsuarios';

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#DDE4E5', color: '#204785' }}>
      <div className="spinner" style={{ border: '4px solid rgba(0,0,0,0.1)', width: '36px', height: '36px', borderRadius: '50%', borderLeftColor: '#204785', animation: 'spin 1s linear infinite' }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function RequireAuth({ allowedRoles, children }: { allowedRoles: string[]; children: ReactNode }) {
  const { session, rol, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  // Usuario autenticado pero pendiente de activación — evitar loop con /login
  if (rol === 'pendiente') return <Navigate to="/pendiente-activacion" replace />;
  if (!rol || !allowedRoles.includes(rol)) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Ruta pública para cuentas pendientes de activación */}
        <Route path="/pendiente-activacion" element={<PendienteActivacion />} />

        <Route path="/alumno" element={
          <RequireAuth allowedRoles={['alumno', 'padre']}><StudentLayout /></RequireAuth>
        }>
          <Route path="inicio" element={<Home />} />
          <Route path="perfil" element={<Profile />} />
          <Route path="horario" element={<Schedule />} />
          <Route path="historial" element={<History />} />
        </Route>

        <Route path="/maestro" element={
          <RequireAuth allowedRoles={['docente']}><TeacherLayout /></RequireAuth>
        }>
          <Route path="inicio" element={<InicioMaestro />} />
          <Route path="clases" element={<Clasespantalla />} />
          <Route path="asistencia" element={<Asignacionestatus />} />
          <Route path="reporte" element={<GenerarReporteM />} />
          <Route path="historial" element={<HistorialReportesM />} />
        </Route>

        <Route path="/director" element={
          <RequireAuth allowedRoles={['directivo', 'orientador']}><DirectorLayout /></RequireAuth>
        }>
          <Route path="inicio" element={<InicioDA />} />
          <Route path="reporte" element={<GenerarReporteDA />} />
          <Route path="historial" element={<Historialreporteda />} />
          {/* Solo directivo — el orientador no tiene acceso a gestión de usuarios */}
          <Route path="usuarios" element={
            <RequireAuth allowedRoles={['directivo']}><GestionUsuarios /></RequireAuth>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}