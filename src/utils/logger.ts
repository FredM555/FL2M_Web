// src/utils/logger.ts
/**
 * Logger utilitaire pour gérer les logs en développement et production
 * Masque automatiquement les données sensibles en production
 *
 * Usage:
 * - logger.debug() : Logs de débogage (dev uniquement)
 * - logger.info() : Informations générales (dev uniquement)
 * - logger.warn() : Avertissements (dev uniquement)
 * - logger.error() : Erreurs (toujours affichées, données sensibles masquées)
 *
 * Configuration:
 * - VITE_LOG_LEVEL dans .env pour contrôler le niveau de logs en production
 *   Valeurs possibles: 'debug', 'info', 'warn', 'error', 'none'
 *   Recommandé en production: 'error'
 */

import { logger } from './utils/logger';
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

interface SensitivePatterns {
  email: RegExp;
  phone: RegExp;
  ip: RegExp;
  token: RegExp;
  password: RegExp;
  apiKey: RegExp;
  creditCard: RegExp;
  iban: RegExp;
}

class Logger {
  private isDev: boolean;
  private logLevel: LogLevel;
  private sensitivePatterns: SensitivePatterns;
  private sensitiveKeys: string[];

  constructor() {
    // Vite utilise import.meta.env au lieu de process.env
    this.isDev = import.meta.env.MODE === 'development';

    // Niveau de log configurable via variable d'environnement
    // Par défaut: 'info' en dev, 'error' en prod
    this.logLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) ||
                    (this.isDev ? 'info' : 'error');

