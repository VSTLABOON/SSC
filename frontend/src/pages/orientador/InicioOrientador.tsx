import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BIAnalyticsDashboard } from '../../components/bi/BIAnalyticsDashboard';
import { BitacoraIntervencionModal, type IntervencionRecord } from '../../components/orientador/BitacoraIntervencionModal';
import type { JustificanteRecord } from '../../components/alumno/SolicitarJustificanteModal';
import type { CitaRecord } from '../../components/padre/SolicitarCitaModal';
import '../DirectivosYAsesores/InicioDA.css';

type TabType = 'intervenciones' | 'justificantes' | 'citas' | 'bi';

export default function InicioOrientador() {
  const { nombre, plantelId } = useAuth();
  const navigate = useNavigate();
  const [heroVisible, setHeroVisible] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('intervenciones');
  const [modalIntervencionOpen, setModalIntervencionOpen] = useState(false);
  const [intervenciones, setIntervenciones] = useState<IntervencionRecord[]>([]);
  const [justificantes, setJustificantes] = useState<JustificanteRecord[]>([]);
  const [citas, setCitas] = useState<CitaRecord[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const loadData = useCallback(() => {
    // 1. Bitácora de Intervenciones
    try {
      const storageKey = `ssc_intervenciones_${plantelId || 'default'}`;
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setIntervenciones(saved);
    } catch (e) {
      console.error('Error al cargar bitácora de intervenciones:', e);
    }

    // 2. Justificantes de Alumnos
    try {
      const allKeys = Object.keys(localStorage).filter(k => k.startsWith('ssc_justificantes_'));
      const combined: JustificanteRecord[] = [];
      for (const k of allKeys) {
        const items = JSON.parse(localStorage.getItem(k) || '[]');
        combined.push(...items);
      }
      setJustificantes(combined);
    } catch (e) {
      console.warn('Error al cargar justificantes:', e);
    }

    // 3. Citas de Tutores
    try {
      const allCitaKeys = Object.keys(localStorage).filter(k => k.startsWith('ssc_citas_orientacion_'));
      const combinedCitas: CitaRecord[] = [];
      for (const k of allCitaKeys) {
        const items = JSON.parse(localStorage.getItem(k) || '[]');
        combinedCitas.push(...items);
      }
      setCitas(combinedCitas);
    } catch (e) {
      console.warn('Error al cargar citas de tutores:', e);
    }
  }, [plantelId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleActualizarJustificante(id: string, nuevoEstado: 'aprobado' | 'rechazado') {
    const updated = justificantes.map(j => (j.id === id ? { ...j, estado: nuevoEstado } : j));
    setJustificantes(updated);

    // Actualizar en localStorage
    Object.keys(localStorage)
      .filter(k => k.startsWith('ssc_justificantes_'))
      .forEach(k => {
        try {
          const items: JustificanteRecord[] = JSON.parse(localStorage.getItem(k) || '[]');
          const modified = items.map(item => (item.id === id ? { ...item, estado: nuevoEstado } : item));
          localStorage.setItem(k, JSON.stringify(modified));
        } catch {
          // Ignorar error de parseo en claves no relacionadas
        }
      });
  }

  function handleConfirmarCita(id: string) {
    const updated = citas.map(c => (c.id === id ? { ...c, estado: 'confirmada' as const } : c));
    setCitas(updated);

    Object.keys(localStorage)
      .filter(k => k.startsWith('ssc_citas_orientacion_'))
      .forEach(k => {
        try {
          const items: CitaRecord[] = JSON.parse(localStorage.getItem(k) || '[]');
          const modified = items.map(item => (item.id === id ? { ...item, estado: 'confirmada' as const } : item));
          localStorage.setItem(k, JSON.stringify(modified));
        } catch {
          // Ignorar error
        }
      });
  }

  const justificantesPendientes = justificantes.filter(j => j.estado === 'pendiente');
  const citasPendientes = citas.filter(c => c.estado === 'pendiente');

  return (
    <div className="ida-canvas-only animate-fade-in">
      {/* Welcome Hero Orientador */}
      <section className={`orientador-hero${heroVisible ? ' orientador-hero--visible' : ''}`}>
        <div className="orientador-hero-body">
          <div className="orientador-hero-content">
            <div className="orientador-welcome-chip">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>psychology</span>
              Orientación Educativa & Psicopedagogía
            </div>
            <h2 className="orientador-hero-title">
              Panel de Acompañamiento & Prevención
            </h2>
            <p className="orientador-hero-subtitle">
              Hola, {nombre || 'Orientador(a)'}. Monitoreo integral de acuerdos, justificantes y atención psicopedagógica.
            </p>
          </div>
          <div className="orientador-hero-actions">
            <button
              type="button"
              className="orientador-btn-action orientador-btn-action--primary"
              onClick={() => setModalIntervencionOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
              <span>Registrar Acuerdo</span>
            </button>
            <button
              type="button"
              className="orientador-btn-action orientador-btn-action--secondary"
              onClick={() => navigate('/orientador/reporte')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>assignment_add</span>
              <span>Generar Reporte</span>
            </button>
          </div>
        </div>
      </section>

      {/* Resumen Rápido de Casos / KPIs de Orientación */}
      <div className="orientador-kpi-grid">
        <div
          className={`orientador-kpi-card ${activeTab === 'justificantes' ? 'orientador-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('justificantes')}
        >
          <div className="orientador-kpi-info">
            <div className="orientador-kpi-label">Justificantes</div>
            <div className="orientador-kpi-value">{justificantesPendientes.length}</div>
            <div className="orientador-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: justificantesPendientes.length > 0 ? '#ef4444' : '#10b981' }}>
                {justificantesPendientes.length > 0 ? 'pending_actions' : 'check_circle'}
              </span>
              <span>{justificantesPendientes.length > 0 ? 'Por validar' : 'Al día'}</span>
            </div>
          </div>
          <div className="orientador-kpi-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <span className="material-symbols-outlined">fact_check</span>
          </div>
        </div>

        <div
          className={`orientador-kpi-card ${activeTab === 'citas' ? 'orientador-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('citas')}
        >
          <div className="orientador-kpi-info">
            <div className="orientador-kpi-label">Citas de Tutores</div>
            <div className="orientador-kpi-value">{citasPendientes.length}</div>
            <div className="orientador-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: citasPendientes.length > 0 ? '#f59e0b' : '#10b981' }}>
                {citasPendientes.length > 0 ? 'schedule' : 'task_alt'}
              </span>
              <span>{citasPendientes.length > 0 ? 'Por confirmar' : 'Al día'}</span>
            </div>
          </div>
          <div className="orientador-kpi-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
            <span className="material-symbols-outlined">calendar_month</span>
          </div>
        </div>

        <div
          className={`orientador-kpi-card ${activeTab === 'intervenciones' ? 'orientador-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('intervenciones')}
        >
          <div className="orientador-kpi-info">
            <div className="orientador-kpi-label">Bitácora Activa</div>
            <div className="orientador-kpi-value">{intervenciones.length}</div>
            <div className="orientador-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#0284c7' }}>history_edu</span>
              <span>Acuerdos registrados</span>
            </div>
          </div>
          <div className="orientador-kpi-icon-wrap" style={{ background: '#e0e7ff', color: '#4338ca' }}>
            <span className="material-symbols-outlined">handshake</span>
          </div>
        </div>

        <div
          className={`orientador-kpi-card ${activeTab === 'bi' ? 'orientador-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('bi')}
        >
          <div className="orientador-kpi-info">
            <div className="orientador-kpi-label">Radar de Riesgo</div>
            <div className="orientador-kpi-value" style={{ fontSize: '18px', paddingTop: '3px' }}>Centro BI</div>
            <div className="orientador-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#10b981' }}>analytics</span>
              <span>Métricas del plantel</span>
            </div>
          </div>
          <div className="orientador-kpi-icon-wrap" style={{ background: '#dcfce7', color: '#15803d' }}>
            <span className="material-symbols-outlined">radar</span>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas de Orientación */}
      <nav className="orientador-tabs-nav" aria-label="Secciones de Orientación">
        <button
          type="button"
          className={`orientador-tab-btn ${activeTab === 'intervenciones' ? 'orientador-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('intervenciones')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>handshake</span>
          <span>Acuerdos</span>
          <span className="orientador-tab-badge">{intervenciones.length}</span>
        </button>
        <button
          type="button"
          className={`orientador-tab-btn ${activeTab === 'justificantes' ? 'orientador-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('justificantes')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>fact_check</span>
          <span>Justificantes</span>
          {justificantesPendientes.length > 0 && (
            <span className="orientador-tab-badge orientador-tab-badge--pending">{justificantesPendientes.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`orientador-tab-btn ${activeTab === 'citas' ? 'orientador-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('citas')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
          <span>Citas</span>
          {citasPendientes.length > 0 && (
            <span className="orientador-tab-badge orientador-tab-badge--pending">{citasPendientes.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`orientador-tab-btn ${activeTab === 'bi' ? 'orientador-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('bi')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>radar</span>
          <span>Radar BI</span>
        </button>
      </nav>

      {/* Pestaña 1: Bitácora de Intervenciones & Acuerdos */}
      {activeTab === 'intervenciones' && (
        <section className="dedicated-tab-content">
          <div className="orientador-section-header">
            <div>
              <h3 className="orientador-section-title">
                <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>clinical_notes</span>
                Bitácora de Acuerdos y Seguimiento Psicopedagógico
              </h3>
              <p className="orientador-section-desc">
                Compromisos firmados con tutores legales y planes de regularización conductual.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalIntervencionOpen(true)}
              className="orientador-btn-action orientador-btn-action--primary"
              style={{ padding: '8px 16px', fontSize: '13px', background: '#0284c7', color: '#ffffff' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              <span>Nueva Intervención</span>
            </button>
          </div>

          {intervenciones.length === 0 ? (
            <div className="orientador-empty-state">
              <span className="material-symbols-outlined orientador-empty-icon">handshake</span>
              <h4 className="orientador-empty-title">No hay sesiones de intervención registradas aún</h4>
              <p className="orientador-empty-desc">
                Registra acuerdos formales con padres de familia de alumnos identificados en Semáforo Naranja o Rojo.
              </p>
              <button
                type="button"
                onClick={() => setModalIntervencionOpen(true)}
                className="orientador-btn-action orientador-btn-action--primary"
                style={{ background: '#0284c7', color: '#ffffff' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_note</span>
                <span>Registrar Primera Intervención</span>
              </button>
            </div>
          ) : (
            <div className="orientador-cards-list">
              {intervenciones.map(item => {
                const pillTypeClass =
                  item.tipo === 'conductual'
                    ? 'orientador-pill--conductual'
                    : item.tipo === 'academico'
                    ? 'orientador-pill--academico'
                    : item.tipo === 'emocional'
                    ? 'orientador-pill--emocional'
                    : item.tipo === 'familiar'
                    ? 'orientador-pill--familiar'
                    : 'orientador-pill--default';

                return (
                  <div key={item.id} className="orientador-item-card">
                    <div className="orientador-card-top">
                      <div>
                        <div className="orientador-pill-group">
                          <span className={`orientador-pill ${pillTypeClass}`}>
                            {item.tipo}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>
                            Matrícula: {item.matricula}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-sub, #64748b)' }}>
                            • Grupo {item.grupo}
                          </span>
                        </div>
                        <h4 className="orientador-card-title">
                          {item.alumnoNombre}
                        </h4>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11.5px', color: 'var(--color-text-sub, #94a3b8)', display: 'block' }}>
                          Sesión: {item.fechaSesion}
                        </span>
                      </div>
                    </div>

                    {item.fechaSeguimiento && (
                      <div className="orientador-next-date-badge">
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>event_repeat</span>
                        <span>Próxima Cita: {item.fechaSeguimiento}</span>
                      </div>
                    )}

                    <div className="orientador-note-box">
                      <strong>Acuerdos Establecidos:</strong>
                      <div style={{ marginTop: '3px' }}>{item.acuerdos}</div>
                    </div>

                    <div className="orientador-card-footer">
                      <span>Registrado por: {item.registradoPor}</span>
                      <span>{new Date(item.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Pestaña 2: Bandeja de Justificantes */}
      {activeTab === 'justificantes' && (
        <section className="dedicated-tab-content">
          <div className="orientador-section-header">
            <div>
              <h3 className="orientador-section-title">
                <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>fact_check</span>
                Bandeja de Aprobación de Justificantes
              </h3>
              <p className="orientador-section-desc">
                Revisa y aprueba solicitudes de justificantes médicos y trámites oficiales emitidos por los alumnos.
              </p>
            </div>
          </div>

          {justificantes.length === 0 ? (
            <div className="orientador-empty-state">
              <span className="material-symbols-outlined orientador-empty-icon">verified</span>
              <h4 className="orientador-empty-title">No hay solicitudes de justificantes pendientes</h4>
              <p className="orientador-empty-desc">
                Las solicitudes enviadas por los estudiantes aparecerán aquí para su validación inmediata.
              </p>
            </div>
          ) : (
            <div className="orientador-cards-list">
              {justificantes.map(j => (
                <div key={j.id} className="orientador-item-card">
                  <div className="orientador-card-top">
                    <div>
                      <div className="orientador-pill-group">
                        <span className="orientador-pill orientador-pill--emocional">
                          {j.motivo}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)' }}>
                          Periodo: {j.fechaInicio} al {j.fechaFin}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0', fontSize: '13.5px', color: 'var(--color-text-main, #334155)', lineHeight: 1.45 }}>
                        {j.descripcion}
                      </p>
                      <span style={{ fontSize: '11.5px', color: 'var(--color-text-sub, #94a3b8)' }}>
                        Solicitado el: {new Date(j.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div className="orientador-action-btn-group">
                      {j.estado === 'pendiente' ? (
                        <>
                          <button
                            type="button"
                            className="orientador-btn-reject"
                            onClick={() => handleActualizarJustificante(j.id, 'rechazado')}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
                            <span>Rechazar</span>
                          </button>
                          <button
                            type="button"
                            className="orientador-btn-approve"
                            onClick={() => handleActualizarJustificante(j.id, 'aprobado')}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                            <span>Aprobar Justificante</span>
                          </button>
                        </>
                      ) : (
                        <span className={`orientador-status-chip ${j.estado === 'aprobado' ? 'orientador-status-chip--success' : 'orientador-status-chip--danger'}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            {j.estado === 'aprobado' ? 'verified' : 'cancel'}
                          </span>
                          <span>{j.estado === 'aprobado' ? 'Justificante Aprobado' : 'Justificante Rechazado'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Pestaña 3: Citas de Tutores */}
      {activeTab === 'citas' && (
        <section className="dedicated-tab-content">
          <div className="orientador-section-header">
            <div>
              <h3 className="orientador-section-title">
                <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>calendar_month</span>
                Solicitudes de Cita de Padres de Familia
              </h3>
              <p className="orientador-section-desc">
                Agenda y confirma sesiones de atención psicopedagógica solicitadas por los tutores.
              </p>
            </div>
          </div>

          {citas.length === 0 ? (
            <div className="orientador-empty-state">
              <span className="material-symbols-outlined orientador-empty-icon">event_available</span>
              <h4 className="orientador-empty-title">No hay solicitudes de cita pendientes</h4>
              <p className="orientador-empty-desc">
                Cuando un padre de familia solicite una reunión, se listará aquí para su confirmación inmediata.
              </p>
            </div>
          ) : (
            <div className="orientador-cards-list">
              {citas.map(c => (
                <div key={c.id} className="orientador-item-card">
                  <div className="orientador-card-top">
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div className="orientador-pill-group">
                        <span className="orientador-pill orientador-pill--emocional">
                          {c.motivo}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7' }}>
                          Tutor: {c.padreNombre} (Alumno: {c.alumnoNombre})
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#d97706', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>event</span>
                        <span>Fecha propuesta: {c.fechaPropuesta} a las {c.horaPropuesta} hrs</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-main, #334155)', lineHeight: 1.45 }}>
                        {c.detalles}
                      </p>
                    </div>

                    <div className="orientador-action-btn-group">
                      {c.estado === 'pendiente' ? (
                        <button
                          type="button"
                          className="orientador-btn-confirm"
                          onClick={() => handleConfirmarCita(c.id)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
                          <span>Confirmar Cita</span>
                        </button>
                      ) : (
                        <span className="orientador-status-chip orientador-status-chip--success">
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                          <span>Cita Confirmada</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Pestaña 4: Radar de Riesgo & Centro BI */}
      {activeTab === 'bi' && (
        <section className="dedicated-tab-content">
          {plantelId ? (
            <BIAnalyticsDashboard userRole="orientador" plantelId={plantelId} />
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Cargando datos del plantel...</div>
          )}
        </section>
      )}

      {/* Modal Nueva Intervención */}
      <BitacoraIntervencionModal
        isOpen={modalIntervencionOpen}
        onClose={() => setModalIntervencionOpen(false)}
        onIntervencionGuardada={() => {
          loadData();
          setActiveTab('intervenciones');
        }}
      />
    </div>
  );
}
