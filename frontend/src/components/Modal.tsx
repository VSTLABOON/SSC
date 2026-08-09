import { type ReactNode, type CSSProperties } from 'react';
import ReactDOM from 'react-dom';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  maxWidth?: string;
  style?: CSSProperties;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className = '',
  maxWidth = '640px',
  style,
}: ModalProps) {
  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  const modalJSX = (
    <div
      className="app-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`app-modal-box ${className}`}
        style={{
          maxWidth,
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
}