    // Patterns pour détecter les données sensibles
    this.sensitivePatterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /(\+33|0)[1-9](\d{8}|\s\d{2}\s\d{2}\s\d{2}\s\d{2})/g,
      ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      token: /\b(eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})\b/g, // JWT
      password: /password["\s:=]+[^\s"]+/gi,
      apiKey: /(api[_-]?key|secret[_-]?key|access[_-]?token)["\s:=]+[^\s"]+/gi,
      creditCard: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
      iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g
    };

    // Clés d'objets considérées comme sensibles
    this.sensitiveKeys = [
      'password',
      'pwd',
      'secret',
      'token',
      'apiKey',
      'api_key',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
      'authorization',
      'iban',
      'creditCard',
      'credit_card',
      'cvv',
      'pin',
      'ssn',
      'social_security',
      'stripe_secret',
      'stripe_account_id',
      'ip_address',
      'ipAddress'
    ];

    // Afficher la configuration au démarrage (seulement en dev)
    if (this.isDev) {
      console.log(`[LOGGER] Initialized - Mode: ${this.isDev ? 'development' : 'production'}, Level: ${this.logLevel}`);
    }
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
   * Masque les données sensibles dans une chaîne de caractères
   */
  private maskString(str: string): string {
    if (this.isDev) return str; // En dev, ne pas masquer

    let masked = str;

    // Masquer les emails: user@example.com -> u***@e***.com
    masked = masked.replace(this.sensitivePatterns.email, (email) => {
      const [user, domain] = email.split('@');
      const maskedUser = user.charAt(0) + '***';
      const maskedDomain = domain.charAt(0) + '***.' + domain.split('.').pop();
      return `${maskedUser}@${maskedDomain}`;
    });

    // Masquer les téléphones: 0612345678 -> 06****5678
    masked = masked.replace(this.sensitivePatterns.phone, (phone) => {
      const cleaned = phone.replace(/\s/g, '');
      return cleaned.substring(0, 2) + '****' + cleaned.substring(cleaned.length - 4);
    });

    // Masquer les IPs: 192.168.1.1 -> ***.***.***.***
    masked = masked.replace(this.sensitivePatterns.ip, '***.***.***. ***');

    // Masquer les tokens JWT
    masked = masked.replace(this.sensitivePatterns.token, 'eyJ***[TOKEN_MASKED]');

    // Masquer les mots de passe
    masked = masked.replace(this.sensitivePatterns.password, 'password: ***');

    // Masquer les clés API
    masked = masked.replace(this.sensitivePatterns.apiKey, '$1: ***');

    // Masquer les cartes de crédit: 1234 5678 9012 3456 -> **** **** **** 3456
    masked = masked.replace(this.sensitivePatterns.creditCard, '**** **** **** ****');

    // Masquer les IBANs
    masked = masked.replace(this.sensitivePatterns.iban, (iban) => {
      return iban.substring(0, 4) + '****' + iban.substring(iban.length - 4);
    });

    return masked;
  }

  /**
   * Masque les données sensibles dans un objet
   */
  private maskObject(obj: any): any {
    if (this.isDev) return obj; // En dev, ne pas masquer

    if (obj === null || obj === undefined) return obj;

    // Si c'est une chaîne, la masquer
    if (typeof obj === 'string') {
      return this.maskString(obj);
    }

    // Si c'est un tableau, masquer chaque élément
    if (Array.isArray(obj)) {
      return obj.map(item => this.maskObject(item));
    }

    // Si c'est un objet, masquer les propriétés sensibles
    if (typeof obj === 'object') {
      const masked: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Si la clé est sensible, masquer complètement la valeur
        if (this.sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
          masked[key] = '***';
        } else {
          // Sinon, masquer récursivement
          masked[key] = this.maskObject(value);
        }
      }
      return masked;
    }

    return obj;
  }

  /**
   * Prépare les arguments pour le logging (masquage des données sensibles)
   */
  private prepareArgs(...args: any[]): any[] {
    return args.map(arg => this.maskObject(arg));
  }

  /**
   * Formate une erreur de manière sécurisée
   */
  private formatError(error: any): any {
    if (this.isDev) return error; // En dev, afficher l'erreur complète

    // En production, afficher seulement le message et le type
    if (error instanceof Error) {
      return {
        name: error.name,
        message: this.maskString(error.message),
        // Ne pas inclure la stack trace en production pour éviter les fuites d'info
      };
    }

    return this.maskObject(error);
  }

  /**
   * Logs de débogage détaillés
   * Affichés uniquement en développement
   */
  debug = (...args: any[]): void => {
    if (this.shouldLog('debug')) {
      const maskedArgs = this.prepareArgs(...args);
      console.log('[DEBUG]', ...maskedArgs);
    }
  };

  /**
   * Informations générales
   * Affichées uniquement en développement (ou si LOG_LEVEL=info en prod)
   */
  info = (...args: any[]): void => {
    if (this.shouldLog('info')) {
      const maskedArgs = this.prepareArgs(...args);
      console.info('[INFO]', ...maskedArgs);
    }
  };

  /**
   * Avertissements
   * Affichés uniquement en développement (ou si LOG_LEVEL=warn en prod)
   */
  warn = (...args: any[]): void => {
    if (this.shouldLog('warn')) {
      const maskedArgs = this.prepareArgs(...args);
      console.warn('[WARN]', ...maskedArgs);
    }
  };

  /**
   * Erreurs
   * TOUJOURS affichées (même en production)
   * Les données sensibles sont automatiquement masquées
   */
  error = (...args: any[]): void => {
    if (this.shouldLog('error')) {
      const maskedArgs = args.map(arg => {
        // Si c'est une erreur, la formater de manière sécurisée
        if (arg instanceof Error) {
          return this.formatError(arg);
        }
        return this.maskObject(arg);
      });
      console.error('[ERROR]', ...maskedArgs);
    }
  };

  /**
   * Groupement de logs ouvert
   * Affichés uniquement en développement
   */
  group = (...args: any[]): void => {
    if (this.isDev) {
      const maskedArgs = this.prepareArgs(...args);
      console.group(...maskedArgs);
    }
  };

  /**
   * Groupement de logs replié
   * Affichés uniquement en développement
   */
  groupCollapsed = (...args: any[]): void => {
    if (this.isDev) {
      const maskedArgs = this.prepareArgs(...args);
      console.groupCollapsed(...maskedArgs);
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
      const maskedData = this.prepareArgs(data)[0];
      console.table(maskedData);
    }
  };

  /**
   * Trace (pour afficher la stack trace)
   * Affichée uniquement en développement
   */
  trace = (...args: any[]): void => {
    if (this.isDev) {
      const maskedArgs = this.prepareArgs(...args);
      console.trace(...maskedArgs);
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

  /**
   * Log sécurisé - Garantit que les données sensibles sont masquées
   * Utilisé pour logger des objets contenant potentiellement des données sensibles
   */
  secure = (message: string, data?: any): void => {
    if (this.shouldLog('info')) {
      if (data) {
        const maskedData = this.maskObject(data);
        console.info('[SECURE]', message, maskedData);
      } else {
        console.info('[SECURE]', message);
      }
    }
  };
}

// Export d'une instance unique
export const logger = new Logger();

// Export du type pour pouvoir typer les fonctions
export type { LogLevel };
