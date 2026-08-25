import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { BIAnalyticsDashboard } from '../../components/bi/BIAnalyticsDashboard';
import { BitacoraIntervencionModal, type IntervencionRecord } from '../../components/orientador/BitacoraIntervencionModal';
import { GenerarReporteRapidoModal } from '../../components/orientador/GenerarReporteRapidoModal';
import type { JustificanteRecord } from '../../components/alumno/SolicitarJustificanteModal';
import { getCitasOrientacion, confirmarCitaOrientacion, type CitaRecord } from '../../services/citas';
import InlineAlert from '../../components/InlineAlert';
import '../DirectivosYAsesores/InicioDA.css';

type TabType = 'intervenciones' | 'justificantes' | 'citas' | 'bi';

export default function InicioOrientador() {
  const { session, nombre, plantelId } = useAuth();
  const [heroVisible, setHeroVisible] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('intervenciones');
  const [modalIntervencionOpen, setModalIntervencionOpen] = useState(false);
  const [modalReporteOpen, setModalReporteOpen] = useState(false);
  const [intervenciones, setIntervenciones] = useState<IntervencionRecord[]>([]);
  const [justificantes, setJustificantes] = useState<JustificanteRecord[]>([]);
  const [citas, setCitas] = useState<CitaRecord[]>([]);
  const [nativeToast, setNativeToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const loadData = useCallback(async () => {
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

    // 3. Citas de Tutores en Tiempo Real desde Supabase y Memoria
    try {
      const citasData = await getCitasOrientacion(plantelId || undefined);
      setCitas(citasData);
    } catch (e) {
      console.warn('Error al cargar citas de tutores:', e);
    }
  }, [plantelId]);

  useEffect(() => {
    loadData();

    // Suscripción WebSocket Realtime para recibir citas de tutores al instante
    const channel = supabase
      .channel('realtime-ssc-citas-orientador')
      .on('broadcast', { event: 'nueva_cita' }, (payload: any) => {
        loadData();
        const c = payload?.payload?.cita;
        if (c) {
          setNativeToast({
            type: 'success',
            message: `Nueva solicitud de cita recibida de ${c.padreNombre} para ${c.alumnoNombre} (${c.motivo}).`,
          });
        }
      })
      .on('broadcast', { event: 'cita_confirmada' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalCita = () => {
      loadData();
    };
    window.addEventListener('ssc_cita_creada', handleLocalCita);
    window.addEventListener('ssc_cita_actualizada', handleLocalCita);
    window.addEventListener('ssc_data_changed', handleLocalCita);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ssc_cita_creada', handleLocalCita);
      window.removeEventListener('ssc_cita_actualizada', handleLocalCita);
      window.removeEventListener('ssc_data_changed', handleLocalCita);
    };
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

  async function handleConfirmarCita(id: string) {
    try {
      const updatedRecord = await confirmarCitaOrientacion(
        id,
        session?.user?.id || 'orientador',
        nombre || 'Orientador Educativo',
        plantelId || undefined
      );

      if (updatedRecord) {
        setCitas(prev => prev.map(c => (c.id === id ? updatedRecord : c)));
      } else {
        setCitas(prev => prev.map(c => (c.id === id ? { ...c, estado: 'confirmada' as const } : c)));
      }

      setNativeToast({
        type: 'success',
        message: 'Cita confirmada exitosamente. Se ha actualizado en tiempo real y notificado al tutor.',
      });
    } catch (err: unknown) {
      console.error('Error al confirmar cita:', err);
    }
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

      {/* Banner de Notificaciones / Alarmas Nativas */}
      {nativeToast && (
        <div style={{ marginBottom: '14px' }}>
          <InlineAlert
            type={nativeToast.type}
            message={nativeToast.message}
            onClose={() => setNativeToast(null)}
          />
        </div>
      )}

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
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#10b981' }}>
                psychology
              </span>
              <span>Intervenciones</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <span className="material-symbols-outlined">menu_book</span>
          </div>
        </div>

        <div
          className={`ssc-kpi-card ${activeTab === 'bi' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('bi')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Inteligencia BI</div>
            <div className="ssc-kpi-value">
              <span className="material-symbols-outlined" style={{ fontSize: '24px', verticalAlign: 'middle' }}>analytics</span>
            </div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#0284c7' }}>
                trending_up
              </span>
              <span>Métricas globales</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <span className="material-symbols-outlined">insights</span>
          </div>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <nav className="ssc-tabs-nav">
        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'intervenciones' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('intervenciones')}
        >
          <span className="material-symbols-outlined">history_edu</span>
          <span>Bitácora de Intervención</span>
          <span className="ssc-tab-badge">{intervenciones.length}</span>
        </button>

        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'justificantes' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('justificantes')}
        >
          <span className="material-symbols-outlined">fact_check</span>
          <span>Justificantes de Alumnos</span>
          <span className={`ssc-tab-badge ${justificantesPendientes.length > 0 ? 'ssc-tab-badge--pending' : ''}`}>
            {justificantesPendientes.length}
          </span>
        </button>

        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'citas' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('citas')}
        >
          <span className="material-symbols-outlined">calendar_month</span>
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
          <span className="material-symbols-outlined">analytics</span>
          <span>Métricas BI & Radar de Riesgo</span>
        </button>
      </nav>

      {/* Pestaña 1: Bitácora de Intervención */}
      {activeTab === 'intervenciones' && (
        <section className="ssc-card animate-fade-in">
          <div className="ssc-card-header">
            <div className="ssc-card-header-left">
              <h3 className="ssc-card-title">
                Bitácora de Acuerdos y Seguimiento Psicopedagógico ({intervenciones.length})
              </h3>
              <p className="ssc-card-subtitle">
                Historial institucional de acuerdos, compromisos y canalizaciones con estudiantes y tutores.
              </p>
            </div>
            <button
              type="button"
              className="ssc-btn-action ssc-btn-action--primary"
              onClick={() => setModalIntervencionOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>add</span>
              <span>Nueva Entrada</span>
            </button>
          </div>

          {intervenciones.length === 0 ? (
            <div className="ssc-empty-state">
              <span className="material-symbols-outlined ssc-empty-icon">history_edu</span>
              <h4 className="ssc-empty-title">Sin intervenciones registradas</h4>
              <p className="ssc-empty-desc">
                Comienza a registrar acuerdos, entrevistas de orientación y compromisos de mejora conductual.
              </p>
              <button
                type="button"
                className="ssc-btn-action ssc-btn-action--primary"
                onClick={() => setModalIntervencionOpen(true)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>add</span>
                <span>Registrar Primera Intervención</span>
              </button>
            </div>
          ) : (
            <div className="ssc-list-container">
              {intervenciones.map(item => (
                <div key={item.id} className="ssc-list-item">
                  <div className="ssc-list-item-main">
                    <div className="ssc-avatar ssc-avatar--orientador">
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {item.tipo === 'conductual' ? 'psychology' : item.tipo === 'academico' ? 'school' : item.tipo === 'emocional' ? 'favorite' : 'family_restroom'}
                      </span>
                    </div>
                    <div className="ssc-list-item-text">
                      <div className="ssc-list-item-top">
                        <strong className="ssc-list-item-title">{item.alumnoNombre}</strong>
                        <span className="ssc-tag ssc-tag--gray">{item.matricula} • {item.grupo}</span>
                        <span className="ssc-tag ssc-tag--blue" style={{ textTransform: 'capitalize' }}>{item.tipo}</span>
                      </div>
                      <p className="ssc-list-item-desc">{item.acuerdos}</p>
                      <div className="ssc-list-item-meta">
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>person</span>
                        <span>Orientador: {item.registradoPor}</span>
                        <span style={{ margin: '0 4px' }}>•</span>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>calendar_today</span>
                        <span>{new Date(item.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        {item.fechaSeguimiento && (
                          <>
                            <span style={{ margin: '0 4px' }}>•</span>
                            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#f59e0b' }}>event_repeat</span>
                            <span style={{ color: '#d97706', fontWeight: 600 }}>Próxima Cita: {item.fechaSeguimiento}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Pestaña 2: Justificantes Médicos / Académicos */}
      {activeTab === 'justificantes' && (
        <section className="ssc-card animate-fade-in">
          <div className="ssc-card-header">
            <div className="ssc-card-header-left">
              <h3 className="ssc-card-title">
                Solicitudes de Justificantes Médicos y Académicos ({justificantes.length})
              </h3>
              <p className="ssc-card-subtitle">
                Validación de inasistencias enviadas por alumnos y tutores con documento probatorio.
              </p>
            </div>
          </div>

          {justificantes.length === 0 ? (
            <div className="ssc-empty-state">
              <span className="material-symbols-outlined ssc-empty-icon">task_alt</span>
              <h4 className="ssc-empty-title">Bandeja de justificantes al día</h4>
              <p className="ssc-empty-desc">
                No hay justificantes pendientes de revisión en este momento.
              </p>
            </div>
          ) : (
            <div className="ssc-list-container">
              {justificantes.map(j => (
                <div key={j.id} className="ssc-list-item">
                  <div className="ssc-list-item-main">
                    <div className={`ssc-avatar ${j.estado === 'pendiente' ? 'ssc-avatar--pending' : j.estado === 'aprobado' ? 'ssc-avatar--success' : 'ssc-avatar--danger'}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {j.estado === 'pendiente' ? 'hourglass_top' : j.estado === 'aprobado' ? 'check_circle' : 'cancel'}
                      </span>
                    </div>
                    <div className="ssc-list-item-text">
                      <div className="ssc-list-item-top">
                        <strong className="ssc-list-item-title">{j.motivo}</strong>
                        <span className={`ssc-tag ${j.estado === 'pendiente' ? 'ssc-tag--yellow' : j.estado === 'aprobado' ? 'ssc-tag--green' : 'ssc-tag--red'}`}>
                          {j.estado === 'pendiente' ? 'Por Validar' : j.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}
                        </span>
                      </div>
                      <p className="ssc-list-item-desc">
                        {j.descripcion}
                      </p>
                      <div className="ssc-list-item-meta">
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>date_range</span>
                        <span>Ausencia del {j.fechaInicio} al {j.fechaFin}</span>
                      </div>
                    </div>
                  </div>
                  {j.estado === 'pendiente' && (
                    <div className="ssc-list-item-actions">
                      <button
                        type="button"
                        className="ssc-btn-action ssc-btn-action--success-sm"
                        onClick={() => handleActualizarJustificante(j.id, 'aprobado')}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check</span>
                        <span>Aprobar</span>
                      </button>
                      <button
                        type="button"
                        className="ssc-btn-action ssc-btn-action--danger-sm"
                        onClick={() => handleActualizarJustificante(j.id, 'rechazado')}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
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
        <section className="ssc-card animate-fade-in">
          <div className="ssc-card-header">
            <div className="ssc-card-header-left">
              <h3 className="ssc-card-title">
                Solicitudes de Citas con Padres de Familia ({citas.length})
              </h3>
              <p className="ssc-card-subtitle">
                Atención a peticiones de diálogo presencial o virtual solicitadas por los tutores.
              </p>
            </div>
          </div>

          {citas.length === 0 ? (
            <div className="ssc-empty-state">
              <span className="material-symbols-outlined ssc-empty-icon">calendar_month</span>
              <h4 className="ssc-empty-title">Agenda de citas al día</h4>
              <p className="ssc-empty-desc">
                No hay solicitudes de citas pendientes por parte de los padres de familia.
              </p>
            </div>
          ) : (
            <div className="ssc-list-container">
              {citas.map(c => (
                <div key={c.id} className="ssc-list-item">
                  <div className="ssc-list-item-main">
                    <div className={`ssc-avatar ${c.estado === 'pendiente' ? 'ssc-avatar--pending' : 'ssc-avatar--success'}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {c.estado === 'pendiente' ? 'schedule' : 'event_available'}
                      </span>
                    </div>
                    <div className="ssc-list-item-text">
                      <div className="ssc-list-item-top">
                        <strong className="ssc-list-item-title">Cita para {c.alumnoNombre}</strong>
                        <span className="ssc-tag ssc-tag--gray">Tutor: {c.padreNombre}</span>
                        <span className={`ssc-tag ${c.estado === 'pendiente' ? 'ssc-tag--yellow' : 'ssc-tag--green'}`}>
                          {c.estado === 'pendiente' ? 'Por Confirmar' : 'Confirmada'}
                        </span>
                      </div>
                      <p className="ssc-list-item-desc">
                        <strong>Motivo:</strong> {c.motivo} — {c.detalles}
                      </p>
                      <div className="ssc-list-item-meta">
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>calendar_today</span>
                        <span>Fecha Sugerida: {c.fechaPropuesta} a las {c.horaPropuesta} hrs</span>
                        <span style={{ margin: '0 4px' }}>•</span>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>history</span>
                        <span>Solicitada: {new Date(c.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        {c.confirmadaPor && (
                          <>
                            <span style={{ margin: '0 4px' }}>•</span>
                            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#10b981' }}>verified</span>
                            <span style={{ color: '#065f46', fontWeight: 600 }}>Atendido por: {c.confirmadaPor}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {c.estado === 'pendiente' && (
                    <div className="ssc-list-item-actions">
                      <button
                        type="button"
                        className="ssc-btn-action ssc-btn-action--success-sm"
                        onClick={() => handleConfirmarCita(c.id)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>event_available</span>
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

      {/* Pestaña 4: Inteligencia de Negocios BI & Radar de Riesgo */}
      {activeTab === 'bi' && (
        <section className="ssc-card animate-fade-in">
          <div className="ssc-card-header">
            <div className="ssc-card-header-left">
              <h3 className="ssc-card-title">
                Tablero Analítico de Salud Conductual & Radar BI
              </h3>
              <p className="ssc-card-subtitle">
                Análisis multidimensional en tiempo real de incidencias, tendencias y alumnos en riesgo prioritario.
              </p>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <BIAnalyticsDashboard userRole="orientador" plantelId={plantelId || undefined} />
          </div>
        </section>
      )}

      {/* Modal Bitácora de Intervención */}
      <BitacoraIntervencionModal
        isOpen={modalIntervencionOpen}
        onClose={() => setModalIntervencionOpen(false)}
        onIntervencionGuardada={(newIntervencion) => {
          setIntervenciones(prev => [newIntervencion, ...prev]);
        }}
      />

      {/* Modal Generar Reporte Rápido */}
      <GenerarReporteRapidoModal
        isOpen={modalReporteOpen}
        onClose={() => setModalReporteOpen(false)}
        onReporteGenerado={() => {
          loadData();
        }}
      />
    </div>
  );
}
