import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { getPerfilAlumno } from '../services/alumnos';
import './Profile.css';
import fotoPerfil from "../assets/imagenes/FotoPerfil.jpg";

interface AlumnoProfile {
  id: string;
  matricula: string;
  nivel_semaforo: string;
  puntos_totales: number;
  tipo_sangre: string | null;
  alergias: string | null;
  usuarios: unknown; // Se castea localmente para resolver arrays vs objetos
  grupos: unknown;
  contactos_emergency: Array<{
    nombre: string;
    parentesco: string;
    telefono: string;
  }> | null;
}

export default function Profile() {
  const { session, rol } = useAuth();
  const [alumno, setAlumno] = useState<AlumnoProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadProfile() {
      try {
        let studentId = session!.user!.id;

        if (rol === 'padre') {
          const { data: linkData, error: linkError } = await supabase
            .from('padres_alumnos')
            .select('alumno_id')
            .eq('padre_id', session!.user!.id)
            .maybeSingle();

          if (linkError) throw linkError;
          if (!linkData?.alumno_id) {
            console.warn('El tutor no tiene alumnos vinculados.');
            setAlumno(null);
            setLoading(false);
            return;
          }
          studentId = linkData.alumno_id;
        }

        const profileData = await getPerfilAlumno(studentId);
        setAlumno(profileData as unknown as AlumnoProfile);
      } catch (err) {
        console.error('Error al cargar perfil:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [session, rol]);

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Cargando perfil...</div>;
  }

  const user = (Array.isArray(alumno?.usuarios) ? alumno?.usuarios[0] : alumno?.usuarios) as { nombre?: string; apellido?: string; email?: string } | null;
  const group = (Array.isArray(alumno?.grupos) ? alumno?.grupos[0] : alumno?.grupos) as { nombre?: string } | null;
  const contactoEmergencia = alumno?.contactos_emergency?.[0] || null;

  return (
    <div className="profile-canvas-only">
      {/* HERO CARD — Resumen del perfil del alumno */}
      <section className="hero-card hero-dot-pattern">
        <div className="hero-card__inner">
          {/* Avatar con badge de verificado */}
          <div className="hero-card__avatar-wrapper">
            <div className="hero-card__avatar-ring">
              <img
                alt={`${user?.nombre} ${user?.apellido}`}
                className="w-full h-full rounded-full object-cover"
                src={fotoPerfil}
              />
            </div>

            {/* Badge de verificado */}
            <div className="hero-card__verified-badge" title="Verificado">
              <span className="material-symbols-outlined">verified</span>
            </div>
          </div>

          {/* Información del alumno */}
          <div className="hero-card__info">
            <div className="hero-card__name-row">
              <h1 className="hero-card__name">
                {user?.nombre} {user?.apellido}
              </h1>
              <span className="hero-card__badge">Alumno Regular</span>
            </div>
            <div className="hero-card__details">
              <div className="hero-card__detail-row">
                <span className="material-symbols-outlined">settings_suggest</span>
                <p className="hero-card__detail-text">
                  Estatus Semáforo: {alumno?.nivel_semaforo?.toUpperCase() ?? 'VERDE'} ({alumno?.puntos_totales ?? 100} pts)
                </p>
              </div>
              <div className="hero-card__detail-row">
                <span className="material-symbols-outlined">id_card</span>
                <p className="hero-card__detail-text">Matrícula: {alumno?.matricula || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Botón de editar datos */}
          <div className="hero-card__actions">
            <button className="btn-edit" onClick={() => console.log('Editar datos click')}>
              <span className="material-symbols-outlined">edit</span>
              Editar Datos
            </button>
          </div>
        </div>
      </section>

      {/* GRILLA DE INFORMACIÓN */}
      <section className="info-grid">
        {/* Tarjeta: Información Académica */}
        <div className="info-card">
          <div className="info-card__header">
            <div className="info-card__icon-box">
              <span className="material-symbols-outlined">account_balance</span>
            </div>
            <h3 className="info-card__title">Información Académica</h3>
          </div>
          <div className="info-card__body">
            <div className="info-field">
              <label className="info-field__label">Plantel</label>
              <p className="info-field__value">CONALEP Plantel Puebla I</p>
            </div>
            <div className="info-field">
              <label className="info-field__label">Grupo asignado</label>
              <p className="info-field__value">{group?.nombre || 'Sin Grupo'}</p>
            </div>
            <div className="info-field">
              <label className="info-field__label">Rol del Sistema</label>
              <p className="info-field__value">Estudiante</p>
            </div>
          </div>
        </div>

        {/* Tarjeta: Datos de Contacto */}
        <div className="info-card">
          <div className="info-card__header">
            <div className="info-card__icon-box">
              <span className="material-symbols-outlined">contact_mail</span>
            </div>
            <h3 className="info-card__title">Datos de Contacto</h3>
          </div>
          <div className="info-card__body">
            <div className="info-field">
              <label className="info-field__label">Correo Institucional</label>
              <p className="info-field__value info-field__value--truncate">
                {user?.email || 'N/A'}
              </p>
            </div>
            <div className="info-field">
              <label className="info-field__label">Contacto del Tutor</label>
              <p className="info-field__value">
                {contactoEmergencia ? `${contactoEmergencia.nombre} (${contactoEmergencia.parentesco})` : 'No registrado'}
              </p>
            </div>
            <div className="info-field">
              <label className="info-field__label">Teléfono del Tutor</label>
              <p className="info-field__value">
                {contactoEmergencia?.telefono || 'No registrado'}
              </p>
            </div>
          </div>
        </div>

        {/* Tarjeta: Información Médica */}
        <div className="info-card">
          <div className="info-card__header">
            <div className="info-card__icon-box info-card__icon-box--error">
              <span className="material-symbols-outlined icon-filled">
                medical_services
              </span>
            </div>
            <h3 className="info-card__title">Información Médica</h3>
          </div>
          <div className="info-card__body">
            {/* Tipo de sangre */}
            <div className="info-field info-field--row">
              <div>
                <label className="info-field__label">Tipo de Sangre</label>
                <div className="blood-type-chip">
                  <span className="material-symbols-outlined">water_drop</span>
                  <span>{alumno?.tipo_sangre || 'No especificado'}</span>
                </div>
              </div>
            </div>

            {/* Tutor de emergencia */}
            <div className="info-field">
              <label className="info-field__label">Tutor de Emergencia</label>
              <p className="info-field__value">{contactoEmergencia?.nombre || 'Ninguno registrado'}</p>
              <p className="info-field__sub">{contactoEmergencia?.telefono || 'N/A'}</p>
            </div>

            {/* Alergias */}
            <div className="info-field">
              <label className="info-field__label">Alergias / Notas</label>
              <p className="info-field__value info-field__value--error">
                {alumno?.alergias || 'No especificado'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="page-footer">
        <div className="page-footer__inner">
          <div className="page-footer__copy">
            © 2026 CONALEP. Sistema Integral de Gestión Conductual. Todos los derechos reservados.
          </div>
          <div className="page-footer__links">
            <a href="#">Aviso de Privacidad</a>
            <a href="#">Términos y Condiciones</a>
          </div>
        </div>
      </footer>
    </div>
  );
}