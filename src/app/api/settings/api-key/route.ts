import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { verifyAuthToken } from '@/lib/auth';
import { encrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const decoded = token ? verifyAuthToken(token) : null;

    if (!decoded) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { apiKey, remove } = await request.json();
    const db = await getDb();

    let updateData: any = { updatedAt: new Date() };
    if (remove || (typeof apiKey === 'string' && apiKey.trim() === '')) {
      updateData.openRouterApiKey = null;
    } else if (apiKey && apiKey.trim() !== '') {
      updateData.openRouterApiKey = encrypt(apiKey.trim());
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: updateData }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update API key error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
