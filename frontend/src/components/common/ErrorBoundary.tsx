import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // En producción se puede enviar a un servicio de monitoreo/telemetría
    console.error('[SSC ErrorBoundary]:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  handleReset = (): void => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const {
        fallbackTitle = 'Ocurrió un problema inesperado',
        fallbackMessage = 'No se pudo cargar esta sección correctamente. Puedes intentar recargar la página o volver a la vista principal.',
      } = this.props;

      return (
        <div className="ssc-error-boundary-container" role="alert">
          <div className="ssc-error-boundary-card">
            <div className="ssc-error-icon-wrapper" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h2 className="ssc-error-title">{fallbackTitle}</h2>
            <p className="ssc-error-desc">{fallbackMessage}</p>

            <div className="ssc-error-actions">
              <button
                type="button"
                className="ssc-btn-primary"
                onClick={this.handleReload}
              >
                Recargar página
              </button>
              <button
                type="button"
                className="ssc-btn-secondary"
                onClick={this.handleGoHome}
              >
                Volver al inicio
              </button>
            </div>

            {this.state.error && (
              <details className="ssc-error-details">
                <summary className="ssc-error-summary">
                  Detalles técnicos del error
                </summary>
                <pre className="ssc-error-pre">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
