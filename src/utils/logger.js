import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getTraceContext } from './traceContext.js';

const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, errors } = format;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------- CREATE LOGS FOLDER ---------- */
const logsPath = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsPath)) {
  fs.mkdirSync(logsPath, { recursive: true });
}

/* ---------- LOG LEVEL SETUP ---------- */
const validLevels = new Set(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']);

const defaultLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

const aliases = {
  warning: 'warn',
  warnings: 'warn',
  err: 'error',
  information: 'info'
};

const rawLevel = process.env.LOG_LEVEL?.toLowerCase().trim();
const requestedLevel = aliases[rawLevel] || rawLevel;

const level = validLevels.has(requestedLevel) ? requestedLevel : defaultLevel;

/* ---------- TRACE CONTEXT ---------- */
const attachTrace = format((info) => {
  const trace = getTraceContext();
  if (!trace) return info;

  info.traceId = info.traceId || trace.traceId;
  info.guildId = info.guildId || trace.guildId;
  info.userId = info.userId || trace.userId;
  info.command = info.command || trace.command;

  return info;
});

/* ---------- LOG FORMAT ---------- */
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] [${level}] ${stack || message}`;
});

/* ---------- LOGGER ---------- */
const logger = createLogger({
  level,
  format: combine(
    attachTrace(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'solo-bot' },
  transports: [
    new transports.DailyRotateFile({
      filename: path.join(logsPath, 'error-%DATE%.log'),
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),
    new transports.DailyRotateFile({
      filename: path.join(logsPath, 'combined-%DATE%.log'),
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true
    }),
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        errors({ stack: true }),
        consoleFormat
      )
    })
  ],
  exceptionHandlers: [
    new transports.DailyRotateFile({
      filename: path.join(logsPath, 'exceptions-%DATE%.log'),
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    })
  ],
  rejectionHandlers: [
    new transports.DailyRotateFile({
      filename: path.join(logsPath, 'rejections-%DATE%.log'),
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    })
  ]
});

/* ---------- EXTRA HELPERS ---------- */
export function logError(error, extra = {}) {
  logger.error({
    message: error.message,
    stack: error.stack,
    ...extra
  });
}

export function startupLog(message) {
  logger.info({
    message,
    event: 'startup'
  });
}

export function shutdownLog(message) {
  logger.info({
    message,
    event: 'shutdown'
  });
}

export const isDebug = level === 'debug';

logger.stream = {
  write: (msg) => logger.info(msg.trim())
};

export { logger };
export default logger;
