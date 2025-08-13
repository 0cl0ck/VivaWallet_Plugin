/**
 * Logger utility for Viva Wallet Plugin
 *
 * In production, this should be replaced with a proper logging service
 * like Winston, Pino, or your preferred logging solution.
 */

// Console usage policy: only console.warn and console.error are used

export interface Logger {
  debug(message: string, ...args: unknown[]): void
  error(message: string, error?: unknown): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
}

/**
 * Default console logger for development
 * In production, replace this with your logging service
 */
export const defaultLogger: Logger = {
  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[debug] ${message}`, ...args)
    }
  },

  error(message: string, error?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      console.error(message, error)
    }
    // In production, you should still log errors to your logging service
    // Example: logToService('error', message, error)
  },

  info(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[info] ${message}`, ...args)
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(message, ...args)
    }
  },
}

/**
 * Get a logger instance
 * This can be overridden to use a custom logger
 */
export function getLogger(): Logger {
  // You can check for a custom logger in environment or config
  // For now, return the default logger
  return defaultLogger
}

/**
 * Format error for logging
 * Safely extracts error information
 */
export function formatError(error: unknown): {
  message: string
  stack?: string
  type: string
} {
  if (error instanceof Error) {
    return {
      type: error.constructor.name,
      message: error.message,
      stack: error.stack,
    }
  }

  if (typeof error === 'string') {
    return {
      type: 'string',
      message: error,
    }
  }

  return {
    type: typeof error,
    message: String(error),
  }
}
