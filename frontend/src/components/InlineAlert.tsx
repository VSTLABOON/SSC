import './InlineAlert.css';

interface InlineAlertProps {
  type: 'error' | 'success';
  message: string;
  onClose?: () => void;
}

export default function InlineAlert({ type, message, onClose }: InlineAlertProps) {
  if (!message) return null;

  return (
    <div className={`inline-alert inline-alert--${type}`}>
      <span className="material-symbols-outlined inline-alert__icon">
        {type === 'error' ? 'error' : 'check_circle'}
      </span>
      <span className="inline-alert__message">{message}</span>
      {onClose && (
        <button type="button" className="inline-alert__close" onClick={onClose} title="Cerrar aviso">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
        </button>
      )}
    </div>
  );
}
