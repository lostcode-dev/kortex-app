import { appendFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { env } from '../config/index.js'
import { getTodayLocal } from './date.js'

export enum LogLevel {
  Debug = 'DEBUG',
  Info = 'INFO',
  Warn = 'WARN',
  Error = 'ERROR',
}

const LOG_DIR = path.join(process.cwd(), 'logs')
const LOG_RETENTION_DAYS = 30

let lastCleanupDate: string | null = null

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true })
  }
}

function getLogFilePath(date: string): string {
  return path.join(LOG_DIR, `${date}.log`)
}

function cleanupOldLogs(referenceDate: string): void {
  if (lastCleanupDate === referenceDate) return

  ensureLogDir()

  const files = readdirSync(LOG_DIR)
    .filter((fileName) => /^\d{4}-\d{2}-\d{2}\.log$/.test(fileName))
    .sort()

  const filesToDelete = files.slice(0, Math.max(0, files.length - LOG_RETENTION_DAYS))

  for (const fileName of filesToDelete) {
    rmSync(path.join(LOG_DIR, fileName), { force: true })
  }

  lastCleanupDate = referenceDate
}

export function initializeLogger(): void {
  const today = getTodayLocal()
  ensureLogDir()
  cleanupOldLogs(today)
}

function log(level: LogLevel, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString()
  const payload = data !== undefined ? ` ${JSON.stringify(data)}` : ''
  const line = `[${timestamp}] [${level}] ${message}${payload}`
  const today = getTodayLocal()

  ensureLogDir()
  cleanupOldLogs(today)

  console.log(line)
  appendFileSync(getLogFilePath(today), `${line}\n`, 'utf8')
}

export const logger = {
  debug: (msg: string, data?: unknown) => {
    if (env.NODE_ENV === 'development') log(LogLevel.Debug, msg, data)
  },
  info: (msg: string, data?: unknown) => log(LogLevel.Info, msg, data),
  warn: (msg: string, data?: unknown) => log(LogLevel.Warn, msg, data),
  error: (msg: string, data?: unknown) => log(LogLevel.Error, msg, data),
}
