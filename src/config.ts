import path from 'path';

/**
 * Runtime configuration. The log file path can be overridden with LOG_FILE
 * (useful for tests); otherwise it lives at the project root as events.log.
 */
export const config = {
  port: Number(process.env.PORT) || 3000,
  logFile: process.env.LOG_FILE || path.join(process.cwd(), 'events.log'),
};
