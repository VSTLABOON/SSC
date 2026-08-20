import React, { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { resolverRutaInicio } from './constants/routes';
import StudentLayout from './layouts/StudentLayout';
import ParentLayout from './layouts/ParentLayout';
import TeacherLayout from './layouts/TeacherLayout';
import CounselorLayout from './layouts/CounselorLayout';
import DirectorLayout from './layouts/DirectorLayout';
import AdminLayout from './layouts/AdminLayout';

import Login from './pages/Login';
import PendienteActivacion from './pages/PendienteActivacion';
import Profile from './pages/Profile';

// Dynamic lazy imports para code-splitting por rol (Escalabilidad Modular)
// Rol: alumno
const InicioAlumno = lazy(() => import('./pages/alumno/InicioAlumno'));
const PerfilAlumno = lazy(() => import('./pages/alumno/PerfilAlumno'));
const HorarioAlumno = lazy(() => import('./pages/alumno/HorarioAlumno'));
const HistorialAlumno = lazy(() => import('./pages/alumno/HistorialAlumno'));

// Rol: padre
const InicioPadre = lazy(() => import('./pages/padre/InicioPadre'));
const PerfilTutelado = lazy(() => import('./pages/padre/PerfilTutelado'));
const HorarioTutelado = lazy(() => import('./pages/padre/HorarioTutelado'));
const HistorialTutelado = lazy(() => import('./pages/padre/HistorialTutelado'));

// Rol: docente
const InicioDocente = lazy(() => import('./pages/docente/InicioDocente'));
const MisClases = lazy(() => import('./pages/docente/MisClases'));
const PaseLista = lazy(() => import('./pages/docente/PaseLista'));
const GenerarReporteDocente = lazy(() => import('./pages/docente/GenerarReporteDocente'));
const HistorialDocente = lazy(() => import('./pages/docente/HistorialDocente'));

// Rol: orientador
const InicioOrientador = lazy(() => import('./pages/orientador/InicioOrientador'));
const GenerarReporteOrientador = lazy(() => import('./pages/orientador/GenerarReporteOrientador'));
const HistorialOrientador = lazy(() => import('./pages/orientador/HistorialOrientador'));

// Rol: directivo
const InicioDirectivo = lazy(() => import('./pages/directivo/InicioDirectivo'));
const GenerarReporteDirectivo = lazy(() => import('./pages/directivo/GenerarReporteDirectivo'));
const HistorialDirectivo = lazy(() => import('./pages/directivo/HistorialDirectivo'));

// Rol: administrador (Control Escolar y TI)
const GestionUsuariosAdmin = lazy(() => import('./pages/admin/GestionUsuariosAdmin'));
const ImportarUsuariosAdmin = lazy(() => import('./pages/admin/ImportarUsuariosAdmin'));

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-bg-app, #DDE4E5)', color: 'var(--color-brand-chambray, #204785)' }}>
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
    return <Navigate to={resolverRutaInicio(rol)} replace />;
  }
  return children;
}

function DefaultRouteRedirect() {
  const { session, rol, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={resolverRutaInicio(rol)} replace />;
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
          <Route path="/pendiente-activacion" element={<PendienteActivacion />} />

          {/* 1. Portal exclusivo: ALUMNO */}
          <Route path="/alumno" element={
            <RequireAuth allowedRoles={['alumno']}><StudentLayout /></RequireAuth>
          }>
            <Route path="inicio" element={<InicioAlumno />} />
            <Route path="perfil" element={<PerfilAlumno />} />
            <Route path="horario" element={<HorarioAlumno />} />
            <Route path="historial" element={<HistorialAlumno />} />
          </Route>

          {/* 2. Portal exclusivo: PADRE / TUTOR */}
          <Route path="/padre" element={
            <RequireAuth allowedRoles={['padre']}><ParentLayout /></RequireAuth>
          }>
            <Route path="inicio" element={<InicioPadre />} />
            <Route path="perfil" element={<PerfilTutelado />} />
            <Route path="horario" element={<HorarioTutelado />} />
            <Route path="historial" element={<HistorialTutelado />} />
          </Route>

          {/* 3. Portal exclusivo: DOCENTE */}
          <Route path="/maestro" element={
            <RequireAuth allowedRoles={['docente']}><TeacherLayout /></RequireAuth>
          }>
            <Route path="inicio" element={<InicioDocente />} />
            <Route path="clases" element={<MisClases />} />
            <Route path="asistencia" element={<PaseLista />} />
            <Route path="reporte" element={<GenerarReporteDocente />} />
            <Route path="historial" element={<HistorialDocente />} />
            <Route path="perfil" element={<Profile />} />
          </Route>

          {/* 4. Portal exclusivo: ORIENTADOR */}
          <Route path="/orientador" element={
            <RequireAuth allowedRoles={['orientador']}><CounselorLayout /></RequireAuth>
          }>
            <Route path="inicio" element={<InicioOrientador />} />
            <Route path="reporte" element={<GenerarReporteOrientador />} />
            <Route path="historial" element={<HistorialOrientador />} />
            <Route path="perfil" element={<Profile />} />
          </Route>

          {/* 5. Portal exclusivo: DIRECTIVO (Gobernanza y BI Analytics) */}
          <Route path="/director" element={
            <RequireAuth allowedRoles={['directivo']}><DirectorLayout /></RequireAuth>
          }>
            <Route path="inicio" element={<InicioDirectivo />} />
            <Route path="reporte" element={<GenerarReporteDirectivo />} />
            <Route path="historial" element={<HistorialDirectivo />} />
            <Route path="perfil" element={<Profile />} />
          </Route>

          {/* 6. Portal exclusivo: ADMINISTRADOR (Control Escolar y TI) */}
          <Route path="/admin" element={
            <RequireAuth allowedRoles={['administrador']}><AdminLayout /></RequireAuth>
          }>
            <Route index element={<Navigate to="/admin/usuarios" replace />} />
            <Route path="usuarios" element={<GestionUsuariosAdmin />} />
            <Route path="importar" element={<ImportarUsuariosAdmin />} />
            <Route path="perfil" element={<Profile />} />
          </Route>

          <Route path="*" element={<DefaultRouteRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}