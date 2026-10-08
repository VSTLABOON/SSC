import React from 'react';
import './QuickSearchTrigger.css';

interface QuickSearchTriggerProps {
  className?: string;
  placeholder?: string;
}

export const QuickSearchTrigger: React.FC<QuickSearchTriggerProps> = ({
  className = '',
  placeholder = 'Buscar alumno...',
}) => {
  const handleClick = () => {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Ignorar en navegadores sin soporte háptico
    }
    window.dispatchEvent(new CustomEvent('ssc-open-search'));
  };

  return (
    <button
      type="button"
      className={`topbar-search-trigger ${className}`.trim()}
      onClick={handleClick}
      title="Buscar alumno por nombre o matrícula (Ctrl + K)"
      aria-label="Abrir buscador de alumnos"
    >
      <span className="material-symbols-outlined topbar-search-icon" aria-hidden="true">
        search
      </span>
      <span className="topbar-search-text">{placeholder}</span>
      <kbd className="topbar-search-kbd" aria-hidden="true">
        Ctrl K
      </kbd>
    </button>
  );
};

export default QuickSearchTrigger;
