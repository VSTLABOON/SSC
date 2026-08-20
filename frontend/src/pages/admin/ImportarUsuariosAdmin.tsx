import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BulkUserImport from '../../components/BulkUserImport';
import '../DirectivosYAsesores/GestionUsuarios.css';

export default function ImportarUsuariosAdmin() {
  const { plantelId } = useAuth();
  const [modalOpen, setModalOpen] = useState(true);

  return (
    <div className="gu-page animate-fade-in">
      <header className="gu-header">
        <div className="gu-header-text">
          <h2>Importación Masiva de Usuarios</h2>
          <p>Carga por lotes mediante archivos Excel (.xlsx) o CSV con validación de matrícula, grupo y tutor.</p>
        </div>
        <button
          type="button"
          className="gu-invite-btn"
          onClick={() => setModalOpen(true)}
          style={{ background: '#059669' }}
        >
          <span className="material-symbols-outlined">upload_file</span>
          Abrir Asistente de Carga
        </button>
      </header>

      <section className="gu-card" style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>cloud_upload</span>
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Carga Masiva de Alumnos, Docentes y Tutores</h3>
        <p style={{ maxWidth: '540px', color: '#64748b', fontSize: '14px', margin: 0 }}>
          El módulo de importación masiva procesa los registros de tu plantel, valida la integridad de datos, vincula automáticamente estudiantes con sus tutores y activa las cuentas institucionales.
        </p>
        <button
          type="button"
          className="gu-invite-btn"
          onClick={() => setModalOpen(true)}
          style={{ marginTop: '8px' }}
        >
          <span className="material-symbols-outlined">file_open</span>
          Iniciar Carga de Archivo
        </button>
      </section>

      {modalOpen && (
        <BulkUserImport
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onComplete={() => setModalOpen(false)}
          plantelId={plantelId || ''}
        />
      )}
    </div>
  );
}
