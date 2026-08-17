import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Schedule.css';

interface ClassCardProps {
  borderColor: string;
  textColor: string;
  subject: string;
  professor: string;
  icon: string;
  room: string;
}

function ClassCard({ borderColor, textColor, subject, professor, icon, room }: ClassCardProps) {
  return (
    <div className="class-card" style={{ borderLeftColor: borderColor }}>
      <p className="class-card__subject" style={{ color: textColor }}>{subject}</p>
      <p className="class-card__professor">{professor}</p>
      <div className="class-card__room">
        <span className="material-symbols-outlined">{icon}</span>
        {room}
      </div>
    </div>
  );
}

// NOTA: El horario por hora/día sigue siendo estático en el frontend debido a que
// el backend no cuenta actualmente con una tabla 'horarios' u otra estructura
// de base de datos dedicada. Esta conexión queda pendiente para una fase futura.
export default function Schedule() {
  const { rol } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  function handleDownload() {
    if (isDownloading) return;
    setIsDownloading(true);

    setTimeout(() => {
      setIsDownloading(false);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 4000);
    }, 1500);
  }

  return (
    <div className="schedule-canvas-only">
      {/* ── Encabezado de página ── */}
      <header className="page-header animate-fade-in">
        <div className="page-header__left">
          <div className="page-header__icon-box">
            <span className="material-symbols-outlined page-header__icon">school</span>
          </div>
          <div>
            <h2 className="page-header__title">
              {rol === 'padre' ? 'Horario de Clases del Tutelado' : 'Mi Horario de Clases'}
            </h2>
            <div className="page-header__period">
              <span className="page-header__period-label">Periodo:</span>
              <span className="page-header__period-badge">Semestre 2026-A</span>
            </div>
          </div>
        </div>
        <div className="page-header__actions">
          <button className="btn-print" onClick={() => window.print()}>
            <span className="material-symbols-outlined">print</span>
            <span className="btn-print__label">Imprimir</span>
          </button>
          <button
            onClick={handleDownload}
            className={`btn-download ${isDownloading ? 'btn-download--loading' : ''}`}
            disabled={isDownloading}
            id="downloadBtn"
          >
            <span className="material-symbols-outlined">
              {isDownloading ? 'sync' : 'download'}
            </span>
            <span id="btnText">
              {isDownloading ? 'Generando...' : 'Descargar PDF'}
            </span>
          </button>
        </div>
      </header>

      {/* ──────────────────────────────────────
          GRILLA DE HORARIO
          ────────────────────────────────────── */}
      <div className="schedule-wrapper animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="schedule-scroll">
          <div className="schedule-grid">
            {/* Encabezados de columna */}
            <div className="header-cell">Hora</div>
            <div className="header-cell">Lunes</div>
            <div className="header-cell">Martes</div>
            <div className="header-cell">Miércoles</div>
            <div className="header-cell">Jueves</div>
            <div className="header-cell">Viernes</div>

            {/* ── Fila 07:00 ── */}
            <div className="schedule-cell schedule-cell--time">07:00</div>
            <div className="schedule-cell">
              <ClassCard borderColor="#00492f" textColor="#00492f" subject="Matemáticas IV" professor="Prof. Martínez" icon="meeting_room" room="Aula 204" />
            </div>
            <div className="schedule-cell" />
            <div className="schedule-cell" />
            <div className="schedule-cell">
              <ClassCard borderColor="#486459" textColor="#486459" subject="Física II" professor="Prof. López" icon="biotech" room="Lab B" />
            </div>
            <div className="schedule-cell">
              <ClassCard borderColor="#8b4513" textColor="#5d2e0d" subject="Filosofía" professor="Prof. Castro" icon="auto_stories" room="Aula 205" />
            </div>

            {/* ── Fila 08:00 ── */}
            <div className="schedule-cell schedule-cell--time">08:00</div>
            <div className="schedule-cell" />
            <div className="schedule-cell">
              <ClassCard borderColor="#8b4513" textColor="#5d2e0d" subject="Historia Univ." professor="Prof. García" icon="public" room="Aula 301" />
            </div>
            <div className="schedule-cell" />
            <div className="schedule-cell" />
            <div className="schedule-cell">
              <ClassCard borderColor="#00492f" textColor="#00492f" subject="Matemáticas IV" professor="Prof. Martínez" icon="meeting_room" room="Aula 204" />
            </div>

            {/* ── Fila 09:00 ── */}
            <div className="schedule-cell schedule-cell--time">09:00</div>
            <div className="schedule-cell">
              <ClassCard borderColor="#204785" textColor="#204785" subject="Redes de Comp." professor="Prof. Mike" icon="router" room="Lab Cómputo B" />
            </div>
            <div className="schedule-cell">
              <ClassCard borderColor="#486459" textColor="#486459" subject="Física II" professor="Prof. López" icon="biotech" room="Lab B" />
            </div>
            <div className="schedule-cell" />
            <div className="schedule-cell">
              <ClassCard borderColor="#204785" textColor="#204785" subject="Base de Datos" professor="Prof. Mike" icon="database" room="Lab Cómputo B" />
            </div>
            <div className="schedule-cell" />

            {/* ── Fila 10:00 (Receso) ── */}
            <div className="schedule-cell schedule-cell--time">10:00</div>
            <div className="schedule-cell schedule-cell--break" style={{ gridColumn: 'span 5' }}>
              <span className="material-symbols-outlined break-icon">coffee</span>
              Receso Institucional
            </div>

            {/* ── Fila 10:30 ── */}
            <div className="schedule-cell schedule-cell--time">10:30</div>
            <div className="schedule-cell" />
            <div className="schedule-cell">
              <ClassCard borderColor="#204785" textColor="#204785" subject="Redes de Comp." professor="Prof. Mike" icon="router" room="Lab Cómputo B" />
            </div>
            <div className="schedule-cell">
              <ClassCard borderColor="#8b4513" textColor="#5d2e0d" subject="Historia Univ." professor="Prof. García" icon="public" room="Aula 301" />
            </div>
            <div className="schedule-cell" />
            <div className="schedule-cell">
              <ClassCard borderColor="#486459" textColor="#486459" subject="Física II" professor="Prof. López" icon="biotech" room="Lab B" />
            </div>

            {/* ── Fila 11:30 ── */}
            <div className="schedule-cell schedule-cell--time">11:30</div>
            <div className="schedule-cell">
              <ClassCard borderColor="#8b4513" textColor="#5d2e0d" subject="Filosofía" professor="Prof. Castro" icon="auto_stories" room="Aula 205" />
            </div>
            <div className="schedule-cell" />
            <div className="schedule-cell">
              <ClassCard borderColor="#204785" textColor="#204785" subject="Base de Datos" professor="Prof. Mike" icon="database" room="Lab Cómputo B" />
            </div>
            <div className="schedule-cell" />
            <div className="schedule-cell" />
          </div>
        </div>
      </div>

      {showToast && (
        <div className="schedule-toast animate-fade-in">
          <span className="material-symbols-outlined schedule-toast__icon">check_circle</span>
          <span className="schedule-toast__text">El horario se ha descargado correctamente.</span>
        </div>
      )}
    </div>
  );
}