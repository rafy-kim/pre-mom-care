/**
 * Logger utility for consistent logging across the application
 * Uses environment variables to control log levels
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isDebugMode = process.env.DEBUG_MODE === 'true';
const isMockMode = process.env.FREEMIUM_MOCK_MODE === 'true';

export const logger = {
  // Debug logs - only in development or when DEBUG_MODE is enabled
  debug: (...args: any[]) => {
    if (isDevelopment || isDebugMode) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  // Info logs - always enabled
  info: (...args: any[]) => {
    console.info('[INFO]', ...args);
  },
  
  // Warning logs - always enabled
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  
  // Error logs - always enabled
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
  
  // Mock mode logs - only when in mock mode
  mock: (...args: any[]) => {
    if (isMockMode) {
      console.log('[MOCK]', ...args);
    }
  },
  
  // API logs - only in development
  api: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[API]', ...args);
    }
  },
  
  // Freemium logs - only in development
  freemium: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[FREEMIUM]', ...args);
    }
  },
  
  // Cost calculation logs - only when DEBUG_MODE is enabled
  cost: (...args: any[]) => {
    if (isDebugMode) {
      console.log('[COST]', ...args);
    }
  }
};

// Helper function to conditionally log based on debug mode
export const debugLog = isDebugMode ? console.log : () => {};
export const debugError = isDebugMode ? console.error : () => {};