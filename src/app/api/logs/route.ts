import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readServerLogs } from '@/lib/logger';

const LOGS_DIR = path.join(process.cwd(), 'data', 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'server.log');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '500', 10);
    const logs = readServerLogs(limit);
    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      fs.writeFileSync(LOG_FILE, '');
    }
    return NextResponse.json({ message: 'Logs cleared' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
