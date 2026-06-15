import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { verifyAuthToken } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';

export async function getCurrentUserApiKey(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth_token')?.value;
  const decoded = token ? verifyAuthToken(token) : null;

  if (!decoded) {
    return null;
  }

  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });

  if (user?.openRouterApiKey) {
    try {
      return decrypt(user.openRouterApiKey);
    } catch (error) {
      console.error('Failed to decrypt user API key:', error);
    }
  }

  return process.env.OPENROUTER_API_KEY || null;
}

export async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth_token')?.value;
  const decoded = token ? verifyAuthToken(token) : null;
  return decoded ? decoded.userId : null;
}
