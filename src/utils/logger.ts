// src/utils/logger.ts
/**
 * Logger utilitaire pour gérer les logs en développement et production
 *
 * Usage:
 * - logger.debug() : Logs de débogage (dev uniquement)
 * - logger.info() : Informations générales (dev uniquement)
 * - logger.warn() : Avertissements (dev uniquement)
 * - logger.error() : Erreurs (toujours affichées)
 * - logger.group() : Grouper les logs (dev uniquement)
 *
 * Configuration:
 * - VITE_LOG_LEVEL dans .env pour contrôler le niveau de logs en production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

class Logger {
  private isDev: boolean;
  private logLevel: LogLevel;

  constructor() {
    // Vite utilise import.meta.env au lieu de process.env
    this.isDev = import.meta.env.MODE === 'development';

    // Niveau de log configurable via variable d'environnement
    this.logLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info';
  }

  /**
   * Vérifie si un niveau de log doit être affiché
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.isDev) return true; // En dev, tout est affiché

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'none'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);

    return requestedLevelIndex >= currentLevelIndex;
  }

  /**
   * Logs de débogage détaillés
   * Affichés uniquement en développement
   */
  debug = (...args: any[]): void => {
    if (this.shouldLog('debug')) {
      console.log('[DEBUG]', ...args);
    }
  };

  /**
   * Informations générales
   * Affichées uniquement en développement (ou si LOG_LEVEL=info en prod)
   */
  info = (...args: any[]): void => {
    if (this.shouldLog('info')) {
      console.info('[INFO]', ...args);
    }
  };

  /**
   * Avertissements
   * Affichés uniquement en développement (ou si LOG_LEVEL=warn en prod)
   */
  warn = (...args: any[]): void => {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  };

  /**
   * Erreurs
   * TOUJOURS affichées (même en production)
   */
  error = (...args: any[]): void => {
    console.error('[ERROR]', ...args);
  };

  /**
   * Groupement de logs ouvert
   * Affichés uniquement en développement
   */
  group = (...args: any[]): void => {
    if (this.isDev) {
      console.group(...args);
    }
  };

  /**
   * Groupement de logs replié
   * Affichés uniquement en développement
   */
  groupCollapsed = (...args: any[]): void => {
    if (this.isDev) {
      console.groupCollapsed(...args);
    }
  };

  /**
   * Fin du groupement
   * Affichés uniquement en développement
   */
  groupEnd = (): void => {
    if (this.isDev) {
      console.groupEnd();
    }
  };

  /**
   * Table (pour afficher des objets sous forme de tableau)
   * Affichée uniquement en développement
   */
  table = (data: any): void => {
    if (this.isDev) {
      console.table(data);
    }
  };

  /**
   * Trace (pour afficher la stack trace)
   * Affichée uniquement en développement
   */
  trace = (...args: any[]): void => {
    if (this.isDev) {
      console.trace(...args);
    }
  };

  /**
   * Timer - démarre un timer
   */
  time = (label: string): void => {
    if (this.isDev) {
      console.time(label);
    }
  };

  /**
   * Timer - arrête un timer et affiche le temps écoulé
   */
  timeEnd = (label: string): void => {
    if (this.isDev) {
      console.timeEnd(label);
    }
  };
}

// Export d'une instance unique
export const logger = new Logger();

// Export du type pour pouvoir typer les fonctions
export type { LogLevel };
