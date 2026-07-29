import { useEffect } from 'react';

/**
 * Custom hook para cerrar modales al presionar la tecla Escape.
 * Incluye un guard para ignorar la tecla Escape cuando el foco activo
 * está en un elemento editable (<input>, <textarea>, <select> o contenteditable),
 * evitando cierres accidentales del modal durante la edición de campos.
 */
export function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;

      const activeElement = document.activeElement;
      const isEditableElement =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        (activeElement instanceof HTMLElement && activeElement.isContentEditable);

      if (isEditableElement) {
        return;
      }

      onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
}
