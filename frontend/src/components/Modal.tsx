import { type ReactNode } from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, children, className = '' }: ModalProps) {
  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="app-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`app-modal-box ${className}`}>
        {children}
      </div>
    </div>
  );
}
