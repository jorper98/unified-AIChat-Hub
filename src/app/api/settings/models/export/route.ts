import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const decoded = token ? verifyAuthToken(token) : null;

    if (!decoded) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = await getDb();
    const userId = new ObjectId(decoded.userId);
    const settings = await db.collection('settings').findOne({ userId });

    const exportData = {
      version: '0.4.9',
      exportedAt: new Date().toISOString(),
      models: settings?.models || [],
      providers: settings?.providers || []
    };

    return NextResponse.json(exportData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
