import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
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
}

type FiltroRol = 'todos' | 'pendiente' | 'docente' | 'alumno' | 'orientador' | 'padre';

const ROLES_ASIGNABLES = ['docente', 'orientador', 'alumno', 'padre'] as const;

const ETIQUETA_ROL: Record<string, string> = {
  docente: 'Docente',
  orientador: 'Orientador(a)',
  alumno: 'Alumno',
  padre: 'Padre/Tutor',
  pendiente: 'Pendiente',
  directivo: 'Directivo',
};

const FILTROS: { label: string; value: FiltroRol }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Docentes', value: 'docente' },
  { label: 'Alumnos', value: 'alumno' },
  { label: 'Orientadores', value: 'orientador' },
  { label: 'Padres/Tutores', value: 'padre' },
];

// ── Componente ───────────────────────────────────────────────────────────────

export default function GestionUsuarios() {
  const { plantelId, session } = useAuth();

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

  useEffect(() => {
    if (modalOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [modalOpen]);

  // ── Carga de usuarios ──────────────────────────────────────────────────────
  const fetchUsuarios = useCallback(async () => {
    if (!plantelId) return [];
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, activo, plantel_id')
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
    const { error } = await supabase
      .from('usuarios')
      .update({ rol: nuevoRol })
      .eq('id', userId);

    if (!error) {
      setUsuarios(prev =>
        prev.map(u => u.id === userId ? { ...u, rol: nuevoRol } : u)
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

  // ── Invitar usuario (via Edge Function) ───────────────────────────────────
  async function handleInvitar(e: React.FormEvent) {
    e.preventDefault();
    setInvError(null);
    setInvLoading(true);

    // MEDIO-3: Validaciones client-side
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

      // Resetear y cerrar modal
      setInvEmail(''); setInvNombre(''); setInvApellido(''); setInvRol('docente');
      setModalOpen(false);
      // Recargar lista para mostrar el nuevo usuario en estado pendiente
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

  // ── Iniciales del avatar ───────────────────────────────────────────────────
  function iniciales(u: Usuario) {
    return `${u.nombre.charAt(0)}${u.apellido.charAt(0)}`.toUpperCase();
  }

  // ── Badge de estado ────────────────────────────────────────────────────────
  function badgeClase(u: Usuario) {
    if (!u.activo) return 'gu-badge gu-badge--inactivo';
    if (u.rol === 'pendiente') return 'gu-badge gu-badge--pendiente';
    return 'gu-badge gu-badge--activo';
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="gu-page">
      {actionError && (
        <InlineAlert type="error" message={actionError} onClose={() => setActionError(null)} />
      )}
      {/* Header */}
      <div className="gu-header">
        <div className="gu-header-text">
          <h2>Gestión de Usuarios</h2>
          <p>Invita, asigna roles y administra los usuarios de tu plantel.</p>
        </div>
        <button className="gu-invite-btn" onClick={() => { setModalOpen(true); setInvError(null); }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
          Invitar usuario
        </button>
        <button className="gu-invite-btn" style={{ background: 'var(--c-chambray)' }} onClick={() => setBulkModalOpen(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>group_add</span>
          Alta Masiva
        </button>
      </div>

      {/* Filtros */}
      <div className="gu-filters">
        {FILTROS.map(f => (
          <button
            key={f.value}
            className={`gu-filter-btn ${filtro === f.value ? 'gu-filter-btn--active' : ''}`}
            onClick={() => setFiltro(f.value)}
          >
            {f.label}
            {f.value !== 'todos' && (
              <span style={{ marginLeft: 6, fontWeight: 700 }}>
                ({usuarios.filter(u => u.rol === f.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="gu-card">
        <div className="gu-table-wrap">
          <table className="gu-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="gu-skeleton-row">
                    <td><div className="gu-skeleton-line" style={{ width: '70%' }} /></td>
                    <td><div className="gu-skeleton-line" style={{ width: '90%' }} /></td>
                    <td><div className="gu-skeleton-line" style={{ width: '50%' }} /></td>
                    <td><div className="gu-skeleton-line" style={{ width: '40%' }} /></td>
                    <td><div className="gu-skeleton-line" style={{ width: '60%' }} /></td>
                  </tr>
                ))
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="gu-empty">
                      <span className="material-symbols-outlined">group_off</span>
                      <p>No hay usuarios en esta categoría.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="gu-user-cell">
                        <div className="gu-avatar">{iniciales(u)}</div>
                        <div>
                          <div className="gu-user-name">{u.nombre} {u.apellido}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="gu-user-email">{u.email}</span>
                    </td>
                    <td>
                      <select
                        className="gu-rol-select"
                        value={u.rol}
                        disabled={updatingId === u.id || u.rol === 'directivo'}
                        onChange={e => handleCambiarRol(u.id, e.target.value)}
                      >
                        {u.rol === 'pendiente' && (
                          <option value="pendiente" disabled>— Asignar rol —</option>
                        )}
                        {ROLES_ASIGNABLES.map(r => (
                          <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={badgeClase(u)}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px', verticalAlign: 'middle', marginRight: '4px' }}>
                          {!u.activo ? 'block' : u.rol === 'pendiente' ? 'hourglass_empty' : 'check_circle'}
                        </span>
                        {!u.activo
                          ? 'Inactivo'
                          : u.rol === 'pendiente'
                          ? 'Pendiente'
                          : 'Activo'}
                      </span>
                    </td>
                    <td>
                      {!u.activo ? (
                        <button
                          className="gu-action-btn gu-action-btn--activate"
                          disabled={updatingId === u.id}
                          onClick={() => handleToggleActivo(u.id, true)}
                          title="Reactivar acceso"
                        >
                          Reactivar →
                        </button>
                      ) : (
                        <button
                          className="gu-action-btn gu-action-btn--deactivate"
                          disabled={updatingId === u.id || u.id === session?.user?.id}
                          onClick={() => handleToggleActivo(u.id, false)}
                          title="Suspender acceso"
                        >
                          Suspender
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Invitar */}
      {modalOpen && (
        <div className="gu-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="gu-modal">
            <div className="gu-modal-header">
              <h3>Invitar usuario al plantel</h3>
              <button className="gu-modal-close" onClick={() => setModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleInvitar}>
              <div className="gu-form-grid">
                {invError && <div className="gu-form-error">{invError}</div>}

                 <div className="gu-form-field">
                  <label htmlFor="inv-nombre">Nombre</label>
                  <input
                    id="inv-nombre"
                    type="text"
                    value={invNombre}
                    onChange={e => setInvNombre(e.target.value)}
                    placeholder="Ej: Francisco"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="gu-form-field">
                  <label htmlFor="inv-apellido">Apellido(s)</label>
                  <input
                    id="inv-apellido"
                    type="text"
                    value={invApellido}
                    onChange={e => setInvApellido(e.target.value)}
                    placeholder="Ej: Gómez Ruiz"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="gu-form-field gu-form-field--full">
                  <label htmlFor="inv-email">Correo electrónico</label>
                  <input
                    id="inv-email"
                    type="email"
                    value={invEmail}
                    onChange={e => setInvEmail(e.target.value)}
                    placeholder="correo@conalep.edu.mx"
                    maxLength={150}
                    required
                  />
                </div>

                <div className="gu-form-field gu-form-field--full">
                  <label htmlFor="inv-rol">Rol inicial</label>
                  <select
                    id="inv-rol"
                    value={invRol}
                    onChange={e => setInvRol(e.target.value as typeof ROLES_ASIGNABLES[number])}
                  >
                    {ROLES_ASIGNABLES.map(r => (
                      <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: 12, color: 'var(--c-secondary)', marginTop: 4 }}>
                    El usuario recibirá un correo de invitación. Su acceso será activado al aceptarlo.
                  </span>
                </div>
              </div>

              <div className="gu-modal-actions">
                <button type="button" className="gu-btn-cancel" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="gu-btn-submit" disabled={invLoading}>
                  {invLoading ? 'Enviando...' : 'Enviar invitación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alta Masiva */}
      <BulkUserImport
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onComplete={() => cargarUsuarios()}
        plantelId={plantelId || ''}
      />
    </div>
  );
}
