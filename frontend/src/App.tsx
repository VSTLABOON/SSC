import React, { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import StudentLayout from './layouts/StudentLayout';
import TeacherLayout from './layouts/TeacherLayout';
import DirectorLayout from './layouts/DirectorLayout';

import Login from './pages/Login';
import PendienteActivacion from './pages/PendienteActivacion';

// Dynamic lazy imports para code-splitting de rutas
const Home = lazy(() => import('./pages/Home'));
const Profile = lazy(() => import('./pages/Profile'));
const Schedule = lazy(() => import('./pages/Schedule'));
const History = lazy(() => import('./pages/History'));

const InicioMaestro = lazy(() => import('./pages/maestros/InicioMaestro'));
const Clasespantalla = lazy(() => import('./pages/maestros/Clasespantalla'));
const Asignacionestatus = lazy(() => import('./pages/maestros/Asignacionestatus'));
const GenerarReporteM = lazy(() => import('./pages/maestros/GenerarReporteM'));
const HistorialReportesM = lazy(() => import('./pages/maestros/HistorialReportesM'));

const InicioDA = lazy(() => import('./pages/DirectivosYAsesores/InicioDA'));
const GenerarReporteDA = lazy(() => import('./pages/DirectivosYAsesores/GenerarReporteDA'));
const Historialreporteda = lazy(() => import('./pages/DirectivosYAsesores/Historialreporteda'));
const GestionUsuarios = lazy(() => import('./pages/DirectivosYAsesores/GestionUsuarios'));

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
  if (!rol || !allowedRoles.includes(rol)) {
    const homeByRole: Record<string, string> = {
      alumno: '/alumno/inicio',
      docente: '/maestro/inicio',
      directivo: '/director/inicio',
      orientador: '/director/inicio',
      padre: '/alumno/inicio',
    };
    return <Navigate to={homeByRole[rol] ?? '/login'} replace />;
  }
  return children;
}

function DefaultRouteRedirect() {
  const { session, rol, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  const homeByRole: Record<string, string> = {
    alumno: '/alumno/inicio',
    docente: '/maestro/inicio',
    directivo: '/director/inicio',
    orientador: '/director/inicio',
    padre: '/alumno/inicio',
    pendiente: '/pendiente-activacion',
  };
  return <Navigate to={homeByRole[rol || ''] ?? '/login'} replace />;
}

export default function App() {
  React.useEffect(() => {
    const saved = localStorage.getItem('ssc_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
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

          <Route path="*" element={<DefaultRouteRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}