/**
 * Utilidad de logging centralizada para SSC CONALEP.
 * En entornos de producción (import.meta.env.PROD), silencia logs informativos
 * para evitar la exposición de datos de alumnos en la consola del navegador.
 */

const isDev = Boolean(import.meta.env?.DEV);

export const logger = {
  debug: (...args: unknown[]): void => {
    if (isDev) {
      console.debug('[SSC Debug]:', ...args);
    }
  },

  info: (...args: unknown[]): void => {
    if (isDev) {
      console.info('[SSC Info]:', ...args);
    }
  },

  log: (...args: unknown[]): void => {
    if (isDev) {
      console.log('[SSC]:', ...args);
    }
  },

  warn: (...args: unknown[]): void => {
    console.warn('[SSC Advertencia]:', ...args);
  },

  error: (...args: unknown[]): void => {
    console.error('[SSC Error]:', ...args);
  },
};

export default logger;
