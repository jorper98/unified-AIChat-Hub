import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readServerLogs } from '@/lib/logger';
import { getCurrentUserId } from '@/lib/user';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

const LOGS_DIR = path.join(process.cwd(), 'data', 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'server.log');

async function checkAdmin(request: Request) {
  const userId = await getCurrentUserId(request as any);
  if (!userId) return false;
  const db = await getDb();
  const userDoc = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  return userDoc?.role === 'admin';
}

export async function GET(request: Request) {
  try {
    const isAdmin = await checkAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '500', 10);
    const logs = readServerLogs(limit);
    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const isAdmin = await checkAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    if (fs.existsSync(LOG_FILE)) {
      fs.writeFileSync(LOG_FILE, '');
    }
    return NextResponse.json({ message: 'Logs cleared' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
