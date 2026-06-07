import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'data', 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'server.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024;
const MAX_ROTATED_FILES = 3;

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function rotateLogIfNeeded() {
  ensureLogsDir();
  if (!fs.existsSync(LOG_FILE)) return;

  const stats = fs.statSync(LOG_FILE);
  if (stats.size <= MAX_LOG_SIZE) return;

  for (let i = MAX_ROTATED_FILES; i >= 1; i--) {
    const currentFile = i === 1 ? LOG_FILE : `${LOG_FILE}.${i - 1}`;
    const nextFile = `${LOG_FILE}.${i}`;
    if (fs.existsSync(currentFile)) {
      fs.renameSync(currentFile, nextFile);
    }
  }

  fs.writeFileSync(LOG_FILE, '');
}

export function logToServer(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  try {
    rotateLogIfNeeded();
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logLine);
  } catch {
    // Silently fail if file writing fails
  }
}

export function readServerLogs(limit = 500): string {
  try {
    ensureLogsDir();

    if (!fs.existsSync(LOG_FILE)) return '';

    const allLines: string[] = [];

    for (let i = MAX_ROTATED_FILES; i >= 1; i--) {
      const file = i === 1 ? LOG_FILE : `${LOG_FILE}.${i - 1}`;
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        allLines.push(...lines);
      }
    }

    return allLines.slice(-limit).join('\n');
  } catch {
    return '';
  }
}
