/**
 * Enterprise-grade Logging System
 * Structured logging with multiple levels and persistence
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  stackTrace?: string;
}

interface LoggerConfig {
  minLevel: LogLevel;
  maxEntries: number;
  persistLogs: boolean;
  enableConsole: boolean;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private config: LoggerConfig;
  private listeners: Set<(entry: LogEntry) => void> = new Set();

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: __DEV__ ? LogLevel.DEBUG : LogLevel.INFO,
      maxEntries: 1000,
      persistLogs: true,
      enableConsole: true,
      ...config,
    };
  }

  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Create a contextual logger
   */
  createContext(context: string) {
    return {
      debug: (message: string, metadata?: Record<string, unknown>) =>
        this.debug(message, context, metadata),
      info: (message: string, metadata?: Record<string, unknown>) =>
        this.info(message, context, metadata),
      warn: (message: string, metadata?: Record<string, unknown>) =>
        this.warn(message, context, metadata),
      error: (message: string, error?: Error, metadata?: Record<string, unknown>) =>
        this.error(message, context, error, metadata),
      fatal: (message: string, error?: Error, metadata?: Record<string, unknown>) =>
        this.fatal(message, context, error, metadata),
    };
  }

  /**
   * Debug level log
   */
  debug(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  /**
   * Info level log
   */
  info(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  /**
   * Warning level log
   */
  warn(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  /**
   * Error level log
   */
  error(
    message: string,
    context?: string,
    error?: Error,
    metadata?: Record<string, unknown>
  ): void {
    const entry: Partial<LogEntry> = {
      stackTrace: error?.stack,
      metadata: {
        ...metadata,
        errorName: error?.name,
        errorMessage: error?.message,
      },
    };
    this.log(LogLevel.ERROR, message, context, entry.metadata, entry.stackTrace);
  }

  /**
   * Fatal level log
   */
  fatal(
    message: string,
    context?: string,
    error?: Error,
    metadata?: Record<string, unknown>
  ): void {
    const entry: Partial<LogEntry> = {
      stackTrace: error?.stack,
      metadata: {
        ...metadata,
        errorName: error?.name,
        errorMessage: error?.message,
      },
    };
    this.log(LogLevel.FATAL, message, context, entry.metadata, entry.stackTrace);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
    stackTrace?: string
  ): void {
    if (level < this.config.minLevel) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context,
      metadata,
      stackTrace,
    };

    this.logs.push(entry);

    // Maintain max entries limit
    if (this.logs.length > this.config.maxEntries) {
      this.logs.shift();
    }

    // Console output
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Notify listeners
    this.notifyListeners(entry);
  }

  /**
   * Output to console with appropriate method
   */
  private logToConsole(entry: LogEntry): void {
    const prefix = entry.context ? `[${entry.context}]` : '';
    const timestamp = new Date(entry.timestamp).toISOString();
    const fullMessage = `${timestamp} ${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(fullMessage, entry.metadata);
        break;
      case LogLevel.INFO:
        console.info(fullMessage, entry.metadata);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage, entry.metadata);
        break;
      case LogLevel.ERROR:
        console.error(fullMessage, entry.metadata, entry.stackTrace);
        break;
      case LogLevel.FATAL:
        console.error(`[FATAL] ${fullMessage}`, entry.metadata, entry.stackTrace);
        break;
    }
  }

  /**
   * Subscribe to log entries
   */
  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(entry: LogEntry): void {
    this.listeners.forEach((listener) => {
      try {
        listener(entry);
      } catch (error) {
        console.error('Error in log listener:', error);
      }
    });
  }

  /**
   * Get all logs
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter((log) => log.level >= level);
    }
    return [...this.logs];
  }

  /**
   * Get logs by context
   */
  getLogsByContext(context: string): LogEntry[] {
    return this.logs.filter((log) => log.context === context);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get logs count by level
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };

    this.logs.forEach((log) => {
      switch (log.level) {
        case LogLevel.DEBUG:
          stats.debug++;
          break;
        case LogLevel.INFO:
          stats.info++;
          break;
        case LogLevel.WARN:
          stats.warn++;
          break;
        case LogLevel.ERROR:
          stats.error++;
          break;
        case LogLevel.FATAL:
          stats.fatal++;
          break;
      }
    });

    return stats;
  }
}

/**
 * Error handler with automatic logging
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: Logger;
  private errorCallbacks: Set<(error: Error) => void> = new Set();

  private constructor() {
    this.logger = Logger.getInstance();
    this.setupGlobalHandlers();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalHandlers(): void {
    if (typeof ErrorUtils !== 'undefined') {
      const originalHandler = ErrorUtils.getGlobalHandler();

      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        this.handleError(error, 'GlobalErrorHandler', isFatal);
        originalHandler(error, isFatal);
      });
    }
  }

  /**
   * Handle error with logging
   */
  handleError(
    error: Error,
    context?: string,
    isFatal: boolean = false,
    metadata?: Record<string, unknown>
  ): void {
    if (isFatal) {
      this.logger.fatal(error.message, context, error, metadata);
    } else {
      this.logger.error(error.message, context, error, metadata);
    }

    this.notifyCallbacks(error);
  }

  /**
   * Wrap async function with error handling
   */
  async wrapAsync<T>(
    fn: () => Promise<T>,
    context?: string,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.handleError(error as Error, context, false, metadata);
      throw error;
    }
  }

  /**
   * Wrap sync function with error handling
   */
  wrap<T>(
    fn: () => T,
    context?: string,
    metadata?: Record<string, unknown>
  ): T | undefined {
    try {
      return fn();
    } catch (error) {
      this.handleError(error as Error, context, false, metadata);
      return undefined;
    }
  }

  /**
   * Subscribe to errors
   */
  subscribe(callback: (error: Error) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  /**
   * Notify all callbacks
   */
  private notifyCallbacks(error: Error): void {
    this.errorCallbacks.forEach((callback) => {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in error callback:', err);
      }
    });
  }
}

// Export singleton instances
export const logger = Logger.getInstance();
export const errorHandler = ErrorHandler.getInstance();

// Create common context loggers
export const appLogger = logger.createContext('App');
export const apiLogger = logger.createContext('API');
export const streamLogger = logger.createContext('Stream');
export const storageLogger = logger.createContext('Storage');
