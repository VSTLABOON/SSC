import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import './GestionUsuarios.css';
import InlineAlert from '../../components/InlineAlert';
import BulkUserImport from '../../components/BulkUserImport';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  activo: boolean;
  plantel_id: string;
  bloqueado_hasta?: string | null;
  intentos_fallidos?: number | null;
}

type FiltroRol = 'todos' | 'pendiente' | 'docente' | 'alumno' | 'orientador' | 'padre' | 'directivo' | 'administrador';

const ROLES_ASIGNABLES = ['docente', 'orientador', 'alumno', 'padre', 'directivo', 'administrador'] as const;

const ETIQUETA_ROL: Record<string, string> = {
  docente: 'Docente',
  orientador: 'Orientador(a)',
  alumno: 'Alumno',
  padre: 'Padre/Tutor',
  pendiente: 'Pendiente',
  directivo: 'Directivo',
  administrador: 'Administrador',
};

const FILTROS: { label: string; value: FiltroRol; icon: string }[] = [
  { label: 'Todos', value: 'todos', icon: 'groups' },
  { label: 'Pendientes', value: 'pendiente', icon: 'pending' },
  { label: 'Docentes', value: 'docente', icon: 'school' },
  { label: 'Alumnos', value: 'alumno', icon: 'person' },
  { label: 'Orientadores', value: 'orientador', icon: 'psychology' },
  { label: 'Padres/Tutores', value: 'padre', icon: 'family_restroom' },
  { label: 'Directivos', value: 'directivo', icon: 'admin_panel_settings' },
  { label: 'Administradores', value: 'administrador', icon: 'manage_accounts' },
];

// ── Componente ───────────────────────────────────────────────────────────────

