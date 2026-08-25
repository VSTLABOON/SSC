import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BIAnalyticsDashboard } from '../../components/bi/BIAnalyticsDashboard';
import { BitacoraIntervencionModal, type IntervencionRecord } from '../../components/orientador/BitacoraIntervencionModal';
import { GenerarReporteRapidoModal } from '../../components/orientador/GenerarReporteRapidoModal';
import type { JustificanteRecord } from '../../components/alumno/SolicitarJustificanteModal';
import type { CitaRecord } from '../../components/padre/SolicitarCitaModal';
import '../DirectivosYAsesores/InicioDA.css';

type TabType = 'intervenciones' | 'justificantes' | 'citas' | 'bi';

export default function InicioOrientador() {
  const { nombre, plantelId } = useAuth();
  const [heroVisible, setHeroVisible] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('intervenciones');
  const [modalIntervencionOpen, setModalIntervencionOpen] = useState(false);
  const [modalReporteOpen, setModalReporteOpen] = useState(false);
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

    Object.keys(localStorage)
      .filter(k => k.startsWith('ssc_justificantes_'))
      .forEach(k => {
        try {
          const items: JustificanteRecord[] = JSON.parse(localStorage.getItem(k) || '[]');
          const modified = items.map(item => (item.id === id ? { ...item, estado: nuevoEstado } : item));
          localStorage.setItem(k, JSON.stringify(modified));
        } catch {
          // Ignorar
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
          // Ignorar
        }
      });
  }

  const justificantesPendientes = justificantes.filter(j => j.estado === 'pendiente');
  const citasPendientes = citas.filter(c => c.estado === 'pendiente');

  return (
    <div className="ssc-page-canvas animate-fade-in">
      {/* Welcome Hero Orientador */}
      <section className={`ssc-hero ssc-hero--orientador${heroVisible ? ' ssc-hero--visible' : ''}`}>
        <div className="ssc-hero-body">
          <div className="ssc-hero-content">
            <div className="ssc-welcome-chip">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>psychology</span>
              Orientación Educativa & Psicopedagogía
            </div>
            <h2 className="ssc-hero-title">
              Panel de Acompañamiento & Prevención
            </h2>
            <p className="ssc-hero-subtitle">
              Hola, {nombre || 'Orientador(a)'}. Monitoreo integral de acuerdos, justificantes y atención psicopedagógica.
            </p>
          </div>
          <div className="ssc-hero-actions">
            <button
              type="button"
              className="ssc-btn-action ssc-btn-action--primary"
              onClick={() => setModalIntervencionOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
              <span>Registrar Acuerdo</span>
            </button>
            <button
              type="button"
              className="ssc-btn-action ssc-btn-action--secondary"
              onClick={() => setModalReporteOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>assignment_add</span>
              <span>Generar Reporte</span>
            </button>
          </div>
        </div>
      </section>

      {/* Resumen Rápido de Casos / KPIs de Orientación */}
      <div className="ssc-kpi-grid">
        <div
          className={`ssc-kpi-card ${activeTab === 'justificantes' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('justificantes')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Justificantes</div>
            <div className="ssc-kpi-value">{justificantesPendientes.length}</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: justificantesPendientes.length > 0 ? '#ef4444' : '#10b981' }}>
                {justificantesPendientes.length > 0 ? 'pending_actions' : 'check_circle'}
              </span>
              <span>{justificantesPendientes.length > 0 ? 'Por validar' : 'Al día'}</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <span className="material-symbols-outlined">fact_check</span>
          </div>
        </div>

        <div
          className={`ssc-kpi-card ${activeTab === 'citas' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('citas')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Citas de Tutores</div>
            <div className="ssc-kpi-value">{citasPendientes.length}</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: citasPendientes.length > 0 ? '#f59e0b' : '#10b981' }}>
                {citasPendientes.length > 0 ? 'schedule' : 'task_alt'}
              </span>
              <span>{citasPendientes.length > 0 ? 'Por confirmar' : 'Al día'}</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
            <span className="material-symbols-outlined">calendar_month</span>
          </div>
        </div>

        <div
          className={`ssc-kpi-card ${activeTab === 'intervenciones' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('intervenciones')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Bitácora Activa</div>
            <div className="ssc-kpi-value">{intervenciones.length}</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#0284c7' }}>history_edu</span>
              <span>Acuerdos registrados</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#e0e7ff', color: '#4338ca' }}>
            <span className="material-symbols-outlined">handshake</span>
          </div>
        </div>

        <div
          className={`ssc-kpi-card ${activeTab === 'bi' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('bi')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Radar de Riesgo</div>
            <div className="ssc-kpi-value" style={{ fontSize: '18px', paddingTop: '3px' }}>Centro BI</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#10b981' }}>analytics</span>
              <span>Métricas del plantel</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#dcfce7', color: '#15803d' }}>
            <span className="material-symbols-outlined">radar</span>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas de Orientación */}
      <nav className="ssc-tabs-nav" aria-label="Secciones de Orientación">
        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'intervenciones' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('intervenciones')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>handshake</span>
          <span>Acuerdos y Bitácora</span>
          <span className="ssc-tab-badge">{intervenciones.length}</span>
        </button>

        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'justificantes' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('justificantes')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>fact_check</span>
          <span>Validación de Justificantes</span>
          <span className={`ssc-tab-badge ${justificantesPendientes.length > 0 ? 'ssc-tab-badge--pending' : ''}`}>
            {justificantesPendientes.length}
          </span>
        </button>

        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'citas' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('citas')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
          <span>Citas con Tutores</span>
          <span className={`ssc-tab-badge ${citasPendientes.length > 0 ? 'ssc-tab-badge--pending' : ''}`}>
            {citasPendientes.length}
          </span>
        </button>

        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'bi' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('bi')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>analytics</span>
          <span>Radar de Riesgo BI</span>
        </button>
      </nav>

      {/* Pestaña 1: Bitácora de Acuerdos */}
      {activeTab === 'intervenciones' && (
        <section className="dedicated-tab-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>handshake</span>
                Bitácora de Acuerdos y Seguimiento Psicopedagógico
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--color-text-sub, #64748b)' }}>
                Historial de sesiones y compromisos acordados con estudiantes y padres de familia.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalIntervencionOpen(true)}
              className="ssc-btn-action ssc-btn-action--primary"
              style={{ background: '#0284c7', color: '#ffffff', padding: '8px 16px', fontSize: '13px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              <span>Nuevo Acuerdo</span>
            </button>
          </div>

          {intervenciones.length === 0 ? (
            <div className="ssc-empty-state">
              <span className="material-symbols-outlined ssc-empty-icon">history_edu</span>
              <h4 className="ssc-empty-title">No hay acuerdos registrados en la bitácora</h4>
              <p className="ssc-empty-desc">
                Comienza a registrar las sesiones de orientación para dar seguimiento conductual y académico personalizado.
              </p>
              <button
                type="button"
                className="ssc-btn-action ssc-btn-action--primary"
                onClick={() => setModalIntervencionOpen(true)}
                style={{ background: '#0284c7', color: '#ffffff' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
                <span>Registrar Primer Acuerdo</span>
              </button>
            </div>
          ) : (
            <div className="ssc-cards-list">
              {intervenciones.map(item => (
                <div key={item.id} className="ssc-item-card">
                  <div className="ssc-card-top">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '4px' }}>
                          Área: {item.tipo}
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--color-text-sub, #64748b)' }}>
                          Sesión: {item.fechaSesion}
                        </span>
                      </div>
                      <h4 className="ssc-card-title">{item.alumnoNombre}</h4>
                    </div>

                    {item.fechaSeguimiento && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 700 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>event</span>
                        <span>Próxima Cita: {item.fechaSeguimiento}</span>
                      </div>
                    )}
                  </div>

                  <div className="ssc-note-box" style={{ borderLeftColor: '#0284c7' }}>
                    <strong>Acuerdos y Compromisos:</strong> {item.acuerdos}
                  </div>

                  <div className="ssc-card-footer">
                    <span>Registrado por: <strong>{item.registradoPor}</strong></span>
                    <span>Fecha: {new Date(item.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Pestaña 2: Validación de Justificantes */}
      {activeTab === 'justificantes' && (
        <section className="dedicated-tab-content">
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main, #0f172a)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>fact_check</span>
              Solicitudes de Justificantes Médicos y Familiares ({justificantes.length})
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-sub, #64748b)' }}>
              Revisa, aprueba o rechaza los justificantes presentados por los estudiantes del plantel.
            </p>
          </div>

          {justificantes.length === 0 ? (
            <div className="ssc-empty-state">
              <span className="material-symbols-outlined ssc-empty-icon">task_alt</span>
              <h4 className="ssc-empty-title">Bandeja de justificantes al día</h4>
              <p className="ssc-empty-desc">No hay solicitudes de inasistencia pendientes de revisión en este momento.</p>
            </div>
          ) : (
            <div className="ssc-cards-list">
              {justificantes.map(j => (
                <div key={j.id} className="ssc-item-card">
                  <div className="ssc-card-top">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px' }}>
                          {j.motivo}
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--color-text-sub, #64748b)' }}>
                          Periodo: {j.fechaInicio} al {j.fechaFin}
                        </span>
                      </div>
                      <h4 className="ssc-card-title">Estudiante ID: {j.alumnoId}</h4>
                    </div>

                    <span style={{ fontSize: '11.5px', fontWeight: 800, padding: '4px 10px', borderRadius: '9999px', background: j.estado === 'aprobado' ? '#dcfce7' : j.estado === 'rechazado' ? '#fee2e2' : '#fef3c7', color: j.estado === 'aprobado' ? '#166534' : j.estado === 'rechazado' ? '#991b1b' : '#92400e' }}>
                      {j.estado === 'aprobado' ? 'Aprobado' : j.estado === 'rechazado' ? 'Rechazado' : 'Pendiente de Validación'}
                    </span>
                  </div>

                  <div className="ssc-note-box" style={{ borderLeftColor: '#0284c7' }}>
                    <strong>Motivo expuesto:</strong> {j.descripcion}
                  </div>

                  {j.estado === 'pendiente' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => handleActualizarJustificante(j.id, 'aprobado')}
                        style={{ background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                        <span>Aprobar Justificante</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActualizarJustificante(j.id, 'rechazado')}
                        style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
                        <span>Rechazar</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Pestaña 3: Citas de Tutores */}
      {activeTab === 'citas' && (
        <section className="dedicated-tab-content">
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main, #0f172a)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>calendar_month</span>
              Solicitudes de Citas con Padres de Familia ({citas.length})
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-sub, #64748b)' }}>
              Agenda y confirma entrevistas presenciales o virtuales con los tutores de los alumnos.
            </p>
          </div>

          {citas.length === 0 ? (
            <div className="ssc-empty-state">
              <span className="material-symbols-outlined ssc-empty-icon">event_available</span>
              <h4 className="ssc-empty-title">Agenda de citas al día</h4>
              <p className="ssc-empty-desc">No hay solicitudes de entrevista familiar pendientes por confirmar.</p>
            </div>
          ) : (
            <div className="ssc-cards-list">
              {citas.map(c => (
                <div key={c.id} className="ssc-item-card">
                  <div className="ssc-card-top">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '4px' }}>
                          {c.motivo}
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--color-text-sub, #64748b)' }}>
                          Fecha Propuesta: {c.fechaPropuesta} a las {c.horaPropuesta} hrs
                        </span>
                      </div>
                      <h4 className="ssc-card-title">{c.padreNombre} (Tutor de {c.alumnoNombre})</h4>
                    </div>

                    <span style={{ fontSize: '11.5px', fontWeight: 800, padding: '4px 10px', borderRadius: '9999px', background: c.estado === 'confirmada' ? '#dcfce7' : c.estado === 'reprogramada' ? '#fee2e2' : '#fef3c7', color: c.estado === 'confirmada' ? '#166534' : c.estado === 'reprogramada' ? '#991b1b' : '#92400e' }}>
                      {c.estado === 'confirmada' ? 'Confirmada' : c.estado === 'reprogramada' ? 'Reprogramada' : 'Por Confirmar'}
                    </span>
                  </div>

                  <div className="ssc-note-box" style={{ borderLeftColor: '#0284c7' }}>
                    <strong>Asunto a tratar:</strong> {c.detalles}
                  </div>

                  {c.estado === 'pendiente' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => handleConfirmarCita(c.id)}
                        style={{ background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>event_available</span>
                        <span>Confirmar Cita</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Pestaña 4: Centro BI Radar */}
      {activeTab === 'bi' && (
        <section className="dedicated-tab-content">
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main, #0f172a)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>analytics</span>
              Radar de Salud Conductual & Analítica BI
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-sub, #64748b)' }}>
              Indicadores globales del plantel, semáforos de riesgo y métricas de desempeño conductual.
            </p>
          </div>

          {plantelId ? (
            <BIAnalyticsDashboard userRole="orientador" plantelId={plantelId} />
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Cargando datos del plantel...</div>
          )}
        </section>
      )}

      {/* Modal Bitácora de Intervención */}
      <BitacoraIntervencionModal
        isOpen={modalIntervencionOpen}
        onClose={() => setModalIntervencionOpen(false)}
        onIntervencionGuardada={(newRecord) => {
          setIntervenciones(prev => [newRecord, ...prev]);
        }}
      />

      {/* Modal Generar Reporte Rápido */}
      <GenerarReporteRapidoModal
        isOpen={modalReporteOpen}
        onClose={() => setModalReporteOpen(false)}
      />
    </div>
  );
}
