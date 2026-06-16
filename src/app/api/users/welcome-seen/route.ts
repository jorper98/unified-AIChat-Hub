import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const decoded = token ? verifyAuthToken(token) : null;

    if (!decoded) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = await getDb();
    await db.collection('users').updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: { hasSeenWelcomeModal: true } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Mark welcome modal seen error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