export default function GestionUsuarios() {
  const { plantelId } = useAuth();

  const [heroVisible, setHeroVisible] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroRol>('todos');

  // Modal de invitación
  const [modalOpen, setModalOpen] = useState(false);
  const [invEmail, setInvEmail] = useState('');
  const [invNombre, setInvNombre] = useState('');
  const [invApellido, setInvApellido] = useState('');
  const [invRol, setInvRol] = useState<typeof ROLES_ASIGNABLES[number]>('docente');
  const [invLoading, setInvLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [invError, setInvError] = useState<string | null>(null);

  // Feedback inline de tabla
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modal de alta masiva
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  useLockBodyScroll(modalOpen);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // ── Carga de usuarios ──────────────────────────────────────────────────────
  const fetchUsuarios = useCallback(async () => {
    if (!plantelId) return [];
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, activo, plantel_id, bloqueado_hasta, intentos_fallidos')
      .eq('plantel_id', plantelId)
      .neq('rol', 'directivo')
      .order('rol')
      .order('apellido');

    if (error) {
      console.error(error);
      return [];
    }
    return data || [];
  }, [plantelId]);

  const cargarUsuarios = useCallback(async () => {
    setLoading(true);
    const data = await fetchUsuarios();
    setUsuarios(data);
    setLoading(false);
  }, [fetchUsuarios]);

  useEffect(() => {
    let cancelado = false;

    async function inicializar() {
      setLoading(true);
      const data = await fetchUsuarios();
      if (!cancelado) {
        setUsuarios(data);
        setLoading(false);
      }
    }

    inicializar();

    return () => {
      cancelado = true;
    };
  }, [fetchUsuarios]);

  // ── Cambiar rol ────────────────────────────────────────────────────────────
  async function handleCambiarRol(userId: string, nuevoRol: string) {
    setActionError(null);
    setUpdatingId(userId);

    const userActual = usuarios.find(u => u.id === userId);
    const updates: { rol: string; activo?: boolean } = { rol: nuevoRol };
    if (userActual?.rol === 'pendiente') {
      updates.activo = true;
    }

    const { error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', userId);

    if (!error) {
      setUsuarios(prev =>
        prev.map(u => u.id === userId ? { ...u, rol: nuevoRol, ...(updates.activo !== undefined ? { activo: true } : {}) } : u)
      );
    } else {
      setActionError(`No se pudo cambiar el rol del usuario: ${error.message}`);
    }
    setUpdatingId(null);
  }

  // ── Activar / Desactivar usuario ──────────────────────────────────────────
  async function handleToggleActivo(userId: string, nuevoActivo: boolean) {
    setActionError(null);
    setUpdatingId(userId);
    const { error } = await supabase
      .from('usuarios')
      .update({ activo: nuevoActivo })
      .eq('id', userId);

    if (!error) {
      setUsuarios(prev =>
        prev.map(u => u.id === userId ? { ...u, activo: nuevoActivo } : u)
      );
    } else {
      setActionError(`No se pudo actualizar el estado del usuario: ${error.message}`);
    }
    setUpdatingId(null);
  }

  // ── Desbloquear usuario bloqueado por intentos fallidos ───────────────────
  async function handleDesbloquearUsuario(userId: string) {
    setActionError(null);
    setUpdatingId(userId);
    const { error } = await supabase
      .from('usuarios')
      .update({ bloqueado_hasta: null, intentos_fallidos: 0 })
      .eq('id', userId);

    if (!error) {
      setUsuarios(prev =>
        prev.map(u => u.id === userId ? { ...u, bloqueado_hasta: null, intentos_fallidos: 0 } : u)
      );
    } else {
      setActionError(`No se pudo desbloquear al usuario: ${error.message}`);
    }
    setUpdatingId(null);
  }

  // ── Invitar usuario (via Edge Function) ───────────────────────────────────
  async function handleInvitar(e: React.FormEvent) {
    e.preventDefault();
    setInvError(null);
    setInvLoading(true);

    const cleanNombre = invNombre.trim();
    const cleanApellido = invApellido.trim();
    const cleanEmail = invEmail.trim();

    if (cleanNombre.length === 0 || cleanApellido.length === 0 || cleanEmail.length === 0) {
      setInvError('Todos los campos son obligatorios.');
      setInvLoading(false);
      return;
    }

    if (cleanNombre.length > 100 || cleanApellido.length > 100) {
      setInvError('El nombre y el apellido no pueden superar los 100 caracteres.');
      setInvLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setInvError('Formato de correo electrónico inválido.');
      setInvLoading(false);
      return;
    }

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;
      if (!token) throw new Error('Sesión no encontrada.');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: cleanEmail,
          nombre: cleanNombre,
          apellido: cleanApellido,
          rol: invRol,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al enviar invitación.');

      setInvEmail(''); setInvNombre(''); setInvApellido(''); setInvRol('docente');
      setModalOpen(false);
      await cargarUsuarios();
    } catch (err: unknown) {
      setInvError(err instanceof Error ? err.message : 'Error desconocido.');
    } finally {
      setInvLoading(false);
    }
  }

  // ── Filtro ─────────────────────────────────────────────────────────────────
  const usuariosFiltrados = filtro === 'todos'
    ? usuarios
    : usuarios.filter(u => u.rol === filtro);

  function iniciales(u: Usuario) {
    return `${u.nombre.charAt(0)}${u.apellido.charAt(0)}`.toUpperCase();
  }

  function isBloqueado(u: Usuario): boolean {
    return Boolean(u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date());
  }

  function badgeClase(u: Usuario) {
    if (isBloqueado(u)) return 'gu-badge gu-badge--bloqueado';
    if (!u.activo) return 'gu-badge gu-badge--inactivo';
    if (u.rol === 'pendiente') return 'gu-badge gu-badge--pendiente';
    return 'gu-badge gu-badge--activo';
  }

  const countPendientes = usuarios.filter(u => u.rol === 'pendiente').length;
  const countDocentes = usuarios.filter(u => u.rol === 'docente').length;
  const countAlumnos = usuarios.filter(u => u.rol === 'alumno').length;

  return (
    <div className="ssc-page-canvas animate-fade-in">
      {actionError && (
        <InlineAlert type="error" message={actionError} onClose={() => setActionError(null)} />
      )}

      {/* Welcome Hero Admin */}
      <section className={`ssc-hero ssc-hero--admin${heroVisible ? ' ssc-hero--visible' : ''}`}>
        <div className="ssc-hero-body">
          <div className="ssc-hero-content">
            <div className="ssc-welcome-chip">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>manage_accounts</span>
              Control Escolar & TI
            </div>
            <h2 className="ssc-hero-title">
              Gestión de Usuarios & Asignación de Roles
            </h2>
            <p className="ssc-hero-subtitle">
              Administración centralizada de cuentas, asignación de privilegios y alta masiva de estudiantes y docentes.
            </p>
          </div>
          <div className="ssc-hero-actions">
            <button
              type="button"
              className="ssc-btn-action ssc-btn-action--primary"
              onClick={() => { setModalOpen(true); setInvError(null); }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
              <span>Invitar Usuario</span>
            </button>
            <button
              type="button"
              className="ssc-btn-action ssc-btn-action--secondary"
              onClick={() => setBulkModalOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>group_add</span>
              <span>Alta Masiva</span>
            </button>
          </div>
        </div>
      </section>

      {/* Resumen Rápido / KPIs Admin */}
      <div className="ssc-kpi-grid">
        <div
          className={`ssc-kpi-card ${filtro === 'todos' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setFiltro('todos')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Total de Usuarios</div>
            <div className="ssc-kpi-value">{usuarios.length}</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#204785' }}>groups</span>
              <span>Comunidad escolar</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
            <span className="material-symbols-outlined">groups</span>
          </div>
        </div>

        <div
          className={`ssc-kpi-card ${filtro === 'alumno' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setFiltro('alumno')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Alumnos Activos</div>
            <div className="ssc-kpi-value">{countAlumnos}</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#0f766e' }}>school</span>
              <span>Matrícula inscrita</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#ccfbf1', color: '#0f766e' }}>
            <span className="material-symbols-outlined">person</span>
          </div>
        </div>

        <div
          className={`ssc-kpi-card ${filtro === 'docente' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setFiltro('docente')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Cuerpo Docente</div>
            <div className="ssc-kpi-value">{countDocentes}</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#006341' }}>assignment_ind</span>
              <span>Profesores</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#dcfce7', color: '#00492f' }}>
            <span className="material-symbols-outlined">school</span>
          </div>
        </div>

        <div
          className={`ssc-kpi-card ${filtro === 'pendiente' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setFiltro('pendiente')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Pendientes</div>
            <div className="ssc-kpi-value" style={{ color: countPendientes > 0 ? '#b91c1c' : '#0f172a' }}>
              {countPendientes}
            </div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: countPendientes > 0 ? '#dc2626' : '#64748b' }}>
                {countPendientes > 0 ? 'priority_high' : 'check_circle'}
              </span>
              <span>{countPendientes > 0 ? 'Por activar' : 'Al corriente'}</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: countPendientes > 0 ? '#fee2e2' : '#f1f5f9', color: countPendientes > 0 ? '#b91c1c' : '#64748b' }}>
            <span className="material-symbols-outlined">pending</span>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas / Filtros por Rol */}
      <nav className="ssc-tabs-nav" aria-label="Filtrar por Rol">
        {FILTROS.map(f => {
          const count = f.value === 'todos' ? usuarios.length : usuarios.filter(u => u.rol === f.value).length;
          return (
            <button
              key={f.value}
              type="button"
              className={`ssc-tab-btn ${filtro === f.value ? 'ssc-tab-btn--active' : ''}`}
              onClick={() => setFiltro(f.value)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>{f.icon}</span>
              <span>{f.label}</span>
              <span className={`ssc-tab-badge ${f.value === 'pendiente' && count > 0 ? 'ssc-tab-badge--pending' : ''}`}>
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Tabla de Usuarios */}
      <div className="gu-card">
        <div className="gu-table-wrap">
          <table className="gu-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol Actual</th>
                <th>Correo Electrónico</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="gu-skeleton-row">
                    <td><div className="gu-skeleton-line" style={{ width: '140px' }} /></td>
                    <td><div className="gu-skeleton-line" style={{ width: '100px' }} /></td>
                    <td><div className="gu-skeleton-line" style={{ width: '180px' }} /></td>
                    <td><div className="gu-skeleton-line" style={{ width: '70px' }} /></td>
                    <td><div className="gu-skeleton-line" style={{ width: '80px' }} /></td>
                  </tr>
                ))
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                      person_search
                    </span>
                    No se encontraron usuarios en esta categoría.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="gu-user-cell">
                        <div className="gu-avatar">{iniciales(u)}</div>
                        <div className="gu-user-info">
                          <span className="gu-user-name">{u.nombre} {u.apellido}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <select
                        className="gu-rol-select"
                        value={u.rol}
                        disabled={updatingId === u.id}
                        onChange={e => handleCambiarRol(u.id, e.target.value)}
                      >
                        {u.rol === 'pendiente' && (
                          <option value="pendiente">Pendiente</option>
                        )}
                        {ROLES_ASIGNABLES.map(r => (
                          <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>
                        ))}
                      </select>
                    </td>

                    <td className="gu-user-email">{u.email}</td>

                    <td>
                      <span className={badgeClase(u)}>
                        {isBloqueado(u) ? 'Bloqueado' : !u.activo ? 'Inactivo' : u.rol === 'pendiente' ? 'Pendiente' : 'Activo'}
                      </span>
                    </td>

                    <td>
                      <div className="gu-actions-cell">
                        {isBloqueado(u) && (
                          <button
                            type="button"
                            className="gu-action-btn gu-action-btn--unlock"
                            disabled={updatingId === u.id}
                            onClick={() => handleDesbloquearUsuario(u.id)}
                            title="Desbloquear cuenta"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock_open</span>
                            <span>Desbloquear</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className={`gu-action-btn ${u.activo ? 'gu-action-btn--deactivate' : 'gu-action-btn--activate'}`}
                          disabled={updatingId === u.id}
                          onClick={() => handleToggleActivo(u.id, !u.activo)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            {u.activo ? 'block' : 'check_circle'}
                          </span>
                          <span>{u.activo ? 'Desactivar' : 'Activar'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Invitar Usuario */}
      {modalOpen && (
        <div className="gu-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="gu-modal" onClick={e => e.stopPropagation()}>
            <div className="gu-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#2563eb' }}>person_add</span>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Invitar Nuevo Usuario</h3>
              </div>
              <button type="button" className="gu-modal-close" onClick={() => setModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleInvitar} className="gu-modal-form">
              {invError && <div className="gu-form-error">{invError}</div>}

              <div className="gu-form-grid">
                <div className="gu-field">
                  <label>Nombre(s)</label>
                  <input
                    type="text"
                    className="gu-input"
                    placeholder="Ej. Carlos"
                    value={invNombre}
                    onChange={e => setInvNombre(e.target.value)}
                    required
                  />
                </div>

                <div className="gu-field">
                  <label>Apellido(s)</label>
                  <input
                    type="text"
                    className="gu-input"
                    placeholder="Ej. Mendoza"
                    value={invApellido}
                    onChange={e => setInvApellido(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="gu-field" style={{ marginTop: '12px' }}>
                <label>Correo Institucional</label>
                <input
                  type="email"
                  className="gu-input"
                  placeholder="usuario@conalep.edu.mx"
                  value={invEmail}
                  onChange={e => setInvEmail(e.target.value)}
                  required
                />
              </div>

              <div className="gu-field" style={{ marginTop: '12px' }}>
                <label>Rol Inicial Asignado</label>
                <select
                  className="gu-select"
                  value={invRol}
                  onChange={e => setInvRol(e.target.value as any)}
                >
                  {ROLES_ASIGNABLES.map(r => (
                    <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>
                  ))}
                </select>
              </div>

              <div className="gu-modal-actions">
                <button
                  type="button"
                  className="gu-btn-cancel"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="gu-btn-submit"
                  disabled={invLoading}
                >
                  {invLoading ? 'Enviando...' : 'Enviar Invitación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alta Masiva */}
      {bulkModalOpen && (
        <BulkUserImport
          isOpen={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          onComplete={cargarUsuarios}
          plantelId={plantelId || ''}
        />
      )}
    </div>
  );
}
