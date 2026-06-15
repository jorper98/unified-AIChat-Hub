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

    const { apiKey } = await request.json();
    const db = await getDb();

    let encryptedKey = null;
    if (apiKey && apiKey.trim() !== '') {
      encryptedKey = encrypt(apiKey.trim());
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: { openRouterApiKey: encryptedKey, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update API key error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
