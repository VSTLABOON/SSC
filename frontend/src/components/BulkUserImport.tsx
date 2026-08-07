import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import './BulkUserImport.css';
import InlineAlert from './InlineAlert';

interface BulkUserImportProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  plantelId: string;
}

interface RegistroImportacion {
  fila: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  matricula?: string;
  grupo?: string;
  carrera?: string;
  semestre?: number;
  tutor_email?: string;
  tutor_nombre?: string;
  tutor_apellido?: string;
  tel_emergencia?: string;
  estado: 'valido' | 'error' | 'aviso';
  mensaje_error?: string;
}

const ROLES_VALIDOS = ['alumno', 'docente', 'orientador', 'padre'];

export default function BulkUserImport({ isOpen, onClose, onComplete, plantelId }: BulkUserImportProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [registros, setRegistros] = useState<RegistroImportacion[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'validos' | 'errores'>('todos');
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  // Estados paso 3
  const [progreso, setProgreso] = useState(0);
  const [registrosProcesados, setRegistrosProcesados] = useState(0);
  const [exitosos, setExitosos] = useState(0);
  const [fallidos, setFallidos] = useState<{ fila: number, email: string, error: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => document.body.classList.remove('no-scroll');
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setRegistros([]);
      setFiltro('todos');
      setErrorGlobal(null);
      setProgreso(0);
      setRegistrosProcesados(0);
      setExitosos(0);
      setFallidos([]);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Generación de plantillas ────────────────────────────────────────────────
  const handleDownloadTemplate = (tipo: 'alumnos' | 'personal') => {
    let headers: string[] = [];
    let filename = '';

    if (tipo === 'alumnos') {
      headers = ['Matricula', 'Nombre', 'Apellido', 'Email', 'Grupo', 'Carrera', 'Semestre', 'Email_Tutor', 'Nombre_Tutor', 'Apellido_Tutor', 'Tel_Emergencia'];
      filename = 'Plantilla_Alumnos.xlsx';
    } else {
      headers = ['Email', 'Nombre', 'Apellido', 'Rol'];
      filename = 'Plantilla_Personal.xlsx';
    }

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, filename);
  };

  // ── Drag & Drop y lectura de archivo ──────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) procesarArchivo(files[0]);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) procesarArchivo(files[0]);
  };

  const procesarArchivo = async (file: File) => {
    setErrorGlobal(null);
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValid) {
      setErrorGlobal('Formato de archivo inválido. Sube un archivo .xlsx o .csv.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        await validarYTransformarFilas(rows);
      } catch (err) {
        setErrorGlobal('Ocurrió un error al leer el archivo. Verifica su formato.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Validación ─────────────────────────────────────────────────────────────
  const validarYTransformarFilas = async (rows: any[]) => {
    // 1. Obtener emails existentes
    let emailsExistentes = new Set<string>();
    try {
      const { data } = await supabase.from('usuarios').select('email').eq('plantel_id', plantelId);
      if (data) {
        emailsExistentes = new Set(data.map(u => u.email.toLowerCase()));
      }
    } catch (e) {
      console.error('No se pudieron verificar emails existentes', e);
    }

    const nuevosRegistros: RegistroImportacion[] = [];
    const emailsEnArchivo = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const fila = i + 2; // +1 para 1-index, +1 por headers
      
      const email = String(r['Email'] || '').trim().toLowerCase();
      const nombre = String(r['Nombre'] || '').trim();
      const apellido = String(r['Apellido'] || '').trim();
      let rol = String(r['Rol'] || '').trim().toLowerCase();
      const matricula = String(r['Matricula'] || '').trim();

      // Inferencia de rol
      if (!rol && r['Matricula']) rol = 'alumno';
      else if (!rol) rol = 'docente';

      const registro: RegistroImportacion = {
        fila, email, nombre, apellido, rol,
        matricula,
        grupo: String(r['Grupo'] || ''),
        carrera: String(r['Carrera'] || ''),
        semestre: r['Semestre'] ? Number(r['Semestre']) : undefined,
        tutor_email: String(r['Email_Tutor'] || '').trim().toLowerCase(),
        tutor_nombre: String(r['Nombre_Tutor'] || '').trim(),
        tutor_apellido: String(r['Apellido_Tutor'] || '').trim(),
        tel_emergencia: String(r['Tel_Emergencia'] || '').trim(),
        estado: 'valido'
      };

      let errores = [];

      // Validaciones requeridas
      if (!email || !nombre || !apellido) errores.push('Faltan campos obligatorios (Email, Nombre, Apellido).');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.push('Formato de email inválido.');
      if (rol === 'alumno' && !matricula) errores.push('La matrícula es obligatoria para alumnos.');
      if (!ROLES_VALIDOS.includes(rol)) errores.push('Rol inválido. Debe ser: alumno, docente, orientador, padre.');

      // Duplicados
      if (email) {
        if (emailsExistentes.has(email)) errores.push('El correo ya existe en el plantel.');
        if (emailsEnArchivo.has(email)) errores.push('Correo duplicado en este archivo.');
        emailsEnArchivo.add(email);
      }

      if (errores.length > 0) {
        registro.estado = 'error';
        registro.mensaje_error = errores.join(' ');
      }

      nuevosRegistros.push(registro);
    }

    setRegistros(nuevosRegistros);
    setStep(2);
  };

  // ── Procesamiento por lotes (Edge function) ──────────────────────────────
  const handleContinuar = async () => {
    const validos = registros.filter(r => r.estado === 'valido');
    if (validos.length === 0) return;

    setStep(3);
    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No hay sesión activa.');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const CHUNK_SIZE = 50;
      
      let procesados = 0;
      let okCount = 0;
      const currentFallidos: { fila: number, email: string, error: string }[] = [];

      for (let i = 0; i < validos.length; i += CHUNK_SIZE) {
        const chunk = validos.slice(i, i + CHUNK_SIZE);
        
        // Mapear campos del RegistroImportacion al formato esperado por la Edge Function
        const payload = chunk.map(r => ({
          email: r.email,
          nombre: r.nombre,
          apellido: r.apellido,
          rol: r.rol,
          matricula: r.matricula || undefined,
          grupo_nombre: r.grupo || undefined,
          carrera_nombre: r.carrera || undefined,
          semestre: r.semestre || undefined,
          tutor_email: r.tutor_email || undefined,
          tutor_nombre: r.tutor_nombre || undefined,
          tutor_apellido: r.tutor_apellido || undefined,
          tel_emergencia: r.tel_emergencia || undefined,
        }));

        const res = await fetch(`${supabaseUrl}/functions/v1/batch-provision-users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ usuarios: payload })
        });

        const json = await res.json();
        
        if (!res.ok) {
          // Lote falló completo o error general
          chunk.forEach(u => currentFallidos.push({ fila: u.fila, email: u.email, error: json.error || 'Error de procesamiento' }));
        } else if (json.resultados) {
          // Evaluar respuestas individuales del backend
          json.resultados.forEach((r: { email: string; exito: boolean; error?: string }, idx: number) => {
            if (r.exito) {
              okCount++;
            } else {
              currentFallidos.push({ fila: chunk[idx]?.fila || 0, email: r.email, error: r.error || 'Error desconocido' });
            }
          });
        } else {
          okCount += chunk.length;
        }

        procesados += chunk.length;
        setRegistrosProcesados(procesados);
        setProgreso(Math.round((procesados / validos.length) * 100));
      }

      setExitosos(okCount);
      setFallidos(currentFallidos);
    } catch (err: unknown) {
      setErrorGlobal(err instanceof Error ? err.message : 'Error desconocido durante el procesamiento.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizar = () => {
    onComplete();
    onClose();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const registrosFiltrados = registros.filter(r => 
    filtro === 'todos' ? true :
    filtro === 'validos' ? r.estado === 'valido' : r.estado === 'error'
  );

  const totalValidos = registros.filter(r => r.estado === 'valido').length;
  const totalErrores = registros.filter(r => r.estado === 'error').length;

  return (
    <div className="bui-modal-overlay" onClick={e => { if (e.target === e.currentTarget && step !== 3) onClose(); }}>
      <div className="bui-modal">
        <div className="bui-modal-header">
          <h3>Alta Masiva de Usuarios</h3>
          {step !== 3 && (
            <button className="bui-modal-close" onClick={onClose}>
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {errorGlobal && (
          <div style={{ marginBottom: 16 }}>
            <InlineAlert type="error" message={errorGlobal} onClose={() => setErrorGlobal(null)} />
          </div>
        )}

        <div className="bui-content">
          {/* STEP 1: Upload */}
          {step === 1 && (
            <>
              <div className="bui-templates-actions">
                <button type="button" className="bui-btn-outline" onClick={() => handleDownloadTemplate('alumnos')}>
                  <span className="material-symbols-outlined">download</span>
                  Plantilla Alumnos
                </button>
                <button type="button" className="bui-btn-outline" onClick={() => handleDownloadTemplate('personal')}>
                  <span className="material-symbols-outlined">download</span>
                  Plantilla Docentes/Personal
                </button>
              </div>

              <div 
                className={`bui-dropzone ${isDragging ? 'drag-active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined">upload_file</span>
                <span className="bui-dropzone-text">Arrastra tu archivo aquí o haz clic para subir</span>
                <span className="bui-dropzone-subtext">Soporta formatos .xlsx y .csv</span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="bui-hidden-input" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileSelect} 
                />
              </div>
            </>
          )}

          {/* STEP 2: Preview */}
          {step === 2 && (
            <>
              <div className="bui-summary-bar">
                <span>{registros.length} registros encontrados — {totalValidos} válidos — {totalErrores} con errores</span>
                <div className="bui-filters">
                  <button className={`bui-filter-btn ${filtro === 'todos' ? 'active' : ''}`} onClick={() => setFiltro('todos')}>Todos</button>
                  <button className={`bui-filter-btn ${filtro === 'validos' ? 'active' : ''}`} onClick={() => setFiltro('validos')}>Válidos</button>
                  <button className={`bui-filter-btn ${filtro === 'errores' ? 'active' : ''}`} onClick={() => setFiltro('errores')}>Con Errores</button>
                </div>
              </div>

              {totalErrores > 0 && (
                <InlineAlert type="error" message="Corrige los errores antes de continuar o continua solo con los registros válidos." />
              )}

              <div className="bui-table-container">
                <table className="bui-table">
                  <thead>
                    <tr>
                      <th>Fila</th>
                      <th>Estado</th>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Matrícula</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosFiltrados.map((r, idx) => (
                      <tr key={idx}>
                        <td>{r.fila}</td>
                        <td>
                          <span className={`bui-status-dot ${r.estado}`}></span>
                          {r.estado === 'valido' ? 'Válido' : 'Error'}
                        </td>
                        <td>
                          {r.nombre} {r.apellido}
                          {r.mensaje_error && <span className="bui-error-text">{r.mensaje_error}</span>}
                        </td>
                        <td>{r.email}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.rol}</td>
                        <td>{r.matricula || '-'}</td>
                      </tr>
                    ))}
                    {registrosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                          No hay registros que coincidan con este filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* STEP 3: Processing & Results */}
          {step === 3 && (
            <>
              {isProcessing ? (
                <div className="bui-progress-container">
                  <h3>Procesando lote {registrosProcesados} de {totalValidos}...</h3>
                  <div className="bui-progress-bar-bg">
                    <div className="bui-progress-bar-fill" style={{ width: `${progreso}%` }}></div>
                  </div>
                  <p>{progreso}% completado</p>
                </div>
              ) : (
                <div className="bui-result-cards">
                  <div className="bui-result-card success">
                    <span className="material-symbols-outlined">check_circle</span>
                    <div className="bui-result-card-content">
                      <h4>{exitosos} usuarios creados exitosamente</h4>
                      <p>Se enviarán correos de invitación a los nuevos usuarios.</p>
                    </div>
                  </div>
                  
                  {fallidos.length > 0 && (
                    <div className="bui-result-card error">
                      <span className="material-symbols-outlined">error</span>
                      <div className="bui-result-card-content">
                        <h4>{fallidos.length} registros fallidos</h4>
                        <ul>
                          {fallidos.slice(0, 5).map((f, i) => (
                            <li key={i}>Fila {f.fila} ({f.email}): {f.error}</li>
                          ))}
                          {fallidos.length > 5 && (
                            <li>...y {fallidos.length - 5} errores más.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="bui-modal-actions">
          {step === 1 && (
            <button type="button" className="bui-btn-cancel" onClick={onClose}>Cancelar</button>
          )}
          {step === 2 && (
            <>
              <button type="button" className="bui-btn-cancel" onClick={() => setStep(1)}>Volver</button>
              <button type="button" className="bui-btn-submit" onClick={handleContinuar} disabled={totalValidos === 0}>
                Continuar con {totalValidos} registros
              </button>
            </>
          )}
          {step === 3 && !isProcessing && (
            <button type="button" className="bui-btn-submit" onClick={handleFinalizar}>Finalizar</button>
          )}
        </div>
      </div>
    </div>
  );
}
