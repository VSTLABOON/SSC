import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BIAnalyticsDashboard } from '../../components/bi/BIAnalyticsDashboard';
import { BitacoraIntervencionModal, type IntervencionRecord } from '../../components/orientador/BitacoraIntervencionModal';
import type { JustificanteRecord } from '../../components/alumno/SolicitarJustificanteModal';
import type { CitaRecord } from '../../components/padre/SolicitarCitaModal';
import '../DirectivosYAsesores/InicioDA.css';

type TabType = 'intervenciones' | 'justificantes' | 'citas' | 'bi' | 'operacion';

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
      <section className={`ida-hero${heroVisible ? ' ida-hero--visible' : ''}`} style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.18)', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: '#ffffff' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>psychology</span>
              Orientación Educativa & Psicopedagogía
            </div>
            <h2 className="ida-hero__title">
              Panel de Acompañamiento & Prevención de Deserción
            </h2>
            <p className="ida-hero__subtitle">
              Bienvenido(a), {nombre || 'Orientador(a)'}. Monitoreo focalizado de alumnos en riesgo, justificantes y compromisos con tutores.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="ida-btn-primary"
              onClick={() => setModalIntervencionOpen(true)}
              style={{ width: 'auto', display: 'inline-flex', padding: '10px 16px', fontSize: '13px', background: '#0284c7' }}
            >
              <span className="material-symbols-outlined">psychology</span>
              Registrar Acuerdo / Cita
            </button>
            <button
              type="button"
              className="ida-btn-primary"
              onClick={() => navigate('/orientador/reporte')}
              style={{ width: 'auto', display: 'inline-flex', padding: '10px 16px', fontSize: '13px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)' }}
            >
              <span className="material-symbols-outlined">assignment_add</span>
              Generar Reporte
            </button>
          </div>
        </div>
      </section>

      {/* Selector de Pestañas Dedicadas de Orientación */}
      <div className="dedicated-tabs-container">
        <button
          type="button"
          className={`dedicated-tab-btn ${activeTab === 'intervenciones' ? 'dedicated-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('intervenciones')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>handshake</span>
          Bitácora de Acuerdos ({intervenciones.length})
        </button>
        <button
          type="button"
          className={`dedicated-tab-btn ${activeTab === 'justificantes' ? 'dedicated-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('justificantes')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>fact_check</span>
          Justificantes {justificantesPendientes.length > 0 && `(${justificantesPendientes.length} Pendientes)`}
        </button>
        <button
          type="button"
          className={`dedicated-tab-btn ${activeTab === 'citas' ? 'dedicated-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('citas')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
          Citas con Tutores {citasPendientes.length > 0 && `(${citasPendientes.length} Pendientes)`}
        </button>
        <button
          type="button"
          className={`dedicated-tab-btn ${activeTab === 'bi' ? 'dedicated-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('bi')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>radar</span>
          Radar de Riesgo & Centro BI
        </button>
        <button
          type="button"
          className={`dedicated-tab-btn ${activeTab === 'operacion' ? 'dedicated-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('operacion')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>assignment</span>
          Acciones & Expedientes
        </button>
      </div>

      {/* Pestaña 1: Bitácora de Intervenciones & Acuerdos con Tutores */}
      {activeTab === 'intervenciones' && (
        <section className="dedicated-tab-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--color-text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>clinical_notes</span>
                Bitácora de Acuerdos y Seguimiento Psicopedagógico
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-text-sub, #64748b)' }}>
                Compromisos firmados con tutores legales y planes de regularización conductual.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalIntervencionOpen(true)}
              style={{ background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              Nueva Intervención
            </button>
          </div>

          {intervenciones.length === 0 ? (
            <div style={{ background: 'var(--color-bg-card, #ffffff)', padding: '36px', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--color-border-subtle, #e2e8f0)', color: 'var(--color-text-sub, #64748b)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#38bdf8', marginBottom: '8px' }}>handshake</span>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)' }}>No hay sesiones de intervención registradas aún.</p>
              <p style={{ margin: '6px 0 16px', fontSize: '13px' }}>Registra acuerdos formales con padres de familia de alumnos identificados en Semáforo Naranja o Rojo.</p>
              <button
                type="button"
                onClick={() => setModalIntervencionOpen(true)}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_note</span>
                Registrar Primera Intervención
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {intervenciones.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--color-bg-card, #ffffff)',
                    padding: '18px 20px',
                    borderRadius: '14px',
                    border: '1px solid var(--color-border-subtle, #e2e8f0)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px' }}>
                          {item.tipo}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#204785' }}>
                          Matrícula: {item.matricula}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-sub, #64748b)' }}>
                          • Grupo {item.grupo}
                        </span>
                      </div>
                      <h5 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)' }}>
                        {item.alumnoNombre}
                      </h5>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-sub, #94a3b8)', display: 'block' }}>
                        Fecha de Sesión: {item.fechaSesion}
                      </span>
                      {item.fechaSeguimiento && (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>event_repeat</span>
                          Próxima Cita: {item.fechaSeguimiento}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ background: 'var(--color-bg-app, #f8fafc)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--color-border-subtle, #f1f5f9)', fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text-main, #334155)', whiteSpace: 'pre-line' }}>
                    <strong>Acuerdos Establecidos:</strong> {item.acuerdos}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '11px', color: 'var(--color-text-sub, #94a3b8)' }}>
                    <span>Registrado por: {item.registradoPor}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Pestaña 2: Bandeja de Justificantes de Alumnos */}
      {activeTab === 'justificantes' && (
        <section className="dedicated-tab-content">
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--color-text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>fact_check</span>
              Bandeja de Aprobación de Justificantes de Inasistencia
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-text-sub, #64748b)' }}>
              Revisa y aprueba solicitudes de justificantes médicos y trámites oficiales emitidos por los alumnos.
            </p>
          </div>

          {justificantes.length === 0 ? (
            <div style={{ background: 'var(--color-bg-card, #ffffff)', padding: '36px', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--color-border-subtle, #e2e8f0)', color: 'var(--color-text-sub, #64748b)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#0284c7', marginBottom: '8px' }}>verified</span>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)' }}>No hay solicitudes de justificantes pendientes.</p>
              <p style={{ margin: '6px 0 0', fontSize: '13px' }}>Las solicitudes enviadas por los estudiantes aparecerán aquí para su validación.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {justificantes.map(j => (
                <div
                  key={j.id}
                  style={{
                    background: 'var(--color-bg-card, #ffffff)',
                    padding: '18px 20px',
                    borderRadius: '14px',
                    border: '1px solid var(--color-border-subtle, #e2e8f0)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px' }}>
                        {j.motivo}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)' }}>
                        Periodo: {j.fechaInicio} al {j.fechaFin}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--color-text-main, #334155)', lineHeight: 1.4 }}>
                      {j.descripcion}
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-sub, #94a3b8)' }}>
                      Solicitado el: {new Date(j.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {j.estado === 'pendiente' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleActualizarJustificante(j.id, 'rechazado')}
                          style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
                          Rechazar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleActualizarJustificante(j.id, 'aprobado')}
                          style={{ background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                          Aprobar Justificante
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '9999px', background: j.estado === 'aprobado' ? '#dcfce7' : '#fee2e2', color: j.estado === 'aprobado' ? '#166534' : '#991b1b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{j.estado === 'aprobado' ? 'verified' : 'cancel'}</span>
                        {j.estado === 'aprobado' ? 'Justificante Aprobado' : 'Justificante Rechazado'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Pestaña 3: Citas Solicitadas por Tutores */}
      {activeTab === 'citas' && (
        <section className="dedicated-tab-content">
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--color-text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>calendar_month</span>
              Solicitudes de Cita de Padres de Familia y Tutores
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-text-sub, #64748b)' }}>
              Agenda y confirma sesiones de atención psicopedagógica solicitadas por los tutores.
            </p>
          </div>

          {citas.length === 0 ? (
            <div style={{ background: 'var(--color-bg-card, #ffffff)', padding: '36px', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--color-border-subtle, #e2e8f0)', color: 'var(--color-text-sub, #64748b)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#0284c7', marginBottom: '8px' }}>event_available</span>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)' }}>No hay solicitudes de cita pendientes de tutores.</p>
              <p style={{ margin: '6px 0 0', fontSize: '13px' }}>Cuando un padre de familia solicite una reunión, se listará aquí para su confirmación.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {citas.map(c => (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--color-bg-card, #ffffff)',
                    padding: '18px 20px',
                    borderRadius: '14px',
                    border: '1px solid var(--color-border-subtle, #e2e8f0)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px' }}>
                        {c.motivo}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#204785' }}>
                        Tutor: {c.padreNombre} (Alumno: {c.alumnoNombre})
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#d97706', marginBottom: '4px' }}>
                      📅 Fecha propuesta: {c.fechaPropuesta} a las {c.horaPropuesta} hrs
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-main, #334155)', lineHeight: 1.4 }}>
                      {c.detalles}
                    </p>
                  </div>

                  <div>
                    {c.estado === 'pendiente' ? (
                      <button
                        type="button"
                        onClick={() => handleConfirmarCita(c.id)}
                        style={{ background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
                        Confirmar Cita
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '9999px', background: '#dcfce7', color: '#166534', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                        Cita Confirmada
                      </span>
                    )}
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

      {/* Pestaña 5: Acciones & Expedientes */}
      {activeTab === 'operacion' && (
        <section className="dedicated-tab-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div className="op-card" onClick={() => navigate('/orientador/reporte')} style={{ cursor: 'pointer', background: 'var(--color-bg-card, #ffffff)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border-subtle, #e2e8f0)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#0284c7', background: '#e0f2fe', padding: '10px', borderRadius: '12px' }}>post_add</span>
                <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--color-text-main, #0f172a)' }}>Generar Reporte Disciplinario</h4>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-sub, #64748b)' }}>Registrar reportes de conducta o actas de seguimiento escolar.</p>
            </div>

            <div className="op-card" onClick={() => navigate('/orientador/historial')} style={{ cursor: 'pointer', background: 'var(--color-bg-card, #ffffff)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border-subtle, #e2e8f0)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#204785', background: '#eff6ff', padding: '10px', borderRadius: '12px' }}>history_edu</span>
                <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--color-text-main, #0f172a)' }}>Historial del Plantel</h4>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-sub, #64748b)' }}>Consultar expedientes y bitácora histórica de todos los alumnos.</p>
            </div>
          </div>
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
