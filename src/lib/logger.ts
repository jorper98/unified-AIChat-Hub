import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'data', 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'server.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024;

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function rotateLogIfNeeded() {
  ensureLogsDir();
  if (fs.existsSync(LOG_FILE)) {
    const stats = fs.statSync(LOG_FILE);
    if (stats.size > MAX_LOG_SIZE) {
      const content = fs.readFileSync(LOG_FILE, 'utf-8');
      const lines = content.split('\n');
      const recentLines = lines.slice(-1000);
      fs.writeFileSync(LOG_FILE, recentLines.join('\n'));
    }
  }
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
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    return lines.slice(-limit).join('\n');
  } catch {
    return '';
  }
}
