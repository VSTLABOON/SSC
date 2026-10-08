import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAlumnosBusqueda } from '../../services/alumnos';
import type { AlumnoSearchResult } from '../../services/alumnos';
import './QuickSearchModal.css';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStudent?: (student: AlumnoSearchResult) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectStudent,
}) => {
  const { plantelId, rol } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filterSemaforo, setFilterSemaforo] = useState<'todos' | 'verde' | 'naranja' | 'rojo'>('todos');
  const [students, setStudents] = useState<AlumnoSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carga inicial o caché de alumnos del plantel
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadData() {
      if (students.length > 0) return; // Ya en caché
      setLoading(true);
      const data = await getAlumnosBusqueda(plantelId);
      if (isMounted) {
        setStudents(data);
        setLoading(false);
      }
    }

    loadData();
    // Enfocar input automáticamente
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => {
      isMounted = false;
    };
  }, [isOpen, plantelId, students.length]);

  // Manejo de atajo Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Vibración táctil para móviles
  const triggerHaptic = () => {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Ignorar en navegadores sin soporte
    }
  };

  // Filtrado en memoria instantáneo (Zero-latency en conexiones móviles)
  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter(student => {
      const matchSemaforo =
        filterSemaforo === 'todos' || student.nivel_semaforo === filterSemaforo;

      if (!matchSemaforo) return false;
      if (!q) return true;

      const fullName = `${student.nombre} ${student.apellido}`.toLowerCase();
      const matricula = student.matricula.toLowerCase();
      const grupo = student.grupo_nombre.toLowerCase();

      return fullName.includes(q) || matricula.includes(q) || grupo.includes(q);
    });
  }, [students, query, filterSemaforo]);

  const handleStudentClick = (student: AlumnoSearchResult) => {
    triggerHaptic();
    onClose();

    if (onSelectStudent) {
      onSelectStudent(student);
      return;
    }

    // Navegación contextual según el rol del usuario
    if (rol === 'docente') {
      navigate('/maestro/reporte', { state: { alumnoSeleccionado: student } });
    } else if (rol === 'orientador') {
      navigate('/orientador/reporte', { state: { alumnoSeleccionado: student } });
    } else if (rol === 'directivo') {
      navigate('/director/historial', { state: { alumnoSeleccionado: student } });
    } else {
      navigate('/alumno/historial');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="quick-search-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="quick-search-sheet" onClick={e => e.stopPropagation()}>
        {/* Agarradera táctil para móviles */}
        <div className="quick-search-drag-handle" aria-hidden="true" />

        {/* Input de Búsqueda */}
        <div className="quick-search-header">
          <span className="material-symbols-outlined quick-search-icon" aria-hidden="true">
            search
          </span>

          <input
            ref={inputRef}
            type="text"
            className="quick-search-input"
            placeholder="Buscar por nombre, matrícula o grupo..."
            inputMode="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />

          {query && (
            <button
              type="button"
              className="quick-search-clear-btn"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Limpiar búsqueda"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                close
              </span>
            </button>
          )}

          <span className="quick-search-kbd-hint" aria-hidden="true">
            ESC
          </span>

          <button
            type="button"
            className="quick-search-close-btn"
            onClick={onClose}
            aria-label="Cerrar buscador"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Chips de filtro rápido por Semáforo Conductual */}
        <div className="quick-search-filter-row" role="tablist" aria-label="Filtrar por semáforo">
          <button
            type="button"
            className={`quick-search-chip ${filterSemaforo === 'todos' ? 'quick-search-chip--active' : ''}`}
            onClick={() => {
              triggerHaptic();
              setFilterSemaforo('todos');
            }}
          >
            Todos ({students.length})
          </button>
          <button
            type="button"
            className={`quick-search-chip ${filterSemaforo === 'verde' ? 'quick-search-chip--active' : ''}`}
            onClick={() => {
              triggerHaptic();
              setFilterSemaforo('verde');
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: filterSemaforo === 'verde' ? '#ffffff' : '#16a34a' }}>check_circle</span>
            <span>Verde</span>
          </button>
          <button
            type="button"
            className={`quick-search-chip ${filterSemaforo === 'naranja' ? 'quick-search-chip--active' : ''}`}
            onClick={() => {
              triggerHaptic();
              setFilterSemaforo('naranja');
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: filterSemaforo === 'naranja' ? '#ffffff' : '#d97706' }}>warning</span>
            <span>Naranja</span>
          </button>
          <button
            type="button"
            className={`quick-search-chip ${filterSemaforo === 'rojo' ? 'quick-search-chip--active' : ''}`}
            onClick={() => {
              triggerHaptic();
              setFilterSemaforo('rojo');
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: filterSemaforo === 'rojo' ? '#ffffff' : '#dc2626' }}>error</span>
            <span>Rojo</span>
          </button>
        </div>

        {/* Lista de Alumnos */}
        <div className="quick-search-results-list">
          {loading && (
            <div className="quick-search-empty-state">
              <span className="material-symbols-outlined quick-search-empty-icon" style={{ animation: 'spin 1s linear infinite' }}>
                progress_activity
              </span>
              <p>Cargando alumnos del plantel...</p>
            </div>
          )}

          {!loading && filteredStudents.length === 0 && (
            <div className="quick-search-empty-state">
              <span className="material-symbols-outlined quick-search-empty-icon">
                person_search
              </span>
              <p>No se encontraron alumnos que coincidan con la búsqueda.</p>
            </div>
          )}

          {!loading &&
            filteredStudents.map(student => {
              const iniciales = `${student.nombre[0] || ''}${student.apellido[0] || ''}`.toUpperCase();
              return (
                <button
                  key={student.id}
                  type="button"
                  className="quick-search-student-item"
                  onClick={() => handleStudentClick(student)}
                >
                  <div
                    className={`quick-search-avatar quick-search-avatar--${student.nivel_semaforo}`}
                    aria-hidden="true"
                  >
                    {iniciales}
                  </div>

                  <div className="quick-search-student-info">
                    <div className="quick-search-student-name">
                      {student.nombre} {student.apellido}
                    </div>
                    <div className="quick-search-student-meta">
                      <span>Matrícula: {student.matricula}</span>
                      <span>·</span>
                      <span>{student.grupo_nombre}</span>
                    </div>
                  </div>

                  <div
                    className={`quick-search-badge-semaforo quick-search-badge--${student.nivel_semaforo}`}
                  >
                    {student.nivel_semaforo} ({student.puntos_totales} pts)
                  </div>

                  <span className="material-symbols-outlined quick-search-chevron" aria-hidden="true">
                    chevron_right
                  </span>
                </button>
              );
            })}
        </div>

        {/* Footer Informativo */}
        <div className="quick-search-footer">
          <span>{filteredStudents.length} alumno(s) encontrado(s)</span>
          <span style={{ fontSize: '11px', opacity: 0.8 }}>Toca para ver expediente</span>
        </div>
      </div>
    </div>
  );
};

export default QuickSearchModal;
